// ui/theme.js -- the EDITOR's colour theme, from magma-themes.
//
// NOT THE SPRITE'S. SPRITE//FORGE already has "themes": the swatch sets in
// THEME & REPLACE, which recolour the sprite and are stored under
// 'spriteforge.themes'. This is the other kind, the colours of the panels,
// header and buttons round the canvas, so it is called the EDITOR theme
// everywhere it shows, and keeps its own prefs key so neither can overwrite
// the other. Nothing here can reach a pixel of the sprite: the canvases draw
// the frames' own colours, and no canvas code reads a CSS token.
//
// THE DEFAULT IS SPRITE//FORGE'S OWN LOOK, as a theme in the list. magma-
// themes has no rule for the slug 'sprite-forge', and style.css maps theme
// colours onto this app's tokens only under
// :root:not([data-magma-theme="sprite-forge"]), so on the default nothing is
// mapped and the page is exactly the :root block it always was.
//
// Runs when it loads, ahead of editor.js, so a remembered theme is on the
// page before the first paint. The engine and listbox are magma-kit's.

(function () {
    'use strict';

    const App = (window.SpriteForge = window.SpriteForge || {});

    const SLUG = 'sprite-forge';

    /* The picker's preview chips for the default. The page reads style.css's
       :root, not this, so a drift here shows a wrong swatch and nothing else. */
    const OWN = [SLUG, 'SPRITE//FORGE', 'dark', {
        bg: '#080808', surface: '#111118', text: '#f0ead8',
        muted: '#6a6a7a', accent: '#a0a0b0', accent2: '#ff3d6e',
    }];

    let engine = null;

    function catalogue() {
        return [OWN].concat((window.MagmaKit && window.MagmaKit.THEMES) || []);
    }

    function init() {
        const K = window.MagmaKit;
        if (!K || !K.themes || !K.prefs || !K.prefs.create) return null;
        engine = K.themes.create({
            prefs: K.prefs.create('sprite-forge-editor-theme'),
            themes: catalogue(),
        });
        engine.apply();

        const button = document.getElementById('themeBtn');
        const list = document.getElementById('theme-list');
        if (button && list) {
            K.themes.picker(engine, {
                button: button,
                list: list,
                modeButton: document.getElementById('themeModeBtn'),
                status: (msg) => { if (window.Toast && msg) Toast.show(String(msg).toUpperCase()); },
            });
        }
        return engine;
    }

    App.theme = { SLUG: SLUG, OWN: OWN, catalogue: catalogue, init: init, engine: () => engine };

    /* In the page, at once. A suite loads this into a sandbox with no
       MagmaKit.themes, where init() is a no-op, and calls it itself. */
    init();
}());
