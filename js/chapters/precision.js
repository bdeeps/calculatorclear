// Chapter 6: power and precision.
// - Power: Casio's spec for the fx-82MS gives 0.0001 W (100 µW); a basic 4-function model is taken as about
//   20 µW (our estimate). The Sinclair Executive (1972) with red LEDs used 20 mW (Wikipedia). The solar cell's
//   output is modelled in calc.js (solarUW): light power per m² from lux, times cell area and efficiency.
// - Rounding: an 8-digit calculator cuts 1 ÷ 3 to 0.3333333, so × 3 gives 0.9999999. Binary floating point
//   (IEEE 754 double, what JavaScript uses) can't hold 0.1 exactly, so 0.1 + 0.2 = 0.30000000000000004.
// - Pentium FDIV bug (1994): missing entries in a division lookup table; 4,195,835 ÷ 3,145,727 gave
//   1.333739068902… instead of 1.333820449136…; Intel took a $475 million charge (Wikipedia, "Pentium FDIV bug").
// - Ariane 5 flight 501 (4 June 1996): a 64-bit floating-point number was converted to a 16-bit integer, it
//   overflowed, and the rocket was destroyed about 37 s after launch (ESA/CNES Inquiry Board report).
// - CORDIC (Jack Volder, 1959): rotate a vector by ± atan(2^−i) using only shifts and adds; the HP-35 (1972)
//   used CORDIC-style shift-and-add routines for its trig functions.
import { THREE, M, box, swarm } from '../kit.js';
import { makeCalculator, makeEngine, solarUW, SCI_UW, BASIC_UW, LED_MW, CELL_CM2, board, panelBg, title, text, mono, drawLCD, COL, fitNarrow, beam } from '../calc.js';

// CORDIC in rotation mode. Returns every step so the board can draw it.
export function cordic(theta, n) {
  let x = 1, y = 0, z = theta, K = 1;
  const steps = [{ x, y, z }];
  for (let i = 0; i < n; i++) {
    const d = z >= 0 ? 1 : -1, p = 2 ** -i;
    [x, y] = [x - d * y * p, y + d * x * p];
    z -= d * Math.atan(p);
    K *= 1 / Math.sqrt(1 + p * p);
    steps.push({ x, y, z, d, a: Math.atan(p) });
  }
  return { steps, cos: x * K, sin: y * K, K };
}

const VIEWS = {
  power: { pos: [-3.6, 4.8, 9.6], target: [-3.6, 4.0, 0] },
  rounding: { pos: [6.5, 6.7, 8.8], target: [6.5, 6.4, 0] },
  cordic: { pos: [6.5, 2.5, 8.8], target: [6.5, 2.2, 0] },
  all: { pos: [1.0, 6.2, 19.4], target: [1.0, 5.4, 0] },
};

export default {
  id: 'precision',
  short: 'Power and precision',
  title: 'Sunlight, and the last digit',
  subtitle: 'Why a stamp-sized solar cell is enough, why 1 ÷ 3 × 3 isn\'t always 1, and how sin and cos come from adding.',
  view: VIEWS.all,
  learn: `<p><b>Power.</b> A CMOS chip only uses energy when its gates switch (chapter 3), and the LCD makes no light of its own (chapter 5). So a simple calculator gets by on tens of <b>microwatts</b>: millionths of a watt. Casio lists 100 µW for a scientific model. A little <b>amorphous silicon</b> solar cell in room light makes about that much. The first LED calculators needed hundreds of times more: the 1972 Sinclair Executive used 20 mW.</p>
    <p><b>Precision.</b> A basic calculator has 8 digits and simply cuts off the rest. So 1 ÷ 3 = 0.3333333, and × 3 gives <b>0.9999999</b>, not 1. That's <b>fixed point</b>: the decimal point sits somewhere in 8 digit places. Scientific calculators use <b>floating point</b>: digits plus a power of ten, like 6.02 × 10²³, and they keep a few hidden <b>guard digits</b> so answers like this round back to 1.</p>
    <p>Computers use binary floating point, which can't store 0.1 exactly, so 0.1 + 0.2 comes out as 0.30000000000000004. Mostly harmless. But in 1994 the <b>Pentium FDIV bug</b>, a few missing entries in a table inside Intel's chip, made some divisions wrong in the fifth digit, and it cost Intel $475 million.</p>
    <p><b>sin and cos.</b> Scientific calculators don't store tables of sines. Many use <b>CORDIC</b> (1959): turn an arrow towards the angle you want in smaller and smaller steps, each one an angle whose tangent is ½, ¼, ⅛ … Each step needs only a shift and an add, exactly what the adder in chapter 4 can do. After 16 steps you have about 5 correct digits.</p>
    <p class="tip"><b>Try it:</b> dim the light until the calculator fades, then switch on the button cell. Press "1 ÷ 3 × 3". Then give CORDIC more steps and watch the error shrink.</p>`,
  terms: [
    { t: 'Microwatt', d: 'A millionth of a watt. A calculator uses tens of them.' },
    { t: 'Amorphous silicon', d: 'Non-crystal silicon used in thin solar cells that work well in room light.' },
    { t: 'Fixed point', d: 'Numbers with a set number of digits and the point in a fixed range of places.' },
    { t: 'Floating point', d: 'Numbers stored as digits times a power: 6.02 × 10²³. The point "floats".' },
    { t: 'Guard digits', d: 'Extra hidden digits a calculator keeps so that rounding errors don\'t show.' },
    { t: 'CORDIC', d: 'A way to compute sin, cos and more by rotating in shrinking steps, using only shifts and adds.' },
  ],
  defaults: { focus: 'all', lux: 500, kind: 'basic', cellOn: false, angle: 30, iters: 8 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'all', label: 'Everything' }, { v: 'power', label: 'Power' }, { v: 'rounding', label: 'Rounding' }, { v: 'cordic', label: 'CORDIC' }] },
    { key: 'lux', type: 'log', label: 'Light on the solar cell', min: 20, max: 100000, ends: ['dim room', 'sunlight'], fmt: (v) => `${Math.round(v).toLocaleString()} lux` },
    { key: 'kind', type: 'seg', label: 'Calculator', options: [{ v: 'basic', label: 'Basic (~20 µW)' }, { v: 'sci', label: 'Scientific (100 µW)' }] },
    { key: 'cellOn', type: 'toggle', label: 'Button cell backup' },
    { key: 'sum', type: 'buttons', label: 'Type on it', items: [
      { label: '1 ÷ 3 × 3 =', act: (s, inst) => inst.typeSeq('C 1 ÷ 3 × 3 =') },
      { label: '2 ÷ 3 =', act: (s, inst) => inst.typeSeq('C 2 ÷ 3 =') },
      { label: '99999999 + 1', act: (s, inst) => inst.typeSeq('C 9 9 9 9 9 9 9 9 + 1 =') },
    ] },
    { key: 'angle', type: 'range', label: 'CORDIC angle', min: 0, max: 90, step: 1, fmt: (v) => `${v}°` },
    { key: 'iters', type: 'range', label: 'CORDIC steps', min: 0, max: 16, step: 1, fmt: (v) => `${v}` },
  ],
  onChange(s) { s.iters = Math.round(s.iters); s.angle = Math.round(s.angle); },
  quiz: [
    { q: 'Why can a small solar cell run a calculator?', options: ['Calculators store sunlight', 'CMOS chips and LCDs need only millionths of a watt', 'The cell is very big', 'The keys make electricity'], answer: 1, why: 'CMOS gates draw current only when they switch, and an LCD makes no light, so tens of microwatts are enough.' },
    { q: 'An 8-digit calculator shows 1 ÷ 3 × 3 = 0.9999999. Why?', options: ['The chip is broken', '1 ÷ 3 was cut to 0.3333333, and the lost bit never comes back', 'It rounds up', 'Multiplication is slow'], answer: 1, why: 'With only 8 digits, the endless 3s are cut off. Scientific calculators hide extra guard digits to avoid this.' },
    { q: 'What operations does each CORDIC step need?', options: ['A square root', 'Only a shift and an add', 'A big table of sines', 'A division'], answer: 1, why: 'Multiplying by ½, ¼, ⅛… is just shifting bits, so each step is shifts and adds.' },
  ],
  reel: [
    { ms: 5200, caption: 'A calculator runs on about a ten-thousandth of a watt, so a stamp-sized solar cell in room light is enough.', set: { focus: 'power', kind: 'basic', cellOn: false }, anim: { lux: [30, 800, true] }, view: VIEWS.power, spin: 0 },
    { ms: 5400, caption: 'With 8 digits, 1 ÷ 3 × 3 = 0.9999999. Scientific calculators hide extra digits to get 1.', set: { focus: 'rounding', lux: 800 }, act: (s, inst) => inst.typeSeq('C 1 ÷ 3 × 3 =', 0.3), view: VIEWS.rounding, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------------------------------------------------------- the solar calculator
    const c = makeCalculator(); c.group.scale.setScalar(0.55); c.group.rotation.x = 0.9; c.group.position.set(-5.5, 2.2, 0.6); root.add(c.group);
    const eng = makeEngine();
    const lamp = new THREE.Group(); lamp.position.set(-2.6, 7.6, 2.2); root.add(lamp);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), M.glow(0xfff2c0)); lamp.add(bulb);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.7, 28, 1, true), M.plastic(0x3a3f4b, { side: THREE.DoubleSide })); shade.position.y = 0.35; lamp.add(shade);
    const PH = 60, photons = swarm(PH, new THREE.SphereGeometry(0.06, 8, 6), M.glow(0xffe08a)); root.add(photons);
    // The solar cell's position in world space (top of the calculator).
    c.group.updateMatrixWorld(true);
    const cellW = c.solar.getWorldPosition(new THREE.Vector3());
    // Power bars on a log scale: 1 µW at the floor, each unit = ×10.
    const BX = -1.6, bars = {};
    const logH = (uw) => Math.max(0.02, Math.log10(Math.max(1, uw)) * 1.3);
    [['make', 0xffd166], ['need', 0x8ef0ff], ['led', 0xff7a59]].forEach(([k, col], i) => {
      const m = box(0.7, 1, 0.7, M.plastic(col, { roughness: 0.4, emissive: new THREE.Color(col), emissiveIntensity: 0.25 })); m.position.set(BX + i * 1.1, 0.5, 0); root.add(m); bars[k] = m;
    });
    for (let e = 0; e <= 5; e += 2) { const tick = box(3.4, 0.02, 0.02, M.plastic(0x485062)); tick.position.set(BX + 1.1, 0.4 + e * 1.3, -0.4); root.add(tick); }
    const tickL = ['1 µW', '', '10 mW'].map((t, e) => (t ? stage.label(t, [BX - 0.95, 0.4 + e * 2.6, -0.4], root) : null)).filter(Boolean);
    const Lb = { make: stage.label('', [BX, 0, 0.5], root, 'hot'), need: stage.label('', [BX + 1.1, 0, 0.5], root), led: stage.label('LED calculator, 1972', [BX + 2.2, 0, 0.5], root) };
    // ---------------------------------------------------------------- the rounding board
    const st = { text: '0', err: false, hist: [], iters: -1, angle: -1 };
    const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 640; lcdCanvas.height = 180;
    const rnd = board(root, 8.0, 4.0, 1000, 500, (g, W, H) => {
      panelBg(g, W, H);
      text(g, 'Only 8 digits', 24, 48, { font: 'bold 38px sans-serif', col: '#e8eef8' });
      drawLCD(lcdCanvas.getContext('2d'), 640, 180, st.text, st.err);
      g.drawImage(lcdCanvas, 24, 70, 460, 130);
      const h = st.hist.slice(-2);
      text(g, h.length ? h[0] + ' =' : 'Press "1 ÷ 3 × 3 ="', 510, 118, { font: mono(28), col: 'rgba(255,255,255,.75)' });
      if (h[1]) text(g, h[1] + ' =', 510, 162, { font: mono(28), col: 'rgba(255,255,255,.75)' });
      const r = [['1 ÷ 3 × 3, 8 digits', '0.9999999', COL.bad], ['…with guard digits', '1', COL.good], ['0.1 + 0.2, binary floats', String(0.1 + 0.2), COL.carry]];
      r.forEach(([a, b2, col], i) => { text(g, a, 24, 250 + i * 40, { font: '28px sans-serif', col: 'rgba(255,255,255,.75)' }); text(g, b2, W - 24, 250 + i * 40, { font: mono(28, true), col, align: 'right' }); });
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(24, 350, W - 48, 2);
      text(g, 'Pentium FDIV bug, 1994: 4,195,835 ÷ 3,145,727', 24, 392, { font: '28px sans-serif' });
      text(g, 'right 1.3338204…  chip said 1.3337391…', 24, 432, { font: mono(26, true), col: COL.carry });
      text(g, 'It cost Intel $475 million to replace chips.', 24, 474, { font: '26px sans-serif', col: 'rgba(255,255,255,.65)' });
    }, [6.5, 6.4, -0.3]);
    // ---------------------------------------------------------------- the CORDIC board
    const cord = board(root, 8.0, 4.0, 1000, 500, (g, W, H) => {
      panelBg(g, W, H);
      const th = (st.angle * Math.PI) / 180, R = cordic(th, st.iters);
      const ox = 36, oy = 470, rr = 400;
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 3; g.beginPath(); g.arc(ox, oy, rr, -Math.PI / 2, 0); g.stroke();
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + rr + 10, oy); g.moveTo(ox, oy); g.lineTo(ox, oy - rr - 10); g.stroke();
      g.strokeStyle = COL.good; g.lineWidth = 3; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + rr * Math.cos(th), oy - rr * Math.sin(th)); g.stroke(); g.setLineDash([]);
      let K = 1;
      R.steps.forEach((p, i) => {
        if (i) K /= Math.sqrt(1 + 4 ** -(i - 1));
        const last = i === R.steps.length - 1;
        g.strokeStyle = last ? COL.one : `rgba(142,240,255,${0.25 + 0.5 * (i / R.steps.length)})`; g.lineWidth = last ? 7 : 3;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + rr * p.x * K, oy - rr * p.y * K); g.stroke();
      });
      const ex = Math.cos(th), ey = Math.sin(th), err = Math.max(Math.abs(R.cos - ex), Math.abs(R.sin - ey));
      const X0 = 470;
      text(g, `CORDIC, ${st.angle}°`, X0, 48, { font: 'bold 38px sans-serif', col: '#e8eef8' });
      text(g, `${st.iters} steps of shift + add`, X0, 88, { font: '28px sans-serif', col: 'rgba(255,255,255,.65)' });
      text(g, 'cos', X0, 150, { font: '30px sans-serif', col: 'rgba(255,255,255,.6)' }); text(g, R.cos.toFixed(5), X0 + 80, 150, { font: mono(34, true), col: COL.one });
      text(g, 'sin', X0, 198, { font: '30px sans-serif', col: 'rgba(255,255,255,.6)' }); text(g, R.sin.toFixed(5), X0 + 80, 198, { font: mono(34, true), col: COL.one });
      text(g, ex.toFixed(5), X0 + 300, 150, { font: mono(28), col: COL.good }); text(g, ey.toFixed(5), X0 + 300, 198, { font: mono(28), col: COL.good });
      text(g, 'true', X0 + 300, 112, { font: '22px sans-serif', col: 'rgba(255,255,255,.5)' });
      text(g, `error ${err < 1e-5 ? '< 0.00001' : err.toFixed(5)}`, X0, 262, { font: mono(32, true), col: err < 1e-3 ? COL.good : COL.bad });
      const nx = R.steps[R.steps.length - 1];
      text(g, st.iters ? `last turn ${nx.d > 0 ? '+' : '−'}${((nx.a * 180) / Math.PI).toFixed(2)}°` : 'no turns yet', X0, 322, { font: '28px sans-serif' });
      text(g, 'Turns: 45°, 26.6°, 14.0°, 7.1° …', X0, 372, { font: '26px sans-serif', col: 'rgba(255,255,255,.6)' });
      text(g, '(tan = 1, ½, ¼, ⅛ …)', X0, 408, { font: '26px sans-serif', col: 'rgba(255,255,255,.6)' });
      text(g, 'dashed: the true angle', X0, 462, { font: '24px sans-serif', col: COL.good });
    }, [6.5, 2.2, -0.3]);
    // ---------------------------------------------------------------- run
    let t = 0, queue = [], qt = 0, gap = 0.3, focus = '', shownKey = '';
    const inst = {
      typeSeq(seq, g2 = 0.25) { queue = seq.split(' '); qt = 0.05; gap = g2; },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fitNarrow(stage, [Lb.led], -0.06);
        void narrow;
        if (s.focus !== focus) { const first = !focus; focus = s.focus; if (!first && !document.body.classList.contains('gb-reel')) stage.setView(VIEWS[focus].pos, VIEWS[focus].target, 1.0); }
        // Light and power.
        const make = solarUW(s.lux), need = s.kind === 'sci' ? SCI_UW : BASIC_UW;
        const powered = s.cellOn || make >= need, contrast = s.cellOn ? 1 : Math.min(1, make / need);
        bulb.material.color.setRGB(1, 0.95, 0.75).multiplyScalar(0.25 + 0.75 * Math.min(1, Math.log10(s.lux) / 5));
        const nOn = Math.round(PH * Math.min(1, Math.log10(s.lux / 10) / 4));
        const L0 = lamp.position;
        for (let i = 0; i < PH; i++) {
          const u = ((t * 0.7 + i / PH) % 1), a = i * 2.39996;
          const from = [L0.x + Math.cos(a) * 0.5, L0.y - 0.3, L0.z + Math.sin(a) * 0.5], to = [cellW.x + Math.cos(a) * 0.6, cellW.y + 0.05, cellW.z + Math.sin(a) * 0.2];
          photons.place(i, [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u], null, i < nOn ? 1 : 0.0001);
        }
        photons.done();
        bars.make.scale.y = logH(make); bars.make.position.y = logH(make) / 2 + 0.4;
        bars.need.scale.y = logH(need); bars.need.position.y = logH(need) / 2 + 0.4;
        bars.led.scale.y = logH(LED_MW * 1000); bars.led.position.y = logH(LED_MW * 1000) / 2 + 0.4;
        Lb.make.position.y = logH(make) + 0.75; Lb.need.position.y = 0.05; Lb.led.position.y = logH(LED_MW * 1000) + 0.75;
        Lb.make.element.textContent = `Solar cell makes ${make < 10 ? make.toFixed(1) : Math.round(make)} µW`;
        Lb.need.element.textContent = `Chip needs ~${need} µW`;
        // Calculator typing.
        if (queue.length) { qt -= dt; if (qt <= 0) { eng.press(queue.shift()); qt = gap; } }
        const text8 = powered || contrast > 0.35 ? eng.text : ' ';
        const k = `${text8}|${eng.err}|${contrast.toFixed(2)}`;
        if (k !== shownKey) {
          shownKey = k;
          const g = c.screen.canvas.getContext('2d');
          drawLCD(g, 1024, 320, text8, eng.err);
          if (contrast < 1) { g.fillStyle = `rgba(185,195,166,${1 - contrast})`; g.fillRect(0, 0, 1024, 320); }
          c.screen.tex.needsUpdate = true;
          st.text = eng.text; st.err = eng.err; st.hist = eng.history.slice(); rnd.redraw();
        }
        if (s.iters !== st.iters || s.angle !== st.angle) { st.iters = s.iters; st.angle = s.angle; cord.redraw(); }
        inst.pw = { make, need, powered };
      },
      readout(s) {
        const p = inst.pw || { make: 0, need: 1, powered: false };
        if (s.focus === 'cordic') {
          const R = cordic((s.angle * Math.PI) / 180, s.iters), err = Math.max(Math.abs(R.cos - Math.cos((s.angle * Math.PI) / 180)), Math.abs(R.sin - Math.sin((s.angle * Math.PI) / 180)));
          return `<div class="big">sin ${s.angle}° ≈ ${R.sin.toFixed(6)}</div>
            <div class="row"><span>cos ${s.angle}°</span><b>${R.cos.toFixed(6)}</b></div>
            <div class="row"><span>Steps (shift + add each)</span><b>${s.iters}</b></div>
            <div class="row"><span>Error</span><b class="${err < 1e-3 ? 'ok' : 'no'}">${err.toExponential(1)}</b></div>`;
        }
        if (s.focus === 'rounding') {
          return `<div class="big">Display: ${eng.err ? 'E' : eng.text}</div>
            <div class="row"><span>1 ÷ 3 on 8 digits</span><b>0.3333333</b></div>
            <div class="row"><span>… × 3</span><b class="no">0.9999999</b></div>
            <div class="row"><span>0.1 + 0.2 (binary floats)</span><b>${0.1 + 0.2}</b></div>`;
        }
        return `<div class="big">${p.powered ? 'Running on light' : 'Too dim: the display fades'}</div>
          <div class="row"><span>Solar cell at ${Math.round(s.lux).toLocaleString()} lux makes</span><b>${p.make < 10 ? p.make.toFixed(1) : Math.round(p.make)} µW</b></div>
          <div class="row"><span>Calculator needs</span><b>${p.need} µW${s.kind === 'basic' ? ' (estimate)' : ' (Casio spec)'}</b></div>
          <div class="row"><span>LED calculator, 1972</span><b>${LED_MW} mW = ${(LED_MW * 1000).toLocaleString()} µW</b></div>`;
      },
    };
    return inst;
  },
};
