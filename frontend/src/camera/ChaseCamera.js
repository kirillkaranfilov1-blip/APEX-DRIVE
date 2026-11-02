import * as THREE from 'three';
import { clamp, smoothDamp } from '../utils/math.js';

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.targetPosition = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.forward = new THREE.Vector3();
  }

  update(vehicle, dt) {
    const car = vehicle.visual.root;
    this.forward.set(0, 0, 1).applyQuaternion(car.quaternion);
    const speed = vehicle.getSpeedKph();
    const distance = 8.6 + clamp(speed / 180, 0, 1) * 1.8;
    const desired = car.position.clone().addScaledVector(this.forward, -distance);
    desired.y += 3.7 + clamp(speed / 160, 0, 1) * 0.55;
    this.targetPosition.set(
      smoothDamp(this.camera.position.x, desired.x, 2.4, dt),
      smoothDamp(this.camera.position.y, desired.y, 2.1, dt),
      smoothDamp(this.camera.position.z, desired.z, 2.4, dt),
    );
    this.camera.position.copy(this.targetPosition);
    this.lookTarget.copy(car.position).addScaledVector(this.forward, 2.3);
    this.lookTarget.y += 0.65;
    this.camera.lookAt(this.lookTarget);
    const targetFov = 62 + clamp(speed / 8.5, 0, 1) * 9;
    this.camera.fov = smoothDamp(this.camera.fov, targetFov, 2.8, dt);
    this.camera.updateProjectionMatrix();
  }
}
