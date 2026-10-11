// เกมต่อจิ๊กซอธงชาติ — ไม่มี server, เก็บสถิติใน localStorage ของเครื่องนั้นๆ เท่านั้น
const DIFFICULTIES = {
  easy:   { cols: 4, rows: 2, label: 'ง่าย (8 ชิ้น)' },
  medium: { cols: 4, rows: 4, label: 'กลาง (16 ชิ้น)' },
  hard:   { cols: 6, rows: 5, label: 'ยาก (30 ชิ้น)' },
};
const STATS_KEY = 'flagPuzzleStats_v1';

let state = {
  countryCode: COUNTRIES[0].code,
  diffKey: 'easy',
  cols: 4, rows: 2, total: 8,
  boardW: 0, boardH: 0, pieceW: 0, pieceH: 0,
  boardCells: [],   // length = total; null or pieceIndex
  trayPieces: [],   // array of pieceIndex still in tray
  selected: null,   // pieceIndex currently selected in tray
  startTime: null,
  timerInterval: null,
  elapsedSec: 0,
  playing: false,
};

const el = (id) => document.getElementById(id);

function initCountrySelect() {
  const sel = el('countrySelect');
  COUNTRIES.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = c.nameTh;
    sel.appendChild(opt);
  });
  sel.value = state.countryCode;
  sel.addEventListener('change', () => { state.countryCode = sel.value; });
}

function initDifficultyButtons() {
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.diffKey = btn.dataset.diff;
    });
  });
  document.querySelector('.diff-btn[data-diff="easy"]').classList.add('active');
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function countryName(code) {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? c.nameTh : code;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function startGame() {
  const diff = DIFFICULTIES[state.diffKey];
  state.cols = diff.cols;
  state.rows = diff.rows;
  state.total = diff.cols * diff.rows;

  const flagUrl = `https://flagcdn.com/w640/${state.countryCode}.png`;
  let img;
  try {
    img = await loadImage(flagUrl);
  } catch (e) {
    alert('โหลดภาพธงไม่สำเร็จ ลองใหม่อีกครั้งครับ');
    return;
  }

  const maxW = Math.min(window.innerWidth - 56, 600);
  const boardW = maxW;
  const boardH = Math.round(maxW * (img.naturalHeight / img.naturalWidth));
  state.boardW = boardW;
  state.boardH = boardH;
  state.pieceW = boardW / state.cols;
  state.pieceH = boardH / state.rows;

  state.boardCells = new Array(state.total).fill(null);
  state.trayPieces = shuffle([...Array(state.total).keys()]);
  state.selected = null;
  state.elapsedSec = 0;
  state.playing = true;
  state.startTime = Date.now();
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tickTimer, 1000);

  el('gamePanel').style.display = 'block';
  el('statsPanel').style.display = 'none';
  renderBoard(flagUrl);
  renderTray(flagUrl);
  updateTimerDisplay();
  updatePieceCount();
}

function tickTimer() {
  state.elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);
  updateTimerDisplay();
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  el('timerDisplay').textContent = `⏱ ${formatTime(state.elapsedSec)}`;
}

function updatePieceCount() {
  const placed = state.boardCells.filter((x) => x !== null).length;
  el('pieceCountDisplay').textContent = `${placed}/${state.total} ชิ้น`;
}

function bgStyleForPiece(flagUrl, pieceIndex) {
  const row = Math.floor(pieceIndex / state.cols);
  const col = pieceIndex % state.cols;
  const x = -(col * state.pieceW);
  const y = -(row * state.pieceH);
  return `background-image:url('${flagUrl}'); background-size:${state.boardW}px ${state.boardH}px; background-position:${x}px ${y}px; width:${state.pieceW}px; height:${state.pieceH}px;`;
}

function renderBoard(flagUrl) {
  const board = el('board');
  board.style.gridTemplateColumns = `repeat(${state.cols}, ${state.pieceW}px)`;
  board.style.width = `${state.boardW}px`;
  board.innerHTML = '';
  for (let i = 0; i < state.total; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = String(i);
    const pieceIndex = state.boardCells[i];
    if (pieceIndex !== null) {
      cell.classList.add('filled');
      cell.setAttribute('style', bgStyleForPiece(flagUrl, pieceIndex));
    } else {
      cell.classList.add('empty');
      cell.style.width = `${state.pieceW}px`;
      cell.style.height = `${state.pieceH}px`;
    }
    cell.addEventListener('click', () => onCellClick(i, flagUrl));
    board.appendChild(cell);
  }
}

function renderTray(flagUrl) {
  const tray = el('tray');
  tray.innerHTML = '';
  state.trayPieces.forEach((pieceIndex) => {
    const p = document.createElement('div');
    p.className = 'piece';
    if (state.selected === pieceIndex) p.classList.add('selected');
    p.setAttribute('style', bgStyleForPiece(flagUrl, pieceIndex));
    p.addEventListener('click', () => onTrayPieceClick(pieceIndex, flagUrl));
    tray.appendChild(p);
  });
}

function onTrayPieceClick(pieceIndex, flagUrl) {
  state.selected = state.selected === pieceIndex ? null : pieceIndex;
  renderTray(flagUrl);
}

function onCellClick(cellIndex, flagUrl) {
  const occupied = state.boardCells[cellIndex] !== null;
  if (occupied) {
    // เอาชิ้นที่วางไว้กลับไปที่ถาด
    const pieceIndex = state.boardCells[cellIndex];
    state.boardCells[cellIndex] = null;
    state.trayPieces.push(pieceIndex);
    renderBoard(flagUrl);
    renderTray(flagUrl);
    updatePieceCount();
    return;
  }
  if (state.selected === null) return;
  state.boardCells[cellIndex] = state.selected;
  state.trayPieces = state.trayPieces.filter((p) => p !== state.selected);
  state.selected = null;
  renderBoard(flagUrl);
  renderTray(flagUrl);
  updatePieceCount();
  checkWin(flagUrl);
}

function checkWin(flagUrl) {
  const done = state.boardCells.every((p, i) => p === i);
  if (!done) return;
  state.playing = false;
  clearInterval(state.timerInterval);
  const finalTime = state.elapsedSec;
  const isNewBest = saveStats(state.countryCode, state.diffKey, finalTime);
  showWinModal(finalTime, isNewBest);
}

function saveStats(code, diffKey, timeSec) {
  const stats = loadStats();
  const key = `${code}_${diffKey}`;
  const prev = stats[key];
  let isNewBest = false;
  if (!prev || timeSec < prev.bestTimeSec) {
    isNewBest = !!prev; // นับว่า "ทำลายสถิติเดิม" เฉพาะตอนมีสถิติเก่าอยู่แล้ว
    stats[key] = {
      code, diffKey,
      bestTimeSec: timeSec,
      playCount: (prev ? prev.playCount : 0) + 1,
      lastPlayed: new Date().toISOString(),
    };
  } else {
    prev.playCount += 1;
    prev.lastPlayed = new Date().toISOString();
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return isNewBest;
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function showWinModal(timeSec, isNewBest) {
  el('winCountryLabel').textContent = `ธงชาติ${countryName(state.countryCode)} — ${DIFFICULTIES[state.diffKey].label}`;
  el('winTimeLabel').textContent = formatTime(timeSec);
  el('winBestLabel').textContent = isNewBest ? '🌟 สถิติใหม่ส่วนตัว!' : '';
  el('winModal').style.display = 'flex';
}

function renderStats() {
  const stats = loadStats();
  const entries = Object.values(stats).sort((a, b) => a.bestTimeSec - b.bestTimeSec);
  const content = el('statsContent');
  if (entries.length === 0) {
    content.innerHTML = '<div class="empty-stats">ยังไม่มีสถิติ — ลองเล่นดูสักรอบครับ!</div>';
    return;
  }
  let html = '<table id="statsTable"><thead><tr><th>ประเทศ</th><th>ระดับ</th><th>เวลาดีที่สุด</th><th>เล่นแล้ว</th></tr></thead><tbody>';
  entries.forEach((e) => {
    html += `<tr><td>${countryName(e.code)}</td><td>${DIFFICULTIES[e.diffKey].label}</td><td>${formatTime(e.bestTimeSec)}</td><td>${e.playCount} ครั้ง</td></tr>`;
  });
  html += '</tbody></table>';
  content.innerHTML = html;
}

function init() {
  initCountrySelect();
  initDifficultyButtons();
  el('startBtn').addEventListener('click', startGame);
  el('randomCountryBtn').addEventListener('click', () => {
    const c = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    state.countryCode = c.code;
    el('countrySelect').value = c.code;
  });
  el('statsBtn').addEventListener('click', () => {
    const showing = el('statsPanel').style.display !== 'none';
    el('statsPanel').style.display = showing ? 'none' : 'block';
    el('gamePanel').style.display = 'none';
    if (!showing) renderStats();
  });
  el('winCloseBtn').addEventListener('click', () => {
    el('winModal').style.display = 'none';
  });
}

init();
