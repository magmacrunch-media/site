// cards-cribbage: Deal 6, find the best 2 to throw, cut the starter, score it
//
// There are 15 ways to keep 4 of 6 cards. For each one this averages the hand's
// score over all 46 starters it could be cut, which is how a real player
// should pick a discard: 690 scoreHand() calls, and it still runs instantly.
var C = AdCards.CribbageHandEval;

var deck = new AdCards.Deck();
deck.shuffle();
var six = [];
for (var i = 0; i < 6; i++) six.push(deck.deal());

// Every card not in our six could be the starter.
var unseen = [];
AdCards.SUITS.forEach(function (s) {
  AdCards.RANKS.forEach(function (r) {
    var mine = six.some(function (c) { return c.suit === s && c.rank === r; });
    if (!mine) unseen.push({ suit: s, rank: r });
  });
});

var options = [];
for (var a = 0; a < 6; a++) {
  for (var b = a + 1; b < 6; b++) {
    var keep = six.filter(function (_, k) { return k !== a && k !== b; });
    var total = 0;
    unseen.forEach(function (st) { total += C.scoreHand(keep, st).total; });
    options.push({ keep: keep, throwAway: [six[a], six[b]], avg: total / unseen.length });
  }
}
options.sort(function (x, y) { return y.avg - x.avg; });
var best = options[0];

// Cut a real starter from what is left of the deck.
var starter = deck.deal();
var score = C.scoreHand(best.keep, starter);

console.log('Kept ' + best.keep.map(name).join(', ')
  + ' (expected ' + best.avg.toFixed(2) + ' points)');
console.log('Starter: ' + name(starter));
console.log('Scored', score.breakdown, '= ' + score.total);

function name(c) { return c.rank + AdCards.SUIT_SYMBOLS[c.suit]; }

// ── Render ────────────────────────────────────────────
var el = document.getElementById('output-content');
el.innerHTML = '';

function label(text) {
  var p = document.createElement('p');
  p.style.cssText = 'padding:0 1rem;margin:.75rem 0 0;color:#9d99b5;font-size:13px;';
  p.textContent = text;
  el.appendChild(p);
}
function row(cards, dim) {
  var r = document.createElement('div');
  r.style.cssText = 'display:flex;gap:8px;padding:.5rem 1rem;flex-wrap:wrap;';
  cards.forEach(function (c) {
    c.faceUp = true;
    var node = c.getHTML();
    if (dim) node.style.opacity = '0.4';
    r.appendChild(node);
  });
  el.appendChild(r);
}

label('Keep (best average over all 46 possible starters: '
  + best.avg.toFixed(2) + ' points)');
row(best.keep);
label('Throw to the crib');
row(best.throwAway, true);
label('Starter');
row([starter]);

var b = score.breakdown;
var out = document.createElement('div');
out.style.cssText = 'padding:1rem;font-size:15px;line-height:1.6;';
out.innerHTML =
  'fifteens ' + b.fifteens + ' · pairs ' + b.pairs + ' · runs ' + b.runs
  + ' · flush ' + b.flush + ' · nobs ' + b.nobs
  + '<div style="font-size:20px;font-weight:bold;color:#ff6ec7;margin-top:.25rem;">'
  + score.total + ' points</div>';
el.appendChild(out);

label('Worst discard would have averaged '
  + options[options.length - 1].avg.toFixed(2) + '. Click "Run" to deal again.');
