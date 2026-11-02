import tracks from './trackCatalog.json';

export const trackConfigs = {
  'starter-oval': {
    id: 'starter-oval',
    name: 'Тренировочный овал (Простой круг)',
    controlPoints: [
      [0, 0, -36],
      [25, 0, -25],
      [36, 0, 0],
      [25, 0, 25],
      [0, 0, 36],
      [-25, 0, 25],
      [-36, 0, 0],
      [-25, 0, -25],
    ],
    laps: 2,
    roadWidth: 12,
  },
  'apex-grand-prix': {
    id: 'apex-grand-prix',
    name: 'Гран-При Апекс (Соревновательный трек)',
    controlPoints: [
      [0, 0, -68],
      [45, 0, -68],
      [85, 0, -48],
      [96, 0, -12],
      [72, 0, 24],
      [86, 0, 56],
      [54, 0, 78],
      [12, 0, 78],
      [-26, 0, 56],
      [-68, 0, 30],
      [-88, 0, -4],
      [-76, 0, -40],
      [-42, 0, -68],
    ],
    laps: 2,
    roadWidth: 15.5,
  },
  'northwind-valley': {
    id: 'northwind-valley',
    name: 'Долина северных ветров',
    controlPoints: [
      [-1, 0, -31], [19, 0, -28], [31, 0, -13], [33, 0, 8],
      [24, 0, 27], [4, 0, 32], [-17, 0, 27], [-31, 0, 10],
      [-33, 0, -11], [-23, 0, -27],
    ],
    laps: 2,
    roadWidth: 11,
  },
  'coastal-speedway': {
    id: 'coastal-speedway',
    name: 'Береговая линия',
    controlPoints: [
      [0, 0, -48], [35, 0, -42], [52, 0, -18], [54, 0, 20],
      [30, 0, 48], [-12, 0, 48], [-46, 0, 32], [-52, 0, -8],
      [-38, 0, -36],
    ],
    laps: 2,
    roadWidth: 12.5,
  },
  'ember-works': {
    id: 'ember-works',
    name: 'Эмбер-воркс',
    controlPoints: [
      [0, 0, -38], [28, 0, -38], [36, 0, -18], [18, 0, -4],
      [38, 0, 14], [32, 0, 38], [4, 0, 38], [-4, 0, 18],
      [-26, 0, 34], [-40, 0, 12], [-32, 0, -16], [-18, 0, -24],
    ],
    laps: 3,
    roadWidth: 10.5,
  },
};

export const defaultTrackConfig = trackConfigs['starter-oval'];

export const mountainTrack = Object.freeze({
  ...tracks.find((track) => track.id === 'northwind-valley'),
  unlocked: true,
  eventTypes: tracks.find((track) => track.id === 'northwind-valley')?.availableEventTypes || [],
});

export const trackControlPoints = trackConfigs['northwind-valley'].controlPoints;
