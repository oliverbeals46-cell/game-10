// BOSS OF LEVEL 10 — The Grave Warden: a hulking skeletal giant in a tattered cloak and iron crown.
// Boss of the haunted-graveyard levels 1–10. Not used until Level 10 is built.
// Attacks: Charge (rams the wall), Leap Slam (fire shockwaves), Seed Spit (arcing seeds).
// Phase 2 (below half health): faster, double leaps, more seeds, and charges shake debris from the ceiling.
class GraveWarden {
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
    this.name = 'THE GRAVE WARDEN';
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
    g.burst(this.x + this.w / 2 + rand(-20, 20), this.y + this.h / 2 + rand(-20, 20), 8, '#e8e0cc', 220);
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2; this.state = 'roar'; this.timer = 1.2; this.vx = 0;
      g.shake = 18; Sfx.play('roar');
      g.toast('The Grave Warden is ENRAGED!', 2.2);
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
        if (Math.random() < 0.4) g.burst(bc + rand(-40, 40), this.y + rand(10, 90), 10, Math.random() < 0.5 ? '#e8e0cc' : '#5ae0ff', 260);
        if (this.timer <= 0) {
          this.dead = true;
          g.burst(bc, this.y + this.h / 2, 60, '#e8e0cc', 480);
          g.burst(bc, this.y + this.h / 2, 30, '#5ae0ff', 380);
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
    const breathe = Math.sin(this.anim * 2.5) * 2;
    const sq = this.squash;

    ctx.save();
    ctx.translate(bc + shakeX, this.y + this.h);
    ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 52, 8);

    // bony legs
    const walk = this.state === 'charge' ? Math.sin(this.anim * 25) * 6 : 0;
    ctx.strokeStyle = c('#cfc6ae'); ctx.lineWidth = 6; ctx.lineCap = 'round';
    Draw.line(ctx, -16, -30, -20 + walk, 0); Draw.line(ctx, 16, -30, 20 - walk, 0);
    // tattered cloak body
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -110, 0, -10, ['#3a3448', '#1c1828', '#08060c']);
    ctx.beginPath();
    ctx.moveTo(-30, -100 + breathe);
    ctx.quadraticCurveTo(0, -112 + breathe, 30, -100 + breathe);
    ctx.lineTo(46, -20);
    for (let i = 0; i <= 8; i++) ctx.lineTo(46 - i * 11.5, -18 + (i % 2 ? 10 : 0) + Math.sin(t * 4 + i) * 2);
    ctx.closePath(); ctx.fill();
    // exposed ribcage
    ctx.fillStyle = c('#0a080e'); Draw.ell(ctx, 4, -66 + breathe, 16, 22);
    ctx.strokeStyle = c('#d8d0b8'); ctx.lineWidth = 3;
    Draw.line(ctx, 4, -86 + breathe, 4, -46 + breathe);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(4, -80 + i * 9 + breathe, 13 - i, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    ctx.fillStyle = p2 ? 'rgba(255,40,40,0.6)' : 'rgba(90,220,255,0.45)';
    if (!f) setGlow(ctx, p2 ? '#ff2020' : '#5ae0ff', 18);
    Draw.circ(ctx, 4, -66 + breathe, 5 + Math.sin(t * 6) * 1);
    clearGlow(ctx);
    // back arm
    ctx.strokeStyle = c('#b8ae96'); ctx.lineWidth = 5;
    Draw.line(ctx, -28, -92 + breathe, -44, -60); Draw.line(ctx, -44, -60, -40, -34);
    // huge cracked skull
    const hy = -112 + breathe;
    ctx.fillStyle = f ? '#fff' : shade(ctx, 4, hy, 26, '#fffaf0', '#d8d0b8', '#5a5240');
    Draw.circ(ctx, 4, hy, 22);
    ctx.fillStyle = f ? '#fff' : shade(ctx, 6, hy + 18, 14, '#f4efe2', '#c8bea4', '#5a5240'); Draw.rr(ctx, -8, hy + 10, 28, 14, 5); ctx.fill();
    ctx.strokeStyle = c('#6a6250'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, hy - 20); ctx.lineTo(-2, hy - 10); ctx.lineTo(-8, hy - 4); ctx.stroke();
    // eye sockets with burning pupils
    ctx.fillStyle = c('#0a0608'); Draw.ell(ctx, -4, hy, 6, 7); Draw.ell(ctx, 14, hy, 6, 7);
    ctx.fillStyle = p2 ? '#ff3020' : '#7ae8ff'; if (!f) setGlow(ctx, p2 ? '#ff0000' : '#3ad0ff', 20);
    Draw.circ(ctx, -3, hy + 1, 2.4); Draw.circ(ctx, 15, hy + 1, 2.4);
    clearGlow(ctx);
    // jaw opens when spitting bones or roaring
    const open = (this.state === 'tele_spit' || this.state === 'spit' || this.state === 'roar') ? 8 : 0;
    ctx.fillStyle = c('#0a0608'); ctx.fillRect(-4, hy + 13, 22, 3 + open);
    ctx.fillStyle = c('#f4efe2');
    for (let i = 0; i < 6; i++) { ctx.fillRect(-4 + i * 3.8, hy + 12, 2.6, 3.5); ctx.fillRect(-4 + i * 3.8, hy + 14 + open, 2.6, 3); }
    // iron crown
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, hy - 30, 0, hy - 16, ['#8a8a98', '#3a3a46']);
    ctx.fillRect(-16, hy - 24, 40, 7);
    for (let i = 0; i < 5; i++) Draw.poly(ctx, [-14 + i * 9, hy - 23, -8 + i * 9, hy - 23, -11 + i * 9, hy - 36 - (i === 2 ? 6 : 0)]);
    if (p2 && !f) {
      ctx.fillStyle = 'rgba(255,60,20,0.75)';
      for (const ex of [-4, 14]) { ctx.beginPath(); ctx.moveTo(ex - 4, hy - 4); ctx.quadraticCurveTo(ex, hy - 18 - Math.sin(t * 20 + ex) * 5, ex + 4, hy - 4); ctx.fill(); }
    }
    // front arm with a rusty chain
    const armUp = this.state === 'tele_leap' || this.state === 'roar' ? -30 : 0;
    ctx.strokeStyle = c('#d8d0b8'); ctx.lineWidth = 6;
    Draw.line(ctx, 30, -92 + breathe, 50, -66 + armUp); Draw.line(ctx, 50, -66 + armUp, 54, -40 + armUp);
    ctx.strokeStyle = c('#5a4a3a'); ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(54 + Math.sin(t * 3 + i) * 2, -34 + armUp + i * 7, 2.5, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
}
