import { describe, expect, it } from 'vitest';
import { RaceManager, RaceState } from '../../frontend/src/racing/RaceManager.js';
import { formatTime } from '../../frontend/src/utils/math.js';

describe('RaceManager', () => {
  it('allows progress only through checkpoints in order and finishes after the required laps', () => {
    const checkpoints = [{ x: 0, z: 0, radius: 2 }, { x: 10, z: 0, radius: 2 }];
    const race = new RaceManager({ checkpoints, totalLaps: 2 });
    race.start();

    expect(race.update(1, { x: 10, z: 0 })).toBeNull();
    expect(race.nextCheckpoint).toBe(0);
    expect(race.update(1, { x: 0, z: 0 })).toBe('checkpoint');
    expect(race.update(1, { x: 10, z: 0 })).toBe('lap');
    expect(race.currentLap).toBe(2);
    expect(race.update(1, { x: 0, z: 0 })).toBe('checkpoint');
    expect(race.update(1, { x: 10, z: 0 })).toBe('finished');
    expect(race.state).toBe(RaceState.FINISHED);
  });

  it('rejects illegal state transitions', () => {
    const race = new RaceManager({ checkpoints: [{ x: 0, z: 0, radius: 2 }] });
    expect(() => race.transition(RaceState.FINISHED)).toThrow('Недопустимый переход');
  });
});

describe('time display', () => {
  it('formats a race time as minutes, seconds, and hundredths', () => {
    expect(formatTime(74.289)).toBe('01:14.28');
  });
});
