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
| Pause / Mute | Esc or P / M |

## Rules

- **Infinite health.** Spikes, lava and fire kill you instantly, and you respawn at your last **checkpoint** (numbered flags that turn green). Monsters only knock you back.
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
| 11–20 | Frozen bone forest, blue ghost-fire | Ice Wisp, Frost Mite, Snow Skull | The Frozen Widow (L20) |
| 21–30 | Swamp under a red moon | Bog Leech, Swamp Lantern, Croaking Skull | The Mire Hag (L30) |
| 31–40 | Underground clockwork tombs | Gear Spider, Chain Ghoul, Tick-Tock Skull | The Grandfather Clock (L40) |
| 41–50 | Burning cathedral, orange embers | Ember Imp, Candle Wraith, Ash Bat | The Hollow Saint (L50) |

### Level 2 obstacles
Small stepping stones under spinning fire → an up-and-down raft to a high ledge → a sliding raft over lava → tiny crumbling stones → a bounce mushroom on a pillar → fire gauntlet → dash gap → stone staircase over lava → spike strips and fire → crumbling bridge → **finish portal**. There are 5 checkpoints.

### Level 1 obstacles
Floating stones over spikes → moving rafts → crumbling stones over lava → bounce mushrooms up a cliff → spinning fire bars → dash pillars → double-jump ledge climb → spike strips → a raft over lava → **finish portal**. There are 6 checkpoints along the way.

## Heads (Creepy Collection)

| Head | Price (shards) | Perk |
| --- | --- | --- |
| Hollow Mask | free | Balanced |
| Bonesy | 40 | Monsters barely knock you back |
| The Shade | 60 | Longer dash that recharges faster |
| Stitches | 80 | Jumps higher and runs faster |
| Count Fang | 100 | Wisp Bolt recharges twice as fast |
| Wrapz | 130 | Floaty: hold jump to fall slowly |
| The Rotter | 160 | +50% damage |
| Wick | 200 | Longer slash reach |

## Code layout

```
index.html        screens: home, shop, how to play, controls, credits, pause, level complete
js/themes.js      the look/enemies/boss for each group of 10 levels + the attack unlock schedule
js/art.js         sky, moon, clouds, castle, forest, fog, lighting, checkpoints, portal, decorations
js/world.js       tile map, collision and textured tile art (cached in chunks)
js/level1.js      Level 1 layout (+ the LEVELS list)
js/level2.js      Level 2 layout
js/entities.js    player, mini enemies, obby obstacles (rafts, crumbling stones, bounce pads, fire bars)
js/boss.js        The Grave Warden (Level 10 boss, ready for when Level 10 is built)
js/game.js        game loop, camera, checkpoints, deaths/timer, HUD
js/heads.js       head art and perks
js/audio.js       synthesized sound effects + boss-only music
js/ui.js          menus and shop
```
