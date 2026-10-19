// config.js -- the one global, and every tuning number in the game.
//
// Classic scripts sharing `GH`, not ES modules, the same arrangement as
// CALDERA: every file after this one extends GH, and tools/sim.mjs loads the
// logic files into a bare context in the same order the page does.
//
// Units are pixels and FRAMES at a fixed GH.TICK_FPS, so a frame is 1/60 s
// everywhere. World coordinates: x runs along the aisle, y down the screen,
// and the camera only ever scrolls sideways.
//
// If you are about to write a literal into another file, put it here instead.

const GH = {
  W: 640,
  H: 480,
  TICK_FPS: 60,

  // ---- Harrison, at the size of a cornflake ------------------------------
  // Side-scroller physics, set rather than accelerated, with a variable
  // jump: let go early and the rise is cut. Carrying something big costs
  // speed and height, and tools/sim.mjs proves every step of the level's
  // ROUTE is still makeable while carrying it.
  PLAYER: {
    w: 24,
    h: 36,
    run: 2.6,
    runCarrying: 2.2,
    jumpV: 8.4,
    jumpVCarrying: 7.4,
    jumpCut: 3.0,            // releasing jump caps the rise at this speed
    gravity: 0.45,
    maxFall: 10,
    coyote: 6,               // frames a jump is still allowed after leaving an edge
    buffer: 6,               // a jump pressed this close to landing still fires
    hearts: 3,
    invuln: 90,
    knock: 14,               // frames of knockback after a hit, no control
    stompBounce: 6.5,
    talkReach: 44,           // how close to an NPC the action key talks
  },

  // Sugar dune: the floor is sticky there.
  STICKY: { run: 0.5, jump: 0.8 },

  // Butter: ice underfoot. Speed eases towards what the keys ask for by
  // this share a frame, so starting, stopping and turning all slide.
  SLICK: { grip: 0.08 },

  // ---- The guitar ----------------------------------------------------------
  STRUM: {
    radius: 110,
    frames: 30,              // the ring on screen
    cooldown: 120,
  },

  // ---- Foes ----------------------------------------------------------------
  // The patrollers: a weevil in cereal, a soured curd in dairy. Each walks
  // one stretch of one surface. Stomp it or strum at it and it is out for
  // `stun` frames.
  WEEVIL: {
    w: 26,
    h: 18,
    speed: 0.9,
    stun: 240,
  },
  // The cheese wheel: rolls end to end of its stretch, hurts from the side,
  // bounces you off its top, and is far too big to care about a strum.
  WHEEL: {
    r: 22,
    bounce: 8.6,
  },

  // ---- The flake fall --------------------------------------------------------
  // A split box overhead sheds cornflakes that drift down and can be ridden.
  // Seeded, so a seed replays the same fall.
  FLAKEFALL: {
    every: 70,               // frames between flakes
    vy: 0.7,
    w: 54,
  },

  // ---- Things carried and found ----------------------------------------------
  ITEM: { w: 30, h: 30, regrab: 40 },   // frames after a drop before it can be picked up
  SUGAR: { w: 10, h: 12 },

  CAMERA: { lead: 0.4, ease: 0.12 },

  // ---- Produce ---------------------------------------------------------------
  // Herb vines: hold jump to climb, let go to slide down, left or right to
  // hop off. Grabbed by jumping into one with jump held.
  VINE: {
    grab: 12,                // px from the stem that counts as touching it
    climb: 2.0,
    climbCarrying: 1.6,
    slide: 1.2,              // down, when nothing is held
    slideFast: 3.0,          // down, holding down
    hop: 4.5,                // the hop off sideways
    cool: 14,                // frames after letting go before it grabs again
  },
  // Fruit flies hover: they patrol x0 to x1 and bob `amp` px round their y.
  // A real one is about 3 mm, so 5 px at this scale; 13 px keeps it a
  // fair thing to see and stomp while still small beside Harrison.
  FLY: { w: 13, h: 9, speed: 1.1, bob: 0.06 },

  // ---- The MAGMA CRUNCH secret (bowl.js) -------------------------------------
  MAGMA: {
    spring: 11.5,            // a jump from a star, carrying or not
    sinkRate: 0.5,           // px per frame a lava rock sinks under him
    riseRate: 0.3,           // and rises again once he is off it
    sinkMax: 30,             // sunk this far, it is under the milk
    pourEvery: 150,          // frames, give or take, between poured loops
    drift: 0.35,             // how fast a poured loop drifts across
  },
};

// mulberry32. Nothing in the logic uses Math.random, so a seed replays a run
// exactly; render.js may use it for effects that never feed back.
GH.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
