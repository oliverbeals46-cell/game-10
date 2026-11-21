// LEVEL 1 — "The Rotten Patch"
// Built from rectangles so it is easy to read and tweak. Coordinates are in tiles (32px).
function buildLevel1() {
  const W = 190, H = 34;
  const tiles = new Array(W * H).fill(T.EMPTY);
  const fill = (x1, y1, x2, y2, v = T.SOLID) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      if (x >= 0 && x < W && y >= 0 && y < H) tiles[y * W + x] = v;
    }
  };

  // world edge
  fill(0, 0, 0, H - 1);

  // A — starting graveyard
  fill(1, 30, 30, 33);
  fill(12, 27, 15, 27, T.ONEWAY);
  // first spike pit
  fill(31, 32, 33, 33); fill(31, 31, 33, 31, T.SPIKE);
  // B — first foes
  fill(34, 30, 50, 33);
  // C — spike field with platforms (pogo practice)
  fill(51, 32, 62, 33); fill(51, 31, 62, 31, T.SPIKE);
  fill(53, 27, 55, 27, T.ONEWAY);
  fill(58, 27, 60, 27, T.ONEWAY);
  // D — approach to the climb
  fill(63, 30, 84, 33);
  fill(80, 16, 80, 26); // left side of the wall-jump shaft
  // E — the cliff (right wall of the shaft) + upper path
  fill(85, 14, 95, 33);
  // dash gap with spikes at the bottom
  fill(96, 25, 101, 33); fill(96, 24, 101, 24, T.SPIKE);
  // F — upper ruins
  fill(102, 14, 125, 33);
  // G — the drop down to the boss gate (ground continues under the arena)
  fill(126, 30, W - 1, 33);
  fill(129, 20, 132, 20, T.ONEWAY);
  fill(135, 24, 138, 24, T.ONEWAY);
  // ARENA
  fill(153, 0, W - 1, 14);           // ceiling
  fill(182, 0, W - 1, 33);           // right wall
  fill(153, 15, 153, 29, T.GATE);    // gate that slams shut
  fill(157, 25, 160, 25, T.ONEWAY);
  fill(175, 25, 178, 25, T.ONEWAY);
  fill(165, 21, 170, 21, T.ONEWAY);

  const candy = [
    [13, 26], [14, 26], [18, 28], [19, 28], [20, 28], [21, 28], [25, 27],
    [32, 27], [33, 27],
    [38, 28], [40, 27], [45, 27], [47, 28],
    [54, 25], [59, 25], [56, 23], [57, 22], [61, 25],
    [66, 28], [67, 28], [68, 28], [75, 28], [76, 28],
    [82, 25], [83, 21], [82, 18], [83, 15],
    [88, 12], [89, 12], [90, 12],
    [97, 11], [98, 10], [99, 10], [100, 11],
    [105, 12], [106, 12], [107, 12], [112, 12], [113, 11], [121, 12], [122, 12],
    [130, 18], [131, 18], [136, 22], [137, 22], [140, 28], [143, 28], [144, 28],
  ];

  const enemies = [
    { type: 'crawler', x: 42, y: 29 },
    { type: 'crawler', x: 72, y: 29 },
    { type: 'crawler', x: 108, y: 13 },
    { type: 'crawler', x: 118, y: 13 },
    { type: 'crawler', x: 141, y: 29 },
    { type: 'bat', x: 68, y: 24 },
    { type: 'bat', x: 114, y: 9 },
    { type: 'bat', x: 146, y: 25 },
  ];

  const signs = [
    { x: 5, y: 29, text: 'Move with A / D or the arrow keys.' },
    { x: 10, y: 29, text: 'SPACE or Z to jump. Hold it to jump higher!' },
    { x: 28, y: 29, text: 'Spikes hurt! Jump over the pit.' },
    { x: 37, y: 29, text: 'J or X to attack. Hold W or S while attacking to aim up or down.' },
    { x: 49, y: 29, text: 'Over spikes, hold S / Down and attack to POGO-bounce off them!' },
    { x: 77, y: 29, text: 'Slide down a wall, then jump to WALL-JUMP. Climb the shaft!' },
    { x: 91, y: 13, text: 'SHIFT, K or C to DASH. Jump, then dash across the gap!' },
    { x: 127, y: 29, text: 'Hitting foes fills your SOUL orb. Press F to heal a mask.' },
    { x: 150, y: 29, text: 'Beyond the gate... something rotten stirs.' },
  ];

  const decor = [
    { type: 'grave', x: 7, y: 29 }, { type: 'grave', x: 23, y: 29 }, { type: 'grave', x: 44, y: 29 },
    { type: 'grave', x: 66, y: 29 }, { type: 'grave', x: 110, y: 13 }, { type: 'grave', x: 133, y: 29 },
    { type: 'tree', x: 16, y: 29 }, { type: 'tree', x: 70, y: 29 }, { type: 'tree', x: 120, y: 13 }, { type: 'tree', x: 139, y: 29 },
    { type: 'shroom', x: 26, y: 29 }, { type: 'shroom', x: 64, y: 29 }, { type: 'shroom', x: 104, y: 13 }, { type: 'shroom', x: 89, y: 13 },
    { type: 'skulls', x: 160, y: 29 }, { type: 'skulls', x: 178, y: 29 }, { type: 'skulls', x: 168, y: 29 },
  ];

  return {
    name: 'The Rotten Patch',
    w: W, h: H, tiles,
    spawn: { x: 3, y: 29 },
    candy, enemies, signs, decor,
    benches: [{ x: 147, y: 29 }],
    arena: {
      gateX: 153, gateY0: 15, gateY1: 29,
      triggerX: 156 * TILE,
      x1: 154 * TILE, x2: 182 * TILE,
      floorY: 30 * TILE, ceilY: 15 * TILE,
      camX: 153 * TILE - 16, camY: 14 * TILE + 16,
      bossSpawn: { x: 172 * TILE, y: 16 * TILE },
    },
  };
}
