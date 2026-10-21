// ui/roll-view.js: the piano roll canvas. Draws the song and turns pointer
// gestures into calls on core/roll.js; owns no song state of its own. The
// selection is the page's too: the view edits the Set it is handed, so the
// keyboard commands in main.js see what the pointer picked.
//
// Under the grid sits the lane: one stem per note on the current track, at
// the column it starts in. It shows velocity, a stem as tall as it, or
// detune, a stem up or down from the middle line by the note's cents; a
// click on its label, or L, switches. It is pinned to the bottom of the view
// and scrolls only sideways, with the grid.
//
// A detuned note is drawn off its row by a quarter of the row at most, up
// when sharp: enough to see, not enough to look like the next semitone.
//
// The canvas is viewport-sized and position: sticky inside #roll, while
// #roll-extent is sized to the whole song, so the browser does the scrolling
// and the view draws the window it is told about. A canvas the size of a long
// song would run to tens of thousands of pixels.

(function () {
    'use strict';

    const App = (window.PunchRoll = window.PunchRoll || {});
    const R = App.roll;

    const KEY_W = 64;
    const RULER_H = 22;
    // Row height in 12-EDO. A finer tuning has more rows to the octave, so
    // they are shorter, though not in proportion: 10 in 24-EDO.
    const SEMITONE_H = 14;
    // A beat is always this wide; a tick is a share of it, so a song at any
    // ticksPerBeat draws to the same scale.
    const BEAT_W = 96;
    const EDGE_PX = 7;
    const CLICK_PX = 4;
    const LANE_H = 64;
    const LANE_PAD = 6;

    /**
     * The roll's colours, from the page's theme (see ui/theme.js). The greys
     * are mixes of the theme's background and text, so a theme sets them all;
     * each mix reproduces what was a fixed grey against the old palette.
     *
     * Those mixes assume text lighter than the background. On a light theme
     * (Dorfic) the ones that mean light or dark, rather than nearer the text,
     * swap: white keys and their rows stay the light ones, and past the end of
     * the song darkens a little instead of halving to a mid grey.
     */
    function palette() {
        const T = App.theme;
        const toward = (t) => T.mix('var(--bg)', 'var(--text)', t);
        const light = T.luminance('var(--bg)') > T.luminance('var(--text)');
        return {
            bg: T.color('var(--bg)'),
            surface: T.color('var(--surface)'),
            border: T.color('var(--border)'),
            text: T.color('var(--text)'),
            dim: T.color('var(--dim)'),
            accent: T.color('var(--accent)'),
            tempo: T.color('var(--tempo)'),
            rowBlack: toward(light ? 0.045 : 0.012),
            rowWhite: toward(light ? 0.012 : 0.045),
            rowMicro: toward(0.028),
            tick: toward(0.067),
            beat: toward(0.125),
            octave: toward(0.152),
            bar: toward(0.223),
            lane: toward(0.018),
            label: toward(light ? 0.656 : 0.344),
            keyBlack: toward(light ? 0.93 : 0.08),
            keyWhite: toward(light ? 0.08 : 0.93),
            keyMicro: toward(0.45),
            void: light ? toward(0.06) : T.mix('var(--bg)', '#000', 0.5),
        };
    }

    /**
     * @param opts.scroller  the overflow:auto element
     * @param opts.extent    the element sized to the song
     * @param opts.canvas
     * @param opts.colors    one CSS colour per track
     * @param opts.state     () => { song, track, grid, playhead (tick|null), start (tick),
     *                        selection (a Set of the current track's note objects),
     *                        looping (whether Loop is on, so the loop region plays),
     *                        stepping (whether step entry is on, which types at `start`) }
     * @param opts.on        { begin(), commit(), change(),
     *                        preview(track, pitch (a step of the song's tuning), velocity, cents),
     *                        seek(tick), say(message), looped(region | null),
     *                        addTempo(tick), editTempo(marker), deleteTempo(marker),
     *                        tempoCopied(marker),
     *                        trackAt(clientX, clientY) -> track index over the panel | null,
     *                        overTrack(index | null, copy), drop(index, copy) }
     */
    function create(opts) {
        const { scroller, extent, canvas, colors, on } = opts;
        const g = canvas.getContext('2d');
        let C = palette();
        let dpr = 1;
        let w = 0;
        let h = 0;
        let bottom = 0;
        let drag = null;
        let hoverPitch = null;
        let hoverNote = null;
        // In beats, so it means the same at any ticksPerBeat: an eighth.
        let lastLength = 0.5;
        let lastVelocity = 1;
        // What the lane shows and sets: 'velocity' or 'cents'.
        let laneMode = 'velocity';
        let queued = false;

        // ── geometry ───────────────────────────────────────
        // Pixels per tick, and the rows: the song as last drawn, whose
        // ticksPerBeat and tuning they follow. Every change draws.
        let COL_W = BEAT_W / 4;
        let ROW_H = SEMITONE_H;
        let tuned = { tracks: [] };
        let LO = R.PITCH_LO;
        let HI = R.PITCH_HI;
        function measure(song) {
            COL_W = BEAT_W / song.ticksPerBeat;
            ROW_H = Math.round(SEMITONE_H * Math.sqrt(12 / R.edoOf(song)));
            tuned = song;
            LO = R.pitchLo(song);
            HI = R.pitchHi(song);
        }
        function rows() { return HI - LO + 1; }
        function toTick(cx) { return (cx - KEY_W + scroller.scrollLeft) / COL_W; }
        function toPitch(cy) {
            const row = Math.floor((cy - RULER_H + scroller.scrollTop) / ROW_H);
            return HI - Math.min(rows() - 1, Math.max(0, row));
        }
        function xOf(tick) { return KEY_W + tick * COL_W - scroller.scrollLeft; }
        function yOf(pitch) { return RULER_H + (HI - pitch) * ROW_H - scroller.scrollTop; }
        function local(e) {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        }
        function velY(v) { return bottom + LANE_PAD + (1 - v) * (LANE_H - 2 * LANE_PAD); }
        /** Lane y for a detune: the middle line is in tune, the edges a quarter tone. */
        function centsY(c) { return velY(0.5 + c / (2 * R.CENTS_MAX)); }
        /** Note y nudge for a detune: a quarter row at a quarter tone, up when sharp. */
        function detuneY(n) { return -R.centsOf(n) / (2 * R.CENTS_MAX) * (ROW_H / 2); }
        function toVelocity(cy) {
            return Math.min(1, Math.max(0, 1 - (cy - bottom - LANE_PAD) / (LANE_H - 2 * LANE_PAD)));
        }
        function area(p) {
            if (p.y < RULER_H) return p.x < KEY_W ? 'corner' : 'ruler';
            if (p.y >= bottom) return p.x < KEY_W ? 'corner' : 'lane';
            return p.x < KEY_W ? 'keys' : 'grid';
        }

        function resize() {
            const s = opts.state().song;
            measure(s);
            extent.style.width = `${KEY_W + s.length * COL_W}px`;
            extent.style.height = `${RULER_H + rows() * ROW_H + LANE_H}px`;
            dpr = window.devicePixelRatio || 1;
            w = scroller.clientWidth;
            h = scroller.clientHeight;
            bottom = h - LANE_H;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            draw();
        }

        function request() {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; draw(); });
        }

        // ── drawing ────────────────────────────────────────
        function draw() {
            const { song, track, grid, playhead, start, selection, looping, stepping } = opts.state();
            measure(song);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.fillStyle = C.bg;
            g.fillRect(0, 0, w, h);

            const tpBeat = R.beatTicks(song);
            const tpBar = R.ticksPerBar(song);
            const endX = xOf(song.length);

            // Rows: black keys darker, a brighter line under every C.
            g.save();
            g.beginPath();
            g.rect(KEY_W, RULER_H, w - KEY_W, bottom - RULER_H);
            g.clip();
            for (let p = HI; p >= LO; p--) {
                const y = yOf(p);
                if (y > bottom || y + ROW_H < RULER_H) continue;
                const kind = R.keyKind(song, p);
                g.fillStyle = kind === 'black' ? C.rowBlack : kind === 'micro' ? C.rowMicro : C.rowWhite;
                g.fillRect(KEY_W, y, Math.min(w, endX) - KEY_W, ROW_H);
                if (R.isOctave(song, p)) {
                    g.fillStyle = C.octave;
                    g.fillRect(KEY_W, y + ROW_H - 1, Math.min(w, endX) - KEY_W, 1);
                }
            }
            // Columns: grid steps faint, beats and bars stronger. Each bar
            // restarts the count, so a meter whose bar is not a whole number
            // of grid steps still lines up on its bar lines. Steps closer
            // than a few pixels are left out.
            const t0 = Math.max(0, toTick(KEY_W));
            const t1 = Math.min(song.length, toTick(w));
            const fine = grid * COL_W >= 4 ? grid : Infinity;
            for (let b = Math.floor(t0 / tpBar) * tpBar; b <= t1; b += tpBar) {
                const lines = new Map();
                for (let t = 0; t < tpBar; t += fine) lines.set(Math.round(t), C.tick);
                for (let t = 0; t < tpBar; t += tpBeat) lines.set(Math.round(t), C.beat);
                lines.set(0, C.bar);
                for (const [t, colour] of lines) {
                    if (b + t < t0 - 1 || b + t > t1 + 1 || b + t > song.length) continue;
                    g.fillStyle = colour;
                    g.fillRect(Math.round(xOf(b + t)), RULER_H, 1, bottom - RULER_H);
                }
            }
            if (song.length % tpBar !== 0) {
                g.fillStyle = C.bar;
                g.fillRect(Math.round(endX), RULER_H, 1, bottom - RULER_H);
            }
            // Where the tempo changes, faintly, so the grid shows it too.
            g.fillStyle = C.tempo;
            g.globalAlpha = 0.3;
            for (const m of song.tempos || []) g.fillRect(Math.round(xOf(m.tick)), RULER_H, 1, bottom - RULER_H);
            g.globalAlpha = 1;

            // Past the end of the song.
            if (endX < w) {
                g.fillStyle = C.void;
                g.fillRect(endX + 1, RULER_H, w - endX, bottom - RULER_H);
            }

            // Other tracks' notes, as faint outlines behind; a track that
            // mute or solo has silenced is fainter still, and dashed.
            const audible = (i) => window.AdSynth.isAudible(song, i);
            song.tracks.forEach((t, i) => {
                if (i === track) return;
                g.strokeStyle = colors[i % colors.length];
                g.globalAlpha = audible(i) ? 0.35 : 0.15;
                g.setLineDash(audible(i) ? [] : [3, 3]);
                for (const n of t.notes) {
                    const x = xOf(n.tick);
                    const y = yOf(n.pitch) + detuneY(n);
                    if (x > w || x + n.length * COL_W < KEY_W || y > bottom || y + ROW_H < RULER_H) continue;
                    g.strokeRect(x + 1.5, y + 1.5, n.length * COL_W - 3, ROW_H - 3);
                }
                g.globalAlpha = 1;
                g.setLineDash([]);
            });

            // The current track's notes.
            const col = colors[track % colors.length];
            const cur = song.tracks[track];
            if (cur) {
                const dim = audible(track) ? 1 : 0.4;
                for (let i = 0; i < cur.notes.length; i++) {
                    const n = cur.notes[i];
                    const x = xOf(n.tick);
                    const y = yOf(n.pitch) + detuneY(n);
                    const nw = n.length * COL_W;
                    if (x > w || x + nw < KEY_W || y > bottom || y + ROW_H < RULER_H) continue;
                    const active = selection.has(n);
                    g.fillStyle = col;
                    // Quieter notes are darker.
                    g.globalAlpha = (active ? 1 : 0.85) * (0.3 + 0.7 * R.velocityOf(n)) * dim;
                    g.fillRect(x + 1, y + 1, nw - 2, ROW_H - 2);
                    g.globalAlpha = 1;
                    g.fillStyle = 'rgba(0,0,0,0.45)';
                    g.fillRect(x + nw - 4, y + 3, 2, ROW_H - 6);
                    if (active) {
                        g.strokeStyle = C.text;
                        g.strokeRect(x + 1.5, y + 1.5, nw - 3, ROW_H - 3);
                    }
                }
            }

            // The hovered note's velocity, in a tag just above it (below it
            // when it sits at the top of the view). Not while dragging.
            if (hoverNote && !drag && cur && cur.notes.includes(hoverNote)) {
                drawVelocityTag(hoverNote, col);
            }

            // Rubber band.
            if (drag && drag.mode === 'box') {
                const x0 = xOf(Math.min(drag.t0, drag.t1));
                const x1 = xOf(Math.max(drag.t0, drag.t1));
                const y0 = yOf(Math.max(drag.p0, drag.p1));
                const y1 = yOf(Math.min(drag.p0, drag.p1)) + ROW_H;
                g.fillStyle = C.text;
                g.globalAlpha = 0.06;
                g.fillRect(x0, y0, x1 - x0, y1 - y0);
                g.globalAlpha = 0.6;
                g.strokeStyle = C.text;
                g.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(x1 - x0), Math.round(y1 - y0));
                g.globalAlpha = 1;
            }

            // The loop region's ends, faintly, so the grid shows them too.
            const loop = R.loopOf(song);
            if (loop) {
                g.fillStyle = looping ? C.accent : C.dim;
                g.globalAlpha = 0.5;
                for (const t of [loop.from, loop.to]) g.fillRect(Math.round(xOf(t)), RULER_H, 1, bottom - RULER_H);
                g.globalAlpha = 1;
            }

            // Step entry types at the start marker: a line down from it, and
            // a grid step's column shaded, where the next note goes.
            if (stepping) {
                const x = Math.round(xOf(start));
                g.fillStyle = C.accent;
                g.globalAlpha = 0.08;
                g.fillRect(x, RULER_H, grid * COL_W, bottom - RULER_H);
                g.globalAlpha = 0.8;
                g.fillRect(x, RULER_H, 2, bottom - RULER_H);
                g.globalAlpha = 1;
            }

            // Playhead.
            if (playhead !== null) {
                const x = Math.round(xOf(playhead));
                g.fillStyle = C.text;
                g.fillRect(x, RULER_H, 1, bottom - RULER_H);
            }
            g.restore();

            drawRuler(song, tpBar, start, playhead, looping);
            drawKeys(cur ? col : C.dim);
            drawLane(cur, col, selection, endX);
        }

        function drawVelocityTag(n, col) {
            const c = R.centsOf(n);
            const label = `${Math.round(R.velocityOf(n) * 100)}%${c ? ` ${c > 0 ? '+' : ''}${c}¢` : ''}`;
            g.font = '10px monospace';
            g.textBaseline = 'middle';
            const tw = Math.ceil(g.measureText(label).width) + 8;
            const th = 13;
            const x = Math.min(w - tw - 2, Math.max(KEY_W + 2, xOf(n.tick)));
            const above = yOf(n.pitch) - th - 2;
            const y = above >= RULER_H + 2 ? above : yOf(n.pitch) + ROW_H + 2;
            g.fillStyle = 'rgba(0,0,0,0.85)';
            g.fillRect(x, y, tw, th);
            g.strokeStyle = col;
            g.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
            g.fillStyle = C.text;
            g.fillText(label, x + 4, y + th / 2 + 0.5);
        }

        function drawLane(cur, col, selection, endX) {
            g.save();
            g.fillStyle = C.lane;
            g.fillRect(0, bottom, w, LANE_H);
            g.fillStyle = C.border;
            g.fillRect(0, bottom, w, 1);
            g.font = '10px monospace';
            g.textBaseline = 'middle';
            g.fillStyle = C.label;
            const cents = laneMode === 'cents';
            g.fillText(cents ? 'CENTS' : 'VEL', 6, bottom + LANE_H / 2);
            g.beginPath();
            g.rect(KEY_W, bottom + 1, w - KEY_W, LANE_H - 1);
            g.clip();
            g.fillStyle = C.tick;
            g.fillRect(KEY_W, Math.round(velY(0.5)), Math.min(w, endX) - KEY_W, 1);
            if (endX < w) {
                g.fillStyle = C.void;
                g.fillRect(endX + 1, bottom + 1, w - endX, LANE_H - 1);
            }
            if (cur) {
                // Selected stems last, so they sit on top of a chord's others.
                const notes = [...cur.notes].sort((a, b) => selection.has(a) - selection.has(b));
                const base = velY(0);
                const mid = Math.round(centsY(0));
                for (const n of notes) {
                    const x = Math.round(xOf(n.tick)) + 3;
                    if (x < KEY_W - 6 || x > w + 6) continue;
                    g.fillStyle = selection.has(n) ? C.text : col;
                    if (cents) {
                        // From the middle line; an in-tune note is just its cap.
                        const y = Math.round(centsY(R.centsOf(n)));
                        g.fillRect(x, Math.min(y, mid), 2, Math.abs(y - mid) + 1);
                        g.fillRect(x - 2, y - 1, 6, 3);
                        continue;
                    }
                    const y = Math.round(velY(R.velocityOf(n)));
                    g.fillRect(x, y, 2, base - y + 1);
                    g.fillRect(x - 2, y - 1, 6, 3);
                }
            }
            g.restore();
            g.fillStyle = C.border;
            g.fillRect(KEY_W - 1, bottom, 1, LANE_H);
        }

        function drawRuler(song, tpBar, start, playhead, looping) {
            g.save();
            g.fillStyle = C.surface;
            g.fillRect(0, 0, w, RULER_H);
            g.beginPath();
            g.rect(KEY_W, 0, w - KEY_W, RULER_H);
            g.clip();
            // The loop region: a band behind the bar numbers with a post at
            // each end, in the accent while Loop is on and grey while off.
            const loop = R.loopOf(song);
            if (loop) {
                const x0 = Math.round(xOf(loop.from));
                const x1 = Math.round(xOf(loop.to));
                g.fillStyle = looping ? C.accent : C.dim;
                g.globalAlpha = 0.22;
                g.fillRect(x0, 0, x1 - x0, RULER_H);
                g.globalAlpha = 1;
                g.fillRect(x0, 0, 2, RULER_H);
                g.fillRect(x1 - 2, 0, 2, RULER_H);
            }
            g.font = '11px monospace';
            g.textBaseline = 'middle';
            for (let t = 0; t <= song.length; t += tpBar) {
                const x = Math.round(xOf(t));
                if (x > w) break;
                g.fillStyle = C.bar;
                g.fillRect(x, 0, 1, RULER_H);
                if (t < song.length) {
                    // The top half: tempo flags take the bottom half.
                    g.fillStyle = C.dim;
                    g.fillText(String(t / tpBar + 1), x + 4, 7);
                }
            }
            // Tempo changes: a flag on the bar line with its BPM, in the
            // bottom half of the ruler, below the bar numbers.
            for (const m of song.tempos || []) {
                const f = tempoFlag(m);
                if (f.x > w || f.x + f.w < KEY_W) continue;
                const held = drag && drag.mode === 'tempo' && drag.marker === m;
                g.fillStyle = held ? C.text : C.tempo;
                g.fillRect(f.x, 0, 1, RULER_H);
                g.fillRect(f.x, RULER_H - 10, f.w, 9);
                g.fillStyle = C.bg;
                g.fillText(String(m.bpm), f.x + 3, RULER_H - 5);
            }
            g.font = '11px monospace';
            // Where Play starts from.
            const sx = xOf(start);
            g.fillStyle = C.accent;
            g.beginPath();
            g.moveTo(sx - 5, 0);
            g.lineTo(sx + 5, 0);
            g.lineTo(sx, 8);
            g.fill();
            if (playhead !== null) {
                g.fillStyle = C.text;
                g.fillRect(Math.round(xOf(playhead)), 0, 1, RULER_H);
            }
            g.restore();
            g.fillStyle = C.border;
            g.fillRect(0, RULER_H - 1, w, 1);
        }

        function drawKeys(col) {
            g.save();
            g.beginPath();
            g.rect(0, RULER_H, KEY_W, bottom - RULER_H);
            g.clip();
            g.font = '10px monospace';
            g.textBaseline = 'middle';
            for (let p = HI; p >= LO; p--) {
                const y = yOf(p);
                if (y > bottom || y + ROW_H < RULER_H) continue;
                const kind = R.keyKind(tuned, p);
                // A quarter-tone key is a short grey one, between its neighbours.
                g.fillStyle = p === hoverPitch ? col
                    : kind === 'black' ? C.keyBlack : kind === 'micro' ? C.keyMicro : C.keyWhite;
                g.fillRect(0, y, kind === 'micro' && p !== hoverPitch ? KEY_W * 0.6 : KEY_W - 1, ROW_H - 1);
                if (R.isOctave(tuned, p)) {
                    g.fillStyle = p === hoverPitch ? C.bg : C.label;
                    g.fillText(window.AdSynth.noteName((p * 12) / R.edoOf(tuned)), 6, y + ROW_H / 2);
                }
            }
            g.restore();
            g.fillStyle = C.border;
            g.fillRect(KEY_W - 1, 0, 1, h);
        }

        // ── gestures ───────────────────────────────────────
        /** Where a tempo marker's flag sits on the ruler, and how wide it is. */
        function tempoFlag(m) {
            g.font = '10px monospace';
            return { x: Math.round(xOf(m.tick)), w: Math.ceil(g.measureText(String(m.bpm)).width) + 6 };
        }

        /** The tempo marker under a ruler point: its line, or its flag. */
        function tempoAt(p) {
            const { song } = opts.state();
            for (const m of [...(song.tempos || [])].reverse()) {
                const f = tempoFlag(m);
                if (p.x >= f.x - 4 && p.x <= f.x + f.w) return m;
            }
            return null;
        }

        /** The end of the loop region under a ruler point, 'from' or 'to', or null. */
        function loopEdgeAt(p) {
            const loop = R.loopOf(opts.state().song);
            if (!loop) return null;
            const d0 = Math.abs(p.x - xOf(loop.from));
            const d1 = Math.abs(p.x - xOf(loop.to));
            if (Math.min(d0, d1) > EDGE_PX) return null;
            return d0 <= d1 ? 'from' : 'to';
        }

        /** Whether a ruler point is inside the loop region. */
        function inLoop(p) {
            const loop = R.loopOf(opts.state().song);
            const t = toTick(p.x);
            return !!loop && t >= loop.from && t < loop.to;
        }

        /** The grid line nearest a ruler point, inside the song. */
        function nearestLine(p) {
            const { song, grid } = opts.state();
            return Math.max(0, Math.min(song.length, R.snapInBar(song, toTick(p.x) + grid / 2, grid)));
        }

        function hit(p) {
            const { song, track } = opts.state();
            const t = song.tracks[track];
            if (!t) return null;
            return R.hitTest(t, toTick(p.x), toPitch(p.y), EDGE_PX / COL_W);
        }

        function eraseAt(p) {
            const { song, track, selection } = opts.state();
            const hh = hit(p);
            if (!hh) return false;
            selection.delete(song.tracks[track].notes[hh.index]);
            R.deleteNote(song, track, hh.index);
            on.change();
            return true;
        }

        /**
         * A copy drag moves the grabbed notes as usual, but the first time they
         * actually move it leaves copies where they started. The dragged notes
         * stay the selection, so what you hold is the copy. Until then nothing
         * is copied, and dropCopies() takes them back if the drag ends where it
         * began.
         */
        function leaveCopy(song, track) {
            if (!drag.copy || drag.left) return;
            const notes = song.tracks[track].notes;
            drag.left = drag.group.map((o) => {
                const c = { ...o.note, tick: o.tick, pitch: o.pitch };
                notes.push(c);
                return c;
            });
        }

        function dropCopies(song, track) {
            if (!drag.left) return;
            R.deleteNotes(song, track, drag.left);
            drag.left = null;
        }

        /** Where each selected note starts from, so a drag is a delta off those. */
        function grab(selection) {
            return [...selection].map((n) => ({ note: n, tick: n.tick, pitch: n.pitch, length: n.length }));
        }

        /**
         * Set the velocity of the notes starting in each column from t0 to t1,
         * ramping from v0 to v1, so a quick drag across the lane leaves no
         * gaps. In a column holding a selected note, only the selected notes
         * change: that is how one note of a chord is set on its own.
         */
        function paintVelocity(t0, v0, t1, v1) {
            const { song, track, selection } = opts.state();
            const cur = song.tracks[track];
            if (!cur) return;
            const lo = Math.min(t0, t1);
            const hi = Math.max(t0, t1);
            const columns = new Map();
            for (const n of cur.notes) {
                if (n.tick < lo || n.tick > hi) continue;
                if (!columns.has(n.tick)) columns.set(n.tick, []);
                columns.get(n.tick).push(n);
            }
            let changed = false;
            for (const [tick, notes] of columns) {
                const picked = notes.some((n) => selection.has(n)) ? notes.filter((n) => selection.has(n)) : notes;
                const v = t1 === t0 ? v1 : v0 + (v1 - v0) * (tick - t0) / (t1 - t0);
                for (const n of picked) {
                    const before = R.velocityOf(n);
                    R.setVelocity(n, v);
                    lastVelocity = R.velocityOf(n);
                    if (lastVelocity !== before) changed = true;
                }
            }
            if (columns.size) on.say(`Velocity ${Math.round(lastVelocity * 100)}%`);
            if (changed) on.change();
        }

        /** A lane y as cents, snapped to 5 unless `fine` (Shift). */
        function toCents(cy, fine) {
            const c = (toVelocity(cy) - 0.5) * 2 * R.CENTS_MAX;
            return Math.max(-R.CENTS_MAX, Math.min(R.CENTS_MAX, fine ? Math.round(c) : Math.round(c / 5) * 5));
        }

        /**
         * paintVelocity's twin for detune: the same columns and the same rule
         * for a chord, ramping cents from c0 to c1. A note whose detune
         * changes is heard at its new pitch.
         */
        function paintCents(t0, c0, t1, c1, fine) {
            const { song, track, selection } = opts.state();
            const cur = song.tracks[track];
            if (!cur) return;
            const lo = Math.min(t0, t1);
            const hi = Math.max(t0, t1);
            const columns = new Map();
            for (const n of cur.notes) {
                if (n.tick < lo || n.tick > hi) continue;
                if (!columns.has(n.tick)) columns.set(n.tick, []);
                columns.get(n.tick).push(n);
            }
            let heard = null;
            let set = 0;
            for (const [tick, notes] of columns) {
                const picked = notes.some((n) => selection.has(n)) ? notes.filter((n) => selection.has(n)) : notes;
                const raw = t1 === t0 ? c1 : c0 + (c1 - c0) * (tick - t0) / (t1 - t0);
                const c = fine ? Math.round(raw) : Math.round(raw / 5) * 5;
                for (const n of picked) {
                    const before = R.centsOf(n);
                    R.setCents(n, c);
                    set = R.centsOf(n);
                    if (set !== before) heard = n;
                }
            }
            if (columns.size) on.say(set ? `Detune ${set > 0 ? '+' : ''}${set} cents` : 'In tune');
            if (heard) {
                on.preview(track, heard.pitch, R.velocityOf(heard), R.centsOf(heard));
                on.change();
            }
        }

        /** Switch the lane between velocity and detune. Returns the new mode. */
        function toggleLane() {
            laneMode = laneMode === 'cents' ? 'velocity' : 'cents';
            request();
            return laneMode;
        }

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Double-click the ruler: on a marker, set its tempo; elsewhere, add
        // a change at the grid line, as a click there sets the start marker.
        canvas.addEventListener('dblclick', (e) => {
            const p = local(e);
            if (area(p) !== 'ruler') return;
            const m = tempoAt(p);
            if (m) on.editTempo(m);
            else on.addTempo(R.snapInBar(opts.state().song, toTick(p.x), opts.state().grid));
        });

        canvas.addEventListener('pointerdown', (e) => {
            const p = local(e);
            const where = area(p);
            const { song, track, grid, selection } = opts.state();
            if (where === 'ruler') {
                const m = tempoAt(p);
                if (m) {
                    canvas.setPointerCapture(e.pointerId);
                    on.begin();
                    if (e.button === 2) {
                        on.deleteTempo(m);
                        drag = { mode: 'none' };
                    } else {
                        // Ctrl, Cmd or Alt drags a copy, as on notes; an
                        // Alt-click that never moves deletes, as on notes;
                        // Shift moves a tick at a time instead of a grid step.
                        drag = {
                            mode: 'tempo', marker: m, at: p, moved: false,
                            copy: e.ctrlKey || e.metaKey || e.altKey, from: m.tick, left: null,
                            deleteOnClick: e.altKey, step: e.shiftKey ? 1 : 0,
                        };
                    }
                    request();
                    return;
                }
                canvas.setPointerCapture(e.pointerId);
                // Right-click or Alt-click inside the loop region clears it.
                if ((e.button === 2 || e.altKey) && inLoop(p)) {
                    on.begin();
                    R.clearLoop(song);
                    on.change();
                    on.looped(null);
                    drag = { mode: 'none' };
                    request();
                    return;
                }
                // An end of the loop region drags that end; anywhere else a
                // drag draws a new region, and a click sets where Play starts.
                const edge = e.button === 0 ? loopEdgeAt(p) : null;
                if (edge) {
                    const loop = R.loopOf(song);
                    on.begin();
                    drag = { mode: 'loop', anchor: edge === 'from' ? loop.to : loop.from, at: p, was: loop };
                } else {
                    drag = { mode: 'ruler', at: p, anchor: nearestLine(p), seek: e.button === 0 };
                }
                request();
                return;
            }
            if (where === 'corner' && p.y >= bottom) {
                on.say(toggleLane() === 'cents'
                    ? 'Lane: cents (Shift: single cents). L: velocity.'
                    : 'Lane: velocity. L: cents.');
                return;
            }
            if (where === 'lane') {
                canvas.setPointerCapture(e.pointerId);
                on.begin();
                const tick = Math.floor(toTick(p.x));
                if (laneMode === 'cents') {
                    drag = { mode: 'cents', tick, c: toCents(p.y, e.shiftKey), fine: e.shiftKey };
                    paintCents(tick, drag.c, tick, drag.c, drag.fine);
                } else {
                    drag = { mode: 'velocity', tick, v: toVelocity(p.y) };
                    paintVelocity(drag.tick, drag.v, drag.tick, drag.v);
                }
                request();
                return;
            }
            if (where === 'keys') {
                hoverPitch = toPitch(p.y);
                on.preview(track, hoverPitch, lastVelocity);
                drag = { mode: 'keys' };
                canvas.setPointerCapture(e.pointerId);
                request();
                return;
            }
            if (where !== 'grid') return;
            canvas.setPointerCapture(e.pointerId);
            on.begin();
            // Alt shares delete and copy. Pressed on empty grid it sweeps to
            // delete, as right-click does; pressed on a note it starts a copy
            // drag that deletes the note instead if released without moving.
            if (e.button === 2 || (e.altKey && !hit(p))) {
                drag = { mode: 'erase' };
                eraseAt(p);
                return;
            }
            const tick = toTick(p.x);
            const pitch = toPitch(p.y);
            const hh = hit(p);
            const cur = song.tracks[track];
            if (hh) {
                const note = cur.notes[hh.index];
                // Shift toggles a note in or out; a plain click on a note
                // outside the selection makes it the selection. Either way,
                // dragging a selected note drags all of them.
                // Shift on a note drags without snapping, a tick at a time,
                // whether moving it or stretching it by its right edge.
                // Without a copy key (Ctrl, Cmd, Alt) it also still toggles
                // the note in the selection: adding it at once, but taking a
                // selected one out only on a click, so a Shift-drag can move
                // the whole selection.
                const copyKey = e.altKey || e.ctrlKey || e.metaKey;
                const free = e.shiftKey;
                const adding = e.shiftKey && !copyKey;
                const removeOnClick = adding && selection.has(note);
                if (!adding && !selection.has(note)) selection.clear();
                selection.add(note);
                // Ctrl (Cmd on a Mac, where Ctrl-click is the right button)
                // drags a copy: see leaveCopy().
                drag = hh.zone === 'edge'
                    ? {
                        mode: 'resize', note, group: grab(selection), length: note.length, d: 0,
                        deleteOnClick: e.altKey, removeOnClick, moved: false, at: p, step: free ? 1 : 0,
                    }
                    : {
                        mode: 'move', note, group: grab(selection), fromTick: tick, fromPitch: note.pitch,
                        d: { tick: 0, pitch: 0 }, copy: copyKey, left: null,
                        deleteOnClick: e.altKey, removeOnClick, moved: false, step: free ? 1 : 0, at: p,
                    };
                if (hh.zone !== 'edge') on.preview(track, note.pitch, R.velocityOf(note), R.centsOf(note));
            } else if (e.shiftKey) {
                drag = { mode: 'box', t0: tick, p0: pitch, t1: tick, p1: pitch, base: new Set(selection) };
            } else {
                const length = Math.max(1, Math.round(lastLength * song.ticksPerBeat));
                const i = R.addNote(song, track, { tick: R.snapInBar(song, tick, grid), length, pitch, velocity: lastVelocity });
                const note = cur.notes[i];
                selection.clear();
                selection.add(note);
                drag = {
                    mode: 'move', note, group: grab(selection), fromTick: tick, fromPitch: note.pitch,
                    d: { tick: 0, pitch: 0 }, moved: false, at: p,
                };
                on.preview(track, pitch, lastVelocity);
                on.change();
            }
            request();
        });

        canvas.addEventListener('pointermove', (e) => {
            const p = local(e);
            const { song, track, grid, selection } = opts.state();
            if (!drag) {
                const where = area(p);
                const hh = where === 'grid' ? hit(p) : null;
                const over = hh ? song.tracks[track].notes[hh.index] : null;
                if (over !== hoverNote) {
                    hoverNote = over;
                    request();
                }
                if (where === 'grid') {
                    canvas.style.cursor = !hh ? 'crosshair' : hh.zone === 'edge' ? 'ew-resize'
                        : e.ctrlKey || e.metaKey || e.altKey ? 'copy' : 'move';
                } else {
                    canvas.style.cursor = where === 'lane' ? 'ns-resize'
                        : where === 'corner' && p.y >= bottom ? 'pointer'
                        : where === 'ruler' && tempoAt(p) ? (e.ctrlKey || e.metaKey || e.altKey ? 'copy' : 'ew-resize')
                        : where === 'ruler' && loopEdgeAt(p) ? 'ew-resize'
                        : where === 'keys' || where === 'ruler' ? 'pointer' : 'default';
                }
                return;
            }
            if (drag.mode === 'keys') {
                const pitch = toPitch(p.y);
                if (pitch !== hoverPitch) {
                    hoverPitch = pitch;
                    on.preview(track, pitch, lastVelocity);
                    request();
                }
                return;
            }
            if (drag.mode === 'erase') {
                eraseAt(p);
                return;
            }
            if (drag.mode === 'ruler') {
                // Past a click's wobble, a ruler press becomes a new loop region.
                if (!drag.seek || Math.hypot(p.x - drag.at.x, p.y - drag.at.y) <= CLICK_PX) return;
                on.begin();
                drag = { mode: 'loop', anchor: drag.anchor, at: drag.at, was: R.loopOf(song), fresh: true };
            }
            if (drag.mode === 'loop') {
                // Back on the line it started from, the region is as it was.
                const to = nearestLine(p);
                const before = JSON.stringify(song.loop);
                if (to !== drag.anchor) R.setLoop(song, drag.anchor, to);
                else if (drag.was) R.setLoop(song, drag.was.from, drag.was.to);
                else R.clearLoop(song);
                if (JSON.stringify(song.loop) !== before) on.change();
                request();
                return;
            }
            if (drag.mode === 'tempo') {
                if (Math.hypot(p.x - drag.at.x, p.y - drag.at.y) > CLICK_PX) drag.moved = true;
                if (!drag.moved) return;
                // To the nearest grid line (or tick, with Shift), and never
                // onto another marker.
                const before = drag.marker.tick;
                const step = drag.step || grid;
                const to = Math.round(toTick(p.x) / step) * step;
                // A copy drag leaves the copy once the marker has left its
                // line, and takes it back if the marker returns, so a drag
                // that ends where it began copies nothing.
                if (drag.left && to === drag.from) {
                    R.deleteTempo(song, drag.left);
                    drag.left = null;
                }
                R.moveTempo(song, drag.marker, to);
                if (drag.copy && !drag.left && drag.marker.tick !== drag.from) {
                    drag.left = R.addTempo(song, drag.from, drag.marker.bpm);
                }
                if (drag.marker.tick !== before) on.change();
                request();
                return;
            }
            if (drag.mode === 'cents') {
                const tick = Math.floor(toTick(p.x));
                const c = toCents(p.y, drag.fine);
                paintCents(drag.tick, drag.c, tick, c, drag.fine);
                drag.tick = tick;
                drag.c = c;
                request();
                return;
            }
            if (drag.mode === 'velocity') {
                const tick = Math.floor(toTick(p.x));
                const v = toVelocity(p.y);
                paintVelocity(drag.tick, drag.v, tick, v);
                drag.tick = tick;
                drag.v = v;
                request();
                return;
            }
            if (drag.mode === 'box') {
                drag.t1 = toTick(p.x);
                drag.p1 = toPitch(p.y);
                const cur = song.tracks[track];
                selection.clear();
                for (const n of drag.base) selection.add(n);
                for (const i of R.notesIn(cur, drag.t0, drag.t1, drag.p0, drag.p1)) selection.add(cur.notes[i]);
                request();
                return;
            }
            const n = drag.note;
            if (drag.mode === 'move') {
                // Over the panel: put the notes back where they started, so
                // they do not slide about while the pointer is off the grid.
                // Over another track, that is where they will go, with their
                // time and pitch; over their own, releasing leaves them be.
                const over = on.trackAt(e.clientX, e.clientY);
                const target = over !== null && over !== track ? over : null;
                if (target !== (drag.target ?? null)) {
                    drag.target = target;
                    on.overTrack(target, drag.copy);
                }
                // A click or a drag, by how far the pointer went, not by
                // whether the notes moved: a short drag that never reaches a
                // grid step is still not an Alt-click. Until it is a drag,
                // nothing moves, so a click with a wobble stays a click.
                if (Math.hypot(p.x - drag.at.x, p.y - drag.at.y) > CLICK_PX) drag.moved = true;
                if (!drag.moved) return;
                if (over !== null) {
                    if (drag.d.tick || drag.d.pitch) {
                        for (const o of drag.group) {
                            o.note.tick = o.tick;
                            o.note.pitch = o.pitch;
                        }
                        drag.d = { tick: 0, pitch: 0 };
                        on.change();
                    }
                    request();
                    return;
                }
                const step = drag.step || grid;
                const steps = Math.round((toTick(p.x) - drag.fromTick) / step);
                const d = R.clampShift(song, drag.group, steps * step, toPitch(p.y) - drag.fromPitch);
                if (d.tick !== drag.d.tick || d.pitch !== drag.d.pitch) {
                    if (d.tick || d.pitch) leaveCopy(song, track);
                    for (const o of drag.group) {
                        o.note.tick = o.tick + d.tick;
                        o.note.pitch = o.pitch + d.pitch;
                    }
                    if (d.pitch !== drag.d.pitch) on.preview(track, n.pitch, R.velocityOf(n), R.centsOf(n));
                    drag.d = d;
                    on.change();
                }
            } else if (drag.mode === 'resize') {
                if (Math.hypot(p.x - drag.at.x, p.y - drag.at.y) > CLICK_PX) drag.moved = true;
                // A click on an edge must not re-snap the length.
                if (!drag.moved) return;
                // Every selected note stretches by what the grabbed one does.
                const step = drag.step || grid;
                const len = Math.max(1, Math.round((toTick(p.x) - n.tick) / step) * step);
                const d = len - drag.length;
                if (d !== drag.d) {
                    for (const o of drag.group) R.resizeNote(song, o.note, o.length + d);
                    drag.d = d;
                    lastLength = n.length / song.ticksPerBeat;
                    on.change();
                }
            }
            request();
        });

        function end(e) {
            if (!drag) return;
            if (drag.mode === 'ruler') {
                const { song, grid } = opts.state();
                if (drag.seek && e.type === 'pointerup') {
                    on.seek(Math.max(0, Math.min(song.length - 1, R.snapInBar(song, toTick(drag.at.x), grid))));
                }
                drag = null;
                request();
                return;
            }
            if (drag.mode === 'loop' && e.type === 'pointerup') {
                const { song, grid } = opts.state();
                const now = R.loopOf(song);
                // A new region drawn back to nothing was a click after all.
                if (JSON.stringify(now) !== JSON.stringify(drag.was)) on.looped(now);
                else if (drag.fresh) on.seek(Math.max(0, Math.min(song.length - 1, R.snapInBar(song, toTick(drag.at.x), grid))));
            }
            if (drag.mode === 'move') {
                const { song, track } = opts.state();
                // Back where it started (or held still over the panel): the
                // copies left behind would sit exactly on the originals.
                if (!drag.d.tick && !drag.d.pitch) dropCopies(song, track);
                if (drag.target != null) {
                    on.overTrack(null, drag.copy);
                    // Only a real release drops; a cancelled pointer just ends.
                    if (e.type === 'pointerup') on.drop(drag.target, drag.copy);
                } else if (drag.left && e.type === 'pointerup') {
                    on.say(`Copied ${drag.left.length} note${drag.left.length === 1 ? '' : 's'}.`);
                }
            }
            if (drag.mode === 'tempo' && e.type === 'pointerup') {
                if (drag.left) on.tempoCopied(drag.marker);
                else if (drag.deleteOnClick && !drag.moved) on.deleteTempo(drag.marker);
            }
            // An Alt-click, on a note's body or its edge: delete the note, as
            // it always has.
            if (drag.deleteOnClick && !drag.moved && e.type === 'pointerup') {
                const { song, track, selection } = opts.state();
                const i = song.tracks[track].notes.indexOf(drag.note);
                if (i >= 0) {
                    selection.delete(drag.note);
                    R.deleteNote(song, track, i);
                    on.change();
                }
            }
            // A Shift-click on a selected note: now it is a click, take it out.
            if (drag.removeOnClick && !drag.moved && e.type === 'pointerup') {
                opts.state().selection.delete(drag.note);
            }
            if (drag.mode === 'keys') hoverPitch = null;
            else on.commit();
            if (drag.mode === 'move' && drag.note) {
                lastLength = drag.note.length / opts.state().song.ticksPerBeat;
                lastVelocity = R.velocityOf(drag.note);
            }
            drag = null;
            request();
        }
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('lostpointercapture', end);

        canvas.addEventListener('pointerleave', () => {
            if (!hoverNote) return;
            hoverNote = null;
            request();
        });
        // Scrolling slides the note out from under the pointer.
        scroller.addEventListener('scroll', () => { hoverNote = null; request(); });
        new ResizeObserver(resize).observe(scroller);

        /** Scroll so `pitch` sits in the middle of the view. */
        function centrePitch(pitch) {
            measure(opts.state().song);
            scroller.scrollTop = Math.max(0, (HI - pitch) * ROW_H - (scroller.clientHeight - RULER_H - LANE_H) / 2);
        }

        /** Keep a tick in view while playing: page across when it leaves. */
        function follow(tick) {
            const x = KEY_W + tick * COL_W;
            const left = scroller.scrollLeft + KEY_W;
            const right = scroller.scrollLeft + scroller.clientWidth - 20;
            if (x < left || x > right) scroller.scrollLeft = Math.max(0, x - KEY_W - 40);
        }

        /** Read the theme's colours again, after the page's theme changes. */
        function retheme() {
            C = palette();
            request();
        }

        return { draw: request, resize, centrePitch, follow, retheme, toggleLane };
    }

    App.rollView = { create };
}());
