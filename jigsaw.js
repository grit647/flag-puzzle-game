// สร้างรูปทรงขอบจิ๊กซอ (ปุ่ม/ร่อง) แบบสุ่ม ให้แต่ละชิ้นต่อกันได้พอดีจริง
// หลักการ: สุ่มทิศทางปุ่ม-ร่องของ "เส้นขอบร่วม" ระหว่างชิ้นที่ติดกันไว้ก่อน (ครั้งเดียวต่อเกม)
// แล้วให้ชิ้นแต่ละด้าน "อ่าน" ค่าจากเส้นขอบร่วมนั้น — ชิ้นฝั่งหนึ่งได้ปุ่ม (+1) อีกฝั่งได้ร่อง (-1) เสมอ

function generateEdgeData(rows, cols) {
  const horizontal = []; // เส้นขอบแนวนอน ระหว่างแถว r กับ r+1
  for (let r = 0; r < rows - 1; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push(Math.random() < 0.5 ? 1 : -1);
    horizontal.push(row);
  }
  const vertical = []; // เส้นขอบแนวตั้ง ระหว่างคอลัมน์ c กับ c+1
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols - 1; c++) row.push(Math.random() < 0.5 ? 1 : -1);
    vertical.push(row);
  }
  return { horizontal, vertical };
}

// คืนค่าทิศของปุ่ม/ร่องทั้ง 4 ด้านของชิ้น (row, col): 0 = ขอบตรง (อยู่ริมภาพ), +1/-1 = ปุ่ม/ร่อง
function edgesForPiece(row, col, rows, cols, edgeData) {
  return {
    top: row === 0 ? 0 : -edgeData.horizontal[row - 1][col],
    bottom: row === rows - 1 ? 0 : edgeData.horizontal[row][col],
    left: col === 0 ? 0 : -edgeData.vertical[row][col - 1],
    right: col === cols - 1 ? 0 : edgeData.vertical[row][col],
  };
}

// สร้าง path (SVG) ของชิ้นจิ๊กซอขนาด w x h โดยเว้นขอบ amp รอบด้าน (ให้ปุ่มยื่นออกไปได้)
// ใช้กับ CSS clip-path: path('...') บนกล่องขนาด (w+2*amp) x (h+2*amp)
function buildPiecePath(w, h, edges, amp) {
  const ox = amp, oy = amp;
  const pt = (xy) => `${xy[0].toFixed(1)},${xy[1].toFixed(1)}`;

  function edgeCommands(S, E, dir) {
    if (!dir) return `L ${pt(E)}`;
    const ux = E[0] - S[0], uy = E[1] - S[1];
    const L = Math.hypot(ux, uy);
    const eu = [ux / L, uy / L];
    const nrm = [eu[1], -eu[0]]; // เวกเตอร์ตั้งฉาก ชี้ออกนอกตัวชิ้นเสมอ (ตามทิศการไล่ขอบที่กำหนดไว้)
    const P = (s, t) => [
      S[0] + eu[0] * s * L + nrm[0] * t * dir * amp,
      S[1] + eu[1] * s * L + nrm[1] * t * dir * amp,
    ];
    const p35 = P(0.35, 0), c1a = P(0.35, 0.2), c1b = P(0.3, 0.5), pMid = P(0.5, 0.5);
    const c2a = P(0.7, 0.5), c2b = P(0.65, 0.2), p65 = P(0.65, 0);
    return `L ${pt(p35)} C ${pt(c1a)} ${pt(c1b)} ${pt(pMid)} C ${pt(c2a)} ${pt(c2b)} ${pt(p65)} L ${pt(E)}`;
  }

  const TL = [ox, oy], TR = [ox + w, oy], BR = [ox + w, oy + h], BL = [ox, oy + h];
  let d = `M ${pt(TL)} `;
  d += edgeCommands(TL, TR, edges.top) + ' ';     // บน: ซ้าย -> ขวา
  d += edgeCommands(TR, BR, edges.right) + ' ';   // ขวา: บน -> ล่าง
  d += edgeCommands(BR, BL, edges.bottom) + ' ';  // ล่าง: ขวา -> ซ้าย
  d += edgeCommands(BL, TL, edges.left) + ' ';    // ซ้าย: ล่าง -> บน
  d += 'Z';
  return d;
}
