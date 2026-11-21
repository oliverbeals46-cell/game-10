# Hallow Heads

A spooky 2D **obby** (obstacle-course platformer). You play a little hooded wanderer whose **head** can be swapped. Buy Halloween heads with the candy you collect. Run, jump, double jump, wall-jump and dash through each level to reach the glowing finish portal.

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
| Wall-jump | Slide on a wall, then press ↑ |
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
- **Candy** buys heads in the Heads Shop. Every head has its own perk.

## Level plan

- Levels are just numbered (Level 1, 2, 3...). There are no separate named worlds.
- **Every 10 levels** the game changes: a new colour scheme and setting (same realistic, scary style), new mini enemies that match it, and a **boss on Level 10, 20, 30...** See `js/themes.js`.
- Inside each group of 10, every level is a little different (moon position, fog, tint) so no two look the same.
- **One new attack every 20 levels** (Level 20, 40, ...), each one helpful against the next boss. The first is the Wisp Bolt (`ATTACKS` in `js/themes.js`).
- **Music plays only in boss fights.** There are sound effects for footsteps, jumping, double jump, wall-jump, dash, attacks and every unlockable attack.

| Levels | Look | Mini enemies | Boss |
| --- | --- | --- | --- |
| 1–10 | Haunted pumpkin patch & graveyard, purple moon | Grave Mite, Vesper Bat, Pumpling | The Gourd King (L10) |
| 11–20 | Frozen bone forest, blue ghost-fire | Ice Wisp, Frost Mite, Snow Skull | The Frozen Widow (L20) |
| 21–30 | Swamp under a red moon | Bog Leech, Swamp Lantern, Croaking Skull | The Mire Hag (L30) |
| 31–40 | Underground clockwork tombs | Gear Spider, Chain Ghoul, Tick-Tock Skull | The Grandfather Clock (L40) |
| 41–50 | Burning cathedral, orange embers | Ember Imp, Candle Wraith, Ash Bat | The Hollow Saint (L50) |

### Level 1 obstacles
Floating stones over spikes → moving rafts → crumbling stones over lava → bounce pumpkins up a cliff → spinning fire bars → dash pillars → wall-jump shaft → spike strips → a raft over lava → **finish portal**. There are 6 checkpoints along the way.

## Heads (Halloween season)

| Head | Price | Perk |
| --- | --- | --- |
| Pip the Pumpkin | free | Balanced |
| Bonesy | 150 | Monsters barely knock you back |
| Boo | 200 | Longer dash that recharges faster |
| Mittens the Hex | 250 | Jumps higher and runs faster |
| Count Fang | 300 | Wisp Bolt recharges twice as fast |
| Wrapz | 350 | Slides down walls slowly |
| Franky Bolt | 450 | +50% damage |
| Wick | 500 | Longer slash reach |

## Code layout

```
index.html        screens: home, shop, how to play, controls, credits, pause, level complete
js/themes.js      the look/enemies/boss for each group of 10 levels + the attack unlock schedule
js/art.js         sky, moon, clouds, castle, forest, fog, lighting, checkpoints, portal, decorations
js/world.js       tile map, collision and textured tile art (cached in chunks)
js/level1.js      Level 1 layout
js/entities.js    player, mini enemies, obby obstacles (rafts, crumbling stones, bounce pads, fire bars)
js/boss.js        The Gourd King (Level 10 boss, ready for when Level 10 is built)
js/game.js        game loop, camera, checkpoints, deaths/timer, HUD
js/heads.js       head art and perks
js/audio.js       synthesized sound effects + boss-only music
js/ui.js          menus and shop
```
