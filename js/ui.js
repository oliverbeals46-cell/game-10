// Menus, shop and overlays (HTML on top of the canvas).
const UI = {
  screens: ['menu', 'howto', 'controls', 'credits', 'shop', 'pause', 'victory'],
  shopAnim: null,

  init() {
    document.querySelectorAll('button[data-action]').forEach((b) => {
      b.addEventListener('click', () => this.action(b.dataset.action));
    });
    this.refreshMenu();
    this.show('menu');
  },

  show(id) {
    for (const s of this.screens) document.getElementById('screen-' + s).classList.add('hidden');
    if (id) document.getElementById('screen-' + id).classList.remove('hidden');
    if (id !== 'shop' && this.shopAnim) { cancelAnimationFrame(this.shopAnim); this.shopAnim = null; }
  },

  action(a) {
    Sfx.init();
    Sfx.play('click');
    switch (a) {
      case 'play': this.show(null); Game.startLevel(); break;
      case 'shop':
        if (Game.state !== 'menu') { Game.state = 'menu'; Game.world = null; }
        this.openShop(); break;
      case 'howto': this.show('howto'); break;
      case 'controls': this.show('controls'); break;
      case 'credits': this.show('credits'); break;
      case 'menu': Game.menuDummy = Game.makeDummy(Save.data.equipped); this.refreshMenu(); this.show('menu'); break;
      case 'resume': Game.resume(); break;
      case 'restart': this.show(null); Game.startLevel(); break;
      case 'quit': Game.quitToMenu(); break;
    }
  },

  refreshMenu() {
    const d = Save.data;
    document.getElementById('menu-candy').innerHTML = `Souls: <b>${d.souls}</b>`;
    document.getElementById('menu-equipped').innerHTML = `Head: <b>${headById(d.equipped).name}</b>`;
    document.getElementById('menu-progress').innerHTML = d.levels.l1
      ? `Level 1: <b>Cleared</b>${d.best.l1 ? ` (best ${fmtTime(d.best.l1, true)})` : ''}`
      : 'Level 1: <b>Not cleared</b>';
  },

  openShop() {
    this.show('shop');
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    const canvases = [];
    for (const h of HEADS) {
      const card = document.createElement('div');
      card.className = 'shop-card';
      const cv = document.createElement('canvas');
      cv.width = 240; cv.height = 200;
      const name = document.createElement('div'); name.className = 'name'; name.textContent = h.name;
      const perk = document.createElement('div'); perk.className = 'perk'; perk.textContent = h.perk;
      const btn = document.createElement('button');
      btn.addEventListener('click', () => this.shopClick(h));
      card.append(cv, name, perk, btn);
      grid.appendChild(card);
      canvases.push({ cv, h, card, btn, dummy: Game.makeDummy(h.id) });
    }
    this.shopCards = canvases;
    this.updateShop();
    const tick = (now) => {
      const t = now / 1000;
      for (const c of this.shopCards) {
        const ctx = c.cv.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 240, 200);
        const g = ctx.createRadialGradient(120, 110, 10, 120, 110, 100);
        g.addColorStop(0, c.h.accent + '44'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 240, 200);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, 120, 182, 46, 8);
        ctx.translate(120, 182);
        ctx.scale(4, 4);
        const d = c.dummy; d.anim = t; d.facing = 1; d.x = -d.w / 2; d.y = -d.h;
        drawPlayer(ctx, d, t + c.h.price * 0.01);
      }
      this.shopAnim = requestAnimationFrame(tick);
    };
    if (this.shopAnim) cancelAnimationFrame(this.shopAnim);
    this.shopAnim = requestAnimationFrame(tick);
  },

  updateShop() {
    const d = Save.data;
    document.getElementById('shop-candy').textContent = `Souls: ${d.souls}`;
    for (const c of this.shopCards) {
      const owned = d.owned.includes(c.h.id), eq = d.equipped === c.h.id;
      c.card.classList.toggle('equipped', eq);
      c.btn.className = '';
      if (eq) { c.btn.textContent = 'Equipped'; c.btn.classList.add('on'); }
      else if (owned) c.btn.textContent = 'Equip';
      else {
        c.btn.textContent = `Buy - ${c.h.price} souls`;
        c.btn.classList.add(d.souls >= c.h.price ? 'buy' : 'locked');
      }
    }
  },

  shopClick(h) {
    const d = Save.data;
    if (d.equipped === h.id) return;
    if (d.owned.includes(h.id)) { d.equipped = h.id; Sfx.play('click'); }
    else if (d.souls >= h.price) { d.souls -= h.price; d.owned.push(h.id); d.equipped = h.id; Sfx.play('buy'); }
    else { Sfx.play('deny'); return; }
    Save.write();
    this.updateShop();
  },

  showVictory(stats, newUnlock, best, record) {
    document.getElementById('victory-stats').innerHTML =
      `<div><b>${fmtTime(stats.time, true)}</b>Your time</div>` +
      `<div><b>${fmtTime(best, true)}</b>${record ? '<span class="rec">NEW BEST!</span>' : 'Best time'}</div>` +
      `<div><b>${stats.deaths}</b>Deaths</div><div><b>${stats.souls}</b>Souls earned</div>`;
    const na = nextAttack();
    if (newUnlock) {
      document.querySelector('#screen-victory .unlock-title').textContent = 'New Attack Unlocked';
      document.querySelector('#screen-victory .unlock-name').textContent = newUnlock.name;
      document.querySelector('#screen-victory .unlock-desc').innerHTML = `Press <kbd>${newUnlock.key}</kbd>. ${newUnlock.desc}`;
    } else {
      document.querySelector('#screen-victory .unlock-title').textContent = na ? 'Next attack' : 'All attacks unlocked';
      document.querySelector('#screen-victory .unlock-name').textContent = na ? na.name : '';
      document.querySelector('#screen-victory .unlock-desc').textContent = na ? `Unlocks after you beat Level ${na.level}. A new attack every 20 levels!` : '';
    }
    this.show('victory');
  },
};

function fmtTime(s, tenths) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  const base = `${m}:${String(r).padStart(2, '0')}`;
  return tenths ? `${base}.${Math.floor((s * 10) % 10)}` : base;
}

Game.init();
UI.init();
