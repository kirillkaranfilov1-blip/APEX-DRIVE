/**
 * DamageModel — модель физических повреждений автомобиля.
 * Накапливает урон по зонам, снижает скорость/тягу/управляемость.
 */

const DAMAGE_FORCE_THRESHOLD = 600;  // Н — порог для регистрации урона
const DAMAGE_SCALE = 0.0018;         // очки урона / (Н – порог)
const MAX_ZONE_DAMAGE = 100;         // максимум на зону

const IMPACT_ZONES = [
  { name: 'front', zMin: 0.50,  zMax: 1.0,   xMin: -1.0,  xMax: 1.0  },
  { name: 'rear',  zMin: -1.0,  zMax: -0.50, xMin: -1.0,  xMax: 1.0  },
  { name: 'right', zMin: -0.50, zMax: 0.50,  xMin:  0.50, xMax: 1.0  },
  { name: 'left',  zMin: -0.50, zMax: 0.50,  xMin: -1.0,  xMax: -0.50 },
];

export class DamageModel {
  constructor() {
    this.zoneDamage = { front: 0, rear: 0, left: 0, right: 0 };
    this.lastImpact = null;
  }

  /**
   * Обрабатывает событие контактной силы Rapier.
   * @param {object} contact  — { maxForceMagnitude, maxForceDirection: {x,y,z} }
   * @param {{ x,y,z,w }} vehicleQuaternion — кватернион машины в мировых координатах
   * @returns {{ zone: string, amount: number } | null}
   */
  applyContactForce(contact, vehicleQuaternion) {
    const force = contact.maxForceMagnitude;
    if (force < DAMAGE_FORCE_THRESHOLD) return null;

    const excess = force - DAMAGE_FORCE_THRESHOLD;
    const damageAmount = Math.min(excess * DAMAGE_SCALE, 18);

    const localDir = this._worldToLocal(contact.maxForceDirection, vehicleQuaternion);
    const zone = this._classifyZone(localDir);

    this.zoneDamage[zone] = Math.min(MAX_ZONE_DAMAGE, this.zoneDamage[zone] + damageAmount);
    this.lastImpact = { zone, amount: damageAmount, force };
    return { zone, amount: damageAmount };
  }

  /** Суммарное здоровье машины [0..1]. 1 = нет повреждений. */
  getHealth() {
    const total = this.zoneDamage.front + this.zoneDamage.rear
      + this.zoneDamage.left + this.zoneDamage.right;
    return Math.max(0, 1 - total / 280);
  }

  /**
   * Множители деградации физики.
   * Применяются в Vehicle.preStep() для ослабления параметров.
   */
  getPhysicsMultipliers() {
    const f = this.zoneDamage.front / MAX_ZONE_DAMAGE;
    const r = this.zoneDamage.rear  / MAX_ZONE_DAMAGE;
    const s = (this.zoneDamage.left + this.zoneDamage.right) / (2 * MAX_ZONE_DAMAGE);

    return {
      // Урон сзади → двигатель (задний/полный привод)
      engineFactor:   Math.max(0.18, 1 - r * 0.68 - f * 0.12),
      // Урон спереди → руление
      steeringFactor: Math.max(0.30, 1 - f * 0.60 - s * 0.20),
      // Любой урон → сцепление шин
      frictionFactor: Math.max(0.70, 1 - (f + r + s) * 0.11),
      // Максимальная скорость
      maxSpeedFactor: Math.max(0.22, 1 - r * 0.50 - f * 0.10),
      // Тормоза (урон спереди снижает эффективность)
      brakeFactor:    Math.max(0.40, 1 - f * 0.40),
    };
  }

  /** Текстовый статус для HUD */
  getStatusLabel() {
    const hp = this.getHealth();
    if (hp > 0.88) return 'ОТЛИЧНО';
    if (hp > 0.70) return 'ХОРОШО';
    if (hp > 0.48) return 'ПОВРЕЖДЕНА';
    if (hp > 0.28) return 'СЕРЬЁЗНО';
    return 'КРИТИЧНО';
  }

  /** Цвет статуса */
  getStatusColor() {
    const hp = this.getHealth();
    if (hp > 0.70) return '#d7f36a';
    if (hp > 0.42) return '#f5a623';
    return '#e63946';
  }

  reset() {
    this.zoneDamage = { front: 0, rear: 0, left: 0, right: 0 };
    this.lastImpact = null;
  }

  // ─── Приватные вспомогательные методы ────────────────────────────────────

  /** Вращает мировой вектор в локальное пространство машины (обратный кватернион) */
  _worldToLocal(worldDir, q) {
    const cx = -q.x, cy = -q.y, cz = -q.z, cw = q.w;
    const { x, y, z } = worldDir;
    const tx = 2 * (cy * z - cz * y);
    const ty = 2 * (cz * x - cx * z);
    const tz = 2 * (cx * y - cy * x);
    return {
      x: x + cw * tx + cy * tz - cz * ty,
      y: y + cw * ty + cz * tx - cx * tz,
      z: z + cw * tz + cx * ty - cy * tx,
    };
  }

  /** Определяет зону по локальному направлению вектора силы (XZ плоскость) */
  _classifyZone(localDir) {
    const mag = Math.hypot(localDir.x, localDir.z) || 1;
    const nx = localDir.x / mag;
    const nz = localDir.z / mag;

    for (const zone of IMPACT_ZONES) {
      if (nz >= zone.zMin && nz <= zone.zMax && nx >= zone.xMin && nx <= zone.xMax) {
        return zone.name;
      }
    }
    return Math.abs(nz) > Math.abs(nx)
      ? (nz > 0 ? 'front' : 'rear')
      : (nx > 0 ? 'right' : 'left');
  }
}
