// EP002 cast reference: every animal kind (upright, outfit), the dog on all fours, a collared human.
import * as THREE from 'three';
import { makeCharacter, motion, mergePose, GREG } from './character.js';
import { makeAnimal, addCollar, allFours, KINDS } from './animals.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9edf1');
scene.add(new THREE.HemisphereLight('#ffffff', '#b9c2cc', 1.4));
const key = new THREE.DirectionalLight('#fff4e6', 2.0); key.position.set(6, 14, 10); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -20, right: 20, top: 12, bottom: -4 }); scene.add(key);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshStandardMaterial({ color: '#d5dbe2' })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const cam = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 200);
const rows = [
  [['dog', 'none'], ['shepherd', 'police'], ['cat', 'suit']],
  [['lion', 'leader'], ['kangaroo', 'zookeeper'], ['fox', 'anchor']],
  [['bear', 'casual'], ['panda', 'none'], ['pig', 'farmer']],
  [['rabbit', 'hoodie'], ['monkey', 'driver'], ['elephant', 'none']],
  [['cow', 'farmer'], ['ginger', 'vet'], ['dog', 'fours']],
];
const groups = rows.map((row) => { const g = new THREE.Group(); row.forEach(([k, o], i) => { const a = makeAnimal(k, o === 'fours' ? 'none' : o); a.root.position.x = (i - 1) * 3.6; a.root.rotation.y = 0.25; a.pose(o === 'fours' ? allFours() : motion.idle(0)); a.setFace({ eyes: 'open' }, 1, false); a.wag(0.3); g.add(a.root); }); g.visible = false; scene.add(g); return g; });
const hg = new THREE.Group(); const tom = makeCharacter({ name: 'tom', skin: '#e0ac7e', hair: '#5b3a22', top: { kind: 'tee', color: '#3a7bd5', trim: '#f0a03a' }, bottom: { color: '#2b3a55' } }); addCollar(tom); tom.root.position.x = -1.8; hg.add(tom.root);
const g2 = makeCharacter(GREG); g2.root.position.x = 1.8; hg.add(g2.root); [tom, g2].forEach((c) => { c.pose(motion.idle(0)); c.setFace({ eyes: 'open', mouth: 'smile' }, 1); }); hg.visible = false; scene.add(hg); groups.push(hg);
window.DURATION = groups.length;
window.renderAt = (t) => { const i = Math.min(groups.length - 1, Math.floor(t)); groups.forEach((g, j) => (g.visible = j === i)); cam.position.set(0, 3.4, 34); cam.lookAt(0, 2.8, 0); cam.updateProjectionMatrix(); renderer.render(scene, cam); document.querySelector('#cap .k').textContent = 'EP002 CAST'; document.querySelector('#cap .v').textContent = i < rows.length ? rows[i].map((r) => r.join(' · ')).join('   ') : 'HUMAN WITH COLLAR · GREG'; };
window.warmup = async () => { window.renderAt(0); await document.fonts.ready; return true; };
window.__ready = true;
