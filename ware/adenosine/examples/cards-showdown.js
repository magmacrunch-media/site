// cards-showdown: Texas hold'em, four players, one board, find the winner
//
// evaluate() picks the best 5 of 7 for each player. Comparing two results is
// rank first, then the tiebreakers array left to right, which settles kickers
// and split pots without any per-hand special cases.
var deck = new AdCards.Deck();
deck.shuffle();

// Poker is ace-high. Restamp at the single point cards enter play: see the
// note under HandEvaluator.evaluate() in API.md.
function deal() {
  var c = deck.deal();
  c.value = AdCards.POKER_RANK_VALUES[c.rank];
  c.faceUp = true;
  return c;
}

var names = ['North', 'East', 'South', 'West'];
var players = names.map(function (n) { return { name: n, hole: [deal(), deal()] }; });
var board = [deal(), deal(), deal(), deal(), deal()];

var ev = new AdCards.HandEvaluator();
players.forEach(function (p) { p.result = ev.evaluate(p.hole.concat(board)); });

function compare(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (var i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    var d = (a.tiebreakers[i] || 0) - (b.tiebreakers[i] || 0);
    if (d) return d;
  }
  return 0;
}

var top = players.reduce(function (best, p) {
  return compare(p.result, best.result) > 0 ? p : best;
});
var winners = players.filter(function (p) { return compare(p.result, top.result) === 0; });

players.forEach(function (p) { console.log(p.name + ': ' + p.result.description); });
console.log(winners.length > 1 ? 'Split pot' : winners[0].name + ' wins');

// ── Render ────────────────────────────────────────────
var el = document.getElementById('output-content');
el.innerHTML = '';

function row(cards, highlight) {
  var r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  cards.forEach(function (c) {
    var node = c.getHTML();
    if (highlight && highlight.indexOf(c) < 0) node.style.opacity = '0.35';
    r.appendChild(node);
  });
  return r;
}

var boardBox = document.createElement('div');
boardBox.style.cssText = 'padding:1rem;';
boardBox.innerHTML = '<p style="color:#9d99b5;font-size:13px;margin:0 0 .5rem;">The board</p>';
boardBox.appendChild(row(board));
el.appendChild(boardBox);

var grid = document.createElement('div');
grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;padding:0 1rem 1rem;';
players.forEach(function (p) {
  var won = winners.indexOf(p) >= 0;
  var box = document.createElement('div');
  box.style.cssText = 'padding:.75rem;border-radius:8px;border:1px solid '
    + (won ? '#ff6ec7' : '#33304a') + ';background:#1c1b26;';
  var head = document.createElement('div');
  head.style.cssText = 'margin-bottom:.5rem;font-weight:bold;color:' + (won ? '#ff6ec7' : '#e8e6f0') + ';';
  head.textContent = p.name + (won ? (winners.length > 1 ? ' · split' : ' · wins') : '');
  box.appendChild(head);
  box.appendChild(row(p.hole, p.result.cards));
  var desc = document.createElement('div');
  desc.style.cssText = 'margin-top:.5rem;font-size:13px;color:#9d99b5;';
  desc.textContent = p.result.description;
  box.appendChild(desc);
  grid.appendChild(box);
});
el.appendChild(grid);

var note = document.createElement('p');
note.style.cssText = 'padding:0 1rem;color:#9d99b5;font-size:13px;';
note.textContent = 'Dimmed hole cards are not part of that player\'s best five. Click "Run" to deal again.';
el.appendChild(note);
