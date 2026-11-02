import * as THREE from 'three';
import { trackConfigs, trackControlPoints } from './trackRegistry.js';
import { getRoadTexture, getGroundTexture, getBarrierMaterial } from './trackTextures.js';

const ROAD_SAMPLES = 260;

export function buildTrackPath(pointsArray = trackControlPoints) {
  const curve = new THREE.CatmullRomCurve3(
    pointsArray.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    true,
    'catmullrom',
    0.42
  );
  return { curve, points: curve.getSpacedPoints(ROAD_SAMPLES) };
}

function makeRoad(points, roadWidth, trackId) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= ROAD_SAMPLES; i += 1) {
    const t = i / ROAD_SAMPLES;
    const center = points[i];
    const tangent = points[(i + 1) % ROAD_SAMPLES].clone().sub(points[(i - 1 + ROAD_SAMPLES) % ROAD_SAMPLES]).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    positions.push(center.x + side.x * roadWidth / 2, 0.035, center.z + side.z * roadWidth / 2);
    positions.push(center.x - side.x * roadWidth / 2, 0.035, center.z - side.z * roadWidth / 2);
    uvs.push(0, t * 48, 1, t * 48);
    if (i < ROAD_SAMPLES) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const roadTexture = getRoadTexture(trackId);
  const material = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.88,
    metalness: 0.04,
  });
  return new THREE.Mesh(geometry, material);
}

function makeDashLine(points, trackId) {
  const group = new THREE.Group();
  const color = trackId === 'ember-works' ? 0xd4ac0d : trackId === 'coastal-speedway' ? 0xffffff : 0xc4c5bd;
  const material = new THREE.MeshBasicMaterial({ color });
  const geometry = new THREE.BoxGeometry(0.12, 0.025, 1.45);
  for (let i = 0; i < ROAD_SAMPLES; i += 4) {
    const from = points[i];
    const to = points[(i + 1) % ROAD_SAMPLES];
    const dash = new THREE.Mesh(geometry, material);
    dash.position.set((from.x + to.x) / 2, 0.07, (from.z + to.z) / 2);
    dash.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    group.add(dash);
  }
  return group;
}

// Горные сосны вдоль трассы (строго за пределами барьеров)
function makePinesAlongTrack(parentGroup, points, roadWidth) {
  const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.18, 1.9, 6);
  const crownGeometry = new THREE.ConeGeometry(1.0, 4.1, 7);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3c3027, roughness: 1 });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x173a34, roughness: 1, flatShading: true });

  const step = 6;
  const count = Math.floor(points.length / step) * 2;
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, count);
  const dummy = new THREE.Object3D();
  let placed = 0;

  for (let i = 0; i < points.length; i += step) {
    const point = points[i];
    const next = points[(i + 1) % points.length];
    const tangent = next.clone().sub(point).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    for (const sign of [-1, 1]) {
      // Безопасное расстояние: ширина_дороги / 2 + барьер + запас от 5.5 до 12м
      const dist = roadWidth / 2 + 5.5 + ((i * 11) % 6);
      const x = point.x + side.x * sign * dist;
      const z = point.z + side.z * sign * dist;
      const scale = 0.85 + ((i % 5) / 5) * 0.55;

      dummy.position.set(x, 0.95 * scale, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(0, i * 0.45, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.y = 3.05 * scale;
      dummy.updateMatrix();
      crowns.setMatrixAt(placed, dummy.matrix);

      placed += 1;
    }
  }
  trunks.count = placed;
  crowns.count = placed;
  parentGroup.add(trunks, crowns);
}

// Прибрежная растительность / пальмы для Береговой линии
function makePalmsAlongTrack(parentGroup, points, roadWidth) {
  const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.22, 3.2, 7);
  const foliageGeometry = new THREE.SphereGeometry(1.4, 8, 8);
  foliageGeometry.scale(1.6, 0.45, 1.6);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3c31, roughness: 0.9 });
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2e5a44, roughness: 0.8, flatShading: true });

  const step = 8;
  const count = Math.floor(points.length / step) * 2;
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count);
  const crowns = new THREE.InstancedMesh(foliageGeometry, foliageMaterial, count);
  const dummy = new THREE.Object3D();
  let placed = 0;

  for (let i = 0; i < points.length; i += step) {
    const point = points[i];
    const next = points[(i + 1) % points.length];
    const tangent = next.clone().sub(point).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    for (const sign of [-1, 1]) {
      const dist = roadWidth / 2 + 6.0 + ((i * 7) % 5);
      const x = point.x + side.x * sign * dist;
      const z = point.z + side.z * sign * dist;
      const scale = 0.9 + ((i % 4) / 4) * 0.5;

      dummy.position.set(x, 1.6 * scale, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.set(sign * 0.08, i * 0.3, -sign * 0.08);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.y = 3.2 * scale;
      dummy.updateMatrix();
      crowns.setMatrixAt(placed, dummy.matrix);

      placed += 1;
    }
  }
  trunks.count = placed;
  crowns.count = placed;
  parentGroup.add(trunks, crowns);
}

// Контейнеры и индустриальные объекты вдоль Эмбер-воркс
function makeIndustrialPropsAlongTrack(parentGroup, points, roadWidth) {
  const boxGeom = new THREE.BoxGeometry(3.5, 2.6, 6.5);
  const containerColors = [0xb33939, 0x227093, 0x706fd3, 0x333940];

  const step = 14;
  for (let i = 0; i < points.length; i += step) {
    const point = points[i];
    const next = points[(i + 1) % points.length];
    const tangent = next.clone().sub(point).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const sign = (i % 2 === 0) ? 1 : -1;

    const dist = roadWidth / 2 + 7.5 + ((i * 3) % 4);
    const x = point.x + side.x * sign * dist;
    const z = point.z + side.z * sign * dist;

    const mat = new THREE.MeshStandardMaterial({
      color: containerColors[(i / step) % containerColors.length],
      metalness: 0.6,
      roughness: 0.5,
    });
    const container = new THREE.Mesh(boxGeom, mat);
    container.position.set(x, 1.3, z);
    container.rotation.y = Math.atan2(tangent.x, tangent.z) + ((i % 3) * 0.2);
    parentGroup.add(container);
  }
}

// Неоновые пилоны полигона Apex для Тренировочного овала
function makeSportPylonsAlongTrack(parentGroup, points, roadWidth) {
  const pylonGeom = new THREE.CylinderGeometry(0.2, 0.4, 4.5, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8, roughness: 0.2 });
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xd7f36a });

  const step = 20;
  for (let i = 0; i < points.length; i += step) {
    const point = points[i];
    const next = points[(i + 1) % points.length];
    const tangent = next.clone().sub(point).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    for (const sign of [-1, 1]) {
      const dist = roadWidth / 2 + 4.8;
      const x = point.x + side.x * sign * dist;
      const z = point.z + side.z * sign * dist;

      const pole = new THREE.Mesh(pylonGeom, mat);
      pole.position.set(x, 2.25, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 16), neonMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.9;
      pole.add(ring);
      parentGroup.add(pole);
    }
  }
}

function addTrackSideLighting(parentGroup, points, roadWidth, trackId) {
  const lightColor = trackId === 'ember-works' ? 0xff793f : trackId === 'coastal-speedway' ? 0xffb142 : 0x8fb6bd;
  for (let i = 0; i < points.length; i += 52) {
    const point = points[i];
    const next = points[(i + 1) % points.length];
    const tangent = next.clone().sub(point).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const sign of [-1, 1]) {
      const pole = new THREE.Group();
      // Фонари строго за барьерами
      pole.position.copy(point).addScaledVector(side, sign * (roadWidth / 2 + 2.2));
      pole.position.y = 3.4;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 6.8, 8), new THREE.MeshStandardMaterial({ color: 0x434a4e, metalness: 0.75, roughness: 0.38 }));
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.68), new THREE.MeshBasicMaterial({ color: lightColor }));
      lamp.position.set(-sign * 0.55, 3.25, 0);
      const glow = new THREE.PointLight(lightColor, 8, 22, 1.8);
      glow.position.copy(lamp.position); glow.position.y -= 0.25;
      pole.add(stem, lamp, glow);
      parentGroup.add(pole);
    }
  }
}

function makeGrandPrixPropsAlongTrack(parentGroup, points, roadWidth) {
  const standMat = new THREE.MeshStandardMaterial({ color: 0x1f272e, roughness: 0.6, metalness: 0.2 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x12171c, roughness: 0.35, metalness: 0.4 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xd7f36a, roughness: 0.5 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.4 });

  // Трибуны вдоль стартовой прямой
  for (const idx of [12, 28]) {
    const pt = points[idx];
    const next = points[(idx + 1) % points.length];
    const tangent = next.clone().sub(pt).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const stand = new THREE.Group();
    stand.position.copy(pt).addScaledVector(side, roadWidth / 2 + 5.5);
    stand.rotation.y = Math.atan2(tangent.x, tangent.z);

    const base = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 6), standMat);
    base.position.set(0, 1.25, 0);
    const seats = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 4), seatMat);
    seats.position.set(0, 2.7, 0.5);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.22, 7.5), roofMat);
    roof.position.set(0, 5.2, 0);
    stand.add(base, seats, roof);
    parentGroup.add(stand);
  }

  // Осветительные мачты арены Гран-При
  for (let i = 0; i < points.length; i += 32) {
    const pt = points[i];
    const next = points[(i + 1) % points.length];
    const tangent = next.clone().sub(pt).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const sign of [-1, 1]) {
      const pylon = new THREE.Group();
      pylon.position.copy(pt).addScaledVector(side, sign * (roadWidth / 2 + 3.8));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 10, 6), standMat);
      mast.position.y = 5;
      const rack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.5), roofMat);
      rack.position.set(0, 9.8, 0);
      const face = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0xf5f8ff }));
      face.position.set(0, 9.8, -sign * 0.26);
      pylon.add(mast, rack, face);
      parentGroup.add(pylon);
    }
  }

  // Спонсорские пилоны и флаги на виражах
  for (let i = 48; i < points.length; i += 56) {
    const pt = points[i];
    const next = points[(i + 1) % points.length];
    const tangent = next.clone().sub(pt).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const sign = (i % 2 === 0) ? 1 : -1;
    const banner = new THREE.Group();
    banner.position.copy(pt).addScaledVector(side, sign * (roadWidth / 2 + 3.0));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5, 6), standMat);
    post.position.y = 2.25;
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.1), sign === 1 ? seatMat : redMat);
    board.position.set(0, 3.6, 0);
    banner.rotation.y = Math.atan2(tangent.x, tangent.z);
    banner.add(post, board);
    parentGroup.add(banner);
  }
}

export function createTrack(scene, physics, trackId = 'starter-oval') {
  const config = (typeof trackId === 'string' ? trackConfigs[trackId] : trackId) || trackConfigs['starter-oval'];
  const actualTrackId = config.id || 'starter-oval';
  const roadWidth = config.roadWidth || 11;
  const controlPoints = config.controlPoints || trackControlPoints;

  const { RAPIER, world } = physics;
  const { curve, points } = buildTrackPath(controlPoints);

  const rootGroup = new THREE.Group();
  rootGroup.name = `track-${actualTrackId}`;

  // Земля с процедурной текстурой под тему трассы
  const groundTexture = getGroundTexture(actualTrackId);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.15;
  ground.receiveShadow = true;
  rootGroup.add(ground);

  const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(300, 0.3, 300).setFriction(1.8), floor);

  // Дорога с уникальной текстурой асфальта
  const road = makeRoad(points, roadWidth, actualTrackId);
  road.receiveShadow = true;
  rootGroup.add(road, makeDashLine(points, actualTrackId));

  // Барьеры с индивидуальной раскраской/текстурой
  const barrierGeometry = new THREE.BoxGeometry(1, 0.75, 1);
  const barrierMaterial = getBarrierMaterial(actualTrackId);
  const barrierMesh = new THREE.InstancedMesh(barrierGeometry, barrierMaterial, ROAD_SAMPLES * 2);
  const dummy = new THREE.Object3D();
  const railBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

  for (let i = 0; i < ROAD_SAMPLES; i += 1) {
    const center = points[i];
    const next = points[(i + 1) % ROAD_SAMPLES];
    const tangent = next.clone().sub(center);
    const length = tangent.length();
    tangent.normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const angle = Math.atan2(tangent.x, tangent.z);
    for (const sign of [-1, 1]) {
      const x = center.x + side.x * sign * (roadWidth / 2 + 0.7);
      const z = center.z + side.z * sign * (roadWidth / 2 + 0.7);
      dummy.position.set(x, 0.52, z);
      dummy.scale.set(length + 0.12, 1, 0.22);
      dummy.rotation.set(0, angle, 0);
      dummy.updateMatrix(); barrierMesh.setMatrixAt(i * 2 + (sign === 1 ? 0 : 1), dummy.matrix);
      world.createCollider(RAPIER.ColliderDesc.cuboid(0.48, 0.42, 0.11).setTranslation(x, 0.52, z).setRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) }).setFriction(0.4), railBody);
    }
  }
  rootGroup.add(barrierMesh);

  // Окружение под каждую трассу: СТРОГО вдоль сплайна с безопасным отступом наружу!
  if (actualTrackId === 'apex-grand-prix') {
    makeGrandPrixPropsAlongTrack(rootGroup, points, roadWidth);
  } else if (actualTrackId === 'ember-works') {
    makeIndustrialPropsAlongTrack(rootGroup, points, roadWidth);
  } else if (actualTrackId === 'starter-oval') {
    makeSportPylonsAlongTrack(rootGroup, points, roadWidth);
  } else if (actualTrackId === 'coastal-speedway') {
    makePalmsAlongTrack(rootGroup, points, roadWidth);
  } else {
    makePinesAlongTrack(rootGroup, points, roadWidth);
  }
  addTrackSideLighting(rootGroup, points, roadWidth, actualTrackId);

  // Контрольные точки и арки
  const checkpointIndices = [0, 65, 130, 195];
  const checkpoints = checkpointIndices.map((pointIndex, index) => {
    const point = points[pointIndex];
    const gate = new THREE.Group();
    const archColor = index === 0 ? 0xf26b3a : actualTrackId === 'ember-works' ? 0xe67e22 : actualTrackId === 'coastal-speedway' ? 0x00cec9 : 0x71918c;
    const archMaterial = new THREE.MeshStandardMaterial({
      color: archColor,
      emissive: index === 0 ? 0x3a1006 : 0x0a1815,
      metalness: 0.45,
      roughness: 0.4,
    });
    const postGeometry = new THREE.BoxGeometry(0.22, 4.4, 0.22);
    const leftPost = new THREE.Mesh(postGeometry, archMaterial);
    const rightPost = new THREE.Mesh(postGeometry, archMaterial);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(roadWidth, 0.23, 0.25), archMaterial);
    leftPost.position.set(-roadWidth / 2 + 0.2, 2.2, 0);
    rightPost.position.set(roadWidth / 2 - 0.2, 2.2, 0);
    lintel.position.y = 4.25;
    gate.add(leftPost, rightPost, lintel);
    gate.position.set(point.x, 0, point.z);
    const tangent = curve.getTangent(pointIndex / ROAD_SAMPLES);
    gate.rotation.y = Math.atan2(tangent.x, tangent.z);
    rootGroup.add(gate);
    return { x: point.x, z: point.z, radius: roadWidth * 0.48, mesh: gate };
  });

  scene.add(rootGroup);

  const start = points[0];
  const tangent = curve.getTangent(0);

  return {
    id: actualTrackId,
    config,
    checkpoints,
    start: { x: start.x - tangent.x * 3, y: 0.9, z: start.z - tangent.z * 3, yaw: Math.atan2(tangent.x, tangent.z) },
    path: curve,
    points,
    dispose: () => {
      scene.remove(rootGroup);
      world.removeRigidBody(floor);
      world.removeRigidBody(railBody);
    },
  };
}
