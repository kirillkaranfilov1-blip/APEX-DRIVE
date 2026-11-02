import * as THREE from 'three';

const textureCache = new Map();

function createProceduralCanvas(width, height, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 1. Текстуры дорожного покрытия
export function getRoadTexture(trackId) {
  const cacheKey = `road_${trackId}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

  let texture;
  if (trackId === 'starter-oval') {
    // Свежий гоночный гладкий асфальт с резиновыми следами
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#22252a';
      ctx.fillRect(0, 0, w, h);
      // Зернистость асфальта
      for (let i = 0; i < 18000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const tone = Math.random() > 0.5 ? '#2c3138' : '#191c20';
        ctx.fillStyle = tone;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      // Следы резины по краям
      ctx.fillStyle = 'rgba(10, 12, 15, 0.25)';
      ctx.fillRect(w * 0.15, 0, w * 0.12, h);
      ctx.fillRect(w * 0.73, 0, w * 0.12, h);
    });
    texture.repeat.set(1, 48);
  } else if (trackId === 'apex-grand-prix') {
    // Профессиональный автодром Гран-При: темный битум с накаткой шин и разметкой стартовой решетки
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#1c1f24';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 22000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#24282e' : '#15171a';
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      // Яркие резиновые траектории разгона
      ctx.fillStyle = 'rgba(8, 10, 12, 0.35)';
      ctx.fillRect(w * 0.22, 0, w * 0.16, h);
      ctx.fillRect(w * 0.62, 0, w * 0.16, h);
    });
    texture.repeat.set(1, 64);
  } else if (trackId === 'coastal-speedway') {
    // Светлый выгоревший на солнце прибрежный асфальт с песчинками
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#3a3f44';
      ctx.fillRect(0, 0, w, h);
      // Песчаные вкрапления
      for (let i = 0; i < 22000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.6 ? '#4e555c' : '#2d3236';
        ctx.fillRect(x, y, 1.8, 1.8);
      }
      // Легкий песчаный налет по обочине
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(195, 175, 140, 0.35)');
      grad.addColorStop(0.12, 'rgba(195, 175, 140, 0.0)');
      grad.addColorStop(0.88, 'rgba(195, 175, 140, 0.0)');
      grad.addColorStop(1, 'rgba(195, 175, 140, 0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
    texture.repeat.set(1, 40);
  } else if (trackId === 'ember-works') {
    // Старый индустриальный бетон с трещинами и масляными пятнами
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#26282b';
      ctx.fillRect(0, 0, w, h);
      // Грубая текстура
      for (let i = 0; i < 25000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#36393e' : '#17191b';
        ctx.fillRect(x, y, 2, 2);
      }
      // Масляные пятна
      for (let p = 0; p < 14; p += 1) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const r = 12 + Math.random() * 28;
        const oilGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
        oilGrad.addColorStop(0, 'rgba(12, 14, 16, 0.55)');
        oilGrad.addColorStop(1, 'rgba(12, 14, 16, 0)');
        ctx.fillStyle = oilGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    texture.repeat.set(1, 45);
  } else {
    // northwind-valley: Горный серпантин, влажный темный асфальт
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#1e2225';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 20000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#282d32' : '#14171a';
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    });
    texture.repeat.set(1, 48);
  }

  textureCache.set(cacheKey, texture);
  return texture;
}

// 2. Текстуры земли / обочины
export function getGroundTexture(trackId) {
  const cacheKey = `ground_${trackId}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

  let texture;
  if (trackId === 'starter-oval') {
    // Спортивный газон испытательного полигона
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#1c2e24';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 25000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#253d30' : '#13211a';
        ctx.fillRect(x, y, 2, 2);
      }
    });
    texture.repeat.set(30, 30);
  } else if (trackId === 'coastal-speedway') {
    // Золотистый песок и прибрежный песчаник
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#4a4133';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 30000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#5c5240' : '#393226';
        ctx.fillRect(x, y, 2, 2);
      }
    });
    texture.repeat.set(25, 25);
  } else if (trackId === 'ember-works') {
    // Индустриальный темный шлак и металлическая пыль
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#16191b';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 30000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#24282c' : '#0d0f11';
        ctx.fillRect(x, y, 2, 2);
      }
    });
    texture.repeat.set(30, 30);
  } else {
    // northwind-valley: Темная хвойная лесная земля
    texture = createProceduralCanvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#141e1b';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 24000; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#1d2c27' : '#0e1614';
        ctx.fillRect(x, y, 2, 2);
      }
    });
    texture.repeat.set(30, 30);
  }

  textureCache.set(cacheKey, texture);
  return texture;
}

// 3. Текстура и раскраска барьеров безопасности
export function getBarrierMaterial(trackId) {
  const cacheKey = `barrier_${trackId}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

  let material;
  if (trackId === 'starter-oval') {
    // Красно-белые гоночные поребрики/отбойники
    const texture = createProceduralCanvas(256, 128, (ctx, w, h) => {
      const half = w / 2;
      ctx.fillStyle = '#d63031';
      ctx.fillRect(0, 0, half, h);
      ctx.fillStyle = '#f5f6fa';
      ctx.fillRect(half, 0, half, h);
    });
    texture.repeat.set(16, 1);
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.65,
      metalness: 0.2,
    });
  } else if (trackId === 'ember-works') {
    // Желто-черная полоса промышленной безопасности
    const texture = createProceduralCanvas(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#1e2022';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(64, 0);
      ctx.lineTo(128, h);
      ctx.lineTo(64, h);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(128, 0);
      ctx.lineTo(192, 0);
      ctx.lineTo(256, h);
      ctx.lineTo(192, h);
      ctx.closePath();
      ctx.fill();
    });
    texture.repeat.set(14, 1);
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.35,
    });
  } else if (trackId === 'coastal-speedway') {
    // Бело-синие морские ограждения
    const texture = createProceduralCanvas(256, 128, (ctx, w, h) => {
      const half = w / 2;
      ctx.fillStyle = '#0984e3';
      ctx.fillRect(0, 0, half, h);
      ctx.fillStyle = '#dfe6e9';
      ctx.fillRect(half, 0, half, h);
    });
    texture.repeat.set(12, 1);
    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.3,
    });
  } else {
    // northwind-valley: Матовый оцинкованный стальной барьер
    material = new THREE.MeshStandardMaterial({
      color: 0x777b75,
      metalness: 0.35,
      roughness: 0.65,
    });
  }

  textureCache.set(cacheKey, material);
  return material;
}

// 4. Цветовая палитра неба, света и тумана для каждой трассы
export function getTrackEnvironment(trackId) {
  switch (trackId) {
    case 'starter-oval':
      return {
        background: 0x141b24,
        fogColor: 0x141b24,
        fogDensity: 0.006,
        hemiSky: 0xb5d6f2,
        hemiGround: 0x1f2d24,
        hemiIntensity: 1.25,
        moonColor: 0xe0edff,
        moonIntensity: 2.3,
        sunColor: 0x68b0e8,
        sunIntensity: 24,
      };
    case 'apex-grand-prix':
      // Гран-При: чистый ясный гоночный вечер, яркие мачты освещения
      return {
        background: 0x0f151d,
        fogColor: 0x0f151d,
        fogDensity: 0.005,
        hemiSky: 0xc2e2ff,
        hemiGround: 0x1a2b22,
        hemiIntensity: 1.35,
        moonColor: 0xf0f6ff,
        moonIntensity: 2.7,
        sunColor: 0x58b6f5,
        sunIntensity: 32,
      };
    case 'coastal-speedway':
      // Теплый океанский закат (Golden Hour)
      return {
        background: 0x241720,
        fogColor: 0x241720,
        fogDensity: 0.007,
        hemiSky: 0xf5a56c,
        hemiGround: 0x36251c,
        hemiIntensity: 1.35,
        moonColor: 0xffb885,
        moonIntensity: 2.6,
        sunColor: 0xff6b35,
        sunIntensity: 42,
      };
    case 'ember-works':
      // Темный индустриальный ночной автодром с янтарным свечением
      return {
        background: 0x131215,
        fogColor: 0x131215,
        fogDensity: 0.009,
        hemiSky: 0xb08872,
        hemiGround: 0x1a1516,
        hemiIntensity: 1.1,
        moonColor: 0xd9956d,
        moonIntensity: 1.9,
        sunColor: 0xeb5e28,
        sunIntensity: 38,
      };
    case 'northwind-valley':
    default:
      // Холодная горная ночь
      return {
        background: 0x111820,
        fogColor: 0x111820,
        fogDensity: 0.008,
        hemiSky: 0xa9c2d4,
        hemiGround: 0x1a2925,
        hemiIntensity: 1.15,
        moonColor: 0xd7e6ff,
        moonIntensity: 2.0,
        sunColor: 0xe57b49,
        sunIntensity: 32,
      };
  }
}
