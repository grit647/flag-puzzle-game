// เกมต่อจิ๊กซอธงชาติ — ไม่มี server, เก็บสถิติใน localStorage ของเครื่องนั้นๆ เท่านั้น
const DIFFICULTIES = {
  easy:   { cols: 4, rows: 2, label: 'ง่าย (8 ชิ้น)' },
  medium: { cols: 4, rows: 4, label: 'กลาง (16 ชิ้น)' },
  hard:   { cols: 6, rows: 5, label: 'ยาก (30 ชิ้น)' },
};
const STATS_KEY = 'flagPuzzleStats_v1';
const SVGNS = 'http://www.w3.org/2000/svg';

let state = {
  countryCode: COUNTRIES[0].code,
  diffKey: 'easy',
  cols: 4, rows: 2, total: 8,
  boardW: 0, boardH: 0, pieceW: 0, pieceH: 0, amp: 0,
  edgeData: null,   // ทิศปุ่ม/ร่องของแต่ละเส้นขอบ สุ่มใหม่ทุกครั้งที่เริ่มเกม
  boardCells: [],   // length = total; null or pieceIndex
  trayPieces: [],   // array of pieceIndex still in tray
  previewsLeft: 5,  // จำนวนครั้งที่ยังดูตัวอย่างธงได้ในเกมนี้
  startTime: null,
  timerInterval: null,
  elapsedSec: 0,
  playing: false,
};

let drag = null; // { pieceIndex, fromCellIndex, flagUrl, ghost, offsetX, offsetY }
let clipIdCounter = 0;

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
  sel.addEventListener('change', () => { state.countryCode = sel.value; updateCurrentBestLabel(); });
}

function initDifficultyButtons() {
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.diffKey = btn.dataset.diff;
      updateCurrentBestLabel();
    });
  });
  document.querySelector('.diff-btn[data-diff="easy"]').classList.add('active');
}

// โชว์สถิติปัจจุบันของธง+ระดับที่เลือกไว้ ก่อนเริ่มเกม ให้มีเป้าหมายไปตีสถิติ
function updateCurrentBestLabel() {
  const label = el('currentBestLabel');
  if (!label) return;
  const stats = loadStats();
  const entry = stats[`${state.countryCode}_${state.diffKey}`];
  if (entry) {
    label.textContent = `🏆 สถิติปัจจุบัน ธง${countryName(state.countryCode)} (${DIFFICULTIES[state.diffKey].label}): ${formatTime(entry.bestTimeSec)} — ลองเอาชนะดูไหม?`;
  } else {
    label.textContent = `ธง${countryName(state.countryCode)} ระดับนี้ยังไม่มีใครทำสถิติไว้ เป็นคนแรกเลยไหม?`;
  }
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

  // จอกว้างพอจะวางถาดไว้ข้างๆ กระดาน (ดู style.css @media 560px ขึ้นไป) ต้องเผื่อที่ให้ถาดด้วย
  // ขยายขนาดกระดาน/ชิ้นส่วนให้ใหญ่ขึ้น กดง่ายขึ้นบนมือถือ
  const sideBySide = window.innerWidth >= 560;
  const reserve = sideBySide ? 250 : 36;
  const maxW = Math.min(window.innerWidth - reserve, 560);
  const boardW = maxW;
  const boardH = Math.round(maxW * (img.naturalHeight / img.naturalWidth));
  state.boardW = boardW;
  state.boardH = boardH;
  state.pieceW = boardW / state.cols;
  state.pieceH = boardH / state.rows;
  state.amp = Math.round(Math.min(state.pieceW, state.pieceH) * 0.22);
  state.edgeData = generateEdgeData(state.rows, state.cols);

  state.boardCells = new Array(state.total).fill(null);
  state.trayPieces = shuffle([...Array(state.total).keys()]);
  state.previewsLeft = 5;
  state.elapsedSec = 0;
  state.playing = true;
  state.startTime = Date.now();
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tickTimer, 1000);

  state.flagUrl = flagUrl;
  el('gamePanel').style.display = 'block';
  el('statsPanel').style.display = 'none';
  renderBoard(flagUrl);
  renderTray(flagUrl);
  updateTimerDisplay();
  updatePieceCount();
  updatePreviewButton();
  updateGameBestLabel();
}

// โชว์สถิติเก่าของธง+ระดับนี้ "ระหว่างเล่น" ด้วย (เดิมโชว์แค่หน้าเลือกก่อนเริ่ม) ไม่ต้องย้อนกลับไปดู
function updateGameBestLabel() {
  const label = el('gameBestLabel');
  if (!label) return;
  const stats = loadStats();
  const entry = stats[`${state.countryCode}_${state.diffKey}`];
  label.textContent = entry
    ? `🏆 สถิติเดิมที่ต้องเอาชนะ: ${formatTime(entry.bestTimeSec)}`
    : 'ยังไม่มีสถิติของธงนี้ — เป็นคนแรกเลย!';
}

function updatePreviewButton() {
  const btn = el('previewBtn');
  btn.textContent = `👁️ ดูตัวอย่างธง (เหลือ ${state.previewsLeft} ครั้ง)`;
  btn.disabled = state.previewsLeft <= 0;
}

function openPreview() {
  if (state.previewsLeft <= 0) return;
  state.previewsLeft -= 1;
  updatePreviewButton();
  el('previewImg').src = state.flagUrl;
  el('previewCountLabel').textContent = `เหลือดูได้อีก ${state.previewsLeft} ครั้ง`;
  el('previewModal').style.display = 'flex';
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

function piecePathFor(pieceIndex) {
  const row = Math.floor(pieceIndex / state.cols);
  const col = pieceIndex % state.cols;
  const edges = edgesForPiece(row, col, state.rows, state.cols, state.edgeData);
  return buildPiecePath(state.pieceW, state.pieceH, edges, state.amp);
}

// สร้างชิ้นจิ๊กซอเป็น SVG จริง (ไม่ใช่ CSS clip-path) — ตัดภาพตามรูปทรงปุ่ม/ร่อง
// แล้ววาดเส้นขอบ (ขาว+เข้ม) ทับอีกชั้น ให้เห็นรอยต่อชัดเจนแม้สีในภาพจะเหมือนกันทั้งแถบ
function buildPieceSvg(flagUrl, pieceIndex) {
  const amp = state.amp;
  const row = Math.floor(pieceIndex / state.cols);
  const col = pieceIndex % state.cols;
  const totalW = state.pieceW + amp * 2;
  const totalH = state.pieceH + amp * 2;
  const bx = -(col * state.pieceW) + amp;
  const by = -(row * state.pieceH) + amp;
  const path = piecePathFor(pieceIndex);
  const clipId = `pclip-${clipIdCounter++}`;

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'piece-svg');
  svg.setAttribute('width', totalW);
  svg.setAttribute('height', totalH);
  svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
  svg.dataset.pieceIndex = String(pieceIndex);

  const defs = document.createElementNS(SVGNS, 'defs');
  const clipPath = document.createElementNS(SVGNS, 'clipPath');
  clipPath.setAttribute('id', clipId);
  const clipShape = document.createElementNS(SVGNS, 'path');
  clipShape.setAttribute('d', path);
  clipPath.appendChild(clipShape);
  defs.appendChild(clipPath);
  svg.appendChild(defs);

  const image = document.createElementNS(SVGNS, 'image');
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', flagUrl);
  image.setAttribute('href', flagUrl);
  image.setAttribute('x', bx);
  image.setAttribute('y', by);
  image.setAttribute('width', state.boardW);
  image.setAttribute('height', state.boardH);
  image.setAttribute('preserveAspectRatio', 'none');
  image.setAttribute('clip-path', `url(#${clipId})`);
  svg.appendChild(image);

  const outlineWhite = document.createElementNS(SVGNS, 'path');
  outlineWhite.setAttribute('d', path);
  outlineWhite.setAttribute('fill', 'none');
  outlineWhite.setAttribute('stroke', '#ffffff');
  outlineWhite.setAttribute('stroke-width', '3');
  outlineWhite.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(outlineWhite);

  const outlineDark = document.createElementNS(SVGNS, 'path');
  outlineDark.setAttribute('d', path);
  outlineDark.setAttribute('fill', 'none');
  outlineDark.setAttribute('stroke', '#1e293b');
  outlineDark.setAttribute('stroke-width', '1.2');
  outlineDark.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(outlineDark);

  return svg;
}

function renderBoard(flagUrl) {
  const board = el('board');
  board.style.gridTemplateColumns = `repeat(${state.cols}, ${state.pieceW}px)`;
  board.style.gridTemplateRows = `repeat(${state.rows}, ${state.pieceH}px)`;
  board.style.width = `${state.boardW}px`;
  board.style.height = `${state.boardH}px`;
  board.innerHTML = '';
  for (let i = 0; i < state.total; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = String(i);
    cell.style.width = `${state.pieceW}px`;
    cell.style.height = `${state.pieceH}px`;
    const pieceIndex = state.boardCells[i];
    if (pieceIndex !== null) {
      cell.classList.add('filled');
      const svg = buildPieceSvg(flagUrl, pieceIndex);
      svg.classList.add('piece-on-board');
      svg.addEventListener('pointerdown', (e) => onPiecePointerDown(e, pieceIndex, i, flagUrl));
      cell.appendChild(svg);
    } else {
      cell.classList.add('empty');
    }
    board.appendChild(cell);
  }
}

function renderTray(flagUrl) {
  const tray = el('tray');
  tray.innerHTML = '';
  state.trayPieces.forEach((pieceIndex) => {
    const svg = buildPieceSvg(flagUrl, pieceIndex);
    svg.addEventListener('pointerdown', (e) => onPiecePointerDown(e, pieceIndex, null, flagUrl));
    tray.appendChild(svg);
  });
}

// ----- ลากวางด้วย Pointer Events (ใช้ได้ทั้งเมาส์และนิ้วบนมือถือ) -----
// ชิ้นในถาด: ต้อง "กดค้างสักครู่" ก่อนถึงเริ่มลาก (ถ้าปัดเร็วๆ ก่อนครบเวลา ถือว่าจะเลื่อนถาด ไม่ใช่ลากชิ้น)
// ชิ้นบนกระดาน: เริ่มลากได้ทันที (กระดานไม่ได้เลื่อน ไม่มีอะไรต้องกันชน)
let pendingDrag = null;

function onPiecePointerDown(e, pieceIndex, fromCellIndex, flagUrl) {
  if (drag || pendingDrag) return;
  if (fromCellIndex === null) {
    armTrayDrag(e, pieceIndex, flagUrl);
  } else {
    beginDrag(e, pieceIndex, fromCellIndex, flagUrl, e.currentTarget);
  }
}

function armTrayDrag(e, pieceIndex, flagUrl) {
  const startX = e.clientX, startY = e.clientY;
  const sourceEl = e.currentTarget;
  let resolved = false;

  const holdTimer = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    cleanup();
    beginDrag(e, pieceIndex, null, flagUrl, sourceEl);
  }, 120);

  function onMove(ev) {
    if (resolved) return;
    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 14) {
      resolved = true;
      clearTimeout(holdTimer);
      cleanup();
    }
  }
  function onUp() {
    if (!resolved) clearTimeout(holdTimer);
    cleanup();
  }
  function cleanup() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    pendingDrag = null;
  }
  pendingDrag = { pieceIndex };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function beginDrag(e, pieceIndex, fromCellIndex, flagUrl, sourceEl) {
  const rect = sourceEl.getBoundingClientRect();
  const ghost = buildPieceSvg(flagUrl, pieceIndex);
  ghost.classList.add('drag-ghost');
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.appendChild(ghost);

  drag = {
    pieceIndex, fromCellIndex, flagUrl, ghost,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };

  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
}

// ลากพื้นที่ว่างในถาด (ไม่ได้โดนชิ้น) เพื่อเลื่อนดูชิ้นที่เหลือ — เหมือนลาก touchpad/นิ้วปัด
function initTrayPanning() {
  const tray = el('tray');
  let pan = null;
  tray.addEventListener('pointerdown', (e) => {
    if (e.target !== tray) return; // กดโดนชิ้นส่วน ไม่ใช่พื้นที่ว่าง ปล่อยให้ระบบลากชิ้นทำงานแทน
    pan = { startY: e.clientY, startScroll: tray.scrollTop, pointerId: e.pointerId };
    tray.classList.add('panning');
    tray.setPointerCapture(e.pointerId);
  });
  tray.addEventListener('pointermove', (e) => {
    if (!pan || e.pointerId !== pan.pointerId) return;
    tray.scrollTop = pan.startScroll - (e.clientY - pan.startY);
  });
  const endPan = () => { if (pan) { tray.classList.remove('panning'); pan = null; } };
  tray.addEventListener('pointerup', endPan);
  tray.addEventListener('pointercancel', endPan);
}

function onDragMove(e) {
  if (!drag) return;
  drag.ghost.style.left = `${e.clientX - drag.offsetX}px`;
  drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
}

function onDragEnd(e) {
  if (!drag) return;
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);

  const d = drag;
  drag = null;
  d.ghost.style.display = 'none'; // ซ่อนก่อนหาจุดวาง จะได้ไม่บังตัวเอง
  const dropEl = document.elementFromPoint(e.clientX, e.clientY);
  d.ghost.remove();

  const cellEl = dropEl ? dropEl.closest('.cell') : null;
  const trayEl = dropEl ? dropEl.closest('#tray') : null;
  applyDrop(d.pieceIndex, d.fromCellIndex, cellEl, trayEl, d.flagUrl);
}

function applyDrop(pieceIndex, fromCellIndex, cellEl, trayEl, flagUrl) {
  let changed = false;
  if (cellEl) {
    const targetIndex = Number(cellEl.dataset.index);
    if (targetIndex !== fromCellIndex) {
      const occupant = state.boardCells[targetIndex];
      if (occupant === null) {
        state.boardCells[targetIndex] = pieceIndex;
        if (fromCellIndex !== null) {
          state.boardCells[fromCellIndex] = null;
        } else {
          state.trayPieces = state.trayPieces.filter((p) => p !== pieceIndex);
        }
        changed = true;
      } else if (fromCellIndex !== null) {
        // สลับตำแหน่งชิ้น 2 ชิ้นบนกระดาน
        state.boardCells[targetIndex] = pieceIndex;
        state.boardCells[fromCellIndex] = occupant;
        changed = true;
      }
      // ลากจากถาดไปวางทับช่องที่มีชิ้นอยู่แล้ว: ไม่ทำอะไร เด้งกลับถาด
    }
  } else if (trayEl && fromCellIndex !== null) {
    state.boardCells[fromCellIndex] = null;
    state.trayPieces.push(pieceIndex);
    changed = true;
  }

  renderBoard(flagUrl);
  renderTray(flagUrl);
  updatePieceCount();
  if (changed) checkWin(flagUrl);
}

function checkWin(flagUrl) {
  const done = state.boardCells.every((p, i) => p === i);
  if (!done) return;
  state.playing = false;
  clearInterval(state.timerInterval);
  const finalTime = state.elapsedSec;
  const isNewBest = saveStats(state.countryCode, state.diffKey, finalTime);
  showWinModal(finalTime, isNewBest);
  updateGameBestLabel();
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
  el('winBestLabel').textContent = isNewBest ? '🌟 ทำลายสถิติเดิม! สถิติใหม่ส่วนตัว!' : '';
  el('winModal').style.display = 'flex';
  if (isNewBest) fireConfetti();
}

// เอฟเฟกต์พลุฉลองตอนทำลายสถิติเดิมได้ — ยิงอิโมจิกระจายออกจากกึ่งกลางจอแล้วจางหายไป
function fireConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const emojis = ['🎉', '✨', '🎊', '⭐', '🥳'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 220;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist - 60}px`);
    p.style.fontSize = `${16 + Math.random() * 16}px`;
    p.style.animationDelay = `${Math.random() * 0.2}s`;
    container.appendChild(p);
  }
  setTimeout(() => container.remove(), 2000);
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

// ----- ติดตั้งเป็นแอป (PWA) บนมือถือ -----
let deferredInstallPrompt = null;

function initInstallButton() {
  const btn = el('installBtn');
  if (!btn) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    btn.style.display = 'block';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    btn.style.display = 'none';
  });

  btn.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btn.style.display = 'none';
      return;
    }
    // เบราว์เซอร์ที่ไม่รองรับ beforeinstallprompt (เช่น iOS Safari) — บอกวิธีติดตั้งเองแทน
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(isIOS
      ? 'บน iPhone/iPad: แตะปุ่มแชร์ (รูปสี่เหลี่ยมมีลูกศรชี้ขึ้น) แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"'
      : 'เปิดเมนู ⋮ ของเบราว์เซอร์ แล้วเลือก "ติดตั้งแอป" หรือ "เพิ่มไปยังหน้าจอโฮม"');
  });

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function init() {
  initCountrySelect();
  initDifficultyButtons();
  initTrayPanning();
  initInstallButton();
  el('startBtn').addEventListener('click', startGame);
  el('randomCountryBtn').addEventListener('click', () => {
    const c = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    state.countryCode = c.code;
    el('countrySelect').value = c.code;
    updateCurrentBestLabel();
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
  updateCurrentBestLabel();
  el('previewBtn').addEventListener('click', openPreview);
  el('previewCloseBtn').addEventListener('click', () => {
    el('previewModal').style.display = 'none';
  });
}

init();
