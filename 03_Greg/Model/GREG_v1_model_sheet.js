// Greg reference sheet: turnaround, expressions and test poses. t (integer) selects the view.
import * as THREE from 'three';
import { makeCharacter, motion, mergePose, GREG, GREG_MODEL_VERSION } from './character.js';
import * as P from './props.js';

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9edf1');
scene.add(new THREE.HemisphereLight('#ffffff', '#b9c2cc', 1.4));
const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(6, 14, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 10, bottom: -4 }); scene.add(key);
const rim = new THREE.DirectionalLight('#cfe3ff', 1.0); rim.position.set(-8, 8, -10); scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ color: '#d5dbe2', roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const cam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 200);
const greg = makeCharacter(GREG); scene.add(greg.root);
const sandwich = P.sandwich(); sandwich.scale.setScalar(0.55); const cup = P.cup('#d94a3a'); cup.scale.setScalar(1.5);
const stool = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 20), new THREE.MeshStandardMaterial({ color: '#7a8592' })); stool.position.y = 1.25; scene.add(stool);
const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 10), stool.material); stoolLeg.position.y = 0.6; scene.add(stoolLeg);

const V = [
  ['FRONT', 'TURNAROUND', 0, {}, { eyes: 'open', mouth: 'smile' }],
  ['THREE-QUARTER', 'TURNAROUND', 0.65, {}, { eyes: 'open', mouth: 'smile' }],
  ['SIDE', 'TURNAROUND', Math.PI / 2, {}, { eyes: 'open', mouth: 'flat' }],
  ['BACK', 'TURNAROUND', Math.PI, {}, { eyes: 'open', mouth: 'flat' }],
  ['EXPRESSIONS', 'NEUTRAL · RESIGNED', 0, {}, { eyes: 'half', mouth: 'flat', brows: 'flat' }, true],
  ['EXPRESSIONS', 'SURPRISED', 0, { headX: -0.05 }, { eyes: 'wide', mouth: 'o', brows: 'up' }, true],
  ['EXPRESSIONS', 'UNIMPRESSED', 0, { headZ: 0.08 }, { eyes: 'half', mouth: 'smirk', brows: 'flat' }, true],
  ['EXPRESSIONS', 'HOPEFUL', 0, {}, { eyes: 'happy', mouth: 'grin', brows: 'up' }, true],
  ['POSE', 'SEATED', 0.35, 'sit', { eyes: 'open', mouth: 'smile' }],
  ['POSE', 'FOOD IN HAND', 0.3, 'food', { eyes: 'open', mouth: 'smile' }],
  ['POSE', 'RECOGNITION', 0.2, 'react', { eyes: 'wide', mouth: 'small-o', brows: 'up' }],
];
window.DURATION = V.length;
window.renderAt = (t) => {
  const [k, v, yaw, pose, face, close] = V[Math.min(V.length - 1, Math.floor(t))];
  greg.root.rotation.y = yaw; greg.root.position.set(0, 0, 0);
  stool.visible = stoolLeg.visible = pose === 'sit';
  sandwich.removeFromParent(); cup.removeFromParent();
  let p = typeof pose === 'object' ? mergePose(motion.idle(0), pose) : motion.idle(0);
  if (pose === 'sit') { p = motion.sitChair(0); greg.root.position.set(0, 0.48, 0.45); }
  if (pose === 'food') { p = mergePose(motion.idle(0), { aRx: -0.9, eR: -1.1, aLx: -0.6, eL: -1.2, headX: 0.15 }); greg.armR.hand.add(sandwich); sandwich.position.set(0, -0.45, 0.3); greg.armL.hand.add(cup); cup.position.set(0, -0.45, 0.2); }
  if (pose === 'react') p = mergePose(motion.idle(0), { aRx: -0.5, eR: -1.2, aLx: -0.3, eL: -0.5, headX: -0.06, torsoX: -0.05 });
  greg.pose(p); greg.setFace(face, 1, false, 0);
  if (close) { cam.position.set(0, 5.25, 5.2); cam.lookAt(0, 5.0, 0); cam.fov = 30; }
  else { cam.position.set(0, 3.8, 17); cam.lookAt(0, 2.9, 0); cam.fov = 26; }
  cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  document.querySelector('#cap .k').textContent = `GREG · ${k}`;
  document.querySelector('#cap .v').textContent = `${v} · ${GREG_MODEL_VERSION}`;
};
window.warmup = async () => { window.renderAt(0); await document.fonts.ready; return true; };
window.__ready = true;
