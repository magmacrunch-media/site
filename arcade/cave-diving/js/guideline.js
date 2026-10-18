// guideline.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// The line a cave diver runs from the entrance, and follows home.
//
// It is laid for you as you swim: a point every LINE_STEP of new water,
// joined to wherever you last were on it, so it grows as a tree rooted at the
// entrance and every strand leads back there. Swimming along line you have
// already laid lays nothing. It is pale, lit by the lamp like everything
// else, and faintly visible close by even in the dark.
//
// Rockfalls bury it. Past NO WAY BACK the line home is under the rubble, and
// that is the point: the one thing that would have got you out is gone.

/* global CONFIG */

function Guideline() {
    this.reset();
}

Guideline.prototype.reset = function (x, y) {
    this.pts = [];
    this.segs = [];
    this.last = -1;
    if (x !== undefined) {
        this.pts.push({ x, y, dead: false });
        this.last = 0;
    }
};

/** Index of the live point nearest (x, y), and its distance. */
Guideline.prototype.nearest = function (x, y) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < this.pts.length; i++) {
        const p = this.pts[i];
        if (p.dead) continue;
        const d = Math.abs(p.x - x) + Math.abs(p.y - y);
        if (d < bd) { bd = d; best = i; }
    }
    return { i: best, d: bd };
};

/**
 * Lay line at the diver's position. `fresh` starts a new strand with no join
 * back, for a diver putting in again at a different way out: a join from
 * there would cross solid rock.
 */
Guideline.prototype.lay = function (x, y, fresh) {
    const step = CONFIG.LINE_STEP;
    if (fresh || this.last < 0) {
        const n = this.nearest(x, y);
        if (n.i >= 0 && n.d < step) { this.last = n.i; return; }
        this.pts.push({ x, y, dead: false });
        this.last = this.pts.length - 1;
        return;
    }
    const n = this.nearest(x, y);
    if (n.d < step) {
        // Back on line already laid: follow it, lay nothing.
        this.last = n.i;
        return;
    }
    const lp = this.pts[this.last];
    if (Math.abs(lp.x - x) + Math.abs(lp.y - y) < step) return;
    this.pts.push({ x, y, dead: false });
    this.segs.push([this.last, this.pts.length - 1]);
    this.last = this.pts.length - 1;
};

/** Bury whatever a rockfall has covered. Cheap enough to call now and then. */
Guideline.prototype.prune = function (world) {
    for (const p of this.pts) if (!p.dead && world.cellAt(p.x, p.y) === 0) p.dead = true;
    this.segs = this.segs.filter(([a, b]) => !this.pts[a].dead && !this.pts[b].dead);
    if (this.last >= 0 && this.pts[this.last].dead) this.last = -1;
};

/**
 * Can you get from (x, y) to the entrance by the line? Walks the strands back
 * toward point 0. Used by the tests, and true until a rockfall cuts it.
 */
Guideline.prototype.leadsHome = function (x, y) {
    const n = this.nearest(x, y);
    if (n.i < 0 || this.pts[0].dead) return false;
    const parent = new Map();
    for (const [a, b] of this.segs) parent.set(b, a);
    let i = n.i, guard = 0;
    while (i !== 0 && guard++ < 100000) {
        if (!parent.has(i)) return false;
        i = parent.get(i);
    }
    return i === 0;
};

/**
 * Draw the line. Under the darkness mask (`lit` false) it is a pale thread
 * the lamp picks out; over it (`lit` true) a much fainter trace within reach
 * of the diver, so you can make out the line beside you in the dark.
 */
Guideline.prototype.draw = function (ctx, world, lit) {
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = lit ? 'rgba(235,228,200,0.16)' : 'rgba(235,228,200,0.75)';
    ctx.beginPath();
    for (const [a, b] of this.segs) {
        const p = this.pts[a], q = this.pts[b];
        if (lit && !world.nearDiver(p.x, p.y, 150)) continue;
        const s1 = world.toScreen(p.x, p.y), s2 = world.toScreen(q.x, q.y);
        if ((s1.x < -20 && s2.x < -20) || (s1.x > W + 20 && s2.x > W + 20) ||
            (s1.y < -20 && s2.y < -20) || (s1.y > H + 20 && s2.y > H + 20)) continue;
        ctx.moveTo(Math.round(s1.x) + 0.5, Math.round(s1.y) + 0.5);
        ctx.lineTo(Math.round(s2.x) + 0.5, Math.round(s2.y) + 0.5);
    }
    ctx.stroke();
    ctx.restore();
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Guideline };
}
