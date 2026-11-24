// Keyboard input. `down` = currently held, `pressed` = went down since the last game step.
const Input = (() => {
  const map = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['ArrowUp', 'Space', 'KeyZ'],
    attack: ['KeyJ', 'KeyX'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyC'],
    spell: ['KeyL', 'KeyV'],
    spin: ['KeyB', 'KeyN'],
    slam: ['KeyG', 'KeyH'],
    phantom: ['KeyQ'],
  };
  const held = new Set();
  const pressed = new Set();
  const blockDefault = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const listeners = [];

  addEventListener('keydown', (e) => {
    Sfx.init();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
    if (blockDefault.has(e.code) && document.activeElement === document.body) e.preventDefault();
    if (!e.repeat) listeners.forEach((fn) => fn(e));
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());
  addEventListener('mousedown', () => Sfx.init());

  return {
    down: (a) => map[a].some((c) => held.has(c)),
    pressed: (a) => map[a].some((c) => pressed.has(c)),
    endStep() { pressed.clear(); },
    onKey(fn) { listeners.push(fn); },
  };
})();
