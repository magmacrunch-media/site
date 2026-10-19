// foes.js -- everything in an aisle that patrols.
//
// Each foe walks one stretch of one surface (x0 to x1 at height y, x being
// its centre and y its feet), turning at the ends. By kind:
//
//   weevil, curd   land on one from above and it is out; a strum does the
//                  same. Out, it is harmless and can be walked through
//   wheel          a cheese wheel, rolling. From the side it hurts; from
//                  above it bounces you off, higher than a jump; a strum
//                  does nothing to it
//   fly            a fruit fly, in the air: patrols x0 to x1 and bobs `amp`
//                  px round its y. Stomped or strummed, it stops in the air

GH.foes = {

  size(f) {
    if (f.kind === 'wheel') return { w: GH.WHEEL.r * 2, h: GH.WHEEL.r * 2 };
    if (f.kind === 'fly') return { w: GH.FLY.w, h: GH.FLY.h };
    return { w: GH.WEEVIL.w, h: GH.WEEVIL.h };
  },

  update(g) {
    const P = GH.PLAYER;
    const p = g.player;
    for (const f of g.world.foes) {
      if (f.stun > 0) {
        f.stun--;
        continue;
      }
      if (f.kind === 'fly') {
        // Hovering: y is the bob round where it was placed.
        if (f.base === undefined) f.base = f.y;
        f.bob = (f.bob || 0) + GH.FLY.bob;
        f.y = f.base + Math.sin(f.bob) * (f.amp || 0);
        f.x += f.dir * GH.FLY.speed;
      } else {
        f.x += f.dir * (f.speed || GH.WEEVIL.speed);
      }
      if (f.kind === 'wheel') f.spin = (f.spin || 0) + f.dir * (f.speed || 1) / GH.WHEEL.r;
      if (f.x <= f.x0 || f.x >= f.x1) {
        f.x = Math.max(f.x0, Math.min(f.x1, f.x));
        f.dir = -f.dir;
      }
    }

    for (const f of g.world.foes) {
      if (f.stun > 0) continue;
      const { w, h } = this.size(f);
      const x0 = f.x - w / 2, x1 = f.x + w / 2;
      const top = f.y - h;
      if (p.x + P.w <= x0 || p.x >= x1 || p.y + P.h <= top || p.y >= f.y) continue;
      // From above, falling.
      if (p.vy > 0 && p.prevBottom <= top + 6) {
        if (f.kind === 'wheel') {
          p.vy = -GH.WHEEL.bounce;
          p.y = top - P.h;
          GH.game.emit('boing', f);
        } else {
          f.stun = GH.WEEVIL.stun;
          p.vy = -P.stompBounce;
          GH.game.emit('stomp', f);
        }
        continue;
      }
      GH.game.hurt(g, f.x);
    }
  },
};
