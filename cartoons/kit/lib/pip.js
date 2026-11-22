// Pip: the hero. A 5-year-old with curly orange puffs, a yellow star dress and red sneakers.
// Kit.chars.pip.draw(ctx, st) with st:
//   x, y (feet), s, sx, sy (squash), rot (lean), facing (1 right / -1 left)
//   pose: 'stand' | 'walk' | 'jump' | 'tiptoe'   walk: cycle phase (radians)
//   eyes: 'open' | 'happy' | 'closed' | 'wide' | 'half'   blink 0..1   look -1..1   lookY -1..1
//   brows: 'neutral' | 'up' | 'worried' | 'sad' | 'cross' | 'determined'
//   mouth: 'smile' | 'grin' | 'open' | 'o' | 'gasp' | 'sad' | 'flat' | 'smirk'  or  { open, wide, smile }
//   talk: { open, wide } from the voice track (overrides the mouth while talking)
//   handL, handR: [x, y] local hand targets (feet = 0,0; head centre ~ 0,-430)
//   headRot, hair (puff bounce -1..1), blush 0..1, hold: (ctx, x, y) => draw a prop between the hands
(function () {
  const Kit = globalThis.Kit, D = Kit.D;
  Kit.chars = Kit.chars || {};

  const C = {
    skin: '#FFD6B5', skinShade: '#F0AE88', cheek: '#FF8A8A',
    hair: '#F38B3A', hairDark: '#C85A22', hairLight: '#FFB673',
    dress: '#FFD23F', dressShade: '#EDA62B', collar: '#FFFFFF', star: '#E8483B',
    shoe: '#E8483B', sole: '#FFFFFF', sock: '#FFFFFF', iris: '#94582F', irisDark: '#3D2213', brow: '#B4501E',
    clip: '#3FBF7F', mouth: '#7A2638', tongue: '#F27A8C',
  };
  const HEAD = [0, -430], HRX = 124, HRY = 114;
  const SH_L = [-54, -282], SH_R = [54, -282];

  const MOUTHS = {
    smile: { open: 0, wide: 0.6, smile: 1 }, grin: { open: 0.5, wide: 1, smile: 1, teeth: true }, open: { open: 0.75, wide: 0.55, smile: 0.7 },
    o: { open: 0.5, wide: 0, smile: 0 }, gasp: { open: 0.9, wide: 0.25, smile: -0.1 }, sad: { open: 0, wide: 0.5, smile: -1 },
    flat: { open: 0, wide: 0.45, smile: 0 }, smirk: { open: 0, wide: 0.6, smile: 0.6, smirk: true },
  };
  const BROWS = { neutral: [-3, 2, 0], up: [-14, -10, 0.1], worried: [-16, 6, 0], sad: [-12, 10, 0], cross: [10, -6, 0], determined: [6, -2, 0] };

  function mouth(ctx, cx, cy, m) {
    const open = m.open || 0, wide = m.wide ?? 0.5, smile = m.smile || 0;
    if (open < 0.06) {
      const w = 17 + wide * 9;
      const pts = m.smirk ? [[-w * 0.8, cy + 2], [0, cy + 6], [w * 1.1, cy - 6]] : [[-w, cy - smile * 4], [0, cy + smile * 9], [w, cy - smile * 4]];
      D.line(ctx, pts.map(([x, y]) => [cx + x, y]), { lw: 5.5 });
      return;
    }
    const W = 14 + 18 * wide + 6 * open, Hh = 8 + 34 * open;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(cx - W, cy - smile * 3);
      ctx.quadraticCurveTo(cx, cy - Hh * 0.22 + smile * 2, cx + W, cy - smile * 3);
      ctx.quadraticCurveTo(cx + W * 0.95, cy + Hh * 1.05, cx, cy + Hh * 1.08);
      ctx.quadraticCurveTo(cx - W * 0.95, cy + Hh * 1.05, cx - W, cy - smile * 3);
      ctx.closePath();
    };
    path(); D.paint(ctx, C.mouth, { lw: 0 });
    ctx.save(); path(); ctx.clip();
    D.ell(ctx, cx, cy + Hh * 0.95, W * 0.62, Hh * 0.42, C.tongue, { lw: 0 });
    if (m.teeth || open > 0.32) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx - W, cy - Hh, W * 2, Hh * 0.62 + 2); }
    ctx.restore();
    path(); D.paint(ctx, null, { lw: 5 });
  }

  function eye(ctx, ex, ey, side, st) {
    const kind = st.eyes || 'open';
    if (kind === 'happy') { D.line(ctx, [[ex - 24, ey + 8], [ex, ey - 14], [ex + 24, ey + 8]], { lw: 7 }); D.line(ctx, [[ex + side * 22, ey + 2], [ex + side * 32, ey - 4]], { lw: 4.5 }); return; }
    if (kind === 'closed') { D.line(ctx, [[ex - 23, ey - 2], [ex, ey + 10], [ex + 23, ey - 2]], { lw: 6.5 }); D.line(ctx, [[ex + side * 22, ey - 1], [ex + side * 31, ey + 4]], { lw: 4.5 }); return; }
    const big = kind === 'wide' ? 1.12 : 1, irisK = kind === 'wide' ? 0.8 : 1;
    const rx = 29 * big, ry = 36 * big;
    const lid = Math.max(st.blink || 0, kind === 'half' ? 0.45 : 0, st.lid || 0);
    const slant = (st.brows === 'sad' || st.brows === 'worried') && lid > 0.01 ? 12 : 0;
    const sclera = () => D.ellPath(ctx, ex, ey, rx, ry);
    sclera(); D.paint(ctx, D.lin(ctx, ex, ey - ry, ex, ey + ry, [[0, '#FFFFFF'], [1, '#E3E8F4']]), { lw: 0 });
    ctx.save(); sclera(); ctx.clip();
    const ix = ex + (st.look || 0) * 11, iy = ey + (st.lookY || 0) * 9 + 3;
    D.ell(ctx, ix, iy, 24 * irisK, 28 * irisK, D.rad(ctx, ix, iy - 6, 2, 30, [[0, D.light(C.iris, 0.25)], [0.6, C.iris], [1, C.irisDark]]), { lw: 0 });
    D.ell(ctx, ix, iy, 12 * irisK, 14 * irisK, '#1C0F08', { lw: 0 });
    D.ell(ctx, ix - 9, iy - 11, 9 * irisK, 9 * irisK, '#FFFFFF', { lw: 0 });
    D.ell(ctx, ix + 9, iy + 10, 4, 4, '#FFFFFF', { lw: 0 });
    D.ell(ctx, ix + 11, iy - 4, 2.4, 2.4, 'rgba(255,255,255,0.8)', { lw: 0 });
    // eyelid (blink, sleepy, sad droop)
    if (lid > 0.01) {
      const ly = ey - ry + 2 * ry * Math.min(1, lid);
      ctx.fillStyle = C.skin; ctx.beginPath(); ctx.moveTo(ex - rx - 2, ey - ry - 4); ctx.lineTo(ex + rx + 2, ey - ry - 4); ctx.lineTo(ex + rx + 2, ly + side * slant); ctx.quadraticCurveTo(ex, ly + 10, ex - rx - 2, ly - side * slant); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    sclera(); D.paint(ctx, null, { lw: 4 });
    // lash line on the lid edge + a flick at the outer corner
    const ly = ey - ry + 2 * ry * Math.min(1, lid);
    const a = Math.min(1, lid) > 0.95 ? 0 : 1;
    D.line(ctx, [[ex - rx * 0.92, ly + (lid > 0.01 ? 2 - side * slant : ry * 0.38)], [ex, lid > 0.01 ? ly + 10 : ly - 3], [ex + rx * 0.92, ly + (lid > 0.01 ? 2 + side * slant : ry * 0.38)]], { lw: 6 });
    if (a) D.line(ctx, [[ex + side * rx * 0.85, ly + (lid > 0.01 ? 2 : ry * 0.3)], [ex + side * (rx + 9), ly - 6 + (lid > 0.01 ? 6 : 0)]], { lw: 4.5 });
  }

  function hairPuff(ctx, x, y, r, phase) {
    D.cloudPath(ctx, x, y, r, r * 0.96, 8, 0.13, phase);
    D.paint(ctx, D.body(ctx, C.hair, x, y, r, r));
    ctx.save(); D.cloudPath(ctx, x, y, r, r * 0.96, 8, 0.13, phase); ctx.clip();
    for (let k = 0; k < 3; k++) { const a = phase + k * 2.1; D.line(ctx, [[x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45], [x + Math.cos(a + 0.5) * r * 0.62, y + Math.sin(a + 0.5) * r * 0.62]], { lw: 4, color: C.hairDark, alpha: 0.55 }); }
    ctx.restore();
  }

  function arm(ctx, S, hand, side) {
    const above = hand[1] < S[1] - 30;
    const bend = side < 0 ? (above ? -1 : 1) : (above ? 1 : -1);
    const [a, e, h] = D.ik(S, hand, 76, 72, bend);
    D.limb(ctx, [a, e, h], 27, C.skin);
    // mitten hand + thumb
    const ang = Math.atan2(h[1] - e[1], h[0] - e[0]);
    const tx = h[0] + Math.cos(ang - side * 1.4) * 14, ty = h[1] + Math.sin(ang - side * 1.4) * 14;
    D.ell(ctx, tx, ty, 8, 8, C.skin, { lw: 4 });
    D.ell(ctx, h[0], h[1], 19, 19, D.body(ctx, C.skin, h[0], h[1], 19, 19), { lw: 4.5 });
    return h;
  }

  function legs(ctx, st) {
    const pose = st.pose || 'stand';
    const out = [];
    for (const sd of [-1, 1]) {
      const hip = [sd * 26, -122];
      let foot = [sd * 30, -16], bend = 1;
      if (pose === 'walk') { const p = (st.walk || 0) + (sd > 0 ? Math.PI : 0); foot = [sd * 26 + Math.sin(p) * 26, -16 - Math.max(0, Math.cos(p)) * 26]; }
      if (pose === 'jump') foot = [sd * 40, -58];
      if (pose === 'tiptoe') foot = [sd * 26, -26];
      const [h, k, f] = D.ik(hip, foot, 56, 56, sd * bend * (pose === 'jump' ? 1 : 0.3));
      D.limb(ctx, [h, k, f], 30, C.skin);
      D.limb(ctx, [[f[0], f[1] - 16], f], 31, C.sock, { lw: 4.5 });
      out.push(f);
    }
    for (const [i, f] of out.entries()) {
      const sd = i ? 1 : -1;
      const sx = f[0] + sd * 8, sy = f[1] + 4;
      D.ell(ctx, sx, sy, 36, 21, D.body(ctx, C.shoe, sx, sy, 36, 21), { lw: 5 });
      ctx.save(); D.ellPath(ctx, sx, sy, 36, 21); ctx.clip(); ctx.fillStyle = C.sole; ctx.fillRect(sx - 40, sy + 9, 80, 14); ctx.restore();
      D.ellPath(ctx, sx, sy, 36, 21); D.paint(ctx, null, { lw: 5 });
      D.shine(ctx, sx - 14, sy - 9, 7, 0.75);
    }
  }

  function dressPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-34, -306);
    ctx.quadraticCurveTo(-54, -302, -60, -286);
    ctx.lineTo(-64, -262);
    ctx.quadraticCurveTo(-92, -190, -116, -128);
    ctx.quadraticCurveTo(0, -102, 116, -128);
    ctx.quadraticCurveTo(92, -190, 64, -262);
    ctx.lineTo(60, -286);
    ctx.quadraticCurveTo(54, -302, 34, -306);
    ctx.quadraticCurveTo(0, -294, -34, -306);
    ctx.closePath();
  }

  function draw(ctx, st) {
    const s = st.s || 1, f = st.facing || 1;
    ctx.save();
    ctx.translate(st.x, st.y);
    D.shadow(ctx, 0, 6, 118 * s * (st.shadowK || 1), 17 * s * (st.shadowK || 1), 0.24 * (st.shadowA ?? 1));
    ctx.scale(s * (st.sx || 1) * f, s * (st.sy || 1));
    ctx.rotate((st.rot || 0) * f);
    const bob = st.pose === 'walk' ? -Math.abs(Math.sin(st.walk || 0)) * 9 : 0;
    ctx.translate(0, bob);
    const breathe = 1 + 0.012 * Math.sin((st.t || 0) * 2.4);
    const hair = st.hair || 0;
    const handL = st.handL || [-80, -138], handR = st.handR || [80, -138];
    const headRot = st.headRot || 0;

    // --- head group transform helper (pivot at the neck) ---
    const withHead = (fn) => { ctx.save(); ctx.translate(0, -300); ctx.rotate(headRot); ctx.translate(0, 300); fn(); ctx.restore(); };

    // back hair + puffs (behind everything)
    withHead(() => {
      D.cloudPath(ctx, 0, -466, 136, 118, 11, 0.07, 0.2);
      D.paint(ctx, D.body(ctx, C.hair, 0, -470, 136, 118));
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * 150, -480 + hair * 9); ctx.rotate(sd * hair * 0.12);
        hairPuff(ctx, 0, 0, 64, sd * 0.7);
        ctx.restore();
      }
    });

    legs(ctx, st);

    // dress
    ctx.save(); ctx.translate(0, -200); ctx.scale(breathe, 1 / breathe); ctx.translate(0, 200);
    dressPath(ctx); D.paint(ctx, D.lin(ctx, 0, -306, 0, -110, [[0, D.light(C.dress, 0.2)], [1, C.dress]]), { lw: 0 });
    ctx.save(); dressPath(ctx); ctx.clip();
    ctx.fillStyle = D.lin(ctx, -116, 0, 116, 0, [[0, 'rgba(255,255,255,0.22)'], [0.4, 'rgba(255,255,255,0)'], [0.62, 'rgba(0,0,0,0)'], [1, D.rgba(C.dressShade, 0.85)]]); ctx.fillRect(-130, -320, 260, 220);
    ctx.fillStyle = D.rgba(C.dressShade, 0.9); ctx.fillRect(-130, -140, 260, 40); // hem band
    D.line(ctx, [[-30, -230], [-46, -170], [-60, -126]], { lw: 3.5, color: C.dressShade, alpha: 0.7 });
    D.line(ctx, [[34, -228], [52, -168], [66, -126]], { lw: 3.5, color: C.dressShade, alpha: 0.7 });
    ctx.restore();
    dressPath(ctx); D.paint(ctx, null);
    D.starPath(ctx, 0, -212, 31, 0); D.paint(ctx, D.rad(ctx, -8, -222, 2, 36, [[0, D.light(C.star, 0.3)], [1, C.star]]), { lw: 4.5 });
    D.shine(ctx, -9, -224, 6, 0.6);
    ctx.restore();

    // held prop sits between the hands, under the fingers
    if (st.hold) st.hold(ctx, (handL[0] + handR[0]) / 2, (handL[1] + handR[1]) / 2 - 8);

    const lowL = handL[1] > -300, lowR = handR[1] > -300;
    if (lowL) arm(ctx, SH_L, handL, -1);
    if (lowR) arm(ctx, SH_R, handR, 1);
    // puff sleeves + collar
    for (const sd of [-1, 1]) D.ell(ctx, sd * 58, -276, 23, 20, D.body(ctx, C.dress, sd * 58, -276, 23, 20), { lw: 5 });
    for (const sd of [-1, 1]) D.ell(ctx, sd * 19, -300, 24, 13, D.lin(ctx, 0, -312, 0, -288, [[0, '#FFFFFF'], [1, '#DDE3F0']]), { lw: 4.5, rot: sd * 0.38 });

    // head
    withHead(() => {
      D.rr(ctx, -15, -330, 30, 34, 12, C.skinShade, { lw: 4.5 });
      D.ellPath(ctx, HEAD[0], HEAD[1], HRX, HRY); D.paint(ctx, D.body(ctx, C.skin, HEAD[0], HEAD[1], HRX, HRY));
      // soft shadow under the fringe
      ctx.save(); D.ellPath(ctx, HEAD[0], HEAD[1], HRX, HRY); ctx.clip();
      ctx.fillStyle = D.lin(ctx, 0, -500, 0, -430, [[0, 'rgba(200,90,60,0.32)'], [1, 'rgba(200,90,60,0)']]); ctx.fillRect(-140, -520, 280, 100);
      ctx.restore();
      // cheeks
      for (const sd of [-1, 1]) { ctx.fillStyle = D.rad(ctx, sd * 80, -384, 0, 30, [[0, D.rgba(C.cheek, 0.55 * (st.blush ?? 0.8))], [1, D.rgba(C.cheek, 0)]]); ctx.fillRect(sd * 80 - 32, -416, 64, 64); }
      // eyes
      for (const sd of [-1, 1]) eye(ctx, sd * 47, -418, sd, st);
      // brows
      const b = BROWS[st.brows || 'neutral'] || BROWS.neutral;
      const raise = (st.eyes === 'wide' ? -10 : 0) + b[2] * -60;
      for (const sd of [-1, 1]) D.line(ctx, [[sd * 28, -486 + b[0] + raise], [sd * 48, -494 + (b[0] + b[1]) / 2 + raise], [sd * 68, -488 + b[1] + raise]], { lw: 7, color: C.brow });
      // nose + mouth
      D.line(ctx, [[-7, -392], [0, -386], [7, -392]], { lw: 4.5, color: '#D98E68' });
      const m = st.talk && st.talk.open > 0.02 ? { ...st.talk, smile: (MOUTHS[st.mouth] || {}).smile ?? 0.5 } : (typeof st.mouth === 'object' ? st.mouth : (MOUTHS[st.mouth || 'smile'] || MOUTHS.smile));
      mouth(ctx, 0, -356, m);
      // fringe: curly bangs across the forehead
      ctx.beginPath();
      ctx.moveTo(-122, -428);
      ctx.bezierCurveTo(-132, -520, -60, -560, 0, -558);
      ctx.bezierCurveTo(60, -560, 132, -520, 122, -428);
      const sc = [[96, -474], [58, -462], [18, -476], [-24, -462], [-64, -476], [-104, -458]];
      let px = 122, py = -428;
      for (const [qx, qy] of sc) { ctx.quadraticCurveTo((px + qx) / 2, Math.max(py, qy) + 16, qx, qy); px = qx; py = qy; }
      ctx.quadraticCurveTo(-116, -440, -122, -428);
      ctx.closePath();
      D.paint(ctx, D.lin(ctx, 0, -560, 0, -440, [[0, C.hairLight], [0.5, C.hair], [1, C.hairDark]]));
      D.line(ctx, [[-70, -530], [-40, -540], [-20, -520]], { lw: 4, color: C.hairDark, alpha: 0.5 });
      D.line(ctx, [[20, -540], [50, -538], [70, -516]], { lw: 4, color: C.hairDark, alpha: 0.5 });
      D.shine(ctx, -50, -536, 14, 0.35);
      // hair clip (a little green bow on her left puff)
      ctx.save(); ctx.translate(-112, -530); ctx.rotate(-0.4);
      D.poly(ctx, [[0, 0], [-22, -14], [-22, 14]], C.clip, { lw: 4 }); D.poly(ctx, [[0, 0], [22, -14], [22, 14]], C.clip, { lw: 4 }); D.ell(ctx, 0, 0, 8, 8, D.light(C.clip, 0.2), { lw: 4 });
      ctx.restore();
    });

    if (!lowL) arm(ctx, SH_L, handL, -1);
    if (!lowR) arm(ctx, SH_R, handR, 1);
    ctx.restore();
  }

  // where things are in world space (for props held in the hands, effects above the head)
  function anchors(st) {
    const s = st.s || 1, f = st.facing || 1;
    const hl = st.handL || [-80, -138], hr = st.handR || [80, -138];
    const mid = [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 8];
    const P = ([lx, ly]) => [st.x + lx * s * f * (st.sx || 1), st.y + ly * s * (st.sy || 1)];
    return { hands: P(mid), head: P([0, -600]), face: P([0, -420]), mouth: P([0, -356]), feet: [st.x, st.y] };
  }

  Kit.chars.pip = { draw, anchors, C, height: 600 };
})();
