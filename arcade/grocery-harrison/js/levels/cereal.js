// levels/cereal.js -- aisle 4, the cereal aisle.
//
// Box towers, a sticky sugar dune, a tipped box, a gap in the shelf,
// cornflakes drifting down from a split box overhead, and weevils. Granny
// Granola's oat ring goes home to the TOASTED O's at the far end. The
// MAGMA CRUNCH secret (bowl.js) is hidden in this aisle.

GH.levels.cereal = {

  id: 'cereal',
  aisle: 4,
  // The string of the chord this aisle gives back (GH.level.STRINGS).
  string: 0,
  name: 'CEREAL',
  title: 'CEREAL AISLE',
  theme: { wall: '#141a2e', wallLow: '#1f2a44' },
  secret: 'bowl',
  // Its words, the quest's lines and goals included, are in dialogue.js.
  item: 'ring',

  WORLD_W: 3000,
  PITS: [[2070, 2130]],

  build() {
    const F = GH.level.FLOOR_Y;
    const box = (id, x0, x1, top, label, color) => ({ id, x0, x1, top, bottom: F, shape: 'box', label, color });
    return {
      width: this.WORLD_W,
      pits: this.PITS,
      solids: [
        ...GH.level.floors(this.WORLD_W, this.PITS),
        box('A', 420, 560, 390, 'BRAN-O-RAMA', '#8e5a2b'),
        box('B', 560, 700, 340, 'CRUNCH COMETS', '#2e4a9e'),
        box('C', 740, 880, 300, 'HONEY HOOPS', '#d9a21b'),
        // The tipped box: lying on its side, spilling sugar.
        { ...box('T', 1300, 1560, 360, 'SUGAR SIRENS', '#c2185b'), spill: true },
        box('D', 2200, 2320, 400, 'MUESLI MOUNTAIN', '#6d8b3a'),
        box('E', 2320, 2440, 360, 'CORN CRISPS', '#e0702a'),
        box('F', 2600, 2800, 240, "TOASTED O's", '#b3412e'),
      ],
      oneways: [
        { id: 's1', x0: 1240, x1: 1290, y: 400, style: 'flake' },
        { id: 'o1', x0: 1620, x1: 1680, y: 360, style: 'flake' },
        { id: 'o2', x0: 1700, x1: 1756, y: 310, style: 'flake' },
        { id: 'f1', x0: 2470, x1: 2530, y: 320, style: 'flake' },
        { id: 'f2', x0: 2540, x1: 2600, y: 280, style: 'flake' },
      ],
      sticky: [{ x0: 1000, x1: 1180 }],
      gusts: [],
      // Where the flake fall comes from, and the box it spills out of.
      flakefall: { x0: 1770, x1: 1830, top: 40, label: 'CORN FLURRIES' },
      falling: [],          // flakes in the air: { x0, x1, y, prevY }
      nextFlake: 0,

      foes: [
        GH.level.foe('weevil', 930, 1290, F),
        GH.level.foe('weevil', 1580, 2050, F),
        GH.level.foe('weevil', 2610, 2790, 240),
      ],

      npcs: [{ id: 'granny', kind: 'granny', name: GH.DIALOGUE.cereal.speaker, x: 250, y: F }],

      // The oat ring starts with Granny and goes home to the TOASTED O's.
      home: { x0: 2660, x1: 2740, y: 240, kind: 'flap' },

      checkpoints: [
        { x: 100, y: F },
        { x: 1590, y: F },
        { x: 2165, y: F },
      ],

      sugar: [
        [470, 360], [610, 310], [660, 310], [820, 270], [850, 270],
        [1040, 410], [1110, 410], [1160, 410],
        [1265, 370], [1360, 330], [1430, 330], [1500, 330],
        [1650, 330], [1728, 280], [1800, 200], [1800, 140],
        [1900, 410], [2000, 410], [2100, 380],
        [2260, 370], [2380, 330], [2500, 290], [2570, 250], [2700, 200],
      ].map(([x, y]) => ({ x, y, taken: false })),

      // Decoration only: the giant boxes on the shelf behind, drawn with
      // parallax. Never collided with.
      backdrop: [
        { x: 60, w: 180, h: 300, label: 'OAT SNOW', color: '#3d6b8c' },
        { x: 300, w: 150, h: 360, label: 'BRANWAVE', color: '#7b4d8e' },
        { x: 560, w: 200, h: 280, label: 'MARSHMALLOW MOONS', color: '#2a7f62' },
        { x: 860, w: 160, h: 340, label: 'RICE RIOT', color: '#9e3b3b' },
        { x: 1100, w: 220, h: 300, label: 'COCOA CANYON', color: '#5b3a26' },
        { x: 1400, w: 170, h: 360, label: 'FRUIT FIREWORKS', color: '#c46a1a' },
        { x: 1650, w: 200, h: 320, label: 'GRANOLA GRANDE', color: '#7a6a2a' },
      ],
    };
  },

  ROUTE: [
    ['floor1', 'A'], ['A', 'B'], ['B', 'C'],
    ['floor1', 's1'], ['s1', 'T'],
    ['floor1', 'floor2'],
    ['floor2', 'D'], ['D', 'E'], ['E', 'f1'], ['f1', 'f2'], ['f2', 'F'],
  ],
};
