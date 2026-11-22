// LEVELS 3–20 are assembled from tested obstacle pieces ("segments"). Each piece is a copy of a
// layout that was already proven beatable in Levels 1–2, so every level stays fair.
// Every level is different (seeded by its number), gets harder as the number goes up, and uses
// the look + mini enemies of its group of 10. Levels 10 and 20 end in a boss arena.
//
// Each level also records a "route" (how to beat each piece) so automated tests can play it.

const SIGN_TEXT = {
  stones3: 'Hop across the floating stones. Double jump (↑ twice) if you come up short!',
  stones2: 'Tiny stones with spinning fire above them. Time your jumps!',
  rafts: 'Ride the moving rafts. Wait for them to line up, then jump.',
  crumble3: 'Cracked stones crumble after you land. Keep moving!',
  crumble2: 'Tiny crumbling stones! Jump quickly from one to the next.',
  elevator: 'This raft goes UP and DOWN. Ride it up, jump to the ledge, then catch the sliding raft.',
  padCliff: 'Bounce on the glowing mushrooms to get up the cliff!',
  pillarPad: 'Jump to the pillar, bounce off the mushroom, and land on the stone above.',
  fireRun: 'Spinning fire ahead! Watch the pattern and run through the gaps.',
  dashGap: 'Big gap! Jump, then DASH (C) or DOUBLE JUMP across.',
  stairs: 'Hop up the stones over the pit. Double jump if you miss!',
  plankClimb: 'Climb the wooden planks. Jump up through them and double jump higher.',
  spikeStrips: 'Spike holes in the path. Jump over them!',
  bridge: 'The bridge crumbles under you. Do not stop!',
  pillars: 'Jump to the pillar, then DASH across the wide gap to the next one.',
  drop: 'Drop down carefully.',
};

const BOSSES = {
  30: { id: 'troll', name: 'THE TROLL', sign: 'THE TROLL lives past this gate. It swings its club, throws boulders, and its roar brings down stalactites. Touching it kills you!' },
  40: { id: 'clock', name: 'THE GRANDFATHER CLOCK', sign: 'THE GRANDFATHER CLOCK ticks beyond the gate. Dodge its gears and slash its face!' },
  50: { id: 'saint', name: 'THE HOLLOW SAINT', sign: 'THE HOLLOW SAINT burns past the gate. Jump the fire and strike when it lands!' },
  60: { id: 'voidking', name: 'THE VOID KING', sign: 'THE VOID KING waits at the bottom of everything. This is it. Good luck.' },
  10: { id: 'warden', name: 'THE GRAVE WARDEN', sign: 'THE GRAVE WARDEN waits past the gate. Learn its attacks and slash it. Touching it kills you!' },
  20: { id: 'widow', name: 'THE FROZEN WIDOW', sign: 'THE FROZEN WIDOW waits past the gate. Dodge the icicles and slash it. Touching it kills you!' },
};

function generateLevel(n) {
  const r = mulberry32(n * 7919 + 13);
  const H = 34, MAXW = 900;
  const tiles = new Array(MAXW * H).fill(T.EMPTY);
  const fill = (x1, y1, x2, y2, v = T.SOLID) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (x >= 0 && x < MAXW && y >= 0 && y < H) tiles[y * MAXW + x] = v;
  };
  const group = Math.floor((n - 1) / 10);           // 0 = levels 1–10, 1 = levels 11–20 ...
  const enemyTypes = [
    ['crawler', 'skitter', 'bat'], ['frostmite', 'snowskull', 'icewisp'], ['rockcrawler', 'pebbleimp', 'cavebat'],
    ['gearspider', 'ticktock', 'chainghoul'], ['ashcrawler', 'cinderskull', 'emberbat'], ['voidcrawler', 'voidskull', 'voideye'],
  ][Math.min(group, 5)];
  const under = group >= 2;            // Levels 21+: underground, with a ceiling, falling droppers and a chase
  const dropStyle = ['stalactite', 'gear', 'chandelier', 'shard'][Math.min(group, 5) - 2];
  const L = { shards: [], bigShards: [], enemies: [], platforms: [], pads: [], firebars: [], signs: [], decor: [], checkpoints: [], route: [], droppers: [], chases: [] };
  // falling hazards hang from the ceiling over open stretches (never right where you'd stand still)
  const drops = (x1, x2) => { if (!under) return; for (let dx = x1; dx <= x2; dx += 3) if (r() < 0.32 + n * 0.006) L.droppers.push({ x: dx, y: 4, style: dropStyle, big: r() < 0.3 }); };
  // remember where each route step starts (used by the automated playtest)
  L.route.push = (o) => Array.prototype.push.call(L.route, Object.assign({ sx: x, sg: g }, o));
  const sh = (x, y) => L.shards.push([x, y]);
  const big = (x, y) => L.bigShards.push([x, y]);
  const pit = (x1, x2, kind) => {
    if ((kind || (r() < 0.5 ? 'spike' : 'lava')) === 'spike') { fill(x1, 32, x2, 33); fill(x1, 31, x2, 31, T.SPIKE); }
    else { fill(x1, 33, x2, 33); fill(x1, 31, x2, 32, T.LAVA); }
  };
  const ground = (x1, x2, g) => fill(x1, g, x2, H - 1);

  fill(0, 0, 0, H - 1);
  let x = 1, g = 30;
  let firstMonsterSign = true;

  // A flat resting area: sign for the next obstacle, maybe a monster, maybe a checkpoint.
  const rest = (len, opts = {}) => {
    ground(x, x + len - 1, g);
    if (opts.sign) L.signs.push({ x: x + 1, y: g - 1, text: opts.sign });
    const deco = ['grave', 'tree', 'shroom', 'skulls'];
    for (let i = 3; i < len - 3; i += 4) if (r() < 0.6) L.decor.push({ type: deco[Math.floor(r() * deco.length)], x: x + i, y: g - 1 });
    if (opts.enemy) {
      const type = enemyTypes[Math.floor(r() * enemyTypes.length)];
      const ex = x + Math.floor(len / 2);
      const flying = type === 'bat' || type === 'icewisp';
      L.enemies.push({ type, x: ex, y: flying ? g - 5 : g - 1 });
      if (firstMonsterSign) { L.signs.push({ x: x + 3, y: g - 1, text: 'Monster ahead! Touching it kills you. Jump over it or slash it (X).' }); firstMonsterSign = false; }
    }
    if (opts.checkpoint) L.checkpoints.push({ x: x + len - 3, y: g - 1 });
    if (!opts.noDrops) drops(x + 3, x + len - 6);
    for (let i = 2; i < len - 1; i += 3) sh(x + i, g - 2);
    L.route.push({ t: 'walk', to: x + len - 1 });
    x += len;
  };

  // ---- the obstacle pieces (all copied from tested layouts) ----
  const SEG = {
    stones3() {
      const k = 3 + (r() < 0.5 ? 1 : 0), hs = [-2, -4, -3, -2, -4];
      const edges = [x]; let sx = x + 3;
      for (let i = 0; i < k; i++) { const h = g + hs[i]; fill(sx, h, sx + 2, h); sh(sx + 1, h - 2); sh(sx - 2, h - 2); edges.push(sx + 3); sx += 6; }
      big(x + 10, g - 10);
      pit(x, sx - 1, 'spike'); L.route.push({ t: 'edges', xs: edges }); x = sx;
    },
    stones2() {
      // near a cave ceiling the stones climb more gently so your head never bumps the rock mid-jump
      const p = under && g < 18 ? [[4, -2], [10, -2], [16, -4], [23, -2]] : [[4, -2], [10, -4], [16, -6], [23, -4]];
      for (const [dx, dy] of p) { fill(x + dx, g + dy, x + dx + 1, g + dy); sh(x + dx, g + dy - 2); sh(x + dx + 1, g + dy - 2); }
      L.firebars.push({ x: x + 13, y: g - 9, n: 2, speed: 1.5 });
      big(x + 13, g - 11);
      pit(x, x + 27, 'spike'); L.route.push({ t: 'edges', xs: [x, x + 6, x + 12, x + 18, x + 25], fire: true }); x += 28;
    },
    rafts() {
      pit(x, x + 29, 'spike');
      fill(x + 24, g - 2, x + 26, g - 2);
      const a = L.platforms.length;
      L.platforms.push({ kind: 'move', x: x + 2, y: g - 2, w: 3, dx: 4, period: 4 });
      L.platforms.push({ kind: 'move', x: x + 12, y: g - 3, w: 3, dx: 6, period: 4, phase: 2 });
      for (const [dx, dy] of [[3, -5], [7, -5], [14, -6], [18, -6], [25, -4], [26, -4]]) sh(x + dx, g + dy);
      L.route.push({ t: 'rafts', x, a, b: a + 1, blockEnd: x + 27, end: x + 30 }); x += 30;
    },
    crumble3() {
      pit(x, x + 26, 'lava');
      const edges = [x];
      for (let i = 0; i < 4; i++) { L.platforms.push({ kind: 'crumble', x: x + 3 + 6 * i, y: g - 2, w: 3 }); sh(x + 4 + 6 * i, g - 4); edges.push(x + 6 + 6 * i); }
      L.route.push({ t: 'edges', xs: edges }); x += 27;
    },
    crumble2() {
      pit(x, x + 19, 'spike');
      for (const dx of [3, 9, 15]) { L.platforms.push({ kind: 'crumble', x: x + dx, y: g - 3, w: 2 }); sh(x + dx, g - 5); sh(x + dx + 1, g - 5); }
      L.route.push({ t: 'edges', xs: [x, x + 5, x + 11, x + 17] }); x += 20;
    },
    elevator() {
      pit(x, x + 31, 'lava');
      fill(x + 7, g - 10, x + 9, g - 10);
      fill(x + 26, g - 9, x + 28, g - 9);
      const v = L.platforms.length;
      L.platforms.push({ kind: 'move', x: x + 2, y: g - 2, w: 3, dy: -6, period: 3.6 });
      L.platforms.push({ kind: 'move', x: x + 12, y: g - 10, w: 3, dx: 7, period: 4 });
      for (const [dx, dy] of [[3, -4], [3, -7], [8, -12], [13, -12], [17, -12], [21, -12], [27, -11], [30, -7]]) sh(x + dx, g + dy);
      big(x + 8, g - 15);
      L.route.push({ t: 'elevator', x, v, s: v + 1 }); x += 32;
    },
    padCliff() {
      ground(x, x + 8, g);
      L.pads.push({ x: x + 1, y: g - 1 });
      fill(x, g - 7, x + 3, g - 7, T.ONEWAY);
      L.pads.push({ x: x + 3, y: g - 8 });
      for (const [dx, dy] of [[1, -10], [2, -10], [5, -16], [6, -17], [7, -16]]) sh(x + dx, g + dy);
      L.route.push({ t: 'padCliff', x }); x += 9; g -= 12;
    },
    pillarPad() {
      pit(x, x + 14, 'spike');
      fill(x + 3, g - 1, x + 7, H - 1);
      L.pads.push({ x: x + 5, y: g - 2 });
      fill(x + 9, g - 9, x + 11, g - 9);
      sh(x + 5, g - 6); sh(x + 10, g - 11); sh(x + 13, g - 9);
      L.route.push({ t: 'pillarPad', x }); x += 15; g -= 6;
    },
    // CHASE (Levels 21+): something huge comes after you. Run and jump the spike holes without stopping!
    chase() {
      const len = 56, x1 = x;
      ground(x, x + len - 1, g);
      const strips = [[8, 2], [17, 3], [27, 2], [36, 3], [46, 2]];
      for (const [dx, w] of strips) { fill(x + dx, g, x + dx + w - 1, g, T.SPIKE); sh(x + dx, g - 3); sh(x + dx + w - 1, g - 3); }
      for (let i = 3; i < len; i += 5) sh(x + i, g - 2);
      const speed = Math.min(228, 192 + n * 0.6);
      L.chases.push({ x1, x2: x + len + 2, g, style: ['boulder', 'gears', 'fire', 'void'][Math.min(group, 5) - 2], speed });
      L.route.push({ t: 'chase', x1, xs: strips.map(([dx]) => x + dx), end: x + len });
      x += len;
    },
    fireRun() {
      const k = 1 + (n >= 6 ? 1 : 0) + (r() < 0.4 ? 1 : 0), len = 6 + 7 * k;
      ground(x, x + len - 1, g);
      for (let i = 0; i < k; i++) { L.firebars.push({ x: x + 5 + 7 * i, y: g - 3, n: 4, speed: i % 2 ? -2 : 2, phase: i * 1.3 }); sh(x + 2 + 7 * i, g - 2); }
      big(x + 5, g - 8);
      L.route.push({ t: 'walk', to: x + len - 1, fire: true }); x += len;
    },
    dashGap() {
      pit(x, x + 5, 'spike');
      sh(x + 2, g - 4); sh(x + 4, g - 4); big(x + 3, g - 6);
      L.route.push({ t: 'dash', at: x }); x += 6;
    },
    stairs() {
      pit(x, x + 22, 'lava');
      const edges = [x];
      for (let i = 0; i < 4; i++) { fill(x + 3 + 5 * i, g - 2 - 2 * i, x + 4 + 5 * i, g - 2 - 2 * i); edges.push(x + 5 + 5 * i); }
      for (const [dx, dy] of [[3, -4], [6, -5], [8, -6], [11, -7], [13, -8], [16, -9], [18, -10], [21, -11]]) sh(x + dx, g + dy);
      L.route.push({ t: 'edges', xs: edges }); x += 23; g -= 10;
    },
    plankClimb() {
      ground(x, x + 11, g);
      fill(x + 6, g - 4, x + 10, g - 4, T.ONEWAY);
      fill(x + 2, g - 8, x + 6, g - 8, T.ONEWAY);
      fill(x + 6, g - 12, x + 11, g - 12, T.ONEWAY);
      sh(x + 9, g - 6); sh(x + 4, g - 10); sh(x + 9, g - 14); big(x + 3, g - 15);
      L.route.push({ t: 'planks', x }); x += 12; g -= 16;
    },
    spikeStrips() {
      ground(x, x + 17, g);
      fill(x + 5, g, x + 6, g, T.SPIKE); fill(x + 11, g, x + 13, g, T.SPIKE);
      sh(x + 5, g - 3); sh(x + 6, g - 3); sh(x + 12, g - 3);
      L.route.push({ t: 'edges', xs: [x + 5, x + 11] }); L.route.push({ t: 'walk', to: x + 17 }); x += 18;
    },
    bridge() {
      fill(x, g, x + 9, 32, T.EMPTY); fill(x, 33, x + 9, 33); fill(x, Math.max(31, g + 1), x + 9, 32, T.LAVA);
      L.platforms.push({ kind: 'crumble', x: x + 1, y: g, w: 2 });
      L.platforms.push({ kind: 'crumble', x: x + 5, y: g, w: 2 });
      sh(x + 1, g - 2); sh(x + 4, g - 3); sh(x + 5, g - 2); sh(x + 8, g - 3);
      L.route.push({ t: 'edges', xs: [x, x + 3, x + 7] }); x += 10;
    },
    pillars() {
      pit(x, x + 19, 'spike');
      fill(x + 5, g, x + 7, 31); fill(x + 14, g, x + 16, 31);
      for (const [dx, dy] of [[2, -3], [3, -3], [6, -2], [15, -2], [18, -3]]) sh(x + dx, g + dy);
      big(x + 10, g - 4);
      L.route.push({ t: 'pillars', x }); x += 20;
    },
    drop() {
      const g2 = Math.min(30, g + 4 + Math.floor(r() * 6));
      g = g2; L.route.push({ t: 'walk', to: x + 2 });
    },
  };

  const canUse = (s) => {
    if (s === 'padCliff') return g >= 26;
    if (s === 'plankClimb') return g >= 28;
    if (s === 'stairs') return g >= 22 && n >= 4;
    if (s === 'pillarPad') return g >= 18 && n >= 4;
    if (s === 'elevator') return n >= 3 && (!under || g >= 18);
    if (s === 'stones2' || s === 'crumble2') return n >= 3;
    return true;
  };
  const pool = ['stones3', 'stones2', 'rafts', 'crumble3', 'crumble2', 'elevator', 'padCliff', 'pillarPad', 'fireRun', 'dashGap', 'stairs', 'plankClimb', 'spikeStrips', 'bridge', 'pillars'];

  const boss = BOSSES[n];
  const segCount = boss ? 4 : Math.min(14, 6 + Math.floor(n / 2));
  const cpEvery = n >= 15 ? 3 : 2;

  // start
  const STORY = {
    11: 'Levels 11–20: the cold has come. New creatures lurk in the ice...',
    21: 'You fell through the ice into a deep cave... Watch for stalactites! And something huge down here is awake. When it comes, RUN.',
    31: 'Deeper still: a crypt full of ticking clockwork. Falling gears, and a grinding wall of gears that hunts you.',
    41: 'A burning cathedral, deep underground. Chandeliers fall, and a wall of fire will chase you.',
    51: 'The Void. Nothing down here is real... except the darkness that chases you.',
  };
  rest(12, { sign: STORY[n] || `Level ${n}! Reach the portal at the end.`, noDrops: true });

  let last = null;
  for (let i = 0; i < segCount; i++) {
    let choices = pool.filter((s) => s !== last && canUse(s));
    const s = choices[Math.floor(r() * choices.length)];
    // sign for this obstacle sits in the rest area right before it
    const prevSign = L.signs.length && L.signs[L.signs.length - 1].x >= x - 12 ? L.signs[L.signs.length - 1] : null;
    if (prevSign && prevSign.text.startsWith('Level')) prevSign.text += ' ' + SIGN_TEXT[s];
    else L.signs.push({ x: x - 3, y: g - 1, text: SIGN_TEXT[s] });
    SEG[s]();
    last = s;
    if ((g <= 16 || (under && g <= 20)) && r() < 0.7) SEG.drop();
    // the chase: once per underground level, in the middle, after a checkpoint
    if (under && i === Math.floor(segCount / 2)) {
      rest(12, { checkpoint: true, sign: 'Something is coming... When it starts, RUN and do not stop! Jump the spike holes.', noDrops: true });
      SEG.chase();
    }
    const isLast = i === segCount - 1;
    rest(isLast ? 14 : 11, { enemy: !isLast && r() < Math.min(0.6, 0.35 + n * 0.025), checkpoint: !isLast && (i + 1) % cpEvery === 0 });
  }

  let arena = null;
  if (boss) {
    // come down to the floor, checkpoint right before the arena
    if (g !== 30) { g = 30; L.route.push({ t: 'walk', to: x + 2 }); }
    rest(10, { checkpoint: true, sign: boss.sign, noDrops: true });
    const A = x; // gate column
    ground(A, A + 40, 30);
    fill(A, 0, A + 29, 14);                     // ceiling
    fill(A, 15, A, 29, T.GATE);                 // closes behind you
    fill(A + 29, 15, A + 29, 29, T.EXIT);       // opens when the boss is beaten
    fill(A + 4, 25, A + 7, 25, T.ONEWAY);
    fill(A + 22, 25, A + 25, 25, T.ONEWAY);
    fill(A + 12, 21, A + 17, 21, T.ONEWAY);
    for (const dx of [6, 10, 19, 24]) L.decor.push({ type: 'skulls', x: A + dx, y: 29 });
    arena = {
      gateX: A, triggerX: (A + 3) * TILE, x1: (A + 1) * TILE, x2: (A + 29) * TILE,
      floorY: 30 * TILE, ceilY: 15 * TILE, camX: A * TILE - 16, camY: 14 * TILE + 16,
      bossSpawn: { x: (A + 19) * TILE, y: 16 * TILE }, boss: boss.id, name: boss.name,
    };
    L.route.push({ t: 'boss' });
    x = A + 30;
    rest(12, {});
  }

  // finish
  const finishX = x - 6;
  ground(x, x + 3, g);
  x += 4;
  fill(x, 0, x, H - 1);
  const W = x + 1;

  // copy into a level-sized tile map
  const out = new Array(W * H);
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) out[yy * W + xx] = tiles[yy * MAXW + xx];
  if (under) for (let yy = 0; yy <= 3; yy++) for (let xx = 0; xx < W; xx++) out[yy * W + xx] = T.SOLID; // cave ceiling
  L.droppers = L.droppers.filter((d) => d.x < W - 2);

  // drop any shard that ended up inside stone or a hazard
  const okSpot = ([sx, sy]) => sy >= 0 && sy < H && sx < W && out[sy * W + sx] === T.EMPTY;
  L.shards = L.shards.filter(okSpot);
  L.bigShards = L.bigShards.filter(okSpot).slice(0, 4);

  const route = Array.from(L.route);
  return {
    number: n,
    w: W, h: H, tiles: out,
    spawn: { x: 3, y: 29 },
    ...L,
    route,
    finish: { x: finishX, y: g - 1 },
    arena,
  };
}

for (let n = 3; n <= 60; n++) LEVELS[n] = () => generateLevel(n);
