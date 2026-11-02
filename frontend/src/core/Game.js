import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { Vehicle } from '../vehicle/Vehicle.js';
import { getVehicleById } from '../vehicle/vehicleConfig.js';
import { createTrack } from '../tracks/TrackScene.js';
import { getTrackEnvironment } from '../tracks/trackTextures.js';
import { ChaseCamera } from '../camera/ChaseCamera.js';
import { InputManager } from '../input/InputManager.js';
import { RaceManager, RaceState } from '../racing/RaceManager.js';
import { formatTime } from '../utils/math.js';
import { mountUI } from '../ui/GameUI.js';
import { audioManager } from '../audio/AudioManager.js';
import { AIRacer } from '../racing/AIRacer.js';

export const COMPETITIVE_OPPONENTS = [
  {
    id: 'ai-marcus',
    name: 'Маркус Вэнс',
    carName: 'Bavaria M4 Clubsport',
    category: 'Club Sport',
    colorHex: '#1f5fbf',
    paintColor: 0x1f5fbf,
    maxSpeedKph: 242,
    aggression: 1.12,
    baseLaneOffset: 2.8,
    startProgressOffset: 0.005,
    description: 'Лидер квалификации. Агрессивно защищает траекторию на апексах.',
  },
  {
    id: 'ai-elena',
    name: 'Елена Ростова',
    carName: 'Stuttgart GT Coupe',
    category: 'Sports Car',
    colorHex: '#e5a912',
    paintColor: 0xe5a912,
    maxSpeedKph: 246,
    aggression: 1.05,
    baseLaneOffset: -2.8,
    startProgressOffset: 0.992,
    description: 'Мастер скоростных прямиков. Держит стабильный гоночный темп.',
  },
  {
    id: 'ai-hiroshi',
    name: 'Хироши Танака',
    carName: 'Yokohama GT-Spec',
    category: 'Sports Car',
    colorHex: '#f0f3f6',
    paintColor: 0xf0f3f6,
    maxSpeedKph: 238,
    aggression: 1.18,
    baseLaneOffset: -2.4,
    startProgressOffset: 0.978,
    description: 'Специалист по шпилькам и позднему торможению на грани сцепления.',
  },
  {
    id: 'ai-jake',
    name: 'Джейк Миллер',
    carName: 'Detroit Muscle V8',
    category: 'Muscle Car',
    colorHex: '#dd4b1a',
    paintColor: 0xdd4b1a,
    maxSpeedKph: 248,
    aggression: 0.98,
    baseLaneOffset: 2.4,
    startProgressOffset: 0.965,
    description: 'Невероятная мощь V8 на выходе из поворотов. Опасен при обгонах.',
  },
];

export class Game {
  static async create() {
    const game = new Game();
    await game.initialize();
    return game;
  }

  async initialize() {
    this.currentVehicleId = 'nightrun-club-sport';
    this.currentTrackId = 'starter-oval';

    this.canvas = document.querySelector('#game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111820);
    this.scene.fog = new THREE.FogExp2(0x111820, 0.008);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);
    this.camera.position.set(-8, 7, -18);

    this.hemiLight = new THREE.HemisphereLight(0xa9c2d4, 0x1a2925, 1.15);
    this.scene.add(this.hemiLight);

    this.moonlight = new THREE.DirectionalLight(0xd7e6ff, 2.0);
    this.moonlight.position.set(-25, 52, -31);
    this.moonlight.castShadow = true;
    this.moonlight.shadow.mapSize.set(2048, 2048);
    this.moonlight.shadow.camera.left = -60; this.moonlight.shadow.camera.right = 60;
    this.moonlight.shadow.camera.top = 60; this.moonlight.shadow.camera.bottom = -60;
    this.moonlight.shadow.bias = -0.0003;
    this.scene.add(this.moonlight);

    this.sunset = new THREE.PointLight(0xe57b49, 32, 180, 1.7);
    this.sunset.position.set(5, 23, -49);
    this.scene.add(this.sunset);

    this.physics = await PhysicsWorld.create();
    this.track = createTrack(this.scene, this.physics, this.currentTrackId);
    this.vehicle = new Vehicle({
      physics: this.physics,
      start: this.track.start,
      config: getVehicleById(this.currentVehicleId),
    });
    this.scene.add(this.vehicle.visual.root);

    this.chaseCamera = new ChaseCamera(this.camera);
    this.race = new RaceManager({
      checkpoints: this.track.checkpoints,
      totalLaps: this.track.config.laps || 2,
      onChange: (state) => this.onRaceState(state),
    });

    this.input = new InputManager(window);
    this.aiRacers = [];
    if (this.currentTrackId === 'apex-grand-prix') {
      this.setupAIRacers();
    }
    this.ui = mountUI(this);

    this.updateEnvironment(this.currentTrackId);
    this.updateScreenTitles();

    this.lastFrame = 0;
    this.running = true;
    this.paused = false;
    this.countdownRemaining = 0;
    this.lastCountdownNumber = 0;
    this.soundEnabled = true;

    const unlockAudio = () => {
      audioManager.ensureRunning();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    this.physics.subscribeContactForces((contact) => {
      if (contact.maxForceMagnitude > 800) {
        audioManager.playCollisionImpact(contact.maxForceMagnitude / 3500);
      }
    });

    this.debugPanel = document.querySelector('#debug-panel');
    this.debugEnabled = new URLSearchParams(window.location.search).has('debug');
    this.debugPanel.classList.toggle('hidden', !this.debugEnabled);
    this.debugFrames = 0;
    this.debugElapsed = 0;
    this.debugFps = 0;

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    this.renderer.setAnimationLoop((time) => this.frame(time));

    this.vehicle.syncVisual(0);
    this.chaseCamera.update(this.vehicle, 1 / 60);

    document.querySelector('#loading-screen').classList.add('is-hidden');
  }

  updateEnvironment(trackId) {
    const env = getTrackEnvironment(trackId);
    if (!env) return;

    this.scene.background.setHex(env.background);
    this.scene.fog.color.setHex(env.fogColor);
    this.scene.fog.density = env.fogDensity;

    this.hemiLight.color.setHex(env.hemiSky);
    this.hemiLight.groundColor.setHex(env.hemiGround);
    this.hemiLight.intensity = env.hemiIntensity;

    this.moonlight.color.setHex(env.moonColor);
    this.moonlight.intensity = env.moonIntensity;

    this.sunset.color.setHex(env.sunColor);
    this.sunset.intensity = env.sunIntensity;
  }

  updateScreenTitles() {
    const vehicleConfig = getVehicleById(this.currentVehicleId);
    const vehicleLabel = document.querySelector('#vehicle-label');
    if (vehicleLabel) {
      vehicleLabel.textContent = `${vehicleConfig.name.toUpperCase()} / ${vehicleConfig.category.toUpperCase()}`;
    }

    const trackTitle = document.querySelector('#intro-track-title');
    if (trackTitle && this.track?.config) {
      trackTitle.textContent = this.track.config.name.toUpperCase();
    }

    const hudTrackMeta = document.querySelector('#hud-track-meta');
    if (hudTrackMeta && this.track?.config) {
      hudTrackMeta.textContent = `${this.track.config.name.toUpperCase()} / КРУГ 01`;
    }

    const lapTotal = document.querySelector('#lap-total');
    if (lapTotal && this.track?.config) {
      lapTotal.textContent = this.track.config.laps || 2;
    }
  }

  selectVehicle(vehicleId) {
    if (vehicleId === this.currentVehicleId) {
      this.ui?.notify('ЭТОТ АВТОМОБИЛЬ УЖЕ ВЫБРАН');
      return;
    }

    const vehicleConfig = getVehicleById(vehicleId);
    this.currentVehicleId = vehicleId;

    this.vehicle.dispose(this.scene);
    this.vehicle = new Vehicle({
      physics: this.physics,
      start: this.track.start,
      config: vehicleConfig,
    });
    this.scene.add(this.vehicle.visual.root);

    this.vehicle.syncVisual(0);
    this.chaseCamera.update(this.vehicle, 1 / 60);
    this.updateScreenTitles();
    this.ui?.refreshCatalogViews();
    this.ui?.notify(`ВЫБРАН: ${vehicleConfig.name.toUpperCase()}`);
  }

  setupAIRacers() {
    // Очищаем предыдущих AI-соперников
    for (const ai of this.aiRacers) ai.dispose();
    this.aiRacers = [];

    const curve = this.track.path;
    if (!curve) return;

    for (const opp of COMPETITIVE_OPPONENTS) {
      const ai = new AIRacer({
        id: opp.id,
        name: opp.name,
        config: { paintColor: opp.paintColor },
        scene: this.scene,
        physics: this.physics,
        curve,
        laneOffset: opp.baseLaneOffset,
        initialProgress: opp.startProgressOffset,
        maxSpeedKph: opp.maxSpeedKph,
        aggression: opp.aggression,
      });
      this.aiRacers.push(ai);
    }
  }

  // Возвращает место игрока (1..5) среди всех участников
  calculatePlayerPosition() {
    const totalLaps = this.track.config.laps || 2;
    const playerProgress = (this.race.currentLap - 1) + this.race.lastCheckpoint / Math.max(this.track.checkpoints.length, 1);
    const allProgress = [
      { name: 'player', prog: playerProgress },
      ...this.aiRacers.map((ai) => ({ name: ai.id, prog: ai.getTotalProgress() / totalLaps })),
    ];
    allProgress.sort((a, b) => b.prog - a.prog);
    return allProgress.findIndex((e) => e.name === 'player') + 1;
  }

  selectTrack(trackId) {
    if (trackId === this.currentTrackId) {
      this.ui?.closeCatalog();
      this.ui?.notify('ЭТА ТРАССА УЖЕ ВЫБРАНА');
      return;
    }

    // Убираем AI-соперников перед сменой трассы
    for (const ai of this.aiRacers) ai.dispose();
    this.aiRacers = [];

    this.currentTrackId = trackId;
    this.track.dispose();
    this.track = createTrack(this.scene, this.physics, trackId);

    this.race.setTrack(this.track.checkpoints, this.track.config.laps || 2);
    this.vehicle.start = this.track.start;
    this.vehicle.reset();
    this.vehicle.syncVisual(0);
    this.chaseCamera.update(this.vehicle, 1 / 60);

    if (trackId === 'apex-grand-prix') {
      this.setupAIRacers();
    }

    this.updateEnvironment(trackId);
    this.updateScreenTitles();
    this.ui?.refreshCatalogViews();
    this.ui?.closeCatalog();
    this.ui?.notify(`ТРАССА: ${this.track.config.name.toUpperCase()}`);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  startRace() {
    if (this.race.state === RaceState.FINISHED) this.race.reset();
    if (this.race.state !== RaceState.COUNTDOWN) return false;
    this.paused = false;
    this.countdownRemaining = 3;
    this.ui.showCountdown('3');
    return true;
  }

  frame(timestamp) {
    if (!this.running) return;
    const dt = this.lastFrame === 0 ? 0 : Math.min((timestamp - this.lastFrame) / 1000, 0.08);
    this.lastFrame = timestamp;
    this.handleGlobalInput();

    if (!this.paused && this.countdownRemaining > 0) {
      this.countdownRemaining -= dt;
      const number = Math.ceil(this.countdownRemaining);
      if (number > 0) {
        if (number !== this.lastCountdownNumber) {
          this.lastCountdownNumber = number;
          audioManager.playCountdownBeep(false);
        }
        this.ui.showCountdown(String(number));
      } else {
        this.countdownRemaining = 0;
        this.lastCountdownNumber = 0;
        this.ui.showCountdown('СТАРТ');
        audioManager.playCountdownBeep(true);
        window.setTimeout(() => {
          if (!this.paused && this.race.state === RaceState.COUNTDOWN) {
            this.race.start();
            this.ui.hideCountdown();
          }
        }, 450);
      }
    }

    if (!this.paused) {
      const controls = {
        accelerate: this.input.isDown('accelerate'),
        brake: this.input.isDown('brake'),
        left: this.input.isDown('left'),
        right: this.input.isDown('right'),
        handbrake: this.input.isDown('handbrake'),
      };
      this.currentControls = controls;
      if (this.race.state === RaceState.RACING) {
        this.physics.advance(dt, (fixedDt) => this.vehicle.preStep(controls, fixedDt));
        const position = this.vehicle.syncVisual(dt);
        const event = this.race.update(dt, position);

        const speed = this.vehicle.getSpeedKph();
        const reverse = this.vehicle.getForwardSpeed() < -0.25;
        const gear = reverse ? 'R' : speed < 24 ? 1 : speed < 55 ? 2 : speed < 94 ? 3 : speed < 137 ? 4 : speed < 176 ? 5 : 6;
        const isDrifting = controls.handbrake || (Math.abs(this.vehicle.steer) > 0.22 && speed > 35);

        audioManager.updateTelemetry({
          speedKph: speed,
          throttle: controls.accelerate,
          brake: controls.brake,
          handbrake: controls.handbrake,
          gear,
          isDrifting,
        });

        // Обновляем AI-гонщиков каждый кадр
        for (const ai of this.aiRacers) ai.update(dt, true);

        if (event === 'checkpoint') {
          audioManager.playCheckpointDing();
          this.ui.flashCheckpoint();
        }
        if (event === 'lap') this.ui.updateLap(this.race.currentLap);
        if (event === 'finished') {
          audioManager.playFinishFanfare();
          const finalPos = this.aiRacers.length > 0 ? this.calculatePlayerPosition() : null;
          this.ui.finish(this.race.elapsed, finalPos, this.aiRacers.length > 0);
        }
        const racePos = this.aiRacers.length > 0 ? this.calculatePlayerPosition() : null;
        this.ui.updateHud({
          speed,
          lap: this.race.currentLap,
          time: this.race.elapsed,
          reverse,
          racePos,
          totalRacers: this.aiRacers.length > 0 ? this.aiRacers.length + 1 : null,
        });
      }
      this.chaseCamera.update(this.vehicle, dt || 1 / 60);
    }
    this.renderer.render(this.scene, this.camera);
    this.updateDebugPanel(dt);
  }

  updateDebugPanel(dt) {
    if (!this.debugEnabled) return;
    this.debugFrames += 1;
    this.debugElapsed += dt;
    if (this.debugElapsed >= 0.25) {
      this.debugFps = Math.round(this.debugFrames / this.debugElapsed);
      this.debugFrames = 0;
      this.debugElapsed = 0;
    }
    const contacts = Array.from({ length: this.vehicle.controller.numWheels() }, (_, index) => this.vehicle.controller.wheelIsInContact(index) ? '●' : '○').join('');
    const controls = this.currentControls ?? { accelerate: false, brake: false, left: false, right: false, handbrake: false };
    const rotation = this.vehicle.body.rotation();
    const yaw = (2 * Math.atan2(rotation.y, rotation.w) * 180 / Math.PI).toFixed(0);
    this.debugPanel.textContent = [
      `FPS ${this.debugFps}   DRAW ${this.renderer.info.render.calls}   TRI ${this.renderer.info.render.triangles}`,
      `INPUT GAS ${Number(controls.accelerate)}  BRAKE ${Number(controls.brake)}  L ${Number(controls.left)}  R ${Number(controls.right)}  HB ${Number(controls.handbrake)}`,
      `CAR ${this.vehicle.getSpeedKph().toFixed(1)} KM/H   YAW ${yaw}°   STEER ${(this.vehicle.steer * 180 / Math.PI).toFixed(0)}°   WHEELS ${contacts}`,
    ].join('\n');
  }

  handleGlobalInput() {
    if (this.input.consume('KeyC')) {
      this.ui?.toggleCatalog();
      return;
    }

    if (this.input.consume('Escape')) {
      if (this.ui?.isCatalogOpen()) {
        this.ui.closeCatalog();
        return;
      }

      if (this.race.state === RaceState.PAUSED) {
        this.race.resume(); this.paused = false; this.ui.setPaused(false);
      } else if (this.race.state === RaceState.RACING || this.race.state === RaceState.COUNTDOWN) {
        this.race.pause(); this.paused = true; this.countdownRemaining = 0; this.ui.setPaused(true);
      } else if (this.race.state === RaceState.FINISHED) {
        this.ui.showIntro();
      }
    }

    if (this.input.consume('KeyR')) {
      if (this.race.state === RaceState.FINISHED) this.race.reset();
      this.vehicle.reset();
      this.ui.notify('ПОЗИЦИЯ ВОССТАНОВЛЕНА');
    }

    if (this.input.consume('KeyH')) this.ui.toggleHelp();
  }

  onRaceState(state) { this.ui?.onRaceState(state); }

  dispose() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resizeHandler);
    this.input.dispose();
    this.renderer.dispose();
    this.physics.dispose();
  }
}
