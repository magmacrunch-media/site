// bridge.js — the app's command catalog over the kit's Tauri substrate.
//
// kit/bridge-core.js decided whether a backend exists; when it did not,
// MagmaKit.tauri is undefined, PunchRoll.fs stays undefined too, and that
// absence is the whole feature switch — the pages degrade instead of throwing.
//
// This file is the ONLY place a Rust command is named. Everything here is
// plumbing; anything the app knows about its own documents lives in core/.

(function () {
    'use strict';

    window.PunchRoll = window.PunchRoll || {};

    const T = window.MagmaKit && window.MagmaKit.tauri;
    if (!T) return;

    T.suppressContextMenu();

    // Songs save as .punch, which is JSON under its own name so the OS can
    // hand one to this app on a double-click. Open still takes .json, which
    // is what every song saved before the extension existed is called.
    const SONG_FILTER = [{ name: 'PUNCH//ROLL song', extensions: ['punch'] }];
    const SONG_OPEN_FILTER = [{ name: 'PUNCH//ROLL song', extensions: ['punch', 'json'] }];
    const WAV_FILTER = [{ name: 'WAV audio', extensions: ['wav'] }];

    window.PunchRoll.fs = {
        // ── files ────────────────────────────────────────────
        readText: (path) => T.invoke('read_text', { path }),
        writeText: (path, contents) => T.invoke('write_text', { path, contents }),
        readBytes: (path) => T.invoke('read_bytes', { path }).then(a => new Uint8Array(a)),
        writeBytes: (path, bytes) => T.invoke('write_bytes', { path, contents: [...bytes] }),
        exists: (path) => T.invoke('exists', { path }),
        readDir: (path) => T.invoke('read_dir', { path }),
        writeInRoot: (root, rel, bytes) =>
            T.invoke('write_in_root', { root, rel, contents: [...bytes] }),
        writeTextInRoot: (root, rel, contents) =>
            T.invoke('write_text_in_root', { root, rel, contents }),

        // ── pickers ──────────────────────────────────────────
        pickSong: () =>
            T.dialog('open', { options: { multiple: false, directory: false, filters: SONG_OPEN_FILTER } }),
        pickSongSave: (defaultPath) =>
            T.dialog('save', { options: { defaultPath, filters: SONG_FILTER } }),
        pickWavSave: (defaultPath) =>
            T.dialog('save', { options: { defaultPath, filters: WAV_FILTER } }),
        confirm: (message, title) =>
            T.dialog('ask', { message, title: title || 'PUNCH//ROLL' }),
        notify: (message, title) =>
            T.dialog('message', { message, title: title || 'PUNCH//ROLL' }),

        // ── config / lifecycle ───────────────────────────────
        configDir: () => T.invoke('config_dir'),
        appVersion: () => T.invoke('app_version'),
        quit: () => T.invoke('quit'),
        // The song the OS launched us with, taken once: a double-clicked
        // .punch file. open-file says another one arrived while running
        // (macOS sends those as events rather than as a new process).
        launchFile: () => T.invoke('launch_file'),
        onOpenFile: (fn) => T.on('open-file', fn),
        setDirty: (dirty) => T.invoke('set_dirty', { dirty }),

        // ── MIDI ─────────────────────────────────────────────
        // The webviews of macOS and Linux have no Web MIDI, so the desktop
        // reads MIDI in Rust on every platform (src/midi.rs). Inputs are
        // known by name; each message comes as { port, data }.
        midiInputs: () => T.invoke('midi_inputs'),
        midiListen: (names) => T.invoke('midi_listen', { names }),
        onMidi: (fn) => T.on('midi', fn),

        // ── the log file ─────────────────────────────────────
        // Fire-and-forget: a failure to log must never become a failure to run.
        logLine: (kind, message, detail) =>
            T.invoke('log_line', { kind, message, detail: detail === undefined ? null : String(detail) })
                .catch(() => {}),
        logPath: () => T.invoke('log_path'),
    };
}());
