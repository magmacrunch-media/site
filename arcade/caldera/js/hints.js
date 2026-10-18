// hints.js -- teach CRUNCH in play, once, then never again.
//
// The game's best idea is that speed is height and that skipping floors
// builds a chain worth floors squared. None of that is on the title card, on
// purpose, so without this it was explained only on the pause screen, where
// nobody looks. These lines appear during a player's first runs, each one when
// the thing it describes has just happened, and stop for good the first time
// the player banks a CRUNCH: by then they have done it, which is the point.
//
// Browser half only: it reads game state and draws, and never changes play.

CA.hints = {

  KEY: 'caldera-hints-done',
  done: false,
  lines: null,
  until: 0,
  prevJumps: 0,
  frame: 0,

  init() {
    try { this.done = localStorage.getItem(this.KEY) === '1'; } catch (err) { this.done = false; }
    CA.game.on(type => { if (type === 'crunch') this.onCrunch(); });
  },

  show(lines, frames) {
    this.lines = lines;
    this.until = this.frame + frames;
  },

  start() {
    this.prevJumps = 0;
    this.lines = null;
    if (this.done) return;
    // Ask the device, not touch.seen: a phone's first run starts from the
    // HTML button, so no finger has touched the canvas yet.
    const touchy = CA.touch.seen
      || (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches);
    this.show(touchy
      ? ['DRAG TO RUN. TAP TO JUMP.', 'THE FASTER YOU RUN, THE HIGHER.']
      : ['RUN, THEN JUMP:', 'THE FASTER YOU RUN, THE HIGHER.'], 330);
  },

  update(g) {
    this.frame++;
    if (this.done) return;
    const j = g.chain.jumps;
    if (j === 1 && this.prevJumps === 0) {
      this.show(['TWO FLOORS IN ONE JUMP!', 'AGAIN, BEFORE THE BAR RUNS OUT.'], 240);
    } else if (j === 0 && this.prevJumps === 1 && !(g.lastBank && g.lastBank.frame === g.frame)) {
      this.show(['A CRUNCH NEEDS TWO BIG', 'JUMPS IN A ROW. BOUNCE OFF WALLS.'], 240);
    }
    this.prevJumps = j;
  },

  onCrunch() {
    if (this.done) return;
    this.show(['CRUNCH PAYS FLOORS SQUARED.', 'LONGER CHAINS, BIGGER SCORES.'], 260);
    this.done = true;
    try { localStorage.setItem(this.KEY, '1'); } catch (err) { /* shown again next time */ }
  },

  draw(c) {
    if (!this.lines || this.frame > this.until) return;
    const a = Math.min(1, (this.until - this.frame) / 30);
    c.save();
    c.fillStyle = `rgba(0,0,0,${(0.55 * a).toFixed(3)})`;
    c.fillRect(CA.WALL, 44, CA.W - 2 * CA.WALL, 16 + 16 * this.lines.length);
    c.fillStyle = `rgba(255,217,160,${a.toFixed(3)})`;
    c.font = '9px "Press Start 2P", monospace';
    c.textAlign = 'center';
    this.lines.forEach((s, i) => c.fillText(s, CA.W / 2, 64 + i * 16));
    c.restore();
  },
};
