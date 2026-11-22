// The playable "heads" — all creepy, no Halloween. Every head sits on the same hooded body.
// Health is infinite — heads only change how you move or fight.
// All art is drawn with canvas paths and gradients, so there are no image files.
const HEADS = [
  { id: 'mask',     name: 'Hollow Mask',   price: 0,   accent: '#d8d0c8', perk: 'Balanced. Always watching.', stats: {} },
  { id: 'bonesy',   name: 'Bonesy',        price: 40, accent: '#e8e2d0', perk: 'Springy bones: bounces higher off down-slashes', stats: { pogo: 1.25 } },
  { id: 'shade',    name: 'The Shade',     price: 60, accent: '#7aa0c0', perk: 'Longer dash that recharges faster', stats: { dash: 1.35, dashCd: 0.6 } },
  { id: 'stitches', name: 'Stitches',      price: 80, accent: '#b08a50', perk: 'Jumps higher and runs faster', stats: { jump: 1.08, speed: 1.1 } },
  { id: 'fang',     name: 'Count Fang',    price: 100, accent: '#d0213b', perk: 'Wisp Bolt recharges twice as fast', stats: { boltCd: 0.5 } },
  { id: 'wrapz',    name: 'Wrapz',         price: 130, accent: '#7cf4ff', perk: 'Floaty: hold jump to fall slowly', stats: { floaty: 0.3 } },
  { id: 'rotter',   name: 'The Rotter',    price: 160, accent: '#8aa070', perk: '+50% attack damage', stats: { dmg: 1.5 } },
  { id: 'wick',     name: 'Wick',          price: 200, accent: '#ffb347', perk: 'Much longer slash reach', stats: { reach: 1.35 } },

  // ---- CHRISTMAS (creepy holiday heads; on sale Nov 20 – Jan 6, yours forever once bought) ----
  { id: 'snowman',   set: 'christmas', name: 'Frostbite',      price: 120, accent: '#e8f6ff', perk: 'TRIPLE jump: two jumps in the air', stats: { airJumps: 1 } },
  { id: 'krampus',   set: 'christmas', name: 'Krampus',        price: 140, accent: '#a0201e', perk: 'Spin Slash recharges twice as fast', stats: { spinCd: 0.5 } },
  { id: 'ginger',    set: 'christmas', name: 'Gingerdead',     price: 150, accent: '#c87838', perk: 'Shard magnet: pulls in shards from far away', stats: { magnet: 3 } },
  { id: 'elf',       set: 'christmas', name: 'Wicked Elf',     price: 160, accent: '#2a9a3a', perk: 'Quick hands: slashes much faster', stats: { atkCd: 0.55 } },
  { id: 'nutcracker',set: 'christmas', name: 'Nutcracker',     price: 180, accent: '#c8102e', perk: 'Iron jaw: survives one monster hit per checkpoint', stats: { shield: 1 } },
  { id: 'rudolph',   set: 'christmas', name: 'Rudolph Skull',  price: 190, accent: '#ff3a2a', perk: 'Glowing nose lights up the dark much farther', stats: { light: 1.7 } },
  { id: 'ornament',  set: 'christmas', name: 'Cracked Bauble', price: 210, accent: '#d4af37', perk: 'Two dashes in the air', stats: { airDashes: 1 } },
  { id: 'darksanta', set: 'christmas', name: 'Dark Santa',     price: 240, accent: '#8a0a14', perk: 'Chasers move 15% slower behind you', stats: { chaseSlow: 0.15 } },

  // ---- THANKSGIVING (creepy harvest heads; on sale all of November, yours forever once bought) ----
  { id: 'turkey',    set: 'thanksgiving', name: 'Turkey Terror',   price: 120, accent: '#a0522d', perk: 'Bounce mushrooms launch you much higher', stats: { pad: 1.2 } },
  { id: 'pilgrim',   set: 'thanksgiving', name: 'Pilgrim Skull',   price: 140, accent: '#2a2a2a', perk: 'Falling hazards wait twice as long before dropping', stats: { dropDelay: 2 } },
  { id: 'pie',       set: 'thanksgiving', name: 'Pie Phantom',     price: 150, accent: '#d88a3a', perk: 'Every small shard is worth 2', stats: { shardMul: 2 } },
  { id: 'cornhusk',  set: 'thanksgiving', name: 'Corn Husk',       price: 160, accent: '#e8c860', perk: 'Ledge grace: you can still jump a moment after running off an edge', stats: { coyote: 2.5 } },
  { id: 'cranberry', set: 'thanksgiving', name: 'Cranberry Blob',  price: 180, accent: '#b0123a', perk: 'Squishy: monsters cannot hurt you while you dash', stats: { dashSafe: 1 } },
  { id: 'scarecrow', set: 'thanksgiving', name: 'Harvest Crow',    price: 190, accent: '#c8a050', perk: 'Crumbling stones take twice as long to fall', stats: { crumbleSlow: 2 } },
  { id: 'cornucopia',set: 'thanksgiving', name: 'Horn of Plenty',  price: 210, accent: '#b8803a', perk: 'Wisp Bolt fires two bolts at once', stats: { doubleBolt: 1 } },
  { id: 'gravy',     set: 'thanksgiving', name: 'Gravy Ghoul',     price: 240, accent: '#8a5a2a', perk: 'Much higher double jump', stats: { airJumpPow: 1.3 } },
];

// Shop pages. Seasonal pages can only be BOUGHT during their season; once owned, a head is yours forever.
const HEAD_SETS = [
  { id: 'creepy', name: 'Creepy Collection' },
  { id: 'christmas', name: 'Christmas', season: 'Nov 20 – Jan 6' },
  { id: 'thanksgiving', name: 'Thanksgiving', season: 'November' },
];
function setOnSale(setId, date = new Date()) {
  const m = date.getMonth(), d = date.getDate();
  if (setId === 'christmas') return (m === 10 && d >= 20) || m === 11 || (m === 0 && d <= 6);
  if (setId === 'thanksgiving') return m === 10;
  return true;
}

function headById(id) { return HEADS.find((h) => h.id === id) || HEADS[0]; }
function headStats(id) {
  return Object.assign({ dmg: 1, speed: 1, jump: 1, dash: 1, dashCd: 1, reach: 1, pogo: 1, boltCd: 1, floaty: 1,
    airJumps: 0, spinCd: 1, magnet: 1, atkCd: 1, shield: 0, light: 1, airDashes: 0, chaseSlow: 0, pad: 1, dropDelay: 1,
    shardMul: 1, coyote: 1, dashSafe: 0, crumbleSlow: 1, doubleBolt: 0, airJumpPow: 1 }, headById(id).stats);
}

const Draw = {
  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); },
  circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); },
  poly(ctx, p) {
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fill();
  },
  line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); },
};

function setGlow(ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
function clearGlow(ctx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }

// Radial "sphere" shading: light from the upper-left, shadow at the lower-right.
function shade(ctx, cx, cy, r, light, mid, dark) {
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r * 1.25);
  g.addColorStop(0, light); g.addColorStop(0.5, mid); g.addColorStop(1, dark);
  return g;
}
function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

/**
 * Draw a head centred at (0,0), facing right, roughly 26px wide.
 * opts: { flash: bool (draw all white), glow: bool }
 */
function drawHead(ctx, id, t, opts = {}) {
  const flash = !!opts.flash;
  const glowOn = opts.glow !== false && !flash;
  const W = '#ffffff';
  const S = (light, mid, dark, cx = 0, cy = 0, r = 12) => (flash ? W : shade(ctx, cx, cy, r, light, mid, dark));
  const c = (col) => (flash ? W : col);
  const G = (col, b) => { if (glowOn) setGlow(ctx, col, b); };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // soft contact shadow under every head (sits on the shoulders)
  if (!flash) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; Draw.ell(ctx, 1, 11, 10, 3); }

  switch (id) {
    case 'mask': {
      // hood/hair behind the mask
      ctx.fillStyle = S('#3a3448', '#1a1624', '#050408', 0, -2, 14); Draw.ell(ctx, 0, -1, 12.5, 13.5);
      // cracked porcelain face
      ctx.fillStyle = S('#ffffff', '#e6e0d8', '#7e786c', 0, 0, 11); Draw.ell(ctx, 1.2, 1, 9.4, 11.4);
      ctx.strokeStyle = c('#5e584c'); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(6, -10); ctx.lineTo(3.5, -5.5); ctx.lineTo(6.5, -2.5); ctx.lineTo(5, 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-3.5, 8); ctx.stroke();
      // empty black eyes with dripping black tears
      ctx.fillStyle = c('#040205');
      Draw.ell(ctx, -2.4, -1, 2.6, 3.5); Draw.ell(ctx, 5.2, -1, 2.6, 3.5);
      const drip = 1.5 + Math.sin(t * 1.5) * 1;
      ctx.fillRect(-3, 1.5, 1.2, 4 + drip); ctx.fillRect(4.8, 1.5, 1, 2.5 + drip * 0.6);
      Draw.circ(ctx, -2.4, 5.5 + drip, 0.9);
      ctx.fillStyle = c('#ffffff'); G('#ffffff', 6);
      Draw.circ(ctx, -2.2, -1.2, 0.55); Draw.circ(ctx, 5.4, -1.2, 0.55);
      clearGlow(ctx);
      // thin stitched smile
      ctx.strokeStyle = c('#3a2a2a'); ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(1.5, 3.5, 4.5, 0.35, Math.PI - 0.35); ctx.stroke();
      break;
    }
    case 'bonesy': {
      ctx.fillStyle = S('#ffffff', '#e6dfcc', '#7d735e', 0, -2, 12); Draw.circ(ctx, 0, -2, 12);
      ctx.fillStyle = S('#f4efe2', '#d8cfb8', '#7d735e', 0, 8, 8); Draw.rr(ctx, -7, 4, 15, 8, 3); ctx.fill();
      // cheekbone shadows
      ctx.fillStyle = c('rgba(90,80,60,0.35)'); Draw.ell(ctx, -6.5, 5, 3.5, 1.8); Draw.ell(ctx, 8.5, 5, 3.5, 1.8);
      // crack
      ctx.strokeStyle = c('#6e6553'); ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-3, -13.5); ctx.lineTo(-1, -9.5); ctx.lineTo(-4, -6.5); ctx.lineTo(-3, -5); ctx.stroke();
      // sockets with depth
      ctx.fillStyle = flash ? W : shade(ctx, -3, -1, 5, '#3a2a3a', '#120a14', '#000');
      Draw.ell(ctx, -3, -1, 3.9, 4.5);
      ctx.fillStyle = flash ? W : shade(ctx, 6.5, -1, 5, '#3a2a3a', '#120a14', '#000');
      Draw.ell(ctx, 6.5, -1, 3.9, 4.5);
      ctx.fillStyle = c('#1a1014'); Draw.poly(ctx, [1.7, 3.8, 3.5, 3.8, 2.6, 1]);
      ctx.fillStyle = c('#ff4a4a'); G('#ff2020', 10);
      Draw.circ(ctx, -2.2, -0.5, 1.4); Draw.circ(ctx, 7.2, -0.5, 1.4);
      clearGlow(ctx);
      // individual teeth
      for (let i = 0; i < 5; i++) {
        const x = -5.5 + i * 2.7;
        ctx.fillStyle = c('#fffaf0'); Draw.rr(ctx, x, 6.6, 2.3, 3.6, 0.8); ctx.fill();
        ctx.fillStyle = c('rgba(80,70,55,0.5)'); ctx.fillRect(x + 1.7, 7, 0.6, 3);
      }
      break;
    }
    case 'shade': {
      const wob = Math.sin(t * 4);
      G('#5a7a96', 14);
      ctx.fillStyle = flash ? W : lin(ctx, 0, -13, 0, 12, ['rgba(70,78,100,0.97)', 'rgba(36,38,54,0.95)', 'rgba(14,14,22,0.75)']);
      ctx.beginPath();
      ctx.moveTo(-12, 10); ctx.lineTo(-12, -1); ctx.arc(0, -2, 12, Math.PI, 0); ctx.lineTo(12, 10);
      const rag = [9, 13, 7, 12, 8, 14, 9];
      for (let i = 0; i < rag.length; i++) ctx.lineTo(12 - (i + 1) * (24 / (rag.length + 1)), rag[i] + (i % 2 ? wob : -wob) * 1.5);
      ctx.closePath(); ctx.fill();
      clearGlow(ctx);
      // empty void where a face should be
      ctx.fillStyle = flash ? W : shade(ctx, 1.5, 0, 9, '#0c0a12', '#050408', '#000000'); Draw.ell(ctx, 1.5, 0.5, 7.5, 9);
      ctx.strokeStyle = c('rgba(120,130,160,0.35)'); ctx.lineWidth = 0.7;
      Draw.line(ctx, -7, -8, -4, 6); Draw.line(ctx, 9, -8, 7, 7);
      ctx.fillStyle = c('#cfe8ff'); G('#8ac8ff', 12);
      Draw.ell(ctx, -1.2, -1, 1.5, 0.8, 0.25); Draw.ell(ctx, 4.6, -1, 1.5, 0.8, -0.25);
      break;
    }
    case 'stitches': {
      // burlap sack head with a twisted top
      ctx.fillStyle = S('#d2b282', '#9a7c4e', '#3a2a14', 0, 0, 13);
      ctx.beginPath();
      ctx.moveTo(-11, 10); ctx.quadraticCurveTo(-13, -6, -5, -11); ctx.quadraticCurveTo(-1, -16, 2, -17);
      ctx.quadraticCurveTo(3, -13, 6, -11); ctx.quadraticCurveTo(13, -6, 11, 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c('rgba(60,40,20,0.28)'); ctx.lineWidth = 0.6;
      for (let i = -10; i <= 10; i += 2.5) { Draw.line(ctx, i, -10, i + 1, 10); Draw.line(ctx, -11, i, 11, i + 0.5); }
      // rope around the neck
      ctx.fillStyle = flash ? W : lin(ctx, 0, 8, 0, 12, ['#8a6a3a', '#4a3418']); ctx.fillRect(-11, 8, 22, 3.5);
      ctx.strokeStyle = c('#3a2810'); ctx.lineWidth = 0.6;
      for (let x = -10; x < 11; x += 2) Draw.line(ctx, x, 8, x + 1.5, 11.5);
      // one button eye, one X-stitched eye
      ctx.fillStyle = flash ? W : shade(ctx, -3, -1, 3, '#4a4450', '#18161c', '#000'); Draw.circ(ctx, -3, -1, 2.8);
      ctx.fillStyle = c('#6a6470'); for (const [dx, dy] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) Draw.circ(ctx, -3 + dx, -1 + dy, 0.4);
      ctx.strokeStyle = c('#120c08'); ctx.lineWidth = 1.2;
      Draw.line(ctx, 3.5, -3.5, 7.5, 0.5); Draw.line(ctx, 7.5, -3.5, 3.5, 0.5);
      // long stitched mouth
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-7, 5); ctx.quadraticCurveTo(1, 7.5, 8, 4.5); ctx.stroke();
      for (let x = -6; x <= 7; x += 2.2) Draw.line(ctx, x, 4.2 + Math.abs(x) * 0.05, x + 0.4, 7.4);
      break;
    }
    case 'fang': {
      // collar
      ctx.fillStyle = flash ? W : lin(ctx, -16, 2, -10, 14, ['#c01a30', '#6a0a16']);
      Draw.poly(ctx, [-4, 8, -16, 2, -13, 14]);
      ctx.fillStyle = flash ? W : lin(ctx, 16, 2, 10, 14, ['#c01a30', '#6a0a16']);
      Draw.poly(ctx, [4, 8, 16, 2, 13, 14]);
      ctx.fillStyle = c('#2a0408');
      Draw.poly(ctx, [-4, 9, -12, 5, -11, 13]);
      Draw.poly(ctx, [4, 9, 12, 5, 11, 13]);
      // face
      ctx.fillStyle = S('#ffffff', '#d6ccef', '#6e6290', 0, 0, 12); Draw.ell(ctx, 0, 0, 10, 12);
      ctx.fillStyle = c('rgba(90,60,120,0.3)'); Draw.ell(ctx, -5, 4, 3, 2); Draw.ell(ctx, 7, 4, 3, 2);
      // hair with widow's peak and sheen
      ctx.fillStyle = flash ? W : lin(ctx, -8, -13, 8, -2, ['#3a3350', '#14101c', '#050308']);
      ctx.beginPath();
      ctx.moveTo(-10.5, 2); ctx.quadraticCurveTo(-12, -13, 0, -13);
      ctx.quadraticCurveTo(12, -13, 10.5, 2);
      ctx.quadraticCurveTo(9, -5, 6, -6); ctx.lineTo(1.5, -3); ctx.lineTo(-3, -6);
      ctx.quadraticCurveTo(-8, -5, -10.5, 2); ctx.closePath(); ctx.fill();
      if (!flash) { ctx.strokeStyle = 'rgba(160,150,200,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-1, -4, 8, -2.6, -1.6); ctx.stroke(); }
      // eyes
      ctx.fillStyle = c('#ff2244'); G('#ff0030', 10);
      Draw.ell(ctx, -3, 0.5, 2.2, 1.6); Draw.ell(ctx, 6, 0.5, 2.2, 1.6);
      clearGlow(ctx);
      ctx.fillStyle = c('#2a0008'); Draw.circ(ctx, -2.6, 0.5, 0.7); Draw.circ(ctx, 6.4, 0.5, 0.7);
      ctx.strokeStyle = c('#14101c'); ctx.lineWidth = 1.3;
      Draw.line(ctx, -6, -2.5, -0.5, -1); Draw.line(ctx, 3.5, -1, 8.5, -2.5);
      // mouth + fangs
      ctx.strokeStyle = c('#5a1020'); ctx.lineWidth = 1;
      Draw.line(ctx, -3, 6, 6, 6);
      ctx.fillStyle = c('#ffffff');
      Draw.poly(ctx, [-2, 6, 0, 6, -1, 9]); Draw.poly(ctx, [3, 6, 5, 6, 4, 9]);
      ctx.fillStyle = c('#b0001a'); Draw.circ(ctx, 4, 9.6, 0.6);
      break;
    }
    case 'wrapz': {
      ctx.strokeStyle = flash ? W : lin(ctx, -9, 5, -20, 5, ['#d8c9a3', '#9e8c62']); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, 5);
      ctx.quadraticCurveTo(-15, 7 + Math.sin(t * 6) * 2, -20, 4 + Math.sin(t * 6 + 1) * 3); ctx.stroke();
      ctx.fillStyle = S('#fff4d8', '#d2c296', '#5e5236', 0, 0, 12); Draw.circ(ctx, 0, 0, 12);
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.clip();
      const rows = [-9, -5.5, 4, 7.5, 11];
      rows.forEach((y, i) => {
        const tilt = i % 2 ? 1.5 : -1.5;
        ctx.strokeStyle = c('rgba(80,64,36,0.6)'); ctx.lineWidth = 1.4;
        Draw.line(ctx, -13, y + tilt, 13, y - tilt);
        ctx.strokeStyle = c('rgba(255,250,230,0.6)'); ctx.lineWidth = 0.6;
        Draw.line(ctx, -13, y + tilt - 1, 13, y - tilt - 1);
      });
      ctx.fillStyle = flash ? W : lin(ctx, 0, -2.5, 0, 2, ['#0a0604', '#2a2116', '#0a0604']); ctx.fillRect(-13, -2.5, 26, 4.5);
      ctx.restore();
      ctx.fillStyle = c('#7cf4ff'); G('#2ee6ff', 12);
      Draw.circ(ctx, 5.5, -0.3, 1.9);
      ctx.globalAlpha = 0.45; Draw.circ(ctx, -3, -0.3, 1.4); ctx.globalAlpha = 1;
      break;
    }
    case 'rotter': {
      // thin hair strands
      ctx.strokeStyle = c('#1a1a16'); ctx.lineWidth = 0.8;
      for (let i = -6; i <= 6; i += 3) Draw.line(ctx, i, -11, i - 2 + Math.sin(t * 2 + i) * 0.6, -15);
      // decayed skin
      ctx.fillStyle = S('#b4c4a4', '#6e7e62', '#222a1c', 0, -1, 13); Draw.ell(ctx, 0, -1, 11, 12);
      ctx.fillStyle = c('rgba(60,30,40,0.4)'); Draw.ell(ctx, -6, -6, 2.5, 1.6); Draw.ell(ctx, 7, 6, 2, 1.4); Draw.ell(ctx, -7, 4, 1.6, 2.2);
      // sunken eye with a tiny glow
      ctx.fillStyle = flash ? W : shade(ctx, -3, -1, 4, '#2a1a1a', '#0a0606', '#000'); Draw.ell(ctx, -3, -1, 3, 3.6);
      ctx.fillStyle = c('#e8ff6a'); G('#c8ff3a', 8); Draw.circ(ctx, -2.6, -0.6, 0.7); clearGlow(ctx);
      // bulging eye with red veins
      ctx.fillStyle = flash ? W : shade(ctx, 5.5, -1.5, 4, '#ffffff', '#e8e0d0', '#9a8a7a'); Draw.circ(ctx, 5.5, -1.5, 3.4);
      ctx.strokeStyle = c('rgba(180,20,30,0.7)'); ctx.lineWidth = 0.5;
      Draw.line(ctx, 2.4, -1, 4.5, -1.2); Draw.line(ctx, 8.6, -2.5, 6.6, -1.8); Draw.line(ctx, 5, 1.6, 5.3, 0);
      ctx.fillStyle = c('#0a0606'); Draw.circ(ctx, 6.4, -1.2, 1);
      // torn mouth showing teeth
      ctx.fillStyle = c('#2a0a0e'); Draw.rr(ctx, -5, 4.5, 12, 4.5, 1.5); ctx.fill();
      ctx.fillStyle = c('#5a1a1e'); Draw.ell(ctx, 7, 6.5, 2.5, 2.4);
      ctx.fillStyle = c('#e8dcc0');
      for (const [x, h] of [[-4, 2], [-2, 1.6], [0, 2.2], [2, 1.4], [4, 2]]) ctx.fillRect(x, 4.5, 1.4, h);
      break;
    }
    case 'wick': {
      const fl = Math.sin(t * 14) * 0.8 + Math.sin(t * 23) * 0.5;
      G('#ffae2a', 18);
      ctx.fillStyle = flash ? W : lin(ctx, 0, -12, 0, -25, ['#ff5a00', '#ff9a1a', '#ffcc40']);
      ctx.beginPath(); ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(-5, -17, fl, -25); ctx.quadraticCurveTo(5, -17, 0, -12); ctx.fill();
      ctx.fillStyle = c('#fff8d0');
      ctx.beginPath(); ctx.moveTo(0, -12.5);
      ctx.quadraticCurveTo(-2.5, -16, fl * 0.6, -20); ctx.quadraticCurveTo(2.5, -16, 0, -12.5); ctx.fill();
      clearGlow(ctx);
      ctx.strokeStyle = c('#222'); ctx.lineWidth = 1.2; Draw.line(ctx, 0, -10, 0, -13);
      ctx.fillStyle = flash ? W : lin(ctx, -10, 0, 10, 0, ['#fff6e0', '#efe0bc', '#b8a47a']);
      Draw.rr(ctx, -10, -10, 20, 22, 3); ctx.fill();
      // warm glow from the flame on the top
      if (!flash) { ctx.fillStyle = 'rgba(255,190,90,0.35)'; Draw.ell(ctx, 0, -8, 10, 4); }
      ctx.fillStyle = c('#fff9ea'); Draw.ell(ctx, 0, -10, 10, 2.4);
      Draw.ell(ctx, -7, -6, 2, 4.5); Draw.ell(ctx, 6, -5, 1.8, 6); Draw.ell(ctx, 1, -7, 1.6, 3);
      ctx.fillStyle = c('rgba(120,96,60,0.35)'); ctx.fillRect(-10, 9, 20, 3);
      ctx.fillStyle = c('#2a1608'); Draw.ell(ctx, -3, 1, 2.3, 3); Draw.ell(ctx, 5, 1, 2.3, 3);
      ctx.fillStyle = c('#ffb347'); G('#ff8a1a', 9);
      Draw.circ(ctx, -3, 1.5, 1); Draw.circ(ctx, 5, 1.5, 1);
      clearGlow(ctx);
      ctx.strokeStyle = c('#2a1608'); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(1, 5.5, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    // ================= CHRISTMAS =================
    case 'snowman': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, -20, 0, -12, ['#2a2a30', '#0a0a10']); ctx.fillRect(-7, -22, 14, 10); ctx.fillRect(-11, -13, 22, 3);
      ctx.fillStyle = c('#a0201e'); ctx.fillRect(-7, -15, 14, 2);
      ctx.fillStyle = S('#ffffff', '#e0ecf4', '#7a8a9a', 0, 1, 12); Draw.circ(ctx, 0, 1, 11.5);
      ctx.fillStyle = c('#111'); for (const [ex, ey] of [[-3.5, -2], [5, -2]]) Draw.circ(ctx, ex, ey, 1.8);
      ctx.fillStyle = c('#ff3a2a'); G('#ff0000', 8); Draw.circ(ctx, -3.5, -2, 0.6); Draw.circ(ctx, 5, -2, 0.6); clearGlow(ctx);
      ctx.fillStyle = c('#ff8a1a'); Draw.poly(ctx, [0, 0, 0, 3, 11, 2]);
      ctx.fillStyle = c('#111'); for (let i = 0; i < 6; i++) Draw.circ(ctx, -5 + i * 2.2, 6 + Math.sin(i * 0.9) * 1.2, 0.9);
      break;
    }
    case 'krampus': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, -20, 0, -6, ['#e8dcc0', '#6a5a3a']);
      ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-16, -14, -12, -24); ctx.quadraticCurveTo(-11, -15, -3, -10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, -8); ctx.quadraticCurveTo(16, -14, 12, -24); ctx.quadraticCurveTo(11, -15, 3, -10); ctx.fill();
      ctx.fillStyle = S('#5a3a2a', '#2a1810', '#000', 0, 0, 13); Draw.ell(ctx, 0, 0, 11, 12);
      ctx.fillStyle = c('#1a0e08'); for (let i = -10; i <= 10; i += 3) Draw.poly(ctx, [i - 2, 6, i + 2, 6, i, 13]);
      ctx.fillStyle = c('#ffcc30'); G('#ff8a00', 10); Draw.ell(ctx, -3.5, -2, 2.4, 1.6); Draw.ell(ctx, 5, -2, 2.4, 1.6); clearGlow(ctx);
      ctx.fillStyle = c('#c0203a'); ctx.beginPath(); ctx.moveTo(-1, 5); ctx.quadraticCurveTo(2, 14, -2, 17); ctx.quadraticCurveTo(4, 14, 3, 5); ctx.fill();
      ctx.fillStyle = c('#fff'); Draw.poly(ctx, [-4, 4, -2, 4, -3, 7]); Draw.poly(ctx, [4, 4, 6, 4, 5, 7]);
      break;
    }
    case 'ginger': {
      ctx.save(); ctx.beginPath(); ctx.rect(-20, -20, 40, 40); ctx.arc(10, -8, 5, 0, Math.PI * 2); ctx.clip('evenodd'); // bite taken out
      ctx.fillStyle = S('#e09050', '#b0642a', '#4a2408', 0, 0, 13); Draw.circ(ctx, 0, 0, 11.5);
      ctx.restore();
      ctx.strokeStyle = c('#ffffff'); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, 9.5, 2.6, 5.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(1, 4, 4.5, 0.2, Math.PI - 0.2); ctx.stroke();
      for (let x = -3; x <= 5; x += 2) Draw.line(ctx, x, 6.5, x, 8.5);
      ctx.fillStyle = c('#1a0a04'); Draw.circ(ctx, -3, -2, 1.8); Draw.circ(ctx, 5, -2, 1.8);
      ctx.fillStyle = c('#ff3a3a'); G('#ff0000', 6); Draw.circ(ctx, -3, -2, 0.7); Draw.circ(ctx, 5, -2, 0.7); clearGlow(ctx);
      ctx.fillStyle = c('#2a9a3a'); Draw.circ(ctx, -1, -9, 1.3); ctx.fillStyle = c('#c0203a'); Draw.circ(ctx, 2, -9.5, 1.3);
      break;
    }
    case 'elf': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, -26, 0, -8, ['#3aba4a', '#1a6a2a']);
      ctx.beginPath(); ctx.moveTo(-10, -7); ctx.quadraticCurveTo(0, -18, 12, -28 + Math.sin(t * 3)); ctx.quadraticCurveTo(6, -14, 10, -7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c('#ffd040'); Draw.circ(ctx, 12, -28 + Math.sin(t * 3), 2.2);
      ctx.fillStyle = S('#f8dcc8', '#d0a088', '#6a3a2a', 0, 1, 12);
      Draw.poly(ctx, [-9, -1, -17, -8, -10, 4]); Draw.poly(ctx, [9, -1, 17, -8, 10, 4]);
      Draw.ell(ctx, 0, 1, 10, 11);
      ctx.fillStyle = c('#c0203a'); ctx.fillRect(-10, -8, 20, 3);
      ctx.fillStyle = c('#1a0a04'); Draw.ell(ctx, -3.5, 0, 2.2, 1.4); Draw.ell(ctx, 5, 0, 2.2, 1.4);
      ctx.fillStyle = c('#7aff6a'); G('#3aff3a', 6); Draw.circ(ctx, -3.2, 0, 0.7); Draw.circ(ctx, 5.3, 0, 0.7); clearGlow(ctx);
      ctx.strokeStyle = c('#5a1a1a'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(1, 3, 6, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.fillStyle = c('#fff'); for (let x = -3; x <= 5; x += 2) Draw.poly(ctx, [x, 8, x + 1.5, 8, x + 0.75, 9.8]);
      break;
    }
    case 'nutcracker': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, -26, 0, -10, ['#2a2a3a', '#0a0a14']); Draw.rr(ctx, -9, -26, 18, 16, 3); ctx.fill();
      ctx.fillStyle = c('#d4af37'); ctx.fillRect(-9, -13, 18, 2.5); Draw.circ(ctx, 0, -20, 2.5);
      ctx.fillStyle = S('#f8e0c8', '#d0a888', '#6a4a3a', 0, 0, 12); Draw.rr(ctx, -9, -11, 18, 16, 3); ctx.fill();
      ctx.fillStyle = c('#ffffff'); Draw.rr(ctx, -10, 4, 20, 9, 3); ctx.fill(); // beard
      ctx.fillStyle = c('#1a0a04'); Draw.rr(ctx, -6, 2, 13, 5 + Math.abs(Math.sin(t * 4)) * 2, 1); ctx.fill(); // big jaw
      ctx.fillStyle = c('#fff'); for (let x = -5; x <= 5; x += 2.5) ctx.fillRect(x, 2, 1.6, 2);
      ctx.fillStyle = c('#111'); Draw.circ(ctx, -3.5, -5, 1.6); Draw.circ(ctx, 4.5, -5, 1.6);
      ctx.fillStyle = c('#c8102e'); Draw.circ(ctx, -6, -1, 1.6); Draw.circ(ctx, 7, -1, 1.6);
      ctx.strokeStyle = c('#111'); ctx.lineWidth = 1.2; Draw.line(ctx, -6, -8, -1, -7); Draw.line(ctx, 2, -7, 7, -8);
      break;
    }
    case 'rudolph': {
      ctx.strokeStyle = c('#c8b8a0'); ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 5, -9); ctx.lineTo(sd * 10, -20); ctx.lineTo(sd * 15, -24); ctx.moveTo(sd * 9, -17); ctx.lineTo(sd * 15, -17); ctx.moveTo(sd * 10, -20); ctx.lineTo(sd * 7, -26); ctx.stroke(); }
      ctx.fillStyle = S('#fffaf0', '#d8d0b8', '#5a5240', 0, -1, 12); Draw.ell(ctx, 0, -1, 10, 11);
      Draw.rr(ctx, -4, 4, 13, 8, 3); ctx.fill();
      ctx.fillStyle = c('#0a0608'); Draw.ell(ctx, -3, -3, 2.8, 3.4); Draw.ell(ctx, 5, -3, 2.8, 3.4);
      ctx.fillStyle = c('#ff3a2a'); G('#ff2000', 18); Draw.circ(ctx, 9, 6, 3.6); clearGlow(ctx);
      ctx.fillStyle = c('rgba(255,255,255,0.6)'); Draw.circ(ctx, 8, 5, 1);
      break;
    }
    case 'ornament': {
      ctx.fillStyle = flash ? W : lin(ctx, -3, -16, 3, -11, ['#f0e0a0', '#8a7a30']); ctx.fillRect(-3, -15, 6, 4);
      ctx.strokeStyle = c('#d4af37'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -17, 2.5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = S('#ff6a6a', '#b0102a', '#2a0006', 0, 0, 13); Draw.circ(ctx, 0, 0, 11.5);
      ctx.strokeStyle = c('#d4af37'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 11.5, 3, 0, 0, Math.PI * 2); ctx.stroke();
      // crack with a ghost peeking out
      ctx.fillStyle = c('#0a0004'); Draw.poly(ctx, [-2, -6, 6, -9, 9, -2, 4, 3, -1, 1]);
      ctx.fillStyle = c('#e8f0ff'); G('#b9a7ff', 10); Draw.ell(ctx, 4, -3, 3.5, 3); clearGlow(ctx);
      ctx.fillStyle = c('#0a0004'); Draw.circ(ctx, 3, -3.5, 0.8); Draw.circ(ctx, 5.5, -3.5, 0.8);
      if (!flash) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; Draw.ell(ctx, -5, -6, 2.5, 1.5, -0.6); }
      break;
    }
    case 'darksanta': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, -22, 0, -6, ['#c0102a', '#5a0010']);
      ctx.beginPath(); ctx.moveTo(-11, -6); ctx.quadraticCurveTo(0, -18, 10, -24 + Math.sin(t * 3)); ctx.quadraticCurveTo(8, -14, 11, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c('#f0f0f0'); Draw.rr(ctx, -12, -8, 24, 4, 2); ctx.fill(); Draw.circ(ctx, 10, -24 + Math.sin(t * 3), 2.5);
      ctx.fillStyle = S('#4a3a3a', '#1a1010', '#000', 0, 0, 12); Draw.ell(ctx, 0, 0, 10, 9);
      ctx.fillStyle = c('#e8e8e8'); ctx.beginPath(); ctx.moveTo(-11, 2); ctx.quadraticCurveTo(-10, 16, 0, 18); ctx.quadraticCurveTo(10, 16, 11, 2); ctx.quadraticCurveTo(0, 8, -11, 2); ctx.fill();
      ctx.fillStyle = c('#000'); Draw.ell(ctx, -3.5, -1, 2.5, 2); Draw.ell(ctx, 5, -1, 2.5, 2);
      ctx.fillStyle = c('#ff2020'); G('#ff0000', 10); Draw.circ(ctx, -3.5, -1, 0.9); Draw.circ(ctx, 5, -1, 0.9); clearGlow(ctx);
      break;
    }
    // ================= THANKSGIVING =================
    case 'turkey': {
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38; ctx.fillStyle = c(['#8a3a1a', '#c8701a', '#e0a040', '#6a2a10'][i % 4]); Draw.ell(ctx, -3 + Math.cos(a) * 12, -4 + Math.sin(a) * 12, 3.5, 7, a + Math.PI / 2); }
      ctx.fillStyle = S('#9a6a4a', '#5a3a22', '#1a0e06', 2, 0, 11); Draw.ell(ctx, 2, 0, 9, 10);
      ctx.fillStyle = c('#ffc040'); Draw.poly(ctx, [8, 0, 15, 2, 8, 4]);
      ctx.fillStyle = c('#c0102a'); ctx.beginPath(); ctx.moveTo(9, 4); ctx.quadraticCurveTo(12, 10 + Math.sin(t * 5), 9, 12); ctx.quadraticCurveTo(7, 8, 9, 4); ctx.fill();
      ctx.fillStyle = c('#ff2a2a'); G('#ff0000', 8); Draw.circ(ctx, 4, -3, 1.7); clearGlow(ctx);
      ctx.fillStyle = c('#000'); Draw.circ(ctx, 4.3, -3, 0.6);
      break;
    }
    case 'pilgrim': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, -24, 0, -9, ['#2a2a2a', '#000']); ctx.fillRect(-7, -24, 14, 13); ctx.fillRect(-13, -12, 26, 3);
      ctx.fillStyle = c('#d4af37'); Draw.rr(ctx, -3, -17, 6, 5, 1); ctx.fill(); ctx.fillStyle = c('#000'); ctx.fillRect(-1.5, -16, 3, 3);
      ctx.fillStyle = S('#fffaf0', '#d8d0b8', '#5a5240', 0, 0, 12); Draw.ell(ctx, 0, 0, 10, 10);
      Draw.rr(ctx, -6, 4, 13, 8, 3); ctx.fill();
      ctx.fillStyle = c('#ffffff'); Draw.poly(ctx, [-10, 10, 10, 10, 6, 15, -6, 15]); // collar
      ctx.fillStyle = c('#0a0608'); Draw.ell(ctx, -3, -1, 2.8, 3.2); Draw.ell(ctx, 5, -1, 2.8, 3.2);
      ctx.fillStyle = c('#ffb040'); G('#ff8a00', 8); Draw.circ(ctx, -2.6, -0.6, 0.8); Draw.circ(ctx, 5.4, -0.6, 0.8); clearGlow(ctx);
      break;
    }
    case 'pie': {
      ctx.fillStyle = S('#f0c070', '#c8803a', '#5a3008', 0, 0, 13); Draw.poly(ctx, [-12, 8, 12, 8, 0, -14]);
      ctx.fillStyle = c('#e08a2a'); Draw.poly(ctx, [-8, 5, 8, 5, 0, -8]);
      ctx.fillStyle = flash ? W : lin(ctx, 0, 6, 0, 12, ['#e0a050', '#8a5020']); ctx.fillRect(-12, 7, 24, 5);
      ctx.fillStyle = c('#ffffff'); Draw.ell(ctx, 0, -10, 4, 2.5);
      ctx.fillStyle = c('#2a0e04'); Draw.circ(ctx, -3, -1, 1.6); Draw.circ(ctx, 4, -1, 1.6);
      ctx.fillStyle = c('#ffe060'); G('#ff8a00', 6); Draw.circ(ctx, -3, -1, 0.6); Draw.circ(ctx, 4, -1, 0.6); clearGlow(ctx);
      ctx.strokeStyle = c('#2a0e04'); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0.5, 2, 3, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    case 'cornhusk': {
      ctx.fillStyle = flash ? W : lin(ctx, -12, 0, 12, 0, ['#f0d890', '#c8a050', '#7a5a20']);
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, -16); ctx.quadraticCurveTo(i * 7, -2, i * 5, 12); ctx.lineTo(i * 5 + 3, 12); ctx.quadraticCurveTo(i * 7 + 3, -2, i * 4 + 3, -16); ctx.fill(); }
      ctx.fillStyle = S('#f8e8b0', '#d8b860', '#6a4a10', 0, 0, 11); Draw.ell(ctx, 1, 0, 8, 10);
      ctx.fillStyle = c('#c8a050'); ctx.fillRect(-9, 6, 20, 2.5);
      ctx.fillStyle = c('#2a1a08'); Draw.circ(ctx, -2, -2, 1.8); Draw.circ(ctx, 5, -2, 1.8);
      ctx.fillStyle = c('#6a4a2a'); for (const [dx, dy] of [[-0.7, -0.7], [0.7, 0.7]]) { Draw.circ(ctx, -2 + dx, -2 + dy, 0.4); Draw.circ(ctx, 5 + dx, -2 + dy, 0.4); }
      ctx.strokeStyle = c('#2a1a08'); ctx.lineWidth = 0.9; Draw.line(ctx, -2, 3, 5, 3);
      for (let x = -1; x <= 4; x += 1.6) Draw.line(ctx, x, 2, x, 4);
      break;
    }
    case 'cranberry': {
      const wob = Math.sin(t * 6) * 0.8;
      ctx.fillStyle = flash ? W : lin(ctx, -10, 0, 10, 0, ['#ff4a6a', '#b0123a', '#4a0014']);
      ctx.beginPath(); ctx.moveTo(-10 - wob, 10); ctx.lineTo(-10 + wob, -9); ctx.quadraticCurveTo(0, -13, 10 - wob, -9); ctx.lineTo(10 + wob, 10); ctx.quadraticCurveTo(0, 12, -10 - wob, 10); ctx.fill();
      ctx.strokeStyle = c('rgba(80,0,20,0.5)'); ctx.lineWidth = 1; for (const y of [-4, 2, 8]) Draw.line(ctx, -10, y, 10, y);
      if (!flash) { ctx.fillStyle = 'rgba(255,200,210,0.6)'; Draw.ell(ctx, -5, -6, 2, 4, 0.2); }
      ctx.fillStyle = c('#ffffff'); Draw.circ(ctx, -3, -1, 2.4); Draw.circ(ctx, 5, -1, 2.4);
      ctx.fillStyle = c('#000'); Draw.circ(ctx, -2.5, -0.5, 1.1); Draw.circ(ctx, 5.5, -0.5, 1.1);
      ctx.strokeStyle = c('#4a0014'); ctx.beginPath(); ctx.arc(1, 4, 3, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    case 'scarecrow': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, -16, 0, -8, ['#e8c870', '#a07a30']);
      Draw.ell(ctx, 0, -9, 16, 3.5); ctx.beginPath(); ctx.moveTo(-8, -10); ctx.quadraticCurveTo(-7, -20, 0, -20); ctx.quadraticCurveTo(7, -20, 8, -10); ctx.fill();
      ctx.fillStyle = c('#8a2a1a'); ctx.fillRect(-8, -12.5, 16, 2.5);
      ctx.fillStyle = S('#d8b87a', '#a08040', '#3a2a10', 0, 1, 12); Draw.ell(ctx, 0, 1, 10, 10);
      ctx.strokeStyle = c('#e8c860'); ctx.lineWidth = 1; for (let i = -9; i <= 9; i += 3) Draw.line(ctx, i, 9, i + (i % 2) * 2, 14);
      ctx.fillStyle = c('#0a0604'); Draw.poly(ctx, [-6, -3, -1, -3, -3.5, 1]); Draw.poly(ctx, [2, -3, 7, -3, 4.5, 1]);
      ctx.fillStyle = c('#ffd040'); G('#ff9a00', 8); Draw.circ(ctx, -3.5, -2, 0.8); Draw.circ(ctx, 4.5, -2, 0.8); clearGlow(ctx);
      ctx.strokeStyle = c('#0a0604'); ctx.lineWidth = 1; Draw.line(ctx, -5, 5, 6, 5); for (let x = -4; x <= 5; x += 2) Draw.line(ctx, x, 4, x, 6);
      // a tiny crow on the hat brim
      ctx.fillStyle = c('#111'); Draw.ell(ctx, 12, -12, 3, 2.2); Draw.circ(ctx, 14, -14, 1.6); ctx.fillStyle = c('#ffb040'); Draw.poly(ctx, [15, -14, 17.5, -13.5, 15, -13]);
      break;
    }
    case 'cornucopia': {
      ctx.fillStyle = flash ? W : lin(ctx, -12, 0, 12, 0, ['#e0b060', '#a8742a', '#4a2a08']);
      ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(-10, -14, 0, -12); ctx.lineTo(11, -10); ctx.quadraticCurveTo(14, 0, 11, 10); ctx.lineTo(0, 11); ctx.quadraticCurveTo(-10, 10, -14, -6); ctx.fill();
      ctx.strokeStyle = c('rgba(60,30,4,0.5)'); ctx.lineWidth = 1; for (let i = -8; i <= 8; i += 4) Draw.line(ctx, i, -11, i + 2, 10);
      ctx.fillStyle = c('#c0203a'); Draw.circ(ctx, 10, -6, 3); ctx.fillStyle = c('#7a2aa0'); Draw.circ(ctx, 12, 0, 2.6); ctx.fillStyle = c('#e8c040'); Draw.circ(ctx, 10, 6, 2.8);
      ctx.fillStyle = c('#1a0a04'); Draw.ell(ctx, -3, -1, 2.4, 3); Draw.ell(ctx, 4, -1, 2.4, 3);
      ctx.fillStyle = c('#7aff6a'); G('#3aff3a', 8); Draw.circ(ctx, -3, -1, 0.9); Draw.circ(ctx, 4, -1, 0.9); clearGlow(ctx);
      break;
    }
    case 'gravy': {
      ctx.fillStyle = S('#f8f4ec', '#d8d0c0', '#6a6050', 0, 2, 13); Draw.ell(ctx, 0, 3, 12, 8);
      ctx.fillStyle = c('#f0ece0'); Draw.poly(ctx, [9, 0, 16, -3, 11, 4]);
      ctx.fillStyle = flash ? W : lin(ctx, 0, -6, 0, 2, ['#a8723a', '#5a3410']); Draw.ell(ctx, 0, -2, 10, 4);
      ctx.fillStyle = c('#7a4a1a'); for (const [dx, l] of [[-7, 6], [-1, 9], [6, 5]]) { Draw.rr(ctx, dx, 4, 2.4, l + Math.sin(t * 3 + dx) * 1.5, 1.2); ctx.fill(); }
      ctx.strokeStyle = c('#d8d0c0'); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-12, 3, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.fillStyle = c('#2a1404'); Draw.circ(ctx, -3, -3, 1.8); Draw.circ(ctx, 4, -3, 1.8);
      ctx.fillStyle = c('#ffe060'); G('#ff9a00', 8); Draw.circ(ctx, -3, -3, 0.7); Draw.circ(ctx, 4, -3, 0.7); clearGlow(ctx);
      break;
    }
  }
  ctx.restore();
}
