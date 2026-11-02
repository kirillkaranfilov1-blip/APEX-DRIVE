// APEX DRIVE Soft Web Audio Engine
// Бархатистый, мягкий и комфортный для слуха звук: глубокий бас выхлопа, шелест резины, мягкие сигналы

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this.initialized = false;

    // Двигатель (мягкий V8/V6 рокот)
    this.engineSub = null;
    this.engineMain = null;
    this.engineHarmonic = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.lastGear = 1;

    // Визг шин (мягкий шелест резины)
    this.screechGain = null;
    this.screechFilter = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Мастер-громкость: комфортный, умеренно тихий уровень 0.32
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.enabled ? 0.32 : 0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupTireScreech();

      this.initialized = true;
    } catch (err) {
      console.warn('Web Audio API не поддерживается или заблокирован:', err);
    }
  }

  ensureRunning() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    const now = this.ctx.currentTime;

    // 1. Глубокий мягкий саб-бас (урчание цилиндров на низких частотах)
    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.setValueAtTime(36, now);

    // 2. Теплый основной тон (мягкая треугольная волна)
    this.engineMain = this.ctx.createOscillator();
    this.engineMain.type = 'triangle';
    this.engineMain.frequency.setValueAtTime(54, now);

    // 3. Легкая текстура для характера выхлопа (приглушенная пила с низким усилением)
    this.engineHarmonic = this.ctx.createOscillator();
    this.engineHarmonic.type = 'sawtooth';
    this.engineHarmonic.frequency.setValueAtTime(72, now);

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.22, now);
    this.engineHarmonic.connect(harmonicGain);

    // Низкочастотный фильтр: срезает все едкие высокие частоты выше 420 Гц
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(260, now);
    this.engineFilter.Q.setValueAtTime(1.8, now);

    // Микшер двигателя
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, now);

    this.engineSub.connect(this.engineFilter);
    this.engineMain.connect(this.engineFilter);
    harmonicGain.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineSub.start();
    this.engineMain.start();
    this.engineHarmonic.start();
  }

  setupTireScreech() {
    // Мягкий шум для шелеста шин
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Мягкий полосовой фильтр на частоту 720-950 Гц (без пронзительного свиста)
    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(750, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(1.6, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    whiteNoise.start();
  }

  // Обновление звука мотора и шин
  updateTelemetry({ speedKph, throttle, brake, handbrake, gear, isDrifting }) {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Передаточные числа для плавного нарастания баса
    const gearRatios = [1, 2.6, 1.8, 1.35, 1.05, 0.85, 0.7];
    const currentRatio = gear === 'R' ? 2.2 : gearRatios[gear] || 1.0;

    // Обороты: бархатистый диапазон от 36 Гц (холостые) до 125 Гц (отсечка)
    const baseFreq = 36;
    const revs = (speedKph * 0.9 * currentRatio) % 75;
    const targetFreq = baseFreq + revs + (throttle ? 14 : 0);

    this.engineSub.frequency.setTargetAtTime(targetFreq * 0.65, now, 0.08);
    this.engineMain.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineHarmonic.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.08);

    // Мягкий срез фильтра: приятный приглушенный бас
    const filterCutoff = throttle ? Math.min(520, 260 + targetFreq * 2.2) : 220;
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.1);

    // Громкость двигателя: негромкая, фоновая
    const targetEngineVol = throttle ? 0.14 : 0.06 + Math.min(0.04, speedKph / 3000);
    this.engineGain.gain.setTargetAtTime(targetEngineVol, now, 0.09);

    // Мягкий сброс турбины при повышении передачи
    if (gear !== this.lastGear && typeof gear === 'number' && gear > this.lastGear && speedKph > 20) {
      this.playGearShiftPop();
    }
    this.lastGear = gear;

    // Мягкий шелест резины (максимум 0.12 громкости)
    const screechIntensity = (handbrake ? 0.09 : 0) + (isDrifting ? 0.11 : 0) + (brake && speedKph > 35 ? 0.07 : 0);
    const clampedScreech = Math.min(0.12, screechIntensity);
    this.screechGain.gain.setTargetAtTime(clampedScreech, now, 0.06);

    if (clampedScreech > 0.02) {
      const screechFreq = 680 + Math.min(280, speedKph * 1.2);
      this.screechFilter.frequency.setTargetAtTime(screechFreq, now, 0.06);
    }
  }

  // Мягкий приглушенный хлопок выхлопа
  playGearShiftPop() {
    if (!this.initialized || !this.enabled) return;
    const now = this.ctx.currentTime;
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();

    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(80, now);
    popOsc.frequency.exponentialRampToValueAtTime(28, now + 0.15);

    popGain.gain.setValueAtTime(0.12, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);

    popOsc.start(now);
    popOsc.stop(now + 0.16);
  }

  // Мягкий кинематографичный глухой бум при ударе
  playCollisionImpact(intensity = 1.0) {
    if (!this.initialized || !this.enabled) return;
    const now = this.ctx.currentTime;
    const impactOsc = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();

    impactOsc.type = 'sine';
    impactOsc.frequency.setValueAtTime(95, now);
    impactOsc.frequency.exponentialRampToValueAtTime(20, now + 0.32);

    const volume = Math.min(0.28, Math.max(0.08, intensity * 0.2));
    impactGain.gain.setValueAtTime(volume, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    impactOsc.connect(impactGain);
    impactGain.connect(this.masterGain);

    impactOsc.start(now);
    impactOsc.stop(now + 0.34);
  }

  // Мягкий ненавязчивый сигнал таймера
  playCountdownBeep(isGo = false) {
    if (!this.initialized || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isGo ? 659.25 : 392.0; // E5 (Go) или G4 (3, 2, 1) — мягкие созвучия
    osc.frequency.setValueAtTime(freq, now);

    const dur = isGo ? 0.28 : 0.14;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Нежный колокольчик прохождения чекпоинта
  playCheckpointDing() {
    if (!this.initialized || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.42);
  }

  // Мягкий победный перезвон на финише
  playFinishFanfare() {
    if (!this.initialized || !this.enabled) return;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.48);
    });
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.32 : 0, this.ctx.currentTime, 0.02);
    }
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
