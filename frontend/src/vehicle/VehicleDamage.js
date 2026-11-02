export class VehicleDamage {
  constructor({ forceThreshold = 900, damagePerForce = 0.004, cooldownSeconds = 0.45, maxDamage = 40 } = {}) {
    this.forceThreshold = forceThreshold;
    this.damagePerForce = damagePerForce;
    this.cooldownSeconds = cooldownSeconds;
    this.maxDamage = maxDamage;
    this.condition = 100;
    this.lastImpactAt = -Infinity;
  }

  applyImpact({ forceMagnitude, impactDirection, now }) {
    if (!Number.isFinite(forceMagnitude) || forceMagnitude < this.forceThreshold || now - this.lastImpactAt < this.cooldownSeconds) {
      return { damage: 0, condition: this.condition, zone: null };
    }

    this.lastImpactAt = now;
    const rawDamage = 1 + (forceMagnitude - this.forceThreshold) * this.damagePerForce;
    const amount = Math.min(this.maxDamage, Math.max(1, Math.round(rawDamage)));
    const x = Math.abs(impactDirection?.x ?? 0);
    const z = Math.abs(impactDirection?.z ?? 1);
    const zone = z >= x
      ? (impactDirection?.z >= 0 ? 'front' : 'rear')
      : (impactDirection?.x >= 0 ? 'left' : 'right');
    this.condition = Math.max(0, this.condition - amount);
    return { damage: amount, condition: this.condition, zone };
  }

  reset() {
    this.condition = 100;
    this.lastImpactAt = -Infinity;
    return this.condition;
  }
}
