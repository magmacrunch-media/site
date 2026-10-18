// tower.js -- the ledges: generating them, aging them, throwing them away.
//
// World coordinates are canvas-like: y grows DOWNWARD, floor 0 sits at y = 0
// and floor n at y = -n * gap. The camera turns world into screen in render.js;
// nothing in here knows the screen exists.
//
// No DOM, no canvas, no Math.random for anything that affects play: the ledges
// come from a seeded generator so tools/sim.mjs can replay a tower exactly.

CA.rng = function (seed) {
  // mulberry32. Small, fast, and plenty for placing ledges.
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

CA.tower = {

  floorY(floor) {
    return -floor * CA.TOWER.gap;
  },

  chamberOf(floor) {
    return Math.floor(Math.max(0, floor) / CA.TOWER.chamberEvery);
  },

  chamberStyle(floor) {
    const list = CA.CHAMBERS;
    return list[this.chamberOf(floor) % list.length];
  },

  // The ledge kind for a floor, from the odds row its band of floors uses.
  pickKind(floor, rand) {
    const rows = CA.LEDGE.odds;
    const row = rows[Math.min(Math.floor(floor / CA.LEDGE.oddsEvery), rows.length - 1)];
    let r = rand();
    for (const kind of ['basalt', 'obsidian', 'crust', 'fumarole']) {
      r -= row[kind];
      if (r < 0) return kind;
    }
    return 'basalt';
  },

  widthFor(floor) {
    const T = CA.TOWER;
    return Math.max(T.widthMin, T.widthStart - T.widthShrinkPerFloor * floor);
  },

  make(floor, rand) {
    const inner = CA.W - 2 * CA.WALL;
    const ledge = {
      floor,
      y: this.floorY(floor),
      x: CA.WALL,
      w: inner,
      kind: 'basalt',
      chamber: false,
      crumbleAt: -1,   // frame the crust gives way, once somebody has landed
      falling: false,
      fallV: 0,
      phase: 0,        // fumarole timing offset, so vents do not fire in step
    };

    if (floor % CA.TOWER.chamberEvery === 0) {
      ledge.chamber = true;
      return ledge;
    }

    ledge.w = this.widthFor(floor);
    ledge.x = CA.WALL + rand() * (inner - ledge.w);
    ledge.kind = this.pickKind(floor, rand);
    ledge.phase = Math.floor(rand() * CA.LEDGE.fumarolePeriod);
    return ledge;
  },

  // Make sure every floor up to `floor` exists. Ledges are stored lowest
  // first, so the newest is always at the end.
  ensure(g, floor) {
    while (g.topFloor < floor) {
      g.topFloor++;
      g.ledges.push(this.make(g.topFloor, g.rand));
    }
  },

  // Forget ledges the magma has already swallowed.
  prune(g) {
    const cut = g.magma.y + CA.TOWER.gap * 2;
    while (g.ledges.length && g.ledges[0].y > cut) g.ledges.shift();
  },

  // Where a fumarole is in its cycle: 'idle', 'warn' or 'fire'.
  ventState(ledge, frame) {
    const L = CA.LEDGE;
    const t = (frame + ledge.phase) % L.fumarolePeriod;
    if (t >= L.fumarolePeriod - L.fumaroleBurst) return 'fire';
    if (t >= L.fumarolePeriod - L.fumaroleBurst - L.fumaroleWarn) return 'warn';
    return 'idle';
  },

  update(g) {
    for (const ledge of g.ledges) {
      if (ledge.kind !== 'crust') continue;
      if (ledge.falling) {
        ledge.fallV += CA.LEDGE.crustFallAccel;
        ledge.y += ledge.fallV;
      } else if (ledge.crumbleAt >= 0 && g.frame >= ledge.crumbleAt) {
        ledge.falling = true;
        CA.game.emit('crumble', ledge);
      }
    }
  },
};
