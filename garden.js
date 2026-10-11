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

const TREE_KINDS = [
  { key: 'bigtree', emoji: '🌳', name: 'ต้นไม้ใหญ่' },
  { key: 'pine', emoji: '🌲', name: 'ต้นสน' },
  { key: 'palm', emoji: '🌴', name: 'ต้นมะพร้าว' },
  { key: 'cactus', emoji: '🌵', name: 'กระบองเพชร' },
];

// ต้นไม้แฟนตาซี — หายากกว่าแบบธรรมดา มีประกายวิบวับตอนบาน
const FANTASY_KINDS = [
  { key: 'mushroom', emoji: '🍄', name: 'เห็ดเวทมนตร์', fantasy: true },
  { key: 'crystal', emoji: '🔮', name: 'ต้นไม้คริสตัล', fantasy: true },
  { key: 'rainbow', emoji: '🌈', name: 'ต้นไม้สายรุ้ง', fantasy: true },
  { key: 'star', emoji: '🌟', name: 'ต้นไม้ดวงดาว', fantasy: true },
  { key: 'clover', emoji: '🍀', name: 'โคลเวอร์นำโชค', fantasy: true },
];

const NORMAL_KINDS = [...FLOWER_KINDS, ...TREE_KINDS];
const ALL_KINDS = [...FLOWER_KINDS, ...TREE_KINDS, ...FANTASY_KINDS];
const FANTASY_CHANCE = 0.15; // โอกาสได้ของแฟนตาซีหายาก 15%

// แต่ละช่อง: null = ว่าง, หรือ { stage: 1|2|3, kind }
// stage 1 = 🌱 เมล็ดงอก (ปลูกแล้ว), stage 2 = 🌿 ต้นกล้า (รดน้ำ 1 ครั้ง), stage 3 = บาน (รดน้ำครบ)
let plots = new Array(PLOT_COUNT).fill(null);
let collection = {}; // { roseKey: count, ... }
let totalHarvested = 0;
let points = 0; // แต้มสะสม ได้จากการเก็บผลผลิต ใช้ซื้อกล่องสุ่มเมล็ดได้
const SEED_BOX_COST = 50;
const SEED_BOX_AMOUNT = 7;

const el = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(GARDEN_STATE_KEY));
    if (saved) {
      collection = saved.collection || {};
      totalHarvested = saved.totalHarvested || 0;
      points = saved.points || 0;
    }
  } catch (e) { /* เริ่มใหม่ถ้าอ่านไม่ได้ */ }
}

function saveState() {
  localStorage.setItem(GARDEN_STATE_KEY, JSON.stringify({ collection, totalHarvested, points }));
}

function randomKind() {
  if (Math.random() < FANTASY_CHANCE) {
    return FANTASY_KINDS[Math.floor(Math.random() * FANTASY_KINDS.length)];
  }
  return NORMAL_KINDS[Math.floor(Math.random() * NORMAL_KINDS.length)];
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
      const kind = ALL_KINDS.find((k) => k.key === plot.kind);
      if (kind.fantasy) cell.classList.add('fantasy');
      const hintText = kind.fantasy ? '✨ ของหายาก! แตะเก็บเลย!' : 'แตะเพื่อเก็บ!';
      cell.innerHTML = `<div class="plot-emoji">${kind.emoji}</div><div class="plot-hint">${hintText}</div>`;
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
    // เก็บผลผลิต (ดอกไม้หรือต้นไม้)
    const harvestedKind = ALL_KINDS.find((k) => k.key === plot.kind);
    collection[plot.kind] = (collection[plot.kind] || 0) + 1;
    totalHarvested += 1;
    points += 1; // เก็บได้ 1 ชิ้น = ได้ 1 แต้ม เอาไปซื้อกล่องสุ่มเมล็ดได้
    plots[i] = null;
    saveState();
    showFloatPlus(e.clientX, e.clientY, harvestedKind.emoji);
    renderCollection();
  }
  renderGrid();
}

function showFloatPlus(x, y, emoji) {
  const span = document.createElement('span');
  span.className = 'float-plus';
  span.textContent = `+1 ${emoji}`;
  span.style.left = `${x}px`;
  span.style.top = `${y}px`;
  document.body.appendChild(span);
  setTimeout(() => span.remove(), 900);
}

function renderCollectionGroup(rowId, kinds) {
  const row = el(rowId);
  if (!row) return;
  row.innerHTML = '';
  kinds.forEach((kind) => {
    const count = collection[kind.key] || 0;
    const chip = document.createElement('div');
    chip.className = 'collection-chip';
    chip.innerHTML = `<span class="emoji">${kind.emoji}</span><span>${kind.name} × ${count}</span>`;
    row.appendChild(chip);
  });
}

function renderCollection() {
  el('totalCount').textContent = String(totalHarvested);
  renderCollectionGroup('collectionRow', FLOWER_KINDS);
  renderCollectionGroup('treeCollectionRow', TREE_KINDS);
  renderCollectionGroup('fantasyCollectionRow', FANTASY_KINDS);
  updatePointsDisplay();
}

function updatePointsDisplay() {
  const pointsLabel = el('pointsCount');
  if (pointsLabel) pointsLabel.textContent = String(points);
  const btn = el('seedBoxBtn');
  if (btn) btn.disabled = points < SEED_BOX_COST;
}

// กล่องสุ่มเมล็ด — จ่าย 50 แต้ม ได้เมล็ดสุ่ม 7 เมล็ด ปลูกลงช่องว่างให้ทันที
// (ถ้าช่องว่างไม่พอ 7 ช่อง จะปลูกเท่าที่มีที่ว่างให้)
function openSeedBox() {
  if (points < SEED_BOX_COST) return;
  const emptyIndexes = plots.map((p, i) => (p === null ? i : -1)).filter((i) => i !== -1);
  if (emptyIndexes.length === 0) {
    showSeedBoxResult([], true);
    return;
  }
  points -= SEED_BOX_COST;
  const planCount = Math.min(SEED_BOX_AMOUNT, emptyIndexes.length);
  const shuffledEmpty = emptyIndexes.sort(() => Math.random() - 0.5).slice(0, planCount);
  const obtained = [];
  shuffledEmpty.forEach((idx) => {
    const kind = randomKind();
    plots[idx] = { stage: 1, kind: kind.key };
    obtained.push(kind);
  });
  saveState();
  renderGrid();
  renderCollection();
  showSeedBoxResult(obtained, false);
}

function showSeedBoxResult(obtained, noSpace) {
  const content = el('seedBoxResult');
  const msg = el('seedBoxMsg');
  content.innerHTML = '';
  if (noSpace) {
    msg.textContent = '⚠️ ไม่มีช่องว่างให้ปลูกเลย ไปเก็บผลผลิตในสวนก่อนนะครับ แล้วค่อยกลับมาเปิดกล่องใหม่!';
  } else {
    msg.textContent = obtained.length < SEED_BOX_AMOUNT
      ? `ปลูกได้ ${obtained.length} เมล็ด (ช่องว่างไม่พอ 7 ช่อง)`
      : `ได้เมล็ดใหม่ ${obtained.length} ต้น ปลูกลงสวนให้แล้ว รดน้ำให้โตกันเลย!`;
    obtained.forEach((kind) => {
      const span = document.createElement('span');
      span.textContent = kind.emoji;
      if (kind.fantasy) span.classList.add('seed-box-fantasy');
      content.appendChild(span);
    });
  }
  el('seedBoxModal').style.display = 'flex';
}

function initSeedBox() {
  const btn = el('seedBoxBtn');
  const closeBtn = el('seedBoxCloseBtn');
  if (btn) btn.addEventListener('click', openSeedBox);
  if (closeBtn) closeBtn.addEventListener('click', () => { el('seedBoxModal').style.display = 'none'; });
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

// โชว์ "สวนของฉัน" แบบภาพรวม — เอาทุกอย่างที่เก็บได้มาวางรวมกันเป็นภาพสวนจริง
function openReviewGarden() {
  const content = el('reviewGarden');
  const emptyMsg = el('reviewEmptyMsg');
  content.innerHTML = '';
  let any = false;
  ALL_KINDS.forEach((kind) => {
    const count = collection[kind.key] || 0;
    const showCount = Math.min(count, 14); // กันล้นจอถ้าเก็บเยอะมาก
    for (let i = 0; i < showCount; i++) {
      const span = document.createElement('span');
      span.textContent = kind.emoji;
      content.appendChild(span);
      any = true;
    }
  });
  emptyMsg.textContent = any ? '' : 'ยังไม่มีอะไรในสวนเลย ลองปลูกแล้วเก็บดูก่อนนะครับ!';
  el('reviewModal').style.display = 'flex';
}

function initReviewButton() {
  const btn = el('reviewBtn');
  const closeBtn = el('reviewCloseBtn');
  if (btn) btn.addEventListener('click', openReviewGarden);
  if (closeBtn) closeBtn.addEventListener('click', () => { el('reviewModal').style.display = 'none'; });
}

function init() {
  loadState();
  renderGrid();
  renderCollection();
  initStars();
  initDayNightToggle();
  initReviewButton();
  initSeedBox();
}

init();
