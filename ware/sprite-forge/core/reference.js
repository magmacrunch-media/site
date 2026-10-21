// core/reference.js: a picture to draw from, which is never the drawing.
//
// A reference image sits under the canvas as a faint underlay, or beside it at
// the same scale. Either way it is a VIEW: it is not a frame, it is not in the
// undo history, and serialize() never sees it, so it cannot end up in a sheet
// or a .forge file. That is the whole design, and it is why the image lives in
// ui/reference-ui.js and this file holds only the arithmetic around it.
//
// The usual source is libs/cast, the character bible: characters/<id>/README.md
// and characters/<id>/sprites/*.png. cast is reference only and no game loads
// it, which is exactly the role a reference image plays here. The desktop
// build can list it; the browser build opens one of its PNGs with a file input
// like any other picture, and needs nothing else.
//
// Pure: no DOM, no filesystem. The cast scan takes its readDir as an argument,
// so the suite drives it against a fake tree.

(function () {
    'use strict';

    const SpriteForge = (window.SpriteForge = window.SpriteForge || {});

    /* off: nothing drawn. underlay: under the pixels, at `opacity`. beside: to
       the right of the canvas at the canvas's own scale, full strength. */
    const MODES = ['off', 'underlay', 'beside'];

    /* Faint by default. Too strong and it is hard to tell your pixels from the
       picture's, which is the one thing an underlay must never make unclear. */
    const OPACITY = { min: 0.05, max: 0.9, initial: 0.35 };

    function nextMode(mode) {
        const i = MODES.indexOf(mode);
        return MODES[(i + 1) % MODES.length];
    }

    function clampOpacity(v) {
        const n = Number(v);
        if (v === null || v === '' || !Number.isFinite(n)) return OPACITY.initial;
        return Math.min(OPACITY.max, Math.max(OPACITY.min, n));
    }

    /**
     * Where an imgW x imgH picture goes in a boxW x boxH box: as large as fits,
     * aspect kept, centered.
     *
     * Enlarging snaps to a WHOLE multiple, because the reference is usually
     * pixel art too, and 2.67x pixel art is blurred or uneven whichever way it
     * is drawn. A 128x128 cast sprite over a 32x32 sprite at 16x is a 512px
     * canvas, so it goes in at exactly 4x and every cast pixel is a quarter of
     * one of yours. Shrinking cannot snap that way, so below 1x the scale is
     * whatever fits.
     */
    function fit(imgW, imgH, boxW, boxH) {
        if (!(imgW > 0 && imgH > 0 && boxW > 0 && boxH > 0)) return null;
        let scale = Math.min(boxW / imgW, boxH / imgH);
        if (scale >= 1) scale = Math.floor(scale);
        const w = Math.round(imgW * scale), h = Math.round(imgH * scale);
        return {
            x: Math.floor((boxW - w) / 2),
            y: Math.floor((boxH - h) / 2),
            w, h, scale,
            // Smoothing only helps a picture being shrunk; enlarged pixel art
            // wants its edges.
            smooth: scale < 1,
        };
    }

    /**
     * `base` joined with `parts`, with `.` and `..` resolved, in the
     * separator `base` already uses: backslashes for a Windows path, slashes
     * for anything else, so a joined path reads like the ones the folder
     * dialog hands back. A root (a leading slash, or a drive letter) is never
     * climbed out of; a relative path keeps the `..` it cannot resolve.
     */
    function joinPath(base, ...parts) {
        const sep = base.includes('\\') && !base.includes('/') ? '\\' : '/';
        const absolute = /^[\\/]/.test(base);
        const isDrive = (s) => /^[A-Za-z]:$/.test(s);
        const out = [];
        for (const seg of [base, ...parts].join('/').split(/[\\/]+/)) {
            if (seg === '' || seg === '.') continue;
            if (seg !== '..') { out.push(seg); continue; }
            const last = out[out.length - 1];
            if (last === undefined) { if (!absolute) out.push('..'); }
            else if (last === '..') out.push('..');
            else if (!isDrive(last)) out.pop();
        }
        return (absolute ? sep : '') + out.join(sep);
    }

    const samePath = (a, b) =>
        a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase();

    /**
     * Where a cast checkout might be, in the order to try them.
     *
     * The override first, if there is one: a folder somebody picked wins over
     * anything guessed. Then, beside each known checkout, the two places
     * AGENTS.md names for any sibling repo: `../cast` for a flat clone, then
     * `../../libs/cast` for this tree, where the apps, games and libs are
     * separate directories. An installed app has no checkout of its own to
     * stand beside, so the checkouts it knows are its TARGETS roots, which are
     * game repos picked from a folder dialog.
     */
    function castCandidates({ override, roots } = {}) {
        const out = [];
        const add = (p) => { if (p && !out.some(q => samePath(q, p))) out.push(p); };
        if (override) add(joinPath(override));
        for (const root of roots || []) {
            add(joinPath(root, '..', 'cast'));
            add(joinPath(root, '..', '..', 'libs', 'cast'));
        }
        return out;
    }

    const isPng = (name) => /\.png$/i.test(name);
    const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

    /**
     * Every character in a cast checkout that has at least one sprite, sorted
     * by id, each with its PNGs sorted by name. Null when `root` is not a cast
     * checkout at all (no readable characters/ directory), so a wrong guess
     * and an empty cast are told apart.
     *
     * `readDir(path)` resolves to [{ name, is_dir }], the shape the desktop
     * bridge's read_dir returns. A character whose sprites/ cannot be read is
     * left out rather than failing the scan: cast characters gain art one at a
     * time, and a page with no pictures yet is ordinary.
     */
    async function scanCast(root, readDir) {
        let entries;
        try { entries = await readDir(joinPath(root, 'characters')); } catch { return null; }
        if (!Array.isArray(entries)) return null;
        const ids = entries.filter(e => e.is_dir).map(e => e.name).sort(byName);
        const characters = [];
        for (const id of ids) {
            let files;
            try { files = await readDir(joinPath(root, 'characters', id, 'sprites')); } catch { continue; }
            const sprites = (files || [])
                .filter(f => !f.is_dir && isPng(f.name))
                .map(f => f.name)
                .sort(byName)
                .map(name => ({ name, path: joinPath(root, 'characters', id, 'sprites', name) }));
            if (sprites.length) characters.push({ id, sprites });
        }
        return { root, characters };
    }

    /**
     * The first candidate that is a cast checkout with something in it, plus
     * every path that was tried. The list is the point when nothing is found:
     * "no cast" with no paths reads the same as a machine that has none, and
     * that silence is how this tree's sibling-path lookups have hidden before.
     */
    async function findCast(candidates, readDir) {
        const tried = [];
        for (const root of candidates) {
            tried.push(root);
            const cast = await scanCast(root, readDir);
            if (cast && cast.characters.length) return { ...cast, tried };
        }
        return { root: null, characters: [], tried };
    }

    /** `grocery-harrison/idle`, for a label: the id, and the file without .png. */
    function spriteLabel(id, name) {
        return `${id}/${name.replace(/\.png$/i, '')}`;
    }

    SpriteForge.reference = {
        MODES, OPACITY, nextMode, clampOpacity, fit,
        joinPath, castCandidates, scanCast, findCast, spriteLabel,
    };
}());
