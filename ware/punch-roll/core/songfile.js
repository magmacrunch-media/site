// core/songfile.js: the .punch file around a song.
//
// The song itself is adenosine-synth's shape, and normalizeSong drops any key
// it does not know, so the tag is this app's envelope rather than part of the
// song. FORMAT and VERSION are written first so they are the first thing a
// person opening the file sees. A file with no tag is a song saved before the
// tag existed and opens as before; a file tagged as something else, or as a
// newer version, is refused by name instead of failing somewhere in the synth.

(function () {
    'use strict';

    const App = (window.PunchRoll = window.PunchRoll || {});

    const FORMAT = 'punch-roll';
    const VERSION = 1;

    /** A song as .punch text. */
    function stringify(song) {
        return JSON.stringify({ format: FORMAT, version: VERSION, ...song }, null, 1) + '\n';
    }

    /** .punch text as a raw song object, still to be normalised. Throws with a reason. */
    function parse(text) {
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new TypeError('not a song: expected a JSON object');
        }
        const { format, version, ...song } = data;
        if (format !== undefined && format !== FORMAT) {
            throw new TypeError(`this is a ${JSON.stringify(format)} file, not a PUNCH//ROLL song`);
        }
        if (format !== undefined && !(Number.isInteger(version) && version >= 1)) {
            throw new TypeError('the song file has no valid version');
        }
        if (version > VERSION) {
            throw new TypeError(`the song is format version ${version}; this PUNCH//ROLL reads up to ${VERSION}`);
        }
        return song;
    }

    App.songfile = { FORMAT, VERSION, stringify, parse };
}());
