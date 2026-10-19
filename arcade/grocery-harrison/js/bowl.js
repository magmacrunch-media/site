// bowl.js -- the MAGMA CRUNCH secret: a bowl of milk the size of a lake.
//
// Pure logic. The box is the one on magmacrunch.com's about page, tipped
// over and pouring: black, pink edges, cyan volcano. In the cereal aisle it
// sits on the back of the shelf, out of reach, until Harrison strums in front
// of it; then it tips, and X climbs in. The bowl is a world of its own
// (GH.bowl.build()), swapped in as g.world while he is inside.
//
// The milk is the floor you cannot stand on; the cereal is everything you
// can. Shapes, beyond level.js's:
//
//   floater  a oneway that moves: { kind, base, amp, ph, speed, vx }
//            loop  bobs on the milk, and the poured ones drift across it
//            star  springy: a jump from a star is a spring jump
//            rock  a lava rock: it sinks while stood on and rises when left;
//                  sunk past `sinkMax` it is under the milk and holds nothing
//
// ROUTE works as level.js's does and tools/sim.mjs flies it with the bobbing
// stopped, so it checks the geometry rather than a lucky phase.

GH.bowl = {

  WORLD_W: 1400,
  MILK_Y: 400,

  // Where the box stands in the cereal aisle, on the back of the shelf.
  BOX: { x0: 1780, x1: 1880, reveal: 80 },

  build() {
    const M = this.MILK_Y;
    const loop = (id, x0, base, ph) => ({ id, kind: 'loop', x0, x1: x0 + 56, base, y: base, amp: 6, ph, speed: 0.05, vx: 0 });
    const star = (id, x0, base) => ({ id, kind: 'star', x0, x1: x0 + 52, base, y: base, amp: 3, ph: 0, speed: 0.04, vx: 0, spring: GH.MAGMA.spring });
    const rock = (id, x0, base) => ({ id, kind: 'rock', x0, x1: x0 + 60, base, y: base, amp: 0, ph: 0, speed: 0, vx: 0, sink: 0 });
    const high = (id, x0, y) => ({ id, kind: 'high', x0, x1: x0 + 80, base: y, y, amp: 0, ph: 0, speed: 0, vx: 0 });
    return {
      bowl: true,
      width: this.WORLD_W,
      deathY: M + 30,
      entry: { x: 60, y: 340 },
      solids: [
        { id: 'rimL', x0: -40, x1: 150, top: 340, bottom: 520, rim: true },
        { id: 'rimR', x0: 1250, x1: this.WORLD_W + 40, top: 340, bottom: 520, rim: true },
      ],
      oneways: [
        loop('L1', 175, 385, 0),
        loop('L2', 275, 370, 1.4),
        star('S1', 380, 392),
        high('H1', 450, 252),
        rock('R1', 560, 372),
        loop('L3', 660, 366, 2.6),
        star('S2', 760, 392),
        high('H2', 830, 256),
        loop('L4', 950, 370, 0.7),
        rock('R2', 1050, 372),
        loop('L5', 1150, 366, 2.0),
      ],
      sticky: [],
      falling: [],
      foes: [],
      gusts: [],
      npcs: [],
      checkpoints: [],
      backdrop: [],
      pour: { x: 160, nextAt: 90 },   // where poured loops land, under the box's mouth
      prize: { x: 1330, y: 340, taken: false },
      sugar: [
        [490, 226], [870, 230], [303, 344], [690, 340], [978, 344], [1178, 340],
      ].map(([x, y]) => ({ x, y, taken: false })),
    };
  },

  ROUTE: [
    ['rimL', 'L1'], ['L1', 'L2'], ['L2', 'S1'], ['S1', 'H1'], ['H1', 'R1'],
    ['R1', 'L3'], ['L3', 'S2'], ['S2', 'H2'], ['H2', 'L4'], ['L4', 'R2'],
    ['R2', 'L5'], ['L5', 'rimR'],
  ],

  // Every frame Harrison is in the bowl: the cereal bobs, rocks sink under
  // him, and the box pours another loop that drifts off across the milk.
  update(g) {
    const w = g.world;
    const Mg = GH.MAGMA;
    const p = g.player;
    for (const o of w.oneways) {
      const px = o.x0, py = o.y;
      if (o.kind === 'rock') {
        o.sink = p.on === o ? Math.min(Mg.sinkMax + 10, o.sink + Mg.sinkRate) : Math.max(0, o.sink - Mg.riseRate);
        o.y = o.base + o.sink;
        o.under = o.sink > Mg.sinkMax;
      } else if (o.amp) {
        o.y = o.base + Math.sin(g.frame * o.speed + o.ph) * o.amp;
      }
      o.x0 += o.vx;
      o.x1 += o.vx;
      o.prevY = py;
      o.dy = o.y - py;
      o.dx = o.x0 - px;
    }
    // Poured loops leave by sinking at the far rim.
    w.oneways = w.oneways.filter(o => !(o.poured && o.x0 > 1200));

    if (g.frame >= w.pour.nextAt) {
      w.pour.nextAt = g.frame + Mg.pourEvery + Math.floor(g.rand() * Mg.pourEvery);
      w.oneways.push({
        id: 'poured', kind: 'loop', poured: true,
        x0: w.pour.x, x1: w.pour.x + 50, base: GH.bowl.MILK_Y - 8, y: GH.bowl.MILK_Y - 8,
        amp: 4, ph: g.rand() * 6.28, speed: 0.06, vx: Mg.drift, dx: 0, dy: 0,
      });
      GH.game.emit('pour');
    }
  },

  // Close enough to the box in the aisle to strum it awake, or to climb in.
  nearBox(g) {
    if (g.room !== 'aisle') return false;
    const cx = g.player.x + GH.PLAYER.w / 2;
    return Math.abs(cx - (this.BOX.x0 + this.BOX.x1) / 2) <= this.BOX.reveal && g.player.grounded;
  },
};
