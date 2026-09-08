let scene, camera, renderer, playerMesh, killerMesh, gateMesh;
let gameState = 'LOBBY';

// P2P Multiplayer (PeerJS)
let peer = null;
let conn = null;
let otherPlayers = {}; // Menyimpan mesh pemain lain
let isHost = false;

// Controls
const keys = { 
  w: false, a: false, s: false, d: false, e: false, q: false,
  arrowup: false, arrowdown: false, arrowleft: false, arrowright: false
};

let cameraYaw = 0;
let cameraPitch = 0.3;
const cameraTurnSpeed = 0.04;

// Stats & Bars
const baseSpeed = 0.12;
const sprintSpeed = 0.22;

let playerStats = { 
  x: Math.random() * 6 - 3, 
  z: 12, 
  hp: 100, 
  stamina: 100, 
  currentSpeed: baseSpeed 
};

let killerStats = { x: 0, z: -15, speed: 0.085 };

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

  // Lighting
  scene.add(new THREE.AmbientLight(0x1a1a2e, 1.2));
  const dirLight = new THREE.DirectionalLight(0x445577, 1);
  dirLight.position.set(10, 30, 10);
  scene.add(dirLight);

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x111118 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Generators
  generators.forEach(gen => {
    const gMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
    gMesh.position.set(gen.x, 1.5, gen.z);
    scene.add(gMesh);
    gen.mesh = gMesh;
  });

  // Exit Gate
  gateMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 1), new THREE.MeshStandardMaterial({ color: 0x330000 }));
  gateMesh.position.set(0, 2.5, -29);
  scene.add(gateMesh);

  // Local Player Mesh (Biru)
  playerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16), new THREE.MeshStandardMaterial({ color: 0x00e5ff }));
  playerMesh.position.set(playerStats.x, 0.9, playerStats.z);
  scene.add(playerMesh);

  // Killer Mesh (Merah)
  killerMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0xff3344 }));
  killerMesh.position.set(killerStats.x, 1.1, killerStats.z);
  scene.add(killerMesh);

  setupControls();
  animate();
}

// --- NETWORK MULTIPLAYER (PeerJS) ---
function createRoom() {
  isHost = true;
  const roomId = Math.floor(1000 + Math.random() * 9000).toString(); // Generate ID 4 Digit
  peer = new Peer(roomId);

  peer.on('open', (id) => {
    document.getElementById('room-status').innerText = `Room dibuat! Share ID ini ke teman: ${id}`;
    setTimeout(startGame, 2000);
  });

  peer.on('connection', (connection) => {
    conn = connection;
    setupNetworkHandlers();
    document.getElementById('peer-count').innerText = "2";
  });
}

function joinRoom() {
  const roomId = document.getElementById('room-input').value.trim();
  if (!roomId) return alert("Masukkan Room ID dulu!");

  peer = new Peer();
  peer.on('open', () => {
    conn = peer.connect(roomId);
    setupNetworkHandlers();
    document.getElementById('room-status').innerText = "Terhubung ke Room!";
    setTimeout(startGame, 1000);
  });
}

function setupNetworkHandlers() {
  conn.on('data', (data) => {
    if (data.type === 'POS') {
      // Update/Buat Karakter Pemain Lain (Warna Hijau)
      if (!otherPlayers[data.id]) {
        const pMat = new THREE.MeshStandardMaterial({ color: 0x00ff66 });
        const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 16), pMat);
        scene.add(pMesh);
        otherPlayers[data.id] = pMesh;
      }
      otherPlayers[data.id].position.set(data.x, 0.9, data.z);
    }
  });
}

function startGame() {
  document.getElementById('lobby-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';

  const overlay = document.getElementById('cinematic-overlay');
  document.getElementById('cine-title').innerText = "GAME DIMULAI!";
  document.getElementById('cine-sub').innerText = "Lari pakai Q (Pakai Stamina) | Panah = Putar Kamera";
  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
    gameState = 'PLAYING';
  }, 2500);
}

// --- KONTROL KEYBOARD ---
function setupControls() {
  window.addEventListener('keydown', (e) => { 
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = true; 
  });

  window.addEventListener('keyup', (e) => { 
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false; 
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function triggerWin(title, message, isWin) {
  gameState = 'ENDED';
  const overlay = document.getElementById('cinematic-overlay');
  document.getElementById('cine-title').innerText = title;
  document.getElementById('cine-title').style.color = isWin ? "#00e5ff" : "#ff3344";
  document.getElementById('cine-sub').innerText = message;
  overlay.classList.add('active');

  setTimeout(() => { location.reload(); }, 5000);
}

// --- GAME LOOP ---
function animate() {
  requestAnimationFrame(animate);

  if (gameState === 'PLAYING') {

    // 1. ROTASI KAMERA (PANAH)
    if (keys.arrowleft)  cameraYaw += cameraTurnSpeed;   
    if (keys.arrowright) cameraYaw -= cameraTurnSpeed;   
    if (keys.arrowup)    cameraPitch += cameraTurnSpeed; 
    if (keys.arrowdown)  cameraPitch -= cameraTurnSpeed; 
    cameraPitch = Math.max(-0.2, Math.min(1.2, cameraPitch));

    // 2. SISTEM LARI & STAMINA BAR
    let isMoving = (keys.w || keys.s || keys.a || keys.d);

    if (keys.q && isMoving && playerStats.stamina > 0) {
      playerStats.currentSpeed = sprintSpeed;
      playerStats.stamina = Math.max(0, playerStats.stamina - 0.6); // Kurangi Stamina saat Lari
      camera.fov = THREE.MathUtils.lerp(camera.fov, 70, 0.1);
    } else {
      playerStats.currentSpeed = baseSpeed;
      if (playerStats.stamina < 100) {
        playerStats.stamina = Math.min(100, playerStats.stamina + 0.25); // Isi ulang stamina
      }
      camera.fov = THREE.MathUtils.lerp(camera.fov, 60, 0.1);
    }
    camera.updateProjectionMatrix();

    // Update Visual Stamina Bar
    document.getElementById('stamina-bar').style.width = `${playerStats.stamina}%`;

    // 3. PERGERAKAN PLAYER (WASD)
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

      // Kirim posisi ke Pemain Lain via Network
      if (conn && conn.open) {
        conn.send({ type: 'POS', id: peer.id, x: playerStats.x, z: playerStats.z });
      }
    }

    // 4. POSISI KAMERA TPS
    const camDist = 8;
    camera.position.x = playerStats.x + camDist * Math.sin(cameraYaw) * Math.cos(cameraPitch);
    camera.position.y = 0.9 + camDist * Math.sin(cameraPitch) + 2;
    camera.position.z = playerStats.z + camDist * Math.cos(cameraYaw) * Math.cos(cameraPitch);
    camera.lookAt(playerStats.x, 1.5, playerStats.z);

    // 5. AI KILLER & HEALTH BAR
    const kDx = playerStats.x - killerStats.x;
    const kDz = playerStats.z - killerStats.z;
    const distToPlayer = Math.hypot(kDx, kDz);

    if (distToPlayer > 1.2) {
      killerStats.x += (kDx / distToPlayer) * killerStats.speed;
      killerStats.z += (kDz / distToPlayer) * killerStats.speed;
      killerMesh.position.set(killerStats.x, 1.1, killerStats.z);
    } else {
      playerStats.hp = Math.max(0, playerStats.hp - 0.4); // HP Kurang jika terkejar
      if (playerStats.hp <= 0) {
        triggerWin("KAMU MATI!", "Killer berhasil menghabisi kamu!", false);
      }
    }

    // Update Visual Health Bar
    document.getElementById('hp-bar').style.width = `${playerStats.hp}%`;

    // 6. INTERAKSI GENERATOR (TAHAN E)
    if (keys.e) {
      generators.forEach(gen => {
        if (!gen.done && Math.hypot(playerStats.x - gen.x, playerStats.z - gen.z) < 3) {
          gen.progress += 0.8;
          if (gen.progress >= 100) {
            gen.done = true;
            gen.mesh.material.color.setHex(0x00ff66);
            const doneCount = generators.filter(g => g.done).length;
            document.getElementById('gen-count').innerText = `${doneCount}/3`;

            if (doneCount === 3) {
              gateMesh.material.color.setHex(0x00e5ff); // Pintu gerbang menyala
            }
          }
        }
      });
    }

    // 7. SYARAT MENANG
    const doneGens = generators.filter(g => g.done).length;
    if (doneGens === 3 && Math.hypot(playerStats.x - gateMesh.position.x, playerStats.z - gateMesh.position.z) < 4) {
      triggerWin("KAMU BERHASIL KABUR!", "Selamat! Kamu lolos bersama tim!", true);
    }
  }

  renderer.render(scene, camera);
}

window.onload = init;
