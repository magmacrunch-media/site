// player.js -- running, jumping, rebounding, landing.
//
// The player's box is (x, y, w, h) in world space with y at the TOP of the
// box, so its feet are at y + h.
//
// Ledges are one-way: they only stop you falling, and only if your feet were
// above the ledge on the previous frame. That is what lets you jump up
// through them from below, and the previous-frame test is what stops a fast
// fall tunnelling through a thin ledge.

CA.player = {

  // PLAYER with one cast member's overrides on top. Everything below reads
  // p.P, never CA.PLAYER, so a character's stats reach every rule.
  statsFor(id) {
    const member = CA.CAST.order.includes(id) ? CA.CAST[id] : CA.CAST.cinder;
    return Object.assign({ crustFrames: CA.LEDGE.crustFrames }, CA.PLAYER, member.stats);
  },

  create(character = 'cinder') {
    const P = this.statsFor(character);
    return {
      character: CA.CAST.order.includes(character) ? character : 'cinder',
      P,
      x: CA.W / 2 - P.w / 2,
      y: -P.h,
      vx: 0,
      vy: 0,
      grounded: true,
      ledge: null,        // the ledge stood on, when grounded
      coyote: 0,
      buffer: 0,
      takeoffFloor: 0,    // the floor the current jump left from
      facing: 1,
      squash: 0,          // landing squash, for drawing only
    };
  },

  surface(p) {
    const L = CA.LEDGE;
    const P = p.P;
    if (p.grounded && p.ledge && p.ledge.kind === 'obsidian' && !P.obsidianGrip) {
      return { accel: L.obsidianAccel, friction: L.obsidianFriction };
    }
    if (p.grounded) return { accel: P.runAccel, friction: P.groundFriction };
    return { accel: P.airAccel, friction: P.airDrag };
  },

  jump(g, p, vy) {
    p.vy = vy;
    p.grounded = false;
    p.coyote = 0;
    p.buffer = 0;
    p.takeoffFloor = p.ledge ? p.ledge.floor : p.takeoffFloor;
    p.ledge = null;
  },

  update(g, input) {
    const p = g.player;
    const P = p.P;

    // Horizontal. Input accelerates; no input lets the surface's friction
    // bleed speed off, which on obsidian it barely does.
    const s = this.surface(p);
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) {
      const reversing = p.vx * dir < 0;
      const skid = reversing ? (p.grounded ? P.skidGround : P.skidAir) : 1;
      p.vx += dir * s.accel * skid;
      p.facing = dir;
    } else {
      p.vx *= s.friction;
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
    }
    if (!p.grounded) p.vx *= P.airDrag;
    p.vx = Math.max(-P.maxRun, Math.min(P.maxRun, p.vx));

    // Jump: buffered, so a press a few frames before landing still counts,
    // and with coyote time, so one a few frames after running off still does.
    if (input.jump) p.buffer = P.bufferFrames;
    else if (p.buffer > 0) p.buffer--;

    if (p.buffer > 0 && (p.grounded || p.coyote > 0)) {
      this.jump(g, p, -(P.jumpBase + P.jumpSpeedBonus * Math.abs(p.vx)));
      CA.game.emit('jump', p);
    }

    // A fumarole under your feet as it fires is a free launch.
    if (p.grounded && p.ledge && p.ledge.kind === 'fumarole'
        && CA.tower.ventState(p.ledge, g.frame) === 'fire') {
      this.jump(g, p, -CA.LEDGE.fumaroleLaunch * P.ventBoost);
      CA.game.emit('launch', p);
    }

    // Move.
    p.x += p.vx;
    const prevFeet = p.y + P.h;

    if (!p.grounded) {
      p.vy = Math.min(P.maxFall, p.vy + P.gravity);
      p.y += p.vy;
    }

    // The vent walls. In the air a rebound keeps nearly all your speed,
    // which is the whole trick: jump at a wall, bounce, and you come back
    // faster than you could have accelerated in the space. On the ground a
    // wall just stops you; bouncing there threw you away from a wall you
    // were still holding the arrow toward.
    const left = CA.WALL;
    const right = CA.W - CA.WALL - P.w;
    const hitWall = (x, into) => {
      p.x = x;
      if (!into) return;
      if (p.grounded) { p.vx = 0; return; }
      p.vx = -p.vx * P.wallRestitution;
      CA.game.emit('wall', p);
    };
    if (p.x < left) hitWall(left, p.vx < 0);
    else if (p.x > right) hitWall(right, p.vx > 0);

    // Still standing? Walking off an edge, or the ledge falling away, both
    // drop you, with a few frames of grace to jump anyway.
    if (p.grounded) {
      const l = p.ledge;
      const onIt = l && !l.falling && p.x + P.w > l.x && p.x < l.x + l.w;
      if (!onIt) {
        p.grounded = false;
        p.coyote = P.coyoteFrames;
        p.takeoffFloor = l ? l.floor : p.takeoffFloor;
        p.ledge = null;
      }
    } else if (p.coyote > 0) {
      p.coyote--;
    }

    // Landing.
    if (!p.grounded && p.vy >= 0) {
      const feet = p.y + P.h;
      for (const l of g.ledges) {
        if (l.falling) continue;
        if (p.x + P.w <= l.x || p.x >= l.x + l.w) continue;
        if (prevFeet <= l.y && feet >= l.y) {
          this.land(g, p, l);
          break;
        }
      }
    }

    if (p.squash > 0) p.squash -= 1;
  },

  land(g, p, l) {
    p.y = l.y - p.P.h;
    p.vy = 0;
    p.grounded = true;
    p.coyote = 0;
    p.ledge = l;
    p.squash = 6;
    if (l.kind === 'crust' && l.crumbleAt < 0) l.crumbleAt = g.frame + p.P.crustFrames;
    CA.score.land(g, l.floor, p.takeoffFloor);
    CA.game.emit('land', l);
  },
};
