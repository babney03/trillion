// Kit film: draws any kit episode from SCORE.KIT. Pure function of t.
// Optional per-episode hooks (custom.js): globalThis.EPISODE = { behind(ctx,t,api), front(ctx,t,api), screen(ctx,t,api) }
(function () {
  const Kit = globalThis.Kit, D = Kit.D, U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const K = S.KIT, W = G.W, H = G.H, SAFE = S.SAFE, CX = SAFE.x + SAFE.w / 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  K.clock = S.clock;
  Kit.actors.prepare(K);
  const set = Kit.sets[K.set.name];
  K._propOps = {};
  for (const op of K.propOps) (K._propOps[op.prop] = K._propOps[op.prop] || []).push(op);
  let VO = null;

  // ---------- characters ----------
  const castList = Object.values(K.cast).sort((a, b) => (a.z || 0) - (b.z || 0));
  function actor(id, t) {
    const c = K.cast[id];
    const st = Kit.actors.state(c, t, K, VO);
    // secondary motion from velocity: hair puffs and ears swing
    const prev = Kit.actors.state(c, t - 1 / 30, K, null);
    const vy = (st.y - prev.y) * 30, vx = (st.x - prev.x) * 30;
    st.hair = clamp(-vy / 900, -1, 1) + Math.sin(t * 2.1 + c.x) * 0.08;
    st.earSwing = clamp(-vx / 1400, -0.5, 0.5) + clamp(vy / 2000, -0.3, 0.3);
    return st;
  }
  const anchor = (st, slot) => { const a = Kit.chars[st.kind].anchors(st); return a[slot] || a.hands || a.mouth; };

  // ---------- props ----------
  function propState(id, t) {
    const P = K.props[id];
    const st = { visible: P.x !== undefined, x: P.x, y: P.y, rot: P.rot || 0, s: P.s || 1, held: null, fly: null, wob: null, glow: 0, landedAt: null, pop: null };
    for (const op of K._propOps[id] || []) {
      if (op.t > t) break;
      if (op.op === 'at') { Object.assign(st, { visible: true, x: op.x, y: op.y, rot: op.rot || 0, held: null, fly: null }); if (op.landed) st.landedAt = op.t; }
      else if (op.op === 'hide') { st.visible = false; st.held = null; st.fly = null; }
      else if (op.op === 'pop') { if (t < op.t + 0.2) st.pop = (t - op.t) / 0.2; else st.visible = false; }
      else if (op.op === 'hold') { if (t < op.t1) { st.visible = true; st.fly = null; st.held = { who: op.who, slot: op.slot, t: op.t }; } else st.held = null; }
      else if (op.op === 'fly') { if (t < op.t1) { st.visible = true; st.held = null; st.fly = op; } }
      else if (op.op === 'wobble') { if (t < op.t1) st.wob = op; }
      else if (op.op === 'glow') { if (t < op.t1) st.glow = 1; }
    }
    return st;
  }
  // world position of a prop at t
  function propWorld(id, t, states) {
    const st = propState(id, t);
    if (!st.visible) return null;
    const P = K.props[id];
    let x = st.x, y = st.y, rot = st.rot, sx = 1, sy = 1, scale = st.s;
    if (st.held) {
      const a = states && states[st.held.who] ? states[st.held.who] : actor(st.held.who, t);
      [x, y] = anchor(a, st.held.slot);
      if (a.kind === 'biscuit') { y += 6; scale *= 0.72; rot = -0.15; }
      return { x, y, rot, sx, sy, s: scale, held: st.held, kind: P.kind, P, glow: st.glow };
    }
    if (st.fly) {
      const op = st.fly;
      let fx, fy, frot = 0;
      if (op.from === 'current') { const w = propWorld(id, op.t - 1e-4); fx = w ? w.x : op.to[0]; fy = w ? w.y : op.to[1]; frot = w ? w.rot : 0; }
      else { const a = actor(op.from.who, op.t); [fx, fy] = anchor(a, op.from.slot); }
      const p = clamp((t - op.t) / (op.t1 - op.t));
      x = lerp(fx, op.to[0], p); y = lerp(fy, op.to[1], op.from === 'current' ? U.ease.inQuad(p) : p) - op.arc * 4 * p * (1 - p);
      rot = (op.rot || 0) + (op.spin || 0) * 1.2 * (1 - p) + frot * (1 - p);
      const k = op.from !== 'current' && op.from.slot === 'mouth' ? lerp(0.72, 1, p) : lerp(0.9, 1, p);
      return { x, y, rot, sx: k, sy: k, s: scale, flying: true, kind: P.kind, P, glow: st.glow };
    }
    if (st.wob) {
      const op = st.wob, a = t - op.t;
      const ang = op.amp * Math.sin(a * Math.PI * 2 * op.freq) * clamp(a / 0.25) * (1 + a * 0.8);
      const [px, py] = op.pivot || [x, y + 52];
      const dx = x - px, dy = y - py;
      x = px + dx * Math.cos(ang) - dy * Math.sin(ang) + Math.sin(a * 40 + (P.seed || 0)) * 2.5;
      y = py + dx * Math.sin(ang) + dy * Math.cos(ang);
      rot += ang;
    }
    if (st.landedAt !== null) { const a = t - st.landedAt; if (a < 0.5) { const k = Math.exp(-a * 9) * Math.cos(a * 30); sx = 1 + 0.15 * k; sy = 1 - 0.18 * k; } }
    if (st.pop !== null) { sx = sy = 1 - st.pop; }
    return { x, y, rot, sx, sy, s: scale, kind: P.kind, P, glow: st.glow };
  }
  function drawProp(ctx, w) {
    const half = ((Kit.props.size[w.kind] || 100) / 2) * w.s;
    Kit.props.draw(ctx, w.kind, w.x, w.y + half * (1 - w.sy), { rot: w.rot, sx: w.sx, sy: w.sy, s: w.s, color: w.P.color, letter: w.P.letter, glow: w.glow, bite: w.P.bite });
  }

  // ---------- camera ----------
  function camAt(t) {
    let cam = { zoom: 1, x: W / 2, y: H / 2 }; // the point shown at the centre of the screen
    for (const c of K.cam) {
      if (c.t0 > t) break;
      const u = clamp((t - c.t0) / Math.max(1e-3, c.t1 - c.t0));
      const e = U.ease.inOutCubic(u);
      cam = { zoom: lerp(cam.zoom, c.zoom ?? cam.zoom, e), x: lerp(cam.x, c.x ?? cam.x, e), y: lerp(cam.y, c.y ?? cam.y, e) };
    }
    // a gentle drift so the frame is never dead still (a hair of zoom gives it room), then keep the view inside the set
    cam.zoom = Math.max(1.012, cam.zoom);
    cam.x += Math.sin(t * 0.35) * 5; cam.y += Math.sin(t * 0.27) * 4;
    const hw = W / (2 * cam.zoom), hh = H / (2 * cam.zoom);
    cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh);
    return cam;
  }
  const shakeAt = (t) => K.fx.filter((f) => f.type === 'shake' && t >= f.t).reduce((a, f) => a + (f.amp || 14) * Math.exp(-(t - f.t) * (f.decay || 8)), 0);

  // ---------- text: stamped letters, end card ----------
  function stampRow(ctx, letters, row, y, size, t, exitT, seed) {
    const L = letters.filter((l) => l.row === row);
    const n = L.length, gap = size * 0.95;
    L.forEach((l, j) => {
      if (t < l.t || l.ch === ' ') return;
      const u = clamp((t - l.t) / 0.14);
      const sc = lerp(2.4, 1, U.ease.outBack(u, 2));
      const ex = exitT ? clamp((t - exitT) / 0.3) : 0;
      const x = CX + (j - (n - 1) / 2) * gap;
      const r = (U.hash(j, seed) - 0.5) * 0.28 + Math.sin(t * 3 + j) * 0.03;
      const c = Kit.props.COLORS[(j + seed) % 8];
      ctx.save(); ctx.globalAlpha *= clamp(u * 3) * (1 - ex); ctx.translate(x, y - ex * 200 + Math.sin(t * 4 + j * 0.8) * 4); ctx.rotate(r); ctx.scale(sc, sc);
      D.rr(ctx, -size * 0.46, -size * 0.52, size * 0.92, size * 1.04, 16, D.lin(ctx, 0, -size * 0.52, 0, size * 0.52, [[0, D.light(c, 0.2)], [1, D.dark(c, 0.1)]]), { lw: 5 });
      D.title(ctx, l.ch, 0, size * 0.03, { size: size * 0.74, color: '#FFFFFF', stroke: 9, shadow: false });
      D.shine(ctx, -size * 0.3, -size * 0.36, size * 0.07, 0.6);
      ctx.restore();
    });
  }
  function texts(ctx, t) {
    for (const tx of K.texts) {
      if (t < tx.t) continue;
      if (tx.kind === 'title' || tx.kind === 'stamp') {
        if (tx.t1 && t > tx.t1 + 0.4) continue;
        tx.rows.forEach((row, r) => {
          const n = row.length, size = tx.size || Math.min(124, (SAFE.w - 40) / (n * 0.95));
          stampRow(ctx, tx.letters, r, (tx.y ?? SAFE.y + 110) + r * size * 1.18, size, t, tx.t1, r * 3 + 1);
        });
        if (tx.kind === 'title' && tx.sub) { const a = clamp((t - tx.subT) / 0.3) * (1 - clamp((t - tx.t1) / 0.3)); if (a > 0) { ctx.save(); ctx.globalAlpha *= a; D.title(ctx, tx.sub, CX, (tx.y ?? SAFE.y + 110) + tx.rows.length * 140 + 10, { size: 54, color: '#FFFFFF', stroke: 10, fam: 'Bungee' }); ctx.restore(); } }
      } else if (tx.kind === 'end') {
        const a = clamp((t - tx.t) / 0.4), y = tx.y ?? SAFE.y + 290;
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(CX, y); const s = U.ease.outBack(a, 2); ctx.scale(s, s);
        ctx.font = '400 58px Bungee'; const w = ctx.measureText(tx.text).width + 130;
        D.rr(ctx, -w / 2, -56, w, 112, 56, '#FFFFFF', { lw: 6 });
        D.title(ctx, tx.text, -26, 4, { size: 50, color: '#E8483B', stroke: 0, shadow: false });
        D.heartPath(ctx, w / 2 - 54, 10, 24); D.paint(ctx, '#EF5A7A', { lw: 4.5 });
        ctx.restore();
      }
    }
  }

  // ---------- effects ----------
  function fxPos(f, t, states) {
    if (f.who) { const st = states[f.who] || actor(f.who, t); const a = Kit.chars[st.kind].anchors(st); const p = f.at === 'face' ? a.face : a.head; return [p[0] + (f.dx || 0), p[1] + (f.dy || 0)]; }
    if (f.propAt) { const w = propWorld(f.propAt, f.t - 1e-3); return w ? [w.x, w.y] : [f.x, f.y]; }
    return [f.x, f.y];
  }

  Studio.film({
    async init() { VO = await Studio.loadJSON('out/voice.json'); },
    draw(ctx, t) {
      const api = { K, W, H, D, actor, propWorld, t };
      const cam = camAt(t), sh = shakeAt(t);
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
      ctx.translate(U.noise1(t * 30, 1) * sh, U.noise1(t * 30, 2) * sh);
      ctx.drawImage(Studio.cache('set', (c) => set.draw(c, W, H, K.set)), 0, 0, W, H);
      if (set.anim) set.anim(ctx, t, W, H, K.set);
      for (const f of K.fx) if (Kit.fx.BEHIND.has(f.type)) Kit.fx[f.type](ctx, t, { ...f, x: f.x, y: f.y }, W, H);
      if (globalThis.EPISODE && EPISODE.behind) EPISODE.behind(ctx, t, api);
      // characters' states this frame
      const states = {};
      for (const c of castList) { states[c.id] = actor(c.id, t); K._pos[c.id] = states[c.id].x; }
      // props: resting ones behind the characters, flying ones in front
      const worlds = Object.keys(K.props).map((id) => propWorld(id, t, states)).filter(Boolean);
      for (const w of worlds) if (!w.held && !w.flying && !w.P.front) drawProp(ctx, w);
      for (const c of castList) {
        const st = states[c.id];
        if (c.kind === 'pip') {
          const held = worlds.find((w) => w.held && w.held.who === c.id);
          if (held) st.hold = (cx, hx, hy) => Kit.props.draw(cx, held.kind, hx, hy, { s: (held.s * 0.9) / st.s, color: held.P.color, letter: held.P.letter });
        }
        Kit.chars[c.kind].draw(ctx, st);
        for (const w of worlds) if (w.held && w.held.who === c.id && c.kind !== 'pip') drawProp(ctx, w);
      }
      for (const w of worlds) if (w.flying || (!w.held && w.P.front)) drawProp(ctx, w);
      for (const f of K.fx) {
        if (Kit.fx.BEHIND.has(f.type) || Kit.fx.SCREEN.has(f.type) || !Kit.fx[f.type] || f.type === 'shake') continue;
        const [x, y] = fxPos(f, t, states);
        Kit.fx[f.type](ctx, t, { ...f, x, y }, W, H);
      }
      if (globalThis.EPISODE && EPISODE.front) EPISODE.front(ctx, t, api);
      ctx.restore();
      for (const f of K.fx) if (Kit.fx.SCREEN.has(f.type)) Kit.fx[f.type](ctx, t, f, W, H);
      texts(ctx, t);
      if (globalThis.EPISODE && EPISODE.screen) EPISODE.screen(ctx, t, api);
    },
    post: { paper: 0, vignette: 0.16, grain: 0.018 },
    fadeOut: 0.6,
  });
})();
