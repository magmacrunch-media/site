// dairy-render.js -- drawing the dairy case's things, added onto GH.render.
//
// Cartons, yogurt cups, cheese and egg blocks, butter pats, wire shelves,
// the fridge doors and their cold breath, Ollie Oatmilk, Ally Almond and
// her cap, curds and the cheese wheel. Render-only, so Math.random is fine.

Object.assign(GH.render, {

  D: {
    butter: '#ffe27a',
    butterDark: '#e2b93f',
    wire: '#b9c3cc',
    cap: '#3f7fd6',
    capDark: '#285a9e',
    curd: '#f2efd2',
    curdSour: '#b9c98a',
    rind: '#e08a1e',
    cheese: '#ffd23a',
    glass: 'rgba(170, 220, 255, 0.10)',
  },

  // Fit a label to a width, from 10 px down.
  fitLabel(c, text, x, y, width) {
    let size = 10;
    c.font = `${size}px "Press Start 2P", monospace`;
    while (size > 5 && c.measureText(text).width > width) {
      size--;
      c.font = `${size}px "Press Start 2P", monospace`;
    }
    c.fillText(text, x, y);
  },

  // A gable-topped carton. Its flat top is the fin, which is what you stand
  // on; the roof slopes are drawn just below it.
  drawCarton(c, x0, x1, top, bottom, label, color) {
    const w = x1 - x0, h = bottom - top;
    c.fillStyle = color;
    c.fillRect(x0, top + 18, w, h - 18);
    c.fillStyle = 'rgba(0, 0, 0, 0.12)';
    c.beginPath();
    c.moveTo(x0, top + 22); c.lineTo(x0 + 8, top + 5); c.lineTo(x1 - 8, top + 5); c.lineTo(x1, top + 22);
    c.closePath(); c.fill();
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x0 + 2, top + 20); c.lineTo(x0 + 9, top + 6); c.lineTo(x1 - 9, top + 6); c.lineTo(x1 - 2, top + 20);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
    c.fillRect(x0 + 6, top, w - 12, 6);
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
    c.fillRect(x1 - Math.min(10, w * 0.1), top + 20, Math.min(10, w * 0.1), h - 20);
    if (h > 50) {
      c.fillStyle = 'rgba(255, 255, 255, 0.85)';
      c.fillRect(x0 + 6, top + 30, w - 16, 20);
      c.fillStyle = '#1d3b5a';
      c.textAlign = 'center';
      this.fitLabel(c, label, x0 + (w - 10) / 2, top + 44, w - 22);
      // A blue band, as on every carton in every store.
      c.fillStyle = 'rgba(40, 90, 160, 0.55)';
      c.fillRect(x0, top + 58, w, 6);
    }
  },

  drawCup(c, x0, x1, top, bottom, label, color) {
    const w = x1 - x0;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x0, top); c.lineTo(x1, top); c.lineTo(x1 - 6, bottom); c.lineTo(x0 + 6, bottom);
    c.closePath(); c.fill();
    // The foil lid is the top you stand on.
    c.fillStyle = '#d6dbe2';
    c.fillRect(x0 - 2, top, w + 4, 4);
    c.fillStyle = 'rgba(0, 0, 0, 0.15)';
    c.fillRect(x0 + 3, top + 14, w - 6, 12);
    c.fillStyle = '#4a2a3a';
    c.textAlign = 'center';
    this.fitLabel(c, label, (x0 + x1) / 2, top + 24, w - 8);
  },

  drawBlock(c, x0, x1, top, bottom, label, color) {
    const w = x1 - x0, h = bottom - top;
    c.fillStyle = color;
    c.fillRect(x0, top, w, h);
    c.fillStyle = 'rgba(255, 255, 255, 0.25)';
    c.fillRect(x0, top, w, 4);
    if (/EGG/.test(label)) {
      // An egg carton: the bumps of the eggs inside along the top.
      c.fillStyle = '#b39d74';
      for (let x = x0 + 12; x < x1 - 6; x += 22) {
        c.beginPath(); c.arc(x, top + 2, 9, Math.PI, 0); c.fill();
      }
    } else {
      // Cheese, with holes.
      c.fillStyle = 'rgba(160, 100, 0, 0.25)';
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.arc(x0 + 14 + ((i * 37) % (w - 24)), top + 14 + ((i * 23) % Math.max(10, h - 24)), 4 + (i % 3) * 2, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = 'rgba(255, 255, 255, 0.85)';
    c.fillRect(x0 + 8, top + 12, w - 16, 18);
    c.fillStyle = '#3a2a10';
    c.textAlign = 'center';
    this.fitLabel(c, label, (x0 + x1) / 2, top + 25, w - 22);
  },

  drawButter(c, o) {
    const D = this.D;
    const w = o.x1 - o.x0;
    c.fillStyle = D.butterDark;
    c.fillRect(o.x0, o.y + 4, w, 9);
    c.fillStyle = D.butter;
    c.fillRect(o.x0, o.y, w, 7);
    // The shine that says "slippery".
    const k = (this.t * 1.5 + o.x0) % (w + 40) - 20;
    c.fillStyle = 'rgba(255, 255, 255, 0.7)';
    c.fillRect(o.x0 + Math.max(0, k), o.y + 1, Math.min(10, w - Math.max(0, k)), 2);
  },

  drawWire(c, o) {
    const D = this.D;
    c.strokeStyle = D.wire;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(o.x0, o.y + 1); c.lineTo(o.x1, o.y + 1);
    c.moveTo(o.x0, o.y + 6); c.lineTo(o.x1, o.y + 6);
    for (let x = o.x0 + 4; x < o.x1; x += 10) { c.moveTo(x, o.y + 1); c.lineTo(x, o.y + 6); }
    c.stroke();
    c.lineWidth = 1;
  },

  // The fridge doors: glass panels in front of the case. While one is open
  // it is drawn swung out, with cold light spilling from behind it.
  drawFridgeDoors(c, g) {
    const floor = GH.level.FLOOR_Y;
    for (const d of g.world.gusts) {
      const open = GH.game.gustOpen(g, d);
      if (open) {
        const glow = c.createLinearGradient(d.x0, 0, d.x1, 0);
        glow.addColorStop(0, 'rgba(200, 240, 255, 0.05)');
        glow.addColorStop(1, 'rgba(200, 240, 255, 0.22)');
        c.fillStyle = glow;
        c.fillRect(d.x0, 60, d.x1 - d.x0, floor - 60);
        // Swung out towards you: a narrow bright edge at the hinge side.
        c.fillStyle = 'rgba(220, 245, 255, 0.35)';
        c.fillRect(d.x1 - 26, 50, 26, floor - 50);
        c.fillStyle = '#9fb3c4';
        c.fillRect(d.x1 - 26, 50, 3, floor - 50);
      } else {
        c.fillStyle = this.D.glass;
        c.fillRect(d.x0, 60, d.x1 - d.x0, floor - 60);
        c.strokeStyle = 'rgba(180, 200, 215, 0.35)';
        c.lineWidth = 3;
        c.strokeRect(d.x0, 60, d.x1 - d.x0, floor - 60);
        c.lineWidth = 1;
        // The handle.
        c.fillStyle = '#9fb3c4';
        c.fillRect(d.x0 + 10, 200, 5, 90);
      }
    }
  },

  // Cold air pouring out of an open door, in front of everything.
  drawGustFog(c, g) {
    for (const d of g.world.gusts) {
      if (!GH.game.gustOpen(g, d)) continue;
      for (let i = 0; i < 18; i++) {
        const span = d.x1 - d.x0;
        const x = d.x1 - ((this.t * 4 + i * 53) % span) * (d.push < 0 ? 1 : -1) - (d.push < 0 ? 0 : span);
        const y = 120 + ((i * 71) % 300) + Math.sin(this.t / 12 + i) * 6;
        c.fillStyle = 'rgba(235, 248, 255, 0.22)';
        c.fillRect(x, y, 30 + (i % 4) * 10, 3);
      }
    }
  },

  // Ollie Oatmilk: a small oat milk carton with a worried face.
  drawOllie(c, n, g) {
    const x = n.x, y = n.y;
    const bob = Math.sin(this.t / 22) * 1.2;
    const w = 30, h = 44;
    this.drawCarton(c, x - w / 2, x + w / 2, y - h + bob, y, '', '#e2d2ad');
    c.fillStyle = 'rgba(255, 255, 255, 0.9)';
    c.fillRect(x - 12, y - 22 + bob, 24, 9);
    c.fillStyle = '#5a4a2a';
    c.font = '5px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillText('OAT', x, y - 15 + bob);
    // The face, above the label.
    c.fillStyle = '#222';
    c.fillRect(x - 7, y - 30 + bob, 3, 3);
    c.fillRect(x + 4, y - 30 + bob, 3, 3);
    c.fillRect(x - 3, y - 25 + bob, 6, 1);
    // Eyebrows up: he would rather be anywhere but DAIRY.
    c.fillRect(x - 8, y - 33 + bob, 4, 1);
    c.fillRect(x + 4, y - 33 + bob, 4, 1);
    if (g.item.state === 'giver') this.drawCap(c, x + 26, y, false);
    this.talkPrompt(c, g, n, y - 56 + bob);
  },

  // Ally Almond is the ALMOND MILK carton the cap goes home to: her face on
  // its front, shivering until her cap is back.
  drawAlly(c, h, g) {
    const cx = (h.x0 + h.x1) / 2;
    const cold = g.quest !== 'done';
    const jit = cold ? Math.sin(this.t * 1.7) * 1.2 : 0;
    const y = h.y + 82;
    c.fillStyle = '#222';
    c.fillRect(cx - 14 + jit, y, 5, 5);
    c.fillRect(cx + 9 + jit, y, 5, 5);
    if (cold) {
      // Chattering teeth.
      c.fillStyle = '#fff';
      c.fillRect(cx - 7 + jit, y + 12, 14, 4);
      c.fillStyle = '#222';
      for (let i = 0; i < 4; i++) c.fillRect(cx - 7 + i * 4 + jit, y + 12, 1, 4);
    } else {
      c.strokeStyle = '#222';
      c.beginPath(); c.arc(cx, y + 10, 6, 0.2, Math.PI - 0.2); c.stroke();
    }
  },

  // Ally's cap: a blue screw cap, standing on its edge with its feet at (x, y).
  drawCap(c, x, y, blink) {
    if (blink && Math.floor(this.t / 4) % 2 === 0) return;
    const D = this.D;
    c.fillStyle = D.capDark;
    c.fillRect(x - 13, y - 16, 26, 16);
    c.fillStyle = D.cap;
    c.fillRect(x - 13, y - 18, 26, 14);
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 6; i++) c.fillRect(x - 11 + i * 4, y - 16, 1, 10);
    c.fillStyle = 'rgba(255, 255, 255, 0.5)';
    c.fillRect(x - 12, y - 18, 24, 2);
  },

  drawCurd(c, f) {
    const D = this.D;
    const Wv = GH.WEEVIL;
    c.save();
    c.translate(f.x, f.y);
    if (f.stun > 0) {
      c.fillStyle = D.curd;
      c.beginPath(); c.ellipse(0, -3, Wv.w / 2 + 4, 4, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = this.C.tag;
      c.font = '8px sans-serif';
      c.textAlign = 'center';
      c.fillText('★', f.x + Math.cos(this.t / 8) * 10, f.y - 12);
      return;
    }
    const squish = Math.sin(this.t / 6) * 1.5;
    const lumps = [[-7, -8, 8], [5, -9, 9], [0, -14, 8], [-2, -5, 9]];
    for (const [dx, dy, r] of lumps) {
      c.fillStyle = D.curd;
      c.beginPath(); c.ellipse(dx, dy, r + squish * 0.3, r - squish * 0.3, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = D.curdSour;
    c.fillRect(-6, -12, 4, 3);
    c.fillRect(4, -6, 3, 2);
    // A sour look.
    c.fillStyle = '#222';
    c.fillRect(-5 + f.dir * 2, -13, 3, 2);
    c.fillRect(2 + f.dir * 2, -13, 3, 2);
    c.fillRect(-4 + f.dir * 2, -8, 7, 1);
    c.restore();
  },

  drawWheel(c, f) {
    const D = this.D;
    const r = GH.WHEEL.r;
    c.save();
    c.translate(f.x, f.y - r);
    c.rotate(f.spin || 0);
    c.fillStyle = D.rind;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = D.cheese;
    c.beginPath(); c.arc(0, 0, r - 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(180, 110, 0, 0.35)';
    for (const [hx, hy, hr] of [[-6, -5, 4], [7, 3, 3], [-2, 9, 3], [8, -9, 2]]) {
      c.beginPath(); c.arc(hx, hy, hr, 0, Math.PI * 2); c.fill();
    }
    // A wedge cut out of it, so you can see it roll.
    c.fillStyle = '#c9961c';
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r - 5, -0.35, 0.35); c.closePath(); c.fill();
    c.restore();
  },
});
