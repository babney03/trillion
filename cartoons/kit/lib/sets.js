// Kit.sets: reusable locations. Each set: { floor (fraction of H for the feet line), draw (static,
// cached once), anim (moving bits: clouds, light, dust), front (optional foreground) }.
// Layout rules for 9:16: keep the top 11.5% and bottom 22% free of anything important; characters stand
// on the feet line (78% of H), and the busy décor sits high on the walls, away from faces.
(function () {
  const Kit = globalThis.Kit, D = Kit.D, U = globalThis.U;
  const S = (Kit.sets = {});
  const hash = (...a) => U.hash(...a);

  // ---------- shared pieces ----------
  function cloud(ctx, x, y, s, a = 1) { ctx.save(); ctx.globalAlpha *= a; for (const [dx, dy, r] of [[-40, 6, 30], [-10, -10, 40], [30, -2, 34], [56, 10, 24], [8, 14, 34]]) D.ell(ctx, x + dx * s, y + dy * s, r * s, r * s * 0.9, '#FFFFFF', { lw: 0 }); ctx.restore(); }
  function bunting(ctx, W, y0, sag, n, seed = 0) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const x = (i / n) * W; pts.push([x, y0 + Math.sin((i / n) * Math.PI) * sag]); }
    D.line(ctx, pts, { lw: 4 });
    for (let i = 0; i < n; i++) {
      const [x0, y0a] = pts[i], [x1, y1] = pts[i + 1], c = Kit.props.COLORS[(i + seed) % 8];
      D.poly(ctx, [[x0 + 10, y0a + 2], [x1 - 10, y1 + 2], [(x0 + x1) / 2, (y0a + y1) / 2 + 76]], D.lin(ctx, 0, y0a, 0, y0a + 76, [[0, D.light(c, 0.15)], [1, D.dark(c, 0.1)]]), { lw: 4 });
    }
  }
  function floorBoards(ctx, W, H, y0, c1, c2) {
    ctx.fillStyle = D.lin(ctx, 0, y0, 0, H, [[0, c1], [1, c2]]); ctx.fillRect(0, y0, W, H - y0);
    let y = y0 + 34, gap = 46;
    while (y < H) { D.line(ctx, [[0, y], [W, y]], { lw: 3, color: D.rgba(D.dark(c2, 0.4), 0.35), smooth: false }); for (let k = 0; k < 3; k++) { const x = hash(y, k) * W; D.line(ctx, [[x, y - gap + 4], [x, y - 4]], { lw: 2.5, color: D.rgba(D.dark(c2, 0.4), 0.25), smooth: false }); } y += gap; gap *= 1.12; }
  }
  function aoBand(ctx, W, y, h, a = 0.18) { ctx.fillStyle = D.lin(ctx, 0, y - h, 0, y, [[0, 'rgba(40,30,60,0)'], [1, `rgba(40,30,60,${a})`]]); ctx.fillRect(0, y - h, W, h); }
  function windowFrame(ctx, x, y, w, h, t, sky = ['#8ED4FF', '#DDF4FF']) {
    D.rr(ctx, x - 16, y - 16, w + 32, h + 32, 26, '#FFFFFF');
    ctx.save(); D.rrPath(ctx, x, y, w, h, 14); ctx.clip();
    ctx.fillStyle = D.lin(ctx, 0, y, 0, y + h, [[0, sky[0]], [1, sky[1]]]); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = D.rad(ctx, x + w * 0.78, y + h * 0.22, 0, w * 0.5, [[0, 'rgba(255,250,210,0.95)'], [1, 'rgba(255,250,210,0)']]); ctx.fillRect(x, y, w, h);
    if (t !== null) { for (let i = 0; i < 3; i++) { const cx = x + ((hash(i, 7) * w + t * (14 + i * 6)) % (w + 220)) - 110; cloud(ctx, cx, y + 60 + i * (h / 3.2), 0.7 + hash(i, 2) * 0.4, 0.95); } }
    ctx.restore();
    D.rrPath(ctx, x, y, w, h, 14); D.paint(ctx, null, { lw: 6 });
    D.line(ctx, [[x + w / 2, y], [x + w / 2, y + h]], { lw: 12, color: '#FFFFFF', smooth: false }); D.line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], { lw: 12, color: '#FFFFFF', smooth: false });
    D.line(ctx, [[x + w / 2, y], [x + w / 2, y + h]], { lw: 3, color: D.INK, alpha: 0.5, smooth: false }); D.line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], { lw: 3, color: D.INK, alpha: 0.5, smooth: false });
  }
  function curtain(ctx, x, y, w, h, side, c) {
    const pts = side < 0 ? [[x, y], [x + w, y], [x + w * 0.55, y + h * 0.45], [x + w * 0.9, y + h], [x, y + h]] : [[x + w, y], [x, y], [x + w * 0.45, y + h * 0.45], [x + w * 0.1, y + h], [x + w, y + h]];
    D.shape(ctx, pts, D.lin(ctx, x, 0, x + w, 0, [[0, D.light(c, 0.2)], [1, D.dark(c, 0.12)]]), { tension: 0.35 });
    ctx.save(); D.smooth(ctx, pts, true, 0.35); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let r = 0; r < 12; r++) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + k * 34 + (r % 2) * 17, y + r * 40 + 12, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function dustMotes(ctx, t, x0, y0, x1, y1, n, a = 0.5) {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const u = (hash(i, 1) + t * 0.02 * (0.5 + hash(i, 2))) % 1;
      const x = x0 + (x1 - x0) * u + Math.sin(t * 0.7 + i) * 30, y = y0 + (y1 - y0) * ((hash(i, 3) + t * 0.015) % 1);
      ctx.globalAlpha = a * (0.4 + 0.6 * Math.sin(t * 1.3 + i * 2) ** 2);
      ctx.fillStyle = '#FFFBEA'; ctx.beginPath(); ctx.arc(x, y, 2 + hash(i, 4) * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function shaft(ctx, pts, a = 0.16) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const [p0, p1, p2, p3] = pts;
    ctx.fillStyle = D.lin(ctx, p0[0], p0[1], (p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2, [[0, `rgba(255,248,220,${a})`], [1, 'rgba(255,248,220,0)']]);
    ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------- PLAYROOM ----------
  S.playroom = {
    floor: 0.78,
    draw(ctx, W, H) {
      const F = H * 0.78, WALL = F - 150;
      ctx.fillStyle = D.lin(ctx, 0, 0, 0, WALL, [[0, '#DDF5EE'], [1, '#B9E4D8']]); ctx.fillRect(0, 0, W, WALL + 4);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; for (let x = 0; x < W; x += 90) ctx.fillRect(x, 0, 45, WALL);
      for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { const x = c * 150 + (r % 2) * 75 + 30, y = r * 96 + 40; if (y < WALL - 40) { D.starPath(ctx, x, y, 9, 0.3, 0.5); D.paint(ctx, 'rgba(255,255,255,0.5)', { lw: 0 }); } }
      // window + curtains + sill plant (high left)
      windowFrame(ctx, 90, 610, 300, 330, null);
      curtain(ctx, 30, 560, 120, 450, -1, '#FFC93C'); curtain(ctx, 330, 560, 120, 450, 1, '#FFC93C');
      D.rr(ctx, 6, 548, 468, 22, 11, '#E9A15B');
      D.rr(ctx, 70, 948, 340, 26, 10, '#FFFFFF');
      D.shape(ctx, [[300, 948], [292, 900], [340, 900], [332, 948]], '#E8714B', { tension: 0.1 });
      for (const [lx, ly, r] of [[316, 880, 22], [296, 868, 18], [338, 870, 18], [318, 852, 16]]) D.ell(ctx, lx, ly, r, r, D.body(ctx, '#45B868', lx, ly, r, r), { lw: 4 });
      // shelf with toys (high right, above where Biscuit sits)
      D.rr(ctx, 650, 880, 300, 24, 8, D.lin(ctx, 0, 880, 0, 904, [[0, '#E9A15B'], [1, '#C77E3E']]));
      for (const sd of [0, 1]) D.poly(ctx, [[680 + sd * 220, 904], [700 + sd * 220, 904], [690 + sd * 220, 936]], '#C77E3E', { lw: 4 });
      const books = [['#3B8FE5', 24, 92], ['#E8483B', 28, 104], ['#45B868', 22, 86], ['#FFC93C', 30, 98]];
      let bx = 672; for (const [c, w, h] of books) { D.rr(ctx, bx, 880 - h, w, h, 5, D.lin(ctx, bx, 0, bx + w, 0, [[0, D.light(c, 0.2)], [1, D.dark(c, 0.1)]]), { lw: 4 }); bx += w + 4; }
      Kit.props.draw(ctx, 'teddy', 840, 818, { s: 0.75 });
      Kit.props.draw(ctx, 'ball', 912, 846, { s: 0.42, color: '#9A6BDA' });
      // little framed crayon drawing
      D.rr(ctx, 520, 660, 120, 150, 10, '#FFFFFF'); D.rr(ctx, 532, 672, 96, 126, 6, '#FFF8E6', { lw: 3 });
      D.ell(ctx, 566, 724, 18, 18, '#FFD6B5', { lw: 3 }); D.ell(ctx, 548, 712, 12, 12, '#F38B3A', { lw: 3 }); D.ell(ctx, 584, 712, 12, 12, '#F38B3A', { lw: 3 });
      D.poly(ctx, [[552, 742], [580, 742], [592, 780], [540, 780]], '#FFD23F', { lw: 3 }); D.ell(ctx, 608, 768, 14, 12, '#E9AE6C', { lw: 3 });
      D.starPath(ctx, 610, 694, 12, 0); D.paint(ctx, '#FFC93C', { lw: 3 });
      // bunting
      bunting(ctx, W, 150, 70, 9);
      // wall bottom, baseboard, floor, rug
      aoBand(ctx, W, WALL, 90, 0.14);
      floorBoards(ctx, W, H, WALL, '#F0C994', '#D9A266');
      D.rr(ctx, -20, WALL - 18, W + 40, 30, 6, D.lin(ctx, 0, WALL - 18, 0, WALL + 12, [[0, '#FFFFFF'], [1, '#E3E6EE']]));
      ctx.fillStyle = D.rad(ctx, 330, F + 30, 0, 420, [[0, 'rgba(255,248,220,0.35)'], [1, 'rgba(255,248,220,0)']]); ctx.fillRect(0, WALL, W, H - WALL);
      D.ell(ctx, W / 2, F + 96, 600, 190, D.rad(ctx, W / 2, F + 60, 40, 620, [[0, '#4CC3B3'], [1, '#2E9C8F']]));
      D.ell(ctx, W / 2, F + 96, 520, 150, null, { lw: 5, ink: 'rgba(255,255,255,0.55)' });
      ctx.fillStyle = 'rgba(255,250,235,0.75)';
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; D.starPath(ctx, W / 2 + Math.cos(a) * 430, F + 96 + Math.sin(a) * 120, 14, a, 0.5); ctx.fill(); }
    },
    anim(ctx, t, W, H) {
      // clouds drifting in the window, the sunbeam and its dust
      ctx.save(); D.rrPath(ctx, 90, 610, 300, 330, 14); ctx.clip();
      for (let i = 0; i < 3; i++) { const cx = 90 + ((hash(i, 7) * 300 + t * (12 + i * 5)) % 520) - 110; cloud(ctx, cx, 660 + i * 100, 0.62 + hash(i, 2) * 0.35, 0.95); }
      ctx.restore();
      D.line(ctx, [[240, 610], [240, 940]], { lw: 12, color: '#FFFFFF', smooth: false }); D.line(ctx, [[90, 775], [390, 775]], { lw: 12, color: '#FFFFFF', smooth: false });
      D.line(ctx, [[240, 610], [240, 940]], { lw: 3, color: D.INK, alpha: 0.5, smooth: false }); D.line(ctx, [[90, 775], [390, 775]], { lw: 3, color: D.INK, alpha: 0.5, smooth: false });
      D.rrPath(ctx, 90, 610, 300, 330, 14); D.paint(ctx, null, { lw: 6 });
      const F = H * 0.78;
      shaft(ctx, [[110, 640], [390, 640], [760, F + 120], [300, F + 160]], 0.15 + 0.02 * Math.sin(t * 0.8));
      dustMotes(ctx, t, 200, 700, 640, F, 26, 0.55);
    },
  };

  // ---------- KITCHEN ----------
  S.kitchen = {
    floor: 0.78,
    draw(ctx, W, H, o = {}) {
      const F = H * 0.78, WALL = F - 150;
      ctx.fillStyle = D.lin(ctx, 0, 0, 0, WALL, [[0, '#FFF4D6'], [1, '#FBE2A8']]); ctx.fillRect(0, 0, W, WALL + 4);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 0; x < W; x += 110) ctx.fillRect(x, 0, 55, WALL);
      // window with a checked curtain valance + herbs (left)
      windowFrame(ctx, 80, 600, 300, 300, null, ['#9ED9FF', '#E6F7FF']);
      D.rr(ctx, 50, 560, 360, 70, 30, '#EF6F9A');
      ctx.save(); D.rrPath(ctx, 50, 560, 360, 70, 30); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; for (let x = 50; x < 420; x += 36) for (let y = 560; y < 640; y += 36) if (((x - 50) / 36 + (y - 560) / 36) % 2 === 0) ctx.fillRect(x, y, 36, 36); ctx.restore();
      D.rrPath(ctx, 50, 560, 360, 70, 30); D.paint(ctx, null);
      D.rr(ctx, 60, 905, 340, 24, 10, '#FFFFFF');
      for (const [px, c] of [[130, '#45B868'], [230, '#5FCB7E'], [330, '#45B868']]) { D.shape(ctx, [[px - 26, 905], [px - 22, 860], [px + 22, 860], [px + 26, 905]], '#E8714B', { tension: 0.1 }); for (let k = 0; k < 4; k++) D.ell(ctx, px - 14 + k * 9, 838 - (k % 2) * 12, 12, 18, c, { lw: 3.5, rot: (k - 1.5) * 0.3 }); }
      // pendant lamp
      D.line(ctx, [[W / 2 + 40, 0], [W / 2 + 40, 360]], { lw: 5 });
      D.shape(ctx, [[W / 2 - 50, 420], [W / 2 + 130, 420], [W / 2 + 90, 360], [W / 2 - 10, 360]], D.lin(ctx, 0, 360, 0, 420, [[0, '#45B8A8'], [1, '#2E8F84']]), { tension: 0.1 });
      // counter + cabinets (right)
      const cx = 640;
      D.rr(ctx, cx, 600, 460, 210, 16, D.lin(ctx, 0, 600, 0, 810, [[0, '#A8E0D2'], [1, '#88CDBD']]));
      for (const k of [0, 1]) { D.rr(ctx, cx + 24 + k * 210, 620, 190, 170, 12, null, { lw: 4, ink: 'rgba(59,42,36,0.55)' }); D.ell(ctx, cx + 200 + k * 20 - k * 180, 705, 8, 8, '#FFFFFF', { lw: 3.5 }); }
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx, WALL - 300, W - cx, 160);
      ctx.strokeStyle = 'rgba(120,170,220,0.6)'; ctx.lineWidth = 3;
      for (let y = WALL - 300; y < WALL - 140; y += 40) for (let x = cx; x < W; x += 40) ctx.strokeRect(x, y, 40, 40);
      D.rr(ctx, cx - 20, WALL - 150, W - cx + 40, 34, 8, D.lin(ctx, 0, WALL - 150, 0, WALL - 116, [[0, '#F0C994'], [1, '#C88B4E']]));
      D.rr(ctx, cx, WALL - 116, W - cx + 20, 140, 0, '#88CDBD');
      Kit.props.draw(ctx, 'jar', cx + 90, WALL - 230, { s: 0.75 });
      Kit.props.draw(ctx, 'apple', cx + 210, WALL - 186, { s: 0.6 });
      bunting(ctx, W, 140, 50, 8, 3);
      aoBand(ctx, W, WALL, 80, 0.12);
      // checker floor
      ctx.fillStyle = '#FFF2DA'; ctx.fillRect(0, WALL, W, H - WALL);
      const sz = 90;
      for (let y = WALL; y < H; y += sz) for (let x = 0; x < W; x += sz) if (((x / sz) + Math.floor((y - WALL) / sz)) % 2 === 0) { ctx.fillStyle = '#F6B9A6'; ctx.fillRect(x, y, sz, sz); }
      ctx.fillStyle = D.lin(ctx, 0, WALL, 0, H, [[0, 'rgba(60,30,40,0.12)'], [0.3, 'rgba(0,0,0,0)']]); ctx.fillRect(0, WALL, W, H - WALL);
      D.rr(ctx, -20, WALL - 18, W + 40, 30, 6, '#FFFFFF');
      ctx.fillStyle = D.rad(ctx, W / 2 + 40, F, 0, 520, [[0, 'rgba(255,240,200,0.32)'], [1, 'rgba(255,240,200,0)']]); ctx.fillRect(0, WALL, W, H - WALL);
      if (o.table) {
        const tx = o.tableX ?? W * 0.5, ty = F - 210;
        D.limb(ctx, [[tx - 120, ty + 10], [tx - 132, F + 30]], 20, '#C88B4E'); D.limb(ctx, [[tx + 120, ty + 10], [tx + 132, F + 30]], 20, '#C88B4E');
        D.ell(ctx, tx, ty, 190, 40, D.lin(ctx, 0, ty - 40, 0, ty + 40, [[0, '#F7D3A0'], [1, '#D99A55']]));
        D.ell(ctx, tx, ty - 4, 170, 30, null, { lw: 3, ink: 'rgba(255,255,255,0.5)' });
      }
    },
    anim(ctx, t, W, H) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = D.rad(ctx, W / 2 + 40, 430, 0, 360, [[0, `rgba(255,236,170,${0.42 + 0.03 * Math.sin(t * 2)})`], [1, 'rgba(255,236,170,0)']]); ctx.fillRect(0, 100, W, 760);
      ctx.restore();
      D.ell(ctx, W / 2 + 40, 422, 70, 12, '#FFF6C9', { lw: 4 });
      ctx.save(); D.rrPath(ctx, 80, 600, 300, 300, 14); ctx.clip();
      for (let i = 0; i < 2; i++) { const cx = 80 + ((hash(i, 5) * 300 + t * (10 + i * 6)) % 520) - 110; cloud(ctx, cx, 660 + i * 120, 0.6, 0.95); }
      ctx.restore();
      D.line(ctx, [[230, 600], [230, 900]], { lw: 12, color: '#FFFFFF', smooth: false }); D.line(ctx, [[80, 750], [380, 750]], { lw: 12, color: '#FFFFFF', smooth: false });
      D.rrPath(ctx, 80, 600, 300, 300, 14); D.paint(ctx, null, { lw: 6 });
    },
  };

  // ---------- BACKYARD ----------
  S.backyard = {
    floor: 0.78,
    draw(ctx, W, H) {
      const F = H * 0.78, HOR = F - 260;
      ctx.fillStyle = D.lin(ctx, 0, 0, 0, HOR, [[0, '#7FCBFF'], [1, '#D8F2FF']]); ctx.fillRect(0, 0, W, HOR + 10);
      D.shape(ctx, [[-60, HOR + 40], [200, HOR - 120], [520, HOR - 30], [820, HOR - 150], [1160, HOR - 20], [1160, HOR + 200], [-60, HOR + 200]], D.lin(ctx, 0, HOR - 150, 0, HOR + 60, [[0, '#9BDB8E'], [1, '#79C56E']]), { lw: 0 });
      D.shape(ctx, [[-60, HOR + 80], [300, HOR - 40], [700, HOR + 30], [1160, HOR - 60], [1160, HOR + 220], [-60, HOR + 220]], D.lin(ctx, 0, HOR - 60, 0, HOR + 100, [[0, '#7FCF6E'], [1, '#5DB653']]), { lw: 0 });
      // fence
      const fy = F - 300;
      D.rr(ctx, -20, fy + 40, W + 40, 22, 6, '#FFFFFF'); D.rr(ctx, -20, fy + 130, W + 40, 22, 6, '#FFFFFF');
      for (let x = 10; x < W; x += 78) D.shape(ctx, [[x, fy + 200], [x, fy + 10], [x + 25, fy - 18], [x + 50, fy + 10], [x + 50, fy + 200]], D.lin(ctx, x, 0, x + 50, 0, [[0, '#FFFFFF'], [1, '#E2E6F0']]), { tension: 0.05 });
      // tree (left)
      D.limb(ctx, [[120, F - 40], [130, F - 380], [150, F - 520]], 60, '#A0673A');
      for (const [x, y, r] of [[60, 620, 120], [200, 560, 130], [120, 470, 120], [270, 680, 100], [-10, 720, 90]]) D.ell(ctx, x, y, r, r * 0.9, D.body(ctx, '#58BF5B', x, y, r, r));
      for (const [x, y] of [[90, 580], [220, 640], [160, 500], [40, 700]]) D.ell(ctx, x, y, 12, 12, '#E8483B', { lw: 3.5 });
      // doghouse (right) with a name plate
      const dx = 820, dy = F - 120;
      D.rr(ctx, dx - 130, dy - 230, 260, 230, 12, D.lin(ctx, dx - 130, 0, dx + 130, 0, [[0, '#FFD98A'], [1, '#F2B44A']]));
      D.poly(ctx, [[dx - 160, dy - 210], [dx, dy - 340], [dx + 160, dy - 210]], D.lin(ctx, 0, dy - 340, 0, dy - 210, [[0, '#F0594A'], [1, '#C93A2E']]));
      D.shape(ctx, [[dx - 60, dy], [dx - 60, dy - 110], [dx, dy - 160], [dx + 60, dy - 110], [dx + 60, dy]], '#5A3A2E', { tension: 0.4 });
      D.rr(ctx, dx - 76, dy - 205, 152, 40, 10, '#FFFFFF');
      D.title(ctx, 'BISCUIT', dx, dy - 184, { size: 30, color: '#E8483B', stroke: 5, shadow: false });
      // grass
      ctx.fillStyle = D.lin(ctx, 0, F - 140, 0, H, [[0, '#6DCB5E'], [1, '#48A741']]); ctx.fillRect(0, F - 120, W, H - F + 120);
      for (let i = 0; i < 70; i++) { const x = hash(i, 1) * W, y = F - 100 + hash(i, 2) * (H - F + 80); D.line(ctx, [[x - 8, y], [x - 3, y - 18], [x, y - 4], [x + 5, y - 20], [x + 8, y]], { lw: 3, color: '#3E9837', smooth: false }); }
      for (let i = 0; i < 14; i++) { const x = hash(i, 8) * W, y = F - 90 + hash(i, 9) * 220; Kit.props.draw(ctx, 'flower', x, y, { s: 0.45, color: Kit.props.COLORS[i % 8] }); }
    },
    anim(ctx, t, W, H) {
      const sx = 900, sy = 360;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.15);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); D.poly(ctx, [[0, -100], [12, -140], [-12, -140]], '#FFE07A', { lw: 0 }); }
      ctx.restore();
      D.ell(ctx, sx, sy, 80, 80, D.rad(ctx, sx - 20, sy - 20, 4, 90, [[0, '#FFF8C8'], [1, '#FFD23F']]), { lw: 0 });
      for (let i = 0; i < 3; i++) cloud(ctx, ((hash(i, 3) * W + t * (16 + i * 7)) % (W + 300)) - 150, 280 + i * 110, 1 + hash(i, 4) * 0.5, 0.95);
      for (let i = 0; i < 2; i++) { // butterflies
        const bx = W * (0.3 + 0.4 * i) + Math.sin(t * 0.9 + i * 3) * 160, by = H * 0.45 + Math.sin(t * 1.7 + i) * 60;
        const fl = Math.abs(Math.sin(t * 18 + i));
        for (const sd of [-1, 1]) D.ell(ctx, bx + sd * 14 * fl, by, 14 * fl + 2, 12, i ? '#EF6F9A' : '#9A6BDA', { lw: 3 });
        D.ell(ctx, bx, by, 3, 10, D.INK, { lw: 0 });
      }
    },
  };
})();
