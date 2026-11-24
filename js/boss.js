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
    this.maxHp = 40; this.hp = this.maxHp; // 20 slashes (touching the boss kills you, so it's not too long)
    this.shotType = 'seed'; this.waveType = 'wave';
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
          const pr = new Projectile(this.shotType, bc + this.facing * 30 - 7, this.y + 52, vx, rand(-620, -420)); pr.skin = this.shotSkin; g.projectiles.push(pr);
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

// BOSS OF LEVEL 20 — The Frozen Widow: a giant ice spider. Same attack pattern style as the Warden,
// but she spits icicles, her slams send frost waves, and her charges shake icicles from the ceiling.
class FrozenWidow extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'THE FROZEN WIDOW';
    this.maxHp = 50; this.hp = 50;
    this.shotType = 'icicle'; this.waveType = 'frostwave';
    this.w = 110; this.h = 80;
  }
  hurt(dmg, g) {
    const wasP1 = this.phase === 1;
    const r = super.hurt(dmg, g);
    if (wasP1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('The Frozen Widow is ENRAGED!', 2.2); }
    return r;
  }
  draw(ctx, t) {
    const f = this.flash > 0;
    const c = (col) => (f ? '#ffffff' : col);
    const p2 = this.phase === 2;
    const bc = this.x + this.w / 2;
    let shakeX = 0;
    if (this.state.startsWith('tele') || this.state === 'roar' || this.dying) shakeX = Math.sin(t * 60) * 2.5;
    const sq = this.squash, bob = Math.sin(this.anim * 3) * 2;
    ctx.save();
    ctx.translate(bc + shakeX, this.y + this.h);
    ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 60, 8);
    // eight legs
    const walk = this.state === 'charge' ? this.anim * 25 : this.anim * 3;
    ctx.strokeStyle = c('#1a2a40'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const ph = Math.sin(walk + i * 1.3 + (s > 0 ? 0 : Math.PI)) * 4;
      const hx = s * (8 + i * 6), hy = -40 + bob;
      const kx = s * (34 + i * 8), ky = -64 + i * 4 + ph;
      const fx = s * (42 + i * 9) + ph, fy = 0;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = c('#dff6ff'); Draw.circ(ctx, kx, ky, 2.5);
    }
    // abdomen (ice) with cracks
    ctx.fillStyle = f ? '#fff' : shade(ctx, -22, -52 + bob, 32, '#f0fcff', p2 ? '#5aa0e0' : '#7ac8f0', '#0e2a4a');
    Draw.ell(ctx, -22, -48 + bob, 30, 24);
    ctx.strokeStyle = c('rgba(255,255,255,0.7)'); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-40, -58 + bob); ctx.lineTo(-28, -48 + bob); ctx.lineTo(-34, -36 + bob); ctx.moveTo(-28, -48 + bob); ctx.lineTo(-12, -54 + bob); ctx.stroke();
    // hourglass mark
    ctx.fillStyle = c(p2 ? '#ff3a4a' : '#3ad0ff'); if (!f) setGlow(ctx, p2 ? '#ff0020' : '#3ad0ff', 14);
    Draw.poly(ctx, [-26, -60 + bob, -18, -60 + bob, -22, -50 + bob]); Draw.poly(ctx, [-26, -40 + bob, -18, -40 + bob, -22, -50 + bob]);
    clearGlow(ctx);
    // head with many eyes
    ctx.fillStyle = f ? '#fff' : shade(ctx, 16, -44 + bob, 18, '#e8f6ff', '#6a9ac0', '#0e1e34'); Draw.ell(ctx, 16, -42 + bob, 18, 15);
    const eyeCol = p2 ? '#ff3a3a' : '#bff4ff';
    ctx.fillStyle = c(eyeCol); if (!f) setGlow(ctx, p2 ? '#ff0000' : '#3ad0ff', 12);
    for (const [ex, ey, er] of [[20, -48, 3], [28, -46, 3], [16, -52, 2], [26, -53, 2], [12, -46, 1.8], [32, -50, 1.8]]) Draw.circ(ctx, ex, ey + bob, er);
    clearGlow(ctx);
    // fangs, open when spitting
    const open = (this.state === 'tele_spit' || this.state === 'spit' || this.state === 'roar') ? 5 : 0;
    ctx.fillStyle = c('#ffffff');
    Draw.poly(ctx, [24, -34 + bob, 28, -34 + bob, 25 + open, -24 + bob]); Draw.poly(ctx, [30, -34 + bob, 34, -34 + bob, 33 + open, -25 + bob]);
    // icicle crown
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -70, 0, -55, ['#ffffff', '#9fe8ff']);
    for (let i = 0; i < 5; i++) Draw.poly(ctx, [4 + i * 6, -55 + bob, 8 + i * 6, -55 + bob, 6 + i * 6, -68 - (i === 2 ? 6 : 0) + bob]);
    ctx.restore();
  }
}

// ---------------- Bosses of Levels 30, 40, 50, 60 ----------------
// They use the same attack rhythm as the Warden (charge / leap slam / throw, enrage at half health),
// each with its own body, projectiles and shockwaves.
class Troll extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'THE TROLL'; this.maxHp = this.hp = 56; this.w = 110; this.h = 124;
    this.shotSkin = 'rock'; this.waveSkin = 'rock'; this.debrisSkin = 'stalactite';
  }
  hurt(dmg, g) { const p1 = this.phase === 1, r = super.hurt(dmg, g); if (p1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('The Troll is ENRAGED! Watch the ceiling!', 2.4); g.spawnDebris(6); } return r; }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col), p2 = this.phase === 2;
    const bc = this.x + this.w / 2, sq = this.squash, breathe = Math.sin(this.anim * 2.5) * 2;
    const shakeX = (this.state.startsWith('tele') || this.state === 'roar' || this.dying) ? Math.sin(t * 60) * 2.5 : 0;
    ctx.save(); ctx.translate(bc + shakeX, this.y + this.h); ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 60, 9);
    const skin = (cx, cy, r) => (f ? '#fff' : shade(ctx, cx, cy, r, p2 ? '#a8b088' : '#9aa88a', p2 ? '#5e6a40' : '#56664a', '#1a2014'));
    const walk = this.state === 'charge' ? Math.sin(this.anim * 22) * 7 : 0;
    // legs
    ctx.fillStyle = skin(-18, -20, 22); Draw.rr(ctx, -34 + walk, -36, 24, 36, 10); ctx.fill();
    ctx.fillStyle = skin(18, -20, 22); Draw.rr(ctx, 10 - walk, -36, 24, 36, 10); ctx.fill();
    ctx.fillStyle = c('#3a2a1a'); ctx.fillRect(-36, -46, 72, 14); // loincloth
    // back arm
    ctx.fillStyle = skin(-40, -80, 16); Draw.rr(ctx, -54, -96 + breathe, 18, 52, 9); ctx.fill();
    // big belly body
    ctx.fillStyle = skin(-6, -84, 50); Draw.ell(ctx, 0, -78 + breathe, 46, 42);
    ctx.fillStyle = c('rgba(255,255,255,0.08)'); Draw.ell(ctx, -16, -96 + breathe, 16, 10, -0.4);
    ctx.strokeStyle = c('rgba(30,40,20,0.6)'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -66 + breathe, 18, 0.3, Math.PI - 0.3); ctx.stroke();
    // head (small, low, with tusks)
    const hy = -118 + breathe;
    ctx.fillStyle = skin(10, hy, 24); Draw.ell(ctx, 10, hy, 24, 20);
    ctx.fillStyle = skin(26, hy + 2, 10); Draw.ell(ctx, 26, hy + 2, 9, 7); // nose
    ctx.fillStyle = c('#1a1408'); Draw.ell(ctx, 2, hy - 4, 5, 3); Draw.ell(ctx, 18, hy - 6, 5, 3);
    ctx.fillStyle = c(p2 ? '#ff3a2a' : '#ffd040'); if (!f) setGlow(ctx, p2 ? '#ff0000' : '#ffa000', 14);
    Draw.circ(ctx, 3, hy - 4, 2.2); Draw.circ(ctx, 19, hy - 6, 2.2); clearGlow(ctx);
    ctx.strokeStyle = c('#1a1408'); ctx.lineWidth = 3; Draw.line(ctx, -4, hy - 12, 8, hy - 9); Draw.line(ctx, 14, hy - 11, 26, hy - 14);
    const open = (this.state === 'tele_spit' || this.state === 'spit' || this.state === 'roar') ? 6 : 0;
    ctx.fillStyle = c('#2a1008'); Draw.rr(ctx, 2, hy + 8, 24, 4 + open, 2); ctx.fill();
    ctx.fillStyle = c('#f0e8c8'); Draw.poly(ctx, [4, hy + 10, 8, hy + 10, 5, hy - 2]); Draw.poly(ctx, [20, hy + 10, 24, hy + 10, 23, hy - 2]);
    // front arm + spiked club
    const up = (this.state === 'tele_leap' || this.state === 'tele_charge' || this.state === 'roar') ? -1.6 : this.state === 'leap' ? -2.2 : 0.2;
    ctx.save(); ctx.translate(38, -100 + breathe); ctx.rotate(up);
    ctx.fillStyle = skin(0, 20, 16); Draw.rr(ctx, -9, -4, 18, 46, 9); ctx.fill();
    ctx.translate(0, 40); ctx.rotate(-0.4);
    ctx.fillStyle = f ? '#fff' : lin(ctx, -8, 0, 8, 0, ['#8a5a30', '#5a3a1a', '#2a1a08']);
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(12, 60); ctx.lineTo(-12, 60); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c('#c8c0b0'); for (const [sx, sy] of [[-12, 40], [12, 44], [-11, 54], [13, 56], [0, 62]]) Draw.poly(ctx, [sx - 3, sy, sx + 3, sy, sx + Math.sign(sx || 1) * 7, sy - 3]);
    ctx.restore();
    ctx.restore();
  }
}

class ClockBoss extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'THE GRANDFATHER CLOCK'; this.maxHp = this.hp = 60; this.w = 86; this.h = 132;
    this.shotSkin = 'gear'; this.waveSkin = 'gear'; this.debrisSkin = 'gear';
  }
  hurt(dmg, g) { const p1 = this.phase === 1, r = super.hurt(dmg, g); if (p1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('The Clock strikes MIDNIGHT!', 2.4); } return r; }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col), p2 = this.phase === 2;
    const bc = this.x + this.w / 2, sq = this.squash;
    const shakeX = (this.state.startsWith('tele') || this.state === 'roar' || this.dying) ? Math.sin(t * 60) * 2.5 : 0;
    ctx.save(); ctx.translate(bc + shakeX, this.y + this.h); ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 50, 8);
    const walk = this.state === 'charge' ? Math.sin(this.anim * 22) * 5 : 0;
    ctx.fillStyle = c('#2a1a0e'); ctx.fillRect(-26 + walk, -12, 12, 12); ctx.fillRect(14 - walk, -12, 12, 12);
    // wooden case
    ctx.fillStyle = f ? '#fff' : lin(ctx, -36, 0, 36, 0, ['#7a4a26', '#4a2a14', '#1e1008']); Draw.rr(ctx, -34, -128, 68, 118, 6); ctx.fill();
    ctx.fillStyle = c('#3a2210'); Draw.poly(ctx, [-40, -126, 40, -126, 0, -146]);
    // glass with swinging pendulum
    ctx.fillStyle = c('rgba(40,60,40,0.8)'); Draw.rr(ctx, -20, -72, 40, 56, 4); ctx.fill();
    const sw = Math.sin(this.anim * (p2 ? 7 : 4)) * 0.45;
    ctx.save(); ctx.translate(0, -70); ctx.rotate(sw); ctx.strokeStyle = c('#c8a040'); ctx.lineWidth = 2; Draw.line(ctx, 0, 0, 0, 38);
    ctx.fillStyle = c('#e8c860'); if (!f) setGlow(ctx, '#ffd040', 10); Draw.circ(ctx, 0, 42, 8); clearGlow(ctx); ctx.restore();
    // clock face with a face
    const fy = -100;
    ctx.fillStyle = f ? '#fff' : shade(ctx, 0, fy, 24, '#fffaf0', '#d8cfa8', '#7a6a40'); Draw.circ(ctx, 0, fy, 22);
    ctx.strokeStyle = c('#3a2a10'); ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; Draw.line(ctx, Math.cos(a) * 17, fy + Math.sin(a) * 17, Math.cos(a) * 20, fy + Math.sin(a) * 20); }
    const spd = p2 ? 6 : 1.2;
    ctx.lineWidth = 2.5; Draw.line(ctx, 0, fy, Math.cos(t * spd) * 15, fy + Math.sin(t * spd) * 15);
    ctx.lineWidth = 1.5; Draw.line(ctx, 0, fy, Math.cos(t * spd * 12) * 19, fy + Math.sin(t * spd * 12) * 19);
    ctx.fillStyle = c(p2 ? '#ff3a2a' : '#7aff9a'); if (!f) setGlow(ctx, p2 ? '#ff0000' : '#3aff7a', 14);
    Draw.ell(ctx, -8, fy - 4, 3.5, 2.2); Draw.ell(ctx, 8, fy - 4, 3.5, 2.2); clearGlow(ctx);
    const open = (this.state === 'tele_spit' || this.state === 'spit' || this.state === 'roar') ? 5 : 1;
    ctx.fillStyle = c('#1a0e04'); Draw.rr(ctx, -9, fy + 7, 18, open + 2, 1); ctx.fill();
    ctx.restore();
  }
}

class SaintBoss extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'THE HOLLOW SAINT'; this.maxHp = this.hp = 64; this.w = 80; this.h = 132;
    this.shotSkin = 'ember'; this.waveSkin = 'fire'; this.debrisSkin = 'chandelier';
  }
  hurt(dmg, g) { const p1 = this.phase === 1, r = super.hurt(dmg, g); if (p1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('The Hollow Saint burns brighter!', 2.4); } return r; }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col), p2 = this.phase === 2;
    const bc = this.x + this.w / 2, sq = this.squash, hover = Math.sin(this.anim * 2) * 3;
    const shakeX = (this.state.startsWith('tele') || this.state === 'roar' || this.dying) ? Math.sin(t * 60) * 2.5 : 0;
    ctx.save(); ctx.translate(bc + shakeX, this.y + this.h); ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 44, 7);
    // robe, tattered and smouldering
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -110, 0, 0, ['#3a1a14', '#1e0a08', '#0a0302']);
    ctx.beginPath(); ctx.moveTo(-16, -104 + hover); ctx.lineTo(16, -104 + hover); ctx.lineTo(38, -4);
    for (let i = 0; i <= 8; i++) ctx.lineTo(38 - i * 9.5, -4 + (i % 2 ? 6 : 0) + Math.sin(t * 5 + i) * 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = c('#ff8a2a'); for (let i = 0; i < 6; i++) Draw.circ(ctx, -30 + i * 12, -6 + Math.sin(t * 7 + i) * 2, 1.4);
    // arms spread
    const up = (this.state === 'tele_leap' || this.state === 'roar' || this.state === 'tele_spit') ? -0.9 : 0;
    ctx.strokeStyle = c('#2a1008'); ctx.lineWidth = 8; ctx.lineCap = 'round';
    Draw.line(ctx, -14, -92 + hover, -40, -64 + up * 30 + hover); Draw.line(ctx, 14, -92 + hover, 42, -64 + up * 30 + hover);
    ctx.fillStyle = c('#d8c8b0'); Draw.circ(ctx, -42, -62 + up * 30 + hover, 4); Draw.circ(ctx, 44, -62 + up * 30 + hover, 4);
    // hood with an empty face
    const hy = -114 + hover;
    ctx.fillStyle = f ? '#fff' : shade(ctx, 0, hy, 20, '#4a2a20', '#2a120c', '#0a0302'); Draw.ell(ctx, 0, hy, 17, 21);
    ctx.fillStyle = c('#000'); Draw.ell(ctx, 3, hy + 3, 10, 13);
    ctx.fillStyle = c(p2 ? '#ffffff' : '#ffd060'); if (!f) setGlow(ctx, '#ff6a00', 16);
    Draw.circ(ctx, -1, hy, 2.3); Draw.circ(ctx, 8, hy, 2.3); clearGlow(ctx);
    // burning halo
    if (!f) setGlow(ctx, '#ff6a00', 20);
    ctx.strokeStyle = c(p2 ? '#ffffff' : '#ffb040'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, hy - 26, 20, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = c('#ff8a2a');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t; const hx = Math.cos(a) * 20, hz = Math.sin(a) * 6; ctx.beginPath(); ctx.moveTo(hx - 3, hy - 26 + hz); ctx.quadraticCurveTo(hx, hy - 38 + hz - Math.sin(t * 15 + i) * 3, hx + 3, hy - 26 + hz); ctx.fill(); }
    clearGlow(ctx);
    ctx.restore();
  }
}

class VoidKing extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'THE VOID KING'; this.maxHp = this.hp = 70; this.w = 116; this.h = 112;
    this.shotSkin = 'void'; this.waveSkin = 'void'; this.debrisSkin = 'shard';
  }
  hurt(dmg, g) { const p1 = this.phase === 1, r = super.hurt(dmg, g); if (p1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('The Void King opens its eye...', 2.4); } return r; }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col), p2 = this.phase === 2;
    const bc = this.x + this.w / 2, sq = this.squash;
    const shakeX = (this.state.startsWith('tele') || this.state === 'roar' || this.dying) ? Math.sin(t * 60) * 2.5 : 0;
    ctx.save(); ctx.translate(bc + shakeX, this.y + this.h); ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(80,20,160,0.35)'; Draw.ell(ctx, 0, 0, 60, 9);
    // tentacles
    ctx.strokeStyle = c('#12041e'); ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const bx = -42 + i * 14; ctx.lineWidth = 7 - Math.abs(i - 3);
      ctx.beginPath(); ctx.moveTo(bx, -40);
      ctx.quadraticCurveTo(bx + Math.sin(t * 3 + i) * 14, -18, bx + Math.sin(t * 2 + i * 1.7) * 10, 0); ctx.stroke();
    }
    // dark body
    ctx.fillStyle = f ? '#fff' : shade(ctx, -10, -70, 60, '#3a1a5a', '#14061e', '#000000'); Draw.ell(ctx, 0, -66, 56, 46);
    ctx.fillStyle = c('rgba(200,140,255,0.25)'); for (let i = 0; i < 10; i++) Draw.circ(ctx, Math.cos(i * 2.3 + t) * 40, -66 + Math.sin(i * 1.7 + t * 0.7) * 30, 1.6);
    // the eye
    const open = (this.state === 'tele_spit' || this.state === 'spit' || this.state === 'roar' || p2) ? 1 : 0.6;
    ctx.fillStyle = c('#f4e8ff'); Draw.ell(ctx, 6, -70, 26, 16 * open);
    ctx.fillStyle = f ? '#fff' : shade(ctx, 10, -70, 12, '#ffffff', p2 ? '#ff3a6a' : '#b050ff', '#2a0060'); if (!f) setGlow(ctx, p2 ? '#ff2060' : '#b050ff', 18);
    Draw.circ(ctx, 10, -70, 11 * open); clearGlow(ctx);
    ctx.fillStyle = c('#000'); Draw.ell(ctx, 12, -70, 3, 8 * open);
    // crystal crown
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -140, 0, -108, ['#ffffff', '#c890ff', '#5a1aa8']); if (!f) setGlow(ctx, '#b050ff', 12);
    for (let i = 0; i < 5; i++) Draw.poly(ctx, [-26 + i * 13, -108, -18 + i * 13, -108, -22 + i * 13, -128 - (i === 2 ? 12 : 0) - Math.sin(t * 2 + i) * 2]);
    clearGlow(ctx);
    ctx.restore();
  }
}

// BOSS OF LEVEL 70 — The Mire Hag: a swamp witch with a skull-lantern staff.
class MireHag extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'THE MIRE HAG'; this.maxHp = this.hp = 76; this.w = 84; this.h = 120;
    this.shotSkin = 'bubble'; this.waveSkin = 'mud'; this.debrisSkin = 'bubble';
  }
  hurt(dmg, g) { const p1 = this.phase === 1, r = super.hurt(dmg, g); if (p1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('The Mire Hag boils over!', 2.4); g.spawnDebris(5); } return r; }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col), p2 = this.phase === 2;
    const bc = this.x + this.w / 2, sq = this.squash, sway = Math.sin(this.anim * 2.4) * 2;
    const shakeX = (this.state.startsWith('tele') || this.state === 'roar' || this.dying) ? Math.sin(t * 60) * 2.5 : 0;
    ctx.save(); ctx.translate(bc + shakeX, this.y + this.h); ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 46, 8);
    // mossy cloak, hunched
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, -100, 0, 0, ['#3a4a22', '#1e2a10', '#0a0e04']);
    ctx.beginPath(); ctx.moveTo(-10, -96 + sway); ctx.quadraticCurveTo(20, -104 + sway, 30, -70);
    ctx.lineTo(40, -4); for (let i = 0; i <= 8; i++) ctx.lineTo(40 - i * 10, -4 + (i % 2 ? 7 : 0) + Math.sin(t * 4 + i) * 2);
    ctx.lineTo(-30, -60); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c('rgba(120,160,60,0.6)'); ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-24 + i * 12, -70 + i * 4); ctx.quadraticCurveTo(-20 + i * 12, -50, -26 + i * 12, -30 + Math.sin(t * 3 + i) * 3); ctx.stroke(); }
    // staff with a skull lantern
    const up = (this.state === 'tele_spit' || this.state === 'roar' || this.state === 'tele_leap') ? -24 : 0;
    ctx.strokeStyle = c('#4a3018'); ctx.lineWidth = 4; Draw.line(ctx, 34, -2, 44, -112 + up);
    ctx.fillStyle = f ? '#fff' : shade(ctx, 44, -118 + up, 10, '#fffaf0', '#cfc6ae', '#4a4232'); Draw.circ(ctx, 44, -118 + up, 8);
    ctx.fillStyle = c('#9aff4a'); if (!f) setGlow(ctx, '#9aff4a', 18); Draw.circ(ctx, 41, -119 + up, 2); Draw.circ(ctx, 47, -119 + up, 2); clearGlow(ctx);
    ctx.strokeStyle = c('#c8d8a0'); ctx.lineWidth = 2.5; Draw.line(ctx, 22, -76 + sway, 42, -84 + up * 0.5);
    // face: long nose, wild hair, glowing eyes
    const hx = 12, hy = -96 + sway;
    ctx.strokeStyle = c('#c8c8b0'); ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) Draw.line(ctx, hx - 10 + i * 3, hy - 10, hx - 18 + i * 2 + Math.sin(t * 3 + i) * 3, hy + 20);
    ctx.fillStyle = f ? '#fff' : shade(ctx, hx, hy, 14, '#b8c890', '#6a7a4a', '#1e2410'); Draw.ell(ctx, hx, hy, 12, 13);
    ctx.fillStyle = c('#7a8a5a'); Draw.poly(ctx, [hx + 6, hy - 2, hx + 24, hy + 8, hx + 6, hy + 5]);
    ctx.fillStyle = c('#4a5a2a'); Draw.circ(ctx, hx + 18, hy + 4, 2);
    ctx.fillStyle = c(p2 ? '#ff3a2a' : '#c8ff4a'); if (!f) setGlow(ctx, p2 ? '#ff0000' : '#9aff00', 14);
    Draw.circ(ctx, hx + 1, hy - 3, 2.2); Draw.circ(ctx, hx + 9, hy - 4, 2.2); clearGlow(ctx);
    const open = (this.state === 'tele_spit' || this.state === 'spit' || this.state === 'roar') ? 6 : 1;
    ctx.fillStyle = c('#1a0a04'); Draw.ell(ctx, hx + 6, hy + 8, 5, open);
    ctx.fillStyle = c('#e8e0b0'); ctx.fillRect(hx + 3, hy + 7, 2, 3);
    // pointy hat
    ctx.fillStyle = f ? '#fff' : lin(ctx, 0, hy - 40, 0, hy - 8, ['#2a3a1a', '#0e1608']);
    ctx.beginPath(); ctx.moveTo(hx - 18, hy - 8); ctx.lineTo(hx + 18, hy - 8); ctx.lineTo(hx - 10 + Math.sin(t * 2) * 3, hy - 46); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// BOSS OF LEVEL 80 — Mr. Giggles: a huge creepy clown who juggles clubs and breathes fire.
class MrGiggles extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'MR. GIGGLES'; this.maxHp = this.hp = 80; this.w = 96; this.h = 128;
    this.shotSkin = 'pin'; this.waveSkin = 'fire'; this.debrisSkin = 'chandelier';
  }
  hurt(dmg, g) {
    const p1 = this.phase === 1, r = super.hurt(dmg, g);
    if (r) Sfx.play('honk');
    if (p1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('Mr. Giggles is NOT laughing anymore!', 2.4); Sfx.play('giggle'); }
    return r;
  }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col), p2 = this.phase === 2;
    const bc = this.x + this.w / 2, sq = this.squash, bob = Math.sin(this.anim * 3) * 2;
    const shakeX = (this.state.startsWith('tele') || this.state === 'roar' || this.dying) ? Math.sin(t * 60) * 2.5 : 0;
    ctx.save(); ctx.translate(bc + shakeX, this.y + this.h); ctx.scale(this.facing * (1 + sq * 0.12), 1 - sq * 0.1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 56, 9);
    const walk = this.state === 'charge' ? Math.sin(this.anim * 20) * 8 : 0;
    // huge shoes
    ctx.fillStyle = c('#c8102e'); Draw.ell(ctx, -18 + walk, -6, 26, 9); Draw.ell(ctx, 20 - walk, -6, 26, 9);
    // baggy polka-dot suit
    ctx.save(); ctx.beginPath(); ctx.moveTo(-38, -12); ctx.quadraticCurveTo(-48, -60 + bob, -26, -88 + bob); ctx.lineTo(26, -88 + bob); ctx.quadraticCurveTo(48, -60 + bob, 38, -12); ctx.closePath();
    ctx.fillStyle = f ? '#fff' : lin(ctx, -40, 0, 40, 0, ['#9a5aff', '#6a2ad0', '#2a0a6a']); ctx.fill(); ctx.clip();
    if (!f) { ctx.fillStyle = '#ffd040'; for (let i = 0; i < 14; i++) Draw.circ(ctx, -36 + (i * 23) % 72, -20 - ((i * 37) % 64) + bob, 4); }
    ctx.restore();
    // ruffled collar
    ctx.fillStyle = c('#ffffff'); for (let i = -4; i <= 4; i++) Draw.circ(ctx, i * 7, -88 + bob, 6);
    // juggling arms + clubs
    const up = (this.state === 'tele_spit' || this.state === 'spit') ? Math.sin(t * 16) * 12 : 0;
    ctx.strokeStyle = c('#6a2ad0'); ctx.lineWidth = 9; ctx.lineCap = 'round';
    Draw.line(ctx, -26, -76 + bob, -46, -96 + up); Draw.line(ctx, 26, -76 + bob, 46, -96 - up);
    ctx.fillStyle = c('#ffffff'); Draw.circ(ctx, -46, -98 + up, 6); Draw.circ(ctx, 46, -98 - up, 6);
    if (!f) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.save(); ctx.translate(Math.cos(a) * 40, -130 + Math.sin(a) * 14); ctx.rotate(a * 2); ctx.fillStyle = '#fff'; Draw.ell(ctx, 0, 2, 4, 6); ctx.fillStyle = '#c8102e'; ctx.fillRect(-3, -1, 6, 2); ctx.restore(); }
    // head
    ctx.save(); ctx.translate(2, -112 + bob); drawClownFace(ctx, 0, 0, 24, t, { flash: f, laugh: !p2 || this.state === 'roar' || this.state === 'spit', angry: p2 }); ctx.restore();
    // fire breath glow while spitting
    if ((this.state === 'tele_spit' || this.state === 'spit') && !f) { setGlow(ctx, '#ff6a00', 20); ctx.fillStyle = 'rgba(255,140,40,0.8)'; Draw.ell(ctx, 30, -98 + bob, 10, 6); clearGlow(ctx); }
    // tiny top hat
    ctx.fillStyle = c('#1a1a1a'); ctx.fillRect(-10, -160 + bob, 22, 18); ctx.fillRect(-16, -143 + bob, 34, 4); ctx.fillStyle = c('#c8102e'); ctx.fillRect(-10, -147 + bob, 22, 3);
    ctx.restore();
  }
}

// BOSS OF LEVEL 90 — The Living Board. A HUGE black chess king rises from the floor, gives his challenge,
// and then the fight is a real game of chess (see chess.js). He can't be hurt with your sword.
class ChessKing {
  constructor(x, y, arena) {
    this.arena = arena; this.w = 140; this.h = 330;
    this.x = arena.x2 - 260; this.floor = arena.floorY; this.y = this.floor; // starts sunk below the floor
    this.state = 'intro'; this.landedIntro = false; this.t = 0; this.phase = 1;
    this.maxHp = 1; this.hp = 1; this.dead = false; this.dying = false; this.facing = -1;
    this.name = 'THE LIVING BOARD'; this.said = 0; this.started = false; this.hurtMsg = 0;
    this.lines = ['You have made it this far...', 'but now I challenge you with my BIGGEST STRENGTH.', 'CHESS!'];
  }
  hitbox() { return { x: -9999, y: -9999, w: 0, h: 0 }; } // touching him is safe: this fight is chess
  hurt(dmg, g) {
    if (this.hurtMsg <= 0) { g.toast('Your sword is useless here. Beat the King at CHESS!', 2); this.hurtMsg = 2; }
    return false;
  }
  update(dt, g) {
    this.t += dt; this.hurtMsg -= dt;
    const p = g.player; p.ctrlLock = 0.2; p.vx = 0;           // you stand and listen
    const top = this.floor - this.h;
    if (this.y > top) { this.y = Math.max(top, this.y - 170 * dt); g.shake = Math.max(g.shake, 3); if (Math.random() < 0.3) g.dust(this.x + Math.random() * this.w, this.floor, 1); return; }
    const k = Math.floor((this.t - 2) / 2.6);
    this.said = Math.max(0, Math.min(this.lines.length - 1, k));
    if (k === this.lines.length - 1 && !this.boomed) { this.boomed = true; g.shake = 14; Sfx.play('roar'); }
    if (k >= this.lines.length && !this.started) { this.started = true; g.startChess(); }
  }
  draw(ctx, t) {
    const cx = this.x + this.w / 2, by = this.floor, top = this.y, H = this.h;
    ctx.save();
    ctx.beginPath(); ctx.rect(this.x - 200, top - 400, this.w + 400, by - top + 400); ctx.clip(); // hidden below floor
    const S = (x, y, r) => shade(ctx, x, y, r, '#5a5a6a', '#1c1c24', '#000000');
    const y0 = top;
    // base
    ctx.fillStyle = S(cx - 20, y0 + H - 30, 120); Draw.rr(ctx, cx - 80, y0 + H - 36, 160, 36, 8); ctx.fill();
    Draw.rr(ctx, cx - 64, y0 + H - 60, 128, 28, 8); ctx.fill();
    // body
    ctx.fillStyle = S(cx - 20, y0 + H * 0.55, 160);
    Draw.poly(ctx, [cx - 54, y0 + H - 58, cx + 54, y0 + H - 58, cx + 34, y0 + 120, cx - 34, y0 + 120]);
    Draw.rr(ctx, cx - 52, y0 + 104, 104, 22, 8); ctx.fill();
    // head
    ctx.fillStyle = S(cx - 14, y0 + 76, 60); Draw.ell(ctx, cx, y0 + 78, 44, 32);
    Draw.rr(ctx, cx - 50, y0 + 38, 100, 16, 6); ctx.fill();
    // cross on top
    ctx.fillStyle = '#d4af37'; ctx.fillRect(cx - 7, y0 - 8, 14, 48); ctx.fillRect(cx - 22, y0 + 4, 44, 12);
    // glowing eyes + mouth that moves when he talks
    const talking = this.y <= this.floor - this.h && this.t > 2 && !this.started;
    setGlow(ctx, '#ff2020', 18); ctx.fillStyle = '#ff3a3a';
    Draw.ell(ctx, cx - 16, y0 + 72, 8, 5); Draw.ell(ctx, cx + 16, y0 + 72, 8, 5); clearGlow(ctx);
    ctx.fillStyle = '#000'; Draw.ell(ctx, cx, y0 + 92, 14, talking ? 3 + Math.abs(Math.sin(t * 14)) * 6 : 2);
    // gold trim
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 3; Draw.line(ctx, cx - 50, y0 + 115, cx + 50, y0 + 115); Draw.line(ctx, cx - 60, y0 + H - 46, cx + 60, y0 + H - 46);
    ctx.restore();
    // speech bubble
    if (talking) {
      const text = this.lines[this.said];
      ctx.font = this.said === 2 ? '40px Creepster, Nunito, cursive' : '700 17px Nunito, sans-serif';
      const tw = ctx.measureText(text).width + 32, bx = Math.max(this.arena.x1 + 10, cx - tw - 30), byy = y0 + 10;
      ctx.fillStyle = 'rgba(245,240,230,0.96)'; Draw.rr(ctx, bx, byy, tw, this.said === 2 ? 60 : 44, 12); ctx.fill();
      Draw.poly(ctx, [bx + tw - 30, byy + 30, bx + tw + 24, byy + 60, bx + tw - 10, byy + 30]);
      ctx.fillStyle = this.said === 2 ? '#a00' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + tw / 2, byy + (this.said === 2 ? 32 : 23));
    }
  }
}

// BOSS OF LEVEL 100 — The Iron Beast: a haunted tank from a war that ended long ago. Nobody is inside.
// Attacks: Ram (charges into the wall), Shell Lob (arcing shells), Air Raid (bombs fall from the sky —
// watch for their shadows). Phase 2: faster, more shells, more bombs, and rams shake down even more.
class IronBeast extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'THE IRON BEAST'; this.maxHp = this.hp = 100; this.w = 150; this.h = 96;
    this.shotSkin = 'shell'; this.debrisSkin = 'bomb'; this.tread = 0;
  }
  hitbox() { return { x: this.x + 10, y: this.y + 20, w: this.w - 20, h: this.h - 20 }; }
  chooseAttack() {
    const opts = ['charge', 'spit', 'raid'].filter((a) => a !== this.last);
    const a = opts[Math.floor(Math.random() * opts.length)];
    this.last = a;
    if (a === 'charge') { this.state = 'tele_charge'; this.timer = 0.8 / this.spd; }
    if (a === 'spit') { this.state = 'tele_spit'; this.timer = 0.6 / this.spd; }
    if (a === 'raid') { this.state = 'raid'; this.timer = 0.7; this.raided = false; Sfx.play('whistle'); }
  }
  update(dt, g) {
    super.update(dt, g);
    this.tread += this.vx * dt;
    if (this.state === 'raid' && !this.raided && this.timer <= 0.3) { this.raided = true; g.spawnDebris(this.phase === 2 ? 8 : 5); g.toast('AIR RAID! Watch for falling bombs!', 1.4); }
    if (this.state === 'raid' && this.timer <= 0) { this.state = 'recover'; this.timer = 1.4; }
  }
  hurt(dmg, g) {
    const p1 = this.phase === 1, r = super.hurt(dmg, g);
    if (p1 && this.phase === 2) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden')); g.toast('The Iron Beast is burning... and it is ANGRY!', 2.4); }
    return r;
  }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col), p2 = this.phase === 2;
    const shakeX = (this.state.startsWith('tele') || this.state === 'roar' || this.dying) ? Math.sin(t * 60) * 2.5 : 0;
    const cx = this.x + this.w / 2 + shakeX, by = this.y + this.h;
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.facing, 1);
    if (this.dying) ctx.globalAlpha = Math.max(0.2, this.timer / 2.6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; Draw.ell(ctx, 0, 0, 84, 10);
    // tracks
    ctx.fillStyle = c('#1a1a16'); Draw.rr(ctx, -76, -36, 152, 36, 18); ctx.fill();
    ctx.fillStyle = c('#3a3a32'); for (let i = 0; i < 6; i++) Draw.circ(ctx, -62 + i * 25, -18, 10);
    if (!f) { ctx.strokeStyle = '#0a0a08'; ctx.lineWidth = 2; for (let k = 0; k < 12; k++) { const xx = -76 + (((k * 13 - this.tread * this.facing) % 152) + 152) % 152; Draw.line(ctx, xx, -36, xx, -32); } }
    // hull
    ctx.fillStyle = f ? '#fff' : shade(ctx, -10, -60, 110, '#7a7a5a', '#4a4a34', '#1a1a10');
    Draw.poly(ctx, [-82, -32, 86, -32, 72, -62, -66, -62]);
    // turret + long gun barrel
    const recoil = this.state === 'spit' ? -6 : 0;
    Draw.rr(ctx, -40, -96, 76, 38, 12); ctx.fill();
    ctx.fillStyle = c('#3a3a28'); ctx.fillRect(30 + recoil, -84, 78, 10); ctx.fillRect(102 + recoil, -87, 12, 16);
    if (!f) {
      ctx.fillStyle = 'rgba(120,60,20,0.55)'; for (let i = 0; i < 7; i++) Draw.circ(ctx, -60 + i * 20, -46 + (i % 2) * 8, 5); // rust
      ctx.fillStyle = '#2a2a1e'; Draw.circ(ctx, -8, -98, 9); // hatch
      // the glowing eye-slit: there is no driver
      setGlow(ctx, '#ff2a1a', 18); ctx.fillStyle = p2 ? '#ff6a3a' : '#ff3a2a'; ctx.fillRect(0, -84, 28, 5); clearGlow(ctx);
      if (this.state === 'tele_spit' || this.state === 'tele_charge') { setGlow(ctx, '#ffb040', 16); ctx.fillStyle = 'rgba(255,180,60,0.8)'; Draw.circ(ctx, 114, -79, 5); clearGlow(ctx); }
      if (p2) for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(255,${120 + i * 40},40,0.8)`; Draw.ell(ctx, -50 + i * 30, -66 - Math.abs(Math.sin(t * 9 + i)) * 12, 6, 10); }
    }
    ctx.restore();
    if (!this.dying && Math.random() < 0.15) { /* exhaust puffs are drawn as particles by the game */ }
  }
}
