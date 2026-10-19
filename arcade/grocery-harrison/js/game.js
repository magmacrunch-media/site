// game.js -- one run of one aisle: start it, step it, finish it.
//
// THIS FILE AND EVERYTHING IT CALLS IS PURE LOGIC. No DOM, no canvas, no
// timers. main.js feeds it one input object per tick and render.js reads the
// state it leaves behind; tools/sim.mjs does the first and skips the second.
// The browser pane pauses requestAnimationFrame when hidden, so a check
// driven through a real page passes by measuring nothing, and the sim is the
// check that cannot.
//
// The input contract is player.js's. Dialogue is the one thing that is not
// stepped: talk() returns the lines and moves the quest on, and main.js
// shows them with adenosine's dialogue system while the world waits.

GH.game = {

  listeners: [],
  on(fn) { this.listeners.push(fn); },
  emit(type, data) { for (const fn of this.listeners) fn(type, data); },

  // `perks` are the upgrades bought at the checkout (shop.js); they become
  // this run's g.stats. The sim passes none, so every route it proves is
  // proven without them.
  create(seed, levelId = 'cereal', perks = []) {
    const level = GH.levels[levelId];
    const stats = GH.shop.stats(perks);
    const world = level.build();
    const start = world.checkpoints[0];
    const worlds = { aisle: world };
    // The cereal aisle hides a second world, the MAGMA CRUNCH bowl. g.world
    // is whichever he is in, and everything else only ever reads g.world.
    if (level.secret === 'bowl') worlds.bowl = GH.bowl.build();
    const g = {
      seed: seed >>> 0,
      rand: GH.rng(seed),
      frame: 0,
      level,
      worlds,
      world,
      room: 'aisle',
      magma: false,        // the MAGMA CRUNCH box has been strummed over
      prize: false,        // and the prize inside found
      back: null,          // where in the aisle he climbed in
      stats,
      player: GH.player.create(start.x, start.y, stats.hearts),
      quest: 'start',      // start | carry | done
      // The quest item: Granny's oat ring, Ally's cap. `state` is giver,
      // held, loose or home; `room` is which world it is in when loose.
      item: { state: 'giver', room: 'aisle', x: 0, y: 0, vx: 0, vy: 0, regrab: 0 },
      checkpoint: 0,
      sugar: 0,
      falls: 0,
      camX: 0,
      complete: false,
      completeT: 0,
      over: false,
    };
    return g;
  },

  step(g, input) {
    if (g.over) return;
    g.frame++;

    this.flakefall(g);
    this.weather(g);
    if (g.room === 'bowl') GH.bowl.update(g);
    GH.player.update(g, input);
    GH.foes.update(g);
    this.itemPhysics(g);
    this.pickups(g);

    const p = g.player;
    if (p.y + GH.PLAYER.h > (g.world.deathY || GH.H + 96)) {
      g.falls++;
      this.emit(g.room === 'bowl' ? 'splash' : 'fall');
      this.respawn(g, false);
    }

    // In and out of the secret.
    if (input.act && g.magma && g.worlds.bowl && GH.bowl.nearBox(g)) this.enter(g);
    else if (g.room === 'bowl' && ((input.left && p.x <= 0) || (input.right && p.x >= g.world.width - GH.PLAYER.w))) this.leave(g);

    if (g.quest === 'carry' && p.carrying && p.grounded && g.world.home) {
      const h = g.world.home;
      const cx = p.x + GH.PLAYER.w / 2;
      if (p.on && p.on.top === h.y && cx >= h.x0 && cx <= h.x1) {
        p.carrying = false;
        g.item.state = 'home';
        g.item.x = (h.x0 + h.x1) / 2;
        g.item.y = h.y;
        g.quest = 'done';
        g.complete = true;
        this.emit('restored');
      }
    }
    if (g.complete && ++g.completeT >= 150) g.over = true;

    this.camera(g);
  },

  // The split box sheds a flake every so often; each drifts to the shelf
  // and is gone. `dy` is how far it moved this frame, so whoever is
  // standing on it moves with it.
  flakefall(g) {
    const w = g.world;
    const F = GH.FLAKEFALL;
    const src = w.flakefall;
    if (!src) return;
    for (const f of w.falling) {
      f.prevY = f.y;
      f.dy = F.vy;
      f.y += F.vy;
    }
    w.falling = w.falling.filter(f => f.y < GH.level.FLOOR_Y - 6);
    if (g.frame >= w.nextFlake) {
      w.nextFlake = g.frame + F.every;
      const x0 = src.x0 + Math.floor(g.rand() * (src.x1 - src.x0 - F.w / 2));
      w.falling.push({ x0, x1: x0 + F.w, y: src.top, prevY: src.top, dy: 0 });
    }
  },

  // The misting system: a stretch of leaves is wet while its mister runs and
  // for a little after, and a wet leaf is slick, by the butter rules.
  mistState(g, m) {
    const t = (g.frame + m.phase) % m.period;
    if (t < m.warn) return 'warn';
    if (t < m.warn + m.on) return 'on';
    if (t < m.warn + m.on + m.dry) return 'drying';
    return 'off';
  },

  weather(g) {
    const mists = g.world.mists;
    if (!mists || !mists.length) return;
    for (const o of g.world.oneways) {
      if (!o.leaf) continue;
      const mid = (o.x0 + o.x1) / 2;
      o.slick = mists.some(m => mid >= m.x0 && mid <= m.x1 && /on|drying/.test(this.mistState(g, m)));
    }
  },

  itemPhysics(g) {
    const r = g.item;
    if (r.state !== 'loose' || r.room !== g.room) return;
    if (r.regrab) r.regrab--;
    const R = GH.ITEM;
    const half = R.w / 2;
    const solids = g.world.solids;
    // The item's box is x +- half, from y - R.h (its top) down to y (its feet).
    const overlaps = s => r.x + half > s.x0 && r.x - half < s.x1 && r.y > s.top && r.y - R.h < s.bottom;

    // Sideways first, against the sides of boxes, as Harrison moves. Without
    // this a knocked-loose item flew into the side of a box, dropped down
    // inside it and came to rest on the shelf where nobody could reach it:
    // about one knock in five near the end of a box, in every aisle.
    r.x += r.vx;
    for (const s of solids) {
      if (!overlaps(s)) continue;
      r.x = r.x < (s.x0 + s.x1) / 2 ? s.x0 - half : s.x1 + half;
      r.vx = -r.vx * 0.3;
    }
    r.x = Math.max(half, Math.min(g.world.width - half, r.x));

    const prev = r.y;
    r.vy = Math.min(r.vy + GH.PLAYER.gravity, GH.PLAYER.maxFall);
    r.y += r.vy;
    let rest = false;
    for (const s of solids.concat(g.world.oneways)) {
      if (s.under) continue;
      const top = GH.level.topOf(s);
      if (r.x + half <= s.x0 || r.x - half >= s.x1) continue;
      if (r.vy >= 0 && prev <= top + 0.5 && r.y >= top) {
        r.y = top;
        rest = true;
        break;
      }
      // Rising into the underside of a box: stop there and fall back.
      if (r.vy < 0 && s.bottom !== undefined && prev - R.h >= s.bottom && r.y - R.h < s.bottom) {
        r.y = s.bottom + R.h;
        r.vy = 0;
      }
    }
    if (rest) { r.vy = 0; r.vx = 0; }

    // The backstop: whatever happened above, it never ends up inside a box.
    // Two boxes side by side can push it from one into the other, so if it
    // is still buried, it goes on top of the one it is in.
    for (const s of solids) {
      if (overlaps(s)) {
        r.y = s.top;
        r.vx = r.vy = 0;
      }
    }
    // Into the pit or the milk: it turns up where you would.
    if (r.y > (g.world.deathY || GH.H + 96)) {
      const c = this.spawnPoint(g);
      r.x = c.x + 40;
      r.y = c.y;
      r.vx = r.vy = 0;
    }
  },

  pickups(g) {
    const P = GH.PLAYER;
    const p = g.player;
    const w = g.world;
    const touch = (x0, y0, x1, y1) => p.x < x1 && p.x + P.w > x0 && p.y < y1 && p.y + P.h > y0;

    for (const s of w.sugar) {
      if (s.taken) continue;
      const S = GH.SUGAR;
      if (touch(s.x - S.w / 2, s.y - S.h / 2, s.x + S.w / 2, s.y + S.h / 2)) {
        s.taken = true;
        g.sugar++;
        this.emit('sugar', s);
      }
    }

    w.checkpoints.forEach((c, i) => {
      if (i > g.checkpoint && p.x + P.w / 2 >= c.x && p.grounded) {
        g.checkpoint = i;
        this.emit('checkpoint', c);
      }
    });

    // The prize inside.
    if (w.prize && !w.prize.taken && touch(w.prize.x - 10, w.prize.y - 20, w.prize.x + 10, w.prize.y)) {
      w.prize.taken = true;
      g.prize = true;
      this.emit('prize');
    }

    const r = g.item;
    if (r.state === 'loose' && r.room === g.room && r.regrab === 0) {
      const R = GH.ITEM;
      if (touch(r.x - R.w / 2, r.y - R.h, r.x + R.w / 2, r.y)) {
        r.state = 'held';
        p.carrying = true;
        this.emit('regrab');
      }
    }
  },

  hurt(g, fromX) {
    const P = GH.PLAYER;
    const p = g.player;
    if (p.invuln > 0) return;
    p.hearts--;
    p.invuln = P.invuln;
    p.knock = P.knock;
    const away = p.x + P.w / 2 < fromX ? -1 : 1;
    p.vx = away * 3;
    p.vy = -4;
    p.grounded = false;
    p.on = null;
    // A hit knocks him off a vine too.
    p.vine = null;
    p.vineCool = GH.VINE.cool;
    if (p.carrying) this.drop(g, away);
    this.emit('hurt');
    if (p.hearts <= 0) this.respawn(g, true);
  },

  // The item is knocked out of his arms and bounces off the way he was hit.
  drop(g, away) {
    const p = g.player;
    p.carrying = false;
    const r = g.item;
    r.state = 'loose';
    r.room = g.room;
    r.x = p.x + GH.PLAYER.w / 2;
    r.y = p.y + GH.PLAYER.h / 2;
    r.vx = away * 1.6;
    r.vy = -4;
    r.regrab = GH.ITEM.regrab;
    this.emit('drop');
  },

  // No game over: back to the last price tag with full hearts. A fall
  // keeps the item in your arms; running out of hearts already dropped it.
  // The last price tag in the aisle; the rim of the bowl in the bowl.
  spawnPoint(g) {
    return g.world.entry || g.world.checkpoints[g.checkpoint];
  },

  // Through the tipped box and into the milk bowl.
  enter(g) {
    const p = g.player;
    g.back = { x: p.x, y: p.y };
    g.room = 'bowl';
    g.world = g.worlds.bowl;
    const e = g.world.entry;
    p.x = e.x;
    p.y = e.y - GH.PLAYER.h;
    p.vx = p.vy = 0;
    p.on = null;
    p.grounded = false;
    if (p.carrying) g.item.room = 'bowl';
    g.camX = 0;
    this.emit('bowl');
  },

  // Off either rim and back out on the shelf beside the box.
  leave(g) {
    const p = g.player;
    g.room = 'aisle';
    g.world = g.worlds.aisle;
    p.x = g.back.x;
    p.y = g.back.y;
    p.vx = p.vy = 0;
    p.on = null;
    p.grounded = false;
    if (p.carrying) g.item.room = 'aisle';
    g.camX = Math.max(0, Math.min(g.world.width - GH.W, p.x - GH.W * GH.CAMERA.lead));
    this.emit('aisle');
  },

  respawn(g, outOfHearts) {
    const c = this.spawnPoint(g);
    const carrying = g.player.carrying;
    g.player = GH.player.create(c.x, c.y, g.stats.hearts);
    g.player.carrying = carrying;
    g.player.invuln = GH.PLAYER.invuln;
    this.emit('respawn', { outOfHearts });
  },

  camera(g) {
    const C = GH.CAMERA;
    const p = g.player;
    const target = Math.max(0, Math.min(g.world.width - GH.W, p.x + GH.PLAYER.w / 2 - GH.W * C.lead));
    g.camX += (target - g.camX) * C.ease;
  },

  // ---- Talking ---------------------------------------------------------------
  npcNear(g) {
    const p = g.player;
    const cx = p.x + GH.PLAYER.w / 2;
    for (const n of g.world.npcs) {
      if (Math.abs(n.x - cx) <= GH.PLAYER.talkReach && Math.abs(n.y - (p.y + GH.PLAYER.h)) < 8) return n;
    }
    return null;
  },

  // What the nearby NPC says now, moving the quest on as a side effect.
  // Null when nobody is in reach. The words are in dialogue.js.
  talk(g) {
    const n = this.npcNear(g);
    if (!n) return null;
    const p = g.player;
    const Q = GH.DIALOGUE[g.level.id].talk;
    let lines;
    if (g.quest === 'start') {
      lines = Q.start;
      g.quest = 'carry';
      g.item.state = 'held';
      p.carrying = true;
      this.emit('quest', 'carry');
    } else if (g.quest === 'carry') {
      lines = g.item.state === 'loose' ? Q.loose : Q.carry;
    } else {
      lines = Q.done;
    }
    return { name: n.name, dialogue: lines };
  },

  // A fridge door blowing this frame, and how hard at x.
  gustAt(g, x) {
    for (const d of g.world.gusts || []) {
      if (x < d.x0 || x > d.x1) continue;
      if ((g.frame + d.phase) % d.period < d.open) return d.push;
    }
    return 0;
  },

  gustOpen(g, d) {
    return (g.frame + d.phase) % d.period < d.open;
  },
};
