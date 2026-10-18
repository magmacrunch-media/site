// mp-loopback: The whole client lifecycle, against a server that lives in this page
//
// The real thing is a WebSocket server (PROTOCOL.md specifies it). Here a tiny
// fake socket plays that server, so you can watch every frame go by: join,
// welcome, lobby_update, start_game, game_action. A bot named Rook joins the
// room, and every number you send it, it answers with one higher.
//
// The fake server below is about 40 lines, which is roughly what a minimal
// real one needs too.
var MP = AdMP.MP, MSG = AdMP.MSG;

var el = document.getElementById('output-content');
el.innerHTML = '';
var log = document.createElement('div');
log.style.cssText = 'padding:1rem;font:12px/1.6 ui-monospace,monospace;';
el.appendChild(log);

function line(dir, obj) {
  var d = document.createElement('div');
  d.style.color = dir === '→' ? '#6cd4f5' : '#ff6ec7';
  d.textContent = dir + ' ' + JSON.stringify(obj);
  log.appendChild(d);
}
// The playground's console panel only captures what Run prints synchronously,
// and everything here happens in callbacks, so the game's own lines go in the
// page too, in white.
function say(text) {
  var d = document.createElement('div');
  d.style.cssText = 'color:#e8e6f0;margin:.25rem 0;';
  d.textContent = '  ' + text;
  log.appendChild(d);
}

// ── The fake server ───────────────────────────────────
function FakeServer() {
  var self = this, listeners = {};
  var room = { code: 'DEMO', players: [], started: false };
  self.readyState = 1;   // WebSocket.OPEN, which MP.isConnected() checks
  self.addEventListener = function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); };
  function emit(type, ev) {
    if (MP._socket !== self) return;   // a previous Run's server, still ticking
    (listeners[type] || []).forEach(function (fn) { fn(ev); });
  }
  function reply(obj) {
    // Real sockets deliver asynchronously; so does this one.
    setTimeout(function () { line('←', obj); emit('message', { data: JSON.stringify(obj) }); }, 250);
  }
  function lobby() {
    reply({ type: MSG.LOBBY_UPDATE, players: room.players, playerCount: room.players.length,
            maxPlayers: 2, canStart: room.players.length === 2, gameStarted: room.started });
  }
  self.send = function (raw) {
    var msg = JSON.parse(raw);
    line('→', msg);
    if (msg.type === MSG.JOIN) {
      room.players.push({ name: msg.name, color: msg.color, isHost: true, slot: 0 });
      reply({ type: MSG.WELCOME, playerName: msg.name, room: room.code, isHost: true,
              chosenColor: msg.color, playerCount: 1, maxPlayers: 2 });
      lobby();
      setTimeout(function () {                      // the bot arrives
        room.players.push({ name: 'Rook', color: AdMP.MP_PALETTE[4], isHost: false, slot: 1 });
        reply({ type: MSG.SYSTEM_MSG, text: 'Rook joined' });
        lobby();
      }, 600);
    } else if (msg.type === MSG.START_GAME) {
      room.started = true;
      reply({ type: MSG.GAME_STARTED, colorMap: {}, state: { turn: 0 } });
    } else if (msg.type === MSG.GAME_ACTION) {
      reply({ type: MSG.GAME_ACTION_BC, action: msg.action });           // echo to everyone
      reply({ type: MSG.GAME_ACTION_BC, action: { type: 'number', by: 'Rook', n: msg.action.n + 1 } });
    }
  };
  setTimeout(function () { emit('open', {}); }, 0);
}

// MP constructs `new WebSocket(url)` inside connect(), so lend it ours for
// exactly that one call and put the real one back.
var RealWS = window.WebSocket;
window.WebSocket = FakeServer;
window.WebSocket.OPEN = 1;
try { MP.connect('ws://loopback.invalid'); } finally { window.WebSocket = RealWS; }

// ── The game code: this is all a real client writes ───
var lastN = 0;
MP.onConnected = function () { MP.join('You', AdMP.MP_PALETTE[0]); };
MP.onWelcome = function () { say('In room ' + MP.getRoomCode() + ', host: ' + MP.amIHost()); };
MP.onSystemMessage = function (text) { say(text); };
MP.onLobbyUpdate = function (u) {
  if (u.canStart && !u.gameStarted && MP.amIHost()) MP.startGame();
};
MP.onGameStarted = function () {
  say('Game started');
  MP.sendAction({ type: 'number', by: MP.getMyName(), n: 1 });
};
MP.onGameAction = function (a) {
  say(a.by + ': ' + a.n);
  lastN = a.n;
};

var btn = document.createElement('button');
btn.textContent = 'Send the next number';
btn.style.cssText = 'margin:0 1rem 1rem;padding:.5rem 1rem;font-size:14px;'
  + 'background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;';
btn.addEventListener('click', function () {
  MP.sendAction({ type: 'number', by: MP.getMyName(), n: lastN + 1 });
});
el.insertBefore(btn, log);
