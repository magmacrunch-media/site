// world.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// The cave network on one map, the camera, and the ways out.
//
// ONE MAP. Every tunnel has a start point and a direction on a single 2D map,
// and the diver and the camera live in that space, so nothing ever rotates.
// The MAIN LINE is the seven segments laid end to end (shafts down, squeezes
// right, the ascent up) with a rounded room at each corner. BRANCHES leave it
// through its walls as one or more straight legs (CONFIG.BRANCHES): dead ends,
// a loop that rejoins it, a hidden way out. An earlier version drew each
// tunnel in its own screen orientation and swapped pictures at boundaries,
// which read as the diver being teleported.
//
// ONE QUESTION. Whether a point is water is decided in exactly one place,
// cellAt(): inside a tunnel strip or a room or an exit alcove, not in a rock
// lump, not behind a rockfall. Collision asks it, and the terrain is drawn by
// asking it on a grid, so what you see is what you hit.
//
// LOCAL FRAMES. A tunnel's own coordinates are `s`, distance along it, and
// `c`, the cross position from 0 to its cross extent, with the low wall at
// small c. On the main line `s` is global, 0 at the entrance and DIVE_ALONG
// at the far side; a branch leg measures its own `s` from where it starts.
// The generator and the entities work in these, and local()/toWorld()
// convert.
//
// LINKS. Which tunnel the diver is in is decided by each tunnel's links: a
// corner between consecutive legs, or a wall junction where a branch leaves
// its host. Each is judged in one place with a little hysteresis; see
// buildLinks().

/* global CONFIG, SEGMENTS, Timeline, Renderer, lerp, smoothstep */

/** Seeded PRNG so the tests can drive the same cave twice. */
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const SLICE = 16;      // along spacing between passage samples

// Cell codes from cellAt().
const ROCK = 0, WATER = 1, SKY = 2;

const DIRS = {
    down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, left: { x: -1, y: 0 },
};

function World(seed) {
    this.reset(seed);
}

/** Wall normal and cross extent for a direction: n points low wall to high. */
function frameForDir(d) {
    return d.x !== 0
        ? { d, n: { x: 0, y: 1 }, X: CONFIG.CANVAS_H }
        : { d, n: { x: 1, y: 0 }, X: CONFIG.CANVAS_W };
}

World.prototype.reset = function (seed) {
    const sd = seed === undefined ? 12345 : seed;
    // Separate streams for the passage, its contents, and the dice the cave
    // rolls (whether a loop caves in). Sharing one would make each depend on
    // how many draws the others happened to take.
    this.rng = mulberry32(sd);
    this.entityRng = mulberry32((sd + 0x9e3779b9) | 0);
    this.fateRng = mulberry32((sd ^ 0x5bd1e995) | 0);

    this.tunnels = [];
    this.rooms = [];
    this.buildMainLine();
    this.mainCount = this.tunnels.length;
    this.buildBranches();
    this.buildExits();
    this.buildLinks();

    this.cur = 0;               // the tunnel the diver is in
    this.diverAlong = 0;        // along the MAIN line, for depth and pacing
    this.diverX = 0;
    this.diverY = 0;
    this.collapseFired = false;
    this.sealAlong = -Infinity; // nothing behind this along the collapse tunnel
    this.collapseK = SEGMENTS.findIndex((seg) => seg.collapse);
    this.plugs = [];            // rockfalls in branches, once they fall
    this.shake = 0;
    this.camX = 0;
    this.camY = 0;
    this.grid = null;
};

/** The seven main tunnels, end to end, with a room at every corner. */
World.prototype.buildMainLine = function () {
    let P = { x: 0, y: 0 };
    const last = SEGMENTS.length - 1;
    for (let k = 0; k < SEGMENTS.length; k++) {
        const seg = SEGMENTS[k];
        const d = seg.kind === 'squeeze' ? DIRS.right : seg.kind === 'ascent' ? DIRS.up : DIRS.down;
        const S = seg.at * CONFIG.DIVE_ALONG, E = Timeline.endOf(k) * CONFIG.DIVE_ALONG;
        const alcoves = CONFIG.EXITS.filter((e) => e.at > 0 && e.at < 1 &&
            Timeline.indexAt(e.at) === k).map((e) => e.at * CONFIG.DIVE_ALONG);
        const t = this.buildTunnel({
            seg: k, P, d, S, E, main: true, widthScale: 1, alcoves,
            start: k === 0 ? 'surface' : 'room', end: k === last ? 'surface' : 'room',
        });
        this.tunnels.push(t);
        if (k > 0) this.rooms.push({ x: P.x, y: P.y, r: CONFIG.ROOM_R });
        P = { x: P.x + d.x * (E - S), y: P.y + d.y * (E - S) };
    }
};

/**
 * The branches. Each leg is its own tunnel. A branch leaves its host at the
 * host's frame centerline and runs out through the high wall, so the two
 * strips overlap and the opening needs no special case; a small room rounds
 * the mouth.
 */
World.prototype.buildBranches = function () {
    this.branches = [];
    for (const spec of CONFIG.BRANCHES) {
        const host = this.tunnels[spec.host];
        const at = spec.at;
        let P = this.toWorld(spec.host, at, host.X / 2);
        const legs = [];
        for (let i = 0; i < spec.legs.length; i++) {
            const d = DIRS[spec.legs[i][0]];
            let len = spec.legs[i][1];
            const lastLeg = i === spec.legs.length - 1;
            // A loop's last leg runs until it meets its join host's centerline.
            if (lastLeg && spec.end && spec.end.join !== undefined) {
                const jh = this.tunnels[spec.end.join];
                len = (jh.P.x - P.x) * d.x + (jh.P.y - P.y) * d.y;
            }
            const start = i === 0 ? 'wall' : 'room';
            const end = !lastLeg ? 'room'
                : spec.end === 'dead' ? 'dead'
                : spec.end === 'exit' ? 'surface'
                : 'wall';
            const t = this.buildTunnel({
                seg: host.seg, P, d, S: 0, E: len, main: false,
                widthScale: CONFIG.BRANCH_WIDTH, alcoves: [], start, end,
                alongBase: at, branch: spec.id,
            });
            t.branchIndex = this.branches.length;
            t.leg = i;
            this.tunnels.push(t);
            legs.push(this.tunnels.length - 1);
            if (i === 0) {
                // The mouth, rounded, where the branch leaves the host's wall.
                const mouth = this.toWorld(spec.host, at, host.X / 2 + this.boundsAt(spec.host, at).half);
                this.rooms.push({ x: mouth.x, y: mouth.y, r: CONFIG.JUNCTION_ROOM_R });
            } else {
                this.rooms.push({ x: P.x, y: P.y, r: CONFIG.BRANCH_ROOM_R });
            }
            P = { x: P.x + d.x * len, y: P.y + d.y * len };
        }
        const b = { spec, legs, host: spec.host, at };
        if (spec.end && spec.end.join !== undefined) {
            const jh = this.tunnels[spec.end.join];
            b.join = spec.end.join;
            b.joinAt = jh.S + (P.x - jh.P.x) * jh.d.x + (P.y - jh.P.y) * jh.d.y;
            // The mouth at the far end, where the loop comes back in.
            const back = this.tunnels[legs[legs.length - 1]].d;
            const mouth = { x: P.x - back.x * this.boundsAt(b.join, b.joinAt).half,
                y: P.y - back.y * this.boundsAt(b.join, b.joinAt).half };
            this.rooms.push({ x: mouth.x, y: mouth.y, r: CONFIG.JUNCTION_ROOM_R });
        }
        // Whether this loop caves in behind a diver who enters it, decided now
        // so the same seed is the same cave.
        b.willFall = !!spec.rockfall && this.fateRng() < spec.rockfall;
        this.branches.push(b);
    }
};

/**
 * Build one tunnel's passage, from map point P in direction d.
 *
 * Half-widths are quoted against the 480px cross axis of a shaft and scaled
 * to the tunnel's own cross extent. An end that opens into a room widens into
 * a chamber and runs on a little past itself, tapering rounded; a 'surface'
 * end runs on into open air; a 'dead' end swells into a small chamber and
 * closes; a 'wall' end stops at the host's centerline, inside the host.
 */
World.prototype.buildTunnel = function (o) {
    const seg = SEGMENTS[o.seg];
    const f = frameForDir(o.d);
    const S = o.S, E = o.E;
    const over = CONFIG.TUNNEL_OVERHANG;
    const head = CONFIG.SURFACE_HEADROOM + SLICE * 2;
    const from = o.start === 'surface' ? S - head : o.start === 'room' ? S - over : S;
    const to = o.end === 'surface' ? E + head : o.end === 'room' ? E + over : E;
    const base = Timeline.passageWidth(seg) * (f.X / CONFIG.CANVAS_W) / 2 * o.widthScale;
    const room = f.X * 0.46 * (o.main ? 1 : 0.7);
    const J = CONFIG.JUNCTION_ALONG;
    const near = (d) => (d < J ? 1 - Math.max(0, d) / J : 0);
    const opens = (end) => end === 'room' || end === 'surface';
    const endTaper = (d) => Math.sqrt(Math.max(0, Math.min(1, d / 110)));

    let wander = 0, wanderV = 0;
    const phase = this.rng() * Math.PI * 2;
    // Branches wander less: they are short, and a branch that swung across
    // its own width would close at the mouth.
    const wobble = o.main ? 1 : 0.5;
    const slices = [];
    for (let s = from; s <= to; s += SLICE) {
        const t = smoothstep(Math.max(opens(o.start) ? near(s - S) : 0, opens(o.end) ? near(E - s) : 0));
        // Past a room end a tunnel only runs on into the room, and closes off
        // ROUNDED there rather than in a square cut.
        const taper = (o.start === 'room' ? endTaper(s - from) : 1) * (o.end === 'room' ? endTaper(to - s) : 1);
        let half = lerp(base, room, t) * taper;
        if (o.end === 'dead') {
            // A small chamber swells before the end, then the rock closes.
            const back = E - s;
            const swell = Math.exp(-((back - 60) * (back - 60)) / (2 * 40 * 40));
            half *= (1 + 0.55 * swell) * Math.sqrt(Math.max(0, Math.min(1, back / 34)));
        }
        // The centerline wanders as a damped random walk over a slow sine. The
        // sine alone is too regular to read as rock; the walk alone drifts
        // into a corner and stays there. Chambers pull it back to the middle,
        // which is also what makes adjoining tunnels meet in their rooms.
        wanderV += (this.rng() - 0.5) * 0.9;
        wanderV *= 0.86;
        wander += wanderV;
        const swing = Math.max(0, (f.X * 0.5 - half) * 0.8 * wobble);
        wander = Math.max(-swing, Math.min(swing, wander));
        const sine = Math.sin(phase + s * 0.006) * swing * 0.45;
        // Ends that join something else stay centred, so the strips meet.
        const pin = Math.max(t, o.start === 'wall' ? 1 - Math.min(1, (s - S) / 80) : 0,
            o.end === 'wall' ? 1 - Math.min(1, (E - s) / 80) : 0);
        let center = f.X / 2 + lerp(wander * 0.5 + sine, 0, pin);
        center = Math.max(half + 6, Math.min(f.X - half - 6, center));
        let lo = center - half;
        const hi = center + half;
        const wallLo = lo;
        // An exit is an alcove cut into the LOW wall, tapering at its edges.
        for (const a of o.alcoves) {
            const d = Math.abs(s - a);
            if (d < CONFIG.ALCOVE_HALF) {
                lo -= CONFIG.ALCOVE_DEPTH * Math.cos((d / CONFIG.ALCOVE_HALF) * Math.PI / 2);
            }
        }
        slices.push({ s, lo, hi, wallLo });
    }

    // The map-space box the tunnel can occupy, for cheap rejection.
    const ends = [
        this.mapPoint(o.P, f, S, from, 0), this.mapPoint(o.P, f, S, from, f.X),
        this.mapPoint(o.P, f, S, to, 0), this.mapPoint(o.P, f, S, to, f.X),
    ];
    const pad = CONFIG.ALCOVE_DEPTH + 4;
    const box = {
        x0: Math.min(...ends.map((p) => p.x)) - pad, x1: Math.max(...ends.map((p) => p.x)) + pad,
        y0: Math.min(...ends.map((p) => p.y)) - pad, y1: Math.max(...ends.map((p) => p.y)) + pad,
    };
    return {
        P: o.P, d: f.d, n: f.n, X: f.X, S, E, from, to, slices, rocks: [], box,
        seg: o.seg, main: o.main, start: o.start, end: o.end,
        alongBase: o.alongBase === undefined ? null : o.alongBase, branch: o.branch || null,
        links: [],
    };
};

/**
 * The ways out. The main exits from CONFIG.EXITS, then any branch that ends
 * at the surface. Each knows how it is reached: 'entrance' and 'far' by the
 * main line's waterlines, 'alcove' by an alcove in a main tunnel's wall,
 * 'spring' by the end of a branch.
 */
World.prototype.buildExits = function () {
    const last = this.mainCount - 1;
    this.exits = CONFIG.EXITS.map((e, i) => {
        const kind = e.at <= 0 ? 'entrance' : e.at >= 1 ? 'far' : 'alcove';
        const k = kind === 'entrance' ? 0 : kind === 'far' ? last : Timeline.indexAt(e.at);
        return { index: i, name: e.name, mult: e.mult, kind, k, s: e.at * CONFIG.DIVE_ALONG,
            along: e.at * CONFIG.DIVE_ALONG, main: true };
    });
    for (const b of this.branches) {
        if (b.spec.end !== 'exit') continue;
        const k = b.legs[b.legs.length - 1];
        this.exits.push({ index: this.exits.length, name: b.spec.exit.name, mult: b.spec.exit.mult,
            kind: 'spring', k, s: this.tunnels[k].E, along: b.at, main: false });
    }
};

/**
 * Links between tunnels, judged so that the diver is in exactly one tunnel
 * with a little hysteresis at every boundary.
 *
 * A CORNER is judged on the line that bisects it. The line the next tunnel
 * starts on is the wrong one: at a shaft that turns into a squeeze it is
 * vertical, so a diver swimming back UP the shaft never crossed it. A WALL
 * junction, where a branch leaves its host, is judged on how far out of the
 * host's middle the diver is, against the host's half-width there. Either way
 * the diver must also be inside the tunnel they would switch to, because a
 * frame runs on for ever and its line is crossed far away from the junction.
 */
World.prototype.buildLinks = function () {
    const M = 12;
    const T = this.tunnels;
    const corner = (from, to, P, a, b, sign) => {
        // a: direction of the tunnel ending at P, b: of the one starting there.
        const nx = a.x + b.x, ny = a.y + b.y, m = Math.hypot(nx, ny) || 1;
        T[from].links.push({ to, test: (x, y) => sign * (((x - P.x) * nx + (y - P.y) * ny) / m) > M });
    };
    const wall = (from, to, H, u, gate, outward) => {
        // u: unit direction out of the host into the branch; gate: host half-width.
        T[from].links.push({ to, test: (x, y) => {
            const out = (x - H.x) * u.x + (y - H.y) * u.y;
            return outward ? out > gate + M : out < gate - M;
        } });
    };
    for (let k = 1; k < this.mainCount; k++) {
        const P = T[k].P;
        corner(k - 1, k, P, T[k - 1].d, T[k].d, 1);
        corner(k, k - 1, P, T[k - 1].d, T[k].d, -1);
        T[k].prevMain = k - 1;
    }
    for (const b of this.branches) {
        const first = b.legs[0];
        const H = T[first].P;
        const gate = this.boundsAt(b.host, b.at).half * 0.7;
        wall(b.host, first, H, T[first].d, gate, true);
        wall(first, b.host, H, T[first].d, gate, false);
        for (let i = 1; i < b.legs.length; i++) {
            const k = b.legs[i];
            corner(b.legs[i - 1], k, T[k].P, T[b.legs[i - 1]].d, T[k].d, 1);
            corner(k, b.legs[i - 1], T[k].P, T[b.legs[i - 1]].d, T[k].d, -1);
        }
        if (b.join !== undefined) {
            const lastLeg = T[b.legs[b.legs.length - 1]];
            const J = { x: lastLeg.P.x + lastLeg.d.x * lastLeg.E, y: lastLeg.P.y + lastLeg.d.y * lastLeg.E };
            const u = { x: -lastLeg.d.x, y: -lastLeg.d.y };
            const gateJ = this.boundsAt(b.join, b.joinAt).half * 0.7;
            wall(b.join, b.legs[b.legs.length - 1], J, u, gateJ, true);
            wall(b.legs[b.legs.length - 1], b.join, J, u, gateJ, false);
        }
    }
};

/** Map point of along s, cross c in a tunnel with origin P and frame f. */
World.prototype.mapPoint = function (P, f, S, s, c) {
    const u = s - S, v = c - f.X / 2;
    return { x: P.x + f.d.x * u + f.n.x * v, y: P.y + f.d.y * u + f.n.y * v };
};

/** Map point of (s, c) in tunnel k. */
World.prototype.toWorld = function (k, s, c) {
    const t = this.tunnels[k];
    return this.mapPoint(t.P, t, t.S, s, c);
};

/** Tunnel k's local (s, c) of map point (x, y). */
World.prototype.local = function (k, x, y) {
    const t = this.tunnels[k];
    const dx = x - t.P.x, dy = y - t.P.y;
    return { s: t.S + dx * t.d.x + dy * t.d.y, c: t.X / 2 + dx * t.n.x + dy * t.n.y };
};

/** Passage bounds in tunnel k at along s, in that tunnel's cross units. */
World.prototype.boundsAt = function (k, s) {
    const sl = this.tunnels[k].slices;
    const i = Math.floor((s - sl[0].s) / SLICE);
    const a = sl[Math.max(0, Math.min(sl.length - 1, i))];
    const b = sl[Math.max(0, Math.min(sl.length - 1, i + 1))];
    const f = Math.max(0, Math.min(1, (s - a.s) / SLICE));
    const lo = lerp(a.lo, b.lo, f), hi = lerp(a.hi, b.hi, f);
    return { lo, hi, center: (lo + hi) / 2, half: (hi - lo) / 2, wallLo: lerp(a.wallLo, b.wallLo, f) };
};

/**
 * How far a rock lump stands out of its wall at along s. Rounded, thickest in
 * the middle and tapering to nothing at both ends, with a little irregularity
 * so no two read alike. A rectangle is what this replaced.
 */
function lumpDepth(r, s) {
    const t = (s - r.s) / r.len;
    if (t <= 0 || t >= 1) return 0;
    // A low power flattens the top into a mound; 0.65 read as a spike.
    const bulge = Math.pow(Math.sin(Math.PI * t), 0.42);
    const rough = 1 + 0.16 * Math.sin(t * 9.0 + r.seed) + 0.08 * Math.sin(t * 23.0 + r.seed * 2.1);
    return r.depth * bulge * rough;
}

/** The rock lump at (s, c) in tunnel k, or null. */
World.prototype.rockAt = function (k, s, c) {
    const rocks = this.tunnels[k].rocks;
    for (let i = 0; i < rocks.length; i++) {
        const r = rocks[i];
        if (s <= r.s || s >= r.s + r.len) continue;
        const b = this.boundsAt(k, s);
        const dep = lumpDepth(r, s);
        if (r.fromLo ? c < b.wallLo + dep : c > b.hi - dep) return r;
    }
    return null;
};

/** Is map point (x, y) inside tunnel k's passage, ignoring lumps? */
World.prototype.inStrip = function (k, x, y, slack) {
    const t = this.tunnels[k];
    const p = this.local(k, x, y);
    if (p.s < t.from || p.s > t.to) return false;
    const b = this.boundsAt(k, p.s);
    const m = slack === undefined ? 8 : slack;
    return p.c >= b.lo - m && p.c <= b.hi + m;
};

/**
 * THE question: what is at map point (x, y)? WATER, SKY (above a waterline)
 * or ROCK. `hit` is filled with the rock lump when it is a lump that answered.
 */
World.prototype.cellAt = function (x, y, hit) {
    // Behind the main collapse is rock, whatever was there.
    if (this.collapseFired) {
        const t = this.tunnels[this.collapseK];
        const u = (x - t.P.x) * t.d.x + (y - t.P.y) * t.d.y + t.S;
        // A rockfall, not a wall: its face is ragged across the passage. It
        // only ever reaches BACK from sealAlong, so the diver it is chasing is
        // never inside it.
        const v = (x - t.P.x) * t.n.x + (y - t.P.y) * t.n.y;
        const rag = 9 + 6 * Math.sin(v * 0.13) + 4 * Math.sin(v * 0.41 + 1.3);
        if (u < this.sealAlong - rag + 9) return ROCK;
    }
    // A loop that caved in: a plug of rubble across the branch near its mouth.
    for (const g of this.plugs) {
        const p = this.local(g.k, x, y);
        if (p.s > g.s0 && p.s < g.s1 && this.inStrip(g.k, x, y, 40)) return ROCK;
    }
    let water = false;
    for (let k = 0; k < this.tunnels.length && !water; k++) {
        const t = this.tunnels[k];
        if (x < t.box.x0 || x > t.box.x1 || y < t.box.y0 || y > t.box.y1) continue;
        const p = this.local(k, x, y);
        if (p.s < t.from || p.s > t.to) continue;
        const b = this.boundsAt(k, p.s);
        if (p.c < b.lo || p.c > b.hi) continue;
        // Past a surface end is open air.
        if ((t.start === 'surface' && p.s < t.S) || (t.end === 'surface' && p.s > t.E)) return SKY;
        const r = this.rockAt(k, p.s, p.c);
        if (r) { if (hit) hit.rock = r; return ROCK; }
        water = true;
    }
    if (!water) {
        for (const rm of this.rooms) {
            const dx = x - rm.x, dy = y - rm.y;
            if (dx * dx + dy * dy < rm.r * rm.r) { water = true; break; }
        }
    }
    return water ? WATER : ROCK;
};

/** How much of the diver's body, a cross of five points, is in water: 0..5. */
World.prototype.wetness = function (x, y, hit) {
    const r = CONFIG.PLAYER_RADIUS;
    return (this.cellAt(x, y, hit) === WATER) + (this.cellAt(x - r, y, hit) === WATER) +
        (this.cellAt(x + r, y, hit) === WATER) + (this.cellAt(x, y - r, hit) === WATER) +
        (this.cellAt(x, y + r, hit) === WATER);
};

/** Is the diver's body entirely in water? */
World.prototype.fits = function (x, y, hit) {
    return this.wetness(x, y, hit) === 5;
};

/**
 * Resolve the diver's move from (ox, oy) to where Player.update put them.
 * Slides along whatever blocks them, one axis at a time, and zeroes the
 * velocity that ran into it. Returns { wall, rock } for what was touched.
 *
 * It must never be able to TRAP the diver. If they are already partly in
 * rock, every candidate fails fits() including staying put, and an earlier
 * version left a diver pinned to a wall for the rest of the dive. So an
 * embedded diver may take any move that leaves more of them in water.
 */
World.prototype.move = function (player, ox, oy) {
    const hit = { rock: null };
    const nx = player.x, ny = player.y;
    if (this.fits(nx, ny, hit)) return { wall: false, rock: null };
    // Rock hurts when you HIT it, not when you touch it. Billing every
    // contact charged a diver resting against a lump, or sliding along one,
    // six air a quarter-second: fifteen hits in thirteen seconds.
    const impact = Math.hypot(player.vx, player.vy) >= CONFIG.HIT_SPEED;
    let rx = ox, ry = oy;
    // An axis slide counts only if it carries a real share of the move. A
    // diver moving along a wall has next to no motion on the other axis, so
    // "slide on that axis" was a move of almost nothing that trivially fit:
    // it was taken every frame, zeroed the forward speed, and the diver
    // stood still against the wall for good. A tolerance of 1e-6 did not
    // help; the drift there is a few hundred-thousandths of a pixel.
    const share = 0.3 * Math.hypot(nx - ox, ny - oy);
    if (Math.abs(nx - ox) >= share && this.fits(nx, oy)) { rx = nx; player.vy = 0; }
    else if (Math.abs(ny - oy) >= share && this.fits(ox, ny)) { ry = ny; player.vx = 0; }
    else if (this.glide(player, nx, ny, ox, oy)) { rx = player.x; ry = player.y; }
    else {
        const was = this.wetness(ox, oy);
        let best = was;
        for (const [cx, cy] of [[nx, ny], [nx, oy], [ox, ny]]) {
            const w = this.wetness(cx, cy);
            if (w > best) { best = w; rx = cx; ry = cy; }
        }
        if (best === was) { player.vx = 0; player.vy = 0; }
    }
    player.x = rx; player.y = ry;
    return { wall: true, rock: impact ? hit.rock : null };
};

/**
 * Slide along a SLOPED wall. The axis slides above only work against a wall
 * square to the screen; against one that narrows slowly, each step forward
 * pushed the body a tenth of a pixel into rock, both slides failed, and the
 * diver stuck there. So also try stepping a pixel or two off the wall, either
 * side, keeping whichever axis carries the most of the move. Leaves the
 * diver at the result and returns true, or returns false.
 */
World.prototype.glide = function (player, nx, ny, ox, oy) {
    const mx = Math.abs(nx - ox) >= Math.abs(ny - oy);
    for (const d of [1, 2]) {
        for (const sgn of [-1, 1]) {
            const cx = mx ? nx : ox + sgn * d, cy = mx ? oy + sgn * d : ny;
            if (this.fits(cx, cy)) {
                player.x = cx; player.y = cy;
                if (mx) player.vy = 0; else player.vx = 0;
                return true;
            }
        }
    }
    return false;
};

/**
 * Keep track of which tunnel the diver is in and how far down the main line
 * that counts as, and run the rockfalls: the main collapse, which comes down
 * behind the diver on entering NO WAY BACK and chases them up it, and a
 * loop's cave-in, which fills its mouth behind a diver who went in from the
 * main line.
 */
World.prototype.track = function (player, dt, sfx) {
    const from = this.cur;
    for (const l of this.tunnels[from].links) {
        if (this.collapseFired && from === this.collapseK && l.to === this.collapseK - 1) continue;
        if (l.test(player.x, player.y) && this.inStrip(l.to, player.x, player.y)) {
            this.cur = l.to;
            break;
        }
    }
    const t = this.tunnels[this.cur];
    const p = this.local(this.cur, player.x, player.y);
    // On the main line `s` is the depth; in a branch, the depth of its mouth.
    this.diverAlong = t.main ? p.s : t.alongBase;
    this.diverX = player.x;
    this.diverY = player.y;

    // A loop caves in behind a diver who came into it from the main line.
    if (this.cur !== from && !t.main && t.leg === 0) {
        const b = this.branches[t.branchIndex];
        if (this.tunnels[from].main && from === b.host) b.enteredFromHost = true;
    }
    for (const b of this.branches) {
        if (!b.willFall || b.fallen || !b.enteredFromHost) continue;
        const k = b.legs[0];
        if (this.cur !== k) continue;
        const gate = this.boundsAt(b.host, b.at).half;
        if (p.s > gate + 60) {
            b.fallen = true;
            this.plugs.push({ k, s0: gate + 4, s1: gate + 34 });
            this.shake = 30;
            if (sfx) sfx.collapse();
        }
    }

    if (this.cur === this.collapseK && !this.collapseFired) {
        this.collapseFired = true;
        this.shake = 46;
        // The rockfall comes down just BEHIND the diver, wherever they are.
        this.sealAlong = p.s - 2;
        if (sfx) sfx.collapse();
    }
    if (this.collapseFired) {
        const ct = this.tunnels[this.collapseK];
        const creep = SEGMENTS[this.collapseK].creep || 0;
        // It chases only up its own tunnel, and gives up at the far room.
        if (this.cur === this.collapseK && this.sealAlong < ct.E - CONFIG.JUNCTION_ALONG) {
            this.sealAlong += creep * dt;
        }
        const pc = this.local(this.collapseK, player.x, player.y);
        const gap = pc.s - this.sealAlong - CONFIG.PLAYER_RADIUS - 2;
        if (gap < 0 && this.cur === this.collapseK) {
            player.x -= ct.d.x * gap;
            player.y -= ct.d.y * gap;
            this.diverAlong -= gap;
        }
    }
};

/** How far behind the diver the collapse's rubble is, px, or undefined. */
World.prototype.chaseGap = function (player) {
    if (!this.collapseFired || this.cur !== this.collapseK) return undefined;
    return this.local(this.collapseK, player.x, player.y).s - this.sealAlong;
};

/** How far down the cave the diver is, 0..1. Depth on the HUD. */
World.prototype.progress = function () {
    return Math.max(0, Math.min(1, this.diverAlong / CONFIG.DIVE_ALONG));
};

/** The segment the diver is in: a branch takes its host's. */
World.prototype.segment = function () { return SEGMENTS[this.tunnels[this.cur].seg]; };

/** Per frame: the rockfalls' shake decays. */
World.prototype.update = function (dt) {
    if (this.shake > 0) this.shake -= dt;
};

/**
 * The camera looks a little ahead of the diver in the direction they face,
 * eases there rather than snapping, and never lets them near the screen's
 * edge. It is a plain pan over the map: there is nothing to rotate.
 */
World.prototype.camera = function (player, dt, snap) {
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    const tx = player.x + player.fx * W * CONFIG.CAMERA_LOOK - W / 2;
    const ty = player.y + player.fy * H * CONFIG.CAMERA_LOOK - H / 2;
    const k = snap ? 1 : 1 - Math.exp(-dt / CONFIG.CAMERA_EASE);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    const bx = W * CONFIG.CAMERA_BAND, by = H * CONFIG.CAMERA_BAND;
    this.camX = Math.max(player.x - (W - bx), Math.min(player.x - bx, this.camX));
    this.camY = Math.max(player.y - (H - by), Math.min(player.y - by, this.camY));
};

/** Map point to screen. */
World.prototype.toScreen = function (x, y) {
    return { x: x - this.camX, y: y - this.camY };
};

/** Tunnel-local point to screen. */
World.prototype.localToScreen = function (k, s, c) {
    const p = this.toWorld(k, s, c);
    return { x: p.x - this.camX, y: p.y - this.camY };
};

/** Is map point (x, y) within `r` of the diver? */
World.prototype.nearDiver = function (x, y, r) {
    return Math.abs(x - this.diverX) < r && Math.abs(y - this.diverY) < r;
};

/**
 * The exit the diver is in, or -1. The waterlines are reached by swimming up
 * to them; an alcove by swimming into it, past where the wall would be.
 */
World.prototype.exitAt = function (player) {
    for (const e of this.exits) {
        if (e.kind === 'alcove') {
            if (this.cur !== e.k) continue;
            const p = this.local(e.k, player.x, player.y);
            if (Math.abs(p.s - e.s) > CONFIG.ALCOVE_HALF * 0.6) continue;
            if (p.c < this.boundsAt(e.k, p.s).wallLo - CONFIG.ALCOVE_DEPTH * 0.55) return e.index;
            continue;
        }
        if (this.cur !== e.k) continue;
        const p = this.local(e.k, player.x, player.y);
        if (e.kind === 'entrance' && p.s <= CONFIG.SURFACE_REACH) return e.index;
        if ((e.kind === 'far' || e.kind === 'spring') && p.s >= this.tunnels[e.k].E - CONFIG.SURFACE_REACH) return e.index;
    }
    return -1;
};

/** Put the diver back in the water just inside exit i, to dive on. */
World.prototype.placeAtExit = function (i, player) {
    const e = this.exits[i];
    const t = this.tunnels[e.k];
    let s, c;
    if (e.kind === 'entrance') { s = CONFIG.SURFACE_REACH + 16; c = this.boundsAt(e.k, s).center; }
    else if (e.kind === 'alcove') { s = e.s; c = this.boundsAt(e.k, s).wallLo + 10; }
    else { s = t.E - CONFIG.SURFACE_REACH - 16; c = this.boundsAt(e.k, s).center; }
    const p = this.toWorld(e.k, s, c);
    player.x = p.x; player.y = p.y;
    player.vx = 0; player.vy = 0;
    this.cur = e.k;
    this.diverAlong = t.main ? s : t.alongBase;
    this.diverX = p.x; this.diverY = p.y;
    this.camera(player, 1, true);
};

/** Lights the mask should punch for the ways out: daylight in the water. */
World.prototype.lights = function () {
    const out = [];
    for (const e of this.exits) {
        const t = this.tunnels[e.k];
        const sAt = e.kind === 'entrance' ? 0 : e.kind === 'alcove' ? e.s : t.E;
        const w = this.toWorld(e.k, sAt, t.X / 2);
        if (!this.nearDiver(w.x, w.y, 760)) continue;
        if (e.kind === 'alcove') {
            const sc = this.localToScreen(e.k, e.s, this.boundsAt(e.k, e.s).lo + 4);
            out.push({ x: sc.x, y: sc.y, r: 46, a: 0.75 });
            continue;
        }
        for (let c = 30; c < t.X; c += 70) {
            const sc = this.localToScreen(e.k, sAt, c);
            out.push({ x: sc.x, y: sc.y, r: 80, a: 0.85 });
        }
    }
    return out;
};

// ── Drawing ───────────────────────────────────────────────────────────

/**
 * The terrain, drawn by asking cellAt() on a grid of CELL-px squares locked
 * to the map, so the walls keep the stepped pixel look and do not shimmer as
 * the camera pans. Rock touching water is lit; rock far from it is deep.
 */
World.prototype.draw = function (ctx, t) {
    const C = CONFIG.COLORS;
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H, N = CONFIG.CELL;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.water);
    g.addColorStop(1, C.waterDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const gx0 = Math.floor(this.camX / N) - 1, gy0 = Math.floor(this.camY / N) - 1;
    const cols = Math.ceil(W / N) + 3, rows = Math.ceil(H / N) + 3;
    if (!this.grid || this.grid.length !== cols * rows) this.grid = new Uint8Array(cols * rows);
    const grid = this.grid;
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            grid[j * cols + i] = this.cellAt((gx0 + i + 0.5) * N, (gy0 + j + 0.5) * N);
        }
    }
    const at = (i, j) => (i < 0 || j < 0 || i >= cols || j >= rows ? ROCK : grid[j * cols + i]);
    // Each cell's paint: 0 nothing (water), 1 deep rock, 2 rock, 3 lit edge,
    // 4 sky. Drawn as horizontal RUNS of one paint, one fillRect each: a
    // rect per cell was about 5000 draw calls a frame, which is the part a
    // phone pays for, where the cell tests themselves cost ~1.3ms.
    const paints = [null, C.rockDeep, C.rock, C.rockLit, '#2c7a86'];
    const paintOf = (i, j) => {
        const v = grid[j * cols + i];
        if (v === SKY) return 4;
        if (v === WATER) return 0;
        let edge = false, deep = true;
        for (let dj = -3; dj <= 3 && (deep || !edge); dj++) {
            for (let di = -3; di <= 3; di++) {
                if (at(i + di, j + dj) === WATER) {
                    deep = false;
                    if (Math.abs(di) <= 1 && Math.abs(dj) <= 1) edge = true;
                }
            }
        }
        return edge ? 3 : deep ? 1 : 2;
    };
    let current = -1;
    for (let j = 0; j < rows; j++) {
        const sy = Math.round((gy0 + j) * N - this.camY);
        let i = 0;
        while (i < cols) {
            const pnt = paintOf(i, j);
            let end = i + 1;
            while (end < cols && paintOf(end, j) === pnt) end++;
            if (pnt) {
                if (pnt !== current) { ctx.fillStyle = paints[pnt]; current = pnt; }
                const sx = Math.round((gx0 + i) * N - this.camX);
                ctx.fillRect(sx, sy, (end - i) * N, N);
            }
            i = end;
        }
    }

    // The waterlines: the entrance, the far side, any hidden spring.
    ctx.fillStyle = 'rgba(200,245,245,0.8)';
    for (const e of this.exits) {
        if (e.kind === 'alcove') continue;
        const tn = this.tunnels[e.k];
        const s = e.kind === 'entrance' ? 0 : tn.E;
        const b = this.boundsAt(e.k, s);
        for (let c = b.lo; c < b.hi; c += 2) {
            const p = this.localToScreen(e.k, s, c);
            if (p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) continue;
            const wave = Math.round(Math.sin(c * 0.05 + t * 0.04) * 1.5);
            ctx.fillRect(Math.round(p.x), Math.round(p.y) + wave * Math.abs(tn.d.y), 2, 1);
        }
    }

    // Alcove chimneys: daylight cut up through the rock above each one.
    for (const e of this.exits) {
        if (e.kind !== 'alcove' || !this.nearAlcove(e)) continue;
        this.chimney(ctx, e, 'rgba(120,210,215,0.55)', 'rgba(220,250,245,0.95)', false);
    }
};

World.prototype.nearAlcove = function (e) {
    const w = this.toWorld(e.k, e.s, this.tunnels[e.k].X / 2);
    return this.nearDiver(w.x, w.y, 700);
};

/** The quad of daylight from an alcove's mouth back to the open sky. */
World.prototype.chimney = function (ctx, e, inner, outer, additive) {
    const lo = this.boundsAt(e.k, e.s).lo;
    const w = 9;
    const a = this.localToScreen(e.k, e.s - w, lo), b = this.localToScreen(e.k, e.s + w, lo);
    const c = this.localToScreen(e.k, e.s + w, lo - 400), d = this.localToScreen(e.k, e.s - w, lo - 400);
    const g = ctx.createLinearGradient(a.x, a.y, d.x, d.y);
    g.addColorStop(0, inner);
    g.addColorStop(0.3, outer);
    g.addColorStop(1, outer);
    ctx.save();
    if (additive) ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};

/**
 * Daylight, drawn AFTER the darkness mask. Seeing light in the dark is how a
 * diver finds a way out, so an exit must not depend on the lamp to be seen:
 * a shaft falling from the opening and widening as it goes, and a glow at the
 * mouth, both visible well beyond the lamp. A hidden spring glows at its
 * waterline the same way, so a diver passing its branch can see light down it.
 */
World.prototype.drawDaylight = function (ctx, t) {
    for (const e of this.exits) {
        const flicker = 0.85 + 0.15 * Math.sin(t * 0.05 + e.index * 1.7);
        if (e.kind === 'spring') {
            const tn = this.tunnels[e.k];
            const w = this.toWorld(e.k, tn.E, tn.X / 2);
            if (!this.nearDiver(w.x, w.y, 760)) continue;
            const sc = this.toScreen(w.x, w.y);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            Renderer.glow(ctx, sc.x, sc.y, 120, '120,220,220', 0.3 * flicker);
            ctx.restore();
            continue;
        }
        if (e.kind !== 'alcove' || !this.nearAlcove(e)) continue;
        this.chimney(ctx, e, 'rgba(120,210,215,' + (0.25 * flicker).toFixed(3) + ')',
            'rgba(230,255,250,' + (0.6 * flicker).toFixed(3) + ')', true);
        const lo = this.boundsAt(e.k, e.s).lo;
        const reach = 110, w = 9;
        const p0 = this.localToScreen(e.k, e.s - w, lo), p1 = this.localToScreen(e.k, e.s + w, lo);
        const p2 = this.localToScreen(e.k, e.s + w + 22, lo + reach);
        const p3 = this.localToScreen(e.k, e.s - w - 22, lo + reach);
        const mid0 = this.localToScreen(e.k, e.s, lo), mid1 = this.localToScreen(e.k, e.s, lo + reach);
        const sg = ctx.createLinearGradient(mid0.x, mid0.y, mid1.x, mid1.y);
        sg.addColorStop(0, 'rgba(170,240,235,' + (0.34 * flicker).toFixed(3) + ')');
        sg.addColorStop(1, 'rgba(170,240,235,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        const mouth = this.localToScreen(e.k, e.s, lo + 10);
        Renderer.glow(ctx, mouth.x, mouth.y, 70, '120,220,220', 0.3 * flicker);
        ctx.restore();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { World, mulberry32, SLICE, lumpDepth, ROCK, WATER, SKY };
}
