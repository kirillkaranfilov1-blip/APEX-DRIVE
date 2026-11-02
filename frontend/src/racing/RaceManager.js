export const RaceState = Object.freeze({
  LOADING: 'LOADING', COUNTDOWN: 'COUNTDOWN', RACING: 'RACING',
  PAUSED: 'PAUSED', FINISHED: 'FINISHED',
});

const TRANSITIONS = {
  LOADING: ['COUNTDOWN'],
  COUNTDOWN: ['RACING', 'PAUSED', 'LOADING'],
  RACING: ['PAUSED', 'FINISHED', 'LOADING'],
  PAUSED: ['RACING', 'LOADING'],
  FINISHED: ['LOADING', 'COUNTDOWN'],
};

export class RaceManager {
  constructor({ checkpoints, totalLaps = 2, onChange = () => {} }) {
    this.checkpoints = checkpoints;
    this.totalLaps = totalLaps;
    this.onChange = onChange;
    this.reset();
  }

  setTrack(checkpoints, totalLaps = 2) {
    this.checkpoints = checkpoints;
    this.totalLaps = totalLaps;
    this.reset();
  }

  reset() {
    this.state = RaceState.LOADING;
    this.elapsed = 0;
    this.currentLap = 1;
    this.nextCheckpoint = 0;
    this.lastCheckpoint = -1;
    this.transition(RaceState.COUNTDOWN);
  }

  transition(next) {
    if (!TRANSITIONS[this.state]?.includes(next)) throw new Error(`Недопустимый переход гонки: ${this.state} → ${next}`);
    this.state = next;
    this.onChange(next, this);
  }

  start() { if (this.state === RaceState.COUNTDOWN) this.transition(RaceState.RACING); }
  pause() { if (this.state === RaceState.RACING || this.state === RaceState.COUNTDOWN) this.transition(RaceState.PAUSED); }
  resume() { if (this.state === RaceState.PAUSED) this.transition(RaceState.RACING); }

  update(dt, position) {
    if (this.state !== RaceState.RACING) return null;
    this.elapsed += dt;
    const target = this.checkpoints[this.nextCheckpoint];
    if (!target || Math.hypot(position.x - target.x, position.z - target.z) > target.radius) return null;
    this.lastCheckpoint = this.nextCheckpoint;
    this.nextCheckpoint = (this.nextCheckpoint + 1) % this.checkpoints.length;
    if (this.nextCheckpoint === 0) {
      if (this.currentLap === this.totalLaps) {
        this.transition(RaceState.FINISHED);
        return 'finished';
      }
      this.currentLap += 1;
      return 'lap';
    }
    return 'checkpoint';
  }
}
