// touch.js -- playing on a phone: a drag to run, a tap to jump.
//
// The screen splits down the middle. A finger on the LEFT half is a
// horizontal stick: it runs toward whichever side of where it first landed it
// has moved to, past a small dead zone, and the anchor trails the finger so
// reversing never needs more than a short drag back. Any touch on the RIGHT
// half is a jump. Two thumbs, the way the genre has always been played.
//
// Mouse pointers are ignored, so a desktop click never steers. Nothing here is
// drawn until a finger has actually touched the screen.

CA.touch = {

  TOUCH: {
    split: 0.5,      // fraction of the width that steers
    dead: 10,        // canvas px before a drag counts as a direction
    leash: 34,       // how far the anchor lets the finger get before following
  },

  seen: false,       // a finger has touched the canvas at least once
  steerId: null,
  originX: 0,
  x: 0,
  y: 0,
  dir: 0,            // -1, 0 or 1
  jumpQueued: false,
  jumpFlash: 0,

  init(canvas, main) {
    const T = this.TOUCH;
    const toCanvas = e => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * CA.W / r.width, y: (e.clientY - r.top) * CA.H / r.height };
    };

    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      this.seen = true;
      main.syncUi();
      if (main.state === 'paused') { main.togglePause(); return; }
      if (main.state !== 'playing') return;

      const p = toCanvas(e);
      if (p.x < CA.W * T.split && this.steerId === null) {
        this.steerId = e.pointerId;
        this.originX = this.x = p.x;
        this.y = p.y;
        this.dir = 0;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      } else {
        this.jumpQueued = true;
        this.jumpFlash = 8;
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
      if (e.pointerId !== this.steerId) return;
      this.steerId = null;
      this.dir = 0;
    };
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
  },

  takeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  },

  reset() {
    this.steerId = null;
    this.dir = 0;
    this.jumpQueued = false;
  },

  // Faint guides over the play field, only once touch is in use.
  draw(c) {
    if (!this.seen) return;
    const T = this.TOUCH;
    c.save();
    if (this.steerId !== null) {
      c.strokeStyle = 'rgba(255,217,160,0.35)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(this.originX - T.leash, this.y);
      c.lineTo(this.originX + T.leash, this.y);
      c.stroke();
      c.fillStyle = 'rgba(255,217,160,0.55)';
      c.beginPath();
      c.arc(this.x, this.y, 14, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = 'rgba(255,217,160,0.18)';
      c.font = '8px "Press Start 2P", monospace';
      c.textAlign = 'center';
      c.fillText('< DRAG >', CA.W * 0.25, CA.H - 18);
    }
    c.fillStyle = `rgba(255,217,160,${this.jumpFlash > 0 ? 0.45 : 0.18})`;
    c.font = '8px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillText('TAP: JUMP', CA.W * 0.75, CA.H - 18);
    if (this.jumpFlash > 0) this.jumpFlash--;
    c.restore();
  },
};
