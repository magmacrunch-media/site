/* ── labels-data.js: the label family, shared by every by-label page ── */
/*
 * One place for what the four labels ARE and how they relate, so the index
 * and each label's own page describe them in the same words. The index draws
 * the family tree from this, and templates/label.js reads it for a label's
 * intro and its row of sibling links.
 *
 * What MusicBrainz knows (personnel, releases, works, counts) is NOT here: that
 * comes from the caches in archive/_cache/labels/. The one exception is the
 * arcade's game list, which MusicBrainz does not model, so it is kept by hand
 * in ARCADE_SECTIONS below. ware/games/ is the authoritative list of games;
 * a game added there wants a line here too.
 *
 * Loaded as a plain script before label.js. The SPA in nav.js runs page
 * scripts in order, so this is in place by the time label.js reads it.
 */
(function () {
    var ware = function (slug) { return '<br><a href="../../../ware/' + slug + '/">more \u25b6</a>'; };
    var play = function (path) { return '<br><a href="../../../arcade/' + path + '/">play \u25b6</a>'; };
    var tag = function (t) { return '<span class="tag">' + t + '</span> '; };

    var ARCADE_SECTIONS = [
        {
            title: 'games',
            items: [
                { name: 'Moonlight Drift', dates: 'Feb 2026', description: tag('music-inspired') + 'named after a C.P. Rutledge song' + ware('moonlight-drift') },
                { name: 'George Boole has entered the chat', dates: 'Feb 2026', description: tag('music-inspired') + 'named after a Juanito Thompson song' + ware('george-boole') },
                { name: '2048 (actually, 2^N)', dates: 'Feb 2026', description: tag('classic') + ware('two-to-the-n') },
                { name: 'SORRY!', dates: 'Mar 2026', description: tag('classic') + play('SORRY') },
                { name: 'Klondike Solitaire', dates: 'Mar 2026', description: tag('classic') + ware('solitaire') },
                { name: 'Nelikko (Finnish Tetris)', dates: 'Mar 2026', description: tag('classic') + ware('nelikko') },
                { name: 'Texas Hold\'Em Lava Dome', dates: 'May 2026', description: tag('music-inspired') + 'named after the band Texas Hold\'Em Lava Dome' + ware('texas-holdem-lava-dome') },
                { name: 'Cribbage', dates: 'Jul 2026', description: tag('multiplayer') + 'classic card game, 2 players, online multiplayer' + ware('cribbage') },
                { name: 'Backgammon', dates: 'Jul 2026', description: tag('classic') + 'neon edition, vs AI, doubling cube' + ware('backgammon') },
                { name: 'Checkers', dates: 'Jul 2026', description: tag('classic') + 'neon edition, vs AI, mandatory jumps' + ware('checkers') },
                { name: 'Chess', dates: 'Jul 2026', description: tag('classic') + 'neon edition, vs AI, configurable difficulty' + ware('chess') },
                { name: 'Fifteen Puzzle', dates: 'Jul 2026', description: tag('classic') + 'sliding tile puzzle, arrange 1-15' + ware('fifteen-puzzle') },
                { name: 'Threes', dates: 'Jul 2026', description: tag('classic') + 'number merging puzzle' + ware('threes') },
                { name: 'Klotski', dates: 'Jul 2026', description: tag('classic') + 'sliding block puzzle with multi-cell tiles' + ware('klotski') },
                { name: 'Chinese Checkers', dates: 'Jul 2026', description: tag('multiplayer') + 'hex-grid classic, 2-6 players, online multiplayer' + ware('chinese-checkers') },
                { name: 'Parchisi', dates: 'Jul 2026', description: tag('multiplayer') + 'cross and circle game, 2-4 players, online multiplayer' + ware('parchisi') },
                { name: 'Tarot', dates: 'Jul 2026', description: tag('classic') + 'four-player French Tarot against the computer' + ware('tarot') },
                { name: 'Aggravation', dates: 'Jul 2026', description: tag('private') + 'race your marbles home, 2-6 players, password-protected<br><a href="https://private.magmacrunch.duckdns.org/">private arcade \u25b6</a>' },
                { name: 'Cave Diving (Not Even Once)', dates: 'Sep 2026', description: tag('music-inspired') + 'a one-song dive, as long as the Juanito Thompson song it is named after' + ware('cave-diving') },
                { name: 'Caldera', dates: 'Oct 2026', description: tag('original') + 'a volcanic vertical climber' + ware('caldera') },
            ]
        },
        {
            title: 'in development',
            items: [
                { name: 'Pay2Play', description: tag('music-inspired') + 'named after a Sex van Floor Plan song' + play('pay2play') },
                { name: 'Very Long Boards', description: tag('music-inspired') + 'named after a Carl Spatski song' + ware('very-long-boards') },
                { name: 'Scandinavian Stud', description: tag('classic') + ware('scandinavian-stud') },
                { name: 'Roderick Tron', description: tag('music-inspired') + 'named after a Jimmi (FLDB) song' + ware('roderick-tron') },
                { name: 'The Jovian Humanitarian Conflict', description: tag('original') + 'an on-rails shooter over Jupiter' + ware('jovian-humanitarian-conflict') },
                { name: 'makemecookies!x4', description: tag('original') + 'a cookie factory, one shift per song' + ware('makemecookies') },
                { name: 'Grocery Harrison', description: tag('original') + 'a side-scroller, playable as a browser demo' + ware('grocery-harrison') },
            ]
        }
    ];

    window.__LABEL_FAMILY = {
        labels: [
            {
                slug: 'magmacrunch-media',
                mbid: '39446d03-fe9c-47d0-81a9-2b42d34fb400',
                name: 'magmacrunch media',
                kind: 'record label',
                parent: null,
                blurb: 'the record label, and the top of the family. it puts out the recordings: ' +
                       'reissues and remasters of a back catalogue that goes back years before the label, ' +
                       'music videos, soundtracks and new records.',
            },
            {
                slug: 'magmacrunch-music',
                mbid: 'c78b5612-2300-4ee1-8663-299ddcf9ce25',
                name: 'magmacrunch music',
                kind: 'publisher',
                parent: 'magmacrunch-media',
                blurb: 'the publishing arm. where the label holds recordings, this holds the songs ' +
                       'themselves: the compositions behind them, written from 2006 on.',
            },
            {
                slug: 'magmacrunch-arcade',
                mbid: '1d3190cc-b700-4409-bdb4-2ee8b93f3d8c',
                name: 'magmacrunch arcade',
                kind: 'games imprint',
                parent: 'magmacrunch-media',
                blurb: 'the games imprint. originals, several named after songs in the catalogue, ' +
                       'and classic board, card and puzzle games rebuilt for the browser.',
                sections: ARCADE_SECTIONS,
            },
            {
                slug: 'the-slop-collective',
                mbid: 'ad82d124-e41e-49e8-9bf9-53e836b44336',
                name: 'the slop collective',
                kind: 'creative agency',
                parent: null,
                associated: true,
                blurb: 'a creative agency owned by Sex Van Floor Plan, and not part of the label. ' +
                       'it presents shows, and it shares two releases with magmacrunch media: ' +
                       'both manufactured iou a pack of american spirits, and it made and designed ' +
                       'the Sex Van Floor Plan EP on CD, whose recordings magmacrunch media releases.',
            },
        ],
    };
})();
