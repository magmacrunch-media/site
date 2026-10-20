// render.js -- draws what game.js leaves behind. Never feeds back into it,
// so it may use Math.random for effects.
//
// World things are drawn in world coordinates under a translate by the
// camera; the HUD, banners and dialogue are drawn in screen coordinates.

GH.render = {

  ctx: null,
  t: 0,
  fx: [],          // { x, y, text, color, until }   world coordinates
  banner: null,    // { text, sub, until }
  sparkles: [],

  C: {
    wall: '#141a2e',
    wallLow: '#1f2a44',
    light: 'rgba(220, 240, 255, 0.07)',
    shelfTop: '#c9ccd1',
    shelfLip: '#8d939c',
    shelfFace: '#3b4250',
    tag: '#ffd84a',
    flake: '#e8a93a',
    flakeDark: '#b9771c',
    sugar: '#f4f7ff',
    hud: '#fff6dc',
    accent: '#ff6a1f',
    heart: '#ff4d6d',
    ring: '#d9a85b',
    ringDark: '#a8772f',
  },

  init(canvas) {
    this.ctx = canvas.getContext('2d');
    GH.game.on((type, data) => this.onEvent(type, data));
  },

  onEvent(type, data) {
    const g = GH.main.g;
    if (!g) return;
    const p = g.player;
    const over = (text, color) => this.fx.push({
      x: p.x + GH.PLAYER.w / 2, y: p.y - 10, text, color, until: this.t + 50,
    });
    // The words are in dialogue.js; only the colours and timings are here.
    const S = GH.DIALOGUE.shout, B = GH.DIALOGUE.banners;
    const card = (b, frames, prefix = '') => { this.banner = { text: prefix + b.text, sub: b.sub, until: this.t + frames }; };
    if (type === 'sugar') this.fx.push({ x: data.x, y: data.y - 6, text: '+1', color: this.C.sugar, until: this.t + 40 });
    else if (type === 'stomp') over(S.stomp, this.C.tag);
    else if (type === 'hurt') over(S.hurt, this.C.heart);
    else if (type === 'drop') over(S.drop, this.C.ring);
    else if (type === 'boing') over(S.boing, this.C.tag);
    else if (type === 'regrab') over(S.regrab, this.C.ring);
    else if (type === 'checkpoint') over(S.checkpoint, this.C.tag);
    else if (type === 'fall') card(B.fall, 70);
    else if (type === 'respawn' && data.outOfHearts) card(B.squashed, 80);
    else if (type === 'magma') card(B.magma, 130);
    else if (type === 'bowl') card(B.bowl, 120);
    else if (type === 'prize') card(B.prize, 170);
    else if (type === 'splash') card(B.splash, 60);
    else if (type === 'restored') card(B.restored, 200, g.level.name + ' ');
  },

  // ---- the frame ------------------------------------------------------------
  drawPlay(g, hud = true) {
    if (g.room === 'bowl') return this.drawBowlRoom(g, hud);
    const c = this.ctx;
    this.t++;
    const cam = Math.round(g.camX);
    this.drawBackdrop(c, g, cam);
    c.save();
    c.translate(-cam, 0);
    if (g.world.flakefall) this.drawFlakefallSource(c, g);
    if (g.worlds.bowl) this.drawMagmaInAisle(c, g);
    if (g.world.gusts.length) this.drawFridgeDoors(c, g);
    if (g.world.mists) this.drawMisters(c, g);
    this.drawSticky(c, g);
    this.drawSolids(c, g);
    if (g.world.vines) this.drawVines(c, g);
    for (const o of g.world.oneways) this.drawOneway(c, o);
    for (const f of g.world.falling) this.drawFlake(c, f.x0, f.x1, f.y, Math.sin((f.y + f.x0) / 30) * 0.08);
    this.drawHome(c, g);
    this.drawCheckpoints(c, g);
    this.drawSugar(c, g);
    for (const n of g.world.npcs) this.drawNpc(c, n, g);
    const it = g.item;
    if ((it.state === 'loose' && it.room === 'aisle') || it.state === 'home') this.drawItem(c, g, it.x, it.y, it.state === 'loose' && it.regrab > 0);
    for (const f of g.world.foes) this.drawFoe(c, f);
    if (g.world.gusts.length) this.drawGustFog(c, g);
    if (g.world.mists) this.drawRain(c, g);
    this.drawHarrison(c, g);
    this.drawFx(c);
    c.restore();
    this.drawShelfFront(c, g, cam);
    if (hud) this.drawHud(c, g);
    this.drawBanner(c);
  },

  // The store at night, and the giant boxes on the shelf behind, moving at
  // half the camera's speed.
  drawBackdrop(c, g, cam) {
    const C = this.C;
    const theme = g.level.theme;
    const grad = c.createLinearGradient(0, 0, 0, GH.H);
    grad.addColorStop(0, theme.wall);
    grad.addColorStop(1, theme.wallLow);
    c.fillStyle = grad;
    c.fillRect(0, 0, GH.W, GH.H);
    // Fluorescent tubes, far overhead.
    c.fillStyle = C.light;
    for (let x = -((cam * 0.2) % 260); x < GH.W; x += 260) c.fillRect(x, 0, 160, 24);

    const par = 0.5;
    c.save();
    c.translate(-Math.round(cam * par), 0);
    const backShelf = 400;
    c.fillStyle = '#2a3247';
    c.fillRect(cam * par - 10, backShelf, GH.W + 20, 8);
    c.globalAlpha = 0.55;
    for (const b of g.world.backdrop) {
      for (let k = 0; k < 2; k++) {
        const x = b.x + k * 1150;
        if (g.level.id === 'dairy') this.drawCarton(c, x, x + b.w, backShelf - b.h, backShelf, b.label, b.color);
        else if (g.level.id === 'produce') this.drawProduceBin(c, x, x + b.w, backShelf, b.label);
        else this.drawBox(c, x, x + b.w, backShelf - b.h, backShelf, b.label, b.color, 0.9);
      }
    }
    c.globalAlpha = 1;
    c.restore();
    // Push the back shelf into the dark, so the boxes you can stand on are
    // never confused with the ones you cannot.
    c.fillStyle = 'rgba(14, 18, 34, 0.5)';
    c.fillRect(0, 0, GH.W, GH.H);
  },

  drawBox(c, x0, x1, top, bottom, label, color, scale = 1) {
    const w = x1 - x0, h = bottom - top;
    c.fillStyle = color;
    c.fillRect(x0, top, w, h);
    c.fillStyle = 'rgba(255, 255, 255, 0.18)';
    c.fillRect(x0, top, w, 5);
    c.fillStyle = 'rgba(0, 0, 0, 0.25)';
    c.fillRect(x1 - Math.min(12, w * 0.1), top, Math.min(12, w * 0.1), h);
    // A label panel and the name, as big as fits.
    if (h > 34) {
      c.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const py = top + Math.min(18, h * 0.15);
      c.fillRect(x0 + 8, py, w - 24, 22 * scale);
      c.fillStyle = '#222';
      c.textAlign = 'center';
      let size = 10;
      c.font = `${size}px "Press Start 2P", monospace`;
      while (size > 5 && c.measureText(label).width > w - 32) {
        size--;
        c.font = `${size}px "Press Start 2P", monospace`;
      }
      c.fillText(label, x0 + (w - 16) / 2, py + 15 * scale);
      // A bowl of the stuff, drawn on every box: the universal cereal art.
      if (h > 90) {
        const bx = x0 + (w - 16) / 2, by = top + h * 0.62;
        c.fillStyle = 'rgba(255, 255, 255, 0.8)';
        c.beginPath(); c.ellipse(bx, by, w * 0.22, 10, 0, 0, Math.PI); c.fill();
        c.fillStyle = this.C.flake;
        for (let i = 0; i < 5; i++) c.fillRect(bx - w * 0.16 + i * w * 0.07, by - 6 - (i % 2) * 3, 8, 6);
      }
    }
  },

  drawSolids(c, g) {
    for (const s of g.world.solids) {
      if (s.shelf) continue;
      if (s.shape === 'carton') this.drawCarton(c, s.x0, s.x1, s.top, s.bottom, s.label, s.color);
      else if (s.shape === 'cup') this.drawCup(c, s.x0, s.x1, s.top, s.bottom, s.label, s.color);
      else if (s.shape === 'block') this.drawBlock(c, s.x0, s.x1, s.top, s.bottom, s.label, s.color);
      else if (s.shape === 'crate') this.drawCrate(c, s.x0, s.x1, s.top, s.bottom, s.label, s.fruit);
      else if (s.shape === 'clamshell') this.drawClamshell(c, s.x0, s.x1, s.top, s.bottom, s.label);
      else this.drawBox(c, s.x0, s.x1, s.top, s.bottom, s.label, s.color);
      if (s.spill) {
        // The tipped box spills sugar out of its open end.
        c.fillStyle = this.C.sugar;
        c.beginPath();
        c.moveTo(s.x1, s.top + 30); c.lineTo(s.x1 + 40, s.bottom); c.lineTo(s.x1, s.bottom); c.closePath();
        c.fill();
      }
    }
    // The shelf itself: a steel surface. The pit is simply where it stops.
    for (const s of g.world.solids) {
      if (!s.shelf) continue;
      c.fillStyle = this.C.shelfTop;
      c.fillRect(s.x0, s.top, s.x1 - s.x0, 6);
      c.fillStyle = this.C.shelfLip;
      c.fillRect(s.x0, s.top + 6, s.x1 - s.x0, 3);
    }
  },

  // The front edge of the shelf, in front of everything: the price-tag rail.
  drawShelfFront(c, g, cam) {
    const C = this.C;
    const y = GH.level.FLOOR_Y + 9;
    for (const s of g.world.solids) {
      if (!s.shelf) continue;
      const x0 = s.x0 - cam, x1 = s.x1 - cam;
      c.fillStyle = C.shelfFace;
      c.fillRect(x0, y, x1 - x0, GH.H - y);
      c.fillStyle = '#4a5263';
      c.fillRect(x0, y + 6, x1 - x0, 20);
    }
    c.font = '7px "Press Start 2P", monospace';
    c.textAlign = 'center';
    for (let wx = 60; wx < g.world.width; wx += 150) {
      if (g.world.pits.some(([a, b]) => wx > a - 30 && wx < b + 30)) continue;
      const x = wx - cam;
      if (x < -40 || x > GH.W + 40) continue;
      c.fillStyle = C.tag;
      c.fillRect(x - 22, y + 8, 44, 16);
      c.fillStyle = '#222';
      c.fillText('$' + (2 + (wx % 7) * 0.5).toFixed(2), x, y + 20);
    }
  },

  drawFlake(c, x0, x1, y, tilt) {
    const w = x1 - x0;
    c.save();
    c.translate(x0 + w / 2, y + 5);
    c.rotate(tilt);
    c.fillStyle = this.C.flakeDark;
    c.beginPath();
    c.ellipse(0, 2, w / 2, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = this.C.flake;
    c.beginPath();
    c.moveTo(-w / 2, -1);
    c.quadraticCurveTo(-w / 4, -8, 0, -4);
    c.quadraticCurveTo(w / 4, -9, w / 2, -2);
    c.quadraticCurveTo(w / 3, 5, 0, 4);
    c.quadraticCurveTo(-w / 3, 6, -w / 2, -1);
    c.fill();
    c.fillStyle = 'rgba(255, 240, 200, 0.5)';
    c.fillRect(-w / 5, -4, w / 6, 2);
    c.restore();
  },

  drawFlakefallSource(c, g) {
    const s = g.world.flakefall;
    // A split box hanging over the edge of the shelf above.
    c.fillStyle = '#d1b23a';
    c.fillRect(s.x0 - 30, -10, s.x1 - s.x0 + 60, s.top + 6);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(s.x0 - 30, s.top - 6, s.x1 - s.x0 + 60, 6);
    c.fillStyle = '#222';
    c.font = '7px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillText(s.label, (s.x0 + s.x1) / 2, 18);
  },

  drawSticky(c, g) {
    for (const s of g.world.sticky) {
      c.fillStyle = this.C.sugar;
      c.beginPath();
      c.moveTo(s.x0, GH.level.FLOOR_Y);
      c.quadraticCurveTo((s.x0 + s.x1) / 2, GH.level.FLOOR_Y - 26, s.x1, GH.level.FLOOR_Y);
      c.fill();
      for (let i = 0; i < 6; i++) {
        const x = s.x0 + 15 + ((i * 37 + this.t) % (s.x1 - s.x0 - 30));
        c.fillStyle = `rgba(150, 200, 255, ${0.4 + 0.4 * Math.sin(this.t / 10 + i)})`;
        c.fillRect(x, GH.level.FLOOR_Y - 10 - (i % 3) * 4, 2, 2);
      }
    }
  },

  drawHome(c, g) {
    const h = g.world.home;
    if (h.kind === 'ally') {
      this.drawAlly(c, h, g);
    } else if (h.kind === 'clamshell') {
      this.drawClamshellHome(c, h);
    } else {
      // The open flap of the TOASTED O's.
      c.fillStyle = '#7a2a1e';
      c.fillRect(h.x0, h.y - 4, h.x1 - h.x0, 6);
      c.fillStyle = '#d0573f';
      c.beginPath();
      c.moveTo(h.x0, h.y); c.lineTo(h.x0 - 18, h.y - 26); c.lineTo(h.x0 + 4, h.y - 26); c.closePath(); c.fill();
    }
    // And an arrow while the item is still on its way.
    if (g.quest !== 'done') {
      const bob = Math.sin(this.t / 10) * 4;
      c.fillStyle = this.C.tag;
      c.font = '8px "Press Start 2P", monospace';
      c.textAlign = 'center';
      c.fillText('▼', (h.x0 + h.x1) / 2, h.y - 46 + bob);
      c.fillText('HOME', (h.x0 + h.x1) / 2, h.y - 58 + bob);
    }
  },

  drawCheckpoints(c, g) {
    g.world.checkpoints.forEach((cp, i) => {
      const on = i <= g.checkpoint;
      c.fillStyle = '#9a8f7a';
      c.fillRect(cp.x - 1, cp.y - 46, 3, 46);
      c.fillStyle = on ? this.C.tag : '#6b6b6b';
      c.beginPath();
      c.moveTo(cp.x + 2, cp.y - 46); c.lineTo(cp.x + 30, cp.y - 46); c.lineTo(cp.x + 36, cp.y - 38);
      c.lineTo(cp.x + 30, cp.y - 30); c.lineTo(cp.x + 2, cp.y - 30); c.closePath(); c.fill();
      c.fillStyle = '#222';
      c.font = '6px "Press Start 2P", monospace';
      c.textAlign = 'left';
      c.fillText(on ? 'SAVED' : 'SALE', cp.x + 4, cp.y - 35);
    });
  },

  drawSugar(c, g) {
    for (const s of g.world.sugar) {
      if (s.taken) continue;
      const tw = 0.6 + 0.4 * Math.sin(this.t / 8 + s.x);
      c.fillStyle = `rgba(244, 247, 255, ${tw})`;
      c.beginPath();
      c.moveTo(s.x, s.y - 6); c.lineTo(s.x + 5, s.y); c.lineTo(s.x, s.y + 6); c.lineTo(s.x - 5, s.y); c.closePath();
      c.fill();
      c.fillStyle = 'rgba(150, 200, 255, 0.8)';
      c.fillRect(s.x - 1, s.y - 2, 2, 2);
    }
  },

  // ---- by kind ---------------------------------------------------------------
  // Each level's things are drawn by what they are, so a new aisle adds a
  // drawer for its kinds and touches nothing above.
  drawOneway(c, o) {
    if (o.style === 'butter') this.drawButter(c, o);
    else if (o.style === 'leaf') this.drawLeaf(c, o);
    else if (o.style === 'wire') this.drawWire(c, o);
    else this.drawFlake(c, o.x0, o.x1, o.y, 0);
  },

  drawNpc(c, n, g) {
    if (n.kind === 'ollie') this.drawOllie(c, n, g);
    else if (n.kind === 'pete') this.drawPete(c, n, g);
    else this.drawGranny(c, n, g);
  },

  drawFoe(c, f) {
    if (f.kind === 'wheel') this.drawWheel(c, f);
    else if (f.kind === 'fly') this.drawFly(c, f);
    else if (f.kind === 'curd') this.drawCurd(c, f);
    else this.drawWeevil(c, f);
  },

  // The quest item, standing with its feet at (x, y).
  drawItem(c, g, x, y, blink) {
    if (g.level.item === 'cap') this.drawCap(c, x, y, blink);
    else if (g.level.item === 'berry') this.drawBerry(c, x, y, blink);
    else this.drawRing(c, x, y, blink);
  },

  // A label to talk, over whoever is close enough.
  talkPrompt(c, g, n, y) {
    if (GH.game.npcNear(g) !== n || GH.main.state !== 'playing') return;
    c.fillStyle = this.C.hud;
    c.font = '7px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillText('X: TALK', n.x, y);
  },

  // Granny Granola: a cluster of oats and nuts in a shawl, with spectacles.
  drawGranny(c, n, g) {
    const x = n.x, y = n.y;
    const bob = Math.sin(this.t / 25) * 1.5;
    const lumps = [[0, -22, 14], [-10, -14, 10], [10, -13, 10], [-6, -30, 9], [7, -31, 8], [0, -8, 11]];
    for (const [dx, dy, r] of lumps) {
      c.fillStyle = '#b98a4b';
      c.beginPath(); c.arc(x + dx, y + dy + bob, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8f6430';
      c.fillRect(x + dx - 2, y + dy + bob - 2, 3, 2);
    }
    c.fillStyle = '#7d3c98';
    c.beginPath(); c.moveTo(x - 16, y - 18 + bob); c.lineTo(x + 16, y - 18 + bob); c.lineTo(x, y - 4 + bob); c.closePath(); c.fill();
    c.strokeStyle = '#222';
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(x - 5, y - 26 + bob, 3.5, 0, Math.PI * 2); c.arc(x + 5, y - 26 + bob, 3.5, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1;
    c.fillStyle = '#222';
    c.fillRect(x - 6, y - 27 + bob, 2, 2);
    c.fillRect(x + 4, y - 27 + bob, 2, 2);
    // The ring she is holding, until she hands it over.
    if (g.item.state === 'giver') this.drawRing(c, x + 22, y, false);
    // A prompt when he is close enough to talk.
    if (GH.game.npcNear(g) === n && GH.main.state === 'playing') {
      c.fillStyle = this.C.hud;
      c.font = '7px "Press Start 2P", monospace';
      c.textAlign = 'center';
      c.fillText('X: TALK', x, y - 52 + bob);
    }
  },

  // The oat ring, standing on its edge with its feet at (x, y).
  drawRing(c, x, y, blink) {
    if (blink && Math.floor(this.t / 4) % 2 === 0) return;
    const R = GH.ITEM;
    c.lineWidth = 9;
    c.strokeStyle = this.C.ringDark;
    c.beginPath(); c.arc(x + 1, y - R.h / 2 + 1, R.w / 2 - 5, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = this.C.ring;
    c.beginPath(); c.arc(x, y - R.h / 2, R.w / 2 - 5, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1;
    c.fillStyle = 'rgba(255, 240, 200, 0.6)';
    c.fillRect(x - 6, y - R.h + 4, 5, 2);
  },

  drawWeevil(c, wv) {
    const Wv = GH.WEEVIL;
    c.save();
    c.translate(wv.x, wv.y - Wv.h / 2);
    if (wv.stun > 0) {
      c.rotate(Math.PI);
      c.translate(0, -4);
    }
    c.scale(wv.dir, 1);
    c.fillStyle = '#3e2a1c';
    c.beginPath(); c.ellipse(0, 0, Wv.w / 2, Wv.h / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a3d27';
    c.fillRect(-6, -6, 8, 3);
    // The long weevil snout.
    c.strokeStyle = '#3e2a1c';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(Wv.w / 2 - 2, -2); c.lineTo(Wv.w / 2 + 9, 4); c.stroke();
    c.lineWidth = 1.5;
    const step = Math.sin(this.t / 4) * 2;
    for (const lx of [-7, 0, 7]) {
      c.beginPath(); c.moveTo(lx, 4); c.lineTo(lx + (wv.stun > 0 ? Math.sin(this.t / 3 + lx) * 3 : step), Wv.h / 2 + 3); c.stroke();
    }
    c.fillStyle = '#fff';
    c.fillRect(Wv.w / 2 - 7, -5, 3, 3);
    c.restore();
    c.lineWidth = 1;
    if (wv.stun > 0) {
      c.fillStyle = this.C.tag;
      c.font = '8px sans-serif';
      c.textAlign = 'center';
      c.fillText('★', wv.x + Math.cos(this.t / 8) * 10, wv.y - Wv.h - 6);
    }
  },

  drawHarrison(c, g) {
    const p = g.player;
    const P = GH.PLAYER;
    if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return;
    const cx = p.x + P.w / 2;
    if (p.carrying) this.drawItem(c, g, cx, p.y - 2, false);
    c.save();
    c.translate(cx, p.y + P.h - 38);
    if (p.facing < 0) c.scale(-1, 1);
    if (!p.grounded) c.rotate(p.vy * 0.01);
    drawGroceryHarrison(c, -23, 0, p.strumT > 0, true, this.t * 16);
    if (g.prize) this.drawPrizeGuitar(c, p.strumT > 0);
    c.restore();
    if (p.strumT > 0) {
      const r = GH.STRUM.radius * (1 - p.strumT / GH.STRUM.frames);
      const a = p.strumT / GH.STRUM.frames;
      c.strokeStyle = g.prize ? `rgba(255, 61, 110, ${a})` : `rgba(255, 235, 59, ${a})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(cx, p.y + P.h / 2, r, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 1;
    }
  },

  drawFx(c) {
    c.font = '8px "Press Start 2P", monospace';
    c.textAlign = 'center';
    this.fx = this.fx.filter(f => f.until > this.t);
    for (const f of this.fx) {
      const left = f.until - this.t;
      c.globalAlpha = Math.min(1, left / 20);
      c.fillStyle = f.color;
      c.fillText(f.text, f.x, f.y - (50 - left) * 0.4);
    }
    c.globalAlpha = 1;
  },

  drawBanner(c) {
    const b = this.banner;
    if (!b || b.until <= this.t) return;
    c.fillStyle = 'rgba(0, 0, 0, 0.55)';
    c.fillRect(0, 120, GH.W, 56);
    c.textAlign = 'center';
    c.fillStyle = this.C.tag;
    c.font = '16px "Press Start 2P", monospace';
    c.fillText(b.text, GH.W / 2, 147);
    c.fillStyle = this.C.hud;
    c.font = '8px "Press Start 2P", monospace';
    c.fillText(b.sub, GH.W / 2, 166);
  },

  drawHud(c, g) {
    const C = this.C;
    const p = g.player;
    c.fillStyle = 'rgba(0, 0, 0, 0.55)';
    c.fillRect(0, 0, GH.W, 30);
    for (let i = 0; i < g.stats.hearts; i++) {
      const x = 14 + i * 20, y = 10;
      c.fillStyle = i < p.hearts ? C.heart : '#444';
      c.beginPath();
      c.arc(x, y, 4.5, Math.PI, 0); c.arc(x + 8, y, 4.5, Math.PI, 0);
      c.lineTo(x + 4, y + 11); c.closePath(); c.fill();
    }
    c.font = '9px "Press Start 2P", monospace';
    c.textAlign = 'left';
    c.fillStyle = C.sugar;
    // Out of every crystal in the game, the secret's included: a total that
    // never reaches the top is the hint that something is hidden.
    const all = Object.values(g.worlds).reduce((n, w) => n + w.sugar.length, 0);
    c.fillText('◆ ' + g.sugar + '/' + all, 84, 20);
    const G = GH.DIALOGUE[g.level.id].goal;
    const goal = g.quest === 'start' ? G.start
      : g.quest === 'carry' ? (p.carrying ? G.carry : G.loose)
      : G.done;
    c.font = '7px "Press Start 2P", monospace';
    c.fillStyle = C.hud;
    c.fillText(goal, 190, 19);
    // The strum's cooldown, as a pick filling up.
    const ready = 1 - p.strumCool / g.stats.strumCooldown;
    c.fillStyle = '#444';
    c.fillRect(GH.W - 74, 9, 60, 8);
    c.fillStyle = ready >= 1 ? C.tag : '#a08a2a';
    c.fillRect(GH.W - 74, 9, 60 * ready, 8);
    c.fillStyle = C.hud;
    c.fillText('C', GH.W - 88, 18);
  },

  // The adenosine dialogue state, as a box at the bottom of the screen.
  drawDialogue(c, d) {
    if (!d || !d.active) return;
    c.fillStyle = 'rgba(10, 8, 20, 0.92)';
    c.fillRect(20, GH.H - 130, GH.W - 40, 110);
    c.strokeStyle = this.C.tag;
    c.strokeRect(20.5, GH.H - 129.5, GH.W - 41, 109);
    c.textAlign = 'left';
    c.fillStyle = this.C.tag;
    c.font = '9px "Press Start 2P", monospace';
    c.fillText(d.speaker && d.speaker.name ? d.speaker.name : '', 36, GH.H - 106);
    c.fillStyle = this.C.hud;
    c.font = '8px "Press Start 2P", monospace';
    this.wrap(c, d.currentLine || '', 36, GH.H - 84, GH.W - 80, 16);
    if (Math.floor(this.t / 20) % 2 === 0) {
      c.textAlign = 'right';
      c.fillText(d.hasMoreLines ? '▼' : 'X', GH.W - 34, GH.H - 30);
    }
  },

  wrap(c, text, x, y, width, lh) {
    let line = '';
    for (const word of text.split(' ')) {
      const test = line ? line + ' ' + word : word;
      if (c.measureText(test).width > width && line) {
        c.fillText(line, x, y);
        line = word;
        y += lh;
      } else line = test;
    }
    if (line) c.fillText(line, x, y);
  },

  // Where the directory's sign and rows are, shared with main.tapDirectory().
  DIR: { sx: 150, sy: 40, sw: 340, sh: 346, row0: 126, rowH: 34 },

  // Which directory row a canvas point is on, or -1.
  directoryRowAt(x, y) {
    const D = this.DIR;
    if (x < D.sx + 20 || x > D.sx + D.sw - 20) return -1;
    const i = Math.floor((y - (D.row0 - 22)) / D.rowH);
    return i >= 0 && i < GH.level.DIRECTORY.length ? i : -1;
  },

  // The store directory: the big sign by the entrance, one row per aisle.
  // Tiny Harrison stands under it, looking up.
  drawDirectory(c, pick, restored, sugar = 0) {
    const C = this.C;
    this.t++;
    const sky = c.createLinearGradient(0, 0, 0, GH.H);
    sky.addColorStop(0, '#0b0d1e');
    sky.addColorStop(1, '#22233a');
    c.fillStyle = sky;
    c.fillRect(0, 0, GH.W, GH.H);
    // The sign hangs on two chains from the dark.
    const { sx, sy, sw, sh } = this.DIR;
    c.strokeStyle = '#6b7280';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(sx + 40, 0); c.lineTo(sx + 40, sy); c.moveTo(sx + sw - 40, 0); c.lineTo(sx + sw - 40, sy); c.stroke();
    c.lineWidth = 1;
    c.fillStyle = '#1d4a3a';
    c.fillRect(sx, sy, sw, sh);
    c.strokeStyle = '#e8d9a0';
    c.lineWidth = 3;
    c.strokeRect(sx + 6, sy + 6, sw - 12, sh - 12);
    c.lineWidth = 1;
    c.textAlign = 'center';
    c.fillStyle = '#ffe9a8';
    c.font = '14px "Press Start 2P", monospace';
    c.fillText('STORE DIRECTORY', GH.W / 2, sy + 40);
    c.fillStyle = 'rgba(255, 233, 168, 0.5)';
    c.fillRect(sx + 30, sy + 52, sw - 60, 2);

    GH.level.DIRECTORY.forEach((row, i) => {
      const y = this.DIR.row0 + i * this.DIR.rowH;
      const built = !!row.id || !!row.checkout;
      const name = row.checkout ? GH.DIALOGUE.checkout.title : row.id ? GH.levels[row.id].name : row.name;
      if (i === pick) {
        c.fillStyle = 'rgba(255, 233, 168, 0.16)';
        c.fillRect(sx + 20, y - 22, sw - 40, 32);
        c.fillStyle = C.tag;
        c.fillText('▶', sx + 36, y);
      }
      c.textAlign = 'left';
      c.font = '12px "Press Start 2P", monospace';
      c.fillStyle = built ? '#fff6dc' : 'rgba(255, 246, 220, 0.35)';
      c.fillText(row.checkout ? ' $' : String(row.aisle).padStart(2, ' '), sx + 54, y);
      c.fillText(name, sx + 100, y);
      c.textAlign = 'right';
      c.font = '8px "Press Start 2P", monospace';
      if (row.checkout) {
        c.fillStyle = this.C.sugar;
        c.font = '9px "Press Start 2P", monospace';
        c.fillText('◆ ' + sugar, sx + sw - 30, y);
      } else if (!built) {
        c.fillStyle = 'rgba(255, 246, 220, 0.35)';
        c.fillText('COMING SOON', sx + sw - 30, y - 2);
      } else if (restored[row.id]) {
        c.fillStyle = '#7ee08a';
        c.font = '12px "Press Start 2P", monospace';
        c.fillText('✓', sx + sw - 34, y);
      }
      c.textAlign = 'center';
    });

    // The chord: six slots, one string each, lit once its aisle is restored.
    const found = GH.level.strings(restored);
    const cy = sy + sh - 28;
    c.textAlign = 'left';
    c.font = '7px "Press Start 2P", monospace';
    c.fillStyle = 'rgba(255, 233, 168, 0.7)';
    c.fillText(GH.DIALOGUE.chord.title, sx + 30, cy + 3);
    c.textAlign = 'center';
    GH.level.STRINGS.forEach((s, i) => {
      const x = sx + 150 + i * 30;
      c.strokeStyle = 'rgba(255, 233, 168, 0.5)';
      c.beginPath(); c.arc(x, cy, 10, 0, Math.PI * 2); c.stroke();
      if (found[i]) {
        c.fillStyle = '#ffe9a8';
        c.beginPath(); c.arc(x, cy, 10, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#1d4a3a';
        c.font = '8px "Press Start 2P", monospace';
        c.fillText(s.name, x, cy + 4);
      }
    });

    // Harrison, small, under the sign.
    const hx = GH.W / 2, floor = 448;
    c.fillStyle = '#c9ccd1';
    c.fillRect(0, floor, GH.W, 4);
    c.fillStyle = '#2c3140';
    c.fillRect(0, floor + 4, GH.W, GH.H - floor);
    c.save();
    c.translate(hx, floor - 38 + Math.sin(this.t / 30) * 0.6);
    drawGroceryHarrison(c, -23, 0, false, true, this.t * 16);
    c.restore();
    c.fillStyle = 'rgba(255, 246, 220, 0.5)';
    c.font = '7px "Press Start 2P", monospace';
    c.fillText(GH.touch.seen ? 'TAP AN AISLE' : 'UP / DOWN  CHOOSE     ENTER  GO', GH.W / 2, sy + sh + 26);
  },

  // Behind the title card: a painted scene of its own, in title.js.
  drawTitle(c) {
    GH.title.draw(c, this.t++);
  },

  drawOver(c, g) {
    this.banner = null;
    this.drawPlay(g, false);
    c.fillStyle = 'rgba(0, 0, 0, 0.72)';
    c.fillRect(0, 0, GH.W, GH.H);
    c.textAlign = 'center';
    c.fillStyle = this.C.tag;
    c.font = '18px "Press Start 2P", monospace';
    c.fillText(g.level.title, GH.W / 2, 120);
    c.fillText('RESTORED', GH.W / 2, 148);
    c.fillStyle = this.C.hud;
    c.font = '9px "Press Start 2P", monospace';
    const secs = Math.floor(g.frame / GH.TICK_FPS);
    const all = Object.values(g.worlds).reduce((n, w) => n + w.sugar.length, 0);
    const lines = [
      ['SUGAR FOUND', `${g.sugar} / ${all}`],
      ['TIME', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
      ['FALLS', String(g.falls)],
    ];
    // Only shown once found: a row that says "not found" would give it away.
    // New crystals banked for the checkout, once each, for good.
    lines.push([GH.DIALOGUE.checkout.banked, '+' + (GH.main.lastBanked || 0)]);
    if (g.prize) lines.push(['PRIZE INSIDE', 'FOUND']);
    // The string this aisle gave back.
    const s = GH.level.STRINGS[g.level.string];
    if (g.quest === 'done' && s) lines.push([GH.DIALOGUE.chord.found, s.name]);
    lines.forEach(([k, v], i) => {
      c.textAlign = 'left';
      c.fillText(k, 190, 210 + i * 26);
      c.textAlign = 'right';
      c.fillText(v, 450, 210 + i * 26);
    });
    c.textAlign = 'center';
    c.font = '7px "Press Start 2P", monospace';
    c.fillStyle = 'rgba(255, 246, 220, 0.7)';
    c.fillText('the store directory has the other aisles', GH.W / 2, 310);
  },

  drawPaused(c, g) {
    this.drawPlay(g);
    this.t--;
    c.fillStyle = 'rgba(0, 0, 0, 0.6)';
    c.fillRect(0, 0, GH.W, GH.H);
    c.textAlign = 'center';
    c.fillStyle = this.C.hud;
    c.font = '16px "Press Start 2P", monospace';
    c.fillText('PAUSED', GH.W / 2, 150);
    c.font = '8px "Press Start 2P", monospace';
    const keys = [
      'ARROWS / A D      run',
      'SPACE / Z / UP    jump (hold for higher)',
      'X / E             talk',
      'C / Q             strum: stuns pests',
      'P / ESC           pause',
      'M                 sound on / off',
    ];
    keys.forEach((k, i) => c.fillText(k, GH.W / 2, 200 + i * 20));
  },
};
