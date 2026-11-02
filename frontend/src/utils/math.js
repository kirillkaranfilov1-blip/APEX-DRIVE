export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const wholeSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  const hundredths = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
  return `${minutes}:${wholeSeconds}.${hundredths}`;
}

export function smoothDamp(current, target, smoothing, dt) {
  const blend = 1 - Math.exp(-Math.max(0.01, smoothing) * dt);
  return current + (target - current) * blend;
}
