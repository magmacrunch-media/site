// touch.js -- playing on a phone.
//
// CALDERA's two-thumb layout, with two buttons more because Harrison does
// two things more. The screen splits down the middle:
//
//   LEFT half    a horizontal stick: run towards whichever side of where the
//                finger landed it has moved to, past a small dead zone; the
//                anchor trails the finger so reversing is a short drag back
//   RIGHT half   jump, for as long as the finger is down, so a short tap is a
//                short hop and a held one goes higher, as on the keys
//   two buttons  in the bottom-right corner: TALK (X) and STRUM (C)
//
// Talking advances on a tap anywhere. The directory takes taps on its rows,
// from a mouse too, since a list wants clicking. Mouse pointers are otherwise
// ignored, so a desktop click never steers. The guides are only drawn once a
// finger has touched the screen.

GH.touch = {

  T: {
    split: 0.5,
    dead: 10,        // canvas px before a drag counts as a direction
    leash: 34,       // how far the anchor lets the finger get before following
    buttonR: 26,
  },

  seen: false,
  steerId: null,
  jumpId: null,
  originX: 0,
  x: 0,
  y: 0,
  dir: 0,
  jumpPress: false,
  act: false,
  strum: false,
  flash: { act: 0, strum: 0 },

  // The two buttons, in canvas coordinates.
  buttons() {
    const r = this.T.buttonR;
    return {
      act: { x: GH.W - 128, y: GH.H - 50, r, label: 'X', name: 'TALK' },
      strum: { x: GH.W - 52, y: GH.H - 92, r, label: 'C', name: 'STRUM' },
    };
  },

  init(canvas, main) {
    const T = this.T;
    const toCanvas = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * GH.W / r.width, y: (e.clientY - r.top) * GH.H / r.height };
    };
    const hit = (p, b) => (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= (b.r + 8) ** 2;

    canvas.addEventListener('pointerdown', e => {
      const p = toCanvas(e);
      // The directory answers mouse and touch alike.
      if (main.state === 'directory') {
        e.preventDefault();
        main.tapDirectory(p.x, p.y);
        return;
      }
      if (main.state === 'checkout') {
        e.preventDefault();
        main.tapCheckout(p.x, p.y);
        return;
      }
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      if (!this.seen) {
        this.seen = true;
        main.syncUi();
      }
      if (main.state === 'paused') { main.setState('playing'); return; }
      if (main.state === 'talking') { main.advanceTalk(); return; }
      if (main.state !== 'playing') return;

      const B = this.buttons();
      if (hit(p, B.act)) { this.act = true; this.flash.act = 8; return; }
      if (hit(p, B.strum)) { this.strum = true; this.flash.strum = 8; return; }

      if (p.x < GH.W * T.split && this.steerId === null) {
        this.steerId = e.pointerId;
        this.originX = this.x = p.x;
        this.y = p.y;
        this.dir = 0;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      } else if (p.x >= GH.W * T.split && this.jumpId === null) {
        this.jumpId = e.pointerId;
        this.jumpPress = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== this.steerId) return;
      const p = toCanvas(e);
      this.x = p.x;
      this.y = p.y;
      let dx = p.x - this.originX;
      if (Math.abs(dx) > T.leash) {
        this.originX = p.x - Math.sign(dx) * T.leash;
        dx = p.x - this.originX;
      }
      this.dir = Math.abs(dx) > T.dead ? Math.sign(dx) : 0;
    });

    const lift = e => {
      if (e.pointerId === this.steerId) {
        this.steerId = null;
        this.dir = 0;
      }
      if (e.pointerId === this.jumpId) this.jumpId = null;
    };
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
  },

  // This frame's presses, consumed.
  take() {
    const out = { jumpPress: this.jumpPress, act: this.act, strum: this.strum };
    this.jumpPress = this.act = this.strum = false;
    return out;
  },

  reset() {
    this.steerId = this.jumpId = null;
    this.dir = 0;
    this.jumpPress = this.act = this.strum = false;
  },

  // Faint guides and the two buttons, only once touch is in use.
  draw(c) {
    if (!this.seen) return;
    const T = this.T;
    c.save();
    c.font = '8px "Press Start 2P", monospace';
    c.textAlign = 'center';
    if (this.steerId !== null) {
      c.strokeStyle = 'rgba(255, 246, 220, 0.35)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(this.originX - T.leash, this.y);
      c.lineTo(this.originX + T.leash, this.y);
      c.stroke();
      c.fillStyle = 'rgba(255, 246, 220, 0.5)';
      c.beginPath(); c.arc(this.x, this.y, 14, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = 'rgba(255, 246, 220, 0.2)';
      c.fillText('< DRAG >', GH.W * 0.25, GH.H - 18);
    }
    c.fillStyle = `rgba(255, 246, 220, ${this.jumpId !== null ? 0.45 : 0.2})`;
    c.fillText('HOLD: JUMP', GH.W * 0.62, GH.H - 18);
    for (const [key, b] of Object.entries(this.buttons())) {
      const lit = this.flash[key] > 0;
      c.fillStyle = `rgba(10, 8, 20, ${lit ? 0.7 : 0.45})`;
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = `rgba(255, 216, 74, ${lit ? 0.95 : 0.55})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(255, 246, 220, 0.85)';
      c.font = '12px "Press Start 2P", monospace';
      c.fillText(b.label, b.x, b.y + 5);
      c.font = '6px "Press Start 2P", monospace';
      c.fillText(b.name, b.x, b.y + b.r + 11);
      if (this.flash[key] > 0) this.flash[key]--;
    }
    c.restore();
  },
};
