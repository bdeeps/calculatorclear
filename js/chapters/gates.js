// Chapter 3: logic gates. Four real gates (NOT, AND, OR, XOR) you can drive by clicking their inputs,
// and a look inside: in CMOS every gate is a few transistors used as switches. A PMOS transistor conducts
// when its gate is 0 and connects the output to the supply; an NMOS conducts when its gate is 1 and
// connects the output to ground. Inverter = 1 PMOS + 1 NMOS; NAND = 2 PMOS in parallel + 2 NMOS in series.
// Transistor counts for static CMOS gates: Weste & Harris, CMOS VLSI Design (4th ed.), ch. 1.
import { THREE, M, box } from '../kit.js';
import { GATES, makeGate, wire, makeLamp, board, panelBg, title, text, mono, COL, HEX, fitNarrow, beam } from '../calc.js';

const TYPES = ['NOT', 'AND', 'OR', 'XOR'];
const KEY = { NOT: ['notA'], AND: ['andA', 'andB'], OR: ['orA', 'orB'], XOR: ['xorA', 'xorB'] };
const b = (x) => (x ? 1 : 0);

export default {
  id: 'gates',
  short: 'Logic gates',
  title: 'Switches that make decisions',
  subtitle: 'A transistor is a switch worked by electricity. Wire a few together and you get gates: NOT, AND, OR, XOR.',
  view: { pos: [0, 7.2, 17.6], target: [0, 6.4, 0] },
  learn: `<p>Everything a calculator does comes down to one tiny part: the <b>transistor</b>. Think of it as a switch with no finger: a voltage on its <b>gate</b> turns it on or off. A calculator chip has thousands of them; a phone chip has billions.</p>
    <p>Wire a few transistors together and you get a <b>logic gate</b>, which looks at 1s and 0s and answers with a 1 or a 0:</p>
    <p><b>NOT</b> flips its input. <b>AND</b> gives 1 only if both inputs are 1. <b>OR</b> gives 1 if either is. <b>XOR</b> ("exclusive or") gives 1 if the inputs are <i>different</i>. A <b>truth table</b> lists every answer.</p>
    <p>Look inside (switch to "Inside: CMOS"). Modern chips use <b>CMOS</b>: pairs of opposite transistors. A <b>PMOS</b> switch closes when its input is 0 and connects the output to the supply (1). An <b>NMOS</b> switch closes when its input is 1 and connects the output to ground (0). One of each makes a NOT gate with just 2 transistors. Because one switch is always open, almost no current flows when nothing changes. That's why a calculator can run on a scrap of solar cell (chapter 6).</p>
    <p>George Boole wrote down this logic in 1854. In 1937 Claude Shannon showed switches could do it, and every computer since has been built from gates (see CurrentClear for circuits, and ComputerClear, coming soon).</p>
    <p class="tip"><b>Try it:</b> click the round inputs on each gate. Can you make XOR give 1? Then look inside the NAND gate and see which switches close.</p>`,
  terms: [
    { t: 'Transistor', d: 'A switch with no moving parts, turned on and off by a voltage on its gate.' },
    { t: 'Logic gate', d: 'A small circuit that turns one or two input bits into an output bit by a fixed rule.' },
    { t: 'Truth table', d: 'A table listing a gate\'s output for every possible input.' },
    { t: 'XOR', d: 'Exclusive OR: the output is 1 when the two inputs are different.' },
    { t: 'CMOS', d: 'Complementary MOS: gates built from pairs of PMOS and NMOS transistors, which waste almost no power when idle.' },
    { t: 'NAND', d: 'NOT-AND: 0 only when both inputs are 1. Any other gate can be built from NANDs.' },
  ],
  defaults: { show: 'gates', notA: false, andA: true, andB: false, orA: true, orB: false, xorA: true, xorB: false, cA: true, cB: false },
  controls: [
    { key: 'show', type: 'seg', label: 'View', options: [{ v: 'gates', label: 'Four gates' }, { v: 'cmos', label: 'Inside: CMOS' }] },
    { key: 'all', type: 'buttons', label: 'Set every input (A, B)', items: [0, 1, 2, 3].map((k) => ({ label: `${k >> 1} ${k & 1}`, act: (s) => { const A = !!(k >> 1), B = !!(k & 1); Object.assign(s, { notA: A, andA: A, andB: B, orA: A, orB: B, xorA: A, xorB: B, cA: A, cB: B }); } })) },
    { key: 'cA', type: 'toggle', label: 'CMOS input A' },
    { key: 'cB', type: 'toggle', label: 'CMOS input B (NAND only)' },
  ],
  quiz: [
    { q: 'An AND gate has inputs 1 and 0. What is its output?', options: ['1', '0', '2', 'It depends on the clock'], answer: 1, why: 'AND gives 1 only when both inputs are 1.' },
    { q: 'Which gate gives 1 when its two inputs are different?', options: ['AND', 'OR', 'XOR', 'NOT'], answer: 2, why: 'XOR: 0 and 1, or 1 and 0, give 1. Two equal inputs give 0.' },
    { q: 'In a CMOS NOT gate with input 1, which transistor conducts?', options: ['The PMOS, pulling the output to 1', 'The NMOS, pulling the output to 0', 'Both', 'Neither'], answer: 1, why: 'A 1 on the input closes the NMOS switch to ground and opens the PMOS, so the output is 0.' },
  ],
  reel: [
    { ms: 5600, caption: 'Logic gates turn 1s and 0s into answers: AND needs both, OR needs either, XOR needs them different.', set: { show: 'gates', notA: false, andA: true, andB: true, orA: false, orB: true, xorA: true, xorB: false }, view: { pos: [0, 4.6, 15.5], target: [0, 4.0, 0] }, spin: 0 },
    { ms: 5000, caption: 'Inside each gate: transistors as switches. A NOT gate is just two, one to 1 and one to 0.', set: { show: 'cmos', cA: true, cB: true }, view: { pos: [1.2, 5.0, 12.6], target: [1.2, 4.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------------------------------------------------------- four gates
    const gatesG = new THREE.Group(); root.add(gatesG);
    const GX = [-6.6, -2.2, 2.2, 6.6], GY = 5.2;
    const G = TYPES.map((type, i) => {
      const gate = makeGate(type, { scale: 1.15 }); gate.position.set(GX[i], GY, 0); gatesG.add(gate);
      const ins = GATES[type].n === 1 ? [0] : [0, 1];
      const inW = ins.map((k) => { const p = gate.pin('in', k); return { w: wire(gatesG, [[p[0] - 1.1, p[1], 0], p], 0.06), lamp: makeLamp(gatesG, [p[0] - 1.25, p[1], 0], 0.22), key: KEY[type][k] }; });
      inW.forEach((x) => { x.lamp.bulb.userData.toggle = x.key; stage.pickables.push(x.lamp.bulb); });
      const po = gate.pin('out'); const outW = wire(gatesG, [po, [po[0] + 0.9, po[1], 0]], 0.06);
      const outL = makeLamp(gatesG, [po[0] + 1.1, po[1], 0], 0.3);
      const lab = stage.label(type, [GX[i], GY + 1.3, 0], gatesG, 'hot');
      const tr = stage.label(`${GATES[type].tr} transistors`, [GX[i], GY - 1.25, 0], gatesG);
      return { type, gate, inW, outW, outL, lab, tr };
    });
    // ---------------------------------------------------------------- CMOS inside view
    const cmos = new THREE.Group(); root.add(cmos);
    const railMat = M.glow(HEX.one), gndMat = M.plastic(0x4a5a78);
    const P = HEX.p, N = HEX.n;
    // A transistor drawn as a switch: two contacts, a blade that closes when conducting, and a coloured channel.
    function fet(parent, x, yTop, yBot, type) {
      const g = new THREE.Group(); parent.add(g);
      const ch = box(0.5, yTop - yBot - 0.3, 0.2, M.plastic(type === 'P' ? P : N, { transparent: true, opacity: 0.55 })); ch.position.set(x, (yTop + yBot) / 2, -0.25); g.add(ch);
      const cTop = box(0.3, 0.14, 0.3, M.metal(0xd9b36c)); cTop.position.set(x, yTop, 0); g.add(cTop);
      const cBot = box(0.3, 0.14, 0.3, M.metal(0xd9b36c)); cBot.position.set(x, yBot, 0); g.add(cBot);
      const pivot = new THREE.Group(); pivot.position.set(x, yBot, 0.05); g.add(pivot);
      const L = yTop - yBot;
      const bladeOff = M.metal(0x9aa3b2), bladeOn = M.glow(HEX.one);
      const blade = beam([0, 0, 0], [0, L, 0], 0.06, bladeOff); pivot.add(blade);
      // Gate electrode to the left of the channel, with a bubble on PMOS (it works on 0).
      const gate = box(0.1, L * 0.6, 0.3, M.metal(0x6b7280)); gate.position.set(x - 0.5, (yTop + yBot) / 2, 0); g.add(gate);
      if (type === 'P') { const bub = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 20), M.plastic(P)); bub.position.set(x - 0.66, (yTop + yBot) / 2, 0); g.add(bub); }
      let on = -1;
      g.set = (v) => { if (v === on) return; on = v; pivot.rotation.z = v ? 0 : 0.5; blade.material = v ? bladeOn : bladeOff; };
      g.gateAt = [x - 0.55, (yTop + yBot) / 2, 0];
      return g;
    }
    // Inverter at the left.
    const IX = -2.4, VDD = 7.4, GND = 0.9, OUT = 4.15;
    const railsInv = [beam([IX - 1.8, VDD, 0], [IX + 1.2, VDD, 0], 0.09, railMat), beam([IX - 1.8, GND, 0], [IX + 1.2, GND, 0], 0.09, gndMat)];
    railsInv.forEach((r) => cmos.add(r));
    const pInv = fet(cmos, IX, VDD - 0.1, OUT + 0.15, 'P'), nInv = fet(cmos, IX, OUT - 0.15, GND + 0.1, 'N');
    const inInv = wire(cmos, [[IX - 2.3, OUT, 0], [IX - 1.3, OUT, 0], [IX - 1.3, pInv.gateAt[1], 0], pInv.gateAt], 0.05);
    const inInv2 = wire(cmos, [[IX - 1.3, OUT, 0], [IX - 1.3, nInv.gateAt[1], 0], nInv.gateAt], 0.05);
    const inInvLamp = makeLamp(cmos, [IX - 2.5, OUT, 0], 0.24); inInvLamp.bulb.userData.toggle = 'cA'; stage.pickables.push(inInvLamp.bulb);
    const outInv = wire(cmos, [[IX, OUT + 0.15, 0], [IX, OUT - 0.15, 0], [IX + 1.4, OUT, 0]], 0.06);
    const outInvLamp = makeLamp(cmos, [IX + 1.65, OUT, 0], 0.3);
    // NAND at the right: PMOS A and B in parallel on top, NMOS A and B in series below.
    const NX = 5.2, NOUT = 4.4, MID = 2.65;
    [beam([NX - 2.6, VDD, 0], [NX + 2.2, VDD, 0], 0.09, railMat), beam([NX - 2.6, GND, 0], [NX + 2.2, GND, 0], 0.09, gndMat)].forEach((r) => cmos.add(r));
    const pA = fet(cmos, NX - 0.8, VDD - 0.1, NOUT + 0.15, 'P'), pB = fet(cmos, NX + 0.9, VDD - 0.1, NOUT + 0.15, 'P');
    const nA = fet(cmos, NX, NOUT - 0.15, MID + 0.1, 'N'), nB = fet(cmos, NX, MID - 0.1, GND + 0.1, 'N');
    const outNand = wire(cmos, [[NX - 0.8, NOUT + 0.15, 0], [NX - 0.8, NOUT, 0], [NX + 0.9, NOUT, 0], [NX + 0.9, NOUT + 0.15, 0]], 0.06);
    const outNand2 = wire(cmos, [[NX, NOUT, 0], [NX, NOUT - 0.15, 0]], 0.06);
    const outNand3 = wire(cmos, [[NX + 0.9, NOUT, 0], [NX + 2.0, NOUT, 0]], 0.06);
    const outNandLamp = makeLamp(cmos, [NX + 2.25, NOUT, 0], 0.3);
    const midW = wire(cmos, [[NX, MID + 0.1, 0], [NX, MID - 0.1, 0]], 0.05);
    const aW = wire(cmos, [[NX - 2.9, 5.6, 0], [NX - 1.9, 5.6, 0], [NX - 1.9, pA.gateAt[1], 0], pA.gateAt], 0.05);
    const aW2 = wire(cmos, [[NX - 1.9, pA.gateAt[1], 0], [NX - 1.9, nA.gateAt[1], 0], nA.gateAt], 0.05);
    const bW = wire(cmos, [[NX - 2.9, 1.85, 0], [NX - 1.0, 1.85, 0], [NX - 1.0, 1.85, 0.5], [NX + 0.3, 1.85, 0.5], [NX + 0.3, pB.gateAt[1], 0.5], [NX + 0.35, pB.gateAt[1], 0]], 0.05);
    const bW2 = wire(cmos, [[NX - 1.0, 1.85, 0], nB.gateAt], 0.05);
    const aLamp = makeLamp(cmos, [NX - 3.1, 5.6, 0], 0.24), bLamp = makeLamp(cmos, [NX - 3.1, 1.85, 0], 0.24);
    aLamp.bulb.userData.toggle = 'cA'; bLamp.bulb.userData.toggle = 'cB'; stage.pickables.push(aLamp.bulb, bLamp.bulb);
    const CL = {
      inv: stage.label('NOT: 2 transistors', [IX, VDD + 0.6, 0], cmos, 'hot'),
      nand: stage.label('NAND: 4 transistors', [NX, VDD + 0.6, 0], cmos, 'hot'),
      vdd: stage.label('Supply = 1', [IX - 2.6, VDD, 0], cmos),
      gnd: stage.label('Ground = 0', [IX - 2.6, GND, 0], cmos),
      p: stage.label('PMOS: on when input is 0', [IX + 1.2, 6.1, 0], cmos),
      n: stage.label('NMOS: on when input is 1', [IX + 1.2, 2.3, 0], cmos),
      a: stage.label('A', [NX - 3.1, 6.1, 0], cmos), b: stage.label('B', [NX - 3.1, 2.35, 0], cmos),
    };
    // ---------------------------------------------------------------- truth tables
    const st = { v: {}, show: 'gates' };
    const tables = board(root, 13.6, 2.9, 1760, 376, (g, W, H) => {
      panelBg(g, W, H);
      const defs = st.show === 'gates' ? TYPES.map((t) => ({ t, n: GATES[t].n, ins: KEY[t].map((k) => b(st.v[k])) }))
        : [{ t: 'NOT', n: 1, ins: [b(st.v.cA)] }, { t: 'NAND', n: 2, ins: [b(st.v.cA), b(st.v.cB)] }];
      const cw = W / defs.length;
      defs.forEach((d, i) => {
        const x0 = i * cw + 30;
        text(g, `${d.t}`, x0, 46, { font: 'bold 38px sans-serif', col: '#e8eef8' });
        const head = d.n === 1 ? ['A', 'out'] : ['A', 'B', 'out'];
        head.forEach((h, k) => text(g, h, x0 + 30 + k * 100, 96, { font: mono(32, true), col: 'rgba(255,255,255,.55)', align: 'center' }));
        const rows = d.n === 1 ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
        rows.forEach((r, j) => {
          const y = 150 + j * 60, cur = r.every((v, k) => v === d.ins[k]);
          if (cur) { g.fillStyle = 'rgba(255,209,102,.18)'; g.fillRect(x0 - 16, y - 42, head.length * 100 + 10, 56); }
          const out = GATES[d.t].f(...r);
          [...r, out].forEach((v, k) => text(g, String(v), x0 + 30 + k * 100, y, { font: mono(40, true), col: k === r.length ? (out ? COL.one : 'rgba(255,255,255,.5)') : '#e8eef8', align: 'center' }));
        });
      });
    }, [0, 1.6, -0.4]);
    let key = '';
    return {
      pick(o) { const k = o.userData.toggle; if (k && st.s) { st.s[k] = !st.s[k]; } },
      update(dt, s) {
        dt = Math.max(0, dt); st.s = s;
        fitNarrow(stage, [CL.p, CL.n, CL.vdd, CL.gnd, ...G.map((x) => x.tr)], -0.08);
        gatesG.visible = s.show === 'gates'; cmos.visible = s.show === 'cmos'; tables.mesh.visible = s.show === 'gates';
        G.forEach((x) => {
          const ins = x.inW.map((w) => b(s[w.key]));
          x.inW.forEach((w, k) => { w.w.set(ins[k]); w.lamp.set(ins[k]); });
          const out = GATES[x.type].f(...ins);
          x.outW.set(out); x.outL.set(out, '#7be08c'); x.gate.setOut(out);
        });
        const A = b(s.cA), B = b(s.cB);
        pInv.set(!A); nInv.set(!!A); inInv.set(A); inInv2.set(A); inInvLamp.set(A); outInv.set(1 - A); outInvLamp.set(1 - A, '#7be08c');
        const nandOut = 1 - (A & B);
        pA.set(!A); pB.set(!B); nA.set(!!A); nB.set(!!B);
        [outNand, outNand2, outNand3].forEach((w) => w.set(nandOut)); outNandLamp.set(nandOut, '#7be08c');
        midW.set(0); aW.set(A); aW2.set(A); bW.set(B); bW2.set(B); aLamp.set(A); bLamp.set(B);
        const k2 = JSON.stringify([s.show, TYPES.map((t) => KEY[t].map((k) => b(s[k]))), A, B]);
        if (k2 !== key) { key = k2; st.v = { ...s }; st.show = s.show; tables.redraw(); }
      },
      readout(s) {
        if (s.show === 'cmos') {
          const A = b(s.cA), B = b(s.cB);
          return `<div class="big">Inside the gates</div>
            <div class="row"><span>NOT ${A} =</span><b>${1 - A} (${A ? 'NMOS on, PMOS off' : 'PMOS on, NMOS off'})</b></div>
            <div class="row"><span>NAND ${A} ${B} =</span><b>${1 - (A & B)}</b></div>
            <div class="row"><span>Transistors: NOT, NAND, AND, XOR</span><b>2, 4, 6, 12</b></div>`;
        }
        const rows = TYPES.map((t) => { const ins = KEY[t].map((k) => b(s[k])); return `<div class="row"><span>${t} ${ins.join(' ')}</span><b>${GATES[t].f(...ins)}</b></div>`; }).join('');
        return `<div class="big">Four gates</div>${rows}`;
      },
    };
  },
};
