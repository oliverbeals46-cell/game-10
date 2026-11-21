// Persistent progress (shards, owned heads, unlocked attacks, best times) stored in localStorage.
const Save = {
  key: 'hallowheads_save_v1',
  data: null,
  defaults() {
    return { shards: 0, owned: ['mask'], equipped: 'mask', unlocks: {}, levels: {}, best: {} };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { d = null; }
    this.data = Object.assign(this.defaults(), d || {});
    // v3: candy became souls
    if (this.data.candy !== undefined) { this.data.shards = (this.data.shards || 0) + this.data.candy; delete this.data.candy; }
    // v4: souls became shards
    if (this.data.souls !== undefined) { this.data.shards = (this.data.shards || 0) + this.data.souls; delete this.data.souls; }
    // v3: Halloween heads were replaced by creepy ones — swap any old heads you owned
    const swap = { pip: 'mask', boo: 'shade', mittens: 'stitches', franky: 'rotter' };
    this.data.owned = [...new Set(this.data.owned.map((h) => swap[h] || h))];
    this.data.equipped = swap[this.data.equipped] || this.data.equipped;
    if (!this.data.owned.includes('mask')) this.data.owned.push('mask');
    // v2: attacks now unlock every 20 levels, so clear the old Level-1 unlock
    if (!this.data.v2) { this.data.unlocks = {}; this.data.v2 = true; }
    return this.data;
  },
  write() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* private mode etc. */ }
  },
};
Save.load();
