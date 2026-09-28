// Chapter 4: adding with gates. A real 4-bit ripple-carry adder-subtractor, simulated gate by gate with
// one gate delay each, so you can watch the carry ripple. Each bit is a full adder (2 XOR, 2 AND, 1 OR);
// a fifth XOR per bit flips B for subtraction, and the first carry-in adds the 1 of two's complement.
// The carry passes through an AND and an OR in each bit, so it costs 2 gate delays per bit
// (Wikipedia, "Adder (electronics)": ripple-carry delay; Patterson & Hennessy, Computer Organization, App. B).
import { THREE, M } from '../kit.js';
import { makeGate, makeSim, wire, makeLamp, board, panelBg, title, text, mono, bitBoxes, bin, COL, fitNarrow } from '../calc.js';

const SC = 0.62, Y0 = 2.2;
const BX = (i) => 6.3 - i * 4.2;
const b = (x) => (x ? 1 : 0);

export default {
  id: 'adder',
  short: 'Adding',
  title: 'Adding with logic gates',
  subtitle: 'Two gates add two bits. Five add three. Chain four and the carry ripples from bit to bit.',
  view: { pos: [0.4, 7.2, 19.2], target: [0.4, 6.5, 0] },
  learn: `<p>Add two bits and there are only four cases: 0+0 = 0, 0+1 = 1, 1+0 = 1 and 1+1 = <b>10</b> (that's 2 in binary: write 0, carry 1). Look closely: the written digit is just <b>XOR</b> and the carry is just <b>AND</b>. Two gates make a <b>half adder</b>.</p>
    <p>For longer numbers each column must also add the carry coming in from the right. That's a <b>full adder</b>: two XORs, two ANDs and an OR, 5 gates.</p>
    <p>Line up four full adders and you can add two 4-bit numbers (0 to 15). The carry out of each bit feeds the next: a <b>ripple-carry adder</b>. It is slow in one way: the top bit can't be sure of its answer until the carry has <b>rippled</b> through every bit, 2 <b>gate delays</b> per bit.</p>
    <p><b>Subtracting</b> uses the same adder. To do A − B, flip every bit of B (an XOR per bit does it) and add 1 through the first carry. This trick is called <b>two's complement</b>. <b>Multiplying</b> is shift and add: for each 1 in B, add a copy of A shifted left. Your calculator does exactly this, one decimal digit at a time.</p>
    <p class="tip"><b>Try it:</b> set A = 15 and B = 1, then watch the carry ripple across all four bits. Slow the gates down to see it better.</p>`,
  terms: [
    { t: 'Half adder', d: 'An XOR and an AND that add two bits, giving a sum bit and a carry.' },
    { t: 'Full adder', d: 'Five gates that add two bits plus a carry coming in.' },
    { t: 'Ripple carry', d: 'Carries passing from each bit to the next, one after another.' },
    { t: 'Gate delay', d: 'The short time a gate takes to change its output after its inputs change.' },
    { t: 'Two\'s complement', d: 'A way to subtract by adding: flip all the bits of B and add 1.' },
    { t: 'Shift and add', d: 'Multiplying by adding shifted copies of a number, one for each 1 bit.' },
  ],
  defaults: { mode: 'ripple', op: 'add', A: 11, B: 6, cin: false, tau: 0.35 },
  controls: [
    { key: 'mode', type: 'seg', label: 'Build', options: [{ v: 'half', label: 'Half adder' }, { v: 'full', label: 'Full adder' }, { v: 'ripple', label: '4-bit adder' }] },
    { key: 'op', type: 'seg', label: 'Do', options: [{ v: 'add', label: 'A + B' }, { v: 'sub', label: 'A − B' }, { v: 'mul', label: 'A × B' }], fmt: (v, s) => (s.mode === 'ripple' ? '' : 'needs the 4-bit adder') },
    { key: 'A', type: 'range', label: 'A', min: 0, max: 15, step: 1, fmt: (v) => `${v} = ${bin(v, 4)}` },
    { key: 'B', type: 'range', label: 'B', min: 0, max: 15, step: 1, fmt: (v) => `${v} = ${bin(v, 4)}` },
    { key: 'cin', type: 'toggle', label: 'Carry in (full adder)' },
    { key: 'tau', type: 'log', label: 'Gate delay (slowed down)', min: 0.03, max: 1, ends: ['fast', 'slow'], fmt: (v) => `${v.toFixed(2)} s per gate` },
  ],
  onChange(s) { s.A = Math.round(s.A); s.B = Math.round(s.B); if (s.mode !== 'ripple' && s.op !== 'add') s.op = 'add'; },
  quiz: [
    { q: 'In binary, what is 1 + 1?', options: ['2', '10 (write 0, carry 1)', '11', '0 with no carry'], answer: 1, why: 'Binary has only 0 and 1, so 1 + 1 = 10: a 0 in this column and a carry of 1.' },
    { q: 'Which two gates make a half adder?', options: ['AND and OR', 'XOR for the sum, AND for the carry', 'NOT and NOT', 'OR and XOR'], answer: 1, why: 'The sum bit is 1 when exactly one input is 1 (XOR). The carry is 1 only when both are (AND).' },
    { q: 'How does the adder subtract A − B?', options: ['It has a separate subtractor', 'It flips B\'s bits and adds 1 (two\'s complement)', 'It counts backwards', 'It cannot subtract'], answer: 1, why: 'Adding the flipped B plus 1 is the same as subtracting B, so one adder does both.' },
  ],
  reel: [
    { ms: 5000, caption: 'Adding two bits: XOR gives the digit, AND gives the carry. 1 + 1 = 10 in binary.', set: { mode: 'half', op: 'add', A: 1, B: 1, tau: 0.3 }, view: { pos: [5.9, 5.9, 6.6], target: [5.9, 5.5, 0] }, spin: 0 },
    { ms: 6000, caption: '15 + 1: the carry ripples through four full adders, two gate delays per bit.', set: { mode: 'ripple', op: 'add', A: 15, B: 0, tau: 0.22 }, act: (s, inst) => { inst.prime(15, 0); s.B = 1; }, view: { pos: [0.3, 6.6, 16.8], target: [0.3, 6.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const gates = [], wires = [], lamps = [];
    const groups = { half: new THREE.Group(), full: new THREE.Group(), sub: new THREE.Group(), bypass: new THREE.Group(), core: new THREE.Group() };
    const bits = [0, 1, 2, 3].map(() => ({ ...Object.fromEntries(Object.keys(groups).map((k) => [k, new THREE.Group()])) }));
    bits.forEach((bt) => Object.keys(groups).forEach((k) => root.add(bt[k])));
    const G = (parent, type, x, y, ins, out) => { const g = makeGate(type, { scale: SC }); g.rotation.z = -Math.PI / 2; g.position.set(x, y + Y0, 0); parent.add(g); gates.push({ type, ins, out, mesh: g }); return g; };
    const W = (parent, node, pts, r = 0.045) => { const w = wire(parent, pts.map(([x, y, z = 0]) => [x, y + Y0, z]), r); wires.push({ w, node }); return w; };
    const Lp = (parent, node, x, y, r = 0.2, toggle = null, col) => { const l = makeLamp(parent, [x, y + Y0, 0], r); lamps.push({ l, node, col }); if (toggle) { l.bulb.userData.toggle = toggle; stage.pickables.push(l.bulb); } return l; };
    const Z = 0.22;
    for (let i = 0; i < 4; i++) {
      const d = BX(i), bt = bits[i];
      // inputs
      Lp(bt.core, `A${i}`, d - 0.9, 5.6, 0.22, ['A', i]); Lp(bt.core, `B${i}`, d + 0.083, 5.6, 0.22, ['B', i]);
      W(bt.core, `A${i}`, [[d - 0.9, 5.4], [d - 0.9, 3.6], [d - 1.283, 3.6], [d - 1.283, 3.1]]);
      W(bt.core, `A${i}`, [[d - 0.9, 3.6], [d - 0.517, 3.6], [d - 0.517, 3.22]]);
      // B through the subtract XOR (or straight past it)
      const sx = G(bt.sub, 'XOR', d + 0.3, 4.0, [`B${i}`, 'SUB'], `Bp${i}`);
      W(bt.sub, `B${i}`, [[d + 0.083, 5.4], [d + 0.083, 4.62]]);
      W(bt.sub, 'SUB', [[d + 0.517, 4.85, -Z], [d + 0.517, 4.62, -Z], [d + 0.517, 4.62]]);
      W(bt.bypass, `B${i}`, [[d + 0.083, 5.4], [d + 0.083, 3.85], [d + 0.3, 3.85], [d + 0.3, 3.44]]);
      void sx;
      W(bt.core, `Bp${i}`, [[d + 0.3, 3.44], [d + 0.3, 3.3, Z], [d - 1.717, 3.3, Z], [d - 1.717, 3.11, Z], [d - 1.717, 3.1]]);
      W(bt.core, `Bp${i}`, [[d - 0.083, 3.3, Z], [d - 0.083, 3.22]]);
      // half adder
      G(bt.core, 'XOR', d - 0.3, 2.6, [`A${i}`, `Bp${i}`], `X${i}`);
      G(bt.core, 'AND', d - 1.5, 2.6, [`A${i}`, `Bp${i}`], `P${i}`);
      // half-adder-only outputs
      W(bt.half, `X${i}`, [[d - 0.3, 2.04], [d - 0.3, 1.2]]); Lp(bt.half, `X${i}`, d - 0.3, 0.95, 0.26, null, '#8ef0ff');
      W(bt.half, `P${i}`, [[d - 1.5, 2.04], [d - 1.5, 1.2]]); Lp(bt.half, `P${i}`, d - 1.5, 0.95, 0.26, null, '#ff7a59');
      // full adder
      W(bt.full, `X${i}`, [[d - 0.3, 2.04], [d - 0.3, 1.6], [d + 0.283, 1.6], [d + 0.283, 1.22]]);
      W(bt.full, `X${i}`, [[d - 0.3, 1.6], [d - 0.483, 1.6], [d - 0.483, 1.1]]);
      W(bt.full, `C${i}`, [[d + 2.1, 1.45, Z], [d - 0.917, 1.45, Z], [d - 0.917, 1.1]]);
      W(bt.full, `C${i}`, [[d + 0.717, 1.45, Z], [d + 0.717, 1.22]]);
      G(bt.full, 'XOR', d + 0.5, 0.6, [`X${i}`, `C${i}`], `S${i}`);
      G(bt.full, 'AND', d - 0.7, 0.6, [`X${i}`, `C${i}`], `Q${i}`);
      W(bt.full, `P${i}`, [[d - 1.5, 2.04], [d - 1.5, -0.25], [d - 1.417, -0.25], [d - 1.417, -0.69]]);
      W(bt.full, `Q${i}`, [[d - 0.7, 0.04], [d - 0.7, -0.35], [d - 0.983, -0.35], [d - 0.983, -0.69]]);
      G(bt.full, 'OR', d - 1.2, -1.1, [`P${i}`, `Q${i}`], `C${i + 1}`);
      W(bt.full, `C${i + 1}`, i < 3 ? [[d - 1.2, -1.66], [d - 1.2, -2.0], [d - 2.1, -2.0], [d - 2.1, 1.45, Z]] : [[d - 1.2, -1.66], [d - 1.2, -2.0], [d - 2.05, -2.0]]);
      W(bt.full, `S${i}`, [[d + 0.5, 0.04], [d + 0.5, -1.7]]); Lp(bt.full, `S${i}`, d + 0.5, -1.95, 0.26, null, '#8ef0ff');
    }
    // SUB control line, carry-in and carry-out lamps.
    const sx0 = BX(0) + 1.9, subBus = W(bits[0].sub, 'SUB', [[sx0, 4.85, -Z], [BX(3) + 0.517, 4.85, -Z]]);
    void subBus;
    const subLamp = Lp(bits[0].sub, 'SUB', sx0 + 0.25, 4.85, 0.22, null, '#c49bff');
    const c0Lamp = Lp(bits[0].full, 'C0', BX(0) + 2.35, 1.45, 0.22, ['cin'], '#ff7a59');
    const c4Lamp = Lp(bits[3].full, 'C4', BX(3) - 2.3, -2.0, 0.26, null, '#ff7a59');
    void subLamp; void c0Lamp; void c4Lamp;
    // Build the simulator now that every gate is known.
    const S2 = makeSim(gates, { SUB: 0, C0: 0, ...Object.fromEntries([0, 1, 2, 3].flatMap((i) => [[`A${i}`, 0], [`B${i}`, 0]])) });
    const Ls = {
      a: stage.label('A', [BX(0) - 0.9, 5.6 + Y0 + 0.5, 0], root), b: stage.label('B', [BX(0) + 0.083, 5.6 + Y0 + 0.5, 0], root),
      sub: stage.label('Flip B to subtract', [BX(0) + 2.2, 4.85 + Y0 + 0.5, 0], bits[0].sub),
      hs: stage.label('Sum (XOR)', [BX(0) - 0.3 + 0.55, 0.95 + Y0 - 0.55, 0], bits[0].half, 'hot'),
      hc: stage.label('Carry (AND)', [BX(0) - 1.5 - 0.3, 0.95 + Y0 - 0.55, 0], bits[0].half, 'hot'),
      cin: stage.label('Carry in', [BX(0) + 2.35, 1.45 + Y0 + 0.45, 0], bits[0].full),
      cout: stage.label('Carry out', [BX(3) - 2.3, -2.0 + Y0 - 0.5, 0], bits[3].full, 'hot'),
      bit: [0, 1, 2, 3].map((i) => stage.label(`${1 << i}s`, [BX(i) + 1.25, -1.95 + Y0, 0], bits[i].full)),
    };
    // ---------------------------------------------------------------- the board
    const st = { A: 0, B: 0, op: 'add', mode: 'ripple', sum: 0, c: [0, 0, 0, 0, 0], t: 0, settle: 0 };
    const brd = board(root, 9.6, 3.1, 1300, 420, (g, Wd, H) => {
      panelBg(g, Wd, H);
      const { A, B, op } = st;
      if (op === 'mul') {
        text(g, `${A} × ${B}: shift and add`, 26, 50, { font: 'bold 38px sans-serif', col: '#e8eef8' });
        let acc = 0; const step = Math.floor(st.t / 1.2) % 5;
        for (let i = 0; i < 4; i++) {
          const on = (B >> i) & 1, part = on ? A << i : 0, y = 84 + i * 72;
          if (i < step) acc += part;
          g.globalAlpha = i < step ? 1 : 0.3;
          text(g, `B${i}=${on}`, 26, y + 44, { font: mono(30, true), col: on ? COL.one : 'rgba(255,255,255,.6)' });
          bitBoxes(g, bin(part, 8), 170, y, 56, { on: COL.sum, gap: 5 });
          text(g, on ? `+${part}` : '+0', 680, y + 44, { font: mono(32, true) });
          g.globalAlpha = 1;
        }
        text(g, 'total', 850, 120, { font: '30px sans-serif', col: 'rgba(255,255,255,.6)' });
        text(g, String(acc), 850, 210, { font: mono(90, true), col: step >= 4 ? COL.good : '#e8eef8' });
        text(g, 'Each + is one trip through the adder', 850, 290, { font: '26px sans-serif', col: 'rgba(255,255,255,.65)' });
        return;
      }
      const Bx = op === 'sub' ? (~B & 15) : B, c = st.c;
      text(g, op === 'sub' ? `${A} − ${B} = ${A} + flipped ${B} + 1` : `${A} + ${B}, column by column`, 26, 50, { font: 'bold 38px sans-serif', col: '#e8eef8' });
      const X = (k) => 330 + (3 - k) * 76;
      const bitsOf = (n) => [0, 1, 2, 3].map((k) => (n >> k) & 1);
      const row = (lab, arr, y, col) => { text(g, lab, 26, y + 44, { font: '30px sans-serif', col: 'rgba(255,255,255,.75)' }); arr.forEach((v, k) => { g.fillStyle = v ? col : '#262c38'; g.fillRect(X(k), y, 64, 60); text(g, String(v), X(k) + 32, y + 44, { font: mono(36, true), col: v ? '#10131c' : 'rgba(255,255,255,.55)', align: 'center' }); }); };
      text(g, 'carry', 26, 112, { font: '26px sans-serif', col: 'rgba(255,255,255,.55)' });
      [1, 2, 3, 4].forEach((k) => text(g, String(c[k]), X(k) + 32, 112, { font: mono(30, true), col: c[k] ? COL.carry : 'rgba(255,255,255,.3)', align: 'center' }));
      text(g, String(c[0]), X(0) + 96, 112, { font: mono(30, true), col: c[0] ? COL.carry : 'rgba(255,255,255,.3)', align: 'center' });
      row('A', bitsOf(A), 128, COL.one);
      row(op === 'sub' ? 'flip B' : 'B', bitsOf(Bx), 198, COL.one);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(X(4), 266, 5 * 76, 4);
      const s4 = st.sum;
      row('Sum', bitsOf(s4), 280, COL.sum);
      g.fillStyle = c[4] ? COL.carry : '#262c38'; g.fillRect(X(4), 280, 64, 60); text(g, String(c[4]), X(4) + 32, 324, { font: mono(36, true), col: c[4] ? '#10131c' : 'rgba(255,255,255,.55)', align: 'center' });
      const res = op === 'sub' ? (c[4] ? `= ${s4}` : `= −${16 - s4}`) : `= ${s4 + 16 * c[4]}`;
      text(g, res, X(0) + 96, 324, { font: mono(46, true), col: '#e8eef8' });
      text(g, op === 'sub' && !c[4] ? `(${bin(s4, 4)} is −${16 - s4} in two's complement)` : c[4] && op === 'add' ? '(the carry out is the 16s bit)' : ' ', 26, 400, { font: '26px sans-serif', col: 'rgba(255,255,255,.6)' });
      text(g, '5 gates per bit', 900, 150, { font: '28px sans-serif' });
      text(g, 'carry: 2 delays/bit', 900, 196, { font: '28px sans-serif' });
      text(g, st.busy ? 'rippling…' : `settled: ${st.settle} delays`, 900, 262, { font: 'bold 32px sans-serif', col: st.busy ? COL.carry : COL.good });
    }, [4.3, 10.3, -0.4]);
    // ---------------------------------------------------------------- run
    let t = 0, t0 = 0, busyWas = false, lastKey = '', bkey = '';
    const inst = {
      prime(A, B) { for (let i = 0; i < 4; i++) { S2.set(`A${i}`, (A >> i) & 1); S2.set(`B${i}`, (B >> i) & 1); } S2.set('SUB', 0); S2.set('C0', 0); S2.settle(); },
      pick(o) {
        const tg = o.userData.toggle; if (!tg || !inst.s) return;
        const s = inst.s;
        if (tg[0] === 'cin') s.cin = !s.cin; else s[tg[0]] = s[tg[0]] ^ (1 << tg[1]);
      },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt; inst.s = s;
        const narrow = fitNarrow(stage, [Ls.sub, ...Ls.bit], -0.06);
        void narrow;
        const ripple = s.mode === 'ripple', half = s.mode === 'half';
        bits.forEach((bt, i) => {
          const vis = ripple || i === 0;
          bt.core.visible = vis; bt.half.visible = vis && half; bt.full.visible = vis && !half;
          bt.sub.visible = vis && ripple; bt.bypass.visible = vis && !ripple;
        });
        Ls.cin.visible = !ripple || s.op === 'sub';
        // Inputs.
        const A = ripple ? s.A : s.A & 1, B = ripple ? s.B : s.B & 1, sub = ripple && s.op === 'sub' ? 1 : 0;
        const c0 = ripple ? sub : s.mode === 'full' ? b(s.cin) : 0;
        const key = `${A}|${B}|${sub}|${c0}|${s.mode}`;
        if (key !== lastKey) { lastKey = key; t0 = t; }
        for (let i = 0; i < 4; i++) { S2.set(`A${i}`, (A >> i) & 1); S2.set(`B${i}`, (B >> i) & 1); }
        S2.set('SUB', sub); S2.set('C0', c0);
        S2.step(dt, s.tau);
        const busy = S2.busy();
        if (busyWas && !busy) st.settle = Math.round((t - t0) / s.tau);
        if (!busyWas && !busy && t - t0 < s.tau * 0.5) st.settle = 0;
        busyWas = busy;
        const v = S2.v;
        wires.forEach(({ w, node }) => w.set(v[node], node.startsWith('C') ? '#ff7a59' : node.startsWith('S') || node.startsWith('X') ? '#8ef0ff' : '#ffd166'));
        gates.forEach((g) => g.mesh.setOut(v[g.out]));
        lamps.forEach(({ l, node, col }) => l.set(v[node], col));
        // Board.
        const sum = [0, 1, 2, 3].reduce((a, i) => a + (v[`S${i}`] << i), 0);
        Object.assign(st, { A: s.A, B: s.B, op: ripple ? s.op : 'add', mode: s.mode, sum, c: [0, 1, 2, 3, 4].map((k) => v[`C${k}`]), busy, t });
        const bk = JSON.stringify([st.A, st.B, st.op, st.sum, st.c, st.busy, st.settle, st.op === 'mul' ? Math.floor(t / 1.2) % 5 : 0]);
        brd.mesh.visible = ripple;
        if (bk !== bkey && ripple) { bkey = bk; brd.redraw(); }
      },
      readout(s) {
        const v = S2.v;
        if (s.mode === 'half') {
          const A = s.A & 1, B = s.B & 1;
          return `<div class="big">Half adder: ${A} + ${B} = ${v.P0}${v.X0}</div>
            <div class="row"><span>Sum = A XOR B</span><b>${v.X0}</b></div><div class="row"><span>Carry = A AND B</span><b>${v.P0}</b></div>
            <div class="row"><span>Gates</span><b>2</b></div>`;
        }
        if (s.mode === 'full') {
          const A = s.A & 1, B = s.B & 1, C = b(s.cin);
          return `<div class="big">Full adder: ${A} + ${B} + ${C} = ${v.C1}${v.S0}</div>
            <div class="row"><span>Sum</span><b>${v.S0}</b></div><div class="row"><span>Carry out</span><b>${v.C1}</b></div>
            <div class="row"><span>Gates</span><b>5 (2 XOR, 2 AND, 1 OR)</b></div>`;
        }
        const sum = [0, 1, 2, 3].reduce((a, i) => a + (v[`S${i}`] << i), 0);
        const res = s.op === 'mul' ? `${s.A} × ${s.B} = ${s.A * s.B}` : s.op === 'sub' ? `${s.A} − ${s.B} = ${v.C4 ? sum : sum - 16}` : `${s.A} + ${s.B} = ${sum + 16 * v.C4}`;
        return `<div class="big">${res}</div>
          <div class="row"><span>Gates in this adder</span><b>24 (20 + 4 to subtract)</b></div>
          <div class="row"><span>Carry delay per bit</span><b>2 gate delays</b></div>
          <div class="row"><span>Status</span><b class="${S2.busy() ? 'no' : 'ok'}">${S2.busy() ? 'carry rippling…' : `settled in ${st.settle} gate delays`}</b></div>`;
      },
    };
    return inst;
  },
};
