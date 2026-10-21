// core/keymap.js: every keyboard shortcut, and the help that describes them.
//
// BINDINGS is the table kit/keys.js resolves; HELP is what the shortcuts
// dialog shows. HELP names actions rather than spelling out keys, and the
// dialog labels each row from the bindings for those actions, so the help
// cannot list a key that does something else. tests/keymap.test.mjs checks
// that every bound action has a row and every row's actions are bound.

(function () {
    'use strict';

    const App = (window.PunchRoll = window.PunchRoll || {});

    const BINDINGS = [
        { key: ' ', action: 'play' },
        { key: '?', action: 'help' },
        { key: '?', shift: true, action: 'help' },
        { key: 'F1', action: 'help' },
        { key: 'z', ctrl: true, action: 'undo' },
        { key: 'z', ctrl: true, shift: true, action: 'redo' },
        { key: 'y', ctrl: true, action: 'redo' },
        { key: 's', ctrl: true, action: 'save' },
        { key: 'o', ctrl: true, action: 'open' },
        { key: 'a', ctrl: true, action: 'selectAll' },
        { key: 'c', ctrl: true, action: 'copy' },
        { key: 'x', ctrl: true, action: 'cut' },
        { key: 'v', ctrl: true, action: 'paste' },
        { key: 'v', ctrl: true, shift: true, action: 'pasteInPlace' },
        { key: 'd', ctrl: true, action: 'duplicate' },
        { key: 'q', action: 'quantize' },
        { key: 'q', shift: true, action: 'quantizeLength' },
        { key: 'Delete', action: 'delete' },
        { key: 'Backspace', action: 'delete' },
        { key: 'Escape', action: 'deselect' },
        { key: 'ArrowRight', shift: true, action: 'lengthen' },
        { key: 'ArrowLeft', shift: true, action: 'shorten' },
        { key: 'ArrowLeft', action: 'left' }, { key: 'ArrowRight', action: 'right' },
        { key: 'ArrowUp', action: 'up' }, { key: 'ArrowDown', action: 'down' },
        { key: 'ArrowUp', shift: true, action: 'octaveUp' },
        { key: 'ArrowDown', shift: true, action: 'octaveDown' },
        { key: 'ArrowUp', ctrl: true, action: 'toTrackAbove' },
        { key: 'ArrowDown', ctrl: true, action: 'toTrackBelow' },
        { key: 't', action: 'theme' },
        { key: 't', shift: true, action: 'themeMode' },
        { key: ']', action: 'nextTheme' },
        { key: '[', action: 'previousTheme' },
        { key: '\\', action: 'peekTheme' },
        // Shift+] comes as '}' on most layouts, and as ']' with Shift on some.
        { key: '}', shift: true, action: 'peekNextTheme' },
        { key: ']', shift: true, action: 'peekNextTheme' },
        { key: '-', action: 'flatter' },
        { key: '=', action: 'sharper' },
        { key: '0', action: 'inTune' },
        { key: 'l', action: 'lane' },
        { key: 'l', shift: true, action: 'loopSelection' },
        { key: 'r', action: 'stepEntry' },
        { key: 'm', action: 'mute' },
        { key: 's', action: 'solo' },
        { key: '1', action: 'track0' }, { key: '2', action: 'track1' },
        { key: '3', action: 'track2' }, { key: '4', action: 'track3' },
    ];

    // Step entry: the computer keyboard as two octaves of piano, by where
    // the keys sit (event.code), not what they type, so it is the same shape
    // on any layout. The bottom row from Z is the lower octave, with the row
    // above it as the black keys; the top row from Q is the octave above,
    // with the number row as its black keys. Each is the semitones above the
    // octave's C. While step entry is on these are notes, not shortcuts.
    const STEP_KEYS = {
        KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7,
        KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11, Comma: 12, KeyL: 13, Period: 14,
        Semicolon: 15, Slash: 16,
        KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17, Digit5: 18,
        KeyT: 19, Digit6: 20, KeyY: 21, Digit7: 22, KeyU: 23, KeyI: 24, Digit9: 25,
        KeyO: 26, Digit0: 27, KeyP: 28,
    };

    /** Semitones above the octave's C for a step entry key event, or null. */
    function stepSemitone(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null;
        const s = STEP_KEYS[e.code];
        return s === undefined ? null : s;
    }

    // The theme menu's own keys, which it reads while its list is open (and
    // the arrows to open it). They are not song shortcuts: the menu keeps
    // every key to itself while open, so these never reach BINDINGS.
    const PICKER = [
        { key: 'ArrowUp', action: 'previous' },
        { key: 'ArrowDown', action: 'next' },
        { key: 'Home', action: 'first' },
        { key: 'End', action: 'last' },
        { key: 'Enter', action: 'keep' },
        { key: ' ', action: 'keep' },
        { key: 'Escape', action: 'cancel' },
    ];

    /** The theme menu's action for a key event, or null. */
    function pickerAction(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return null;
        const b = PICKER.find((p) => p.key === e.key);
        return b ? b.action : null;
    }

    // A row lists the actions it covers, labelled from their bindings in
    // order and joined with " / ". `keys` overrides the label where a joined
    // one would read badly; the actions still count for the coverage test.
    // Mouse rows have only `keys`: there is no binding behind them. Rows of
    // the theme menu name PICKER actions in `picker` instead. In their
    // text, {ctrl} and {alt} become the Mac's Cmd and Option there.
    const HELP = [
        {
            title: 'Song',
            rows: [
                { actions: ['play'], does: 'Play / stop' },
                { actions: ['undo'], does: 'Undo (selection changes too)' },
                { actions: ['redo'], does: 'Redo' },
                { actions: ['save'], does: 'Save' },
                { actions: ['open'], does: 'Open' },
                { actions: ['loopSelection'], does: 'Loop the bars the selection is in; with nothing selected, clear the loop' },
                { actions: ['help'], does: 'This list' },
            ],
        },
        {
            title: 'Tracks',
            rows: [
                { actions: ['track0', 'track1', 'track2', 'track3'], does: 'Switch track' },
                { actions: ['mute'], does: 'Mute the current track' },
                { actions: ['solo'], does: 'Solo the current track' },
                { actions: ['toTrackAbove', 'toTrackBelow'], does: 'Move the selection to the track above / below' },
            ],
        },
        {
            title: 'Selection',
            rows: [
                { actions: ['selectAll'], does: 'Select every note on the track' },
                { actions: ['deselect'], does: 'Clear the selection' },
                { actions: ['delete'], does: 'Delete the selection' },
                { actions: ['copy', 'cut'], does: 'Copy / cut' },
                { actions: ['paste'], does: 'Paste at the start marker; again to repeat after it' },
                { actions: ['pasteInPlace'], does: 'Paste in place, at the time it was copied from' },
                { actions: ['duplicate'], does: 'Duplicate straight after itself' },
            ],
        },
        {
            title: 'Editing the selection',
            rows: [
                { actions: ['left', 'right'], does: 'Move a grid step earlier / later' },
                { actions: ['up', 'down'], does: 'Move up / down a step: a semitone, or a quarter tone in 24-EDO' },
                { actions: ['octaveUp', 'octaveDown'], does: 'Move up / down an octave' },
                { actions: ['lengthen', 'shorten'], does: 'Lengthen / shorten by a grid step' },
                { actions: ['quantize'], does: 'Quantize starts to the grid' },
                { actions: ['quantizeLength'], does: 'Quantize lengths to the grid' },
                { actions: ['flatter', 'sharper'], does: 'Detune 10 cents flatter / sharper (a quarter tone is 50)' },
                { actions: ['inTune'], does: 'Back in tune' },
            ],
        },
        {
            title: 'Mouse',
            rows: [
                { keys: 'Click', does: 'Add a note, or select one' },
                { keys: 'Drag', does: 'Move notes; drag a right edge to stretch' },
                { keys: 'Drag onto a track', does: 'Move notes to that track in the panel' },
                { keys: '{ctrl}-drag / {alt}-drag', does: 'Copy notes, here or onto a track' },
                { keys: '{ctrl}+Shift-drag / Shift+{alt}-drag', does: 'Copy without snapping: move in single ticks' },
                { keys: 'Right-click / {alt}-click', does: 'Delete; right-drag, or {alt}-drag from empty grid, deletes several' },
                { keys: 'Shift-drag empty grid', does: 'Select with a box' },
                { keys: 'Shift-drag a note', does: 'Move without snapping: a tick at a time' },
                { keys: 'Shift-drag an edge', does: 'Stretch without snapping' },
                { keys: 'Shift-click', does: 'Add to or take from the selection' },
                { keys: 'VEL lane', does: 'Click or drag to set velocity' },
                { keys: 'CENTS lane', does: 'Click or drag to detune, in steps of 5 cents (Shift: single cents)' },
                { actions: ['lane'], keys: 'L / click the lane\'s label', does: 'Switch the lane between velocity and cents' },
                { keys: 'Ruler', does: 'Set where Play starts' },
                { keys: 'Drag the ruler', does: 'Set a loop region, which Play goes round while Loop is on; drag its ends to change it' },
                { keys: 'Right-click / {alt}-click the loop', does: 'Clear the loop region' },
                { keys: 'ENV on a track', does: 'Show its envelope: attack, decay, sustain and release' },
            ],
        },
        {
            title: 'Tempo',
            rows: [
                { keys: 'Double-click the ruler', does: 'Add a tempo change at that grid line' },
                { keys: 'Double-click a marker', does: 'Set its tempo, or delete it' },
                { keys: 'Drag a marker', does: 'Move it along the grid' },
                { keys: '{ctrl}-drag / {alt}-drag a marker', does: 'Copy it' },
                { keys: 'Shift-drag a marker', does: 'Move it a tick at a time, not snapping (with {ctrl} or {alt}: copy it so)' },
                { keys: 'Right-click / {alt}-click a marker', does: 'Delete it' },
            ],
        },
        {
            title: 'Step entry',
            rows: [
                { actions: ['stepEntry'], does: 'Start step entry: type notes at the start marker (Esc stops)' },
                { keys: 'Z to M, Q to U', does: 'Enter a note, a grid step long, and move on a step; hold several for a chord' },
                { keys: 'S D G H J, 2 3 5 6 7', does: 'The black keys, in the row above each' },
                { keys: 'Right / Left', does: 'Move on a step, leaving a rest / back a step' },
                { keys: 'Shift+Right / Shift+Left', does: 'Hold the notes just entered a step longer / shorter' },
                { keys: 'Up / Down', does: 'Up / down an octave' },
                { keys: 'Backspace', does: 'Back a step, deleting the notes there' },
                { keys: 'Esc', does: 'Stop step entry' },
                { keys: 'A MIDI keyboard', does: 'Enters notes as these keys do, at its velocity; with step entry off, it plays the track' },
            ],
        },
        {
            title: 'Theme menu',
            rows: [
                { actions: ['theme'], does: 'Open the menu, from anywhere' },
                { actions: ['themeMode'], does: 'Switch Dark, Light, Auto (the button beside it)' },
                { actions: ['nextTheme', 'previousTheme'], does: 'Switch to the next / previous theme in the menu' },
                { actions: ['peekTheme'], keys: 'Hold \\', does: 'Preview the theme you had before; Enter while holding switches back to it' },
                { actions: ['peekNextTheme'], keys: 'Hold Shift+]', does: 'Preview the next theme in the menu; Enter while holding keeps it' },
                { keys: 'Click / Up / Down', does: 'Open the menu from its button' },
                { keys: 'Hover a theme', does: 'Preview it across the app; click to keep it' },
                { picker: ['previous', 'next'], does: 'Preview the theme above / below' },
                { picker: ['first', 'last'], does: 'Preview the first / last' },
                { keys: 'A letter', does: 'Preview the next theme whose name starts with it' },
                { picker: ['keep'], does: 'Keep the previewed theme' },
                { picker: ['cancel'], does: 'Close, putting the chosen theme back; so do Tab and a click away' },
            ],
        },
    ];

    // Words, not arrow or ⌘ glyphs: the app's pixel font has none of them,
    // and a fallback glyph comes out the wrong size.
    const NAMES = {
        ' ': 'Space', Escape: 'Esc', Delete: 'Del', Backspace: 'Backspace',
        ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down',
    };

    /** A binding as people write it: "Ctrl+Shift+V", or "Cmd+Shift+V" on a Mac. */
    function label(b, mac) {
        const key = NAMES[b.key] || (b.key.length === 1 ? b.key.toUpperCase() : b.key);
        // "?" already means Shift on most layouts; saying so again is noise.
        const shift = b.shift && b.key !== '?';
        return [b.ctrl && (mac ? 'Cmd' : 'Ctrl'), shift && 'Shift', key].filter(Boolean).join('+');
    }

    /** {ctrl} and {alt} in help text, as this platform's keyboard says them. */
    function modifiers(text, mac) {
        return text.replace(/\{ctrl\}/g, mac ? 'Cmd' : 'Ctrl').replace(/\{alt\}/g, mac ? 'Option' : 'Alt');
    }

    /** The key text for a help row: its override, or its bindings joined. */
    function rowKeys(row, mac) {
        if (row.keys) return modifiers(row.keys, mac);
        const seen = [];
        const table = row.picker ? PICKER : BINDINGS;
        for (const a of row.picker || row.actions) {
            for (const b of table) {
                if (b.action !== a) continue;
                const l = label(b, mac);
                if (!seen.includes(l)) seen.push(l);
            }
        }
        return seen.join(' / ');
    }

    /** What a help row does, in this platform's words. */
    function rowDoes(row, mac) {
        return modifiers(row.does, mac);
    }

    App.keymap = { BINDINGS, PICKER, HELP, STEP_KEYS, label, rowKeys, rowDoes, pickerAction, stepSemitone };
}());
