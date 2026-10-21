/* Wiring. One patch, one array of Bessel values per frame, two panels and a
 * table that read it.
 *
 * The array is computed once in render() and handed to everything that draws.
 * That is not an optimization, it is the page's only claim: if the tone panel
 * and the grating panel ever got their own copies, the agreement between them
 * would be an artefact of this file rather than a fact about the maths.
 *
 * What changed when the page became an instrument is WHICH beta the array is
 * computed for. Silent, it is the patch's resting depth. Sounding, it is the
 * live index of the newest note, read off the engine's analytic copy of its
 * envelope (see audio.js), so the bars and the table move with the strike as
 * it decays and with a hand pressing the grating.
 */

/* Named patches. Each is a claim about a ratio and an index trajectory, and
 * the names say what the claim sounds like. */
const PATCHES = {
    'null organ': { beta: 2.404826, strike: 0, decay: 0.3, ratio: 0.5, attack: 0.03, fade: 0, release: 0.25,
        note: 'rests on the first zero of J0: you hear the pitch an octave down, and its second harmonic, the carrier, is the one missing' },
    brass: { beta: 1.4, strike: 3.6, decay: 0.18, ratio: 1, attack: 0.04, fade: 0, release: 0.12,
        note: "Chowning's brass: 1:1, bright on the attack, the index settling as the note holds" },
    reed: { beta: 1.6, strike: 1.2, decay: 0.35, ratio: 2, attack: 0.03, fade: 0, release: 0.08,
        note: '1:2 puts every sideband on an odd harmonic, the clarinet ladder' },
    bell: { beta: 0.6, strike: 7, decay: 1.2, ratio: 1.4, attack: 0.002, fade: 2.2, release: 1.6,
        note: 'an irrational ratio: sidebands land between the harmonics and the pitch goes metallic' },
    chime: { beta: 0.4, strike: 4.5, decay: 0.45, ratio: 3.5, attack: 0.002, fade: 0.9, release: 0.9,
        note: 'a wide ratio, so few sidebands and far apart: a fan of only the first orders' },
    grit: { beta: 5.520078, strike: 3, decay: 0.6, ratio: 0.13, attack: 0.01, fade: 0, release: 0.2,
        note: 'a slow modulator crowds the sidebands into a buzz, sitting on the second zero of J0' }
};

const state = Object.assign({}, PATCHES['null organ'], {
    d: 2.0,           /* groove spacing, um */
    lam: 500,         /* wavelength, nm */
    patch: 'null organ'
});

const el = (id) => document.getElementById(id);

const SLIDERS = {
    beta:    { fmt: (v) => v.toFixed(3) },
    strike:  { fmt: (v) => '+' + v.toFixed(1) },
    decay:   { fmt: (v) => v.toFixed(2) + ' s' },
    ratio:   { fmt: (v) => v.toFixed(2) },
    attack:  { fmt: (v) => (v * 1000).toFixed(0) + ' ms' },
    fade:    { fmt: (v) => (v > 0 ? v.toFixed(1) + ' s' : 'hold') },
    release: { fmt: (v) => v.toFixed(2) + ' s' },
    d:       { fmt: (v) => v.toFixed(2) + ' µm' },
    lam:     { fmt: (v) => v + ' nm' }
};

const ui = {
    betaStat: el('betaStat'), stateStat: el('stateStat'), noteStat: el('noteStat'),
    depthOut: el('depthOut'), maxOrderOut: el('maxOrderOut'),
    powerOut: el('powerOut'), foldOut: el('foldOut'), evanOut: el('evanOut'),
    rows: el('rows'), patchNote: el('patchNote'), octOut: el('octOut'),
    hold: el('hold'), midi: el('midi'), midiOut: el('midiOut'),
    wave: el('waveCanvas'), tone: el('toneCanvas'),
    groove: el('grooveCanvas'), order: el('orderCanvas')
};

const fmtJ = (v) => {
    const s = Math.abs(v).toFixed(4);
    return (v < 0 && s !== '0.0000' ? '-' : ' ') + s;
};

/* The note the panels show while silent. A4 is where the page has always
 * started, and the last note played replaces it so the picture holds still
 * where the sound stopped rather than jumping back. */
let lastNote = 69;

function view() {
    const f = ToneEngine.focus();
    if (f) {
        lastNote = f.note;
        return { fc: f.fc, ratio: state.ratio, beta: f.beta, d: state.d, lam: state.lam, live: true, note: f.note };
    }
    const fc = ToneEngine.hz(lastNote);
    const hand = ToneEngine.override();
    return { fc, ratio: state.ratio, beta: hand === null ? state.beta : hand, d: state.d, lam: state.lam, live: false, note: lastNote };
}

function render() {
    const st = view();
    const orders = Bessel.orders(st.beta);
    const fm = st.fc * st.ratio;
    const lamUm = st.lam / 1000;

    /* Peak-to-valley depth of a reflection grating that would give this beta:
     * the round trip doubles the surface's path difference, so beta is exactly
     * 2*pi*h/lambda. A slider labeled beta reads out as a fabrication number. */
    const depth = (st.beta * st.lam) / (2 * Math.PI);
    const maxOrder = Math.floor(st.d / lamUm);

    Draw.drawWave(ui.wave, st);
    Draw.drawTone(ui.tone, st, orders);
    Draw.drawGroove(ui.groove, st);
    Draw.drawOrders(ui.order, st, orders);

    ui.depthOut.textContent = depth.toFixed(1) + ' nm';
    ui.maxOrderOut.textContent = '±' + maxOrder;
    ui.betaStat.textContent = 'β ' + st.beta.toFixed(3);
    ui.noteStat.textContent = Play.noteName(st.note) + ' ' + Math.round(st.fc) + ' Hz';
    ui.noteStat.classList.toggle('live', st.live);

    const nul = Bessel.nearestNull(st.beta);
    ui.stateStat.textContent = nul ? 'CARRIER NULL' : 'ORDERS ±' + maxOrder;
    ui.stateStat.classList.toggle('lit', !!nul);

    /* Known in advance, so it is the check: if it stops reading 1.0000 the
     * order list is truncated too early and both panels lie by the same amount. */
    ui.powerOut.textContent = Bessel.power(orders).toFixed(4);

    let folded = 0, evan = 0;
    const rows = [];
    for (const o of orders) {
        if (o.m !== 0 && Math.abs(o.J) < 5e-3) continue;
        const f = st.fc + o.m * fm;
        const sinT = (o.m * lamUm) / st.d;
        const isFolded = f < 0;
        const isEvan = Math.abs(sinT) > 1;
        if (isFolded) folded++;
        if (isEvan) evan++;
        const theta = isEvan ? '·' : (Math.asin(sinT) * 180 / Math.PI).toFixed(1) + '°';
        rows.push(
            '<tr class="' + (o.m === 0 ? 'carrier' : '') + '">' +
            '<td class="m">' + (o.m > 0 ? '+' + o.m : o.m) + '</td>' +
            '<td class="j">' + fmtJ(o.J) + '</td>' +
            '<td class="sq">' + (o.J * o.J).toFixed(4) + '</td>' +
            '<td class="f' + (isFolded ? ' flag' : '') + '">' + Math.abs(f).toFixed(0) + (isFolded ? '↵' : '') + '</td>' +
            '<td class="t' + (isEvan ? ' flag' : '') + '">' + theta + '</td>' +
            '</tr>'
        );
    }
    ui.rows.innerHTML = rows.join('');
    ui.foldOut.textContent = folded;
    ui.evanOut.textContent = evan;
}

/* ── the frame loop ───────────────────────────────────────────────────────
 * Runs only while something moves: a voice sounding, or a hand on the
 * grating. A silent page repaints on input and otherwise costs nothing. */
let looping = false;
function frame() {
    render();
    if (ToneEngine.sounding() || Hand.busy()) requestAnimationFrame(frame);
    else { looping = false; render(); }
}
function wake() {
    if (looping) return;
    looping = true;
    requestAnimationFrame(frame);
}

/* ── the patch panel ──────────────────────────────────────────────────── */

const patchKeys = ['beta', 'strike', 'decay', 'ratio', 'attack', 'fade', 'release'];

function pushPatch() {
    const p = {};
    for (const k of patchKeys) p[k] = state[k];
    ToneEngine.setPatch(p);
}

function syncControls() {
    for (const [k, s] of Object.entries(SLIDERS)) {
        el(k).value = state[k];
        el(k + 'Out').textContent = s.fmt(state[k]);
    }
    document.querySelectorAll('[data-patch]').forEach((b) => b.classList.toggle('on', b.dataset.patch === state.patch));
    ui.patchNote.textContent = state.patch ? PATCHES[state.patch].note : 'your own patch';
    ui.octOut.textContent = 'C' + Play.octave();
    ui.hold.classList.toggle('on', Play.latched());
}

for (const k of Object.keys(SLIDERS)) {
    el(k).addEventListener('input', () => {
        state[k] = parseFloat(el(k).value);
        el(k + 'Out').textContent = SLIDERS[k].fmt(state[k]);
        if (patchKeys.includes(k)) {
            state.patch = null;
            syncControls();
            pushPatch();
        }
        render();
    });
}

document.querySelectorAll('[data-patch]').forEach((b) => {
    b.addEventListener('click', () => {
        Object.assign(state, PATCHES[b.dataset.patch]);
        state.patch = b.dataset.patch;
        syncControls();
        pushPatch();
        render();
        b.blur();      /* or the next Space lands on the button, not the pedal */
    });
});

/* The zeros of J_0 set the resting depth exactly. Hitting 2.4048 with a mouse
 * is luck, and the point is to land on it and hear the middle go missing. */
document.querySelectorAll('[data-beta]').forEach((b) => {
    b.addEventListener('click', () => {
        state.beta = parseFloat(b.dataset.beta);
        state.patch = null;
        syncControls();
        pushPatch();
        render();
        b.blur();
    });
});

el('octDown').addEventListener('click', (e) => { Play.shiftOctave(-1); e.currentTarget.blur(); });
el('octUp').addEventListener('click', (e) => { Play.shiftOctave(1); e.currentTarget.blur(); });

ui.hold.addEventListener('click', () => {
    Play.setPedal('latch', !Play.latched());
    ui.hold.blur();
    syncControls();
});

ui.midi.addEventListener('click', async () => {
    ui.midiOut.textContent = 'asking…';
    ui.midiOut.textContent = await Play.connectMidi();
    ui.midi.blur();
});

Play.setOnChange(() => { syncControls(); wake(); });
Hand.setOnChange(wake);
Play.wireKeys(el('keys'));
Hand.wire(ui.wave);
Hand.wire(ui.groove);

/* Canvases are sized by CSS, so their backing stores only learn about a
 * resize from here. */
let pending = null;
window.addEventListener('resize', () => {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { pending = null; render(); });
});

/* Courier Prime is self-hosted but asynchronous, and the canvas numerals are
 * measured at draw time. Repaint once the face is in. */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);

syncControls();
pushPatch();
render();
