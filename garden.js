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

// ดอกไม้พิเศษ — ปลูกไม่ได้เลย ต้องซื้อด้วยแต้มจากร้านค้าเท่านั้น (ไม่อยู่ใน randomKind())
const SHOP_KINDS = [
  { key: 'lavender', emoji: '🪻', name: 'ลาเวนเดอร์', price: 30, shop: true },
  { key: 'maluka', emoji: '💮', name: 'มะลุก้า', price: 30, shop: true },
  { key: 'lotus', emoji: '🪷', name: 'ดอกบัว', price: 30, shop: true },
];

const NORMAL_KINDS = [...FLOWER_KINDS, ...TREE_KINDS];
const ALL_KINDS = [...FLOWER_KINDS, ...TREE_KINDS, ...FANTASY_KINDS];
const EVERYTHING_KINDS = [...ALL_KINDS, ...SHOP_KINDS]; // ใช้ตอนโชว์รีวิวสวน/ขาย รวมของร้านค้าด้วย
const FANTASY_CHANCE = 0.15; // โอกาสได้ของแฟนตาซีหายาก 15%

// แต่ละช่อง: null = ว่าง, หรือ { stage: 1|2|3, kind }
// stage 1 = 🌱 เมล็ดงอก (ปลูกแล้ว), stage 2 = 🌿 ต้นกล้า (รดน้ำ 1 ครั้ง), stage 3 = บาน (รดน้ำครบ)
let plots = new Array(PLOT_COUNT).fill(null);
let collection = {}; // { roseKey: count, ... }
let totalHarvested = 0;
let points = 0; // แต้มสะสม ได้จากการเก็บผลผลิต ใช้ซื้อกล่องสุ่มเมล็ดได้
let goldHarvested = 0;
let rainbowHarvested = 0;
const SEED_BOX_COST = 50;
const SEED_BOX_AMOUNT = 7;
const SELL_VALUE_NORMAL = 5;  // ขายดอกไม้/ต้นไม้ธรรมดา ได้ 5 แต้มต่อชิ้น
const SELL_VALUE_FANTASY = 20; // ของแฟนตาซีหายาก ขายได้แพงกว่า

// "ของทอง"/"สายรุ้ง" เป็นสุ่มพิเศษที่ติดมากับดอกไม้/ต้นไม้ชนิดไหนก็ได้ (คนละระบบกับของแฟนตาซี)
// เกิดได้ตั้งแต่ตอนปลูกเมล็ด เห็นได้เลยไม่ต้องรอบาน — ยิ่งหายากยิ่งได้แต้มโบนัสเยอะ
const VARIANT_GOLD_CHANCE = 0.06;    // 6%
const VARIANT_RAINBOW_CHANCE = 0.02; // 2%
const VARIANT_GOLD_BONUS = 10;
const VARIANT_RAINBOW_BONUS = 25;

function rollVariant() {
  const r = Math.random();
  if (r < VARIANT_RAINBOW_CHANCE) return 'rainbow';
  if (r < VARIANT_RAINBOW_CHANCE + VARIANT_GOLD_CHANCE) return 'gold';
  return 'normal';
}

const el = (id) => document.getElementById(id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(GARDEN_STATE_KEY));
    if (saved) {
      collection = saved.collection || {};
      totalHarvested = saved.totalHarvested || 0;
      points = saved.points || 0;
      goldHarvested = saved.goldHarvested || 0;
      rainbowHarvested = saved.rainbowHarvested || 0;
    }
  } catch (e) { /* เริ่มใหม่ถ้าอ่านไม่ได้ */ }
}

function saveState() {
  localStorage.setItem(GARDEN_STATE_KEY, JSON.stringify({
    collection, totalHarvested, points, goldHarvested, rainbowHarvested,
  }));
}

function randomKind() {
  if (Math.random() < FANTASY_CHANCE) {
    return FANTASY_KINDS[Math.floor(Math.random() * FANTASY_KINDS.length)];
  }
  return NORMAL_KINDS[Math.floor(Math.random() * NORMAL_KINDS.length)];
}

function variantBadge(variant) {
  if (variant === 'rainbow') return '<div class="plot-badge badge-rainbow">🌈</div>';
  if (variant === 'gold') return '<div class="plot-badge badge-gold">🏆</div>';
  return '';
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
    } else {
      // เห็นได้ตั้งแต่เมล็ดเลยว่าเป็น "ของทอง"/"สายรุ้ง" หรือเปล่า — ลุ้นได้ทันทีไม่ต้องรอบาน
      if (plot.variant === 'gold') cell.classList.add('variant-gold');
      if (plot.variant === 'rainbow') cell.classList.add('variant-rainbow');
      const badge = variantBadge(plot.variant);
      if (plot.stage === 1) {
        cell.innerHTML = `${badge}<div class="plot-emoji">🌱</div><div class="plot-hint">แตะเพื่อรดน้ำ</div>`;
      } else if (plot.stage === 2) {
        cell.innerHTML = `${badge}<div class="plot-emoji">🌿</div><div class="plot-hint">แตะรดน้ำอีกครั้ง</div>`;
      } else {
        cell.classList.add('bloom');
        const kind = ALL_KINDS.find((k) => k.key === plot.kind);
        if (kind.fantasy) cell.classList.add('fantasy');
        const hintText = kind.fantasy ? '✨ ของหายาก! แตะเก็บเลย!' : 'แตะเพื่อเก็บ!';
        cell.innerHTML = `${badge}<div class="plot-emoji">${kind.emoji}</div><div class="plot-hint">${hintText}</div>`;
      }
    }
    cell.addEventListener('click', (e) => onPlotClick(i, e));
    grid.appendChild(cell);
  });
}

function onPlotClick(i, e) {
  const plot = plots[i];
  if (!plot) {
    // ปลูกเมล็ดใหม่ — สุ่มชนิดไว้ล่วงหน้า (เผยตอนบาน) + สุ่มว่าเป็นของทอง/สายรุ้งไหม (เห็นได้ทันที)
    plots[i] = { stage: 1, kind: randomKind().key, variant: rollVariant() };
  } else if (plot.stage === 1) {
    plot.stage = 2;
  } else if (plot.stage === 2) {
    plot.stage = 3; // บานแล้ว!
  } else {
    harvestPlot(i, plot, e.clientX, e.clientY);
  }
  renderGrid();
}

function harvestPlot(i, plot, x, y) {
  const harvestedKind = ALL_KINDS.find((k) => k.key === plot.kind);
  collection[plot.kind] = (collection[plot.kind] || 0) + 1;
  totalHarvested += 1;
  let bonus = 0;
  let badgeText = '';
  if (plot.variant === 'gold') {
    goldHarvested += 1;
    bonus = VARIANT_GOLD_BONUS;
    badgeText = ' 🏆ทอง';
  } else if (plot.variant === 'rainbow') {
    rainbowHarvested += 1;
    bonus = VARIANT_RAINBOW_BONUS;
    badgeText = ' 🌈สายรุ้ง';
  }
  points += 1 + bonus; // เก็บได้ 1 ชิ้น = ได้ 1 แต้ม + โบนัสถ้าเป็นของทอง/สายรุ้ง
  plots[i] = null;
  saveState();
  showFloatPlus(x, y, `${harvestedKind.emoji}${badgeText}`);
  renderCollection();
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

function sellValueFor(kind) {
  return kind.fantasy ? SELL_VALUE_FANTASY : SELL_VALUE_NORMAL;
}

function renderCollectionGroup(rowId, kinds) {
  const row = el(rowId);
  if (!row) return;
  row.innerHTML = '';
  kinds.forEach((kind) => {
    const count = collection[kind.key] || 0;
    const value = sellValueFor(kind);
    const chip = document.createElement('div');
    chip.className = 'collection-chip';
    chip.innerHTML = `<span class="emoji">${kind.emoji}</span><span>${kind.name} × ${count}</span>`;
    const sellBtn = document.createElement('button');
    sellBtn.className = 'sell-btn';
    sellBtn.textContent = `ขาย +${value}💰`;
    sellBtn.disabled = count <= 0;
    sellBtn.addEventListener('click', () => sellOne(kind));
    chip.appendChild(sellBtn);
    row.appendChild(chip);
  });
}

// ขายดอกไม้/ต้นไม้ 1 ชิ้น แลกเป็นแต้ม — ของแฟนตาซีขายได้แพงกว่าของธรรมดา
function sellOne(kind) {
  const count = collection[kind.key] || 0;
  if (count <= 0) return;
  collection[kind.key] = count - 1;
  points += sellValueFor(kind);
  saveState();
  renderCollection();
}

function renderCollection() {
  el('totalCount').textContent = String(totalHarvested);
  renderCollectionGroup('collectionRow', FLOWER_KINDS);
  renderCollectionGroup('treeCollectionRow', TREE_KINDS);
  renderCollectionGroup('fantasyCollectionRow', FANTASY_KINDS);
  renderShopRow();
  updatePointsDisplay();
}

// ร้านดอกไม้พิเศษ — ซื้อได้อย่างเดียว ไม่มีทางปลูกเองหรือสุ่มได้จากที่อื่น
function renderShopRow() {
  const row = el('shopRow');
  if (!row) return;
  row.innerHTML = '';
  SHOP_KINDS.forEach((kind) => {
    const owned = collection[kind.key] || 0;
    const chip = document.createElement('div');
    chip.className = 'collection-chip';
    chip.innerHTML = `<span class="emoji">${kind.emoji}</span><span>${kind.name} × ${owned}</span>`;
    const buyBtn = document.createElement('button');
    buyBtn.className = 'sell-btn buy-btn';
    buyBtn.textContent = `ซื้อ ${kind.price}💰`;
    buyBtn.disabled = points < kind.price;
    buyBtn.addEventListener('click', () => buyShopFlower(kind));
    chip.appendChild(buyBtn);
    row.appendChild(chip);
  });
}

function buyShopFlower(kind) {
  if (points < kind.price) return;
  points -= kind.price;
  collection[kind.key] = (collection[kind.key] || 0) + 1;
  saveState();
  renderCollection();
}

function updatePointsDisplay() {
  const pointsLabel = el('pointsCount');
  if (pointsLabel) pointsLabel.textContent = String(points);
  const btn = el('seedBoxBtn');
  if (btn) btn.disabled = points < SEED_BOX_COST;
  const goldLabel = el('goldCount');
  if (goldLabel) goldLabel.textContent = String(goldHarvested);
  const rainbowLabel = el('rainbowCount');
  if (rainbowLabel) rainbowLabel.textContent = String(rainbowHarvested);
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
    const variant = rollVariant();
    plots[idx] = { stage: 1, kind: kind.key, variant };
    obtained.push({ ...kind, variant });
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
      span.textContent = kind.variant === 'gold' ? `🏆${kind.emoji}`
        : kind.variant === 'rainbow' ? `🌈${kind.emoji}` : kind.emoji;
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

// เฟสพระจันทร์ — เรียงจากจันทร์ดับ ไปเต็มดวง แล้ววนกลับ (เสี้ยว/ครึ่ง/เกือบเต็ม/เต็มดวง)
const MOON_PHASES = [
  { emoji: '🌑', name: 'จันทร์ดับ' },
  { emoji: '🌒', name: 'เสี้ยวขึ้น' },
  { emoji: '🌓', name: 'ครึ่งดวง (ข้างขึ้น)' },
  { emoji: '🌔', name: 'ค่อนดวง (ข้างขึ้น)' },
  { emoji: '🌕', name: 'เต็มดวง!' },
  { emoji: '🌖', name: 'ค่อนดวง (ข้างแรม)' },
  { emoji: '🌗', name: 'ครึ่งดวง (ข้างแรม)' },
  { emoji: '🌘', name: 'เสี้ยวแรม' },
];

function initMoonPhase() {
  const moonEl = el('moonEl');
  if (!moonEl) return;
  let phaseIndex = parseInt(localStorage.getItem('gardenMoonPhase'), 10);
  if (Number.isNaN(phaseIndex) || phaseIndex < 0 || phaseIndex >= MOON_PHASES.length) phaseIndex = 4; // เริ่มที่เต็มดวง

  function render() {
    moonEl.textContent = MOON_PHASES[phaseIndex].emoji;
    moonEl.title = `แตะเพื่อเปลี่ยนเฟสพระจันทร์ — ตอนนี้: ${MOON_PHASES[phaseIndex].name}`;
  }
  render();

  moonEl.addEventListener('click', (e) => {
    e.stopPropagation(); // กันไปโดนปุ่มกลางวัน/กลางคืนที่อยู่ใกล้ๆ
    phaseIndex = (phaseIndex + 1) % MOON_PHASES.length;
    localStorage.setItem('gardenMoonPhase', String(phaseIndex));
    render();
  });
}

// โชว์ "สวนของฉัน" แบบภาพรวม — เอาทุกอย่างที่เก็บได้มาวางรวมกันเป็นภาพสวนจริง
function openReviewGarden() {
  const content = el('reviewGarden');
  const emptyMsg = el('reviewEmptyMsg');
  content.innerHTML = '';
  let any = false;
  EVERYTHING_KINDS.forEach((kind) => {
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
  initMoonPhase();
  initReviewButton();
  initSeedBox();
}

init();
