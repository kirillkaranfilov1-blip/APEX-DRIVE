import { gsap } from 'gsap';
import { Game } from './core/Game.js';
import './styles.css';

const loading = document.querySelector('#loading-screen');
gsap.fromTo('.loading-track i', { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 1.5, ease: 'power2.inOut' });

try {
  await Game.create();
} catch (error) {
  console.error('Не удалось запустить 3D-сцену:', error);
  loading.classList.add('is-error');
  loading.querySelector('.loading-caption').textContent = 'НЕ УДАЛОСЬ СОЗДАТЬ 3D-СЦЕНУ';
  loading.querySelector('#loading-detail').textContent = error instanceof Error ? error.message : String(error);
}
