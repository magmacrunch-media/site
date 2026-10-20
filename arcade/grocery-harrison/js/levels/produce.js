// levels/produce.js -- aisle 6, produce.
//
// A jungle at cornflake scale. Crates of lemons, limes, onions and mangoes
// are the solid ground; lettuce leaves are the platforms, and the misting
// system overhead rains on them on a timer, which makes them slick until
// they dry. Herb vines climb from the shelf to the canopy, and fruit flies
// hover in the air. Pete Pepper's runaway blueberry goes home to its
// clamshell at the top of the far display.

GH.levels.produce = {

  id: 'produce',
  aisle: 6,
  // The string of the chord this aisle gives back (GH.level.STRINGS).
  string: 2,
  name: 'PRODUCE',
  title: 'PRODUCE AISLE',
  theme: { wall: '#0e1f16', wallLow: '#1b3626' },
  // Its words, the quest's lines and goals included, are in dialogue.js.
  item: 'berry',

  WORLD_W: 3000,
  PITS: [[1380, 1440]],

  build() {
    const F = GH.level.FLOOR_Y;
    const crate = (id, x0, x1, top, label, fruit) => ({ id, x0, x1, top, bottom: F, shape: 'crate', label, fruit });
    // A leaf is wettable: under a running mister it turns slick.
    const leaf = (id, x0, x1, y) => ({ id, x0, x1, y, style: 'leaf', leaf: true });
    return {
      width: this.WORLD_W,
      pits: this.PITS,
      solids: [
        ...GH.level.floors(this.WORLD_W, this.PITS),
        crate('C1', 380, 470, 390, 'LEMONS', '#f4d03f'),
        crate('C2', 470, 560, 340, 'LIMES', '#7dbf3a'),
        crate('C3', 1180, 1270, 400, 'ONIONS', '#b07ab0'),
        crate('C4', 1270, 1380, 360, 'POTATOES', '#a0784a'),
        crate('C5', 2050, 2150, 260, 'MANGOES', '#f39c33'),
        crate('C6', 2400, 2490, 390, 'PEARS', '#c8d65a'),
        crate('C7', 2490, 2580, 340, 'PLUMS', '#7a3a7a'),
        { id: 'P', x0: 2700, x1: 2840, top: 260, bottom: F, shape: 'clamshell', label: 'BLUEBERRIES' },
      ],
      oneways: [
        leaf('L1', 600, 680, 300),
        leaf('L2', 715, 815, 200),
        leaf('L3', 855, 945, 230),
        leaf('L4', 985, 1075, 270),
        leaf('L6', 1650, 1760, 180),
        leaf('L7', 1795, 1875, 210),
        leaf('L8', 1915, 1995, 240),
        leaf('L9', 2610, 2680, 300),
      ],
      // Herb vines: x is the stem, from the shelf at `bottom` up to `top`,
      // where a leaf waits for whoever climbs off it.
      vines: [
        { x: 765, top: 200, bottom: F, herb: 'BASIL' },
        { x: 1705, top: 180, bottom: F, herb: 'MINT' },
      ],
      // The misting system: for `on` frames of every `period` it rains on
      // [x0, x1], after `warn` frames of sputtering; leaves stay wet `dry`
      // frames after it stops.
      mists: [
        { x0: 700, x1: 1100, period: 420, on: 150, warn: 40, dry: 60, phase: 0 },
        { x0: 1640, x1: 2010, period: 420, on: 150, warn: 40, dry: 60, phase: 210 },
        { x0: 2590, x1: 2700, period: 360, on: 110, warn: 40, dry: 60, phase: 90 },
      ],
      sticky: [],
      gusts: [],
      falling: [],

      foes: [
        GH.level.foe('fly', 850, 1060, 190, { amp: 22 }),
        GH.level.foe('fly', 1480, 1800, 400, { amp: 16 }),
        GH.level.foe('fly', 2200, 2380, 330, { amp: 26 }),
        GH.level.foe('fly', 2610, 2850, 210, { amp: 20 }),
      ],

      npcs: [{ id: 'pete', kind: 'pete', name: GH.DIALOGUE.produce.speaker, x: 240, y: F }],

      // The blueberry goes home to its clamshell, up top at the far end.
      home: { x0: 2720, x1: 2820, y: 260, kind: 'clamshell' },

      checkpoints: [
        { x: 100, y: F },
        { x: 1120, y: F },
        { x: 2200, y: F },
      ],

      sugar: [
        [425, 360], [515, 310], [640, 270], [765, 300], [765, 240],
        [765, 170], [900, 200], [1030, 240], [1225, 370], [1325, 330],
        [1520, 410], [1600, 410], [1705, 330], [1705, 150], [1835, 180],
        [1955, 210], [2100, 230], [2250, 410], [2445, 360], [2535, 310],
        [2645, 270], [2770, 230], [2880, 410], [1410, 330],
      ].map(([x, y]) => ({ x, y, taken: false })),

      // The far display, through the leaves: bins side by side, filling the
      // 1150 px the backdrop repeats over. The fruit in them is drawn to
      // scale (produce-render.js, FRUIT), so it towers over Harrison.
      backdrop: [
        { x: 0, w: 226, label: 'BANANAS' },
        { x: 230, w: 226, label: 'KALE' },
        { x: 460, w: 226, label: 'AVOCADOS' },
        { x: 690, w: 226, label: 'CARROTS' },
        { x: 920, w: 226, label: 'LEMONS' },
      ],
    };
  },

  // A pair is a jump, as everywhere. A pair with 'climb' is a vine: stand
  // at its foot on the first surface, hold jump, and arrive on the second.
  ROUTE: [
    ['floor1', 'C1'], ['C1', 'C2'], ['C2', 'L1'],
    ['floor1', 'L2', 'climb'], ['L2', 'L3'], ['L3', 'L4'],
    ['floor1', 'C3'], ['C3', 'C4'], ['C4', 'floor2'],
    ['floor2', 'L6', 'climb'], ['L6', 'L7'], ['L7', 'L8'], ['L8', 'C5'],
    ['floor2', 'C6'], ['C6', 'C7'], ['C7', 'L9'], ['L9', 'P'],
  ],
};
