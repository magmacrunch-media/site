/* The audible half: a polyphonic two-operator FM synth.
 *
 * Every voice is the same graph the page has always had: a carrier, and a
 * modulator summed into the carrier's frequency AudioParam. Sidebands land at
 * fc + m*fm with amplitude J_m(beta), the array the grating panel reads for
 * its diffraction orders. The one line that carries the physics is still
 *
 *     modGain.gain = beta * fm
 *
 * because beta is defined as peak frequency deviation over modulator
 * frequency. What is new is that beta now MOVES, per note, and that motion is
 * the instrument. Chowning's own brass and bell patches were exactly this: an
 * index envelope, bright on the strike and settling as the note sustains.
 *
 * THE INDEX TRAJECTORY IS KEPT TWICE, ON PURPOSE. The audio thread follows an
 * AudioParam automation and the page draws from betaAt(), an analytic copy of
 * the same curve. An AudioParam's .value does not report automation, so the
 * display cannot read the sound back; instead both are driven from one record,
 *
 *     beta(t) = b1 + (b0 - b1) * exp(-(t - t0) / tau)
 *
 * which is precisely what setTargetAtTime() computes. steer() is the only
 * place either half is changed, so they cannot disagree. Every retarget starts
 * from betaAt(now), and an exponential is memoryless, so restarting one from
 * where it currently is never makes a step.
 *
 * Nothing here computes a Bessel function. The ear remains the independent
 * check on bessel.js: settle a note on beta = 2.4048 and its carrier really
 * does drop out of the sound, and no code on this page arranged that.
 */

const ToneEngine = (() => {

    let ctx = null;
    let bus = null;
    const voices = [];

    /* Per voice, before the compressor. Quiet on purpose, as it always was:
     * the interesting part is the sidebands blooming, which is easier to hear
     * under the fatigue threshold, and eight of these can sound at once. */
    const LEVEL = 0.13;
    const MAX_VOICES = 8;
    const BETA_CAP = 12;            /* Bessel.BETA_MAX: past it the table lies */

    /* The patch every new note is built from, and every sounding note is
     * steered toward. setPatch() replaces it. */
    let P = { beta: 2.404826, strike: 0, decay: 0.3, ratio: 0.5,
              attack: 0.01, fade: 0, release: 0.3 };

    let override = null;            /* a hand on the grating: see setOverride() */
    let bend = 1;                   /* pitch-bend factor, carrier and modulator alike */

    function ensure() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        /* A compressor rather than a lower LEVEL: one note should sound like
         * one note, and a chord should not clip. */
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 12;
        comp.ratio.value = 4;
        bus = ctx.createGain();
        bus.gain.value = 0.9;
        bus.connect(comp);
        comp.connect(ctx.destination);
    }

    /* Browsers hand back a suspended context until a gesture unlocks it. Every
     * way into a note is a gesture, so each one calls this first. */
    async function resume() {
        ensure();
        if (ctx.state === 'suspended') await ctx.resume();
    }

    const now = () => (ctx ? ctx.currentTime : 0);
    const clampBeta = (b) => Math.max(0, Math.min(BETA_CAP, b));

    function betaAt(v, t) {
        const r = v.tr;
        if (t <= r.t0 || !(r.tau > 0)) return t <= r.t0 ? r.b0 : r.b1;
        return r.b1 + (r.b0 - r.b1) * Math.exp(-(t - r.t0) / r.tau);
    }

    /* The single writer of a voice's index, for both halves. */
    function steer(v, target, tau, t) {
        const b0 = betaAt(v, t);
        v.tr = { b0, b1: target, t0: t, tau };
        const g = v.modGain.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(b0 * v.fm, t);
        if (tau > 0) g.setTargetAtTime(target * v.fm, t, tau);
        else g.setValueAtTime(target * v.fm, t);
    }

    /* Where a voice is headed when nobody is holding the grating. */
    const restingBeta = () => P.beta;

    function prune(t) {
        for (let i = voices.length - 1; i >= 0; i--) {
            if (voices[i].end !== null && t > voices[i].end) voices.splice(i, 1);
        }
    }

    const hz = (note) => 440 * Math.pow(2, (note - 69) / 12);

    function retune(v, t) {
        v.fc = hz(v.note) * bend;
        v.fm = v.fc * P.ratio;
        v.car.frequency.setTargetAtTime(v.fc, t, 0.01);
        v.mod.frequency.setTargetAtTime(v.fm, t, 0.01);
        /* The deviation is beta * fm, so a new fm needs a new gain to keep the
         * same beta. Re-steering toward the same target with the same tau is
         * the same curve, rescaled. */
        steer(v, v.tr.b1, v.tr.tau, t);
    }

    function release(v, t, tau) {
        if (v.end !== null) return;
        v.rel.gain.setTargetAtTime(0, t, tau);
        v.end = t + tau * 8 + 0.05;
        v.car.stop(v.end);
        v.mod.stop(v.end);
    }

    /* velocity 0..1. Returns nothing; the display asks focus() what is sounding. */
    function noteOn(note, velocity) {
        ensure();
        const t = now();
        prune(t);

        /* The same key struck again is a new strike, not a second voice. */
        for (const v of voices) if (v.note === note && v.end === null) release(v, t, 0.02);

        const live = voices.filter((v) => v.end === null);
        if (live.length >= MAX_VOICES) release(live[0], t, 0.01);

        const car = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        const amp = ctx.createGain();
        const rel = ctx.createGain();

        /* Into the frequency AudioParam, not the signal path: that is the
         * whole difference between FM and ring modulation. */
        mod.connect(modGain);
        modGain.connect(car.frequency);
        car.connect(amp);
        amp.connect(rel);
        rel.connect(bus);

        const v = { note, velocity, car, mod, modGain, amp, rel,
                    fc: 0, fm: 0, born: t, end: null,
                    tr: { b0: 0, b1: 0, t0: t, tau: 0 } };

        v.fc = hz(note) * bend;
        v.fm = v.fc * P.ratio;
        car.frequency.value = v.fc;
        mod.frequency.value = v.fm;

        /* The strike: velocity adds index on top of the resting depth and it
         * decays back. A hard hit is a bright, crowded spectrum and a wide
         * fan of orders; a soft one barely moves off the resting beta. */
        if (override !== null) {
            v.tr = { b0: override, b1: override, t0: t, tau: 0 };
            modGain.gain.value = override * v.fm;
        } else {
            v.tr = { b0: clampBeta(restingBeta() + P.strike * velocity), b1: restingBeta(),
                     t0: t, tau: Math.max(0.005, P.decay) };
            modGain.gain.setValueAtTime(v.tr.b0 * v.fm, t);
            modGain.gain.setTargetAtTime(v.tr.b1 * v.fm, t, v.tr.tau);
        }

        /* Amplitude lives on two nodes so release never has to cancel the
         * attack or the fade in flight: amp is the note's own shape, rel is
         * the key coming up. */
        const peak = LEVEL * (0.25 + 0.75 * velocity);
        amp.gain.setValueAtTime(0, t);
        amp.gain.linearRampToValueAtTime(peak, t + Math.max(0.002, P.attack));
        if (P.fade > 0) amp.gain.setTargetAtTime(0, t + Math.max(0.002, P.attack), P.fade);
        rel.gain.value = 1;

        car.start(t);
        mod.start(t);
        car.onended = () => { car.disconnect(); mod.disconnect(); modGain.disconnect(); amp.disconnect(); rel.disconnect(); };

        voices.push(v);
    }

    function noteOff(note) {
        if (!ctx) return;
        const t = now();
        for (const v of voices) if (v.note === note && v.end === null) release(v, t, Math.max(0.01, P.release));
    }

    function allOff() {
        if (!ctx) return;
        const t = now();
        for (const v of voices) release(v, t, 0.03);
    }

    /* Patch edits reach the notes already sounding. A new ratio retunes the
     * modulators; a new resting beta becomes every voice's target, approached
     * quickly enough to feel like a knob and slowly enough not to click. */
    function setPatch(p) {
        const ratioMoved = p.ratio !== P.ratio;
        const betaMoved = p.beta !== P.beta;
        P = Object.assign({}, p);
        if (!ctx) return;
        const t = now();
        for (const v of voices) {
            if (ratioMoved) retune(v, t);
            if (betaMoved && override === null) steer(v, restingBeta(), 0.04, t);
        }
    }

    /* A hand on the grating, or a mod wheel: every voice is pressed to this
     * beta while it is held, and eases back to its resting depth when let go.
     * null lets go. */
    function setOverride(beta) {
        override = beta === null ? null : clampBeta(beta);
        if (!ctx) return;
        const t = now();
        for (const v of voices) {
            if (override !== null) steer(v, override, 0.015, t);
            else steer(v, restingBeta(), 0.08, t);
        }
    }

    function setBend(semitones) {
        bend = Math.pow(2, semitones / 12);
        if (!ctx) return;
        const t = now();
        for (const v of voices) retune(v, t);
    }

    /* What the panels draw: the newest note still held, or else the newest
     * note still ringing. null when the instrument is silent. */
    function focus() {
        if (!ctx) return null;
        const t = now();
        prune(t);
        let v = null;
        for (let i = voices.length - 1; i >= 0; i--) {
            if (voices[i].end === null) { v = voices[i]; break; }
        }
        if (!v && voices.length) v = voices[voices.length - 1];
        if (!v) return null;
        return { note: v.note, fc: v.fc, fm: v.fm, beta: betaAt(v, t) };
    }

    const sounding = () => (ctx ? (prune(now()), voices.length) : 0);

    return { resume, noteOn, noteOff, allOff, setPatch, setOverride, setBend, focus, sounding, hz,
             override: () => override };
})();
