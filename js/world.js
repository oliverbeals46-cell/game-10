// Tile world: collision + rendering.
const TILE = 32;
const T = { EMPTY: 0, SOLID: 1, ONEWAY: 2, SPIKE: 3, GATE: 4 };

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
  }
  get(tx, ty) {
    if (tx < 0 || tx >= this.w) return T.SOLID;
    if (ty < 0) return T.EMPTY;
    if (ty >= this.h) return T.SOLID;
    return this.tiles[ty * this.w + tx];
  }
  solid(tx, ty) { const t = this.get(tx, ty); return t === T.SOLID || (t === T.GATE && this.gateClosed); }
  standable(tx, ty) { const t = this.get(tx, ty); return t === T.SOLID || t === T.ONEWAY || (t === T.GATE && this.gateClosed); }
  isSpike(tx, ty) { return this.get(tx, ty) === T.SPIKE; }
  solidAt(px, py) { return this.solid(Math.floor(px / TILE), Math.floor(py / TILE)); }

  spikeBoxes(b) {
    const out = [];
    const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w) / TILE);
    const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (this.isSpike(tx, ty)) out.push({ x: tx * TILE + 3, y: ty * TILE + 12, w: TILE - 6, h: TILE - 12 });
    }
    return out;
  }
  spikeOverlap(b) { return this.spikeBoxes(b).some((s) => rectsOverlap(b, s)); }

  // ---------- rendering ----------
  draw(ctx, cam, t) {
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), x1 = Math.min(this.w - 1, Math.ceil((cam.x + VIEW_W) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1), y1 = Math.min(this.h - 1, Math.ceil((cam.y + VIEW_H) / TILE) + 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const tile = this.get(tx, ty);
        if (tile === T.EMPTY) continue;
        const px = tx * TILE, py = ty * TILE;
        if (tile === T.SOLID) this.drawSolid(ctx, tx, ty, px, py, t);
        else if (tile === T.ONEWAY) this.drawPlank(ctx, tx, ty, px, py);
        else if (tile === T.SPIKE) this.drawSpike(ctx, tx, ty, px, py);
        else if (tile === T.GATE) this.drawGate(ctx, tx, ty, px, py, t);
      }
    }
  }

  drawSolid(ctx, tx, ty, px, py, t) {
    const above = this.get(tx, ty - 1), below = this.get(tx, ty + 1);
    const openAbove = !(above === T.SOLID);
    const deep = this.get(tx, ty - 1) === T.SOLID && this.get(tx, ty - 2) === T.SOLID;
    ctx.fillStyle = deep ? '#0e0b1a' : '#181430';
    ctx.fillRect(px, py, TILE, TILE);
    const r = hash2(tx, ty);
    // bricks / stones
    ctx.fillStyle = deep ? '#130f22' : '#211b3c';
    if (r > 0.35) ctx.fillRect(px + 4 + r * 10, py + 8 + r * 8, 9, 5);
    if (r < 0.6) ctx.fillRect(px + 18 - r * 6, py + 20, 8, 4);
    // edges
    if (this.get(tx - 1, ty) !== T.SOLID) { ctx.fillStyle = '#2c2450'; ctx.fillRect(px, py, 3, TILE); }
    if (this.get(tx + 1, ty) !== T.SOLID) { ctx.fillStyle = '#0a0814'; ctx.fillRect(px + TILE - 3, py, 3, TILE); }
    if (below !== T.SOLID) { ctx.fillStyle = '#0a0814'; ctx.fillRect(px, py + TILE - 3, TILE, 3); }
    if (openAbove) {
      // purple moss with drips
      ctx.fillStyle = '#4b2f78';
      ctx.fillRect(px, py, TILE, 6);
      ctx.fillStyle = '#7a52b8';
      ctx.fillRect(px, py, TILE, 2);
      const d = hash2(tx + 7, ty);
      ctx.fillStyle = '#4b2f78';
      ctx.fillRect(px + 4 + d * 18, py + 6, 3, 3 + d * 6);
      ctx.fillRect(px + 20 - d * 10, py + 6, 2, 2 + (1 - d) * 4);
      // little grass blades
      ctx.fillStyle = '#9b74d8';
      for (let i = 0; i < 3; i++) {
        const gx = px + 3 + hash2(tx, ty + i * 9) * 26;
        const sway = Math.sin(t * 2 + gx * 0.05) * 1.5;
        ctx.beginPath(); ctx.moveTo(gx, py); ctx.lineTo(gx + 1 + sway, py - 5 - (i % 2) * 2); ctx.lineTo(gx + 2, py); ctx.fill();
      }
    }
  }

  drawPlank(ctx, tx, ty, px, py) {
    ctx.fillStyle = '#3a271d';
    ctx.fillRect(px, py + 2, TILE, 9);
    ctx.fillStyle = '#6e4c36';
    ctx.fillRect(px, py, TILE, 3);
    ctx.fillStyle = '#25170f';
    ctx.fillRect(px + 15, py + 3, 2, 8);
    if (this.get(tx - 1, ty) !== T.ONEWAY) { ctx.fillStyle = '#2b1c13'; ctx.fillRect(px + 3, py + 10, 4, 10); }
    if (this.get(tx + 1, ty) !== T.ONEWAY) { ctx.fillStyle = '#2b1c13'; ctx.fillRect(px + TILE - 7, py + 10, 4, 10); }
  }

  drawSpike(ctx, tx, ty, px, py) {
    ctx.fillStyle = '#120e20';
    ctx.fillRect(px, py + TILE - 6, TILE, 6);
    for (let i = 0; i < 3; i++) {
      const bx = px + 2 + i * 10, h = 16 + hash2(tx, i) * 6;
      ctx.fillStyle = '#d9d0c1';
      ctx.beginPath(); ctx.moveTo(bx, py + TILE - 4); ctx.lineTo(bx + 5, py + TILE - 4 - h); ctx.lineTo(bx + 10, py + TILE - 4); ctx.fill();
      ctx.fillStyle = '#968c7c';
      ctx.beginPath(); ctx.moveTo(bx + 5, py + TILE - 4 - h); ctx.lineTo(bx + 10, py + TILE - 4); ctx.lineTo(bx + 6.5, py + TILE - 4); ctx.fill();
    }
  }

  drawGate(ctx, tx, ty, px, py, t) {
    if (!this.gateClosed) {
      if (this.get(tx, ty - 1) !== T.GATE) { // retracted spikes peeking from the ceiling
        ctx.fillStyle = '#2b2b38';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px + 4 + i * 9, py); ctx.lineTo(px + 8.5 + i * 9, py + 8); ctx.lineTo(px + 13 + i * 9, py); ctx.fill(); }
      }
      return;
    }
    ctx.fillStyle = 'rgba(255,120,30,0.12)';
    ctx.fillRect(px - 6, py, TILE + 12, TILE);
    ctx.fillStyle = '#2b2b38';
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 4 + i * 10, py, 5, TILE);
    ctx.fillStyle = '#4a4a5e';
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 4 + i * 10, py, 2, TILE);
    ctx.fillStyle = `rgba(255,140,40,${0.5 + Math.sin(t * 4) * 0.2})`;
    ctx.fillRect(px + 2, py + 14, TILE - 4, 3);
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Move an entity {x,y,w,h,vx,vy} through the world, resolving tile collisions per-axis.
function moveEntity(world, e, dt) {
  e.hitWallL = e.hitWallR = e.hitCeil = false;
  // X axis
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
  // Y axis
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
