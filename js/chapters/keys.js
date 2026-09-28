// Chapter 2: from a key press to a number. The chip drives one row of the key matrix at a time and
// listens on the columns; a pressed key joins its row to its column. The raw contact bounces for a few
// milliseconds (Ganssle, "A Guide to Debouncing": about 1.6 ms on average, a few switches up to 6 ms),
// so the chip waits until the signal has been steady before it believes it. The digit then becomes
// binary-coded decimal (BCD): 4 bits per decimal digit, which is how calculator chips store numbers
// (the Intel 4004 and the TI TMS0100 family both worked on 4-bit BCD digits).
import { THREE, M, box, canvasTexture } from '../kit.js';
import { KEYS, bin, bcd, board, panelBg, title, text, mono, bitBoxes, COL, HEX, wire, makeLamp, fitNarrow, BOUNCE_MS } from '../calc.js';

const COLX = [3.0, 4.2, 5.4, 6.6], ROWY = [10.8, 9.7, 8.6, 7.5, 6.4], CHIPX = 0.6;
// Real scanning is fast: a scan of all rows takes a few milliseconds. We show it slowed down.
const ROW_MS = 1;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// A bouncy contact: press at tp, release at tr (ms). During bounce the contact flickers, with gaps that grow.
function makeBounce(seed, tp = 5, tr = 29) {
  const r = rng(seed), edges = [];
  const burst = (t0, to) => { let t = t0, v = to, k = 0; const end = t0 + BOUNCE_MS * (0.7 + 0.6 * r()); while (t < end) { edges.push([t, v]); t += 0.12 + r() * 0.35 * (1 + k * 0.5); v = 1 - v; k++; } edges.push([t, to]); };
  burst(tp, 1); burst(tr, 0);
  return (t) => { let v = 0; for (const [a, b] of edges) if (a <= t) v = b; return v; };
}

export default {
  id: 'keys',
  short: 'Keys to numbers',
  title: 'From a key press to binary',
  subtitle: 'The chip scans a grid of wires to find your key, waits out the bounce, and stores the digit as 4 bits.',
  view: { pos: [1.2, 7.0, 16.4], target: [1.2, 6.2, 0] },
  learn: `<p>Your calculator has 20 keys but the chip doesn't have 20 wires for them. The keys sit where 5 <b>row</b> wires cross 4 <b>column</b> wires: the <b>key matrix</b>.</p>
    <p>The chip <b>scans</b> it. It puts a voltage on row 1 and listens on every column. Nothing? It moves on to row 2, then row 3, and so on, round and round, hundreds of times a second. When a pressed key joins row 3 to column 2, the chip hears the column go high while row 3 is on, and it knows exactly which key it is.</p>
    <p>There's a snag. Metal contacts <b>bounce</b>: for a few thousandths of a second they touch, spring apart and touch again. Read too eagerly and one press looks like five. So the chip <b>debounces</b>: it waits until the signal has stayed steady for about 10 to 20 milliseconds.</p>
    <p>Then the digit becomes <b>binary</b>. Calculators usually keep each decimal digit in its own 4 bits, called <b>BCD</b> (binary-coded decimal): 7 is 0111, so 47 is 0100 0111. Pure binary would be 101111. BCD wastes a few bit patterns but makes showing digits easy.</p>
    <p class="tip"><b>Try it:</b> click a key on the grid and watch the scan find it. Then set debounce to 0 ms and count the fake presses.</p>`,
  terms: [
    { t: 'Scanning', d: 'Switching on one row at a time and checking the columns to find a pressed key.' },
    { t: 'Contact bounce', d: 'The quick flicker of a switch as its contacts touch and spring apart before settling.' },
    { t: 'Debouncing', d: 'Ignoring a switch until its signal has been steady for a set time.' },
    { t: 'Bit', d: 'A binary digit: 0 or 1, off or on.' },
    { t: 'Binary', d: 'Counting with only 0 and 1. Each place is worth twice the one to its right: 8, 4, 2, 1.' },
    { t: 'BCD', d: 'Binary-coded decimal: each decimal digit stored in its own group of 4 bits.' },
  ],
  defaults: { slow: 300, deb: 12, n: 47 },
  controls: [
    { key: 'slow', type: 'log', label: 'Slow motion', min: 1, max: 1000, ends: ['real speed', '1,000× slower'], fmt: (v) => `${Math.round(v)}× slower` },
    { key: 'deb', type: 'range', label: 'Debounce wait', min: 0, max: 20, step: 1, ends: ['0 ms', '20 ms'], fmt: (v) => `${v} ms` },
    { key: 'n', type: 'range', label: 'Number to convert', min: 0, max: 9999, step: 1, fmt: (v) => String(v) },
    { key: 'press', type: 'buttons', label: 'Press a key for me', items: [
      { label: '7', act: (s, inst) => inst.press('7') }, { label: '4', act: (s, inst) => inst.press('4') }, { label: '=', act: (s, inst) => inst.press('=') }, { label: 'C', act: (s, inst) => inst.press('C') },
    ] },
  ],
  quiz: [
    { q: 'How does the chip know which key in the grid is pressed?', options: ['Each key has its own wire', 'It turns on one row at a time and sees which column answers', 'It measures how hard you press', 'It listens for the click'], answer: 1, why: 'Only the pressed key joins its row to its column, so the column goes high exactly when that row is on.' },
    { q: 'Why does a calculator debounce its keys?', options: ['To save power', 'Contacts bounce, so one press could count as several', 'To make keys quieter', 'To slow you down'], answer: 1, why: 'For a few milliseconds the contact flickers on and off. Waiting until it is steady turns that into one clean press.' },
    { q: 'What is 9 in BCD?', options: ['1001', '0110', '1111', '0011'], answer: 0, why: '9 = 8 + 1, so the 8 and 1 bits are on: 1001.' },
  ],
  reel: [
    { ms: 5600, caption: 'The chip lights one row at a time; a pressed key joins its row to a column.', set: { slow: 500, deb: 12, n: 47 }, act: (s, inst) => inst.press('7', true), view: { pos: [3.8, 8.8, 9.6], target: [3.8, 8.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------------------------------------------------------- the matrix
    const chip = box(1.5, 6.4, 0.4, M.plastic(0x15171c, { roughness: 0.3 })); chip.position.set(CHIPX, 8.2, 0); root.add(chip);
    const chipTex = canvasTexture(128, 480, (g, W, H) => { g.fillStyle = '#15171c'; g.fillRect(0, 0, W, H); text(g, 'CHIP', W / 2, 40, { font: 'bold 26px sans-serif', col: '#9aa3b2', align: 'center' }); });
    const chipFace = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 6.2), new THREE.MeshBasicMaterial({ map: chipTex.tex })); chipFace.position.set(CHIPX, 8.2, 0.21); root.add(chipFace);
    const rows = ROWY.map((y) => wire(root, [[CHIPX + 0.75, y, 0], [7.4, y, 0]], 0.06));
    const cols = COLX.map((x, c) => { const yb = 5.7 - c * 0.2; return wire(root, [[x, 11.4, -0.12], [x, yb, -0.12], [CHIPX + 0.75, yb, -0.12]], 0.05); });
    const keys = {}, bridges = {}, bOff = M.plastic(0x2a2f3b), bDown = M.plastic(0x9aa3b2), bOn = M.glow(HEX.one);
    ROWY.forEach((y, r) => COLX.forEach((x, c) => {
      const k = KEYS[r][c];
      const t = canvasTexture(96, 80, (g, W, H) => { g.fillStyle = '#5d6472'; g.fillRect(0, 0, W, H); text(g, k, W / 2, H * 0.72, { font: 'bold 52px sans-serif', col: '#fff', align: 'center' }); });
      const kg = new THREE.Group(); kg.position.set(x + 0.3, y + 0.3, 0.45); root.add(kg);
      const cap = box(0.62, 0.52, 0.3, M.plastic(0x5d6472)); kg.add(cap);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), new THREE.MeshBasicMaterial({ map: t.tex })); face.position.z = 0.16; kg.add(face);
      cap.userData.key = face.userData.key = k; stage.pickables.push(cap, face);
      keys[k] = kg;
      const br = box(0.14, 0.14, 0.3, bOff); br.position.set(x, y, -0.06); root.add(br); bridges[k] = br;   // the contact at the crossing
    }));
    const sense = COLX.map((x, c) => makeLamp(root, [CHIPX + 0.95, 5.7 - c * 0.2, 0.25], 0.09));
    // Live binary: the last digit found, as BCD lamps 8 4 2 1 above the chip.
    const bits = [0, 1, 2, 3].map((i) => makeLamp(root, [8.4, 10.6 - i * 0.8, 0], 0.26));
    // ---------------------------------------------------------------- boards
    const st = { raw: () => 0, seed: 1, deb: 12, n: 47, fake: 0 };
    const bounce = board(root, 7.6, 3.4, 1110, 497, (g, W, H) => {
      panelBg(g, W, H);
      text(g, 'One key press, zoomed in', 26, 50, { font: 'bold 40px sans-serif', col: '#e8eef8' });
      const x0 = 190, pw = W - 220, span = 40, X = (ms) => x0 + (ms / span) * pw;
      const lane = (y, lab, f, col) => {
        text(g, lab, 26, y - 20, { font: '28px sans-serif', col });
        g.strokeStyle = col; g.lineWidth = 6; g.beginPath();
        let prev = f(0); g.moveTo(X(0), y - prev * 70);
        for (let ms = 0.05; ms <= span; ms += 0.05) { const v = f(ms); if (v !== prev) { g.lineTo(X(ms), y - prev * 70); g.lineTo(X(ms), y - v * 70); prev = v; } }
        g.lineTo(X(span), y - prev * 70); g.stroke();
      };
      lane(190, 'Raw', st.raw, COL.carry);
      // Debounced: change only after the raw signal has held its new value for deb ms.
      let out = 0, since = 0, last = 0, presses = 0, rawRises = 0, pr = 0; const trace = [];
      for (let ms = 0; ms <= span; ms += 0.05) {
        const v = st.raw(ms); if (v !== last) { since = ms; last = v; if (v && !pr) rawRises++; pr = v; }
        if (v !== out && ms - since >= st.deb) { out = v; if (v) presses++; }
        trace.push(out);
      }
      lane(330, 'Chip', (ms) => trace[Math.min(trace.length - 1, Math.round(ms / 0.05))], COL.good);
      st.fake = rawRises; st.presses = presses;
      for (let ms = 0; ms <= span; ms += 10) text(g, ms + ' ms', X(ms), 380, { font: '24px sans-serif', col: 'rgba(255,255,255,.5)', align: 'center' });
      text(g, `Wait ${st.deb} ms: ${rawRises} flickers counted as ${presses} press${presses === 1 ? '' : 'es'}`, 26, 460, { font: 'bold 32px sans-serif', col: presses !== 1 ? COL.bad : '#e8eef8' });
    }, [-3.9, 2.0, -0.3]);
    const conv = board(root, 7.6, 3.4, 1110, 497, (g, W, H) => {
      panelBg(g, W, H);
      const n = st.n;
      text(g, String(n), 26, 70, { font: mono(60, true), col: '#e8eef8' });
      text(g, 'in decimal', 26 + String(n).length * 38 + 20, 66, { font: '28px sans-serif', col: 'rgba(255,255,255,.55)' });
      const b = bin(n, 14);
      text(g, 'Binary', 26, 140, { font: '28px sans-serif', col: 'rgba(255,255,255,.7)' });
      bitBoxes(g, b, 150, 104, 58, { gap: 6 });
      text(g, 'BCD', 26, 262, { font: '28px sans-serif', col: 'rgba(255,255,255,.7)' });
      const digs = String(n).padStart(4, '0');
      bcd(n, 4).forEach((nib, i) => {
        const x = 150 + i * 235;
        bitBoxes(g, nib, x, 224, 50, { on: COL.sum, gap: 5 });
        text(g, digs[i], x + 108, 330, { font: mono(46, true), col: '#e8eef8', align: 'center' });
      });
      text(g, '8 4 2 1 in each group of 4', 150, 380, { font: '24px sans-serif', col: 'rgba(255,255,255,.5)' });
      text(g, `Binary: ${Math.max(1, b.replace(/^0+/, '').length)} bits.  BCD: ${4 * Math.max(1, String(n).length)} bits, but each digit is ready to show.`, 26, 460, { font: '28px sans-serif', col: 'rgba(255,255,255,.8)' });
    }, [3.9, 2.0, -0.3]);
    const Ls = {
      rows: stage.label('5 rows, driven', [4.8, 11.9, 0], root),
      cols: stage.label('4 columns, sensed', [4.8, 4.75, 0], root),
      chip: stage.label('Chip scans', [CHIPX, 11.9, 0.3], root, 'hot'),
      bits: stage.label('Digit in BCD', [8.4, 11.35, 0], root),
    };
    // ---------------------------------------------------------------- scan state
    let t = 0, scanRow = 0, rowT = 0, held = null, heldFor = 0, found = '', number = '', lastDigit = null, seed = 3, dirtyB = true;
    const inst = {
      press(k, hold = false) {
        held = k; heldFor = hold ? 99 : Math.max(2.4, (5 * ROW_MS * (inst.s?.slow || 300)) / 1000 * 1.4);
        seed++; st.seed = seed; st.raw = makeBounce(seed); dirtyB = true;
      },
      pick(o) { if (o.userData.key) inst.press(o.userData.key); },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt; inst.s = s;
        fitNarrow(stage, [Ls.rows, Ls.cols, Ls.bits], -0.1);
        // Scan: each row is driven for ROW_MS, slowed by `slow`.
        const dwell = (ROW_MS * s.slow) / 1000;
        rowT += dt;
        while (rowT >= dwell) { rowT -= dwell; scanRow = (scanRow + 1) % 5; if (dwell > 0.02) break; }
        if (held) { heldFor -= dt; if (heldFor <= 0) held = null; }
        rows.forEach((w, r) => w.set(r === scanRow, '#ffd166'));
        let hitC = -1;
        ROWY.forEach((y, r) => COLX.forEach((x, c) => {
          const k = KEYS[r][c], down = held === k;
          keys[k].position.z = down ? 0.22 : 0.45;
          bridges[k].material = down ? (r === scanRow ? bOn : bDown) : bOff;
          if (down && r === scanRow) hitC = c;
        }));
        cols.forEach((w, c) => w.set(c === hitC, '#ff7a59'));
        sense.forEach((l, c) => l.set(c === hitC, '#ff7a59'));
        if (hitC >= 0) {
          const k = KEYS[scanRow][hitC];
          if (found !== k) {
            found = k;
            if (/\d/.test(k)) { number = (number + k).slice(-4); lastDigit = +k; s.n = +number; }
            else if (k === 'C') { number = ''; lastDigit = null; s.n = 0; }
          }
        } else if (!held) found = '';
        const nib = lastDigit === null ? '0000' : bin(lastDigit, 4);
        bits.forEach((l, i) => l.set(nib[i] === '1', '#8ef0ff'));
        if (st.deb !== s.deb) { st.deb = s.deb; dirtyB = true; }
        if (dirtyB) { bounce.redraw(); dirtyB = false; }
        const n = Math.round(s.n); if (n !== st.n) { st.n = n; conv.redraw(); }
      },
      readout(s) {
        const n = Math.round(s.n);
        return `<div class="big">Scanning row ${scanRow + 1} of 5</div>
          <div class="row"><span>Key found</span><b>${found || (held ? 'waiting for its row…' : 'none')}</b></div>
          <div class="row"><span>Last digit in BCD</span><b>${lastDigit === null ? '–' : `${lastDigit} = ${bin(lastDigit, 4)}`}</b></div>
          <div class="row"><span>${n} in BCD</span><b>${bcd(n, String(n).length).join(' ')}</b></div>
          <div class="row"><span>Last press was counted as</span><b class="${st.presses === 1 ? 'ok' : 'no'}">${st.presses} press${st.presses === 1 ? '' : 'es'}</b></div>`;
      },
    };
    st.raw = makeBounce(seed);
    return inst;
  },
};
