import * as THREE from 'three';

const ZONES = {
  front: { axis: 2, faceNormal: 1, inward: -1 },
  rear: { axis: 2, faceNormal: -1, inward: 1 },
  left: { axis: 0, faceNormal: 1, inward: -1 },
  right: { axis: 0, faceNormal: -1, inward: 1 },
};

export class VehicleDamageVisual {
  constructor(mesh) {
    this.mesh = mesh;
    this.geometry = mesh.geometry;
    this.positions = this.geometry.attributes.position;
    this.normals = this.geometry.attributes.normal;
    this.colors = this.geometry.getAttribute('color');
    if (!this.colors) {
      this.colors = new THREE.BufferAttribute(new Float32Array(this.positions.count * 3).fill(1), 3);
      this.geometry.setAttribute('color', this.colors);
    }
    this.originalPositions = this.positions.array.slice();
    this.originalNormals = this.normals.array.slice();
    this.originalColors = this.colors.array.slice();
    this.zoneDamage = { front: 0, rear: 0, left: 0, right: 0 };
  }

  apply(zone, amount) {
    if (!ZONES[zone] || !Number.isFinite(amount) || amount <= 0) return;
    this.zoneDamage[zone] = Math.min(100, this.zoneDamage[zone] + amount * 2.2);
    this.restoreBaseGeometry();
    for (const [damageZone, intensity] of Object.entries(this.zoneDamage)) {
      if (intensity > 0) this.deformZone(damageZone, intensity);
    }
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  deformZone(zone, intensity) {
    const { axis, faceNormal, inward } = ZONES[zone];
    const center = 0;
    const facePosition = faceNormal * this.getHalfExtent(axis);
    const radius = 0.38 + intensity * 0.006;
    const depth = Math.min(0.2, 0.01 + intensity * 0.003);
    const tint = Math.min(0.58, intensity * 0.006);
    const positionArray = this.positions.array;
    const normalArray = this.originalNormals;
    const colorArray = this.colors.array;

    for (let index = 0; index < this.positions.count; index += 1) {
      const offset = index * 3;
      if (normalArray[offset + axis] * faceNormal < 0.9) continue;
      if (Math.abs(this.originalPositions[offset + axis] - facePosition) > 1e-4) continue;
      const otherAxis = axis === 2 ? 0 : 2;
      const distance = Math.hypot(this.originalPositions[offset + otherAxis] - center, this.originalPositions[offset + 1]);
      const influence = Math.max(0, 1 - distance / radius);
      if (influence === 0) continue;
      const dent = depth * influence * influence;
      positionArray[offset + axis] += inward * dent;
      const shade = 1 - tint * influence;
      colorArray[offset] = Math.min(colorArray[offset], shade);
      colorArray[offset + 1] = Math.min(colorArray[offset + 1], shade);
      colorArray[offset + 2] = Math.min(colorArray[offset + 2], shade);
    }
  }

  getHalfExtent(axis) {
    const values = this.originalPositions;
    let extent = 0;
    for (let index = axis; index < values.length; index += 3) extent = Math.max(extent, Math.abs(values[index]));
    return extent;
  }

  restoreBaseGeometry() {
    this.positions.array.set(this.originalPositions);
    this.colors.array.set(this.originalColors);
  }

  reset() {
    this.zoneDamage = { front: 0, rear: 0, left: 0, right: 0 };
    this.restoreBaseGeometry();
    this.normals.array.set(this.originalNormals);
    this.positions.needsUpdate = true;
    this.normals.needsUpdate = true;
    this.colors.needsUpdate = true;
  }
}
