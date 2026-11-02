const KEY_MAP = {
  KeyW: 'accelerate', ArrowUp: 'accelerate',
  KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'handbrake',
};

export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.held = new Set();
    this.pressed = new Set();
    this.enabled = true;
    this.onKeyDown = (event) => {
      if (KEY_MAP[event.code] || ['Escape', 'KeyR', 'KeyH', 'KeyC'].includes(event.code)) event.preventDefault();
      if (!this.held.has(event.code)) this.pressed.add(event.code);
      this.held.add(event.code);
    };
    this.onKeyUp = (event) => this.held.delete(event.code);
    this.onBlur = () => { this.held.clear(); this.pressed.clear(); };
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  isDown(action) {
    return this.enabled && [...this.held].some((code) => KEY_MAP[code] === action);
  }

  consume(code) {
    if (!this.enabled || !this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  clearPressed() { this.pressed.clear(); }

  dispose() {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
