// Main game: state, loop, camera, obby obstacles, combat, HUD.
const VIEW_W = 960, VIEW_H = 540;
const STEP = 1 / 60;

const Game = {
  state: 'menu',
  t: 0, acc: 0, last: 0, k: 1,
  world: null,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.stage = document.getElementById('stage');
    this.resize();
    addEventListener('resize', () => this.resize());
    Art.init();
    this.menuDummy = this.makeDummy(Save.data.equipped);

    Input.onKey((e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      }
      if (e.code === 'KeyM') {
        const m = Sfx.toggle();
        if (this.world) this.toast(m ? 'Sound off' : 'Sound on', 1.2);
      }
    });

    this.last = performance.now();
    requestAnimationFrame((n) => this.loop(n));
  },

  resize() {
    const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
    this.stage.style.transform = `scale(${s})`;
    this.stage.style.left = `${(innerWidth - VIEW_W * s) / 2}px`;
    this.stage.style.top = `${(innerHeight - VIEW_H * s) / 2}px`;
    this.k = Math.max(1, Math.min(2.5, s * (window.devicePixelRatio || 1)));
    this.canvas.width = Math.round(VIEW_W * this.k);
    this.canvas.height = Math.round(VIEW_H * this.k);
  },

  makeDummy(head) {
    return { x: 0, y: 0, w: 20, h: 30, vx: 0, vy: 0, facing: -1, onGround: true, anim: 0, head, st: headStats(head),
      invuln: 0, hazardT: 0, landT: 0, dashT: 0, attackT: 0, dead: false };
  },

  /* ---------------- level lifecycle ---------------- */
  startLevel(n = this.levelNum || 1, fresh = false) {
    if (!LEVELS[n]) n = 1;
    if (fresh) Save.clearResume();
    this.levelNum = n;
    this.key = 'l' + n;
    const def = LEVELS[n]();
    this.def = def;
    Art.applyTheme(themeForLevel(def.number));
    this.world = new World(def);
    const s = def.spawn;
    this.spawnPoint = { x: s.x * TILE + 6, y: (s.y + 1) * TILE - 30 };
    this.checkpoint = { ...this.spawnPoint };
    this.player = new Player(this.checkpoint.x, this.checkpoint.y, Save.data.equipped);
    this.pickups = def.shards.map(([x, y]) => new Shard(x * TILE + 16, y * TILE + 16));
    this.pickups.push(...(def.bigShards || []).map(([x, y]) => new Shard(x * TILE + 16, y * TILE + 16, { big: true })));
    this.pickups.forEach((s, i) => (s.id = i));
    this.shardTotal = this.pickups.reduce((n, s) => n + s.value, 0);
    this.taken = [];
    const D = difficultyForLevel(def.number);
    this.difficulty = D;
    this.enemies = def.enemies.map((e) => {
      if (e.type === 'bat') return new Bat(e.x * TILE, e.y * TILE);
      if (e.type === 'skitter') return new Skitter(e.x * TILE + 4, (e.y + 1) * TILE);
      return new Crawler(e.x * TILE + 1, (e.y + 1) * TILE);
    });
    this.enemies.forEach((e) => (e.speedMul = D.enemy));
    this.platforms = def.platforms.map((p) => new Platform(Object.assign({}, p, { period: (p.period || 4) / D.speed, crumble: 0.5 / D.speed })));
    this.pads = def.pads.map((p) => new JumpPad(p));
    this.firebars = def.firebars.map((f) => new FireBar(Object.assign({}, f, { speed: (f.speed || 1.6) * D.speed })));
    this.checkpoints = def.checkpoints.map((c, i) => ({ x: c.x * TILE + 16, y: (c.y + 1) * TILE, lit: false, n: i + 1 }));
    this.finish = { x: def.finish.x * TILE + 16, y: (def.finish.y + 1) * TILE };
    this.projectiles = []; this.particles = []; this.afterimages = []; this.toasts = [];
    this.boss = null;
    this.finishT = 0; this.deathT = 0; this.titleT = 3.2; this.completed = false;
    this.stats = { shards: 0, deaths: 0, time: 0 };
    this.shake = 0; this.freeze = 0; this.flashRed = 0; this.time = 0; this.popups = []; this.lastShardSfx = 0;
    this.newUnlock = false;
    this.cam = { x: 0, y: 0 };
    // Continue where the player left off (they closed the tab mid-level)
    const r = Save.data.resume;
    if (r && r.level === n) {
      const cp = this.checkpoints[r.checkpoint - 1];
      if (cp) {
        for (const c of this.checkpoints) if (c.n <= r.checkpoint) c.lit = true;
        this.checkpoint = { x: cp.x - 10, y: cp.y - 30 };
        this.player.x = this.checkpoint.x; this.player.y = this.checkpoint.y;
      }
      this.stats.time = r.time || 0; this.stats.deaths = r.deaths || 0; this.stats.shards = r.shards || 0;
      this.taken = Array.isArray(r.taken) ? r.taken.slice() : [];
      const t = new Set(this.taken);
      this.pickups = this.pickups.filter((s) => !t.has(s.id));
      this.titleT = 0;
      this.toast(cp ? `Welcome back! Continuing from checkpoint ${r.checkpoint}` : 'Welcome back!', 2.6);
    }
    this.updateCamera(1, true);
    this.state = 'playing';
    this.acc = 0;
    Sfx.stopMusic();
    if (document.activeElement) document.activeElement.blur();
  },

  pause() { if (this.state !== 'playing') return; this.state = 'paused'; UI.show('pause'); },
  resume() { this.state = 'playing'; UI.show(null); this.last = performance.now(); if (document.activeElement) document.activeElement.blur(); },
  // Save mid-level progress so closing the tab never loses it.
  saveResume() {
    if (!this.world || this.completed) return;
    const lit = this.checkpoints.filter((c) => c.lit).length;
    Save.setResume({ level: this.levelNum, checkpoint: lit, time: this.stats.time, deaths: this.stats.deaths, shards: this.stats.shards, taken: this.taken });
  },
  exitToLevels() { this.saveResume(); this.state = 'menu'; this.world = null; Sfx.stopMusic(); Save.write(); Art.applyTheme(themeForLevel(1)); this.menuDummy = this.makeDummy(Save.data.equipped); UI.openLevels(); },
  quitToMenu() { this.saveResume(); this.state = 'menu'; this.world = null; Art.applyTheme(themeForLevel(1)); Sfx.stopMusic(); Save.write(); this.menuDummy = this.makeDummy(Save.data.equipped); UI.refreshMenu(); UI.show('menu'); },

  /* ---------------- main loop ---------------- */
  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    if (this.state === 'playing') {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 6) { this.step(STEP); Input.endStep(); this.acc -= STEP; n++; }
      if (n >= 6) this.acc = 0;
    } else {
      Input.endStep();
      this.acc = 0;
    }
    this.render(dt);
    requestAnimationFrame((n) => this.loop(n));
  },

  step(dt) {
    this.time += dt;
    this.titleT -= dt; this.flashRed -= dt;
    this.shake = Math.max(0, this.shake - dt * 40);
    this.toasts.forEach((m) => (m.t -= dt));
    this.toasts = this.toasts.filter((m) => m.t > 0);
    if (this.freeze > 0) { this.freeze -= dt; return; }
    this.updateParticles(dt);

    for (const pl of this.platforms) pl.update(dt, this);

    const p = this.player;
    if (p.dead) {
      this.deathT -= dt;
      if (this.deathT <= 0) this.respawn();
      return;
    }
    if (!this.completed) this.stats.time += dt;

    // ride moving platforms
    const plat = p.platform;
    if (plat) {
      if (!plat.active || plat.state === 'falling') p.platform = null;
      else {
        const svx = p.vx, svy = p.vy;
        p.vx = plat.dx / dt; p.vy = 0;
        moveEntity(this.world, p, dt);
        p.vx = svx; p.vy = svy;
        p.y = plat.y - p.h; p.onGround = true;
      }
    }

    p.update(dt, this);
    if (p.dead) return;
    this.footsteps(p, dt);
    const pbox = { x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 };

    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - p.x) > 1200) continue;
      e.update(dt, this);
      if (!e.dead && rectsOverlap(pbox, e)) p.hurt(this, e.contact, e.x + e.w / 2);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    for (const pad of this.pads) pad.update(dt, this);
    for (const f of this.firebars) f.update(dt, this);

    if (this.boss) {
      this.boss.update(dt, this);
      const b = this.boss;
      if (!b.dead && !b.dying && b.state !== 'intro' && rectsOverlap(pbox, b.hitbox())) p.hurt(this, 1, b.x + b.w / 2);
      if (b.dead) this.boss = null;
    }

    for (const pr of this.projectiles) {
      pr.update(dt, this);
      if (pr.dead) continue;
      if (pr.hostile) {
        if (rectsOverlap(pbox, pr) && p.hurt(this, 1, pr.x + pr.w / 2) && pr.type !== 'wave') pr.dead = true;
      } else {
        for (const e of this.enemies) {
          if (!e.dead && !pr.hitSet.has(e) && rectsOverlap(pr, e)) { pr.hitSet.add(e); e.hurt(pr.dmg * p.st.dmg, Math.sign(pr.vx), this); }
        }
        if (this.boss && !pr.hitSet.has(this.boss) && rectsOverlap(pr, this.boss.hitbox())) {
          pr.hitSet.add(this.boss); this.boss.hurt(pr.dmg * p.st.dmg, this); this.freeze = 0.04;
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);

    for (const c of this.pickups) c.update(dt, this);
    this.pickups = this.pickups.filter((c) => !c.dead);
    for (const q of this.popups) { q.t -= dt; q.y -= 30 * dt; }
    this.popups = this.popups.filter((q) => q.t > 0);

    // checkpoints: touch the pad to save your spot (health does NOT refill)
    for (const c of this.checkpoints) {
      if (!c.lit && Math.abs(p.x + p.w / 2 - c.x) < 26 && Math.abs(p.y + p.h - c.y) < 40) {
        for (const o of this.checkpoints) if (o.n < c.n) o.lit = true;
        c.lit = true;
        this.checkpoint = { x: c.x - 10, y: c.y - 30 };
        Sfx.play('checkpoint');
        this.burst(c.x, c.y - 30, 26, '#7dffb0', 220);
        this.toast(`Checkpoint ${c.n} / ${this.checkpoints.length}!`, 2);
        this.saveResume();
      }
    }

    // finish portal
    if (!this.completed && Math.abs(p.x + p.w / 2 - this.finish.x) < 26 && p.y + p.h > this.finish.y - 100 && p.y < this.finish.y) this.levelComplete();
    if (this.finishT > 0) {
      this.finishT -= dt;
      if (this.finishT <= 0) this.showVictory();
    }

    this.updateCamera(dt);
  },

  footsteps(p, dt) {
    if (p.onGround && Math.abs(p.vx) > 60 && p.dashT <= 0) {
      this.stepT = (this.stepT || 0) - dt;
      if (this.stepT <= 0) { Sfx.play('step'); this.stepT = 0.26; if (Math.random() < 0.5) this.dust(p.x + p.w / 2, p.y + p.h, 1); }
    } else this.stepT = 0.05;
  },

  landOnPlatforms(p) {
    if (p.vy < 0 || p.dropT > 0) return;
    for (const pl of this.platforms) {
      if (pl.state === 'gone' || pl.state === 'falling') continue;
      if (p.x + p.w <= pl.x + 2 || p.x >= pl.x + pl.w - 2) continue;
      const prevTop = pl.y - pl.dy;
      if (p.prevBottom <= Math.max(pl.y, prevTop) + 3 && p.y + p.h >= pl.y) {
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.platform = pl;
        pl.stoodOn();
        return;
      }
    }
  },

  updateParticles(dt) {
    for (const q of this.particles) {
      q.life -= dt; q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.98;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    if (this.particles.length > 700) this.particles.splice(0, this.particles.length - 700);
    for (const a of this.afterimages) a.life -= dt;
    this.afterimages = this.afterimages.filter((a) => a.life > 0);
  },

  updateCamera(dt, snap = false) {
    const p = this.player;
    let tx = p.x + p.w / 2 - VIEW_W / 2 + p.facing * 60;
    let ty = p.y + p.h / 2 - VIEW_H / 2 - 30;
    if (this.bossLock && this.def.arena) { tx = this.def.arena.camX; ty = this.def.arena.camY; }
    const maxX = this.world.w * TILE - VIEW_W, maxY = this.world.h * TILE - VIEW_H;
    tx = clamp(tx, 0, maxX); ty = clamp(ty, 0, maxY);
    if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 5);
  },

  /* ---------------- combat ---------------- */
  resolvePlayerAttack(p) {
    const box = p.attackBox();
    const dmg = 2 * p.st.dmg;
    let hit = false;
    for (const e of this.enemies) {
      if (e.dead || p.hitSet.has(e) || !rectsOverlap(box, e)) continue;
      p.hitSet.add(e);
      e.hurt(dmg, p.attackDir === 'side' ? p.facing : 0, this);
      hit = true;
    }
    const b = this.boss;
    if (b && !b.dying && !p.hitSet.has(b) && rectsOverlap(box, b.hitbox())) {
      p.hitSet.add(b);
      if (b.hurt(dmg, this)) hit = true;
    }
    for (const pr of this.projectiles) {
      if (pr.hostile && pr.breakable && !pr.dead && rectsOverlap(box, pr)) {
        pr.dead = true; hit = true;
        this.burst(pr.x + pr.w / 2, pr.y + pr.h / 2, 8, '#f2e2b0', 200);
      }
    }
    if (hit) {
      this.freeze = Math.max(this.freeze, 0.045);
      this.shake = Math.max(this.shake, 4);
      Sfx.play('hit');
      if (p.attackDir === 'down') this.pogo(p);
      else if (p.attackDir === 'side') { p.vx = -p.facing * 200; p.ctrlLock = 0.08; }
    }
    if (p.attackDir === 'down' && !p.pogoDone && this.world.hazardBoxes(box).some((s) => rectsOverlap(box, s))) {
      this.pogo(p);
      this.burst(p.x + p.w / 2, p.y + p.h + 20, 8, '#ffffff', 180);
    }
  },

  pogo(p) {
    if (p.pogoDone) return;
    p.pogoDone = true;
    p.vy = -PHYS.POGO * p.st.pogo; p.canDash = true; p.jumping = false; p.airJumps = 1;
    Sfx.play('pogo');
  },

  killEnemy(e) {
    e.dead = true;
    Sfx.play('kill');
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 18, '#a99cc8', 260);
    for (let i = 0; i < (e.shards || 3); i++) this.pickups.push(new Shard(e.x + e.w / 2, e.y, { drop: true }));
  },

  // Shards are collected in levels (and dropped by monsters). They buy heads in the shop.
  collectShard(s) {
    Save.data.shards += s.value;
    this.stats.shards += s.value;
    if (s.id !== undefined) this.taken.push(s.id);
    if (s.big) { Sfx.play('bigshard'); this.popups.push({ x: s.x + s.w / 2, y: s.y - 6, t: 1, text: '+5 shards' }); this.burst(s.x + s.w / 2, s.y + s.h / 2, 14, '#c070ff', 200); }
    else if (this.time - this.lastShardSfx > 0.05) { Sfx.play('shard'); this.lastShardSfx = this.time; }
    this.saveResume();
  },

  // Obby death: quick flash, then back to the last checkpoint. Health is infinite; only deaths are counted.
  playerDied() {
    const p = this.player;
    if (p.dead || this.completed) return;
    p.dead = true;
    this.stats.deaths++;
    this.deathT = 0.75;
    this.saveResume();
    Sfx.play('die');
    this.shake = 8; this.flashRed = 0.3;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 30, headById(p.head).accent, 320);
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 14, '#1a1428', 200);
  },

  respawn() {
    this.player = new Player(this.checkpoint.x, this.checkpoint.y, Save.data.equipped);
    this.player.invuln = 1;
    this.projectiles = [];
    for (const pl of this.platforms) if (pl.kind === 'crumble') { pl.state = 'solid'; pl.y = pl.y0; pl.shakeX = 0; }
    if (this.boss && !this.boss.dead) { this.boss = null; this.bossLock = false; this.world.gateClosed = false; Sfx.stopMusic(); }
    this.updateCamera(1, true);
  },

  levelComplete() {
    this.completed = true;
    const p = this.player;
    p.invuln = 99;
    Sfx.play('victory');
    this.burst(this.finish.x, this.finish.y - 60, 60, '#c070ff', 420);
    this.burst(this.finish.x, this.finish.y - 60, 30, '#ffd84d', 320);
    this.toast('LEVEL COMPLETE!', 3);
    // new attacks unlock every 20 levels (Level 20, 40, ...)
    const atk = ATTACKS.find((a) => a.level === this.def.number && !Save.data.unlocks[a.id]);
    this.newUnlock = atk || null;
    if (atk) Save.data.unlocks[atk.id] = true;
    Save.data.levels[this.key] = true;
    const best = Save.data.best[this.key];
    this.newRecord = !best || this.stats.time < best;
    this.prevBest = best;
    if (this.newRecord) Save.data.best[this.key] = this.stats.time;
    Save.data.shardBest = Save.data.shardBest || {};
    Save.data.shardBest[this.key] = Math.max(Save.data.shardBest[this.key] || 0, this.stats.shards);
    Save.data.resume = null;
    Save.write();
    this.finishT = 1.8;
  },

  showVictory() {
    this.state = 'victory';
    UI.showVictory(this.stats, this.newUnlock, Save.data.best[this.key], this.newRecord);
  },

  // ---- boss support (bosses appear every 10–20 levels; Level 1 has none) ----
  startBoss(boss) {
    this.boss = boss;
    this.bossLock = true;
    this.world.gateClosed = true;
    Sfx.play('gate');
    Sfx.startMusic('boss');
  },
  spawnShockwaves(b) {
    const y = b.y + b.h - 26, cx = b.x + b.w / 2, sp = b.phase === 2 ? 420 : 340;
    this.projectiles.push(new Projectile('wave', cx - 53, y, -sp, 0));
    this.projectiles.push(new Projectile('wave', cx + 27, y, sp, 0));
  },
  spawnDebris(n) {
    const A = this.def.arena;
    for (let i = 0; i < n; i++) {
      const d = new Projectile('debris', rand(A.x1 + 20, A.x2 - 40), A.ceilY + 2, 0, 0);
      d.warn = 0.6 + i * 0.12;
      this.projectiles.push(d);
    }
  },
  onBossDefeated(b) {
    this.bossLock = false; this.world.gateClosed = false; this.projectiles = [];
    Sfx.stopMusic(); Sfx.play('victory');
    for (let i = 0; i < 12; i++) this.pickups.push(new Shard(b.x + b.w / 2, b.y + 30, { drop: true, big: i < 4 }));
  },

  burst(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
      this.particles.push(makeParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - speed * 0.2, rand(0.3, 0.8), color, rand(2, 4.5)));
    }
  },
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.particles.push(makeParticle(x + rand(-8, 8), y - 2, rand(-90, 90), rand(-80, -10), rand(0.25, 0.5), '#6a5a7a', rand(2, 4), 200));
  },
  toast(text, dur = 2.5) {
    if (this.toasts.some((m) => m.text === text)) return;
    this.toasts.push({ text, t: dur, max: dur });
  },

  /* ---------------- rendering ---------------- */
  render(dt) {
    const ctx = this.ctx;
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (!this.world) { this.renderMenuScene(ctx, dt); return; }

    const sx = this.shake > 0 ? rand(-this.shake, this.shake) * 0.6 : 0;
    const sy = this.shake > 0 ? rand(-this.shake, this.shake) * 0.6 : 0;
    const cam = { x: this.cam.x + sx, y: this.cam.y + sy };
    const t = this.t;
    const p = this.player;

    drawBackground(ctx, cam.x, cam.y, t);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    const onScreen = (x, pad = 200) => x > cam.x - pad && x < cam.x + VIEW_W + pad;
    for (const d of this.def.decor) if (onScreen(d.x * TILE)) drawDecor(ctx, d, t);
    for (const s of this.def.signs) if (onScreen(s.x * TILE)) drawSignPost(ctx, s);
    for (const c of this.checkpoints) if (onScreen(c.x)) drawCheckpoint(ctx, c, t);
    if (onScreen(this.finish.x)) drawPortal(ctx, this.finish, t);
    this.world.draw(ctx, cam, t, this.k);
    for (const pl of this.platforms) if (onScreen(pl.x)) pl.draw(ctx, t);
    for (const pad of this.pads) if (onScreen(pad.x)) pad.draw(ctx, t);
    for (const c of this.pickups) if (onScreen(c.x, 40)) c.draw(ctx, t);
    for (const e of this.enemies) if (onScreen(e.x)) e.draw(ctx, t);
    if (this.boss) this.boss.draw(ctx, t);
    for (const a of this.afterimages) {
      ctx.save(); ctx.globalAlpha = a.life * 1.4;
      ctx.translate(a.x + 10, a.y + 30); ctx.scale(a.facing, 1);
      ctx.fillStyle = headById(a.head).accent;
      Draw.ell(ctx, 0, -31, 11, 11); Draw.ell(ctx, 0, -14, 8, 10);
      ctx.restore();
    }
    drawPlayer(ctx, p, t);
    for (const f of this.firebars) if (onScreen(f.cx)) f.draw(ctx, t);
    for (const pr of this.projectiles) pr.draw(ctx, t);
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    drawLighting(ctx, this.collectLights(cam), cam, THEME.ambient);

    // sign bubbles stay readable above the darkness
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    for (const s of this.def.signs) {
      const sx2 = s.x * TILE + 16, sy2 = (s.y + 1) * TILE;
      if (Math.abs(p.x + p.w / 2 - sx2) < 70 && Math.abs(p.y + p.h - sy2) < 90) drawBubble(ctx, sx2, sy2 - 56, s.text, cam.x, cam.x + VIEW_W);
    }
    ctx.font = '900 13px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const q of this.popups) {
      ctx.globalAlpha = Math.min(1, q.t * 2);
      setGlow(ctx, '#5ae0ff', 8); ctx.fillStyle = '#d8fbff'; ctx.fillText(q.text, q.x, q.y); clearGlow(ctx);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    drawLeaves(ctx, dt, t);
    drawVignette(ctx);
    if (this.flashRed > 0) { ctx.fillStyle = `rgba(160,0,30,${this.flashRed * 0.6})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }

    this.drawHUD(ctx);
    this.drawOverlays(ctx);
  },

  collectLights(cam) {
    const L = [];
    const p = this.player;
    const inView = (x, y, r) => x > cam.x - r && x < cam.x + VIEW_W + r && y > cam.y - r && y < cam.y + VIEW_H + r;
    if (!p.dead) L.push({ x: p.x + p.w / 2, y: p.y + 4, r: 240, i: 0.95, c: p.head === 'wick' ? 'rgba(255,170,60,0.22)' : 'rgba(255,220,180,0.06)' });
    L.push({ x: cam.x + THEME.moonX - (cam.x * 0.02) % 300, y: cam.y + THEME.moonY, r: 380, i: 0.5 });
    for (const c of this.checkpoints) if (inView(c.x, c.y, 200)) L.push({ x: c.x, y: c.y - 40, r: c.lit ? 200 : 90, i: c.lit ? 0.9 : 0.4, c: c.lit ? 'rgba(80,255,150,0.18)' : null });
    if (inView(this.finish.x, this.finish.y, 300)) L.push({ x: this.finish.x, y: this.finish.y - 60, r: 320, i: 1, c: 'rgba(190,90,255,0.35)' });
    for (const d of this.def.decor) if (d.type === 'shroom') { const x = d.x * TILE + 16, y = (d.y + 1) * TILE - 8; if (inView(x, y, 120)) L.push({ x, y, r: 110, i: 0.7, c: 'rgba(80,255,200,0.16)' }); }
    for (const f of this.firebars) if (inView(f.cx, f.cy, 200)) L.push({ x: f.cx, y: f.cy, r: 190, i: 0.9, c: 'rgba(255,110,20,0.3)' });
    for (const pad of this.pads) if (inView(pad.x, pad.y, 120)) L.push({ x: pad.x + 14, y: pad.y - 10, r: 100, i: 0.7, c: 'rgba(255,150,40,0.2)' });
    for (const lt of this.world.lavaTiles) {
      if (lt.tx % 2) continue;
      const x = lt.tx * TILE + 16, y = lt.ty * TILE;
      if (inView(x, y, 160)) L.push({ x, y, r: 150, i: 0.8, c: 'rgba(255,90,10,0.18)' });
    }
    for (const c of this.pickups) if (inView(c.x, c.y, 60)) L.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, r: c.big ? 90 : 46, i: 0.6, c: c.big ? 'rgba(190,100,255,0.25)' : null });
    for (const pr of this.projectiles) if (pr.type === 'wisp' || pr.type === 'wave') L.push({ x: pr.x + pr.w / 2, y: pr.y + pr.h / 2, r: 130, i: 0.9, c: pr.type === 'wisp' ? 'rgba(80,230,255,0.3)' : 'rgba(255,110,20,0.3)' });
    if (this.boss) L.push({ x: this.boss.x + this.boss.w / 2, y: this.boss.y + 40, r: 260, i: 0.8, c: 'rgba(255,120,20,0.2)' });
    return L;
  },

  drawHUD(ctx) {
    const p = this.player;
    // shards (top-left): total you own, and how many you've grabbed in this level
    ctx.fillStyle = 'rgba(8,5,16,0.55)'; Draw.rr(ctx, 14, 14, 110, 34, 10); ctx.fill();
    drawShardIcon(ctx, 31, 31, this.t);
    ctx.font = '900 18px Nunito, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#bff6ff'; ctx.fillText(Save.data.shards, 46, 32);
    if (Save.data.unlocks.wisp) {
      const ready = p.boltCd <= 0;
      ctx.font = '700 12px Nunito, sans-serif'; ctx.fillStyle = ready ? '#9ff4ff' : '#5a7a80';
      ctx.fillText(ready ? 'Wisp Bolt ready [V]' : 'Wisp Bolt recharging...', 18, 62);
    }

    // level + checkpoint label (top-center)
    const lit = this.checkpoints.filter((c) => c.lit).length;
    ctx.font = '700 12px Nunito, sans-serif'; ctx.textAlign = 'center';
    const label = `Level ${this.def.number}   ·   Checkpoint ${lit} / ${this.checkpoints.length}   ·   Shards ${this.stats.shards} / ${this.shardTotal}`;
    const lw = ctx.measureText(label).width + 24;
    ctx.fillStyle = 'rgba(8,5,16,0.55)'; Draw.rr(ctx, VIEW_W / 2 - lw / 2, 14, lw, 26, 9); ctx.fill();
    ctx.fillStyle = '#d8ccf0'; ctx.fillText(label, VIEW_W / 2, 28);

    // deaths, time and best time (top-right)
    const best = Save.data.best[this.key];
    const rw = 132, rx = VIEW_W - rw - 14;
    ctx.fillStyle = 'rgba(8,5,16,0.55)'; Draw.rr(ctx, rx, 14, rw, 62, 10); ctx.fill();
    ctx.save(); ctx.translate(rx + 16, 30); ctx.scale(0.55, 0.55); drawHead(ctx, 'bonesy', this.t, { glow: false }); ctx.restore();
    ctx.textAlign = 'left'; ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = '#f0e8ff';
    ctx.fillText(`${this.stats.deaths}`, rx + 30, 31);
    ctx.font = '700 10px Nunito, sans-serif'; ctx.fillStyle = '#a99cc8';
    ctx.fillText(this.stats.deaths === 1 ? 'death' : 'deaths', rx + 32 + ctx.measureText(String(this.stats.deaths)).width * 1.4, 32);
    ctx.textAlign = 'right'; ctx.font = '900 14px Nunito, sans-serif'; ctx.fillStyle = '#fff2dc';
    ctx.fillText(fmtTime(this.stats.time, true), rx + rw - 10, 31);
    ctx.font = '700 11px Nunito, sans-serif'; ctx.fillStyle = '#e8a0a0'; ctx.textAlign = 'left';
    ctx.fillText('Best', rx + 10, 58);
    ctx.textAlign = 'right'; ctx.fillStyle = best ? '#e8e0cc' : '#6a6080';
    ctx.fillText(best ? fmtTime(best, true) : '--:--.-', rx + rw - 10, 58);
  },

  drawOverlays(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.titleT > 0) {
      const a = Math.min(1, this.titleT, (3.2 - this.titleT) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#e8e0cc'; ctx.font = '64px Creepster, Nunito, cursive';
      setGlow(ctx, '#c8102e', 18);
      ctx.fillText(`LEVEL ${this.def.number}`, VIEW_W / 2, 170);
      clearGlow(ctx);
      ctx.fillStyle = '#c9b8f0'; ctx.font = '700 15px Nunito, sans-serif';
      ctx.fillText('Reach the portal!', VIEW_W / 2, 215);
      clearGlow(ctx);
      ctx.globalAlpha = 1;
    }
    this.toasts.forEach((m, i) => {
      const a = Math.min(1, m.t * 3, (m.max - m.t) * 6);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '700 16px Nunito, sans-serif';
      const w = ctx.measureText(m.text).width + 30;
      ctx.fillStyle = 'rgba(10,6,20,0.85)'; Draw.rr(ctx, VIEW_W / 2 - w / 2, 236 + i * 38, w, 30, 10); ctx.fill();
      ctx.fillStyle = '#fff2dc'; ctx.fillText(m.text, VIEW_W / 2, 251 + i * 38);
      ctx.globalAlpha = 1;
    });
    if (this.player.dead) {
      const a = Math.max(0, Math.min(1, (0.75 - this.deathT) * 2.5));
      ctx.fillStyle = `rgba(5,2,10,${a * 0.6})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  },

  renderMenuScene(ctx, dt) {
    const t = this.t;
    const camX = t * 25;
    drawBackground(ctx, camX, 300, t);
    // ground strip
    const gg = ctx.createLinearGradient(0, 470, 0, 540);
    gg.addColorStop(0, '#2a2240'); gg.addColorStop(0.2, '#141020'); gg.addColorStop(1, '#07050c');
    ctx.fillStyle = gg; ctx.fillRect(0, 470, VIEW_W, 70);
    ctx.fillStyle = '#3e6448'; ctx.fillRect(0, 468, VIEW_W, 4);
    for (let i = 0; i < 6; i++) {
      const gx = ((i * 230 - camX) % 1380 + 1380) % 1380 - 200;
      drawDecor(ctx, { type: i % 3 === 0 ? 'tree' : i % 2 ? 'grave' : 'shroom', px: gx, py: 470, x: i }, t);
    }
    const d = this.menuDummy;
    d.anim = t;
    ctx.save();
    ctx.translate(700, 470);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; Draw.ell(ctx, 0, 0, 60, 10);
    ctx.scale(4.2, 4.2);
    d.x = -d.w / 2; d.y = -d.h;
    drawPlayer(ctx, d, t);
    ctx.restore();
    drawLighting(ctx, [
      { x: 700, y: 360, r: 340, i: 0.95, c: 'rgba(255,200,140,0.10)' },
      { x: 740, y: 120, r: 380, i: 0.5 },
    ], { x: 0, y: 0 }, 0.45);
    drawLeaves(ctx, dt, t);
    const sh = ctx.createLinearGradient(0, 0, 560, 0);
    sh.addColorStop(0, 'rgba(5,2,12,0.55)'); sh.addColorStop(1, 'rgba(5,2,12,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, 560, VIEW_H);
  },
};
