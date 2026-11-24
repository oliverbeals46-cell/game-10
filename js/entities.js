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
    this.dropT = 0; this.hazardT = 0; this.anim = 0; this.landT = 0; this.spinT = 0; this.spinCd = 0; this.slamCd = 0;
    this.platform = null; this.airJumps = 1 + this.st.airJumps; this.airDashLeft = 1 + this.st.airDashes; this.shield = this.st.shield;
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

  // Every level, every creature: touching a monster (or anything a boss throws) = you die and go back to your checkpoint.
  hurt(g, dmg, srcX) {
    if (this.dead || this.invuln > 0) return false; // brief protection right after respawning
    if (this.st.dashSafe && this.dashT > 0) return false;   // Cranberry Blob: can't be hurt while dashing
    if (this.phantomT > 0) return false;                     // Phantom Dash passes straight through
    if (this.shield > 0) {                                  // Nutcracker: one free hit per checkpoint
      this.shield--; this.invuln = 1;
      this.vx = (this.x + this.w / 2 < (srcX || 0) ? -1 : 1) * 300; this.vy = -320; this.ctrlLock = 0.2;
      Sfx.play('bump'); g.ring(this.x + this.w / 2, this.y + this.h / 2, '#d4af37', 40); g.toast('Iron jaw saved you!', 1.2);
      return true;
    }
    g.playerDied();
    return true;
  }

  update(dt, g) {
    const w = g.world, I = Input;
    this.anim += dt;
    this.invuln -= dt; this.ctrlLock -= dt; this.dashCd -= dt; this.attackCd -= dt; this.boltCd -= dt;
    this.dropT -= dt; this.landT -= dt; this.flipT = (this.flipT || 0) - dt;
    if (this.attackT > 0) this.attackT -= dt;


    const ix = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    const downHeld = I.down('down');

    if (this.onGround) { this.coyote = 0.1 * this.st.coyote; this.canDash = true; this.airJumps = 1 + this.st.airJumps; this.airDashLeft = 1 + this.st.airDashes; } else this.coyote -= dt;
    if (I.pressed('jump')) this.jumpBuf = 0.13; else this.jumpBuf -= dt;

    this.wallSlide = 0;
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir * PHYS.DASH_SPEED * (this.phantomT > 0 ? 1.3 : 1);
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
          this.flipT = 0.32;
          this.vy = -PHYS.JUMP * 0.9 * this.st.jump * this.st.airJumpPow;
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
      if (!this.onGround) { this.airDashLeft--; if (this.airDashLeft <= 0) this.canDash = false; }
      this.jumping = false; this.ctrlLock = 0; this.platform = null;
      Sfx.play('dash');
    }

    // Attack
    if (I.pressed('attack') && this.attackCd <= 0 && this.dashT <= 0) {
      this.attackDir = I.down('up') ? 'up' : (downHeld && !this.onGround) ? 'down' : 'side';
      this.attackT = 0.14; this.attackCd = 0.26 * this.st.atkCd;
      this.hitSet = new Set(); this.pogoDone = false;
      Sfx.play('swing');
    }
    if (this.attackT > 0) g.resolvePlayerAttack(this);

    // Spin Slash (unlocks after Level 40): sword spins all the way around you
    this.spinCd -= dt;
    if (this.spinT > 0) { this.spinT -= dt; g.resolveSpin(this); }
    if (I.pressed('spin')) {
      if (!Save.data.unlocks.spin) g.toast('Spin Slash unlocks after Level 40!', 1.8);
      else if (this.spinCd <= 0 && this.dashT <= 0) { this.spinT = 0.32; this.spinCd = 1.4 * this.st.spinCd; this.spinHits = new Set(); Sfx.play('spin'); }
    }

    // Phantom Dash (unlocks after Level 80): a long ghostly dash through monsters and bullets
    this.phantomCd = (this.phantomCd || 0) - dt; this.phantomT = (this.phantomT || 0) - dt;
    if (I.pressed('phantom')) {
      if (!Save.data.unlocks.phantom) g.toast('Phantom Dash unlocks after Level 80!', 1.8);
      else if (this.phantomCd <= 0) {
        this.dashDir = ix || this.facing; this.facing = this.dashDir;
        this.dashT = 0.3; this.phantomT = 0.36; this.phantomCd = 1.3; this.phantomHits = new Set(); this.jumping = false; this.platform = null;
        Sfx.play('dash'); Sfx.play('bolt');
      }
    }

    // Ground Slam (unlocks after Level 60): shockwaves roll both ways along the ground
    this.slamCd -= dt;
    if (I.pressed('slam')) {
      if (!Save.data.unlocks.slam) g.toast('Ground Slam unlocks after Level 60!', 1.8);
      else if (this.slamCd <= 0 && this.onGround) {
        this.slamCd = 1.5; this.landT = 0.12;
        for (const v of [-1, 1]) { const pw = new Projectile('pwave', this.x + this.w / 2 - 13 + v * 14, this.y + this.h - 26, v * 520, 0); pw.dmg = 4; g.projectiles.push(pw); }
        g.shake = Math.max(g.shake, 8); g.ring(this.x + this.w / 2, this.y + this.h, '#ffffff', 50); g.dust(this.x + this.w / 2, this.y + this.h, 10); Sfx.play('slam');
      }
    }

    // Wisp Bolt (unlocks after Level 20) — runs on a cooldown, no meter
    if (I.pressed('spell')) {
      if (!Save.data.unlocks.wisp) g.toast('Wisp Bolt unlocks after Level 20!', 1.8);
      else if (this.boltCd <= 0) {
        this.boltCd = BOLT_CD * this.st.boltCd;
        g.projectiles.push(new Projectile('wisp', this.facing > 0 ? this.x + this.w : this.x - 30, this.y + 6, this.facing * 720, 0));
        if (this.st.doubleBolt) g.projectiles.push(new Projectile('wisp', this.facing > 0 ? this.x + this.w : this.x - 30, this.y - 14, this.facing * 720, -40));
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
// ---------- realistic player animation (visual only; physics are unchanged) ----------
// Pose is built from a simple skeleton: hips, knees, feet, shoulders, hands. Angles in radians,
// measured like canvas rotation (0 = pointing forward, +π/2 = straight down), facing right.
// Darken a #rrggbb colour by k (0 = same, 1 = black).
function darken(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function limb(ctx, x1, y1, x2, y2, x3, y3, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
}

function drawPlayer(ctx, p, t) {
  if (p.dead) return;
  let alpha = p.ghost !== undefined ? p.ghost : 1;
  if (p.invuln > 0 && p.ghost === undefined && Math.floor(t * 18) % 2 === 0) alpha *= 0.45;
  const cx = p.x + p.w / 2, by = p.y + p.h;
  const accent = headById(p.head).accent;
  const speed = clamp(Math.abs(p.vx) / 250, 0, 1.2);
  const running = p.onGround && Math.abs(p.vx) > 30;
  const air = !p.onGround, dashing = p.dashT > 0;
  const ph = (p.anim || 0) * 13;
  const fwdVel = p.vx * p.facing;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (p.onGround && p.ghost === undefined) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, cx, by, 12 - (p.landT > 0 ? 0 : 0), 3); }
  ctx.translate(cx, by);
  ctx.scale(p.facing, 1);
  if (p.flipT > 0) { const k = 1 - p.flipT / 0.32; ctx.translate(0, -16); ctx.rotate(k * Math.PI * 2); ctx.translate(0, 16); }

  // ---- body pose ----
  let crouch = p.landT > 0 ? 3.2 * (p.landT / 0.12) : 0;
  let bob = 0, lean = 0;
  if (dashing) lean = 0.42;
  else if (running) { bob = Math.abs(Math.sin(ph)) * 1.6; lean = 0.08 + 0.1 * speed; }
  else if (!air) bob = Math.sin(t * 2.2) * 0.45; // breathing
  if (air && !dashing) lean = clamp(fwdVel / 2600, -0.08, 0.14);
  if (dashing) crouch = 2.5;
  const hipY = -11 - bob + crouch;
  const shX = Math.sin(lean) * 11, shY = hipY - Math.cos(lean) * 11;

  // ---- legs ----
  const legPose = (side) => {
    let th, kn;
    if (dashing) { th = side ? -1.0 : 0.35; kn = side ? 0.5 : 1.0; }
    else if (air) {
      if (p.vy < 0) { th = side ? -0.25 : 0.75; kn = side ? 0.7 : 1.35; }  // tucked while rising
      else { th = side ? -0.3 : 0.3; kn = side ? 0.35 : 0.25; }           // reaching for the ground
    } else if (running) {
      const s = Math.min(1, speed);
      th = Math.sin(ph + side * Math.PI) * 0.8 * s;
      kn = 0.15 + Math.max(0, Math.sin(ph + side * Math.PI + 1.3)) * 1.2 * s;
    } else { th = side ? -0.1 : 0.12; kn = 0.12; }
    kn += crouch * 0.28; th += side ? -crouch * 0.12 : crouch * 0.12;
    const hx = side ? -1.6 : 1.6;
    const kx = hx + Math.sin(th) * 6, ky = hipY + Math.cos(th) * 6;
    const sa = th - kn;
    const fx = kx + Math.sin(sa) * 6, fy = ky + Math.cos(sa) * 6;
    return { hx, kx, ky, fx, fy, sa };
  };
  const drawLeg = (side) => {
    const L = legPose(side);
    limb(ctx, L.hx, hipY, L.kx, L.ky, L.fx, L.fy, 3.6, side ? '#15111d' : '#221c30');
    ctx.save(); ctx.translate(L.fx, L.fy); ctx.rotate(-L.sa * 0.3);
    ctx.fillStyle = side ? '#1a120c' : '#3a2616'; Draw.rr(ctx, -2, -2, 6.5, 3.2, 1.3); ctx.fill();
    ctx.restore();
  };

  // ---- arms ----
  const armSwing = running ? Math.sin(ph) * 0.9 * Math.min(1, speed) : 0;
  const backArmA = dashing ? 2.6 : air ? (p.vy < 0 ? -0.6 : 0.9) : 1.45 + armSwing;
  const drawBackArm = () => {
    const ex = shX - 1 + Math.cos(backArmA) * 4, ey = shY + 1 + Math.sin(backArmA) * 4;
    const hx = ex + Math.cos(backArmA + 0.35) * 4, hy = ey + Math.sin(backArmA + 0.35) * 4;
    limb(ctx, shX - 1, shY + 1, ex, ey, hx, hy, 2.8, '#17121f');
  };

  // ---- scarf: a darker, tapered, tattered cloth that blows with movement ----
  const drawScarf = () => {
    const wind = clamp(Math.abs(fwdVel) / 250, 0, 1.6) + (dashing ? 1.2 : 0);
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const wave = Math.sin(t * 10 - i * 1.1) * (0.6 + wind * 1.2) * (i / 5);
      pts.push([shX - 2 - i * (1.4 + wind * 2.2), shY + 1 + i * (2.4 - wind * 1.2) + wave + (air ? p.vy * 0.0035 * i : 0)]);
    }
    const top = [], bot = [];
    pts.forEach(([x, y], i) => { const w = 2.2 * (1 - i / 6); top.push([x, y - w]); bot.push([x + (i === 5 ? -1.5 : 0), y + w]); });
    ctx.fillStyle = darken(accent, 0.45);
    ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
    for (const [x, y] of top) ctx.lineTo(x, y);
    const [ex, ey] = pts[5]; ctx.lineTo(ex - 2, ey + 1.5); ctx.lineTo(ex, ey + 0.5); ctx.lineTo(ex - 1.2, ey + 3); // frayed tip
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath(); ctx.fill();
  };

  // ---- cloak ----
  const drawCloak = () => {
    const wind = -(fwdVel) * 0.012 - (dashing ? 6 : 0);
    const lift = air ? clamp(-p.vy * 0.006, -4, 4) : 0;
    const g = ctx.createLinearGradient(shX - 8, shY, shX + 8, hipY + 5);
    g.addColorStop(0, '#4a4166'); g.addColorStop(0.55, '#2c2640'); g.addColorStop(1, '#120e1c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(shX - 6, shY);
    ctx.quadraticCurveTo(shX, shY - 2, shX + 6, shY);
    ctx.lineTo(9 + Math.min(0, wind) * 0.2 - lift, hipY + 5 - lift * 0.5);
    for (let i = 0; i <= 4; i++) {
      const hx = 9 - i * 4.5 + wind * (i / 4) - lift * 0.3;
      ctx.lineTo(hx, hipY + 5 + (i % 2 ? 1.5 : 0) + Math.sin(t * 6 + i) * 0.6 - lift * (0.5 + i * 0.2));
    }
    ctx.lineTo(-9 + wind - lift, hipY + 3 - lift);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8;
    Draw.line(ctx, shX - 2, shY + 2, -3 + wind * 0.5, hipY + 4); Draw.line(ctx, shX + 3, shY + 2, 3 + wind * 0.3, hipY + 4);
    // belt
    const bx = (shX + 0) * 0.45, byy = (shY + hipY) / 2 + 3;
    ctx.fillStyle = '#3a2616'; ctx.save(); ctx.translate(bx, byy); ctx.rotate(lean); ctx.fillRect(-7, -1.2, 14, 2.4); ctx.fillStyle = '#c9a04a'; ctx.fillRect(1, -1.6, 3, 3); ctx.restore();
    // collar
    ctx.fillStyle = accent; Draw.rr(ctx, shX - 6.5, shY - 1.5, 13, 3.8, 1.8); ctx.fill();
  };

  // ---- sword arm (idle / moving) ----
  const reach = p.st ? p.st.reach : 1;
  const drawSwordArm = () => {
    let a, blade;
    if (dashing) { a = 2.5; blade = 3.0; }
    else if (air) { a = p.vy < 0 ? 0.9 : 1.1; blade = p.vy < 0 ? 2.2 : 1.7; }
    else if (running) { a = 1.6 - armSwing * 0.8; blade = 2.45 - armSwing * 0.4; }
    else { a = 1.2 + Math.sin(t * 2.2) * 0.04; blade = 1.5; }
    const ex = shX + 1 + Math.cos(a) * 4, ey = shY + 1 + Math.sin(a) * 4;
    const hx = ex + Math.cos(a - 0.3) * 4, hy = ey + Math.sin(a - 0.3) * 4;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(blade); drawBlade(ctx, 17 * reach); ctx.restore();
    limb(ctx, shX + 1, shY + 1, ex, ey, hx, hy, 2.9, '#2c2640');
  };

  // ---- attack swing with motion smear ----
  const drawAttack = () => {
    const k = clamp(1 - p.attackT / 0.14, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    const arcs = { side: [-2.1, 1.05], up: [0.7, -2.7], down: [-0.7, 2.7] };
    const [a0, a1] = arcs[p.attackDir] || arcs.side;
    const a = a0 + (a1 - a0) * e;
    const ox = shX + 1, oy = shY + 1;
    const L = 17 * reach, R2 = 8 + L + 4, R1 = 9;
    // smear: a tapered crescent from where the blade started to where it is now
    const fade = 1 - Math.max(0, (k - 0.55) / 0.45);
    const dir = a1 > a0 ? 1 : -1;
    const start = a0 + (a1 - a0) * Math.max(0, e - 0.65);
    const g = ctx.createRadialGradient(ox, oy, R1, ox, oy, R2 + 4);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, `rgba(255,255,255,${0.35 * fade})`);
    g.addColorStop(0.88, `rgba(255,255,255,${0.9 * fade})`); g.addColorStop(1, accent);
    ctx.save();
    ctx.globalAlpha = alpha * fade;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox, oy, R2, start, a, dir < 0);
    ctx.arc(ox, oy, R1 + (R2 - R1) * 0.45, a, start, dir > 0);
    ctx.closePath(); ctx.fill();
    // speed lines inside the smear
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * fade})`; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const r = R2 - 3 - i * 4; ctx.beginPath(); ctx.arc(ox, oy, r, start + (a - start) * 0.25, a - (a - start) * 0.05, dir < 0); ctx.stroke(); }
    ctx.restore();
    // arm + blade at the current angle
    const hx = ox + Math.cos(a) * 8, hy = oy + Math.sin(a) * 8;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); drawBlade(ctx, L, true); ctx.restore();
    limb(ctx, ox, oy, ox + Math.cos(a) * 4, oy + Math.sin(a) * 4 + 0.5, hx, hy, 3, '#2c2640');
  };

  if (p.spinT > 0) {
    const k = 1 - p.spinT / 0.32, a = k * Math.PI * 4;
    ctx.save(); ctx.translate(0, -16);
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = alpha * (0.5 - i * 0.12);
      ctx.strokeStyle = i ? accent : '#ffffff'; ctx.lineWidth = 6 - i * 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 34 + i * 6, a - 1.6 - i * 0.3, a); ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.rotate(a); ctx.translate(10, 0); drawBlade(ctx, 22, true);
    ctx.restore();
  }
  drawLeg(1);
  drawBackArm();
  drawScarf();
  drawCloak();
  drawLeg(0);
  if (p.attackT > 0) {
    // head first so the slash sweeps in front of it
    ctx.save(); ctx.translate(shX * 0.9, shY - 9 + (running ? -Math.abs(Math.sin(ph)) * 0.6 : 0)); ctx.scale(0.92, 0.92);
    drawHead(ctx, p.head, t);
    ctx.restore();
    drawAttack();
  } else {
    drawSwordArm();
    ctx.save(); ctx.translate(shX * 0.9, shY - 9 + (running ? -Math.abs(Math.sin(ph)) * 0.6 : 0)); ctx.rotate(lean * 0.4); ctx.scale(0.92, 0.92);
    drawHead(ctx, p.head, t);
    ctx.restore();
  }
  ctx.restore();
}

// Sword pointing along +x from the hand at (0,0): grip, guard, steel blade with a moving glint.
function drawBlade(ctx, L, swinging) {
  ctx.fillStyle = '#3a2616'; ctx.fillRect(-4, -1.1, 5, 2.2);
  ctx.fillStyle = '#c9a04a'; Draw.circ(ctx, -4.5, 0, 1.4);
  ctx.fillStyle = lin(ctx, 0, -3.5, 0, 3.5, ['#e8c060', '#8a6420']); Draw.rr(ctx, 0.5, -3.5, 2, 7, 0.8); ctx.fill();
  const g = ctx.createLinearGradient(0, -2, 0, 2);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#b8c0d8'); g.addColorStop(1, '#4a5068');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(2.5, -1.8); ctx.lineTo(L - 3, -1.4); ctx.lineTo(L, 0); ctx.lineTo(L - 3, 1.4); ctx.lineTo(2.5, 1.8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,44,60,0.6)'; ctx.lineWidth = 0.5; Draw.line(ctx, 3, 0, L - 4, 0);
  if (swinging) { setGlow(ctx, '#ffffff', 8); ctx.fillStyle = 'rgba(255,255,255,0.9)'; Draw.circ(ctx, L - 4, -0.5, 1.4); clearGlow(ctx); }
}

// Kept for compatibility (old code points the sword down +y)
function drawSword(ctx) { ctx.save(); ctx.rotate(Math.PI / 2); drawBlade(ctx, 17); ctx.restore(); }

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
      this.vx = this.dir * (this.baseSpeed || 55) * (this.speedMul || 1);
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
    const K = this.skin || {};
    const sh3 = K.shell || ['#7a6aa0', '#3b2f57', '#120c1e'];
    ctx.fillStyle = f ? '#fff' : shade(ctx, -2, -12, 16, sh3[0], sh3[1], sh3[2]);
    ctx.beginPath(); ctx.ellipse(0, -9, 15, 11, 0, Math.PI, 0); ctx.lineTo(15, -5); ctx.lineTo(-15, -5); ctx.closePath(); ctx.fill();
    if (K.extra && !f) K.extra(ctx, this, t);
    ctx.strokeStyle = c('rgba(10,6,18,0.7)'); ctx.lineWidth = 1.3;
    Draw.line(ctx, -6, -19.5, -5, -5); Draw.line(ctx, 3, -19.5, 4, -5);
    if (!f) { ctx.fillStyle = 'rgba(220,200,255,0.35)'; Draw.ell(ctx, -6, -15, 5, 2, -0.3); }
    const fc = K.face || ['#d8cff0', '#8a7cab', '#3a2f50'];
    ctx.fillStyle = f ? '#fff' : shade(ctx, 12, -8, 6, fc[0], fc[1], fc[2]); Draw.ell(ctx, 12, -8, 6, 5);
    ctx.fillStyle = c(K.eye || '#6cff9a'); if (!f) setGlow(ctx, K.glow || '#3dff7a', 8);
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
      const K = this.skin || {};
      ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -10, s * 20, 4, K.wing || ['#4a2d6a', '#24123a', '#0e0618']);
      ctx.beginPath();
      ctx.moveTo(s * 4, -2);
      ctx.quadraticCurveTo(s * 14, -12 - flap * 8, s * 20, -4 - flap * 6);
      ctx.lineTo(s * 16, 0 - flap * 3); ctx.lineTo(s * 12, -1 - flap * 2); ctx.lineTo(s * 8, 3);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c('rgba(150,110,200,0.4)'); ctx.lineWidth = 0.6;
      Draw.line(ctx, s * 4, -2, s * 16, 0 - flap * 3); Draw.line(ctx, s * 4, -2, s * 12, -1 - flap * 2);
    }
    const KB = this.skin || {}, bd = KB.body || ['#7a5a9a', '#45295f', '#160a24'];
    ctx.fillStyle = f ? '#fff' : shade(ctx, 0, 0, 8, bd[0], bd[1], bd[2]); Draw.ell(ctx, 0, 0, 7, 8);
    Draw.poly(ctx, [-5, -6, -3, -12, -1, -7]); Draw.poly(ctx, [5, -6, 3, -12, 1, -7]);
    if (KB.extra && !f) KB.extra(ctx, this, t);
    if (KB.replaceFace && !f) { ctx.restore(); return; }
    ctx.fillStyle = c(KB.eye || '#ff3355'); if (!f) setGlow(ctx, KB.glow || '#ff0033', 8);
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
        if (g.world.standable(tx, ty) && !g.world.isHazard(tx, ty - 1)) { this.vy = -(this.hop || 520); this.vx = this.facing * 140 * (this.speedMul || 1); Sfx.play('skitter'); }
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
    const KS = this.skin || {}, sk = KS.skull || ['#fffaf0', '#cfc6ae', '#4a4232'];
    ctx.fillStyle = f ? '#fff' : shade(ctx, 0, -11, 9, sk[0], sk[1], sk[2]); Draw.circ(ctx, 0, -11, 8);
    ctx.fillStyle = f ? '#fff' : shade(ctx, 1, -5, 5, sk[0], sk[1], sk[2]); Draw.rr(ctx, -4, -7, 9, 5, 2); ctx.fill();
    if (KS.extra && !f) KS.extra(ctx, this, t);
    if (KS.replaceFace && !f) { ctx.restore(); return; }
    ctx.fillStyle = c('#0a0608'); Draw.ell(ctx, -1.5, -11.5, 2.2, 2.6); Draw.ell(ctx, 4, -11.5, 2.2, 2.6);
    ctx.fillStyle = c(KS.eye || '#ff3a3a'); if (!f) setGlow(ctx, KS.glow || '#ff0000', 8);
    Draw.circ(ctx, -1.2, -11.2, 0.8); Draw.circ(ctx, 4.3, -11.2, 0.8);
    clearGlow(ctx);
    ctx.strokeStyle = c('#4a4232'); ctx.lineWidth = 0.6;
    for (let x = -3; x <= 4; x += 1.8) Draw.line(ctx, x, -6.5, x, -3);
    ctx.restore();
  }
}

/* ---------- Levels 21–60 mini enemies: themed skins on the three monster shapes ---------- */
const spikes = (col) => (ctx, e) => { ctx.fillStyle = col; for (let i = -9; i <= 6; i += 5) Draw.poly(ctx, [i - 2.5, -16 + Math.abs(i) * 0.3, i + 2.5, -16 + Math.abs(i) * 0.3, i, -24 + Math.abs(i) * 0.3]); };
const cog = (col) => (ctx, e, t) => { ctx.save(); ctx.translate(-2, -12); ctx.rotate(t * 3); ctx.fillStyle = col; for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(4, -1.5, 3, 3); } Draw.circ(ctx, 0, 0, 4.5); ctx.fillStyle = 'rgba(0,0,0,0.5)'; Draw.circ(ctx, 0, 0, 1.6); ctx.restore(); };
const flames = (col) => (ctx, e, t) => { ctx.fillStyle = col; setGlow(ctx, col, 10); for (let i = -6; i <= 6; i += 6) { const h = 6 + Math.sin(t * 20 + i) * 2.5; ctx.beginPath(); ctx.moveTo(i - 3, -17); ctx.quadraticCurveTo(i, -17 - h * 2, i + 3, -17); ctx.fill(); } clearGlow(ctx); };
// A green olive with a red pimento: used by every olive creature.
function drawOlive(ctx, x, y, rx, ry, t, opts = {}) {
  const f = opts.flash;
  ctx.fillStyle = f ? '#fff' : shade(ctx, x, y, Math.max(rx, ry), '#c8e070', '#6a8a2a', '#1a2a06');
  Draw.ell(ctx, x, y, rx, ry);
  if (!f) { ctx.fillStyle = 'rgba(255,255,230,0.45)'; Draw.ell(ctx, x - rx * 0.35, y - ry * 0.45, rx * 0.3, ry * 0.18, -0.4); }
  // pimento: a red mouth that opens wide when screaming
  const open = opts.scream ? 0.75 + Math.sin(t * 40) * 0.15 : 0.35;
  ctx.fillStyle = f ? '#fff' : '#c8102e'; Draw.ell(ctx, x + rx * 0.45, y + ry * 0.15, rx * 0.32, ry * open * 0.6);
  if (!f) { ctx.fillStyle = '#3a0006'; Draw.ell(ctx, x + rx * 0.45, y + ry * 0.18, rx * 0.18, ry * open * 0.35); }
  // wild little eyes
  ctx.fillStyle = f ? '#fff' : '#ffffff'; Draw.circ(ctx, x + rx * 0.05, y - ry * 0.35, rx * 0.2); Draw.circ(ctx, x + rx * 0.55, y - ry * 0.4, rx * 0.2);
  ctx.fillStyle = '#000'; const pd = opts.scream ? rx * 0.07 : rx * 0.1;
  Draw.circ(ctx, x + rx * 0.08, y - ry * 0.33, pd + 0.6); Draw.circ(ctx, x + rx * 0.58, y - ry * 0.38, pd + 0.6);
}

// A creepy clown face: white face paint, red nose, crazy hair, painted grin, empty eyes. Used by every clown.
function drawClownFace(ctx, x, y, r, t, opts = {}) {
  const f = opts.flash;
  // wild rainbow hair tufts
  if (!f) { const hc = ['#ff3a5a', '#ffb020', '#3ac8ff', '#9a5aff']; for (let i = 0; i < 6; i++) { ctx.fillStyle = hc[i % 4]; Draw.circ(ctx, x - r * 1.05 + (i % 3) * r * 0.25, y - r * 0.2 + (i < 3 ? -r * 0.35 : r * 0.2), r * 0.38); Draw.circ(ctx, x + r * 1.05 - (i % 3) * r * 0.25, y - r * 0.2 + (i < 3 ? -r * 0.35 : r * 0.2), r * 0.38); } }
  ctx.fillStyle = f ? '#fff' : shade(ctx, x, y, r * 1.1, '#ffffff', '#ece6e0', '#8a8080'); Draw.circ(ctx, x, y, r);
  // diamond eye paint + hollow eyes
  ctx.fillStyle = f ? '#fff' : '#3a2a6a';
  for (const s of [-1, 1]) Draw.poly(ctx, [x + s * r * 0.38, y - r * 0.62, x + s * r * 0.55, y - r * 0.3, x + s * r * 0.38, y + r * 0.02, x + s * r * 0.21, y - r * 0.3]);
  ctx.fillStyle = f ? '#fff' : '#000'; Draw.circ(ctx, x - r * 0.38, y - r * 0.3, r * 0.12); Draw.circ(ctx, x + r * 0.38, y - r * 0.3, r * 0.12);
  if (!f) { ctx.fillStyle = opts.angry ? '#ff2a2a' : '#ffffff'; setGlow(ctx, opts.angry ? '#ff0000' : '#ffffff', 6); Draw.circ(ctx, x - r * 0.38, y - r * 0.3, r * 0.04 + 0.4); Draw.circ(ctx, x + r * 0.38, y - r * 0.3, r * 0.04 + 0.4); clearGlow(ctx); }
  // big painted grin
  const open = opts.laugh ? 0.35 + Math.abs(Math.sin(t * 18)) * 0.2 : 0.18;
  ctx.fillStyle = f ? '#fff' : '#c8102e';
  ctx.beginPath(); ctx.moveTo(x - r * 0.75, y + r * 0.15); ctx.quadraticCurveTo(x, y + r * (0.55 + open * 1.6), x + r * 0.75, y + r * 0.15); ctx.quadraticCurveTo(x, y + r * 0.45, x - r * 0.75, y + r * 0.15); ctx.fill();
  if (!f) { ctx.fillStyle = '#2a0006'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.42, r * 0.4, r * open, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#fffaf0'; for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * r * 0.15 - r * 0.05, y + r * 0.4, r * 0.1, r * 0.12); }
  // red nose
  ctx.fillStyle = f ? '#fff' : shade(ctx, x, y, r * 0.26, '#ff8a8a', '#e0102a', '#6a0010'); Draw.circ(ctx, x, y + r * 0.02, r * 0.24);
}

const ENEMY_SKINS = {
  // Levels 71–80: creepy clown carnival
  jackclown: { base: 'skitter', name: 'Jack-in-the-Box Clown', replaceFace: true, skull: ['#ff5a6a', '#c8102e', '#3a0008'], eye: '#ffffff', glow: '#ffffff', hop: 680,
    extra: (ctx, e, t) => {
      const up = e.onGround ? 0 : 10;
      ctx.fillStyle = lin(ctx, -9, 0, 9, 0, ['#ff4a5a', '#c8102e', '#5a0010']); Draw.rr(ctx, -9, -10, 18, 11, 2); ctx.fill();
      ctx.fillStyle = '#ffd040'; ctx.fillRect(-9, -10, 18, 2); ctx.fillRect(-9, -2, 18, 1.5);
      ctx.strokeStyle = '#c8c8d0'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo((k % 2 ? 4 : -4), -10 - k * (2 + up / 6)); ctx.stroke();
      drawClownFace(ctx, 0, -18 - up * 1.6, 7, t, { laugh: !e.onGround, angry: true });
    } },
  clownballoon: { base: 'bat', name: 'Clown Balloon', replaceFace: true, wing: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)'], body: ['#ff8a9a', '#e0102a', '#5a0010'], eye: '#fff', glow: '#fff',
    extra: (ctx, e, t) => {
      ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(4 * Math.sin(t * 3), 18, 0, 26); ctx.stroke();
      ctx.fillStyle = shade(ctx, -3, -3, 13, '#ffb0bc', '#e0102a', '#5a0010'); Draw.ell(ctx, 0, 0, 11, 12); Draw.poly(ctx, [-2, 11, 2, 11, 0, 14]);
      drawClownFace(ctx, 0, 0, 6.5, t, { laugh: e.state === 'chase', angry: e.state === 'chase' });
    } },
  // Levels 65–69: olive grove
  oliveskitter: { base: 'skitter', name: 'Hopping Olive', replaceFace: true, skull: ['#c8e070', '#6a8a2a', '#1a2a06'], eye: '#ffffff', glow: '#c8e070', hop: 620,
    extra: (ctx, e, t) => drawOlive(ctx, 0, -10, 10, 10, t, { scream: !e.onGround }) },
  olivebat: { base: 'bat', name: 'Flying Olive', replaceFace: true, wing: ['#9ab87a', '#5a7a3a', '#1a2a0a'], body: ['#c8e070', '#6a8a2a', '#1a2a06'], eye: '#ffffff', glow: '#c8e070',
    extra: (ctx, e, t) => drawOlive(ctx, 0, 0, 8, 9, t, { scream: e.state === 'chase' }) },
  // Levels 21–30: cave
  rockcrawler: { base: 'crawler', name: 'Rock Crawler', shell: ['#b0a08a', '#5e5246', '#1a1410'], face: ['#d8c8b0', '#8a7a68', '#3a3028'], eye: '#ffb040', glow: '#ff8a00', speed: 62, extra: spikes('#cfc0a8') },
  cavebat: { base: 'bat', name: 'Cave Bat', wing: ['#6a5440', '#3a2c20', '#140e08'], body: ['#9a8068', '#4a3828', '#1a120a'], eye: '#ffd040', glow: '#ffa000' },
  pebbleimp: { base: 'skitter', name: 'Pebble Imp', skull: ['#d8c8b0', '#8a7a68', '#2e2620'], eye: '#ff9a2a', glow: '#ff7000', hop: 560 },
  // Levels 31–40: clockwork crypt
  gearspider: { base: 'crawler', name: 'Gear Spider', shell: ['#e8d080', '#9a7a2a', '#2a2008'], face: ['#d0c8a0', '#7a7050', '#2a2618'], eye: '#7aff9a', glow: '#3aff7a', speed: 75, extra: cog('#c8a040') },
  chainghoul: { base: 'bat', name: 'Chain Ghoul', wing: ['#3a6a4a', '#1a3a24', '#06120a'], body: ['#9ac0a0', '#4a7a5a', '#0e2414'], eye: '#d8ff7a', glow: '#9aff3a' },
  ticktock: { base: 'skitter', name: 'Tick-Tock Skull', skull: ['#f0e0a0', '#b09a4a', '#3a3010'], eye: '#7aff9a', glow: '#3aff7a', hop: 600 },
  // Levels 41–50: burning cathedral
  ashcrawler: { base: 'crawler', name: 'Ash Crawler', shell: ['#6a5a5a', '#2e2424', '#0a0606'], face: ['#a89090', '#5a4646', '#1a1010'], eye: '#ffd040', glow: '#ff6a00', speed: 85, extra: flames('#ff7a1a') },
  emberbat: { base: 'bat', name: 'Ember Bat', wing: ['#ff8a3a', '#8a2a0a', '#2a0602'], body: ['#ffb060', '#a83a10', '#2a0802'], eye: '#fff0a0', glow: '#ffa000' },
  cinderskull: { base: 'skitter', name: 'Cinder Skull', skull: ['#ffd8a0', '#a85a2a', '#2a0e04'], eye: '#ffe060', glow: '#ff8a00', hop: 640, extra: flames('#ff8a2a') },
  // Levels 51–60: the void
  voidcrawler: { base: 'crawler', name: 'Void Crawler', shell: ['#b08aff', '#4a1a9a', '#0a0220'], face: ['#e0d0ff', '#8a6ad8', '#2a1060'], eye: '#ffffff', glow: '#d080ff', speed: 95, extra: spikes('#e0c8ff') },
  voideye: { base: 'bat', name: 'Void Eye', wing: ['#7a3ad8', '#2a0a6a', '#08021a'], body: ['#f0e0ff', '#a080e0', '#2a1060'], eye: '#1a0030', glow: '#d080ff' },
  // Levels 61–70: blood moon swamp
  bogleech: { base: 'crawler', name: 'Bog Leech', shell: ['#7a8a3a', '#3a4a1a', '#0e1404'], face: ['#a8b070', '#5a6a2a', '#1a2208'], eye: '#ff3a2a', glow: '#ff0000', speed: 100 },
  swamplantern: { base: 'bat', name: 'Swamp Lantern', wing: ['#3a4a2a', '#1a2210', '#060a02'], body: ['#d8ff8a', '#6aa02a', '#1a3008'], eye: '#ff5a2a', glow: '#9aff4a' },
  croakskull: { base: 'skitter', name: 'Croaking Skull', skull: ['#c8e090', '#6a8a3a', '#1a2a08'], eye: '#ff2a2a', glow: '#ff0000', hop: 700 },
  voidskull: { base: 'skitter', name: 'Void Skull', skull: ['#f0e0ff', '#9a7ad8', '#20084a'], eye: '#d080ff', glow: '#a040ff', hop: 660 },
};
function makeSkinnedEnemy(type, x, y) {
  const k = ENEMY_SKINS[type];
  let e;
  if (k.base === 'bat') e = new Bat(x * TILE, y * TILE);
  else if (k.base === 'skitter') { e = new Skitter(x * TILE + 4, (y + 1) * TILE); if (k.hop) e.hop = k.hop; }
  else { e = new Crawler(x * TILE + 1, (y + 1) * TILE); if (k.speed) e.baseSpeed = k.speed; }
  e.skin = k; e.skinName = type;
  return e;
}

// Screaming Olive (Levels 65–69): waddles around... and when you get close, it SCREAMS LIKE A GOAT and runs away.
// If it reaches a ledge it can't escape from, it cowers and shakes. Touching it still kills you!
class ScreamingOlive {
  constructor(x, y) {
    this.w = 22; this.h = 26; this.x = x; this.y = y - this.h;
    this.vx = 0; this.vy = 0; this.hp = 2; this.flash = 0; this.dead = false;
    this.dir = Math.random() < 0.5 ? -1 : 1; this.anim = Math.random() * 10; this.shards = 4; this.contact = 1;
    this.state = 'waddle'; this.screamT = 0; this.turnT = 1 + Math.random() * 2;
  }
  update(dt, g) {
    this.anim += dt; this.flash -= dt; this.screamT -= dt; this.turnT -= dt;
    const p = g.player, dx = (p.x + p.w / 2) - (this.x + this.w / 2), near = !p.dead && Math.abs(dx) < 170 && Math.abs(p.y - this.y) < 110;
    if (near && this.state === 'waddle') { this.state = 'flee'; this.screamT = 0.9; Sfx.play('scream'); g.popups.push({ x: this.x + this.w / 2, y: this.y - 14, t: 0.9, text: 'MEEEEH!' }); }
    if (!near && this.state !== 'waddle' && Math.abs(dx) > 260) this.state = 'waddle';
    if (this.state === 'flee' || this.state === 'cower') this.dir = dx > 0 ? -1 : 1;   // always away from you
    let speed = this.state === 'flee' ? 170 : 34;
    if (this.state === 'waddle' && this.turnT <= 0) { this.dir *= -1; this.turnT = 1.5 + Math.random() * 2; }
    if (this.onGround) {
      const aheadX = this.dir > 0 ? this.x + this.w + 3 : this.x - 3, tx = Math.floor(aheadX / TILE), fy = Math.floor((this.y + this.h + 2) / TILE), my = Math.floor((this.y + this.h / 2) / TILE);
      const blocked = !g.world.standable(tx, fy) || g.world.solid(tx, my) || g.world.isHazard(tx, fy - 1) || g.world.isHazard(tx, fy);
      if (blocked) { if (this.state === 'waddle') this.dir *= -1; else { this.state = 'cower'; speed = 0; } }
      else if (this.state === 'cower') this.state = 'flee';
    }
    this.vx = approach(this.vx, this.dir * speed, 900 * dt);
    if (this.state === 'cower') this.vx = 0;
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
    moveEntity(g.world, this, dt);
    if (this.state === 'cower' && this.screamT <= 0) { this.screamT = 1.2; Sfx.play('scream'); g.popups.push({ x: this.x + this.w / 2, y: this.y - 14, t: 0.8, text: 'BAAAAH!' }); }
  }
  hurt(dmg, dir, g) {
    this.hp -= dmg; this.flash = 0.12; Sfx.play('scream');
    if (dir) { this.vx = dir * 260; this.vy = -220; }
    g.burst(this.x + this.w / 2, this.y + this.h / 2, 8, '#a8c83a', 180);
    if (this.hp <= 0) g.killEnemy(this);
  }
  draw(ctx, t) {
    const f = this.flash > 0, cx = this.x + this.w / 2, by = this.y + this.h;
    const fleeing = this.state !== 'waddle', cower = this.state === 'cower';
    if (this.onGround) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, cx, by, 11, 3); }
    ctx.save(); ctx.translate(cx + (cower ? Math.sin(t * 60) * 1.5 : 0), by);
    ctx.scale(-this.dir, 1); // face away = look back over its shoulder while it runs
    const step = this.anim * (fleeing ? 26 : 9);
    const waddle = Math.sin(step) * (fleeing ? 0.12 : 0.22);
    ctx.rotate(waddle);
    // little stubby legs
    ctx.strokeStyle = f ? '#fff' : '#2a3a10'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    Draw.line(ctx, -4, -5, -5 + Math.sin(step) * 3, 0); Draw.line(ctx, 4, -5, 5 - Math.sin(step) * 3, 0);
    // arms flailing when scared
    if (fleeing) { ctx.lineWidth = 2; Draw.line(ctx, -9, -16, -15, -22 + Math.sin(t * 30) * 4); Draw.line(ctx, 9, -16, 15, -22 + Math.cos(t * 30) * 4); }
    drawOlive(ctx, 0, -15, 11, 13, t, { flash: f, scream: this.screamT > 0 || cower });
    if (fleeing && !f) { ctx.fillStyle = 'rgba(160,220,255,0.8)'; Draw.ell(ctx, -10, -24, 1.6, 2.6); Draw.ell(ctx, 11, -26, 1.4, 2.2); } // sweat drops
    ctx.restore();
  }
}

// Creepy Clown (Levels 71–80): shuffles back and forth in big shoes. When it spots you it giggles,
// honks its nose, and comes after you. Touching it kills you. Jump over it or slash it!
class CreepyClown {
  constructor(x, y) {
    this.w = 22; this.h = 34; this.x = x; this.y = y - this.h;
    this.vx = 0; this.vy = 0; this.hp = 4; this.flash = 0; this.dead = false;
    this.dir = Math.random() < 0.5 ? -1 : 1; this.anim = Math.random() * 10; this.shards = 4; this.contact = 1;
    this.state = 'wander'; this.laughT = 0; this.turnT = 1.5 + Math.random() * 2;
  }
  update(dt, g) {
    this.anim += dt; this.flash -= dt; this.laughT -= dt; this.turnT -= dt;
    const p = g.player, dx = (p.x + p.w / 2) - (this.x + this.w / 2), sees = !p.dead && Math.abs(dx) < 230 && Math.abs(p.y - this.y) < 100;
    if (sees && this.state === 'wander') { this.state = 'hunt'; this.laughT = 1; Sfx.play('giggle'); g.popups.push({ x: this.x + this.w / 2, y: this.y - 12, t: 1, text: 'HEE HEE!' }); }
    if (!sees && this.state === 'hunt' && Math.abs(dx) > 330) this.state = 'wander';
    if (this.state === 'hunt') { this.dir = Math.sign(dx) || 1; if (this.laughT <= -1.4) { this.laughT = 1; Sfx.play('honk'); } }
    else if (this.turnT <= 0) { this.dir *= -1; this.turnT = 2 + Math.random() * 2; }
    let speed = (this.state === 'hunt' ? 95 : 38) * (this.speedMul || 1);
    if (this.onGround) {
      const aheadX = this.dir > 0 ? this.x + this.w + 3 : this.x - 3, tx = Math.floor(aheadX / TILE), fy = Math.floor((this.y + this.h + 2) / TILE), my = Math.floor((this.y + this.h / 2) / TILE);
      if (!g.world.standable(tx, fy) || g.world.solid(tx, my) || g.world.isHazard(tx, fy - 1) || g.world.isHazard(tx, fy)) { if (this.state === 'wander') this.dir *= -1; else speed = 0; }
    }
    this.vx = approach(this.vx, this.dir * speed, 700 * dt);
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
    moveEntity(g.world, this, dt);
  }
  hurt(dmg, dir, g) {
    this.hp -= dmg; this.flash = 0.12; Sfx.play('honk');
    if (dir) { this.vx = dir * 240; this.vy = -200; }
    g.burst(this.x + this.w / 2, this.y + this.h / 2, 10, ['#ff3a5a', '#ffd040', '#3ac8ff'][Math.floor(Math.random() * 3)], 200);
    if (this.hp <= 0) g.killEnemy(this);
  }
  draw(ctx, t) {
    const f = this.flash > 0, cx = this.x + this.w / 2, by = this.y + this.h, hunt = this.state === 'hunt';
    if (this.onGround) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, cx, by, 14, 3); }
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.dir, 1);
    const step = this.anim * (hunt ? 14 : 7), lean = hunt ? 0.12 : 0;
    // giant shoes
    ctx.fillStyle = f ? '#fff' : '#c8102e';
    Draw.ell(ctx, -3 + Math.sin(step) * 4, -2, 8, 3.5); Draw.ell(ctx, 4 - Math.sin(step) * 4, -2, 8, 3.5);
    ctx.rotate(lean);
    // baggy striped suit
    ctx.save(); ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.lineTo(7, -22); ctx.lineTo(-7, -22); ctx.closePath(); ctx.clip();
    for (let i = -10; i < 10; i += 5) { ctx.fillStyle = f ? '#fff' : ((i / 5) % 2 ? '#f0e8e0' : '#7a2aa0'); ctx.fillRect(i, -24, 5, 22); }
    ctx.restore();
    ctx.fillStyle = f ? '#fff' : '#ffd040'; for (const yy of [-18, -12]) Draw.circ(ctx, 0, yy, 1.6); // pom-pom buttons
    // ruffled collar
    ctx.fillStyle = f ? '#fff' : '#ffffff'; for (let i = -3; i <= 3; i++) Draw.circ(ctx, i * 2.6, -23, 2.2);
    // arms reaching when hunting
    ctx.strokeStyle = f ? '#fff' : '#7a2aa0'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (hunt) { Draw.line(ctx, 5, -19, 15, -21 + Math.sin(t * 14) * 2); Draw.line(ctx, -4, -19, 10, -16 + Math.cos(t * 14) * 2); ctx.fillStyle = '#fff'; Draw.circ(ctx, 15, -21, 2.4); Draw.circ(ctx, 10, -16, 2.4); }
    else { Draw.line(ctx, 6, -19, 9, -10 + Math.sin(step) * 2); Draw.line(ctx, -6, -19, -9, -10 - Math.sin(step) * 2); }
    drawClownFace(ctx, 1, -31, 8, t, { flash: f, laugh: this.laughT > 0, angry: hunt });
    // tiny hat
    if (!f) { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-2, -45, 7, 5); ctx.fillRect(-4, -41, 11, 1.6); ctx.fillStyle = '#c8102e'; ctx.fillRect(-2, -42, 7, 1); }
    ctx.restore();
  }
}

// Swinging blade (Levels 71–80): a pendulum hanging from a carnival post. Run through when it's on the far side!
class Pendulum {
  constructor(o) { this.ax = o.x * TILE + 16; this.ay = (o.g - 6) * TILE; this.base = o.g * TILE; this.L = 5 * TILE - 6; this.phase = o.phase || 0; this.amp = 1.05; this.period = 2.4; }
  angle(time) { return Math.sin(((time + this.phase) / this.period) * Math.PI * 2) * this.amp; }
  bladePos(time) { const a = this.angle(time); return { x: this.ax + Math.sin(a) * this.L, y: this.ay + Math.cos(a) * this.L, a }; }
  update(dt, g) {
    const p = g.player; if (p.dead) return;
    const b = this.bladePos(g.time), hb = { x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 };
    const nx = clamp(b.x, hb.x, hb.x + hb.w), ny = clamp(b.y, hb.y, hb.y + hb.h);
    if ((nx - b.x) ** 2 + (ny - b.y) ** 2 < 15 * 15) g.playerDied();
  }
  draw(ctx, t, time) {
    // striped carnival post + arm
    ctx.fillStyle = lin(ctx, this.ax - 4, 0, this.ax + 4, 0, ['#f0e8e0', '#c8c0b8']); ctx.fillRect(this.ax - 3, this.ay - 6, 6, 6);
    for (const sx of [-58, 58]) { ctx.fillStyle = lin(ctx, this.ax + sx - 4, 0, this.ax + sx + 4, 0, ['#ff4a5a', '#8a0a1a']); ctx.fillRect(this.ax + sx - 4, this.ay - 6, 8, this.base - this.ay + 6); ctx.fillStyle = '#ffffff'; for (let yy = this.ay; yy < this.base; yy += 24) ctx.fillRect(this.ax + sx - 4, yy, 8, 8); }
    ctx.fillStyle = '#3a2a2a'; ctx.fillRect(this.ax - 62, this.ay - 10, 124, 6);
    const b = this.bladePos(time);
    ctx.strokeStyle = '#8a8a98'; ctx.lineWidth = 2; Draw.line(ctx, this.ax, this.ay, b.x, b.y);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-b.a);
    ctx.fillStyle = lin(ctx, -16, 0, 16, 0, ['#ffffff', '#a8b0c8', '#4a5068']);
    ctx.beginPath(); ctx.moveTo(-17, -4); ctx.quadraticCurveTo(0, 18, 17, -4); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,16,46,0.6)'; Draw.ell(ctx, -6, 4, 3, 1.5);
    ctx.restore();
  }
}

// Levels 81–89: chess pieces in army gear. They aim (red laser sight) for a moment, then fire a 3-round
// burst of bullets. Jump over the bullets, dash through, or slash them out of the air!
//   Pawn  - marches forward only, never backward (chess rules!)
//   Knight - leaps in big L-shaped hops toward you
//   Bishop - flies only on diagonals, bouncing around its post
class ChessSoldier {
  constructor(kind, x, y) {
    this.kind = kind; this.white = Math.random() < 0.5;
    this.w = kind === 'pawn' ? 28 : 32; this.h = kind === 'pawn' ? 42 : 50;
    this.x = x; this.y = y - this.h; this.home = { x, y: y - this.h };
    this.vx = 0; this.vy = 0; this.hp = kind === 'pawn' ? 2 : 4; this.flash = 0; this.dead = false;
    this.anim = Math.random() * 10; this.shards = 4; this.contact = 1;
    this.dir = -1; this.facing = -1; this.state = 'patrol'; this.timer = 1 + Math.random(); this.shots = 0; this.hopT = 1 + Math.random();
    if (kind === 'bishop') { this.vx = -85; this.vy = -85; this.y -= 3 * TILE; this.home.y = this.y; }
  }
  update(dt, g) {
    // No shooting: they just patrol back and forth. Touching one kills you!
    this.anim += dt; this.flash -= dt;
    if (this.kind === 'bishop') {
      if (Math.abs(this.x - this.home.x) > 140) this.vx = -Math.sign(this.x - this.home.x) * 85;
      if (Math.abs(this.y - this.home.y) > 70) this.vy = -Math.sign(this.y - this.home.y) * 85;
      const vx = this.vx, vy = this.vy; moveEntity(g.world, this, dt);
      if (this.hitWallL || this.hitWallR) this.vx = -vx; else this.vx = vx;
      if (this.onGround || this.hitCeil) this.vy = -vy; else this.vy = vy;
      this.facing = Math.sign(this.vx) || this.facing;
      return;
    }
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAXFALL);
    const blocked = () => {
      const tx = Math.floor((this.dir > 0 ? this.x + this.w + 3 : this.x - 3) / TILE), fy = Math.floor((this.y + this.h + 2) / TILE), my = Math.floor((this.y + this.h / 2) / TILE);
      return !g.world.standable(tx, fy) || g.world.solid(tx, my) || g.world.isHazard(tx, fy - 1) || g.world.isHazard(tx, fy);
    };
    if (this.kind === 'pawn') {
      if (this.onGround && blocked()) this.dir *= -1;
      this.vx = this.dir * 45 * (this.speedMul || 1);
    } else { // knight: little hops back and forth
      if (this.onGround) {
        this.vx = approach(this.vx, 0, 900 * dt); this.hopT -= dt;
        if (this.hopT <= 0) {
          const tx = Math.floor((this.x + this.w / 2 + this.dir * 90) / TILE), fy = Math.floor((this.y + this.h + 4) / TILE);
          if (!g.world.standable(tx, fy) || g.world.isHazard(tx, fy - 1) || g.world.isHazard(tx, fy) || Math.abs(this.x + this.dir * 90 - this.home.x) > 200) this.dir *= -1;
          else { this.vy = -520; this.vx = this.dir * 150; Sfx.play('skitter'); }
          this.hopT = 1.2;
        }
      }
    }
    this.facing = this.dir;
    moveEntity(g.world, this, dt);
  }
  hurt(dmg, dir, g) {
    this.hp -= dmg; this.flash = 0.12;
    if (dir && this.kind !== 'bishop') { this.vx = dir * 200; this.vy = -180; }
    g.sparks(this.x + this.w / 2, this.y + this.h / 2, 8, dir > 0 ? 0 : Math.PI, '#ffffff');
    if (this.hp <= 0) g.killEnemy(this);
  }
  draw(ctx, t) {
    const f = this.flash > 0, cx = this.x + this.w / 2, by = this.y + this.h;
    const body = this.white ? ['#ffffff', '#d8d4cc', '#7a766e'] : ['#5a5a66', '#1e1e26', '#000000'];
    const B = (x, y, r) => (f ? '#fff' : shade(ctx, x, y, r, body[0], body[1], body[2]));
    if (this.kind !== 'bishop' && this.onGround) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, cx, by, 13, 3); }
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.facing * 1.32, 1.32);
    // base + body by piece type
    ctx.fillStyle = B(0, -4, 12); Draw.rr(ctx, -11, -6, 22, 6, 2); ctx.fill();
    if (this.kind === 'pawn') {
      ctx.fillStyle = B(0, -14, 10); Draw.poly(ctx, [-8, -6, 8, -6, 5, -20, -5, -20]);
      ctx.fillStyle = B(-2, -26, 8); Draw.circ(ctx, 0, -25, 7);
    } else if (this.kind === 'knight') {
      ctx.fillStyle = B(0, -14, 12); Draw.poly(ctx, [-9, -6, 9, -6, 7, -18, -7, -18]);
      ctx.fillStyle = B(2, -28, 13);
      ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-7, -30); ctx.quadraticCurveTo(-4, -40, 4, -38); ctx.lineTo(12, -30); ctx.lineTo(13, -25); ctx.lineTo(6, -24); ctx.lineTo(7, -18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = f ? '#fff' : (this.white ? '#8a8478' : '#000'); Draw.circ(ctx, 4, -31, 1.3);
    } else {
      ctx.fillStyle = B(0, -14, 12); Draw.poly(ctx, [-8, -6, 8, -6, 4, -22, -4, -22]);
      ctx.fillStyle = B(0, -30, 10); Draw.ell(ctx, 0, -29, 6.5, 9); Draw.circ(ctx, 0, -39, 2.2);
      ctx.strokeStyle = f ? '#fff' : (this.white ? '#7a766e' : '#000'); ctx.lineWidth = 1.2; Draw.line(ctx, -2, -33, 3, -27);
    }
    if (!f) {
      // camo band + bandolier
      ctx.fillStyle = '#4a5a2a'; ctx.fillRect(-8, -14, 16, 4); ctx.fillStyle = '#2e3a16'; ctx.fillRect(-6, -14, 3, 4); ctx.fillRect(1, -13, 4, 2);
      ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = 2; Draw.line(ctx, -7, -20, 7, -9);
      // army helmet
      const hy = this.kind === 'pawn' ? -30 : this.kind === 'knight' ? -37 : -36;
      ctx.fillStyle = shade(ctx, -2, hy, 9, '#6a7a3a', '#3e4a1e', '#141a08');
      ctx.beginPath(); ctx.arc(this.kind === 'knight' ? 0 : 0, hy + 4, 8.5, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillRect(-10, hy + 3, 20, 2.4);
      ctx.strokeStyle = '#1a1a10'; ctx.lineWidth = 0.8; Draw.line(ctx, 6, hy + 5, 4, hy + 11);
    }
    ctx.restore();
  }
}

/* ---------- Levels 11–20 mini enemies (frozen) ---------- */
// Frost Mite: an icy beetle that crawls faster than a Grave Mite.
class FrostMite extends Crawler {
  constructor(x, y) { super(x, y); this.baseSpeed = 75; }
  draw(ctx, t) {
    const f = this.flash > 0;
    const c = (col) => (f ? '#ffffff' : col);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, this.x + this.w / 2, this.y + this.h, 15, 3);
    ctx.translate(this.x + this.w / 2, this.y + this.h); ctx.scale(this.dir, 1);
    ctx.strokeStyle = c('#0e1a2a'); ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const ph = Math.sin(this.anim * 18 + i * 2) * 2.5; ctx.beginPath(); ctx.moveTo(-8 + i * 7, -6); ctx.lineTo(-11 + i * 7 + ph, -3); ctx.lineTo(-10 + i * 7 + ph, 0); ctx.stroke(); }
    ctx.fillStyle = f ? '#fff' : shade(ctx, -2, -12, 16, '#e8fbff', '#6ab8e0', '#123a5a');
    ctx.beginPath(); ctx.ellipse(0, -9, 15, 11, 0, Math.PI, 0); ctx.lineTo(15, -5); ctx.lineTo(-15, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c('#dff6ff'); // ice spikes on the shell
    for (let i = -10; i <= 6; i += 6) Draw.poly(ctx, [i - 2.5, -15 + Math.abs(i) * 0.3, i + 2.5, -15 + Math.abs(i) * 0.3, i, -23 + Math.abs(i) * 0.3]);
    ctx.fillStyle = f ? '#fff' : shade(ctx, 12, -8, 6, '#ffffff', '#9fc8e0', '#2a4a6a'); Draw.ell(ctx, 12, -8, 6, 5);
    ctx.fillStyle = c('#5ae0ff'); if (!f) setGlow(ctx, '#3ad0ff', 8); Draw.circ(ctx, 14, -9, 1.8); clearGlow(ctx);
    ctx.restore();
  }
}

// Ice Wisp: a floating blue flame with a frozen face. Chases you like a bat.
class IceWisp extends Bat {
  draw(ctx, t) {
    const f = this.flash > 0;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(this.facing, 1);
    if (!f) setGlow(ctx, '#3ab0ff', 16);
    const fl = Math.sin(this.anim * 10) * 2;
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -16, 0, 10, ['#ffffff', '#7ad8ff', 'rgba(30,90,180,0.2)']);
    ctx.beginPath(); ctx.moveTo(-10, 4);
    ctx.quadraticCurveTo(-12, -8, -2, -16 + fl); ctx.quadraticCurveTo(2, -8, 6, -14 - fl);
    ctx.quadraticCurveTo(14, -4, 10, 6); ctx.quadraticCurveTo(0, 12, -10, 4); ctx.fill();
    clearGlow(ctx);
    ctx.fillStyle = f ? '#fff' : '#0a1a30'; Draw.ell(ctx, -2, -2, 2, 2.8); Draw.ell(ctx, 4, -2, 2, 2.8);
    ctx.fillStyle = '#ffffff'; Draw.circ(ctx, -1.6, -2.6, 0.7); Draw.circ(ctx, 4.4, -2.6, 0.7);
    ctx.restore();
  }
}

// Snow Skull: a frosted skull on spider legs that hops higher than a Skitter Skull.
class SnowSkull extends Skitter {
  constructor(x, y) { super(x, y); this.hop = 600; }
  draw(ctx, t) {
    super.draw(ctx, t);
    if (this.flash > 0) return;
    const cx = this.x + this.w / 2, by = this.y + this.h;
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.facing, 1);
    ctx.fillStyle = 'rgba(230,250,255,0.9)'; // snow cap
    ctx.beginPath(); ctx.ellipse(0, -18, 7, 3, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#bff0ff'; Draw.poly(ctx, [-4, -15, -2.5, -15, -3.2, -11]); Draw.poly(ctx, [5, -15, 6.5, -15, 5.8, -12]);
    ctx.fillStyle = '#5ae0ff'; setGlow(ctx, '#3ad0ff', 8);
    Draw.circ(ctx, -1.2, -11.2, 0.9); Draw.circ(ctx, 4.3, -11.2, 0.9); clearGlow(ctx);
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
  stoodOn(p) { if (this.kind === 'crumble' && this.state === 'solid') { this.state = 'shaking'; this.timer = this.crumbleT * (p ? p.st.crumbleSlow : 1); } }
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
      p.vy = -PHYS.PAD * p.st.pad; p.jumping = false; p.canDash = true; p.airJumps = 1 + p.st.airJumps; p.airDashLeft = 1 + p.st.airDashes; p.platform = null; p.dashT = 0;
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
    setGlow(ctx, THEME.fireGlow, 16);
    for (const b of this.balls()) {
      ctx.fillStyle = shade(ctx, b.x, b.y, 9, THEME.fire[0], THEME.fire[1], THEME.fire[2]);
      Draw.circ(ctx, b.x, b.y, 8 + Math.sin(t * 20 + b.x) * 0.8);
    }
    clearGlow(ctx);
  }
}

/* =========================== LEVELS 21+ HAZARDS =========================== */
// Dropper: hangs from the ceiling. When you run underneath it shakes, then falls. Touching it kills you.
// Style follows the level group: stalactite (cave), gear (crypt), chandelier (cathedral), shard (void).
class Dropper {
  constructor(o) {
    this.tx = o.x; this.x0 = o.x * TILE + 6; this.y0 = o.y * TILE; this.w = 20; this.h = o.big ? 46 : 34;
    this.x = this.x0; this.y = this.y0; this.vy = 0; this.state = 'hang'; this.timer = 0; this.shake = 0; this.style = o.style;
  }
  reset() { this.state = 'hang'; this.y = this.y0; this.vy = 0; this.timer = 0; }
  update(dt, g) {
    const p = g.player;
    this.timer -= dt;
    if (this.state === 'hang') {
      const dx = (p.x + p.w / 2) - (this.x + this.w / 2);
      if (!p.dead && Math.abs(dx) < 46 && p.y > this.y) { this.state = 'shake'; this.timer = 0.45 * p.st.dropDelay; Sfx.play('rumble'); }
    } else if (this.state === 'shake') {
      this.shake = Math.sin(g.time * 80) * 1.6;
      if (Math.random() < 0.4) g.particles.push(makeParticle(this.x + rand(0, this.w), this.y0, rand(-10, 10), rand(20, 60), 0.5, 'rgba(160,140,120,0.8)', rand(1, 2), 400));
      if (this.timer <= 0) { this.state = 'fall'; this.shake = 0; }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 2200 * dt, 1000); this.y += this.vy * dt;
      const bx = this.x + this.w / 2, byy = this.y + this.h;
      if (g.world.solidAt(bx, byy) || g.world.isHazard(Math.floor(bx / TILE), Math.floor(byy / TILE)) || this.y > g.world.h * TILE) {
        this.state = 'gone'; this.timer = 2.8;
        const col = { stalactite: '#9a8a78', gear: '#c8a040', chandelier: '#ffb040', shard: '#c890ff', olive: '#6a8a2a', piece: '#e8e4dc' }[this.style] || '#9a8a78';
        g.shatter(bx, byy - 6, col, 8, byy); g.smoke(bx, byy - 4, 4); Sfx.play('crash'); g.shake = Math.max(g.shake, 4);
      }
    } else if (this.state === 'gone' && this.timer <= 0) this.reset();
    if (this.state === 'fall' && !p.dead && rectsOverlap({ x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 }, { x: this.x + 4, y: this.y, w: this.w - 8, h: this.h })) g.playerDied();
  }
  draw(ctx, t) {
    if (this.state === 'gone') {
      if (this.style === 'stalactite') { ctx.fillStyle = 'rgba(120,105,90,0.5)'; Draw.poly(ctx, [this.x0 + 2, this.y0, this.x0 + 18, this.y0, this.x0 + 10, this.y0 + 6 + (2.8 - this.timer) * 8]); }
      return;
    }
    const x = this.x + this.shake, y = this.y, w = this.w, h = this.h, cx = x + w / 2;
    if (this.style === 'gear') {
      ctx.strokeStyle = '#5a5040'; ctx.lineWidth = 1.5; if (this.state === 'hang' || this.state === 'shake') Draw.line(ctx, cx, this.y0, cx, y + 4);
      ctx.save(); ctx.translate(cx, y + h / 2 + 4); ctx.rotate(this.state === 'fall' ? t * 12 : 0);
      ctx.fillStyle = shade(ctx, 0, 0, 16, '#fff0b0', '#c8a040', '#4a3a10');
      for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillRect(10, -3, 6, 6); }
      Draw.circ(ctx, 0, 0, 12); ctx.fillStyle = '#2a2010'; Draw.circ(ctx, 0, 0, 4);
      ctx.restore();
    } else if (this.style === 'chandelier') {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5; if (this.state !== 'fall') Draw.line(ctx, cx, this.y0, cx, y + 8);
      ctx.fillStyle = lin(ctx, x, 0, x + w, 0, ['#c8a050', '#6a4a1a']);
      Draw.rr(ctx, x - 6, y + h - 14, w + 12, 5, 2); ctx.fill();
      Draw.poly(ctx, [cx - 3, y + 8, cx + 3, y + 8, cx + 8, y + h - 14, cx - 8, y + h - 14]);
      setGlow(ctx, '#ffa000', 12); ctx.fillStyle = '#ffd060';
      for (const dx of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(cx + dx - 2, y + h - 14); ctx.quadraticCurveTo(cx + dx, y + h - 24 - Math.sin(t * 12 + dx) * 2, cx + dx + 2, y + h - 14); ctx.fill(); }
      clearGlow(ctx);
    } else if (this.style === 'piece') {
      // a falling chess pawn
      ctx.fillStyle = shade(ctx, cx, y + h * 0.4, 16, '#ffffff', '#cfcac0', '#6a665e');
      Draw.circ(ctx, cx, y + 9, 7); Draw.poly(ctx, [cx - 5, y + 14, cx + 5, y + 14, cx + 8, y + h - 6, cx - 8, y + h - 6]);
      Draw.rr(ctx, cx - 11, y + h - 7, 22, 7, 2); ctx.fill();
      if (this.state !== 'fall') { ctx.strokeStyle = '#8a8a9a'; ctx.lineWidth = 1.2; Draw.line(ctx, cx, this.y0, cx, y + 2); }
    } else if (this.style === 'olive') {
      if (this.state !== 'fall') { // olive branch above
        ctx.strokeStyle = '#2a2010'; ctx.lineWidth = 4; Draw.line(ctx, cx - 40, this.y0 - 30, cx + 40, this.y0 - 22);
        ctx.fillStyle = '#7a9a5a'; for (const lx of [-30, -14, 14, 30]) Draw.ell(ctx, cx + lx, this.y0 - 22, 7, 2.5, 0.4);
        ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = 1.5; Draw.line(ctx, cx, this.y0 - 26, cx, y + 4);
      }
      drawOlive(ctx, cx, y + h / 2 + 4, w / 2 + 2, h / 2, t, { scream: this.state !== 'hang' });
    } else if (this.style === 'shard') {
      setGlow(ctx, '#b050ff', 14);
      ctx.fillStyle = lin(ctx, x, 0, x + w, 0, ['#f8e8ff', '#b070ff', '#3a0a8a']);
      Draw.poly(ctx, [x + 2, y, x + w - 2, y, cx + 2, y + h]);
      clearGlow(ctx);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; Draw.poly(ctx, [x + 5, y, cx, y, cx - 1, y + h * 0.7]);
    } else {
      // rock stalactite with ridges
      ctx.fillStyle = lin(ctx, x, 0, x + w, 0, ['#c8b8a0', '#7a6a58', '#2e2620']);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(cx + 3, y + h * 0.6); ctx.lineTo(cx, y + h); ctx.lineTo(cx - 3, y + h * 0.55); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,24,20,0.5)'; ctx.lineWidth = 0.8; Draw.line(ctx, x + 6, y + 3, cx - 1, y + h * 0.7); Draw.line(ctx, x + 14, y + 3, cx + 2, y + h * 0.55);
      ctx.fillStyle = 'rgba(160,220,255,0.8)'; Draw.circ(ctx, cx, y + h + 2 + ((t * 2 + this.tx) % 1) * 6, 1.2); // drip
    }
    if (this.state === 'shake') { ctx.fillStyle = 'rgba(255,80,60,0.18)'; ctx.fillRect(cx - 18, this.y0, 36, 260); }
  }
}

// Bog geyser (Levels 61–70): bubbles as a warning, then blasts a column of toxic sludge. Time your run!
class Geyser {
  constructor(o) { this.cx = o.x * TILE + 16; this.base = o.g * TILE; this.phase = o.phase || 0; this.period = 2.8; this.h = 150; }
  stateAt(time) {
    const k = ((time + this.phase) % this.period) / this.period; // 0..1
    if (k < 0.5) return { s: 'idle', k };
    if (k < 0.72) return { s: 'warn', k: (k - 0.5) / 0.22 };
    return { s: 'erupt', k: (k - 0.72) / 0.28 };
  }
  update(dt, g) {
    const st = this.stateAt(g.time);
    if (st.s === 'erupt') {
      const p = g.player, top = this.base - this.h * Math.min(1, st.k * 4);
      if (!p.dead && rectsOverlap({ x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 }, { x: this.cx - 11, y: top, w: 22, h: this.base - top })) g.playerDied();
      if (Math.random() < 0.6) g.particles.push(makeParticle(this.cx + rand(-8, 8), top, rand(-60, 60), rand(-140, -40), 0.6, '#9aff4a', rand(2, 4), 600));
      if (!this.wasErupt) Sfx.play('geyser');
    }
    this.wasErupt = st.s === 'erupt';
  }
  draw(ctx, t, time) {
    const st = this.stateAt(time), x = this.cx, b = this.base;
    // vent mouth
    ctx.fillStyle = lin(ctx, x - 14, 0, x + 14, 0, ['#5a4a30', '#2a2010', '#0a0804']); Draw.rr(ctx, x - 14, b - 6, 28, 6, 3); ctx.fill();
    ctx.fillStyle = st.s === 'idle' ? '#2a3a10' : '#9aff4a'; Draw.ell(ctx, x, b - 5, 9, 2.5);
    if (st.s === 'warn') {
      ctx.fillStyle = `rgba(154,255,74,${0.4 + st.k * 0.5})`; setGlow(ctx, '#9aff4a', 12);
      for (let i = 0; i < 4; i++) Draw.circ(ctx, x - 8 + i * 5, b - 8 - ((t * 3 + i * 0.3) % 1) * 18 * st.k, 1.8 + st.k * 1.5);
      clearGlow(ctx);
    } else if (st.s === 'erupt') {
      const top = b - this.h * Math.min(1, st.k * 4);
      const gg = ctx.createLinearGradient(0, top, 0, b);
      gg.addColorStop(0, 'rgba(220,255,160,0.9)'); gg.addColorStop(0.3, '#8ad83a'); gg.addColorStop(1, '#2a6a10');
      setGlow(ctx, '#9aff4a', 18); ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(x - 8, b);
      for (let yy = b; yy > top; yy -= 10) ctx.lineTo(x - 9 + Math.sin(t * 20 + yy * 0.1) * 3, yy);
      ctx.quadraticCurveTo(x, top - 12, x + 9, top);
      for (let yy = top; yy < b; yy += 10) ctx.lineTo(x + 9 + Math.sin(t * 22 + yy * 0.1) * 3, yy);
      ctx.closePath(); ctx.fill(); clearGlow(ctx);
    }
  }
}

// Chaser: the thing that hunts you in a chase sequence (Levels 21+). It starts rolling when you enter the
// chase zone and keeps coming until the end. If it catches you, you die. Never stop running!
class Chaser {
  constructor(o) {
    this.x1 = o.x1 * TILE; this.x2 = o.x2 * TILE; this.floor = o.g * TILE; this.style = o.style;
    this.speed = o.speed; this.reset();
  }
  reset() { this.state = 'idle'; this.front = this.x1 - 8 * TILE; this.rot = 0; this.alpha = 1; }
  update(dt, g) {
    const p = g.player;
    if (this.state === 'idle') {
      if (!p.dead && p.x > this.x1 + TILE) { this.state = 'chase'; Sfx.play('roar'); g.shake = 10; g.toast('RUN!', 1.4); }
      return;
    }
    if (this.state === 'chase') {
      const sp = this.speed * (1 - p.st.chaseSlow);
      this.front += sp * dt; this.rot += sp * dt / 70;
      g.shake = Math.max(g.shake, 2.5);
      if (Math.random() < 0.5) g.dust(this.front - 20, this.floor, 1);
      if (!p.dead && p.x < this.front - 4) g.playerDied();
      if (this.front >= this.x2) { this.state = 'done'; Sfx.play('crash'); g.shatter(this.front - 30, this.floor - 60, '#7a6a58', 14, this.floor); g.smoke(this.front - 30, this.floor - 40, 10); g.shake = 12; }
    } else if (this.state === 'done') this.alpha = Math.max(0, this.alpha - dt * 2);
  }
  draw(ctx, t) {
    if (this.state === 'idle' || this.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = this.alpha;
    const fx = this.front, fy = this.floor;
    if (this.style === 'boulder') {
      const R = 82, cx = fx - R, cy = fy - R;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, cx, fy, R * 0.9, 10);
      ctx.translate(cx, cy); ctx.rotate(this.rot);
      ctx.fillStyle = shade(ctx, 0, 0, R, '#b8a890', '#6a5a4a', '#1e1814'); Draw.circ(ctx, 0, 0, R);
      ctx.strokeStyle = 'rgba(20,14,10,0.6)'; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { ctx.rotate(1.05); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(R * 0.6, 14); ctx.lineTo(R * 0.9, 4); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; Draw.ell(ctx, -R * 0.3, -R * 0.35, R * 0.35, R * 0.2, -0.5);
    } else if (this.style === 'gears') {
      for (let i = 0; i < 4; i++) {
        const R = 46, cx = fx - R, cy = fy - R - i * 82;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.rot * (i % 2 ? 1 : -1));
        ctx.fillStyle = shade(ctx, 0, 0, R, '#fff0b0', '#b08a30', '#3a2a08');
        for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.fillRect(R - 6, -7, 14, 14); }
        Draw.circ(ctx, 0, 0, R); ctx.fillStyle = '#2a2008'; Draw.circ(ctx, 0, 0, 12);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(30,24,8,0.85)'; ctx.fillRect(fx - 2000, fy - 340, 2000 - 70, 340);
    } else if (this.style === 'fire') {
      const g2 = ctx.createLinearGradient(fx - 260, 0, fx, 0);
      g2.addColorStop(0, 'rgba(120,20,0,0.95)'); g2.addColorStop(0.7, '#ff6a10'); g2.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g2; ctx.fillRect(fx - 2000, fy - 340, 2000, 340);
      setGlow(ctx, '#ff6a00', 20);
      for (let i = 0; i < 14; i++) {
        const y = fy - i * 24, h = 40 + Math.abs(Math.sin(t * 9 + i)) * 40;
        ctx.fillStyle = i % 2 ? '#ffd060' : '#ff7a1a';
        ctx.beginPath(); ctx.moveTo(fx - 40, y); ctx.quadraticCurveTo(fx - 10, y - 12, fx - 40 + h * 0.6, y - 18); ctx.quadraticCurveTo(fx - 30, y - 8, fx - 40, y - 24); ctx.fill();
      }
      clearGlow(ctx);
    } else if (this.style === 'rook') {
      // a giant rook sliding along its file, straight at you
      const W = 150, H = 260, x0 = fx - W;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, fx - W / 2, fy, W * 0.6, 10);
      ctx.fillStyle = shade(ctx, x0 + W * 0.35, fy - H * 0.6, H, '#ffffff', '#cfcac0', '#5a564e');
      Draw.rr(ctx, x0 - 10, fy - 24, W + 20, 24, 6); ctx.fill();
      Draw.poly(ctx, [x0 + 8, fy - 24, x0 + W - 8, fy - 24, x0 + W - 22, fy - H + 50, x0 + 22, fy - H + 50]);
      ctx.fillRect(x0 + 6, fy - H + 10, W - 12, 44);
      for (let i = 0; i < 4; i++) ctx.fillRect(x0 + 6 + i * ((W - 12) / 4) + 4, fy - H - 14, (W - 12) / 4 - 10, 26);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let yy = fy - H + 70; yy < fy - 30; yy += 22) ctx.fillRect(x0 + 24, yy, W - 48, 3);
      ctx.fillStyle = '#ff3030'; setGlow(ctx, '#ff0000', 14); Draw.ell(ctx, x0 + W * 0.38, fy - H + 32, 9, 5); Draw.ell(ctx, x0 + W * 0.68, fy - H + 32, 9, 5); clearGlow(ctx);
      ctx.fillStyle = 'rgba(200,200,220,0.5)'; for (let i = 0; i < 6; i++) Draw.circ(ctx, x0 - 20 - i * 18, fy - 8 - Math.abs(Math.sin(t * 8 + i)) * 12, 6 - i * 0.6);
    } else if (this.style === 'clowncar') {
      // a tiny clown car, impossibly packed, honking after you
      const cx = fx - 120, cy = fy - 60, bump = Math.abs(Math.sin(t * 14)) * 4;
      ctx.save(); ctx.translate(cx, cy - bump);
      ctx.fillStyle = shade(ctx, -20, -20, 120, '#ff8a9a', '#e0102a', '#4a0008'); Draw.rr(ctx, -110, -40, 220, 70, 26); ctx.fill();
      ctx.fillStyle = '#ffd040'; ctx.fillRect(-100, -6, 200, 6);
      ctx.fillStyle = 'rgba(180,230,255,0.5)'; Draw.rr(ctx, -40, -84, 110, 48, 14); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(-20 + i * 26, -66 + Math.sin(t * 10 + i) * 3); drawClownFace(ctx, 0, 0, 11, t + i, { laugh: true, angry: true }); ctx.restore(); }
      ctx.fillStyle = '#e8e8e8'; Draw.circ(ctx, 112, -10, 10); ctx.fillStyle = '#c8102e'; Draw.circ(ctx, 112, -10, 5); // horn
      for (const wx of [-70, 70]) { ctx.save(); ctx.translate(wx, 34 + bump); ctx.rotate(this.rot); ctx.fillStyle = '#1a1a1a'; Draw.circ(ctx, 0, 0, 26); ctx.fillStyle = '#ffd040'; Draw.circ(ctx, 0, 0, 10); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-2, -10, 4, 20); ctx.restore(); }
      ctx.restore();
      if (Math.sin(t * 3) > 0.95) { ctx.fillStyle = '#fff'; ctx.font = '900 22px Nunito, sans-serif'; ctx.fillText('HONK!', fx - 10, fy - 140); }
    } else if (this.style === 'olive') {
      // a GIANT rolling olive, screaming its head off
      const R = 86, cx = fx - R, cy = fy - R;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, cx, fy, R * 0.9, 10);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.rot * 0.15);
      drawOlive(ctx, 0, 0, R, R * 0.92, t, { scream: true });
      ctx.restore();
    } else if (this.style === 'serpent') {
      // a giant bog serpent bursting out of the swamp
      const hx = fx - 60, hy = fy - 110 + Math.sin(t * 6) * 8;
      ctx.fillStyle = lin(ctx, 0, fy - 200, 0, fy, ['#4a6a2a', '#2a3a14', '#0a1004']);
      ctx.beginPath(); ctx.moveTo(fx - 2000, fy); ctx.lineTo(fx - 2000, fy - 160);
      for (let i = 0; i <= 10; i++) { const sx = fx - 2000 + i * 194; ctx.lineTo(sx, fy - 150 + Math.sin(t * 3 + i) * 20); }
      ctx.lineTo(hx - 30, hy + 10); ctx.lineTo(hx - 20, fy); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(hx, hy);
      ctx.fillStyle = shade(ctx, -10, -20, 70, '#8aa04a', '#3a5a1a', '#0e1a04');
      ctx.beginPath(); ctx.moveTo(-60, -50); ctx.quadraticCurveTo(10, -80, 70, -30); ctx.lineTo(80, -6); ctx.lineTo(-50, 20); ctx.closePath(); ctx.fill();
      const jaw = 22 + Math.sin(t * 8) * 10;
      ctx.beginPath(); ctx.moveTo(-50, 24); ctx.lineTo(76, 0 + jaw); ctx.lineTo(60, 34 + jaw); ctx.quadraticCurveTo(0, 60, -40, 50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a0606'; Draw.poly(ctx, [-40, 20, 78, -4, 74, 4 + jaw, -36, 30]);
      // teeth sit exactly on the edges of the mouth: top row hangs from the upper jaw, bottom row grows from the lower jaw
      ctx.fillStyle = '#f0f0d0';
      const upY = (x) => 20 + (x + 40) * (-24 / 118);
      const loY = (x) => 30 + (x + 36) * ((4 + jaw - 30) / 110);
      for (let i = 0; i < 6; i++) {
        const tx = -26 + i * 18;
        Draw.poly(ctx, [tx - 4, upY(tx - 4), tx + 4, upY(tx + 4), tx, upY(tx) + 10]);
        const bx = tx + 8;
        if (bx < 70) Draw.poly(ctx, [bx - 4, loY(bx - 4), bx + 4, loY(bx + 4), bx, loY(bx) - 9]);
      }
      ctx.fillStyle = '#ffd040'; setGlow(ctx, '#ff3a00', 16); Draw.ell(ctx, 20, -40, 8, 5); clearGlow(ctx);
      ctx.fillStyle = '#000'; Draw.ell(ctx, 21, -40, 1.6, 4.5);
      ctx.restore();
    } else {
      // the void: a wall of darkness full of eyes
      const g2 = ctx.createLinearGradient(fx - 300, 0, fx, 0);
      g2.addColorStop(0, '#05010c'); g2.addColorStop(0.8, '#1a0430'); g2.addColorStop(1, 'rgba(120,40,220,0)');
      ctx.fillStyle = g2; ctx.fillRect(fx - 2000, fy - 400, 2000, 420);
      for (let i = 0; i < 8; i++) {
        const ex = fx - 50 - (i * 37) % 160, ey = fy - 40 - (i * 71) % 300, open = Math.max(0.1, Math.sin(t * 2 + i));
        ctx.fillStyle = '#f0e0ff'; Draw.ell(ctx, ex, ey, 8, 5 * open);
        ctx.fillStyle = '#a040ff'; setGlow(ctx, '#d080ff', 10); Draw.circ(ctx, ex + 2, ey, 2.4 * open); clearGlow(ctx);
      }
    }
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
    if (type === 'seed' || type === 'icicle') { this.w = 14; this.h = 14; this.grav = 1300; this.breakable = true; }
    if (type === 'frostwave') { this.w = 26; this.h = 26; this.grav = 0; this.life = 3.5; }
    if (type === 'wave') { this.w = 26; this.h = 26; this.grav = 0; this.life = 3.5; }
    if (type === 'debris') { this.w = 18; this.h = 18; this.grav = 0; this.warn = 0.7; }
    if (type === 'wisp') { this.w = 30; this.h = 18; this.grav = 0; this.life = 1.3; this.dmg = 6; }
    if (type === 'bullet') { this.w = 10; this.h = 4; this.grav = 0; this.life = 2.2; this.hostile = true; this.breakable = true; }
    if (type === 'pwave') { this.w = 26; this.h = 26; this.grav = 0; this.life = 0.75; this.dmg = 4; this.hostile = false; }
  }
  update(dt, g) {
    this.t += dt; this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.type === 'debris' && this.warn > 0) { this.warn -= dt; if (this.warn <= 0) this.vy = 120; return; }
    if (this.type === 'debris') this.vy = Math.min(this.vy + 1600 * dt, 900);
    this.vy += (this.grav || 0) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    if (this.type === 'pwave') {
      if (g.world.solidAt(this.vx > 0 ? this.x + this.w : this.x, cy)) this.dead = true;
      if (Math.random() < 0.6) g.particles.push(makeParticle(cx, this.y + this.h, rand(-30, 30), rand(-120, -40), 0.35, '#e8f6ff', 2.5, 0));
    } else if (this.type === 'wave' || this.type === 'frostwave') {
      const fw = this.type === 'frostwave';
      if (g.world.solidAt(this.vx > 0 ? this.x + this.w : this.x, cy)) this.dead = true;
      if (Math.random() < 0.7) g.particles.push(makeParticle(cx + rand(-8, 8), this.y + this.h, rand(-30, 30), rand(-160, -60), 0.4, fw ? (Math.random() < 0.5 ? '#bff4ff' : '#ffffff') : (Math.random() < 0.5 ? '#ff8a1a' : '#ffd84d'), 3, 0));
    } else if (g.world.solidAt(cx, cy)) {
      this.dead = true;
      g.burst(cx, cy, 6, this.type === 'wisp' ? '#bff8ff' : '#c8a86a', 140);
    }
    if (this.type === 'wisp') {
      this.trail = this.trail || [];
      this.trail.unshift({ x: cx, y: cy + Math.sin(this.t * 30) * 2 });
      if (this.trail.length > 14) this.trail.pop();
      if (Math.random() < 0.6) g.particles.push(makeParticle(cx, cy + rand(-5, 5), -this.vx * 0.1, rand(-30, 30), 0.35, '#c8fbff', rand(1, 2.2), 0));
    }
  }
  draw(ctx, t) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    if (this.type === 'seed' && this.skin) {
      ctx.translate(cx, cy); ctx.rotate(this.t * 8);
      if (this.skin === 'rock') { ctx.fillStyle = shade(ctx, -2, -2, 10, '#c8b8a0', '#7a6a58', '#2a221c'); Draw.poly(ctx, [-9, -4, -3, -9, 6, -7, 9, 2, 3, 9, -7, 6]); }
      else if (this.skin === 'gear') { ctx.fillStyle = shade(ctx, 0, 0, 9, '#fff0b0', '#c8a040', '#4a3a10'); for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(5, -2, 4, 4); } Draw.circ(ctx, 0, 0, 6); ctx.fillStyle = '#2a2008'; Draw.circ(ctx, 0, 0, 2); }
      else if (this.skin === 'pin') { ctx.fillStyle = shade(ctx, 0, -2, 10, '#ffffff', '#e8e0d8', '#8a8078'); Draw.ell(ctx, 0, 2, 5, 7); Draw.ell(ctx, 0, -6, 2.5, 4); ctx.fillStyle = '#c8102e'; ctx.fillRect(-3, -3, 6, 2); ctx.fillRect(-3.2, 0, 6.4, 1.5); }
      else if (this.skin === 'bubble') { setGlow(ctx, '#9aff4a', 12); ctx.fillStyle = shade(ctx, -2, -2, 9, '#f0ffd0', '#8ad83a', '#1a4008'); Draw.circ(ctx, 0, 0, 7); clearGlow(ctx); ctx.fillStyle = 'rgba(255,255,255,0.7)'; Draw.circ(ctx, -2, -2, 1.8); }
      else if (this.skin === 'ember') { setGlow(ctx, '#ff6a00', 14); ctx.fillStyle = shade(ctx, 0, 0, 8, '#fff8c0', '#ffa020', '#c02800'); Draw.circ(ctx, 0, 0, 7); clearGlow(ctx); }
      else { setGlow(ctx, '#b050ff', 14); ctx.fillStyle = shade(ctx, 0, 0, 8, '#ffffff', '#b070ff', '#2a0060'); Draw.circ(ctx, 0, 0, 7); clearGlow(ctx); ctx.fillStyle = '#000'; Draw.circ(ctx, 1, 0, 2); }
    } else if (this.type === 'seed') { // bone shard
      ctx.translate(cx, cy); ctx.rotate(this.t * 10);
      ctx.fillStyle = shade(ctx, 0, 0, 7, '#ffffff', '#d8d0b8', '#5a5240'); Draw.rr(ctx, -7, -2, 14, 4, 2); ctx.fill(); Draw.circ(ctx, -7, -2, 2.4); Draw.circ(ctx, -7, 2, 2.4); Draw.circ(ctx, 7, -2, 2.4); Draw.circ(ctx, 7, 2, 2.4);
    } else if (this.type === 'icicle') {
      ctx.translate(cx, cy); ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
      setGlow(ctx, '#7ae0ff', 10);
      ctx.fillStyle = lin(ctx, -4, 0, 4, 0, ['#ffffff', '#9fe8ff', '#3a8ac0']);
      Draw.poly(ctx, [-4, -8, 4, -8, 0, 10]);
    } else if (this.type === 'bullet') {
      ctx.fillStyle = 'rgba(255,200,80,0.35)'; ctx.fillRect(this.vx > 0 ? this.x - 14 : this.x + this.w, this.y + 1, 14, 2); // tracer
      ctx.fillStyle = '#e8c060'; Draw.rr(ctx, this.x, this.y, this.w, this.h, 2); ctx.fill();
    } else if (this.type === 'pwave') {
      const base = this.y + this.h; const k = this.life / 0.75;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      setGlow(ctx, '#bff4ff', 16);
      ctx.fillStyle = lin(ctx, 0, base - 26, 0, base, ['rgba(255,255,255,0)', '#e8fbff', '#7ad8ff']);
      ctx.beginPath(); ctx.moveTo(this.x - 4, base); ctx.quadraticCurveTo(cx, base - 34, this.x + this.w + 4, base); ctx.fill();
      clearGlow(ctx);
    } else if (this.type === 'frostwave') {
      // jagged ice bursting out of the ground
      const base = this.y + this.h;
      setGlow(ctx, '#5ad0ff', 14);
      for (let i = 0; i < 5; i++) {
        const sx = this.x + 2 + i * 5.5, hgt = 12 + Math.abs(Math.sin(i * 2.1 + this.t * 8)) * 16;
        ctx.fillStyle = lin(ctx, sx - 3, 0, sx + 3, 0, ['#ffffff', '#9fe8ff', '#2a7ab0']);
        Draw.poly(ctx, [sx - 3.5, base, sx + 3.5, base, sx + Math.sin(i) * 2, base - hgt]);
      }
      clearGlow(ctx);
      ctx.fillStyle = 'rgba(220,245,255,0.5)'; ctx.fillRect(this.x - 4, base - 2, this.w + 8, 2);
    } else if (this.type === 'wave' && this.skin && this.skin !== 'fire') {
      const base = this.y + this.h;
      if (this.skin === 'mud') {
        for (let i = 0; i < 6; i++) { const sx = this.x + i * 5, hg = 10 + Math.abs(Math.sin(this.t * 14 + i * 1.3)) * 18; ctx.fillStyle = i % 2 ? '#5a6a22' : '#3a4a14'; ctx.beginPath(); ctx.moveTo(sx - 4, base); ctx.quadraticCurveTo(sx, base - hg * 1.3, sx + 5, base); ctx.fill(); }
        ctx.fillStyle = '#9aff4a'; for (let i = 0; i < 3; i++) Draw.circ(ctx, this.x + 4 + i * 9, base - 8 - Math.abs(Math.sin(this.t * 9 + i)) * 14, 1.6);
      } else if (this.skin === 'rock') {
        for (let i = 0; i < 5; i++) { const sx = this.x + 2 + i * 5.5, hg = 10 + Math.abs(Math.sin(i * 2.1 + this.t * 8)) * 16; ctx.fillStyle = lin(ctx, sx - 3, 0, sx + 3, 0, ['#c8b8a0', '#7a6a58', '#2e2620']); Draw.poly(ctx, [sx - 4, base, sx + 4, base, sx + Math.sin(i) * 2, base - hg]); }
      } else if (this.skin === 'gear') {
        ctx.save(); ctx.translate(this.x + this.w / 2, base - 13); ctx.rotate(this.t * 14 * Math.sign(this.vx)); ctx.fillStyle = shade(ctx, 0, 0, 14, '#fff0b0', '#c8a040', '#4a3a10');
        for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillRect(9, -3, 5, 6); } Draw.circ(ctx, 0, 0, 11); ctx.fillStyle = '#2a2008'; Draw.circ(ctx, 0, 0, 3); ctx.restore();
      } else {
        setGlow(ctx, '#b050ff', 16);
        for (let i = 0; i < 5; i++) { const sx = this.x + 2 + i * 5.5, hg = 12 + Math.abs(Math.sin(i * 2.1 + this.t * 10)) * 18; ctx.fillStyle = i % 2 ? '#d080ff' : '#5a1aa8'; ctx.beginPath(); ctx.moveTo(sx - 4, base); ctx.quadraticCurveTo(sx, base - hg * 1.2, sx + 4, base); ctx.fill(); }
        clearGlow(ctx);
      }
    } else if (this.type === 'wave') {
      // a rolling wall of flame
      const base = this.y + this.h;
      setGlow(ctx, '#ff6a1a', 18);
      for (let i = 0; i < 6; i++) {
        const fx = this.x + i * 5, fh = 14 + Math.abs(Math.sin(this.t * 22 + i * 1.7)) * 18;
        const g = ctx.createLinearGradient(0, base - fh, 0, base);
        g.addColorStop(0, 'rgba(255,240,160,0)'); g.addColorStop(0.3, '#ffd84d'); g.addColorStop(0.7, '#ff7a1a'); g.addColorStop(1, '#c02800');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(fx - 4, base); ctx.quadraticCurveTo(fx - 3, base - fh * 0.6, fx + Math.sin(this.t * 30 + i) * 2, base - fh); ctx.quadraticCurveTo(fx + 4, base - fh * 0.5, fx + 5, base); ctx.fill();
      }
      clearGlow(ctx);
    } else if (this.type === 'debris') {
      if (this.warn > 0) {
        ctx.globalAlpha = 0.4 + Math.sin(t * 30) * 0.3;
        ctx.fillStyle = '#ff5a3a';
        Draw.poly(ctx, [cx - 8, this.y - 4, cx + 8, this.y - 4, cx, this.y + 8]);
        ctx.globalAlpha = 1;
      }
      if (this.skin && this.skin !== 'stalactite') {
        ctx.translate(cx, cy);
        if (this.skin === 'gear') { ctx.rotate(this.t * 10); ctx.fillStyle = shade(ctx, 0, 0, 11, '#fff0b0', '#c8a040', '#4a3a10'); for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(6, -2.5, 5, 5); } Draw.circ(ctx, 0, 0, 8); }
        else if (this.skin === 'chandelier') { setGlow(ctx, '#ffa000', 12); ctx.fillStyle = '#c8a050'; Draw.rr(ctx, -10, 0, 20, 4, 2); ctx.fill(); ctx.fillStyle = '#ffd060'; for (const d of [-6, 0, 6]) Draw.circ(ctx, d, -3, 2.5); clearGlow(ctx); }
        else { setGlow(ctx, '#b050ff', 12); ctx.fillStyle = lin(ctx, -6, 0, 6, 0, ['#f8e8ff', '#b070ff', '#3a0a8a']); Draw.poly(ctx, [-6, -10, 6, -10, 0, 12]); clearGlow(ctx); }
      } else if (this.skin === 'stalactite') {
        ctx.translate(cx, cy);
        ctx.fillStyle = lin(ctx, -7, 0, 7, 0, ['#c8b8a0', '#7a6a58', '#2e2620']); Draw.poly(ctx, [-7, -12, 7, -12, 0, 14]);
      } else if (THEME.snow) {
        ctx.translate(cx, cy);
        ctx.fillStyle = lin(ctx, -6, 0, 6, 0, ['#ffffff', '#9fe8ff', '#3a8ac0']); Draw.poly(ctx, [-6, -10, 6, -10, 0, 12]);
      } else {
        ctx.translate(cx, cy); ctx.rotate(this.t * 4);
        ctx.fillStyle = shade(ctx, 0, 0, 10, '#7a6c96', '#3a2f4f', '#120c1e'); Draw.poly(ctx, [-9, -6, 0, -10, 9, -4, 7, 8, -6, 9]);
      }
    } else if (this.type === 'wisp') {
      // flowing ghost trail
      const tr = this.trail || [];
      for (let i = tr.length - 1; i >= 0; i--) {
        const k = 1 - i / tr.length;
        ctx.globalAlpha = k * 0.55;
        ctx.fillStyle = i % 2 ? '#7ae8ff' : '#c8fbff';
        Draw.circ(ctx, tr[i].x, tr[i].y, 2 + k * 7);
      }
      ctx.globalAlpha = 1;
      setGlow(ctx, '#2ee6ff', 22);
      ctx.translate(cx, cy); ctx.scale(Math.sign(this.vx) || 1, 1);
      const og = ctx.createRadialGradient(4, -2, 1, 4, 0, 10);
      og.addColorStop(0, '#ffffff'); og.addColorStop(0.5, '#bff8ff'); og.addColorStop(1, 'rgba(60,200,255,0.2)');
      ctx.fillStyle = og; Draw.circ(ctx, 4, 0, 10);
      clearGlow(ctx);
      ctx.fillStyle = '#0e2a38'; Draw.ell(ctx, 6, -2.5, 1.2, 1.8); Draw.ell(ctx, 6, 2.5, 1.2, 1.8);
    }
    ctx.restore();
  }
}

/* =========================== SHARDS =========================== */
// Glowing crystal shards to collect. Small = 1, big = 5. Spend them on heads in the shop.
class Shard {
  constructor(x, y, opts = {}) {
    this.big = !!opts.big; this.value = this.big ? 5 : 1; this.small = !this.big;
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
    if (this.delay <= 0 && d < 64 * p.st.magnet && !p.dead) {
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
