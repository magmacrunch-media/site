/* ═══════════════════════════════════════════════
   MAGMA//KIT: themes.js

   magma-themes in an app: a theme picked per mode, a picker that previews as
   you move through it, and colours resolved for a canvas. Came out of
   PUNCH//ROLL, the first app to have one, so its behaviour is the reference.

   The themes themselves are app/kit/magma-themes.css (rules on
   [data-magma-theme="slug"] that set --mt-* roles) and
   app/kit/magma-themes-index.js (MagmaKit.THEMES, [slug, name, mode, roles]
   per theme). The app maps the roles onto its own tokens in its stylesheet,
   each with a fallback: `--bg: var(--mt-bg, #080808)`. Nothing here knows an
   app's tokens.

   Three parts, used in this order:

   create(opts)            the state: which theme is chosen for which mode,
                           painted onto <html>, saved in a prefs store.
   picker(engine, opts)    the listbox UI over that state. Optional: an app can
                           drive the engine from a menu instead.
   color / mix / luminance a CSS colour expression resolved to #rrggbb, for a
                           canvas, which cannot read var().

   ── An app need not offer every theme ──
   `include` is a list of slugs, in the order the picker shows them. Themes
   that do not suit an app are simply left out; the list is the app's taste,
   not magma-themes' catalogue. A slug magma-themes no longer has is skipped
   and reported in engine.missing, which an app's own test should assert is
   empty, so a rename upstream fails there rather than quietly shrinking the
   list. With no light theme included, light mode is dark and the picker hides
   its mode button.

   ── Modes ──
   dark, light or auto, which follows prefers-color-scheme live. Dark and
   light each remember their own pick (prefs themeDark, themeLight) and the
   one before it (themeDarkPrev, themeLightPrev), for a held key to preview.
   A saved slug that is not in the list, or is of the other mode, falls back
   to its mode's default: `defaultDark`, else the slug already on <html>, else
   the first dark theme; and the first light theme.

   ── The picker's contract with the page ──
   Elements are passed in, never looked up, so ids and layout are the app's:
     button      a <button>: shows the chosen theme, opens the list, and
                 keeps focus while the list is open
                 (aria-activedescendant points at the active row).
     list        a <ul role="listbox" hidden>; rows are <li role="option">
                 with data-slug, id `theme-<slug>`, class `active` on the row
                 being previewed and aria-selected on the chosen one.
     modeButton  optional; cycles Dark, Light, Auto.
   The button and the list share a parent element: a press outside that
   parent closes the list and is swallowed, so dismissing it never acts on
   the app behind.
   A row is a `.swatch` (its --sw-bg the theme's bg, then three <i> chips,
   classes text, accent and accent2, each with --sw set when the theme has
   that role) and a `.name`. The CSS for all of it is the app's.

   onPaint() runs after every change to what is on the page, previews
   included: the app's hook to re-read colours into a canvas. status(text)
   reports what happened, in the app's own status line.
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    const MagmaKit = (window.MagmaKit = window.MagmaKit || {});

    const MODES = ['dark', 'light', 'auto'];
    const LABEL = { dark: 'Dark', light: 'Light', auto: 'Auto' };

    // The picker's keys while it has focus. Not app shortcuts: the open list
    // keeps every key to itself, so these never reach an app's bindings. An
    // app with a shortcuts dialog can list them from here, or pass its own
    // `action` to picker().
    const PICKER = [
        { key: 'ArrowUp', action: 'previous' },
        { key: 'ArrowDown', action: 'next' },
        { key: 'Home', action: 'first' },
        { key: 'End', action: 'last' },
        { key: 'Enter', action: 'keep' },
        { key: ' ', action: 'keep' },
        { key: 'Escape', action: 'cancel' },
    ];

    /** The picker's action for a key event, or null. */
    function pickerAction(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return null;
        const b = PICKER.find((p) => p.key === e.key);
        return b ? b.action : null;
    }

    // ── the state ──────────────────────────────────────────

    function create(opts) {
        const prefs = opts.prefs;
        const root = opts.root || document.documentElement;
        const all = opts.themes || MagmaKit.THEMES || [];
        const bySlug = new Map(all.map((t) => [t[0], t]));
        const missing = [];
        let themes = all;
        if (opts.include) {
            themes = [];
            for (const slug of opts.include) {
                if (bySlug.has(slug)) themes.push(bySlug.get(slug));
                else missing.push(slug);
            }
        }
        const ofMode = (mode) => themes.filter(([, , m]) => m === mode);
        const has = (mode, slug) => ofMode(mode).some(([s]) => s === slug);
        const firstOf = (mode) => (ofMode(mode)[0] || [])[0];
        const markup = opts.defaultDark || root.dataset.magmaTheme;
        const DEFAULTS = {
            dark: has('dark', markup) ? markup : firstOf('dark'),
            light: firstOf('light'),
        };
        const media = opts.matchMedia !== undefined ? opts.matchMedia : window.matchMedia;
        const systemLight = media ? media.call(window, '(prefers-color-scheme: light)') : null;

        /** Unknown slugs come back as a dark theme named by its slug, with no roles. */
        const entry = (slug) => bySlug.get(slug) || [slug, slug, 'dark', {}];

        function saved() {
            const p = (prefs && prefs.read()) || {};
            // Before modes there was one saved `theme`; it becomes its mode's pick.
            const old = p.theme && bySlug.get(p.theme);
            return {
                mode: MODES.includes(p.themeMode) ? p.themeMode : 'dark',
                dark: p.themeDark || (old && old[2] === 'dark' ? p.theme : null),
                light: p.themeLight || (old && old[2] === 'light' ? p.theme : null),
                darkPrev: p.themeDarkPrev,
                lightPrev: p.themeLightPrev,
            };
        }

        /** dark or light: auto resolved through the system, light only if there are light themes. */
        function effective(mode = saved().mode) {
            const m = mode === 'auto' ? (systemLight && systemLight.matches ? 'light' : 'dark') : mode;
            return m === 'light' && DEFAULTS.light ? 'light' : 'dark';
        }

        /** The saved theme for the mode in force, or that mode's default. */
        function chosen() {
            const s = saved();
            const mode = effective(s.mode);
            return has(mode, s[mode]) ? s[mode] : DEFAULTS[mode];
        }

        /** Put a theme on the page, saved or not: previews use this too. */
        function paint(slug) {
            root.dataset.magmaTheme = slug;
            // The theme's own mode, for anything the app's CSS must darken or
            // lighten on a light theme.
            root.dataset.themeMode = entry(slug)[2];
        }

        /** Paint the chosen theme. */
        function apply() {
            paint(chosen());
            return chosen();
        }

        /** Save a theme as the current mode's pick, remembering the one before. */
        function keep(slug) {
            const mode = effective();
            const was = chosen();
            const patch = { [mode === 'light' ? 'themeLight' : 'themeDark']: slug };
            if (was && was !== slug) patch[mode === 'light' ? 'themeLightPrev' : 'themeDarkPrev'] = was;
            if (prefs) prefs.patch(patch);
        }

        /** The theme this mode had before, if it is still one of its own and not the chosen one. */
        function earlier() {
            const s = saved();
            const mode = effective(s.mode);
            const p = s[mode === 'light' ? 'lightPrev' : 'darkPrev'];
            return has(mode, p) && p !== chosen() ? p : null;
        }

        /** The theme `step` along this mode's list from the chosen one, wrapping. */
        function along(step) {
            const list = ofMode(effective());
            if (!list.length) return null;
            const i = list.findIndex(([s]) => s === chosen());
            return list[(i + step + list.length) % list.length][0];
        }

        /** Dark, then light, then auto; skipping light and auto with no light theme. */
        function nextMode() {
            const m = DEFAULTS.light ? MODES[(MODES.indexOf(saved().mode) + 1) % MODES.length] : 'dark';
            if (prefs) prefs.patch({ themeMode: m });
            return m;
        }

        return {
            themes, missing, entry, systemLight,
            hasLight: !!DEFAULTS.light,
            defaults: DEFAULTS,
            list: (mode = effective()) => ofMode(mode),
            mode: () => saved().mode,
            effective, chosen, paint, apply, keep, earlier, along, nextMode,
        };
    }

    // ── the picker ─────────────────────────────────────────
    //
    // A list of the current mode's themes, each with swatches of its colours.
    // Hovering or arrowing through the open list previews a theme across the
    // whole app; a click or Enter keeps it, and closing any other way puts
    // the chosen one back. Focus stays on the button throughout, so the keys
    // go to one place.

    function picker(engine, opts) {
        const pick = opts.button;
        const list = opts.list;
        const btn = opts.modeButton || null;
        const status = opts.status || (() => {});
        const onPaint = opts.onPaint || (() => {});
        const actionOf = opts.action || pickerAction;
        const doc = pick.ownerDocument;
        const win = doc.defaultView || window;
        const name = (slug) => engine.entry(slug)[1];
        let active = -1;

        function swatch(roles = {}) {
            const s = doc.createElement('span');
            s.className = 'swatch';
            if (roles.bg) s.style.setProperty('--sw-bg', roles.bg);
            // Three chips always, so the names line up: one with no colour
            // shows the background through it.
            for (const r of ['text', 'accent', 'accent2']) {
                const chip = doc.createElement('i');
                chip.className = r;
                if (roles[r]) chip.style.setProperty('--sw', roles[r]);
                s.append(chip);
            }
            return s;
        }

        const named = (text) => Object.assign(doc.createElement('span'), { className: 'name', textContent: text });

        function fill() {
            const mode = engine.mode();
            const now = engine.effective(mode);
            const chosen = engine.chosen();
            list.textContent = '';
            for (const [slug, title, , roles] of engine.list(now)) {
                const li = doc.createElement('li');
                li.id = `theme-${slug}`;
                li.setAttribute('role', 'option');
                li.setAttribute('aria-selected', String(slug === chosen));
                li.dataset.slug = slug;
                li.append(swatch(roles), named(title));
                list.append(li);
            }
            const [, title, , roles] = engine.entry(chosen);
            pick.replaceChildren(swatch(roles), named(title));
            pick.dataset.value = chosen;
            if (btn) {
                btn.hidden = !engine.hasLight;
                btn.textContent = LABEL[mode];
                btn.title = mode === 'auto'
                    ? `Themes follow the system: ${now} now. Click for dark.`
                    : `${LABEL[mode]} themes. Click for ${mode === 'dark' ? 'light' : 'auto'}.`;
            }
        }

        function refresh(message) {
            engine.apply();
            onPaint();
            fill();
            if (message) status(message);
        }

        function show(slug) {
            if (doc.documentElement.dataset.magmaTheme === slug) return;
            engine.paint(slug);
            onPaint();
        }

        const isOpen = () => !list.hidden;
        const rows = () => [...list.children];
        const indexOf = (slug) => rows().findIndex((li) => li.dataset.slug === slug);

        /** Make row i the active one, and preview it unless told not to. */
        function setActive(i, preview = true) {
            const all = rows();
            if (!all.length) return;
            active = Math.max(0, Math.min(all.length - 1, i));
            all.forEach((li, k) => li.classList.toggle('active', k === active));
            pick.setAttribute('aria-activedescendant', all[active].id);
            all[active].scrollIntoView({ block: 'nearest' });
            show(preview ? all[active].dataset.slug : pick.dataset.value);
        }

        function open() {
            if (isOpen()) return;
            list.hidden = false;
            pick.setAttribute('aria-expanded', 'true');
            setActive(indexOf(pick.dataset.value), false);
        }

        function keep(slug) {
            engine.keep(slug);
            refresh(`Theme: ${name(slug)}.`);
        }

        // A held key: a theme shown until that key is let go. The key is
        // known by its code, not its character: let go of Shift first and a
        // held Shift+] comes up as ].
        let peeking = null;
        let peekCode = null;

        function peekStart(slug, code, what) {
            if (peeking) return;
            close(false);
            peeking = slug;
            peekCode = code;
            show(slug);
            status(`${name(slug)}, ${what}: let go to return, or Enter to keep it.`);
        }

        /** Hold a key: the theme this mode had before. */
        function peekBefore(code) {
            if (peeking) return;
            const slug = engine.earlier();
            if (slug) peekStart(slug, code, 'your theme before');
            else status('No earlier theme to go back to yet.');
        }

        /** Hold a key: the theme cycleTheme(1) would switch to. */
        function peekNext(code) {
            const slug = engine.along(1);
            if (slug && slug !== pick.dataset.value) peekStart(slug, code, 'the next theme');
        }

        function peekEnd() {
            if (!peeking) return;
            peeking = null;
            peekCode = null;
            show(pick.dataset.value);
            status(`Theme: ${name(pick.dataset.value)}.`);
        }

        /** Enter while peeking: keep the previewed theme. False if not peeking. */
        function peekKeep() {
            if (!peeking) return false;
            const slug = peeking;
            peeking = null;
            keep(slug);
            return true;
        }

        doc.addEventListener('keyup', (e) => {
            if (peeking && e.code === peekCode) peekEnd();
        });
        win.addEventListener('blur', peekEnd);

        /** Close, keeping the active theme or putting the chosen one back. */
        function close(keepActive) {
            if (!isOpen()) return;
            const slug = keepActive && active >= 0 ? rows()[active].dataset.slug : null;
            list.hidden = true;
            pick.setAttribute('aria-expanded', 'false');
            pick.removeAttribute('aria-activedescendant');
            active = -1;
            if (slug) keep(slug);
            else show(pick.dataset.value);
        }

        /** The next or previous theme of this mode, kept at once, wrapping. */
        function cycleTheme(step) {
            close(false);
            peekEnd();
            const slug = engine.along(step);
            if (slug) keep(slug);
        }

        /** The next row after the active one whose name starts with `ch`. */
        function typeAhead(ch) {
            const all = rows();
            for (let k = 1; k <= all.length; k++) {
                const i = (active + k) % all.length;
                if (all[i].textContent.trim().toLowerCase().startsWith(ch)) return setActive(i);
            }
        }

        pick.addEventListener('click', () => (isOpen() ? close(false) : open()));
        pick.addEventListener('blur', () => close(false));
        pick.addEventListener('keydown', (e) => {
            const act = actionOf(e);
            // Enter while a key is held keeps the theme it shows, here as anywhere.
            if (act === 'keep' && e.key === 'Enter' && peekKeep()) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (!isOpen()) {
                // Space and Enter open it through the button's own click; the
                // app's keys must not hear them, nor the arrows.
                if (act === 'previous' || act === 'next') { e.preventDefault(); open(); }
                if (act === 'previous' || act === 'next' || act === 'keep') e.stopPropagation();
                return;
            }
            // While open, every key is the list's.
            e.stopPropagation();
            if (e.key === 'Tab') { close(false); return; }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            e.preventDefault();
            if (act === 'next') setActive(active + 1);
            else if (act === 'previous') setActive(active - 1);
            else if (act === 'first') setActive(0);
            else if (act === 'last') setActive(rows().length - 1);
            else if (act === 'keep') close(true);
            else if (act === 'cancel') close(false);
            else if (e.key.length === 1) typeAhead(e.key.toLowerCase());
        });

        // Pressing a row must not take focus from the button, or its blur
        // would close the list before the click lands.
        list.addEventListener('pointerdown', (e) => e.preventDefault());
        list.addEventListener('pointermove', (e) => {
            const li = e.target.closest('li');
            if (li && rows().indexOf(li) !== active) setActive(rows().indexOf(li));
        });
        // Off the list, the page goes back to the chosen theme.
        list.addEventListener('pointerleave', () => {
            if (isOpen()) setActive(indexOf(pick.dataset.value), false);
        });
        list.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            active = rows().indexOf(li);
            close(true);
        });
        // A press anywhere else closes it, and does nothing more: a click on
        // the app to dismiss the list should not also act there.
        const container = pick.parentElement;
        doc.addEventListener('pointerdown', (e) => {
            if (!isOpen() || (container && container.contains(e.target))) return;
            close(false);
            e.preventDefault();
            e.stopPropagation();
        }, true);

        function cycleMode() {
            close(false);
            peekEnd();
            const next = engine.nextMode();
            refresh(next === 'auto'
                ? `Themes follow the system: ${engine.effective('auto')} now.`
                : `${LABEL[next]} themes.`);
        }
        if (btn) btn.addEventListener('click', cycleMode);
        // In auto, a change to the system's setting switches at once.
        if (engine.systemLight && engine.systemLight.addEventListener) {
            engine.systemLight.addEventListener('change', () => {
                if (engine.mode() !== 'auto') return;
                close(false);
                refresh();
            });
        }
        fill();

        return {
            /** Open the list from anywhere: it takes focus, as a click on it would. */
            open() {
                pick.focus();
                open();
            },
            close: () => close(false),
            cycleMode,
            cycleTheme,
            peekBefore,
            peekNext,
            peekKeep,
            peeking: () => !!peeking,
            /** Re-read the engine into the button and list, after a change made elsewhere. */
            refresh: () => refresh(),
        };
    }

    // ── colours for a canvas ───────────────────────────────
    //
    // A canvas cannot use var(). Reading a custom property gives back its
    // text, which may be a var() or color-mix(); a hidden probe's computed
    // colour is the resolved value, so that is what is read.

    let probe = null;

    /** Any CSS colour expression as [r, g, b], 0..255. */
    function rgb(expr) {
        if (!probe || !probe.isConnected) {
            probe = document.createElement('span');
            probe.hidden = true;
            document.body.append(probe);
        }
        probe.style.color = '';
        probe.style.color = expr;
        const s = window.getComputedStyle(probe).color;
        const n = (s.match(/[\d.]+/g) || ['0', '0', '0']).slice(0, 3).map(Number);
        // color-mix() computes to color(srgb r g b), in 0..1, not rgb().
        return s.startsWith('color(') ? n.map((v) => v * 255) : n;
    }

    const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

    /** A CSS colour expression, such as 'var(--bg)', as #rrggbb. */
    function color(expr) {
        return hex(rgb(expr));
    }

    /** `t` of the way from colour `a` to colour `b`, as #rrggbb. */
    function mix(a, b, t) {
        const x = rgb(a);
        const y = rgb(b);
        return hex(x.map((v, i) => v + (y[i] - v) * t));
    }

    /** Relative luminance (WCAG), 0 for black to 1 for white. */
    function luminance(expr) {
        const [r, g, b] = rgb(expr).map((v) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    MagmaKit.themes = { create, picker, PICKER, pickerAction, LABEL, color, mix, luminance };
}());
