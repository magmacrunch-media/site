// bridge.js — how the editor reaches a filesystem, if it has one.
//
// Loaded by both builds. Under Tauri it wires window.SpriteForge.fs to the Rust
// commands in desktop/src-tauri/src/fs.rs. In a browser it leaves fs undefined,
// and that absence is the whole feature switch: the editor hides the project
// and target panels when there is no fs, so the web page is the same files
// running without a disk rather than a second build to keep in step.
//
// Everything here is plumbing. No sprite, sheet or engine knowledge — that all
// lives in core/, shared by both builds and tested in Node.

(function () {
    window.SpriteForge = window.SpriteForge || {};

    // kit/bridge-core.js decided whether there is a backend: it looked for
    // __TAURI_INTERNALS__ (never a user agent), marked <html class="desktop">
    // so CSS can drop the website chrome, and exposed MagmaKit.tauri. When it
    // found nothing, MagmaKit.tauri is undefined and so is everything below,
    // which is how the browser build cannot accidentally believe it has a
    // filesystem. This file used to repeat all three of those by hand.
    const T = window.MagmaKit && window.MagmaKit.tauri;
    if (!T) return;

    // WebView2 still offers its own right-click menu — Back, Reload, Save as,
    // Print. Every entry on it is either meaningless in a single-page tool or
    // actively destructive: Reload throws away unsaved frames with no prompt.
    // The kit's suppression leaves fields theirs, because Cut/Copy/Paste in a
    // text box is the one case where the browser's menu is the right menu.
    T.suppressContextMenu();

    const invoke = (cmd, args) => T.invoke(cmd, args);

    // The dialog plugin's commands are namespaced by plugin, unlike ours; the
    // kit's dialog() adds the `plugin:dialog|` prefix.
    const dialog = (cmd, args) => T.dialog(cmd, args);

    const FORGE_FILTER = [{ name: 'SPRITE//FORGE project', extensions: ['forge'] }];
    const PNG_FILTER = [{ name: 'PNG image', extensions: ['png'] }];

    window.SpriteForge.fs = {
        // ── files ────────────────────────────────────────────
        readText: (path) => invoke('read_text', { path }),
        writeText: (path, contents) => invoke('write_text', { path, contents }),
        readBytes: (path) => invoke('read_bytes', { path }).then(a => new Uint8Array(a)),
        writeBytes: (path, bytes) => invoke('write_bytes', { path, contents: [...bytes] }),
        exists: (path) => invoke('exists', { path }),
        readDir: (path) => invoke('read_dir', { path }),

        // Writing one file of a plan, resolved against a target root. Separate
        // from writeBytes because this is the call that takes a path built from
        // a sprite name, and sprite names come out of .yy and .forge files —
        // data, not necessarily the user's own typing. The Rust side refuses
        // anything that climbs out of the root.
        writeInRoot: (root, rel, bytes) =>
            invoke('write_in_root', { root, rel, contents: [...bytes] }),
        writeTextInRoot: (root, rel, contents) =>
            invoke('write_text_in_root', { root, rel, contents }),

        // ── pickers ──────────────────────────────────────────
        openProject: () =>
            dialog('open', { options: { multiple: false, directory: false, filters: FORGE_FILTER } }),
        saveProject: (defaultPath) =>
            dialog('save', { options: { defaultPath, filters: FORGE_FILTER } }),
        openPng: () =>
            dialog('open', { options: { multiple: false, directory: false, filters: PNG_FILTER } }),
        savePng: (defaultPath) =>
            dialog('save', { options: { defaultPath, filters: PNG_FILTER } }),
        pickFolder: (title) =>
            dialog('open', { options: { multiple: false, directory: true, title } }),
        confirm: (message, title) =>
            dialog('ask', { message, title: title || 'SPRITE//FORGE' }),

        // ── config ───────────────────────────────────────────
        // targets.json lives here, never in the repo: the list of game projects
        // to export into is per-machine configuration. It is why this app can
        // know about its author's repos while a stranger's copy knows about
        // theirs and ships with an empty list.
        configDir: () => invoke('config_dir'),

        // ── about ────────────────────────────────────────────
        appVersion: () => invoke('app_version'),

        // ── the log file ─────────────────────────────────────
        // kit/boot.js writes here directly, before this file exists. These are
        // for everything after it. Fire-and-forget: a failure to log must never
        // become a failure to run.
        logLine: (kind, message, detail) =>
            invoke('log_line', { kind, message, detail: detail === undefined ? null : String(detail) })
                .catch(() => {}),
        logPath: () => invoke('log_path'),

        // ── lifecycle ────────────────────────────────────────
        quit: () => invoke('quit'),

        // Pushed rather than asked for: only the editor knows whether anything
        // is unsaved, and only the Rust side is told the window is closing.
        setDirty: (dirty) => invoke('set_dirty', { dirty }),
    };
}());
