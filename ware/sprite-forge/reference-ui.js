// reference-ui.js: the REFERENCE section: a picture to draw from.
//
// Holds one image, which is never a frame. editor.js's render() asks this
// module for the underlay at call time, between the checkerboard and the
// pixels, so it sits under the art and under the onion skin; "beside" draws
// the same picture on its own canvas to the right of the drawing, sized by the
// same core/reference.js fit. Nothing here touches the editor's state, the
// undo history or the project, which is how the picture is kept out of every
// sheet and every .forge: it is not anywhere they look.
//
// Opening a PNG is a file input, in every tier. The CAST list is the one part
// that needs a disk, because it lists a sibling checkout's directories, and it
// is the only part behind a capability (`cast`, core/tier.js).

(function () {
    'use strict';

    const SF = window.SpriteForge;
    const R = SF.reference;
    const can = (cap) => SF.tier.current.has(cap);
    const fs = () => SF.fs;
    const editor = () => SF.editor;
    const toast = (m) => window.Toast ? window.Toast.show(String(m).toUpperCase()) : console.log(m);

    const $ = (id) => document.getElementById(id);
    const openBtn = $('ref-open-btn');
    const clearBtn = $('ref-clear-btn');
    const fileInput = $('ref-file');
    const modeBox = $('ref-modes');
    const opacityIn = $('ref-opacity');
    const nameOut = $('ref-name');
    const beside = $('ref-beside');
    const stage = $('canvas-stage');
    const castBox = $('ref-cast');
    const castSel = $('ref-cast-select');
    const castFolder = $('ref-cast-folder');
    const castRescan = $('ref-cast-rescan');
    const castHint = $('ref-cast-hint');
    const panel = document.querySelector('#sidebar details[data-section="reference"]');
    if (!openBtn) return;

    // The view settings persist; the picture does not. A reference is chosen
    // for a drawing session, and an image kept in localStorage is a second
    // copy of somebody's art in a place nobody looks.
    const PREF_KEY = 'sprite-forge-reference';
    const saved = MagmaKit.prefs.read(PREF_KEY);
    const pref = saved && typeof saved === 'object' ? saved : {};
    let mode = R.MODES.includes(pref.mode) ? pref.mode : 'underlay';
    let opacity = R.clampOpacity(pref.opacity);
    let castRoot = typeof pref.castRoot === 'string' && pref.castRoot ? pref.castRoot : null;
    const persist = () => MagmaKit.prefs.write(PREF_KEY, { mode, opacity, castRoot });

    let image = null;       // decoded, drawable, or null
    let label = '';
    let imageId = 0;        // bumped per picture, so two files of one name are not one
    let besideKey = '';     // what the beside canvas last drew, so a stroke does not redraw it

    function setMode(next) {
        mode = R.MODES.includes(next) ? next : 'off';
        persist();
        update();
    }

    function update() {
        for (const b of modeBox.querySelectorAll('[data-ref-mode]'))
            b.classList.toggle('active', b.dataset.refMode === mode);
        opacityIn.value = String(opacity);
        // The fade is the underlay's alone: beside is full strength, because
        // there it is not competing with your pixels.
        opacityIn.disabled = mode !== 'underlay';
        clearBtn.disabled = !image;
        nameOut.textContent = image
            ? `${label}, ${image.naturalWidth || image.width}×${image.naturalHeight || image.height}`
            : 'nothing open';
        besideKey = '';
        const e = editor();
        if (e && e.redraw) e.redraw();
    }

    /**
     * Called from render() with the canvas context and its size. Draws the
     * underlay when that is the mode, and keeps the beside canvas matched to
     * the drawing's size when that is. Cheap when nothing changed: render()
     * runs on every mousemove of a stroke.
     */
    function paint(ctx, w, h) {
        const showBeside = !!image && mode === 'beside';
        if (beside.hidden === showBeside) {
            beside.hidden = !showBeside;
            stage.classList.toggle('with-ref', showBeside);
        }
        if (!image || mode === 'off') return;
        const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
        const r = R.fit(iw, ih, w, h);
        if (!r) return;

        if (mode === 'underlay') {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.imageSmoothingEnabled = r.smooth;
            ctx.drawImage(image, r.x, r.y, r.w, r.h);
            ctx.restore();
            return;
        }

        // Beside: the picture's own box, not the drawing's, so a square cast
        // sprite beside a tall sprite is not padded out with nothing.
        const key = `${imageId}|${r.w}x${r.h}`;
        if (key === besideKey) return;
        besideKey = key;
        beside.width = r.w; beside.height = r.h;
        const bctx = beside.getContext('2d');
        bctx.imageSmoothingEnabled = r.smooth;
        bctx.clearRect(0, 0, r.w, r.h);
        bctx.drawImage(image, 0, 0, r.w, r.h);
    }

    /** A Blob of image bytes, decoded to something drawImage takes. */
    function decode(blob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
            img.src = url;
        });
    }

    async function adopt(blob, name) {
        let img;
        try { img = await decode(blob); } catch {
            toast(`${name} is not an image`);
            return false;
        }
        image = img; label = name; imageId++;
        // Opening a picture and seeing nothing is the worst answer there is.
        if (mode === 'off') { mode = 'underlay'; persist(); }
        update();
        return true;
    }

    function clear() {
        image = null; label = '';
        if (castSel) castSel.value = '';
        update();
    }

    // ── cast, desktop only ──────────────────────────────────

    let scanned = false;

    async function scanCast() {
        scanned = true;
        const roots = SF.targetsUI ? SF.targetsUI.targets().map(t => t.root) : [];
        const candidates = R.castCandidates({ override: castRoot, roots });
        const found = await R.findCast(candidates, (p) => fs().readDir(p));
        castSel.replaceChildren();
        const none = document.createElement('option');
        none.value = '';
        none.textContent = found.root ? 'choose a cast sprite…' : 'no cast found';
        castSel.append(none);
        for (const c of found.characters) {
            const group = document.createElement('optgroup');
            group.label = c.id;
            for (const s of c.sprites) {
                const o = document.createElement('option');
                o.value = s.path;
                o.textContent = R.spriteLabel(c.id, s.name);
                group.append(o);
            }
            castSel.append(group);
        }
        castSel.disabled = !found.root;
        const count = found.characters.reduce((n, c) => n + c.sprites.length, 0);
        // Every path it tried, when it found nothing: a silent "no cast" reads
        // exactly like a machine that has none.
        castHint.textContent = found.root
            ? `${count} sprites, ${found.characters.length} characters, from ${found.root}`
            : found.tried.length
                ? `no cast at ${found.tried.join(' or ')}`
                : 'no cast to look beside: add a TARGET, or choose the cast FOLDER';
        return found;
    }

    async function openCastSprite(path) {
        if (!path) return false;
        const opt = castSel.selectedOptions && castSel.selectedOptions[0];
        let bytes;
        try { bytes = await fs().readBytes(path); } catch (e) {
            console.error(`reference: could not read ${path}`, e);
            toast(`could not read ${path}`);
            return false;
        }
        return adopt(new Blob([bytes], { type: 'image/png' }), opt ? opt.textContent : path);
    }

    async function chooseCastFolder() {
        const root = await fs().pickFolder('Choose the cast checkout (libs/cast)');
        if (!root) return;
        castRoot = root;
        persist();
        await scanCast();
    }

    // ── wiring ──────────────────────────────────────────────

    openBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (file) adopt(file, file.name);
        // Cleared so picking the same file again still fires `change`.
        fileInput.value = '';
    });
    clearBtn.addEventListener('click', clear);
    modeBox.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ref-mode]');
        if (b) setMode(b.dataset.refMode);
    });
    opacityIn.addEventListener('input', () => {
        opacity = R.clampOpacity(opacityIn.value);
        persist();
        update();
    });

    castBox.hidden = !can('cast');
    if (can('cast')) {
        castSel.addEventListener('change', () => openCastSprite(castSel.value));
        castFolder.addEventListener('click', chooseCastFolder);
        castRescan.addEventListener('click', scanCast);
        // Looked for when the section is first opened rather than at launch:
        // the TARGETS list it guesses from is read from disk at launch too,
        // and the section opening is the moment somebody wants the answer.
        if (panel) panel.addEventListener('toggle', () => { if (panel.open && !scanned) scanCast(); });
    }

    update();

    SF.referenceUI = {
        paint,
        // For tests and the menu: drive the same paths the buttons do.
        adopt, clear, setMode, scanCast, openCastSprite,
        mode: () => mode,
        opacity: () => opacity,
        hasImage: () => !!image,
    };
}());
