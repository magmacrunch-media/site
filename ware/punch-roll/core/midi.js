// core/midi.js: MIDI messages as the app reads them. Pure: the bytes come in
// from ui/midi.js, whatever is delivering them, and this says what they mean.
//
// Only what playing a keyboard needs: notes on and off, on any channel, and
// the two controller messages that mean "stop every note". A note on at
// velocity 0 is a note off, as the MIDI spec has it; keyboards send that
// more often than a real note off.

(function () {
    'use strict';

    const App = (window.PunchRoll = window.PunchRoll || {});

    const NOTE_OFF = 0x80;
    const NOTE_ON = 0x90;
    const CONTROL = 0xb0;
    // Controllers 120 (all sound off) and 123 (all notes off).
    const ALL_OFF = new Set([120, 123]);

    /**
     * One message's meaning: { kind: 'on', note, velocity (0 to 1), channel },
     * { kind: 'off', note, channel }, { kind: 'allOff', channel }, or null for
     * anything else (clock, pitch bend, sysex, a short message).
     */
    function parse(data) {
        if (!data || data.length < 3) return null;
        const type = data[0] & 0xf0;
        const channel = data[0] & 0x0f;
        const a = data[1] & 0x7f;
        const b = data[2] & 0x7f;
        if (type === NOTE_ON && b > 0) return { kind: 'on', note: a, velocity: b / 127, channel };
        if (type === NOTE_OFF || type === NOTE_ON) return { kind: 'off', note: a, channel };
        if (type === CONTROL && ALL_OFF.has(a)) return { kind: 'allOff', channel };
        return null;
    }

    App.midi = { parse };
}());
