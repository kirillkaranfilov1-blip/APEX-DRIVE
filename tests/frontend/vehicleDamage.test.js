import { describe, expect, it } from 'vitest';
import { VehicleDamage } from '../../frontend/src/vehicle/VehicleDamage.js';

describe('VehicleDamage', () => {
  it('ignores weak contact forces', () => {
    const damage = new VehicleDamage({ forceThreshold: 900 });

    expect(damage.applyImpact({ forceMagnitude: 899, impactDirection: { x: 0, y: 0, z: 1 }, now: 0 }))
      .toMatchObject({ damage: 0, condition: 100, zone: null });
  });

  it('reduces condition and identifies the impact zone', () => {
    const damage = new VehicleDamage({ forceThreshold: 900 });

    expect(damage.applyImpact({ forceMagnitude: 3000, impactDirection: { x: 0, y: 0, z: 1 }, now: 1 }))
      .toMatchObject({ damage: expect.any(Number), zone: 'front' });
    expect(damage.condition).toBeLessThan(100);
  });

  it('limits repeated damage during a continuous contact', () => {
    const damage = new VehicleDamage({ forceThreshold: 900, cooldownSeconds: 0.5 });
    damage.applyImpact({ forceMagnitude: 3000, impactDirection: { x: 1, y: 0, z: 0 }, now: 1 });
    const condition = damage.condition;

    expect(damage.applyImpact({ forceMagnitude: 5000, impactDirection: { x: 1, y: 0, z: 0 }, now: 1.2 }))
      .toMatchObject({ damage: 0, condition, zone: null });
  });

  it('clamps condition at zero and restores it on reset', () => {
    const damage = new VehicleDamage({ forceThreshold: 900, maxDamage: 40 });
    for (let hit = 0; hit < 5; hit += 1) {
      damage.applyImpact({ forceMagnitude: 1e9, impactDirection: { x: 0, y: 0, z: -1 }, now: hit });
    }

    expect(damage.condition).toBe(0);
    expect(damage.reset()).toBe(100);
  });
});
