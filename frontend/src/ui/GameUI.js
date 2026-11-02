import { gsap } from 'gsap';
import { RaceState } from '../racing/RaceManager.js';
import { formatTime } from '../utils/math.js';
import vehicles from '../vehicle/vehicleCatalog.json';
import tracks from '../tracks/trackCatalog.json';
import { audioManager } from '../audio/AudioManager.js';

export function mountUI(game) {
  const el = (selector) => document.querySelector(selector);
  const intro = el('#intro-panel');
  const hud = el('#race-hud');
  const pause = el('#pause-overlay');
  const finish = el('#finish-overlay');
  const countdown = el('#countdown');
  const toast = el('#toast');
  const catalogOverlay = el('#catalog-overlay');
  const vehiclesGrid = el('#vehicles-grid');
  const tracksGrid = el('#tracks-grid');
  const tabVehicles = el('#tab-btn-vehicles');
  const tabTracks = el('#tab-btn-tracks');
  const tabCompetitive = el('#tab-btn-competitive');
  const panelVehicles = el('#catalog-panel-vehicles');
  const panelTracks = el('#catalog-panel-tracks');
  const panelCompetitive = el('#catalog-panel-competitive');
  const positionBadge = el('#position-badge');
  const playerPositionEl = el('#player-position');
  const totalRacersEl = el('#total-racers');

  let toastTimer;
  let returnToIntro = false;
  let returnToPause = false;

  function renderVehicleCards() {
    vehiclesGrid.innerHTML = vehicles.map((car) => {
      const isSelected = car.id === game.currentVehicleId;
      const hexColor = '#' + (car.paintColor ?? 0xc54b35).toString(16).padStart(6, '0');
      const speedPct = Math.min(100, Math.round((car.maxSpeed / 340) * 100));
      const accelPct = Math.min(100, Math.round((car.acceleration / 10) * 100));
      const handPct = Math.min(100, Math.round((car.handling / 10) * 100));
      const driftPct = Math.min(100, Math.round((car.drift / 10) * 100));

      return `
        <article class="vehicle-card ${isSelected ? 'is-selected' : ''}" data-vehicle-id="${car.id}">
          <div class="card-top">
            <span class="card-mfr"><i class="card-color-chip" style="background:${hexColor}"></i>${car.manufacturer}</span>
            <span class="card-category">${car.category}</span>
          </div>
          <h3 class="card-title">${car.name}</h3>
          <p class="card-desc">${car.description}</p>
          <div class="card-stats">
            <div class="stat-row">
              <span class="stat-label">СКОРОСТЬ</span>
              <div class="stat-bar-track"><span class="stat-bar-fill" style="width:${speedPct}%"></span></div>
              <span class="stat-value">${car.maxSpeed} КМ/Ч</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">РАЗГОН</span>
              <div class="stat-bar-track"><span class="stat-bar-fill" style="width:${accelPct}%"></span></div>
              <span class="stat-value">${car.acceleration.toFixed(1)}/10</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">РУЛЕНИЕ</span>
              <div class="stat-bar-track"><span class="stat-bar-fill" style="width:${handPct}%"></span></div>
              <span class="stat-value">${car.handling.toFixed(1)}/10</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">ДРИФТ</span>
              <div class="stat-bar-track"><span class="stat-bar-fill" style="width:${driftPct}%"></span></div>
              <span class="stat-value">${car.drift.toFixed(1)}/10</span>
            </div>
          </div>
          <div class="card-action">
            <button class="card-select-btn ${isSelected ? 'is-active' : ''}" data-action="select-car" data-id="${car.id}">
              ${isSelected ? 'ВЫБРАН ✓' : 'ВЫБРАТЬ АВТОМОБИЛЬ ↗'}
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderTrackCards() {
    tracksGrid.innerHTML = tracks.map((track) => {
      const isSelected = track.id === game.currentTrackId;
      const diffClass = track.difficulty === 'Новичок' ? 'diff-novice'
        : track.difficulty === 'Любитель' ? 'diff-amateur' : 'diff-pro';

      return `
        <article class="track-card ${isSelected ? 'is-selected' : ''}" data-track-id="${track.id}">
          <div class="card-top">
            <span class="card-mfr">${track.theme.toUpperCase()} · ${track.location.toUpperCase()}</span>
            <span class="diff-badge ${diffClass}">${track.difficulty}</span>
          </div>
          <h3 class="card-title">${track.name}</h3>
          <p class="card-desc">${track.description}</p>
          <div class="track-meta-pills">
            <span class="track-pill">ДЛИНА <b>${track.lengthKm} КМ</b></span>
            <span class="track-pill">КРУГОВ <b>${track.laps}</b></span>
            <span class="track-pill">КЛАСС <b>${track.recommendedClass}</b></span>
          </div>
          <div class="card-action">
            <button class="card-select-btn ${isSelected ? 'is-active' : ''}" data-action="select-track" data-id="${track.id}">
              ${isSelected ? 'ТЕКУЩАЯ ТРАССА ✓' : 'ВЫЕХАТЬ НА ТРАССУ ↗'}
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  const ui = {
    onRaceState(state) {
      if (state === RaceState.RACING) {
        intro.classList.add('hidden');
        hud.classList.remove('hidden');
        gsap.fromTo(hud, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' });
      }
      if (state === RaceState.PAUSED) this.setPaused(true);
      if (state === RaceState.FINISHED) {
        pause.classList.add('hidden');
        finish.classList.remove('hidden');
      }
    },

    start() {
      if (this.isCatalogOpen()) this.closeCatalog();
      if (game.startRace()) intro.classList.add('hidden');
    },

    showCountdown(label) {
      countdown.textContent = label;
      countdown.classList.remove('hidden');
      gsap.fromTo(countdown, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.24, ease: 'power2.out' });
    },

    hideCountdown() {
      countdown.classList.add('hidden');
    },

    setPaused(value) {
      pause.classList.toggle('hidden', !value);
      if (value) {
        gsap.fromTo('.pause-card', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
      } else if (game.race.state === RaceState.PAUSED) {
        game.race.resume();
        game.paused = false;
      }
    },

    updateHud({ speed, lap, time, reverse = false, racePos = null, totalRacers = null }) {
      el('#speed-value').textContent = Math.round(speed).toString().padStart(3, '0');
      el('#speed-fill').style.width = `${Math.min(100, speed / 2.1)}%`;
      el('#lap-current').textContent = lap;
      el('#race-time').textContent = formatTime(time);
      el('#gear-value').textContent = reverse ? 'R' : speed < 24 ? '1' : speed < 55 ? '2' : speed < 94 ? '3' : speed < 137 ? '4' : speed < 176 ? '5' : '6';
      // Бейдж позиции для соревновательного режима
      if (racePos !== null && totalRacers !== null) {
        positionBadge.classList.remove('hidden');
        playerPositionEl.textContent = racePos;
        totalRacersEl.textContent = totalRacers;
      } else {
        positionBadge.classList.add('hidden');
      }
    },

    updateLap(lap) {
      el('#lap-current').textContent = lap;
      this.notify(`КРУГ ${String(lap).padStart(2, '0')} — ЧИСТО`);
    },

    flashCheckpoint() {
      const marker = el('#checkpoint-toast');
      marker.classList.remove('hidden');
      gsap.fromTo(marker, { opacity: 0, x: -14 }, {
        opacity: 1,
        x: 0,
        duration: 0.2,
        onComplete: () => gsap.to(marker, {
          opacity: 0,
          delay: 1.05,
          duration: 0.3,
          onComplete: () => marker.classList.add('hidden'),
        }),
      });
    },

    finish(time, racePos = null, isCompetitive = false) {
      el('#finish-time').textContent = formatTime(time);
      if (isCompetitive && racePos !== null) {
        const podiumMsg = racePos === 1 ? 'ПОБЕДА! ПОДИУМ P1' : racePos <= 3 ? `ПОДИУМ — МЕСТО P${racePos}` : `ФИНИШ — МЕСТО P${racePos}`;
        el('#finish-title').textContent = podiumMsg;
      } else {
        el('#finish-title').textContent = time < 105 ? 'КРАСИВАЯ ТРАЕКТОРИЯ' : 'ХОРОШИЙ ЗАЕЗД';
      }
      gsap.fromTo('.finish-card', { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    },

    notify(message) {
      toast.textContent = message;
      toast.classList.remove('hidden');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.add('hidden'), 2100);
    },

    toggleHelp() {
      this.notify('WASD — ЕХАТЬ · SPACE — РУЧНИК · C — КАТАЛОГ · R — СБРОС · ESC — ПАУЗА');
    },

    showIntro() {
      finish.classList.add('hidden');
      hud.classList.add('hidden');
      intro.classList.remove('hidden');
      game.race.reset();
    },

    isCatalogOpen() {
      return !catalogOverlay.classList.contains('hidden');
    },

    openCatalog(tab = 'vehicles') {
      if (!intro.classList.contains('hidden')) {
        returnToIntro = true;
        intro.classList.add('hidden');
      }
      if (!pause.classList.contains('hidden')) {
        returnToPause = true;
        pause.classList.add('hidden');
      }
      renderVehicleCards();
      renderTrackCards();
      this.switchCatalogTab(tab);
      catalogOverlay.classList.remove('hidden');
      gsap.fromTo('.catalog-window', { y: 28, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' });
    },

    closeCatalog() {
      catalogOverlay.classList.add('hidden');
      if (returnToIntro && game.race.state !== RaceState.RACING) {
        intro.classList.remove('hidden');
        returnToIntro = false;
      }
      if (returnToPause && game.race.state === RaceState.PAUSED) {
        pause.classList.remove('hidden');
        returnToPause = false;
      }
    },

    toggleCatalog() {
      if (this.isCatalogOpen()) this.closeCatalog();
      else this.openCatalog();
    },

    switchCatalogTab(tab) {
      // Сбрасываем все вкладки
      tabVehicles.classList.remove('active');
      tabTracks.classList.remove('active');
      if (tabCompetitive) tabCompetitive.classList.remove('active');
      panelVehicles.classList.add('hidden');
      panelTracks.classList.add('hidden');
      if (panelCompetitive) panelCompetitive.classList.add('hidden');

      if (tab === 'vehicles') {
        tabVehicles.classList.add('active');
        panelVehicles.classList.remove('hidden');
      } else if (tab === 'tracks') {
        tabTracks.classList.add('active');
        panelTracks.classList.remove('hidden');
      } else if (tab === 'competitive') {
        if (tabCompetitive) tabCompetitive.classList.add('active');
        if (panelCompetitive) panelCompetitive.classList.remove('hidden');
        // Обновляем имя машины игрока в списке стартового поля
        const playerCarEl = el('#competitive-player-car');
        const playerLabelEl = el('#competitive-player-label');
        if (playerCarEl) playerCarEl.textContent = (game.currentVehicleId || 'ВАШ АВТОМОБИЛЬ').toUpperCase().replace(/-/g, ' ');
        if (playerLabelEl) playerLabelEl.textContent = 'Ваш выбор · Стартовая позиция P5';
      }
    },

    refreshCatalogViews() {
      renderVehicleCards();
      renderTrackCards();
    },
  };

  // Слушатели переключения вкладок каталога
  tabVehicles.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    ui.switchCatalogTab('vehicles');
  });
  tabTracks.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    ui.switchCatalogTab('tracks');
  });
  if (tabCompetitive) {
    tabCompetitive.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ui.switchCatalogTab('competitive');
    });
  }

  // Слушатели кнопок открытия каталога
  el('#open-catalog-btn').addEventListener('click', () => ui.openCatalog());
  el('#intro-catalog-btn').addEventListener('click', () => ui.openCatalog());
  el('#pause-catalog-btn').addEventListener('click', () => ui.openCatalog());
  el('#finish-catalog-btn').addEventListener('click', () => ui.openCatalog('tracks'));
  el('#close-catalog-btn').addEventListener('click', () => ui.closeCatalog());

  // Делегирование выбора машин и трасс в каталоге (по карточке или кнопке)
  vehiclesGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.vehicle-card');
    if (!card) return;
    const vehicleId = card.getAttribute('data-vehicle-id');
    if (vehicleId) game.selectVehicle(vehicleId);
  });

  tracksGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.track-card');
    if (!card) return;
    const trackId = card.getAttribute('data-track-id');
    if (trackId) game.selectTrack(trackId);
  });

  el('#start-race').addEventListener('click', () => ui.start());
  el('#resume-race').addEventListener('click', () => { game.race.resume(); game.paused = false; ui.setPaused(false); });
  el('#reset-race').addEventListener('click', () => { game.vehicle.reset(); game.race.reset(); game.paused = false; ui.setPaused(false); ui.start(); });
  el('#again-race').addEventListener('click', () => { finish.classList.add('hidden'); game.vehicle.reset(); game.race.reset(); game.paused = false; ui.start(); });
  el('#return-menu').addEventListener('click', () => ui.showIntro());

  // Кнопка СТАРТ СОРЕВНОВАНИЯ — переключаем трассу на Гран-При и запускаем гонку
  const competitiveStartBtn = el('#competitive-start-btn');
  if (competitiveStartBtn) {
    competitiveStartBtn.addEventListener('click', () => {
      if (game.currentTrackId !== 'apex-grand-prix') {
        game.selectTrack('apex-grand-prix');
        // Ждём смены трассы (selectTrack синхронная), затем запускаем
        window.requestAnimationFrame(() => {
          ui.start();
        });
      } else {
        if (game.race) { game.race.reset(); }
        ui.start();
      }
    });
  }

  el('#sound-toggle').addEventListener('click', (event) => {
    audioManager.ensureRunning();
    const isEnabled = audioManager.toggleMute();
    game.soundEnabled = isEnabled;
    event.currentTarget.classList.toggle('is-muted', !isEnabled);
    event.currentTarget.textContent = isEnabled ? '♫' : '×';
    ui.notify(isEnabled ? 'ЗВУК ВКЛЮЧЁН' : 'ЗВУК ВЫКЛЮЧЕН');
  });

  return ui;
}
