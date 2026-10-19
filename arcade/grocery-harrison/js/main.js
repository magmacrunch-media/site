// main.js -- the browser half: input, screens, dialogue, the loop.
//
// From adenosine-rpg, four things:
//   AdRPG.createGameLoop       the requestAnimationFrame driver, run every
//                              frame; the fixed-step clock is ours, below
//   AdRPG.initInput            held keys (keysPressed, lowercased), plus the
//                              interact callback used for the jump press
//   AdRPG.setGameStarted       the loop renders nothing until this is true
//   AdRPG.createDialogueSystem Granny's lines, a line at a time. game.talk()
//                              decides what she says; this only shows it
//
// NOT AdRPG.initCanvas: with a canvas registered the loop clears it on every
// callback, and this game draws only on frames that ticked. Not its tile
// movement, camera or collision either: this is a pixel-space side-scroller,
// the same call CALDERA made.

GH.main = {

  state: 'title',     // title | opening | directory | checkout | playing | talking | paused | over
  pick: 0,            // the directory row the cursor is on
  PROGRESS_KEY: 'grocery-harrison-restored',
  SAVE_KEY: 'grocery-harrison-save',   // sugar banked, crystals found, upgrades bought
  shopPick: 0,
  shopSay: '',
  lastBanked: 0,
  g: null,
  pressed: { jump: false, act: false, strum: false },

  JUMP_KEYS: [' ', 'z', 'arrowup', 'w'],

  start() {
    const canvas = document.getElementById('c');
    GH.render.init(canvas);
    this.dlg = AdRPG.createDialogueSystem();
    this.ui = {
      title: document.getElementById('title'),
      over: document.getElementById('over'),
      pause: document.getElementById('btnPause'),
    };
    GH.touch.init(canvas, this);
    GH.sound.init();
    GH.sound.music('title');
    this.ui.sound = document.getElementById('btnSound');
    this.ui.sound.addEventListener('click', e => { e.stopPropagation(); e.currentTarget.blur(); this.toggleSound(); });
    this.showSound();
    this.ui.pause.addEventListener('click', e => {
      e.stopPropagation();
      e.currentTarget.blur();
      if (this.state === 'playing' || this.state === 'paused') this.setState(this.state === 'playing' ? 'paused' : 'playing');
    });
    const tap = fn => e => { e.stopPropagation(); e.currentTarget.blur(); fn(); };
    document.getElementById('btnStart').addEventListener('click', tap(() => {
      if (this.state === 'title') this.leaveTitle(false);
    }));
    document.getElementById('btnAgain').addEventListener('click', tap(() => {
      if (this.state === 'over') this.openDirectory();
    }));

    AdRPG.initInput({
      bindings: {
        moveUp: [], moveDown: ['arrowdown', 's'],
        moveLeft: ['arrowleft', 'a'], moveRight: ['arrowright', 'd'],
        pause: [],
        interact: this.JUMP_KEYS,
      },
      onInteract: () => { if (this.state === 'playing') this.pressed.jump = true; },
    });

    window.addEventListener('keydown', e => this.onKey(e));
    window.addEventListener('blur', () => {
      for (const k of Object.keys(AdRPG.keysPressed)) AdRPG.keysPressed[k] = false;
      if (this.state === 'playing') this.setState('paused');
    });
    canvas.addEventListener('click', () => { if (this.state === 'paused') this.setState('playing'); });

    // CALDERA's fixed step: called on every animation frame, a frame within
    // tolerance of a whole step counts as one, and a stall catches up a few
    // ticks rather than replaying a hidden tab's backlog.
    const CLOCK = { step: 1000 / GH.TICK_FPS, tolerance: 1.5, maxCatchUp: 5 };
    let last = 0, acc = 0, ticked = 0;
    const loop = AdRPG.createGameLoop({
      fps: 1000,
      update: () => {
        const now = performance.now();
        if (!last) last = now;
        acc += now - last;
        last = now;
        ticked = 0;
        while (acc >= CLOCK.step - CLOCK.tolerance && ticked < CLOCK.maxCatchUp) {
          acc -= CLOCK.step;
          this.update();
          ticked++;
        }
        if (Math.abs(acc) < CLOCK.tolerance || ticked === CLOCK.maxCatchUp) acc = 0;
      },
      render: () => { if (ticked) this.render(); },
    });
    AdRPG.setGameStarted(true);
    this.syncUi();
    loop.start();
    this.scaleToFit();
  },

  // ---- The opening -------------------------------------------------------------
  // The walk-in cooler, the chord, the shrink (opening.js). It plays the
  // first time the title is left, and whenever it is left with O.
  leaveTitle(replay) {
    if (!replay && GH.opening.seen()) { this.openDirectory(); return; }
    GH.sound.unlock();
    GH.opening.begin(GH.render.t);
    this.setState('opening');
  },

  advanceOpening() {
    GH.sound.play('talk');
    if (!GH.opening.next(GH.render.t)) this.endOpening();
  },

  endOpening() {
    GH.opening.markSeen();
    this.openDirectory();
  },

  // ---- The store directory -------------------------------------------------
  // The sign by the entrance: every aisle, built or not. Restored ones are
  // remembered in this browser only, which is all a checkmark needs.
  restored() {
    try { return JSON.parse(localStorage.getItem(this.PROGRESS_KEY)) || {}; } catch (err) { return {}; }
  },

  markRestored(id) {
    try {
      const r = this.restored();
      r[id] = true;
      localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(r));
    } catch (err) { /* not remembered */ }
  },

  openDirectory() {
    const rows = GH.level.DIRECTORY;
    if (!rows[this.pick] || !rows[this.pick].id) this.pick = 0;
    GH.sound.unlock();
    GH.sound.music('title');
    this.setState('directory');
  },

  movePick(d) {
    const rows = GH.level.DIRECTORY;
    this.pick = (this.pick + d + rows.length) % rows.length;
    GH.sound.play('tick');
  },

  choose() {
    const row = GH.level.DIRECTORY[this.pick];
    if (row && row.checkout) this.openCheckout();
    else if (row && row.id) this.newRun(row.id);
    else GH.sound.play('hurt');
  },

  // ---- The checkout ------------------------------------------------------------
  // The save is shop.js's shape, kept in this browser only.
  save() {
    try { return GH.shop.normalize(JSON.parse(localStorage.getItem(this.SAVE_KEY))); } catch (err) { return GH.shop.empty(); }
  },

  writeSave(save) {
    try { localStorage.setItem(this.SAVE_KEY, JSON.stringify(save)); } catch (err) { /* not remembered */ }
  },

  openCheckout() {
    this.shopPick = 0;
    this.shopSay = GH.DIALOGUE.checkout.hello;
    GH.sound.play('choose');
    this.setState('checkout');
  },

  moveShop(d) {
    const rows = GH.shop.ITEMS.length + 1;
    this.shopPick = (this.shopPick + d + rows) % rows;
    GH.sound.play('tick');
  },

  // Buy what the cursor is on, or leave if it is on the way out.
  shopChoose() {
    if (this.shopPick === GH.shop.ITEMS.length) {
      this.openDirectory();
      return;
    }
    const W = GH.DIALOGUE.checkout;
    const id = GH.shop.ITEMS[this.shopPick].id;
    const save = this.save();
    const why = GH.shop.check(save, id);
    if (why === 'ok') {
      this.writeSave(GH.shop.buy(save, id));
      this.shopSay = W.bought;
      GH.sound.play('restored');
    } else {
      this.shopSay = why === 'owned' ? W.owned : W.short;
      GH.sound.play('hurt');
    }
  },

  tapCheckout(x, y) {
    const i = GH.render.checkoutRowAt(x, y);
    if (i < 0) return;
    this.shopPick = i;
    this.shopChoose();
  },

  // The speaker button and M: everything, music and effects, one switch.
  toggleSound() {
    GH.sound.toggle();
    this.showSound();
  },

  showSound() {
    const b = this.ui.sound;
    b.textContent = GH.sound.muted ? '♪̶' : '♪';
    b.setAttribute('aria-pressed', GH.sound.muted ? 'true' : 'false');
    b.setAttribute('aria-label', GH.sound.muted ? 'Sound off' : 'Sound on');
  },

  newRun(levelId) {
    this.g = GH.game.create((Math.random() * 2 ** 32) >>> 0, levelId, this.save().perks);
    const L = this.g.level;
    GH.render.fx = [];
    GH.render.banner = { text: `AISLE ${L.aisle}: ${L.name}`, sub: GH.DIALOGUE[L.id].intro, until: GH.render.t + 170 };
    this.pressed = { jump: false, act: false, strum: false };
    GH.touch.reset();
    GH.sound.unlock();
    GH.sound.music('aisle');
    this.setState('playing');
  },

  setState(state) {
    this.state = state;
    this.syncUi();
  },

  syncUi() {
    this.ui.title.hidden = this.state !== 'title';
    this.ui.over.hidden = this.state !== 'over';
    // A phone has no P key, so it gets a button, once a finger has been seen.
    this.ui.pause.hidden = !(GH.touch.seen && this.state === 'playing');
    // The speaker is on every screen but the one being played.
    if (this.ui.sound) this.ui.sound.hidden = this.state === 'playing' || this.state === 'talking';
  },

  // A tap on the directory: a built aisle starts, a coming-soon one is only
  // pointed at.
  tapDirectory(x, y) {
    const i = GH.render.directoryRowAt(x, y);
    if (i < 0) return;
    this.pick = i;
    this.choose();
  },

  // Space, Enter or a tap: the next line, or close at the last.
  advanceTalk() {
    GH.sound.play('talk');
    if (this.dlg.getState().hasMoreLines) this.dlg.advance();
    else this.dlg.close();
  },

  talk() {
    const before = this.g.quest;
    const said = GH.game.talk(this.g);
    if (!said) return;
    this.dlg.show(said, {
      onClose: () => {
        if (this.state === 'talking') this.setState('playing');
        // The quest banner waits until the talking is done.
        if (before === 'start' && this.g.quest === 'carry') {
          const B = GH.DIALOGUE[this.g.level.id].banner;
          GH.render.banner = { text: B.text, sub: B.sub, until: GH.render.t + 150 };
        }
      },
    });
    this.setState('talking');
  },

  onKey(e) {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    // M mutes everything, on any screen.
    if (k === 'm') { this.toggleSound(); return; }

    if (this.state === 'talking') {
      if (k === 'enter' || k === ' ' || k === 'x' || k === 'e' || k === 'z') this.advanceTalk();
      return;
    }
    if ((k === 'p' || k === 'escape') && (this.state === 'playing' || this.state === 'paused')) {
      this.setState(this.state === 'playing' ? 'paused' : 'playing');
      return;
    }
    if (this.state === 'paused') {
      if (k === 'enter' || k === ' ') this.setState('playing');
      return;
    }
    if (this.state === 'opening') {
      if (k === 'escape') this.endOpening();
      else if (k === 'enter' || k === ' ' || k === 'x' || k === 'z') this.advanceOpening();
      return;
    }
    if (this.state === 'title') {
      if (k === 'enter') this.leaveTitle(false);
      else if (k === 'o') this.leaveTitle(true);
      return;
    }
    if (this.state === 'over') {
      if (k === 'enter') this.openDirectory();
      return;
    }
    if (this.state === 'checkout') {
      if (k === 'arrowup' || k === 'w') this.moveShop(-1);
      else if (k === 'arrowdown' || k === 's') this.moveShop(1);
      else if (k === 'enter' || k === ' ' || k === 'x' || k === 'z') this.shopChoose();
      else if (k === 'escape') this.openDirectory();
      return;
    }
    if (this.state === 'directory') {
      if (k === 'arrowup' || k === 'w') this.movePick(-1);
      else if (k === 'arrowdown' || k === 's') this.movePick(1);
      else if (k === 'enter' || k === ' ' || k === 'x' || k === 'z') this.choose();
      else if (k === 'escape') this.setState('title');
      return;
    }
    if (k === 'x' || k === 'e') this.pressed.act = true;
    else if (k === 'c' || k === 'q') this.pressed.strum = true;
  },

  update() {
    if (this.state !== 'playing') return;
    const T = GH.touch;
    const tap = T.take();
    const act = this.pressed.act || tap.act;
    if (act && GH.game.npcNear(this.g)) {
      this.pressed.act = false;
      this.talk();
      return;
    }
    const keys = AdRPG.keysPressed;
    const input = {
      left: !!(keys['arrowleft'] || keys['a']) || T.dir < 0,
      right: !!(keys['arrowright'] || keys['d']) || T.dir > 0,
      jump: this.JUMP_KEYS.some(k => keys[k]) || T.jumpId !== null,
      down: !!(keys['arrowdown'] || keys['s']),
      jumpPress: this.pressed.jump || tap.jumpPress,
      act,
      strum: this.pressed.strum || tap.strum,
    };
    this.pressed = { jump: false, act: false, strum: false };
    GH.game.step(this.g, input);
    if (this.g.over) {
      if (this.g.quest === 'done') this.markRestored(this.g.level.id);
      // Bank the crystals this run found, once each, for the checkout.
      const { save, fresh } = GH.shop.bank(this.save(), this.g);
      this.writeSave(save);
      this.lastBanked = fresh;
      this.setState('over');
    }
  },

  render() {
    const c = GH.render.ctx;
    if (this.state === 'title') GH.render.drawTitle(c);
    else if (this.state === 'opening') { GH.render.t++; GH.opening.draw(c, GH.render.t); }
    else if (this.state === 'directory') GH.render.drawDirectory(c, this.pick, this.restored(), this.save().sugar);
    else if (this.state === 'checkout') GH.render.drawCheckout(c, this.shopPick, this.save(), this.shopSay);
    else if (this.state === 'playing') {
      GH.render.drawPlay(this.g);
      GH.touch.draw(c);
    }
    else if (this.state === 'talking') {
      GH.render.drawPlay(this.g);
      GH.render.drawDialogue(c, this.dlg.getState());
    } else if (this.state === 'paused') GH.render.drawPaused(c, this.g);
    else GH.render.drawOver(c, this.g);
  },

  scaleToFit() {
    const root = document.getElementById('wrap');
    const resize = () => {
      const s = Math.min(window.innerWidth * 0.96 / GH.W, window.innerHeight * 0.96 / GH.H, 2);
      root.style.width = `${Math.floor(GH.W * s)}px`;
      root.style.height = `${Math.floor(GH.H * s)}px`;
    };
    window.addEventListener('resize', resize);
    resize();
  },
};

GH.main.start();
