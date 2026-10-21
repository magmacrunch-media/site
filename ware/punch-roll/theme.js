// ui/theme.js: the page's colours, resolved, for the canvas.
//
// Colours come from magma-themes through CSS custom properties (style.css).
// A canvas cannot use var(), so the roll asks here instead; magma-kit's
// themes.js does the resolving, and this names it where ui/ looks for it.

(function () {
    'use strict';

    const App = (window.PunchRoll = window.PunchRoll || {});
    const T = window.MagmaKit.themes;

    App.theme = { color: T.color, mix: T.mix, luminance: T.luminance };
}());
