// checkout-render.js -- the checkout screen, added onto GH.render.
//
// A till at the front of the store, Marge Margarine behind it, the list of
// what sugar buys, and what she has to say about it. The words are all in
// dialogue.js under `checkout`; the prices and effects are in shop.js.

Object.assign(GH.render, {

  // Where the list sits, shared with main.tapCheckout().
  CHECK: { x: 40, y: 92, w: 360, rowH: 40 },

  // Which checkout row a canvas point is on: an item index, the back row
  // (one past the last item), or -1.
  checkoutRowAt(x, y) {
    const K = this.CHECK;
    if (x < K.x || x > K.x + K.w) return -1;
    const i = Math.floor((y - K.y) / K.rowH);
    return i >= 0 && i <= GH.shop.ITEMS.length ? i : -1;
  },

  drawCheckout(c, pick, save, say) {
    const C = this.C;
    const W = GH.DIALOGUE.checkout;
    const K = this.CHECK;
    this.t++;

    const sky = c.createLinearGradient(0, 0, 0, GH.H);
    sky.addColorStop(0, '#0b0d1e');
    sky.addColorStop(1, '#1f1b30');
    c.fillStyle = sky;
    c.fillRect(0, 0, GH.W, GH.H);

    // The lane light over the till, lit.
    c.fillStyle = '#1d4a3a';
    c.fillRect(440, 30, 170, 34);
    c.fillStyle = '#ffe9a8';
    c.font = '8px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillText(W.sign, 525, 52);

    // The counter and its belt.
    c.fillStyle = '#3a3f4f';
    c.fillRect(420, 330, 220, 150);
    c.fillStyle = '#1b1d26';
    c.fillRect(420, 320, 220, 12);
    for (let x = 420 + ((this.t / 2) % 16); x < 640; x += 16) {
      c.fillStyle = '#2a2d38';
      c.fillRect(x, 320, 8, 12);
    }
    // The register.
    c.fillStyle = '#c9ccd1';
    c.fillRect(560, 250, 64, 70);
    c.fillStyle = '#2c3140';
    c.fillRect(566, 258, 52, 20);
    c.fillStyle = '#7ee08a';
    c.font = '9px "Press Start 2P", monospace';
    c.fillText('◆' + save.sugar, 592, 273);

    this.drawMarge(c, 490, 320);

    // Her line, in a bubble above her.
    if (say) {
      c.fillStyle = 'rgba(255, 246, 220, 0.95)';
      c.fillRect(420, 120, 210, 100);
      c.beginPath(); c.moveTo(480, 220); c.lineTo(492, 236); c.lineTo(500, 220); c.closePath(); c.fill();
      c.fillStyle = '#2a2016';
      c.font = '7px "Press Start 2P", monospace';
      c.textAlign = 'left';
      c.fillText(W.speaker, 430, 136);
      this.wrap(c, say, 430, 154, 190, 14);
    }

    // The list.
    c.textAlign = 'left';
    c.fillStyle = C.tag;
    c.font = '14px "Press Start 2P", monospace';
    c.fillText(W.title, K.x, 60);
    c.font = '9px "Press Start 2P", monospace';
    c.fillStyle = C.sugar;
    c.fillText(`◆ ${save.sugar}`, K.x + 180, 60);

    const rows = GH.shop.ITEMS.length + 1;
    for (let i = 0; i < rows; i++) {
      const y = K.y + i * K.rowH;
      const isBack = i === rows - 1;
      if (i === pick) {
        c.fillStyle = 'rgba(255, 233, 168, 0.14)';
        c.fillRect(K.x - 8, y, K.w, K.rowH - 4);
        c.fillStyle = C.tag;
        c.font = '9px "Press Start 2P", monospace';
        c.fillText('▶', K.x - 4, y + 16);
      }
      if (isBack) {
        c.fillStyle = 'rgba(255, 246, 220, 0.7)';
        c.font = '8px "Press Start 2P", monospace';
        c.fillText(W.back, K.x + 14, y + 16);
        continue;
      }
      const item = GH.shop.ITEMS[i];
      const words = W.items[item.id];
      const state = GH.shop.check(save, item.id);
      c.font = '9px "Press Start 2P", monospace';
      c.fillStyle = state === 'owned' ? '#7ee08a' : state === 'short' ? 'rgba(255, 246, 220, 0.45)' : '#fff6dc';
      c.fillText(words.name, K.x + 14, y + 16);
      c.textAlign = 'right';
      c.fillText(state === 'owned' ? '✓' : `◆${item.cost}`, K.x + K.w - 20, y + 16);
      c.textAlign = 'left';
      if (i === pick) {
        c.fillStyle = 'rgba(255, 246, 220, 0.6)';
        c.font = '6px "Press Start 2P", monospace';
        c.fillText(words.desc, K.x + 14, y + 30);
      }
    }

    c.fillStyle = 'rgba(255, 246, 220, 0.4)';
    c.font = '7px "Press Start 2P", monospace';
    c.textAlign = 'left';
    c.fillText(GH.touch.seen ? 'TAP TO BUY' : 'UP / DOWN  CHOOSE    ENTER  BUY    ESC  BACK', K.x, GH.H - 20);
  },

  // Marge Margarine: a tub of margarine with a yellow lid and a cashier's
  // patience, feet at (x, y).
  drawMarge(c, x, y) {
    const bob = Math.sin(this.t / 30) * 1;
    c.fillStyle = '#f4f0dc';
    c.beginPath();
    c.moveTo(x - 26, y - 50 + bob); c.lineTo(x + 26, y - 50 + bob); c.lineTo(x + 22, y); c.lineTo(x - 22, y);
    c.closePath(); c.fill();
    c.fillStyle = '#ffd84a';
    c.fillRect(x - 30, y - 58 + bob, 60, 10);
    c.fillStyle = '#e2b93f';
    c.fillRect(x - 30, y - 50 + bob, 60, 3);
    c.fillStyle = '#ffd84a';
    c.fillRect(x - 18, y - 30 + bob, 36, 12);
    c.fillStyle = '#7a5a10';
    c.font = '5px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.fillText('MARGE', x, y - 22 + bob);
    c.fillStyle = '#222';
    c.fillRect(x - 10, y - 42 + bob, 3, 3);
    c.fillRect(x + 7, y - 42 + bob, 3, 3);
    c.fillRect(x - 5, y - 36 + bob, 10, 1);
  },
});
