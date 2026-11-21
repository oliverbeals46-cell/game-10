// LEVEL 1 (an obby: obstacle course from start to finish). Levels 1–10 share the haunted graveyard look.
// Coordinates are in tiles (32px). Rows grow downward; the main ground is row 30.
// Bosses only show up every 10–20 levels, so Level 1 has mini enemies only.
function buildLevel1() {
  const W = 250, H = 34;
  const tiles = new Array(W * H).fill(T.EMPTY);
  const fill = (x1, y1, x2, y2, v = T.SOLID) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      if (x >= 0 && x < W && y >= 0 && y < H) tiles[y * W + x] = v;
    }
  };

  fill(0, 0, 0, H - 1); // left world edge

  // 1) Start + floating stones over a spike floor
  fill(1, 30, 14, 33);
  fill(15, 32, 34, 33); fill(15, 31, 34, 31, T.SPIKE);
  fill(17, 28, 19, 28);
  fill(23, 26, 25, 26);
  fill(29, 27, 31, 27);
  fill(35, 30, 52, 33);

  // 2) Moving rafts over a long spike pit
  fill(53, 32, 83, 33); fill(53, 31, 83, 31, T.SPIKE);
  fill(78, 28, 80, 28);
  fill(84, 30, 96, 33);

  // 3) Crumbling stones over lava
  fill(97, 33, 123, 33); fill(97, 31, 123, 32, T.LAVA);
  fill(124, 30, 142, 33);

  // 4) Bounce pads up to the cliff, with spinning fire on top
  fill(134, 23, 137, 23, T.ONEWAY);
  fill(143, 18, 166, 33);

  // 5) Dash pillars over spikes
  fill(167, 32, 186, 33); fill(167, 31, 186, 31, T.SPIKE);
  fill(172, 18, 174, 31);
  fill(181, 18, 183, 31);
  fill(187, 18, 192, 33);

  // 6) Drop down, then double-jump up the ledges (no wall climbing!)
  fill(193, 30, 204, 33);
  fill(199, 26, 203, 26, T.ONEWAY);
  fill(195, 22, 199, 22, T.ONEWAY);
  fill(199, 18, 204, 18, T.ONEWAY);
  fill(205, 14, W - 1, 33);     // the upper path

  // 7) Final run: spike strips, fire, a raft over lava, then the finish portal
  fill(211, 14, 212, 14, T.SPIKE);
  fill(220, 14, 222, 14, T.SPIKE);
  fill(230, 14, 236, 32, T.EMPTY); fill(230, 30, 236, 32, T.LAVA);
  fill(W - 1, 0, W - 1, H - 1);   // right world edge

  // Shards to collect (tile coords). Small = 1 shard.
  const shards = [
    [8, 28], [9, 28], [10, 28],
    [18, 26], [21, 25], [24, 24], [27, 24], [30, 25], [33, 26],
    [40, 28], [43, 26], [47, 28], [48, 28],
    [57, 25], [61, 25], [68, 24], [72, 24], [79, 26], [80, 26],
    [86, 28], [87, 28], [92, 28],
    [101, 26], [107, 26], [113, 26], [119, 26], [122, 24],
    [128, 28], [132, 28], [135, 20], [136, 20], [139, 14], [140, 13], [141, 14],
    [147, 16], [152, 16], [156, 16], [161, 16],
    [169, 15], [170, 15], [173, 16], [182, 16], [185, 15],
    [190, 16], [195, 28], [196, 28],
    [202, 24], [197, 20], [202, 16],
    [208, 12], [211, 11], [212, 11], [217, 12], [221, 11], [226, 12], [232, 10], [234, 10], [240, 12], [241, 12],
  ];
  // Big purple shards (worth 5) hidden in tricky spots.
  const bigShards = [
    [24, 20],   // high above the floating stones: double jump to grab it
    [177, 14],  // over the big dash gap
    [196, 15],  // high above the middle ledge: double jump
    [233, 11],  // above the lava, ride the raft and jump
  ];

  // Mini enemies — jump over them or fight them for shards.
  const enemies = [
    { type: 'crawler', x: 44, y: 29 },
    { type: 'bat', x: 87, y: 24 },
    { type: 'skitter', x: 90, y: 29 },
    { type: 'skitter', x: 139, y: 29 },
    { type: 'skitter', x: 215, y: 13 },
    { type: 'bat', x: 184, y: 12 },
    { type: 'crawler', x: 197, y: 29 },
    { type: 'crawler', x: 225, y: 13 },
  ];

  const platforms = [
    { kind: 'move', x: 56, y: 28, w: 3, dx: 4, period: 4 },
    { kind: 'move', x: 66, y: 27, w: 3, dx: 6, period: 4, phase: 2 },
    ...[100, 106, 112, 118].map((x) => ({ kind: 'crumble', x, y: 28, w: 3 })),
    { kind: 'move', x: 230, y: 14, w: 2, dx: 5, period: 3.6 },
  ];

  const pads = [{ x: 135, y: 29 }, { x: 137, y: 22 }];

  const firebars = [
    { x: 149, y: 15, n: 4, speed: 1.8 },
    { x: 158, y: 15, n: 4, speed: -1.8, phase: Math.PI },
    { x: 216, y: 11, n: 3, speed: 2.2 },
  ];

  const signs = [
    { x: 4, y: 29, text: '← → to move. ↑ to jump (hold it to jump higher).' },
    { x: 9, y: 29, text: 'Reach the glowing portal at the end! Collect shards to buy new heads. Big purple shards are worth 5!' },
    { x: 13, y: 29, text: 'Hop across the floating stones! Press ↑ again in the air to DOUBLE JUMP.' },
    { x: 41, y: 29, text: 'Mini monsters! Jump over them, or press X to fight them: they drop shards. They only knock you back.' },
    { x: 51, y: 29, text: 'Ride the moving rafts. Press ↓ on a raft to drop through it.' },
    { x: 96, y: 29, text: 'Cracked stones crumble soon after you step on them. Keep moving!' },
    { x: 130, y: 29, text: 'Bounce on the glowing mushrooms to reach the cliff!' },
    { x: 145, y: 17, text: 'Time your run past the spinning fire.' },
    { x: 165, y: 17, text: 'Press C or Shift to DASH across the big gaps. Dash in mid-air!' },
    { x: 195, y: 29, text: 'Climb the ledges! Jump, then press ↑ again in the air to DOUBLE JUMP higher.' },
    { x: 228, y: 13, text: 'Almost there! Ride the raft over the lava.' },
  ];

  const decor = [
    { type: 'grave', x: 6, y: 29 }, { type: 'tree', x: 11, y: 29 }, { type: 'shroom', x: 2, y: 29 },
    { type: 'grave', x: 45, y: 29 }, { type: 'tree', x: 39, y: 29 }, { type: 'shroom', x: 52, y: 29 },
    { type: 'tree', x: 90, y: 29 }, { type: 'grave', x: 84, y: 29 }, { type: 'shroom', x: 95, y: 29 },
    { type: 'skulls', x: 126, y: 29 }, { type: 'tree', x: 139, y: 29 },
    { type: 'grave', x: 154, y: 17 }, { type: 'shroom', x: 144, y: 17 }, { type: 'tree', x: 189, y: 17 },
    { type: 'grave', x: 194, y: 29 }, { type: 'shroom', x: 204, y: 29 },
    { type: 'tree', x: 208, y: 13 }, { type: 'grave', x: 218, y: 13 }, { type: 'skulls', x: 238, y: 13 }, { type: 'shroom', x: 246, y: 13 },
  ];

  return {
    number: 1,
    w: W, h: H, tiles,
    spawn: { x: 3, y: 29 },
    shards, bigShards, enemies, platforms, pads, firebars, signs, decor,
    checkpoints: [{ x: 48, y: 29 }, { x: 94, y: 29 }, { x: 128, y: 29 }, { x: 163, y: 17 }, { x: 190, y: 17 }, { x: 207, y: 13 }],
    finish: { x: 244, y: 13 },
  };
}

// Registry of built levels. Add LEVELS[2] = buildLevel2, etc. as new levels are made.
const LEVELS = { 1: buildLevel1 };
const PLANNED_LEVELS = 50;
