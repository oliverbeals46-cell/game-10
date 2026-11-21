// Main game: state, loop, camera, collisions, rendering and HUD.
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
    this.stars = Array.from({ length: 140 }, () => ({ x: Math.random() * 2400, y: Math.random() * 380, r: Math.random() * 1.4 + 0.3, p: Math.random() * 6 }));
    this.fireflies = Array.from({ length: 26 }, () => ({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, p: Math.random() * 6, s: rand(10, 30) }));
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
      invuln: 0, hazardT: 0, landT: 0, dashT: 0, attackT: 0, healT: 0, dead: false };
  },

  /* ---------------- level lifecycle ---------------- */
  startLevel() {
    const def = buildLevel1();
    this.def = def;
    this.world = new World(def);
    const s = def.spawn;
    this.checkpoint = { x: s.x * TILE + 6, y: (s.y + 1) * TILE - 30 };
    this.player = new Player(this.checkpoint.x, this.checkpoint.y, Save.data.equipped);
    this.enemies = def.enemies.map((e) => (e.type === 'bat' ? new Bat(e.x * TILE, e.y * TILE) : new Crawler(e.x * TILE + 1, (e.y + 1) * TILE)));
    this.pickups = def.candy.map(([x, y]) => new Candy(x * TILE + 10, y * TILE + 10));
    this.benches = def.benches.map((b) => ({ x: b.x * TILE + 16, y: (b.y + 1) * TILE, lit: false }));
    this.projectiles = []; this.particles = []; this.afterimages = []; this.toasts = [];
    this.boss = null; this.bossStarted = false; this.bossDefeated = false; this.bossLock = false;
    this.bossTitleT = 0; this.victoryT = 0; this.deathT = 0; this.titleT = 3.2;
    this.stats = { candy: 0, deaths: 0, time: 0 };
    this.shake = 0; this.freeze = 0; this.flashRed = 0; this.time = 0; this.lastCandySfx = 0;
    this.newUnlock = false;
    this.cam = { x: 0, y: 0 };
    this.updateCamera(1, true);
    this.state = 'playing';
    this.acc = 0;
    if (document.activeElement) document.activeElement.blur();
  },

  pause() { if (this.state !== 'playing') return; this.state = 'paused'; UI.show('pause'); },
  resume() { this.state = 'playing'; UI.show(null); this.last = performance.now(); if (document.activeElement) document.activeElement.blur(); },
  quitToMenu() { this.state = 'menu'; this.world = null; Save.write(); this.menuDummy = this.makeDummy(Save.data.equipped); UI.refreshMenu(); UI.show('menu'); },

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
    this.render();
    requestAnimationFrame((n) => this.loop(n));
  },

  step(dt) {
    this.time += dt;
    this.titleT -= dt; this.bossTitleT -= dt; this.flashRed -= dt;
    this.shake = Math.max(0, this.shake - dt * 40);
    this.toasts.forEach((m) => (m.t -= dt));
    this.toasts = this.toasts.filter((m) => m.t > 0);
    if (this.freeze > 0) { this.freeze -= dt; return; }
    this.updateParticles(dt);

    const p = this.player;
    if (p.dead) {
      this.deathT -= dt;
      if (this.deathT <= 0) this.respawn();
      return;
    }
    if (!this.bossDefeated) this.stats.time += dt;

    p.update(dt, this);
    if (p.dead) return;
    const pbox = { x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 };

    // enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - p.x) > 1200) continue; // sleep far away
      e.update(dt, this);
      if (!e.dead && rectsOverlap(pbox, e)) p.hurt(this, e.contact, e.x + e.w / 2);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // boss
    const A = this.def.arena;
    if (!this.bossStarted && !this.bossDefeated && p.x > A.triggerX) this.startBoss();
    if (this.boss) {
      this.boss.update(dt, this);
      const b = this.boss;
      if (!b.dead && !b.dying && b.state !== 'intro' && rectsOverlap(pbox, b.hitbox())) p.hurt(this, 1, b.x + b.w / 2);
      if (b.dead) this.boss = null;
    }

    // projectiles
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

    // candy
    for (const c of this.pickups) c.update(dt, this);
    this.pickups = this.pickups.filter((c) => !c.dead);

    // lantern checkpoints
    for (const b of this.benches) {
      if (!b.lit && Math.abs(p.x + p.w / 2 - b.x) < 40 && Math.abs(p.y + p.h - b.y) < 50) {
        b.lit = true;
        this.checkpoint = { x: b.x - 10, y: b.y - 30 };
        p.hp = p.maxHp;
        Sfx.play('bench');
        this.burst(b.x, b.y - 40, 24, '#ffcf6a', 200);
        this.toast('Lantern lit! Checkpoint saved & health restored.', 2.5);
        Save.write();
      }
    }

    // victory countdown
    if (this.victoryT > 0) {
      this.victoryT -= dt;
      if (this.victoryT <= 0) this.showVictory();
    }

    this.updateCamera(dt);
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
    let tx, ty;
    if (this.bossLock) { tx = this.def.arena.camX; ty = this.def.arena.camY; }
    else {
      tx = p.x + p.w / 2 - VIEW_W / 2 + p.facing * 60;
      ty = p.y + p.h / 2 - VIEW_H / 2 - 40;
    }
    const maxX = this.world.w * TILE - VIEW_W, maxY = this.world.h * TILE - VIEW_H;
    tx = clamp(tx, 0, maxX); ty = clamp(ty, 0, maxY);
    if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 5);
  },

  /* ---------------- combat helpers ---------------- */
  resolvePlayerAttack(p) {
    const box = p.attackBox();
    const dmg = 2 * p.st.dmg;
    let hit = false, hitX = 0;
    for (const e of this.enemies) {
      if (e.dead || p.hitSet.has(e) || !rectsOverlap(box, e)) continue;
      p.hitSet.add(e);
      e.hurt(dmg, p.attackDir === 'side' ? p.facing : 0, this);
      hit = true; hitX = e.x + e.w / 2;
    }
    const b = this.boss;
    if (b && !b.dying && !p.hitSet.has(b) && rectsOverlap(box, b.hitbox())) {
      p.hitSet.add(b);
      if (b.hurt(dmg, this)) { hit = true; hitX = b.x + b.w / 2; }
    }
    for (const pr of this.projectiles) {
      if (pr.hostile && pr.breakable && !pr.dead && rectsOverlap(box, pr)) {
        pr.dead = true; hit = true;
        this.burst(pr.x + pr.w / 2, pr.y + pr.h / 2, 8, '#f2e2b0', 200);
      }
    }
    if (hit) {
      p.soul = Math.min(99, p.soul + 11 * p.st.soul);
      this.freeze = Math.max(this.freeze, 0.045);
      this.shake = Math.max(this.shake, 4);
      Sfx.play('hit');
      if (p.attackDir === 'down') this.pogo(p);
      else if (p.attackDir === 'side') { p.vx = -p.facing * 200; p.ctrlLock = 0.08; }
    }
    if (p.attackDir === 'down' && !p.pogoDone && this.world.spikeBoxes(box).some((s) => rectsOverlap(box, s))) {
      this.pogo(p);
      this.burst(p.x + p.w / 2, p.y + p.h + 20, 8, '#ffffff', 180);
    }
  },

  pogo(p) {
    if (p.pogoDone) return;
    p.pogoDone = true;
    p.vy = -PHYS.POGO; p.canDash = true; p.jumping = false;
    Sfx.play('pogo');
  },

  killEnemy(e) {
    e.dead = true;
    Sfx.play('kill');
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 18, '#a99cc8', 260);
    for (let i = 0; i < e.candy; i++) this.pickups.push(new Candy(e.x + e.w / 2 - 6, e.y, true));
  },

  collectCandy() {
    Save.data.candy++;
    this.stats.candy++;
    if (this.time - this.lastCandySfx > 0.05) { Sfx.play('candy'); this.lastCandySfx = this.time; }
    Save.write();
  },

  playerHazard() {
    const p = this.player;
    if (p.hazardT > 0 || p.dead) return;
    p.hp -= 1;
    p.healT = 0; p.dashT = 0; p.vx = 0; p.vy = 0; p.attackT = 0;
    Sfx.play('hurt');
    this.shake = 10; this.flashRed = 0.35; this.freeze = 0.1;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 16, '#1a1428', 240);
    if (p.hp <= 0) this.playerDied();
    else p.hazardT = 0.45;
  },

  playerDied() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    this.stats.deaths++;
    this.deathT = 2.4;
    Sfx.play('die');
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 40, headById(p.head).accent, 360);
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 20, '#1a1428', 200);
    Save.write();
  },

  respawn() {
    this.player = new Player(this.checkpoint.x, this.checkpoint.y, Save.data.equipped);
    this.projectiles = [];
    if (!this.bossDefeated) {
      this.boss = null; this.bossStarted = false; this.bossLock = false;
      this.world.gateClosed = false;
    }
    this.updateCamera(1, true);
  },

  startBoss() {
    const A = this.def.arena;
    this.bossStarted = true;
    this.bossLock = true;
    this.world.gateClosed = true;
    Sfx.play('gate');
    this.shake = 10;
    this.boss = new GourdKing(A.bossSpawn.x, A.bossSpawn.y, A);
    this.bossTitleT = 3.6;
  },

  spawnShockwaves(b) {
    const y = b.y + b.h - 26;
    const cx = b.x + b.w / 2;
    const sp = b.phase === 2 ? 420 : 340;
    this.projectiles.push(new Projectile('wave', cx - 13 - 40, y, -sp, 0));
    this.projectiles.push(new Projectile('wave', cx - 13 + 40, y, sp, 0));
  },

  spawnDebris(n) {
    const A = this.def.arena;
    for (let i = 0; i < n; i++) {
      const x = rand(A.x1 + 20, A.x2 - 40);
      const d = new Projectile('debris', x, A.ceilY + 2, 0, 0);
      d.warn = 0.6 + i * 0.12;
      this.projectiles.push(d);
    }
  },

  onBossDefeated(b) {
    this.bossDefeated = true;
    this.bossLock = false;
    this.world.gateClosed = false;
    this.projectiles = [];
    for (let i = 0; i < 90; i++) { const c = new Candy(b.x + b.w / 2 - 6, b.y + 30, true); c.boss = true; this.pickups.push(c); }
    Sfx.play('victory');
    this.toast('THE GOURD KING HAS FALLEN', 3);
    this.newUnlock = !Save.data.unlocks.wisp;
    Save.data.unlocks.wisp = true;
    Save.data.levels.l1 = true;
    const best = Save.data.best.l1;
    if (!best || this.stats.time < best) Save.data.best.l1 = this.stats.time;
    Save.write();
    this.victoryT = 4;
  },

  showVictory() {
    // scoop up any candy still bouncing around the arena
    const left = this.pickups.filter((c) => c.boss).length;
    for (const c of this.pickups) if (c.boss) { c.dead = true; this.collectCandy(); }
    this.pickups = this.pickups.filter((c) => !c.dead);
    if (left) Sfx.play('candy');
    this.state = 'victory';
    UI.showVictory(this.stats, this.newUnlock);
  },

  burst(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
      this.particles.push(makeParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - speed * 0.2, rand(0.3, 0.8), color, rand(2, 4.5)));
    }
  },
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.particles.push(makeParticle(x + rand(-8, 8), y - 2, rand(-90, 90), rand(-80, -10), rand(0.25, 0.5), '#5c4d7d', rand(2, 4), 200));
  },
  toast(text, dur = 2.5) {
    if (this.toasts.some((m) => m.text === text)) return;
    this.toasts.push({ text, t: dur, max: dur });
  },

  /* ---------------- rendering ---------------- */
  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (!this.world) { this.renderMenuScene(ctx); return; }

    const sx = this.shake > 0 ? rand(-this.shake, this.shake) * 0.6 : 0;
    const sy = this.shake > 0 ? rand(-this.shake, this.shake) * 0.6 : 0;
    const cam = { x: this.cam.x + sx, y: this.cam.y + sy };
    const t = this.t;

    drawBackground(ctx, cam.x, cam.y, t, this.stars);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    this.drawArenaBackdrop(ctx);
    for (const d of this.def.decor) drawDecor(ctx, d, t);
    for (const b of this.benches) drawLantern(ctx, b, t);
    for (const s of this.def.signs) drawSignPost(ctx, s);
    this.world.draw(ctx, cam, t);
    for (const c of this.pickups) c.draw(ctx, t);
    for (const e of this.enemies) e.draw(ctx, t);
    if (this.boss) this.boss.draw(ctx, t);
    for (const a of this.afterimages) {
      ctx.save(); ctx.globalAlpha = a.life * 1.6;
      ctx.translate(a.x + 10, a.y + 4); ctx.scale(a.facing, 1);
      ctx.fillStyle = headById(a.head).accent;
      Draw.ell(ctx, 0, 0, 12, 12); Draw.ell(ctx, 0, 16, 9, 10);
      ctx.restore();
    }
    drawPlayer(ctx, this.player, t);
    for (const pr of this.projectiles) pr.draw(ctx, t);
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    // sign bubbles on top
    const p = this.player;
    for (const s of this.def.signs) {
      const sx2 = s.x * TILE + 16, sy2 = (s.y + 1) * TILE;
      if (Math.abs(p.x + p.w / 2 - sx2) < 70 && Math.abs(p.y + p.h - sy2) < 90) drawBubble(ctx, sx2, sy2 - 56, s.text);
    }
    ctx.restore();

    drawFireflies(ctx, this.fireflies, t);
    drawVignette(ctx, this.player, cam);
    if (this.flashRed > 0) { ctx.fillStyle = `rgba(160,0,30,${this.flashRed * 0.6})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }

    this.drawHUD(ctx);
    this.drawOverlays(ctx);
  },

  drawArenaBackdrop(ctx) {
    const A = this.def.arena;
    const x = (A.gateX + 1) * TILE, y = A.ceilY, w = A.x2 - x, h = A.floorY - y;
    if (this.cam.x + VIEW_W < x) return;
    ctx.fillStyle = '#0d0a18';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#130f22';
    for (let row = 0; row < h / 24; row++) {
      for (let col = 0; col < w / 48 + 1; col++) {
        const bx = x + col * 48 + (row % 2 ? 24 : 0), by = y + row * 24;
        if (bx + 44 > x + w) continue;
        ctx.fillRect(bx + 2, by + 2, 44, 20);
      }
    }
    // arches and banners
    for (let i = 0; i < 4; i++) {
      const ax = x + 90 + i * 220;
      ctx.fillStyle = '#07050d';
      ctx.beginPath(); ctx.moveTo(ax - 50, A.floorY); ctx.lineTo(ax - 50, y + 150); ctx.arc(ax, y + 150, 50, Math.PI, 0); ctx.lineTo(ax + 50, A.floorY); ctx.fill();
      ctx.fillStyle = '#4a1a12';
      ctx.fillRect(ax - 14, y + 10, 28, 80);
      ctx.fillStyle = '#ff8c26';
      Draw.poly(ctx, [ax - 6, y + 40, ax + 6, y + 40, ax, y + 30]);
      Draw.poly(ctx, [ax - 14, y + 90, ax, y + 76, ax + 14, y + 90]);
      ctx.fillStyle = '#0d0a18';
      Draw.poly(ctx, [ax - 14, y + 91, ax, y + 78, ax + 14, y + 91]);
    }
  },

  drawHUD(ctx) {
    const p = this.player;
    // soul orb
    const ox = 52, oy = 52, r = 30;
    ctx.save();
    ctx.fillStyle = '#0c0916'; Draw.circ(ctx, ox, oy, r + 4);
    ctx.save();
    ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#1c1630'; ctx.fillRect(ox - r, oy - r, r * 2, r * 2);
    const lvl = (p.soul / 99) * r * 2;
    const wave = Math.sin(this.t * 3) * 3;
    ctx.fillStyle = p.soul >= SOUL_COST ? '#e8f0ff' : '#9d95b8';
    ctx.beginPath(); ctx.moveTo(ox - r, oy + r); ctx.lineTo(ox - r, oy + r - lvl + wave); ctx.quadraticCurveTo(ox, oy + r - lvl - wave * 2, ox + r, oy + r - lvl - wave); ctx.lineTo(ox + r, oy + r); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#cfc6e8'; ctx.lineWidth = 3;
    if (p.soul >= SOUL_COST) setGlow(ctx, '#ffffff', 12);
    ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.stroke();
    clearGlow(ctx);
    // eye-holes on the orb, like a little mask
    ctx.fillStyle = '#0c0916';
    Draw.ell(ctx, ox - 9, oy - 4, 5, 7); Draw.ell(ctx, ox + 9, oy - 4, 5, 7);
    ctx.restore();

    // health masks = little copies of your head
    for (let i = 0; i < p.maxHp; i++) {
      const x = 104 + i * 30, y = 38;
      if (i < p.hp) {
        ctx.save(); ctx.translate(x, y); ctx.scale(0.85, 0.85);
        drawHead(ctx, p.head, this.t + i * 0.3, { glow: false });
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(40,32,64,0.9)'; Draw.circ(ctx, x, y, 10);
        ctx.strokeStyle = '#4a3e6e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // candy
    ctx.save(); ctx.translate(110, 72);
    ctx.fillStyle = '#ffffff'; Draw.poly(ctx, [-6, 6, 6, 6, 0, -8]);
    ctx.fillStyle = '#ff9f1a'; Draw.poly(ctx, [-4.6, 2, 4.6, 2, 3, -2, -3, -2]);
    ctx.fillStyle = '#ffe14d'; Draw.poly(ctx, [-6, 6, 6, 6, 4.6, 2, -4.6, 2]);
    ctx.restore();
    ctx.font = '900 18px Nunito, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd08a';
    ctx.fillText(Save.data.candy, 124, 73);
    if (Save.data.unlocks.wisp) {
      ctx.font = '700 12px Nunito, sans-serif'; ctx.fillStyle = '#9ff4ff';
      ctx.fillText('Wisp Bolt [L]', 104, 96);
    }

    // boss bar
    const b = this.boss;
    if (b && b.state !== 'intro' || (b && b.state === 'intro' && b.landedIntro)) {
      const w = 520, x = (VIEW_W - w) / 2, y = VIEW_H - 40;
      ctx.fillStyle = 'rgba(8,5,16,0.85)'; Draw.rr(ctx, x - 4, y - 4, w + 8, 18, 6); ctx.fill();
      ctx.fillStyle = '#3a1608'; ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = b.phase === 2 ? '#ff4a1a' : '#ff8c26';
      ctx.fillRect(x, y, w * (b.hp / b.maxHp), 10);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, w * (b.hp / b.maxHp), 3);
      ctx.fillStyle = '#ffdcb0'; ctx.font = '22px Creepster, Nunito, cursive'; ctx.textAlign = 'center';
      ctx.fillText(b.name, VIEW_W / 2, y - 16);
    }
  },

  drawOverlays(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // level title card
    if (this.titleT > 0) {
      const a = Math.min(1, this.titleT, (3.2 - this.titleT) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#c9b8f0'; ctx.font = '700 16px Nunito, sans-serif';
      ctx.fillText('LEVEL 1', VIEW_W / 2, 150);
      ctx.fillStyle = '#ff9f40'; ctx.font = '52px Creepster, Nunito, cursive';
      setGlow(ctx, '#ff7a1a', 16);
      ctx.fillText(this.def.name, VIEW_W / 2, 195);
      clearGlow(ctx);
      ctx.globalAlpha = 1;
    }
    // boss title
    if (this.bossTitleT > 0 && this.bossTitleT < 3.0) {
      const a = Math.min(1, this.bossTitleT, (3.0 - this.bossTitleT) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#c9b8f0'; ctx.font = '700 15px Nunito, sans-serif';
      ctx.fillText('Lord of the Rotten Patch', VIEW_W / 2, 135);
      ctx.fillStyle = '#ff7a1a'; ctx.font = '64px Creepster, Nunito, cursive';
      setGlow(ctx, '#ff3a00', 20);
      ctx.fillText('THE GOURD KING', VIEW_W / 2, 185);
      clearGlow(ctx);
      ctx.globalAlpha = 1;
    }
    // toasts
    this.toasts.forEach((m, i) => {
      const a = Math.min(1, m.t * 3, (m.max - m.t) * 6);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '700 16px Nunito, sans-serif';
      const w = ctx.measureText(m.text).width + 30;
      ctx.fillStyle = 'rgba(10,6,20,0.8)'; Draw.rr(ctx, VIEW_W / 2 - w / 2, 236 + i * 38, w, 30, 10); ctx.fill();
      ctx.fillStyle = '#fff2dc'; ctx.fillText(m.text, VIEW_W / 2, 251 + i * 38);
      ctx.globalAlpha = 1;
    });
    // death
    if (this.player.dead) {
      const a = Math.min(1, (2.4 - this.deathT) * 1.2);
      ctx.fillStyle = `rgba(5,2,10,${a * 0.75})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#b98cff'; ctx.font = '64px Creepster, Nunito, cursive';
      setGlow(ctx, '#7a3aff', 18);
      ctx.fillText('YOU FADED...', VIEW_W / 2, VIEW_H / 2 - 10);
      clearGlow(ctx);
      ctx.fillStyle = '#c9b8f0'; ctx.font = '700 15px Nunito, sans-serif';
      ctx.fillText('Returning to the last lantern', VIEW_W / 2, VIEW_H / 2 + 40);
      ctx.globalAlpha = 1;
    }
  },

  renderMenuScene(ctx) {
    const t = this.t;
    const camX = t * 25;
    drawBackground(ctx, camX, 300, t, this.stars);
    // ground strip
    ctx.fillStyle = '#181430'; ctx.fillRect(0, 470, VIEW_W, 70);
    ctx.fillStyle = '#4b2f78'; ctx.fillRect(0, 470, VIEW_W, 6);
    ctx.fillStyle = '#7a52b8'; ctx.fillRect(0, 470, VIEW_W, 2);
    for (let i = 0; i < 6; i++) {
      const gx = ((i * 230 - camX * 1.0) % 1380 + 1380) % 1380 - 200;
      drawDecor(ctx, { type: i % 2 ? 'grave' : 'shroom', px: gx, py: 470 }, t);
    }
    // hero on a little hill
    const d = this.menuDummy;
    d.anim = t;
    ctx.save();
    ctx.translate(700, 470);
    
    ctx.scale(4.2, 4.2);
    d.x = -d.w / 2; d.y = -d.h;
    drawPlayer(ctx, d, t);
    ctx.restore();
    drawFireflies(ctx, this.fireflies, t);
    const sh = ctx.createLinearGradient(0, 0, 560, 0);
    sh.addColorStop(0, 'rgba(5,2,12,0.55)'); sh.addColorStop(1, 'rgba(5,2,12,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, 560, VIEW_H);
  },
};

/* ---------------- shared drawing helpers ---------------- */
function drawBackground(ctx, camX, camY, t, stars) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#07040f'); g.addColorStop(0.55, '#1b0f33'); g.addColorStop(1, '#2d1446');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // stars
  for (const s of stars) {
    const x = ((s.x - camX * 0.02) % 2400 + 2400) % 2400;
    if (x > VIEW_W) continue;
    ctx.globalAlpha = 0.4 + Math.sin(t * 2 + s.p) * 0.35;
    ctx.fillStyle = '#e8e0ff';
    ctx.fillRect(x, s.y - camY * 0.01, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // moon
  const mx = 760 - (camX * 0.03) % 200, my = 110 - camY * 0.03;
  const mg = ctx.createRadialGradient(mx, my, 20, mx, my, 160);
  mg.addColorStop(0, 'rgba(255,220,180,0.35)'); mg.addColorStop(1, 'rgba(255,220,180,0)');
  ctx.fillStyle = mg; ctx.fillRect(mx - 160, my - 160, 320, 320);
  ctx.fillStyle = '#ffe9c8'; Draw.circ(ctx, mx, my, 48);
  ctx.fillStyle = '#f0d4ac'; Draw.circ(ctx, mx - 14, my - 10, 9); Draw.circ(ctx, mx + 16, my + 14, 6); Draw.circ(ctx, mx + 8, my - 20, 4);

  // far hills
  drawHillLayer(ctx, camX * 0.12, camY * 0.08, 330, 50, 0.004, '#1c1036', 0);
  // mid hills with dead trees
  drawHillLayer(ctx, camX * 0.3, camY * 0.18, 400, 35, 0.007, '#130b26', 1);
  // fog
  for (let i = 0; i < 4; i++) {
    const fx = ((i * 380 - camX * 0.4 + t * 12 * (i % 2 ? 1 : -1)) % 1500 + 1500) % 1500 - 300;
    const fy = 420 + i * 22 - camY * 0.2;
    ctx.fillStyle = 'rgba(150,120,200,0.06)';
    Draw.ell(ctx, fx, fy, 260, 30);
  }
}

function drawHillLayer(ctx, ox, oy, base, amp, freq, color, trees) {
  const yAt = (wx) => base - oy * 0.5 + Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.7 + 1) * amp * 0.4;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W + 16; x += 16) ctx.lineTo(x, yAt(x + ox));
  ctx.lineTo(VIEW_W, VIEW_H); ctx.closePath(); ctx.fill();
  if (!trees) return;
  const spacing = 260;
  const start = Math.floor(ox / spacing) - 1;
  for (let i = start; i < start + VIEW_W / spacing + 3; i++) {
    const r = hash2(i, 99);
    if (r < 0.35) continue;
    const wx = i * spacing + r * 120;
    const sx = wx - ox;
    const sy = yAt(wx) + 4;
    drawTreeShape(ctx, sx, sy, 0.7 + r * 0.6, color);
  }
}

function drawTreeShape(ctx, x, y, s, color) {
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  ctx.lineWidth = 7 * s;
  Draw.line(ctx, x, y, x + 4 * s, y - 70 * s);
  ctx.lineWidth = 4 * s;
  Draw.line(ctx, x + 3 * s, y - 40 * s, x - 22 * s, y - 62 * s);
  Draw.line(ctx, x + 4 * s, y - 55 * s, x + 26 * s, y - 80 * s);
  ctx.lineWidth = 2.5 * s;
  Draw.line(ctx, x - 14 * s, y - 55 * s, x - 18 * s, y - 75 * s);
  Draw.line(ctx, x + 18 * s, y - 70 * s, x + 30 * s, y - 70 * s);
  Draw.line(ctx, x + 4 * s, y - 70 * s, x - 2 * s, y - 90 * s);
}

function drawDecor(ctx, d, t) {
  const x = d.px !== undefined ? d.px : d.x * TILE + 16;
  const y = d.py !== undefined ? d.py : (d.y + 1) * TILE;
  if (d.type === 'grave') {
    ctx.fillStyle = '#2e2846';
    ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 12, y - 22); ctx.arc(x, y - 22, 12, Math.PI, 0); ctx.lineTo(x + 12, y); ctx.fill();
    ctx.fillStyle = '#3d3560'; ctx.fillRect(x - 12, y - 22, 3, 22);
    ctx.fillStyle = '#1b1730'; ctx.fillRect(x - 1.5, y - 28, 3, 14); ctx.fillRect(x - 6, y - 24, 12, 3);
  } else if (d.type === 'tree') {
    drawTreeShape(ctx, x, y + 2, 1.1, '#100c1e');
  } else if (d.type === 'shroom') {
    const g = 0.6 + Math.sin(t * 2 + x) * 0.25;
    setGlow(ctx, '#5cffd0', 12);
    ctx.fillStyle = '#cfe9e0'; ctx.fillRect(x - 2, y - 10, 4, 10); ctx.fillRect(x + 8, y - 6, 3, 6);
    ctx.fillStyle = `rgba(92,255,208,${g})`;
    ctx.beginPath(); ctx.arc(x, y - 10, 7, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 9.5, y - 6, 4.5, Math.PI, 0); ctx.fill();
    clearGlow(ctx);
  } else if (d.type === 'skulls') {
    ctx.fillStyle = '#9e9580';
    for (const [ox, oy, r] of [[-10, -6, 6], [2, -6, 6.5], [-4, -15, 6]]) {
      Draw.circ(ctx, x + ox, y + oy, r);
    }
    ctx.fillStyle = '#1a1020';
    for (const [ox, oy] of [[-10, -6], [2, -6], [-4, -15]]) { Draw.circ(ctx, x + ox - 2, y + oy - 1, 1.5); Draw.circ(ctx, x + ox + 2, y + oy - 1, 1.5); }
  }
}

function drawLantern(ctx, b, t) {
  const x = b.x, y = b.y;
  ctx.fillStyle = '#231c33'; ctx.fillRect(x - 3, y - 56, 6, 56);
  ctx.fillRect(x - 3, y - 56, 18, 4);
  ctx.strokeStyle = '#231c33'; ctx.lineWidth = 2; Draw.line(ctx, x + 13, y - 52, x + 13, y - 46);
  if (b.lit) {
    const fl = 0.8 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.05;
    const g = ctx.createRadialGradient(x + 13, y - 36, 4, x + 13, y - 36, 110 * fl);
    g.addColorStop(0, 'rgba(255,200,100,0.45)'); g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 100, y - 150, 230, 230);
  }
  ctx.fillStyle = '#3a2f52'; Draw.rr(ctx, x + 5, y - 46, 16, 20, 3); ctx.fill();
  ctx.fillStyle = b.lit ? '#ffcf6a' : '#2a2140';
  if (b.lit) setGlow(ctx, '#ffae3a', 16);
  Draw.rr(ctx, x + 8, y - 43, 10, 14, 2); ctx.fill();
  clearGlow(ctx);
  // bench
  ctx.fillStyle = '#3a271d'; ctx.fillRect(x - 30, y - 14, 34, 5);
  ctx.fillStyle = '#25170f'; ctx.fillRect(x - 28, y - 9, 4, 9); ctx.fillRect(x - 2, y - 9, 4, 9);
}

function drawSignPost(ctx, s) {
  const x = s.x * TILE + 16, y = (s.y + 1) * TILE;
  ctx.fillStyle = '#2b1c13'; ctx.fillRect(x - 2, y - 26, 4, 26);
  ctx.fillStyle = '#4a3428'; Draw.rr(ctx, x - 13, y - 34, 26, 15, 2); ctx.fill();
  ctx.fillStyle = '#ffd08a'; ctx.font = '900 11px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', x, y - 26);
}

function drawBubble(ctx, x, y, text) {
  ctx.font = '700 13px Nunito, sans-serif';
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > 240 && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  const h = lines.length * 17 + 14;
  const bx = x - w / 2, by = y - h;
  ctx.fillStyle = 'rgba(14,9,28,0.92)'; Draw.rr(ctx, bx, by, w, h, 8); ctx.fill();
  ctx.strokeStyle = '#7a52b8'; ctx.lineWidth = 1.5; Draw.rr(ctx, bx, by, w, h, 8); ctx.stroke();
  ctx.fillStyle = 'rgba(14,9,28,0.92)'; Draw.poly(ctx, [x - 7, by + h, x + 7, by + h, x, by + h + 8]);
  ctx.fillStyle = '#f3ecff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x, by + 8 + i * 17));
}

function drawFireflies(ctx, flies, t) {
  for (const f of flies) {
    const x = (f.x + Math.sin(t * 0.5 + f.p) * 40 + t * f.s * 0.3) % VIEW_W;
    const y = f.y + Math.cos(t * 0.7 + f.p) * 25;
    ctx.globalAlpha = 0.3 + Math.sin(t * 3 + f.p) * 0.3;
    ctx.fillStyle = '#d8ff9a';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawVignette(ctx, p, cam) {
  const px = p.x + p.w / 2 - cam.x, py = p.y + p.h / 2 - cam.y;
  const g = ctx.createRadialGradient(px, py, 160, px, py, 620);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(3,1,8,0.7)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
