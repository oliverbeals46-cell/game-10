# Hallow Heads

A 2D Halloween action-platformer in the spirit of Hollow Knight. You play a tiny cloaked vessel whose **head** can be swapped. Buy spooky heads in the shop with the candy you collect. Each head has its own perk. Platform through the Rotten Patch, fight foes, and defeat the boss to unlock new attacks.

## Play

No build step is needed. It is plain HTML, CSS and JavaScript.

- Open `index.html` in a browser, **or**
- serve the folder with `python3 -m http.server` and visit http://localhost:8000

## Controls

| Action | Keys |
| --- | --- |
| Move | A / D or ← / → |
| Jump (hold for higher) | Space or Z |
| Wall-jump | Jump while sliding on a wall |
| Attack | J or X (hold W/↑ or S/↓ to aim up/down) |
| Pogo bounce | Down-attack a foe or spikes while in the air |
| Dash | Shift, K or C |
| Heal (costs 33 Soul) | F |
| Wisp Bolt (unlocked after Level 1) | L or V |
| Drop through platform | S/↓ + Jump |
| Pause / Mute | Esc or P / M |

## What's in Level 1: *The Rotten Patch*

- A tutorial path with signs: jumping, a spike pit, attacking, pogo-bouncing over a spike field, a wall-jump shaft, and a dash gap.
- Enemies: **Grave Mites** (crawlers) and **Vesper Bats** (swoop at you).
- A lantern checkpoint before the boss.
- **Boss: The Gourd King** has a charge, a leap slam that sends fire shockwaves, and a seed spit. At half health he becomes enraged: he gets faster, does double leaps and spits more seeds, and his charges knock debris from the ceiling.
- Beating him unlocks the **Wisp Bolt** ranged attack.

## Heads (Halloween season)

| Head | Price | Perk |
| --- | --- | --- |
| Pip the Pumpkin | free | Balanced |
| Bonesy | 150 | +1 mask |
| Boo | 200 | Longer dash that recharges faster |
| Mittens the Hex | 250 | Jumps higher and runs faster |
| Count Fang | 300 | +50% Soul from hits |
| Wrapz | 350 | +2 masks, slightly slower |
| Franky Bolt | 450 | +50% damage |
| Wick | 500 | Longer slash reach |

Progress (candy, owned heads, unlocks) is saved in the browser's localStorage.

## Code layout

```
index.html        screens: home, shop, how to play, controls, credits, pause, victory
css/style.css
js/audio.js       synthesized sound effects (Web Audio)
js/input.js       keyboard input
js/save.js        localStorage save data
js/heads.js       head definitions, perks and the canvas art for every head
js/world.js       tile map, collision and tile rendering
js/level1.js      Level 1 layout (built from rectangles; easy to edit)
js/entities.js    player, enemies, projectiles, candy
js/boss.js        the Gourd King
js/game.js        game loop, camera, combat, HUD, backgrounds
js/ui.js          menus and shop
```

To add a level, copy `js/level1.js`, change the layout, and point `Game.startLevel()` at it.
