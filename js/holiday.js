// HOLIDAY EXCLUSIVES — special bosses anyone can play from the home menu (no levels or code needed).
// Holiday levels use big level numbers (1001+) so they never mix with the normal 1, 2, 3... levels.

const HOLIDAY = {
  1001: {
    id: 'thanksgiving', season: 'Thanksgiving', title: 'Thanksgiving: Sir Gobbles',
    blurb: 'A friendly turkey wants to play TAG! RUN INTO him to tag him and fill his Fun Meter. But do NOT attack him: that makes him sad... His pies only splat you. You can never die!',
    winText: 'Sir Gobbles: "Gobble gobble! That was the MOST fun! Happy Thanksgiving, friend!"',
    reward: 100,
  },
};
const isHoliday = (n) => !!HOLIDAY[n];

// A cozy autumn evening: orange sky, falling leaves, warm light.
const HOLIDAY_THEME = {
  1001: {
    sky: ['#2a1206', '#6a2a0a', '#c85a1a', '#f0a040'], star: '#ffe8c0', moon: [255, 200, 120],
    far: ['#5a2a10', '#3a1a08'], mid: ['#3a1a0a', '#2a1206'], near: ['#1e0e06', '#140a04'],
    castle: '#3a1a0a', windows: '#ffd060', tree: '#2a1206', bgTree: '#4a2410',
    fog: [255, 180, 120], haze: [240, 140, 70],
    stone: [96, 66, 44], grass: ['#c8a040', '#a07a2a', '#e0b850', '#7a5a1a', '#d0a040'], grassTop: ['#c89a3a', '#7a5a1a'], moss: [200, 140, 60],
    leaves: ['#ff7a1a', '#ffb030', '#c8401a', '#ffd060'], dark: [30, 12, 4], ambient: 0.82,
    liquid: ['#ffdc60', '#ff7a10', '#c02a08', '#4a0a04'], bubble: [255, 230, 120], fire: ['#fff8c0', '#ffa020', '#c02800'], fireGlow: '#ff8a20',
    spike: ['#e8d8b0', '#a08050', '#3a2a14', 'rgba(255,160,60,0.4)'], crystal: '#ffb040', cozy: true,
  },
};

// The holiday level: a short walk, then a cozy barn arena with Sir Gobbles, then the portal.
function buildHolidayLevel(n) {
  const W = 50, H = 34, tiles = new Array(W * H).fill(T.EMPTY);
  const fill = (x1, y1, x2, y2, v = T.SOLID) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (x >= 0 && x < W && y >= 0 && y < H) tiles[y * W + x] = v; };
  fill(0, 0, 0, H - 1);
  fill(1, 30, W - 2, H - 1);                // the floor
  const A = 9;                              // arena gate column
  fill(A, 0, A + 29, 14);                   // barn roof
  fill(A, 15, A, 29, T.GATE);
  fill(A + 29, 15, A + 29, 29, T.EXIT);
  fill(A + 4, 25, A + 7, 25, T.ONEWAY); fill(A + 22, 25, A + 25, 25, T.ONEWAY); fill(A + 12, 21, A + 17, 21, T.ONEWAY);
  fill(W - 1, 0, W - 1, H - 1);
  const H0 = HOLIDAY[n];
  return {
    number: n, holiday: true, friendly: true, title: H0.title,
    w: W, h: H, tiles,
    spawn: { x: 2, y: 29 },
    shards: [[4, 28], [5, 28], [6, 28]], bigShards: [], enemies: [], platforms: [], pads: [], firebars: [],
    signs: [{ x: 4, y: 29, text: 'Happy Thanksgiving! Sir Gobbles wants to play TAG! RUN INTO him to tag him and fill his Fun Meter. Do NOT attack him, that makes him SAD. If he gets too sad, he takes 50 of your shards!' }],
    decor: [{ type: 'shroom', x: 3, y: 29 }, { type: 'tree', x: 7, y: 29 }, { type: 'shroom', x: 42, y: 29 }, { type: 'tree', x: 45, y: 29 }],
    checkpoints: [], route: [], droppers: [], chases: [], geysers: [], pendulums: [],
    finish: { x: 45, y: 29 },
    arena: {
      gateX: A, triggerX: (A + 3) * TILE, x1: (A + 1) * TILE, x2: (A + 29) * TILE,
      floorY: 30 * TILE, ceilY: 15 * TILE, camX: A * TILE - 16, camY: 14 * TILE + 16,
      bossSpawn: { x: (A + 19) * TILE, y: 16 * TILE }, boss: 'gobbles', name: 'SIR GOBBLES', cozy: true,
    },
  };
}
for (const n of Object.keys(HOLIDAY)) LEVELS[n] = () => buildHolidayLevel(+n);

// SIR GOBBLES — the friendliest boss in the game. A big round turkey in a pilgrim hat.
// He plays the same moves as other bosses (charge, hop, toss), but nothing he does can hurt you:
// his pies and leaf piles just SPLAT you for a second. Slash him to fill his FUN METER!
class SirGobbles extends GraveWarden {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.name = 'SIR GOBBLES'; this.friendly = true;
    this.maxHp = this.hp = 50; this.w = 96; this.h = 104;
    this.shotSkin = 'pie'; this.waveSkin = 'leaves'; this.debrisSkin = 'corn';
    this.sayT = 3; this.line = 'Gobble gobble! Want to play TAG?'; this.lineT = 3;
    this.lines = ['Have some pie!', 'Happy Thanksgiving!', 'You are a great friend!', 'Gobble gobble!', 'Catch me if you can!', 'Wheee!', 'I am SO thankful for you!', 'Nice moves, friend!'];
    this.tagLines = ['Tag! Hee hee!', 'Ha! You got me!', 'Good one!', 'Gobble! Great tag!', 'Tag, you are SO fast!'];
    this.sadLines = ['Ow... why did you hit me?', 'That was not very nice...', 'Hey... I thought we were friends...', 'Sniff... tag is supposed to be FUN...', 'Please stop... I just want to play...'];
    this.sad = 0; this.sadT = 0; this.tagCd = 0;
    this.owed = 0; this.niceTags = 0;   // shards he took, and how many nice tags since then
  }
  // You RAN INTO him: that is a tag! It fills the Fun Meter (this is how you win).
  tag(g) {
    if (this.tagCd > 0 || this.dying || this.state === 'intro') return;
    this.tagCd = 0.8;
    const p = g.player;
    p.vx = (p.x + p.w / 2 < this.x + this.w / 2 ? -1 : 1) * 340; p.vy = -320; p.ctrlLock = 0.3; p.invuln = Math.max(p.invuln, 0.5);
    g.ring(p.x + p.w / 2, p.y + p.h / 2, '#ffd060', 40); g.popups.push({ x: this.x + this.w / 2, y: this.y - 20, t: 1, text: 'TAG!' });
    Sfx.play('gobble');
    const p1 = this.phase === 1;
    if (this.owed) this.niceTags++;
    super.hurt(5, g);
    if (p1 && this.phase === 2) this.onFunHalf(g);
    if (this.dying) {
      // be nice after he took your shards (4+ tags AND a full fun meter) and he gives them back, once ever
      const hol = Save.data.holiday = Save.data.holiday || {};
      if (this.owed && this.niceTags >= 4 && !hol.thanksRefund) {
        hol.thanksRefund = true; Save.data.shards += this.owed; Save.write();
        g.toast(`You were so jolly! Sir Gobbles gave your ${this.owed} shards back!`, 4);
        this.say('You were SO jolly! Here are your shards back. Gobble gobble!', 3.5);
        this.owed = 0; return;
      }
      this.say('Gobble gobble! You win! Thank you for playing with me!', 3); return;
    }
    if (this.owed && this.niceTags < 4 && !(Save.data.holiday || {}).thanksRefund) { this.say(`That is more like it! ${4 - this.niceTags} more nice tag${4 - this.niceTags === 1 ? '' : 's'}!`, 1.6); return; }
    if (!this.dying) this.say(this.tagLines[Math.floor(Math.random() * this.tagLines.length)], 1.4);
  }
  say(text, dur = 2) { this.line = text; this.lineT = dur; }
  update(dt, g) {
    super.update(dt, g);
    this.lineT -= dt; this.sayT -= dt; this.sadT -= dt; this.tagCd -= dt;
    if (this.sayT <= 0 && !this.dying && this.sadT <= 0) { this.sayT = 3 + Math.random() * 2; this.say(this.lines[Math.floor(Math.random() * this.lines.length)]); Sfx.play('gobble'); }
  }
  // You ATTACKED him (sword, bolts, slams...): that does not count as tag, it makes him SAD.
  hurt(dmg, g) {
    if (this.dying || this.state === 'intro' || this.hurtCd > 0) return false;
    this.hurtCd = 0.25; setTimeout(() => (this.hurtCd = 0), 250);
    this.sad = Math.min(100, this.sad + 10); this.sadT = 2.2; this.flash = 0.1;
    g.particles.push(makeParticle(this.x + this.w / 2 + 30 * this.facing, this.y + 14, rand(-20, 20), 40, 0.8, '#7ac8ff', 3, 300));
    Sfx.play('sad');
    if (this.sad >= 100) {
      const took = Math.min(50, Save.data.shards);
      Save.data.shards -= took; Save.write();
      this.say('Maybe next time be a bit more jolly.', 3.5); this.sadT = 3.5;
      g.toast(took ? `Sir Gobbles took ${took} shards. Maybe next time be a bit more jolly.` : 'Maybe next time be a bit more jolly.', 3.5);
      this.sad = 0;
      if (took && !(Save.data.holiday || {}).thanksRefund) {
        this.owed += took; this.niceTags = 0;
        setTimeout(() => { if (!this.dying) { this.say('Be jolly: tag me 4 more times and fill my Fun Meter, and I will give them back!', 3.5); g.toast('Tag him 4 more times and fill the Fun Meter to get your shards back (only once)!', 3.5); } }, 3600);
      }
    } else this.say(this.sadLines[Math.floor(Math.random() * this.sadLines.length)], 2);
    return true;
  }
  onFunHalf(g) { g.toasts = g.toasts.filter((m) => !m.text.includes('Warden') && !m.text.includes('ENRAGED')); g.toast('Sir Gobbles is having SO much fun he starts dancing!', 2.4); this.say('This is the BEST Thanksgiving EVER!', 2.4); }
  draw(ctx, t) {
    const f = this.flash > 0, c = (col) => (f ? '#ffffff' : col);
    const bc = this.x + this.w / 2, sq = this.squash, bob = Math.sin(this.anim * (this.phase === 2 ? 8 : 3)) * 3;
    const wiggle = (this.state.startsWith('tele') || this.state === 'roar') ? Math.sin(t * 40) * 3 : 0;
    ctx.save(); ctx.translate(bc + wiggle, this.y + this.h); ctx.scale(this.facing * (1 + sq * 0.15), 1 - sq * 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; Draw.ell(ctx, 0, 0, 50, 8);
    // big fan of tail feathers
    const fan = ['#c8401a', '#ff7a1a', '#ffb030', '#ffd060', '#ffb030', '#ff7a1a', '#c8401a'];
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.32 + Math.sin(t * 3 + i) * 0.03;
      ctx.save(); ctx.translate(-14, -56 + bob); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = c(fan[i]); Draw.ell(ctx, 0, -42, 14, 40);
      ctx.fillStyle = c('rgba(255,255,255,0.25)'); Draw.ell(ctx, 0, -66, 6, 10);
      ctx.restore();
    }
    // feet
    ctx.strokeStyle = c('#e8a020'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    const step = this.state === 'charge' ? Math.sin(this.anim * 20) * 6 : 0;
    for (const fx of [-12, 12]) { Draw.line(ctx, fx, -16, fx + step, -2); Draw.line(ctx, fx + step, -2, fx + step + 8, 0); Draw.line(ctx, fx + step, -2, fx + step - 6, 0); }
    // round body
    ctx.fillStyle = f ? '#fff' : shade(ctx, -8, -52 + bob, 50, '#b07a4a', '#7a4a22', '#3a200c'); Draw.ell(ctx, 0, -48 + bob, 38, 34);
    ctx.fillStyle = c('rgba(255,220,170,0.35)'); Draw.ell(ctx, 10, -40 + bob, 18, 20);
    // little wing waving hello
    ctx.save(); ctx.translate(-22, -52 + bob); ctx.rotate(-0.4 + Math.sin(t * 6) * 0.35);
    ctx.fillStyle = c('#6a3a18'); Draw.ell(ctx, -6, 0, 12, 20); ctx.restore();
    // neck + head
    ctx.fillStyle = f ? '#fff' : shade(ctx, 24, -86 + bob, 18, '#b07a4a', '#7a4a22', '#3a200c'); Draw.ell(ctx, 24, -74 + bob, 11, 16); Draw.circ(ctx, 28, -92 + bob, 14);
    // happy face: big eyes, beak, red wattle, rosy cheek
    if (!f) {
      ctx.fillStyle = '#ffffff'; Draw.circ(ctx, 32, -96 + bob, 5.5); ctx.fillStyle = '#1a0e06'; Draw.circ(ctx, 33.5, -96 + bob, 3); ctx.fillStyle = '#ffffff'; Draw.circ(ctx, 34.5, -97.5 + bob, 1.1);
      ctx.fillStyle = 'rgba(255,110,110,0.55)'; Draw.ell(ctx, 30, -86 + bob, 4, 2.5);
      if (this.sadT > 0) { // a sad droopy brow and a tear
        ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 1.6; Draw.line(ctx, 27, -104 + bob, 37, -101 + bob);
        ctx.fillStyle = '#7ac8ff'; Draw.ell(ctx, 33, -88 + bob + ((t * 30) % 10), 1.8, 3);
      }
    }
    ctx.fillStyle = c('#ffb020'); Draw.poly(ctx, [39, -93 + bob, 50, -89 + bob, 39, -86 + bob]);
    ctx.fillStyle = c('#e0202a'); Draw.ell(ctx, 41, -81 + bob + Math.sin(t * 5) * 1.5, 3.5, 7);
    // pilgrim hat with gold buckle
    ctx.fillStyle = c('#1a1a1e'); Draw.rr(ctx, 14, -110 + bob, 30, 6, 2); ctx.fill(); ctx.fillRect(18, -128 + bob, 22, 19);
    ctx.fillStyle = c('#d4af37'); ctx.fillRect(25, -116 + bob, 8, 6); ctx.fillStyle = c('#1a1a1e'); ctx.fillRect(27, -114 + bob, 4, 2);
    ctx.restore();
    // speech bubble (always upright)
    if (this.lineT > 0) drawBubble(ctx, bc, this.y - 6, this.line);
  }
}
