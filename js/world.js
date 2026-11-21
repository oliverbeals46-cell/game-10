// Tile world: collision + rendering.
// Static tiles are painted once into cached "chunks" so we can afford detailed, textured art.
const TILE = 32;
const T = { EMPTY: 0, SOLID: 1, ONEWAY: 2, SPIKE: 3, GATE: 4, LAVA: 5, EXIT: 6 };
const CHUNK = 16; // tiles per chunk side

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

class World {
  constructor(def) {
    this.w = def.w; this.h = def.h;
    this.tiles = Uint8Array.from(def.tiles);
    this.gateClosed = false;
    this.exitOpen = false;
    this.chunks = new Map();
    this.chunkScale = 0;
    this.lavaTiles = [];
    for (let i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i] === T.LAVA) {
        const tx = i % this.w, ty = Math.floor(i / this.w);
        if (this.get(tx, ty - 1) !== T.LAVA) this.lavaTiles.push({ tx, ty });
      }
    }
  }
  get(tx, ty) {
    if (tx < 0 || tx >= this.w) return T.SOLID;
    if (ty < 0) return T.EMPTY;
    if (ty >= this.h) return T.SOLID;
    return this.tiles[ty * this.w + tx];
  }
  solid(tx, ty) { const t = this.get(tx, ty); return t === T.SOLID || (t === T.GATE && this.gateClosed) || (t === T.EXIT && !this.exitOpen); }
  standable(tx, ty) { const t = this.get(tx, ty); return t === T.SOLID || t === T.ONEWAY || (t === T.GATE && this.gateClosed); }
  isSpike(tx, ty) { return this.get(tx, ty) === T.SPIKE; }
  isHazard(tx, ty) { const t = this.get(tx, ty); return t === T.SPIKE || t === T.LAVA; }
  solidAt(px, py) { return this.solid(Math.floor(px / TILE), Math.floor(py / TILE)); }

  hazardBoxes(b) {
    const out = [];
    const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w) / TILE);
    const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = this.get(tx, ty);
      if (t === T.SPIKE) out.push({ x: tx * TILE + 3, y: ty * TILE + 12, w: TILE - 6, h: TILE - 12 });
      else if (t === T.LAVA) out.push({ x: tx * TILE, y: ty * TILE + 8, w: TILE, h: TILE - 8 });
    }
    return out;
  }
  spikeBoxes(b) { return this.hazardBoxes(b); }
  hazardOverlap(b) { return this.hazardBoxes(b).some((s) => rectsOverlap(b, s)); }

  // ---------- rendering ----------
  draw(ctx, cam, t, scale) {
    const s = Math.min(2, scale);
    if (s !== this.chunkScale) { this.chunks.clear(); this.chunkScale = s; }
    const size = CHUNK * TILE;
    const cx0 = Math.floor(cam.x / size), cx1 = Math.floor((cam.x + VIEW_W) / size);
    const cy0 = Math.floor(cam.y / size), cy1 = Math.floor((cam.y + VIEW_H) / size);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const key = cx + ',' + cy;
      let c = this.chunks.get(key);
      if (!c) { c = this.renderChunk(cx, cy, s); this.chunks.set(key, c); }
      c.used = t;
      ctx.drawImage(c.cv, cx * size, cy * size, size, size);
    }
    if (this.chunks.size > 30) {
      const sorted = [...this.chunks.entries()].sort((a, b) => a[1].used - b[1].used);
      for (let i = 0; i < sorted.length - 24; i++) this.chunks.delete(sorted[i][0]);
    }
    this.drawLive(ctx, cam, t);
  }

  renderChunk(cx, cy, s) {
    const size = CHUNK * TILE;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(size * s); cv.height = Math.ceil(size * s);
    const ctx = cv.getContext('2d');
    ctx.scale(s, s);
    ctx.translate(-cx * size, -cy * size);
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    // pass 1: solid stone, planks, spikes
    for (let ty = y0; ty < y0 + CHUNK; ty++) for (let tx = x0; tx < x0 + CHUNK; tx++) {
      if (tx >= this.w || ty >= this.h) continue;
      const tile = this.get(tx, ty);
      if (tile === T.SOLID) this.paintStone(ctx, tx, ty);
      else if (tile === T.ONEWAY) this.paintPlank(ctx, tx, ty);
      else if (tile === T.SPIKE) this.paintSpike(ctx, tx, ty);
    }
    // pass 2: grass and roots that overhang neighbouring tiles
    for (let ty = y0 - 1; ty < y0 + CHUNK + 1; ty++) for (let tx = x0 - 1; tx < x0 + CHUNK + 1; tx++) {
      if (this.get(tx, ty) !== T.SOLID || tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
      if (this.get(tx, ty - 1) !== T.SOLID && this.get(tx, ty - 1) !== T.LAVA) this.paintGrass(ctx, tx, ty);
      if (this.get(tx, ty + 1) === T.EMPTY) this.paintRoots(ctx, tx, ty);
    }
    return { cv, used: 0 };
  }

  depth(tx, ty) {
    let d = 0;
    while (d < 6 && this.get(tx, ty - d - 1) === T.SOLID) d++;
    return d;
  }

  paintStone(ctx, tx, ty) {
    const px = tx * TILE, py = ty * TILE;
    const d = this.depth(tx, ty);
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(px, py, TILE, TILE);
    // two courses of irregular bricks per tile
    for (let row = 0; row < 2; row++) {
      const y = py + row * 16;
      const off = hash2(tx * 3 + row, ty * 7) > 0.5 ? 0 : 16;
      for (let bx = -16 + off; bx < TILE; bx += 32) {
        const r = hash2(tx * 13 + bx, ty * 5 + row);
        const x = px + bx;
        const v = Math.floor(r * 14), S = THEME.stone;
        const g = ctx.createLinearGradient(0, y, 0, y + 16);
        g.addColorStop(0, `rgb(${S[0] + v},${S[1] + v},${S[2] + v})`);
        g.addColorStop(1, `rgb(${S[0] - 24 + v},${S[1] - 24 + v},${S[2] - 28 + v})`);
        ctx.fillStyle = g;
        ctx.save();
        ctx.beginPath(); ctx.rect(px, py, TILE, TILE); ctx.clip();
        Draw.rr(ctx, x + 1, y + 1, 30, 14, 3); ctx.fill();
        // top highlight + chips
        ctx.fillStyle = 'rgba(200,180,255,0.10)'; ctx.fillRect(x + 3, y + 1.5, 26, 1.5);
        if (r > 0.7) { ctx.strokeStyle = 'rgba(5,3,10,0.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 8 + r * 10, y + 2); ctx.lineTo(x + 12 + r * 8, y + 8); ctx.lineTo(x + 9 + r * 10, y + 14); ctx.stroke(); }
        if (r < 0.25 && d < 3) { ctx.fillStyle = hexA(THEME.moss, 0.45); Draw.ell(ctx, x + 6 + r * 40, y + 12, 5, 2.2); }
        ctx.restore();
      }
    }
    // gets darker the deeper underground it is
    ctx.fillStyle = `rgba(4,2,10,${Math.min(0.82, 0.12 + d * 0.16)})`;
    ctx.fillRect(px, py, TILE, TILE);
    // rim light / ambient occlusion on open sides
    if (this.get(tx - 1, ty) !== T.SOLID) { ctx.fillStyle = lin(ctx, px, 0, px + 6, 0, ['rgba(160,140,220,0.22)', 'rgba(160,140,220,0)']); ctx.fillRect(px, py, 6, TILE); }
    if (this.get(tx + 1, ty) !== T.SOLID) { ctx.fillStyle = lin(ctx, px + TILE - 8, 0, px + TILE, 0, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']); ctx.fillRect(px + TILE - 8, py, 8, TILE); }
    if (this.get(tx, ty + 1) !== T.SOLID) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(px, py + TILE - 4, TILE, 4); }
  }

  paintGrass(ctx, tx, ty) {
    const px = tx * TILE, py = ty * TILE;
    // soil band
    ctx.fillStyle = lin(ctx, 0, py, 0, py + 10, ['#3a2c22', '#241a14', 'rgba(20,14,10,0)']);
    ctx.fillRect(px, py, TILE, 10);
    ctx.fillStyle = lin(ctx, 0, py - 1, 0, py + 4, THEME.grassTop);
    ctx.fillRect(px, py - 1, TILE, 4);
    // blades
    const cols = THEME.grass;
    for (let i = 0; i < 16; i++) {
      const r = hash2(tx * 31 + i, ty * 17);
      const gx = px + r * TILE;
      const h = 3 + hash2(tx + i, ty + 3) * 7;
      const lean = (hash2(i, tx) - 0.5) * 4;
      ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(gx, py + 2); ctx.quadraticCurveTo(gx + lean * 0.3, py - h * 0.6, gx + lean, py - h); ctx.stroke();
    }
    // occasional tiny flowers / dead leaves
    const f = hash2(tx, ty * 3);
    if (f > 0.82) { ctx.fillStyle = '#c070ff'; Draw.circ(ctx, px + f * 20 + 4, py - 5, 1.6); ctx.fillStyle = '#ffd84d'; Draw.circ(ctx, px + f * 20 + 4, py - 5, 0.6); }
    else if (f < 0.12) { ctx.fillStyle = '#a0521a'; Draw.ell(ctx, px + 10 + f * 80, py, 3, 1.3, 0.4); }
  }

  paintRoots(ctx, tx, ty) {
    const px = tx * TILE, py = ty * TILE + TILE;
    const n = Math.floor(hash2(tx, ty + 11) * 3);
    ctx.strokeStyle = 'rgba(60,44,40,0.9)'; ctx.lineWidth = 1.3;
    for (let i = 0; i < n; i++) {
      const x = px + 4 + hash2(tx + i, ty) * 24, l = 6 + hash2(i, ty + tx) * 14;
      ctx.beginPath(); ctx.moveTo(x, py - 1); ctx.quadraticCurveTo(x + 3, py + l * 0.5, x - 1, py + l); ctx.stroke();
    }
    if (hash2(tx * 7, ty) > 0.6) { ctx.strokeStyle = hexA(THEME.moss, 0.7); ctx.lineWidth = 2; const x = px + 16; ctx.beginPath(); ctx.moveTo(x, py - 1); ctx.lineTo(x + 1, py + 8); ctx.stroke(); }
  }

  paintPlank(ctx, tx, ty) {
    const px = tx * TILE, py = ty * TILE;
    const left = this.get(tx - 1, ty) !== T.ONEWAY, right = this.get(tx + 1, ty) !== T.ONEWAY;
    if (left) { ctx.fillStyle = lin(ctx, px + 3, 0, px + 8, 0, ['#3a281a', '#1e140c']); ctx.fillRect(px + 3, py + 8, 5, 18); }
    if (right) { ctx.fillStyle = lin(ctx, px + TILE - 8, 0, px + TILE - 3, 0, ['#3a281a', '#1e140c']); ctx.fillRect(px + TILE - 8, py + 8, 5, 18); }
    ctx.fillStyle = lin(ctx, 0, py, 0, py + 10, ['#9a6e48', '#6a4a30', '#3a2616']);
    ctx.fillRect(px, py, TILE, 10);
    ctx.strokeStyle = 'rgba(40,24,12,0.6)'; ctx.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) { const y = py + 2.5 + i * 2.5; ctx.beginPath(); ctx.moveTo(px, y); ctx.bezierCurveTo(px + 10, y + hash2(tx, i) * 2, px + 20, y - 1, px + TILE, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(20,10,4,0.8)'; ctx.fillRect(px + TILE - 1, py, 1, 10);
    ctx.fillStyle = '#8a8a98'; Draw.circ(ctx, px + 5, py + 5, 1.1); Draw.circ(ctx, px + TILE - 5, py + 5, 1.1);
    ctx.fillStyle = 'rgba(255,230,190,0.25)'; ctx.fillRect(px, py, TILE, 1.5);
  }

  paintSpike(ctx, tx, ty) {
    const px = tx * TILE, py = ty * TILE;
    ctx.fillStyle = lin(ctx, 0, py + TILE - 7, 0, py + TILE, ['#4a4452', '#1c1822']);
    ctx.fillRect(px, py + TILE - 7, TILE, 7);
    for (let i = 0; i < 4; i++) {
      const bx = px + 1 + i * 7.75, h = 17 + hash2(tx, i) * 6, top = py + TILE - 6 - h;
      const g = ctx.createLinearGradient(bx, 0, bx + 7.5, 0);
      const SP = THEME.spike;
      g.addColorStop(0, SP[0]); g.addColorStop(0.45, SP[1]); g.addColorStop(1, SP[2]);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(bx, py + TILE - 6); ctx.lineTo(bx + 3.75, top); ctx.lineTo(bx + 7.5, py + TILE - 6); ctx.fill();
      ctx.fillStyle = SP[3]; // rust or frost
      ctx.beginPath(); ctx.moveTo(bx + 1, py + TILE - 6); ctx.lineTo(bx + 3.75, py + TILE - 12); ctx.lineTo(bx + 6.5, py + TILE - 6); ctx.fill();
    }
  }

  // Animated tiles: lava and the gate.
  drawLive(ctx, cam, t) {
    for (const { tx, ty } of this.lavaTiles) {
      const px = tx * TILE, py = ty * TILE;
      if (px + TILE < cam.x || px > cam.x + VIEW_W || py > cam.y + VIEW_H || py + TILE * 3 < cam.y) continue;
      let depth = 0; while (depth < 4 && this.get(tx, ty + depth) === T.LAVA) depth++;
      const g = ctx.createLinearGradient(0, py, 0, py + depth * TILE);
      const LQ = THEME.liquid;
      g.addColorStop(0, LQ[0]); g.addColorStop(0.15, LQ[1]); g.addColorStop(0.6, LQ[2]); g.addColorStop(1, LQ[3]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(px, py + depth * TILE);
      for (let i = 0; i <= 4; i++) ctx.lineTo(px + i * 8, py + 6 + Math.sin(t * 3 + (tx * 4 + i) * 0.9) * 2.5);
      ctx.lineTo(px + TILE, py + depth * TILE); ctx.closePath(); ctx.fill();
      // bubbles
      const b = (t * 0.7 + hash2(tx, 3)) % 1;
      if (hash2(tx, 9) > 0.5) { ctx.fillStyle = hexA(THEME.bubble, 1 - b); Draw.circ(ctx, px + 8 + hash2(tx, 1) * 16, py + 8 - b * 8, 2 + b * 2); }
    }
    // gate
    const x0 = Math.max(0, Math.floor(cam.x / TILE)), x1 = Math.min(this.w - 1, Math.ceil((cam.x + VIEW_W) / TILE));
    const y0 = Math.max(0, Math.floor(cam.y / TILE)), y1 = Math.min(this.h - 1, Math.ceil((cam.y + VIEW_H) / TILE));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const tt = this.get(tx, ty);
      if (!((tt === T.GATE && this.gateClosed) || (tt === T.EXIT && !this.exitOpen))) continue;
      const px = tx * TILE, py = ty * TILE;
      for (let i = 0; i < 3; i++) { ctx.fillStyle = lin(ctx, px + 4 + i * 10, 0, px + 9 + i * 10, 0, ['#6a6a7e', '#2b2b38']); ctx.fillRect(px + 4 + i * 10, py, 5, TILE); }
    }
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Move an entity {x,y,w,h,vx,vy} through the world, resolving tile collisions per-axis.
function moveEntity(world, e, dt) {
  e.hitWallL = e.hitWallR = e.hitCeil = false;
  e.x += e.vx * dt;
  {
    const top = Math.floor(e.y / TILE), bot = Math.floor((e.y + e.h - 0.01) / TILE);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w - 0.01) / TILE);
      for (let ty = top; ty <= bot; ty++) if (world.solid(tx, ty)) { e.x = tx * TILE - e.w; e.vx = 0; e.hitWallR = true; break; }
    } else if (e.vx < 0) {
      const tx = Math.floor(e.x / TILE);
      for (let ty = top; ty <= bot; ty++) if (world.solid(tx, ty)) { e.x = (tx + 1) * TILE; e.vx = 0; e.hitWallL = true; break; }
    }
  }
  const prevBottom = e.y + e.h;
  e.y += e.vy * dt;
  e.onGround = false;
  {
    const left = Math.floor(e.x / TILE), right = Math.floor((e.x + e.w - 0.01) / TILE);
    if (e.vy > 0) {
      const ty = Math.floor((e.y + e.h - 0.01) / TILE);
      for (let tx = left; tx <= right; tx++) {
        const t = world.get(tx, ty);
        const oneway = t === T.ONEWAY && !e.ignoreOneway && !(e.dropT > 0) && prevBottom <= ty * TILE + 0.5;
        if (world.solid(tx, ty) || oneway) { e.y = ty * TILE - e.h; e.vy = 0; e.onGround = true; break; }
      }
    } else if (e.vy < 0) {
      const ty = Math.floor(e.y / TILE);
      for (let tx = left; tx <= right; tx++) if (world.solid(tx, ty)) { e.y = (ty + 1) * TILE; e.vy = 0; e.hitCeil = true; break; }
    }
  }
}
