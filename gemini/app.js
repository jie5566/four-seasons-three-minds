// Jvision: Four Seasons Visual Experience - V17 (Gemini, April 2026)
// Static port of the original React component. The Three.js scene code below is the
// original, moved out of React hooks into plain functions; behaviour is unchanged.
import * as THREE from '../vendor/three.js';

const SEASONS = {
  SPRING: { char: '春', label: 'Spring', poem: 'Waking at four am, \nto find the begonia awake.',
    colors: [0xffffff, 0xfff0f3, 0xffccd5, 0xffb7c5], sky: ['#1e88e5', '#4fc3f7', '#e1f5fe'], branch: 0x2d231e, petalShape: 'heart' },
  SUMMER: { char: '夏', label: 'Summer', poem: 'The lush green canopy, \nshading the heat of noon.',
    colors: [0x2e7d32, 0x4caf50, 0x81c784, 0x1b5e20], sky: ['#006064', '#0097a7', '#b2ebf2'], branch: 0x1b1b1b, petalShape: 'waterdrop' },
  AUTUMN: { char: '秋', label: 'Autumn', poem: 'Crimson leaves drift, \nin the cool evening sigh.',
    colors: [0xbf360c, 0xd84315, 0xff8f00, 0x7b1a00], sky: ['#c44612', '#D84315', '#FFEEAD'], branch: 0x3e2723, petalShape: 'maple' },
  WINTER: { char: '冬', label: 'Winter', poem: 'Bare branches reach, \nthrough the silent frost.',
    colors: [0xffffff, 0xe1f5fe, 0xffffff, 0xb0bec5], sky: ['#37474f', '#78909c', '#cfd8dc'], branch: 0x0a0a0a, petalShape: 'snow' },
};
const KEYS = Object.keys(SEASONS);

const $ = s => document.querySelector(s);
const mouse = { x: 0, y: 0 };
$('#date').textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

// ── engine (first useEffect) ──
const container = $('#scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
container.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
const clock = new THREE.Clock();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── season scene (second useEffect) ──
let frameId = 0;
function buildSeason(seasonKey) {
  const currentSeason = SEASONS[seasonKey];
  cancelAnimationFrame(frameId);

  while (scene.children.length > 2) scene.remove(scene.children[scene.children.length - 1]);
  clock.stop(); clock.start();

  const treeGroup = new THREE.Group();
  const branchMaterial = new THREE.MeshStandardMaterial({ color: currentSeason.branch, roughness: 0.9, transparent: true, opacity: 0.95 });
  const tipPoints = [];
  const BRANCH_GROW_DURATION = 0.8;

  const createBranch = (start, end, radius, startTime) => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(radius * 0.6, radius, length, 6);
    geometry.translate(0, length / 2, 0);
    const mesh = new THREE.Mesh(geometry, branchMaterial);
    mesh.position.copy(start);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    mesh.scale.set(1, 0, 1);
    mesh.userData = { startTime, duration: BRANCH_GROW_DURATION };
    treeGroup.add(mesh);
  };

  const grow = (start, angle, length, radius, depth, startTime) => {
    if (depth === 0) { tipPoints.push({ pos: start.clone(), bloomTime: startTime + 0.2 }); return; }
    const end = new THREE.Vector3(start.x + Math.cos(angle) * length, start.y + Math.sin(angle) * length, start.z + (Math.random() - 0.5) * 0.2);
    createBranch(start, end, radius, startTime);
    const splits = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < splits; i++) {
      const nextAngle = angle + (Math.random() - 0.5) * 0.7;
      const nextLength = length * (0.75 + Math.random() * 0.15);
      grow(end, nextAngle, nextLength, radius * 0.7, depth - 1, startTime + BRANCH_GROW_DURATION);
    }
  };
  grow(new THREE.Vector3(-5, -5, 0), Math.PI / 3, 1.8, 0.035, 9, 0.5);
  scene.add(treeGroup);

  const createShape = (type) => {
    const shape = new THREE.Shape();
    if (type === 'heart') {
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.12, 0.12, 0.24, 0, 0, -0.24);
      shape.bezierCurveTo(-0.24, 0, -0.12, 0.12, 0, 0);
    } else if (type === 'waterdrop' || type === 'winter_leaf') {
      shape.moveTo(0, 0.08);
      shape.bezierCurveTo(0.1, 0.08, 0.1, -0.08, 0, -0.18);
      shape.bezierCurveTo(-0.1, -0.08, -0.1, 0.08, 0, 0.08);
    } else if (type === 'maple') {
      shape.moveTo(0, 0);
      shape.lineTo(0.04, 0.08); shape.lineTo(0.12, 0.04); shape.lineTo(0.08, 0.12);
      shape.lineTo(0.2, 0.2); shape.lineTo(0.08, 0.2); shape.lineTo(0, 0.3);
      shape.lineTo(-0.08, 0.2); shape.lineTo(-0.2, 0.2); shape.lineTo(-0.08, 0.12);
      shape.lineTo(-0.12, 0.04); shape.lineTo(-0.04, 0.08); shape.lineTo(0, 0);
    } else {
      const arms = 6, armLen = 0.1;
      for (let i = 0; i < arms; i++) {
        const angle = (i * Math.PI * 2) / arms, cos = Math.cos(angle), sin = Math.sin(angle);
        shape.moveTo(0, 0); shape.lineTo(cos * armLen, sin * armLen);
        const b1 = angle + 0.5, b2 = angle - 0.5;
        shape.moveTo(cos * armLen * 0.4, sin * armLen * 0.4); shape.lineTo(Math.cos(b1) * armLen * 0.7, Math.sin(b1) * armLen * 0.7);
        shape.moveTo(cos * armLen * 0.4, sin * armLen * 0.4); shape.lineTo(Math.cos(b2) * armLen * 0.7, Math.sin(b2) * armLen * 0.7);
        shape.moveTo(cos * armLen * 0.7, sin * armLen * 0.7); shape.lineTo(Math.cos(b1) * armLen * 0.9, Math.sin(b1) * armLen * 0.9);
        shape.moveTo(cos * armLen * 0.7, sin * armLen * 0.7); shape.lineTo(Math.cos(b2) * armLen * 0.9, Math.sin(b2) * armLen * 0.9);
      }
    }
    return new THREE.ShapeGeometry(shape);
  };

  const isWinter = seasonKey === 'WINTER';
  const leafGeo = createShape(isWinter ? 'winter_leaf' : currentSeason.petalShape);
  const leafMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 1, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.1 });
  const snowGeo = createShape('snow');
  const snowMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.25 });

  const leafCount = isWinter ? 100 : 700;
  const snowCount = isWinter ? 600 : 0;
  const instancedMesh = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  const snowMesh = isWinter ? new THREE.InstancedMesh(snowGeo, snowMat, snowCount) : null;
  const petalData = [], snowData = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < leafCount; i++) {
    const anchor = tipPoints[Math.floor(Math.random() * tipPoints.length)];
    petalData.push({
      anchor: anchor.pos.clone(),
      pos: anchor.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5)),
      vel: new THREE.Vector3(0, 0, 0),
      rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
      rotVel: (Math.random() - 0.5) * 0.02,
      scale: 0, maxScale: 0.3 + Math.random() * 0.4,
      delay: anchor.bloomTime + Math.random() * 1.5,
      isFalling: false, stays: isWinter ? true : (Math.random() > 0.6),
      fallDelay: 12 + Math.random() * 15, phase: Math.random() * Math.PI * 2,
    });
    color.set(isWinter ? 0x3e2c1e : currentSeason.colors[i % currentSeason.colors.length]);
    instancedMesh.setColorAt(i, color);
  }
  scene.add(instancedMesh);

  if (isWinter) {
    for (let i = 0; i < snowCount; i++) {
      snowData.push({
        pos: new THREE.Vector3((Math.random() - 0.5) * 20, 7 + Math.random() * 5, (Math.random() - 0.5) * 5),
        vel: new THREE.Vector3(0, 0, 0),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotVel: (Math.random() - 0.5) * 0.03, scale: 0.15 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2,
      });
      color.set(0xffffff);
      snowMesh.setColorAt(i, color);
    }
    scene.add(snowMesh);
  }

  const animate = () => {
    frameId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    treeGroup.children.forEach((branch) => {
      const { startTime, duration } = branch.userData;
      if (time > startTime) branch.scale.y = Math.sin((Math.min((time - startTime) / duration, 1) * Math.PI) / 2);
    });
    const mouseWorld = new THREE.Vector3(mouse.x * 7, mouse.y * 7, 0);
    for (let i = 0; i < leafCount; i++) {
      const p = petalData[i];
      if (time > p.delay && p.scale < p.maxScale) p.scale += 0.005;
      if (time > p.fallDelay && !p.stays) p.isFalling = true;
      if (p.isFalling) {
        const dist = p.pos.distanceTo(mouseWorld);
        if (dist < 3) {
          const force = Math.pow(1 - dist / 3, 2) * 0.09;
          p.vel.add(new THREE.Vector3().subVectors(p.pos, mouseWorld).normalize().multiplyScalar(force));
        }
        p.vel.x += Math.sin(time * 0.4 + p.phase) * 0.00015;
        p.vel.y -= 0.00025;
        p.vel.multiplyScalar(0.985);
        p.pos.add(p.vel);
        p.rot.x += p.rotVel + 0.015; p.rot.z += p.rotVel;
        if (p.pos.y < -7) { p.pos.y = 7; p.pos.x = (Math.random() - 0.5) * 15; p.vel.set(0, 0, 0); }
      } else if (time > p.delay) {
        p.pos.x = p.anchor.x + Math.sin(time + p.phase) * 0.015;
        p.pos.y = p.anchor.y + Math.cos(time + p.phase) * 0.015;
      }
      dummy.position.copy(p.pos); dummy.rotation.copy(p.rot); dummy.scale.setScalar(p.scale); dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (isWinter) {
      for (let i = 0; i < snowCount; i++) {
        const s = snowData[i];
        const dist = s.pos.distanceTo(mouseWorld);
        if (dist < 2.5) {
          const force = Math.pow(1 - dist / 2.5, 2) * 0.08;
          s.vel.add(new THREE.Vector3().subVectors(s.pos, mouseWorld).normalize().multiplyScalar(force));
        }
        s.vel.x += Math.sin(time * 0.3 + s.phase) * 0.0002;
        s.vel.y -= 0.00018;
        s.vel.multiplyScalar(0.99);
        s.pos.add(s.vel);
        s.rot.x += s.rotVel; s.rot.z += s.rotVel;
        if (s.pos.y < -7) { s.pos.y = 7; s.pos.x = (Math.random() - 0.5) * 18; s.vel.set(0, 0, 0); }
        dummy.position.copy(s.pos); dummy.rotation.copy(s.rot); dummy.scale.setScalar(s.scale); dummy.updateMatrix();
        snowMesh.setMatrixAt(i, dummy.matrix);
      }
      snowMesh.instanceMatrix.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };
  animate();
}

// ── HUD (the JSX) ──
const hud = $('#hud');
function setSeason(i) {
  const key = KEYS[i], s = SEASONS[key];
  hud.classList.remove('loaded');
  $('#sky').style.background = `linear-gradient(to bottom, ${s.sky[0]}, ${s.sky[1]}, ${s.sky[2]})`;
  $('#char').textContent = s.char;
  $('#poem').textContent = s.poem;
  $('#system').textContent = `${key} SYSTEM`;
  document.querySelectorAll('[data-season]').forEach((b, j) => b.classList.toggle('active', j === i));
  buildSeason(key);
  requestAnimationFrame(() => requestAnimationFrame(() => hud.classList.add('loaded')));
}
document.querySelectorAll('[data-season]').forEach(b => b.onclick = () => setSeason(+b.dataset.season));

const updatePointer = (x, y) => { mouse.x = (x / innerWidth) * 2 - 1; mouse.y = -(y / innerHeight) * 2 + 1; };
const root = $('#root');
root.addEventListener('mousemove', e => updatePointer(e.clientX, e.clientY));
root.addEventListener('touchmove', e => { if (e.touches.length) updatePointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

setSeason(0);
