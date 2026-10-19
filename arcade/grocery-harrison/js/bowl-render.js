// bowl-render.js -- drawing the MAGMA CRUNCH secret, added onto GH.render.
//
// The box and the palette are the ones in magmacrunch.com's about-page
// animation (website animations/cereal.js): black box, pink edges, the
// stacked yellow-on-cyan MAGMA CRUNCH logo, a cyan volcano on the front, and
// loops, stars and rocks pouring into milk. Redrawn here at this game's
// scale rather than copied, since that file is built for a 300 px canvas.

Object.assign(GH.render, {

  MC: {
    pink: '#FF3D6E',
    cyan: '#00F5FF',
    yellow: '#ffe03a',
    dark: '#0A0518',
    slate: '#6A5A52',
    milk: '#F5E6D0',
    milkLight: '#FFF5E6',
    milkDark: '#E0CEB8',
    boxBlack: '#09090c',
    boxEdge: '#ff6cb2',
    boxLabel: '#110006',
  },

  pourBits: [],
  splashBits: [],

  // The box, standing with its feet at (x, y), w wide and h tall, turned
  // `angle` about its bottom-left corner.
  drawMagmaBox(c, x, y, w, h, angle) {
    const M = this.MC;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.fillStyle = M.boxBlack;
    c.fillRect(0, -h, w, h);
    c.strokeStyle = M.boxEdge;
    c.lineWidth = 2;
    c.strokeRect(1, -h + 1, w - 2, h - 2);
    c.lineWidth = 1;
    // The volcano on the front: a cyan ring, a dark sky, a pink cone.
    const cx = w / 2, cy = -h * 0.36, r = Math.min(w, h) * 0.3;
    c.fillStyle = M.cyan;
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = M.dark;
    c.beginPath(); c.arc(cx, cy, r * 0.86, 0, Math.PI * 2); c.fill();
    c.fillStyle = M.pink;
    c.beginPath();
    c.moveTo(cx - r * 0.7, cy + r * 0.5); c.lineTo(cx - r * 0.14, cy - r * 0.35);
    c.lineTo(cx + r * 0.14, cy - r * 0.35); c.lineTo(cx + r * 0.7, cy + r * 0.5);
    c.closePath(); c.fill();
    c.fillStyle = M.yellow;
    c.fillRect(cx - r * 0.1, cy - r * 0.5, r * 0.2, r * 0.18);
    // The stacked logo: dark, then cyan, then yellow, each a pixel up-left.
    const size = Math.max(6, Math.floor(w / 9));
    c.font = `${size}px "Press Start 2P", monospace`;
    c.textAlign = 'center';
    const ly = -h * 0.78;
    for (const [d, col] of [[2, M.boxLabel], [1, M.cyan], [0, M.yellow]]) {
      c.fillStyle = col;
      c.fillText('MAGMA', cx + d, ly + d);
      c.fillText('CRUNCH', cx + d, ly + size + 5 + d);
    }
    c.restore();
  },

  // One piece of the cereal: a loop, a star or a rock.
  drawBit(c, kind, x, y, s, rot, color) {
    const M = this.MC;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    if (kind === 'loop') {
      c.strokeStyle = color;
      c.lineWidth = s * 0.45;
      c.beginPath(); c.arc(0, 0, s * 0.6, 0, Math.PI * 2); c.stroke();
    } else if (kind === 'star') {
      c.fillStyle = M.yellow;
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
    } else {
      c.fillStyle = M.slate;
      c.beginPath();
      c.moveTo(-s, 0); c.lineTo(-s * 0.4, -s * 0.8); c.lineTo(s * 0.6, -s * 0.6); c.lineTo(s, s * 0.2); c.lineTo(0, s * 0.8);
      c.closePath(); c.fill();
      c.fillStyle = M.pink;
      c.fillRect(-s * 0.2, -s * 0.2, s * 0.5, 2);
    }
    c.restore();
  },

  // ---- in the aisle ------------------------------------------------------------
  drawMagmaInAisle(c, g) {
    const B = GH.bowl.BOX;
    const w = B.x1 - B.x0, h = 150, floor = GH.level.FLOOR_Y;
    if (!g.magma) {
      // Standing at the back of the shelf, in the shadow, with a pink glint
      // now and then. That glint is the only hint there is.
      c.globalAlpha = 0.85;
      this.drawMagmaBox(c, B.x0, floor, w, h, 0);
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(10, 8, 24, 0.5)';
      c.fillRect(B.x0, floor - h, w, h);
      const k = this.t % 300;
      if (k < 24) {
        const a = Math.sin(k / 24 * Math.PI);
        c.fillStyle = `rgba(255, 108, 178, ${a})`;
        const gx = B.x1 - 3, gy = floor - h + 4;
        c.fillRect(gx - 6, gy, 13, 1);
        c.fillRect(gx, gy - 6, 1, 13);
      }
      return;
    }
    // Tipped forward to the right, one bottom corner on the shelf and the
    // open top up in the air, pouring: the about page, life-size. Turned
    // `tip` about its bottom-left corner, which is lifted so the bottom-right
    // corner rests on the shelf.
    const tip = 1.27;
    const lift = w * Math.sin(tip);
    this.drawMagmaBox(c, B.x0, floor - lift, w, h, tip);
    const mouthX = B.x0 + h * Math.sin(tip) + w * Math.cos(tip) / 2;
    const mouthY = floor - lift - h * Math.cos(tip) + w * Math.sin(tip) / 2;
    this.pour(c, mouthX, mouthY, floor - 4, 0.5);
    // A heap of what came out.
    const heap = [[0, 'loop', this.MC.pink], [14, 'star'], [-10, 'rock'], [26, 'loop', this.MC.cyan], [8, 'loop', this.MC.yellow], [36, 'rock']];
    heap.forEach(([dx, kind, col], i) => this.drawBit(c, kind, mouthX + dx, floor - 5 - (i % 3) * 5, 6, i, col));
    if (GH.bowl.nearBox(g) && GH.main.state === 'playing') {
      c.fillStyle = this.C.hud;
      c.font = '7px "Press Start 2P", monospace';
      c.textAlign = 'center';
      c.fillText('X: CLIMB IN', (B.x0 + B.x1) / 2 + 40, floor - 170);
    }
  },

  // A stream of cereal from (x, y) down to `bottom`. Render-only, so it may
  // be random: what you can stand on in the bowl is in bowl.js.
  pour(c, x, y, bottom, rate) {
    const M = this.MC;
    if (Math.random() < rate) {
      const kinds = ['loop', 'loop', 'star', 'rock'];
      this.pourBits.push({
        x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.3) * 1.2, vy: Math.random(),
        kind: kinds[Math.floor(Math.random() * kinds.length)], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        color: [M.pink, M.cyan, M.yellow][Math.floor(Math.random() * 3)], bottom,
      });
    }
    this.pourBits = this.pourBits.filter(b => b.y < b.bottom);
    for (const b of this.pourBits) {
      b.vy += 0.3;
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.vr;
      if (b.y >= b.bottom) this.splash(b.x, b.bottom);
      this.drawBit(c, b.kind, b.x, b.y, 5, b.rot, b.color);
    }
    this.drawSplashes(c);
  },

  splash(x, y) {
    for (let i = 0; i < 4; i++) {
      this.splashBits.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: -1.5 - Math.random() * 2.5, life: 1 });
    }
  },

  drawSplashes(c) {
    this.splashBits = this.splashBits.filter(s => s.life > 0);
    for (const s of this.splashBits) {
      s.vy += 0.35;
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.06;
      c.fillStyle = `rgba(255, 245, 230, ${s.life})`;
      c.fillRect(s.x, s.y, 3, 3);
    }
  },

  // ---- in the bowl -------------------------------------------------------------
  drawBowlRoom(g, hud) {
    const c = this.ctx;
    const M = this.MC;
    const w = g.world;
    this.t++;
    const cam = Math.round(g.camX);
    const milkY = GH.bowl.MILK_Y;

    const sky = c.createLinearGradient(0, 0, 0, GH.H);
    sky.addColorStop(0, '#0d0a20');
    sky.addColorStop(1, '#2a1838');
    c.fillStyle = sky;
    c.fillRect(0, 0, GH.W, GH.H);
    // The far wall of the bowl, curving up out of the milk.
    c.save();
    c.translate(-Math.round(cam * 0.35), 0);
    c.fillStyle = '#b9b0cc';
    c.beginPath();
    c.ellipse(560, milkY + 40, 900, 330, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.fillStyle = '#9d93b5';
    c.beginPath();
    c.ellipse(560, milkY + 40, 860, 290, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.strokeStyle = M.cyan;
    c.lineWidth = 6;
    c.beginPath();
    c.ellipse(560, milkY + 40, 896, 326, 0, Math.PI * 1.04, Math.PI * 1.96);
    c.stroke();
    c.lineWidth = 1;
    c.restore();

    c.save();
    c.translate(-cam, 0);

    // The box overhead, upended with its open top towards the milk, pouring,
    // as on the about page. Turned about its bottom-left corner; the mouth is
    // the middle of its top edge, wherever that has ended up.
    const tip = Math.PI / 2 + 0.5, bw = 110, bh = 150, px = 70, py = 30;
    this.drawMagmaBox(c, px, py, bw, bh, tip);
    const mx = px + bh * Math.sin(tip) + bw * Math.cos(tip) / 2;
    const my = py - bh * Math.cos(tip) + bw * Math.sin(tip) / 2;
    this.pour(c, mx, my, milkY, 0.6);

    for (const s of w.solids) {
      c.fillStyle = '#f4f1fa';
      c.fillRect(s.x0, s.top, s.x1 - s.x0, s.bottom - s.top);
      c.fillStyle = M.cyan;
      c.fillRect(s.x0, s.top + 8, s.x1 - s.x0, 4);
      c.fillStyle = 'rgba(0, 0, 0, 0.12)';
      c.fillRect(s.x0, s.top, s.x1 - s.x0, 3);
    }
    // Back to the aisle, off either rim.
    c.font = '7px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillStyle = '#7a6f8f';
    c.fillText('◀ AISLE', 40, 330);
    c.fillText('AISLE ▶', w.width - 40, 330);

    // The milk, rippling.
    c.fillStyle = M.milkDark;
    c.fillRect(150, milkY + 6, w.width - 300, GH.H - milkY);
    c.fillStyle = M.milk;
    c.beginPath();
    c.moveTo(150, GH.H);
    for (let x = 150; x <= w.width - 150; x += 8) {
      c.lineTo(x, milkY + Math.sin(x * 0.03 + this.t * 0.06) * 3 + Math.sin(x * 0.011 - this.t * 0.04) * 2);
    }
    c.lineTo(w.width - 150, GH.H);
    c.closePath();
    c.fill();
    c.fillStyle = M.milkLight;
    for (let x = 160; x < w.width - 160; x += 46) {
      c.fillRect(x + ((this.t / 2) % 46), milkY + 4 + Math.sin(x + this.t / 20) * 2, 14, 2);
    }

    // What you can stand on.
    for (const o of w.oneways) {
      const mid = (o.x0 + o.x1) / 2, wd = o.x1 - o.x0;
      if (o.kind === 'loop') {
        const col = o.poured ? M.cyan : [M.pink, M.yellow, M.cyan][o.id.charCodeAt(1) % 3];
        c.save();
        c.translate(mid, o.y + 6);
        c.scale(1, 0.35);
        c.strokeStyle = col;
        c.lineWidth = 16;
        c.beginPath(); c.arc(0, 0, wd / 2 - 8, 0, Math.PI * 2); c.stroke();
        c.restore();
      } else if (o.kind === 'star') {
        this.drawBit(c, 'star', mid, o.y + 8, wd / 2, 0);
        c.fillStyle = 'rgba(255, 224, 58, 0.25)';
        c.beginPath(); c.ellipse(mid, o.y + 10, wd / 2 + 6, 6, 0, 0, Math.PI * 2); c.fill();
      } else if (o.kind === 'rock') {
        if (o.under) continue;
        this.drawBit(c, 'rock', mid, o.y + 10, wd / 2, 0);
        const glow = o.sink / GH.MAGMA.sinkMax;
        c.fillStyle = `rgba(255, 61, 110, ${0.2 + glow * 0.6})`;
        c.fillRect(mid - 12, o.y + 6, 24, 2);
        c.fillRect(mid - 4, o.y + 12, 14, 2);
      } else {
        // A floating volcano piece: the box art as a raft.
        c.fillStyle = M.cyan;
        c.beginPath(); c.ellipse(mid, o.y + 8, wd / 2, 12, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = M.dark;
        c.beginPath(); c.ellipse(mid, o.y + 8, wd / 2 - 5, 8, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = M.pink;
        c.beginPath(); c.moveTo(mid - 16, o.y + 12); c.lineTo(mid - 3, o.y + 2); c.lineTo(mid + 3, o.y + 2); c.lineTo(mid + 16, o.y + 12); c.closePath(); c.fill();
      }
    }

    // The prize inside, on the far rim until it is taken.
    const pz = w.prize;
    if (!pz.taken) {
      const bob = Math.sin(this.t / 15) * 2;
      this.drawPick(c, pz.x, pz.y - 14 + bob, 1.4);
      c.fillStyle = M.yellow;
      c.font = '6px "Press Start 2P", monospace';
      c.textAlign = 'center';
      c.fillText('PRIZE INSIDE!', pz.x, pz.y - 34 + bob);
    }

    this.drawSugar(c, g);
    if (g.item.state === 'loose' && g.item.room === 'bowl') this.drawItem(c, g, g.item.x, g.item.y, g.item.regrab > 0);
    this.drawHarrison(c, g);
    this.drawFx(c);
    c.restore();
    if (hud) this.drawHud(c, g);
    this.drawBanner(c);
  },

  // The prize: a little plastic guitar pick, pink with a cyan rim.
  drawPick(c, x, y, s) {
    const M = this.MC;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = M.cyan;
    c.beginPath(); c.moveTo(-9, -8); c.quadraticCurveTo(0, -13, 9, -8); c.quadraticCurveTo(7, 3, 0, 11); c.quadraticCurveTo(-7, 3, -9, -8); c.fill();
    c.fillStyle = M.pink;
    c.beginPath(); c.moveTo(-7, -7); c.quadraticCurveTo(0, -11, 7, -7); c.quadraticCurveTo(5, 2, 0, 8); c.quadraticCurveTo(-5, 2, -7, -7); c.fill();
    c.fillStyle = 'rgba(255, 255, 255, 0.6)';
    c.fillRect(-4, -7, 3, 2);
    c.restore();
  },

  // Once found, his guitar is MAGMA CRUNCH colours: drawn over the body and
  // strings of moonlight-drift's drawing, in its own coordinates.
  drawPrizeGuitar(c, strumming) {
    const M = this.MC;
    const x = -23, y = 0;
    c.fillStyle = M.pink;
    c.beginPath(); c.ellipse(x + 15, y + 20, 6, 8, -0.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = M.dark;
    c.beginPath(); c.arc(x + 15, y + 20, 3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = M.cyan;
    c.lineWidth = 0.6;
    for (let i = 0; i < 4; i++) {
      c.beginPath(); c.moveTo(x + 11 + i * 0.5, y + 5); c.lineTo(x + 15 + i * 0.3, y + 25); c.stroke();
    }
    c.lineWidth = 1;
    if (strumming) {
      c.fillStyle = 'rgba(0, 245, 255, 0.8)';
      c.fillRect(x + 4, y + 14, 2, 2);
    }
  },
});
