/**
 * rejoin.js — take your seat back after a dropped connection.
 *
 * server_base.py holds a seated player's place for REJOIN_GRACE_SECONDS (60)
 * when their socket drops mid-game. Its welcome frame carries a rejoinToken,
 * sent to that player alone; sending it back as
 *
 *     { type: "rejoin", room, name, token }
 *
 * on a new socket takes the seat back. The name alone proves nothing (anyone
 * can type one), so without the token the server refuses.
 *
 * This file does the client half for any page using adenosine-multiplayer.js,
 * without touching that bundle, which is generated from the adenosine package
 * and must not be hand-edited:
 *
 *   - it keeps the latest token, with the room, name and server, in
 *     sessionStorage, so it survives a reload of the tab but not another tab;
 *   - when the socket closes mid-game (not after MP.quit()), it reconnects
 *     every RETRY_MS until the grace is up and sends the rejoin; the page's own
 *     onConnected and onWelcome are skipped for that reconnect, so it is not
 *     sent back to the lobby, and the game_state that follows a rejoin goes to
 *     MP.onGameState as usual, to catch the page up;
 *   - only if the rejoin fails, or the grace runs out, does the page's
 *     onDisconnected run.
 *
 * Leaving is MP.quit() (or MPRejoin.leave(), the same), whenever the player
 * leaves an online game or its lobby, connected or not: it forgets the seat,
 * stops any rejoin in flight, and from then until the page joins, creates or
 * spectates again, no room's frames reach it. A QUIT that skipped MP.quit()
 * with the socket down left this retrying, and the rejoin it made landed its
 * game_state on the local game the player had started since; so the guard is
 * here, where no page can forget it.
 *
 * Load it after adenosine-multiplayer.js and before the page's own scripts:
 *
 *   <script src="../shared/adenosine-multiplayer.js"></script>
 *   <script src="../shared/multiplayer/rejoin.js"></script>
 *
 * After a reload, MPRejoin.resume(goOnline, onFail) takes the saved seat back:
 * goOnline is the page's own function that wires up MP and connects, as its
 * ONLINE button does; the rejoin goes out in place of its join, and the page
 * lands on its game screen through MP.onGameState. onFail runs, quietly, if the
 * seat is no longer held. Pages call it on load when MPRejoin.saved() is set.
 *
 * Other players' drops and returns are shown in a small banner at the top of
 * the page: "Bob disconnected — 57s to rejoin", counting down, then "Bob is
 * back." or "Bob did not come back." The server says the same in words through
 * the room's system messages, which pages already put in their chat. A page
 * with a better place for the countdown passes MPRejoin.showSeats(show), and
 * show(text) is called instead ('' to clear).
 *
 * Its proper home is the adenosine multiplayer package, which this mirrors;
 * it lives here until that is published.
 */
var MPRejoin = (function () {
    'use strict';

    // The bundle's MP, before the page's `const { MP } = AdMP` names it.
    var MP = AdMP.MP;

    var GRACE_MS = 60000;
    var RETRY_MS = 2000;
    var KEY = 'mp-rejoin:' + ((typeof location !== 'undefined' && location.pathname) || '');

    var server = null;      // what MP.connect() was given
    var inGame = false;     // since game_started or a rejoin, until a quit
    var rejoining = false;  // a reconnect is in flight
    var deadline = 0;
    var page = {};          // the page's own handlers, which MP's properties forward to
    var onFail = null;      // resume()'s, for a seat no longer held after a reload
    var showSeat = null;    // showSeats()'s; the banner below without one
    var resuming = false;   // resume() after a reload, not a live rejoin
    var banner = null;
    var left = false;       // after a quit, until the page joins a room again
    var quietClose = false; // the close of a reconnect a quit called off
    var bannerTimer = null;

    function bannerShow(text) {
        if (typeof document === 'undefined' || !document.body) return;
        if (!banner) {
            banner = document.createElement('div');
            banner.className = 'mp-seat-banner';
            banner.setAttribute('role', 'status');
            banner.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);'
                + 'z-index:10000;padding:6px 14px;border-radius:6px;font:14px/1.3 sans-serif;'
                + 'background:rgba(0,0,0,0.82);color:#fff;pointer-events:none;';
            document.body.appendChild(banner);
        }
        if (bannerTimer) clearTimeout(bannerTimer);
        banner.textContent = text;
        banner.style.display = text ? 'block' : 'none';
    }

    function seatText(text, final) {
        var show = showSeat || bannerShow;
        show(text);
        if (final && !showSeat) bannerTimer = setTimeout(function () { bannerShow(''); }, 4000);
    }
    var countdowns = {};    // name -> interval, while a held seat counts down
    var held = {};          // name -> true, from a drop until a return or a quit

    function now() { return Date.now(); }

    function store(seat) {
        try {
            if (seat) sessionStorage.setItem(KEY, JSON.stringify(seat));
            else sessionStorage.removeItem(KEY);
        } catch (e) { /* storage off: rejoin works for this page only */ }
        memory = seat;
    }
    var memory = null;
    function saved() {
        try {
            var raw = sessionStorage.getItem(KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* fall back to memory */ }
        return memory;
    }

    // The page assigns MP.onConnected and friends after this file loads, so
    // each is made a property that keeps the page's function and hands MP a
    // wrapper that can step in during a rejoin.
    function intercept(name, wrapper) {
        page[name] = MP[name];
        Object.defineProperty(MP, name, {
            configurable: true,
            get: function () { return wrapper; },
            set: function (fn) { page[name] = fn; },
        });
    }
    function callPage(name, args) {
        if (typeof page[name] === 'function') return page[name].apply(MP, args);
    }

    function attempt() {
        if (!rejoining) return;
        if (now() > deadline) return giveUp();
        try { connect.call(MP, server); } catch (e) { setTimeout(attempt, RETRY_MS); }
    }

    function giveUp() {
        rejoining = false;
        resuming = false;
        inGame = false;
        store(null);
        if (onFail) {
            var fail = onFail;
            onFail = null;
            fail();
            return;
        }
        callPage('onDisconnected', []);
    }

    function stopCountdown(name) {
        if (countdowns[name]) clearInterval(countdowns[name]);
        delete countdowns[name];
    }

    function seatHeld(msg) {
        if (!msg.playerName) return;
        var name = msg.playerName;
        var left = Number(msg.graceSeconds) || GRACE_MS / 1000;
        stopCountdown(name);
        held[name] = true;
        var tick = function () {
            if (left <= 0) {
                stopCountdown(name);
                return;
            }
            seatText(name + ' disconnected \u2014 ' + left + 's to rejoin');
            left -= 1;
        };
        tick();
        countdowns[name] = setInterval(tick, 1000);
    }

    intercept('onConnected', function () {
        if (!rejoining) return callPage('onConnected', arguments);
        var seat = saved();
        if (!seat) return giveUp();
        MP._send({ type: 'rejoin', room: seat.room, name: seat.name, token: seat.token });
    });

    intercept('onDisconnected', function () {
        if (quietClose) {
            // The page quit; this is the reconnect it called off closing.
            quietClose = false;
            return;
        }
        if (rejoining) {
            setTimeout(attempt, RETRY_MS);
            return;
        }
        if (inGame && saved()) {
            rejoining = true;
            deadline = now() + GRACE_MS;
            setTimeout(attempt, RETRY_MS / 4);
            return;
        }
        callPage('onDisconnected', arguments);
    });

    // A failed connection attempt says so through onError and then closes,
    // which retries above; the page hears about errors only outside a rejoin.
    intercept('onError', function () {
        if (!rejoining) return callPage('onError', arguments);
    });

    var handle = MP._handle;
    MP._handle = function (msg) {
        // Gone from the room: nothing it sends is for this page now. The
        // lobby's room list and a refusal are not a room's, and still pass.
        if (left && msg && msg.type !== 'lobby_snapshot' && msg.type !== 'rejected') return;
        if (msg && msg.type === 'welcome' && msg.rejoinToken) {
            store({ room: msg.room, name: msg.playerName, token: msg.rejoinToken, server: server });
            if (msg.rejoined && resuming) {
                // After a reload the page knows nothing yet: let it have the
                // welcome, to learn its name, colour and room; game_state,
                // next, puts it on its game screen.
                rejoining = false;
                resuming = false;
                onFail = null;
                inGame = true;
                return handle.call(MP, msg);
            }
            if (msg.rejoined) {
                rejoining = false;
                onFail = null;
                inGame = true;
                // What MP's own welcome case sets, without the page's
                // onWelcome, which would put it back in the lobby.
                MP._myName = msg.playerName;
                MP._roomCode = msg.room;
                MP._isHost = msg.isHost === true;
                MP._myColor = msg.chosenColor || MP._myColor;
                MP._isSpectator = false;
                if (typeof MP.onSystemMessage === 'function') MP.onSystemMessage('Reconnected.');
                return;
            }
        }
        if (msg && msg.type === 'rejected' && rejoining) {
            resuming = false;
            return giveUp();
        }
        if (msg && msg.type === 'game_started') inGame = true;
        // Frames MP itself does not know: shown through showSeats().
        if (msg && msg.type === 'player_disconnected') return seatHeld(msg);
        if (msg && msg.type === 'player_rejoined') {
            stopCountdown(msg.playerName);
            delete held[msg.playerName];
            seatText(msg.playerName + ' is back.', true);
            return;
        }
        if (msg && msg.type === 'player_quit' && held[msg.playerName]) {
            // The countdown may already have run out: the server's timer,
            // not this page's, decides when the seat goes.
            stopCountdown(msg.playerName);
            delete held[msg.playerName];
            seatText(msg.playerName + ' did not come back.', true);
        }
        return handle.call(MP, msg);
    };

    var connect = MP.connect;
    MP.connect = function (addr) {
        server = addr || null;
        return connect.call(MP, addr);
    };

    // Joining again is what lets a room's frames through after a quit.
    ['join', 'joinRoom', 'createRoom', 'spectate'].forEach(function (name) {
        var original = MP[name];
        MP[name] = function () {
            left = false;
            return original.apply(MP, arguments);
        };
    });

    var quit = MP.quit;
    MP.quit = function () {
        var wasRejoining = rejoining;
        inGame = false;
        rejoining = false;
        resuming = false;
        onFail = null;
        left = true;
        store(null);
        Object.keys(countdowns).forEach(stopCountdown);
        held = {};
        if (MP.isConnected()) return quit.apply(MP, arguments);
        // The socket is down: nothing to tell the server, which gives the
        // seat up when its grace runs out. Stop a reconnect half-made.
        MP._myName = null;
        MP._roomCode = null;
        var sock = MP._socket;
        if (wasRejoining && sock && sock.readyState === 0) {
            quietClose = true;
            try { sock.close(); } catch (e) { quietClose = false; }
        }
    };

    return {
        GRACE_MS: GRACE_MS,
        saved: saved,
        /**
         * After a reload: take the saved seat back. goOnline is the page's own
         * "play online" setup, which assigns MP's handlers and calls
         * MP.connect(); without it MP connects to the saved server directly.
         * onFail runs instead of the page's onDisconnected if the seat is gone.
         */
        resume: function (goOnline, fail) {
            var seat = saved();
            if (!seat) return false;
            rejoining = true;
            resuming = true;
            inGame = true;
            left = false;
            onFail = typeof fail === 'function' ? fail : function () {};
            deadline = now() + GRACE_MS;
            if (typeof goOnline === 'function') goOnline();
            else MP.connect(seat.server || undefined);
            return true;
        },
        /** Leave the room and the seat: MP.quit(), named for what a page means. */
        leave: function () { MP.quit(); },
        /** show(text) for other players' drops, countdowns and returns. */
        showSeats: function (show) { showSeat = typeof show === 'function' ? show : null; },
        isRejoining: function () { return rejoining; },
    };
})();
