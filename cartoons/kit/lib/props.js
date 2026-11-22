// Kit.props: things characters hold, toss, stack and share. Origin at the prop's centre.
// Kit.props.draw(ctx, kind, x, y, { s, rot, sx, sy, color, letter, glow, alpha, bite })
(function () {
  const Kit = globalThis.Kit, D = Kit.D;
  const P = (Kit.props = {});
  P.COLORS = ['#E8483B', '#FFC93C', '#3B8FE5', '#45B868', '#F58A33', '#9A6BDA', '#EF6F9A', '#2FB7B0'];

  const R = {};
  R.block = (ctx, o) => {
    const c = o.color || P.COLORS[0], h = 52;
    D.rr(ctx, -h, -h, h * 2, h * 2, 16, D.lin(ctx, -h, -h, h, h, [[0, D.light(c, 0.25)], [0.6, c], [1, D.dark(c, 0.18)]]));
    D.rr(ctx, -h + 12, -h + 12, h * 2 - 24, h * 2 - 24, 10, D.light(c, 0.55), { lw: 3.5, ink: D.dark(c, 0.35) });
    if (o.letter) D.title(ctx, o.letter, 0, 3, { size: 62, color: D.dark(c, 0.15), ink: '#FFFFFF', stroke: 7, shadow: false });
    D.shine(ctx, -h + 16, -h + 14, 9, 0.7);
  };
  R.star = (ctx, o) => {
    const c = o.color || '#FFD23F';
    D.starPath(ctx, 0, 0, 56, 0, 0.5); D.paint(ctx, D.rad(ctx, -12, -14, 2, 64, [[0, '#FFF6C2'], [0.45, c], [1, '#F0A21E']]), { lw: 6 });
    D.shine(ctx, -14, -16, 10, 0.8);
    for (const sd of [-1, 1]) D.ell(ctx, sd * 13, -2, 4, 6, D.INK, { lw: 0 });
    D.line(ctx, [[-10, 12], [0, 18], [10, 12]], { lw: 4 });
  };
  R.ball = (ctx, o) => {
    const c = o.color || '#E8483B';
    D.ell(ctx, 0, 0, 46, 46, D.body(ctx, c, 0, 0, 46, 46));
    ctx.save(); D.ellPath(ctx, 0, 0, 46, 46); ctx.clip(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-50, -9, 100, 18); ctx.restore();
    D.ellPath(ctx, 0, 0, 46, 46); D.paint(ctx, null); D.shine(ctx, -16, -18, 10);
  };
  R.cookie = (ctx, o) => {
    const bite = o.bite || 0;
    ctx.save();
    if (bite > 0) { ctx.beginPath(); ctx.rect(-60, -60, 120, 120); ctx.arc(34, -30, 26 * bite, 0, Math.PI * 2, true); ctx.clip(); }
    D.ell(ctx, 0, 0, 40, 38, D.body(ctx, '#E0A35A', 0, 0, 40, 38));
    for (const [cx, cy] of [[-14, -10], [12, -16], [6, 10], [-10, 14], [18, 4]]) D.ell(ctx, cx, cy, 6, 5, '#5A3420', { lw: 0 });
    ctx.restore();
    D.ellPath(ctx, 0, 0, 40, 38); if (!bite) D.paint(ctx, null);
  };
  R.plate = (ctx) => { D.ell(ctx, 0, 0, 96, 30, D.lin(ctx, 0, -30, 0, 30, [[0, '#FFFFFF'], [1, '#D9E3F0']])); D.ell(ctx, 0, -2, 64, 18, null, { lw: 3, ink: '#B8C6DA' }); };
  R.jar = (ctx) => {
    D.rr(ctx, -62, -80, 124, 150, 34, D.lin(ctx, -62, 0, 62, 0, [[0, 'rgba(220,240,255,0.85)'], [0.5, 'rgba(255,255,255,0.6)'], [1, 'rgba(190,215,240,0.9)']]));
    D.rr(ctx, -54, -104, 108, 30, 10, '#E8483B');
    D.ell(ctx, 0, -110, 18, 10, '#F58A33');
    D.shine(ctx, -36, -40, 10, 0.7);
  };
  R.cup = (ctx, o) => {
    const c = o.color || '#3B8FE5';
    D.shape(ctx, [[-34, -40], [34, -40], [26, 40], [-26, 40]], D.body(ctx, c, 0, 0, 34, 40), { tension: 0.15 });
    D.ell(ctx, 0, -40, 34, 9, '#FFFFFF');
    ctx.save(); ctx.lineWidth = 12; ctx.strokeStyle = D.INK; ctx.beginPath(); ctx.arc(38, 0, 16, -1.3, 1.3); ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = c; ctx.stroke(); ctx.restore();
  };
  R.apple = (ctx) => {
    D.shape(ctx, [[0, -28], [26, -38], [42, -6], [30, 32], [0, 40], [-30, 32], [-42, -6], [-26, -38]], D.body(ctx, '#E8483B', 0, 0, 42, 40));
    D.line(ctx, [[0, -30], [4, -50]], { lw: 6 }); D.shape(ctx, [[6, -44], [26, -56], [22, -38]], '#45B868', { lw: 4 }); D.shine(ctx, -18, -14, 9);
  };
  R.teddy = (ctx) => {
    const c = '#B9773F';
    for (const sd of [-1, 1]) D.ell(ctx, sd * 30, -54, 16, 16, c);
    D.ell(ctx, 0, 20, 40, 44, D.body(ctx, c, 0, 20, 40, 44));
    D.ell(ctx, 0, -28, 38, 34, D.body(ctx, c, 0, -28, 38, 34));
    D.ell(ctx, 0, -18, 16, 12, '#F2D2A8', { lw: 3.5 });
    for (const sd of [-1, 1]) D.ell(ctx, sd * 14, -36, 4.5, 5.5, D.INK, { lw: 0 });
    D.ell(ctx, 0, -22, 5, 4, D.INK, { lw: 0 });
  };
  R.cupcake = (ctx, o) => {
    D.shape(ctx, [[-36, 0], [36, 0], [26, 44], [-26, 44]], '#3B8FE5', { tension: 0.1 });
    D.cloudPath(ctx, 0, -14, 40, 26, 7, 0.16); D.paint(ctx, D.lin(ctx, 0, -50, 0, 10, [[0, '#FFE1EC'], [1, '#EF6F9A']]));
    D.ell(ctx, 0, -44, 9, 9, '#E8483B', { lw: 3.5 });
  };
  R.flower = (ctx, o) => {
    const c = o.color || '#EF6F9A';
    D.line(ctx, [[0, 0], [0, 70]], { lw: 7, color: '#45B868' });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; D.ell(ctx, Math.cos(a) * 20, Math.sin(a) * 20, 14, 14, c, { lw: 3.5 }); }
    D.ell(ctx, 0, 0, 13, 13, '#FFC93C', { lw: 3.5 });
  };
  R.toothbrush = (ctx, o) => {
    D.rr(ctx, -70, -9, 120, 18, 9, o.color || '#3B8FE5');
    D.rr(ctx, 42, -22, 34, 18, 5, '#FFFFFF', { lw: 3.5 });
  };

  P.draw = (ctx, kind, x, y, o = {}) => {
    const r = R[kind];
    if (!r) return;
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.translate(x, y);
    if (o.glow) { ctx.fillStyle = D.rad(ctx, 0, 0, 10, 110, [[0, `rgba(255,246,200,${0.85 * o.glow})`], [1, 'rgba(255,246,200,0)']]); ctx.fillRect(-120, -120, 240, 240); }
    ctx.rotate(o.rot || 0);
    const s = o.s || 1;
    ctx.scale(s * (o.sx || 1), s * (o.sy || 1));
    r(ctx, o);
    ctx.restore();
  };
  P.size = { block: 104, star: 112, ball: 92, cookie: 80, plate: 192, jar: 124, cup: 70, apple: 84, teddy: 90, cupcake: 80, flower: 60, toothbrush: 150 };
})();
