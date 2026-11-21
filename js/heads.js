// The playable "heads" — all creepy, no Halloween. Every head sits on the same hooded body.
// Health is infinite — heads only change how you move or fight.
// All art is drawn with canvas paths and gradients, so there are no image files.
const HEADS = [
  { id: 'mask',     name: 'Hollow Mask',   price: 0,   accent: '#d8d0c8', perk: 'Balanced. Always watching.', stats: {} },
  { id: 'bonesy',   name: 'Bonesy',        price: 40, accent: '#e8e2d0', perk: 'Heavy bones: monsters barely knock you back', stats: { knock: 0.35 } },
  { id: 'shade',    name: 'The Shade',     price: 60, accent: '#7aa0c0', perk: 'Longer dash that recharges faster', stats: { dash: 1.35, dashCd: 0.6 } },
  { id: 'stitches', name: 'Stitches',      price: 80, accent: '#b08a50', perk: 'Jumps higher and runs faster', stats: { jump: 1.08, speed: 1.1 } },
  { id: 'fang',     name: 'Count Fang',    price: 100, accent: '#d0213b', perk: 'Wisp Bolt recharges twice as fast', stats: { boltCd: 0.5 } },
  { id: 'wrapz',    name: 'Wrapz',         price: 130, accent: '#7cf4ff', perk: 'Floaty: hold jump to fall slowly', stats: { floaty: 0.3 } },
  { id: 'rotter',   name: 'The Rotter',    price: 160, accent: '#8aa070', perk: '+50% attack damage', stats: { dmg: 1.5 } },
  { id: 'wick',     name: 'Wick',          price: 200, accent: '#ffb347', perk: 'Much longer slash reach', stats: { reach: 1.35 } },
];

function headById(id) { return HEADS.find((h) => h.id === id) || HEADS[0]; }
function headStats(id) {
  return Object.assign({ dmg: 1, speed: 1, jump: 1, dash: 1, dashCd: 1, reach: 1, knock: 1, boltCd: 1, floaty: 1 }, headById(id).stats);
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
  }
  ctx.restore();
}
