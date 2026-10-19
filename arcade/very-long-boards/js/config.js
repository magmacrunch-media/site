const CONFIG = {
    TURN_SPEED: 4.0,

    // ── The road ──
    // The course descends at a constant grade with rolling sine terms over it.
    // terrain.js builds hillAt() from this, and the terminal speeds below are
    // derived from the same number, so making the road steeper really does make
    // the ride faster instead of only looking different.
    GRADE: 0.06,

    // ── Ride physics ──
    //
    // You never reach a top speed here; you settle at one. Each frame the hill
    // adds GRADE * SLOPE_ACCEL and drag takes back a fraction DRAG of whatever
    // you already have, so speed converges on grade*accel/drag and stays there.
    // SPEED_RAIL is a safety clamp against a pathological slope, NOT a target -
    // nothing in normal play comes near it.
    //
    // This used to be a cap of 18 * multipliers * 0.25, i.e. 4.5 for the
    // baseline pairing, against a settling speed of 1.2. The cap never bound, so
    // scaling it by a rider's speedMult changed nothing about how fast that
    // rider went. SPD is bought with DRAG now, which is the term that actually
    // decides the answer.
    // Longest frame the physics will integrate in one go, in seconds. Every
    // per-frame term scales by dt*60, so an unbounded frame scales them without
    // bound: a tab left in the background and pumped once produced a 28-SECOND
    // frame here, and pow(1 - DRAG, 1684) shed the rider's entire speed between
    // one render and the next. A GC hitch or a slow asset load is the same event
    // three orders of magnitude smaller, and still visible. Three frames' worth
    // is enough to ride out a stutter and short enough that the worst case is a
    // barely perceptible skip.
    MAX_FRAME: 0.05,

    SLOPE_ACCEL: 0.06,
    DRAG: 0.003,
    BRAKE_DRAG: 0.03,
    KICK_SPEED: 0.15,
    SPEED_RAIL: 2.6,

    // World units per hour-ish, for the HUD. Chosen so the baseline pairing
    // reads about 45 and the fastest about 68, which is what a longboard on a
    // New Hampshire hill actually does. It read "5" before.
    SPEED_DISPLAY_FACTOR: 38,

    // Stability drains while you hold a line and refills when you carve.
    // DECAY is per frame at 60fps, before the (0.2 + speedFactor) term and the
    // rider's own stabilityMult. Halved from 0.4 when speedFactor stopped being
    // measured against each rider's own ceiling - see player.js - which raised
    // the term it multiplies and would otherwise have doubled everyone's drain.
    STABILITY_DECAY: 0.195,
    STABILITY_MAX: 100,
    STABILITY_WOBBLE_AT: 55,
    STABILITY_BAIL_AT: 0,

    // ── Carving ──
    //
    // The refill is paid for SIDEWAYS DISTANCE ACTUALLY TRAVELLED, not for a key
    // being down. It used to be a flat 6 per frame whenever left or right was
    // held, which made a 120 ms tap worth ~40 points and made holding one key
    // worth a full meter for ever - including pinned against the edge of the
    // road, where Carl is not moving sideways at all.
    //
    // CARVE_GAIN is stability per world unit of lateral travel, before the
    // speed and turn-rate terms in player.js. A carve also goes stale: the
    // refill fades to nothing over CARVE_FRESH_SECS of turning the same way, so
    // a carve means swinging back, not leaning into one long arc.
    //
    // Measured by stepping the physics at 60 fps with no hazards, swinging in
    // 1.2 s phases and carving for some fraction of each: Office Carl on a
    // Standard holds with about a third of the time spent carving, Office Carl on
    // Old School with a quarter, Party Carl on a Cruiser needs about half. Riding
    // dead straight bails in 13 to 21 s depending on the pairing.
    CARVE_GAIN: 10,
    CARVE_FRESH_SECS: 1.2,

    COUNTDOWN_SECS: 3,

    // ── Obstacles ──
    //
    // Distances are world units along the road. The gap between hazards closes
    // from GAP_START to GAP_END over RAMP_DIST and then holds, so the run gets
    // harder the further you go instead of staying flat for ever. Hazards spawn
    // across the full rideable width (SPAWN_HALF_W, matching the rider's own
    // clamp in player.js), so there is no lane at the edge they cannot reach.
    OBS_FIRST: 60,
    OBS_GAP_START: 60,
    OBS_GAP_END: 22,
    OBS_GAP_JITTER: 24,
    OBS_RAMP_DIST: 3000,
    OBS_PAIR_FROM: 800,       // from here on some hazards come in pairs
    OBS_PAIR_CHANCE_MAX: 0.45,
    OBS_SPAWN_HALF_W: 3.4,
    RIDE_HALF_W: 3.5,

    // Small hazards (pinecones, sticks, puddles) are a stumble, not a wipeout:
    // they knock this much off the balance meter and give a moment's grace.
    STUMBLE_COST: 40,
    STUMBLE_GRACE_FRAMES: 45,

    // ── Tricks ──
    // An ollie lifts Carl clear of anything on the road for the middle of its
    // arc, and costs balance to land. That is the whole trade: points and a way
    // over a hazard, paid for out of the same meter carving fills.
    TRICK_POINTS: 200,
    TRICK_FRAMES: 26,
    TRICK_COST: 14,
    NEAR_MISS_POINTS: 75,
};

const CHARACTERS = {
    'office-carl': {
        name: 'OFFICE CARL',
        desc: 'the everyman',
        speedMult: 1.0,
        handlingMult: 1.0,
        trickMult: 1.0,
        stabilityMult: 1.0,
        hitbox: { w: 40, h: 60 },
        trail: 'dust',
        colors: {
            shirt: [0.6, 0.2, 0.2],
            hair: [0.35, 0.22, 0.12],
            skin: [0.92, 0.82, 0.64],
            pants: [0.2, 0.22, 0.28],
        },
    },
    'party-carl': {
        name: 'PARTY CARL',
        desc: 'the maniac',
        speedMult: 1.3,
        handlingMult: 0.75,
        trickMult: 1.5,
        stabilityMult: 0.85,
        hitbox: { w: 36, h: 54 },
        trail: 'sparkle',
        colors: {
            shirt: [0.9, 0.2, 0.8],
            hair: [0.9, 0.85, 0.3],
            skin: [0.92, 0.82, 0.64],
            pants: [0.3, 0.1, 0.4],
        },
    },
    'dark-carl': {
        name: 'DARK CARL',
        desc: 'the enigma',
        speedMult: 1.2,
        handlingMult: 0.85,
        trickMult: 2.0,
        stabilityMult: 0.9,
        hitbox: { w: 38, h: 56 },
        trail: 'shadow',
        colors: {
            shirt: [0.15, 0.1, 0.25],
            hair: [0.1, 0.1, 0.15],
            skin: [0.85, 0.75, 0.6],
            pants: [0.1, 0.1, 0.12],
        },
    },
};

const BOARDS = {
    'standard': {
        name: 'STANDARD',
        desc: 'the classic',
        speedMult: 1.0,
        handlingMult: 1.0,
        stabilityMult: 1.0,
        deckColor: [0.5, 0.25, 0.06],
        gripColor: [0.22, 0.22, 0.22],
    },
    'cruiser': {
        name: 'CRUISER',
        desc: 'fast & loose',
        speedMult: 1.15,
        handlingMult: 0.85,
        stabilityMult: 0.9,
        deckColor: [0.8, 0.1, 0.1],
        gripColor: [0.18, 0.18, 0.18],
    },
    'carver': {
        name: 'CARVER',
        desc: 'tight turns',
        speedMult: 0.9,
        handlingMult: 1.25,
        stabilityMult: 1.0,
        deckColor: [0.1, 0.5, 0.8],
        gripColor: [0.2, 0.2, 0.2],
    },
    'old-school': {
        name: 'OLD SCHOOL',
        desc: 'steady & stable',
        speedMult: 0.85,
        handlingMult: 0.95,
        stabilityMult: 1.25,
        deckColor: [0.6, 0.5, 0.1],
        gripColor: [0.25, 0.25, 0.2],
    },
};

// ═══════════════════════════════════════════════
//  DERIVED
// ═══════════════════════════════════════════════

/**
 * Where a pairing settles: the hill's acceleration against its own drag.
 *
 * Uses the road's constant grade and ignores the sine terms rolling over it, so
 * the real speed breathes a little either side of this. It is a yardstick, not a
 * promise.
 */
CONFIG.terminalSpeedFor = function (speedMult) {
    return (CONFIG.GRADE * CONFIG.SLOPE_ACCEL) / (CONFIG.DRAG / speedMult);
};

/**
 * The fastest pairing in the game, and the yardstick every "how fast is this"
 * question is measured against - the stability drain, and the audio mix.
 *
 * Derived rather than written down, so adding a quicker board re-scales
 * everything that reads it instead of quietly pinning them all at full.
 */
CONFIG.REFERENCE_SPEED = CONFIG.terminalSpeedFor(
    Math.max.apply(null, Object.keys(CHARACTERS).map((k) => CHARACTERS[k].speedMult)) *
    Math.max.apply(null, Object.keys(BOARDS).map((k) => BOARDS[k].speedMult))
);
