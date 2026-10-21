/* The ways in: the computer keyboard, the keys drawn under the panels, a MIDI
 * controller, and a sustain pedal shared between all three.
 *
 * Every source ends in down(note, velocity) and up(note), so the pedal and the
 * engine see one stream however a note arrived. Keys are read by e.code, the
 * physical position, not e.key: a tracker layout means the same two rows on
 * every keyboard, and Shift (an accented strike) would otherwise turn "2" into
 * "@" and drop the note.
 */

const Play = (() => {

    /* Two rows, tracker style: Z row is the lower octave, Q row the upper, and
     * the row above each holds its sharps. */
    const KEYMAP = {
        KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6,
        KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11, Comma: 12,
        KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17,
        Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23, KeyI: 24
    };
    /* The label each on-screen key carries, by offset from the low C. */
    const LABEL = {};
    for (const [code, off] of Object.entries(KEYMAP)) {
        if (LABEL[off]) continue;
        LABEL[off] = code.replace(/^Key|^Digit/, '').replace('Comma', ',').toLowerCase();
    }

    let octave = 4;                 /* the Z key's C: C4 */
    let onChange = () => {};

    const held = new Set();         /* notes physically down, from any source */
    const pedalled = new Set();     /* notes let go while the pedal was down */
    const pedal = { space: false, latch: false, midi: false };
    const isPedal = () => pedal.space || pedal.latch || pedal.midi;

    const base = () => 12 * (octave + 1);    /* MIDI number of the Z key */

    async function down(note, velocity) {
        await ToneEngine.resume();
        held.add(note);
        pedalled.delete(note);
        ToneEngine.noteOn(note, velocity);
        paintKeys();
        onChange();
    }

    function up(note) {
        if (!held.delete(note)) return;
        if (isPedal()) pedalled.add(note);
        else ToneEngine.noteOff(note);
        paintKeys();
        onChange();
    }

    function setPedal(which, on) {
        pedal[which] = on;
        if (isPedal()) return;
        for (const n of pedalled) if (!held.has(n)) ToneEngine.noteOff(n);
        pedalled.clear();
        onChange();
    }

    /* ── computer keyboard ─────────────────────────────────────────────── */

    const typing = (e) => {
        const t = e.target;
        return t && (t.tagName === 'INPUT' && t.type !== 'range' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const fromKey = new Map();      /* code -> the note it started, so an octave
                                       change mid-hold still releases the right one */

    window.addEventListener('keydown', (e) => {
        if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.code === 'Space') {
            e.preventDefault();
            if (!e.repeat) setPedal('space', true);
            return;
        }
        if (e.code === 'Minus' || e.code === 'Equal') {
            e.preventDefault();
            shiftOctave(e.code === 'Minus' ? -1 : 1);
            return;
        }
        const off = KEYMAP[e.code];
        if (off === undefined) return;
        e.preventDefault();
        if (e.repeat || fromKey.has(e.code)) return;
        const note = base() + off;
        fromKey.set(e.code, note);
        /* Shift is an accent, the computer's only velocity. */
        down(note, e.shiftKey ? 1 : 0.7);
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') { setPedal('space', false); return; }
        const note = fromKey.get(e.code);
        if (note === undefined) return;
        fromKey.delete(e.code);
        up(note);
    });

    /* A tab switch mid-chord never delivers the keyups. */
    window.addEventListener('blur', () => {
        for (const note of fromKey.values()) up(note);
        fromKey.clear();
        setPedal('space', false);
    });

    function shiftOctave(d) {
        const next = Math.max(1, Math.min(6, octave + d));
        if (next === octave) return;
        octave = next;
        buildKeys();
        onChange();
    }

    /* ── the keys on screen ────────────────────────────────────────────── */

    let keysEl = null;
    const BLACK = new Set([1, 3, 6, 8, 10]);
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteName = (n) => NAMES[n % 12] + (Math.floor(n / 12) - 1);

    function buildKeys() {
        if (!keysEl) return;
        keysEl.innerHTML = '';
        const whites = [];
        for (let off = 0; off <= 24; off++) if (!BLACK.has(off % 12)) whites.push(off);
        const ww = 100 / whites.length;
        for (let off = 0; off <= 24; off++) {
            const black = BLACK.has(off % 12);
            const k = document.createElement('div');
            k.className = 'key ' + (black ? 'black' : 'white');
            k.dataset.note = base() + off;
            const wi = whites.filter((w) => w < off).length;
            k.style.left = (black ? wi * ww - ww * 0.3 : wi * ww) + '%';
            k.style.width = (black ? ww * 0.6 : ww) + '%';
            const lab = document.createElement('span');
            lab.className = 'key-label';
            lab.textContent = LABEL[off] || '';
            k.appendChild(lab);
            if (off % 12 === 0) {
                const c = document.createElement('span');
                c.className = 'key-name';
                c.textContent = noteName(base() + off);
                k.appendChild(c);
            }
            keysEl.appendChild(k);
        }
        paintKeys();
    }

    function paintKeys() {
        if (!keysEl) return;
        for (const k of keysEl.children) k.classList.toggle('down', held.has(+k.dataset.note));
    }

    /* Velocity is where on the key you press: near the player is a hard hit,
     * as on a real keyboard, where the front of the key is the long lever. */
    function velocityAt(k, e) {
        const r = k.getBoundingClientRect();
        return Math.max(0.15, Math.min(1, 0.25 + 0.85 * (e.clientY - r.top) / r.height));
    }

    const byPointer = new Map();    /* pointerId -> note */

    function wireKeys(el) {
        keysEl = el;
        buildKeys();
        el.addEventListener('pointerdown', (e) => {
            const k = e.target.closest('.key');
            if (!k) return;
            e.preventDefault();
            el.setPointerCapture(e.pointerId);
            byPointer.set(e.pointerId, +k.dataset.note);
            down(+k.dataset.note, velocityAt(k, e));
        });
        /* Captured, so a drag across the keys is a glissando: hit-test by
         * position rather than relying on pointerenter. */
        el.addEventListener('pointermove', (e) => {
            if (!byPointer.has(e.pointerId)) return;
            const hit = document.elementFromPoint(e.clientX, e.clientY);
            const k = hit && hit.closest && hit.closest('.key');
            if (!k || !el.contains(k)) return;
            const note = +k.dataset.note;
            if (note === byPointer.get(e.pointerId)) return;
            up(byPointer.get(e.pointerId));
            byPointer.set(e.pointerId, note);
            down(note, velocityAt(k, e));
        });
        const lift = (e) => {
            if (!byPointer.has(e.pointerId)) return;
            up(byPointer.get(e.pointerId));
            byPointer.delete(e.pointerId);
        };
        el.addEventListener('pointerup', lift);
        el.addEventListener('pointercancel', lift);
    }

    /* ── MIDI ──────────────────────────────────────────────────────────── */

    /* Asked for on a button press rather than on load: a permission prompt
     * nobody requested is the fastest way to get a page closed. */
    async function connectMidi() {
        if (!navigator.requestMIDIAccess) return 'no Web MIDI in this browser';
        let access;
        try {
            access = await navigator.requestMIDIAccess({ sysex: false });
        } catch (err) {
            return 'MIDI refused';
        }
        const listen = () => {
            for (const input of access.inputs.values()) input.onmidimessage = onMidi;
        };
        listen();
        access.onstatechange = listen;
        const n = access.inputs.size;
        return n ? 'MIDI: ' + n + ' input' + (n > 1 ? 's' : '') : 'MIDI on, no inputs yet';
    }

    function onMidi(e) {
        const [st, a, b] = e.data;
        const type = st & 0xf0;
        if (type === 0x90 && b > 0) down(a, b / 127);
        else if (type === 0x80 || (type === 0x90 && b === 0)) up(a);
        else if (type === 0xb0 && a === 64) setPedal('midi', b >= 64);
        else if (type === 0xb0 && a === 1) Hand.wheel(b / 127);
        else if (type === 0xe0) ToneEngine.setBend((((b << 7) | a) - 8192) / 8192 * 2);
    }

    return {
        wireKeys, connectMidi, shiftOctave, setPedal, noteName,
        octave: () => octave,
        latched: () => pedal.latch,
        heldCount: () => held.size,
        setOnChange: (fn) => { onChange = fn; }
    };
})();

/* ── a hand on the grating ────────────────────────────────────────────────
 * Drag up and down on either source strip and every sounding voice is pressed
 * to that beta, the way a player leans on a mod wheel. Height maps through the
 * same square root the strips draw with, sqrt(beta / BETA_MAX), so the low
 * end, where the nulls and most of the character are, gets most of the travel.
 *
 * Each zero of J_0 is a detent. Finding 2.4048 by hand is luck, and the null
 * is the one place on the slider worth landing on exactly: the carrier goes
 * missing and the straight-through beam goes dark.
 */
const Hand = (() => {
    const DETENT = 0.07;
    let onChange = () => {};
    let active = null;              /* pointerId while a hand is on a strip */
    let wheelOn = false;

    function snap(beta) {
        for (const z of Bessel.J0_ZEROS) if (Math.abs(beta - z) < DETENT) return z;
        return beta;
    }

    function fromY(canvas, clientY) {
        const r = canvas.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (r.bottom - clientY) / r.height));
        return snap(Bessel.BETA_MAX * p * p);
    }

    function wire(canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            active = e.pointerId;
            ToneEngine.setOverride(fromY(canvas, e.clientY));
            canvas.classList.add('pressed');
            onChange();
        });
        canvas.addEventListener('pointermove', (e) => {
            if (e.pointerId !== active) return;
            ToneEngine.setOverride(fromY(canvas, e.clientY));
            onChange();
        });
        const lift = (e) => {
            if (e.pointerId !== active) return;
            active = null;
            canvas.classList.remove('pressed');
            ToneEngine.setOverride(wheelOn ? current : null);
            onChange();
        };
        canvas.addEventListener('pointerup', lift);
        canvas.addEventListener('pointercancel', lift);
    }

    /* The mod wheel at rest is no hand at all: the patch plays as written. */
    let current = null;
    function wheel(v) {
        wheelOn = v > 0;
        current = wheelOn ? snap(Bessel.BETA_MAX * v * v) : null;
        if (active === null) ToneEngine.setOverride(current);
        onChange();
    }

    return { wire, wheel, busy: () => active !== null || wheelOn, setOnChange: (fn) => { onChange = fn; } };
})();
