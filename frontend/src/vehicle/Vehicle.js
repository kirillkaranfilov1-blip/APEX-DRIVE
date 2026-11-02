import * as THREE from 'three';
import { clamp } from '../utils/math.js';
import { starterVehicle } from './vehicleConfig.js';
import { VehicleDamageVisual } from './VehicleDamageVisual.js';
import { DamageModel } from './DamageModel.js';

const wheelSpecs = [
  { x: 0.91, y: -0.24, z: 1.18, front: true },
  { x: -0.91, y: -0.24, z: 1.18, front: true },
  { x: 0.91, y: -0.24, z: -1.12, front: false },
  { x: -0.91, y: -0.24, z: -1.12, front: false },
];

function createVehicleModel(vehicleConfig = starterVehicle) {
  const root = new THREE.Group();
  const carPaintColor = vehicleConfig?.paintColor ?? 0xc54b35;

  const paint = new THREE.MeshPhysicalMaterial({
    color: carPaintColor,
    metalness: 0.74,
    roughness: 0.25,
    clearcoat: 0.88,
    clearcoatRoughness: 0.16,
    vertexColors: true,
  });

  const darkPaint = new THREE.MeshStandardMaterial({ color: 0x192127, metalness: 0.42, roughness: 0.28 });
  const carbonMaterial = new THREE.MeshStandardMaterial({ color: 0x141618, roughness: 0.6, metalness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x101b22, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.93, clearcoat: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.9 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xd2d7d8, metalness: 0.88, roughness: 0.2 });

  const bodyGeometry = new THREE.BoxGeometry(1.82, 0.48, 3.5, 8, 4, 16);
  bodyGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bodyGeometry.attributes.position.count * 3).fill(1), 3));
  const body = new THREE.Mesh(bodyGeometry, paint);
  body.position.y = 0.57;
  body.castShadow = true;
  root.add(body);

  const isSupercar = vehicleConfig?.fallback === 'procedural-supercar' || vehicleConfig?.category === 'Supercar';
  const isMuscle = vehicleConfig?.category === 'Muscle Car';

  const hoodLength = isMuscle ? 1.3 : isSupercar ? 0.95 : 1.13;
  const hoodZ = isMuscle ? 0.92 : isSupercar ? 1.08 : 1.0;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.22, hoodLength), paint);
  hood.position.set(0, 0.87, hoodZ);
  hood.castShadow = true;
  root.add(hood);

  if (isMuscle) {
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.5), carbonMaterial);
    scoop.position.set(0, 1.02, 0.9);
    root.add(scoop);
  }

  const cabinHeight = isSupercar ? 0.52 : 0.62;
  const cabinY = isSupercar ? 0.99 : 1.04;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.42, cabinHeight, 1.58), glass);
  cabin.position.set(0, cabinY, -0.1);
  cabin.castShadow = true;
  root.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.95), darkPaint);
  roof.position.set(0, cabinY + cabinHeight / 2 + 0.05, -0.08);
  root.add(roof);

  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.13, 0.24), darkPaint);
  frontLip.position.set(0, 0.34, 1.8);
  root.add(frontLip);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.28), darkPaint);
  rearBumper.position.set(0, 0.4, -1.79);
  root.add(rearBumper);

  const spoilerWidth = isSupercar ? 1.8 : 1.65;
  const spoilerY = isSupercar ? 1.32 : 1.2;
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(spoilerWidth, 0.1, 0.28), isSupercar ? carbonMaterial : darkPaint);
  spoiler.position.set(0, spoilerY, -1.59);
  root.add(spoiler);

  if (isSupercar) {
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.1), carbonMaterial);
    leftPillar.position.set(-0.55, spoilerY - 0.12, -1.59);
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.1), carbonMaterial);
    rightPillar.position.set(0.55, spoilerY - 0.12, -1.59);
    root.add(leftPillar, rightPillar);
  }

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

  const wheels = wheelSpecs.map((spec) => {
    const pivot = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.25, 22, 1), rubber);
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

  return { root, wheels, body };
}

export class Vehicle {
  constructor({ physics, start, config = starterVehicle }) {
    this.config = config;
    this.physics = physics;
    this.start = start;
    const { RAPIER, world } = physics;
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), start.yaw);
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(start.x, start.y, start.z)
      .setRotation(rotation)
      .setLinearDamping(0.045)
      .setAngularDamping(1.5)
      .setCcdEnabled(true);
    this.body = world.createRigidBody(bodyDesc);
    const collider = RAPIER.ColliderDesc.cuboid(0.9, 0.32, 1.78)
      .setDensity(this.config.physics.chassisMass / (1.8 * 0.64 * 3.56))
      .setFriction(0.55)
      .setRestitution(0.05);
    world.createCollider(collider, this.body);
    this.controller = world.createVehicleController(this.body);
    this.controller.indexUpAxis = 1;
    this.controller.setIndexForwardAxis = 2;
    wheelSpecs.forEach((wheel) => this.controller.addWheel(
      { x: wheel.x, y: wheel.y, z: wheel.z },
      { x: 0, y: -1, z: 0 },
      { x: -1, y: 0, z: 0 },
      this.config.physics.suspensionRestLength,
      this.config.physics.wheelRadius,
    ));
    for (let index = 0; index < wheelSpecs.length; index += 1) {
      this.controller.setWheelFrictionSlip(index, this.config.physics.wheelFriction);
      this.controller.setWheelMaxSuspensionTravel(index, 0.24);
      this.controller.setWheelSuspensionStiffness(index, this.config.physics.suspensionStiffness);
      this.controller.setWheelSuspensionCompression(index, this.config.physics.suspensionCompression);
      this.controller.setWheelSuspensionRelaxation(index, this.config.physics.suspensionRelaxation);
      this.controller.setWheelMaxSuspensionForce(index, 8500);
    }
    this.visual = createVehicleModel(this.config);
    this.damageVisual = new VehicleDamageVisual(this.visual.body);
    this.damageModel = new DamageModel();
    this.speed = 0;
    this.steer = 0;
    this.braking = 0;
    this.reverseEngaged = false;
  }

  preStep(input, dt) {
    const p = this.config.physics;
    // Получаем множители деградации от модели повреждений
    const dm = this.damageModel.getPhysicsMultipliers();

    const localForward = this.controller.currentVehicleSpeed();
    const forward = localForward;
    const throttle = input.accelerate ? 1 : 0;
    const brake = input.brake ? 1 : 0;
    const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const speedInfluence = clamp(
      1 - Math.abs(forward) / p.steeringFadeSpeedMps,
      p.minimumSteeringFactor,
      1
    );
    // Повреждение спереди → хуже рулевой отклик
    const effectiveSteerAngle = p.maxSteeringAngle * dm.steeringFactor;
    this.steer += (steerInput * effectiveSteerAngle * speedInfluence - this.steer) * Math.min(1, dt * p.steeringResponse);

    const handbrake = input.handbrake ? 1 : 0;
    let engineCommand = 0;
    let brakeCommand = 0;
    if (!brake) this.reverseEngaged = false;
    else if (!this.reverseEngaged && forward <= 0.25) this.reverseEngaged = true;
    if (throttle && brake) {
      brakeCommand = p.brakeForce * dm.brakeFactor;
    } else if (throttle) {
      if (forward < -0.25) brakeCommand = p.brakeForce * dm.brakeFactor;
      // Повреждение зада / салона → падает тяга двигателя
      else engineCommand = p.engineForce * dm.engineFactor;
    } else if (brake) {
      if (this.reverseEngaged) engineCommand = -(p.reverseEngineForce ?? p.engineForce * 0.55) * dm.engineFactor;
      else brakeCommand = p.brakeForce * dm.brakeFactor;
    }
    const wheelIndices = [0, 1, 2, 3];
    for (const index of wheelIndices) {
      const isFront = index < 2;
      this.controller.setWheelSteering(index, isFront ? this.steer : 0);
      this.controller.setWheelEngineForce(index, engineCommand);
      this.controller.setWheelBrake(index, brakeCommand + (!isFront ? handbrake * p.handbrakeForce : 0));
      // Повреждения влияют на сцепление шин
      this.controller.setWheelFrictionSlip(index, p.wheelFriction * dm.frictionFactor);
    }
    this.controller.updateVehicle(dt, this.physics.RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    const currentForward = this.controller.currentVehicleSpeed();
    // Повреждения снижают максимальную скорость
    const effectiveMaxSpeed = p.maxSpeedMps * dm.maxSpeedFactor;
    const speedLimit = throttle ? effectiveMaxSpeed : brake ? (p.maxReverseSpeedMps ?? 14) : Infinity;
    const clampLimit = brake && !throttle ? Math.max(0, speedLimit - 0.75) : speedLimit;
    const drivingInRequestedDirection = (throttle && currentForward > clampLimit) || (brake && currentForward < -clampLimit);
    if (drivingInRequestedDirection) {
      const velocity = this.body.linvel();
      const ratio = clampLimit / Math.abs(currentForward);
      this.body.setLinvel({ x: velocity.x * ratio, y: velocity.y, z: velocity.z * ratio }, true);
    }
    this.speed = Math.min(Math.abs(currentForward), speedLimit);
    this.braking = brake;
  }

  syncVisual(dt) {
    const translation = this.body.translation();
    const rotation = this.body.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    this.visual.root.position.set(translation.x, translation.y - 0.57, translation.z);
    this.visual.root.quaternion.copy(quaternion);
    for (let i = 0; i < this.visual.wheels.length; i += 1) {
      const wheel = this.visual.wheels[i];
      const steer = wheel.spec.front ? this.steer : 0;
      wheel.pivot.rotation.y = steer;
      wheel.tire.rotation.x = this.controller.wheelRotation(i) ?? 0;
      wheel.pivot.position.y = 0.37 - (this.controller.wheelSuspensionLength(i) ?? this.config.physics.suspensionRestLength) * 0.36;
    }
    return this.getPosition();
  }

  getPosition() { const p = this.body.translation(); return { x: p.x, y: p.y, z: p.z }; }
  getSpeedKph() { return this.speed * 3.6; }
  getForwardSpeed() { return this.controller.currentVehicleSpeed(); }
  getDamageModel() { return this.damageModel; }

  /**
   * Применяет физическое повреждение от Rapier-контакта:
   * обновляет DamageModel + визуальную деформацию VehicleDamageVisual.
   */
  applyPhysicalDamage(contact) {
    const rotation = this.body.rotation();
    const impact = this.damageModel.applyContactForce(contact, rotation);
    if (impact) {
      this.damageVisual.apply(impact.zone, impact.amount);
    }
    return impact;
  }

  applyVisualDamage(zone, amount) { this.damageVisual.apply(zone, amount); }
  resetVisualDamage() { this.damageVisual.reset(); }

  reset() {
    this.resetVisualDamage();
    this.damageModel.reset();
    this.body.setTranslation({ x: this.start.x, y: this.start.y, z: this.start.z }, true);
    this.body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.start.yaw), true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  dispose(scene) {
    if (scene && this.visual?.root) {
      scene.remove(this.visual.root);
    }
    if (this.physics?.world && this.body) {
      this.physics.world.removeRigidBody(this.body);
    }
  }
}
