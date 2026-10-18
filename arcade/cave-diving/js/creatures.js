// creatures.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// What else is down here.
//
//   FISH  small, pale, harmless. They drift in loose groups and scatter from
//         the lamp, which is how you notice them at all.
//   EELS  live in the wall, in the branches and the deep. When you come close
//         their eyes catch the light first, for longer than it takes to
//         react; then they strike, and a bite costs breath like rock does.
//         The warning is the fairness promise the lamp makes for rock.
//   THE DEEP  something large passes at the edge of the dark, once a dive,
//         in THE DEEP. It never comes close and it never touches you. It is
//         there to be glimpsed.
//
// Everything here lives on the map, like the diver, and asks world.cellAt()
// before it moves, so nothing swims through rock.

/* global CONFIG, SEGMENTS, mulberry32 */

function Creatures(world, seed) {
    this.rng = mulberry32(((seed === undefined ? 1 : seed) ^ 0x2c1b3c6d) | 0);
    this.fish = [];
    this.eels = [];
    this.big = null;
    this.bigDone = false;
    this.populate(world);
}

/** A random point of open water in tunnel k, or null. */
Creatures.prototype.waterIn = function (world, k, s0, s1) {
    for (let tries = 0; tries < 12; tries++) {
        const s = s0 + this.rng() * (s1 - s0);
        const b = world.boundsAt(k, s);
        const c = b.lo + 12 + this.rng() * Math.max(0, b.hi - b.lo - 24);
        const p = world.toWorld(k, s, c);
        if (world.cellAt(p.x, p.y) === 1) return p;
    }
    return null;
};

Creatures.prototype.populate = function (world) {
    const C = CONFIG.CREATURES;
    // Fish: loose groups, a few per long tunnel, one or two per branch leg.
    for (let k = 0; k < world.tunnels.length; k++) {
        const t = world.tunnels[k];
        const len = t.E - t.S;
        const groups = Math.max(t.main ? 1 : 0, Math.round(len / C.FISH_EVERY));
        for (let g = 0; g < groups; g++) {
            const home = this.waterIn(world, k, t.S + 60, t.E - 60);
            if (!home) continue;
            const n = 3 + Math.floor(this.rng() * 4);
            for (let i = 0; i < n; i++) {
                const a = this.rng() * Math.PI * 2;
                this.fish.push({
                    x: home.x + Math.cos(a) * 14, y: home.y + Math.sin(a) * 10,
                    vx: 0, vy: 0, head: this.rng() * Math.PI * 2, phase: this.rng() * 6,
                    size: this.rng() < 0.25 ? 2 : 1,
                });
            }
        }
    }

    // Eels: in the branches that say so, and along the deep.
    const lair = (k, s, fromHi) => {
        const b = world.boundsAt(k, s);
        const c = fromHi ? b.hi - 6 : b.wallLo + 6;
        const home = world.toWorld(k, s, c);
        const into = world.tunnels[k].n;
        const sign = fromHi ? -1 : 1;
        this.eels.push({
            hx: home.x, hy: home.y, x: home.x, y: home.y,
            ux: into.x * sign, uy: into.y * sign,
            state: 'hidden', t: 0, tx: 0, ty: 0, wig: this.rng() * 6,
        });
    };
    for (const b of world.branches) {
        if (!b.spec.eel) continue;
        const k = b.legs[b.legs.length - 1];
        const t = world.tunnels[k];
        if (b.spec.end === 'dead') lair(k, t.E - 120, this.rng() < 0.5);
        else lair(k, (t.S + t.E) / 2, true);
    }
    const deep = SEGMENTS.findIndex((seg) => seg.label === 'THE DEEP');
    if (deep >= 0) {
        const t = world.tunnels[deep];
        for (let i = 0; i < C.DEEP_EELS; i++) {
            lair(deep, t.S + (t.E - t.S) * (0.3 + 0.4 * i / Math.max(1, C.DEEP_EELS - 1)), i % 2 === 0);
        }
    }
};

/** Is any eel warning or striking near the diver? The score's reason to worry. */
Creatures.prototype.threat = function () {
    return this.eels.some((e) => e.state === 'watch' || e.state === 'lunge');
};

Creatures.prototype.update = function (dt, world, player, sfx) {
    const C = CONFIG.CREATURES;
    const water = (x, y) => world.cellAt(x, y) === 1;
    let bit = false;

    // ── Fish
    const lampR = C.FISH_SCARE;
    for (const f of this.fish) {
        if (f.dead || !world.nearDiver(f.x, f.y, 520)) continue;
        // Buried by a rockfall: gone, not swimming on inside the rubble.
        if (!water(f.x, f.y)) { f.dead = true; continue; }
        f.phase += dt * 0.2;
        const dx = f.x - player.x, dy = f.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        // In the lamp and close: scatter, away from the light.
        const inBeam = (dx * player.fx + dy * player.fy) / d > 0.55 && d < lampR;
        let ax, ay, top;
        if (inBeam || d < 26) {
            ax = (dx / d) * 0.35; ay = (dy / d) * 0.35; top = C.FISH_FLEE;
        } else {
            f.head += (this.rng() - 0.5) * 0.3 * dt;
            ax = Math.cos(f.head) * 0.04; ay = Math.sin(f.head) * 0.04; top = C.FISH_SPEED;
        }
        f.vx = (f.vx + ax * dt) * Math.pow(0.94, dt);
        f.vy = (f.vy + ay * dt) * Math.pow(0.94, dt);
        const sp = Math.hypot(f.vx, f.vy);
        if (sp > top) { f.vx *= top / sp; f.vy *= top / sp; }
        const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt;
        if (water(nx, ny)) { f.x = nx; f.y = ny; }
        else { f.vx = -f.vx; f.vy = -f.vy; f.head += Math.PI; }
    }

    // ── Eels
    for (const e of this.eels) {
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        e.wig += dt * 0.15;
        if (e.state === 'hidden') {
            if (Math.hypot(player.x - e.hx, player.y - e.hy) < C.EEL_NOTICE) {
                e.state = 'watch';
                e.t = C.EEL_WARN;
                if (sfx && sfx.eel) sfx.eel();
            }
        } else if (e.state === 'watch') {
            e.t -= dt;
            // The head eases out of the wall while it watches, so the warning
            // is a shape as well as two pixels of eye.
            const peek = Math.min(14, (CONFIG.CREATURES.EEL_WARN - e.t) * 0.6);
            const px = e.hx + e.ux * peek, py = e.hy + e.uy * peek;
            if (water(px, py)) { e.x = px; e.y = py; }
            if (Math.hypot(player.x - e.hx, player.y - e.hy) > C.EEL_NOTICE * 1.6) e.state = 'hidden';
            else if (e.t <= 0) {
                e.state = 'lunge';
                e.t = C.EEL_LUNGE;
                e.tx = player.x; e.ty = player.y;
            }
        } else if (e.state === 'lunge') {
            e.t -= dt;
            const lx = e.tx - e.x, ly = e.ty - e.y, ld = Math.hypot(lx, ly) || 1;
            const step = Math.min(ld, C.EEL_SPEED * dt);
            const nx = e.x + (lx / ld) * step, ny = e.y + (ly / ld) * step;
            if (water(nx, ny)) { e.x = nx; e.y = ny; } else e.t = 0;
            if (d < C.EEL_BITE) {
                if (player.takeHit(sfx)) bit = true;
                e.t = 0;
            }
            if (e.t <= 0 || ld < 2) { e.state = 'retreat'; }
        } else if (e.state === 'retreat') {
            const lx = e.hx - e.x, ly = e.hy - e.y, ld = Math.hypot(lx, ly);
            if (ld < 2) { e.x = e.hx; e.y = e.hy; e.state = 'rest'; e.t = C.EEL_REST; }
            else {
                const step = Math.min(ld, C.EEL_SPEED * 0.5 * dt);
                e.x += (lx / ld) * step; e.y += (ly / ld) * step;
            }
        } else if (e.state === 'rest') {
            e.t -= dt;
            if (e.t <= 0) e.state = 'hidden';
        }
    }

    // ── The thing in the deep: once a dive, when the diver is there.
    const seg = world.segment();
    if (!this.bigDone && seg.label === 'THE DEEP') {
        this.bigDone = true;
        const t = world.tunnels[world.cur];
        // Across the passage at the far edge of the dark, ahead of the diver.
        const ahead = 260;
        const sx = player.x + t.d.x * ahead, sy = player.y + t.d.y * ahead;
        this.big = { x: sx - t.n.x * 320, y: sy - t.n.y * 320, vx: t.n.x * C.BIG_SPEED, vy: t.n.y * C.BIG_SPEED, life: 640 / C.BIG_SPEED };
        if (sfx && sfx.lurk) sfx.lurk();
    }
    if (this.big) {
        this.big.x += this.big.vx * dt;
        this.big.y += this.big.vy * dt;
        this.big.life -= dt;
        if (this.big.life <= 0) this.big = null;
    }
    return { bit };
};

/** Bodies, drawn under the darkness: the lamp is what shows them. */
Creatures.prototype.draw = function (ctx, world, t) {
    for (const f of this.fish) {
        if (f.dead || !world.nearDiver(f.x, f.y, 300)) continue;
        const s = world.toScreen(f.x, f.y);
        ctx.fillStyle = f.size > 1 ? 'rgba(200,226,214,0.9)' : 'rgba(180,214,204,0.85)';
        const ang = Math.atan2(f.vy, f.vx);
        const tx = Math.round(s.x - Math.cos(ang) * 2), ty = Math.round(s.y - Math.sin(ang) * 2);
        ctx.fillRect(Math.round(s.x), Math.round(s.y), f.size + 1, f.size);
        ctx.fillRect(tx, ty, 1, 1);
    }
    for (const e of this.eels) {
        if (!world.nearDiver(e.x, e.y, 320) || e.state === 'hidden' || e.state === 'rest') continue;
        if (Math.hypot(e.x - e.hx, e.y - e.hy) < 2) continue;
        // A body from the lair to the head, waving.
        const s0 = world.toScreen(e.hx, e.hy), s1 = world.toScreen(e.x, e.y);
        const segs = 9;
        const px = -(s1.y - s0.y), py = s1.x - s0.x, pl = Math.hypot(px, py) || 1;
        for (let i = 0; i <= segs; i++) {
            const k = i / segs;
            const w = Math.sin(e.wig * 3 + k * 6) * 3 * k;
            const x = s0.x + (s1.x - s0.x) * k + (px / pl) * w, y = s0.y + (s1.y - s0.y) * k + (py / pl) * w;
            ctx.fillStyle = i === segs ? '#3c5a4a' : '#2a4038';
            ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        }
    }
    if (this.big) {
        // Barely there: a long dark shape the lamp never quite reaches.
        const s = world.toScreen(this.big.x, this.big.y);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#05090b';
        const ang = Math.atan2(this.big.vy, this.big.vx);
        ctx.translate(s.x, s.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, 70, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-60, 0); ctx.lineTo(-100, -18); ctx.lineTo(-96, 0); ctx.lineTo(-100, 18);
        ctx.fill();
        ctx.restore();
    }
};

/**
 * Eyes, drawn OVER the darkness: they catch the light before anything else
 * does, and an eel's warning has to be seen to be fair.
 */
Creatures.prototype.drawEyes = function (ctx, world, t) {
    for (const e of this.eels) {
        if (!world.nearDiver(e.x, e.y, 320)) continue;
        if (e.state !== 'watch' && e.state !== 'lunge') continue;
        const s = world.toScreen(e.x, e.y);
        const blink = e.state === 'watch' && Math.floor(e.t / 6) % 5 === 0 ? 0 : 1;
        ctx.fillStyle = 'rgba(214,236,150,' + (0.9 * blink) + ')';
        ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 1, 1, 1);
        ctx.fillRect(Math.round(s.x) + 2, Math.round(s.y) - 1, 1, 1);
    }
    if (this.big) {
        const s = world.toScreen(this.big.x, this.big.y);
        const ang = Math.atan2(this.big.vy, this.big.vx);
        ctx.fillStyle = 'rgba(200,220,170,0.35)';
        ctx.fillRect(Math.round(s.x + Math.cos(ang) * 52), Math.round(s.y + Math.sin(ang) * 52 - 4), 2, 1);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Creatures };
}
