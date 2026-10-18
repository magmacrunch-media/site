// game-draw-poker: A complete game. Five-card draw against the computer
//
// Everything a small card game needs is here: a deck, dealing, click to hold,
// a draw, a computer opponent, a showdown, chips and a bust state. The engine
// does the hard parts (card art, hand evaluation, chip stacks), so the game
// itself is mostly the rules below.
var ANTE = 10, START = 100;

var ev = new AdCards.HandEvaluator();
var deck, you, bot, held, phase, pot;
var chips = { you: START, bot: START };

// ── Rules ─────────────────────────────────────────────
function deal() {
  var c = deck.deal();
  c.value = AdCards.POKER_RANK_VALUES[c.rank];   // poker is ace-high
  return c;
}

function compare(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (var i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    var d = (a.tiebreakers[i] || 0) - (b.tiebreakers[i] || 0);
    if (d) return d;
  }
  return 0;
}

// The computer: stand pat on a straight or better, otherwise keep pairs and
// sets, then four to a flush, then its highest card.
function botHolds(hand) {
  if (ev.evaluate(hand).rank >= AdCards.HAND_RANKS['Straight']) return hand.slice();
  var byRank = {}, bySuit = {};
  hand.forEach(function (c) {
    (byRank[c.rank] = byRank[c.rank] || []).push(c);
    (bySuit[c.suit] = bySuit[c.suit] || []).push(c);
  });
  var keep = [];
  Object.keys(byRank).forEach(function (r) { if (byRank[r].length > 1) keep = keep.concat(byRank[r]); });
  if (keep.length) return keep;
  for (var s in bySuit) if (bySuit[s].length === 4) return bySuit[s];
  return [hand.slice().sort(function (a, b) { return b.value - a.value; })[0]];
}

function newHand() {
  deck = new AdCards.Deck();
  deck.shuffle();
  you = []; bot = [];
  for (var i = 0; i < 5; i++) { you.push(deal()); bot.push(deal()); }
  held = [false, false, false, false, false];
  chips.you -= ANTE; chips.bot -= ANTE; pot = ANTE * 2;
  phase = 'hold';
  render('Click the cards you want to keep, then Draw.');
}

function draw() {
  you = you.map(function (c, i) { return held[i] ? c : deal(); });
  var keep = botHolds(bot);
  var botDrew = 5 - keep.length;
  bot = bot.map(function (c) { return keep.indexOf(c) >= 0 ? c : deal(); });

  var yr = ev.evaluate(you), br = ev.evaluate(bot), d = compare(yr, br), msg;
  if (d > 0)      { chips.you += pot; msg = 'You win ' + pot + ' with ' + yr.description + '.'; }
  else if (d < 0) { chips.bot += pot; msg = 'Computer wins ' + pot + ' with ' + br.description + '.'; }
  else            { chips.you += pot / 2; chips.bot += pot / 2; msg = 'Split pot: both have ' + yr.description + '.'; }
  pot = 0;
  phase = chips.you < ANTE || chips.bot < ANTE ? 'over' : 'shown';
  if (phase === 'over') msg += chips.you < ANTE ? ' You are out of chips.' : ' The computer is broke. You win the game!';
  render(msg + ' (Computer drew ' + botDrew + '.)', yr, br);
}

// ── Screen ────────────────────────────────────────────
var el = document.getElementById('output-content');

function render(message, yourResult, botResult) {
  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:1rem;display:flex;flex-direction:column;gap:.75rem;';
  el.appendChild(wrap);

  wrap.appendChild(text('Computer · ' + chips.bot + ' chips'
    + (botResult ? ' · ' + botResult.description : ''), '#9d99b5'));
  wrap.appendChild(cardRow(bot, phase !== 'hold'));

  wrap.appendChild(text(pot ? 'Pot: ' + pot : ' ', '#ffe135'));

  wrap.appendChild(cardRow(you, true, phase === 'hold'));
  wrap.appendChild(text('You · ' + chips.you + ' chips'
    + (yourResult ? ' · ' + yourResult.description : ''), '#9d99b5'));

  // The chip stacks are drawn by the engine from a plain number.
  var stack = document.createElement('div');
  stack.id = 'chipDisplay';
  stack.style.cssText = 'display:flex;gap:6px;align-items:flex-end;min-height:40px;';
  wrap.appendChild(stack);
  AdCards.ChipAnim.init('chipDisplay');
  AdCards.ChipAnim.setChips(chips.you);

  wrap.appendChild(text(message, '#e8e6f0'));

  var label = phase === 'hold' ? 'Draw' : phase === 'shown' ? 'Next hand' : 'New game';
  wrap.appendChild(button(label, function () {
    if (phase === 'hold') draw();
    else {
      if (phase === 'over') chips = { you: START, bot: START };
      newHand();
    }
  }));
}

function cardRow(hand, faceUp, clickable) {
  var r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;min-height:110px;';
  hand.forEach(function (c, i) {
    c.faceUp = faceUp;
    var node = c.getHTML();
    node.style.transition = 'transform .12s';
    if (clickable) {
      node.style.cursor = 'pointer';
      if (held[i]) node.style.transform = 'translateY(-14px)';
      node.addEventListener('click', function () {
        held[i] = !held[i];
        node.style.transform = held[i] ? 'translateY(-14px)' : '';
      });
    }
    r.appendChild(node);
  });
  return r;
}

function text(t, color) {
  var p = document.createElement('div');
  p.style.cssText = 'font-size:14px;color:' + color + ';';
  p.textContent = t;
  return p;
}

function button(label, onClick) {
  var b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = 'align-self:flex-start;padding:.5rem 1.25rem;font-size:14px;'
    + 'background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;';
  b.addEventListener('click', onClick);
  return b;
}

newHand();
console.log('Ante ' + ANTE + ', both players start with ' + START + ' chips.');
