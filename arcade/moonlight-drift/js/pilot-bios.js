// Pilot bios - web and iOS only, shown in the picker under the grid.
//
// Most pilots are named for something on the magmacrunch roster: a song, a
// recording or the artist themselves. `from` credits it, and every credit
// here was checked against the website's archive (archive/by-artist/*/
// recordings.html, releases.html, about.html and by-label/magmacrunch-music/)
// on 2026-10-18. `original: true` marks the game's own pilots, which are
// not named for anything on the roster (so far, as of 2026-10-18: Synth Cat,
// Tardigrade and Elektra); they are credited as Moonlight Drift originals.
//
// `line` is one short sentence about the CHARACTER, not the act it is named
// for: the credit underneath already says who that is, so the line can be a
// little cryptic. Vinny Bobarino is a band and is also a high school tennis
// player. Lines draw on the description at the top of each characters/*.js
// file. A pilot with `line: null` is waiting for somebody who knows the story.
//
// DRAFTS: every line below is a first draft for the label to rewrite.

const PILOT_BIOS = {
    'cat-synth': {
        line: 'the first pilot in the cave, still at the keys',
        from: { original: true },
    },
    'beava': {
        line: 'a beaver with a dart gun, exactly as the title warns',
        from: { title: 'Anabolic Steroids and a Beaver Tranquilizer', artist: 'Fruity Loops Debauchery Bros.' },
    },
    'vinny-bobarino': {
        line: 'high school tennis, second singles; the racket is mostly for show',
        from: { title: null, artist: 'Vinny Bobarino' },
    },
    'darius-hodgekins': {
        line: 'collar pressed, hair neat, true class even underground',
        from: { title: 'Darius Hodgekins', artist: 'Juanito Thompson' },
    },
    'f-joel-young-king': {
        line: 'a robot of sixteen colours, waiting on a crown',
        from: { title: 'F. Joel Young King', artist: "Texas Hold'Em Lava Dome" },
    },
    'juanito-thompson': {
        line: 'a mind on its own satellite, looking down',
        from: { title: 'Mind Satellite', artist: 'Juanito Thompson' },
    },
    'carl-spatski': {
        line: null,
        from: { title: 'Carl Spatski', artist: 'Fruity Loops Debauchery Bros.' },
    },
    'dspum-balloon': {
        line: 'a red balloon with three aboard, drifting slow',
        from: { title: 'balloon', artist: 'Dino Spumoni' },
    },
    'foresters-soul': {
        line: 'a soul lost in the cold, still humming',
        from: { title: "Forester's Soul", artist: 'C.P. Rutledge' },
    },
    'grocery-harrison': {
        line: 'one guitar, one grocery bag, no receipt',
        from: { title: 'Grocery Harrison', artist: 'Bottle Boys Collective' },
    },
    'didgeridoo-man': {
        line: 'nobody knows where he came from; everybody hears him',
        from: { title: 'Didgeridoo Man', artist: 'C.P. Rutledge' },
    },
    'mountain-gnome': {
        line: 'on the long journey to the source of thought',
        from: { title: 'Journey of the Mountain Gnome', artist: 'C.P. Rutledge' },
    },
    'prince-vince': {
        line: 'he could be convinced',
        from: { title: 'Prince Vince', artist: 'C.P. Rutledge' },
    },
    'dag-henderson': {
        line: 'calls in from across the ocean, and from the mirror',
        from: { title: "Juanito Thompson's Transatlantic Colleague", artist: 'Dag Henderson' },
    },
    'fire-toad': {
        line: 'fire-bellied, like all these toads',
        from: { title: 'These Toads', artist: 'C.P. Rutledge' },
    },
    'backpack-man': {
        line: 'all the pretty things are in the backpack',
        from: { title: 'The Backpack Man', artist: 'Bottle Boys Collective' },
    },
    'tollbooth-lady': {
        line: 'she was very nice, she was very nice to me',
        from: { title: 'Tollbooth Lady', artist: 'C.P. Rutledge' },
    },
    'svfp-van': {
        line: 'a beat-up panel van; nobody asks about the floor plan',
        from: { title: null, artist: 'Sex Van Floor Plan' },
    },
    'tardigrade': {
        line: 'survives boiling, freezing and the vacuum of space; this cave too',
        from: { original: true },
    },
    'elektra': {
        line: 'cool poetry, round sunglasses, beatnik to the bone',
        from: { original: true },
    },
};

// The credit as it is shown: "♪ title · artist", the artist alone, or the
// line for the game's own pilots.
function pilotCredit(id) {
    const bio = PILOT_BIOS[id];
    if (!bio || !bio.from) return '';
    if (bio.from.original) return 'a moonlight drift original';
    return bio.from.title ? `♪ ${bio.from.title} · ${bio.from.artist}` : bio.from.artist;
}

function pilotLine(id) {
    const bio = PILOT_BIOS[id];
    return (bio && bio.line) || '';
}
