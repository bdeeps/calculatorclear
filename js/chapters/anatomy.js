// Chapter 1: a working pocket calculator. Click its keys and it really calculates (8 digits, truncated,
// like a cheap calculator). Take it apart: keys, rubber domes, the key-matrix board, the chip under its
// black epoxy blob, the LCD with its zebra-strip connectors, the solar cell and the button cell.
import { THREE, M, exploder } from '../kit.js';
import { makeCalculator, makeEngine, keyRC, fitNarrow, SCI_UW } from '../calc.js';

export default {
  id: 'anatomy',
  short: 'Inside a calculator',
  title: 'Inside a pocket calculator',
  subtitle: 'Twenty rubber keys, one chip, one display and a solar cell the size of a stamp.',
  view: { pos: [-8.5, 12.5, 17.5], target: [-3.4, 1.6, -0.6] },
  learn: `<p>A pocket calculator looks simple, and it is: open one and you find only a handful of parts.</p>
    <p>Each <b>key</b> sits on a soft <b>rubber dome</b>. Inside every dome is a black <b>carbon pill</b>. Press a key, the dome squashes, and the pill touches two comb-shaped copper pads on the <b>circuit board</b>, joining them. That's the whole switch.</p>
    <p>The pads are wired in a grid of <b>rows and columns</b>, the <b>key matrix</b>. A single <b>chip</b> checks the grid hundreds of times a second to find which key is down. On cheap calculators the chip is glued straight onto the board and covered with a blob of black <b>epoxy</b>.</p>
    <p>The chip does all the maths in <b>binary</b>, using thousands of tiny switches called <b>transistors</b>, then lights the digits on the <b>LCD</b>. Pink rubber <b>zebra strips</b> carry the signals to the glass. A strip of <b>solar cell</b> and a tiny <b>button cell</b> power the lot, using about a ten-thousandth of a watt (see chapter 6).</p>
    <p>In the next chapters you'll follow one sum all the way: key press, binary, logic gates, the adder and the display. A computer does exactly the same, only much more of it (see ComputerClear, coming soon).</p>
    <p class="tip"><b>Try it:</b> click the calculator's keys and do a sum. Then slide "Take it apart" and find the carbon pills.</p>`,
  terms: [
    { t: 'Rubber dome switch', d: 'A key that squashes a rubber dome so a carbon pill inside joins two pads on the circuit board.' },
    { t: 'Key matrix', d: 'Keys wired in rows and columns so a few wires can serve many keys.' },
    { t: 'Chip-on-board', d: 'A bare chip glued to the circuit board and covered in a blob of black epoxy.' },
    { t: 'LCD', d: 'Liquid crystal display: segments that go dark when a small voltage is applied.' },
    { t: 'Zebra strip', d: 'A rubber strip with thin conducting layers that connects the board to the display glass.' },
    { t: 'Button cell', d: 'A small coin-shaped battery that backs up the solar cell in dim light.' },
  ],
  defaults: { explode: 0, xray: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'See-through case' },
    { key: 'demo', type: 'buttons', label: 'Type a sum for me', items: [
      { label: '12 + 7 =', act: (s, inst) => inst.typeSeq('C 1 2 + 7 =') },
      { label: '1 ÷ 3 × 3 =', act: (s, inst) => inst.typeSeq('C 1 ÷ 3 × 3 =') },
      { label: '√2', act: (s, inst) => inst.typeSeq('C 2 √') },
      { label: 'C', act: (s, inst) => inst.typeSeq('C') },
    ] },
  ],
  quiz: [
    { q: 'What actually closes the circuit when you press a calculator key?', options: ['A metal spring', 'A carbon pill inside a rubber dome touching two pads', 'A magnet', 'Light hitting a sensor'], answer: 1, why: 'The dome squashes and its carbon pill bridges two comb-shaped pads on the board.' },
    { q: 'Why are the keys wired in rows and columns?', options: ['It looks neat', 'So a few wires can serve many keys', 'To make the keys softer', 'To save paint'], answer: 1, why: '5 rows + 4 columns is 9 wires for 20 keys. The chip finds a key by where its row and column meet.' },
    { q: 'What is the black blob on a cheap calculator\'s board?', options: ['Glue for the battery', 'Epoxy covering the bare chip', 'A speaker', 'The solar cell'], answer: 1, why: 'The bare silicon chip is bonded straight to the board and sealed under epoxy. It is the whole brain.' },
  ],
  reel: [
    { ms: 5200, caption: 'A pocket calculator: 20 keys, one chip, a display and a solar cell the size of a stamp.', set: { explode: 0, xray: false }, act: (s, inst) => inst.typeSeq('C 1 2 + 7 =', 0.55), view: { pos: [-1.2, 12.5, 12.6], target: [0, 0.3, 0.3] }, spin: 0 },
    { ms: 5600, caption: 'Take it apart: keys on rubber domes, a grid of pads, one chip under black epoxy.', set: { xray: false }, anim: { explode: [0, 1] }, view: { pos: [12, 9.5, 15], target: [0, 3.2, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const c = makeCalculator();
    root.add(c.group);
    const eng = makeEngine();
    let shown = '';
    const redraw = () => { const k = eng.text + eng.err; if (k !== shown) { shown = k; c.screen.redraw(eng.text, eng.err); } };
    redraw();

    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    const Ls = {
      keys: L('Keys', c.keys, [-4.3, 0.5, 2.2]),
      dome: L('Rubber domes with carbon pills', c.rubber, [4.6, 0.2, 3.3], 'hot'),
      pcb: L('Key matrix: rows × columns', c.pcb, [4.5, 0.1, 0.3]),
      chip: L('Chip under epoxy', c.blob, [0, 0.6, 0], 'hot'),
      lcd: L('LCD', c.lcd, [-3.9, 0.3, 0]),
      zebra: L('Zebra strips', c.lcd, [3.9, -0.1, 1.0]),
      solar: L('Solar cell', c.solar, [2.6, 0.2, -0.3]),
      cell: L('Button cell', c.cell, [1.2, -0.1, 0.4]),
    };
    const setExplode = exploder([
      { obj: c.keys, off: [0, 7.6, 0] },
      { obj: c.top, off: [0, 5.8, 0] },
      { obj: c.solar, off: [0, 7.0, -1.2] },
      { obj: c.lcd, off: [0, 4.3, -1.2] },
      { obj: c.rubber, off: [0, 2.9, 0] },
      { obj: c.pcb, off: [0, 1.2, 0] },
      { obj: c.cell, off: [0, -0.1, 0] },
    ]);

    const press = new Map();                   // key → time left pressed
    let queue = [], qt = 0, lastKey = '', t = 0;
    const hit = (k) => { press.set(k, 0.16); eng.press(k); lastKey = k; redraw(); };
    for (const k in c.keyMeshes) { stage.pickables.push(c.keyMeshes[k].cap, c.keyMeshes[k].lab); }

    return {
      typeSeq(seq, gap = 0.32) { queue = seq.split(' ').map((k) => ({ k })); qt = 0.05; this.gap = gap; },
      gap: 0.32,
      pick(o) { const k = o.userData.key; if (k) { queue = []; hit(k); } },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = fitNarrow(stage, [Ls.zebra, Ls.cell, Ls.pcb], -0.12);
        setExplode(s.explode);
        const see = s.xray && s.explode < 0.05;
        c.topMat.opacity = see ? 0.18 : 1; c.topMat.depthWrite = !see;
        c.shellMat.opacity = see ? 0.35 : 1;
        const inner = s.explode > 0.15 || see;
        [Ls.dome, Ls.pcb, Ls.chip, Ls.zebra, Ls.cell].forEach((l) => { if (!narrow || (l !== Ls.zebra && l !== Ls.cell && l !== Ls.pcb)) l.visible = inner; });
        Ls.keys.visible = Ls.lcd.visible = Ls.solar.visible = true;
        if (queue.length) { qt -= dt; if (qt <= 0) { hit(queue.shift().k); qt = this.gap; } }
        for (const [k, left] of press) {
          const km = c.keyMeshes[k], d = c.domes[k], p = c.pills[k];
          const down = left > 0 ? 1 : 0;
          km.g.position.y = -0.14 * down; d.scale.y = 0.45 - 0.3 * down; p.position.y = -0.04 * down;
          if (left <= 0) press.delete(k); else press.set(k, left - dt);
        }
      },
      readout: () => {
        const rc = keyRC(lastKey);
        return `<div class="big">Display: ${eng.err ? 'E (error)' : eng.text}</div>
          <div class="row"><span>Last key</span><b>${lastKey || 'none yet'}${rc ? ` (row ${rc[0] + 1}, column ${rc[1] + 1})` : ''}</b></div>
          <div class="row"><span>Wires for 20 keys</span><b>5 rows + 4 columns = 9</b></div>
          <div class="row"><span>Power it needs</span><b>about ${SCI_UW} µW</b></div>
          <small>Click the keys on the model. 8 digits, extra digits are cut off.</small>`;
      },
    };
  },
};
