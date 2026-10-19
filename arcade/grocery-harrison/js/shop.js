// shop.js -- the checkout: sugar crystals banked, upgrades bought.
//
// Pure logic: no DOM and no storage. main.js keeps the save in localStorage
// and hands it in; tools/sim.mjs tests this file directly.
//
// The save is { sugar, found, perks }:
//   sugar   crystals banked and not yet spent
//   found   every crystal ever banked, as "aisle/room/index" keys. A crystal
//           banks once, for good, so replaying an aisle cannot farm it and the
//           hidden ones are worth hunting
//   perks   the ids of upgrades bought
//
// Every upgrade only ever helps, and the sim proves every route with none of
// them, so nothing in the store needs buying to be finished. Prices are set so
// that finding every crystal buys everything. The names and descriptions the
// player reads are in dialogue.js, under `checkout`.

GH.shop = {

  ITEMS: [
    { id: 'heart', cost: 15, apply: (s) => { s.hearts += 1; } },
    { id: 'reach', cost: 12, apply: (s) => { s.strumRadius = Math.round(s.strumRadius * 1.4); } },
    { id: 'quick', cost: 12, apply: (s) => { s.strumCooldown = Math.round(s.strumCooldown * 0.6); } },
    { id: 'boots', cost: 10, apply: (s) => { s.slickGrip *= 2; } },
    { id: 'bag', cost: 14, apply: (s) => { s.jumpVCarrying = (s.jumpVCarrying + GH.PLAYER.jumpV) / 2; } },
    { id: 'dance', cost: 15, apply: (s) => { s.stun = Math.round(s.stun * 1.75); } },
  ],

  empty() {
    return { sugar: 0, found: [], perks: [] };
  },

  // A save read back from storage, repaired: anything missing or malformed
  // becomes empty rather than breaking the game.
  normalize(save) {
    const s = save && typeof save === 'object' ? save : {};
    return {
      sugar: Number.isFinite(s.sugar) && s.sugar >= 0 ? Math.floor(s.sugar) : 0,
      found: Array.isArray(s.found) ? s.found.filter(k => typeof k === 'string') : [],
      perks: Array.isArray(s.perks) ? s.perks.filter(id => this.ITEMS.some(i => i.id === id)) : [],
    };
  },

  // The numbers a run plays with: the base tuning, raised by what was bought.
  stats(perks = []) {
    const s = {
      hearts: GH.PLAYER.hearts,
      strumRadius: GH.STRUM.radius,
      strumCooldown: GH.STRUM.cooldown,
      stun: GH.WEEVIL.stun,
      slickGrip: GH.SLICK.grip,
      jumpVCarrying: GH.PLAYER.jumpVCarrying,
    };
    for (const item of this.ITEMS) if (perks.includes(item.id)) item.apply(s);
    return s;
  },

  // Bank the crystals a finished run picked up. Returns the new save and how
  // many were new.
  bank(save, g) {
    const out = this.normalize(save);
    const known = new Set(out.found);
    let fresh = 0;
    for (const [room, w] of Object.entries(g.worlds)) {
      w.sugar.forEach((s, i) => {
        if (!s.taken) return;
        const key = `${g.level.id}/${room}/${i}`;
        if (known.has(key)) return;
        known.add(key);
        out.found.push(key);
        fresh++;
      });
    }
    out.sugar += fresh;
    return { save: out, fresh };
  },

  // Every crystal in the store, for the "found N of M" line.
  totalCrystals() {
    let n = 0;
    for (const id of Object.keys(GH.levels)) {
      const L = GH.levels[id];
      n += L.build().sugar.length;
      if (L.secret === 'bowl') n += GH.bowl.build().sugar.length;
    }
    return n;
  },

  // Whether an item can be bought now, and why not if it cannot.
  check(save, id) {
    const item = this.ITEMS.find(i => i.id === id);
    if (!item) return 'unknown';
    if (save.perks.includes(id)) return 'owned';
    if (save.sugar < item.cost) return 'short';
    return 'ok';
  },

  buy(save, id) {
    const s = this.normalize(save);
    if (this.check(s, id) !== 'ok') return s;
    const item = this.ITEMS.find(i => i.id === id);
    s.sugar -= item.cost;
    s.perks.push(id);
    return s;
  },
};
