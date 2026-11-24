// Scenery art: sky, moon, clouds, castle, forest, fog, decorations, checkpoints, portal and lighting.
// Expensive pieces are painted once into off-screen "sprites" and reused every frame.
const Art = {
  ready: false,

  init() {
    this.rng = mulberry32(1337);
    this.clouds = [0, 1, 2].map((i) => this.makeCloud(i));
    this.applyTheme(themeForLevel(1));
    this.stars = Array.from({ length: 170 }, () => ({ x: Math.random() * 2400, y: Math.random() * 360, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6 }));
    this.leaves = Array.from({ length: 22 }, () => this.newLeaf(true));
    this.light = document.createElement('canvas');
    this.light.width = VIEW_W / 2; this.light.height = VIEW_H / 2;
    this.lctx = this.light.getContext('2d');
    this.ready = true;
  },

  // Rebuild the scenery sprites in the colours of the current level's theme.
  applyTheme(theme) {
    if (THEME && THEME.level === theme.level) return;
    THEME = theme;
    this.moon = this.makeMoon(theme.moon);
    this.castle = this.makeCastle(theme.castle, theme.windows);
    this.trees = [0, 1, 2, 3].map((i) => this.makeTree(i, theme.tree, 1));
    this.bgTrees = [0, 1, 2].map((i) => this.makeTree(i + 10, theme.bgTree, 0.7));
    if (this.leaves) this.leaves.forEach((l) => (l.col = theme.leaves[Math.floor(Math.random() * theme.leaves.length)]));
  },

  sprite(w, h, fn) {
    const cv = document.createElement('canvas');
    cv.width = w * 2; cv.height = h * 2;
    const ctx = cv.getContext('2d'); ctx.scale(2, 2);
    fn(ctx);
    return { cv, w, h };
  },

  makeMoon(m) {
    const mix = (k) => `rgb(${Math.round(m[0] * k)},${Math.round(m[1] * k)},${Math.round(m[2] * k)})`;
    return this.sprite(360, 360, (ctx) => {
      const c = 180;
      const halo = ctx.createRadialGradient(c, c, 40, c, c, 180);
      halo.addColorStop(0, hexA(m, 0.45)); halo.addColorStop(0.35, hexA(m, 0.12)); halo.addColorStop(1, hexA(m, 0));
      ctx.fillStyle = halo; ctx.fillRect(0, 0, 360, 360);
      const g = ctx.createRadialGradient(c - 16, c - 18, 6, c, c, 52);
      g.addColorStop(0, '#fffaf0'); g.addColorStop(0.6, mix(0.95)); g.addColorStop(1, mix(0.72));
      ctx.fillStyle = g; Draw.circ(ctx, c, c, 50);
      const r = mulberry32(7);
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 42, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, s = 2 + r() * 8;
        const cg = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
        cg.addColorStop(0, 'rgba(150,120,90,0.35)'); cg.addColorStop(1, 'rgba(150,120,90,0)');
        ctx.fillStyle = cg; Draw.circ(ctx, x, y, s);
      }
      // terminator shadow for a round, 3D moon
      const sh = ctx.createRadialGradient(c + 30, c + 24, 20, c, c, 60);
      sh.addColorStop(0, 'rgba(40,20,40,0.35)'); sh.addColorStop(1, 'rgba(40,20,40,0)');
      ctx.fillStyle = sh; Draw.circ(ctx, c, c, 50);
    });
  },

  makeCloud(seed) {
    return this.sprite(460, 140, (ctx) => {
      const r = mulberry32(100 + seed);
      for (let i = 0; i < 46; i++) {
        const x = 40 + r() * 380, y = 50 + r() * 50 - Math.abs(x - 230) * 0.08, s = 20 + r() * 40;
        const g = ctx.createRadialGradient(x, y - s * 0.3, 0, x, y, s);
        g.addColorStop(0, 'rgba(190,170,230,0.10)'); g.addColorStop(1, 'rgba(120,100,170,0)');
        ctx.fillStyle = g; Draw.circ(ctx, x, y, s);
      }
    });
  },

  makeCastle(col, windows) {
    return this.sprite(420, 260, (ctx) => {
      ctx.fillStyle = col;
      const tower = (x, w, h, roof) => {
        ctx.fillRect(x, 260 - h, w, h);
        if (roof) { Draw.poly(ctx, [x - 4, 260 - h, x + w / 2, 260 - h - roof, x + w + 4, 260 - h]); }
        else for (let i = 0; i < w; i += 8) ctx.fillRect(x + i, 260 - h - 6, 5, 6);
      };
      ctx.fillRect(60, 150, 300, 110);
      for (let i = 60; i < 360; i += 12) ctx.fillRect(i, 142, 7, 8);
      tower(40, 34, 170, 50); tower(130, 26, 200, 60); tower(190, 46, 230, 80); tower(260, 28, 180, 0); tower(340, 36, 150, 46);
      // broken section
      ctx.clearRect(300, 120, 30, 40);
      // warm windows
      ctx.fillStyle = windows;
      ctx.shadowColor = windows; ctx.shadowBlur = 8;
      for (const [x, y] of [[50, 120], [140, 100], [140, 140], [205, 70], [222, 110], [205, 150], [350, 150], [90, 190], [250, 200], [300, 190]]) {
        ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.lineTo(x, y + 3); ctx.arc(x + 3, y + 3, 3, Math.PI, 0); ctx.lineTo(x + 6, y + 10); ctx.fill();
      }
      ctx.shadowBlur = 0;
    });
  },

  // Dead trees: smooth tapered branches (no seams), drawn in a big enough box that nothing gets cut off.
  makeTree(seed, color, scale) {
    const w = 380, h = 320;
    return this.sprite(w, h, (ctx) => {
      const r = mulberry32(seed * 31 + 5);
      ctx.fillStyle = color;
      const seg = (x, y, len, ang, wid, depth) => {
        const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len, w2 = wid * 0.66;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        ctx.beginPath();
        ctx.moveTo(x + nx * wid / 2, y + ny * wid / 2);
        ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
        ctx.lineTo(x2 - nx * w2 / 2, y2 - ny * w2 / 2);
        ctx.lineTo(x - nx * wid / 2, y - ny * wid / 2);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y2, w2 / 2, 0, Math.PI * 2); ctx.fill();
        if (depth <= 0 || w2 < 0.6) return;
        const n = 2 + (r() < 0.3 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const spread = 0.3 + r() * 0.55;
          let a = ang + (n === 2 ? (i ? spread : -spread) : (i - 1) * spread) + (r() - 0.5) * 0.2;
          a = a * 0.88 + (-Math.PI / 2) * 0.12 + (r() < 0.2 ? (r() - 0.5) * 0.8 : 0); // upward-ish, with crooked twists // branches reach upward, not sideways forever
          seg(x2, y2, len * (0.7 + r() * 0.1), a, w2, depth - 1);
        }
      };
      const bx = w / 2, by = h, tw = 12 * scale;
      // flared roots that blend into the trunk
      ctx.beginPath();
      ctx.moveTo(bx - tw * 1.8, by);
      ctx.quadraticCurveTo(bx - tw * 0.6, by - 4, bx - tw / 2, by - 22);
      ctx.lineTo(bx + tw / 2, by - 22);
      ctx.quadraticCurveTo(bx + tw * 0.6, by - 4, bx + tw * 1.9, by);
      ctx.closePath(); ctx.fill();
      seg(bx, by - 20, (50 + r() * 14) * scale, -Math.PI / 2 + (r() - 0.5) * 0.15, tw, 6);
    });
  },

  newLeaf(anywhere) {
    const cols = THEME ? THEME.leaves : ['#a0521a'];
    return { x: Math.random() * VIEW_W, y: anywhere ? Math.random() * VIEW_H : -10, vx: rand(-30, -10), vy: rand(20, 45), r: Math.random() * 6, spin: rand(-3, 3), col: cols[Math.floor(Math.random() * cols.length)] };
  },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- background ---------------- */
function drawBackground(ctx, camX, camY, t) {
  const TH = THEME;
  if (TH.under) { drawUnderground(ctx, camX, camY, t, TH); return; }
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, TH.sky[0]); g.addColorStop(0.45, TH.sky[1]); g.addColorStop(0.8, TH.sky[2]); g.addColorStop(1, TH.sky[3]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  for (const s of Art.stars) {
    const x = ((s.x - camX * 0.02) % 2400 + 2400) % 2400;
    if (x > VIEW_W) continue;
    ctx.globalAlpha = 0.35 + Math.sin(t * 2 + s.p) * 0.3;
    ctx.fillStyle = TH.star;
    ctx.fillRect(x, s.y - camY * 0.01, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  const mx = TH.moonX - (camX * 0.02) % 300, my = TH.moonY - camY * 0.02;
  ctx.drawImage(Art.moon.cv, mx - 180, my - 180, 360, 360);

  // clouds drifting across the moon
  for (let i = 0; i < 4; i++) {
    const c = Art.clouds[i % 3];
    const x = ((i * 520 - camX * 0.05 + t * (8 + i * 3)) % 1900 + 1900) % 1900 - 460;
    ctx.drawImage(c.cv, x, 40 + i * 45 - camY * 0.03, c.w, c.h);
  }

  // far ridge with a ruined castle
  ridge(ctx, camX * 0.08, camY * 0.05, 330, 38, 0.003, TH.far, 0.9);
  const cx = ((TH.castleX - camX * 0.08) % 2600 + 2600) % 2600 - 500;
  if (TH.carnival) drawCarnivalBack(ctx, cx, 340 - camY * 0.05, t, TH);
  else if (TH.war) drawWarBack(ctx, camX, 345 - camY * 0.05, t, TH);
  else {
    ctx.globalAlpha = 0.9;
    ctx.drawImage(Art.castle.cv, cx, 320 - camY * 0.05 - 260 + 20, 420, 260);
    ctx.globalAlpha = 1;
  }
  // haze
  fogBand(ctx, 300 - camY * 0.05, 120, hexA(TH.haze, 0.18 * TH.fogMul));

  // mid ridge with a dead forest
  const midY = ridge(ctx, camX * 0.22, camY * 0.12, 395, 30, 0.006, TH.mid, 1);
  const spacing = 200, ox = camX * 0.22;
  const start = Math.floor(ox / spacing) - 1;
  for (let i = start; i < start + VIEW_W / spacing + 3; i++) {
    const r = hash2(i, 77);
    if (r < 0.3) continue;
    const sp = Art.bgTrees[((i % 3) + 3) % 3];
    const wx = i * spacing + r * 80, sx = wx - ox;
    const s = 0.5 + r * 0.4;
    ctx.drawImage(sp.cv, sx - sp.w * s / 2, midY(wx) - sp.h * s + 6, sp.w * s, sp.h * s);
  }
  fogBand(ctx, 400 - camY * 0.12, 100, hexA(TH.haze, 0.16 * TH.fogMul));

  // near ridge
  ridge(ctx, camX * 0.4, camY * 0.2, 450, 22, 0.009, TH.near, 1);
  for (let i = 0; i < 3; i++) {
    const fx = ((i * 520 - camX * 0.45 + t * 10 * (i % 2 ? 1 : -1)) % 1700 + 1700) % 1700 - 400;
    const fg = ctx.createRadialGradient(fx, 470 - camY * 0.2, 10, fx, 470 - camY * 0.2, 300);
    fg.addColorStop(0, hexA(TH.fog, 0.10 * TH.fogMul)); fg.addColorStop(1, hexA(TH.fog, 0));
    ctx.fillStyle = fg; ctx.fillRect(fx - 300, 170 - camY * 0.2, 600, 600);
  }
  ctx.fillStyle = TH.tint; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function ridge(ctx, ox, oy, base, amp, freq, cols, alpha) {
  const yAt = (wx) => base - oy * 0.5 + Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.3 + 1) * amp * 0.5 + Math.sin(wx * freq * 7.1) * amp * 0.12;
  const g = ctx.createLinearGradient(0, base - amp - oy * 0.5, 0, VIEW_H);
  g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W + 12; x += 12) ctx.lineTo(x, yAt(x + ox));
  ctx.lineTo(VIEW_W, VIEW_H); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  return (wx) => yAt(wx);
}

function fogBand(ctx, y, h, col) {
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y - h / 2, VIEW_W, h);
}

/* ---------------- foreground FX ---------------- */
function drawLeaves(ctx, dt, t) {
  for (const l of Art.leaves) {
    l.x += (l.vx + Math.sin(t * 1.3 + l.r) * 20) * dt; l.y += l.vy * dt; l.r += l.spin * dt;
    if (l.y > VIEW_H + 10 || l.x < -20) Object.assign(l, Art.newLeaf(false), { x: Math.random() * (VIEW_W + 200) });
    if (THEME.snow) { ctx.globalAlpha = 0.85; ctx.fillStyle = l.col; Draw.circ(ctx, l.x, l.y, 1.2 + Math.abs(l.r % 1.5)); ctx.globalAlpha = 1; continue; }
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.scale(1, Math.sin(t * 3 + l.r));
    ctx.fillStyle = l.col; Draw.ell(ctx, 0, 0, 4, 2);
    ctx.restore();
  }
}

/* ---------------- decorations ---------------- */
function drawDecor(ctx, d, t) {
  const x = d.px !== undefined ? d.px : d.x * TILE + 16;
  const y = d.py !== undefined ? d.py : (d.y + 1) * TILE;
  // a fixed number per decoration, so its look never changes while it moves across the screen
  const seed = d.seed !== undefined ? d.seed : (d.x || 0) * 7 + (d.y || 0);
  if (THEME && THEME.war && (d.type === 'grave' || d.type === 'skulls' || d.type === 'shroom')) {
    if (d.type === 'grave') { // barbed wire on wooden posts
      ctx.fillStyle = '#3a2e1e'; ctx.fillRect(x - 22, y - 26, 4, 26); ctx.fillRect(x + 18, y - 24, 4, 24);
      ctx.strokeStyle = '#7a7a72'; ctx.lineWidth = 1;
      for (const yy of [-20, -11]) { ctx.beginPath(); for (let k = 0; k <= 10; k++) ctx.lineTo(x - 20 + k * 4, y + yy + Math.sin(k * 2 + seed) * 2); ctx.stroke(); }
      ctx.strokeStyle = '#9a9a90'; for (let k = 0; k < 9; k++) { const bx = x - 18 + k * 4.5; Draw.line(ctx, bx - 1.5, y - 22, bx + 1.5, y - 18); Draw.line(ctx, bx - 1.5, y - 13, bx + 1.5, y - 9); }
    } else if (d.type === 'skulls') { // sandbags
      for (const [ox, oy] of [[-14, 0], [0, 0], [14, 0], [-7, -9], [7, -9]]) { ctx.fillStyle = shade(ctx, x + ox - 3, y + oy - 6, 10, '#a8986a', '#6a5a3a', '#2a2014'); Draw.ell(ctx, x + ox, y + oy - 4, 8, 5); }
    } else { // an old helmet on the ground
      ctx.fillStyle = shade(ctx, x - 2, y - 8, 9, '#6a6a4a', '#3a3a26', '#121208'); ctx.beginPath(); ctx.arc(x, y - 1, 8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillRect(x - 10, y - 2, 20, 2);
    }
    return;
  }
  if (THEME && THEME.under && (d.type === 'grave' || d.type === 'tree')) {
    if (d.type === 'grave') { // glowing crystal cluster
      setGlow(ctx, THEME.crystal, 14);
      for (const [ox, h, w] of [[-7, 16, 5], [0, 24, 6], [7, 14, 5]]) {
        ctx.fillStyle = lin(ctx, x + ox - w, 0, x + ox + w, 0, ['#ffffff', THEME.crystal, 'rgba(0,0,0,0.6)']);
        Draw.poly(ctx, [x + ox - w, y, x + ox + w, y, x + ox + w * 0.6, y - h * 0.7, x + ox, y - h, x + ox - w * 0.6, y - h * 0.7]);
      }
      clearGlow(ctx);
    } else if (THEME.chess) { // a small marble pawn statue
      ctx.fillStyle = lin(ctx, x - 12, 0, x + 12, 0, ['#ffffff', '#bdb8b0', '#5a564e']);
      Draw.rr(ctx, x - 13, y - 8, 26, 8, 2); ctx.fill(); Draw.poly(ctx, [x - 9, y - 8, x + 9, y - 8, x + 5, y - 30, x - 5, y - 30]); Draw.circ(ctx, x, y - 36, 9);
    } else { // rock stalagmite
      const h = 50 + hash2(seed, 3) * 50;
      ctx.fillStyle = lin(ctx, x - 14, 0, x + 14, 0, [`rgb(${THEME.stone[0] + 40},${THEME.stone[1] + 36},${THEME.stone[2] + 30})`, `rgb(${THEME.stone[0]},${THEME.stone[1]},${THEME.stone[2]})`, '#0a0806']);
      Draw.poly(ctx, [x - 16, y, x + 16, y, x + 4, y - h * 0.6, x + 1, y - h, x - 4, y - h * 0.55]);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; Draw.line(ctx, x - 6, y - 4, x - 1, y - h * 0.7);
    }
    return;
  }
  if (d.type === 'grave') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; Draw.ell(ctx, x + 2, y, 16, 3);
    ctx.save(); ctx.translate(x, y); ctx.rotate((hash2(seed, 1) - 0.5) * 0.12);
    ctx.fillStyle = lin(ctx, -12, 0, 12, 0, ['#6a6478', '#45405a', '#24202f']);
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-12, -24); ctx.arc(0, -24, 12, Math.PI, 0); ctx.lineTo(12, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-11, -24, 2, 24);
    ctx.fillStyle = 'rgba(70,110,80,0.6)'; Draw.ell(ctx, -6, -2, 6, 2.5); Draw.ell(ctx, 8, -30, 3, 1.5);
    ctx.fillStyle = '#1e1a28'; ctx.fillRect(-1.5, -30, 3, 15); ctx.fillRect(-6, -26, 12, 3);
    ctx.strokeStyle = 'rgba(10,6,16,0.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(6, -34); ctx.lineTo(4, -26); ctx.lineTo(7, -20); ctx.stroke();
    ctx.restore();
  } else if (d.type === 'tree') {
    const sp = Art.trees[Math.min(3, Math.floor(hash2(seed, 5) * 4))];
    const k = 0.8;
    ctx.drawImage(sp.cv, x - sp.w * k / 2, y - sp.h * k + 2, sp.w * k, sp.h * k);
  } else if (d.type === 'shroom') {
    const gl = 0.65 + Math.sin(t * 2 + seed) * 0.2;
    ctx.fillStyle = lin(ctx, x - 2, 0, x + 2, 0, ['#e8f4f0', '#9ab8b0']); ctx.fillRect(x - 2, y - 10, 4, 10); ctx.fillRect(x + 8, y - 6, 3, 6); ctx.fillRect(x - 9, y - 5, 2.5, 5);
    setGlow(ctx, '#5cffd0', 14);
    ctx.fillStyle = `rgba(92,255,208,${gl})`;
    ctx.beginPath(); ctx.arc(x, y - 10, 7, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 9.5, y - 6, 4.5, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 7.8, y - 5, 3.5, Math.PI, 0); ctx.fill();
    clearGlow(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; Draw.circ(ctx, x - 2, y - 13, 1.2); Draw.circ(ctx, x + 9, y - 8, 0.8);
  } else if (d.type === 'skulls') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; Draw.ell(ctx, x - 3, y, 18, 3);
    for (const [ox, oy, r] of [[-10, -6, 6], [3, -6, 6.5], [-4, -15, 6]]) {
      ctx.fillStyle = shade(ctx, x + ox, y + oy, r, '#fffaf0', '#cfc6ae', '#5a5240'); Draw.circ(ctx, x + ox, y + oy, r);
      ctx.fillStyle = '#120a14'; Draw.circ(ctx, x + ox - 2, y + oy - 1, 1.6); Draw.circ(ctx, x + ox + 2, y + oy - 1, 1.6);
    }
  }
}

/* ---------------- checkpoints (obby style) ---------------- */
// A numbered stone pad with a tattered flag. Grey when untouched, glowing green once reached.
function drawCheckpoint(ctx, c, t) {
  const x = c.x, y = c.y;
  const on = c.lit;
  // pad
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; Draw.ell(ctx, x, y, 26, 4);
  ctx.fillStyle = lin(ctx, 0, y - 8, 0, y, on ? ['#6a8f72', '#2c4434'] : ['#6a6478', '#2a2636']);
  Draw.rr(ctx, x - 24, y - 7, 48, 7, 2); ctx.fill();
  ctx.fillStyle = on ? 'rgba(120,255,170,0.9)' : 'rgba(160,150,190,0.5)';
  if (on) setGlow(ctx, '#3dff7a', 12);
  ctx.fillRect(x - 20, y - 8, 40, 2);
  clearGlow(ctx);
  // pole
  ctx.fillStyle = lin(ctx, x - 2, 0, x + 2, 0, ['#9a96a8', '#3a3644']); ctx.fillRect(x - 15, y - 62, 3, 55);
  ctx.fillStyle = on ? '#9dffc0' : '#8a8498'; Draw.circ(ctx, x - 13.5, y - 63, 3);
  // flag
  const wave = (i) => Math.sin(t * 6 - i * 0.6) * (on ? 2.5 : 1);
  ctx.fillStyle = on ? lin(ctx, x - 12, 0, x + 20, 0, ['#2fd06a', '#1a8a46']) : lin(ctx, x - 12, 0, x + 20, 0, ['#5a5468', '#3a3646']);
  ctx.beginPath(); ctx.moveTo(x - 12, y - 60);
  for (let i = 0; i <= 5; i++) ctx.lineTo(x - 12 + i * 6, y - 60 + wave(i));
  ctx.lineTo(x + 20, y - 52 + wave(5)); ctx.lineTo(x + 16, y - 44 + wave(5));
  for (let i = 5; i >= 0; i--) ctx.lineTo(x - 12 + i * 6, y - 40 + wave(i));
  ctx.closePath(); ctx.fill();
  // number on the flag
  ctx.fillStyle = on ? '#eafff0' : '#c8c0d8';
  ctx.font = '900 13px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(c.n), x + 3, y - 50 + wave(3));
}

/* ---------------- finish portal ---------------- */
function drawPortal(ctx, f, t) {
  const x = f.x, y = f.y;
  // stone arch
  ctx.fillStyle = lin(ctx, x - 40, 0, x + 40, 0, ['#5a5468', '#2a2636', '#141019']);
  ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x - 40, y - 70); ctx.arc(x, y - 70, 40, Math.PI, 0); ctx.lineTo(x + 40, y); ctx.lineTo(x + 28, y); ctx.lineTo(x + 28, y - 70); ctx.arc(x, y - 70, 28, 0, Math.PI, true); ctx.lineTo(x - 28, y); ctx.closePath(); ctx.fill();
  // swirling vortex
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x - 28, y - 70); ctx.arc(x, y - 70, 28, Math.PI, 0); ctx.lineTo(x + 28, y); ctx.closePath(); ctx.clip();
  const g = ctx.createRadialGradient(x, y - 55, 2, x, y - 55, 70);
  g.addColorStop(0, '#fff0ff'); g.addColorStop(0.25, '#c070ff'); g.addColorStop(0.6, '#5a1aa0'); g.addColorStop(1, '#1a0630');
  ctx.fillStyle = g; ctx.fillRect(x - 30, y - 110, 60, 110);
  ctx.strokeStyle = 'rgba(255,190,255,0.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(x, y - 55, 8 + i * 9, t * (2 + i * 0.4) + i, t * (2 + i * 0.4) + i + 2.4);
    ctx.stroke();
  }
  ctx.restore();
  // skull keystone
  ctx.save(); ctx.translate(x, y - 112); ctx.scale(0.8, 0.8); drawHead(ctx, 'bonesy', t); ctx.restore();
  ctx.fillStyle = '#fff2dc'; ctx.font = '900 12px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', x, y - 132);
}

/* ---------------- signs ---------------- */
function drawSignPost(ctx, s) {
  const x = s.x * TILE + 16, y = (s.y + 1) * TILE;
  ctx.fillStyle = lin(ctx, x - 2, 0, x + 2, 0, ['#5a3c26', '#2a1a10']); ctx.fillRect(x - 2, y - 26, 4, 26);
  ctx.fillStyle = lin(ctx, 0, y - 36, 0, y - 18, ['#8a6244', '#4a3020']); Draw.rr(ctx, x - 14, y - 36, 28, 17, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,4,0.5)'; ctx.lineWidth = 0.6; Draw.line(ctx, x - 13, y - 28, x + 13, y - 28);
  ctx.fillStyle = '#ffd08a'; ctx.font = '900 12px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', x, y - 27);
}

function drawBubble(ctx, x, y, text, minX = -1e9, maxX = 1e9) {
  ctx.font = '700 13px Nunito, sans-serif';
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > 250 && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  const h = lines.length * 17 + 14;
  const bx = clamp(x - w / 2, minX + 8, maxX - w - 8), by = y - h;
  ctx.fillStyle = 'rgba(12,8,24,0.92)'; Draw.rr(ctx, bx, by, w, h, 8); ctx.fill();
  ctx.strokeStyle = '#7a52b8'; ctx.lineWidth = 1.5; Draw.rr(ctx, bx, by, w, h, 8); ctx.stroke();
  ctx.fillStyle = 'rgba(12,8,24,0.92)'; Draw.poly(ctx, [x - 7, by + h, x + 7, by + h, x, by + h + 8]);
  ctx.fillStyle = '#f3ecff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 8 + i * 17));
}

/* ---------------- lighting ---------------- */
// Darkens the scene, then cuts soft holes where lights are, then adds coloured glow.
function drawLighting(ctx, lights, cam, ambient) {
  const L = Art.lctx, W = Art.light.width, H = Art.light.height, s = W / VIEW_W;
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, W, H);
  L.fillStyle = hexA(THEME.dark, ambient);
  L.fillRect(0, 0, W, H);
  L.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const x = (l.x - cam.x) * s, y = (l.y - cam.y) * s, r = l.r * s;
    if (x < -r || y < -r || x > W + r || y > H + r) continue;
    const g = L.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${l.i})`); g.addColorStop(0.5, `rgba(0,0,0,${l.i * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    L.fillStyle = g; L.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.drawImage(Art.light, 0, 0, VIEW_W, VIEW_H);
  // coloured bloom
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.c) continue;
    const x = l.x - cam.x, y = l.y - cam.y, r = l.r * 0.7;
    if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, l.c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 220, VIEW_W / 2, VIEW_H / 2, 640);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,1,6,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// Shard icon for the HUD.
function drawShardIcon(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1.2, 1.2);
  setGlow(ctx, '#5ae0ff', 10);
  ctx.fillStyle = lin(ctx, -5, -8, 5, 8, ['#effdff', '#5ad8f0', '#0e4a6a']);
  Draw.poly(ctx, [0, -8, 5, -2, 3, 7, -3, 7, -5, -2]);
  clearGlow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; Draw.poly(ctx, [0, -8, 1.5, -2, -2, 5, -3.5, -2]);
  ctx.restore();
}

// Boss arena: a dark crypt hall with arches, chains and torches (colours follow the level's theme).
function drawArenaBackdrop(ctx, A, t) {
  const x = (A.gateX + 1) * TILE, y = A.ceilY, w = A.x2 - x, h = A.floorY - y;
  if (A.chess) {
    // a huge chessboard wall, standing up behind the King
    const sz = 60, n = Math.ceil(w / sz), m = Math.ceil(h / sz);
    for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#3e5a2c' : '#8a8c74';
      ctx.fillRect(x + c * sz, y + r * sz, Math.min(sz, x + w - (x + c * sz)), Math.min(sz, y + h - (y + r * sz)));
    }
    const sh = ctx.createLinearGradient(0, y, 0, y + h); sh.addColorStop(0, 'rgba(0,0,0,0.65)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = sh; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(212,175,55,0.6)'; ctx.fillRect(x, y, w, 4); ctx.fillRect(x, A.floorY - 4, w, 4);
    return;
  }
  const S = THEME.stone;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgb(${S[0] - 30},${S[1] - 30},${S[2] - 30})`); g.addColorStop(1, `rgb(${S[0] - 20},${S[1] - 20},${S[2] - 18})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `rgba(${S[0]},${S[1]},${S[2]},0.35)`;
  for (let row = 0; row < h / 24; row++) for (let col = 0; col < w / 48 + 1; col++) {
    const bx = x + col * 48 + (row % 2 ? 24 : 0), by = y + row * 24;
    if (bx + 44 > x + w) continue;
    ctx.fillRect(bx + 2, by + 2, 44, 20);
  }
  for (let i = 0; i < 4; i++) {
    const ax = x + 110 + i * 225;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.moveTo(ax - 48, A.floorY); ctx.lineTo(ax - 48, y + 170); ctx.arc(ax, y + 170, 48, Math.PI, 0); ctx.lineTo(ax + 48, A.floorY); ctx.fill();
    // hanging chains
    ctx.strokeStyle = 'rgba(120,110,130,0.6)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(ax - 70 + Math.sin(t + i) * 1.5, y + 8 + k * 9, 2.2, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
    // torch
    const tx = ax + 70, ty = y + 110;
    ctx.fillStyle = '#2a2230'; ctx.fillRect(tx - 3, ty, 6, 16);
    setGlow(ctx, THEME.fireGlow, 18);
    ctx.fillStyle = THEME.fire[1];
    ctx.beginPath(); ctx.moveTo(tx - 5, ty); ctx.quadraticCurveTo(tx, ty - 18 - Math.sin(t * 12 + i) * 4, tx + 5, ty); ctx.fill();
    clearGlow(ctx);
  }
}

// Colours used when a monster shatters.
const ENEMY_COLORS = { Crawler: '#54437a', Bat: '#45295f', Skitter: '#d8d0b8', FrostMite: '#9fd8f0', IceWisp: '#7ad8ff', SnowSkull: '#e8f6ff' };

// Particles: soft dots, streaking sparks, expanding rings, drifting smoke, and tumbling shards.
function drawParticles(ctx, list) {
  for (const q of list) {
    const k = Math.max(0, q.life / q.max);
    ctx.globalAlpha = k;
    switch (q.type) {
      case 'spark': {
        const l = 0.03;
        ctx.strokeStyle = q.color; ctx.lineWidth = q.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * l, q.y - q.vy * l); ctx.stroke();
        break;
      }
      case 'ring': {
        ctx.strokeStyle = q.color; ctx.lineWidth = 2.5 * k;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.15 - k), 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'smoke': {
        ctx.globalAlpha = k * 0.8;
        ctx.fillStyle = q.color; Draw.circ(ctx, q.x, q.y, q.size * (1.6 - k * 0.6));
        break;
      }
      case 'shard': {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        ctx.fillStyle = q.color; Draw.poly(ctx, [-q.size, -q.size * 0.4, q.size * 0.6, -q.size * 0.7, q.size, q.size * 0.5, -q.size * 0.3, q.size * 0.6]);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; Draw.poly(ctx, [-q.size, -q.size * 0.4, q.size * 0.6, -q.size * 0.7, 0, 0]);
        ctx.restore();
        break;
      }
      default:
        ctx.fillStyle = q.color; Draw.circ(ctx, q.x, q.y, q.size * (0.5 + k * 0.5));
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------- underground backgrounds (Levels 21+) ----------------
function drawUnderground(ctx, camX, camY, t, TH) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, TH.sky[0]); g.addColorStop(0.5, TH.sky[2]); g.addColorStop(1, TH.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const style = TH.under;

  if (style === 'void') {
    // a giant swirling eye of nothingness
    const ex = 620 - (camX * 0.02) % 200, ey = 170 - camY * 0.02;
    for (let i = 6; i > 0; i--) {
      ctx.strokeStyle = `rgba(190,110,255,${0.05 + i * 0.02})`; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(ex, ey, 40 + i * 26, t * 0.2 * (i % 2 ? 1 : -1), t * 0.2 * (i % 2 ? 1 : -1) + 4.6); ctx.stroke();
    }
    const eg = ctx.createRadialGradient(ex, ey, 2, ex, ey, 44);
    eg.addColorStop(0, '#000'); eg.addColorStop(0.45, '#1a0430'); eg.addColorStop(0.7, '#a050ff'); eg.addColorStop(1, 'rgba(160,80,255,0)');
    ctx.fillStyle = eg; Draw.circ(ctx, ex, ey, 44);
    // floating rocks
    for (let i = 0; i < 7; i++) {
      const rx = ((i * 310 - camX * (0.1 + i * 0.03)) % 1500 + 1500) % 1500 - 200, ry = 90 + (i * 97) % 300 + Math.sin(t * 0.6 + i) * 8 - camY * 0.05;
      const sz = 18 + (i * 13) % 30;
      ctx.fillStyle = TH.far[i % 2];
      Draw.poly(ctx, [rx - sz, ry, rx + sz, ry - sz * 0.2, rx + sz * 0.5, ry + sz * 0.8, rx - sz * 0.3, ry + sz]);
      ctx.fillStyle = 'rgba(200,140,255,0.25)'; ctx.fillRect(rx - sz, ry - 2, sz * 2, 2);
    }
  } else {
    // far rock wall with parallax pillars / arches
    const layer = (par, col, step, hmin, hvar, seed) => {
      const ox = camX * par;
      const start = Math.floor(ox / step) - 1;
      ctx.fillStyle = col;
      for (let i = start; i < start + VIEW_W / step + 3; i++) {
        const r = hash2(i, seed), sx = i * step - ox;
        const hh = hmin + r * hvar;
        if (style === 'cave') {
          // stalactites from the top, stalagmites from the bottom
          Draw.poly(ctx, [sx - step * 0.35, -camY * par * 0.3, sx + step * 0.35, -camY * par * 0.3, sx + (r - 0.5) * 10, hh - camY * par * 0.3]);
          Draw.poly(ctx, [sx - step * 0.3, VIEW_H, sx + step * 0.3, VIEW_H, sx + (r - 0.5) * 14, VIEW_H - hh * 0.8]);
        } else {
          // pillars and arches for crypt / cathedral
          const pw = step * 0.22;
          ctx.fillRect(sx - pw / 2, 0, pw, VIEW_H);
          ctx.beginPath(); ctx.moveTo(sx + pw / 2, VIEW_H); ctx.lineTo(sx + pw / 2, hh + 60); ctx.arc(sx + step / 2, hh + 60, step / 2 - pw / 2, Math.PI, 0); ctx.lineTo(sx + step - pw / 2, VIEW_H); ctx.lineTo(sx + step - pw / 2, 0); ctx.lineTo(sx + pw / 2, 0); ctx.fill();
        }
      }
    };
    layer(0.1, TH.far[0], 140, 90, 120, 3);
    // style details between layers
    if (style === 'cave') {
      for (let i = 0; i < 14; i++) { // glowing crystals in the rock
        const cx = ((i * 211 - camX * 0.2) % 1600 + 1600) % 1600 - 200, cy = 120 + (i * 53) % 320 - camY * 0.15;
        setGlow(ctx, TH.crystal, 14); ctx.fillStyle = TH.crystal; ctx.globalAlpha = 0.5 + Math.sin(t * 1.5 + i) * 0.2;
        Draw.poly(ctx, [cx, cy - 10, cx + 4, cy, cx, cy + 6, cx - 4, cy]); Draw.poly(ctx, [cx + 6, cy - 4, cx + 9, cy + 2, cx + 6, cy + 6, cx + 3, cy + 2]);
        ctx.globalAlpha = 1; clearGlow(ctx);
      }
    } else if (style === 'crypt') {
      for (let i = 0; i < 5; i++) { // giant slow gears
        const gx = ((i * 380 - camX * 0.15) % 1900 + 1900) % 1900 - 200, gy = 140 + (i * 131) % 240 - camY * 0.1, R = 40 + (i * 17) % 40;
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * (i % 2 ? 0.3 : -0.3)); ctx.fillStyle = 'rgba(120,110,60,0.25)';
        for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.fillRect(R - 4, -6, 14, 12); }
        Draw.circ(ctx, 0, 0, R); ctx.fillStyle = TH.sky[1]; Draw.circ(ctx, 0, 0, R * 0.45);
        ctx.restore();
      }
    } else if (style === 'chess') {
      // giant chess pieces standing in the dark hall, lit from above
      const shapes = ['king', 'rook', 'knight', 'bishop', 'queen', 'pawn'];
      for (let i = 0; i < 6; i++) {
        const px = ((i * 330 - camX * 0.18) % 1980 + 1980) % 1980 - 200, base = VIEW_H + 20 - camY * 0.08, s = 1.3 + (i % 3) * 0.35;
        ctx.save(); ctx.translate(px, base); ctx.scale(s, s);
        ctx.fillStyle = i % 2 ? 'rgba(200,196,210,0.16)' : 'rgba(10,10,16,0.55)';
        Draw.rr(ctx, -50, -24, 100, 24, 6); ctx.fill(); Draw.poly(ctx, [-36, -24, 36, -24, 22, -150, -22, -150]);
        const k = shapes[i];
        if (k === 'rook') { ctx.fillRect(-32, -190, 64, 42); for (let j = 0; j < 3; j++) ctx.fillRect(-32 + j * 24, -206, 16, 18); }
        else if (k === 'knight') { ctx.beginPath(); ctx.moveTo(-26, -150); ctx.lineTo(-30, -200); ctx.quadraticCurveTo(-14, -240, 20, -226); ctx.lineTo(44, -196); ctx.lineTo(20, -186); ctx.lineTo(26, -150); ctx.fill(); }
        else if (k === 'bishop') { Draw.ell(ctx, 0, -180, 26, 38); Draw.circ(ctx, 0, -224, 8); }
        else if (k === 'pawn') { Draw.circ(ctx, 0, -172, 28); }
        else { Draw.ell(ctx, 0, -172, 32, 26); ctx.fillRect(-34, -204, 68, 12); if (k === 'king') { ctx.fillRect(-6, -250, 12, 48); ctx.fillRect(-18, -238, 36, 10); } else for (let j = -2; j <= 2; j++) Draw.circ(ctx, j * 14, -212, 6); }
        ctx.restore();
      }
      // shafts of light
      for (let i = 0; i < 4; i++) {
        const lx = ((i * 460 - camX * 0.12) % 1840 + 1840) % 1840 - 200;
        const lg = ctx.createLinearGradient(lx, 0, lx + 60, VIEW_H); lg.addColorStop(0, 'rgba(255,240,200,0.12)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = lg; Draw.poly(ctx, [lx - 20, 0, lx + 40, 0, lx + 140, VIEW_H, lx + 40, VIEW_H]);
      }
    } else if (style === 'cathedral') {
      for (let i = 0; i < 4; i++) { // glowing stained-glass windows
        const wx = ((i * 420 - camX * 0.12) % 1700 + 1700) % 1700 - 200, wy = 90 - camY * 0.08;
        const wg = ctx.createLinearGradient(wx, wy, wx, wy + 180);
        wg.addColorStop(0, 'rgba(255,190,80,0.55)'); wg.addColorStop(0.5, 'rgba(220,60,40,0.45)'); wg.addColorStop(1, 'rgba(120,40,160,0.35)');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.moveTo(wx - 34, wy + 180); ctx.lineTo(wx - 34, wy + 40); ctx.arc(wx, wy + 40, 34, Math.PI, 0); ctx.lineTo(wx + 34, wy + 180); ctx.fill();
        ctx.strokeStyle = 'rgba(20,8,4,0.8)'; ctx.lineWidth = 3;
        Draw.line(ctx, wx, wy + 6, wx, wy + 180); Draw.line(ctx, wx - 34, wy + 90, wx + 34, wy + 90);
      }
    }
    layer(0.3, TH.mid[0], 220, 60, 160, 9);
    fogBand(ctx, 420 - camY * 0.1, 160, hexA(TH.haze, 0.18));
    layer(0.5, TH.near[0], 300, 40, 120, 17);
  }
  // drifting motes / embers
  ctx.fillStyle = hexA(TH.fog, 0.35);
  for (let i = 0; i < 30; i++) {
    const mx = ((i * 97 + t * (6 + i % 5) - camX * 0.3) % VIEW_W + VIEW_W) % VIEW_W, my = ((i * 61 - t * (4 + i % 3) * (style === 'cathedral' ? 4 : 1)) % VIEW_H + VIEW_H) % VIEW_H;
    ctx.fillRect(mx, my, 2, 2);
  }
}

// Battlefield skyline (Levels 91–100): a bombed-out town, sweeping searchlights and distant flashes.
function drawWarBack(ctx, camX, base, t, TH) {
  // searchlights sweeping the clouds
  for (let i = 0; i < 3; i++) {
    const sx = ((i * 520 + 200 - camX * 0.06) % 1560 + 1560) % 1560 - 200, a = -Math.PI / 2 + Math.sin(t * (0.35 + i * 0.12) + i * 2) * 0.6;
    const L = 700, w = 0.06;
    const gr = ctx.createLinearGradient(sx, base, sx + Math.cos(a) * L, base + Math.sin(a) * L); gr.addColorStop(0, 'rgba(255,240,200,0.22)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gr; Draw.poly(ctx, [sx, base, sx + Math.cos(a - w) * L, base + Math.sin(a - w) * L, sx + Math.cos(a + w) * L, base + Math.sin(a + w) * L]);
  }
  // far-off explosions on the horizon: a flash, a fireball, then a rising smoke puff
  for (let k = 0; k < 3; k++) {
    const per = 3.1 + k * 1.3, cyc = Math.floor((t + k * 1.7) / per), ph = ((t + k * 1.7) % per) / per;
    if (ph > 0.35) continue;
    const ex = ((hash2(cyc, k * 7) * 1400 - camX * 0.08) % 1400 + 1400) % 1400 - 200, ey = base - 10 - hash2(cyc, k) * 30, q = ph / 0.35;
    if (q < 0.15) { ctx.fillStyle = `rgba(255,200,120,${0.25 * (1 - q / 0.15)})`; ctx.fillRect(0, 0, VIEW_W, base); }
    const fg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 10 + q * 40);
    fg.addColorStop(0, `rgba(255,240,180,${1 - q})`); fg.addColorStop(0.5, `rgba(255,120,30,${0.8 * (1 - q)})`); fg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = fg; Draw.circ(ctx, ex, ey, 10 + q * 40);
    ctx.fillStyle = `rgba(50,45,40,${0.5 * (1 - q)})`; Draw.circ(ctx, ex, ey - 20 - q * 50, 12 + q * 26);
  }
  // tracer bullets streaking across the sky (just background, they can't hurt you)
  for (let k = 0; k < 7; k++) {
    const per = 1.6 + (k % 3) * 0.5, ph = ((t + k * 0.37) % per) / per, cyc = Math.floor((t + k * 0.37) / per);
    if (ph > 0.45) continue;
    const dir = hash2(cyc, k + 50) > 0.5 ? 1 : -1, y0 = 60 + hash2(cyc, k + 9) * (base - 120), q = ph / 0.45;
    const x = dir > 0 ? -40 + q * (VIEW_W + 80) : VIEW_W + 40 - q * (VIEW_W + 80), y = y0 - q * 40 * hash2(k, cyc);
    ctx.strokeStyle = k % 2 ? 'rgba(255,220,120,0.85)' : 'rgba(255,140,60,0.8)'; ctx.lineWidth = 1.6;
    Draw.line(ctx, x, y, x - dir * 26, y + 1.5);
  }
  // ruined buildings with broken walls and empty windows
  const step = 170, ox = camX * 0.1, start = Math.floor(ox / step) - 1;
  for (let i = start; i < start + VIEW_W / step + 3; i++) {
    const r = hash2(i, 41), sx = i * step - ox, bw = 90 + r * 60, bh = 70 + hash2(i, 9) * 120;
    ctx.fillStyle = TH.castle;
    ctx.beginPath(); ctx.moveTo(sx, base); ctx.lineTo(sx, base - bh);
    for (let k = 1; k <= 5; k++) ctx.lineTo(sx + bw * k / 5, base - bh + (hash2(i, k) - 0.3) * 50); // jagged broken top
    ctx.lineTo(sx + bw, base); ctx.fill();
    // windows: a few stay steadily lit (fixed per building, so they never flicker as you move)
    let wi = 0;
    for (let wy = base - bh + 40; wy < base - 20; wy += 30) for (let wx = sx + 12; wx < sx + bw - 16; wx += 26) {
      const lit = hash2(i * 31 + wi, 77) > 0.9; wi++;
      ctx.fillStyle = lit ? 'rgba(255,176,64,0.6)' : 'rgba(0,0,0,0.6)'; ctx.fillRect(wx, wy, 9, 13);
    }
  }
}

// Carnival skyline (Levels 71–80): a broken ferris wheel that still turns, striped tents and string lights.
function drawCarnivalBack(ctx, x, base, t, TH) {
  const wx = x + 120, wy = base - 150, R = 120;
  ctx.strokeStyle = 'rgba(60,20,50,0.95)'; ctx.lineWidth = 6;
  Draw.line(ctx, wx, wy, wx - 70, base); Draw.line(ctx, wx, wy, wx + 70, base);
  ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(wx, wy, R, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const a = t * 0.12 + i * Math.PI / 5;
    ctx.lineWidth = 2; Draw.line(ctx, wx, wy, wx + Math.cos(a) * R, wy + Math.sin(a) * R);
    ctx.fillStyle = 'rgba(50,16,40,0.95)'; Draw.rr(ctx, wx + Math.cos(a) * R - 9, wy + Math.sin(a) * R, 18, 14, 3); ctx.fill();
    const on = (Math.floor(t * 3) + i) % 3 !== 0;
    ctx.fillStyle = on ? (i % 2 ? '#ffd060' : '#ff5a7a') : '#3a1a2a'; if (on) setGlow(ctx, ctx.fillStyle, 8); Draw.circ(ctx, wx + Math.cos(a) * R, wy + Math.sin(a) * R, 3); clearGlow(ctx);
  }
  // striped tents
  for (const [tx, tw, th] of [[x - 60, 140, 110], [x + 270, 180, 140]]) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(tx, base); ctx.lineTo(tx, base - th * 0.5); ctx.lineTo(tx + tw / 2, base - th); ctx.lineTo(tx + tw, base - th * 0.5); ctx.lineTo(tx + tw, base); ctx.closePath(); ctx.clip();
    for (let i = 0; i < tw; i += 18) { ctx.fillStyle = (i / 18) % 2 ? 'rgba(90,10,30,0.95)' : 'rgba(40,10,30,0.95)'; ctx.fillRect(tx + i, base - th, 18, th); }
    ctx.restore();
    ctx.fillStyle = '#ffd060'; Draw.poly(ctx, [tx + tw / 2 - 2, base - th, tx + tw / 2 + 2, base - th, tx + tw / 2 + 12, base - th - 8, tx + tw / 2 - 2, base - th - 14]);
  }
  // string lights
  ctx.strokeStyle = 'rgba(40,20,30,0.9)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 60, base - 60); ctx.quadraticCurveTo(x + 105, base - 20, x + 270, base - 70); ctx.stroke();
  for (let i = 0; i <= 12; i++) { const k = i / 12, lx = x - 60 + k * 330, ly = base - 60 + Math.sin(k * Math.PI) * 30 - k * 10; const on = (Math.floor(t * 4) + i) % 4 !== 0; ctx.fillStyle = on ? ['#ff5a7a', '#ffd060', '#5ac8ff'][i % 3] : '#2a1a20'; Draw.circ(ctx, lx, ly, 2.4); }
}
