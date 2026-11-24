# Hallow Heads

A creepy 2D **obby** (obstacle-course platformer). No Halloween, just dark and scary. You play a little hooded wanderer whose **head** can be swapped. Buy creepy heads with the souls you earn. Run, jump, double jump and dash through each level to reach the glowing finish portal.

## Play

No build step is needed. It's plain HTML, CSS and JavaScript.

- Open `index.html` in a browser, **or**
- serve the folder with `python3 -m http.server` and visit http://localhost:8000

## Controls

| Action | Keys |
| --- | --- |
| Move | ← / → (or A / D) |
| Jump (hold for higher) | ↑ (or Space / Z) |
| Double jump | Press ↑ again in the air |
| Fall faster / drop through rafts | ↓ (or S) |
| Attack | X (or J). Hold ↑/↓ while attacking to aim up/down |
| Pogo bounce | Down-attack a monster or spikes while in the air |
| Dash | C (or Shift / K) |
| Wisp Bolt (unlocks after Level 20) | V (or L) |
| Spin Slash (unlocks after Level 40) | B (or N) |
| Ground Slam (unlocks after Level 60) | G (or H) |
| Phantom Dash (unlocks after Level 80) | Q |
| Spirit Swarm (unlocks after Level 100) | E |
| Pause / Mute | Esc or P / M |

## Rules

- **Infinite health.** Spikes, lava, fire **and touching any monster** kill you instantly (every level), and you respawn at your last **checkpoint** (numbered flags that turn green).
- The **top-right** shows your death count, your time for the level, and your **best time** for that level.
- **Signs** (the `?` posts) explain every obstacle and attack. Every level must have them.
- **Shards** are glowing crystals to collect in every level (small = 1, big purple = 5, monsters drop 3). Spend them on heads in the Heads Shop.
- **No wall climbing.** If you miss a jump, only your double jump can save you.
- **No Halloween anywhere.** Everything is creepy and scary instead.

## Saving (never lose progress)

Progress saves automatically in the player's browser: shards, heads, cleared levels, best times, and **where you are inside a level** (continue from your last checkpoint after closing the tab).

Rules for every future update (see `js/save.js`):
- The save key never changes, and updates only **add** or **convert** data, never delete it.
- New levels and new shop heads just add entries, so existing saves keep working.
- Every save also writes a backup copy. A damaged save falls back to the backup.

Saves live in each browser, so a different computer or a private/incognito window starts fresh.

## The twist (Levels 21+)

Beating the Frozen Widow cracks the ice and you fall underground. From then on every level has a ceiling with **falling hazards** (they shake, then drop when you run under them) and a **chase**: something huge comes after you and you must keep running and jumping until it smashes into the wall. Getting caught = death (back to the checkpoint right before the chase).

New attack after Level 40: **Spin Slash** (B), the sword spins all the way around you. After Level 60: **Ground Slam** (G), shockwaves roll both ways along the ground. After Level 80: **Phantom Dash** (Q), a long ghostly dash straight through monsters and bullets that hurts every monster you pass. After Level 100: **Spirit Swarm** (E), five ghostly spirits that hunt down the closest monsters.

## Level plan

- Levels are just numbered (Level 1, 2, 3...). There are no separate named worlds.
- **Levels get progressively harder.** `difficultyForLevel()` in `js/themes.js` speeds up rafts, fire bars, crumbling stones and monsters with each level number. New levels should also use smaller platforms, longer combos of obstacles and fewer checkpoints as the numbers go up.
- **Every 10 levels** the game changes: a new colour scheme and setting (same realistic, scary style), new mini enemies that match it, and a **boss on Level 10, 20, 30...** See `js/themes.js`.
- Inside each group of 10, every level is a little different (moon position, fog, tint) so no two look the same.
- **One new attack every 20 levels** (Level 20, 40, ...), each one helpful against the next boss. The first is the Wisp Bolt (`ATTACKS` in `js/themes.js`).
- **Music plays only in boss fights.** There are sound effects for footsteps, jumping, double jump, wall-jump, dash, attacks and every unlockable attack.

| Levels | Look | Mini enemies | Boss |
| --- | --- | --- | --- |
| 1–10 | Haunted graveyard & dead forest, pale moon | Grave Mite, Vesper Bat, Skitter Skull | The Grave Warden (L10) |
| 11–20 | Frozen forest: snow, ice spikes, freezing water, blue ghost-fire | Frost Mite, Ice Wisp, Snow Skull | The Frozen Widow (L20) |
| 21–30 | **Deep cave**: stalagmites, glowing crystals, **falling stalactites**, a rolling **boulder chase** | Rock Crawler, Cave Bat, Pebble Imp | **The Troll** (L30) |
| 31–40 | Clockwork crypt: falling gears, a grinding **gear-wall chase** | Gear Spider, Chain Ghoul, Tick-Tock Skull | The Grandfather Clock (L40) |
| 41–50 | Burning cathedral: falling chandeliers, a **wall-of-fire chase** | Ash Crawler, Ember Bat, Cinder Skull | The Hollow Saint (L50) |
| 51–60 | The Void: falling void shards, the **darkness chases you** | Void Crawler, Void Eye, Void Skull | The Void King (L60) |
| 61–70 | **Blood Moon Swamp**: toxic bog geysers, a **bog serpent chase**. **Levels 65–69 are the Olive Grove**: tons of living green olives that waddle, scream like goats and run away from you, falling olives, and a giant rolling olive chase (Level 64 has a few olives too) | Bog Leech, Swamp Lantern, Croaking Skull, Screaming Olives | **The Mire Hag** (L70) |
| 71–80 | **Creepy clown carnival**: striped tents, a turning ferris wheel, string lights, **swinging pendulum blades**, a **clown car chase** | Creepy Clown (giggles, honks and hunts you), Clown Balloon, Jack-in-the-Box Clown | **Mr. Giggles** (L80) |
| 81–90 | **Marble chess hall**: checkerboard floors, giant pieces, falling chess pieces, a **giant Rook chase** | Army Pawn, Army Knight, Army Bishop (they march back and forth; touching one kills you) | **The Living Board** (L90): a huge King challenges you to a REAL game of chess. Get checkmate to win! |
| 91–100 | **Haunted WW2 battlefield**: muddy trenches, barbed wire, a ruined town, sweeping searchlights, **bombs falling from the sky** (a red target shows where), blinking **landmines**, and a **ghost tank chase** | Gas Mask Ghost, War Crow, Helmet Skull (none of them shoot) | **The Iron Beast** (L100): a haunted tank with nobody inside |

### Levels 3–20
Built by `js/levelgen.js` from the obstacle pieces that were tested in Levels 1–2 (floating stones, small stones under fire, moving rafts, crumbling stones, elevator rafts, bounce-mushroom cliffs and pillars, fire runs, dash gaps, lava staircases, plank climbs, spike strips, crumbling bridges, dash pillars). Each level number gives its own layout, gets longer and faster as numbers go up, and has signs before every obstacle, checkpoints, shards, and the mini enemies of its group. Levels 10 and 20 end in a boss arena: the gate shuts behind you, boss music plays, and the exit opens when the boss falls.

Every level stores its route so an automated playtest can run it; all 20 levels have been beaten that way.

### Level 2 obstacles
Small stepping stones under spinning fire → an up-and-down raft to a high ledge → a sliding raft over lava → tiny crumbling stones → a bounce mushroom on a pillar → fire gauntlet → dash gap → stone staircase over lava → spike strips and fire → crumbling bridge → **finish portal**. There are 5 checkpoints.

### Level 1 obstacles
Floating stones over spikes → moving rafts → crumbling stones over lava → bounce mushrooms up a cliff → spinning fire bars → dash pillars → double-jump ledge climb → spike strips → a raft over lava → **finish portal**. There are 6 checkpoints along the way.

## Heads (Creepy Collection)

| Head | Price (shards) | Perk |
| --- | --- | --- |
| Hollow Mask | free | Balanced |
| Bonesy | 40 | Bounces higher off down-slashes |
| The Shade | 60 | Longer dash that recharges faster |
| Stitches | 80 | Jumps higher and runs faster |
| Count Fang | 100 | Wisp Bolt recharges twice as fast |
| Wrapz | 130 | Floaty: hold jump to fall slowly |
| The Rotter | 160 | +50% damage |
| Wick | 200 | Longer slash reach |

## Holiday heads (seasonal pages in the shop)

Each has its own ability. They can only be **bought** during their season, but once bought they're yours forever.

| Christmas (Nov 20 – Jan 6) | Ability | Thanksgiving (November) | Ability |
| --- | --- | --- | --- |
| Frostbite (120) | Triple jump | Turkey Terror (120) | Bounce mushrooms launch higher |
| Krampus (140) | Spin Slash recharges 2x faster | Pilgrim Skull (140) | Falling hazards wait 2x longer |
| Gingerdead (150) | Shard magnet | Pie Phantom (150) | Small shards worth 2 |
| Wicked Elf (160) | Slashes much faster | Corn Husk (160) | Jump a moment after leaving a ledge |
| Nutcracker (180) | Survives one monster hit per checkpoint | Cranberry Blob (180) | Can't be hurt while dashing |
| Rudolph Skull (190) | Lights up the dark farther | Harvest Crow (190) | Crumbling stones fall 2x slower |
| Cracked Bauble (210) | Two air dashes | Horn of Plenty (210) | Wisp Bolt fires two bolts |
| Dark Santa (240) | Chasers move 15% slower | Gravy Ghoul (240) | Much higher double jump |

## Code layout

```
index.html        screens: home, shop, how to play, controls, credits, pause, level complete
js/themes.js      the look/enemies/boss for each group of 10 levels + the attack unlock schedule
js/art.js         sky, moon, clouds, castle, forest, fog, lighting, checkpoints, portal, decorations
js/world.js       tile map, collision and textured tile art (cached in chunks)
js/level1.js      Level 1 layout (+ the LEVELS list)
js/level2.js      Level 2 layout
js/levelgen.js    Levels 3–80 (built from tested obstacle pieces) + chases, falling hazards, boss arenas
js/entities.js    player, mini enemies, obby obstacles (rafts, crumbling stones, bounce pads, fire bars)
js/chess.js       Real chess for the Level 90 boss (all the rules, easy computer opponent)
js/boss.js        Bosses: Grave Warden (10), Frozen Widow (20), Troll (30), Grandfather Clock (40), Hollow Saint (50), Void King (60), Mire Hag (70), Mr. Giggles (80), Chess King (90), The Iron Beast (100)
js/game.js        game loop, camera, checkpoints, deaths/timer, HUD
js/heads.js       head art and perks
js/audio.js       synthesized sound effects + boss-only music
js/ui.js          menus and shop
```
