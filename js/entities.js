// Player, enemies, projectiles and pickups.
const PHYS = {
  GRAV: 2000, MAXFALL: 900, RUN: 250, JUMP: 700,
  WJ_X: 260, WJ_Y: 680, WALL_SLIDE: 110,
  DASH_SPEED: 640, DASH_T: 0.16, POGO: 640,
};
const SOUL_COST = 33;

const approach = (v, t, a) => (v < t ? Math.min(v + a, t) : Math.max(v - a, t));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

/* =========================== PLAYER =========================== */
class Player {
  constructor(x, y, headId) {
    this.x = x; this.y = y; this.w = 20; this.h = 30;
    this.vx = 0; this.vy = 0;
    this.head = headId;
    this.st = headStats(headId);
    this.maxHp = 5 + this.st.hp; this.hp = this.maxHp;
    this.soul = 0;
    this.facing = 1;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
    this.dashT = 0; this.dashCd = 0; this.canDash = true; this.dashDir = 1;
    this.attackT = 0; this.attackCd = 0; this.attackDir = 'side'; this.hitSet = new Set(); this.pogoDone = false;
    this.invuln = 0; this.ctrlLock = 0; this.wallSlide = 0; this.healT = 0; this.spellCd = 0;
    this.dropT = 0; this.hazardT = 0; this.anim = 0; this.landT = 0;
    this.lastSafe = { x, y };
    this.dead = false;
  }

  touchingWall(world, dir) {
    const tx = dir > 0 ? Math.floor((this.x + this.w + 1) / TILE) : Math.floor((this.x - 1) / TILE);
    const top = Math.floor((this.y + 4) / TILE), bot = Math.floor((this.y + this.h - 4) / TILE);
    for (let ty = top; ty <= bot; ty++) if (world.solid(tx, ty)) return true;
    return false;
  }
  standingOnOneWayOnly(world) {
    const ty = Math.floor((this.y + this.h + 1) / TILE);
    const l = Math.floor(this.x / TILE), r = Math.floor((this.x + this.w - 0.01) / TILE);
    let any = false;
    for (let tx = l; tx <= r; tx++) {
      if (world.solid(tx, ty)) return false;
      if (world.get(tx, ty) === T.ONEWAY) any = true;
    }
    return any;
  }

  attackBox() {
    const r = this.st.reach;
    if (this.attackDir === 'up') return { x: this.x - 12, y: this.y - 46 * r, w: this.w + 24, h: 48 * r };
    if (this.attackDir === 'down') return { x: this.x - 12, y: this.y + this.h - 8, w: this.w + 24, h: 60 * r };
    const w = 50 * r;
    return { x: this.facing > 0 ? this.x + this.w - 6 : this.x - w + 6, y: this.y - 6, w, h: this.h + 12 };
  }

  hurt(g, dmg, srcX) {
    if (this.invuln > 0 || this.dead || this.hazardT > 0) return false;
    this.hp -= dmg;
    this.invuln = 1.2;
    this.healT = 0;
    this.dashT = 0;
    this.vx = (this.x + this.w / 2 < srcX ? -1 : 1) * 320;
    this.vy = -380;
    this.ctrlLock = 0.22;
    this.jumping = false;
    g.shake = Math.max(g.shake, 10);
    g.freeze = 0.12;
    g.flashRed = 0.35;
    Sfx.play('hurt');
    g.burst(this.x + this.w / 2, this.y + this.h / 2, 14, '#1a1428', 260);
    if (this.hp <= 0) g.playerDied();
    return true;
  }

  update(dt, g) {
    const w = g.world, I = Input;
    this.anim += dt;
    this.invuln -= dt; this.ctrlLock -= dt; this.dashCd -= dt; this.attackCd -= dt; this.spellCd -= dt;
    this.dropT -= dt; this.landT -= dt;
    if (this.attackT > 0) this.attackT -= dt;

    // Spike hazard: fade out, then reappear at the last safe ground.
    if (this.hazardT > 0) {
      this.hazardT -= dt;
      if (this.hazardT <= 0) {
        this.x = this.lastSafe.x; this.y = this.lastSafe.y; this.vx = this.vy = 0;
        this.invuln = 1.0;
      }
      return;
    }

    const ix = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);

    // Healing (focus) — stand still while soul turns into a mask.
    if (this.healT > 0) {
      this.healT -= dt;
      this.vx = approach(this.vx, 0, 3000 * dt);
      this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
      if (Math.random() < 0.6) g.particles.push(makeParticle(this.x + this.w / 2 + rand(-18, 18), this.y + this.h + rand(-4, 4), 0, rand(-90, -40), 0.6, '#e8f0ff', 2.5, 0));
      if (this.healT <= 0) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.soul -= SOUL_COST;
        Sfx.play('heal');
        g.burst(this.x + this.w / 2, this.y + this.h / 2, 18, '#e8f0ff', 220);
      }
      moveEntity(w, this, dt);
      return;
    }

    if (this.onGround) { this.coyote = 0.1; this.canDash = true; } else this.coyote -= dt;
    if (I.pressed('jump')) this.jumpBuf = 0.13; else this.jumpBuf -= dt;

    this.wallSlide = 0;
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir * PHYS.DASH_SPEED;
      this.vy = 0;
      g.afterimages.push({ x: this.x, y: this.y, facing: this.facing, head: this.head, life: 0.25 });
      if (this.dashT <= 0) this.vx = this.dashDir * PHYS.RUN * this.st.speed;
    } else {
      if (this.ctrlLock <= 0) {
        const target = ix * PHYS.RUN * this.st.speed;
        this.vx = approach(this.vx, target, (this.onGround ? 2800 : 2000) * dt);
        if (ix) this.facing = ix;
      }
      this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
      if (!this.onGround && this.vy > 0 && ix !== 0 && this.ctrlLock <= 0 && this.touchingWall(w, ix)) {
        this.wallSlide = ix;
        this.vy = Math.min(this.vy, PHYS.WALL_SLIDE);
        this.canDash = true;
        this.facing = -ix;
        if (Math.random() < 0.3) g.particles.push(makeParticle(ix > 0 ? this.x + this.w : this.x, this.y + rand(0, 10), -ix * 30, -20, 0.35, '#6b5a8f', 2, 0));
      }
      if (this.jumping && !I.down('jump') && this.vy < 0) { this.vy *= 0.45; this.jumping = false; }
      if (this.vy >= 0) this.jumping = false;
    }

    // Jumping (ground / coyote / wall / drop-through)
    if (this.jumpBuf > 0 && this.dashT <= 0) {
      if (this.onGround && I.down('down') && this.standingOnOneWayOnly(w)) {
        this.dropT = 0.25; this.y += 2; this.jumpBuf = 0; this.onGround = false; this.coyote = 0;
      } else if (this.coyote > 0) {
        this.vy = -PHYS.JUMP * this.st.jump;
        this.coyote = 0; this.jumpBuf = 0; this.jumping = true;
        Sfx.play('jump');
        g.dust(this.x + this.w / 2, this.y + this.h, 6);
      } else if (!this.onGround) {
        const wr = this.touchingWall(w, 1), wl = this.touchingWall(w, -1);
        if (wr || wl) {
          const d = this.wallSlide || (wr ? 1 : -1);
          this.vx = -d * PHYS.WJ_X;
          this.vy = -PHYS.WJ_Y * this.st.jump;
          this.ctrlLock = 0.1;
          this.facing = -d;
          this.jumping = true;
          this.jumpBuf = 0;
          Sfx.play('walljump');
          g.dust(d > 0 ? this.x + this.w : this.x, this.y + this.h / 2, 5);
        }
      }
    }

    // Dash
    if (I.pressed('dash') && this.canDash && this.dashCd <= 0 && this.dashT <= 0) {
      this.dashDir = this.wallSlide ? -this.wallSlide : (ix || this.facing);
      this.facing = this.dashDir;
      this.dashT = PHYS.DASH_T * this.st.dash;
      this.dashCd = 0.45 * this.st.dashCd;
      if (!this.onGround) this.canDash = false;
      this.jumping = false; this.ctrlLock = 0;
      Sfx.play('dash');
    }

    // Attack
    if (I.pressed('attack') && this.attackCd <= 0 && this.dashT <= 0) {
      this.attackDir = I.down('up') ? 'up' : (I.down('down') && !this.onGround) ? 'down' : 'side';
      this.attackT = 0.14; this.attackCd = 0.26;
      this.hitSet = new Set(); this.pogoDone = false;
      Sfx.play('swing');
    }
    if (this.attackT > 0) g.resolvePlayerAttack(this);

    // Heal
    if (I.pressed('heal')) {
      if (this.onGround && this.soul >= SOUL_COST && this.hp < this.maxHp && this.dashT <= 0) {
        this.healT = 0.75; Sfx.play('focus');
      } else if (this.soul < SOUL_COST) g.toast('Not enough Soul. Hit foes to fill the orb!', 1.6);
    }

    // Wisp Bolt (unlocked by beating Level 1)
    if (I.pressed('spell')) {
      if (!Save.data.unlocks.wisp) g.toast('Wisp Bolt is locked. Defeat the Gourd King!', 1.8);
      else if (this.soul >= SOUL_COST && this.spellCd <= 0) {
        this.soul -= SOUL_COST; this.spellCd = 0.45;
        g.projectiles.push(new Projectile('wisp', this.facing > 0 ? this.x + this.w : this.x - 30, this.y + 6, this.facing * 720, 0));
        this.vx = -this.facing * 160; this.ctrlLock = 0.1;
        Sfx.play('bolt');
      }
    }

    const wasGround = this.onGround;
    const fallSpeed = this.vy;
    moveEntity(w, this, dt);
    if (!wasGround && this.onGround && fallSpeed > 300) { g.dust(this.x + this.w / 2, this.y + this.h, 5); this.landT = 0.12; }

    // Remember safe ground for spike respawns
    if (this.onGround && this.dashT <= 0) {
      const fy = Math.floor((this.y + this.h + 2) / TILE);
      const lx = Math.floor((this.x - 6) / TILE), rx = Math.floor((this.x + this.w + 6) / TILE);
      let ok = true;
      for (let tx = lx; tx <= rx; tx++) if (!w.standable(tx, fy) || w.isSpike(tx, fy - 1)) ok = false;
      if (ok) this.lastSafe = { x: this.x, y: this.y };
    }

    // Spikes
    const hb = { x: this.x + 3, y: this.y + 4, w: this.w - 6, h: this.h - 4 };
    if (w.spikeOverlap(hb)) g.playerHazard();

    // Fell out of the world
    if (this.y > w.h * TILE + 200) g.playerHazard();
  }
}

function drawPlayer(ctx, p, t) {
  if (p.dead) return;
  let alpha = 1;
  if (p.hazardT > 0) alpha = Math.max(0, p.hazardT / 0.45 - 0.2);
  else if (p.invuln > 0 && Math.floor(t * 18) % 2 === 0) alpha = 0.35;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  const accent = headById(p.head).accent;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, by);
  // squash & stretch
  let sx = 1, sy = 1;
  if (p.landT > 0) { sx = 1.15; sy = 0.87; }
  else if (!p.onGround && p.dashT <= 0) { sy = clamp(1 + -p.vy / 4000, 0.92, 1.12); sx = 2 - sy; }
  if (p.dashT > 0) { sx = 1.2; sy = 0.88; }
  ctx.scale(p.facing * sx, sy);

  // legs
  const running = p.onGround && Math.abs(p.vx) > 30;
  const ph = running ? Math.sin(p.anim * 18) : 0;
  ctx.fillStyle = '#100d1a';
  if (p.onGround) {
    ctx.fillRect(-6 + ph * 2.5, -8, 4, 8);
    ctx.fillRect(2 - ph * 2.5, -8, 4, 8);
  } else {
    ctx.fillRect(-6, -9, 4, 7);
    ctx.fillRect(2, -10, 4, 6);
  }
  // cloak
  const sway = running ? Math.sin(p.anim * 9) * 1.5 : Math.sin(t * 2) * 0.8;
  const flare = p.onGround ? 0 : 3;
  ctx.fillStyle = '#2a2540';
  ctx.beginPath();
  ctx.moveTo(-7, -21);
  ctx.lineTo(7, -21);
  ctx.lineTo(10 + flare - sway, -6);
  ctx.lineTo(4, -4); ctx.lineTo(0, -6); ctx.lineTo(-4, -4);
  ctx.lineTo(-10 - flare - sway, -6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = accent;
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillRect(-7, -21, 14, 2);
  ctx.globalAlpha = alpha;
  // tiny scythe-blade on the back
  if (p.attackT <= 0) {
    ctx.strokeStyle = '#6b6380'; ctx.lineWidth = 2;
    Draw.line(ctx, -5, -19, -11, -4);
    ctx.fillStyle = '#d8d2ea';
    ctx.beginPath(); ctx.moveTo(-5, -19); ctx.quadraticCurveTo(-1, -24, 3, -20); ctx.quadraticCurveTo(-1, -21, -5, -17); ctx.fill();
  }
  // head
  const bob = p.onGround && !running ? Math.sin(t * 3) * 0.7 : 0;
  ctx.translate(0, -26 + bob);
  if (p.healT > 0) { setGlow(ctx, '#e8f0ff', 18); }
  drawHead(ctx, p.head, t, { flash: p.invuln > 1.05 });
  clearGlow(ctx);
  ctx.restore();

  // slash arc
  if (p.attackT > 0) {
    const k = 1 - p.attackT / 0.14;
    const r = p.st.reach;
    ctx.save();
    ctx.translate(cx, p.y + p.h / 2 - 2);
    if (p.attackDir === 'up') ctx.rotate(-Math.PI / 2);
    else if (p.attackDir === 'down') ctx.rotate(Math.PI / 2);
    else ctx.scale(p.facing, 1);
    ctx.globalAlpha = 1 - k * 0.75;
    setGlow(ctx, accent, 14);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, 0, 40 * r, -1.2 + k * 0.3, 1.2 + k * 0.3);
    ctx.arc(-6, 0, 33 * r, 1.05 + k * 0.3, -1.05 + k * 0.3, true);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = accent; ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.arc(4, 0, 36 * r, -1.0 + k * 0.3, 1.0 + k * 0.3);
    ctx.arc(-4, 0, 32 * r, 0.9 + k * 0.3, -0.9 + k * 0.3, true);
    ctx.closePath(); ctx.fill();
    clearGlow(ctx);
    ctx.restore();
  }
}

/* =========================== ENEMIES =========================== */
class Crawler {
  constructor(x, y) {
    this.w = 30; this.h = 22;
    this.x = x; this.y = y - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1;
    this.hp = 4; this.flash = 0; this.kb = 0; this.dead = false;
    this.anim = Math.random() * 10; this.candy = 3; this.contact = 1;
  }
  update(dt, g) {
    this.anim += dt; this.flash -= dt;
    if (this.kb > 0) { this.kb -= dt; this.vx = approach(this.vx, 0, 900 * dt); }
    else {
      if (this.onGround) {
        const aheadX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        const tx = Math.floor(aheadX / TILE);
        const footTy = Math.floor((this.y + this.h + 2) / TILE);
        const midTy = Math.floor((this.y + this.h / 2) / TILE);
        if (!g.world.standable(tx, footTy) || g.world.solid(tx, midTy) || g.world.isSpike(tx, footTy - 1)) this.dir *= -1;
      }
      this.vx = this.dir * 55;
    }
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
    moveEntity(g.world, this, dt);
  }
  hurt(dmg, dir, g) {
    this.hp -= dmg; this.flash = 0.12;
    if (dir) { this.vx = dir * 260; this.kb = 0.2; }
    g.burst(this.x + this.w / 2, this.y + this.h / 2, 6, '#6cff9a', 160);
    if (this.hp <= 0) g.killEnemy(this);
  }
  draw(ctx, t) {
    const f = this.flash > 0;
    const c = (col) => (f ? '#ffffff' : col);
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h);
    ctx.scale(this.dir, 1);
    // legs
    ctx.strokeStyle = c('#1a1424'); ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ph = Math.sin(this.anim * 14 + i * 2) * 2.5;
      Draw.line(ctx, -8 + i * 7, -5, -10 + i * 7 + ph, 0);
    }
    // shell
    ctx.fillStyle = c('#3b2f57');
    ctx.beginPath(); ctx.ellipse(0, -10, 15, 11, 0, Math.PI, 0); ctx.lineTo(15, -5); ctx.lineTo(-15, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c('#54437a');
    ctx.beginPath(); ctx.ellipse(-2, -12, 10, 7, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = c('#271e3c'); ctx.lineWidth = 1.5;
    Draw.line(ctx, -6, -20, -4, -6); Draw.line(ctx, 3, -20, 4, -6);
    // face
    ctx.fillStyle = c('#a99cc8'); Draw.ell(ctx, 12, -8, 6, 5);
    ctx.fillStyle = c('#6cff9a'); if (!f) setGlow(ctx, '#3dff7a', 8);
    Draw.circ(ctx, 14, -9, 1.8);
    clearGlow(ctx);
    ctx.strokeStyle = c('#a99cc8'); ctx.lineWidth = 1.2;
    Draw.line(ctx, 15, -12, 21, -17 + Math.sin(this.anim * 6)); Draw.line(ctx, 13, -12, 17, -19 + Math.cos(this.anim * 6));
    ctx.restore();
  }
}

class Bat {
  constructor(x, y) {
    this.w = 26; this.h = 18;
    this.x = x; this.y = y; this.home = { x, y };
    this.vx = 0; this.vy = 0; this.hp = 2; this.flash = 0; this.kb = 0; this.dead = false;
    this.state = 'idle'; this.anim = Math.random() * 10; this.candy = 3; this.contact = 1; this.facing = 1;
  }
  update(dt, g) {
    this.anim += dt; this.flash -= dt;
    const p = g.player;
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2), dy = (p.y + p.h / 2) - (this.y + this.h / 2);
    const d = Math.hypot(dx, dy);
    if (this.kb > 0) { this.kb -= dt; this.vx *= 0.9; this.vy *= 0.9; }
    else if (this.state === 'idle') {
      const tx = this.home.x + Math.sin(this.anim * 1.3) * 30, ty = this.home.y + Math.sin(this.anim * 2.1) * 12;
      this.vx = (tx - this.x) * 2; this.vy = (ty - this.y) * 2;
      if (d < 250 && !p.dead) this.state = 'chase';
    } else {
      const sp = 135;
      this.vx = approach(this.vx, (dx / (d || 1)) * sp, 380 * dt);
      this.vy = approach(this.vy, (dy / (d || 1)) * sp + Math.sin(this.anim * 6) * 40, 380 * dt);
      if (d > 520 || p.dead) this.state = 'idle';
    }
    if (Math.abs(dx) > 4) this.facing = dx > 0 ? 1 : -1;
    moveEntity(g.world, this, dt);
  }
  hurt(dmg, dir, g) {
    this.hp -= dmg; this.flash = 0.12; this.state = 'chase';
    const p = g.player;
    const ax = (this.x - p.x), ay = (this.y - p.y), l = Math.hypot(ax, ay) || 1;
    this.vx = (ax / l) * 320; this.vy = (ay / l) * 320; this.kb = 0.25;
    g.burst(this.x + this.w / 2, this.y + this.h / 2, 6, '#ff5a7a', 160);
    if (this.hp <= 0) g.killEnemy(this);
  }
  draw(ctx, t) {
    const f = this.flash > 0;
    const c = (col) => (f ? '#ffffff' : col);
    const flap = Math.sin(this.anim * 18);
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.scale(this.facing, 1);
    ctx.fillStyle = c('#2d1b45');
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 4, -2);
      ctx.quadraticCurveTo(s * 14, -12 - flap * 8, s * 20, -4 - flap * 6);
      ctx.lineTo(s * 16, 0 - flap * 3); ctx.lineTo(s * 12, -1 - flap * 2); ctx.lineTo(s * 8, 3);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = c('#45295f'); Draw.ell(ctx, 0, 0, 7, 8);
    Draw.poly(ctx, [-5, -6, -3, -12, -1, -7]); Draw.poly(ctx, [5, -6, 3, -12, 1, -7]);
    ctx.fillStyle = c('#ff3355'); if (!f) setGlow(ctx, '#ff0033', 8);
    Draw.circ(ctx, -1, -2, 1.5); Draw.circ(ctx, 3.5, -2, 1.5);
    clearGlow(ctx);
    ctx.fillStyle = c('#fff'); Draw.poly(ctx, [0, 3, 1.4, 3, 0.7, 5.5]); Draw.poly(ctx, [2.4, 3, 3.8, 3, 3.1, 5.5]);
    ctx.restore();
  }
}

/* =========================== PROJECTILES =========================== */
class Projectile {
  constructor(type, x, y, vx, vy) {
    this.type = type; this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dead = false; this.life = 4; this.t = 0;
    this.hostile = type !== 'wisp';
    this.breakable = type === 'seed' || type === 'debris';
    this.hitSet = new Set();
    if (type === 'seed') { this.w = 14; this.h = 14; this.grav = 1300; }
    if (type === 'wave') { this.w = 26; this.h = 26; this.grav = 0; this.life = 3.5; }
    if (type === 'debris') { this.w = 18; this.h = 18; this.grav = 0; this.warn = 0.7; }
    if (type === 'wisp') { this.w = 30; this.h = 18; this.grav = 0; this.life = 1.3; this.dmg = 6; }
  }
  update(dt, g) {
    this.t += dt; this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.type === 'debris' && this.warn > 0) { this.warn -= dt; if (this.warn <= 0) this.vy = 120; return; }
    if (this.type === 'debris') this.vy = Math.min(this.vy + 1600 * dt, 900);
    this.vy += (this.grav || 0) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    if (this.type === 'wave') {
      if (g.world.solidAt(this.vx > 0 ? this.x + this.w : this.x, cy)) this.dead = true;
      if (Math.random() < 0.7) g.particles.push(makeParticle(cx + rand(-8, 8), this.y + this.h, rand(-30, 30), rand(-160, -60), 0.4, Math.random() < 0.5 ? '#ff8a1a' : '#ffd84d', 3, 0));
    } else if (g.world.solidAt(cx, cy)) {
      this.dead = true;
      g.burst(cx, cy, 6, this.type === 'wisp' ? '#bff8ff' : '#c8a86a', 140);
    }
    if (this.type === 'wisp' && Math.random() < 0.8) g.particles.push(makeParticle(cx, cy + rand(-5, 5), -this.vx * 0.1, rand(-20, 20), 0.35, '#9ff4ff', 3, 0));
  }
  draw(ctx, t) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    if (this.type === 'seed') {
      ctx.translate(cx, cy); ctx.rotate(this.t * 10);
      ctx.fillStyle = '#f2e2b0'; Draw.ell(ctx, 0, 0, 7, 5);
      ctx.fillStyle = '#b89a5a'; Draw.ell(ctx, 1.5, 0, 3.5, 2.5);
    } else if (this.type === 'wave') {
      setGlow(ctx, '#ff7a1a', 16);
      const fl = Math.sin(this.t * 30) * 3;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath(); ctx.moveTo(this.x, this.y + this.h); ctx.quadraticCurveTo(cx, this.y - 10 + fl, this.x + this.w, this.y + this.h); ctx.fill();
      ctx.fillStyle = '#ffe07a';
      ctx.beginPath(); ctx.moveTo(this.x + 6, this.y + this.h); ctx.quadraticCurveTo(cx, this.y + 6 - fl, this.x + this.w - 6, this.y + this.h); ctx.fill();
    } else if (this.type === 'debris') {
      if (this.warn > 0) {
        ctx.globalAlpha = 0.4 + Math.sin(t * 30) * 0.3;
        ctx.fillStyle = '#ff5a3a';
        Draw.poly(ctx, [cx - 8, this.y - 4, cx + 8, this.y - 4, cx, this.y + 8]);
        ctx.globalAlpha = 1;
      }
      ctx.translate(cx, cy); ctx.rotate(this.t * 4);
      ctx.fillStyle = '#3a2f4f'; Draw.poly(ctx, [-9, -6, 0, -10, 9, -4, 7, 8, -6, 9]);
      ctx.fillStyle = '#54477a'; Draw.poly(ctx, [-6, -4, 0, -7, 5, -3, 0, 2]);
    } else if (this.type === 'wisp') {
      setGlow(ctx, '#2ee6ff', 20);
      ctx.translate(cx, cy); ctx.scale(Math.sign(this.vx) || 1, 1);
      ctx.fillStyle = 'rgba(160,245,255,0.6)';
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(-4, -12, -22, -2 + Math.sin(this.t * 40) * 3); ctx.quadraticCurveTo(-4, 12, 10, 0); ctx.fill();
      ctx.fillStyle = '#ecfeff'; Draw.circ(ctx, 6, 0, 7);
      ctx.fillStyle = '#1a3a40'; Draw.circ(ctx, 8, -2, 1.3); Draw.circ(ctx, 8, 2.5, 1.3);
    }
    ctx.restore();
  }
}

/* =========================== PICKUPS & FX =========================== */
class Candy {
  constructor(x, y, physics = false) {
    this.x = x; this.y = y; this.vx = physics ? rand(-160, 160) : 0; this.vy = physics ? rand(-520, -260) : 0;
    this.w = 12; this.h = 12; this.physics = physics; this.t = Math.random() * 6; this.dead = false;
    this.kind = Math.random() < 0.5 ? 0 : 1; this.delay = physics ? 0.35 : 0;
    this.bx = x; this.by = y;
  }
  update(dt, g) {
    this.t += dt; this.delay -= dt;
    const p = g.player;
    const dx = (p.x + p.w / 2) - (this.x + 6), dy = (p.y + p.h / 2) - (this.y + 6);
    const d = Math.hypot(dx, dy);
    if (this.delay <= 0 && d < 70 && !p.dead) {
      this.physics = false;
      this.x += (dx / d) * 420 * dt; this.y += (dy / d) * 420 * dt;
      this.bx = this.x; this.by = this.y;
    } else if (this.physics) {
      this.vy = Math.min(this.vy + PHYS.GRAV * dt, 700);
      this.vx *= 0.99;
      moveEntity(g.world, this, dt);
      if (this.onGround) { this.vx *= 0.8; }
    }
    if (d < 20 && this.delay <= 0 && !p.dead) { this.dead = true; g.collectCandy(this); }
  }
  draw(ctx, t) {
    const bob = this.physics ? 0 : Math.sin(this.t * 3) * 3;
    ctx.save();
    ctx.translate(this.x + 6, this.y + 6 + bob);
    if (this.kind === 0) {
      // candy corn
      ctx.rotate(Math.sin(this.t * 2) * 0.2);
      ctx.fillStyle = '#ffffff'; Draw.poly(ctx, [-6, 5, 6, 5, 0, -8]);
      ctx.fillStyle = '#ff9f1a'; Draw.poly(ctx, [-4.6, 2, 4.6, 2, 3, -2, -3, -2]);
      ctx.fillStyle = '#ffe14d'; Draw.poly(ctx, [-6, 5, 6, 5, 4.6, 2, -4.6, 2]);
    } else {
      // wrapped sweet
      ctx.rotate(this.t * 0.8);
      ctx.fillStyle = '#b06cff';
      Draw.poly(ctx, [-5, 0, -10, -4, -10, 4]); Draw.poly(ctx, [5, 0, 10, -4, 10, 4]);
      ctx.fillStyle = '#d9a8ff'; Draw.circ(ctx, 0, 0, 5);
      ctx.fillStyle = '#7a2fd6'; ctx.fillRect(-1.5, -5, 3, 10);
    }
    ctx.restore();
  }
}

function makeParticle(x, y, vx, vy, life, color, size, grav = 600) {
  return { x, y, vx, vy, life, max: life, color, size, grav };
}
