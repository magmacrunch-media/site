// ui/theme.js -- the colour theme of the editor, from magma-themes.
//
// THE DEFAULT IS GATE//FOLD'S OWN LOOK, and it is a theme in the list rather
// than the absence of one. magma-themes has no rule for the slug 'gatefold',
// and style.css maps the themes' colours onto this app's tokens only under
// :root:not([data-magma-theme="gatefold"]), so on the default nothing is
// mapped at all: the page is exactly the :root block it always was. Pick
// another theme and its colours take over; pick GATE//FOLD and they let go.
//
// THE ARTWORK IS NEVER THEMED. A theme dresses the editor: panels, header,
// buttons, the area round the canvas. The cover on the canvas is drawn from
// the document's own colours, which are not CSS tokens, so no theme can
// reach a pixel of it, and an export is the same under every theme.
//
// The engine and the listbox are magma-kit's (kit/themes.js); this names the
// app's entry, its prefs key and its elements, and hands the rest over.

(function () {
    'use strict';

    const App = (window.Gatefold = window.Gatefold || {});

    const SLUG = 'gatefold';

    /* The swatch the picker draws for the default. These are the :root
       colours in style.css, for the preview chips only: the page itself reads
       style.css, so a drift here would show a wrong swatch and nothing else. */
    const OWN = [SLUG, 'GATE//FOLD', 'dark', {
        bg: '#080808', surface: '#111118', text: '#f0ead8',
        muted: '#6a6a7a', accent: '#a0a0b0', accent2: '#ff3d6e',
    }];

    let engine = null;

    /** The full list: this app's own look first, then every magma theme. */
    function catalogue() {
        return [OWN].concat((window.MagmaKit && window.MagmaKit.THEMES) || []);
    }

    function init() {
        const K = window.MagmaKit;
        if (!K || !K.themes || !K.prefs) return null;
        engine = K.themes.create({
            prefs: K.prefs.create('gatefold.theme'),
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
                /* Nothing on the canvas reads a theme colour, but the
                   selection chrome sits on it, so repaint to be safe. */
                onPaint: () => { if (App.canvas && App.canvas.schedule) App.canvas.schedule(); },
            });
        }
        return engine;
    }

    App.theme = {
        SLUG: SLUG,
        OWN: OWN,
        catalogue: catalogue,
        init: init,
        engine: () => engine,
    };
}());
