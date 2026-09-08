let scene, camera, renderer, playerMesh, killerMesh;
let gameState = 'LOBBY';
const keys = { w: false, a: false, s: false, d: false, e: false };

let playerStats = { x: 0, z: 10, speed: 0.15 };
let killerStats = { x: 0, z: -10 };
let generators = [
  { x: -8, z: 0, done: false, mesh: null },
  { x: 8, z: 0, done: false, mesh: null },
  { x: 0, z: -5, done: false, mesh: null }
];

function init() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a12);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Pencahayaan Arena
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x222233));

  // Lantai / Arena
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a1a24 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Generator (Kotak Oranye)
  generators.forEach(gen => {
    const gMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ color: 0xffaa00 })
    );
    gMesh.position.set(gen.x, 1, gen.z);
    scene.add(gMesh);
    gen.mesh = gMesh;
  });

  // Player / Survivor (Cylinder Biru)
  const pGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff });
  playerMesh = new THREE.Mesh(pGeo, pMat);
  playerMesh.position.set(playerStats.x, 0.9, playerStats.z);
  scene.add(playerMesh);

  // Killer (Cylinder Merah)
  const kGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16);
  const kMat = new THREE.MeshStandardMaterial({ color: 0xff3344 });
  killerMesh = new THREE.Mesh(kGeo, kMat);
  killerMesh.position.set(killerStats.x, 1.1, killerStats.z);
  scene.add(killerMesh);

  camera.position.set(0, 12, 20);
  camera.lookAt(0, 0, 0);

  // Keyboard Event Listeners
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true;
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
  });

  // Responsif saat ukuran window berubah
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

function readyToPlay() {
  document.getElementById('lobby-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';

  const overlay = document.getElementById('cinematic-overlay');
  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
    gameState = 'PLAYING';
  }, 2500);
}

function animate() {
  requestAnimationFrame(animate);

  if (gameState === 'PLAYING') {
    let dx = 0, dz = 0;
    if (keys.w) dz -= 1;
    if (keys.s) dz += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    // Pergerakan Player
    if (dx !== 0 || dz !== 0) {
      playerStats.x += dx * playerStats.speed;
      playerStats.z += dz * playerStats.speed;
      playerMesh.position.x = playerStats.x;
      playerMesh.position.z = playerStats.z;
    }

    // Kamera mengikuti Player
    camera.position.x = playerMesh.position.x;
    camera.position.z = playerMesh.position.z + 10;
    camera.lookAt(playerMesh.position.x, 1, playerMesh.position.z);

    // AI Killer mengejar Player
    const kDx = playerStats.x - killerStats.x;
    const kDz = playerStats.z - killerStats.z;
    const dist = Math.hypot(kDx, kDz);
    if (dist > 1) {
      killerStats.x += (kDx / dist) * 0.05;
      killerStats.z += (kDz / dist) * 0.05;
      killerMesh.position.x = killerStats.x;
      killerMesh.position.z = killerStats.z;
    }

    // Interaksi Perbaiki Generator (Tekan E dekat kotak oranye)
    if (keys.e) {
      generators.forEach(gen => {
        if (!gen.done && Math.hypot(playerStats.x - gen.x, playerStats.z - gen.z) < 2.5) {
          gen.done = true;
          gen.mesh.material.color.setHex(0x00ff66); // Ubah warna jadi hijau
          const doneCount = generators.filter(g => g.done).length;
          document.getElementById('gen-count').innerText = `${doneCount}/3`;
        }
      });
    }
  }

  renderer.render(scene, camera);
}

// Jalankan fungsi init saat halaman selesai dimuat
window.onload = init;
