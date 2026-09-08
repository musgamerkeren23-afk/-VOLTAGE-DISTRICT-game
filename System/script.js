let scene, camera, renderer, playerMesh, killerMesh, gateMesh;
let gameState = 'LOBBY';

// Input Controls (Tombol Q ditambahkan untuk Lari)
const keys = { 
  w: false, a: false, s: false, d: false, e: false, q: false,
  arrowup: false, arrowdown: false, arrowleft: false, arrowright: false
};

let isPointerLocked = false;
let cameraYaw = 0;     // Rotasi Kiri - Kanan
let cameraPitch = 0.3; // Rotasi Atas - Bawah
const cameraTurnSpeed = 0.04; // Kecepatan putar kamera pakai panah

// Game Stats
let baseSpeed = 0.12;
let sprintSpeed = 0.22;
let playerStats = { x: 0, z: 12, hp: 100, currentSpeed: baseSpeed };
let killerStats = { x: 0, z: -15, speed: 0.09 };

let generators = [
  { x: -12, z: -5, done: false, progress: 0, mesh: null },
  { x: 12, z: -5, done: false, progress: 0, mesh: null },
  { x: 0, z: 8, done: false, progress: 0, mesh: null }
];

function init() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);
  scene.fog = new THREE.FogExp2(0x05050a, 0.03);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Pencahayaan
  scene.add(new THREE.AmbientLight(0x1a1a2e, 1.2));
  const dirLight = new THREE.DirectionalLight(0x445577, 1);
  dirLight.position.set(10, 30, 10);
  scene.add(dirLight);

  // Arena Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x111118 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Generator
  generators.forEach(gen => {
    const gMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
    gMesh.position.set(gen.x, 1.5, gen.z);
    scene.add(gMesh);
    gen.mesh = gMesh;
  });

  // Exit Gate (Pintu Gerbang Utama)
  gateMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 1), new THREE.MeshStandardMaterial({ color: 0x330000 }));
  gateMesh.position.set(0, 2.5, -29);
  scene.add(gateMesh);

  // Player (Spark - Cylinder Biru)
  playerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16), new THREE.MeshStandardMaterial({ color: 0x00e5ff }));
  playerMesh.position.set(playerStats.x, 0.9, playerStats.z);
  scene.add(playerMesh);

  // Killer (Cylinder Merah)
  killerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0xff3344 }));
  killerMesh.position.set(killerStats.x, 1.1, killerStats.z);
  scene.add(killerMesh);

  setupControls();
  animate();
}

function setupControls() {
  window.addEventListener('keydown', (e) => { 
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true; 
  });

  window.addEventListener('keyup', (e) => { 
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false; 
  });

  renderer.domElement.addEventListener('click', () => {
    if (gameState === 'PLAYING') {
      renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
  });

  document.addEventListener('mousemove', (e) => {
    if (isPointerLocked && gameState === 'PLAYING') {
      cameraYaw -= e.movementX * 0.003;
      cameraPitch -= e.movementY * 0.003;
      cameraPitch = Math.max(-0.2, Math.min(1.2, cameraPitch));
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function readyToPlay() {
  document.getElementById('lobby-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';

  const overlay = document.getElementById('cinematic-overlay');
  document.getElementById('cine-title').innerText = "ROUND DIMULAI!";
  document.getElementById('cine-sub').innerText = "WASD = Jalan | Q = Lari | Panah = Kamera";
  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
    gameState = 'PLAYING';
  }, 2500);
}

function triggerWin(title, message, isWin) {
  gameState = 'ENDED';
  if (document.pointerLockElement) document.exitPointerLock();

  const overlay = document.getElementById('cinematic-overlay');
  document.getElementById('cine-title').innerText = title;
  document.getElementById('cine-title').style.color = isWin ? "#00e5ff" : "#ff3344";
  document.getElementById('cine-sub').innerText = message;
  overlay.classList.add('active');

  setTimeout(() => {
    location.reload();
  }, 5000);
}

function animate() {
  requestAnimationFrame(animate);

  if (gameState === 'PLAYING') {

    // --- FITUR ROTASI KAMERA (PANAH KEYBOARD) ---
    if (keys.arrowleft)  cameraYaw += cameraTurnSpeed;   
    if (keys.arrowright) cameraYaw -= cameraTurnSpeed;   
    if (keys.arrowup)    cameraPitch += cameraTurnSpeed; 
    if (keys.arrowdown)  cameraPitch -= cameraTurnSpeed; 

    cameraPitch = Math.max(-0.2, Math.min(1.2, cameraPitch));

    // --- FITUR LARI (KEYBIND Q) ---
    if (keys.q) {
      playerStats.currentSpeed = sprintSpeed;
      camera.fov = THREE.MathUtils.lerp(camera.fov, 70, 0.1); // Efek FOV saat lari
    } else {
      playerStats.currentSpeed = baseSpeed;
      camera.fov = THREE.MathUtils.lerp(camera.fov, 60, 0.1); // Normal FOV
    }
    camera.updateProjectionMatrix();

    // --- PERGERAKAN PLAYER (WASD) ---
    let moveFwd = 0, moveSide = 0;
    if (keys.w) moveFwd += 1; 
    if (keys.s) moveFwd -= 1;
    if (keys.a) moveSide -= 1; 
    if (keys.d) moveSide += 1;

    if (moveFwd !== 0 || moveSide !== 0) {
      const forwardX = -Math.sin(cameraYaw);
      const forwardZ = -Math.cos(cameraYaw);
      const sideX = Math.cos(cameraYaw);
      const sideZ = -Math.sin(cameraYaw);

      playerStats.x += (forwardX * moveFwd + sideX * moveSide) * playerStats.currentSpeed;
      playerStats.z += (forwardZ * moveFwd + sideZ * moveSide) * playerStats.currentSpeed;
      playerMesh.position.set(playerStats.x, 0.9, playerStats.z);
    }

    // --- UPDATE POSITION KAMERA TPS ---
    const camDist = 8;
    camera.position.x = playerStats.x + camDist * Math.sin(cameraYaw) * Math.cos(cameraPitch);
    camera.position.y = 0.9 + camDist * Math.sin(cameraPitch) + 2;
    camera.position.z = playerStats.z + camDist * Math.cos(cameraYaw) * Math.cos(cameraPitch);
    camera.lookAt(playerStats.x, 1.5, playerStats.z);

    // --- AI KILLER NGEJAR PLAYER ---
    const kDx = playerStats.x - killerStats.x;
    const kDz = playerStats.z - killerStats.z;
    const distToPlayer = Math.hypot(kDx, kDz);

    if (distToPlayer > 1.2) {
      killerStats.x += (kDx / distToPlayer) * killerStats.speed;
      killerStats.z += (kDz / distToPlayer) * killerStats.speed;
      killerMesh.position.set(killerStats.x, 1.1, killerStats.z);
    } else {
      playerStats.hp -= 0.5;
      if (playerStats.hp <= 0) {
        triggerWin("KAMU MATI!", "Killer berhasil menghabisi kamu!", false);
      }
    }

    // --- INTERAKSI GENERATOR (TAHAN E) ---
    if (keys.e) {
      generators.forEach(gen => {
        if (!gen.done && Math.hypot(playerStats.x - gen.x, playerStats.z - gen.z) < 3) {
          gen.progress += 1;
          if (gen.progress >= 100) {
            gen.done = true;
            gen.mesh.material.color.setHex(0x00ff66);
            const doneCount = generators.filter(g => g.done).length;
            document.getElementById('gen-count').innerText = `${doneCount}/3`;

            if (doneCount === 3) {
              gateMesh.material.color.setHex(0x00e5ff); // Pintu Gerbang Menyala Biru
            }
          }
        }
      });
    }

    // --- CEK KONDISI MENANG ---
    const doneGens = generators.filter(g => g.done).length;
    if (doneGens === 3 && Math.hypot(playerStats.x - gateMesh.position.x, playerStats.z - gateMesh.position.z) < 4) {
      triggerWin("KAMU BERHASIL KABUR!", "Selamat! Kamu lolos dari Entity Realm!", true);
    }
  }

  renderer.render(scene, camera);
}

window.onload = init;
