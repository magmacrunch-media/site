// core/waves.js — the six waveform samplers, as functions of t.
//
// Lifted out of canvas.js, where each one existed only as the closure passed
// to drawWave() and could therefore not be tested or reasoned about apart
// from a canvas context. Here they are what they always were — maps from a
// phase to an amplitude in -1..1 — and drawWave's sampling loop becomes
// samplePath(), which returns points that ui/render.js strokes.
//
// t is in CYCLES, not radians: t = 1 is one full period. Every sampler is
// periodic in 1.
//
// Pure: no DOM, no canvas.

(function () {
    'use strict';

    const App = (window.Gatefold = window.Gatefold || {});

    const TAU = Math.PI * 2;

    function sine(t) {
        return Math.sin(t * TAU);
    }

    function squarewave(t) {
        return Math.sin(t * TAU) >= 0 ? 1 : -1;
    }

    function sawtooth(t) {
        return 2 * (t - Math.floor(t + 0.5));
    }

    function trianglewave(t) {
        return 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1;
    }

    /**
     * A staircase of `steps` levels per cycle.
     *
     * THE DIVISOR IS GUARDED, and it is a real bug rather than a defensive
     * flourish. The original divided by `steps - 1` directly. The slider that
     * feeds it floors at 2, so nobody ever saw it — but a loaded project file
     * is not a slider, and `steps: 1` makes that 0/0, which is NaN, which
     * propagates into every point of the path, and a path of NaN coordinates
     * draws absolutely nothing. A wave that silently vanishes when a file is
     * opened is exactly the failure a format needs to be immune to.
     *
     * With one step the answer is a flat line at the bottom of the box, which
     * is what a single-level staircase honestly is.
     */
    function step(t, opts) {
        const n = Math.max(1, Math.floor((opts && opts.steps) || 5));
        const divisor = n > 1 ? n - 1 : 1;
        const mod = t - Math.floor(t);
        return (Math.floor(mod * n) / divisor) * 2 - 1;
    }

    /** High for the first `duty` of each cycle, low for the rest. */
    function pulse(t, opts) {
        const duty = (opts && opts.duty) || 0.2;
        const mod = t - Math.floor(t);
        return mod < duty ? 1 : -1;
    }

    const SAMPLERS = {
        sine: sine,
        squarewave: squarewave,
        sawtooth: sawtooth,
        trianglewave: trianglewave,
        step: step,
        pulse: pulse,
    };

    function samplerFor(type) {
        return SAMPLERS[type] || null;
    }

    /**
     * Where in one cycle each discontinuous sampler jumps, as phases in 0..1.
     *
     * A JUMP BETWEEN TWO SAMPLES IS NOT DRAWN, it is guessed at. samplePath
     * takes about one sample per pixel whatever the frequency, so a 5% pulse
     * at 20 cycles across 103px is high for half a sample: most of its pulses
     * fell between samples and vanished, and which ones came and went as the
     * box was resized. Every jump listed here gets a point on each side of
     * it, so each one is drawn exactly where it is, at any width.
     *
     * The continuous samplers, sine and triangle, are absent: a sample per
     * pixel already draws them faithfully.
     */
    const EDGES = {
        squarewave: () => [0, 0.5],
        sawtooth: () => [0.5],
        pulse: (el) => [0, (el && el.duty) || 0.2],
        step: (el) => {
            const n = Math.max(1, Math.floor((el && el.steps) || 5));
            const out = [];
            for (let j = 0; j < n; j++) out.push(j / n);
            return out;
        },
    };

    /* How far either side of a jump its two points are sampled, in cycles.
       Small enough to be the same x on any canvas, large enough to land on
       the right side of the sampler's own comparison. */
    const EDGE_EPS = 1e-7;

    /**
     * The wave as points in canvas space, left edge to right edge.
     *
     * `Math.max(64, round(w))` is the original's resolution rule: about one
     * sample per horizontal pixel, but never so few that a small wave becomes
     * a polygon. Kept exactly, because changing it changes what every existing
     * cover looks like.
     *
     * The frequency fallback is also the original's: an element with no
     * wavelength gets one cycle per 100px of width rather than one cycle
     * total, so a wide wave dragged out before the slider is touched looks
     * like a wave instead of a single hump.
     *
     * The first point is exactly at x and the last exactly at x + w, so a
     * filled wave closes on the box rather than near it. Between them are the
     * steps + 1 regular samples, and for a wave with jumps two more points at
     * each jump (see EDGES), so the count is not steps + 1 for those.
     */
    function samplePath(el) {
        const fn = samplerFor(el.type);
        if (!fn) return [];

        const midY = el.y + el.h / 2;
        const amp = el.h / 2;
        const freq = el.wavelength || Math.max(1, Math.round(el.w / 100));
        const steps = Math.max(64, Math.round(el.w));

        /* The regular samples, plus a pair either side of every jump. Each is
           a fraction of the width, so they merge into one sorted run. */
        const jumps = [];
        const edges = EDGES[el.type] ? EDGES[el.type](el) : [];
        if (edges.length && freq > 0 && isFinite(freq)) {
            for (let k = 0; k <= Math.ceil(freq); k++) {
                for (const e of edges) {
                    const f = (k + e) / freq;
                    if (f > 0 && f < 1) jumps.push(f);
                }
            }
        }
        /* A REGULAR SAMPLE THAT LANDS ON A JUMP IS DROPPED. Its own phase is
           the jump to within rounding, so which side the sampler puts it on
           is float noise, and on the wrong side it drew a spike back up
           between the jump's two points. The pair says everything it did. */
        const onJump = new Set(jumps.map((f) => Math.round(f * 1e9)));
        const at = [];
        for (let i = 0; i <= steps; i++) {
            const f = i / steps;
            const key = Math.round(f * 1e9);
            if (i > 0 && i < steps && (onJump.has(key) || onJump.has(key - 1) || onJump.has(key + 1))) continue;
            at.push([f, 0]);
        }
        for (const f of jumps) at.push([f, -EDGE_EPS], [f, EDGE_EPS]);
        if (jumps.length) at.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

        const points = [];
        for (const [f, side] of at) {
            const t = f * freq + side;
            points.push([el.x + f * el.w, midY - amp * fn(t, el)]);
        }
        return points;
    }

    App.waves = {
        TYPES: Object.keys(SAMPLERS),
        SAMPLERS: SAMPLERS,
        samplerFor: samplerFor,
        samplePath: samplePath,
    };
}());
