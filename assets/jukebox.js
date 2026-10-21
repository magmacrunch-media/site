// iOS has no Ogg Vorbis decoder, and every browser on iOS is WebKit, so Chrome
// and Firefox there fail exactly as Safari does. An ogg-only page is not quieter
// on an iPhone, it is silent - and silent without an error. Every track in
// music/jukebox/songs/ exists as both .ogg and .mp3; pick the one this browser
// can decode. See AGENTS.md, "Audio needs two formats".
var AUDIO_EXT = document.createElement('audio')
    .canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3';
var audioSrc = function (path) { return path.replace(/\.ogg$/, AUDIO_EXT); };

/* ═══════════════════════════════════════════════
   magmacrunch media: the jukebox engine, and the nav's mini-player
   assets/jukebox.js
   ═══════════════════════════════════════════════

   ONE ENGINE, ONE <audio>, TWO VIEWS. Until 2026-10-21 the nav pill and the
   jukebox page were separate players, each with its own <audio> element,
   handing a snapshot to each other through localStorage. Opening the page
   while the pill played started a second copy of the same song, and leaving
   the page stopped the music, because the pill restored only once a session.

   Now this file owns the element and runs media-player's playback core
   (assets/player-core.js, synced by scripts/sync-player-core.mjs): a pure
   queue and a pure reducer, tested there with no DOM. Everything here is the
   SHELL: it performs the reducer's intents (LOAD, PLAY, PAUSE, SEEK, ...) on
   the element and reports the element's events back. The page
   (music/jukebox/app.js) is a second view over window.MCJukebox, and the nav
   survives SPA navigation, so the music does too. ── */

(function () {
    'use strict';

    // One engine per document, however many times nav.js or the SPA router
    // re-enters this file. Only the widget is rebuilt; see boot().
    if (window.MCJukebox) {
        if (window.__initJukeboxPlayer) window.__initJukeboxPlayer();
        return;
    }

    /* ── THE CORE ──
       Loaded on demand rather than by every page: nav.js injects this file on
       idle, and this file brings its own dependency. Origin-absolute like every
       path here, because nav.js injects it at every depth. */
    const root = new URL('/', location.origin).pathname;
    let coreReady = null;
    function loadCore() {
        if (window.MediaPlayer && window.MediaPlayer.playback) return Promise.resolve();
        if (coreReady) return coreReady;
        coreReady = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = root + 'assets/player-core.js?v=ed2b91bd';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
        return coreReady;
    }

    /* ── TRACK LIST ──
       music/jukebox/songs.json, the one manifest. The bare filename is a
       track's id, and ids are all the queue and the saved state ever hold, so
       a reordered or extended manifest cannot make a saved state name a
       different song. ── */
    let TRACKS = [];
    const byId = new Map();
    function loadTracks() {
        return fetch(new URL('music/jukebox/songs.json', location.origin).pathname)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                TRACKS = data.filter((s) => !s.hidden).map((s) => ({
                    id: s.file,
                    title: s.title,
                    artist: s.artist,
                    duration: s.duration || '',
                    path: 'music/jukebox/songs/' + s.file,
                }));
            })
            .catch(() => { TRACKS = []; })
            .then(() => { byId.clear(); TRACKS.forEach((t) => byId.set(t.id, t)); });
    }

    const STORAGE_KEY = 'mc-jukebox-v2';
    const LEGACY_KEY = 'mc-jukebox';
    const EXPANDED_KEY = 'mcj_expanded';

    /* ── ENGINE STATE ── */
    let P = null;
    let Q = null;
    let state = null;
    let audio = null;
    let resumeTo = 0;
    const listeners = new Set();

    function notify() {
        listeners.forEach((fn) => { try { fn(state); } catch (e) { /* a view's bug is the view's */ } });
    }

    function dispatch(event) {
        const out = P.reduce(state, event);
        state = out.state;
        out.intents.forEach(perform);
        notify();
    }

    /* ── PERFORMING INTENTS ── */
    function srcFor(id) {
        const t = byId.get(id);
        return t ? audioSrc(new URL(t.path, location.origin).pathname) : '';
    }

    function perform(intent) {
        switch (intent.type) {
        case 'LOAD':
            audio.src = srcFor(intent.id);
            audio.load();
            break;
        case 'PLAY':
            /* A rejected play() is normal: an autoplay refusal, or a play
               interrupted by a new src. If the reducer now believes it is
               playing while the element sits paused, put the belief back.
               A refusal while still 'loading' needs nothing: the views treat
               loading as not playing, and the next press plays. */
            audio.play().catch(() => {
                if (audio.paused && state.status === 'playing') dispatch({ type: 'TOGGLE' });
            });
            break;
        case 'PAUSE':
            audio.pause();
            break;
        case 'SEEK':
            if (isFinite(intent.positionSec)) audio.currentTime = intent.positionSec;
            break;
        case 'VOLUME':
            audio.volume = intent.muted ? 0 : intent.volume;
            break;
        case 'METADATA':
            publishMetadata(intent.id);
            break;
        case 'SAVE_STATE':
            save();
            break;
        default:
            break; // COUNT_PLAY: the site keeps no play counts
        }
    }

    /* ── WHAT THE ELEMENT REPORTS ──
       The element is the authority on whether sound is coming out; the
       reducer decides what should happen. 'pause' and 'play' fire only when
       the two have come apart (a headset, a media key, a refused autoplay),
       so a transition this file performed does not bounce back. 'pause' also
       fires just before 'ended', which is why it checks audio.ended. */
    function wire() {
        audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('loadedmetadata', () => {
            const r = resumeTo;
            resumeTo = 0;
            dispatch({ type: 'LOADED', durationSec: audio.duration, resumeTo: r });
        });
        audio.addEventListener('playing', () => dispatch({ type: 'PLAYING' }));
        audio.addEventListener('timeupdate', () => dispatch({ type: 'TICK', positionSec: audio.currentTime }));
        audio.addEventListener('ended', () => dispatch({ type: 'ENDED' }));
        audio.addEventListener('pause', () => {
            if (state.status === 'playing' && !audio.ended) dispatch({ type: 'TOGGLE' });
        });
        audio.addEventListener('play', () => {
            if (state.status === 'paused') dispatch({ type: 'TOGGLE' });
        });
        audio.addEventListener('error', () => {
            const code = audio.error ? audio.error.code : 0;
            if (code === 1 || !audio.getAttribute('src')) return; // we changed or cleared src
            dispatch({ type: 'ERROR', message: 'media error ' + code });
        });
    }

    /* ── SAVING AND RESTORING ──
       What survives a full page load or a new tab: the reducer's own snapshot,
       keyed by id. Saved on every SAVE_STATE intent, every few seconds while
       playing (the reducer deliberately does not ask on TICK), and on the way
       out. Within a session the SPA router keeps this document, and so the
       element, alive; this is for everything else. */
    function save() {
        if (!state) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(P.snapshot(state))); } catch (e) { /* storage off */ }
    }

    function readSaved() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
            /* The two-player format, from before this file owned the engine:
               { id, track, time, playing, volume, muted }. Read once so a
               returning visitor resumes rather than starting over. */
            const old = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
            if (!old) return null;
            const id = old.id || (TRACKS[old.track] && TRACKS[old.track].id) || null;
            return {
                id,
                positionSec: old.time || 0,
                playing: !!old.playing,
                volume: typeof old.volume === 'number' ? old.volume : 0.7,
                muted: !!old.muted,
                order: TRACKS.map((t) => t.id),
                base: TRACKS.map((t) => t.id),
                cursor: id ? TRACKS.findIndex((t) => t.id === id) : -1,
            };
        } catch (e) { return null; }
    }

    /* A saved queue against TODAY's manifest: ids that no longer exist are
       dropped, songs added since are appended, so a new release is reachable
       without anybody clearing their storage. */
    function reconcile(snap) {
        const ids = TRACKS.map((t) => t.id);
        const known = new Set(ids);
        const keep = (list) => (Array.isArray(list) ? list.filter((x) => known.has(x)) : []);
        const order = keep(snap.order);
        const base = keep(snap.base);
        ids.forEach((x) => { if (!order.includes(x)) order.push(x); if (!base.includes(x)) base.push(x); });
        const id = known.has(snap.id) ? snap.id : null;
        let cursor = id ? order.indexOf(id) : (order.length ? 0 : -1);
        if (cursor < 0 && order.length) cursor = 0;
        return Object.assign({}, snap, {
            id, order, base, cursor,
            positionSec: id ? snap.positionSec : 0,
            upNext: id && snap.cursor === order.indexOf(id) ? snap.upNext : 0,
        });
    }

    function restore() {
        const saved = readSaved();
        if (!saved) {
            state = P.initial({ queue: Q.create(TRACKS.map((t) => t.id)) });
            audio.volume = state.volume;
            return false;
        }
        const snap = reconcile(saved);
        state = P.restore(snap);
        audio.volume = state.muted ? 0 : state.volume;
        if (state.id) {
            resumeTo = state.positionSec || 0;
            audio.src = srcFor(state.id);
            audio.load();
            publishMetadata(state.id);
        }
        return !!(saved.playing && state.id);
    }

    let saveTimer = null;
    function startSaving() {
        if (saveTimer) return;
        saveTimer = setInterval(() => { if (state && state.status === 'playing') save(); }, 3000);
    }
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);

    /* ── MEDIA SESSION ── */
    function publishMetadata(id) {
        if (!('mediaSession' in navigator)) return;
        const t = byId.get(id);
        if (!t) return;
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: t.title,
                artist: t.artist,
                album: 'magmacrunch media',
                artwork: [
                    // 512: MediaSession artwork lands on a phone lock screen,
                    // where anything smaller is visibly soft.
                    { src: root + 'assets/logo.jpg', sizes: '512x512', type: 'image/jpeg' },
                ],
            });
        } catch (e) { /* an older browser without MediaMetadata */ }
    }

    /* ── THE PUBLIC FACE ──
       What the page and the widget call. Both views are thin: they read state,
       call these, and re-render on notify. ── */
    const api = {
        ready: null,
        tracks: () => TRACKS.slice(),
        track: (id) => byId.get(id) || null,
        state: () => state,
        position: () => (audio ? audio.currentTime : 0),
        duration: () => (audio && isFinite(audio.duration) ? audio.duration : null),
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        upNext: () => (state ? Q.upNextIds(state.queue) : []),
        playing: () => !!state && state.status === 'playing',

        // Play this song now. The queue is the whole manifest in its order,
        // so "next" after it is whatever follows it there.
        play(id) {
            if (!state.queue.order.includes(id)) {
                dispatch({ type: 'SET_QUEUE', queue: Q.create(TRACKS.map((t) => t.id)) });
            }
            dispatch({ type: 'PLAY_ID', id });
        },
        toggle() {
            if (!state.id && !Q.isEmpty(state.queue)) {
                dispatch({ type: 'PLAY_ID', id: Q.currentId(state.queue) });
                return;
            }
            dispatch({ type: 'TOGGLE' });
        },
        next() { dispatch({ type: 'NEXT' }); },
        prev() { dispatch({ type: 'PREV' }); },
        // Stop: pause, back to the start of the song, and let go of whatever
        // was queued. The page's STOP has always meant all three.
        stop() {
            if (state.status === 'playing') dispatch({ type: 'TOGGLE' });
            if (state.id) dispatch({ type: 'SEEK', positionSec: 0 });
            const q = state.queue;
            if (q.upNext) dispatch({ type: 'SET_QUEUE', queue: Object.assign({}, q, { upNext: 0 }) });
        },
        queueNext(id) { dispatch({ type: 'SET_QUEUE', queue: Q.queueNext(state.queue, id) }); },
        removeUpNext(i) {
            const q = state.queue;
            if (i < 0 || i >= (q.upNext || 0)) return;
            dispatch({ type: 'SET_QUEUE', queue: Q.removeAt(q, q.cursor + 1 + i) });
        },
        seek(sec) { dispatch({ type: 'SEEK', positionSec: sec }); },
        setVolume(v) { dispatch({ type: 'SET_VOLUME', volume: v }); },
        toggleMute() { dispatch({ type: 'SET_MUTED', muted: !state.muted }); },
    };

    api.ready = loadCore()
        .then(loadTracks)
        .then(() => {
            P = window.MediaPlayer.playback;
            Q = window.MediaPlayer.queue;
            wire();
            const wasPlaying = restore();
            startSaving();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('play', () => { if (!api.playing()) api.toggle(); });
                navigator.mediaSession.setActionHandler('pause', () => { if (api.playing()) api.toggle(); });
                navigator.mediaSession.setActionHandler('previoustrack', api.prev);
                navigator.mediaSession.setActionHandler('nexttrack', api.next);
            }
            notify();
            /* It was playing when the last page went away. Try to carry on;
               a browser that wants a gesture first refuses, perform('PLAY')
               puts the state back to paused, and the next press plays. */
            if (wasPlaying) dispatch({ type: 'TOGGLE' });
            return api;
        });
    api.ready.catch(() => { /* no core or no manifest: an inert pill, not a broken page */ });
    window.MCJukebox = api;

    /* ═══════════════════════════════════════════════
       THE NAV WIDGET: a view, like the page
       ═══════════════════════════════════════════════ */

    let widgetEl = null;
    let expandedPlayBtn = null;
    let expandedMuteBtn = null;
    let expandedTitle = null;
    let expandedArtist = null;
    let expandedTime = null;
    let progressWrap = null;
    let progressFill = null;
    let volSlider = null;
    let volLabel = null;
    let barLabel = null;

    function fmtTime(s) {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ':' + String(sec).padStart(2, '0');
    }

    function toggleExpand() {
        if (!widgetEl) return;
        const expanding = widgetEl.classList.contains('minimized');
        widgetEl.classList.toggle('minimized', !expanding);
        widgetEl.classList.toggle('expanded', expanding);
        const bar = widgetEl.querySelector('.mcj-bar');
        if (bar) bar.setAttribute('aria-expanded', expanding ? 'true' : 'false');
        try { localStorage.setItem(EXPANDED_KEY, expanding ? 'true' : 'false'); } catch (e) {}
    }

    /* ── NOW-PLAYING READOUT ──
       The center of the nav is dead space: at 1440px the brand ends at x=159
       and the links begin at x=932. The pill's label says what the site is
       doing there: idle it names the button, playing it names the track, and
       it truncates with an ellipsis rather than colliding with the links. ── */
    function updateBarLabel(track, playing) {
        if (!barLabel) return;
        // '//' rather than a dash: the separator the rest of the site sets its
        // headings in, and it survives a monospace pixel font.
        const line = (track && playing) ? '♪ ' + track.title + ' // ' + track.artist : 'JUKEBOX';
        if (barLabel.textContent === line) return;
        barLabel.textContent = line;
        const bar = barLabel.closest('.mcj-bar');
        if (bar) {
            bar.setAttribute('aria-label', (track && playing)
                ? 'now playing: ' + track.title + ' by ' + track.artist + '. Open the jukebox mini-player.'
                : 'open the jukebox mini-player');
        }
    }

    function render() {
        if (!widgetEl || !state) return;
        const track = state.id ? byId.get(state.id) : null;
        const playing = state.status === 'playing';
        updateBarLabel(track, playing);
        widgetEl.classList.toggle('playing', playing); // drives the vinyl spin

        if (expandedPlayBtn) {
            expandedPlayBtn.textContent = playing ? '❚❚' : '▶';
            expandedPlayBtn.setAttribute('aria-label', playing ? 'pause' : 'play');
        }
        if (expandedTitle) expandedTitle.textContent = track ? track.title : '\u2014';
        if (expandedArtist) expandedArtist.textContent = track ? track.artist : '\u2014';
        if (expandedMuteBtn) {
            expandedMuteBtn.textContent = state.muted ? '✖' : '♪';
            expandedMuteBtn.setAttribute('aria-label', state.muted ? 'unmute' : 'mute');
            expandedMuteBtn.classList.toggle('muted', state.muted);
        }
        if (volSlider) {
            volSlider.value = state.volume * 100;
            volSlider.style.setProperty('--vol-pct', (state.volume * 100) + '%');
            volSlider.classList.toggle('muted', state.muted);
        }
        if (volLabel) {
            volLabel.textContent = Math.round(state.volume * 100);
            volLabel.classList.toggle('muted', state.muted);
        }
        const pos = api.position();
        const dur = api.duration() || state.durationSec;
        if (progressFill) progressFill.style.setProperty('--progress', (track && dur ? (pos / dur) * 100 : 0) + '%');
        if (expandedTime) expandedTime.textContent = track ? fmtTime(pos) + ' / ' + fmtTime(dur) : '0:00 / 0:00';
    }

    function seekFromClick(e) {
        const dur = api.duration();
        if (!dur || !progressWrap) return;
        const rect = progressWrap.getBoundingClientRect();
        api.seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur);
    }

    function createWidget() {
        if (widgetEl && widgetEl.isConnected) return;
        if (widgetEl && !widgetEl.isConnected) widgetEl = null;
        if (document.body.classList.contains('no-jukebox')) return;
        /* Not on touch and not under 900px: nav.js's loader makes exactly this
           call and loads neither this file nor jukebox.css there. The jukebox
           page loads this file itself, for the engine, so without the same
           test here a phone got the widget with no stylesheet: its controls
           spilled out bare over the top of the page. The engine still runs;
           only the widget is skipped. */
        if (window.matchMedia &&
            window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) return;
        // In the nav or not at all. __initJukeboxPlayer can be re-entered by
        // the SPA router, so the guard stays.
        const nav = document.querySelector('nav');
        if (!nav) return;

        const jukeboxHref = root + 'music/jukebox/';
        widgetEl = document.createElement('div');
        widgetEl.className = 'mcj minimized';
        widgetEl.innerHTML =
            '<div class="mcj-bar" role="button" tabindex="0" ' +
                    'aria-label="open the jukebox mini-player" aria-expanded="false">' +
                '<div class="mcj-mini-vinyl"></div>' +
                '<span class="mcj-bar-label">JUKEBOX</span>' +
            '</div>' +
            '<div class="mcj-drop">' +
                '<div class="mcj-header">' +
                    '<span>// JUKEBOX //</span>' +
                    '<button class="mcj-minimize" aria-label="minimize">\u2014</button>' +
                '</div>' +
                '<div class="mcj-window">' +
                    '<div class="mcj-expanded-inner">' +
                        '<div class="mcj-vinyl"></div>' +
                        '<div class="mcj-info">' +
                            '<div class="mcj-title">\u2014</div>' +
                            '<div class="mcj-artist">\u2014</div>' +
                            '<div class="mcj-time">0:00 / 0:00</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mcj-progress-wrap">' +
                        '<div class="mcj-progress"><div class="mcj-progress-fill"></div></div>' +
                    '</div>' +
                    '<div class="mcj-controls">' +
                        '<button class="mcj-btn mcj-btn-skip" aria-label="previous track">◀◀</button>' +
                        '<button class="mcj-btn mcj-btn-play" aria-label="play">▶</button>' +
                        '<button class="mcj-btn mcj-btn-skip" aria-label="next track">▶▶</button>' +
                        '<div class="mcj-vol-wrap">' +
                            '<button class="mcj-btn mcj-mute" aria-label="mute">♪</button>' +
                            '<input type="range" class="mcj-vol" min="0" max="100" value="70" aria-label="volume">' +
                            '<span class="mcj-vol-label">70</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mcj-link"><a href="' + jukeboxHref + '">OPEN JUKEBOX →</a></div>' +
                '</div>' +
            '</div>';

        // Before the links: the dead center of the bar.
        nav.insertBefore(widgetEl, nav.querySelector('.nav-links'));

        barLabel = widgetEl.querySelector('.mcj-bar-label');
        expandedPlayBtn = widgetEl.querySelector('.mcj-btn-play');
        expandedMuteBtn = widgetEl.querySelector('.mcj-mute');
        expandedTitle = widgetEl.querySelector('.mcj-title');
        expandedArtist = widgetEl.querySelector('.mcj-artist');
        expandedTime = widgetEl.querySelector('.mcj-time');
        progressWrap = widgetEl.querySelector('.mcj-progress');
        progressFill = widgetEl.querySelector('.mcj-progress-fill');
        volSlider = widgetEl.querySelector('.mcj-vol');
        volLabel = widgetEl.querySelector('.mcj-vol-label');

        // A role="button" owes the keyboard what a <button> gives for free.
        const barEl = widgetEl.querySelector('.mcj-bar');
        barEl.addEventListener('click', toggleExpand);
        barEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') { e.preventDefault(); toggleExpand(); }
        });
        widgetEl.querySelector('.mcj-minimize').addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(); });

        // The engine may still be loading; a press before it is ready waits.
        const whenReady = (fn) => () => api.ready.then(fn);
        expandedPlayBtn.addEventListener('click', whenReady(() => api.toggle()));
        widgetEl.querySelector('.mcj-btn-skip[aria-label="previous track"]').addEventListener('click', whenReady(() => api.prev()));
        widgetEl.querySelector('.mcj-btn-skip[aria-label="next track"]').addEventListener('click', whenReady(() => api.next()));
        expandedMuteBtn.addEventListener('click', whenReady(() => api.toggleMute()));
        volSlider.addEventListener('input', (e) => { const v = parseInt(e.target.value, 10) / 100; api.ready.then(() => api.setVolume(v)); });
        progressWrap.addEventListener('click', seekFromClick);

        /* No __pageCleanup here, deliberately: that hook is the SPA router's
           "this page is going away", and the jukebox is the one thing on the
           site scoped to the SESSION. Claiming it paused the music on every
           navigation, and clobbered the page's own cleanup besides. */

        try {
            if (localStorage.getItem(EXPANDED_KEY) === 'true') {
                widgetEl.classList.remove('minimized');
                widgetEl.classList.add('expanded');
                barEl.setAttribute('aria-expanded', 'true');
            }
        } catch (e) {}

        render();
    }

    api.subscribe(render);

    /* ── KEYBOARD (only while the panel is open) ──
       These keys belong to the page first: Space pages down and the arrows
       scroll. Expanded is the unambiguous "I am using the player" signal.
       Modifier chords are the browser's. A key handled here is marked with
       preventDefault, which the jukebox page's own handler respects, so one
       press is never acted on twice. */
    window.addEventListener('keydown', (e) => {
        if (!state || !widgetEl || !widgetEl.classList.contains('expanded')) return;
        if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
        const el = document.activeElement;
        const tag = el && el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (el && el.isContentEditable) return;
        if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); api.toggle(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); api.prev(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); api.next(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); api.setVolume(state.volume + 0.05); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); api.setVolume(state.volume - 0.05); }
        else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); api.toggleMute(); }
    });

    /* ── INIT ──
       The widget is built at once and the engine awaited separately, so a slow
       songs.json leaves an inert pill rather than no pill. */
    function boot() { createWidget(); }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    window.__initJukeboxPlayer = boot;
})();
