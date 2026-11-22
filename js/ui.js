// Menus, shop and overlays (HTML on top of the canvas).
const UI = {
  screens: ['menu', 'code', 'levels', 'howto', 'controls', 'credits', 'shop', 'pause', 'victory'],
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
    document.getElementById('hud-buttons').classList.toggle('hidden', id !== null || Game.state !== 'playing');
  },

  action(a) {
    Sfx.init();
    Sfx.play('click');
    switch (a) {
      case 'play': this.openLevels(); break;
      case 'levels': Game.exitToLevels(); break;
      case 'next': this.show(null); Game.startLevel(Game.levelNum + 1); this.show(null); break;
      case 'pausebtn': Game.pause(); break;
      case 'code': this.openCode(); break;
      case 'code-submit': this.submitCode(); break;
      case 'shop':
        if (Game.state !== 'menu') { Game.state = 'menu'; Game.world = null; }
        this.openShop(); break;
      case 'howto': this.show('howto'); break;
      case 'controls': this.show('controls'); break;
      case 'credits': this.show('credits'); break;
      case 'menu': Game.menuDummy = Game.makeDummy(Save.data.equipped); this.refreshMenu(); this.show('menu'); break;
      case 'resume': Game.resume(); break;
      case 'restart': this.show(null); Game.startLevel(Game.levelNum, true); this.show(null); break;
      case 'quit': Game.quitToMenu(); break;
    }
  },

  // Level select: replay any level you've reached. Levels unlock in order.
  openLevels(page) {
    this.show('levels');
    const d = Save.data;
    // pages of 20 levels; open on the page with the newest level you've reached
    if (page === undefined) { let top = 1; for (let n = 1; n <= PLANNED_LEVELS; n++) if (d.levels['l' + n]) top = n + 1; page = Math.min(Math.floor((Math.min(top, 60) - 1) / 20), 2); }
    this.levelPage = page;
    const tabs = document.getElementById('level-tabs');
    tabs.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const tb = document.createElement('button'); tb.textContent = `${i * 20 + 1}–${i * 20 + 20}`; tb.className = i === page ? 'on' : '';
      tb.addEventListener('click', () => { Sfx.play('click'); this.openLevels(i); }); tabs.appendChild(tb);
    }
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    for (let n = page * 20 + 1; n <= page * 20 + 20; n++) {
      const built = !!LEVELS[n];
      const unlocked = built && (n === 1 || d.levels['l' + (n - 1)] || d.devUnlock);
      const cleared = !!d.levels['l' + n];
      const best = d.best['l' + n];
      const b = document.createElement('button');
      b.className = 'lvl' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '') + (isBossLevel(n) ? ' boss' : '');
      b.innerHTML = `<span class="num">${n}</span>` +
        (isBossLevel(n) ? '<span class="tag">BOSS</span>' : '') +
        `<span class="info">${!built ? 'Coming soon' : !unlocked ? 'Locked' : best ? 'Best ' + fmtTime(best, true) : 'Not cleared'}</span>` +
        (built && unlocked && d.shardBest && d.shardBest['l' + n] !== undefined ? `<span class="info shards">Shards ${d.shardBest['l' + n]}</span>` : '') +
        (d.resume && d.resume.level === n ? `<span class="info cont">&#9654; Continue${d.resume.checkpoint ? ' · CP ' + d.resume.checkpoint : ''}</span>` : '');
      if (unlocked) b.addEventListener('click', () => { Sfx.play('click'); this.show(null); Game.startLevel(n); this.show(null); });
      grid.appendChild(b);
    }
  },

  // Code entry (only a hash is stored).
  CODE_HASH: 'f5340a20d53171f3dc26dab6d42febc25c1b2d27753879ba6e72e73a6b5b5aed',
  openCode() {
    this.show('code');
    const inp = document.getElementById('code-input');
    inp.value = ''; document.getElementById('code-msg').innerHTML = '&nbsp;';
    setTimeout(() => inp.focus(), 50);
    if (!inp.dataset.bound) { inp.dataset.bound = '1'; inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.submitCode(); e.stopPropagation(); }); }
  },
  async submitCode() {
    const inp = document.getElementById('code-input'), msg = document.getElementById('code-msg');
    const text = 'hallowheads:' + inp.value.trim();
    let hash = '';
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { msg.textContent = 'Codes need the online version of the game.'; return; }
    if (hash !== this.CODE_HASH) { Sfx.play('deny'); msg.textContent = 'Wrong code.'; inp.value = ''; return; }
    const d = Save.data;
    d.devUnlock = true;                                   // every level can be picked
    for (const a of ATTACKS) d.unlocks[a.id] = true;      // every attack
    for (const h of HEADS) if (!d.owned.includes(h.id)) d.owned.push(h.id); // every head
    d.shards += 9999;
    Save.write();
    Sfx.play('buy');
    msg.textContent = 'Code accepted! All levels, heads and attacks unlocked, +9,999 shards.';
    inp.value = '';
    this.refreshMenu();
  },

  refreshMenu() {
    const d = Save.data;
    document.getElementById('menu-candy').innerHTML = `Shards: <b>${d.shards}</b>`;
    document.getElementById('menu-equipped').innerHTML = `Head: <b>${headById(d.equipped).name}</b>`;
    const cleared = Object.keys(d.levels).filter((k) => d.levels[k]).length;
    document.getElementById('menu-progress').innerHTML = `Levels cleared: <b>${cleared}</b>`;
  },

  openShop(setId = this.shopSet || 'creepy') {
    this.show('shop');
    this.shopSet = setId;
    // page tabs: Creepy Collection / Christmas / Thanksgiving
    const tabs = document.getElementById('shop-tabs');
    tabs.innerHTML = '';
    for (const s of HEAD_SETS) {
      const b = document.createElement('button');
      b.textContent = s.name + (s.season ? (setOnSale(s.id) ? ' · ON SALE' : '') : '');
      b.className = (s.id === setId ? 'on ' : '') + 'set-' + s.id;
      b.addEventListener('click', () => { Sfx.play('click'); this.openShop(s.id); });
      tabs.appendChild(b);
    }
    const set = HEAD_SETS.find((s) => s.id === setId);
    document.querySelector('#screen-shop .season').textContent = set.season ? `Limited: ${set.season}` : 'Creepy Collection';
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    const canvases = [];
    for (const h of HEADS.filter((x) => (x.set || 'creepy') === setId)) {
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
    document.getElementById('shop-candy').textContent = `Shards: ${d.shards}`;
    for (const c of this.shopCards) {
      const owned = d.owned.includes(c.h.id), eq = d.equipped === c.h.id;
      c.card.classList.toggle('equipped', eq);
      c.btn.className = '';
      if (eq) { c.btn.textContent = 'Equipped'; c.btn.classList.add('on'); }
      else if (owned) c.btn.textContent = 'Equip';
      else if (c.h.set && !setOnSale(c.h.set)) {
        c.btn.textContent = `Back ${HEAD_SETS.find((s) => s.id === c.h.set).season}`;
        c.btn.classList.add('locked');
      } else {
        c.btn.textContent = `Buy - ${c.h.price} shards`;
        c.btn.classList.add(d.shards >= c.h.price ? 'buy' : 'locked');
      }
    }
  },

  shopClick(h) {
    const d = Save.data;
    if (d.equipped === h.id) return;
    if (d.owned.includes(h.id)) { d.equipped = h.id; Sfx.play('click'); }
    else if (h.set && !setOnSale(h.set)) { Sfx.play('deny'); return; }
    else if (d.shards >= h.price) { d.shards -= h.price; d.owned.push(h.id); d.equipped = h.id; Sfx.play('buy'); }
    else { Sfx.play('deny'); return; }
    Save.write();
    this.updateShop();
  },

  showVictory(stats, newUnlock, best, record) {
    document.getElementById('victory-stats').innerHTML =
      `<div><b>${fmtTime(stats.time, true)}</b>Your time</div>` +
      `<div><b>${fmtTime(best, true)}</b>${record ? '<span class="rec">NEW BEST!</span>' : 'Best time'}</div>` +
      `<div><b>${stats.deaths}</b>Deaths</div><div><b>${stats.shards} / ${Game.shardTotal}</b>Shards</div>`;
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
    const nb = document.getElementById('btn-next');
    const hasNext = !!LEVELS[Game.levelNum + 1];
    nb.disabled = !hasNext;
    nb.textContent = hasNext ? `Level ${Game.levelNum + 1}` : `Level ${Game.levelNum + 1} coming soon`;
    document.querySelector('#screen-victory h2').textContent = `Level ${Game.levelNum} Complete!`;
    const STORY_END = {
      20: 'The Frozen Widow falls... and the ice cracks beneath you. You fall deep, deep underground. Something down there is awake.',
      30: 'The Troll crashes to the ground. Far below, you hear ticking...',
      40: 'The Grandfather Clock stops. The floor gives way to a burning cathedral below.',
      50: 'The Hollow Saint burns out. Beyond it, there is only the Void.',
      60: 'The Void King is gone. You made it to the very bottom. For now...',
    };
    document.querySelector('#screen-victory .sub').textContent = STORY_END[Game.levelNum] || 'You made it to the portal!';
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
document.querySelectorAll('#hud-buttons button').forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
