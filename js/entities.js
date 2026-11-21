// Player, mini enemies, obby obstacles and projectiles.
const PHYS = {
  GRAV: 2000, MAXFALL: 900, FASTFALL: 1250, RUN: 250, JUMP: 700,
  WJ_X: 260, WJ_Y: 680, WALL_SLIDE: 110,
  DASH_SPEED: 640, DASH_T: 0.16, POGO: 640, PAD: 1100,
};
const BOLT_CD = 1.1;

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
    this.facing = 1;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
    this.dashT = 0; this.dashCd = 0; this.canDash = true; this.dashDir = 1;
    this.attackT = 0; this.attackCd = 0; this.attackDir = 'side'; this.hitSet = new Set(); this.pogoDone = false;
    this.invuln = 0; this.ctrlLock = 0; this.wallSlide = 0; this.boltCd = 0;
    this.dropT = 0; this.hazardT = 0; this.anim = 0; this.landT = 0;
    this.platform = null; this.airJumps = 1;
    this.lastSafe = { x, y };
    this.dead = false;
  }

  touchingWall(world, dir) {
    const tx = dir > 0 ? Math.floor((this.x + this.w + 1) / TILE) : Math.floor((this.x - 1) / TILE);
    const top = Math.floor((this.y + 4) / TILE), bot = Math.floor((this.y + this.h - 4) / TILE);
    for (let ty = top; ty <= bot; ty++) if (world.solid(tx, ty)) return true;
    return false;
  }
  onDropThrough(world) {
    if (this.platform) return true;
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

  // Infinite health: monsters only knock you back.
  hurt(g, dmg, srcX) {
    if (this.invuln > 0 || this.dead) return false;
    this.invuln = 0.8;
    this.dashT = 0;
    const k = this.st.knock;
    this.vx = (this.x + this.w / 2 < srcX ? -1 : 1) * 340 * k;
    this.vy = -360 * Math.max(0.5, k);
    this.ctrlLock = 0.22 * k;
    this.jumping = false;
    this.platform = null;
    g.shake = Math.max(g.shake, 6);
    g.freeze = 0.06;
    Sfx.play('bump');
    g.burst(this.x + this.w / 2, this.y + this.h / 2, 10, '#c9b8f0', 220);
    return true;
  }

  update(dt, g) {
    const w = g.world, I = Input;
    this.anim += dt;
    this.invuln -= dt; this.ctrlLock -= dt; this.dashCd -= dt; this.attackCd -= dt; this.boltCd -= dt;
    this.dropT -= dt; this.landT -= dt;
    if (this.attackT > 0) this.attackT -= dt;


    const ix = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    const downHeld = I.down('down');

    if (this.onGround) { this.coyote = 0.1; this.canDash = true; this.airJumps = 1; } else this.coyote -= dt;
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
      // Down arrow in the air = fall faster
      const maxFall = !this.onGround && downHeld ? PHYS.FASTFALL : PHYS.MAXFALL;
      this.vy = Math.min(this.vy + PHYS.GRAV * (downHeld && this.vy > 0 ? 1.6 : 1) * dt, maxFall);
      // No wall sliding or wall jumping: if you miss a jump, only your double jump can save you.
      if (this.st.floaty < 1 && !this.onGround && this.vy > 0 && I.down('jump')) this.vy = Math.min(this.vy, PHYS.MAXFALL * this.st.floaty);
      if (this.jumping && !I.down('jump') && this.vy < 0) { this.vy *= 0.45; this.jumping = false; }
      if (this.vy >= 0) this.jumping = false;
    }

    // Down arrow on a wooden/moving platform = drop through it
    if (this.onGround && downHeld && I.pressed('down') && this.onDropThrough(w)) {
      this.dropT = 0.25; this.y += 2; this.onGround = false; this.coyote = 0; this.platform = null;
    }

    // Jumping (ground / coyote / double jump)
    if (this.jumpBuf > 0 && this.dashT <= 0) {
      if (this.coyote > 0) {
        this.vy = -PHYS.JUMP * this.st.jump;
        this.coyote = 0; this.jumpBuf = 0; this.jumping = true; this.platform = null;
        Sfx.play('jump');
        g.dust(this.x + this.w / 2, this.y + this.h, 6);
      } else if (!this.onGround) {
        if (this.airJumps > 0) {
          // DOUBLE JUMP
          this.airJumps--;
          this.vy = -PHYS.JUMP * 0.9 * this.st.jump;
          this.jumping = true; this.jumpBuf = 0;
          Sfx.play('djump');
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            g.particles.push(makeParticle(this.x + this.w / 2, this.y + this.h, Math.cos(a) * 120, Math.sin(a) * 40 + 40, 0.35, headById(this.head).accent, 3, 0));
          }
        }
      }
    }

    // Dash
    if (I.pressed('dash') && this.canDash && this.dashCd <= 0 && this.dashT <= 0) {
      this.dashDir = ix || this.facing;
      this.facing = this.dashDir;
      this.dashT = PHYS.DASH_T * this.st.dash;
      this.dashCd = 0.45 * this.st.dashCd;
      if (!this.onGround) this.canDash = false;
      this.jumping = false; this.ctrlLock = 0; this.platform = null;
      Sfx.play('dash');
    }

    // Attack
    if (I.pressed('attack') && this.attackCd <= 0 && this.dashT <= 0) {
      this.attackDir = I.down('up') ? 'up' : (downHeld && !this.onGround) ? 'down' : 'side';
      this.attackT = 0.14; this.attackCd = 0.26;
      this.hitSet = new Set(); this.pogoDone = false;
      Sfx.play('swing');
    }
    if (this.attackT > 0) g.resolvePlayerAttack(this);

    // Wisp Bolt (unlocks after Level 20) — runs on a cooldown, no meter
    if (I.pressed('spell')) {
      if (!Save.data.unlocks.wisp) g.toast('Wisp Bolt unlocks after Level 20!', 1.8);
      else if (this.boltCd <= 0) {
        this.boltCd = BOLT_CD * this.st.boltCd;
        g.projectiles.push(new Projectile('wisp', this.facing > 0 ? this.x + this.w : this.x - 30, this.y + 6, this.facing * 720, 0));
        this.vx = -this.facing * 160; this.ctrlLock = 0.1;
        Sfx.play('bolt');
      }
    }

    const wasGround = this.onGround;
    const fallSpeed = this.vy;
    this.prevBottom = this.y + this.h;
    moveEntity(w, this, dt);
    if (this.onGround) this.platform = null;
    g.landOnPlatforms(this);
    if (!wasGround && this.onGround && fallSpeed > 300) { g.dust(this.x + this.w / 2, this.y + this.h, 5); this.landT = 0.12; }

    const hb = { x: this.x + 3, y: this.y + 4, w: this.w - 6, h: this.h - 4 };
    // Obby rule: touching spikes, lava or fire = you die and go back to your checkpoint.
    if (w.hazardOverlap(hb)) g.playerDied();
    if (this.y > w.h * TILE + 200) g.playerDied();
  }
}

/* ---------- player art: a small hooded wanderer with a scarf and a sword ---------- */
function drawPlayer(ctx, p, t) {
  if (p.dead) return;
  let alpha = 1;
  if (p.hazardT > 0) alpha = Math.max(0, p.hazardT / 0.45 - 0.2);
  else if (p.invuln > 0 && Math.floor(t * 18) % 2 === 0) alpha = 0.35;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  const accent = headById(p.head).accent;
  const running = p.onGround && Math.abs(p.vx) > 30;
  const airborne = !p.onGround;

  ctx.save();
  ctx.globalAlpha = alpha;
  // ground shadow
  if (p.onGround) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, cx, by, 12, 3); }
  ctx.translate(cx, by);
  let sx = 1, sy = 1;
  if (p.landT > 0) { sx = 1.12; sy = 0.9; }
  else if (airborne && p.dashT <= 0) { sy = clamp(1 + -p.vy / 4500, 0.93, 1.1); sx = 2 - sy; }
  if (p.dashT > 0) { sx = 1.18; sy = 0.9; }
  ctx.scale(p.facing * sx, sy);

  const ph = running ? p.anim * 16 : 0;
  const leg = (offset, back) => {
    const s = Math.sin(ph + offset);
    const hipX = back ? -2.5 : 2.5;
    let kneeX = hipX + (running ? s * 4 : 0), kneeY = -5 - (running ? Math.max(0, -s) * 2 : 0);
    let footX = hipX + (running ? s * 6 : 0), footY = 0 - (running ? Math.max(0, -s) * 3 : 0);
    if (airborne) { kneeX = hipX + (back ? -1 : 3); kneeY = -6; footX = hipX + (back ? -3 : 1); footY = -2; }
    ctx.strokeStyle = back ? '#16121f' : '#231d30'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hipX, -10); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY - 1.5); ctx.stroke();
    ctx.fillStyle = back ? '#1a120c' : '#3a2616';
    Draw.rr(ctx, footX - 2, footY - 3, 6, 3, 1.2); ctx.fill();
  };
  leg(Math.PI, true);

  // scarf tail flowing behind
  const flow = clamp(Math.abs(p.vx) / 250, 0, 1);
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -21);
  for (let i = 1; i <= 4; i++) {
    const wave = Math.sin(t * 9 - i * 1.2) * (1 + flow * 1.5);
    ctx.lineTo(-3 - i * (2.5 + flow * 2.5), -21 + i * (2 - flow * 1.2) + wave + (airborne ? p.vy * 0.004 * i : 0));
  }
  ctx.stroke();

  // back arm
  ctx.strokeStyle = '#1c1728'; ctx.lineWidth = 3;
  const armSwing = running ? Math.sin(ph) * 3 : 0;
  Draw.line(ctx, -4, -18, -6 - armSwing, -11);

  // cloak / tunic body with shading
  const sway = running ? Math.sin(p.anim * 9) * 1.2 : Math.sin(t * 2) * 0.6;
  const flare = airborne ? 2.5 : 0;
  const body = ctx.createLinearGradient(-8, -22, 8, -6);
  body.addColorStop(0, '#4a4166'); body.addColorStop(0.55, '#2c2640'); body.addColorStop(1, '#141020');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-6, -23);
  ctx.quadraticCurveTo(0, -25, 6, -23);
  ctx.lineTo(9 + flare - sway, -8);
  ctx.quadraticCurveTo(0, -5, -9 - flare - sway, -8);
  ctx.closePath(); ctx.fill();
  // folds
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8;
  Draw.line(ctx, -2, -20, -4 - sway, -8); Draw.line(ctx, 3, -20, 4 - sway, -8);
  // belt
  ctx.fillStyle = '#3a2616'; ctx.fillRect(-7, -14, 14, 2.4);
  ctx.fillStyle = '#c9a04a'; ctx.fillRect(1, -14.3, 3, 3);
  // scarf wrap around the neck
  ctx.fillStyle = accent; Draw.rr(ctx, -6.5, -24.5, 13, 4, 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-6.5, -21.5, 13, 1);
  leg(0, false);

  // front arm + sword
  if (p.attackT <= 0) {
    ctx.strokeStyle = '#2c2640'; ctx.lineWidth = 3;
    const hx = 6 + armSwing, hy = -12;
    Draw.line(ctx, 4, -19, hx, hy);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(running ? 0.9 : 1.15);
    drawSword(ctx);
    ctx.restore();
  } else {
    ctx.strokeStyle = '#2c2640'; ctx.lineWidth = 3;
    Draw.line(ctx, 4, -19, 9, -17);
  }

  // head
  const bob = p.onGround && !running ? Math.sin(t * 3) * 0.6 : (running ? Math.abs(Math.sin(ph)) * -1 : 0);
  ctx.translate(0, -31 + bob);
  ctx.scale(0.92, 0.92);
  drawHead(ctx, p.head, t, { flash: p.invuln > 0.7 });
  ctx.restore();

  // slash arc with the sword at the leading edge
  if (p.attackT > 0) {
    const k = 1 - p.attackT / 0.14;
    const r = p.st.reach;
    ctx.save();
    ctx.translate(cx, p.y + p.h / 2 - 2);
    if (p.attackDir === 'up') ctx.rotate(-Math.PI / 2);
    else if (p.attackDir === 'down') ctx.rotate(Math.PI / 2);
    else ctx.scale(p.facing, 1);
    ctx.globalAlpha = (1 - k * 0.75) * alpha;
    const g = ctx.createRadialGradient(0, 0, 20 * r, 0, 0, 42 * r);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.85)'); g.addColorStop(1, accent);
    ctx.fillStyle = g;
    const a0 = -1.2 + k * 0.4, a1 = 1.2 + k * 0.4;
    ctx.beginPath();
    ctx.arc(4, 0, 42 * r, a0, a1);
    ctx.arc(-6, 0, 32 * r, a1 - 0.15, a0 + 0.15, true);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = alpha;
    const ang = a0 + (a1 - a0) * Math.min(1, k * 1.3);
    ctx.rotate(ang);
    ctx.translate(14, 0);
    ctx.rotate(-Math.PI / 2 + Math.PI);
    drawSword(ctx);
    ctx.restore();
  }
}

function drawSword(ctx) {
  // drawn pointing down (+y) from the hand at (0,0)
  ctx.fillStyle = '#3a2616'; ctx.fillRect(-1.2, -4, 2.4, 5);
  ctx.fillStyle = '#c9a04a'; Draw.rr(ctx, -4, 0.5, 8, 2, 1); ctx.fill();
  const g = ctx.createLinearGradient(-2, 0, 2, 0);
  g.addColorStop(0, '#eef2ff'); g.addColorStop(0.5, '#a8b0c8'); g.addColorStop(1, '#5a6078');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-1.8, 2.5); ctx.lineTo(1.8, 2.5); ctx.lineTo(1.4, 15); ctx.lineTo(0, 18); ctx.lineTo(-1.4, 15); ctx.closePath(); ctx.fill();
}

/* =========================== MINI ENEMIES =========================== */
class Crawler {
  constructor(x, y) {
    this.w = 30; this.h = 22;
    this.x = x; this.y = y - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1;
    this.hp = 4; this.flash = 0; this.kb = 0; this.dead = false;
    this.anim = Math.random() * 10; this.shards = 3; this.contact = 1;
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
        if (!g.world.standable(tx, footTy) || g.world.solid(tx, midTy) || g.world.isHazard(tx, footTy - 1) || g.world.isHazard(tx, footTy)) this.dir *= -1;
      }
      this.vx = this.dir * 55 * (this.speedMul || 1);
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
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, this.x + this.w / 2, this.y + this.h, 15, 3);
    ctx.translate(this.x + this.w / 2, this.y + this.h);
    ctx.scale(this.dir, 1);
    ctx.strokeStyle = c('#120e1a'); ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ph = Math.sin(this.anim * 14 + i * 2) * 2.5;
      ctx.beginPath(); ctx.moveTo(-8 + i * 7, -6); ctx.lineTo(-11 + i * 7 + ph, -3); ctx.lineTo(-10 + i * 7 + ph, 0); ctx.stroke();
    }
    // armored shell with highlights
    ctx.fillStyle = f ? '#fff' : shade(ctx, -2, -12, 16, '#7a6aa0', '#3b2f57', '#120c1e');
    ctx.beginPath(); ctx.ellipse(0, -9, 15, 11, 0, Math.PI, 0); ctx.lineTo(15, -5); ctx.lineTo(-15, -5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c('rgba(10,6,18,0.7)'); ctx.lineWidth = 1.3;
    Draw.line(ctx, -6, -19.5, -5, -5); Draw.line(ctx, 3, -19.5, 4, -5);
    if (!f) { ctx.fillStyle = 'rgba(220,200,255,0.35)'; Draw.ell(ctx, -6, -15, 5, 2, -0.3); }
    ctx.fillStyle = f ? '#fff' : shade(ctx, 12, -8, 6, '#d8cff0', '#8a7cab', '#3a2f50'); Draw.ell(ctx, 12, -8, 6, 5);
    ctx.fillStyle = c('#6cff9a'); if (!f) setGlow(ctx, '#3dff7a', 8);
    Draw.circ(ctx, 14, -9, 1.8);
    clearGlow(ctx);
    ctx.strokeStyle = c('#a99cc8'); ctx.lineWidth = 1;
    Draw.line(ctx, 15, -12, 21, -17 + Math.sin(this.anim * 6)); Draw.line(ctx, 13, -12, 17, -19 + Math.cos(this.anim * 6));
    ctx.restore();
  }
}

class Bat {
  constructor(x, y) {
    this.w = 26; this.h = 18;
    this.x = x; this.y = y; this.home = { x, y };
    this.vx = 0; this.vy = 0; this.hp = 2; this.flash = 0; this.kb = 0; this.dead = false;
    this.state = 'idle'; this.anim = Math.random() * 10; this.shards = 3; this.contact = 1; this.facing = 1;
  }
  update(dt, g) {
    this.anim += dt; this.flash -= dt;
    const p = g.player;
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2), dy = (p.y + p.h / 2) - (this.y + this.h / 2);
    const d = Math.hypot(dx, dy);
    const dh = Math.hypot((p.x - this.home.x), (p.y - this.home.y));
    if (this.kb > 0) { this.kb -= dt; this.vx *= 0.9; this.vy *= 0.9; }
    else if (this.state === 'idle') {
      const tx = this.home.x + Math.sin(this.anim * 1.3) * 30, ty = this.home.y + Math.sin(this.anim * 2.1) * 12;
      this.vx = (tx - this.x) * 2; this.vy = (ty - this.y) * 2;
      if (d < 200 && !p.dead) this.state = 'chase';
    } else {
      const sp = 115 * (this.speedMul || 1);
      this.vx = approach(this.vx, (dx / (d || 1)) * sp, 360 * dt);
      this.vy = approach(this.vy, (dy / (d || 1)) * sp + Math.sin(this.anim * 6) * 40, 360 * dt);
      // bats are easy to skip: they give up once you get away from their roost
      if (d > 330 || dh > 380 || p.dead) this.state = 'idle';
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
    for (const s of [-1, 1]) {
      ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -10, s * 20, 4, ['#4a2d6a', '#24123a', '#0e0618']);
      ctx.beginPath();
      ctx.moveTo(s * 4, -2);
      ctx.quadraticCurveTo(s * 14, -12 - flap * 8, s * 20, -4 - flap * 6);
      ctx.lineTo(s * 16, 0 - flap * 3); ctx.lineTo(s * 12, -1 - flap * 2); ctx.lineTo(s * 8, 3);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c('rgba(150,110,200,0.4)'); ctx.lineWidth = 0.6;
      Draw.line(ctx, s * 4, -2, s * 16, 0 - flap * 3); Draw.line(ctx, s * 4, -2, s * 12, -1 - flap * 2);
    }
    ctx.fillStyle = f ? '#fff' : shade(ctx, 0, 0, 8, '#7a5a9a', '#45295f', '#160a24'); Draw.ell(ctx, 0, 0, 7, 8);
    Draw.poly(ctx, [-5, -6, -3, -12, -1, -7]); Draw.poly(ctx, [5, -6, 3, -12, 1, -7]);
    ctx.fillStyle = c('#ff3355'); if (!f) setGlow(ctx, '#ff0033', 8);
    Draw.circ(ctx, -1, -2, 1.5); Draw.circ(ctx, 3.5, -2, 1.5);
    clearGlow(ctx);
    ctx.fillStyle = c('#fff'); Draw.poly(ctx, [0, 3, 1.4, 3, 0.7, 5.5]); Draw.poly(ctx, [2.4, 3, 3.8, 3, 3.1, 5.5]);
    ctx.restore();
  }
}

// Skitter Skull: a skull on spider legs that hops toward you. It serves the Grave Warden (the boss of Level 10).
// Jump over it or slash it.
class Skitter {
  constructor(x, y) {
    this.w = 22; this.h = 20;
    this.x = x; this.y = y - this.h;
    this.vx = 0; this.vy = 0; this.hp = 2; this.flash = 0; this.dead = false;
    this.hopT = 1 + Math.random(); this.anim = Math.random() * 10; this.shards = 3; this.contact = 1;
    this.facing = -1; this.squash = 0; this.home = x;
  }
  update(dt, g) {
    this.anim += dt; this.flash -= dt; this.squash = Math.max(0, this.squash - dt * 4);
    const p = g.player;
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2);
    const wasGround = this.onGround;
    if (this.onGround) {
      this.vx = approach(this.vx, 0, 900 * dt);
      this.hopT -= dt;
      if (this.hopT <= 0) {
        const near = Math.abs(dx) < 260 && Math.abs(p.y - this.y) < 120 && !p.dead;
        this.facing = near ? Math.sign(dx) || 1 : (this.x > this.home ? -1 : 1);
        const tx = Math.floor((this.x + this.w / 2 + this.facing * 70) / TILE), ty = Math.floor((this.y + this.h + 4) / TILE);
        if (g.world.standable(tx, ty) && !g.world.isHazard(tx, ty - 1)) { this.vy = -520; this.vx = this.facing * 140 * (this.speedMul || 1); Sfx.play('skitter'); }
        this.hopT = near ? 0.9 : 1.6;
      }
    }
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
    moveEntity(g.world, this, dt);
    if (!wasGround && this.onGround) this.squash = 1;
  }
  hurt(dmg, dir, g) {
    this.hp -= dmg; this.flash = 0.12;
    if (dir) { this.vx = dir * 240; this.vy = -200; }
    g.burst(this.x + this.w / 2, this.y + this.h / 2, 6, '#e8e0cc', 160);
    if (this.hp <= 0) g.killEnemy(this);
  }
  draw(ctx, t) {
    const f = this.flash > 0;
    const c = (col) => (f ? '#ffffff' : col);
    const cx = this.x + this.w / 2, by = this.y + this.h;
    if (this.onGround) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, cx, by, 12, 3); }
    ctx.save();
    ctx.translate(cx, by);
    const sq = this.squash, air = !this.onGround;
    ctx.scale(this.facing, 1);
    // spider legs
    ctx.strokeStyle = c('#1a1418'); ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const s = i < 2 ? -1 : 1, k = i % 2;
      const wig = Math.sin(this.anim * 16 + i) * (air ? 0 : 1.5);
      const kx = s * (8 + k * 3), ky = air ? -14 : -13 + wig;
      const fx = s * (12 + k * 4), fy = air ? -4 : 0;
      ctx.beginPath(); ctx.moveTo(s * 3, -9); ctx.lineTo(kx, ky - 4); ctx.lineTo(fx, fy); ctx.stroke();
    }
    ctx.scale(1 + sq * 0.2, 1 - sq * 0.2);
    ctx.fillStyle = f ? '#fff' : shade(ctx, 0, -11, 9, '#fffaf0', '#cfc6ae', '#4a4232'); Draw.circ(ctx, 0, -11, 8);
    ctx.fillStyle = f ? '#fff' : shade(ctx, 1, -5, 5, '#f4efe2', '#bdb49c', '#4a4232'); Draw.rr(ctx, -4, -7, 9, 5, 2); ctx.fill();
    ctx.fillStyle = c('#0a0608'); Draw.ell(ctx, -1.5, -11.5, 2.2, 2.6); Draw.ell(ctx, 4, -11.5, 2.2, 2.6);
    ctx.fillStyle = c('#ff3a3a'); if (!f) setGlow(ctx, '#ff0000', 8);
    Draw.circ(ctx, -1.2, -11.2, 0.8); Draw.circ(ctx, 4.3, -11.2, 0.8);
    clearGlow(ctx);
    ctx.strokeStyle = c('#4a4232'); ctx.lineWidth = 0.6;
    for (let x = -3; x <= 4; x += 1.8) Draw.line(ctx, x, -6.5, x, -3);
    ctx.restore();
  }
}

/* =========================== OBBY OBSTACLES =========================== */
// Moving and crumbling platforms. You can stand on them, jump up through them, and drop down with the Down arrow.
class Platform {
  constructor(o) {
    this.kind = o.kind; // 'move' | 'crumble'
    this.w = o.w * TILE; this.h = 14;
    this.x0 = o.x * TILE; this.y0 = o.y * TILE;
    this.x = this.x0; this.y = this.y0;
    this.ax = (o.dx || 0) * TILE; this.ay = (o.dy || 0) * TILE;
    this.period = o.period || 4; this.phase = o.phase || 0;
    this.dx = 0; this.dy = 0;
    this.state = 'solid'; this.timer = 0; this.shakeX = 0; this.crumbleT = o.crumble || 0.5;
  }
  get active() { return this.state !== 'gone'; }
  update(dt, g) {
    const px = this.x, py = this.y;
    if (this.kind === 'move') {
      const s = (1 - Math.cos(((g.time + this.phase) / this.period) * Math.PI * 2)) / 2;
      this.x = this.x0 + this.ax * s; this.y = this.y0 + this.ay * s;
    } else {
      this.timer -= dt;
      if (this.state === 'shaking') {
        this.shakeX = Math.sin(g.time * 70) * 1.5;
        if (this.timer <= 0) { this.state = 'falling'; this.timer = 0.6; this.vy = 0; Sfx.play('crumble'); }
      } else if (this.state === 'falling') {
        this.vy += 1600 * dt; this.y += this.vy * dt;
        if (this.timer <= 0) { this.state = 'gone'; this.timer = 2.4; }
      } else if (this.state === 'gone' && this.timer <= 0) {
        this.state = 'solid'; this.y = this.y0; this.shakeX = 0;
      }
    }
    this.dx = this.x - px; this.dy = this.y - py;
  }
  stoodOn() { if (this.kind === 'crumble' && this.state === 'solid') { this.state = 'shaking'; this.timer = this.crumbleT; } }
  draw(ctx, t) {
    if (this.state === 'gone') {
      ctx.globalAlpha = 0.15; ctx.strokeStyle = '#a99cc8'; ctx.setLineDash([4, 4]);
      ctx.strokeRect(this.x0, this.y0, this.w, this.h); ctx.setLineDash([]); ctx.globalAlpha = 1;
      return;
    }
    const x = this.x + this.shakeX, y = this.y;
    if (this.kind === 'move') {
      // iron-banded wooden raft hanging on glowing runes
      ctx.fillStyle = lin(ctx, 0, y, 0, y + this.h, ['#8a6244', '#5a3c26', '#2a1a10']);
      Draw.rr(ctx, x, y, this.w, this.h, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,4,0.6)'; ctx.lineWidth = 1;
      for (let i = 12; i < this.w; i += 12) Draw.line(ctx, x + i, y + 2, x + i, y + this.h - 1);
      ctx.fillStyle = '#4a4a58'; ctx.fillRect(x + 4, y + 1, 4, this.h - 2); ctx.fillRect(x + this.w - 8, y + 1, 4, this.h - 2);
      ctx.fillStyle = 'rgba(255,220,170,0.3)'; ctx.fillRect(x + 2, y + 1, this.w - 4, 2);
      setGlow(ctx, '#b98cff', 10); ctx.fillStyle = '#c9a8ff';
      Draw.circ(ctx, x + this.w / 2, y + this.h + 3 + Math.sin(t * 4) * 1, 2.5);
      clearGlow(ctx);
    } else {
      // cracked stone slab
      ctx.fillStyle = lin(ctx, 0, y, 0, y + this.h, ['#6a6080', '#3e3654', '#1e1a2c']);
      Draw.rr(ctx, x, y, this.w, this.h, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(10,6,18,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + this.w * 0.3, y); ctx.lineTo(x + this.w * 0.4, y + 6); ctx.lineTo(x + this.w * 0.33, y + this.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + this.w * 0.7, y); ctx.lineTo(x + this.w * 0.62, y + 8); ctx.stroke();
      ctx.fillStyle = 'rgba(230,220,255,0.25)'; ctx.fillRect(x + 2, y + 1, this.w - 4, 2);
      if (this.state === 'shaking') { ctx.fillStyle = 'rgba(255,120,60,0.25)'; Draw.rr(ctx, x, y, this.w, this.h, 2); ctx.fill(); }
    }
  }
}

// Bounce fungus: a pale glowing mushroom that launches you high into the air.
class JumpPad {
  constructor(o) { this.x = o.x * TILE + 2; this.y = (o.y + 1) * TILE - 14; this.w = TILE - 4; this.h = 14; this.squish = 0; }
  update(dt, g) {
    this.squish = Math.max(0, this.squish - dt * 4);
    const p = g.player;
    if (p.dead || p.hazardT > 0) return;
    if (p.vy >= 0 && rectsOverlap(p, { x: this.x, y: this.y - 2, w: this.w, h: this.h + 2 })) {
      p.vy = -PHYS.PAD; p.jumping = false; p.canDash = true; p.airJumps = 1; p.platform = null; p.dashT = 0;
      p.y = Math.min(p.y, this.y - p.h);
      this.squish = 1;
      Sfx.play('pad');
      g.burst(this.x + this.w / 2, this.y, 10, '#9ff0ff', 200);
    }
  }
  draw(ctx, t) {
    const x = this.x + this.w / 2, y = this.y + this.h;
    const sq = this.squish;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, x, y, 15, 3);
    ctx.fillStyle = lin(ctx, x - 4, 0, x + 4, 0, ['#d8e4e8', '#8a9aa0']);
    ctx.fillRect(x - 4, y - 9, 8, 9);
    ctx.save(); ctx.translate(x, y - 8); ctx.scale(1 + sq * 0.35, 1 - sq * 0.45);
    setGlow(ctx, '#5ae0ff', 14);
    ctx.fillStyle = shade(ctx, 0, -6, 15, '#e8ffff', '#6ad8f0', '#123a4a');
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    clearGlow(ctx);
    ctx.strokeStyle = 'rgba(10,40,50,0.5)'; ctx.lineWidth = 0.7;
    for (let i = -12; i <= 12; i += 4) Draw.line(ctx, i * 0.3, -1, i, 0);
    ctx.fillStyle = 'rgba(230,255,255,0.8)';
    for (const [dx, dy, r] of [[-7, -5, 1.6], [3, -8, 1.3], [8, -3, 1.1], [-1, -4, 1]]) Draw.circ(ctx, dx, dy, r);
    ctx.restore();
    // drifting spores
    ctx.fillStyle = 'rgba(160,240,255,0.7)';
    for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; Draw.circ(ctx, x - 6 + i * 6 + Math.sin(t * 2 + i) * 3, y - 20 - k * 22, 1.2 * (1 - k)); }
  }
}

// A chain of fireballs spinning around a skull anchor. Touching the fire sends you back.
class FireBar {
  constructor(o) { this.cx = o.x * TILE + 16; this.cy = o.y * TILE + 16; this.n = o.n || 4; this.speed = o.speed || 1.6; this.angle = o.phase || 0; }
  balls() {
    const out = [];
    for (let i = 1; i <= this.n; i++) out.push({ x: this.cx + Math.cos(this.angle) * i * 18, y: this.cy + Math.sin(this.angle) * i * 18 });
    return out;
  }
  update(dt, g) {
    this.angle += this.speed * dt;
    const p = g.player;
    if (p.dead) return;
    const hb = { x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 };
    for (const b of this.balls()) {
      const nx = clamp(b.x, hb.x, hb.x + hb.w), ny = clamp(b.y, hb.y, hb.y + hb.h);
      if ((nx - b.x) ** 2 + (ny - b.y) ** 2 < 8 * 8) { g.playerDied(); return; }
    }
  }
  draw(ctx, t) {
    ctx.fillStyle = shade(ctx, this.cx, this.cy, 11, '#fffaf0', '#cfc6ae', '#4a4232');
    Draw.circ(ctx, this.cx, this.cy, 10);
    ctx.fillStyle = '#120a14'; Draw.circ(ctx, this.cx - 3.5, this.cy - 1, 2.6); Draw.circ(ctx, this.cx + 3.5, this.cy - 1, 2.6);
    setGlow(ctx, '#ff5a00', 16);
    for (const b of this.balls()) {
      ctx.fillStyle = shade(ctx, b.x, b.y, 9, '#fff8c0', '#ffa020', '#c02800');
      Draw.circ(ctx, b.x, b.y, 8 + Math.sin(t * 20 + b.x) * 0.8);
    }
    clearGlow(ctx);
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
    if (this.type === 'seed') { // bone shard
      ctx.translate(cx, cy); ctx.rotate(this.t * 10);
      ctx.fillStyle = shade(ctx, 0, 0, 7, '#ffffff', '#d8d0b8', '#5a5240'); Draw.rr(ctx, -7, -2, 14, 4, 2); ctx.fill(); Draw.circ(ctx, -7, -2, 2.4); Draw.circ(ctx, -7, 2, 2.4); Draw.circ(ctx, 7, -2, 2.4); Draw.circ(ctx, 7, 2, 2.4);
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
      ctx.fillStyle = shade(ctx, 0, 0, 10, '#7a6c96', '#3a2f4f', '#120c1e'); Draw.poly(ctx, [-9, -6, 0, -10, 9, -4, 7, 8, -6, 9]);
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

/* =========================== SHARDS =========================== */
// Glowing crystal shards to collect. Small = 1, big = 5. Spend them on heads in the shop.
class Shard {
  constructor(x, y, opts = {}) {
    this.big = !!opts.big; this.value = this.big ? 5 : 1;
    this.w = this.big ? 18 : 12; this.h = this.w;
    this.x = x - this.w / 2; this.y = y - this.h / 2;
    this.physics = !!opts.drop; this.vx = this.physics ? rand(-160, 160) : 0; this.vy = this.physics ? rand(-520, -260) : 0;
    this.delay = this.physics ? 0.35 : 0; this.t = Math.random() * 6; this.dead = false;
  }
  update(dt, g) {
    this.t += dt; this.delay -= dt;
    const p = g.player;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const dx = (p.x + p.w / 2) - cx, dy = (p.y + p.h / 2) - cy, d = Math.hypot(dx, dy);
    if (this.delay <= 0 && d < 64 && !p.dead) {
      this.physics = false;
      this.x += (dx / d) * 440 * dt; this.y += (dy / d) * 440 * dt;
    } else if (this.physics) {
      this.vy = Math.min(this.vy + PHYS.GRAV * dt, 700); this.vx *= 0.99;
      moveEntity(g.world, this, dt);
      if (this.onGround) this.vx *= 0.8;
    }
    if (d < 20 && this.delay <= 0 && !p.dead) { this.dead = true; g.collectShard(this); }
  }
  draw(ctx, t) {
    const bob = this.physics ? 0 : Math.sin(this.t * 3) * 3;
    const s = this.big ? 1.6 : 1;
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2 + bob);
    ctx.rotate(Math.sin(this.t * 1.5) * 0.15);
    ctx.scale(s, s);
    setGlow(ctx, this.big ? '#c070ff' : '#5ae0ff', 12);
    ctx.fillStyle = this.big ? lin(ctx, -5, -8, 5, 8, ['#f8e8ff', '#c070ff', '#4a1a8a']) : lin(ctx, -5, -8, 5, 8, ['#effdff', '#5ad8f0', '#0e4a6a']);
    Draw.poly(ctx, [0, -8, 5, -2, 3, 7, -3, 7, -5, -2]);
    clearGlow(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; Draw.poly(ctx, [0, -8, 1.5, -2, -2, 5, -3.5, -2]);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.6; Draw.line(ctx, 0, -8, 0.5, 7);
    // sparkle
    const sp = (Math.sin(this.t * 4) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${sp})`; Draw.poly(ctx, [4, -6, 4.6, -4.6, 6, -4, 4.6, -3.4, 4, -2, 3.4, -3.4, 2, -4, 3.4, -4.6]);
    ctx.restore();
  }
}

/* =========================== FX =========================== */
function makeParticle(x, y, vx, vy, life, color, size, grav = 600) {
  return { x, y, vx, vy, life, max: life, color, size, grav };
}
