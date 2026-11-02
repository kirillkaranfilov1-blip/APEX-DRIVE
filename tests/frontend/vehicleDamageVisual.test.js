import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { VehicleDamageVisual } from '../../frontend/src/vehicle/VehicleDamageVisual.js';

function createBodyMesh() {
  const geometry = new THREE.BoxGeometry(2, 0.5, 4, 8, 4, 16);
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3).fill(1), 3));
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
}

describe('VehicleDamageVisual', () => {
  it('deforms and darkens only the selected panel, then restores original geometry', () => {
    const mesh = createBodyMesh();
    const visual = new VehicleDamageVisual(mesh);
    const originalPositions = mesh.geometry.attributes.position.array.slice();
    const originalColors = mesh.geometry.attributes.color.array.slice();

    visual.apply('front', 20);
    const positions = mesh.geometry.attributes.position.array;
    const colors = mesh.geometry.attributes.color.array;
    const frontVertices = [];
    let frontVertexMovedInward = false;
    for (let index = 0; index < positions.length; index += 3) {
      if (originalPositions[index + 2] > 1.99) {
        frontVertices.push(index);
        if (positions[index + 2] < originalPositions[index + 2]) frontVertexMovedInward = true;
      } else {
        expect(positions[index + 2]).toBe(originalPositions[index + 2]);
      }
    }
    expect(frontVertexMovedInward).toBe(true);
    expect(frontVertices.some((index) => colors[index] !== originalColors[index])).toBe(true);

    visual.reset();
    expect(mesh.geometry.attributes.position.array).toEqual(originalPositions);
    expect(mesh.geometry.attributes.color.array).toEqual(originalColors);
  });

  it('keeps damage geometry isolated between vehicle instances', () => {
    const first = createBodyMesh();
    const second = createBodyMesh();
    const firstOriginal = second.geometry.attributes.position.array.slice();
    new VehicleDamageVisual(first).apply('left', 30);

    expect(second.geometry.attributes.position.array).toEqual(firstOriginal);
  });
});
