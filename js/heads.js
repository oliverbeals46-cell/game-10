// The playable "heads". Every head sits on the same hooded body.
// Health is infinite — heads only change how you move or fight.
// All art is drawn with canvas paths and gradients, so there are no image files.
const HEADS = [
  { id: 'pip',     name: 'Pip the Pumpkin', price: 0,   accent: '#ff8c26', perk: 'Balanced. A true classic.', stats: {} },
  { id: 'bonesy',  name: 'Bonesy',          price: 150, accent: '#e8e2d0', perk: 'Heavy bones: monsters barely knock you back', stats: { knock: 0.35 } },
  { id: 'boo',     name: 'Boo',             price: 200, accent: '#cfc6ff', perk: 'Longer dash that recharges faster', stats: { dash: 1.35, dashCd: 0.6 } },
  { id: 'mittens', name: 'Mittens the Hex', price: 250, accent: '#9b5cd6', perk: 'Jumps higher and runs faster', stats: { jump: 1.08, speed: 1.1 } },
  { id: 'fang',    name: 'Count Fang',      price: 300, accent: '#d0213b', perk: 'Wisp Bolt recharges twice as fast', stats: { boltCd: 0.5 } },
  { id: 'wrapz',   name: 'Wrapz',           price: 350, accent: '#7cf4ff', perk: 'Sticky bandages: slides down walls slowly', stats: { grip: 0.45 } },
  { id: 'franky',  name: 'Franky Bolt',     price: 450, accent: '#8bd16a', perk: '+50% attack damage', stats: { dmg: 1.5 } },
  { id: 'wick',    name: 'Wick',            price: 500, accent: '#ffb347', perk: 'Much longer slash reach', stats: { reach: 1.35 } },
];

function headById(id) { return HEADS.find((h) => h.id === id) || HEADS[0]; }
function headStats(id) {
  return Object.assign({ dmg: 1, speed: 1, jump: 1, dash: 1, dashCd: 1, reach: 1, knock: 1, boltCd: 1, grip: 1 }, headById(id).stats);
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
    case 'pip': {
      // stem
      ctx.fillStyle = flash ? W : lin(ctx, -2, -10, 6, -18, ['#2f4218', '#5d7a32', '#3a5020']);
      ctx.beginPath();
      ctx.moveTo(-2.5, -9.5); ctx.quadraticCurveTo(-1.5, -17, 5, -18.5);
      ctx.lineTo(6, -15.5); ctx.quadraticCurveTo(2, -14.5, 2.2, -9.5); ctx.closePath(); ctx.fill();
      // lobes (back to front)
      ctx.fillStyle = S('#e0661a', '#a8420a', '#4a1602', -6.5, 1, 9); Draw.ell(ctx, -6.5, 1, 7.6, 11);
      ctx.fillStyle = S('#e86f1f', '#b04a0c', '#4a1602', 6.5, 1, 9); Draw.ell(ctx, 6.5, 1, 7.6, 11);
      ctx.fillStyle = S('#ffb060', '#e8701c', '#7a2a05', 0, 0, 12); Draw.ell(ctx, 0, 0, 9.2, 12.2);
      // grooves
      ctx.strokeStyle = c('rgba(70,20,0,0.55)'); ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.ellipse(0, 0.5, 4.2, 11.6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0.5, 9, 11.8, 0, -1.2, 1.2); ctx.stroke();
      // specular highlight
      if (!flash) { ctx.fillStyle = 'rgba(255,235,200,0.45)'; Draw.ell(ctx, -4.5, -7, 2.6, 1.4, -0.5); }
      // carved face: dark inner wall first (gives depth), then candle glow
      const face = (ox, oy) => {
        Draw.poly(ctx, [-8 + ox, -1 + oy, -2.5 + ox, -1 + oy, -5 + ox, -6.5 + oy]);
        Draw.poly(ctx, [3 + ox, -1 + oy, 8.5 + ox, -1 + oy, 6 + ox, -6.5 + oy]);
        Draw.poly(ctx, [-8 + ox, 3 + oy, -5.5 + ox, 5 + oy, -3 + ox, 3 + oy, -0.5 + ox, 5.5 + oy, 2 + ox, 3 + oy, 4.5 + ox, 5.5 + oy, 8.5 + ox, 3 + oy, 6.5 + ox, 8.5 + oy, 0 + ox, 9.5 + oy, -6 + ox, 8.5 + oy]);
      };
      ctx.fillStyle = c('#5a1c02'); face(0, 0);
      ctx.fillStyle = flash ? W : shade(ctx, 0, 2, 10, '#fff6b0', '#ffc43a', '#ff7a10'); G('#ff9b1a', 12);
      ctx.save(); ctx.translate(0.6, 0.7); ctx.scale(0.92, 0.92); face(0, 0); ctx.restore();
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
    case 'boo': {
      const wob = Math.sin(t * 5);
      G('#b9a7ff', 14);
      ctx.fillStyle = flash ? W : lin(ctx, -8, -12, 8, 12, ['rgba(255,255,255,0.97)', 'rgba(230,224,255,0.92)', 'rgba(170,155,230,0.75)']);
      ctx.beginPath();
      ctx.moveTo(-12, 9);
      ctx.lineTo(-12, -1);
      ctx.arc(0, -1, 12, Math.PI, 0);
      ctx.lineTo(12, 9);
      for (let i = 0; i < 4; i++) {
        const x0 = 12 - i * 6;
        ctx.quadraticCurveTo(x0 - 3, 13 + (i % 2 ? wob : -wob) * 2, x0 - 6, 9);
      }
      ctx.closePath(); ctx.fill();
      clearGlow(ctx);
      if (!flash) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; Draw.ell(ctx, -5, -8, 3, 1.6, -0.6); }
      ctx.fillStyle = c('#120c1e'); Draw.ell(ctx, -2.5, -2, 2.5, 3.8); Draw.ell(ctx, 6, -2, 2.5, 3.8);
      ctx.fillStyle = c('#ffffff'); Draw.circ(ctx, -1.7, -3.5, 1); Draw.circ(ctx, 6.8, -3.5, 1);
      ctx.fillStyle = c('#120c1e'); Draw.ell(ctx, 2, 4, 1.8, 2.4 + wob * 0.3);
      ctx.fillStyle = flash ? W : 'rgba(255,130,180,0.45)'; Draw.ell(ctx, -6.5, 2, 2.4, 1.3); Draw.ell(ctx, 10, 2, 2, 1.3);
      break;
    }
    case 'mittens': {
      const fur = (cx, cy, r) => S('#4a4260', '#1c1828', '#050408', cx, cy, r);
      // ears
      ctx.fillStyle = fur(-9, -7, 6);
      Draw.poly(ctx, [-11, -1, -5, -8, -13, -12]);
      ctx.fillStyle = fur(9, -7, 6);
      Draw.poly(ctx, [11, -1, 5, -8, 13, -12]);
      ctx.fillStyle = c('#c46a96');
      Draw.poly(ctx, [-10, -3, -7, -7, -11.5, -9.5]);
      Draw.poly(ctx, [10, -3, 7, -7, 11.5, -9.5]);
      // head
      ctx.fillStyle = fur(0, 1, 11); Draw.circ(ctx, 0, 1, 11);
      // rim light (moonlight)
      ctx.strokeStyle = c('rgba(170,140,230,0.8)'); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(0, 1, 10.6, -2.6, -0.6); ctx.stroke();
      // fur tufts on cheeks
      ctx.fillStyle = c('#1c1828');
      Draw.poly(ctx, [-10, 4, -13, 6, -10, 7]); Draw.poly(ctx, [10, 4, 13, 6, 10, 7]);
      // hat
      ctx.fillStyle = flash ? W : lin(ctx, -6, -20, 6, -10, ['#7a45ad', '#5a2d82', '#2e1248']);
      ctx.beginPath(); ctx.moveTo(-7, -8); ctx.quadraticCurveTo(-1, -20, 7, -27 + Math.sin(t * 3) * 0.8);
      ctx.quadraticCurveTo(3, -17, 7, -8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = flash ? W : lin(ctx, 0, -11.5, 0, -8.5, ['#ffc060', '#e07a10']); ctx.fillRect(-6.5, -11.5, 13, 3);
      ctx.fillStyle = c('#c8b040'); ctx.fillRect(-1.5, -11.8, 3, 3.6);
      ctx.fillStyle = flash ? W : lin(ctx, 0, -10, 0, -6, ['#5a2d82', '#2a0f40']); Draw.ell(ctx, 0, -8, 13, 2.6);
      // eyes
      ctx.fillStyle = flash ? W : shade(ctx, -3.5, 1, 3.4, '#e0ffb0', '#7dff5a', '#2a9a10'); G('#5cff3a', 10);
      Draw.ell(ctx, -3.5, 1, 3, 3.4);
      ctx.fillStyle = flash ? W : shade(ctx, 5.5, 1, 3.4, '#e0ffb0', '#7dff5a', '#2a9a10');
      Draw.ell(ctx, 5.5, 1, 3, 3.4);
      clearGlow(ctx);
      ctx.fillStyle = c('#050408'); Draw.ell(ctx, -3, 1, 0.9, 2.8); Draw.ell(ctx, 6, 1, 0.9, 2.8);
      ctx.fillStyle = c('#ffffff'); Draw.circ(ctx, -4.4, -0.4, 0.7); Draw.circ(ctx, 4.6, -0.4, 0.7);
      ctx.fillStyle = c('#e58ab5'); Draw.poly(ctx, [0.5, 5, 2.5, 5, 1.5, 6.5]);
      ctx.strokeStyle = c('rgba(200,190,230,0.7)'); ctx.lineWidth = 0.5;
      Draw.line(ctx, -4, 7, -13, 6); Draw.line(ctx, -4, 8, -13, 9.5);
      Draw.line(ctx, 7, 7, 15, 6); Draw.line(ctx, 7, 8, 15, 9.5);
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
    case 'franky': {
      ctx.fillStyle = flash ? W : lin(ctx, 0, 2, 0, 7, ['#d8dde4', '#80868e', '#4a4f56']);
      ctx.fillRect(-15, 2, 4, 5); ctx.fillRect(11, 2, 4, 5);
      ctx.fillStyle = c('#5a6068'); ctx.fillRect(-16.5, 3, 1.8, 3); ctx.fillRect(14.7, 3, 1.8, 3);
      ctx.fillStyle = S('#b4e08e', '#74ac54', '#2c4a1e', 0, 0, 14); Draw.rr(ctx, -11, -11, 22, 23, 4); ctx.fill();
      ctx.fillStyle = c('rgba(30,50,20,0.35)'); ctx.fillRect(-11, 8, 22, 4);
      ctx.fillStyle = flash ? W : lin(ctx, 0, -14, 0, -5, ['#3a3a3a', '#111', '#000']);
      Draw.poly(ctx, [-12, -14, 12, -14, 12, -7, 9, -5, 6, -7, 3, -5, 0, -7, -3, -5, -6, -7, -9, -5, -12, -7]);
      ctx.strokeStyle = c('#1e2a16'); ctx.lineWidth = 1;
      Draw.line(ctx, -9, -2.5, 9, -1.5);
      for (let x = -7; x <= 7; x += 3.5) Draw.line(ctx, x, -4, x + 0.3, -0.2);
      ctx.fillStyle = c('#fff6a8'); G('#e8ff5a', 8);
      Draw.ell(ctx, -3.5, 2.5, 2.6, 2); Draw.ell(ctx, 5.5, 2.5, 2.6, 2);
      clearGlow(ctx);
      ctx.fillStyle = c('#4f8436'); ctx.fillRect(-6.5, 0, 6, 2); ctx.fillRect(2.5, 0, 6, 2);
      ctx.fillStyle = c('#111'); Draw.circ(ctx, -3, 3, 0.9); Draw.circ(ctx, 6, 3, 0.9);
      ctx.strokeStyle = c('#1e2a16'); ctx.lineWidth = 1.1;
      Draw.line(ctx, -4, 7.5, 7, 7.5); Draw.line(ctx, 1.5, 6.5, 1.5, 8.5);
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
