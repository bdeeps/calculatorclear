// Chapter 5: the display. A twisted-nematic (TN) LCD segment in cross-section, and a BCD-to-7-segment
// decoder driving a big digit.
// - TN cell: two polarisers at 90°, liquid crystal between glass plates rubbed at 90°, so the molecules
//   form a quarter-turn helix that rotates the light's polarisation by 90° and lets it through. A voltage
//   of a few volts stands the molecules up along the field, the twist is lost, and the second polariser
//   blocks the light: the segment looks dark. (Schadt & Helfrich 1971; Wikipedia, "Twisted nematic field effect".)
// - Transmission vs voltage: modelled as a smooth step from threshold ≈ 1.5 V to saturation ≈ 3 V (typical
//   TN values for calculator displays, which run on about 3 V); real curves differ by mixture.
// - LCDs must be driven with AC (the average DC is kept at zero) or the liquid crystal is slowly damaged by
//   electrolysis; calculator chips flip the drive tens of times a second.
import { THREE, M, box, canvasTexture, swarm, smooth } from '../kit.js';
import { SEG, SEGS, segPolys, bin, board, panelBg, title, text, mono, COL, HEX, fitNarrow, makeLamp, beam } from '../calc.js';

const VTH = 1.5, VSAT = 3.0;
export const transmit = (V) => 1 - smooth((V - VTH) / (VSAT - VTH));

export default {
  id: 'display',
  short: 'The display',
  title: 'Seven segments of liquid crystal',
  subtitle: 'A digit is seven bars. Each bar is a sandwich that twists light, until a small voltage stops the twist.',
  view: { pos: [1.6, 6.2, 18.8], target: [1.6, 5.4, 0] },
  learn: `<p>Every digit on the calculator is made of just seven bars, <b>segments</b> a to g. Light the right ones and you get any digit from 0 to 9.</p>
    <p>The chip holds each digit as 4 bits of BCD (chapter 2). A small circuit called a <b>decoder</b> turns those 4 bits into 7 on/off signals, one per segment. For example segment a is on for 0, 2, 3, 5, 6, 7, 8 and 9. The <b>truth table</b> below lists all of them.</p>
    <p>How does a segment go dark? It's a sandwich (on the left). Light passes a <b>polariser</b>, which lets through only light vibrating one way. Between two glass plates, rod-shaped <b>liquid crystal</b> molecules are arranged in a gentle quarter-turn twist. The light follows the twist, turns 90°, and slips through the second polariser, which is turned 90° too. A mirror behind sends it back out: the segment looks pale, like the background.</p>
    <p>Put about 3 volts across a segment and the molecules stand up along the electric field. No twist, so the light isn't turned, and the second polariser blocks it: the segment goes <b>dark</b>. No light is made at all, which is why an LCD needs so little power. TVs use the same trick with a backlight and colour filters (see TVClear).</p>
    <p class="tip"><b>Try it:</b> slide the voltage up past 1.5 V and watch the molecules stand up. Then step through the digits and follow the highlighted row of the truth table.</p>`,
  terms: [
    { t: 'Segment', d: 'One of the seven bars that together draw a digit.' },
    { t: 'Decoder', d: 'A logic circuit that turns a 4-bit BCD digit into the seven segment signals.' },
    { t: 'Polariser', d: 'A filter that only lets through light vibrating in one direction.' },
    { t: 'Liquid crystal', d: 'A liquid whose rod-shaped molecules line up like a crystal and can be turned by an electric field.' },
    { t: 'Twisted nematic', d: 'The common LCD type, where the molecules twist a quarter turn from one glass plate to the other.' },
    { t: 'ITO', d: 'Indium tin oxide: a clear, conducting coating that forms the segment electrodes on the glass.' },
  ],
  defaults: { digit: 7, volts: 0 },
  controls: [
    { key: 'digit', type: 'range', label: 'Digit to show', min: 0, max: 9, step: 1, fmt: (v) => `${Math.round(v)} = ${bin(Math.round(v), 4)} in BCD` },
    { key: 'volts', type: 'range', label: 'Voltage across the segment', min: 0, max: 5, step: 0.05, ends: ['0 V', '5 V'], fmt: (v) => `${v.toFixed(2)} V` },
    { key: 'go', type: 'buttons', label: 'Quick set', items: [{ label: 'Segment off (0 V)', act: (s) => { s.volts = 0; } }, { label: 'Segment on (3 V)', act: (s) => { s.volts = 3; } }] },
  ],
  onChange(s) { s.digit = Math.round(s.digit); },
  quiz: [
    { q: 'How many segments make a calculator digit?', options: ['5', '7', '8', '10'], answer: 1, why: 'Seven bars, a to g, are enough to draw 0 to 9 (plus a separate decimal point).' },
    { q: 'What makes an LCD segment look dark?', options: ['It glows black', 'A voltage stops the twist, so the second polariser blocks the light', 'Ink flows into it', 'The mirror switches off'], answer: 1, why: 'Without the 90° twist the light keeps its direction and the crossed polariser stops it.' },
    { q: 'What does the decoder do?', options: ['Adds numbers', 'Turns 4 BCD bits into 7 segment signals', 'Charges the battery', 'Scans the keys'], answer: 1, why: 'It is a small block of logic gates with 4 inputs and 7 outputs, following the truth table.' },
  ],
  reel: [
    { ms: 5400, caption: 'An LCD segment twists light 90° between crossed polarisers; about 3 volts stands the crystals up and it goes dark.', set: { digit: 7 }, anim: { volts: [0, 3.4] }, view: { pos: [-5.0, 5.2, 7.2], target: [-5.0, 4.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---------------------------------------------------------------- the LCD sandwich (light goes along −X, into the display)
    const SX = -5.5, SY = 4.4, H = 3.2, D = 2.2;          // centre, plate height, plate depth
    const sand = new THREE.Group(); sand.position.set(SX, SY, -0.6); sand.rotation.y = -0.95; sand.scale.setScalar(1.15); root.add(sand);
    const stripes = (dir) => canvasTexture(256, 256, (g, W, Hh) => { g.fillStyle = 'rgba(40,50,70,.55)'; g.fillRect(0, 0, W, Hh); g.fillStyle = 'rgba(200,220,255,.55)'; for (let k = 0; k < 256; k += 16) dir ? g.fillRect(k, 0, 6, Hh) : g.fillRect(0, k, W, 6); });
    const plate = (x, tex, col, op = 0.35) => { const m = box(0.06, H, D, tex ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }) : M.clear(col, op)); m.position.x = x; sand.add(m); return m; };
    // x from the front (viewer, +x) to the back (mirror, −x)
    const X = { pol1: 2.6, glass1: 1.3, glass2: -1.3, pol2: -2.6, mirror: -3.3 };
    const P1 = plate(X.pol1, stripes(false).tex);      // horizontal lines → passes vertical (Y) polarisation
    // Front glass carries the segment electrode (ITO), rear glass the common electrode.
    const g1 = plate(X.glass1, null, 0xcfe8ff, 0.22), g2 = plate(X.glass2, null, 0xcfe8ff, 0.22);
    const ito1 = box(0.02, H * 0.55, D * 0.7, M.clear(0xffd166, 0.25)); ito1.position.x = X.glass1 - 0.05; sand.add(ito1);
    const ito2 = box(0.02, H * 0.9, D * 0.9, M.clear(0x8ef0ff, 0.18)); ito2.position.x = X.glass2 + 0.05; sand.add(ito2);
    const P2 = plate(X.pol2, stripes(true).tex);         // vertical lines → passes Z polarisation
    const mirror = box(0.08, H, D, M.metal(0xdfe6ee, { roughness: 0.15 })); mirror.position.x = X.mirror; sand.add(mirror);
    void P1; void P2; void g1; void g2;
    // Liquid crystal: rods in layers between the glass; layer k (0 at the front) is turned (k/(N−1))·90°.
    const NL = 9, NY = 5, NZ = 3, rods = swarm(NL * NY * NZ, new THREE.CapsuleGeometry(0.07, 0.34, 4, 8), M.plastic(0xc49bff, { roughness: 0.4 }));
    sand.add(rods);
    // Light: an incoming ray (front → mirror) and the return ray; polarisation shown by thin paddles.
    const beamIn = beam([4.6, 0.25, 0], [X.mirror, 0.25, 0], 0.05, M.glow(0xfff2c0, { transparent: true, opacity: 0.9 })); sand.add(beamIn);
    const beamOut = beam([X.mirror, -0.25, 0], [4.6, -0.25, 0], 0.05, M.glow(0xfff2c0, { transparent: true, opacity: 0.9 })); sand.add(beamOut);
    const paddles = [3.5, 2.0, 0.6, -0.6, -2.0].map((x) => { const p = box(0.03, 0.55, 0.05, M.glow(0xffd166)); p.position.set(x, 0.25, 0); sand.add(p); return p; });
    const eye = new THREE.Group(); eye.position.set(5.0, 0, 0); sand.add(eye);
    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), M.plastic(0xf2eee4)); eye.add(eyeBall);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), M.plastic(0x1b1e25)); pupil.position.x = -0.24; eye.add(pupil);
    // What the eye sees: a patch of display, pale or dark.
    const look = box(0.1, 0.9, 0.9, M.plastic(0xb9c3a6)); look.position.set(5.0, 1.1, 0); sand.add(look);
    const field = [-1, 1].map((sgn) => { const a = beam([X.glass1 - 0.1, sgn * 0.9, 0.9], [X.glass2 + 0.1, sgn * 0.9, 0.9], 0.03, M.glow(0xff7a59)); sand.add(a); return a; });
    // ---------------------------------------------------------------- the decoder and big digit
    const DX = 3.6;
    const dec = box(1.4, 3.0, 0.4, M.plastic(0x1b1e25, { roughness: 0.3 })); dec.position.set(DX - 3.6, 4.4, 0); root.add(dec);
    const bcdLamps = [0, 1, 2, 3].map((i) => makeLamp(root, [DX - 5.0, 5.55 - i * 0.75, 0], 0.2));
    const outLamps = [...SEGS].map((sg, i) => makeLamp(root, [DX - 2.55, 5.8 - i * 0.47, 0], 0.13));
    // Big digit: seven extruded bars on a pale LCD background.
    const bg = box(3.6, 6.0, 0.2, M.plastic(0xb9c3a6, { roughness: 0.6 })); bg.position.set(DX + 0.6, 4.4, -0.2); root.add(bg);
    const P = segPolys(2.2, 4.6, 0.42), segOff = M.plastic(0xa9b396, { roughness: 0.6 }), segOn = M.plastic(0x1c2118, { roughness: 0.35 });
    const segs = {};
    for (const sg of SEGS) {
      const sh = new THREE.Shape(); P[sg].forEach(([x, y], i) => { const X2 = x + (4.6 - y) * 0.1 - 1.1, Y2 = 2.3 - y; i ? sh.lineTo(X2, Y2) : sh.moveTo(X2, Y2); });
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), segOff); m.position.set(DX + 0.5, 4.4, -0.08); root.add(m); segs[sg] = m;
    }
    const segLabels = { a: [0, 2.55], b: [1.45, 1.25], c: [1.25, -1.2], d: [-0.2, -2.6], e: [-1.6, -1.2], f: [-1.45, 1.25], g: [0.2, 0.35] };
    const SL = Object.entries(segLabels).map(([k, [x, y]]) => stage.label(k, [DX + 0.5 + x, 4.4 + y, 0.2], root));
    const Ls = {
      pol1: stage.label('Polariser', [X.pol1, -H / 2 - 0.4, 0], sand),
      lc: stage.label('Liquid crystal', [0, H / 2 + 0.35, 0], sand, 'hot'),
      pol2: stage.label('Back polariser (90°) and mirror', [X.pol2 - 0.3, -H / 2 - 0.4, 0], sand),
      look: stage.label('What you see', [5.0, 1.95, 0], sand, 'hot'),
      dec: stage.label('Decoder', [DX - 3.6, 6.2, 0], root, 'hot'),
      bcd: stage.label('BCD in', [DX - 5.0, 2.55, 0], root),
      out: stage.label('a to g', [DX - 2.55, 2.5, 0], root),
    };
    // ---------------------------------------------------------------- truth table board
    const st = { d: -1 };
    const tt = board(root, 5.6, 6.4, 600, 686, (g, W, Hh) => {
      panelBg(g, W, Hh);
      text(g, 'Decoder truth table', 22, 44, { font: 'bold 34px sans-serif', col: '#e8eef8' });
      const segX = (k) => 228 + k * 51;
      text(g, 'BCD', 96, 96, { font: mono(26, true), col: 'rgba(255,255,255,.55)' });
      [...SEGS].forEach((sg, k) => text(g, sg, segX(k), 96, { font: mono(28, true), col: COL.sum, align: 'center' }));
      for (let d = 0; d <= 9; d++) {
        const y = 150 + d * 51, cur = d === st.d;
        if (cur) { g.fillStyle = 'rgba(255,209,102,.22)'; g.fillRect(10, y - 38, W - 20, 50); }
        const on = SEG[d];
        text(g, String(d), 30, y, { font: mono(32, true), col: cur ? COL.one : '#e8eef8' });
        text(g, bin(d, 4), 90, y, { font: mono(30, cur), col: cur ? COL.one : 'rgba(255,255,255,.8)' });
        [...SEGS].forEach((sg, k) => text(g, on.includes(sg) ? '1' : '0', segX(k), y, { font: mono(30, cur), col: on.includes(sg) ? COL.sum : 'rgba(255,255,255,.28)', align: 'center' }));
      }
      text(g, '1010 to 1111 are never used', 22, 672, { font: '24px sans-serif', col: 'rgba(255,255,255,.55)' });
    }, [9.2, 4.4, -0.4]);
    // ---------------------------------------------------------------- update
    let tilt = 0, t = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        fitNarrow(stage, [Ls.pol2, Ls.bcd, Ls.out, ...SL], -0.08);
        const T = transmit(s.volts);
        tilt += ((1 - T) - tilt) * Math.min(1, dt * 6);           // molecules take a moment to turn
        let i = 0;
        for (let k = 0; k < NL; k++) {
          const f = k / (NL - 1), twist = f * Math.PI / 2;
          // Molecules near the glass stay anchored; the middle ones stand up first and most.
          const edge = Math.sin(Math.PI * (0.08 + 0.84 * f)), up = tilt * edge;
          const x = 1.05 - f * 2.1;
          for (let yy = 0; yy < NY; yy++) for (let zz = 0; zz < NZ; zz++) {
            // Lying flat: long axis along Y (front) turning towards Z (back). Standing up: along X.
            // Object3D order XYZ applies Z first: tilt towards X (standing up), then the twist about X.
            rods.place(i++, [x, -1.2 + yy * 0.6, -0.7 + zz * 0.7], [twist, 0, (Math.PI / 2) * up]);
          }
        }
        rods.done();
        // Polarisation: vertical after the front polariser, turned by (1 − up)·90° through the crystal.
        const rot = (Math.PI / 2) * T;
        paddles[0].rotation.x = 0; paddles[1].rotation.x = 0; paddles[2].rotation.x = rot * 0.5; paddles[3].rotation.x = rot;
        const through = Math.sin(rot) ** 2;                       // Malus's law at the back polariser
        paddles[4].visible = through > 0.05; paddles[4].rotation.x = Math.PI / 2; paddles[4].scale.y = Math.max(0.05, through);
        beamIn.material.opacity = 0.9; beamOut.material.opacity = 0.9 * through; beamOut.visible = through > 0.03;
        const c = new THREE.Color(0x1c2118).lerp(new THREE.Color(0xb9c3a6), through); look.material.color.copy(c);
        field.forEach((f) => { f.visible = s.volts > 0.1; });
        // Decoder.
        const d = s.digit, bits = bin(d, 4), on = SEG[d];
        bcdLamps.forEach((l, k) => l.set(bits[k] === '1'));
        outLamps.forEach((l, k) => l.set(on.includes(SEGS[k]), '#8ef0ff'));
        for (const sg of SEGS) segs[sg].material = on.includes(sg) ? segOn : segOff;
        if (st.d !== d) { st.d = d; tt.redraw(); }
      },
      readout(s) {
        const T = transmit(s.volts), d = s.digit;
        return `<div class="big">${s.volts.toFixed(1)} V: segment ${T > 0.6 ? 'pale (off)' : T < 0.2 ? 'dark (on)' : 'turning grey'}</div>
          <div class="row"><span>Light back out</span><b>${Math.round(100 * Math.sin((Math.PI / 2) * T) ** 2)}%</b></div>
          <div class="row"><span>Digit ${d} in BCD</span><b>${bin(d, 4)}</b></div>
          <div class="row"><span>Segments on</span><b>${SEG[d].split('').join(' ')}</b></div>`;
      },
    };
  },
};
