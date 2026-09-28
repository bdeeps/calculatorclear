// CalculatorClear's shared models, logic and helpers.
// Everything the chapters compute is real: an 8-digit calculator engine, a key-matrix scanner,
// logic gates with propagation delay, a ripple-carry adder, a BCD-to-7-segment decoder and CORDIC.
// Numbers come from real specs; sources are given next to each constant.
import { THREE, M, box, beam, rod, sphere, tube, canvasTexture, clamp } from './kit.js';

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

// ------------------------------------------------------------------ colours
export const COL = { one: '#ffd166', zero: '#3a4150', carry: '#ff7a59', sum: '#8ef0ff', good: '#7be08c', bad: '#ff5a8a', soft: 'rgba(255,255,255,.6)', grid: 'rgba(255,255,255,.1)', lcd: '#b9c3a6', seg: '#1c2118', ghost: 'rgba(28,33,24,.09)' };
export const HEX = { one: 0xffd166, zero: 0x3a4150, carry: 0xff7a59, sum: 0x8ef0ff, good: 0x7be08c, bad: 0xff5a8a, p: 0xff8fb1, n: 0x6fa8ff, copper: 0xd08a4a };

// ------------------------------------------------------------------ real numbers
// Casio fx-82MS spec sheet: power consumption 0.0001 W, i.e. 100 µW (Casio support, "Specifications").
export const SCI_UW = 100;
// A basic 4-function CMOS calculator draws less than a scientific one. About 20 µW is our estimate
// (a smaller chip, fewer segments, slower clock); it is not a published figure.
export const BASIC_UW = 20;
// Sinclair Executive (1972, red LED display): 20 mW (Wikipedia, Sinclair Executive).
export const LED_MW = 20;
// Solar cell: amorphous silicon strip about 36 × 10 mm on a pocket calculator (3.6 cm²). Under indoor white
// light, 1 W/m² of light is about 300 lux (LED/fluorescent luminous efficacy of radiation ≈ 300 lm/W);
// sunlight is about 105 lm/W (100,000 lux ≈ 1,000 W/m²). a-Si converts about 8–10 % of indoor light and
// about 6 % of sunlight (typical figures; Panasonic Amorton brochure).
export const CELL_CM2 = 3.6;
export function solarUW(lux) {
  const k = clamp(Math.log10(lux / 2000) / Math.log10(25), 0, 1);       // 2,000 lux → indoor, 50,000 lux → sun
  const eff = 300 + (105 - 300) * k, eta = 0.09 + (0.06 - 0.09) * k;
  const wm2 = lux / eff;                                                // W/m² of light
  return wm2 * (CELL_CM2 * 1e-4) * eta * 1e6;                            // µW
}
// Key bounce: most switches settle within a few milliseconds (Jack Ganssle, "A Guide to Debouncing",
// measured bounce averaging about 1.6 ms, a few up to 6 ms). Calculators wait around 10–20 ms.
export const BOUNCE_MS = 3;

// Gates and transistor counts in static CMOS (Weste & Harris, CMOS VLSI Design): NOT 2, NAND/NOR 4,
// AND/OR 6 (NAND/NOR plus NOT), XOR typically 12 (8 with pass-transistor tricks), mirror full adder 28.
export const GATES = {
  NOT: { f: (a) => 1 - a, n: 1, tr: 2 },
  AND: { f: (a, b) => a & b, n: 2, tr: 6 },
  OR: { f: (a, b) => a | b, n: 2, tr: 6 },
  XOR: { f: (a, b) => a ^ b, n: 2, tr: 12 },
  NAND: { f: (a, b) => 1 - (a & b), n: 2, tr: 4 },
};

// ------------------------------------------------------------------ numbers, binary and BCD
export const bin = (n, bits) => (n >>> 0).toString(2).padStart(bits, '0');
export const bcd = (n, digits = 4) => String(n).padStart(digits, '0').split('').map((d) => bin(+d, 4));

// ------------------------------------------------------------------ the 8-digit calculator engine
// Like a cheap pocket calculator: 8 digits, no guard digits, results cut off (truncated) to fit.
export const DIGITS = 8;
export function fit8(x) {
  if (!isFinite(x)) return { v: 0, err: true };
  x = +x.toPrecision(12);                                  // decimal-exact enough for 8 digits
  const neg = x < 0, a = Math.abs(x);
  if (a >= 1e8) return { v: 0, err: true };
  const intDigits = Math.max(1, Math.floor(a).toString().length);
  const dec = DIGITS - intDigits, p = 10 ** dec;
  const t = Math.floor(+(a * p).toPrecision(15)) / p;
  return { v: neg ? -t : t, err: false };
}
export function fmt8(v) {
  const neg = v < 0, a = Math.abs(v);
  const intDigits = Math.max(1, Math.floor(a).toString().length);
  let s = a.toFixed(DIGITS - intDigits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return (neg && a !== 0 ? '-' : '') + s;
}
export function makeEngine() {
  const e = { text: '0', acc: 0, op: null, fresh: true, err: false, last: '', history: [] };
  const cur = () => +e.text;
  const apply = (a, op, b) => op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : op === '÷' ? (b === 0 ? NaN : a / b) : b;
  const show = (x) => { const r = fit8(x); if (r.err) { e.err = true; e.text = '0'; } else e.text = fmt8(r.v); };
  e.press = (k) => {
    e.last = k;
    if (k === 'C') { Object.assign(e, { text: '0', acc: 0, op: null, fresh: true, err: false }); e.history = []; return; }
    if (e.err) return;
    if (/^\d$/.test(k)) {
      if (e.fresh) { e.text = k; e.fresh = false; return; }
      if (e.text.replace(/[-.]/g, '').length >= DIGITS) return;
      e.text = e.text === '0' ? k : e.text + k; return;
    }
    if (k === '.') { if (e.fresh) { e.text = '0.'; e.fresh = false; } else if (!e.text.includes('.')) e.text += '.'; return; }
    if (k === '±') { if (e.text !== '0') e.text = e.text.startsWith('-') ? e.text.slice(1) : '-' + e.text; return; }
    if (k === '√') { show(Math.sqrt(cur())); if (cur() < 0) e.err = true; e.fresh = true; return; }
    if (k === '%') { show(e.op ? (e.acc * cur()) / 100 : cur() / 100); e.fresh = true; return; }
    if ('+−×÷='.includes(k)) {
      if (e.op && !e.fresh) { const r = apply(e.acc, e.op, cur()); e.history.push(`${fmt8(e.acc)} ${e.op} ${e.text}`); show(r); }
      e.acc = cur(); e.op = k === '=' ? null : k; e.fresh = true;
    }
  };
  e.type = (seq) => seq.split(' ').forEach((k) => e.press(k));
  return e;
}

// Keypad layout: 5 rows × 4 columns, scanned as a matrix.
export const KEYS = [['C', '±', '%', '÷'], ['7', '8', '9', '×'], ['4', '5', '6', '−'], ['1', '2', '3', '+'], ['0', '.', '√', '=']];
export const keyRC = (k) => { for (let r = 0; r < 5; r++) { const c = KEYS[r].indexOf(k); if (c >= 0) return [r, c]; } return null; };

// ------------------------------------------------------------------ seven segments
// Segments a (top), b (top right), c (bottom right), d (bottom), e (bottom left), f (top left), g (middle).
export const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', E: 'adefg', ' ': '' };
export const SEGS = 'abcdefg';
// Each segment as a polygon in a 1 × 2 cell (x right, y down), slanted a little like a real LCD.
export function segPolys(w = 1, h = 2, t = 0.16) {
  const g = t / 2, m = h / 2;
  const H = (y, x0, x1) => [[x0 + g, y], [x0 + t, y - g], [x1 - t, y - g], [x1 - g, y], [x1 - t, y + g], [x0 + t, y + g]];
  const V = (x, y0, y1) => [[x, y0 + g], [x + g, y0 + t], [x + g, y1 - t], [x, y1 - g], [x - g, y1 - t], [x - g, y0 + t]];
  return { a: H(g, 0, w), g: H(m, 0, w), d: H(h - g, 0, w), f: V(g, 0, m), b: V(w - g, 0, m), e: V(g, m, h), c: V(w - g, m, h) };
}
// Draw a digit at (x, y) with height hgt on a 2D canvas. Slant makes it look like a calculator.
export function drawDigit(g, ch, x, y, hgt, on = COL.seg, off = COL.ghost, dp = false) {
  const w = hgt * 0.5, P = segPolys(w, hgt, hgt * 0.1), lit = SEG[ch] ?? '', sl = 0.1;
  for (const s of SEGS) {
    g.fillStyle = lit.includes(s) ? on : off; g.beginPath();
    P[s].forEach(([px, py], i) => { const X = x + px + (hgt - py) * sl, Y = y + py; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.fill();
  }
  g.fillStyle = dp ? on : off; g.beginPath(); g.arc(x + w + hgt * 0.1, y + hgt - hgt * 0.04, hgt * 0.055, 0, TAU); g.fill();
}
// A calculator's LCD: 8 digits, right-aligned, with minus and error flags.
export function drawLCD(g, W, H, text = '0', err = false, bg = COL.lcd) {
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(255,255,255,.18)'); grad.addColorStop(1, 'rgba(0,0,0,.08)'); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const cells = [], neg = text.startsWith('-');
  const body = neg ? text.slice(1) : text;
  for (const ch of body) { if (ch === '.') { if (cells.length) cells[cells.length - 1].dp = true; } else cells.push({ ch, dp: false }); }
  while (cells.length < DIGITS) cells.unshift({ ch: ' ', dp: false });
  const hgt = H * 0.62, pitch = (W - H * 0.5) / DIGITS, x0 = H * 0.42, y0 = (H - hgt) / 2;
  cells.slice(-DIGITS).forEach((c, i) => drawDigit(g, c.ch, x0 + i * pitch, y0, hgt, COL.seg, COL.ghost, c.dp));
  g.font = `bold ${H * 0.16}px sans-serif`; g.fillStyle = neg ? COL.seg : COL.ghost; g.fillText('−', H * 0.06, H * 0.5);
  g.fillStyle = err ? COL.seg : COL.ghost; g.fillText('E', H * 0.06, H * 0.26);
}

// ------------------------------------------------------------------ canvas boards (live charts in the scene)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.92)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const b = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: b.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { ...b, mesh: m };
}
export function title(g, s, sub = '', y = 40) {
  g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.textAlign = 'left'; g.fillText(s, 24, y);
  if (sub) { g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.62)'; g.fillText(sub, 24, y + 28); }
}
export function text(g, s, x, y, { font = '20px sans-serif', col = 'rgba(255,255,255,.82)', align = 'left' } = {}) { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
export const mono = (px, bold = false) => `${bold ? 'bold ' : ''}${px}px ui-monospace, "Geist Mono", Menlo, monospace`;
export function bitBoxes(g, bits, x, y, sz, { on = COL.one, off = '#262c38', txt = true, gap = 6 } = {}) {
  [...bits].forEach((b, i) => {
    g.fillStyle = b === '1' ? on : off; g.fillRect(x + i * (sz + gap), y, sz, sz);
    if (txt) text(g, b, x + i * (sz + gap) + sz / 2, y + sz * 0.72, { font: mono(sz * 0.62, true), col: b === '1' ? '#10131c' : 'rgba(255,255,255,.6)', align: 'center' });
  });
  return x + bits.length * (sz + gap);
}

// ------------------------------------------------------------------ layout helpers for phones and the reel
export const inReel = () => document.body.classList.contains('gb-reel');
export function fitNarrow(stage, minor = [], y0 = -0.14) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? y0 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}

// ------------------------------------------------------------------ 3D logic
// A wire made of straight segments, glowing when it carries a 1.
const WIRE_OFF = () => M.plastic(0x485062, { roughness: 0.6 });
export function wire(parent, pts, r = 0.05) {
  const g = new THREE.Group(), off = WIRE_OFF(), on = M.glow(HEX.one);
  for (let i = 1; i < pts.length; i++) g.add(beam(pts[i - 1], pts[i], r, off, 10));
  for (let i = 1; i < pts.length - 1; i++) { const j = sphere(r * 1.02, off, 10); j.position.set(...pts[i]); g.add(j); }
  parent.add(g);
  let v = -1, lastCol = '';
  g.set = (x, col) => {
    const k = x ? 1 : 0;
    if (col && col !== lastCol) { lastCol = col; on.color.set(col); }
    if (k === v) return; v = k;
    g.children.forEach((m) => { m.material = k ? on : off; });
  };
  g.set(0);
  return g;
}
export function dot(parent, p, r = 0.09) { const d = sphere(r, M.glow(HEX.one), 12); d.position.set(...p); parent.add(d); return d; }

// Gate outlines in the XY plane, about 1.6 wide and 1.4 tall; inputs on the left, output on the right.
function gateShape(type) {
  const s = new THREE.Shape(), h = 0.7;
  if (type === 'AND' || type === 'NAND') { s.moveTo(-0.8, -h); s.lineTo(0, -h); s.absarc(0, 0, h, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-0.8, h); s.closePath(); }
  else if (type === 'OR' || type === 'XOR') { s.moveTo(-0.8, -h); s.quadraticCurveTo(0.2, -h, 0.9, 0); s.quadraticCurveTo(0.2, h, -0.8, h); s.quadraticCurveTo(-0.45, 0, -0.8, -h); }
  else { s.moveTo(-0.7, -0.62); s.lineTo(0.62, 0); s.lineTo(-0.7, 0.62); s.closePath(); }
  return s;
}
export const GATE_COL = { NOT: 0xc49bff, AND: 0x5ce1a9, OR: 0x6fa8ff, XOR: 0xff9f5a, NAND: 0xff8fb1 };
// A 3D gate. pins (local): in[] and out. `rot` turns the whole gate (e.g. −π/2 to point the output down).
export function makeGate(type, { scale = 1, depth = 0.36, color = GATE_COL[type] } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(gateShape(type), { depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  const mat = M.plastic(color, { roughness: 0.35, emissive: new THREE.Color(color), emissiveIntensity: 0.05 });
  const body = new THREE.Mesh(geo, mat); body.castShadow = true; g.add(body);
  if (type === 'XOR') {
    const c = new THREE.Shape(); c.moveTo(-1.02, -0.7); c.quadraticCurveTo(-0.67, 0, -1.02, 0.7); c.lineTo(-0.94, 0.7); c.quadraticCurveTo(-0.59, 0, -0.94, -0.7); c.closePath();
    const cg = new THREE.ExtrudeGeometry(c, { depth, bevelEnabled: false, curveSegments: 16 }); cg.translate(0, 0, -depth / 2);
    g.add(new THREE.Mesh(cg, mat));
  }
  let outX = type === 'AND' ? 0.72 : 0.9;
  if (type === 'NOT' || type === 'NAND') {
    const bx = type === 'NOT' ? 0.74 : 0.84;
    const bub = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 10, 24), mat); bub.position.x = bx; g.add(bub);
    outX = bx + 0.14;
  }
  if (type === 'NOT') outX = 0.88;
  const inX = type === 'XOR' ? -1.0 : type === 'OR' ? -0.66 : -0.8;
  g.userData.pins = { in: GATES[type].n === 1 ? [[inX, 0]] : [[inX, 0.35], [inX, -0.35]], out: [outX + 0.02, 0] };
  const tag = document.createElement('div');
  g.scale.setScalar(scale);
  g.mat = mat; g.type = type;
  g.setOut = (v) => { mat.emissiveIntensity = v ? 0.45 : 0.05; };
  // World-ish (parent-space) pin positions after the gate is placed.
  g.pin = (which, i = 0) => {
    const p = which === 'out' ? g.userData.pins.out : g.userData.pins.in[i];
    const v = new THREE.Vector3(p[0], p[1], 0).multiplyScalar(scale).applyEuler(g.rotation).add(g.position);
    return [v.x, v.y, v.z];
  };
  return g;
}
// A round lamp on a short post: shows a bit and can be clicked.
export function makeLamp(parent, pos, r = 0.22) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  const off = M.plastic(0x2a2f3b, { roughness: 0.4 }), on = M.glow(HEX.one);
  const bulb = sphere(r, off, 20); g.add(bulb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.08, r * 0.14, 8, 28), M.metal(0x9aa3b2)); g.add(ring);
  let v = -1, lastCol = '';
  g.set = (x, col) => { const k = x ? 1 : 0; if (col && col !== lastCol) { lastCol = col; on.color.set(col); } if (k === v) return; v = k; bulb.material = k ? on : off; };
  g.bulb = bulb; g.set(0);
  return g;
}

// A tiny event-driven logic simulator with one gate delay per gate.
// nodes: { name: value }; gates: [{ type, ins: [names], out: name, mesh? }]. `tau` is the delay in seconds.
export function makeSim(gates, inputs) {
  const v = { ...inputs }, pend = new Map();
  gates.forEach((g) => { v[g.out] = 0; });
  let t = 0;
  const settleNow = () => { for (let k = 0; k < 40; k++) gates.forEach((g) => { v[g.out] = GATES[g.type].f(...g.ins.map((n) => v[n])); }); pend.clear(); };
  settleNow();
  return {
    v,
    set(name, x) { v[name] = x ? 1 : 0; },
    settle: settleNow,
    busy: () => pend.size > 0,
    step(dt, tau) {
      t += dt;
      // Apply changes that are due, one gate delay after their inputs changed.
      for (const [g, p] of [...pend]) if (t >= p.at) { v[g.out] = p.val; pend.delete(g); g.changed = t; }
      gates.forEach((g) => {
        const want = GATES[g.type].f(...g.ins.map((n) => v[n]));
        const p = pend.get(g);
        if (want !== v[g.out]) { if (!p || p.val !== want) pend.set(g, { val: want, at: t + tau }); }
        else if (p) pend.delete(g);
      });
    },
  };
}

// ------------------------------------------------------------------ the pocket calculator
// About 1 unit = 1 cm. Lies flat: width along X (7.4), length along Z (12.4, keypad towards +Z), up is +Y.
export const KX = [-2.4, -0.8, 0.8, 2.4], KZ = [-1.2, 0.3, 1.8, 3.3, 4.8];
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function holeRect(cx, cy, w, h) { const p = new THREE.Path(); p.moveTo(cx - w / 2, cy - h / 2); p.lineTo(cx + w / 2, cy - h / 2); p.lineTo(cx + w / 2, cy + h / 2); p.lineTo(cx - w / 2, cy + h / 2); p.closePath(); return p; }
// Flat plate with rectangular holes, lying in XZ. holes: [cx, cz, w, d].
function holedPlate(w, d, t, holes, mat, r = 0.8) {
  const s = roundedRect(w, d, r);
  holes.forEach(([cx, cz, hw, hd]) => s.holes.push(holeRect(cx, -cz, hw, hd)));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}
function keyLabel(k, color) {
  const t = canvasTexture(128, 96, (g, W, H) => {
    g.fillStyle = color; g.fillRect(0, 0, W, H);
    g.fillStyle = k === 'C' || '+−×÷=%√±'.includes(k) ? '#fff' : '#f2f2ee';
    g.font = `bold ${k.length > 1 ? 40 : 60}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k, W / 2, H / 2 + 3);
  });
  return t.tex;
}
export function makeCalculator({ body = 0x2b303b, face = 0x1d2129 } = {}) {
  const group = new THREE.Group();
  const shellMat = M.plastic(body, { roughness: 0.5, transparent: true, opacity: 1 });
  // Bottom shell (a tray).
  const bottom = new THREE.Group(); group.add(bottom);
  const tray = holedPlate(7.4, 12.4, 0.12, [], shellMat); bottom.add(tray);
  for (const [w, d, x, z] of [[7.4, 0.2, 0, -6.1], [7.4, 0.2, 0, 6.1], [0.2, 12.4, -3.6, 0], [0.2, 12.4, 3.6, 0]]) { const b = box(w, 0.5, d, shellMat); b.position.set(x, 0.3, z); bottom.add(b); }
  // Button cell (LR1130: 11.6 mm across, 3.1 mm thick) in a pocket under the PCB.
  const cell = new THREE.Group(); cell.position.set(2.2, 0.28, -4.6); bottom.add(cell);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.31, 40), M.metal(0xd6dae2, { roughness: 0.2 })); cell.add(can);
  const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 40), M.metal(0xa9afbb)); capT.position.y = 0.16; cell.add(capT);
  // PCB with the key matrix, drawn as a texture: rows run across, columns run along, with interlocking
  // carbon pads at each key. The chip is a black epoxy blob (chip-on-board), as in most cheap calculators.
  const pcbTex = canvasTexture(740, 1240, (g, W, H) => {
    g.fillStyle = '#1f5a3a'; g.fillRect(0, 0, W, H);
    const X = (x) => ((x + 3.7) / 7.4) * W, Z = (z) => ((z + 6.2) / 12.4) * H;
    g.lineWidth = 7; g.strokeStyle = '#d9b36c';
    KZ.forEach((z, r) => { g.beginPath(); g.moveTo(X(-3.3), Z(z - 0.35)); g.lineTo(X(3.2), Z(z - 0.35)); g.stroke(); g.beginPath(); g.moveTo(X(-3.3), Z(z - 0.35)); g.lineTo(X(-3.3), Z(-4.2 + r * 0.12)); g.stroke(); });
    KX.forEach((x, c) => { g.beginPath(); g.moveTo(X(x + 0.45), Z(5.3)); g.lineTo(X(x + 0.45), Z(-2.1)); g.lineTo(X(-1.3 + c * 0.3), Z(-4.0)); g.stroke(); });
    KZ.forEach((z) => KX.forEach((x) => {
      g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(X(x), Z(z), 34, 0, TAU); g.fill();
      g.strokeStyle = '#8a8f99'; g.lineWidth = 4;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(X(x) + k * 9, Z(z) - 26); g.lineTo(X(x) + k * 9, Z(z) + 26); g.stroke(); }
    }));
    g.fillStyle = '#d9b36c'; for (let i = 0; i < 18; i++) g.fillRect(X(-3.0) + i * 34, Z(-5.9), 18, 40);    // LCD contact pads (zebra strip)
    for (let i = 0; i < 18; i++) g.fillRect(X(-3.0) + i * 34, Z(-2.8), 18, 40);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = 'bold 26px sans-serif'; g.fillText('ROWS', X(-3.55), Z(3.9)); g.fillText('COLUMNS', X(1.2), Z(5.7));
  });
  const pcb = new THREE.Group(); pcb.position.y = 0.62; group.add(pcb);
  const pcbSlab = box(7.0, 0.1, 12.0, [M.plastic(0x1f5a3a), M.plastic(0x1f5a3a), new THREE.MeshStandardMaterial({ map: pcbTex.tex, roughness: 0.6 }), M.plastic(0x1f5a3a), M.plastic(0x1f5a3a), M.plastic(0x1f5a3a)]);
  pcb.add(pcbSlab);
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 16, 0, TAU, 0, Math.PI / 2), M.plastic(0x0b0c0f, { roughness: 0.25 })); blob.scale.y = 0.35; blob.position.set(-1.0, 0.05, -4.2); pcb.add(blob);
  // LCD module: rubber zebra connectors, glass sandwich with the digits, and a frame.
  const lcd = new THREE.Group(); lcd.position.set(0, 0.95, -4.35); group.add(lcd);
  const zebraMat = M.matte(0xe7b8b8);
  [-0.95, 0.95].forEach((z) => { const zb = box(6.0, 0.28, 0.18, zebraMat); zb.position.set(0, -0.14, z * 0.95); lcd.add(zb); });
  const glass = box(6.3, 0.14, 2.3, M.clear(0xdfe8d8, 0.55, { depthWrite: true })); glass.position.y = 0.07; lcd.add(glass);
  const screen = canvasTexture(1024, 320, (g, W, H, text = '0', err = false) => drawLCD(g, W, H, text, err));
  const face1 = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 1.84), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
  face1.rotation.x = -Math.PI / 2; face1.position.y = 0.15; lcd.add(face1);
  // Solar cell: amorphous silicon on glass, in series strips (reddish-brown with fine lines).
  const solarTex = canvasTexture(512, 128, (g, W, H) => {
    g.fillStyle = '#3a2a2e'; g.fillRect(0, 0, W, H);
    for (let i = 1; i < 4; i++) { g.fillStyle = '#9a8f7a'; g.fillRect((i * W) / 4 - 2, 0, 4, H); }
    g.fillStyle = 'rgba(160,120,190,.18)'; g.fillRect(0, 0, W, H / 2);
  });
  const solar = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.0), [M.matte(0x3a2a2e), M.matte(0x3a2a2e), new THREE.MeshStandardMaterial({ map: solarTex.tex, roughness: 0.25, metalness: 0.2 }), M.matte(0x3a2a2e), M.matte(0x3a2a2e), M.matte(0x3a2a2e)]);
  solar.position.set(1.4, 1.05, -5.55); group.add(solar);
  // Rubber keypad: one sheet with a dome under every key and a carbon pill inside each dome.
  const rubber = new THREE.Group(); rubber.position.y = 0.78; group.add(rubber);
  const sheet = box(6.8, 0.06, 7.8, M.matte(0x8a8f99, { transparent: true, opacity: 0.85 })); sheet.position.z = 1.8; rubber.add(sheet);
  const domes = {}, pills = {};
  KZ.forEach((z, r) => KX.forEach((x, c) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 10, 0, TAU, 0, Math.PI / 2), M.matte(0x9aa0aa, { transparent: true, opacity: 0.8 }));
    d.scale.set(1, 0.45, 0.8); d.position.set(x, 0.02, z); rubber.add(d); domes[KEYS[r][c]] = d;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20), M.matte(0x111111)); p.position.set(x, 0.0, z); rubber.add(p); pills[KEYS[r][c]] = p;
  }));
  // Top shell (with holes for keys, display and solar cell).
  const holes = [[1.4, -5.55, 3.7, 1.1], [0, -4.35, 6.0, 1.9]];
  KZ.forEach((z) => KX.forEach((x) => holes.push([x, z, 1.32, 1.08])));
  const top = new THREE.Group(); top.position.y = 0.92; group.add(top);
  const topMat = M.plastic(face, { roughness: 0.45, transparent: true, opacity: 1 });
  top.add(holedPlate(7.4, 12.4, 0.16, holes, topMat));
  // Keys.
  const keys = new THREE.Group(); keys.position.y = 1.02; group.add(keys);
  const keyMeshes = {};
  KZ.forEach((z, r) => KX.forEach((x, c) => {
    const k = KEYS[r][c], col = k === 'C' ? '#c0443a' : k === '=' ? '#d98a2b' : '+−×÷%√±'.includes(k) ? '#4a5263' : '#5d6472';
    const kg = new THREE.Group(); kg.position.set(x, 0, z); keys.add(kg);
    const cap = box(1.2, 0.4, 0.96, M.plastic(new THREE.Color(col), { roughness: 0.4 })); cap.position.y = 0.2; kg.add(cap);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.9), new THREE.MeshStandardMaterial({ map: keyLabel(k, col), roughness: 0.4 }));
    lab.rotation.x = -Math.PI / 2; lab.position.y = 0.405; kg.add(lab);
    cap.userData.key = k; lab.userData.key = k;
    keyMeshes[k] = { g: kg, cap, lab };
  }));
  return { group, bottom, cell, pcb, blob, lcd, screen, glass, solar, rubber, domes, pills, top, topMat, shellMat, keys, keyMeshes, pcbTex };
}

export { clamp, beam, box, rod, sphere, tube };
