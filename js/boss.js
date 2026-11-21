// BOSS OF LEVEL 10 — The Gourd King (boss for the haunted pumpkin-patch levels 1–10). Not used until Level 10 exists.
// Attacks: Charge (rams the wall), Leap Slam (fire shockwaves), Seed Spit (arcing seeds).
// Phase 2 (below half health): faster, double leaps, more seeds, and charges shake debris from the ceiling.
class GourdKing {
  constructor(x, y, arena) {
    this.w = 96; this.h = 100;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.arena = arena;
    this.maxHp = 64; this.hp = this.maxHp;
    this.phase = 1;
    this.state = 'intro'; this.timer = 2.2;
    this.facing = -1; this.flash = 0; this.anim = 0;
    this.last = ''; this.leapsLeft = 0; this.spitLeft = 0; this.leftGround = false;
    this.ignoreOneway = true;
    this.dying = false; this.dead = false;
    this.squash = 0;
    this.name = 'THE GOURD KING';
  }
  hitbox() { return { x: this.x + 8, y: this.y + 12, w: this.w - 16, h: this.h - 12 }; }
  get spd() { return this.phase === 2 ? 1.25 : 1; }
  toIdle() { this.state = 'idle'; this.timer = this.phase === 2 ? 0.5 : 0.85; }

  chooseAttack() {
    const opts = ['charge', 'leap', 'spit'].filter((a) => a !== this.last);
    const a = opts[Math.floor(Math.random() * opts.length)];
    this.last = a;
    if (a === 'charge') { this.state = 'tele_charge'; this.timer = 0.65 / this.spd; }
    if (a === 'leap') { this.state = 'tele_leap'; this.timer = 0.45 / this.spd; this.leapsLeft = this.phase === 2 ? 2 : 1; }
    if (a === 'spit') { this.state = 'tele_spit'; this.timer = 0.55 / this.spd; }
  }

  hurt(dmg, g) {
    if (this.dying || this.state === 'intro') return false;
    this.hp -= dmg; this.flash = 0.1;
    g.burst(this.x + this.w / 2 + rand(-20, 20), this.y + this.h / 2 + rand(-20, 20), 8, '#ff9f40', 220);
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2; this.state = 'roar'; this.timer = 1.2; this.vx = 0;
      g.shake = 18; Sfx.play('roar');
      g.toast('The Gourd King is ENRAGED!', 2.2);
    }
    if (this.hp <= 0) {
      this.hp = 0; this.dying = true; this.state = 'dying'; this.timer = 2.6; this.vx = 0;
      Sfx.play('roar');
    }
    return true;
  }

  update(dt, g) {
    this.anim += dt; this.flash -= dt; this.timer -= dt; this.squash = Math.max(0, this.squash - dt * 4);
    const p = g.player;
    const pc = p.x + p.w / 2, bc = this.x + this.w / 2;
    const A = this.arena;

    if (!['charge', 'leap'].includes(this.state)) this.vx = approach(this.vx, 0, 1500 * dt);
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, 1200);
    moveEntity(g.world, this, dt);

    switch (this.state) {
      case 'intro':
        if (this.onGround && !this.landedIntro) {
          this.landedIntro = true; this.squash = 1; g.shake = 16; Sfx.play('slam');
          g.dust(bc, this.y + this.h, 20);
          setTimeout(() => Sfx.play('roar'), 250);
        }
        this.facing = pc < bc ? -1 : 1;
        if (this.timer <= 0) this.toIdle();
        break;
      case 'idle':
        this.facing = pc < bc ? -1 : 1;
        if (this.timer <= 0) this.chooseAttack();
        break;
      case 'tele_charge':
        this.facing = pc < bc ? -1 : 1;
        if (Math.random() < 0.5) g.dust(bc - this.facing * 40, this.y + this.h, 1);
        if (this.timer <= 0) { this.state = 'charge'; Sfx.play('roar'); }
        break;
      case 'charge':
        this.vx = this.facing * 470 * this.spd;
        if (Math.random() < 0.6) g.dust(bc - this.facing * 40, this.y + this.h, 1);
        if (this.hitWallL || this.hitWallR) {
          this.state = 'stunned'; this.timer = 0.9;
          this.vx = -this.facing * 160; this.vy = -320; this.squash = 1;
          g.shake = 14; Sfx.play('slam');
          g.burst(this.facing > 0 ? this.x + this.w : this.x, this.y + this.h / 2, 16, '#8a7aa8', 260);
          if (this.phase === 2) g.spawnDebris(5);
        }
        break;
      case 'stunned':
        if (this.timer <= 0) this.toIdle();
        break;
      case 'tele_leap':
        this.facing = pc < bc ? -1 : 1;
        if (this.timer <= 0) {
          const air = 0.9;
          const target = clamp(pc - this.w / 2, A.x1, A.x2 - this.w);
          this.vy = -900; this.vx = (target - this.x) / air;
          this.state = 'leap'; this.leftGround = false;
          Sfx.play('jump');
        }
        break;
      case 'leap':
        if (!this.onGround) this.leftGround = true;
        if (this.leftGround && this.onGround) {
          this.vx = 0; this.squash = 1;
          g.shake = 16; Sfx.play('slam');
          g.dust(bc, this.y + this.h, 16);
          g.spawnShockwaves(this);
          this.leapsLeft--;
          if (this.leapsLeft > 0) { this.state = 'tele_leap'; this.timer = 0.3; }
          else { this.state = 'recover'; this.timer = 0.7; }
        }
        break;
      case 'tele_spit':
        this.facing = pc < bc ? -1 : 1;
        if (this.timer <= 0) { this.state = 'spit'; this.spitLeft = this.phase === 2 ? 7 : 4; this.timer = 0; }
        break;
      case 'spit':
        if (this.timer <= 0 && this.spitLeft > 0) {
          const dist = Math.abs(pc - bc);
          const vx = this.facing * clamp(dist * rand(0.55, 1.15), 140, 620);
          g.projectiles.push(new Projectile('seed', bc + this.facing * 30 - 7, this.y + 52, vx, rand(-620, -420)));
          Sfx.play('spit');
          this.spitLeft--; this.timer = 0.15;
        }
        if (this.spitLeft <= 0 && this.timer <= 0) { this.state = 'recover'; this.timer = 0.6; }
        break;
      case 'recover':
        if (this.timer <= 0) this.toIdle();
        break;
      case 'roar':
        if (Math.random() < 0.8) g.particles.push(makeParticle(bc + rand(-40, 40), this.y + rand(10, 60), rand(-60, 60), rand(-200, -80), 0.7, Math.random() < 0.5 ? '#ff5a1a' : '#ffcc33', 3, -100));
        if (this.timer <= 0) this.toIdle();
        break;
      case 'dying':
        g.shake = Math.max(g.shake, 6);
        if (Math.random() < 0.4) g.burst(bc + rand(-40, 40), this.y + rand(10, 90), 10, Math.random() < 0.5 ? '#ff8c26' : '#ffd84d', 260);
        if (this.timer <= 0) {
          this.dead = true;
          g.burst(bc, this.y + this.h / 2, 60, '#ff8c26', 480);
          g.burst(bc, this.y + this.h / 2, 30, '#ffd84d', 380);
          g.onBossDefeated(this);
        }
        break;
    }
  }

  draw(ctx, t) {
    const f = this.flash > 0;
    const c = (col) => (f ? '#ffffff' : col);
    const p2 = this.phase === 2;
    const bc = this.x + this.w / 2;
    let shakeX = 0;
    if (this.state.startsWith('tele') || this.state === 'roar' || this.dying) shakeX = Math.sin(t * 60) * 2.5;
    const breathe = Math.sin(this.anim * 3) * 2;
    const sq = this.squash;

    ctx.save();
    ctx.translate(bc + shakeX, this.y + this.h);
    ctx.scale(this.facing * (1 + sq * 0.15), 1 - sq * 0.12);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);

    // vine legs
    ctx.fillStyle = c('#22361a');
    const walk = this.state === 'charge' ? Math.sin(this.anim * 25) * 6 : 0;
    Draw.rr(ctx, -30 + walk, -18, 14, 18, 5); ctx.fill();
    Draw.rr(ctx, 14 - walk, -18, 14, 18, 5); ctx.fill();

    // back arm (vine)
    ctx.strokeStyle = c('#2d4a1e'); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-40, -50); ctx.quadraticCurveTo(-60, -40 + breathe, -52, -20); ctx.stroke();

    // pumpkin body
    const cy = -58 + breathe * 0.5;
    ctx.fillStyle = c(p2 ? '#8a2e0c' : '#a8440f');
    Draw.ell(ctx, -26, cy, 26, 42); Draw.ell(ctx, 26, cy, 26, 42);
    ctx.fillStyle = c(p2 ? '#b03a10' : '#d35b14');
    Draw.ell(ctx, -13, cy, 26, 45); Draw.ell(ctx, 13, cy, 26, 45);
    ctx.fillStyle = c(p2 ? '#cc4a16' : '#f07a1e');
    Draw.ell(ctx, 0, cy, 24, 46);
    ctx.fillStyle = f ? '#fff' : 'rgba(255,220,160,0.25)';
    Draw.ell(ctx, -14, cy - 26, 9, 5, -0.5);

    // crown of thorns
    ctx.fillStyle = c('#1d2b14');
    ctx.fillRect(-28, cy - 48, 56, 8);
    for (let i = 0; i < 5; i++) {
      const x = -24 + i * 12;
      Draw.poly(ctx, [x - 5, cy - 46, x + 5, cy - 46, x + (i % 2 ? 2 : -2), cy - 66 + (i === 2 ? -6 : 0)]);
    }
    ctx.fillStyle = c('#c070ff'); if (!f) setGlow(ctx, '#a040ff', 10);
    for (let i = 0; i < 5; i++) Draw.circ(ctx, -24 + i * 12 + (i % 2 ? 2 : -2), cy - 64 + (i === 2 ? -6 : 0), 2.2);
    clearGlow(ctx);

    // carved face
    const eyeCol = p2 ? '#ff4a1a' : '#ffd84d';
    const glowCol = p2 ? '#ff2a00' : '#ff9b1a';
    ctx.fillStyle = c(eyeCol); if (!f) setGlow(ctx, glowCol, 22);
    Draw.poly(ctx, [-18, cy - 14, -2, cy - 6, -16, cy - 2]);
    Draw.poly(ctx, [24, cy - 16, 6, cy - 6, 22, cy - 2]);
    const mouthOpen = (this.state === 'tele_spit' || this.state === 'spit' || this.state === 'roar') ? 10 : 0;
    ctx.beginPath();
    ctx.moveTo(-22, cy + 8);
    const teeth = [-16, -8, 0, 8, 16];
    teeth.forEach((x, i) => { ctx.lineTo(x - 3, cy + 8 + (i % 2 ? 6 : 0)); ctx.lineTo(x, cy + (i % 2 ? 14 : 4)); });
    ctx.lineTo(24, cy + 8);
    ctx.quadraticCurveTo(10, cy + 26 + mouthOpen, -2, cy + 26 + mouthOpen);
    ctx.quadraticCurveTo(-16, cy + 26 + mouthOpen, -22, cy + 8);
    ctx.fill();
    clearGlow(ctx);
    if (p2 && !f) { // flames from the eyes
      ctx.fillStyle = 'rgba(255,120,20,0.8)';
      for (const ex of [-10, 14]) {
        ctx.beginPath(); ctx.moveTo(ex - 5, cy - 12);
        ctx.quadraticCurveTo(ex, cy - 26 - Math.sin(t * 20 + ex) * 5, ex + 5, cy - 12); ctx.fill();
      }
    }

    // front arm
    ctx.strokeStyle = c('#2d4a1e'); ctx.lineWidth = 7;
    const armUp = this.state === 'tele_leap' || this.state === 'roar' ? -30 : 0;
    ctx.beginPath(); ctx.moveTo(36, -54); ctx.quadraticCurveTo(58, -46 + armUp + breathe, 52, -22 + armUp); ctx.stroke();
    ctx.fillStyle = c('#2d4a1e');
    Draw.circ(ctx, 52, -22 + armUp, 6);
    ctx.restore();
  }
}
