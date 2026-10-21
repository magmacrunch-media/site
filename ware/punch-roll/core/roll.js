// core/roll.js: the edits a piano roll makes to a song, as pure functions.
//
// A song here is the plain JSON adenosine-synth plays (see its API.md): tracks
// of notes on a tick grid. Nothing in this file touches the DOM or the audio;
// the view turns pointer positions into (tick, pitch) and calls these.

(function () {
    'use strict';

    const App = (window.PunchRoll = window.PunchRoll || {});

    // The visible keyboard: C1 to C7, in MIDI semitones. A song with a tuning
    // counts pitch in its steps instead; pitchLo and pitchHi give the range
    // in the song's own steps.
    const PITCH_LO = 24;
    const PITCH_HI = 96;
    const BEATS_PER_BAR = 4;
    // Ticks per beat the editor works in: a multiple of 4 and of 3, so
    // sixteenths and every triplet grid land on whole ticks.
    const RESOLUTION = 12;
    // The synth's ceiling on ticksPerBeat.
    const MAX_TPB = 96;

    const BLACK = new Set([1, 3, 6, 8, 10]);

    function isBlack(pitch) {
        return BLACK.has(((pitch % 12) + 12) % 12);
    }

    // ── tuning ──────────────────────────────────────────
    // song.tuning is the synth's { edo }: that many equal steps to the
    // octave, absent for 12. A note's pitch counts its steps from the same C,
    // so in 24-EDO step 120 is C4 and every odd step is a quarter tone.

    /** The tunings the panel offers, as steps to the octave. */
    const TUNINGS = [12, 19, 24, 31];

    function edoOf(song) {
        return (song && song.tuning && song.tuning.edo) || 12;
    }

    /** The keyboard's range, C1 to C7, in the song's steps. */
    function pitchLo(song) { return (PITCH_LO * edoOf(song)) / 12; }
    function pitchHi(song) { return (PITCH_HI * edoOf(song)) / 12; }

    /**
     * Where the naturals fall in an EDO, read from its fifth as a meantone
     * keyboard lays them out: the fifth is the step nearest 3:2, a whole tone
     * two fifths less an octave, and the diatonic semitone what five whole
     * tones leave of it, halved. A sharp raises by the chromatic semitone,
     * the whole tone less the diatonic one. In steps of the octave:
     *
     *   12-EDO  C 0, D 2, E 4, F 5, G 7,  A 9,  B 11; sharp 1
     *   19-EDO  C 0, D 3, E 6, F 8, G 11, A 14, B 17; sharp 1
     *   24-EDO  C 0, D 4, E 8, F 10, G 14, A 18, B 22; sharp 2
     *   31-EDO  C 0, D 5, E 10, F 13, G 18, A 23, B 28; sharp 2
     */
    function layout(edo) {
        const fifth = Math.round(edo * Math.log2(1.5));
        const tone = 2 * fifth - edo;
        const semitone = (edo - 5 * tone) / 2;
        const naturals = [0, tone, 2 * tone, 2 * tone + semitone, 3 * tone + semitone, 4 * tone + semitone, 5 * tone + semitone];
        return { naturals, sharp: tone - semitone };
    }

    /**
     * How a row is drawn: 'white' for a natural; 'black' for a sharp or a
     * flat of one, a chromatic semitone off it (C# and Db are separate keys
     * in 19- and 31-EDO); 'micro' for anything finer between them, the
     * quarter tones of 24-EDO and the half-sharps of 31.
     */
    function keyKind(song, pitch) {
        const edo = edoOf(song);
        const { naturals, sharp } = layout(edo);
        const step = ((pitch % edo) + edo) % edo;
        if (naturals.includes(step)) return 'white';
        const below = Math.max(...naturals.filter((n) => n < step));
        const above = Math.min(...naturals.filter((n) => n > step).concat(edo));
        return step - below === sharp || above - step === sharp ? 'black' : 'micro';
    }

    /** Whether a step is a C, where the keyboard is labelled. */
    function isOctave(song, pitch) {
        const e = edoOf(song);
        return ((pitch % e) + e) % e === 0;
    }

    /**
     * Retune the song to `edo` steps, keeping every note's sound: each moves
     * to the nearest step of the new tuning, and the difference, never more
     * than half a step, goes into its cents. From 24-EDO to 12, a quarter
     * tone becomes a semitone with 50 cents. Notes are kept on the keyboard.
     * Returns how many notes came out detuned that were not before.
     */
    function setTuning(song, edo) {
        const from = edoOf(song);
        if (edo === 12) delete song.tuning;
        else song.tuning = { edo };
        let detuned = 0;
        for (const t of song.tracks) {
            for (const n of t.notes) {
                const had = centsOf(n);
                retune(n, from, edo);
                n.pitch = clamp(n.pitch, pitchLo(song), pitchHi(song));
                if (!had && centsOf(n)) detuned++;
            }
        }
        return detuned;
    }

    /** One note from `from` steps to the octave to `to`, sounding the same. */
    function retune(n, from, to) {
        if (from === to) return;
        const semis = (n.pitch * 12) / from + centsOf(n) / 100;
        n.pitch = Math.round((semis * to) / 12);
        setCents(n, (semis - (n.pitch * 12) / to) * 100);
    }

    function clamp(v, lo, hi) {
        return Math.min(hi, Math.max(lo, v));
    }

    // ── meter and grid ──────────────────────────────────
    // song.meter is the synth's { beats, unit }, absent for 4/4. The beat
    // that ticksPerBeat and bpm count stays a quarter note in every meter.

    /** The meters the toolbar offers, as "beats/unit". */
    const METERS = ['4/4', '3/4', '2/4', '5/4', '6/8', '9/8', '12/8', '5/8', '7/8'];

    function meterOf(song) {
        return song.meter || { beats: BEATS_PER_BAR, unit: 4 };
    }

    function ticksPerBar(song) {
        const m = meterOf(song);
        return (song.ticksPerBeat * m.beats * 4) / m.unit;
    }

    /**
     * Compound meters (6/8, 9/8, 12/8) are felt in dotted quarters, three of
     * their eighths to a beat; every other meter counts its unit.
     */
    function isCompound(song) {
        const m = meterOf(song);
        return m.unit >= 8 && m.beats > 3 && m.beats % 3 === 0;
    }

    /** Ticks in one felt beat: what the grid draws stronger and where() counts. */
    function beatTicks(song) {
        const m = meterOf(song);
        return ((song.ticksPerBeat * 4) / m.unit) * (isCompound(song) ? 3 : 1);
    }

    /**
     * Change the meter, given as "beats/unit". Notes keep their time; the
     * song's length rounds up to whole bars of the new meter, within 256, and
     * past that the end is cut as setBars cuts it. Returns how many notes
     * that dropped.
     */
    function setMeter(song, text) {
        const [beats, unit] = String(text).split('/').map(Number);
        const oldLength = song.length;
        if (beats === BEATS_PER_BAR && unit === 4) delete song.meter;
        else song.meter = { beats, unit };
        return setBars(song, Math.ceil(oldLength / ticksPerBar(song)));
    }

    /**
     * The grid sizes, as note values: "1/8" an eighth, "1/8t" an eighth
     * triplet, "1/4." a dotted quarter. "bar" is a bar of the song's meter.
     */
    const GRIDS = ['1/16t', '1/16', '1/8t', '1/8', '1/4t', '1/4', '1/4.', '1/2', 'bar'];

    /** A grid size in the song's ticks, at least one. */
    function gridTicks(song, grid) {
        if (grid === 'bar') return Math.max(1, Math.round(ticksPerBar(song)));
        const m = /^1\/(\d+)([t.]?)$/.exec(String(grid));
        if (!m) return Math.max(1, song.ticksPerBeat / 4);
        const k = m[2] === 't' ? 2 / 3 : m[2] === '.' ? 3 / 2 : 1;
        return Math.max(1, Math.round(((song.ticksPerBeat * 4) / Number(m[1])) * k));
    }

    function gcd(a, b) {
        return b ? gcd(b, a % b) : a;
    }

    /**
     * Multiply the song's ticksPerBeat by a whole number, scaling every tick
     * in it (notes, tempo changes, the length) to match, so it sounds exactly
     * as before. Songs come in at the synth's default of 4 ticks to the beat;
     * this brings them up to RESOLUTION, which triplets need. A resolution
     * that already divides by it, or one the synth could not hold once
     * raised, is left alone. Returns whether it changed anything.
     */
    function refine(song) {
        const tpb = song.ticksPerBeat;
        const k = RESOLUTION / gcd(tpb, RESOLUTION);
        if (k === 1 || tpb * k > MAX_TPB) return false;
        song.ticksPerBeat = tpb * k;
        song.length *= k;
        for (const t of song.tracks) {
            for (const n of t.notes) {
                n.tick *= k;
                n.length *= k;
            }
        }
        for (const m of song.tempos || []) m.tick *= k;
        if (song.loop) {
            song.loop.from *= k;
            song.loop.to *= k;
        }
        return true;
    }

    /**
     * A note's velocity, 0 to 1. Full velocity is stored as no field at all,
     * which is what the synth assumes when one is missing, so songs that
     * never touch velocity save exactly as they did before.
     */
    function velocityOf(note) {
        return note.velocity === undefined ? 1 : clamp(note.velocity, 0, 1);
    }

    /** Set a note's velocity, clamped and kept to two decimals. */
    function setVelocity(note, v) {
        const x = Math.round(clamp(v, 0, 1) * 100) / 100;
        if (x >= 1) delete note.velocity;
        else note.velocity = x;
    }

    // ── microtones ──────────────────────────────────────
    // A note's `cents` is the synth's detune: it sounds at pitch + cents/100.
    // The editor keeps it to whole cents within a quarter tone either way,
    // which reaches every pitch between two semitones. In tune is no field at
    // all, as full velocity is, so songs without detune save as before.

    const CENTS_MAX = 50;

    function centsOf(note) {
        return note.cents === undefined ? 0 : clamp(note.cents, -CENTS_MAX, CENTS_MAX);
    }

    /** Set a note's detune, clamped and rounded to a whole cent. */
    function setCents(note, c) {
        const x = Math.round(clamp(c, -CENTS_MAX, CENTS_MAX));
        if (x === 0) delete note.cents;
        else note.cents = x;
    }

    /**
     * The fractional MIDI pitch a note sounds at, for previews: its step in
     * the song's tuning plus its cents, as the synth's soundingPitch.
     */
    function soundingPitch(note, song) {
        return (note.pitch * 12) / edoOf(song) + centsOf(note) / 100;
    }

    /**
     * Detune every one of `notes` by `delta` cents, each clamped. `delta`
     * null puts them back in tune. Returns how many changed.
     */
    function nudgeCents(notes, delta) {
        let changed = 0;
        for (const n of notes) {
            const before = centsOf(n);
            setCents(n, delta === null ? 0 : before + delta);
            if (centsOf(n) !== before) changed++;
        }
        return changed;
    }

    /** Snap a fractional tick down onto a grid of `grid` ticks. */
    function snap(tick, grid) {
        const g = Math.max(1, grid);
        return Math.floor(tick / g) * g;
    }

    /**
     * Snap down onto the grid counted from the start of the bar `tick` is
     * in, so a grid that does not divide the bar (quarters in 7/8) still
     * starts again on every bar line.
     */
    function snapInBar(song, tick, grid) {
        const tpBar = ticksPerBar(song);
        const bar = Math.round(Math.floor(tick / tpBar) * tpBar);
        return bar + snap(tick - bar, grid);
    }

    /**
     * The note on a track under (tick, pitch), topmost (latest added) first,
     * and whether the point is on its right edge, which resizes. `edge` is in
     * ticks: how close to the end counts as the handle.
     */
    function hitTest(track, tick, pitch, edge) {
        for (let i = track.notes.length - 1; i >= 0; i--) {
            const n = track.notes[i];
            if (n.pitch !== pitch) continue;
            const end = n.tick + n.length;
            if (tick >= n.tick && tick < end) {
                return { index: i, zone: end - tick <= edge ? 'edge' : 'body' };
            }
        }
        return null;
    }

    /**
     * Add a note, clamped into the song, at full velocity and in tune unless
     * `note` says otherwise. A note already starting on the same tick and pitch is
     * replaced rather than stacked. Returns its index.
     */
    function addNote(song, trackIndex, note) {
        const track = song.tracks[trackIndex];
        const tick = clamp(Math.round(note.tick), 0, song.length - 1);
        const n = {
            tick,
            length: clamp(Math.round(note.length), 1, song.length - tick),
            pitch: clamp(Math.round(note.pitch), pitchLo(song), pitchHi(song)),
        };
        setVelocity(n, velocityOf(note));
        setCents(n, centsOf(note));
        const dup = track.notes.findIndex((x) => x.tick === n.tick && x.pitch === n.pitch);
        if (dup >= 0) track.notes.splice(dup, 1);
        track.notes.push(n);
        return track.notes.length - 1;
    }

    function deleteNote(song, trackIndex, index) {
        song.tracks[trackIndex].notes.splice(index, 1);
    }

    /** Put a note at a new start and pitch, kept wholly inside the song. */
    function placeNote(song, note, tick, pitch) {
        note.tick = clamp(Math.round(tick), 0, song.length - note.length);
        note.pitch = clamp(Math.round(pitch), pitchLo(song), pitchHi(song));
    }

    /** Set a note's length, at least 1 and never past the end of the song. */
    function resizeNote(song, note, length) {
        note.length = clamp(Math.round(length), 1, song.length - note.tick);
    }

    /**
     * Lengthen (delta > 0) or shorten every one of `notes` by `delta` ticks,
     * each kept at least one tick long and inside the song, as resizeNote
     * keeps it. Returns how many actually changed.
     */
    function nudgeLength(song, notes, delta) {
        let changed = 0;
        for (const n of notes) {
            const before = n.length;
            resizeNote(song, n, n.length + delta);
            if (n.length !== before) changed++;
        }
        return changed;
    }

    /**
     * Snap the starts of `notes` to the nearest multiple of `grid`, keeping
     * their lengths. One that would then run past the end snaps back a line
     * instead. Two notes left on the same tick and pitch would sound as one,
     * so where at least one of them was quantized the longer is kept. Returns
     * { moved, merged }.
     */
    function quantizeNotes(song, trackIndex, notes, grid) {
        const g = Math.max(1, Math.round(grid));
        let moved = 0;
        for (const n of notes) {
            let t = Math.round(n.tick / g) * g;
            if (t + n.length > song.length) t = Math.floor(n.tick / g) * g;
            if (t !== n.tick) {
                n.tick = t;
                moved++;
            }
        }
        const track = song.tracks[trackIndex];
        const mine = new Set(notes);
        const at = new Map();
        const gone = new Set();
        for (const n of track.notes) {
            const key = `${n.tick}:${n.pitch}`;
            const other = at.get(key);
            if (!other) { at.set(key, n); continue; }
            if (!mine.has(n) && !mine.has(other)) continue;
            const loser = n.length > other.length ? other : n;
            gone.add(loser);
            if (loser === other) at.set(key, n);
        }
        if (gone.size) track.notes = track.notes.filter((n) => !gone.has(n));
        return { moved, merged: gone.size };
    }

    /**
     * Round the lengths of `notes` to the nearest multiple of `grid`, at least
     * one grid step and never past the end of the song (resizeNote's clamp).
     * Starts are left alone. Returns how many changed.
     */
    function quantizeLengths(song, notes, grid) {
        const g = Math.max(1, Math.round(grid));
        let changed = 0;
        for (const n of notes) {
            const before = n.length;
            resizeNote(song, n, Math.max(1, Math.round(n.length / g)) * g);
            if (n.length !== before) changed++;
        }
        return changed;
    }

    // ── tempo changes ───────────────────────────────────
    // song.tempos is the synth's: [{ tick, bpm }], sorted, one per tick, each
    // inside the song (tick 0's tempo is song.bpm). Markers are handled as the
    // objects in that list, as notes are. An empty list is removed rather than
    // left as [], so a song that never had one saves as it always did.

    const BPM_LO = 20;
    const BPM_HI = 400;

    function clampBpm(bpm) {
        return clamp(Math.round(bpm), BPM_LO, BPM_HI);
    }

    function tidyTempos(song) {
        if (!song.tempos) return;
        song.tempos.sort((a, b) => a.tick - b.tick);
        if (!song.tempos.length) delete song.tempos;
    }

    /**
     * Add a tempo change at `tick`, or retime the one already there. Returns
     * the marker, or null when `tick` cannot hold one (0, or past the end).
     */
    function addTempo(song, tick, bpm) {
        const t = Math.round(tick);
        if (t <= 0 || t >= song.length) return null;
        const list = song.tempos || (song.tempos = []);
        let m = list.find((x) => x.tick === t);
        if (m) m.bpm = clampBpm(bpm);
        else list.push(m = { tick: t, bpm: clampBpm(bpm) });
        tidyTempos(song);
        return m;
    }

    /**
     * Move a marker to `tick`, kept inside the song. A tick another marker
     * already holds is refused: the marker stays put and false comes back.
     */
    function moveTempo(song, marker, tick) {
        const t = clamp(Math.round(tick), 1, song.length - 1);
        if (song.tempos.some((x) => x !== marker && x.tick === t)) return false;
        marker.tick = t;
        tidyTempos(song);
        return true;
    }

    function setTempo(marker, bpm) {
        marker.bpm = clampBpm(bpm);
    }

    function deleteTempo(song, marker) {
        if (!song.tempos) return;
        song.tempos = song.tempos.filter((x) => x !== marker);
        tidyTempos(song);
    }

    /**
     * Change the song's length in bars. Notes that would start past the new
     * end are dropped and the rest are trimmed to fit. Returns how many were
     * dropped, so the caller can say so.
     */
    function setBars(song, bars) {
        const length = Math.round(clamp(Math.round(bars), 1, 256) * ticksPerBar(song));
        let dropped = 0;
        for (const t of song.tracks) {
            const keep = t.notes.filter((n) => n.tick < length);
            dropped += t.notes.length - keep.length;
            for (const n of keep) n.length = Math.min(n.length, length - n.tick);
            t.notes = keep;
        }
        song.length = length;
        if (song.tempos) {
            song.tempos = song.tempos.filter((m) => m.tick < length);
            tidyTempos(song);
        }
        if (song.loop) setLoop(song, song.loop.from, song.loop.to);
        return dropped;
    }

    // ── loop region ─────────────────────────────────────
    // song.loop is { from, to } in ticks: the stretch Play goes round while
    // Loop is on. It is the editor's, not the synth's, which always loops the
    // whole song: the page hands the sequencer loopSlice(song) instead, and
    // normalizeSong drops the field, so keepLoop carries it across. No loop
    // is no field, as with tempos, and a loop of the whole song is no loop.

    /** The song's loop region, kept inside the song, or null for none. */
    function loopOf(song) {
        const l = song.loop;
        if (!l || !Number.isFinite(l.from) || !Number.isFinite(l.to)) return null;
        const from = clamp(Math.round(Math.min(l.from, l.to)), 0, song.length - 1);
        const to = clamp(Math.round(Math.max(l.from, l.to)), from + 1, song.length);
        return from === 0 && to === song.length ? null : { from, to };
    }

    /**
     * Loop ticks [from, to), given in either order and kept inside the song,
     * at least a tick long. The whole song clears it. Returns the region, or
     * null when there is none.
     */
    function setLoop(song, from, to) {
        song.loop = { from, to };
        const l = loopOf(song);
        if (l) song.loop = l;
        else delete song.loop;
        return l;
    }

    function clearLoop(song) {
        delete song.loop;
    }

    /** Copy a loop from `raw`, a song as read from a file, onto `song`, its normalized self. */
    function keepLoop(raw, song) {
        if (raw && raw.loop && typeof raw.loop === 'object') setLoop(song, Number(raw.loop.from), Number(raw.loop.to));
        return song;
    }

    /** The tempo in force at `tick`: the last change at or before it, or the song's BPM. */
    function tempoAt(song, tick) {
        let bpm = song.bpm;
        for (const m of song.tempos || []) if (m.tick <= tick) bpm = m.bpm;
        return bpm;
    }

    /**
     * The loop region as a song of its own, for the sequencer to go round: the
     * notes starting inside it, moved to the start and cut off at its end, at
     * the tempo in force where it begins, with the tempo changes inside it.
     * A note held into the region from before it is left out, as one held
     * past the end of the song is cut off when it loops. No loop: the song.
     */
    function loopSlice(song) {
        const l = loopOf(song);
        if (!l) return song;
        const out = { ...song, bpm: tempoAt(song, l.from), length: l.to - l.from };
        delete out.loop;
        out.tracks = song.tracks.map((t) => ({
            ...t,
            notes: t.notes
                .filter((n) => n.tick >= l.from && n.tick < l.to)
                .map((n) => ({ ...n, tick: n.tick - l.from, length: Math.min(n.length, l.to - n.tick) })),
        }));
        const tempos = (song.tempos || [])
            .filter((m) => m.tick > l.from && m.tick < l.to)
            .map((m) => ({ tick: m.tick - l.from, bpm: m.bpm }));
        if (tempos.length) out.tempos = tempos;
        else delete out.tempos;
        return out;
    }

    // ── envelope ────────────────────────────────────────
    // A track's instrument carries the synth's attack, decay and release in
    // seconds and its sustain level, 0 to 1. The panel's sliders run 0 to 1;
    // a time is the square of that times its ceiling, so the short times a
    // chip sound lives on get most of the slider's travel.

    const ENVELOPE = [
        { key: 'attack', label: 'A', max: 1, does: 'Attack: how long a note takes to reach full level' },
        { key: 'decay', label: 'D', max: 2, does: 'Decay: how long it takes to fall from there to the sustain level' },
        { key: 'sustain', label: 'S', max: 1, does: 'Sustain: the level it holds at while the note lasts' },
        { key: 'release', label: 'R', max: 2, does: 'Release: how long it takes to fade once the note ends' },
    ];

    function envelopeStage(key) {
        return ENVELOPE.find((e) => e.key === key);
    }

    /** An envelope value as a slider position, 0 to 1. */
    function envelopeToSlider(key, value) {
        const e = envelopeStage(key);
        const x = clamp(value / e.max, 0, 1);
        return key === 'sustain' ? x : Math.sqrt(x);
    }

    /** A slider position as an envelope value: whole milliseconds, or a sustain to two decimals. */
    function sliderToEnvelope(key, pos) {
        const e = envelopeStage(key);
        const x = clamp(pos, 0, 1);
        if (key === 'sustain') return Math.round(x * 100) / 100;
        return Math.round(x * x * e.max * 1000) / 1000;
    }

    /** An envelope value as the panel shows it: "5ms", "1.2s", "70%". */
    function envelopeText(key, value) {
        if (key === 'sustain') return `${Math.round(value * 100)}%`;
        return value < 1 ? `${Math.round(value * 1000)}ms` : `${Math.round(value * 100) / 100}s`;
    }

    /**
     * Indices of a track's notes that overlap ticks [t0, t1) and lie on a
     * pitch in [p0, p1]. The corners may come in either order, so a rubber
     * band dragged up and to the left works the same as one dragged down.
     */
    function notesIn(track, t0, t1, p0, p1) {
        const tLo = Math.min(t0, t1);
        const tHi = Math.max(t0, t1);
        const pLo = Math.min(p0, p1);
        const pHi = Math.max(p0, p1);
        const out = [];
        track.notes.forEach((n, i) => {
            if (n.pitch >= pLo && n.pitch <= pHi && n.tick < tHi && n.tick + n.length > tLo) out.push(i);
        });
        return out;
    }

    /**
     * Clamp a shift of (tick, pitch) so every one of `notes` stays wholly
     * inside the song and on the keyboard. The group moves as one: it stops
     * when its first note hits a wall, rather than squashing up against it.
     * `notes` need only carry tick, length and pitch, so a drag can pass the
     * positions it started from.
     */
    function clampShift(song, notes, tick, pitch) {
        let tLo = -Infinity;
        let tHi = Infinity;
        let pLo = -Infinity;
        let pHi = Infinity;
        for (const n of notes) {
            tLo = Math.max(tLo, -n.tick);
            tHi = Math.min(tHi, song.length - n.tick - n.length);
            pLo = Math.max(pLo, pitchLo(song) - n.pitch);
            pHi = Math.min(pHi, pitchHi(song) - n.pitch);
        }
        return { tick: clamp(Math.round(tick), tLo, tHi), pitch: clamp(Math.round(pitch), pLo, pHi) };
    }

    /**
     * Move `notes` together by up to (tick, pitch), clamped as clampShift
     * clamps a drag. Returns the shift actually applied.
     */
    function moveNotes(song, notes, tick, pitch) {
        const d = clampShift(song, notes, tick, pitch);
        for (const n of notes) {
            n.tick += d.tick;
            n.pitch += d.pitch;
        }
        return d;
    }

    /**
     * Copy notes into a clip: positions relative to the beat the earliest one
     * falls in, so an offbeat phrase pastes offbeat. `origin` is that beat's
     * tick, for pasting back in place; `span` is the clip's length rounded up
     * to whole beats, which is where a second paste goes. Returns null for no
     * notes.
     */
    function copyNotes(song, notes) {
        if (!notes.length) return null;
        const tpBeat = song.ticksPerBeat;
        const first = Math.min(...notes.map((n) => n.tick));
        const end = Math.max(...notes.map((n) => n.tick + n.length));
        const origin = Math.floor(first / tpBeat) * tpBeat;
        return {
            ticksPerBeat: tpBeat,
            edo: edoOf(song),
            origin,
            span: Math.ceil((end - origin) / tpBeat) * tpBeat,
            notes: notes
                .map((n) => {
                    const c = { tick: n.tick - origin, length: n.length, pitch: n.pitch };
                    setVelocity(c, velocityOf(n));
                    setCents(c, centsOf(n));
                    return c;
                })
                .sort((a, b) => a.tick - b.tick || a.pitch - b.pitch),
        };
    }

    /**
     * Paste a clip onto a track with its origin at tick `at`, rescaled if the
     * song has a different ticksPerBeat from the one it was copied from, and
     * retuned, sounding the same, if it has a different tuning.
     * Notes that would start past the end are left out; the rest clamp as
     * addNote does. Returns the added note objects (not indices: addNote's
     * replace-on-duplicate shifts those).
     */
    function pasteNotes(song, trackIndex, clip, at) {
        const track = song.tracks[trackIndex];
        const k = song.ticksPerBeat / clip.ticksPerBeat;
        const added = [];
        for (const c of clip.notes) {
            const tick = Math.round(at + c.tick * k);
            if (tick < 0 || tick >= song.length) continue;
            const n = { tick, length: Math.max(1, c.length * k), pitch: c.pitch, velocity: c.velocity, cents: c.cents };
            retune(n, clip.edo || 12, edoOf(song));
            added.push(track.notes[addNote(song, trackIndex, n)]);
        }
        return added.filter((n) => track.notes.includes(n));
    }

    /**
     * Copy notes and paste them straight after themselves on the same track:
     * at the clip's origin plus its span, so the copy keeps the original's
     * place in the beat. Returns { at, added, total }, `added` being the new
     * note objects and `total` how many there were to copy; nothing is added
     * when `at` is past the end.
     */
    function duplicateNotes(song, trackIndex, notes) {
        const clip = copyNotes(song, notes);
        if (!clip) return null;
        const at = clip.origin + clip.span;
        const added = at < song.length ? pasteNotes(song, trackIndex, clip, at) : [];
        return { at, added, total: clip.notes.length };
    }

    /**
     * Move notes from one track to another, keeping their time, pitch, length,
     * velocity and detune. One that lands on a note already starting on the same
     * tick and pitch replaces it, as addNote does. Returns the moved notes as
     * they now are on the destination track.
     */
    function moveToTrack(song, from, to, notes) {
        if (from === to) return notes.slice();
        deleteNotes(song, from, notes);
        const dest = song.tracks[to];
        const added = notes.map((n) => dest.notes[addNote(song, to, n)]);
        return added.filter((n) => dest.notes.includes(n));
    }

    /** Delete the given note objects from a track. Returns how many went. */
    function deleteNotes(song, trackIndex, notes) {
        const gone = new Set(notes);
        const track = song.tracks[trackIndex];
        const before = track.notes.length;
        track.notes = track.notes.filter((n) => !gone.has(n));
        return before - track.notes.length;
    }

    function bars(song) {
        return Math.ceil(song.length / ticksPerBar(song));
    }

    App.roll = {
        PITCH_LO, PITCH_HI, BEATS_PER_BAR, RESOLUTION,
        TUNINGS, edoOf, pitchLo, pitchHi, keyKind, isOctave, setTuning,
        METERS, meterOf, isCompound, beatTicks, setMeter, GRIDS, gridTicks, refine,
        isBlack, snap, snapInBar, ticksPerBar, hitTest, addNote, deleteNote, placeNote,
        resizeNote, setBars, bars, notesIn, clampShift, copyNotes, pasteNotes,
        deleteNotes, velocityOf, setVelocity, CENTS_MAX, centsOf, setCents, soundingPitch, nudgeCents, nudgeLength, moveNotes, duplicateNotes,
        quantizeNotes, quantizeLengths, moveToTrack,
        BPM_LO, BPM_HI, addTempo, moveTempo, setTempo, deleteTempo, tempoAt,
        loopOf, setLoop, clearLoop, keepLoop, loopSlice,
        ENVELOPE, envelopeToSlider, sliderToEnvelope, envelopeText,
    };
}());
