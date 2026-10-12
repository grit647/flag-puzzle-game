// เกมหนีเชื้อ — ลากตัวละครของเราหลบตัวที่ติดเชื้อ (มีระดับอันตราย 1-3 หัวใจ) ให้รอดนานที่สุด
const DODGE_BEST_KEY = 'dodgeGameBest_v1';
const ARENA_NPC_COUNT = 12; // สุ่มเลือกมาจากตัวละครทั้งหมด 37 ตัว มาวิ่งเล่นพร้อมกันครั้งละเท่านี้
const INFECT_INTERVAL_MS = 3000; // ทุกๆ เท่านี้ มีโอกาสติดเชื้อตัวใหม่เพิ่ม
const CURE_AFTER_MS = 9000; // ติดเชื้อนานเท่านี้แล้วไม่โดนแตะ จะหายเองกลับเป็นปกติ
const COLLISION_RADIUS = 30; // px ระยะที่ถือว่า "ชน" กัน
const PLAYER_EMOJI = '🦸';

// รายชื่อตัวละคร 37 ตัว (ชื่อภาษาอังกฤษตามที่น้องตังขอ)
const CHARACTERS = [
  { name: 'Bunny', emoji: '🐰' }, { name: 'Kitten', emoji: '🐱' }, { name: 'Puppy', emoji: '🐶' },
  { name: 'Panda', emoji: '🐼' }, { name: 'Koala', emoji: '🐨' }, { name: 'Fox', emoji: '🦊' },
  { name: 'Bear', emoji: '🐻' }, { name: 'Tiger', emoji: '🐯' }, { name: 'Lion', emoji: '🦁' },
  { name: 'Cow', emoji: '🐮' }, { name: 'Piggy', emoji: '🐷' }, { name: 'Frog', emoji: '🐸' },
  { name: 'Monkey', emoji: '🐵' }, { name: 'Chick', emoji: '🐤' }, { name: 'Penguin', emoji: '🐧' },
  { name: 'Owl', emoji: '🦉' }, { name: 'Duck', emoji: '🦆' }, { name: 'Hedgehog', emoji: '🦔' },
  { name: 'Bee', emoji: '🐝' }, { name: 'Ladybug', emoji: '🐞' }, { name: 'Octopus', emoji: '🐙' },
  { name: 'Turtle', emoji: '🐢' }, { name: 'Crab', emoji: '🦀' }, { name: 'Dolphin', emoji: '🐬' },
  { name: 'Whale', emoji: '🐳' }, { name: 'Shark', emoji: '🦈' }, { name: 'Elephant', emoji: '🐘' },
  { name: 'Giraffe', emoji: '🦒' }, { name: 'Zebra', emoji: '🦓' }, { name: 'Rhino', emoji: '🦏' },
  { name: 'Hippo', emoji: '🦛' }, { name: 'Camel', emoji: '🐫' }, { name: 'Sheep', emoji: '🐑' },
  { name: 'Goat', emoji: '🐐' }, { name: 'Horse', emoji: '🐴' }, { name: 'Dragon', emoji: '🐲' },
  { name: 'Unicorn', emoji: '🦄' },
];

const el = (id) => document.getElementById(id);

let state = {
  running: false,
  hearts: 3,
  startTime: 0,
  survivalSec: 0,
  npcs: [],      // { id, el, heartsEl, x, y, infected, danger, infectedAt }
  playerX: 0, playerY: 0,
  dragging: false,
  timerInterval: null,
  moveIntervals: [],
  infectInterval: null,
  collideInterval: null,
};

function loadBest() {
  return Number(localStorage.getItem(DODGE_BEST_KEY)) || 0;
}
function saveBest(sec) {
  localStorage.setItem(DODGE_BEST_KEY, String(sec));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomCharacters(count) {
  const pool = [...CHARACTERS];
  const picked = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function arenaSize() {
  const arena = el('dodgeArena');
  return { w: arena.clientWidth, h: arena.clientHeight };
}

function buildNpc(character, index) {
  const arena = el('dodgeArena');
  const { w, h } = arenaSize();
  const npcEl = document.createElement('div');
  npcEl.className = 'npc';
  npcEl.textContent = character.emoji;
  npcEl.title = character.name;
  const x = randInt(30, w - 30);
  const y = randInt(30, h - 30);
  npcEl.style.left = `${x}px`;
  npcEl.style.top = `${y}px`;
  arena.appendChild(npcEl);

  const heartsEl = document.createElement('div');
  heartsEl.className = 'npc-hearts';
  npcEl.appendChild(heartsEl);

  const npc = {
    id: index, el: npcEl, heartsEl, name: character.name,
    x, y, infected: false, danger: 0, infectedAt: 0,
  };
  return npc;
}

function moveNpcRandomly(npc) {
  const { w, h } = arenaSize();
  npc.x = randInt(30, w - 30);
  npc.y = randInt(30, h - 30);
  npc.el.style.left = `${npc.x}px`;
  npc.el.style.top = `${npc.y}px`;
}

function infectNpc(npc) {
  if (npc.infected) return;
  npc.infected = true;
  npc.danger = Math.random() < 0.55 ? 1 : (Math.random() < 0.7 ? 2 : 3);
  npc.infectedAt = Date.now();
  npc.el.classList.add('infected');
  npc.heartsEl.textContent = '❤️'.repeat(npc.danger);
}

function cureNpc(npc) {
  npc.infected = false;
  npc.danger = 0;
  npc.el.classList.remove('infected');
  npc.heartsEl.textContent = '';
}

function updateHeartsDisplay() {
  el('heartsDisplay').textContent = '❤️'.repeat(Math.max(state.hearts, 0)) + '🖤'.repeat(Math.max(3 - state.hearts, 0));
}

function startGame() {
  stopGame(); // เคลียร์ของเก่าก่อน (เผื่อกดเริ่มซ้ำ)
  el('gameOverModal').style.display = 'none';
  state.running = true;
  state.hearts = 3;
  state.startTime = Date.now();
  state.survivalSec = 0;
  updateHeartsDisplay();
  el('survivalTime').textContent = '0';
  el('bestTime').textContent = String(loadBest());

  const arena = el('dodgeArena');
  arena.innerHTML = '';
  state.npcs = [];

  const chosen = pickRandomCharacters(ARENA_NPC_COUNT);
  chosen.forEach((c, i) => state.npcs.push(buildNpc(c, i)));

  const { w, h } = arenaSize();
  state.playerX = w / 2;
  state.playerY = h / 2;
  const playerEl = document.createElement('div');
  playerEl.className = 'player';
  playerEl.id = 'playerEl';
  playerEl.textContent = PLAYER_EMOJI;
  playerEl.style.left = `${state.playerX}px`;
  playerEl.style.top = `${state.playerY}px`;
  arena.appendChild(playerEl);

  // แต่ละตัวละคร เดินไปตำแหน่งสุ่มใหม่เรื่อยๆ ด้วยจังหวะไม่เท่ากัน (ดูเป็นธรรมชาติ)
  state.npcs.forEach((npc) => {
    moveNpcRandomly(npc);
    const interval = setInterval(() => moveNpcRandomly(npc), 2000 + Math.random() * 1500);
    state.moveIntervals.push(interval);
  });

  // ทุกๆ ช่วงเวลา สุ่มติดเชื้อตัวที่ยังไม่ติด 1 ตัว
  state.infectInterval = setInterval(() => {
    const healthy = state.npcs.filter((n) => !n.infected);
    if (healthy.length === 0) return;
    infectNpc(healthy[Math.floor(Math.random() * healthy.length)]);
  }, INFECT_INTERVAL_MS);

  // เช็คว่าติดเชื้อนานเกินไปหรือยัง ให้หายเอง
  state.collideInterval = setInterval(checkCollisions, 150);

  state.timerInterval = setInterval(() => {
    state.survivalSec = Math.floor((Date.now() - state.startTime) / 1000);
    el('survivalTime').textContent = String(state.survivalSec);
    state.npcs.forEach((npc) => {
      if (npc.infected && Date.now() - npc.infectedAt > CURE_AFTER_MS) cureNpc(npc);
    });
  }, 500);

  initDragIfNeeded();
}

function checkCollisions() {
  if (!state.running) return;
  state.npcs.forEach((npc) => {
    if (!npc.infected) return;
    const dx = npc.x - state.playerX;
    const dy = npc.y - state.playerY;
    if (Math.hypot(dx, dy) < COLLISION_RADIUS) {
      takeHit(npc);
    }
  });
}

function takeHit(npc) {
  state.hearts -= npc.danger;
  updateHeartsDisplay();
  cureNpc(npc);
  moveNpcRandomly(npc);
  const playerEl = el('playerEl');
  if (playerEl) {
    playerEl.classList.remove('hit');
    void playerEl.offsetWidth; // force reflow เพื่อให้เล่น animation ซ้ำได้
    playerEl.classList.add('hit');
  }
  if (state.hearts <= 0) endGame();
}

function endGame() {
  stopGame();
  const finalSec = state.survivalSec;
  const best = loadBest();
  const isNewBest = finalSec > best;
  if (isNewBest) saveBest(finalSec);
  el('finalTime').textContent = String(finalSec);
  el('newBestLabel').textContent = isNewBest ? '🌟 สถิติใหม่!' : '';
  el('bestTime').textContent = String(loadBest());
  el('gameOverModal').style.display = 'flex';
}

function stopGame() {
  state.running = false;
  clearInterval(state.timerInterval);
  clearInterval(state.infectInterval);
  clearInterval(state.collideInterval);
  state.moveIntervals.forEach((i) => clearInterval(i));
  state.moveIntervals = [];
}

// ----- ลากตัวละครผู้เล่นด้วย Pointer Events -----
let dragBound = false;
function initDragIfNeeded() {
  if (dragBound) return;
  dragBound = true;
  const arena = el('dodgeArena');
  arena.addEventListener('pointerdown', (e) => { state.dragging = true; movePlayerTo(e); });
  arena.addEventListener('pointermove', (e) => { if (state.dragging) movePlayerTo(e); });
  window.addEventListener('pointerup', () => { state.dragging = false; });
  window.addEventListener('pointercancel', () => { state.dragging = false; });
}

function movePlayerTo(e) {
  if (!state.running) return;
  const arena = el('dodgeArena');
  const rect = arena.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  x = Math.max(20, Math.min(rect.width - 20, x));
  y = Math.max(20, Math.min(rect.height - 20, y));
  state.playerX = x;
  state.playerY = y;
  const playerEl = el('playerEl');
  if (playerEl) {
    playerEl.style.left = `${x}px`;
    playerEl.style.top = `${y}px`;
  }
}

function init() {
  el('bestTime').textContent = String(loadBest());
  el('startDodgeBtn').addEventListener('click', startGame);
  el('retryBtn').addEventListener('click', startGame);
}

init();
