// เกมหนีเชื้อ — ลากตัวละครของเราหลบตัวที่ติดเชื้อ (มีระดับอันตราย 1-3 หัวใจ) ให้รอดนานที่สุด
const DODGE_BEST_KEY = 'dodgeGameBest_v1';
const ARENA_NPC_COUNT = 12; // สุ่มเลือกมาจากตัวละครทั้งหมด 37 ตัว มาวิ่งเล่นพร้อมกันครั้งละเท่านี้
const INFECT_INTERVAL_MS = 3000; // ทุกๆ เท่านี้ มีโอกาสติดเชื้อตัวใหม่เพิ่ม
const CURE_AFTER_MS = 9000; // ติดเชื้อนานเท่านี้แล้วไม่โดนแตะ จะหายเองกลับเป็นปกติ
const COLLISION_RADIUS = 30; // px ระยะที่ถือว่า "ชน" กัน
const DODGE_WALLET_KEY = 'dodgeWallet_v1';
const SKIN_PRICE = 3;

// สกินฮีโร่ — ตัวแรกฟรี ที่เหลือซื้อด้วยเหรียญ (เหรียญได้จากการเล่นจบแต่ละรอบ)
const SKINS = [
  { key: 'hero', emoji: '🦸', price: 0 },
  { key: 'ninja', emoji: '🥷', price: SKIN_PRICE },
  { key: 'wizard', emoji: '🧙', price: SKIN_PRICE },
  { key: 'robot', emoji: '🤖', price: SKIN_PRICE },
  { key: 'fairy', emoji: '🧚', price: SKIN_PRICE },
  { key: 'vampire', emoji: '🧛', price: SKIN_PRICE },
  { key: 'knight', emoji: '🤺', price: SKIN_PRICE },
  { key: 'astronaut', emoji: '👨‍🚀', price: SKIN_PRICE },
  { key: 'villain', emoji: '🦹', price: SKIN_PRICE },
  { key: 'king', emoji: '🤴', price: SKIN_PRICE },
];

let wallet = { coins: 0, owned: ['hero'], selected: 'hero' };

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

function loadWallet() {
  try {
    const saved = JSON.parse(localStorage.getItem(DODGE_WALLET_KEY));
    if (saved) wallet = saved;
  } catch (e) { /* เริ่มใหม่ถ้าอ่านไม่ได้ */ }
}
function saveWallet() {
  localStorage.setItem(DODGE_WALLET_KEY, JSON.stringify(wallet));
}

function currentSkinEmoji() {
  const skin = SKINS.find((s) => s.key === wallet.selected) || SKINS[0];
  return skin.emoji;
}

function renderSkinShop() {
  const grid = el('skinGrid');
  if (!grid) return;
  grid.innerHTML = '';
  SKINS.forEach((skin) => {
    const owned = wallet.owned.includes(skin.key);
    const card = document.createElement('button');
    card.className = 'skin-card';
    if (owned && wallet.selected === skin.key) card.classList.add('selected');
    if (!owned) card.classList.add('locked');
    if (!owned && wallet.coins < skin.price) card.classList.add('cannot-afford');
    card.innerHTML = `<span class="skin-emoji">${skin.emoji}</span>${
      owned ? (wallet.selected === skin.key ? 'ใช้อยู่' : 'เลือก') : `🔒 ${skin.price} เหรียญ`
    }`;
    card.addEventListener('click', () => onSkinClick(skin));
    grid.appendChild(card);
  });
}

function onSkinClick(skin) {
  const owned = wallet.owned.includes(skin.key);
  if (owned) {
    wallet.selected = skin.key;
  } else {
    if (wallet.coins < skin.price) return;
    wallet.coins -= skin.price;
    wallet.owned.push(skin.key);
    wallet.selected = skin.key;
  }
  saveWallet();
  renderSkinShop();
  updateCoinDisplay();
}

function updateCoinDisplay() {
  const coinLabel = el('coinCount');
  if (coinLabel) coinLabel.textContent = String(wallet.coins);
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
  playerEl.textContent = currentSkinEmoji();
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

  // รอดนานเท่าไหร่ ได้เหรียญเท่านั้น (ทุก 5 วินาที = 1 เหรียญ, อย่างน้อย 1 เหรียญถ้ารอดเกิน 1 วิ)
  const earnedCoins = finalSec > 0 ? Math.max(1, Math.floor(finalSec / 5)) : 0;
  wallet.coins += earnedCoins;
  saveWallet();
  renderSkinShop();
  updateCoinDisplay();

  el('finalTime').textContent = String(finalSec);
  el('newBestLabel').textContent = isNewBest ? '🌟 สถิติใหม่!' : '';
  el('coinEarnedLabel').textContent = `🪙 ได้เหรียญเพิ่ม ${earnedCoins} เหรียญ`;
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
  loadWallet();
  el('bestTime').textContent = String(loadBest());
  updateCoinDisplay();
  renderSkinShop();
  el('startDodgeBtn').addEventListener('click', startGame);
  el('retryBtn').addEventListener('click', startGame);
}

init();
