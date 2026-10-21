// main.js: page wiring. Last in the load order; everything is attached.
//
// One song object is the document. The roll view and the track panel edit it
// in place, every edit ends in changed(), and changed() hands the sequencer a
// copy, so a tempo change is seen as a change (the sequencer compares old and
// new to re-anchor) and autosave runs.

(function () {
    'use strict';

    const App = window.PunchRoll;
    const S = window.AdSynth;
    const R = App.roll;
    const K = window.MagmaKit;

    const WAVE_LABEL = {
        pulse12: 'Pulse 12.5%', pulse25: 'Pulse 25%', pulse50: 'Pulse 50%',
        triangle: 'Triangle', saw: 'Saw', noise: 'Noise',
        sine: 'Sine', triangle4: 'Triangle 4-bit', noise93: 'Noise metallic',
    };
    const GRID_LABEL = {
        '1/16t': '1/16T', '1/16': '1/16', '1/8t': '1/8T', '1/8': '1/8',
        '1/4t': '1/4T', '1/4': '1/4', '1/4.': '1/4.', '1/2': '1/2', bar: '1 bar',
    };
    const AUTOSAVE = K.prefs.create('punch-roll:song');
    const PREFS = K.prefs.create('punch-roll:prefs');

    // ── theme ──────────────────────────────────────────────
    // magma-kit's themes: a magma-themes slug on <html>, picked per mode
    // (dark, light or auto, which follows the system live), each mode
    // remembering its own pick in PREFS. The markup names the default dark
    // theme. Every theme magma-themes has is offered.
    const themes = K.themes.create({ prefs: PREFS });
    themes.apply();

    // From the theme, through --track-1..6 in style.css. Refilled in place on
    // a theme change: the view holds this same array.
    const COLORS = [];
    function readColors() {
        COLORS.length = 0;
        for (let i = 1; i <= 6; i++) COLORS.push(App.theme.color(`var(--track-${i})`));
    }
    readColors();

    const $ = (id) => document.getElementById(id);

    // ── document state ─────────────────────────────────────
    let song = restore();
    let track = 0;
    let grid = savedGrid();
    let start = 0;
    let path = null;
    // The song as last saved or opened, to tell whether it has changed since.
    // Not the undo revision: selection changes are undo steps too, and
    // selecting a note does not make a song unsaved.
    let savedText = null;
    let strokeBefore = null;
    // Note objects on the current track. Undo and Open replace the song with
    // fresh objects, and changed() drops whatever is no longer there.
    const selection = new Set();
    let clip = null;
    // Repeated pastes tile: the next one goes after the last, until the start
    // marker moves or the track changes.
    let pasteNext = null;

    function restore() {
        const saved = AUTOSAVE.read();
        if (saved) {
            try { return fine(R.keepLoop(saved, S.normalizeSong(saved))); } catch { /* fall through to a fresh song */ }
        }
        return fine(demo());
    }

    /** A song brought up to the editor's resolution (see roll.refine), for chaining. */
    function fine(s) {
        R.refine(s);
        return s;
    }

    /**
     * The grid as a note value from R.GRIDS. Before triplets the pref was
     * `grid`, a count of ticks at 4 to the beat; it is read as its note value.
     */
    function savedGrid() {
        const p = PREFS.read() || {};
        if (R.GRIDS.includes(p.gridValue)) return p.gridValue;
        return { 1: '1/16', 2: '1/8', 4: '1/4', 16: 'bar' }[p.grid] || '1/16';
    }

    /** The grid in the current song's ticks. */
    function step() {
        return R.gridTicks(song, grid);
    }

    /** A few bars so a first launch makes a sound when Play is pressed. */
    function demo() {
        const s = S.createSong({ bpm: 140, length: 32 });
        const lead = [72, 76, 79, 76, 74, 77, 81, 77];
        lead.forEach((p, i) => s.tracks[0].notes.push({ tick: i * 4, length: 3, pitch: p }));
        [48, 48, 53, 53, 50, 50, 55, 55].forEach((p, i) => s.tracks[2].notes.push({ tick: i * 4, length: 2, pitch: p }));
        for (let t = 0; t < 32; t += 4) s.tracks[3].notes.push({ tick: t + 2, length: 1, pitch: 90 });
        return s;
    }

    // An undo state is the song plus which of the current track's notes were
    // selected, by index: restoring builds fresh note objects, so references
    // would not survive. Undo also returns to that track, so undoing a change
    // shows it rather than doing it off-screen.
    function snapshot() {
        const notes = song.tracks[track] ? song.tracks[track].notes : [];
        const sel = [];
        notes.forEach((n, i) => { if (selection.has(n)) sel.push(i); });
        return JSON.stringify({ song, track, sel });
    }

    const history = K.history.create({
        snapshot,
        restore: (state) => {
            const s = JSON.parse(state);
            song = s.song;
            track = Math.min(s.track, song.tracks.length - 1);
            selection.clear();
            const notes = song.tracks[track].notes;
            for (const i of s.sel) if (notes[i]) selection.add(notes[i]);
            refreshAll();
        },
    });

    /** Record a selection-only change as an undo step, if it changed anything. */
    function selectStep(fn) {
        const before = snapshot();
        fn();
        if (snapshot() !== before) history.push(before);
        view.draw();
    }

    // ── audio ──────────────────────────────────────────────
    // Created on the first gesture: a context made before one starts suspended.
    let ctx = null;
    let seq = null;
    // The loop region the sequencer was handed, or null for the whole song.
    // The sequencer only goes round a whole song, so with Loop on and a
    // region set it gets the region cut out as one (roll.loopSlice), and its
    // ticks count from the region's start.
    let looped = null;

    function audio() {
        if (!seq) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            seq = new S.Sequencer(handOver(), { context: ctx, loop: $('in-loop').checked });
            seq.onend = () => { setPlaying(false); view.draw(); };
        }
        if (ctx.state === 'suspended') ctx.resume();
        return seq;
    }

    /** The region Play goes round: the song's, while Loop is on. */
    function region() {
        return $('in-loop').checked ? R.loopOf(song) : null;
    }

    /** A copy of what the sequencer should play, noting which region it is. */
    function handOver() {
        looped = region();
        return JSON.parse(JSON.stringify(looped ? R.loopSlice(song) : song));
    }

    /** The playhead in the song's ticks. */
    function position() {
        return seq.position + (looped ? looped.from : 0);
    }

    /** Play from a song tick; outside the loop region, from its start. */
    function playFrom(tick) {
        const q = audio();
        q.setSong(handOver());
        q.play(!looped ? tick : tick >= looped.from && tick < looped.to ? tick - looped.from : 0);
    }

    /**
     * Hand the sequencer the song after an edit. A different region, or Loop
     * switched, while playing starts again from the same place, in the new
     * region's terms; any other edit plays on.
     */
    function resync() {
        if (!seq) return;
        const r = region();
        const same = JSON.stringify(r) === JSON.stringify(looped);
        if (seq.playing && !same) playFrom(position());
        else seq.setSong(handOver());
    }

    function setPlaying(on) {
        const b = $('btn-play');
        b.textContent = on ? 'Stop' : 'Play';
        b.classList.toggle('on', on);
        if (on) requestAnimationFrame(tickPlayhead);
    }

    function togglePlay() {
        const q = audio();
        if (q.playing) {
            q.stop();
            setPlaying(false);
        } else {
            playFrom(start);
            setPlaying(true);
        }
        view.draw();
    }

    function tickPlayhead() {
        if (!seq || !seq.playing) return;
        view.follow(position());
        view.draw();
        requestAnimationFrame(tickPlayhead);
    }

    // ── edits ──────────────────────────────────────────────
    function changed() {
        const live = new Set(song.tracks[track] ? song.tracks[track].notes : []);
        for (const n of selection) if (!live.has(n)) selection.delete(n);
        resync();
        AUTOSAVE.write(song);
        if (App.fs) App.fs.setDirty(JSON.stringify(song) !== savedText);
        view.draw();
    }

    /** Wrap a one-shot edit (a field, a button) in an undo step. */
    function edit(fn) {
        history.push(snapshot());
        fn();
        changed();
    }

    // ── the roll ───────────────────────────────────────────
    const view = App.rollView.create({
        scroller: $('roll'),
        extent: $('roll-extent'),
        canvas: $('roll-canvas'),
        colors: COLORS,
        state: () => ({
            song, track, grid: step(), start, selection, looping: $('in-loop').checked, stepping: stepping.on,
            playhead: seq && seq.playing ? position() : null,
        }),
        on: {
            begin() { strokeBefore = snapshot(); history.beginStroke(); },
            commit() {
                if (snapshot() === strokeBefore) history.cancelStroke();
                else history.commitStroke();
                strokeBefore = null;
                changed();
            },
            change: changed,
            preview(t, pitch, velocity = 1, cents = 0) { hear(t, { pitch, cents }, velocity); },
            say(msg) { status(msg); },
            // Anywhere in the panel that is not a track counts as the current
            // one: the drag holds still there and a release drops nothing.
            trackAt(x, y) {
                const el = document.elementFromPoint(x, y);
                if (!el || !el.closest('#tracks')) return null;
                const card = el.closest('.track');
                return card ? cards().indexOf(card) : track;
            },
            overTrack(i, copy) {
                cards().forEach((el, j) => el.classList.toggle('drop', j === i));
                if (i !== null) status(`Release to ${copy ? 'copy' : 'move'} ${plural(selection.size)} to ${song.tracks[i].name}.`);
            },
            drop(i, copy) { if (copy) copyToTrack(i); else sendToTrack(i); },
            addTempo(tick) { addTempo(tick); },
            editTempo(m) { editTempo(m); },
            tempoCopied(m) { status(`Copied ${m.bpm} BPM to ${where(m.tick)}.`); },
            // Inside the press's stroke, which the view opened.
            deleteTempo(m) {
                R.deleteTempo(song, m);
                changed();
                status(`Removed the tempo change at ${where(m.tick)}.`);
            },
            seek(tick) {
                start = tick;
                if (seq && seq.playing) playFrom(start);
                view.draw();
            },
            // Inside the drag's stroke, which the view opened.
            looped(l) { status(loopWords(l)); },
        },
    });

    /** Sound a note, a pitch in the song's tuning with its cents, on a track. */
    function hear(t, note, velocity) {
        audio().preview(t, R.soundingPitch(note, song), 0.22, velocity);
    }

    // ── track panel ────────────────────────────────────────
    // The cards, then the song's tuning at the foot of the panel. Only the
    // cards are rebuilt, and code that counts tracks counts .track elements.
    const cards = () => [...$('tracks').querySelectorAll('.track')];
    // Tracks whose envelope sliders are showing, by index. The page's, not
    // the song's: it lasts until reload.
    const envOpen = new Set();

    function renderTracks() {
        const host = $('tracks');
        for (const el of cards()) el.remove();
        song.tracks.forEach((t, i) => {
            const el = document.createElement('div');
            const silent = !S.isAudible(song, i);
            el.className = 'track' + (i === track ? ' current' : '') + (silent ? ' silent' : '');
            el.style.setProperty('--track', COLORS[i % COLORS.length]);

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = t.name;
            if (silent) name.title = t.muted ? 'Muted' : 'Silenced by another track\'s solo';

            const waveRow = document.createElement('div');
            waveRow.className = 'row';
            const wave = document.createElement('select');
            for (const w of S.WAVES) {
                const o = document.createElement('option');
                o.value = w;
                o.textContent = WAVE_LABEL[w];
                wave.append(o);
            }
            wave.value = t.instrument.wave;
            wave.addEventListener('change', () => edit(() => { t.instrument.wave = wave.value; }));
            const env = toggle('ENV', 'Envelope: attack, decay, sustain, release', envOpen.has(i), () => {
                if (envOpen.has(i)) envOpen.delete(i);
                else envOpen.add(i);
                renderTracks();
            });
            env.classList.add('wide');
            const head = document.createElement('div');
            head.className = 'row';
            head.append(name, env);
            waveRow.append(wave);

            const mixRow = document.createElement('div');
            mixRow.className = 'row';
            const vol = document.createElement('input');
            vol.type = 'range';
            vol.min = '0';
            vol.max = '1';
            vol.step = '0.01';
            vol.value = String(t.volume);
            vol.title = 'Volume';
            vol.addEventListener('pointerdown', () => history.beginStroke());
            vol.addEventListener('input', () => { t.volume = Number(vol.value); changed(); });
            vol.addEventListener('change', () => history.commitStroke());
            const mute = toggle('M', 'Mute (M)', !!t.muted, () => toggleMute(i));
            const solo = toggle('S', 'Solo (S)', !!t.solo, () => toggleSolo(i));
            mixRow.append(vol, mute, solo);

            el.append(head, waveRow, mixRow);
            if (envOpen.has(i)) el.append(envelope(t, i));
            el.addEventListener('pointerdown', (e) => {
                if (track === i) return;
                track = i;
                selection.clear();
                for (const x of cards()) x.classList.toggle('current', x === el);
                view.draw();
                if (e.target === el || e.target === name || e.target === head) e.preventDefault();
            });
            host.insertBefore(el, $('tuning-row'));
        });
    }

    /**
     * A track's envelope: a slider for each stage, labelled with its value.
     * A drag is one undo step, as the volume's is, and letting go plays a
     * note so the new shape is heard.
     */
    function envelope(t, i) {
        const box = document.createElement('div');
        box.className = 'env';
        for (const e of R.ENVELOPE) {
            const label = document.createElement('label');
            label.title = e.does;
            const letter = document.createElement('span');
            letter.textContent = e.label;
            const range = document.createElement('input');
            range.type = 'range';
            range.min = '0';
            range.max = '1';
            range.step = '0.005';
            range.value = String(R.envelopeToSlider(e.key, t.instrument[e.key]));
            range.setAttribute('aria-label', e.does.split(':')[0]);
            const value = document.createElement('output');
            value.textContent = R.envelopeText(e.key, t.instrument[e.key]);
            // Opened on input too (it is idempotent), so the arrow keys on a
            // focused slider are an undo step as a drag is.
            range.addEventListener('pointerdown', () => history.beginStroke());
            range.addEventListener('input', () => {
                history.beginStroke();
                t.instrument[e.key] = R.sliderToEnvelope(e.key, Number(range.value));
                value.textContent = R.envelopeText(e.key, t.instrument[e.key]);
                changed();
            });
            range.addEventListener('change', () => {
                history.commitStroke();
                status(`${t.name} ${e.does.split(':')[0].toLowerCase()} ${value.textContent}.`);
                audition(i);
            });
            label.append(letter, range, value);
            box.append(label);
        }
        return box;
    }

    /** Play a note on a track: the middle of its notes, or middle C on an empty one. */
    function audition(i) {
        const notes = song.tracks[i].notes.slice().sort((a, b) => a.pitch - b.pitch);
        const note = notes[notes.length >> 1] || { pitch: (60 * R.edoOf(song)) / 12 };
        audio().preview(i, R.soundingPitch(note, song), 0.4, R.velocityOf(note));
    }

    // The M/S buttons and the M/S keys both land here.
    function toggleMute(i) {
        const t = song.tracks[i];
        edit(() => { t.muted = !t.muted; });
        renderTracks();
        status(`${t.name} ${t.muted ? 'muted' : 'unmuted'}.`);
    }

    function toggleSolo(i) {
        const t = song.tracks[i];
        edit(() => { t.solo = !t.solo; });
        renderTracks();
        status(`${t.name} ${t.solo ? 'soloed' : 'unsoloed'}.`);
    }

    function toggle(label, title, on, fn) {
        const b = document.createElement('button');
        b.className = 'toggle' + (on ? ' on' : '');
        b.textContent = label;
        b.title = title;
        b.addEventListener('click', fn);
        return b;
    }

    // ── toolbar ────────────────────────────────────────────
    function renderToolbar() {
        $('in-bpm').value = String(Math.round(song.bpm));
        $('in-bars').value = String(R.bars(song));
        $('in-grid').value = grid;
        $('in-meter').value = `${R.meterOf(song).beats}/${R.meterOf(song).unit}`;
        $('in-tuning').value = String(R.edoOf(song));
    }

    for (const e of R.TUNINGS) {
        const o = document.createElement('option');
        o.value = String(e);
        o.textContent = `${e}-EDO`;
        o.title = {
            12: 'Semitones: the usual 12 notes',
            19: '19 steps: sharps and flats apart, thirds near pure',
            24: 'Quarter tones: a step between every semitone',
            31: '31 steps: sharps, flats and half-sharps, thirds almost pure',
        }[e] || '';
        $('in-tuning').append(o);
    }
    $('in-tuning').addEventListener('change', (e) => {
        const edo = Number(e.target.value);
        let detuned = 0;
        edit(() => { detuned = R.setTuning(song, edo); });
        const about = { 24: ': quarter tones between the semitones', 19: ': 19 equal steps to the octave', 31: ': 31 equal steps to the octave' }[edo] || '';
        status(`Tuning ${edo}-EDO${about}.`
            + `${detuned ? ` ${plural(detuned)} between its steps kept as cents.` : ''}`);
        renderToolbar();
        view.resize();
        centreOnNotes();
    });

    for (const m of R.METERS) {
        const o = document.createElement('option');
        o.value = o.textContent = m;
        $('in-meter').append(o);
    }
    for (const g of R.GRIDS) {
        const o = document.createElement('option');
        o.value = g;
        o.textContent = GRID_LABEL[g];
        $('in-grid').append(o);
    }

    $('btn-play').addEventListener('click', togglePlay);
    $('in-bpm').addEventListener('change', (e) => {
        const v = Math.min(400, Math.max(20, Number(e.target.value) || song.bpm));
        edit(() => { song.bpm = v; });
        renderToolbar();
    });
    $('in-bars').addEventListener('change', (e) => {
        const bars = Math.min(256, Math.max(1, Math.round(Number(e.target.value)) || R.bars(song)));
        let dropped = 0;
        edit(() => { dropped = R.setBars(song, bars); });
        if (start >= song.length) start = 0;
        if (dropped) status(`${dropped} note${dropped === 1 ? '' : 's'} past the new end removed (Ctrl+Z brings them back).`);
        renderToolbar();
        view.resize();
    });
    $('in-meter').addEventListener('change', (e) => {
        const bars = R.bars(song);
        let dropped = 0;
        edit(() => { dropped = R.setMeter(song, e.target.value); });
        if (start >= song.length) start = 0;
        const now = R.bars(song);
        status(`Meter ${e.target.value}${R.isCompound(song) ? ', counted in dotted quarters' : ''}: ${now} bar${now === 1 ? '' : 's'}`
            + `${now !== bars ? ` (was ${bars})` : ''}.${dropped ? ` ${plural(dropped)} past the new end removed (Ctrl+Z brings them back).` : ''}`);
        renderToolbar();
        view.resize();
    });
    $('in-grid').addEventListener('change', (e) => {
        grid = R.GRIDS.includes(e.target.value) ? e.target.value : '1/16';
        PREFS.patch({ gridValue: grid });
        view.draw();
    });
    $('in-loop').addEventListener('change', (e) => {
        if (seq) seq.loop = e.target.checked;
        resync();
        view.draw();
        const l = R.loopOf(song);
        if (l) status(e.target.checked ? `Looping ${span(l)}.` : 'Loop off: Play runs through the song once.');
    });

    // ── files ──────────────────────────────────────────────
    // The footer keeps it to one line and cuts a long one short; the title
    // holds the whole of it.
    function status(msg) {
        const el = $('status');
        el.textContent = msg;
        el.title = msg;
    }

    function download(name, data, type) {
        const url = URL.createObjectURL(new Blob([data], { type }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function load(text, from) {
        let next;
        try {
            const raw = App.songfile.parse(text);
            next = fine(R.keepLoop(raw, S.normalizeSong(raw)));
        } catch (err) {
            status(`Could not open ${from}: ${err.message}`);
            return;
        }
        if (seq && seq.playing) { seq.stop(); setPlaying(false); }
        song = next;
        track = 0;
        start = 0;
        history.clear();
        savedText = JSON.stringify(song);
        refreshAll();
        changed();
        status(`Opened ${from}.`);
    }

    async function save() {
        const text = App.songfile.stringify(song);
        if (App.fs) {
            const p = path || await App.fs.pickSongSave('song.punch');
            if (!p) return;
            await App.fs.writeText(p, text);
            path = p;
        } else {
            download('song.punch', text, 'application/json');
        }
        savedText = JSON.stringify(song);
        if (App.fs) App.fs.setDirty(false);
        status(`Saved${path ? ' ' + path : ''}.`);
    }

    async function openPath(p) {
        path = p;
        load(await App.fs.readText(p), p);
    }

    async function open() {
        if (App.fs) {
            const p = await App.fs.pickSong();
            if (!p) return;
            await openPath(p);
        } else {
            $('file-open').click();
        }
    }

    $('file-open').addEventListener('change', async (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) load(await f.text(), f.name);
        e.target.value = '';
    });

    async function exportWav() {
        status('Rendering...');
        const buf = await S.renderSong(song, { loops: 1 });
        const wav = new Uint8Array(S.audioBufferToWav(buf));
        if (App.fs) {
            const p = await App.fs.pickWavSave('song.wav');
            if (!p) { status('Export cancelled.'); return; }
            await App.fs.writeBytes(p, wav);
            status(`Exported ${p} (${buf.duration.toFixed(1)} s).`);
        } else {
            download('song.wav', wav, 'audio/wav');
            status(`Exported song.wav (${buf.duration.toFixed(1)} s).`);
        }
    }

    $('btn-new').addEventListener('click', () => {
        edit(() => {
            const fresh = fine(S.createSong());
            song.bpm = fresh.bpm;
            song.ticksPerBeat = fresh.ticksPerBeat;
            song.length = fresh.length;
            song.tracks = fresh.tracks;
            delete song.tempos;
            delete song.meter;
            delete song.tuning;
            delete song.loop;
        });
        path = null;
        start = 0;
        refreshAll();
        status('New song. Ctrl+Z brings the old one back.');
    });
    $('btn-open').addEventListener('click', () => open().catch((err) => status(`Open failed: ${err}`)));
    $('btn-save').addEventListener('click', () => save().catch((err) => status(`Save failed: ${err}`)));
    $('btn-wav').addEventListener('click', () => exportWav().catch((err) => status(`Export failed: ${err}`)));

    // ── selection and clipboard ────────────────────────────
    function plural(n) { return `${n} note${n === 1 ? '' : 's'}`; }

    function where(tick) {
        const tpBar = R.ticksPerBar(song);
        return `bar ${Math.floor(tick / tpBar) + 1}, beat ${Math.floor((tick % tpBar) / R.beatTicks(song)) + 1}`;
    }

    /** A loop region in bars, or bars and beats, as the status says it. */
    function span(l) {
        const tpBar = R.ticksPerBar(song);
        if (l.from % tpBar || l.to % tpBar) return `${where(l.from)} to ${where(l.to)}`;
        const [first, last] = [l.from / tpBar + 1, l.to / tpBar];
        return first === last ? `bar ${first}` : `bars ${first}-${last}`;
    }

    function loopWords(l) {
        if (!l) return 'Loop region cleared: Loop goes round the whole song.';
        return `Loop ${span(l)}${$('in-loop').checked ? '' : ' (Loop is off: tick it to go round)'}.`;
    }

    /**
     * Shift+L: loop the bars the selection is in. With nothing selected,
     * clear the loop region.
     */
    function loopSelection() {
        if (!selection.size) {
            if (!R.loopOf(song)) { status('Select notes to loop their bars.'); return; }
            edit(() => R.clearLoop(song));
            status(loopWords(null));
            return;
        }
        const notes = [...selection];
        const tpBar = R.ticksPerBar(song);
        const from = Math.floor(Math.min(...notes.map((n) => n.tick)) / tpBar) * tpBar;
        const to = Math.ceil(Math.max(...notes.map((n) => n.tick + n.length)) / tpBar) * tpBar;
        let l = null;
        edit(() => { l = R.setLoop(song, from, Math.min(song.length, to)); });
        status(loopWords(l));
    }

    function selectAll() {
        selectStep(() => { for (const n of song.tracks[track].notes) selection.add(n); });
    }

    function copy() {
        if (!selection.size) { status('Nothing selected to copy.'); return false; }
        clip = R.copyNotes(song, [...selection]);
        pasteNext = null;
        status(`Copied ${plural(clip.notes.length)}.`);
        return true;
    }

    function removeSelected() {
        const notes = [...selection];
        if (!notes.length) return 0;
        let n = 0;
        edit(() => { n = R.deleteNotes(song, track, notes); });
        return n;
    }

    function cut() {
        if (!copy()) return;
        status(`Cut ${plural(removeSelected())}.`);
    }

    /** Q: snap the selection's starts to the current grid. */
    function quantize() {
        if (!selection.size) { status('Nothing selected to quantize.'); return; }
        const label = $('in-grid').selectedOptions[0].textContent;
        const before = snapshot();
        const q = R.quantizeNotes(song, track, [...selection], step());
        if (!q.moved && !q.merged) { status(`Already on the ${label} grid.`); return; }
        history.push(before);
        changed();
        status(`Quantized ${plural(q.moved)} to ${label}${q.merged ? `; merged ${q.merged} that landed on another` : ''}.`);
    }

    /** Shift+Q: round the selection's lengths to the current grid. */
    function quantizeLength() {
        if (!selection.size) { status('Nothing selected to quantize.'); return; }
        const label = $('in-grid').selectedOptions[0].textContent;
        const before = snapshot();
        const n = R.quantizeLengths(song, [...selection], step());
        if (!n) { status(`Lengths already on the ${label} grid.`); return; }
        history.push(before);
        changed();
        status(`Quantized the length of ${plural(n)} to ${label}.`);
    }

    /**
     * Ctrl+Up/Down: move the selection to the neighbouring track and follow
     * it there, still selected, so pressing again keeps going.
     */
    function moveToTrack(dir) {
        if (!selection.size) { status('Nothing selected to move.'); return; }
        const to = track + dir;
        if (to < 0 || to >= song.tracks.length) { status(`No track ${dir < 0 ? 'above' : 'below'}.`); return; }
        edit(() => sendToTrack(to));
    }

    /**
     * Move the selection to track `to` and follow it there. The caller owns
     * the undo step: a key press wraps this in edit(), a drop onto the panel
     * is already inside the drag's stroke.
     */
    function sendToTrack(to) {
        const notes = [...selection];
        const there = song.tracks[to].notes.length;
        const moved = R.moveToTrack(song, track, to, notes);
        const replaced = there + notes.length - song.tracks[to].notes.length;
        track = to;
        selection.clear();
        for (const n of moved) selection.add(n);
        renderTracks();
        view.draw();
        status(`Moved ${plural(notes.length)} to ${song.tracks[to].name}${replaced ? `, replacing ${replaced} already there` : ''}.`);
    }

    /**
     * Copy the selection onto track `to` at the same time and pitch, and
     * follow it there with the copy selected. Inside the caller's undo step,
     * as sendToTrack is.
     */
    function copyToTrack(to) {
        const notes = [...selection];
        const clip = R.copyNotes(song, notes);
        const added = R.pasteNotes(song, to, clip, clip.origin);
        track = to;
        selection.clear();
        for (const n of added) selection.add(n);
        renderTracks();
        view.draw();
        status(`Copied ${plural(added.length)} to ${song.tracks[to].name}.`);
    }

    /**
     * Ctrl+D: the selection again, straight after itself, and select the copy
     * so pressing again keeps going. Leaves the clipboard alone.
     */
    function duplicate() {
        if (!selection.size) { status('Nothing selected to duplicate.'); return; }
        const notes = [...selection];
        const clip = R.copyNotes(song, notes);
        const at = clip.origin + clip.span;
        if (at >= song.length) { status('No room to duplicate past the end of the song.'); return; }
        let d = null;
        edit(() => { d = R.duplicateNotes(song, track, notes); });
        selection.clear();
        for (const n of d.added) selection.add(n);
        const left = d.total - d.added.length;
        status(`Duplicated ${plural(d.added.length)} to ${where(d.at)}.${left ? ` ${plural(left)} past the end left out.` : ''}`);
        view.follow(d.at);
        view.draw();
    }

    /**
     * Paste onto the current track: at the start marker, or after the previous
     * paste from there on this track. `inPlace` puts it back at the time it
     * was copied from instead, for doubling a line on another track.
     */
    function paste(inPlace) {
        if (!clip) { status('Nothing to paste: select notes and copy them first.'); return; }
        const k = song.ticksPerBeat / clip.ticksPerBeat;
        const at = inPlace ? Math.round(clip.origin * k)
            : pasteNext && pasteNext.from === start && pasteNext.track === track ? pasteNext.at : start;
        if (at >= song.length) { status('No room to paste past the end of the song.'); return; }
        let added = [];
        edit(() => { added = R.pasteNotes(song, track, clip, at); });
        selection.clear();
        for (const n of added) selection.add(n);
        pasteNext = inPlace ? null : { from: start, track, at: at + Math.round(clip.span * k) };
        const left = clip.notes.length - added.length;
        status(`Pasted ${plural(added.length)} at ${where(at)}.${left ? ` ${plural(left)} past the end left out.` : ''}`);
        view.follow(at);
        view.draw();
    }

    /**
     * Shift+arrows: stretch or shrink the selection by one grid step. False
     * when nothing is selected, so the key keeps its native job of scrolling.
     */
    function nudgeLength(dir) {
        if (!selection.size) return false;
        const before = snapshot();
        const n = R.nudgeLength(song, [...selection], dir * step());
        if (n) {
            history.push(before);
            changed();
            status(`${dir > 0 ? 'Lengthened' : 'Shortened'} ${plural(n)}.`);
        } else {
            status(dir > 0 ? 'Already at the end of the song.' : 'Already one tick long.');
        }
        return true;
    }

    /**
     * - and =: detune the selection 10 cents at a time; 0 puts it back in
     * tune. Heard at the new pitch, the highest note for a chord.
     */
    function detune(delta) {
        if (!selection.size) { status('Nothing selected to detune.'); return; }
        const notes = [...selection];
        const before = snapshot();
        const n = R.nudgeCents(notes, delta);
        if (!n) {
            status(delta === null ? 'Already in tune.' : `Already a quarter tone ${delta < 0 ? 'flat' : 'sharp'}.`);
            return;
        }
        history.push(before);
        changed();
        const top = notes.reduce((a, b) => (b.pitch > a.pitch ? b : a));
        hear(track, top, R.velocityOf(top));
        const c = R.centsOf(top);
        status(delta === null ? `${plural(n)} back in tune.`
            : `Detuned ${plural(n)}${notes.length === 1 ? ` to ${c > 0 ? '+' : ''}${c} cents` : ` ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} cents`}.`);
    }

    // Pitch moves are in steps of the tuning: [ticks, steps or 'octave', words].
    const MOVES = {
        left: [-1, 0, 'a step earlier'], right: [1, 0, 'a step later'],
        up: [0, 1, 'up'], down: [0, -1, 'down'],
        octaveUp: [0, 'octave', 'up an octave'], octaveDown: [0, '-octave', 'down an octave'],
    };

    /** What one step of the song's tuning is called. */
    function stepWord() {
        const e = R.edoOf(song);
        return e === 12 ? 'a semitone' : e === 24 ? 'a quarter tone' : `a step of ${e}-EDO`;
    }

    /**
     * Arrows: move the selection a grid step in time or a step of the tuning
     * (a semitone, or a quarter tone in 24-EDO; Shift: an octave) in pitch,
     * as one group. An octave goes all the way or not at
     * all: part of one would land in a different key. False when nothing is
     * selected, as for nudgeLength.
     */
    function moveSelection(name) {
        if (!selection.size) return false;
        const [steps, by, said] = MOVES[name];
        const octave = typeof by === 'string';
        const semis = octave ? (by[0] === '-' ? -1 : 1) * R.edoOf(song) : by;
        const words = by === 1 || by === -1 ? `${said} ${stepWord()}` : said;
        const notes = [...selection];
        const before = snapshot();
        let d = R.clampShift(song, notes, steps * step(), semis);
        if (octave && d.pitch !== semis) d = { tick: 0, pitch: 0 };
        R.moveNotes(song, notes, d.tick, d.pitch);
        if (d.tick || d.pitch) {
            history.push(before);
            changed();
            if (d.pitch) {
                const top = notes.reduce((a, b) => (b.pitch > a.pitch ? b : a));
                hear(track, top, R.velocityOf(top));
            }
            status(`Moved ${plural(notes.length)} ${words}.`);
        } else {
            status(`No room to move ${words}.`);
        }
        return true;
    }

    // ── step entry ─────────────────────────────────────────
    // Notes typed at the start marker, which moves on a grid step once every
    // held key is let go, so keys pressed together make a chord. noteOn and
    // noteOff take a MIDI note number and an id for the key holding it: the
    // computer keyboard drives them while step entry is on, and a MIDI
    // keyboard through keyDown and keyUp below.
    const stepping = {
        on: false,
        // The C of the lower octave, as a MIDI note: C4.
        base: 60,
        // id -> { note, voice }, for each key held down.
        held: new Map(),
    };

    function stepWords() {
        return `Step entry, from ${S.noteName(stepping.base)}: Z-M and Q-U enter notes at the marker, `
            + 'Right rests, Up/Down change octave, Esc stops.';
    }

    function setStepping(on) {
        if (stepping.on === on) return;
        if (!on) releaseAll();
        stepping.on = on;
        $('btn-step').classList.toggle('on', on);
        $('btn-step').setAttribute('aria-pressed', String(on));
        status(on ? stepWords() : 'Step entry off.');
        if (on) view.follow(start);
        view.draw();
    }

    /** Move the start marker, the step entry cursor, and keep it in view. */
    function moveStart(tick) {
        start = tick;
        if (seq && seq.playing) playFrom(start);
        view.follow(start);
        view.draw();
    }

    /** The grid line a step after `tick`, starting again on every bar line; null past the end. */
    function stepAfter(tick) {
        let next = R.snapInBar(song, tick + step(), step());
        if (next <= tick) next = tick + step();
        return next < song.length ? next : null;
    }

    /** The grid line a step before `tick`. */
    function stepBefore(tick) {
        return tick > 0 ? R.snapInBar(song, tick - 1, step()) : 0;
    }

    /** The step of the song's tuning nearest a MIDI note. */
    function stepOf(midi) {
        return Math.round((midi * R.edoOf(song)) / 12);
    }

    /** A key goes down: a note at the marker on the current track, sounding while held. */
    function noteOn(id, midi, velocity = 1) {
        if (stepping.held.has(id)) return;
        // The first key of a chord opens its undo step and starts a new selection.
        if (!stepping.held.size) {
            history.beginStroke();
            selection.clear();
        }
        const i = R.addNote(song, track, { tick: start, length: step(), pitch: stepOf(midi), velocity });
        const note = song.tracks[track].notes[i];
        selection.add(note);
        const voice = audio().preview(track, R.soundingPitch(note, song), 8, R.velocityOf(note));
        stepping.held.set(id, { note, voice });
        changed();
        status(`${S.noteName(R.soundingPitch(note, song))} at ${where(start)}.`);
    }

    /** A key comes up: its note stops sounding, and when it was the last one held the marker moves on. */
    function noteOff(id) {
        const h = stepping.held.get(id);
        if (!h) return;
        if (h.voice) h.voice.stop();
        stepping.held.delete(id);
        if (stepping.held.size) return;
        history.commitStroke();
        const next = stepAfter(start);
        if (next === null) status('At the end of the song.');
        else moveStart(next);
    }

    function releaseAll() {
        for (const id of [...stepping.held.keys()]) noteOff(id);
    }

    /**
     * Step entry's keys, ahead of the shortcuts. True when the key was its
     * own, so nothing else should hear it; everything else (Space, Ctrl+Z,
     * Shift+L) falls through to the shortcuts.
     */
    function stepKey(e) {
        if (K.keys.isTyping(e.target)) return false;
        const semis = App.keymap.stepSemitone(e);
        if (semis !== null) {
            e.preventDefault();
            if (!e.repeat) noteOn(e.code, stepping.base + semis);
            return true;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        const k = e.key;
        if (k === 'Escape') setStepping(false);
        else if (k === 'ArrowUp' || k === 'ArrowDown') {
            // The lower octave from C1 to C5, so the upper row tops out at C7.
            const base = Math.min(72, Math.max(24, stepping.base + (k === 'ArrowUp' ? 12 : -12)));
            if (base === stepping.base) status(`Already at the ${k === 'ArrowUp' ? 'top' : 'bottom'} octave.`);
            else {
                stepping.base = base;
                status(stepWords());
            }
        } else if (k === 'ArrowRight' && e.shiftKey) {
            if (nudgeLength(1)) { const next = stepAfter(start); if (next !== null) moveStart(next); }
            else status('Nothing entered to hold longer.');
        } else if (k === 'ArrowLeft' && e.shiftKey) {
            if (nudgeLength(-1)) moveStart(stepBefore(start));
            else status('Nothing entered to shorten.');
        } else if (k === 'ArrowRight' && !e.shiftKey) {
            const next = stepAfter(start);
            if (next === null) status('At the end of the song.');
            else {
                selection.clear();
                moveStart(next);
            }
        } else if (k === 'ArrowLeft' && !e.shiftKey) {
            selection.clear();
            moveStart(stepBefore(start));
        } else if (k === 'Backspace') {
            const from = stepBefore(start);
            const gone = song.tracks[track].notes.filter((n) => n.tick >= from && n.tick < Math.max(start, from + 1));
            if (gone.length) edit(() => R.deleteNotes(song, track, gone));
            selection.clear();
            moveStart(from);
            status(gone.length ? `Deleted ${plural(gone.length)} at ${where(from)}.` : `Back to ${where(from)}.`);
        } else return false;
        e.preventDefault();
        return true;
    }

    document.addEventListener('keyup', (e) => {
        if (stepping.held.has(e.code)) noteOff(e.code);
    });
    // A key let go in another window never comes up here.
    window.addEventListener('blur', releaseAll);

    // ── MIDI keyboard ──────────────────────────────────────
    // With step entry on, a MIDI key enters a note as a computer key does,
    // at its velocity. Otherwise it plays the current track, for trying a
    // line out before entering it.
    const live = new Map();

    function keyDown(id, midi, velocity) {
        if (stepping.on) { noteOn(id, midi, velocity); return; }
        if (live.has(id)) return;
        const pitch = (stepOf(midi) * 12) / R.edoOf(song);
        live.set(id, audio().preview(track, pitch, 8, velocity));
        status(`${S.noteName(pitch)} on ${song.tracks[track].name}.`);
    }

    function keyUp(id) {
        if (stepping.held.has(id)) { noteOff(id); return; }
        const voice = live.get(id);
        if (voice) voice.stop();
        live.delete(id);
    }

    function allKeysUp() {
        releaseAll();
        for (const id of [...live.keys()]) keyUp(id);
    }

    App.midiInput.create({
        row: $('midi-row'), button: $('btn-midi'), select: $('in-midi'), prefs: PREFS,
        say: status, down: keyDown, up: keyUp, allUp: allKeysUp,
    });

    $('btn-step').addEventListener('click', (e) => {
        setStepping(!stepping.on);
        // Off the button, so Space plays rather than pressing it again.
        e.currentTarget.blur();
    });

    // ── keys ───────────────────────────────────────────────
    const keys = K.keys.create(App.keymap.BINDINGS);

    // Ctrl bindings fire even in a text field; these belong to the field.
    const FIELD_KEYS = new Set(['selectAll', 'copy', 'cut', 'paste', 'pasteInPlace']);

    document.addEventListener('keydown', (e) => {
        // A dialog is modal: its own Escape closes it, and nothing behind it
        // should hear a key.
        if (document.querySelector('dialog[open]')) return;
        // Enter while \ is held keeps the theme it is showing.
        if (e.key === 'Enter' && themeMenu.peekKeep()) { e.preventDefault(); return; }
        // A held preview key repeats; and Shift let go first would turn a
        // held Shift+] into ], which switches. Neither should do anything.
        if (e.repeat && themeMenu.peeking()) { e.preventDefault(); return; }
        if (stepping.on && stepKey(e)) return;
        const action = keys.resolve(e);
        if (!action) return;
        if (FIELD_KEYS.has(action) && K.keys.isTyping(e.target)) return;
        if (action === 'lengthen' || action === 'shorten') {
            if (nudgeLength(action === 'lengthen' ? 1 : -1)) e.preventDefault();
            return;
        }
        if (action in MOVES) {
            if (moveSelection(action)) e.preventDefault();
            return;
        }
        e.preventDefault();
        if (action === 'play') togglePlay();
        else if (action === 'help') keysDialog.open();
        else if (action === 'theme') themeMenu.open();
        else if (action === 'themeMode') themeMenu.cycleMode();
        else if (action === 'nextTheme') themeMenu.cycleTheme(1);
        else if (action === 'previousTheme') themeMenu.cycleTheme(-1);
        else if (action === 'peekTheme') { if (!e.repeat) themeMenu.peekBefore(e.code); }
        else if (action === 'peekNextTheme') { if (!e.repeat) themeMenu.peekNext(e.code); }
        else if (action === 'undo') { if (history.undo()) changed(); }
        else if (action === 'redo') { if (history.redo()) changed(); }
        else if (action === 'save') save().catch((err) => status(`Save failed: ${err}`));
        else if (action === 'open') open().catch((err) => status(`Open failed: ${err}`));
        else if (action === 'selectAll') selectAll();
        else if (action === 'flatter') detune(-10);
        else if (action === 'sharper') detune(10);
        else if (action === 'inTune') detune(null);
        else if (action === 'lane') {
            status(view.toggleLane() === 'cents'
                ? 'Lane: cents (Shift: single cents). L: velocity.'
                : 'Lane: velocity. L: cents.');
        }
        else if (action === 'loopSelection') loopSelection();
        else if (action === 'stepEntry') setStepping(true);
        else if (action === 'copy') copy();
        else if (action === 'cut') cut();
        else if (action === 'paste') paste(false);
        else if (action === 'pasteInPlace') paste(true);
        else if (action === 'duplicate') duplicate();
        else if (action === 'quantize') quantize();
        else if (action === 'quantizeLength') quantizeLength();
        else if (action === 'toTrackAbove') moveToTrack(-1);
        else if (action === 'toTrackBelow') moveToTrack(1);
        else if (action === 'delete') { const n = removeSelected(); if (n) status(`Deleted ${plural(n)}.`); }
        else if (action === 'deselect') selectStep(() => selection.clear());
        else if (action === 'mute') toggleMute(track);
        else if (action === 'solo') toggleSolo(track);
        else if (action.startsWith('track')) {
            const i = Number(action.slice(5));
            if (i < song.tracks.length && i !== track) { track = i; selection.clear(); renderTracks(); view.draw(); }
        }
    });

    // ── shortcuts dialog ───────────────────────────────────
    const keysDialog = (() => {
        const dlg = $('dlg-keys');
        const modal = K.modal.wire(dlg);
        const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        const body = $('keys-body');
        for (const section of App.keymap.HELP) {
            const h = document.createElement('h3');
            h.textContent = section.title;
            const table = document.createElement('table');
            for (const row of section.rows) {
                const tr = document.createElement('tr');
                const k = document.createElement('th');
                k.scope = 'row';
                k.textContent = App.keymap.rowKeys(row, mac);
                const d = document.createElement('td');
                d.textContent = App.keymap.rowDoes(row, mac);
                tr.append(k, d);
                table.append(tr);
            }
            const part = document.createElement('section');
            part.append(h, table);
            body.append(part);
        }
        return { open: modal.open, isOpen: () => dlg.open };
    })();
    // ── help menu: how to use, shortcuts, credits ──────────
    const guideDialog = K.modal.wire($('dlg-guide'));
    const creditsDialog = K.modal.wire($('dlg-credits'));
    (() => {
        const btn = $('btn-help');
        const menu = $('help-menu');
        const items = () => [...menu.querySelectorAll('[role="menuitem"]')];
        const isOpen = () => !menu.hidden;
        function close(focusButton) {
            if (!isOpen()) return;
            menu.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
            if (focusButton) btn.focus();
        }
        function open() {
            menu.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
            items()[0].focus();
        }
        btn.addEventListener('click', () => (isOpen() ? close(false) : open()));
        const pick = (id, then) => $(id).addEventListener('click', () => { close(false); then(); });
        pick('btn-guide', guideDialog.open);
        pick('btn-keys', keysDialog.open);
        pick('btn-credits', creditsDialog.open);
        // Arrows walk the items and Esc closes, without reaching the roll's
        // own shortcuts underneath.
        menu.addEventListener('keydown', (e) => {
            const list = items();
            const i = list.indexOf(document.activeElement);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
            } else if (e.key === 'Home') list[0].focus();
            else if (e.key === 'End') list[list.length - 1].focus();
            else if (e.key === 'Escape' || e.key === 'Tab') close(e.key === 'Escape');
            // Enter and Space press the focused item natively; every key stops
            // here so Space does not also start playback.
            if (/^Arrow(Up|Down)$|^(Home|End|Escape)$/.test(e.key)) e.preventDefault();
            e.stopPropagation();
        });
        // As with the theme list: a press anywhere else closes it and does
        // nothing more, so dismissing it never draws a note.
        document.addEventListener('pointerdown', (e) => {
            if (!isOpen() || e.target.closest('.help-picker')) return;
            close(false);
            e.preventDefault();
            e.stopPropagation();
        }, true);
    })();

    // ── tempo changes ──────────────────────────────────────
    const tempoDialog = (() => {
        const dlg = $('dlg-tempo');
        const asker = K.modal.asker(dlg, { closers: ['btn-tempo-cancel'] });
        const input = $('in-tempo');
        /**
         * Ask for a BPM. Resolves to a number, 'delete' (only offered when
         * `canDelete`), or null when dismissed.
         */
        return (title, bpm, canDelete) => asker.ask((settle) => {
            $('tempo-title').textContent = title;
            input.value = String(Math.round(bpm));
            $('btn-tempo-delete').hidden = !canDelete;
            $('btn-tempo-delete').onclick = () => settle('delete');
            $('tempo-form').onsubmit = (e) => {
                e.preventDefault();
                const v = Number(input.value);
                if (Number.isFinite(v) && v > 0) settle(v);
            };
            setTimeout(() => { input.focus(); input.select(); }, 0);
        });
    })();

    async function addTempo(tick) {
        if (tick <= 0) {
            status('The tempo at the start is the song\'s BPM, in the toolbar.');
            return;
        }
        if (tick >= song.length) return;
        const bpm = await tempoDialog(`Tempo from ${where(tick)}`, S.tempoAt(song, tick), false);
        if (bpm === null) return;
        let m = null;
        edit(() => { m = R.addTempo(song, tick, bpm); });
        status(`${m.bpm} BPM from ${where(m.tick)}.`);
    }

    async function editTempo(m) {
        const answer = await tempoDialog(`Tempo from ${where(m.tick)}`, m.bpm, true);
        if (answer === null) return;
        if (answer === 'delete') {
            edit(() => R.deleteTempo(song, m));
            status(`Removed the tempo change at ${where(m.tick)}.`);
        } else {
            edit(() => R.setTempo(m, answer));
            status(`${m.bpm} BPM from ${where(m.tick)}.`);
        }
    }

    // The picker is magma-kit's: hovering or arrowing through the open list
    // previews a theme across the whole app, the roll and the tracks too; a
    // click or Enter keeps it. T opens it from anywhere, Shift+T is the mode
    // button, ] and [ step through the list, a held \ shows the theme
    // before and a held Shift+] the next (the keys dispatch above).
    const themeMenu = K.themes.picker(themes, {
        button: $('in-theme'),
        list: $('theme-list'),
        modeButton: $('btn-theme-mode'),
        action: App.keymap.pickerAction,
        status,
        onPaint() {
            readColors();
            view.retheme();
            renderTracks();
        },
    });

    /** Scroll to the current track's notes, not a fixed octave: on opening, and on a retune. */
    function centreOnNotes() {
        const pitches = song.tracks[track].notes.map((n) => n.pitch).sort((a, b) => a - b);
        view.centrePitch(pitches.length ? pitches[pitches.length >> 1] : (64 * R.edoOf(song)) / 12);
    }

    function refreshAll() {
        renderTracks();
        renderToolbar();
        view.resize();
    }

    // ── go ─────────────────────────────────────────────────
    savedText = JSON.stringify(song);
    refreshAll();
    centreOnNotes();

    // A .punch file double-clicked in the OS: argv on Windows and Linux, an
    // event on macOS. Either way the backend holds the path and hands it over
    // once, so a reload does not open it again.
    if (App.fs) {
        const openLaunched = () => App.fs.launchFile()
            .then((p) => p && openPath(p))
            .catch((err) => status(`Open failed: ${err}`));
        openLaunched();
        App.fs.onOpenFile(openLaunched).catch(() => {});
    }

    const slot = $('app-version');
    if (slot && App.fs) {
        App.fs.appVersion().then((v) => {
            slot.textContent = `v${v}`;
            $('credits-version').textContent = `v${v}`;
        }).catch(() => {});
    }
}());
