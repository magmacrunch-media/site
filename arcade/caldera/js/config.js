// config.js -- the one global, and every tuning number in the game.
//
// Classic scripts sharing `CA`, not ES modules: a module is fetched under CORS
// rules a file:// page cannot satisfy, and double-clicking index.html is what
// this repo promises. Every file after this one extends CA.
//
// Units are pixels and FRAMES, at a fixed CA.TICK_FPS. createGameLoop ticks at
// that rate whatever the monitor does, so a frame is 1/60 s everywhere.
//
// If you are about to write a literal into another file, put it here instead.

const CA = {
  W: 480,
  H: 720,
  TICK_FPS: 60,

  // The vent: two basalt walls the player rebounds off, Icy Tower style.
  WALL: 28,

  PLAYER: {
    w: 26,
    h: 34,
    runAccel: 0.55,       // per frame, on basalt
    airAccel: 0.42,
    maxRun: 8.6,
    groundFriction: 0.80, // vx multiplier per frame with no input, on basalt
    airDrag: 0.985,
    gravity: 0.56,
    maxFall: 17,
    // THE ICY TOWER VERB: jump height grows with horizontal speed, so the
    // way to climb fast is to run, and the way to run far is to rebound
    // off the walls. vy = -(jumpBase + jumpSpeedBonus * |vx|).
    jumpBase: 11.2,
    jumpSpeedBonus: 0.95,
    wallRestitution: 0.92, // |vx| kept on a rebound, airborne only
    // Pressing AGAINST your motion brakes this many times harder than
    // accelerating, so turning round is quick. Without it a reversal from
    // full speed took 24 frames on the ground and 30 in the air, which reads
    // as the arrow key being ignored. Obsidian is still slick, because it
    // multiplies obsidian's own small accel.
    skidGround: 3.0,
    skidAir: 3.5,
    // Two stats only some of the cast change. obsidianGrip: obsidian is
    // ordinary rock under your feet. ventBoost: a fumarole's launch is
    // multiplied by this.
    obsidianGrip: false,
    ventBoost: 1,
    coyoteFrames: 6,       // still allowed to jump just after leaving a ledge
    bufferFrames: 7,       // a jump pressed just before landing still fires
  },

  // THE CAST. Each entry overrides fields of PLAYER above (and crustFrames,
  // from LEDGE) for that character; anything not named is CINDER's. Every
  // one trades something for something, and tools/sim.mjs plays them all over
  // the same towers and fails if one runs away from the rest, because a
  // character who is simply better takes over the high score table.
  //
  // `sprite` names a draw function copied from moonlight-drift into
  // web/js/cast/, and the box (x, y, w, h) of its BODY in that function's own
  // coordinates. The body is scaled to the character's hitbox with the feet
  // on the ledge; extras outside it (Dag's ghost, Vinny's racket) hang over.
  CAST: {
    order: ['cinder', 'dag', 'toad', 'king', 'vinny', 'carl', 'harrison', 'juanito', 'vince'],
    // Keys a climber used to have, for saved picks and old score rows.
    renamed: { tron: 'king' },
    cinder: {
      name: 'CINDER', tag: 'CIN', role: 'ALL-ROUNDER',
      blurb: 'cooled rock, molten core',
      stats: {},
      sprite: null,
    },
    dag: {
      name: 'DAG HENDERSON', tag: 'DAG', role: 'EASY',
      blurb: 'forgiving jumps. crust holds longer.',
      stats: { w: 24, h: 36, jumpBase: 11.6, jumpSpeedBonus: 0.85, maxRun: 8.0,
               coyoteFrames: 11, bufferFrames: 11, crustFrames: 56 },
      // transatlantic_colleague's 16x24 pixel Dag, at 1.5x: see cast/dag-pixel.js.
      sprite: { id: 'dag-pixel' },
    },
    toad: {
      name: 'FIRE TOAD', tag: 'TOAD', role: 'JUMPER',
      blurb: 'huge standing jump. speed adds less.',
      stats: { w: 30, h: 26, jumpBase: 12.2, jumpSpeedBonus: 0.62, runAccel: 0.46,
               maxRun: 7.8, airAccel: 0.48 },
      sprite: { id: 'fire-toad', x: 6, y: 5, w: 31, h: 31 },
    },
    king: {
      name: 'F. JOEL YOUNG KING', tag: 'KING', role: 'SPEEDSTER',
      blurb: 'top speed, hard walls. slow off the mark.',
      stats: { w: 26, h: 38, maxRun: 10.2, runAccel: 0.5, airAccel: 0.4, gravity: 0.58,
               jumpSpeedBonus: 0.98, wallRestitution: 0.97 },
      sprite: { id: 'f-joel-young-king', x: 7, y: -1, w: 26, h: 38 },
    },
    vinny: {
      name: 'VINNY BOBARINO', tag: 'VIN', role: 'NIMBLE',
      blurb: 'quick feet, tight turns, small target.',
      stats: { w: 22, h: 34, runAccel: 0.8, airAccel: 0.56, maxRun: 7.7,
               skidGround: 4, skidAir: 4.5, jumpSpeedBonus: 0.9 },
      sprite: { id: 'vinny-bobarino', x: 9, y: -1, w: 24, h: 40 },
    },
    // Added 2026-10-17. Each has a mechanic of his own rather than another
    // point on the speed-versus-jump line the first four already span.
    carl: {
      name: 'CARL SPATSKI', tag: 'CARL', role: 'SKATER',
      blurb: 'keeps rolling. slow to start, slow to turn.',
      stats: { w: 30, h: 34, groundFriction: 0.975, runAccel: 0.4, maxRun: 9.6,
               skidGround: 1.4, skidAir: 1.6, jumpSpeedBonus: 0.9 },
      sprite: { id: 'carl-spatski', x: 2, y: -1, w: 36, h: 43 },
    },
    harrison: {
      name: 'GROCERY HARRISON', tag: 'HARR', role: 'SURE-FOOTED',
      blurb: 'full grip on obsidian. big and heavy.',
      stats: { w: 28, h: 38, obsidianGrip: true, gravity: 0.6, maxFall: 19,
               jumpBase: 11.7, jumpSpeedBonus: 1.0, runAccel: 0.52, maxRun: 8.2 },
      sprite: { id: 'grocery-harrison', x: 8, y: -1, w: 28, h: 39 },
    },
    juanito: {
      name: 'JUANITO THOMPSON', tag: 'JUAN', role: 'VENT RIDER',
      blurb: 'fumaroles throw him high. plain jumps are weaker.',
      stats: { w: 24, h: 36, ventBoost: 1.4, jumpBase: 10.8, jumpSpeedBonus: 0.9 },
      sprite: { id: 'juanito-thompson', x: 10, y: -3, w: 26, h: 41 },
    },
    vince: {
      name: 'PRINCE VINCE', tag: 'VNCE', role: 'FLOATY',
      blurb: 'low gravity, long hang time. low top speed.',
      stats: { w: 24, h: 34, gravity: 0.46, maxFall: 12, jumpBase: 10.2,
               jumpSpeedBonus: 0.85, maxRun: 7.8, airAccel: 0.55 },
      sprite: { id: 'prince-vince', x: 7, y: 0, w: 26, h: 36 },
    },
  },

  TOWER: {
    gap: 72,              // vertical distance between floors
    thickness: 14,
    // Ledge width shrinks with depth into the climb. Clamped: a ledge too
    // narrow to land on is not hard, it is a wall.
    widthStart: 210,
    widthMin: 78,
    widthShrinkPerFloor: 0.9,
    // A full-width floor opens each chamber.
    chamberEvery: 50,
  },

  // The kinds of ledge. Odds are per band of `oddsEvery` floors, and the last
  // row holds for ever after.
  //   basalt    ordinary rock
  //   obsidian  volcanic glass: slick, the "ice" of this tower
  //   crust     cooling skin over magma: crumbles soon after you land
  //   fumarole  a gas vent: every so often it fires, and launches whoever
  //             is standing on it
  LEDGE: {
    oddsEvery: 20,
    odds: [
      { basalt: 1.00, obsidian: 0.00, crust: 0.00, fumarole: 0.00 },
      { basalt: 0.55, obsidian: 0.30, crust: 0.10, fumarole: 0.05 },
      { basalt: 0.40, obsidian: 0.30, crust: 0.20, fumarole: 0.10 },
      { basalt: 0.30, obsidian: 0.30, crust: 0.28, fumarole: 0.12 },
    ],
    obsidianAccel: 0.18,
    obsidianFriction: 0.988,
    crustFrames: 34,       // from first touch to collapse
    crustFallAccel: 0.5,
    fumarolePeriod: 170,
    fumaroleWarn: 50,      // frames of hiss before it fires
    fumaroleBurst: 10,     // frames it is firing for
    fumaroleLaunch: 21,    // vy on a launch
  },

  // The magma, which replaces Icy Tower's auto-scroll. It is the thing that
  // ends a run, so it is the one ramp allowed to keep climbing, and it is
  // still clamped: maxRise must stay below what plain single-floor jumping
  // sustains, or the game stops being hard and starts being unwinnable.
  // tools/sim.mjs measures that and fails if it stops being true.
  MAGMA: {
    startFloor: 4,        // starts rising once you have climbed this far
    startFrames: 360,     // ...or after this long, whichever is first
    riseStart: 0.38,
    risePerChamber: 0.16,
    risePerFloor: 0.0012,
    maxRise: 1.35,
    // Never more than this far below the bottom of the screen, so it is
    // always a threat rather than something you outran once.
    leash: 140,
  },

  // CRUNCH, this tower's combo. A jump that lands two or more floors up keeps
  // the chain alive; one that lands a single floor up, or the timer, ends it.
  // A chain of at least minJumps pays floors squared, as Icy Tower's does.
  CRUNCH: {
    minFloorsPerJump: 2,
    minJumps: 2,
    windowFrames: 180,
  },

  SCORE: {
    perFloor: 10,
  },

  SCORES: {
    game: 'caldera',
    tableSize: 10,
    storageProbeKey: 'caldera-probe',
  },

  // One palette per chamber; past the last, they cycle.
  CHAMBERS: [
    { name: 'BASALT VENT',   rock: '#2b2421', rock2: '#3d322c', glow: '#ff5a1f', sky: '#120b0a' },
    { name: 'OBSIDIAN FLOW', rock: '#17141f', rock2: '#28223a', glow: '#ff3d6e', sky: '#09070f' },
    { name: 'SULFUR SHELF',  rock: '#3a3416', rock2: '#575022', glow: '#ffd23f', sky: '#110f05' },
    { name: 'MANTLE PLUME',  rock: '#3a1414', rock2: '#5a1f1f', glow: '#ff2a00', sky: '#140404' },
    { name: 'THE CRUNCH',    rock: '#101010', rock2: '#262626', glow: '#ffffff', sky: '#050505' },
  ],
};
