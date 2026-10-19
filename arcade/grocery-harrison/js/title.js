// title.js -- the start screen: a painted scene, not a level.
//
// The whole store, not one aisle of it. Harrison stands on the lip of the
// nearest shelf, the size of a cornflake, between a carton and a lemon both
// too big for the screen, looking down a long aisle that runs off into the
// dark under hanging aisle signs: cereal, dairy, produce and the rest. No
// instructions: the title card over it is in index.html.
//
// Browser half only, so it may use Math.random freely.

GH.title = {

  motes: null,
  stock: null,

  init() {
    this.motes = Array.from({ length: 40 }, () => ({
      x: 280 + Math.random() * 160, y: Math.random() * 400,
      v: 0.08 + Math.random() * 0.2, ph: Math.random() * 6.28,
    }));
    // The products on the far shelves, fixed once so they do not shimmer.
    const colors = ['#c0392b', '#2e86c1', '#27ae60', '#d68910', '#8e44ad', '#e2d2ad', '#f7f7f2', '#ffd23a', '#16a085'];
    this.stock = Array.from({ length: 120 }, () => ({
      t: Math.random(), shelf: Math.floor(Math.random() * 4),
      h: 0.5 + Math.random() * 0.5, col: colors[Math.floor(Math.random() * colors.length)],
    }));
  },

  draw(c, t) {
    if (!this.motes) this.init();
    const W = GH.W, H = GH.H;
    const VX = 320, VY = 270;          // where the aisle vanishes, below the title
    const LIP = 404;

    // ---- the dark ---------------------------------------------------------------
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#080a18');
    sky.addColorStop(0.6, '#161a30');
    sky.addColorStop(1, '#241c33');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);

    // ---- the aisle, in perspective -----------------------------------------------
    // Two walls of shelving converging on the vanishing point, and the floor
    // between them. `side` is -1 for the left wall, 1 for the right.
    const wall = (side) => {
      const near = side < 0 ? 0 : W;
      const far = VX + side * 26;
      c.fillStyle = side < 0 ? '#1c2036' : '#191c30';
      c.beginPath();
      c.moveTo(near, 30); c.lineTo(far, VY - 22); c.lineTo(far, VY + 18); c.lineTo(near, LIP + 30);
      c.closePath(); c.fill();
      // Shelf lines, and stock along them.
      for (let k = 0; k < 4; k++) {
        const yn = 90 + k * 82, yf = VY - 16 + k * 9;
        c.strokeStyle = 'rgba(160, 170, 200, 0.18)';
        c.beginPath(); c.moveTo(near, yn); c.lineTo(far, yf); c.stroke();
      }
      for (const s of this.stock) {
        if ((s.shelf + (side < 0 ? 0 : 2)) % 2 && side > 0) continue;
        const u = Math.pow(s.t, 1.6);             // more of them far off
        const x = near + (far - near) * u;
        const yn = 90 + s.shelf * 82, yf = VY - 16 + s.shelf * 9;
        const y = yn + (yf - yn) * u;
        const scale = 1 - u * 0.92;
        const hh = 60 * s.h * scale, ww = 22 * scale;
        c.fillStyle = s.col;
        c.globalAlpha = 0.25 + 0.35 * scale;
        c.fillRect(x - ww / 2, y - hh, ww, hh);
      }
      c.globalAlpha = 1;
    };
    wall(-1);
    wall(1);
    c.fillStyle = '#2b2a3c';
    c.beginPath();
    c.moveTo(VX - 26, VY + 18); c.lineTo(VX + 26, VY + 18); c.lineTo(W, LIP + 30); c.lineTo(0, LIP + 30);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = -6; i <= 6; i++) {
      c.beginPath(); c.moveTo(VX + i * 4, VY + 18); c.lineTo(VX + i * 70, LIP + 30); c.stroke();
    }

    // ---- the aisle signs, hanging, nearest first -----------------------------------
    const signs = ['4  CEREAL', '5  DAIRY', '6  PRODUCE', '8  BAKERY', '9  FROZEN', '11  CANNED'];
    for (let i = signs.length - 1; i >= 0; i--) {
      const d = i + 0.6;
      const s = 1 / (1 + d * 0.62);
      const y = VY - 100 * s;
      const w = 230 * s, h = 34 * s;
      c.fillStyle = '#5b6170';
      c.fillRect(VX - w * 0.35, y - 60 * s, 1, 60 * s);
      c.fillRect(VX + w * 0.35, y - 60 * s, 1, 60 * s);
      c.fillStyle = i === 0 ? '#1d4a3a' : '#1d3a4a';
      c.globalAlpha = 0.45 + 0.55 * s;
      c.fillRect(VX - w / 2, y, w, h);
      c.fillStyle = '#ffe9a8';
      c.font = `${Math.max(4, Math.round(14 * s))}px "Press Start 2P", monospace`;
      c.textAlign = 'center';
      c.fillText(signs[i], VX, y + h * 0.68);
      c.globalAlpha = 1;
    }

    // ---- the light, from a tube overhead ------------------------------------------
    c.save();
    c.globalCompositeOperation = 'lighter';
    const beam = c.createLinearGradient(0, 0, 0, LIP);
    beam.addColorStop(0, 'rgba(255, 240, 210, 0.13)');
    beam.addColorStop(1, 'rgba(255, 240, 210, 0.03)');
    c.fillStyle = beam;
    c.beginPath();
    c.moveTo(300, 0); c.lineTo(360, 0); c.lineTo(430, LIP); c.lineTo(230, LIP);
    c.closePath(); c.fill();
    const pool = c.createRadialGradient(330, LIP + 2, 4, 330, LIP + 2, 120);
    pool.addColorStop(0, 'rgba(255, 236, 200, 0.24)');
    pool.addColorStop(1, 'rgba(255, 236, 200, 0)');
    c.fillStyle = pool;
    c.fillRect(200, LIP - 40, 260, 60);
    c.restore();

    // ---- the near shelf, and what is on it ------------------------------------------
    // A carton on the left and a lemon on the right, both far too big.
    GH.render.drawCarton(c, -70, 150, 96, LIP, 'OAT MILK', '#e2d2ad');
    c.fillStyle = 'rgba(0, 0, 0, 0.25)';
    c.fillRect(-70, 96, 220, LIP - 96);
    const lemon = c.createRadialGradient(560, 300, 20, 600, 330, 170);
    lemon.addColorStop(0, '#fff176');
    lemon.addColorStop(0.7, '#f4d03f');
    lemon.addColorStop(1, '#b7950b');
    c.fillStyle = lemon;
    c.beginPath(); c.ellipse(610, 320, 150, 110, -0.25, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0, 0, 0, 0.3)';
    c.beginPath(); c.ellipse(610, 320, 150, 110, -0.25, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255, 255, 255, 0.25)';
    c.beginPath(); c.ellipse(560, 270, 40, 14, -0.5, 0, Math.PI * 2); c.fill();

    c.fillStyle = '#b7bcc6';
    c.fillRect(0, LIP, W, 5);
    c.fillStyle = '#7d838f';
    c.fillRect(0, LIP + 5, W, 3);
    c.fillStyle = '#2c3140';
    c.fillRect(0, LIP + 8, W, H - LIP - 8);
    c.fillStyle = '#ffd84a';
    c.fillRect(36, LIP + 18, 120, 44);
    c.fillStyle = '#1b1b1b';
    c.font = '20px "Press Start 2P", monospace';
    c.textAlign = 'left';
    c.fillText('$2.99', 46, LIP + 50);
    c.fillStyle = '#ffd84a';
    c.fillRect(490, LIP + 22, 76, 30);
    c.fillStyle = '#1b1b1b';
    c.font = '10px "Press Start 2P", monospace';
    c.fillText('4 FOR', 500, LIP + 42);

    // ---- Harrison, small, looking down the aisle -------------------------------------
    const strumming = (t % 420) > 330;
    c.fillStyle = 'rgba(0, 0, 0, 0.35)';
    c.beginPath(); c.ellipse(330, LIP + 1, 16, 3, 0, 0, Math.PI * 2); c.fill();
    c.save();
    c.translate(330, LIP - 38 + Math.sin(t / 30) * 0.6);
    drawGroceryHarrison(c, -23, 0, strumming, true, t * 16);
    c.restore();

    for (const m of this.motes) {
      m.y -= m.v;
      m.x += Math.sin(t / 60 + m.ph) * 0.15;
      if (m.y < -4) { m.y = LIP; m.x = 260 + Math.random() * 160; }
      c.fillStyle = `rgba(255, 250, 235, ${0.3 + 0.3 * Math.sin(t / 20 + m.ph)})`;
      c.fillRect(m.x, m.y, 1, 1);
    }

    // ---- vignette, and a slow flicker in the tube ------------------------------------
    const flicker = (t % 600) < 8 && (t % 4) < 2 ? 0.08 : 0;
    const v = c.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.85);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, `rgba(0, 0, 0, ${0.6 + flicker})`);
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
  },
};
