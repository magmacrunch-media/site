// ui/shapes-popup.js — the shape / wave / clip art picker, and the tool grid.
//
// The popup is position:fixed so it can escape the 240px panel's clipping,
// which means it has to place itself and flip when it would run off the
// screen. That is the only interesting thing in here.
//
// The clip art grid is built from core/clipart.js, which is data now, so this
// file needs no icon knowledge at all — it asks for the ids and the labels.

(function () {
    'use strict';

    const App = (window.Gatefold = window.Gatefold || {});

    const $ = (id) => document.getElementById(id);
    const GAP = 6;
    const EDGE = 10;

    /* Labels the tool name does not give: 'squarewave' would read as
       SQUAREWAVE on a 240px button. Matches the popup's own markup. */
    const LABELS = {
        squarewave: 'SQUARE',
        trianglewave: 'TRI WAVE',
        roundrect: 'R. RECT',
        sawtooth: 'SAWTOOTH',
        clipart: 'CLIP ART',
        triangle: 'TRI',
        pentagon: 'PENTA',
        hexagon: 'HEXA',
    };

    const SHAPE_TOOLS = App.element.SHAPE_TYPES.concat(App.element.WAVE_TYPES, ['clipart']);

    let popup = null;
    let button = null;

    function close() { if (popup) popup.classList.remove('open'); }

    /**
     * Place the popup beside the button, flipping to the other side and
     * clamping upward when it would leave the window.
     *
     * The measure has to happen after a frame: the popup's height is unknown
     * until it has been laid out with .open on it.
     */
    function place() {
        const r = button.getBoundingClientRect();
        let top = r.top;
        let left = r.right + GAP;
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';

        requestAnimationFrame(function () {
            const h = popup.scrollHeight;
            const w = popup.offsetWidth;
            if (top + h > window.innerHeight - EDGE) {
                top = Math.max(EDGE, window.innerHeight - h - EDGE);
            }
            if (left + w > window.innerWidth - EDGE) {
                left = Math.max(EDGE, r.left - w - GAP);
            }
            popup.style.top = top + 'px';
            popup.style.left = left + 'px';
        });
    }

    /** Set the tool. Marking the buttons follows from it, via markTool. */
    function setActiveTool(tool) {
        App.tools.setTool(tool);
    }

    /**
     * Show which tool is on: its button, and the shapes button too when the
     * tool lives behind it. Called from ui/tools.js's onToolChange, so a
     * keyboard shortcut marks the buttons exactly as a click does.
     *
     * The shapes button lights up with the rest. Before, picking RECT lit a
     * button inside a closed popup and left SELECT looking active, so the
     * panel said Select while the canvas drew rectangles.
     */
    function markTool(tool) {
        for (const b of document.querySelectorAll('.tool-btn, .shape-btn')) {
            b.classList.remove('active');
        }
        const btn = tool === 'clipart'
            ? document.querySelector(`[data-tool="clipart"][data-clipart-id="${App.tools.getClipartId()}"]`)
            : document.querySelector(`[data-tool="${tool}"]`);
        if (btn) btn.classList.add('active');

        const shapes = $('shapesBtn');
        const isShape = SHAPE_TOOLS.indexOf(tool) !== -1;
        if (shapes) shapes.classList.toggle('active', isShape);

        if (isShape) {
            const label = $('shapesBtnLabel');
            if (label) {
                label.textContent = tool === 'clipart'
                    ? App.clipart.getIconLabel(App.tools.getClipartId())
                    : (LABELS[tool] || tool.toUpperCase());
            }
        }
    }

    function buildClipartGrid() {
        const grid = $('clipartGrid');
        if (!grid) return;
        const el = window.MagmaKit.dom.el;

        for (const id of App.clipart.getIconIds()) {
            const label = App.clipart.getIconLabel(id);
            const btn = el('button', 'shape-btn');
            btn.type = 'button';
            btn.dataset.tool = 'clipart';
            btn.dataset.clipartId = id;
            btn.title = label;
            btn.appendChild(el('span', 'tool-icon', '★'));
            btn.appendChild(el('span', 'tool-name', label));
            btn.addEventListener('click', function () {
                App.tools.setClipartId(id);
                setActiveTool('clipart');
                close();
            });
            grid.appendChild(btn);
        }
    }

    function init() {
        popup = $('shapesPopup');
        button = $('shapesBtn');
        if (!popup || !button) return;

        button.addEventListener('click', function (e) {
            e.stopPropagation();
            if (popup.classList.toggle('open')) place();
        });

        for (const btn of document.querySelectorAll('.shapes-popup .shape-btn')) {
            btn.addEventListener('click', function () {
                setActiveTool(btn.dataset.tool);
                close();
            });
        }

        for (const btn of document.querySelectorAll('.tool-btn[data-tool]')) {
            btn.addEventListener('click', function () { setActiveTool(btn.dataset.tool); });
        }

        document.addEventListener('click', function (e) {
            if (!popup.contains(e.target) && e.target !== button) close();
        });

        buildClipartGrid();
    }

    App.shapesPopup = {
        init: init,
        close: close,
        setActiveTool: setActiveTool,
        markTool: markTool,
    };
}());
