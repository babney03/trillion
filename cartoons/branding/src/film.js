// Channel art: banner (2560x1440, keep the middle 1546x423 clear for phones) and avatar (round crop).
(function () {
  const Kit = globalThis.Kit, D = Kit.D, G = globalThis.G, Studio = globalThis.Studio;
  const W = G.W, H = G.H, banner = W > H;
  const cloud = (ctx, x, y, s) => { for (const [dx, dy, r] of [[-40, 6, 30], [-10, -10, 40], [30, -2, 34], [56, 10, 24], [8, 14, 34]]) D.ell(ctx, x + dx * s, y + dy * s, r * s, r * s * 0.9, '#FFFFFF', { lw: 0 }); };
  function stamp(ctx, word, cx, y, size, seed) {
    const n = word.length, gap = size * 0.95;
    word.split('').forEach((ch, j) => {
      if (ch === ' ') return;
      const x = cx + (j - (n - 1) / 2) * gap, r = (globalThis.U.hash(j, seed) - 0.5) * 0.26, c = Kit.props.COLORS[(j + seed) % 8];
      ctx.save(); ctx.translate(x, y); ctx.rotate(r);
      D.rr(ctx, -size * 0.46, -size * 0.52, size * 0.92, size * 1.04, 18, D.lin(ctx, 0, -size * 0.52, 0, size * 0.52, [[0, D.light(c, 0.2)], [1, D.dark(c, 0.1)]]), { lw: 7 });
      D.title(ctx, ch, 0, size * 0.03, { size: size * 0.74, color: '#FFFFFF', stroke: 12, shadow: false });
      D.shine(ctx, -size * 0.3, -size * 0.36, size * 0.07, 0.6);
      ctx.restore();
    });
  }
  Studio.film({
    draw(ctx, t) {
      // sky, sun, clouds, hills, grass
      ctx.fillStyle = D.lin(ctx, 0, 0, 0, H, [[0, '#7FCBFF'], [0.7, '#D8F2FF'], [1, '#D8F2FF']]); ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = D.rad(ctx, W * 0.85, H * 0.18, 0, W * 0.3, [[0, 'rgba(255,248,200,0.95)'], [1, 'rgba(255,248,200,0)']]); ctx.fillRect(0, 0, W, H);
      if (banner) { cloud(ctx, 330, 330, 1.6); cloud(ctx, 1250, 230, 1.3); cloud(ctx, 2150, 380, 1.7); cloud(ctx, 760, 1120, 1.2); }
      const hill = banner ? H * 0.74 : H * 0.8;
      D.shape(ctx, [[-80, hill], [W * 0.25, hill - 120], [W * 0.55, hill - 40], [W * 0.8, hill - 140], [W + 80, hill - 30], [W + 80, H + 80], [-80, H + 80]], D.lin(ctx, 0, hill - 140, 0, H, [[0, '#7FCF6E'], [1, '#48A741']]), { lw: 0 });
      if (banner) {
        const pts = []; for (let i = 0; i <= 14; i++) pts.push([(i / 14) * W, 70 + Math.sin((i / 14) * Math.PI) * 80]);
        D.line(ctx, pts, { lw: 6 });
        for (let i = 0; i < 14; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; D.poly(ctx, [[x0 + 14, y0 + 3], [x1 - 14, y1 + 3], [(x0 + x1) / 2, (y0 + y1) / 2 + 100]], Kit.props.COLORS[i % 8], { lw: 5 }); }
        // title in the phone-safe middle band (y 508..931)
        stamp(ctx, 'PIP & BISCUIT', W / 2, 640, 112, 1);
        D.title(ctx, 'little stories, big lessons', W / 2, 820, { size: 64, color: '#FFFFFF', stroke: 14 });
        Kit.chars.pip.draw(ctx, { x: 330, y: 1170, s: 1.12, t: 0.4, eyes: 'happy', mouth: 'grin', brows: 'up', handR: [124, -440] });
        Kit.chars.biscuit.draw(ctx, { x: 2240, y: 1150, s: 1.25, t: 0.4, pose: 'beg', eyes: 'happy', mouth: 'pant', ears: 0.6 });
        Kit.props.draw(ctx, 'ball', 1990, 1150, { s: 0.9 });
        Kit.props.draw(ctx, 'block', 600, 1130, { letter: 'A', color: '#3B8FE5' });
        Kit.props.draw(ctx, 'block', 710, 1140, { letter: 'B', color: '#FFC93C', rot: 0.15 });
      } else {
        ctx.fillStyle = D.rad(ctx, W / 2, H / 2, 0, W * 0.6, [[0, '#FFF4C9'], [1, '#FFD23F']]); ctx.fillRect(0, 0, W, H);
        D.ell(ctx, W / 2, H / 2, W * 0.47, H * 0.47, null, { lw: 18, ink: '#FFFFFF' });
        Kit.chars.pip.draw(ctx, { x: 405, y: 1440, s: 1.82, t: 0.4, eyes: 'happy', mouth: 'grin', brows: 'up', shadowA: 0 });
        Kit.chars.biscuit.draw(ctx, { x: 765, y: 1300, s: 1.85, t: 0.4, eyes: 'open', mouth: 'pant', ears: 0.5, brows: 'up', look: -0.5, shadowA: 0 });
      }
    },
    post: { paper: 0, vignette: 0.08, grain: 0.012 },
    fadeOut: 0,
  });
})();
