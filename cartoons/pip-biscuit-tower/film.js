// THE FILM: draws frame t of "Pip & Biscuit: The Wobbly Tower". Pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { BEAT, ev, clock, T, FLOOR, B, PIP, DOG, TOWER_X, FLIGHT, SAFE } = S;
  const { clamp, lerp, ease, pulse } = U;
  const W = G.W, H = G.H;
  const CX = SAFE.x + SAFE.w / 2;
  const WALL = FLOOR - 120;

  const hop = (t, amp) => amp * Math.sin(Math.PI * clock.phase(t));
  const between = (t, a, b) => t >= a && t < b;
  const blinkAt = (t, seed) => { const k = Math.floor(t / 2.7); const tb = k * 2.7 + 0.6 + U.hash(k, seed) * 1.6; return clamp(1 - Math.abs(t - tb) / 0.07); };

  // ---------- props ----------
  function block(ctx, x, y, color, letter, { rot = 0, sx = 1, sy = 1, size = B, glow = 0, alpha = 1, seed = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y + (size / 2) * (1 - sy)); // squash from the bottom edge
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    if (glow > 0) {
      const g = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, size * 1.1);
      g.addColorStop(0, `rgba(255,248,210,${0.9 * glow})`); g.addColorStop(1, 'rgba(255,248,210,0)');
      ctx.fillStyle = g; ctx.fillRect(-size * 1.2, -size * 1.2, size * 2.4, size * 2.4);
    }
    const h = size / 2;
    G.rrect(ctx, -h, -h, size, size, 14, { fill: color, lw: 4.5, seed, hatch: { color: 'rgba(0,0,0,0.16)', gap: 8 } });
    G.rrect(ctx, -h + 13, -h + 13, size - 26, size - 26, 10, { fill: G.tint(color, 0.45), lw: 2.5, seed: seed + 1 });
    G.text(ctx, letter, 0, size * 0.21, { size: size * 0.56, fam: 'Bungee', weight: 400, color: G.tint(color, -0.45), align: 'center' });
    ctx.restore();
  }

  function sparkle(ctx, x, y, t, t0, { n = 6, r = 70, color = '#FFF6D0' } = {}) {
    const a = t - t0;
    if (a < 0 || a > 0.32) return;
    const u = a / 0.32;
    ctx.save();
    ctx.globalAlpha *= 1 - u;
    ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.3;
      const r0 = r * (0.35 + 0.6 * u), r1 = r * (0.65 + 0.7 * u);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0); ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1); ctx.stroke();
    }
    ctx.restore();
  }

  function flight(from, to, t, t0, dur, arc = 150) {
    const p = clamp((t - t0) / dur);
    return { x: lerp(from[0], to[0], p), y: lerp(from[1], to[1], p) - arc * 4 * p * (1 - p), p };
  }
  const landSquash = (t, tl) => { const a = t - tl; if (a < 0 || a > 0.5) return [1, 1]; const k = Math.exp(-a * 9) * Math.cos(a * 30); return [1 + 0.16 * k, 1 - 0.2 * k]; };

  // ---------- background (static, cached) ----------
  function drawBg(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, WALL);
    g.addColorStop(0, '#D7F1EA'); g.addColorStop(1, '#BFE5DA');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, WALL + 10);
    // polka dots
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let r = 0; r < 14; r++) for (let c = 0; c < 8; c++) {
      const x = c * 150 + (r % 2) * 75 + 30, y = r * 110 + 40;
      if (y < WALL - 30) { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); }
    }
    // window (high on the left)
    G.rrect(ctx, 80, 640, 300, 330, 18, { fill: '#9ED8F5', lw: 6, seed: 61 });
    G.ellipse(ctx, 200, 760, 70, 34, { fill: '#FFFFFF', lw: 0, seed: 62, second: false });
    G.ellipse(ctx, 270, 860, 50, 24, { fill: '#FFFFFF', lw: 0, seed: 63, second: false });
    G.line(ctx, [[230, 645], [230, 965]], { lw: 6, seed: 64 }); G.line(ctx, [[85, 805], [375, 805]], { lw: 6, seed: 65 });
    G.rrect(ctx, 60, 960, 340, 26, 8, { fill: '#FFFFFF', lw: 4, seed: 66 });
    // shelf with toys (high on the right, above Biscuit)
    G.rrect(ctx, 690, 940, 250, 22, 6, { fill: '#C98A4B', lw: 4, seed: 67 });
    G.ellipse(ctx, 740, 895, 42, 42, { fill: '#E84A3C', lw: 4, seed: 68 });
    G.line(ctx, [[700, 895], [780, 895]], { lw: 5, color: '#FFFFFF', seed: 69 });
    G.rrect(ctx, 805, 880, 62, 60, 10, { fill: '#3D8BE0', lw: 4, seed: 70 });
    G.poly(ctx, [[880, 940], [900, 862], [920, 940]], { fill: '#F7C948', lw: 4, seed: 71, step: 12 });
    // baseboard + wooden floor
    ctx.fillStyle = '#E9C79B'; ctx.fillRect(0, WALL, W, H - WALL);
    for (let k = 0; k < 9; k++) G.line(ctx, [[0, WALL + 40 + k * 70], [W, WALL + 40 + k * 70]], { lw: 3, color: 'rgba(140,90,40,0.35)', seed: 80 + k });
    G.rrect(ctx, -20, WALL - 14, W + 40, 26, 4, { fill: '#FFFFFF', lw: 4, seed: 79 });
    // rug
    G.ellipse(ctx, W / 2, FLOOR + 90, 590, 175, { fill: '#3DB4A6', lw: 5, seed: 90, hatch: { color: 'rgba(0,60,60,0.18)', gap: 9 } });
    ctx.fillStyle = 'rgba(255,248,230,0.8)';
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(W / 2 + Math.cos(a) * 430, FLOOR + 90 + Math.sin(a) * 115, 22, 9, 0, 0, Math.PI * 2); ctx.fill(); }
    // bunting across the top
    const pts = [];
    for (let i = 0; i <= 10; i++) { const x = (i / 10) * W; pts.push([x, 120 + Math.sin((i / 10) * Math.PI) * 60]); }
    G.line(ctx, pts, { lw: 4, seed: 95 });
    for (let i = 0; i < 10; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      G.poly(ctx, [[x0 + 12, y0 + 2], [x1 - 12, y1 + 2], [(x0 + x1) / 2, (y0 + y1) / 2 + 70]], { fill: S.COLORS[i % 6], lw: 3.5, seed: 96 + i, step: 14 });
    }
  }

  // ---------- characters ----------
  const PIP_HOLD = [PIP.x, FLOOR - 236 * PIP.s];
  function dogMouth(d) { return [d.x + d.look * 14 * d.s * (d.sx || 1), d.y - 112 * d.s * (d.sy || 1)]; }

  function pipPose(t) {
    const o = { x: PIP.x, y: FLOOR, s: PIP.s, eyes: 'normal', mouth: 'smile', brows: 'neutral', look: 0.35, lookY: 0, blink: blinkAt(t, 1), handL: [-92, -150], handR: [92, -150], headRot: 0, hold: null };
    const holdBlock = (b) => (ctx, x, y) => block(ctx, x, y, b.color, b.letter, { size: B * 0.9, seed: 300 + b.i });
    if (t < T(2) - FLIGHT - 0.25) { // intro: bounce + wave
      o.y -= hop(t, 16); o.mouth = 'grin'; o.look = 0; o.handR = [118 + 26 * Math.sin(t * 11), -400];
    } else if (t < T(3, 1) + 0.2) { // round 1: throw a block on every beat
      o.look = 0.8; o.lookY = -0.8; o.mouth = 'grin'; o.brows = 'determined';
      for (const b of S.round1) {
        const t0 = b.land - FLIGHT;
        if (between(t, t0 - 0.2, t0)) { o.handL = [-34, -232]; o.handR = [34, -232]; o.hold = holdBlock(b); o.sy = 0.96; }
        if (between(t, t0, t0 + 0.2)) { const k = ease.outQuad((t - t0) / 0.2); o.handL = [-34 - 40 * k, -232 - 190 * k]; o.handR = [34 + 40 * k, -232 - 190 * k]; o.sy = 1.04; }
      }
    } else if (t < ev.bumpJump) { // proud of the tower
      o.eyes = 'happy'; o.mouth = 'grin'; o.handL = [-118, -410]; o.handR = [118, -410]; o.y -= hop(t, 12);
    } else if (t < ev.bump) { o.eyes = 'wide'; o.mouth = 'o'; o.look = 1; o.brows = 'up'; }
    else if (t < ev.scratch) { // the crash
      o.eyes = 'wide'; o.mouth = 'o'; o.brows = 'up'; o.handL = [-104, -335]; o.handR = [104, -335];
      o.look = 0.6; o.lookY = clamp((t - ev.topple) / 0.8) * 1.2 - 0.4;
    } else if (t < ev.sad) { o.eyes = 'wide'; o.mouth = 'o'; o.brows = 'worried'; o.handL = [-104, -335]; o.handR = [104, -335]; o.lookY = 0.5; }
    else if (t < ev.think) { o.mouth = 'sad'; o.brows = 'worried'; o.lookY = 1; o.look = 0.4; o.headRot = -0.08; }
    else if (t < ev.idea) { o.mouth = 'flat'; o.brows = 'up'; o.look = -0.5; o.lookY = -0.9; o.handR = [26, -312]; o.headRot = 0.06; }
    else if (t < S.round2[0].land - FLIGHT - 0.35) { // lightbulb!
      o.eyes = 'happy'; o.mouth = 'grin'; o.handR = [72, -450]; o.y -= 40 * Math.max(0, U.springKick(t, ev.idea, 2.5, 6));
    } else if (t < T(11, 2) + 0.05) { // round 2: Pip throws on the downbeats, watches Biscuit on beat 3
      o.eyes = 'normal'; o.mouth = 'grin'; o.look = 0.8; o.lookY = -0.6;
      for (const b of S.round2) {
        const t0 = b.land - FLIGHT;
        if (b.who === 'pip') {
          if (between(t, t0 - 0.35, t0)) { o.handL = [-34, -232]; o.handR = [34, -232]; o.hold = holdBlock(b); o.lookY = 0; }
          if (between(t, t0, t0 + 0.25)) { const k = ease.outQuad((t - t0) / 0.25); o.handL = [-34 - 40 * k, -232 - 190 * k]; o.handR = [34 + 40 * k, -232 - 190 * k]; }
        } else if (between(t, b.land - 0.05, b.land + 0.35)) { o.eyes = 'happy'; o.handL = [-30, -300]; o.handR = [30, -300]; }
      }
    } else if (t < ev.star) { // the star
      o.look = 0.8; o.lookY = -0.9; o.mouth = 'open'; o.brows = 'up';
      const t0 = ev.star - FLIGHT;
      if (t < t0) { o.handL = [-30, -420]; o.handR = [30, -420]; o.hold = (ctx, x, y) => G.star(ctx, x, y - 40, 52, { fill: '#F7C948', seed: 501, lw: 4 }); }
      else { const k = ease.outQuad(clamp((t - t0) / 0.2)); o.handL = [-30 - 80 * k, -420]; o.handR = [30 + 80 * k, -420]; }
    } else if (t < ev.end) { // party
      o.y -= hop(t, 70); o.eyes = 'happy'; o.mouth = 'open'; o.blush = 0.9;
      const w = Math.sin(t * 14) * 18; o.handL = [-120 + w, -420]; o.handR = [120 - w, -420];
    } else { o.mouth = 'grin'; o.y -= hop(t, 10); o.handR = [118 + 26 * Math.sin(t * 9), -400]; o.look = 0; }
    return o;
  }

  function dogPose(t) {
    const d = { x: DOG.x, y: FLOOR, s: DOG.s, sx: 1, sy: 1, rot: 0, happy: 0.7, look: -0.4, pose: 'sit', bark: 0, hold: null };
    const barkAt = (tb) => (t >= tb ? Math.exp(-(t - tb) * 7) * (t - tb < 0.4 ? 1 : 0) : 0);
    if (t < T(2) - 0.3) { d.y -= hop(t + BEAT / 2, 10); d.look = -0.2; d.bark = barkAt(T(1, 3)); }
    else if (t < T(3, 2)) { // watching every block land
      d.look = -1; d.happy = 0.9;
      for (const b of S.round1) { const k = landSquash(t, b.land); d.sy *= k[1] * 0.5 + 0.5; d.bark = Math.max(d.bark, barkAt(b.land) * 0.7); }
    } else if (t < ev.bumpJump) { const k = (t - T(3, 2)) / BEAT; d.sy = 1 - 0.18 * k; d.sx = 1 + 0.12 * k; d.look = -1; d.happy = 1; }
    else if (t < ev.bump) { // the leap
      const p = (t - ev.bumpJump) / (ev.bump - ev.bumpJump);
      d.x = lerp(DOG.x, TOWER_X + 150, ease.inOutQuad(p)); d.y = FLOOR - 230 * 4 * p * (1 - p); d.sy = 1.14; d.sx = 0.92; d.rot = -0.25; d.pose = 'stand'; d.look = -1; d.happy = 1; d.bark = 0.6;
    } else if (t < ev.bump + BEAT) { // bonk, bounce back
      const p = (t - ev.bump) / BEAT;
      d.x = lerp(TOWER_X + 150, DOG.x - 20, ease.outQuad(p)); d.y = FLOOR - 70 * 4 * p * (1 - p);
      const k = Math.exp(-p * 6); d.sx = 1 + 0.25 * k; d.sy = 1 - 0.25 * k; d.rot = 0.15 * k; d.happy = 0.2; d.look = -0.8;
    } else if (t < ev.scratch) { d.x = DOG.x - 20; d.happy = 0; d.look = -0.8; }
    else if (t < ev.idea) { d.x = DOG.x - 20; d.happy = 0; d.look = -0.5; d.sy = 0.92; d.rot = 0.05; }
    else if (t < T(8) - 0.6) { d.x = lerp(DOG.x - 20, DOG.x, clamp((t - ev.idea) / 0.5)); d.happy = 1; d.bark = barkAt(T(7, 3)); d.y -= 30 * Math.max(0, U.springKick(t, T(7, 3), 2.5, 6)); }
    else if (t < ev.star) { // round 2: Biscuit fetches a block in his mouth and tosses it on beat 3
      d.happy = 0.9; d.look = -0.8;
      for (const b of S.round2) {
        const t0 = b.land - FLIGHT;
        if (b.who === 'dog') {
          if (between(t, t0 - 0.35, t0)) { d.hold = b; d.look = -0.3; d.happy = 0.3; }
          if (between(t, t0, t0 + 0.3)) { const p = (t - t0) / 0.3; d.y -= 50 * Math.sin(Math.PI * p); d.bark = 1 - p; d.rot = -0.12 * Math.sin(Math.PI * p); }
        } else { const k = landSquash(t, b.land); d.sy *= k[1] * 0.5 + 0.5; }
      }
      if (t > T(11, 2) + 0.2) { d.look = -0.9; d.happy = 1; }
    } else if (t < ev.end) { d.y -= hop(t + BEAT / 2, 50); d.happy = 1; d.bark = barkAt(ev.star + Math.floor((t - ev.star) / BEAT) * BEAT) * 0.8; d.rot = Math.sin(t * 9) * 0.08; }
    else { d.happy = 0.8; d.look = -0.2; }
    return d;
  }

  function drawDog(ctx, d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.scale(d.sx, d.sy);
    Ch.dog(ctx, { x: 0, y: 0, s: d.s, color: '#D9A066', ear: '#8A5A33', happy: d.happy, look: d.look, pose: d.pose, bark: d.bark, seed: 720 });
    // red collar + gold bell
    G.rrect(ctx, -44 * d.s, -114 * d.s, 88 * d.s, 15 * d.s, 7, { fill: '#E84A3C', lw: 3.5, seed: 731 });
    G.ellipse(ctx, d.look * 6, -96 * d.s, 9 * d.s, 9 * d.s, { fill: '#F2B84B', lw: 3, seed: 732 });
    ctx.restore();
    if (d.hold) { const [mx, my] = dogMouth(d); block(ctx, mx, my + 8, d.hold.color, d.hold.letter, { size: B * 0.72, rot: -0.15, seed: 300 + d.hold.i }); }
  }

  // ---------- the tower ----------
  function towerAngle(t) {
    if (t < ev.bump || t >= ev.topple) return 0;
    const a = t - ev.bump;
    return 0.085 * Math.sin(a * Math.PI * 2 * 3.1) * clamp(a / 0.25) * (1 + a);
  }
  function rotAbout(x, y, ang) { const dx = x - TOWER_X, dy = y - FLOOR; return [TOWER_X + dx * Math.cos(ang) - dy * Math.sin(ang), FLOOR + dx * Math.sin(ang) + dy * Math.cos(ang)]; }

  function round1Blocks(ctx, t, d) {
    const picked = (j) => S.round2[j] && t >= S.round2[j].land - FLIGHT - 0.35;
    S.round1.forEach((b, j) => {
      const t0 = b.land - FLIGHT;
      const f = S.fall[j];
      if (t < t0) return; // still in Pip's hands (drawn by Ch.kid)
      if (t < b.land) { const q = flight(PIP_HOLD, [b.x, b.y], t, t0, FLIGHT, 160 + b.i * 20); block(ctx, q.x, q.y, b.color, b.letter, { rot: (1 - q.p) * -1.2, sx: lerp(0.9, 1, q.p), sy: lerp(0.9, 1, q.p), seed: 300 + b.i }); return; }
      if (t < ev.topple) {
        const ang = towerAngle(t);
        const jig = t >= ev.bump ? Math.sin((t - ev.bump) * 40 + b.i) * 4 * b.i * clamp((t - ev.bump) / 0.3) : 0;
        const [x, y] = rotAbout(b.x + jig, b.y, ang);
        const k = landSquash(t, b.land);
        block(ctx, x, y, b.color, b.letter, { rot: ang, sx: k[0], sy: k[1], seed: 300 + b.i });
        return;
      }
      // tumbling down (top block first), then lying on the rug until picked up for round 2
      const x0 = rotAbout(b.x, b.y, towerAngle(ev.topple - 1e-3))[0], y0 = b.y, yf = FLOOR - B / 2;
      if (t < f.land) {
        const p = clamp((t - ev.topple) / (f.land - ev.topple));
        const x = lerp(x0, f.x1, p), y = lerp(y0, yf, ease.inQuad(p)) - (b.i ? 120 : 30) * 4 * p * (1 - p);
        block(ctx, x, y, b.color, b.letter, { rot: lerp(0, f.rot1 + f.spin, p), seed: 300 + b.i });
        return;
      }
      if (picked(j)) {
        const a = t - (S.round2[j].land - FLIGHT - 0.35);
        if (a > 0.15) return;
        block(ctx, f.x1, yf, b.color, b.letter, { rot: f.rot1, sx: 1 - a / 0.15, sy: 1 - a / 0.15, alpha: 1 - a / 0.15, seed: 300 + b.i });
        return;
      }
      const a = t - f.land;
      const bounce = a < 0.45 ? Math.abs(Math.sin(a * Math.PI / 0.22)) * 26 * Math.exp(-a * 6) : 0;
      block(ctx, f.x1, yf - bounce, b.color, b.letter, { rot: f.rot1, seed: 300 + b.i });
    });
  }

  function round2Blocks(ctx, t, d) {
    for (const b of S.round2) {
      const t0 = b.land - FLIGHT;
      if (t < t0) continue;
      const from = b.who === 'pip' ? PIP_HOLD : dogMouth(dogPose(t0 - 0.01));
      if (t < b.land) { const q = flight(from, [b.x, b.y], t, t0, FLIGHT, 170); block(ctx, q.x, q.y, b.color, b.letter, { rot: (1 - q.p) * (b.who === 'pip' ? -1.2 : 1.2), sx: lerp(0.85, 1, q.p), sy: lerp(0.85, 1, q.p), seed: 300 + b.i }); continue; }
      const k = landSquash(t, b.land);
      const sp = S.spell[7 - b.i]; // the word reads top-down
      let glow = 0, pop = 1;
      if (t >= sp.t) { glow = 0.35 + 0.65 * pulse(t, sp.t, 5); pop = 1 + 0.18 * pulse(t, sp.t, 9); }
      if (t >= ev.star) glow = Math.max(glow, 0.25 * pulse(t, ev.star + Math.floor((t - ev.star) / BEAT) * BEAT, 6));
      block(ctx, b.x, b.y, b.color, b.letter, { sx: k[0] * pop, sy: k[1] * pop, glow, seed: 300 + b.i });
    }
  }

  function star(ctx, t) {
    if (t < ev.star - FLIGHT) return;
    const from = [PIP.x, FLOOR - 460];
    if (t < ev.star) { const q = flight(from, [S.starAt.x, S.starAt.y], t, ev.star - FLIGHT, FLIGHT, 220); G.star(ctx, q.x, q.y, 52, { fill: '#F7C948', rot: q.p * Math.PI * 2, seed: 501, lw: 4 }); return; }
    const beatT = ev.star + Math.floor((t - ev.star) / BEAT) * BEAT;
    const r = 66 * (1 + 0.5 * pulse(t, ev.star, 7) + 0.1 * pulse(t, beatT, 8));
    G.star(ctx, S.starAt.x, S.starAt.y, r, { fill: '#FFD23F', rot: Math.sin(t * 3) * 0.12, seed: 502, lw: 5 });
  }

  function sunburst(ctx, t) {
    if (t < ev.star) return;
    const a = clamp((t - ev.star) / 0.25) * (t > ev.end ? 1 - clamp((t - ev.end) / 0.8) : 1);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.55 * a;
    ctx.translate(S.starAt.x, S.starAt.y);
    ctx.rotate((t - ev.star) * 0.35);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 ? '#FFE07A' : '#FFF4C9';
      const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * 2400, Math.sin(a0) * 2400); ctx.lineTo(Math.cos(a1) * 2400, Math.sin(a1) * 2400); ctx.fill();
    }
    ctx.restore();
  }

  function lightbulb(ctx, t) {
    if (t < ev.idea || t > T(8) + 0.2) return;
    const u = ease.outBack(clamp((t - ev.idea) / 0.22), 2.5) * (1 - clamp((t - T(8)) / 0.2));
    const x = PIP.x - 100, y = FLOOR - 590;
    ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    g.addColorStop(0, 'rgba(255,240,150,0.9)'); g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g; ctx.fillRect(-130, -130, 260, 260);
    G.ellipse(ctx, 0, -10, 40, 44, { fill: '#FFE45C', lw: 4.5, seed: 551 });
    G.rrect(ctx, -18, 28, 36, 26, 6, { fill: '#B8B8C8', lw: 3.5, seed: 552 });
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; G.line(ctx, [[Math.cos(a) * 58, -10 + Math.sin(a) * 58], [Math.cos(a) * 82, -10 + Math.sin(a) * 82]], { lw: 5, seed: 553 + i }); }
    ctx.restore();
  }

  // ---------- titles ----------
  function stampLetters(ctx, t, letters, y, size, seed, exitT) {
    const gap = size * 0.98;
    const n = letters.length;
    const exit = exitT ? clamp((t - exitT) / 0.3) : 0;
    letters.forEach((L, j) => {
      if (t < L.t) return;
      const u = clamp((t - L.t) / 0.13);
      const sc = lerp(2.6, 1, ease.outBack(u, 2));
      const x = CX + (j - (n - 1) / 2) * gap;
      const r = (U.hash(j, seed) - 0.5) * 0.3;
      ctx.save();
      ctx.globalAlpha *= clamp(u * 3) * (1 - exit);
      ctx.translate(x, y - exit * 160);
      ctx.rotate(r);
      ctx.scale(sc, sc);
      const col = S.COLORS[(j + seed) % 6];
      G.rrect(ctx, -size * 0.46, -size * 0.52, size * 0.92, size * 1.04, 12, { fill: col, lw: 4.5, seed: seed + j });
      G.text(ctx, L.ch, 0, size * 0.3, { size: size * 0.78, fam: 'Bungee', weight: 400, color: '#FFFFFF', align: 'center', stroke: G.C.ink, strokeW: 7 });
      ctx.restore();
    });
  }

  function titles(ctx, t) {
    if (t < T(2) + 0.4) {
      stampLetters(ctx, t, S.title.filter((L) => L.line === 0), SAFE.y + 120, 120, 3, T(2) - 0.25);
      stampLetters(ctx, t, S.title.filter((L) => L.line === 1), SAFE.y + 265, 112, 1, T(2) - 0.25);
      const a = clamp((t - S.subtitle.t) / 0.3) * (1 - clamp((t - (T(2) - 0.25)) / 0.3));
      if (a > 0) G.text(ctx, S.subtitle.text, CX, SAFE.y + 395, { size: 66, fam: 'Patrick Hand', weight: 400, color: G.C.ink, align: 'center', alpha: a });
    }
    if (t >= ev.spell) {
      const letters = S.spell.map((L) => ({ ch: L.ch, t: L.t }));
      stampLetters(ctx, t, letters, SAFE.y + 110, 100, 2, null);
    }
    if (t >= S.endLine.t) {
      const a = clamp((t - S.endLine.t) / 0.4);
      ctx.save(); ctx.globalAlpha *= a;
      G.rrect(ctx, CX - 300, SAFE.y + 196, 600, 92, 40, { fill: '#FFFFFF', lw: 4.5, seed: 601 });
      G.text(ctx, S.endLine.text, CX - 18, SAFE.y + 260, { size: 60, fam: 'Patrick Hand', weight: 400, color: G.C.ink, align: 'center' });
      G.heart(ctx, CX + 252, SAFE.y + 240, 0.9, { seed: 602 });
      ctx.restore();
    }
  }

  function bubbles(ctx, t) {
    const [a, b] = S.bubbles;
    G.bubble(ctx, a.text, PIP.x + 60, FLOOR - 640, PIP.x + 40, FLOOR - 520, t, a.t0, a.t1, { size: 84 });
    G.bubble(ctx, b.text, CX - 10, FLOOR - 700, PIP.x + 50, FLOOR - 540, t, b.t0, b.t1, { size: 60 });
  }

  Studio.film({
    draw(ctx, t) {
      // camera: a slow push-in while Pip is sad, a 1% pulse on the beat in the party
      let zoom = 1, zx = W / 2, zy = FLOOR - 300;
      if (between(t, ev.scratch, ev.idea)) zoom = 1 + 0.05 * ease.inOutQuad(clamp((t - ev.scratch) / (ev.idea - ev.scratch)));
      if (between(t, ev.idea, ev.idea + 0.4)) zoom = 1.05 - 0.05 * ease.outQuad((t - ev.idea) / 0.4);
      if (between(t, ev.star, ev.end)) zoom = 1 + 0.012 * pulse(t, ev.star + Math.floor((t - ev.star) / BEAT) * BEAT, 8);
      if (between(t, ev.scratch, ev.idea)) zx = PIP.x + 120;
      const shake = (t >= ev.bump ? 12 * Math.exp(-(t - ev.bump) * 9) : 0) + (t >= ev.star ? 16 * Math.exp(-(t - ev.star) * 7) : 0);

      ctx.save();
      ctx.translate(zx, zy); ctx.scale(zoom, zoom); ctx.translate(-zx, -zy);
      ctx.translate(U.noise1(t * 30, 1) * shake, U.noise1(t * 30, 2) * shake);
      ctx.drawImage(Studio.cache('bg', drawBg), 0, 0, W, H);
      sunburst(ctx, t);
      const d = dogPose(t);
      round1Blocks(ctx, t, d);
      round2Blocks(ctx, t, d);
      star(ctx, t);
      Ch.kid(ctx, pipPose(t));
      drawDog(ctx, d);
      // little sparkles on every landing + the bonk
      for (const b of S.round1) sparkle(ctx, b.x, b.y - B / 2, t, b.land);
      for (const b of S.round2) sparkle(ctx, b.x, b.y - B / 2, t, b.land);
      sparkle(ctx, TOWER_X + 70, FLOOR - 250, t, ev.bump, { n: 8, r: 110, color: '#FFFFFF' });
      if (between(t, ev.bump, ev.bump + 0.25)) G.star(ctx, TOWER_X + 70, FLOOR - 250, 60 * (1 - (t - ev.bump) / 0.25) + 20, { fill: '#FFFFFF', seed: 560 });
      lightbulb(ctx, t);
      if (t >= ev.star) G.confetti(ctx, t, ev.star, { n: 170, seed: 5, spawn: 2.2 });
      ctx.restore();

      // the world turns blue while Pip is sad
      if (between(t, ev.scratch, ev.idea + 0.3)) {
        const a = Math.min(clamp((t - ev.scratch) / 0.06), 1 - clamp((t - ev.idea) / 0.3));
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(110,130,200,${0.45 * a})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      const flash = (t >= ev.idea ? 0.55 * Math.exp(-(t - ev.idea) * 10) : 0) + (t >= ev.star ? 0.8 * Math.exp(-(t - ev.star) * 12) : 0);
      if (flash > 0.01) { ctx.fillStyle = `rgba(255,252,235,${Math.min(0.9, flash)})`; ctx.fillRect(0, 0, W, H); }
      bubbles(ctx, t);
      titles(ctx, t);
    },
    post: { paper: 0.45, vignette: 0.28, grain: 0.05 },
    fadeOut: 1.2,
  });
})();
