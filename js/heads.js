// The playable "heads". Every head sits on the same little cloaked vessel body.
// All art is drawn with canvas paths, so there are no image files.
const HEADS = [
  { id: 'pip',     name: 'Pip the Pumpkin', price: 0,   accent: '#ff8c26', perk: 'Balanced. A true classic.', stats: {} },
  { id: 'bonesy',  name: 'Bonesy',          price: 150, accent: '#e8e2d0', perk: '+1 health mask', stats: { hp: 1 } },
  { id: 'boo',     name: 'Boo',             price: 200, accent: '#cfc6ff', perk: 'Longer dash that recharges faster', stats: { dash: 1.35, dashCd: 0.6 } },
  { id: 'mittens', name: 'Mittens the Hex', price: 250, accent: '#9b5cd6', perk: 'Jumps higher and runs faster', stats: { jump: 1.08, speed: 1.1 } },
  { id: 'fang',    name: 'Count Fang',      price: 300, accent: '#d0213b', perk: '+50% Soul from every hit', stats: { soul: 1.5 } },
  { id: 'wrapz',   name: 'Wrapz',           price: 350, accent: '#7cf4ff', perk: '+2 masks, but a little slower', stats: { hp: 2, speed: 0.94 } },
  { id: 'franky',  name: 'Franky Bolt',     price: 450, accent: '#8bd16a', perk: '+50% attack damage', stats: { dmg: 1.5 } },
  { id: 'wick',    name: 'Wick',            price: 500, accent: '#ffb347', perk: 'Much longer slash reach', stats: { reach: 1.35 } },
];

function headById(id) { return HEADS.find((h) => h.id === id) || HEADS[0]; }
function headStats(id) {
  return Object.assign({ hp: 0, dmg: 1, speed: 1, jump: 1, dash: 1, dashCd: 1, soul: 1, reach: 1 }, headById(id).stats);
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

/**
 * Draw a head centred at (0,0), facing right, roughly 26px wide.
 * opts: { flash: bool (draw all white), glow: bool }
 */
function drawHead(ctx, id, t, opts = {}) {
  const flash = !!opts.flash;
  const glowOn = opts.glow !== false && !flash;
  const c = (col) => (flash ? '#ffffff' : col);
  const G = (col, b) => { if (glowOn) setGlow(ctx, col, b); };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (id) {
    case 'pip': {
      // stem
      ctx.fillStyle = c('#4a6b2a');
      ctx.beginPath();
      ctx.moveTo(-2, -10); ctx.quadraticCurveTo(-1, -17, 5, -18);
      ctx.lineTo(5.5, -15.5); ctx.quadraticCurveTo(2, -14.5, 2, -10); ctx.closePath(); ctx.fill();
      // lobes
      ctx.fillStyle = c('#c2520f'); Draw.ell(ctx, -6.5, 1, 7.5, 11); Draw.ell(ctx, 6.5, 1, 7.5, 11);
      ctx.fillStyle = c('#f07a1e'); Draw.ell(ctx, 0, 0, 9, 12);
      ctx.strokeStyle = c('rgba(110,35,0,0.5)'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0.5, 4, 11.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = flash ? '#fff' : 'rgba(255,220,160,0.35)'; Draw.ell(ctx, -4, -7, 3, 1.8, -0.4);
      // carved face
      ctx.fillStyle = c('#ffd84d'); G('#ff9b1a', 10);
      Draw.poly(ctx, [-8, -1, -2.5, -1, -5, -6.5]);
      Draw.poly(ctx, [3, -1, 8.5, -1, 6, -6.5]);
      Draw.poly(ctx, [-8, 3, -5.5, 5, -3, 3, -0.5, 5.5, 2, 3, 4.5, 5.5, 8.5, 3, 6.5, 8.5, 0, 9.5, -6, 8.5]);
      break;
    }
    case 'bonesy': {
      ctx.fillStyle = c('#ece6d6'); Draw.circ(ctx, 0, -2, 12);
      Draw.rr(ctx, -7, 4, 15, 8, 3); ctx.fill();
      ctx.fillStyle = c('#cfc7b2'); Draw.ell(ctx, -6, 4, 4, 2.5); Draw.ell(ctx, 8, 4, 4, 2.5);
      // crack
      ctx.strokeStyle = c('#9e9580'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, -13.5); ctx.lineTo(-1, -9); ctx.lineTo(-4, -6); ctx.stroke();
      // sockets
      ctx.fillStyle = c('#1a1020'); Draw.ell(ctx, -3, -1, 3.8, 4.4); Draw.ell(ctx, 6.5, -1, 3.8, 4.4);
      Draw.poly(ctx, [1.8, 3.5, 3.4, 3.5, 2.6, 1]);
      // pupils
      ctx.fillStyle = c('#ff4040'); G('#ff2020', 8);
      Draw.circ(ctx, -2.2, -0.5, 1.4); Draw.circ(ctx, 7.2, -0.5, 1.4);
      clearGlow(ctx);
      // teeth
      ctx.strokeStyle = c('#6e6656'); ctx.lineWidth = 0.9;
      for (let i = -4; i <= 6; i += 2.5) Draw.line(ctx, i, 7, i, 11);
      Draw.line(ctx, -6, 8.6, 7.5, 8.6);
      break;
    }
    case 'boo': {
      const wob = Math.sin(t * 5);
      G('#b9a7ff', 12);
      ctx.fillStyle = c('#f4f1ff');
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
      ctx.fillStyle = c('#1a1428'); Draw.ell(ctx, -2.5, -2, 2.4, 3.6); Draw.ell(ctx, 6, -2, 2.4, 3.6);
      ctx.fillStyle = c('#ffffff'); Draw.circ(ctx, -1.8, -3.4, 0.9); Draw.circ(ctx, 6.7, -3.4, 0.9);
      ctx.fillStyle = c('#1a1428'); Draw.ell(ctx, 2, 4, 1.8, 2.4 + wob * 0.3);
      ctx.fillStyle = flash ? '#fff' : 'rgba(255,140,190,0.55)'; Draw.ell(ctx, -6.5, 2, 2.2, 1.2); Draw.ell(ctx, 10, 2, 2, 1.2);
      break;
    }
    case 'mittens': {
      // ears
      ctx.fillStyle = c('#1b1726');
      Draw.poly(ctx, [-11, -1, -5, -8, -13, -12]);
      Draw.poly(ctx, [11, -1, 5, -8, 13, -12]);
      ctx.fillStyle = c('#d97aa8');
      Draw.poly(ctx, [-10, -3, -7, -7, -11.5, -9.5]);
      Draw.poly(ctx, [10, -3, 7, -7, 11.5, -9.5]);
      // head
      ctx.fillStyle = c('#1b1726'); Draw.circ(ctx, 0, 1, 11);
      ctx.strokeStyle = c('#8a6bc9'); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 1, 11, 0, Math.PI * 2); ctx.stroke();
      // hat
      ctx.fillStyle = c('#5a2d82');
      ctx.beginPath(); ctx.moveTo(-7, -8); ctx.quadraticCurveTo(-1, -20, 7, -27 + Math.sin(t * 3) * 0.8);
      ctx.quadraticCurveTo(3, -17, 7, -8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c('#ff9f1a'); ctx.fillRect(-6.5, -11.5, 13, 3);
      ctx.fillStyle = c('#47216a'); Draw.ell(ctx, 0, -8, 13, 2.6);
      // eyes
      ctx.fillStyle = c('#8dff6a'); G('#5cff3a', 9);
      Draw.ell(ctx, -3.5, 1, 3, 3.4); Draw.ell(ctx, 5.5, 1, 3, 3.4);
      clearGlow(ctx);
      ctx.fillStyle = c('#0b0a10'); Draw.ell(ctx, -3, 1, 0.9, 2.8); Draw.ell(ctx, 6, 1, 0.9, 2.8);
      // nose + whiskers
      ctx.fillStyle = c('#e58ab5'); Draw.poly(ctx, [0.5, 5, 2.5, 5, 1.5, 6.5]);
      ctx.strokeStyle = c('#9c92b8'); ctx.lineWidth = 0.7;
      Draw.line(ctx, -4, 7, -13, 6); Draw.line(ctx, -4, 8, -13, 9.5);
      Draw.line(ctx, 7, 7, 15, 6); Draw.line(ctx, 7, 8, 15, 9.5);
      break;
    }
    case 'fang': {
      // collar
      ctx.fillStyle = c('#8b0f1f');
      Draw.poly(ctx, [-4, 8, -16, 2, -13, 14]);
      Draw.poly(ctx, [4, 8, 16, 2, 13, 14]);
      ctx.fillStyle = c('#3a0710');
      Draw.poly(ctx, [-4, 9, -12, 5, -11, 13]);
      Draw.poly(ctx, [4, 9, 12, 5, 11, 13]);
      // face
      ctx.fillStyle = c('#d9d2f0'); Draw.ell(ctx, 0, 0, 10, 12);
      // hair with widow's peak
      ctx.fillStyle = c('#14101c');
      ctx.beginPath();
      ctx.moveTo(-10.5, 2); ctx.quadraticCurveTo(-12, -13, 0, -13);
      ctx.quadraticCurveTo(12, -13, 10.5, 2);
      ctx.quadraticCurveTo(9, -5, 6, -6); ctx.lineTo(1.5, -3); ctx.lineTo(-3, -6);
      ctx.quadraticCurveTo(-8, -5, -10.5, 2); ctx.closePath(); ctx.fill();
      // eyes
      ctx.fillStyle = c('#ff2244'); G('#ff0030', 9);
      Draw.ell(ctx, -3, 0.5, 2.2, 1.6); Draw.ell(ctx, 6, 0.5, 2.2, 1.6);
      clearGlow(ctx);
      ctx.strokeStyle = c('#14101c'); ctx.lineWidth = 1.3;
      Draw.line(ctx, -6, -2.5, -0.5, -1); Draw.line(ctx, 3.5, -1, 8.5, -2.5);
      // mouth + fangs
      ctx.strokeStyle = c('#5a1020'); ctx.lineWidth = 1;
      Draw.line(ctx, -3, 6, 6, 6);
      ctx.fillStyle = c('#ffffff');
      Draw.poly(ctx, [-2, 6, 0, 6, -1, 9]); Draw.poly(ctx, [3, 6, 5, 6, 4, 9]);
      break;
    }
    case 'wrapz': {
      // loose bandage tail
      ctx.strokeStyle = c('#c9b98f'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, 5);
      ctx.quadraticCurveTo(-15, 7 + Math.sin(t * 6) * 2, -20, 4 + Math.sin(t * 6 + 1) * 3); ctx.stroke();
      ctx.fillStyle = c('#d8c9a3'); Draw.circ(ctx, 0, 0, 12);
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = c('#a8976d'); ctx.lineWidth = 1.2;
      const rows = [-9, -5.5, 4, 7.5, 11];
      rows.forEach((y, i) => Draw.line(ctx, -13, y + (i % 2 ? 1.5 : -1.5), 13, y - (i % 2 ? 1.5 : -1.5)));
      // dark gap where the eyes peek out
      ctx.fillStyle = c('#2a2116'); ctx.fillRect(-13, -2.5, 26, 4.5);
      ctx.restore();
      ctx.fillStyle = c('#7cf4ff'); G('#2ee6ff', 10);
      Draw.circ(ctx, 5.5, -0.3, 1.9);
      ctx.globalAlpha = 0.45; Draw.circ(ctx, -3, -0.3, 1.4); ctx.globalAlpha = 1;
      break;
    }
    case 'franky': {
      ctx.fillStyle = c('#9aa0a8'); ctx.fillRect(-15, 2, 4, 5); ctx.fillRect(11, 2, 4, 5);
      ctx.fillStyle = c('#6c727a'); ctx.fillRect(-16, 3, 1.5, 3); ctx.fillRect(14.5, 3, 1.5, 3);
      ctx.fillStyle = c('#79b25a'); Draw.rr(ctx, -11, -11, 22, 23, 4); ctx.fill();
      ctx.fillStyle = c('#5f9445'); ctx.fillRect(-11, 8, 22, 4);
      // flat hair
      ctx.fillStyle = c('#1a1a1a');
      Draw.poly(ctx, [-12, -14, 12, -14, 12, -7, 9, -5, 6, -7, 3, -5, 0, -7, -3, -5, -6, -7, -9, -5, -12, -7]);
      // stitches
      ctx.strokeStyle = c('#2d3a22'); ctx.lineWidth = 1;
      Draw.line(ctx, -9, -2.5, 9, -1.5);
      for (let x = -7; x <= 7; x += 3.5) Draw.line(ctx, x, -4, x + 0.3, -0.2);
      // droopy eyes
      ctx.fillStyle = c('#fff6a8'); G('#e8ff5a', 7);
      Draw.ell(ctx, -3.5, 2.5, 2.6, 2); Draw.ell(ctx, 5.5, 2.5, 2.6, 2);
      clearGlow(ctx);
      ctx.fillStyle = c('#5f9445'); ctx.fillRect(-6.5, 0, 6, 2); ctx.fillRect(2.5, 0, 6, 2);
      ctx.fillStyle = c('#111'); Draw.circ(ctx, -3, 3, 0.9); Draw.circ(ctx, 6, 3, 0.9);
      ctx.strokeStyle = c('#2d3a22'); ctx.lineWidth = 1.1;
      Draw.line(ctx, -4, 7.5, 7, 7.5); Draw.line(ctx, 1.5, 6.5, 1.5, 8.5);
      break;
    }
    case 'wick': {
      // flame
      const fl = Math.sin(t * 14) * 0.8 + Math.sin(t * 23) * 0.5;
      G('#ffae2a', 16);
      ctx.fillStyle = c('#ff8a1a');
      ctx.beginPath(); ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(-5, -17, fl, -25); ctx.quadraticCurveTo(5, -17, 0, -12); ctx.fill();
      ctx.fillStyle = c('#fff0a0');
      ctx.beginPath(); ctx.moveTo(0, -12.5);
      ctx.quadraticCurveTo(-2.5, -16, fl * 0.6, -20); ctx.quadraticCurveTo(2.5, -16, 0, -12.5); ctx.fill();
      clearGlow(ctx);
      ctx.strokeStyle = c('#222'); ctx.lineWidth = 1.2; Draw.line(ctx, 0, -10, 0, -13);
      // wax
      ctx.fillStyle = c('#f3e7c9'); Draw.rr(ctx, -10, -10, 20, 22, 3); ctx.fill();
      ctx.fillStyle = c('#fff7e2'); Draw.ell(ctx, 0, -10, 10, 2.4);
      Draw.ell(ctx, -7, -6, 2, 4.5); Draw.ell(ctx, 6, -5, 1.8, 6); Draw.ell(ctx, 1, -7, 1.6, 3);
      ctx.fillStyle = c('#d9c9a2'); ctx.fillRect(-10, 9, 20, 3);
      // face
      ctx.fillStyle = c('#2a1608'); Draw.ell(ctx, -3, 1, 2.3, 3); Draw.ell(ctx, 5, 1, 2.3, 3);
      ctx.fillStyle = c('#ffb347'); G('#ff8a1a', 8);
      Draw.circ(ctx, -3, 1.5, 1); Draw.circ(ctx, 5, 1.5, 1);
      clearGlow(ctx);
      ctx.strokeStyle = c('#2a1608'); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(1, 5.5, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
