// เกมสวนดอกไม้ — ปลูกเมล็ด รดน้ำ 2 ครั้ง แล้วเก็บดอกไม้สะสม
// ไม่มี server, เก็บสถิติสะสมไว้ใน localStorage ของเครื่องนั้นๆ เท่านั้น
const GARDEN_STATE_KEY = 'gardenGameState_v1';
const PLOT_COUNT = 9;

const FLOWER_KINDS = [
  { key: 'rose', emoji: '🌹', name: 'กุหลาบ' },
  { key: 'tulip', emoji: '🌷', name: 'ทิวลิป' },
  { key: 'sunflower', emoji: '🌻', name: 'ทานตะวัน' },
  { key: 'hibiscus', emoji: '🌺', name: 'ชบา' },
  { key: 'blossom', emoji: '🌸', name: 'ซากุระ' },
  { key: 'daisy', emoji: '🌼', name: 'เดซี่' },
];

// แต่ละช่อง: null = ว่าง, หรือ { stage: 1|2|3, kind }
// stage 1 = 🌱 เมล็ดงอก (ปลูกแล้ว), stage 2 = 🌿 ต้นกล้า (รดน้ำ 1 ครั้ง), stage 3 = บาน (รดน้ำครบ)
let plots = new Array(PLOT_COUNT).fill(null);
let collection = {}; // { roseKey: count, ... }
let totalHarvested = 0;

const el = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(GARDEN_STATE_KEY));
    if (saved) {
      collection = saved.collection || {};
      totalHarvested = saved.totalHarvested || 0;
    }
  } catch (e) { /* เริ่มใหม่ถ้าอ่านไม่ได้ */ }
}

function saveState() {
  localStorage.setItem(GARDEN_STATE_KEY, JSON.stringify({ collection, totalHarvested }));
}

function randomKind() {
  return FLOWER_KINDS[Math.floor(Math.random() * FLOWER_KINDS.length)];
}

function renderGrid() {
  const grid = el('gardenGrid');
  grid.innerHTML = '';
  plots.forEach((plot, i) => {
    const cell = document.createElement('div');
    cell.className = 'plot';
    if (!plot) {
      cell.classList.add('empty');
      cell.innerHTML = '<div class="plot-emoji">🟫</div><div class="plot-hint">แตะเพื่อปลูกเมล็ด</div>';
    } else if (plot.stage === 1) {
      cell.innerHTML = '<div class="plot-emoji">🌱</div><div class="plot-hint">แตะเพื่อรดน้ำ</div>';
    } else if (plot.stage === 2) {
      cell.innerHTML = '<div class="plot-emoji">🌿</div><div class="plot-hint">แตะรดน้ำอีกครั้ง</div>';
    } else {
      cell.classList.add('bloom');
      const kind = FLOWER_KINDS.find((k) => k.key === plot.kind);
      cell.innerHTML = `<div class="plot-emoji">${kind.emoji}</div><div class="plot-hint">แตะเพื่อเก็บดอกไม้!</div>`;
    }
    cell.addEventListener('click', (e) => onPlotClick(i, e));
    grid.appendChild(cell);
  });
}

function onPlotClick(i, e) {
  const plot = plots[i];
  if (!plot) {
    // ปลูกเมล็ดใหม่ — สุ่มชนิดดอกไม้ไว้ล่วงหน้า (เผยตอนบาน)
    plots[i] = { stage: 1, kind: randomKind().key };
  } else if (plot.stage === 1) {
    plot.stage = 2;
  } else if (plot.stage === 2) {
    plot.stage = 3; // บานแล้ว!
  } else {
    // เก็บดอกไม้
    collection[plot.kind] = (collection[plot.kind] || 0) + 1;
    totalHarvested += 1;
    plots[i] = null;
    saveState();
    showFloatPlus(e.clientX, e.clientY);
    renderCollection();
  }
  renderGrid();
}

function showFloatPlus(x, y) {
  const span = document.createElement('span');
  span.className = 'float-plus';
  span.textContent = '+1 🌼';
  span.style.left = `${x}px`;
  span.style.top = `${y}px`;
  document.body.appendChild(span);
  setTimeout(() => span.remove(), 900);
}

function renderCollection() {
  el('totalCount').textContent = String(totalHarvested);
  const row = el('collectionRow');
  row.innerHTML = '';
  FLOWER_KINDS.forEach((kind) => {
    const count = collection[kind.key] || 0;
    const chip = document.createElement('div');
    chip.className = 'collection-chip';
    chip.innerHTML = `<span class="emoji">${kind.emoji}</span><span>${kind.name} × ${count}</span>`;
    row.appendChild(chip);
  });
}

// สร้างดาวสุ่มตำแหน่งไว้ในท้องฟ้า (โชว์เฉพาะตอนกลางคืน)
function initStars() {
  const starsEl = el('starsEl');
  if (!starsEl) return;
  for (let i = 0; i < 18; i++) {
    const star = document.createElement('span');
    star.textContent = '✦';
    star.style.left = `${Math.random() * 96}%`;
    star.style.top = `${Math.random() * 80}%`;
    star.style.animationDelay = `${Math.random() * 2.4}s`;
    starsEl.appendChild(star);
  }
}

function initDayNightToggle() {
  const scene = el('gardenScene');
  const btn = el('daynightBtn');
  if (!scene || !btn) return;
  const saved = localStorage.getItem('gardenDayNight');
  if (saved === 'night') scene.classList.add('night');
  updateDayNightBtnLabel();

  btn.addEventListener('click', () => {
    scene.classList.toggle('night');
    localStorage.setItem('gardenDayNight', scene.classList.contains('night') ? 'night' : 'day');
    updateDayNightBtnLabel();
  });

  function updateDayNightBtnLabel() {
    btn.textContent = scene.classList.contains('night') ? '☀️ กลางวัน' : '🌙 กลางคืน';
  }
}

function init() {
  loadState();
  renderGrid();
  renderCollection();
  initStars();
  initDayNightToggle();
}

init();
