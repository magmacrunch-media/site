// score.js -- floors climbed, and the CRUNCH chain.
//
// Everything scored goes through award(). Do not add `g.score +=` anywhere
// else: one door in is how the HUD, the sim and the end card stay in
// agreement about what a run was worth.
//
// CRUNCH is Icy Tower's combo with the rules unchanged, because they are the
// part of that game that is right: every jump in the chain must land at least
// two floors above where it left, the chain must be refreshed inside a time
// window, and a chain of two or more jumps pays (floors in it) squared. The
// square is the point. It makes one long chain worth far more than several
// short ones, so the game rewards committing to speed.

CA.score = {

  reset(g) {
    g.score = 0;
    g.best = 0;           // highest floor stood on
    g.chain = { jumps: 0, floors: 0, timer: 0 };
    g.bestChain = 0;      // most floors in one banked chain
    g.lastBank = null;    // { floors, points, frame } for the HUD flash
  },

  award(g, points) {
    g.score += Math.round(points);
  },

  land(g, floor, takeoffFloor) {
    if (floor > g.best) {
      this.award(g, CA.SCORE.perFloor * (floor - g.best));
      g.best = floor;
      CA.game.emit('floor', floor);
    }

    const climbed = floor - takeoffFloor;
    if (climbed >= CA.CRUNCH.minFloorsPerJump) {
      g.chain.jumps++;
      g.chain.floors += climbed;
      g.chain.timer = CA.CRUNCH.windowFrames;
    } else if (g.chain.jumps > 0) {
      this.bank(g);
    }
  },

  tick(g) {
    if (g.chain.jumps === 0) return;
    if (--g.chain.timer <= 0) this.bank(g);
  },

  // Close the chain, paying it if it qualifies.
  bank(g) {
    const c = g.chain;
    if (c.jumps >= CA.CRUNCH.minJumps) {
      const points = c.floors * c.floors;
      this.award(g, points);
      g.bestChain = Math.max(g.bestChain, c.floors);
      g.lastBank = { floors: c.floors, jumps: c.jumps, points, frame: g.frame };
      CA.game.emit('crunch', g.lastBank);
    }
    g.chain = { jumps: 0, floors: 0, timer: 0 };
  },
};
