// Persistent progress (candy, owned heads, unlocked attacks) stored in localStorage.
const Save = {
  key: 'hallowheads_save_v1',
  data: null,
  defaults() {
    return { candy: 0, owned: ['pip'], equipped: 'pip', unlocks: {}, levels: {}, best: {} };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { d = null; }
    this.data = Object.assign(this.defaults(), d || {});
    if (!this.data.owned.includes('pip')) this.data.owned.push('pip');
    // v2: attacks now unlock every 20 levels, so clear the old Level-1 unlock
    if (!this.data.v2) { this.data.unlocks = {}; this.data.v2 = true; }
    return this.data;
  },
  write() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* private mode etc. */ }
  },
};
Save.load();
