// Kit.D: clean "modern preschool 2D" drawing helpers. Smooth bezier shapes, soft gradient shading,
// one consistent warm outline. (The engine's G.* is a boiling-pencil look; the kit draws crisp.)
// Browser only. Everything is a pure function of its arguments (no state between frames).
(function () {
  const Kit = (globalThis.Kit = globalThis.Kit || {});
  const D = (Kit.D = {});
  D.INK = '#3B2A24';
  D.LW = 5.5;

  // ---------- colour ----------
  const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  D.mix = (a, b, k) => { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); };
  D.light = (c, k) => D.mix(c, '#FFFFFF', k);
  D.dark = (c, k) => D.mix(c, '#2A1A3A', k); // shade toward a warm purple, not grey: keeps colours rich
  D.rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

  // ---------- gradients ----------
  D.lin = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  D.rad = (ctx, x, y, r0, r1, stops, fx, fy) => { const g = ctx.createRadialGradient(fx ?? x, fy ?? y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  // a body-colour fill lit from the upper left: light rim -> base -> shaded far side
  D.body = (ctx, c, x, y, rx, ry) => D.rad(ctx, x - rx * 0.35, y - ry * 0.4, 0, Math.max(rx, ry) * 1.55, [[0, D.light(c, 0.32)], [0.45, c], [1, D.dark(c, 0.28)]]);

  // ---------- paths ----------
  D.ellPath = (ctx, x, y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); };
  D.rrPath = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  // smooth closed curve through points (Catmull-Rom -> bezier)
  D.smooth = (ctx, pts, closed = true, tension = 0.5) => {
    const n = pts.length;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const k = tension / 3;
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  };
  // curly "cloud" outline (hair, bushes, smoke): n bumps around an ellipse
  D.cloudPath = (ctx, x, y, rx, ry, n, depth = 0.18, phase = 0) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = phase + (i / n) * Math.PI * 2, a1 = phase + ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      const p0 = [x + Math.cos(a0) * rx, y + Math.sin(a0) * ry], p1 = [x + Math.cos(a1) * rx, y + Math.sin(a1) * ry];
      const c = [x + Math.cos(am) * rx * (1 + depth * 2.2), y + Math.sin(am) * ry * (1 + depth * 2.2)];
      if (i === 0) ctx.moveTo(p0[0], p0[1]);
      ctx.quadraticCurveTo(c[0], c[1], p1[0], p1[1]);
    }
    ctx.closePath();
  };
  D.starPath = (ctx, x, y, r, rot = 0, inner = 0.48, n = 5) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot - Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r * inner : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  };
  D.heartPath = (ctx, x, y, s) => {
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.55, y - s * 1.05, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.55, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
    ctx.closePath();
  };

  // ---------- fill + outline ----------
  // D.fill(ctx, () => path, fill, { lw, ink, alpha, inkAlpha }) : fill then stroke the current path
  D.paint = (ctx, fill, { lw = D.LW, ink = D.INK, alpha = 1 } = {}) => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.restore();
  };
  D.ell = (ctx, x, y, rx, ry, fill, o) => { D.ellPath(ctx, x, y, rx, ry, o && o.rot); D.paint(ctx, fill, o); };
  D.rr = (ctx, x, y, w, h, r, fill, o) => { D.rrPath(ctx, x, y, w, h, r); D.paint(ctx, fill, o); };
  D.shape = (ctx, pts, fill, o = {}) => { D.smooth(ctx, pts, o.closed !== false, o.tension ?? 0.5); D.paint(ctx, fill, o); };
  D.poly = (ctx, pts, fill, o) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); D.paint(ctx, fill, o); };
  D.line = (ctx, pts, { lw = D.LW, color = D.INK, alpha = 1, smooth = true } = {}) => {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (smooth && pts.length > 2) D.smooth(ctx, pts, false); else { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); }
    ctx.stroke(); ctx.restore();
  };
  // a limb: ink stroke underneath, colour stroke on top (round caps) -> a clean outlined tube
  D.limb = (ctx, pts, w, color, { ink = D.INK, lw = D.LW } = {}) => {
    const path = () => { if (pts.length > 2) D.smooth(ctx, pts, false); else { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); } };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    path(); ctx.strokeStyle = ink; ctx.lineWidth = w + lw * 2; ctx.stroke();
    path(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    ctx.restore();
  };
  // inside-only shading: clip to the current path and paint a soft shadow side + light rim
  D.shadeInside = (ctx, pathFn, { x, y, w, h, dir = 1, shadow = 'rgba(60,20,80,0.16)', light = 'rgba(255,255,255,0.22)' }) => {
    ctx.save(); pathFn(); ctx.clip();
    ctx.fillStyle = D.lin(ctx, x - w * 0.5 * dir, y, x + w * 0.5 * dir, y, [[0, light], [0.45, 'rgba(255,255,255,0)'], [0.7, 'rgba(0,0,0,0)'], [1, shadow]]);
    ctx.fillRect(x - w, y - h, w * 2, h * 2);
    ctx.restore();
  };
  D.shadow = (ctx, x, y, rx, ry = rx * 0.16, a = 0.22) => {
    ctx.save(); ctx.fillStyle = D.rad(ctx, x, y, 0, rx, [[0, `rgba(40,20,50,${a})`], [0.7, `rgba(40,20,50,${a * 0.6})`], [1, 'rgba(40,20,50,0)']]);
    ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  // white specular dot / streak (the "glossy" read)
  D.shine = (ctx, x, y, r, a = 0.85) => { ctx.save(); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };

  // ---------- 2-bone IK (arms, legs): returns [shoulder, elbow, hand]; bend +1/-1 picks the side ----------
  D.ik = (S, P, a, b, bend) => {
    let dx = P[0] - S[0], dy = P[1] - S[1];
    let d = Math.hypot(dx, dy) || 1e-3;
    const max = (a + b) * 0.995;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
    const ang = Math.atan2(dy, dx) + bend * Math.acos(cosA);
    return [S, [S[0] + Math.cos(ang) * a, S[1] + Math.sin(ang) * a], [S[0] + dx, S[1] + dy]];
  };

  // ---------- text with a chunky outline (titles, pop words) ----------
  D.title = (ctx, str, x, y, { size = 120, fam = 'Bungee', color = '#FFFFFF', ink = D.INK, stroke = 14, align = 'center', shadow = true, rot = 0 } = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.font = `400 ${size}px ${fam}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (shadow) { ctx.fillStyle = 'rgba(40,20,60,0.25)'; ctx.fillText(str, 6, 9); }
    ctx.lineWidth = stroke; ctx.strokeStyle = ink; ctx.strokeText(str, 0, 0);
    ctx.fillStyle = color; ctx.fillText(str, 0, 0);
    ctx.restore();
  };
})();
