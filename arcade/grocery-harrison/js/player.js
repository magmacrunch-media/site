// player.js -- Harrison: run, jump, carry, strum, and the collision that
// goes with them.
//
// The input contract, every tick:
//   { left, right, jump, down }  held
//   { jumpPress, act, strum }    the PRESS, not the hold

GH.player = {

  create(x, y, hearts = GH.PLAYER.hearts) {
    const P = GH.PLAYER;
    return {
      x, y: y - P.h, vx: 0, vy: 0,
      prevBottom: y,
      facing: 1,
      grounded: false,
      on: null,            // the surface stood on
      coyote: 0,
      buffer: 0,
      carrying: false,
      hearts,
      invuln: 0,
      knock: 0,
      strumT: 0,
      strumCool: 0,
      vine: null,          // the herb vine he is holding, if any
      vineCool: 0,
    };
  },

  sticky(g) {
    const p = g.player;
    if (!p.grounded || !p.on || !p.on.shelf) return false;
    const cx = p.x + GH.PLAYER.w / 2;
    return g.world.sticky.some(s => cx >= s.x0 && cx <= s.x1);
  },

  update(g, input) {
    const P = GH.PLAYER;
    const p = g.player;
    if (p.invuln) p.invuln--;
    if (p.strumT) p.strumT--;
    if (p.strumCool) p.strumCool--;
    if (p.coyote) p.coyote--;
    if (p.vineCool) p.vineCool--;

    if (input.strum) this.strum(g);
    // On a vine, or catching one: that is all the movement there is.
    if (this.vine(g, input)) return;

    const sticky = this.sticky(g);
    const slick = p.grounded && p.on && p.on.slick;
    if (p.knock > 0) {
      p.knock--;
    } else {
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (dir) p.facing = dir;
      const run = p.carrying ? P.runCarrying : P.run;
      const want = dir * run * (sticky ? GH.STICKY.run : 1);
      // On butter the feet only suggest; in the air and elsewhere they decide.
      if (slick) p.vx += (want - p.vx) * g.stats.slickGrip;
      else p.vx = want;
    }
    // A fridge door blowing: on top of whatever the feet are doing. It is
    // applied as a nudge to x, not to vx, so butter does not store it up.
    p.gust = GH.game.gustAt(g, p.x + P.w / 2);

    if (input.jumpPress) p.buffer = P.buffer;
    else if (p.buffer) p.buffer--;
    if (p.buffer > 0 && p.knock === 0 && (p.grounded || p.coyote > 0)) {
      const v = p.carrying ? g.stats.jumpVCarrying : P.jumpV;
      // A star in the milk bowl is springy: its jump is the same carrying or not.
      p.vy = p.on && p.on.spring ? -p.on.spring : -v * (sticky ? GH.STICKY.jump : 1);
      p.grounded = false;
      p.on = null;
      p.coyote = 0;
      p.buffer = 0;
      GH.game.emit('jump');
    }
    // The variable jump: let go and the rise stops short.
    if (!input.jump && p.vy < -P.jumpCut && p.knock === 0) p.vy = -P.jumpCut;

    this.move(g);
  },

  // Herb vines. Returns true when it has handled this frame's movement.
  //
  // Grabbed by being in the air, at the stem, with jump held: jumping from
  // the foot of one with jump held catches it straight away, and jumping
  // past one without holding jump does not. On it, holding jump climbs and
  // letting go slides down; left or right hops off; the top lets go onto
  // whatever leaf waits there, and the foot onto the shelf.
  vine(g, input) {
    const P = GH.PLAYER;
    const V = GH.VINE;
    const p = g.player;
    const vines = g.world.vines || [];
    const cx = p.x + P.w / 2;
    if (!p.vine) {
      if (p.grounded || p.vineCool > 0 || p.knock > 0 || !input.jump) return false;
      const feet = p.y + P.h;
      const v = vines.find(v => Math.abs(v.x - cx) <= V.grab && feet > v.top + 4 && p.y < v.bottom);
      if (!v) return false;
      p.vine = v;
      p.vx = p.vy = 0;
      p.on = null;
      p.x = v.x - P.w / 2;
      GH.game.emit('grab');
      return true;
    }
    const v = p.vine;
    const letGo = (vy, vx = 0) => {
      p.vine = null;
      p.vineCool = V.cool;
      p.vy = vy;
      p.vx = vx;
    };
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) {
      p.facing = dir;
      letGo(-V.hop, dir * (p.carrying ? P.runCarrying : P.run));
      this.move(g);
      return true;
    }
    if (input.jump) p.y -= p.carrying ? V.climbCarrying : V.climb;
    else p.y += input.down ? V.slideFast : V.slide;
    const feet = p.y + P.h;
    if (feet <= v.top) {
      // Off the top, with a little pop so the leaf there catches him.
      p.y = v.top - P.h - 1;
      letGo(-2.5);
      this.move(g);
    } else if (feet >= v.bottom) {
      p.y = v.bottom - P.h - 1;
      letGo(0);
      this.move(g);
    }
    return true;
  },

  // Sideways first, against solids only; then down, against solids and
  // the tops of flakes. A drifting flake you stand on carries you with it.
  move(g) {
    const P = GH.PLAYER;
    const p = g.player;
    const w = g.world;

    // Whatever he stands on carries him: a drifting flake down, a bobbing
    // loop up and down, a poured loop across the milk.
    if (p.on && p.on.dy) p.y += p.on.dy;
    if (p.on && p.on.dx) p.x += p.on.dx;

    p.x += p.vx + (p.gust || 0);
    for (const s of w.solids) {
      if (p.y + P.h <= s.top || p.y >= s.bottom) continue;
      if (p.x + P.w <= s.x0 || p.x >= s.x1) continue;
      // Pushed out to whichever side is nearer: that is the side we came from.
      if (p.x + P.w / 2 < (s.x0 + s.x1) / 2) p.x = s.x0 - P.w;
      else p.x = s.x1;
    }
    p.x = Math.max(0, Math.min(w.width - P.w, p.x));

    const wasGrounded = p.grounded;
    const prevBottom = p.y + P.h;
    p.prevBottom = prevBottom;
    p.vy = Math.min(p.vy + P.gravity, P.maxFall);
    const falling = p.vy;
    p.y += p.vy;
    p.grounded = false;
    p.on = null;

    for (const s of w.solids) {
      if (p.x + P.w <= s.x0 || p.x >= s.x1) continue;
      if (p.y + P.h <= s.top || p.y >= s.bottom) continue;
      if (p.vy >= 0 && prevBottom <= s.top + 0.5) {
        this.land(p, s, s.top);
      } else if (p.vy < 0) {
        p.y = s.bottom;
        p.vy = 0;
      }
    }
    if (!p.grounded && p.vy >= 0) {
      const bottom = p.y + P.h;
      for (const o of w.oneways.concat(w.falling)) {
        if (o.under) continue;
        if (p.x + P.w - 4 <= o.x0 || p.x + 4 >= o.x1) continue;
        // A drifting flake has moved since last frame; either of its
        // heights counts as "was above it", or a rider would fall through.
        const was = o.prevY !== undefined ? Math.max(o.prevY, o.y) : o.y;
        if (prevBottom <= was + 0.5 && bottom >= o.y) {
          this.land(p, o, o.y);
          break;
        }
      }
    }
    if (wasGrounded && !p.grounded && p.vy >= 0) p.coyote = GH.PLAYER.coyote;
    // A real landing, not a frame of standing on something: for the sound.
    if (!wasGrounded && p.grounded && falling > 2.5) GH.game.emit('land', falling);
  },

  land(p, surface, top) {
    p.y = top - GH.PLAYER.h;
    p.vy = 0;
    p.grounded = true;
    p.on = surface;
  },

  strum(g) {
    const p = g.player;
    const S = GH.STRUM;
    if (p.strumCool > 0) return;
    p.strumT = S.frames;
    p.strumCool = g.stats.strumCooldown;
    const cx = p.x + GH.PLAYER.w / 2;
    const cy = p.y + GH.PLAYER.h / 2;
    for (const wv of g.world.foes) {
      if (wv.kind === 'wheel') continue;
      const dx = wv.x - cx;
      const dy = wv.y - GH.WEEVIL.h / 2 - cy;
      if (dx * dx + dy * dy <= g.stats.strumRadius ** 2) wv.stun = g.stats.stun;
    }
    GH.game.emit('strum');
    // The secret: strummed at, the MAGMA CRUNCH box on the back shelf tips.
    if (!g.magma && GH.bowl.nearBox(g)) {
      g.magma = true;
      GH.game.emit('magma');
    }
  },
};
