// Kit.fx: effects drawn from score events. Each takes (ctx, t, ev) where ev = { t, t1, ...args }.
// All deterministic (seeded by the event time), so parallel render workers agree.
(function () {
  const Kit = globalThis.Kit, D = Kit.D, U = globalThis.U;
  const F = (Kit.fx = {});
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const hash = (...a) => U.hash(...a);
  const outBack = (u) => U.ease.outBack(clamp(u), 2.2);

  // sparkle burst (a block lands, a good idea, a kind act)
  F.sparkle = (ctx, t, e) => {
    const a = t - e.t, dur = e.dur || 0.45;
    if (a < 0 || a > dur) return;
    const u = a / dur, n = e.n || 7, r = e.r || 70;
    ctx.save(); ctx.globalAlpha *= 1 - u * u;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + hash(i, e.t) * 0.6;
      const rr = r * (0.3 + 0.9 * U.ease.outCubic(u));
      const x = e.x + Math.cos(ang) * rr, y = e.y + Math.sin(ang) * rr;
      D.starPath(ctx, x, y, (12 + 8 * hash(i, 3)) * (1 - u * 0.6), u * 3, 0.42, 4);
      D.paint(ctx, e.color || '#FFF3B0', { lw: 0 });
    }
    ctx.restore();
  };
  // comic impact: white star + speed rays
  F.burst = (ctx, t, e) => {
    const a = t - e.t, dur = e.dur || 0.3;
    if (a < 0 || a > dur) return;
    const u = a / dur;
    ctx.save(); ctx.globalAlpha *= 1 - u;
    D.starPath(ctx, e.x, e.y, (e.r || 70) * (0.6 + 0.6 * u), 0.2, 0.55, 8); D.paint(ctx, '#FFFFFF', { lw: 5 });
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2; const r0 = (e.r || 70) * (1 + u), r1 = r0 + 40; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(ang) * r0, e.y + Math.sin(ang) * r0); ctx.lineTo(e.x + Math.cos(ang) * r1, e.y + Math.sin(ang) * r1); ctx.stroke(); }
    ctx.restore();
  };
  // a soft dust puff where something lands on the floor
  F.dust = (ctx, t, e) => {
    const a = t - e.t, dur = 0.6;
    if (a < 0 || a > dur) return;
    const u = a / dur;
    ctx.save(); ctx.globalAlpha *= 0.55 * (1 - u);
    for (let i = 0; i < 6; i++) { const sd = i % 2 ? 1 : -1; const x = e.x + sd * (20 + 70 * U.ease.outCubic(u)) * (0.6 + hash(i, e.t) * 0.6); D.ell(ctx, x, e.y - 10 - u * 26 * hash(i, 9), 18 + 22 * u, 14 + 16 * u, '#FFFFFF', { lw: 0 }); }
    ctx.restore();
  };
  // confetti that rains from the top from e.t (until e.t1)
  F.confetti = (ctx, t, e, W, H) => {
    if (t < e.t) return;
    const n = e.n || 150, cols = ['#E8483B', '#FFC93C', '#3B8FE5', '#45B868', '#EF6F9A', '#9A6BDA', '#FFFFFF'];
    const fade = e.t1 ? 1 - clamp((t - e.t1) / 1) : 1;
    if (fade <= 0) return;
    ctx.save(); ctx.globalAlpha *= fade;
    for (let i = 0; i < n; i++) {
      const born = e.t + hash(i, 1) * (e.spawn || 1.8);
      if (t < born) continue;
      const a = t - born;
      const x = hash(i, 2) * W + Math.sin(a * (2 + hash(i, 3) * 3) + i) * 40;
      const y = -40 + a * (220 + hash(i, 4) * 260) + (e.burst ? -Math.max(0, 1 - a * 2) * 300 * hash(i, 6) : 0);
      if (y > H + 40) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a * (3 + hash(i, 5) * 5) + i);
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-8, -4, 16, 8 * Math.abs(Math.cos(a * 6 + i)) + 2);
      ctx.restore();
    }
    ctx.restore();
  };
  // rotating sunburst behind a hero moment
  F.sunburst = (ctx, t, e, W, H) => {
    if (t < e.t) return;
    const inA = clamp((t - e.t) / 0.3), outA = e.t1 ? 1 - clamp((t - e.t1) / 0.6) : 1;
    const a = inA * outA;
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= (e.alpha || 0.5) * a; ctx.translate(e.x, e.y); ctx.rotate((t - e.t) * 0.3);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = i % 2 ? (e.c1 || '#FFE07A') : (e.c2 || '#FFF6D2');
      const a0 = (i / 22) * Math.PI * 2, a1 = ((i + 1) / 22) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * 2600, Math.sin(a0) * 2600); ctx.lineTo(Math.cos(a1) * 2600, Math.sin(a1) * 2600); ctx.fill();
    }
    ctx.restore();
  };
  // lightbulb over a character's head (an idea)
  F.lightbulb = (ctx, t, e) => {
    if (t < e.t || t > e.t1 + 0.25) return;
    const u = outBack((t - e.t) / 0.25) * (1 - clamp((t - e.t1) / 0.25));
    const x = e.x, y = e.y + Math.sin((t - e.t) * 4) * 6;
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
    ctx.fillStyle = D.rad(ctx, 0, 0, 10, 140, [[0, 'rgba(255,240,150,0.85)'], [1, 'rgba(255,240,150,0)']]); ctx.fillRect(-150, -150, 300, 300);
    D.shape(ctx, [[0, -58], [36, -40], [44, -6], [24, 22], [20, 40], [-20, 40], [-24, 22], [-44, -6], [-36, -40]], D.rad(ctx, -10, -24, 4, 60, [[0, '#FFFBE0'], [0.5, '#FFE45C'], [1, '#F5C02E']]));
    D.rr(ctx, -20, 38, 40, 26, 8, '#B9C2D3');
    D.line(ctx, [[-18, 48], [18, 48]], { lw: 3 });
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45; D.line(ctx, [[Math.cos(a) * 66, -14 + Math.sin(a) * 66], [Math.cos(a) * 92, -14 + Math.sin(a) * 92]], { lw: 6 }); }
    D.shine(ctx, -16, -32, 9);
    ctx.restore();
  };
  // floating hearts (love, kindness) or music notes (happy humming)
  F.hearts = (ctx, t, e) => {
    if (t < e.t || t > e.t1 + 1) return;
    for (let i = 0; i < (e.n || 5); i++) {
      const born = e.t + i * 0.28;
      const a = t - born;
      if (a < 0 || a > 1.4) continue;
      const u = a / 1.4;
      const x = e.x + Math.sin(a * 4 + i) * 26 + (i - 2) * 22, y = e.y - u * 220;
      ctx.save(); ctx.globalAlpha *= 1 - u * u;
      if (e.kind === 'notes') { D.title(ctx, i % 2 ? '♪' : '♫', x, y, { size: 64, color: e.color || '#9A6BDA', stroke: 8, shadow: false }); }
      else { D.heartPath(ctx, x, y, 22 + 8 * Math.sin(a * 8)); D.paint(ctx, e.color || '#EF5A7A', { lw: 4.5 }); D.shine(ctx, x - 8, y - 10, 5, 0.7); }
      ctx.restore();
    }
  };
  // tears drip (sad), sweat drop (worried)
  F.tears = (ctx, t, e) => {
    if (t < e.t || t > e.t1) return;
    for (let i = 0; i < 4; i++) {
      const a = (t - e.t - i * 0.32) % 1.2;
      if (a < 0) continue;
      const sd = i % 2 ? 1 : -1;
      const x = e.x + sd * (e.dx || 46), y = e.y + a * 120;
      ctx.save(); ctx.globalAlpha *= 1 - a / 1.2;
      D.shape(ctx, [[x, y - 14], [x + 9, y + 4], [x, y + 12], [x - 9, y + 4]], '#7CC7F2', { lw: 3.5 });
      ctx.restore();
    }
  };
  F.zzz = (ctx, t, e) => {
    if (t < e.t || t > e.t1) return;
    for (let i = 0; i < 3; i++) { const a = ((t - e.t) * 0.6 + i / 3) % 1; ctx.save(); ctx.globalAlpha *= Math.sin(a * Math.PI); D.title(ctx, 'z', e.x + a * 60 + i * 8, e.y - a * 120, { size: 40 + i * 14, color: '#FFFFFF', stroke: 8, shadow: false }); ctx.restore(); }
  };
  // big comic word: BONK! UH-OH! YAY!
  F.popword = (ctx, t, e) => {
    const a = t - e.t, dur = (e.t1 || e.t + 1) - e.t;
    if (a < 0 || a > dur + 0.2) return;
    const u = outBack(a / 0.22), out = clamp((a - dur) / 0.2);
    const wob = Math.sin(a * 18) * 0.04 * Math.exp(-a * 3);
    ctx.save(); ctx.globalAlpha *= 1 - out; ctx.translate(e.x, e.y); ctx.scale(u * (1 + out * 0.3), u * (1 + out * 0.3)); ctx.rotate((e.rot || -0.08) + wob);
    D.title(ctx, e.text, 0, 0, { size: e.size || 130, color: e.color || '#FFC93C', stroke: 16 });
    ctx.restore();
  };
  // screen-space overlays
  F.tint = (ctx, t, e, W, H) => {
    if (t < e.t || t > e.t1 + (e.fadeOut || 0.3)) return;
    const a = Math.min(clamp((t - e.t) / (e.fadeIn || 0.08)), 1 - clamp((t - e.t1) / (e.fadeOut || 0.3)));
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = D.rgba(e.color || '#7B8FD0', (e.alpha || 0.4) * a); ctx.fillRect(0, 0, W, H); ctx.restore();
  };
  F.flash = (ctx, t, e, W, H) => {
    if (t < e.t) return;
    const a = (e.alpha || 0.7) * Math.exp(-(t - e.t) * (e.decay || 11));
    if (a < 0.01) return;
    ctx.fillStyle = `rgba(255,252,236,${a})`; ctx.fillRect(0, 0, W, H);
  };

  F.BEHIND = new Set(['sunburst']);
  F.SCREEN = new Set(['tint', 'flash']);
})();
