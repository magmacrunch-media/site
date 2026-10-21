// ui/hint.js -- what an empty canvas says to somebody who has just arrived.
//
// The app opens on the Select tool over a blank cover, and dragging with
// Select on nothing does nothing at all. The drawing tools are one click
// away behind the RECT dropdown, which nothing points at. So a first visit
// read as a canvas that would not draw.
//
// The hint is an HTML overlay on .center-area, NOT something painted on the
// canvas: ui/export.js renders the document, and anything on the canvas is
// one mistake away from being printed on somebody's album cover. It takes no
// pointer events, so a drag that starts on the words still draws.
//
// It goes the moment the document has an element and comes back if they are
// all deleted, and it follows the tool, because "pick a tool" is wrong advice
// to somebody who already has.

(function () {
    'use strict';

    const App = (window.Gatefold = window.Gatefold || {});

    /** The sentence for a tool. Pure, so the suite can read it. */
    function message(tool, label) {
        if (!tool || tool === 'select') {
            return 'PICK A SHAPE OR TEXT, THEN DRAG ON THE CANVAS';
        }
        if (tool === 'text') return 'CLICK WHERE THE TEXT SHOULD GO';
        return (label || tool.toUpperCase()) + ' TOOL: DRAG ON THE CANVAS';
    }

    function update() {
        const box = document.getElementById('canvasHint');
        if (!box) return;
        const doc = App.gatefold && App.gatefold.get();
        const empty = !doc || doc.elements.length === 0;
        box.hidden = !empty;
        if (!empty) return;

        const tool = App.tools ? App.tools.getTool() : 'select';
        const label = document.getElementById('shapesBtnLabel');
        const line = document.getElementById('canvasHintText');
        if (line) {
            line.textContent = message(tool, label && label.textContent.trim());
        }
    }

    App.hint = { message: message, update: update };
}());
