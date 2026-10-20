// level.js -- what every aisle shares, and the store directory.
//
// Pure logic. Each aisle is a file in js/levels/ that registers itself in
// GH.levels[id] with build(), ROUTE and its quest; this file holds the
// helpers they all use and the directory that lists them.
//
// A world, as build() returns it. Shapes:
//
//   solid    { id, x0, x1, top, bottom, shape, label, color }
//            blocks every side. `shape` is how it is drawn: 'shelf', 'box',
//            'carton', 'cup', 'block'
//   oneway   { id, x0, x1, y, style }
//            land on it from above, jump up through it from below. `style`:
//            'flake', 'butter', 'wire'. `slick: true` is ice underfoot
//   sticky   { x0, x1 }                 the floor is sticky there
//   gust     { x0, x1, period, open, push, phase }
//            a fridge door: for `open` frames of every `period` it blows,
//            pushing anyone in [x0, x1] by `push` px a frame
//   foe      { kind, x0, x1, y, x, dir, stun, speed? }
//            'weevil' and 'curd' patrol and can be stomped or strummed;
//            'wheel' rolls, hurts from the side, bounces you off its top,
//            and a strum does nothing to it
//   npc      { id, kind, name, x, y }
//
// ROUTE is the path a player must be able to take, as pairs of surface ids,
// carrying the quest item. tools/sim.mjs jumps every pair of every level
// with the real physics, so moving a box is safe exactly when it passes.

GH.levels = {};

GH.level = {

  FLOOR_Y: 440,

  // The store directory, in the order it is printed by the door. Aisles
  // with an `id` are built; the rest say "coming soon".
  // The chord Harrison played in the walk-in: an open G major, one string per
  // aisle, low to high. Each restored aisle gives its string back (its level
  // file's `string`); the strum rings only the strings found and thunks the
  // rest. Three aisles find G, B and D, a whole triad, which is where the demo
  // ends; the other three are for the full game. Six strings, six aisles.
  STRINGS: [
    { midi: 43, name: 'G' },
    { midi: 47, name: 'B' },
    { midi: 50, name: 'D' },
    { midi: 55, name: 'G' },
    { midi: 59, name: 'B' },
    { midi: 67, name: 'G' },
  ],

  // Which strings are back, as a list of six booleans, from the restored map
  // main.js keeps.
  strings(restored) {
    const found = this.STRINGS.map(() => false);
    for (const id of Object.keys(GH.levels)) {
      const s = GH.levels[id].string;
      if (restored && restored[id] && s >= 0 && s < found.length) found[s] = true;
    }
    return found;
  },

  DIRECTORY: [
    { aisle: 4, id: 'cereal' },
    { aisle: 5, id: 'dairy' },
    { aisle: 6, id: 'produce' },
    { aisle: 8, name: 'BAKERY' },
    { aisle: 9, name: 'FROZEN' },
    { aisle: 11, name: 'CANNED' },
    // Not an aisle: where the sugar is spent (shop.js).
    { checkout: true },
  ],

  // The shelf, in pieces around its pits.
  floors(width, pits) {
    const out = [];
    let x = -40;
    pits.forEach(([a, b], i) => {
      out.push({ id: 'floor' + (i + 1), x0: x, x1: a, top: this.FLOOR_Y, bottom: this.FLOOR_Y + 80, shape: 'shelf', shelf: true });
      x = b;
    });
    out.push({ id: 'floor' + (pits.length + 1), x0: x, x1: width + 40, top: this.FLOOR_Y, bottom: this.FLOOR_Y + 80, shape: 'shelf', shelf: true });
    return out;
  },

  foe(kind, x0, x1, y, extra) {
    return { kind, x0, x1, y, x: (x0 + x1) / 2, dir: 1, stun: 0, ...extra };
  },

  // A surface by id, and the height a body standing on it has its feet at.
  surface(w, id) {
    return w.solids.find(s => s.id === id) || w.oneways.find(o => o.id === id);
  },
  topOf(s) {
    return s.top !== undefined ? s.top : s.y;
  },
};
