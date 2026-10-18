// race-track: two colours race round a 40-square loop with captures and safe squares
var track = AdRace.createTrack({
  length: 40, homeLength: 4, homeRule: 'progress',
  colors: { red: { entry: 0, homeEntry: 39 }, blue: { entry: 20, homeEntry: 19 } },
  // ENTRY below must match these entry squares
  safeSquares: [0, 10, 20, 30],
});

// The game places a pawn leaving the yard itself, so it keeps the entries too
var ENTRY = { red: 0, blue: 20 };
var PAWNS = 2;
var board = { red: [null, null], blue: [null, null] };
var turn = 'red';
var log = [];
var winner = null;

var el = document.getElementById('output-content');

function roll() { return 1 + Math.floor(Math.random() * 6); }

function play() {
  if (winner) return;
  var r = roll();
  var pawns = board[turn];
  var moved = false;
  // Leave the yard on a 6, otherwise move the furthest pawn that can legally move
  if (r === 6) {
    var y = pawns.indexOf(null);
    if (y >= 0) {
      pawns[y] = track.onTrack(ENTRY[turn]);
      log.unshift(turn + ' rolls 6 and enters pawn ' + y);
      moved = true;
    }
  }
  if (!moved) {
    for (var i = 0; i < PAWNS && !moved; i++) {
      var pos = pawns[i];
      if (track.isYard(pos) || track.isFinished(pos)) continue;
      var a = track.advance(turn, pos, r);
      if (!a) continue;
      var sq = track.trackOf(a.pos);
      if (sq !== null) {
        var hit = track.captureAt(turn, sq, board);
        if (hit) {
          board[hit.color][hit.index] = null;
          log.unshift(turn + ' captures ' + hit.color + ' on T' + sq + ', back to the yard');
        }
      }
      pawns[i] = a.pos;
      log.unshift(turn + ' rolls ' + r + ': pawn ' + i + ' ' + track.describe(pos) + ' -> ' + track.describe(a.pos)
        + (a.enteredHome ? ' (home run)' : ''));
      moved = true;
    }
  }
  if (!moved) log.unshift(turn + ' rolls ' + r + ', no move');
  if (pawns.every(track.isFinished)) {
    winner = turn;
    log.unshift(turn.toUpperCase() + ' WINS');
    console.log(turn + ' wins');
  }
  turn = track.nextTurn(['red', 'blue'], turn);
  render();
}

function render() {
  el.innerHTML = '';
  var ring = document.createElement('div');
  ring.style.cssText = 'display:grid;grid-template-columns:repeat(20,22px);gap:2px;padding:1rem;';
  for (var s = 0; s < 40; s++) {
    var cell = document.createElement('div');
    var here = track.pawnsAt(board, s);
    cell.style.cssText = 'height:22px;border-radius:3px;font-size:10px;display:flex;align-items:center;'
      + 'justify-content:center;color:#fff;background:'
      + (here.length ? (here[0].color === 'red' ? '#e5484d' : '#3b82f6') : (track.isSafe(s) ? '#2d2b3a' : '#14141b'));
    cell.textContent = here.length > 1 ? here.length : (track.isSafe(s) && !here.length ? '*' : '');
    cell.title = 'T' + s;
    ring.appendChild(cell);
  }
  el.appendChild(ring);

  var status = document.createElement('p');
  status.style.cssText = 'padding:0 1rem;color:#9d99b5;font-size:13px;';
  status.textContent = 'red: ' + board.red.map(track.describe).join(', ')
    + '   blue: ' + board.blue.map(track.describe).join(', ')
    + (winner ? '   ' + winner + ' wins' : '   next: ' + turn);
  el.appendChild(status);

  var btn = document.createElement('button');
  btn.textContent = winner ? 'Game over' : 'Roll (' + turn + ')';
  btn.disabled = !!winner;
  btn.style.cssText = 'margin:0 1rem;padding:.6rem 1.2rem;font-size:15px;background:'
    + (turn === 'red' ? '#e5484d' : '#3b82f6') + ';color:#fff;border:none;border-radius:6px;cursor:pointer;';
  btn.addEventListener('click', play);
  el.appendChild(btn);

  var auto = document.createElement('button');
  auto.textContent = 'Play to the end';
  auto.disabled = !!winner;
  auto.style.cssText = 'margin:0;padding:.6rem 1.2rem;font-size:15px;background:#555;color:#fff;border:none;border-radius:6px;cursor:pointer;';
  auto.addEventListener('click', function () { for (var n = 0; n < 2000 && !winner; n++) play(); });
  el.appendChild(auto);

  var pre = document.createElement('pre');
  pre.style.cssText = 'padding:1rem;color:#9d99b5;font-size:12px;margin:0;';
  pre.textContent = log.slice(0, 12).join('\n');
  el.appendChild(pre);
}

render();
console.log('Track: 40 squares, safe on ' + [0, 10, 20, 30].join(', ') + '; roll a 6 to enter a pawn');
