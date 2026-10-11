// เกมแต่งตัว — เลือกเพศ แล้วเลือกชุดสำเร็จรูปมาใส่ให้ตัวละคร (วาดด้วย CSS ล้วน ไม่ใช้รูปภาพ)
const DRESSUP_STATE_KEY = 'dressupState_v1';

const MALE_OUTFITS = [
  { key: 'm1', name: 'เสื้อน้ำเงิน กางเกงดำ', shirt: '#2563eb', bottom: '#1e293b', type: 'pants' },
  { key: 'm2', name: 'ชุดนักเรียน', shirt: '#ffffff', bottom: '#1e3a8a', type: 'pants' },
  { key: 'm3', name: 'ฮีโร่เสื้อแดง', shirt: '#dc2626', bottom: '#1e293b', type: 'pants' },
  { key: 'm4', name: 'ชุดเกษตรกร', shirt: '#92400e', bottom: '#365314', type: 'pants' },
  { key: 'm5', name: 'เสื้อเขียว กางเกงเทา', shirt: '#16a34a', bottom: '#64748b', type: 'pants' },
  { key: 'm6', name: 'สูทสีเทา', shirt: '#334155', bottom: '#0f172a', type: 'pants' },
];

const FEMALE_OUTFITS = [
  { key: 'f1', name: 'เดรสชมพู', shirt: '#f472b6', bottom: '#f472b6', type: 'dress' },
  { key: 'f2', name: 'เสื้อเหลือง กระโปรงฟ้า', shirt: '#fde047', bottom: '#38bdf8', type: 'skirt' },
  { key: 'f3', name: 'ชุดเจ้าหญิงม่วง', shirt: '#c084fc', bottom: '#c084fc', type: 'dress' },
  { key: 'f4', name: 'เสื้อแดง กระโปรงขาว', shirt: '#f87171', bottom: '#ffffff', type: 'skirt' },
  { key: 'f5', name: 'เดรสเขียวมิ้นท์', shirt: '#6ee7b7', bottom: '#6ee7b7', type: 'dress' },
  { key: 'f6', name: 'เสื้อขาว กระโปรงชมพู', shirt: '#ffffff', bottom: '#f9a8d4', type: 'skirt' },
];

let currentGender = 'male';
let currentOutfitKey = MALE_OUTFITS[0].key;
let currentMode = 'preset'; // 'preset' หรือ 'sandbox'

const SHIRT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#fde047', '#f472b6', '#c084fc', '#ffffff', '#334155', '#f87171', '#92400e'];
const BOTTOM_COLORS = ['#1e293b', '#1e3a8a', '#365314', '#64748b', '#38bdf8', '#f9a8d4', '#ffffff', '#0f172a', '#c084fc', '#f472b6'];
let sandbox = { shirtColor: SHIRT_COLORS[0], bottomColor: BOTTOM_COLORS[0], bottomType: 'pants' };

const el = (id) => document.getElementById(id);

function outfitsForGender(gender) {
  return gender === 'male' ? MALE_OUTFITS : FEMALE_OUTFITS;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRESSUP_STATE_KEY));
    if (saved) {
      currentGender = saved.gender || 'male';
      currentOutfitKey = saved.outfitKey || outfitsForGender(currentGender)[0].key;
      currentMode = saved.mode || 'preset';
      if (saved.sandbox) sandbox = saved.sandbox;
    }
  } catch (e) { /* เริ่มใหม่ถ้าอ่านไม่ได้ */ }
}

function saveState() {
  localStorage.setItem(DRESSUP_STATE_KEY, JSON.stringify({
    gender: currentGender, outfitKey: currentOutfitKey, mode: currentMode, sandbox,
  }));
}

function applyOutfit(outfit) {
  const shirtEl = el('dollShirt');
  const bottomEl = el('dollBottom');
  bottomEl.className = `doll-bottom ${outfit.type}`;
  bottomEl.style.backgroundColor = outfit.bottom; // ใช้ backgroundColor เพื่อไม่ไปทับลายผ้า (background-image) ที่ตั้งไว้ใน CSS
  if (outfit.type === 'dress') {
    shirtEl.style.opacity = '0';
  } else {
    shirtEl.style.opacity = '1';
    shirtEl.style.backgroundColor = outfit.shirt;
  }
  if (outfit.name) el('outfitName').textContent = outfit.name;
}

function renderDollGender() {
  const doll = document.querySelector('.doll');
  doll.classList.toggle('female', currentGender === 'female');
  doll.classList.toggle('male', currentGender === 'male');
}

function renderOutfitGrid() {
  const grid = el('outfitGrid');
  grid.innerHTML = '';
  outfitsForGender(currentGender).forEach((outfit) => {
    const card = document.createElement('div');
    card.className = 'outfit-card';
    if (outfit.key === currentOutfitKey) card.classList.add('selected');
    const swatch = document.createElement('div');
    swatch.className = 'outfit-swatch';
    const top = document.createElement('div');
    top.className = 'top-half';
    top.style.background = outfit.type === 'dress' ? outfit.bottom : outfit.shirt;
    const bottom = document.createElement('div');
    bottom.className = 'bottom-half';
    bottom.style.background = outfit.bottom;
    swatch.appendChild(top);
    swatch.appendChild(bottom);
    card.appendChild(swatch);
    const label = document.createElement('div');
    label.textContent = outfit.name;
    card.appendChild(label);
    card.addEventListener('click', () => selectOutfit(outfit));
    grid.appendChild(card);
  });
}

function selectOutfit(outfit) {
  currentOutfitKey = outfit.key;
  applyOutfit(outfit);
  renderOutfitGrid();
  saveState();
}

function selectGender(gender) {
  currentGender = gender;
  el('maleBtn').classList.toggle('active', gender === 'male');
  el('femaleBtn').classList.toggle('active', gender === 'female');
  renderDollGender();
  const list = outfitsForGender(gender);
  const match = list.find((o) => o.key === currentOutfitKey);
  const outfit = match || list[0];
  currentOutfitKey = outfit.key;
  applyOutfit(outfit);
  renderOutfitGrid();
  saveState();
}

function randomOutfit() {
  if (currentMode === 'sandbox') {
    sandbox.shirtColor = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    sandbox.bottomColor = BOTTOM_COLORS[Math.floor(Math.random() * BOTTOM_COLORS.length)];
    sandbox.bottomType = Math.random() < 0.5 ? 'pants' : 'skirt';
    applySandbox();
    renderSandboxControls();
    saveState();
    return;
  }
  const list = outfitsForGender(currentGender);
  const outfit = list[Math.floor(Math.random() * list.length)];
  selectOutfit(outfit);
}

// ----- โหมดสร้างชุดเอง (sandbox) — เลือกสีเสื้อ + สีกางเกง/กระโปรงแยกกันอิสระ -----
function applySandbox() {
  applyOutfit({ shirt: sandbox.shirtColor, bottom: sandbox.bottomColor, type: sandbox.bottomType });
  el('outfitName').textContent = 'ชุดที่สร้างเอง';
}

function renderSwatchRow(rowId, colors, selectedColor, onPick) {
  const row = el(rowId);
  row.innerHTML = '';
  colors.forEach((color) => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    if (color === selectedColor) btn.classList.add('selected');
    btn.style.background = color;
    btn.addEventListener('click', () => onPick(color));
    row.appendChild(btn);
  });
}

function renderSandboxControls() {
  renderSwatchRow('shirtColorRow', SHIRT_COLORS, sandbox.shirtColor, (color) => {
    sandbox.shirtColor = color;
    applySandbox();
    renderSandboxControls();
    saveState();
  });
  renderSwatchRow('bottomColorRow', BOTTOM_COLORS, sandbox.bottomColor, (color) => {
    sandbox.bottomColor = color;
    applySandbox();
    renderSandboxControls();
    saveState();
  });
  el('pantsTypeBtn').classList.toggle('active', sandbox.bottomType === 'pants');
  el('skirtTypeBtn').classList.toggle('active', sandbox.bottomType === 'skirt');
}

function setBottomType(type) {
  sandbox.bottomType = type;
  applySandbox();
  renderSandboxControls();
  saveState();
}

function setMode(mode) {
  currentMode = mode;
  el('presetModeBtn').classList.toggle('active', mode === 'preset');
  el('sandboxModeBtn').classList.toggle('active', mode === 'sandbox');
  el('presetPanel').style.display = mode === 'preset' ? 'block' : 'none';
  el('sandboxPanel').style.display = mode === 'sandbox' ? 'block' : 'none';
  if (mode === 'preset') {
    const list = outfitsForGender(currentGender);
    const outfit = list.find((o) => o.key === currentOutfitKey) || list[0];
    applyOutfit(outfit);
  } else {
    applySandbox();
    renderSandboxControls();
  }
  saveState();
}

function init() {
  loadState();
  el('maleBtn').addEventListener('click', () => selectGender('male'));
  el('femaleBtn').addEventListener('click', () => selectGender('female'));
  el('randomOutfitBtn').addEventListener('click', randomOutfit);
  el('presetModeBtn').addEventListener('click', () => setMode('preset'));
  el('sandboxModeBtn').addEventListener('click', () => setMode('sandbox'));
  el('pantsTypeBtn').addEventListener('click', () => setBottomType('pants'));
  el('skirtTypeBtn').addEventListener('click', () => setBottomType('skirt'));

  el('maleBtn').classList.toggle('active', currentGender === 'male');
  el('femaleBtn').classList.toggle('active', currentGender === 'female');
  renderDollGender();

  el('presetModeBtn').classList.toggle('active', currentMode === 'preset');
  el('sandboxModeBtn').classList.toggle('active', currentMode === 'sandbox');
  el('presetPanel').style.display = currentMode === 'preset' ? 'block' : 'none';
  el('sandboxPanel').style.display = currentMode === 'sandbox' ? 'block' : 'none';

  renderOutfitGrid();
  renderSandboxControls();

  if (currentMode === 'sandbox') {
    applySandbox();
  } else {
    const list = outfitsForGender(currentGender);
    const outfit = list.find((o) => o.key === currentOutfitKey) || list[0];
    currentOutfitKey = outfit.key;
    applyOutfit(outfit);
  }
}

init();
