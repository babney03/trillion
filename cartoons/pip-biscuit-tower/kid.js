// Ch.kid: a chibi preschooler (big round head, short body) built only from G.* primitives,
// so it boils and hatches like the rest of the film. Origin at the feet.
// Pip: curly orange hair in two puffs, yellow dress with a red star, red sneakers.
//
// Ch.kid(ctx, { x, y, s, sx, sy, rot, eyes, mouth, brows, look, lookY, blink, handL, handR, headRot, blush, style })
//   eyes:  normal | happy | closed | wide
//   mouth: smile | grin | open | o | sad | flat
//   brows: neutral | worried | up | determined
//   handL / handR: [x, y] hand targets in local units (feet = 0,0; head centre ~ 0,-385)
(function () {
  const G = globalThis.G, Ch = globalThis.Ch, U = globalThis.U;
  const shade = Ch.shade;

  Ch.KID_STYLES = {
    pip: { skin: '#F6CBA8', hair: '#E8742C', dress: '#F7C948', accent: '#E84A3C', shoes: '#E84A3C', clip: '#4CB66A' },
  };

  // two-segment arm: shoulder -> elbow -> hand, elbow bends outward/down
  function arm(S, P, a, b, side) {
    let dx = P[0] - S[0], dy = P[1] - S[1];
    let d = Math.hypot(dx, dy);
    const max = (a + b) * 0.98;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    const hand = [S[0] + dx, S[1] + dy];
    const cosA = U.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const base = Math.atan2(dy, dx);
    const ang = base + side * Math.acos(cosA);
    return [S, [S[0] + Math.cos(ang) * a, S[1] + Math.sin(ang) * a], hand];
  }

  // a bumpy "cloud" outline for curly hair
  function curls(cx, cy, rx, ry, n, depth, phase = 0) {
    const pts = [];
    const N = n * 8;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const bump = 1 + depth * Math.abs(Math.sin((a * n) / 2 + phase));
      pts.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * bump]);
    }
    return pts;
  }

  Ch.kid = (ctx, o) => {
    const {
      x, y, s = 1, sx = 1, sy = 1, rot = 0, seed = 900, style = Ch.KID_STYLES.pip,
      eyes = 'normal', mouth = 'smile', brows = 'neutral', look = 0, lookY = 0, blink = 0,
      handL = [-92, -150], handR = [92, -150], headRot = 0, blush = 0.55, shadow = true, hold = null,
    } = o;
    const ink = G.C.ink;
    const skin = style.skin, skinD = shade(skin, 0.86);
    const hatch = { color: 'rgba(120,60,20,0.18)', gap: 8 };

    ctx.save();
    ctx.translate(x, y);
    if (shadow) { ctx.fillStyle = 'rgba(20,10,20,0.2)'; ctx.beginPath(); ctx.ellipse(0, 4, 110 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.scale(s * sx, s * sy);
    ctx.rotate(rot);

    // legs + sneakers
    for (const sd of [-1, 1]) {
      G.limb(ctx, [[sd * 30, -122], [sd * 33, -60], [sd * 34, -16]], { color: skin, lw: 28, seed: seed + 1 + sd });
      G.ellipse(ctx, sd * 40, -12, 34, 18, { fill: style.shoes, lw: 4, seed: seed + 3 + sd });
      G.line(ctx, [[sd * 40 - 28, -4], [sd * 40 + 28, -4]], { color: '#FFFFFF', lw: 5, seed: seed + 5 + sd });
    }

    // arms behind the dress when the hands hang low; in front when raised (drawn later)
    const SL = [-56, -258], SR = [56, -258];
    // elbows bend outward: the bend direction flips when the hand is raised above the shoulder
    const aL = arm(SL, handL, 84, 80, handL[1] < SL[1] - 40 ? -1 : 1), aR = arm(SR, handR, 84, 80, handR[1] < SR[1] - 40 ? 1 : -1);
    const drawArm = (pts, sd) => {
      G.limb(ctx, pts, { color: skin, lw: 24, seed: seed + 10 + sd });
      G.ellipse(ctx, pts[2][0], pts[2][1], 17, 17, { fill: skin, lw: 3.5, seed: seed + 12 + sd });
    };
    const low = (p) => p[1] > -200;
    if (low(handL)) drawArm(aL, -1);
    if (low(handR)) drawArm(aR, 1);

    // dress (A-line) with a red star and a hem trim
    const dress = G.poly(ctx, [[-60, -276], [60, -276], [72, -230], [104, -112], [-104, -112], [-72, -230]], { fill: style.dress, lw: 4.5, seed: seed + 20, step: 16, hatch });
    ctx.save(); ctx.beginPath(); G.path(ctx, dress); ctx.clip();
    G.line(ctx, [[-110, -130], [110, -130]], { color: shade(style.dress, 0.8), lw: 9, seed: seed + 21 });
    ctx.restore();
    G.star(ctx, 0, -196, 30, { fill: style.accent, seed: seed + 22, rot: 0 });
    // sleeves
    for (const sd of [-1, 1]) G.ellipse(ctx, sd * 62, -252, 26, 22, { fill: style.dress, lw: 4, seed: seed + 24 + sd });

    // held prop (a block or the star) between the hands, in front of the body
    if (hold) hold(ctx, (handL[0] + handR[0]) / 2, (handL[1] + handR[1]) / 2 - 10);

    if (!low(handL)) drawArm(aL, -1);
    if (!low(handR)) drawArm(aR, 1);

    // head (pivots at the neck)
    ctx.save();
    ctx.translate(0, -276);
    ctx.rotate(headRot);
    ctx.translate(0, 276);
    const hy = -390;
    // hair puffs + back hair (behind the head)
    for (const sd of [-1, 1]) {
      G.shape(ctx, curls(sd * 132, hy - 34, 50, 54, 7, 0.16, sd), { fill: style.hair, lw: 4.5, seed: seed + 30 + sd, hatch: { color: 'rgba(120,40,0,0.25)', gap: 7 } });
    }
    G.shape(ctx, curls(0, hy - 18, 126, 112, 13, 0.08), { fill: style.hair, lw: 4.5, seed: seed + 33 });
    G.rrect(ctx, -16, -296, 32, 28, 8, { fill: skinD, lw: 3.5, seed: seed + 34 }); // neck
    // face
    G.ellipse(ctx, 0, hy, 116, 106, { fill: skin, lw: 4.5, seed: seed + 35 });
    // bangs: a curly fringe across the top of the head
    const fr = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI; fr.push([Math.cos(a) * 124, hy - 8 + Math.sin(a) * 114]); }
    for (let i = 0; i <= 24; i++) { const u = i / 24; const xx = 120 - u * 240; fr.push([xx, hy - 46 - Math.abs(Math.sin(u * Math.PI * 4)) * 26 + Math.sin(u * Math.PI) * -6]); }
    G.shape(ctx, fr, { fill: style.hair, lw: 4.5, seed: seed + 36, hatch: { color: 'rgba(120,40,0,0.22)', gap: 7 } });
    G.rrect(ctx, 64, hy - 92, 34, 18, 8, { fill: style.clip, lw: 3, seed: seed + 37 }); // hair clip

    // eyes
    const ex0 = 44, ey0 = hy + 8;
    for (const sd of [-1, 1]) {
      const ex = sd * ex0 + look * 10, ey = ey0 + lookY * 6;
      if (eyes === 'happy') G.line(ctx, [[ex - 18, ey + 6], [ex, ey - 12], [ex + 18, ey + 6]], { lw: 6, seed: seed + 40 + sd });
      else if (eyes === 'closed') G.line(ctx, [[ex - 18, ey - 2], [ex, ey + 10], [ex + 18, ey - 2]], { lw: 5.5, seed: seed + 42 + sd });
      else {
        const big = eyes === 'wide' ? 1.22 : 1;
        const open = 1 - U.clamp(blink);
        ctx.save(); ctx.translate(sd * ex0, ey0); ctx.scale(1, Math.max(0.08, open)); ctx.translate(-sd * ex0, -ey0);
        G.ellipse(ctx, sd * ex0, ey0, 25 * big, 31 * big, { fill: '#FFFFFF', lw: 3.5, seed: seed + 44 + sd, amp: 0.5 });
        const ir = eyes === 'wide' ? 0.8 : 1;
        ctx.fillStyle = '#5A3420'; ctx.beginPath(); ctx.ellipse(ex + look * 4, ey + lookY * 4, 17 * ir, 22 * ir, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1E120C'; ctx.beginPath(); ctx.ellipse(ex + look * 5, ey + lookY * 5, 9 * ir, 12 * ir, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(ex + look * 4 - 6, ey + lookY * 4 - 9, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + look * 4 + 6, ey + lookY * 4 + 7, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // brows
      const by = hy - 40 + (brows === 'up' || eyes === 'wide' ? -10 : 0);
      const inner = brows === 'worried' ? -10 : brows === 'determined' ? 9 : 0;
      G.line(ctx, [[sd * (ex0 - 18), by + inner], [sd * ex0, by - 6], [sd * (ex0 + 18), by - 1]], { lw: 5, seed: seed + 46 + sd, color: shade(style.hair, 0.55) });
    }
    // nose
    G.line(ctx, [[-6, hy + 40], [0, hy + 45], [6, hy + 40]], { lw: 3.5, seed: seed + 50, color: shade(skin, 0.6) });
    // cheeks
    if (blush > 0) {
      ctx.save(); ctx.globalAlpha *= blush; ctx.fillStyle = '#F08A8A';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 74, hy + 40, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    // mouth
    const my = hy + 64;
    if (mouth === 'smile') G.line(ctx, [[-24, my - 4], [0, my + 10], [24, my - 4]], { lw: 5, seed: seed + 52 });
    else if (mouth === 'sad') G.line(ctx, [[-20, my + 8], [0, my - 4], [20, my + 8]], { lw: 5, seed: seed + 53 });
    else if (mouth === 'flat') G.line(ctx, [[-16, my + 2], [16, my + 2]], { lw: 5, seed: seed + 54 });
    else if (mouth === 'o') G.ellipse(ctx, 0, my + 4, 12, 16, { fill: '#5A1E1E', lw: 4, seed: seed + 55 });
    else {
      const h = mouth === 'open' ? 34 : 24, w = mouth === 'open' ? 30 : 36;
      const pts = [];
      for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); pts.push([Math.cos(a) * w, my - 6 + Math.sin(a) * h]); }
      G.shape(ctx, pts, { fill: '#6A2222', lw: 4, seed: seed + 56 });
      ctx.fillStyle = '#F2858F'; ctx.beginPath(); ctx.ellipse(0, my - 6 + h * 0.72, w * 0.5, h * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      if (mouth === 'grin') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-w * 0.7, my - 4, w * 1.4, 7); }
    }
    ctx.restore(); // head
    ctx.restore();
  };
})();
