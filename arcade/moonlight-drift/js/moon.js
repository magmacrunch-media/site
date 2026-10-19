// The moon, rising over a run - web and iOS only, and presentation only.
//
// A pixel moon drawn on the game canvas between the stars and the obstacles,
// so pillars pass in front of it and the pilot and the score stay on top. It
// sits below the horizon before a run and rises over MOON_RISE seconds of play
// to high in the sky, the same 90 seconds as a moonlight set, so in that mode
// it tops out as the set ends; in endless it stays up. When a run ends it
// stays where it was. Its glow breathes with the beat (beat.js).
//
// It is tonight's moon: the phase is worked out from the device's clock, so a
// player flying on a full moon sees a full one, and the flight plan names it.
// The lit side is drawn as seen from the northern hemisphere.
//
// Nothing here is a rule: the position is read from the run's tick count,
// which main.js already keeps, and the Wii, tui and Roblox versions have no
// moon.

const MOON_RISE_SECONDS = 90;
const MOON_CELL = 4;          // canvas pixels per moon pixel, for the SNES look
const MOON_CELLS = 24;        // the moon's grid, so 96 canvas pixels across
// Start just below the bottom edge at the right, end high and a little left.
const MOON_FROM = { x: 1110, y: 800 };
const MOON_TO = { x: 960, y: 150 };

// The phase from the mean synodic month, counted from the new moon of
// 2000-01-06 18:14 UTC. The true moon wanders up to most of a day either side
// of the mean, which no one will see in a 24-pixel moon and which moves a name
// across a boundary only for those hours. Checked 2026-10-18 against published
// times: first quarter 2026-10-18 16:13 UTC came out about 2 hours late, full
// moon 2026-10-26 04:12 UTC within the hour, new moon 2026-10-10 15:50 UTC
// about 18 hours late.
const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
// Sprites are drawn for this many steps of the cycle, about one a day.
const MOON_PHASE_STEPS = 30;
const MOON_PHASE_NAMES = [
    'new moon', 'waxing crescent', 'first quarter', 'waxing gibbous',
    'full moon', 'waning gibbous', 'last quarter', 'waning crescent',
];

// 0 at new moon, 0.5 at full, back towards 1 at the next new moon.
function moonPhase(date = new Date()) {
    const days = (date.getTime() - KNOWN_NEW_MOON_MS) / 86400000;
    const phase = (days / SYNODIC_DAYS) % 1;
    return phase < 0 ? phase + 1 : phase;
}

function moonPhaseName(phase = moonPhase()) {
    return MOON_PHASE_NAMES[Math.floor(phase * 8 + 0.5) % 8];
}

// How much of the disc is lit, 0 to 1.
function moonLitFraction(phase) {
    return (1 - Math.cos(phase * 2 * Math.PI)) / 2;
}

let moonSprite = null;
let moonSpriteStep = -1;

// The moon, drawn into an offscreen canvas. Each row of the disc is lit on one
// side of the terminator, which crosses the disc from right to left twice a
// cycle: waxing, the light follows it in; waning, the shadow does. The unlit part is earthshine, dim but there,
// so even a new moon is a shape in the sky; cells along the terminator take
// the paler lit colour.
function buildMoonSprite(phase) {
    const size = MOON_CELLS * MOON_CELL;
    const sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const g = sprite.getContext('2d');
    const r = MOON_CELLS / 2 - 0.5;
    const waxing = phase < 0.5;
    const sweep = Math.cos(phase * 2 * Math.PI);
    for (let y = 0; y < MOON_CELLS; y++) {
        for (let x = 0; x < MOON_CELLS; x++) {
            const dx = (x + 0.5 - MOON_CELLS / 2) / r;
            const dy = (y + 0.5 - MOON_CELLS / 2) / r;
            if (dx * dx + dy * dy > 1) continue;
            const t = Math.sqrt(1 - dy * dy) * sweep;
            // Distance into the lit side, in cells; negative is in shadow.
            const lit = (waxing ? dx - t : -t - dx) * r;
            if (lit < 0) g.fillStyle = '#433f72';
            else if (lit < 1.5) g.fillStyle = '#c9c39a';
            else g.fillStyle = '#f4efc8';
            g.fillRect(x * MOON_CELL, y * MOON_CELL, MOON_CELL, MOON_CELL);
        }
    }
    return sprite;
}

// The sprite for tonight, redrawn only when the phase moves on a step, so a
// session left open across a night catches up without redrawing every frame.
function currentMoonSprite() {
    const step = Math.round(moonPhase() * MOON_PHASE_STEPS) % MOON_PHASE_STEPS;
    if (step !== moonSpriteStep) {
        moonSprite = buildMoonSprite(step / MOON_PHASE_STEPS);
        moonSpriteStep = step;
    }
    return moonSprite;
}

// 0 at the horizon, 1 at the top. Eases out, so the moon clears the edge
// quickly and settles slowly, the way a rising moon seems to.
function moonPosition(progress) {
    const p = Math.min(1, Math.max(0, progress));
    const eased = 1 - Math.pow(1 - p, 3);
    return {
        x: Math.round(MOON_FROM.x + (MOON_TO.x - MOON_FROM.x) * eased),
        y: Math.round(MOON_FROM.y + (MOON_TO.y - MOON_FROM.y) * eased),
    };
}

function drawMoon(ctx, progress) {
    const sprite = currentMoonSprite();
    const { x, y } = moonPosition(progress);
    const size = sprite.width;
    // A thin moon throws less light; a new moon still a little, for its shape.
    const light = 0.25 + 0.75 * moonLitFraction(moonSpriteStep / MOON_PHASE_STEPS);
    const pulse = typeof beatPulse === 'function' ? beatPulse() : 0;

    ctx.save();
    // The glow first, a soft disc twice the moon's size.
    const glow = ctx.createRadialGradient(x, y, size * 0.2, x, y, size);
    glow.addColorStop(0, `rgba(244, 239, 200, ${((0.16 + 0.08 * pulse) * light).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(244, 239, 200, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(sprite, Math.round(x - size / 2), Math.round(y - size / 2));
    ctx.restore();
}
