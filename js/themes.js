// Every 10 levels the game changes: new colours/setting, new mini enemies, and a boss on level 10, 20, 30...
// These are NOT separate named worlds — levels just go in order (Levels 1–10, 11–20, ...).
// Inside each group of 10, every level is shifted a little (variant) so no two levels look the same,
// while everything keeps the same realistic, scary style.
const WORLDS = [
  {
    id: 1, levels: [1, 10],
    look: 'A haunted graveyard and dead forest under a pale moon.',
    enemies: ['Grave Mite (crawler)', 'Vesper Bat (flyer)', 'Skitter Skull (hopping skull on spider legs)'],
    boss: 'The Grave Warden (Level 10)',
    pal: {
      sky: ['#05030c', '#160d2c', '#2c1638', '#3d1f34'], star: '#efe8ff', moon: [255, 230, 190],
      far: ['#2a1a42', '#1c1230'], mid: ['#1a1030', '#120a22'], near: ['#0f0819', '#0a0612'],
      castle: '#1b1230', windows: '#c8e0a0', tree: '#0d0a17', bgTree: '#130c22',
      fog: [150, 120, 190], haze: [120, 90, 150],
      stone: [44, 38, 64], grass: ['#5e8a62', '#3e6448', '#7aa070', '#2f4c38', '#6b7f5a'], grassTop: ['#4f7656', '#2c4634'], moss: [70, 110, 80],
      leaves: ['#4a3a30', '#2e2620', '#5a4a44', '#3a3038'], dark: [6, 3, 16], ambient: 0.55,
    },
  },
  {
    id: 2, levels: [11, 20],
    look: 'A frozen forest of bone-white trees and blue ghost-fire.',
    enemies: ['Ice Wisp', 'Frost Mite', 'Snow Skull'],
    boss: 'The Frozen Widow (Level 20)',
    pal: {
      sky: ['#02060e', '#0a1a2c', '#16324a', '#24405a'], star: '#e8f6ff', moon: [210, 235, 255],
      far: ['#1a3048', '#10203a'], mid: ['#0e1c30', '#081424'], near: ['#060e1a', '#040a12'],
      castle: '#0e1e34', windows: '#7ae0ff', tree: '#0a1220', bgTree: '#0e1a2c',
      fog: [170, 210, 240], haze: [120, 170, 210],
      stone: [40, 52, 70], grass: ['#cfe6f0', '#9fc2d4', '#e8f4fa', '#7aa2b8', '#b8d6e4'], grassTop: ['#dff0f8', '#9cbccc'], moss: [150, 200, 220],
      leaves: ['#ffffff', '#d8ecf8', '#bcd8ea', '#eaf6ff'], dark: [2, 6, 16], ambient: 0.5,
    },
  },
  // ---- From Level 21 on, you have fallen underground. Every level has a CHASE and falling hazards. ----
  {
    id: 3, levels: [21, 30],
    look: 'A deep cave: stalagmites, dripping rock, glowing crystals, and stalactites that fall when you run under them.',
    enemies: ['Rock Crawler', 'Cave Bat', 'Pebble Imp'],
    boss: 'The Troll (Level 30)',
    pal: {
      sky: ['#040302', '#0e0a08', '#16100c', '#1a120c'], star: '#ffd8a0', moon: [255, 200, 140],
      far: ['#1a1410', '#120e0a'], mid: ['#120e0a', '#0c0906'], near: ['#080604', '#050403'],
      castle: '#140e0a', windows: '#ffb060', tree: '#0a0806', bgTree: '#120e0a',
      fog: [150, 130, 110], haze: [120, 100, 80],
      stone: [58, 50, 44], grass: ['#5a5040', '#463e30', '#6e6250', '#3a3228', '#544838'], grassTop: ['#5a5040', '#3a3228'], moss: [90, 120, 80],
      leaves: ['#8a7a6a', '#6a5a4a', '#a89880', '#4a3e34'], dark: [6, 4, 2], ambient: 0.66,
    },
  },
  {
    id: 4, levels: [31, 40],
    look: 'Underground clockwork tombs full of ticking gears, chains and green candlelight.',
    enemies: ['Gear Spider', 'Chain Ghoul', 'Tick-Tock Skull'],
    boss: 'The Grandfather Clock (Level 40)',
    pal: {
      sky: ['#020604', '#0a1a12', '#12281c', '#1a2a1c'], star: '#e0ffe8', moon: [190, 255, 200],
      far: ['#12281c', '#0a1a12'], mid: ['#0e1e14', '#08140c'], near: ['#060e08', '#040a06'],
      castle: '#0c1e14', windows: '#7aff9a', tree: '#06100a', bgTree: '#0c1a10',
      fog: [120, 200, 150], haze: [90, 150, 110],
      stone: [46, 50, 44], grass: ['#8a8a6a', '#6a6a4a', '#aaa880', '#4a4a34', '#7a7a5a'], grassTop: ['#7a7a5a', '#4a4a34'], moss: [90, 140, 100],
      leaves: ['#c8a040', '#8a7030', '#e0c060', '#6a5020'], dark: [2, 8, 4], ambient: 0.62,
    },
  },
  {
    id: 5, levels: [41, 50],
    look: 'A burning cathedral, glowing with orange embers and stained glass.',
    enemies: ['Ash Crawler', 'Ember Bat', 'Cinder Skull'],
    boss: 'The Hollow Saint (Level 50)',
    pal: {
      sky: ['#0a0402', '#2a100a', '#4a1e0c', '#6a2a0e'], star: '#fff0d8', moon: [255, 180, 90],
      far: ['#3a1a0e', '#24100a'], mid: ['#201008', '#160a04'], near: ['#0e0804', '#0a0602'],
      castle: '#24100a', windows: '#ffd06a', tree: '#0e0602', bgTree: '#1e0e06',
      fog: [220, 120, 60], haze: [180, 100, 60],
      stone: [56, 44, 40], grass: ['#7a5a3a', '#5a3a22', '#9a7a4a', '#3a2614', '#6a4a2a'], grassTop: ['#6a4a2a', '#3a2614'], moss: [140, 90, 50],
      leaves: ['#ff6a2a', '#c8401a', '#ff8a3a', '#6a2a14'], dark: [10, 4, 2], ambient: 0.58,
    },
  },
  {
    id: 6, levels: [51, 60],
    look: 'The Void: broken stone floating in purple nothingness, under a swirling dark eye.',
    enemies: ['Void Crawler', 'Void Eye', 'Void Skull'],
    boss: 'The Void King (Level 60)',
    pal: {
      sky: ['#020006', '#0e0420', '#1e0838', '#2a0a44'], star: '#f0d8ff', moon: [200, 120, 255],
      far: ['#1e0a34', '#12061e'], mid: ['#140620', '#0c0416'], near: ['#08020e', '#05010a'],
      castle: '#160828', windows: '#d080ff', tree: '#0a0414', bgTree: '#140822',
      fog: [170, 90, 230], haze: [130, 70, 190],
      stone: [44, 36, 62], grass: ['#7a5aa8', '#5a3a88', '#9a7ac8', '#3a2460', '#6a4a98'], grassTop: ['#6a4a98', '#3a2460'], moss: [150, 90, 220],
      leaves: ['#c890ff', '#8a5ad8', '#f0d0ff', '#5a2aa8'], dark: [4, 1, 10], ambient: 0.6,
    },
  },
  // ---- Levels 61–70: back on the surface, under a blood moon. Bog geysers, and a serpent chases you. ----
  {
    id: 7, levels: [61, 70],
    look: 'A swamp under a blood-red moon: dead mangroves, toxic bog, and geysers of poison sludge.',
    enemies: ['Bog Leech', 'Swamp Lantern', 'Croaking Skull'],
    boss: 'The Mire Hag (Level 70)',
    pal: {
      sky: ['#0a0204', '#2a0a10', '#4a1416', '#3a1a10'], star: '#ffe0d8', moon: [255, 90, 70],
      far: ['#3a1418', '#22080c'], mid: ['#1e1410', '#140c08'], near: ['#0c0a06', '#080604'],
      castle: '#2a0c10', windows: '#7aff5a', tree: '#0c0806', bgTree: '#1a0e0a',
      fog: [120, 170, 80], haze: [150, 70, 60],
      stone: [50, 46, 36], grass: ['#4a5a22', '#33421a', '#6a7a32', '#2a3412', '#5a5a2a'], grassTop: ['#4a5a22', '#2a3412'], moss: [110, 150, 50],
      leaves: ['#6a7a2a', '#4a3a1a', '#8a6a2a', '#3a2a10'], dark: [10, 3, 3], ambient: 0.56,
    },
  },
  // ---- Levels 71–80: an abandoned carnival under the blood moon. Swinging blades; a ghost train chases you. ----
  {
    id: 8, levels: [71, 80],
    look: 'A creepy clown carnival: striped tents, a broken ferris wheel, flickering lights, and clowns everywhere.',
    enemies: ['Creepy Clown', 'Clown Balloon', 'Jack-in-the-Box Clown'],
    boss: 'Mr. Giggles (Level 80)',
    pal: {
      sky: ['#06020a', '#1a0a20', '#3a0e24', '#2a0a14'], star: '#ffe8f0', moon: [255, 110, 90],
      far: ['#2a0e22', '#180818'], mid: ['#1a0a18', '#100610'], near: ['#0a0408', '#060206'],
      castle: '#1a0a18', windows: '#ffd060', tree: '#0a0408', bgTree: '#14081a',
      fog: [200, 120, 160], haze: [150, 70, 110],
      stone: [52, 40, 50], grass: ['#5a4a3a', '#3e2e22', '#7a6a4a', '#2e2218', '#6a5a3a'], grassTop: ['#6a5040', '#2e2218'], moss: [140, 90, 110],
      leaves: ['#ff4a6a', '#ffd040', '#4ac8ff', '#ffffff'], dark: [6, 2, 6], ambient: 0.58,
    },
  },
  // ---- Levels 81–90: a giant marble chess hall. Military chess pieces patrol back and forth; Level 90 is a real game of chess. ----
  {
    id: 9, levels: [81, 90],
    look: 'A giant marble chess hall: checkerboard floors, towering pieces, and chess pieces in army gear that march back and forth.',
    enemies: ['Soldier Pawn', 'Commando Knight', 'Sniper Bishop'],
    boss: 'The Living Board (Level 90): beat it at chess!',
    pal: {
      sky: ['#04040a', '#10101c', '#1c1c2a', '#14141e'], star: '#ffffff', moon: [230, 230, 255],
      far: ['#1c1c28', '#12121a'], mid: ['#14141e', '#0c0c14'], near: ['#08080e', '#050508'],
      castle: '#14141e', windows: '#d4af37', tree: '#0a0a10', bgTree: '#14141c',
      fog: [170, 170, 200], haze: [120, 120, 150],
      stone: [72, 70, 82], grass: ['#d8d8e0', '#2a2a34'], grassTop: ['#d8d8e0', '#2a2a34'], moss: [180, 160, 90],
      leaves: ['#ffffff', '#c8c8d0', '#d4af37', '#8a8a9a'], dark: [4, 4, 8], ambient: 0.55,
    },
  },
  // ---- Levels 91–100: a haunted WW2 battlefield at night. Ghost soldiers of a forgotten war. ----
  {
    id: 10, levels: [91, 100],
    look: 'A haunted WW2 battlefield at night: muddy trenches, barbed wire, ruined towns, sweeping searchlights, falling bombs and buried landmines.',
    enemies: ['Gas Mask Ghost', 'War Crow', 'Helmet Skull'],
    boss: 'The Iron Beast, a haunted tank (Level 100)',
    pal: {
      sky: ['#05060a', '#14161a', '#3a2a1e', '#1a1208'], star: '#e8e0d0', moon: [230, 200, 150],
      far: ['#1e1c18', '#141210'], mid: ['#141210', '#0c0a08'], near: ['#080706', '#040403'],
      castle: '#100e0c', windows: '#ffb040', tree: '#0a0806', bgTree: '#16130e',
      fog: [150, 140, 110], haze: [120, 90, 60],
      stone: [62, 56, 46], grass: ['#4a4030', '#33291c', '#5a4e38', '#241c12', '#3e3424'], grassTop: ['#4a3e2a', '#1e180e'], moss: [90, 90, 60],
      leaves: ['#5a4a30', '#3a2e1e', '#6a5a3a', '#2a2014'], dark: [4, 4, 3], ambient: 0.54,
    },
  },
];

function worldForLevel(n) { return WORLDS.find((w) => n >= w.levels[0] && n <= w.levels[1]) || WORLDS[WORLDS.length - 1]; }
function isBossLevel(n) { return n % 10 === 0; }

// Small per-level changes inside a world: moon position, fog thickness, a slight colour tint.
// Hazard colours per group (lava/water, fire, spikes, snow). Groups without their own use these.
const HAZARD_LOOK = {
  1: { liquid: ['#ffdc60', '#ff7a10', '#c02a08', '#4a0a04'], bubble: [255, 230, 120], fire: ['#fff8c0', '#ffa020', '#c02800'], fireGlow: '#ff5a00',
       spike: ['#e8e6f0', '#9a96a8', '#3a3644', 'rgba(140,60,30,0.45)'], snow: false },
  2: { liquid: ['#eaffff', '#6ad8f0', '#12507a', '#04142a'], bubble: [220, 250, 255], fire: ['#f0ffff', '#7ae0ff', '#1a60c0'], fireGlow: '#3ab0ff',
       spike: ['#ffffff', '#bfe8f8', '#4a7a9a', 'rgba(200,240,255,0.5)'], snow: true },
  // underground groups: `under` picks the background, `drop` the falling hazard, `chase` what hunts you
  3: { liquid: ['#ffdc60', '#ff7a10', '#c02a08', '#4a0a04'], bubble: [255, 230, 120], fire: ['#fff0c0', '#ffb040', '#c04a08'], fireGlow: '#ff8a20',
       spike: ['#b8a890', '#7a6a58', '#2e2620', 'rgba(60,50,40,0.4)'], under: 'cave', drop: 'stalactite', chase: 'boulder', crystal: '#5ad8ff' },
  4: { liquid: ['#d8ff80', '#6ad04a', '#1e6a2a', '#06200c'], bubble: [210, 255, 170], fire: ['#f0fff0', '#7aff9a', '#1a8a3a'], fireGlow: '#3aff7a',
       spike: ['#e0d8a8', '#a8984a', '#4a3e1a', 'rgba(120,100,40,0.4)'], under: 'crypt', drop: 'gear', chase: 'gears', crystal: '#7aff9a' },
  5: { liquid: ['#ffe880', '#ff8a10', '#c02a08', '#3a0602'], bubble: [255, 220, 120], fire: ['#fff8c0', '#ffa020', '#c02800'], fireGlow: '#ff5a00',
       spike: ['#e0c8a0', '#a07a50', '#3a2414', 'rgba(255,120,40,0.35)'], under: 'cathedral', drop: 'chandelier', chase: 'fire', crystal: '#ffb040' },
  7: { liquid: ['#d0ff70', '#7ad02a', '#2a6a10', '#0a2004'], bubble: [200, 255, 120], fire: ['#fff0e0', '#ff5a3a', '#8a0a0a'], fireGlow: '#ff2a1a',
       spike: ['#8a7a5a', '#5a4a30', '#1e160c', 'rgba(90,140,40,0.4)'], chase: 'serpent', geysers: true, crystal: '#9aff4a' },
  8: { liquid: ['#ffe080', '#ff6a2a', '#a01020', '#2a0408'], bubble: [255, 220, 140], fire: ['#fff8d0', '#ff8a2a', '#c01020'], fireGlow: '#ff4a2a',
       spike: ['#f0e8e0', '#c8102e', '#3a0810', 'rgba(255,255,255,0.4)'], chase: 'clowncar', pendulums: true, carnival: true, crystal: '#ffd060' },
  9: { liquid: ['#d8d8f0', '#6a6a8a', '#1a1a2a', '#05050a'], bubble: [220, 220, 255], fire: ['#fffbe0', '#e8c040', '#8a6a10'], fireGlow: '#d4af37',
       spike: ['#ffffff', '#9a9aaa', '#2a2a34', 'rgba(212,175,55,0.45)'], under: 'chess', drop: 'piece', chase: 'rook', chess: true, crystal: '#d4af37' },
  10: { liquid: ['#8a7a5a', '#4a3e2a', '#2a2014', '#0e0a06'], bubble: [150, 130, 100], fire: ['#fff0c0', '#ff8a2a', '#a02a08'], fireGlow: '#ff6a10',
       spike: ['#a8a8a8', '#5a5a5a', '#1e1e1e', 'rgba(80,70,50,0.4)'], chase: 'tank', geysers: true, war: true, crystal: '#ffb040' },
  6: { liquid: ['#f0d0ff', '#a050ff', '#40108a', '#10022a'], bubble: [230, 190, 255], fire: ['#ffffff', '#d080ff', '#6a1ad0'], fireGlow: '#b050ff',
       spike: ['#e8d8ff', '#9a7ad8', '#2e1a5a', 'rgba(180,120,255,0.4)'], under: 'void', drop: 'shard', chase: 'void', crystal: '#d080ff' },
};

// Levels 65–69: the Olive Grove. Living green olives that waddle, scream, and run away from you.
const OLIVE_LOOK = {
  olive: true, chase: 'olive',
  leaves: ['#9ab87a', '#7a9a5a', '#c8d8b0', '#5a7a3a'], tree: '#141a0a', bgTree: '#1a2410',
  grass: ['#6a8a3a', '#4a6a2a', '#8aaa4a', '#3a5020', '#7a9a3a'], grassTop: ['#6a8a3a', '#3a5020'], moss: [120, 160, 60],
  liquid: ['#f0ff90', '#a8c83a', '#4a6a10', '#142004'], bubble: [230, 255, 150], crystal: '#a8c83a', windows: '#c8e070',
};

function themeForLevel(n) {
  const w = worldForLevel(n);
  const v = (n - 1) % 10;
  const r = mulberry32(n * 97);
  return Object.assign({}, HAZARD_LOOK[1], HAZARD_LOOK[w.id] || {}, w.pal, {
    world: w, level: n,
    moonX: 560 + r() * 300, moonY: 90 + r() * 60,
    fogMul: 0.8 + r() * 0.6,
    tint: `rgba(${Math.floor(r() * 60)},${Math.floor(r() * 30)},${Math.floor(r() * 60)},${0.04 + v * 0.008})`,
    castleX: 900 + r() * 1400,
  }, n >= 65 && n <= 69 ? OLIVE_LOOK : {});
}

const hexA = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
let THEME = null;

// One new attack every 20 levels. Each one helps against the boss that comes after it.
const ATTACKS = [
  { level: 20, id: 'wisp', name: 'Wisp Bolt', key: 'V', desc: 'Fire a ghostly bolt that zips through monsters. Great for hitting bosses from far away.' },
  { level: 100, id: 'batswarm', name: 'Spirit Swarm', key: 'E', desc: 'Release a swarm of ghostly spirits that fly out and hunt down the closest monsters.' },
  { level: 80, id: 'phantom', name: 'Phantom Dash', key: 'Q', desc: 'A long ghostly dash that passes straight through monsters and bullets, hurting every monster you pass.' },
  { level: 60, id: 'slam', name: 'Ground Slam', key: 'G', desc: 'Slam the ground to send shockwaves rolling both ways. Hits everything on the floor, even bosses.' },
  { level: 40, id: 'spin', name: 'Spin Slash', key: 'B', desc: 'Spin your sword all the way around you, hitting everything close by. Perfect when bosses get close.' },
  // { level: 40, ... }, { level: 60, ... } — added as those levels are built.
];
function nextAttack() { return ATTACKS.find((a) => !Save.data.unlocks[a.id]); }

// Levels get PROGRESSIVELY HARDER. Every level is a bit tougher than the one before:
// obstacles move faster, crumbling stones fall sooner, monsters are quicker.
// Level designers should also use smaller platforms, wider gaps (still jumpable!),
// fewer checkpoints and more obstacles combined together as the level number goes up.
function difficultyForLevel(n) {
  const d = n - 1;
  return {
    speed: 1 + d * 0.035,                       // fire bars
    platform: Math.min(1.25, 1 + d * 0.015),    // rafts and crumbling stones (capped so jumps stay fair)
    enemy: Math.min(1.5, 1 + d * 0.03),         // mini monster speed
    checkpoints: Math.max(3, 6 - Math.floor(d / 10)), // fewer checkpoints in later groups of levels
  };
}

// Level names (shown on the level select so levels are easy to find). Index = level number.
const LEVEL_NAMES = [null,
  'Graveyard Gate', 'Restless Stones', 'Moonlit Crypts', 'Hollow Hill', 'Bone Orchard', 'Whispering Graves', 'Lantern Row', 'Ashen Path', 'The Last Mausoleum', 'The Grave Warden',
  'Frostbite Woods', 'Icicle Hollow', 'Frozen Lake', 'Snowblind Pass', 'Bone-Cold Bridge', 'Glacier Tombs', 'Howling Pines', 'Shiver Peak', "The Widow's Web", 'The Frozen Widow',
  'The Fall', 'Dripping Dark', 'Stalactite Hall', 'Crystal Grotto', 'Boulder Run', 'Echo Chasm', 'Troll Tracks', 'Deep Mines', "The Troll's Den", 'The Troll',
  'Ticking Tombs', 'Gear Grinder', 'Chain Crypt', 'Brass Catacombs', 'Clockwork Stair', 'Rusted Halls', 'Pendulum Vault', 'Midnight Gears', 'The Clock Tower', 'The Grandfather Clock',
  'Burning Nave', 'Ember Aisle', 'Chandelier Hall', 'Ash Choir', 'Cinder Bells', 'Molten Altar', 'Smoke Spire', 'Fire Cloister', "The Saint's Path", 'The Hollow Saint',
  'Into the Void', 'Floating Ruins', 'Purple Nothing', 'Void Shards', 'The Watching Eye', 'Broken Stars', 'Darkness Run', 'Edge of Nowhere', 'The Void Throne', 'The Void King',
  'Blood Moon Rising', 'Toxic Bog', 'Geyser Fields', 'Serpent Swamp', 'The Olive Grove', 'Screaming Olives', 'Olive Stampede', 'Goat Scream Valley', 'The Last Olive', 'The Mire Hag',
  'Carnival Gates', 'Big Top Blues', 'Clown Alley', 'Ferris Wheel Fright', 'Balloon Panic', 'Funhouse Frenzy', 'Jack-in-the-Box Junction', 'Clown Car Chaos', 'The Big Top', 'Mr. Giggles',
  'Opening Move', 'Pawn Storm', "Knight's Leap", "Bishop's Diagonal", 'Castle Walls', 'En Passant', 'Fork in the Road', 'Discovered Attack', 'Endgame', 'The Living Board',
  'No Man\'s Land', 'The Trenches', 'Barbed Wire Ridge', 'Searchlight Alley', 'Minefield', 'Ruined Town', 'Bomb Shelter', 'The Foggy Front', 'Tank Graveyard', 'The Iron Beast',
];
function levelName(n) { return LEVEL_NAMES[n] || ''; }
