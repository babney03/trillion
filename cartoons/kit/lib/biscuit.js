// Biscuit: the puppy. Tan, floppy brown ears, white muzzle, a brown patch over one eye,
// red collar with a gold bell. Never talks: yips, ears, tail and eyebrows do the acting.
// Kit.chars.biscuit.draw(ctx, st) with st:
//   x, y (ground), s, sx, sy, rot, facing (1 right / -1 left; matters when standing)
//   pose: 'sit' | 'stand' | 'leap' | 'flop' | 'beg'   walk: trot phase (radians, stand only)
//   eyes: 'open' | 'happy' | 'closed' | 'wide' | 'sad'   blink, look, lookY
//   brows: 'neutral' | 'up' | 'sad' | 'worried'   mouth: 'smile' | 'open' | 'pant' | 'bark' | 'sad' | 'o'
//   open: 0..1 (bark/yip mouth)   ears: -1 droopy .. 1 perky   earSwing: radians   wag: 0..1 tail energy
//   headTilt (radians), blush, t (time, for the idle wobble)
(function () {
  const Kit = globalThis.Kit, D = Kit.D;
  Kit.chars = Kit.chars || {};
  const C = {
    fur: '#E9AE6C', furShade: '#C7864A', cream: '#FFF6E6', ear: '#8C5631', patch: '#B97C45',
    nose: '#2E2026', collar: '#E8483B', bell: '#F6C445', tongue: '#F27A8C', mouth: '#5A2230', eye: '#1D1317',
  };

  function head(ctx, st, hx, hy, k = 1) {
    const t = st.t || 0;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(st.headTilt || 0); ctx.scale(k, k);
    const ears = st.ears ?? 0, swing = st.earSwing || 0;
    // ears (behind the head edge, hanging)
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 70, -40); ctx.rotate(sd * (0.18 - ears * 0.32) + swing * (sd > 0 ? 1 : 0.8) + Math.sin(t * 2.2 + sd) * 0.03);
      const pts = [[0, -6], [sd * 26, 4], [sd * 40, 56], [sd * 32, 106], [sd * 8, 122], [sd * -12, 98], [sd * -14, 34]];
      D.shape(ctx, pts, D.lin(ctx, 0, 0, 0, 120, [[0, D.light(C.ear, 0.15)], [1, D.dark(C.ear, 0.15)]]));
      ctx.restore();
    }
    // head
    D.ellPath(ctx, 0, 0, 94, 82); D.paint(ctx, D.body(ctx, C.fur, 0, 0, 94, 82), { lw: 0 });
    ctx.save(); D.ellPath(ctx, 0, 0, 94, 82); ctx.clip();
    D.ell(ctx, -38, -24, 36, 31, D.rgba(C.patch, 0.85), { lw: 0 }); // the eye patch
    ctx.fillStyle = D.lin(ctx, 0, -82, 0, 82, [[0, 'rgba(255,255,255,0.12)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(90,40,30,0.14)']]); ctx.fillRect(-100, -90, 200, 180);
    ctx.restore();
    D.ellPath(ctx, 0, 0, 94, 82); D.paint(ctx, null);
    // little tuft on top
    D.shape(ctx, [[-16, -78], [-6, -100], [2, -84], [12, -104], [20, -78]], C.fur, { closed: false, lw: 5 });
    // muzzle
    D.ell(ctx, 0, 48, 24, 15, C.cream, { lw: 4.5 });
    const open = Math.max(st.open || 0, st.mouth === 'open' ? 0.55 : st.mouth === 'pant' ? 0.45 : st.mouth === 'bark' ? 0.9 : st.mouth === 'o' ? 0.35 : 0);
    if (open > 0.06) {
      const mh = 8 + 26 * open;
      D.ell(ctx, 0, 40 + mh * 0.45, 20, mh * 0.55, C.mouth, { lw: 4.5 });
      ctx.save(); D.ellPath(ctx, 0, 40 + mh * 0.45, 20, mh * 0.55); ctx.clip(); D.ell(ctx, 0, 40 + mh * 0.9, 13, 10, C.tongue, { lw: 0 }); ctx.restore();
      if (st.mouth === 'pant') { D.ell(ctx, 4, 40 + mh + 10, 12, 17, C.tongue, { lw: 4 }); D.line(ctx, [[4, 40 + mh], [4, 40 + mh + 18]], { lw: 3, color: D.dark(C.tongue, 0.3) }); }
    }
    for (const sd of [-1, 1]) D.ell(ctx, sd * 22, 30, 36, 27, D.lin(ctx, 0, 6, 0, 56, [[0, '#FFFFFF'], [1, C.cream]]), { lw: 0 });
    ctx.save(); for (const sd of [-1, 1]) { D.ellPath(ctx, sd * 22, 30, 36, 27); ctx.lineWidth = 4.5; ctx.strokeStyle = D.INK; ctx.stroke(); } ctx.restore();
    for (const sd of [-1, 1]) D.ell(ctx, sd * 22, 30, 34.5, 25.5, D.lin(ctx, 0, 6, 0, 56, [[0, '#FFFFFF'], [1, C.cream]]), { lw: 0 });
    if (open <= 0.06) {
      const sm = st.mouth === 'sad' ? -1 : 1;
      D.line(ctx, [[0, 18], [0, 30]], { lw: 4.5 });
      D.line(ctx, [[-24, 30 - sm * 4], [-12, 36 + sm * 2], [0, 30]], { lw: 4.5 });
      D.line(ctx, [[0, 30], [12, 36 + sm * 2], [24, 30 - sm * 4]], { lw: 4.5 });
    }
    // nose
    D.shape(ctx, [[-20, 8], [0, 3], [20, 8], [9, 24], [-9, 24]], D.rad(ctx, -6, 6, 1, 26, [[0, '#5A4650'], [1, C.nose]]), { lw: 4 });
    D.shine(ctx, -7, 9, 6, 0.8);
    // cheeks
    for (const sd of [-1, 1]) { ctx.fillStyle = D.rad(ctx, sd * 62, 22, 0, 18, [[0, 'rgba(255,130,140,0.45)'], [1, 'rgba(255,130,140,0)']]); ctx.fillRect(sd * 62 - 20, 2, 40, 40); }
    // eyes
    const kind = st.eyes || 'open';
    for (const sd of [-1, 1]) {
      const ex = sd * 38, ey = -22;
      if (kind === 'happy') { D.line(ctx, [[ex - 16, ey + 6], [ex, ey - 10], [ex + 16, ey + 6]], { lw: 7 }); continue; }
      if (kind === 'closed') { D.line(ctx, [[ex - 15, ey], [ex, ey + 8], [ex + 15, ey]], { lw: 6 }); continue; }
      const k2 = kind === 'wide' ? 1.15 : 1;
      const lx = (st.look || 0) * 6, ly = (st.lookY || 0) * 5;
      D.ell(ctx, ex + lx, ey + ly, 16 * k2, 20 * k2, D.rad(ctx, ex + lx - 4, ey + ly - 6, 1, 22, [[0, '#4A3438'], [1, C.eye]]), { lw: 3 });
      D.ell(ctx, ex + lx - 5, ey + ly - 7, 6 * k2, 6 * k2, '#FFFFFF', { lw: 0 });
      D.ell(ctx, ex + lx + 6, ey + ly + 7, 2.6, 2.6, '#FFFFFF', { lw: 0 });
      const lid = Math.max(st.blink || 0, kind === 'sad' ? 0.3 : 0);
      if (lid > 0.02) {
        ctx.save(); D.ellPath(ctx, ex + lx, ey + ly, 17 * k2, 21 * k2); ctx.clip();
        ctx.fillStyle = sd < 0 ? C.patch : C.fur;
        const yl = ey + ly - 21 * k2 + 42 * k2 * lid;
        ctx.beginPath(); ctx.moveTo(ex - 30, ey - 40); ctx.lineTo(ex + 30, ey - 40); ctx.lineTo(ex + 30, yl + (kind === 'sad' ? sd * 7 : 0)); ctx.lineTo(ex - 30, yl - (kind === 'sad' ? sd * 7 : 0)); ctx.closePath(); ctx.fill();
        ctx.restore();
        D.line(ctx, [[ex - 16, ey + ly - 21 * k2 + 42 * k2 * lid - (kind === 'sad' ? sd * 5 : 0)], [ex + 16, ey + ly - 21 * k2 + 42 * k2 * lid + (kind === 'sad' ? sd * 5 : 0)]], { lw: 4.5 });
      }
    }
    // eyebrows (little fur dashes that do the acting)
    const B = { neutral: [0, 0], up: [-10, -10], sad: [-10, 6], worried: [-12, 2] }[st.brows || 'neutral'] || [0, 0];
    for (const sd of [-1, 1]) D.line(ctx, [[sd * 24, -54 + B[0]], [sd * 52, -56 + B[1]]], { lw: 7, color: sd < 0 ? D.dark(C.patch, 0.35) : C.furShade });
    ctx.restore();
  }

  function collar(ctx, x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    D.rr(ctx, -52, -10, 104, 20, 10, D.lin(ctx, 0, -10, 0, 10, [[0, D.light(C.collar, 0.2)], [1, D.dark(C.collar, 0.12)]]), { lw: 4.5 });
    D.ell(ctx, 0, 20, 14, 14, D.rad(ctx, -4, 14, 1, 16, [[0, '#FFF1B0'], [0.5, C.bell], [1, '#C58C1C']]), { lw: 4 });
    D.line(ctx, [[-7, 24], [7, 24]], { lw: 3 });
    D.shine(ctx, -5, 15, 4, 0.9);
    ctx.restore();
  }

  function tail(ctx, bx, by, st, dir = 1) {
    const t = st.t || 0, w = st.wag ?? 0.6;
    const a = Math.sin(t * (5 + w * 13)) * (0.15 + w * 0.5);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a * dir);
    const pts = [[0, 0], [dir * 34, -14], [dir * 52, -52], [dir * 44, -92]];
    D.limb(ctx, pts, 22, C.fur);
    D.ell(ctx, dir * 44, -94, 13, 13, C.cream, { lw: 4.5 });
    ctx.restore();
  }

  function paw(ctx, x, y, rx = 26, ry = 16) {
    D.ell(ctx, x, y, rx, ry, D.lin(ctx, 0, y - ry, 0, y + ry, [[0, '#FFFFFF'], [1, C.cream]]));
    D.line(ctx, [[x - 7, y + 2], [x - 7, y + ry - 3]], { lw: 3 }); D.line(ctx, [[x + 7, y + 2], [x + 7, y + ry - 3]], { lw: 3 });
  }

  function draw(ctx, st) {
    const s = st.s || 1, f = st.facing || 1, pose = st.pose || 'sit';
    ctx.save();
    ctx.translate(st.x, st.y);
    D.shadow(ctx, 0, 6, (pose === 'stand' || pose === 'flop' ? 150 : 110) * s * (st.shadowK || 1), 18 * s * (st.shadowK || 1), 0.24 * (st.shadowA ?? 1));
    ctx.scale(s * (st.sx || 1), s * (st.sy || 1));
    ctx.rotate(st.rot || 0);
    const t = st.t || 0, breathe = 1 + 0.015 * Math.sin(t * 3);

    if (pose === 'sit' || pose === 'beg') {
      tail(ctx, 56, -46, st, 1);
      for (const sd of [-1, 1]) D.ell(ctx, sd * 50, -46, 52, 44, D.body(ctx, C.fur, sd * 50, -46, 52, 44));
      for (const sd of [-1, 1]) paw(ctx, sd * 74, -14, 30, 15);
      ctx.save(); ctx.translate(0, -90); ctx.scale(breathe, 1 / breathe); ctx.translate(0, 90);
      const body = [[-62, -18], [-72, -84], [-50, -150], [0, -180], [50, -150], [72, -84], [62, -18], [0, -8]];
      D.shape(ctx, body, D.body(ctx, C.fur, 0, -100, 72, 90));
      D.shape(ctx, [[-44, -150], [-50, -112], [-26, -84], [0, -76], [26, -84], [50, -112], [44, -150], [0, -170]], D.lin(ctx, 0, -170, 0, -76, [[0, '#FFFFFF'], [1, C.cream]]), { lw: 0 });
      ctx.restore();
      if (pose === 'beg') {
        for (const sd of [-1, 1]) { D.limb(ctx, [[sd * 30, -124], [sd * 46, -146], [sd * 30, -168]], 30, C.fur); paw(ctx, sd * 28, -172, 22, 15); }
      } else {
        for (const sd of [-1, 1]) { D.limb(ctx, [[sd * 34, -96], [sd * 34, -60], [sd * 32, -26]], 36, C.fur); paw(ctx, sd * 32, -16, 28, 17); }
      }
      collar(ctx, 0, -172, 0);
      head(ctx, st, 0, -262);
    } else if (pose === 'stand' || pose === 'leap') {
      ctx.scale(f, 1);
      const leap = pose === 'leap';
      const ph = st.walk || 0;
      const legA = (o) => leap ? (o < 2 ? -0.95 : 0.9) : Math.sin(ph + [0, Math.PI, Math.PI, 0][o]) * 0.42 * (st.walk !== undefined ? 1 : 0);
      ctx.rotate(leap ? -0.18 : 0);
      tail(ctx, -104, -150, st, -1);
      const legs = [[-70, -112], [-40, -110], [48, -110], [78, -112]];
      // far legs first (darker)
      for (const o of [1, 2]) { const [lx, ly] = legs[o]; const a = legA(o); const fx = lx + Math.sin(a) * 92, fy = ly + Math.cos(a) * 92; D.limb(ctx, [[lx, ly], [fx, fy]], 26, C.furShade); paw(ctx, fx, fy + 2, 22, 13); }
      D.ell(ctx, -6, -132, 116, 62, D.body(ctx, C.fur, -6, -132, 116, 62));
      ctx.save(); D.ellPath(ctx, -6, -132, 116, 62); ctx.clip(); D.ell(ctx, 0, -86, 80, 28, C.cream, { lw: 0 }); ctx.restore();
      D.ellPath(ctx, -6, -132, 116, 62); D.paint(ctx, null);
      for (const o of [0, 3]) { const [lx, ly] = legs[o]; const a = legA(o); const fx = lx + Math.sin(a) * 92, fy = ly + Math.cos(a) * 92; D.limb(ctx, [[lx, ly], [fx, fy]], 28, C.fur); paw(ctx, fx, fy + 2, 24, 14); }
      collar(ctx, 76, -168, -0.9);
      head(ctx, { ...st, look: (st.look ?? 0.5) }, 104, -214, 0.96);
    } else if (pose === 'flop') {
      ctx.scale(f, 1);
      tail(ctx, -110, -40, { ...st, wag: 0.05 }, -1);
      D.ell(ctx, -10, -52, 124, 48, D.body(ctx, C.fur, -10, -52, 124, 48));
      for (const sd of [0, 1]) paw(ctx, 70 + sd * 44, -14, 28, 15);
      collar(ctx, 66, -96, -0.5);
      head(ctx, { ...st, ears: -1 }, 92, -118, 0.95);
    }
    ctx.restore();
  }

  // world-space anchors (mouth: where a carried prop sits; head: effects above)
  function anchors(st) {
    const s = st.s || 1, f = st.facing || 1, pose = st.pose || 'sit';
    const k = (lx, ly) => [st.x + lx * s * (st.sx || 1), st.y + ly * s * (st.sy || 1)];
    if (pose === 'stand' || pose === 'leap') return { mouth: k(f * 104, -170), head: k(f * 104, -330), face: k(f * 104, -214), feet: [st.x, st.y] };
    if (pose === 'flop') return { mouth: k(f * 92, -80), head: k(f * 92, -230), face: k(f * 92, -118), feet: [st.x, st.y] };
    return { mouth: k(0, -212), head: k(0, -390), face: k(0, -262), feet: [st.x, st.y], hands: k(0, -170) };
  }

  Kit.chars.biscuit = { draw, anchors, C, height: 360 };
})();
