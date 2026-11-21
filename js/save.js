// Persistent progress stored in the player's browser (localStorage).
//
// RULES so nobody ever loses progress:
//  1. The storage key never changes.
//  2. Updates may only ADD new fields or CONVERT old ones (see migrate()). Never delete progress.
//  3. Unknown fields from newer/older versions are kept as-is.
//  4. Every write also updates a backup copy. If the main save is damaged, the backup is used.
//  5. If both are unreadable, the damaged text is set aside (never overwritten) and a fresh save starts.
const SAVE_VERSION = 4;

const Save = {
  key: 'hallowheads_save_v1',
  backupKey: 'hallowheads_save_v1_backup',
  data: null,

  defaults() {
    return {
      saveVersion: SAVE_VERSION,
      shards: 0,
      owned: ['mask'],
      equipped: 'mask',
      unlocks: {},     // attacks unlocked: { wisp: true }
      levels: {},      // levels beaten: { l1: true, l2: true }
      best: {},        // best time per level (seconds)
      shardBest: {},   // most shards collected per level
      resume: null,    // { level, checkpoint, time, deaths, shards }: continue a level after closing the game
    };
  },

  read(key) {
    let raw = null;
    try { raw = localStorage.getItem(key); } catch (e) { return { ok: true, data: null }; }
    if (!raw) return { ok: true, data: null };
    try {
      const d = JSON.parse(raw);
      return d && typeof d === 'object' ? { ok: true, data: d } : { ok: false, raw };
    } catch (e) { return { ok: false, raw }; }
  },

  load() {
    const main = this.read(this.key);
    let d = main.data;
    if (!d) {
      const backup = this.read(this.backupKey);
      if (backup.ok && backup.data) d = backup.data;
      if (!main.ok && main.raw) {
        try { localStorage.setItem(this.key + '_damaged_' + Date.now(), main.raw); } catch (e) { /* ignore */ }
      }
    }
    // Merge: keep everything the player has, fill in anything new with defaults.
    const base = this.defaults();
    this.data = Object.assign(base, d || {});
    for (const k of ['unlocks', 'levels', 'best', 'shardBest']) this.data[k] = Object.assign({}, (d && d[k]) || {});
    this.migrate();
    this.write();
    return this.data;
  },

  // Convert saves from older versions of the game. Only ever ADD or CONVERT; never wipe progress.
  migrate() {
    const d = this.data;
    // candy -> souls -> shards (all currency is kept)
    if (d.candy !== undefined) { d.shards = (d.shards || 0) + d.candy; delete d.candy; }
    if (d.souls !== undefined) { d.shards = (d.shards || 0) + d.souls; delete d.souls; }
    // Halloween heads were replaced by creepy ones: owners get the replacement head
    const swap = { pip: 'mask', boo: 'shade', mittens: 'stitches', franky: 'rotter' };
    d.owned = [...new Set((Array.isArray(d.owned) ? d.owned : []).map((h) => swap[h] || h))];
    d.equipped = swap[d.equipped] || d.equipped;
    if (!d.owned.includes('mask')) d.owned.push('mask');
    if (!d.owned.includes(d.equipped)) d.equipped = 'mask';
    // v2 (one time, already applied for old players): attacks moved to "every 20 levels"
    if (!d.v2) { d.unlocks = {}; d.v2 = true; }
    if (typeof d.shards !== 'number' || !isFinite(d.shards)) d.shards = 0;
    d.saveVersion = Math.max(d.saveVersion || 0, SAVE_VERSION);
  },

  write() {
    try {
      const json = JSON.stringify(this.data);
      localStorage.setItem(this.key, json);
      localStorage.setItem(this.backupKey, json);
    } catch (e) { /* private browsing or storage full: the game still runs */ }
  },

  // Remember where the player is inside a level so they can continue after closing the tab.
  setResume(r) { this.data.resume = r; this.write(); },
  clearResume() { this.data.resume = null; this.write(); },
};

Save.load();
// Ask the browser to keep our storage instead of clearing it when space runs low.
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
// Save whenever the player leaves or switches tabs.
const saveNow = () => { try { if (typeof Game !== 'undefined' && Game.world && Game.state !== 'victory') Game.saveResume(); } catch (e) { /* ignore */ } Save.write(); };
addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
