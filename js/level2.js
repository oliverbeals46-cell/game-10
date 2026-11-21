// LEVEL 2 (obby). Same haunted graveyard as Levels 1–10, but harder:
// smaller stones, an up-and-down raft, fire above the jumps, a fire gauntlet, a lava staircase and a crumbling bridge.
function buildLevel2() {
  const W = 240, H = 34;
  const tiles = new Array(W * H).fill(T.EMPTY);
  const fill = (x1, y1, x2, y2, v = T.SOLID) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      if (x >= 0 && x < W && y >= 0 && y < H) tiles[y * W + x] = v;
    }
  };

  fill(0, 0, 0, H - 1);

  // 1) Start + small stepping stones over spikes, with spinning fire above
  fill(1, 30, 12, 33);
  fill(13, 32, 40, 33); fill(13, 31, 40, 31, T.SPIKE);
  fill(17, 28, 18, 28);
  fill(23, 26, 24, 26);
  fill(29, 24, 30, 24);
  fill(36, 26, 37, 26);
  fill(41, 30, 48, 33);

  // 2) Up-and-down raft, a high ledge, a sliding raft, then down over lava
  fill(49, 33, 80, 33); fill(49, 31, 80, 32, T.LAVA);
  fill(56, 20, 58, 20);
  fill(75, 21, 77, 21);
  fill(81, 30, 96, 33);

  // 3) Tiny crumbling stones, a bounce mushroom on a pillar, then up to higher ground
  fill(97, 32, 128, 33); fill(97, 31, 128, 31, T.SPIKE);
  fill(117, 29, 121, 31);
  fill(123, 21, 125, 21);
  fill(129, 24, 150, 33);

  // 4) Fire gauntlet, then a dash gap
  fill(151, 32, 156, 33); fill(151, 31, 156, 31, T.SPIKE);
  fill(157, 24, 175, 33);

  // 5) Stone staircase over lava
  fill(176, 33, 198, 33); fill(176, 31, 198, 32, T.LAVA);
  fill(179, 22, 180, 22);
  fill(184, 20, 185, 20);
  fill(189, 18, 190, 18);
  fill(194, 16, 195, 16);
  fill(199, 14, W - 1, 33);

  // 6) Last stretch: spike strips, fire, and a crumbling bridge over lava
  fill(205, 14, 206, 14, T.SPIKE);
  fill(212, 14, 214, 14, T.SPIKE);
  fill(224, 14, 233, 32, T.EMPTY); fill(224, 30, 233, 32, T.LAVA);
  fill(W - 1, 0, W - 1, H - 1);

  const shards = [
    [6, 28], [7, 28], [8, 28],
    [15, 26], [17, 26], [18, 26], [21, 24], [23, 24], [24, 24], [29, 22], [30, 22], [33, 23], [36, 24], [37, 24],
    [42, 28], [45, 28],
    [52, 26], [52, 23], [57, 18], [62, 18], [66, 18], [70, 18], [76, 19], [79, 23],
    [84, 28], [90, 28],
    [100, 25], [101, 25], [106, 25], [107, 25], [112, 25], [113, 25], [119, 22], [124, 19], [127, 21],
    [132, 22], [136, 22], [141, 22], [148, 22], [152, 20], [155, 20],
    [160, 22], [164, 22], [171, 22],
    [179, 20], [182, 19], [184, 18], [187, 17], [189, 16], [192, 15], [194, 14], [197, 13],
    [203, 12], [205, 11], [209, 12], [213, 11], [217, 12], [222, 12],
    [225, 12], [228, 11], [229, 12], [234, 12], [235, 12],
  ];
  const bigShards = [
    [26, 19],   // between the stones, right under the spinning fire: time it!
    [57, 15],   // high above the ledge after the up-and-down raft
    [153, 18],  // over the dash gap
    [219, 7],   // above the last fire bar
  ];

  const enemies = [
    { type: 'crawler', x: 44, y: 29 },
    { type: 'bat', x: 88, y: 24 },
    { type: 'skitter', x: 92, y: 29 },
    { type: 'skitter', x: 162, y: 23 },
    { type: 'bat', x: 166, y: 19 },
    { type: 'crawler', x: 209, y: 13 },
    { type: 'skitter', x: 221, y: 13 },
  ];

  const platforms = [
    { kind: 'move', x: 51, y: 28, w: 3, dy: -6, period: 3.6 },          // up-and-down raft
    { kind: 'move', x: 61, y: 20, w: 3, dx: 7, period: 4 },             // sliding raft
    ...[100, 106, 112].map((x) => ({ kind: 'crumble', x, y: 27, w: 2 })), // tiny crumbling stones
    { kind: 'crumble', x: 225, y: 14, w: 2 },
    { kind: 'crumble', x: 229, y: 14, w: 2 },
  ];

  const pads = [{ x: 119, y: 28 }];

  const firebars = [
    { x: 26, y: 21, n: 2, speed: 1.5 },
    { x: 138, y: 21, n: 4, speed: 2 },
    { x: 145, y: 21, n: 4, speed: -2, phase: Math.PI / 2 },
    { x: 219, y: 11, n: 3, speed: 2.4 },
  ];

  const signs = [
    { x: 3, y: 29, text: 'Level 2! Everything moves a little faster now.' },
    { x: 11, y: 29, text: 'Small stones, and spinning fire above them. Time your jumps!' },
    { x: 46, y: 29, text: 'This raft goes UP and DOWN. Ride it to the top, then jump to the ledge.' },
    { x: 94, y: 29, text: 'Tiny crumbling stones! Then bounce off the mushroom on the pillar.' },
    { x: 133, y: 23, text: 'Run the fire gauntlet, then DASH (C) or DOUBLE JUMP across the gap.' },
    { x: 173, y: 23, text: 'Hop up the stones over the lava. Miss one? Press ↑ again to DOUBLE JUMP!' },
    { x: 222, y: 13, text: 'Last stretch: the bridge crumbles. Do not stop!' },
  ];

  const decor = [
    { type: 'grave', x: 5, y: 29 }, { type: 'tree', x: 9, y: 29 }, { type: 'shroom', x: 2, y: 29 },
    { type: 'skulls', x: 42, y: 29 }, { type: 'tree', x: 45, y: 29 },
    { type: 'grave', x: 83, y: 29 }, { type: 'tree', x: 86, y: 29 }, { type: 'shroom', x: 96, y: 29 },
    { type: 'tree', x: 130, y: 23 }, { type: 'grave', x: 141, y: 23 }, { type: 'shroom', x: 150, y: 23 },
    { type: 'grave', x: 159, y: 23 }, { type: 'tree', x: 170, y: 23 }, { type: 'skulls', x: 174, y: 23 },
    { type: 'tree', x: 202, y: 13 }, { type: 'grave', x: 216, y: 13 }, { type: 'shroom', x: 223, y: 13 },
    { type: 'skulls', x: 238, y: 13 },
  ];

  return {
    number: 2,
    w: W, h: H, tiles,
    spawn: { x: 3, y: 29 },
    shards, bigShards, enemies, platforms, pads, firebars, signs, decor,
    checkpoints: [{ x: 47, y: 29 }, { x: 95, y: 29 }, { x: 131, y: 23 }, { x: 168, y: 23 }, { x: 201, y: 13 }],
    finish: { x: 236, y: 13 },
  };
}

LEVELS[2] = buildLevel2;
