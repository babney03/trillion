// Kit.actors: turns the score's action list into a pose for each character at time t,
// then layers idle life on top (blinks, breathing, looking at whoever talks, lip-sync).
(function () {
  const Kit = globalThis.Kit, U = globalThis.U;
  const A = (Kit.actors = {});
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = U.ease;

  // facial expressions (merged into the state while an 'emote' action runs)
  A.FACES = {
    pip: {
      content: { eyes: 'open', brows: 'neutral', mouth: 'smile' },
      happy: { eyes: 'open', brows: 'up', mouth: 'smile' },
      joy: { eyes: 'happy', brows: 'up', mouth: 'grin' },
      laugh: { eyes: 'happy', brows: 'up', mouth: 'open' },
      surprised: { eyes: 'wide', brows: 'up', mouth: 'o' },
      shock: { eyes: 'wide', brows: 'up', mouth: 'gasp' },
      sad: { eyes: 'open', brows: 'sad', mouth: 'sad', lid: 0.25, lookY: 0.5 },
      worried: { eyes: 'open', brows: 'worried', mouth: 'flat', lid: 0.12 },
      think: { eyes: 'open', brows: 'up', mouth: 'smirk', look: -0.6, lookY: -0.8 },
      proud: { eyes: 'happy', brows: 'neutral', mouth: 'smile' },
      determined: { eyes: 'open', brows: 'determined', mouth: 'smile' },
      sleepy: { eyes: 'half', brows: 'neutral', mouth: 'flat' },
      cross: { eyes: 'open', brows: 'cross', mouth: 'flat' },
      love: { eyes: 'happy', brows: 'up', mouth: 'smile', blush: 1.2 },
    },
    biscuit: {
      content: { eyes: 'open', mouth: 'smile', ears: 0, wag: 0.5, brows: 'neutral' },
      happy: { eyes: 'open', mouth: 'smile', ears: 0.3, wag: 0.8, brows: 'up' },
      joy: { eyes: 'happy', mouth: 'pant', ears: 0.6, wag: 1, brows: 'up' },
      excited: { eyes: 'open', mouth: 'pant', ears: 0.7, wag: 1, brows: 'up' },
      sad: { eyes: 'sad', mouth: 'sad', ears: -1, wag: 0.05, brows: 'sad' },
      sorry: { eyes: 'sad', mouth: 'sad', ears: -1, wag: 0.1, brows: 'worried', headTilt: 0.14 },
      surprised: { eyes: 'wide', mouth: 'o', ears: 0.8, wag: 0.3, brows: 'up' },
      curious: { eyes: 'open', mouth: 'smile', ears: 0.4, wag: 0.5, brows: 'up', headTilt: 0.26 },
      sleepy: { eyes: 'closed', mouth: 'smile', ears: -0.5, wag: 0, brows: 'neutral' },
    },
  };

  // hand poses for Pip's gestures (local coords: feet 0,0; head centre ~0,-430)
  const G = {
    wave: (u, t) => ({ handR: [120 + 28 * Math.sin(t * 11), -430], handL: [-80, -138] }),
    waveBoth: (u, t) => ({ handR: [124 + 26 * Math.sin(t * 11), -430], handL: [-124 - 26 * Math.sin(t * 11 + 1), -430] }),
    cheer: (u, t) => ({ handL: [-118 + 10 * Math.sin(t * 14), -470], handR: [118 - 10 * Math.sin(t * 14), -470] }),
    point: (u, t, a) => ({ handR: [(a.dir || 1) * 150, a.high ? -380 : -300] }),
    pointUp: () => ({ handR: [64, -560], handL: [-80, -138] }),
    think: () => ({ handR: [28, -332], handL: [-60, -200] }),
    cheeks: () => ({ handL: [-108, -372], handR: [108, -372] }),
    handsOnHead: () => ({ handL: [-96, -520], handR: [96, -520] }),
    clap: (u, t) => { const k = Math.abs(Math.sin(t * 9)); return { handL: [-12 - 46 * k, -262], handR: [12 + 46 * k, -262] }; },
    shrug: () => ({ handL: [-140, -250], handR: [140, -250] }),
    akimbo: () => ({ handL: [-112, -186], handR: [112, -186] }),
    cover: () => ({ handL: [-22, -360], handR: [22, -352] }),
    reach: () => ({ handL: [-46, -560], handR: [46, -560] }),
    hug: () => ({ handL: [-40, -250], handR: [40, -250] }),
    hold: () => ({ handL: [-34, -236], handR: [34, -236] }),
    offer: (u, t, a) => ({ handL: [(a.dir || 1) * 60 - 10, -250], handR: [(a.dir || 1) * 60 + 50, -250] }),
  };

  const H = {};
  // move: walk/trot to args.to (px). Pip walks; Biscuit trots (stand pose). Persists x.
  H.move = (st, a, u, done, t) => {
    const x0 = st.x; // the folded position when this action starts (deterministic: no caching)
    const to = a.args.to;
    if (done) { st.x = to; if (st.kind === 'biscuit' && a.args.pose) st.pose = a.args.pose; return; }
    const e = ease.inOutQuad(u);
    st.x = lerp(x0, to, e);
    const dist = Math.abs(st.x - x0);
    if (st.kind === 'pip') { st.pose = 'walk'; st.walk = (dist / 70) * Math.PI; }
    else { st.pose = 'stand'; st.walk = (dist / 60) * Math.PI; st.facing = Math.sign(to - x0) || st.facing; }
  };
  H.face = (st, a) => { st.facing = a.args.dir; };
  H.pose = (st, a) => { st.pose = a.args.pose; };
  // jump (args.h height, optional args.to x). Anticipation crouch, air, landing squash.
  H.jump = (st, a, u, done) => {
    const x0 = st.x;
    const to = a.args.to ?? x0;
    if (done) { st.x = to; if (a.args.pose) st.pose = a.args.pose; return; }
    const h = a.args.h ?? 140;
    if (u < 0.18) { const k = Math.sin((u / 0.18) * Math.PI / 2); st.sy = 1 - 0.16 * k; st.sx = 1 + 0.1 * k; }
    else if (u < 0.86) {
      const p = (u - 0.18) / 0.68;
      st.y -= h * 4 * p * (1 - p); st.x = lerp(x0, to, ease.inOutQuad(p));
      st.sy = 1.1; st.sx = 0.93;
      if (st.kind === 'pip') st.pose = 'jump'; else { st.pose = 'leap'; st.facing = Math.sign(to - x0) || st.facing; }
    } else { const k = 1 - (u - 0.86) / 0.14; st.x = to; st.sy = 1 - 0.2 * k; st.sx = 1 + 0.14 * k; }
  };
  H.hop = (st, a, u, done) => { if (done) return; const n = a.args.n || 1, p = (u * n) % 1; st.y -= (a.args.h ?? 40) * Math.sin(Math.PI * p); };
  H.bounce = (st, a, u, done, t, K) => { if (done) return; st.y -= (a.args.h ?? 26) * Math.abs(Math.sin(Math.PI * K.clock.beatPos(t))); };
  H.dance = (st, a, u, done, t, K) => {
    if (done) return;
    const bp = K.clock.beatPos(t);
    st.y -= (a.args.h ?? 50) * Math.abs(Math.sin(Math.PI * bp)); st.rot = Math.sin(Math.PI * bp / 2) * 0.08;
    if (st.kind === 'pip') Object.assign(st, G.cheer(u, t)); else { st.wag = 1; st.open = Math.max(st.open || 0, 0.3); }
  };
  H.squash = (st, a, u, done) => { if (done) return; const k = Math.exp(-u * 5) * Math.cos(u * 18); st.sx = (st.sx || 1) * (1 + 0.22 * k); st.sy = (st.sy || 1) * (1 - 0.22 * k); };
  H.throw = (st, a, u, done, t) => {
    if (done) return;
    const r = a.args.release;
    if (st.kind === 'pip') {
      st._busyHands = true;
      if (t < r) Object.assign(st, G.hold());
      else { const k = ease.outQuad(clamp((t - r) / 0.2)); st.handL = [-34 - 42 * k, -236 - 200 * k]; st.handR = [34 + 42 * k, -236 - 200 * k]; st.sy = 1 + 0.04 * k; }
      st.look = 0.7; st.lookY = t < r ? 0.2 : -0.7;
    } else {
      if (t >= r) { const p = clamp((t - r) / 0.3); st.y -= 44 * Math.sin(Math.PI * p); st.headTilt = -0.25 * Math.sin(Math.PI * p); st.open = Math.max(st.open || 0, 0.8 * (1 - p)); }
    }
  };
  H.gesture = (st, a, u, done, t) => { if (done && !a.args.hold) return; const g = G[a.args.g]; if (g) { Object.assign(st, g(u, t, a.args)); st._busyHands = true; } if (a.args.g === 'think') st.headRot = 0.07; };
  H.hold = (st, a, u, done) => { if (done) return; if (st.kind === 'pip') { Object.assign(st, G.hold()); st._busyHands = true; } };
  H.emote = (st, a, u, done, t) => {
    if (done && !a.args.hold) return;
    const f = (A.FACES[st.kind] || {})[a.args.face];
    if (f) Object.assign(st, f);
  };
  H.look = (st, a, u, done, t, K, all) => {
    if (done && !a.args.hold) return;
    st._lookAt = a.args.at;
  };
  H.bark = (st, a, u, done) => {
    if (done) return;
    const n = a.args.n || 2, p = (u * n) % 1;
    st.open = Math.max(st.open || 0, Math.sin(Math.PI * p) * 0.95); st.ears = 0.7; st.y -= 14 * Math.sin(Math.PI * p);
  };
  H.slump = (st, a, u, done) => { if (done && !a.args.hold) return; st.sy = (st.sy || 1) * 0.96; st.headRot = -0.07; };
  H.nod = (st, a, u, done) => { if (done) return; st.headRot = Math.sin(u * Math.PI * 4) * 0.08; st.headTilt = Math.sin(u * Math.PI * 4) * 0.1; };
  H.shake = (st, a, u, done) => { if (done) return; st.headRot = Math.sin(u * Math.PI * 6) * 0.12; };
  H.tilt = (st, a, u, done) => { if (done && !a.args.hold) return; st.headTilt = a.args.amt ?? 0.25; st.headRot = a.args.amt ?? 0.12; };
  H.talk = (st, a, u, done, t) => {
    if (done) return;
    if (st.kind === 'pip') { st.headRot = (st.headRot || 0) + Math.sin(t * 5.3) * 0.035; st._talking = true; }
  };

  // ---------- evaluate a character at time t ----------
  A.state = (c, t, K, VO) => {
    const st = { id: c.id, kind: c.kind, x: c.x, y: K.FLOOR, s: c.s, facing: c.facing, t, pose: c.kind === 'biscuit' ? (c.pose || 'sit') : (c.pose || 'stand'), sx: 1, sy: 1, rot: 0 };
    Object.assign(st, (A.FACES[c.kind] || {}).content || {});
    const acts = K._by[c.id] || [];
    for (const a of acts) {
      if (a.t0 > t) break;
      const done = t >= a.t1;
      const u = clamp((t - a.t0) / Math.max(1e-3, a.t1 - a.t0));
      const h = H[a.type];
      if (h) h(st, a, u, done, t, K);
    }
    // talking body language: one hand moves with the words unless a gesture already uses the hands
    if (st._talking && !st._busyHands && st.kind === 'pip') st.handR = [92 + 16 * Math.sin(t * 3.1), -170 - 40 * Math.abs(Math.sin(t * 2.3))];
    // idle life
    if (st.blink === undefined) {
      const k = Math.floor((t + U.hash(c.id.length, 3) * 3) / 3.1), tb = k * 3.1 + 0.4 + U.hash(k, c.id.length) * 2.1;
      st.blink = clamp(1 - Math.abs(t - tb) / 0.075);
    }
    // gaze: explicit look target, else whoever is talking, else the other character
    const speaking = K.lines.find((l) => t >= l.t && t <= l.end + 0.2);
    let target = st._lookAt;
    if (!target && speaking && speaking.who !== c.id && speaking.who !== 'narrator') target = speaking.who;
    if (!target && speaking && speaking.who === 'narrator') target = 'camera';
    if (target && st.look === undefined) {
      if (target === 'camera') { st.look = 0; st.lookY = 0; }
      else if (target === 'up') { st.look = 0.2; st.lookY = -0.9; }
      else if (target === 'down') { st.look = 0; st.lookY = 0.8; }
      else {
        const tx = Array.isArray(target) ? target[0] : (K.cast[target] ? (K._pos[target] ?? K.cast[target].x) : st.x);
        const ty = Array.isArray(target) ? target[1] : K.FLOOR - 300;
        st.look = clamp((tx - st.x) / 300, -1, 1) * (st.facing || 1);
        st.lookY = clamp((ty - (K.FLOOR - (c.kind === 'pip' ? 470 : 300) * st.s)) / 400, -1, 1);
      }
    }
    if (st.look === undefined) { const other = Object.values(K.cast).find((o) => o.id !== c.id); st.look = other ? clamp((other.x - st.x) / 400, -0.7, 0.7) : 0; st.lookY = st.lookY ?? 0; }
    // lip-sync
    if (VO && c.kind !== 'biscuit') { const m = globalThis.Subs.mouth(VO, t, c.id); if (m.talking) st.talk = m; }
    return st;
  };

  // index the actions per character once
  A.prepare = (K) => {
    K._by = {};
    for (const a of K.actions) (K._by[a.who] = K._by[a.who] || []).push(a);
    K._pos = {};
  };
})();
