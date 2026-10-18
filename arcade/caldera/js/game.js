// game.js -- one run: reset it, step it a frame, end it.
//
// THIS FILE AND EVERYTHING IT CALLS IS PURE LOGIC. No DOM, no canvas, no
// timers. main.js feeds it one input object per tick and render.js reads the
// state it leaves behind; tools/sim.mjs does the first of those with a bot
// and skips the second. Keep it that way: the browser pane pauses
// requestAnimationFrame when hidden, so a check driven through a real page
// passes by measuring nothing, and the sim is the check that cannot.
//
// The input contract, every tick:
//   { left: bool, right: bool, jump: bool }   jump is the PRESS, not the hold

CA.game = {

  listeners: [],

  // Things render.js and main.js want to know about (sparks, shakes, banners)
  // without the logic knowing they exist.
  on(fn) { this.listeners.push(fn); },
  emit(type, data) { for (const fn of this.listeners) fn(type, data); },

  create(seed, character) {
    const g = {
      seed: seed >>> 0,
      rand: CA.rng(seed),
      frame: 0,
      over: false,
      ledges: [],
      topFloor: -1,
      player: CA.player.create(character),
      magma: { y: CA.H * 0.6, active: false, rise: 0 },
      camY: -CA.H + CA.H * 0.18,
      camHigh: 0,
      chamber: 0,
    };
    CA.score.reset(g);
    CA.tower.ensure(g, 14);
    g.player.ledge = g.ledges[0];
    g.camHigh = g.camY;
    return g;
  },

  step(g, input) {
    if (g.over) return;
    g.frame++;

    CA.tower.update(g);
    CA.player.update(g, input);
    CA.score.tick(g);
    this.updateMagma(g);
    this.updateCamera(g);

    const chamber = CA.tower.chamberOf(g.best);
    if (chamber !== g.chamber) {
      g.chamber = chamber;
      this.emit('chamber', chamber);
    }

    // Keep a screen and a half of tower above the camera.
    const visibleTop = Math.ceil(-(g.camY - CA.H * 0.5) / CA.TOWER.gap);
    CA.tower.ensure(g, visibleTop);
    CA.tower.prune(g);

    if (g.player.y + g.player.P.h > g.magma.y) this.end(g);
  },

  riseFor(g) {
    const M = CA.MAGMA;
    return Math.min(M.maxRise,
      M.riseStart + M.risePerChamber * CA.tower.chamberOf(g.best) + M.risePerFloor * g.best);
  },

  updateMagma(g) {
    const M = CA.MAGMA;
    const m = g.magma;
    if (!m.active && (g.best >= M.startFloor || g.frame >= M.startFrames)) {
      m.active = true;
      this.emit('magma');
    }
    if (!m.active) return;
    m.rise = this.riseFor(g);
    m.y -= m.rise;
    // The leash, measured from the HIGHEST the view has been, so falling
    // back down the tower does not drag the magma down with you.
    m.y = Math.min(m.y, g.camHigh + CA.H + M.leash);
  },

  updateCamera(g) {
    const p = g.player;
    const target = p.y - CA.H * 0.42;
    g.camY += (target - g.camY) * 0.12;
    // Never look so far down that the screen is mostly magma.
    g.camY = Math.min(g.camY, g.magma.y - CA.H * 0.78);
    g.camHigh = Math.min(g.camHigh, g.camY);
  },

  end(g) {
    if (g.over) return;
    // A chain in flight when you go under still pays: you earned it.
    if (g.chain.jumps > 0) CA.score.bank(g);
    g.over = true;
    this.emit('dead', g);
  },
};
