import * as THREE from 'three';

const wheelSpecs = [
  { x: 0.91, y: -0.24, z: 1.18, front: true },
  { x: -0.91, y: -0.24, z: 1.18, front: true },
  { x: 0.91, y: -0.24, z: -1.12, front: false },
  { x: -0.91, y: -0.24, z: -1.12, front: false },
];

function createAIModel(config) {
  const root = new THREE.Group();
  const carPaintColor = config?.paintColor ?? 0x1f5fbf;

  const paint = new THREE.MeshPhysicalMaterial({
    color: carPaintColor,
    metalness: 0.75,
    roughness: 0.25,
    clearcoat: 0.85,
  });

  const darkPaint = new THREE.MeshStandardMaterial({ color: 0x15191d, metalness: 0.45, roughness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0f171c, metalness: 0.4, roughness: 0.15, transparent: true, opacity: 0.92 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.92 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xc8cece, metalness: 0.85, roughness: 0.22 });

  // Кузов
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.48, 3.5), paint);
  body.position.y = 0.57;
  body.castShadow = true;
  root.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.22, 1.13), paint);
  hood.position.set(0, 0.87, 1.0);
  hood.castShadow = true;
  root.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.62, 1.58), glass);
  cabin.position.set(0, 1.04, -0.1);
  cabin.castShadow = true;
  root.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.95), darkPaint);
  roof.position.set(0, 1.37, -0.08);
  root.add(roof);

  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.13, 0.24), darkPaint);
  frontLip.position.set(0, 0.34, 1.8);
  root.add(frontLip);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.28), darkPaint);
  rearBumper.position.set(0, 0.4, -1.79);
  root.add(rearBumper);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 0.28), darkPaint);
  spoiler.position.set(0, 1.2, -1.59);
  root.add(spoiler);

  // Фары
  const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xe8f4ff });
  const rearLightMaterial = new THREE.MeshBasicMaterial({ color: 0xe6372d });
  for (const sign of [-1, 1]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.07), headlightMaterial);
    headlight.position.set(sign * 0.56, 0.77, 1.765);
    root.add(headlight);
    const rearLight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.07), rearLightMaterial);
    rearLight.position.set(sign * 0.55, 0.76, -1.765);
    root.add(rearLight);
  }

  // Колеса
  const wheels = wheelSpecs.map((spec) => {
    const pivot = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.25, 20, 1), rubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    pivot.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.265, 12, 1), alloy);
    rim.rotation.z = Math.PI / 2;
    pivot.add(rim);
    pivot.position.set(spec.x, 0.37, spec.z);
    root.add(pivot);
    return { pivot, tire, spec };
  });

  return { root, wheels };
}

export class AIRacer {
  constructor({ id, name, config, scene, physics, curve, laneOffset = 0, initialProgress = 0, maxSpeedKph = 250, aggression = 1.0 }) {
    this.id = id;
    this.name = name;
    this.config = config;
    this.scene = scene;
    this.physics = physics;
    this.curve = curve;
    this.laneOffset = laneOffset;
    this.baseLaneOffset = laneOffset;
    this.progress = initialProgress;
    this.initialProgress = initialProgress;
    this.currentLap = 1;
    this.speed = 0; // м/с
    this.maxSpeedMps = (maxSpeedKph / 3.6) * (0.94 + Math.random() * 0.08);
    this.accelRate = 18.0 * aggression;
    this.brakeRate = 32.0;
    this.curveLength = curve.getLength();

    // 3D визуализация
    this.visual = createAIModel(this.config);
    this.scene.add(this.visual.root);

    // Физическое тело в Rapier (кинематическое с коллайдером для реалистичных столкновений с игроком)
    const { RAPIER, world } = physics;
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.9, 0);
    this.body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(0.9, 0.38, 1.8).setFriction(0.6).setRestitution(0.1);
    world.createCollider(colliderDesc, this.body);

    this.wheelRotation = 0;
    this.steerAngle = 0;
    this.syncToProgress(this.progress);
  }

  reset(newProgress = this.initialProgress, newLap = 1) {
    this.progress = newProgress;
    this.currentLap = newLap;
    this.speed = 0;
    this.wheelRotation = 0;
    this.steerAngle = 0;
    this.laneOffset = this.baseLaneOffset;
    this.syncToProgress(this.progress);
  }

  // Расчет кривизны сплайна впереди для реалистичного торможения
  estimateCurvatureAhead(lookAheadMeters = 24) {
    const deltaT = lookAheadMeters / this.curveLength;
    const tNow = (this.progress % 1 + 1) % 1;
    const tAhead = (tNow + deltaT) % 1;

    const tanNow = this.curve.getTangentAt(tNow);
    const tanAhead = this.curve.getTangentAt(tAhead);
    const dot = Math.max(-1, Math.min(1, tanNow.dot(tanAhead)));
    return Math.acos(dot); // Угол поворота в радианах
  }

  update(dt, isRacing = true) {
    if (!isRacing) {
      this.speed = 0;
      this.syncToProgress(this.progress);
      return;
    }

    // 1. Оценка кривизны и выбор скорости
    const turnAngle = this.estimateCurvatureAhead(26);
    // Чем круче поворот, тем сильнее торможение перед апексом
    let safeSpeedMps = this.maxSpeedMps;
    if (turnAngle > 0.45) {
      safeSpeedMps = Math.min(safeSpeedMps, 32); // ~115 км/ч
    } else if (turnAngle > 0.28) {
      safeSpeedMps = Math.min(safeSpeedMps, 44); // ~160 км/ч
    }

    // Плавное ускорение или торможение
    if (this.speed < safeSpeedMps) {
      this.speed = Math.min(safeSpeedMps, this.speed + this.accelRate * dt);
    } else {
      this.speed = Math.max(safeSpeedMps, this.speed - this.brakeRate * dt);
    }

    // Легкие реалистичные микро-колебания траектории (борьба за позицию)
    this.laneOffset = this.baseLaneOffset + Math.sin(this.progress * 48) * 0.4;

    // Продвижение по сплайну трассы
    const deltaProgress = (this.speed * dt) / this.curveLength;
    this.progress += deltaProgress;

    if (this.progress >= 1.0) {
      this.progress -= 1.0;
      this.currentLap += 1;
    }

    this.syncToProgress(this.progress);

    // Вращение колес
    this.wheelRotation += (this.speed / 0.37) * dt;
    for (const w of this.visual.wheels) {
      w.tire.rotation.x = this.wheelRotation;
      if (w.spec.front) {
        w.pivot.rotation.y = this.steerAngle;
      }
    }
  }

  syncToProgress(p) {
    const t = (p % 1 + 1) % 1;
    const center = this.curve.getPointAt(t);
    const tangent = this.curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Позиция со смещением по полосе движения
    const x = center.x + side.x * this.laneOffset;
    const z = center.z + side.z * this.laneOffset;
    const y = 0.9;

    // Угол поворота машины вдоль касательной трассы
    const yaw = Math.atan2(tangent.x, tangent.z);
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    // Обновляем визуальную модель Three.js
    this.visual.root.position.set(x, y - 0.57, z);
    this.visual.root.quaternion.copy(rot);

    // Обновляем кинематическое тело в Rapier для столкновений
    this.body.setNextKinematicTranslation({ x, y, z });
    this.body.setNextKinematicRotation(rot);
  }

  getTotalProgress() {
    return (this.currentLap - 1) + ((this.progress % 1 + 1) % 1);
  }

  getPosition() {
    return {
      x: this.visual.root.position.x,
      y: this.visual.root.position.y + 0.57,
      z: this.visual.root.position.z,
    };
  }

  dispose() {
    if (this.scene && this.visual?.root) {
      this.scene.remove(this.visual.root);
    }
    if (this.physics?.world && this.body) {
      this.physics.world.removeRigidBody(this.body);
    }
  }
}
