// main.js -- the browser half: input, screens, the loop.
//
// From adenosine-rpg, three things:
//   AdRPG.createGameLoop   the requestAnimationFrame driver, run every frame;
//                          the fixed-step clock is ours, in frame() below
//   AdRPG.initInput        held keys (keysPressed, lowercased), plus the
//                          interact callback used for jump
//   AdRPG.setGameStarted   the loop renders nothing until this is true
//
// NOT AdRPG.initCanvas, deliberately: with a canvas registered, the loop
// clears it on every callback, and this game draws only on frames that
// ticked, so a cleared frame with nothing drawn on it would flicker.
//
// Not its movement, collision or camera: those are tile-grid systems and this
// is a pixel-space platformer. Fighting them would cost more than the forty
// lines of physics in player.js.

CA.main = {

  state: 'title',     // title | select | playing | paused | initials | over
  g: null,
  jumpQueued: false,
  deadFrames: 0,
  character: 'cinder',

  start() {
    const canvas = document.getElementById('c');
    CA.render.init(canvas);
    CA.scores.init();

    // The HTML panels: everything a thumb has to press lives in the page,
    // not on the canvas, so a phone can reach it.
    this.ui = {
      title: document.getElementById('title'),
      initials: document.getElementById('initials'),
      initialsInput: document.getElementById('initialsInput'),
      over: document.getElementById('over'),
      pause: document.getElementById('btnPause'),
      modal: document.getElementById('charModal'),
      grid: document.getElementById('charGrid'),
    };
    // Blur after a click: a focused button would otherwise take the next
    // Enter as a second click of itself.
    const tap = fn => e => { e.stopPropagation(); e.currentTarget.blur(); fn(); };
    // The title's press opens the climber select, the way Moonlight Drift's
    // does; CLIMB AGAIN goes straight back up with the same climber.
    document.getElementById('btnStart').addEventListener('click', tap(() => {
      if (this.state === 'title') this.openSelect('title');
    }));
    document.getElementById('btnAgain').addEventListener('click', tap(() => {
      if (this.state === 'over') this.newRun();
    }));
    document.getElementById('btnChange').addEventListener('click', tap(() => {
      if (this.state === 'over') this.openSelect('over');
    }));
    document.getElementById('charDone').addEventListener('click', tap(() => this.closeSelect()));
    document.getElementById('initialsSave').addEventListener('click', () => this.saveInitials());
    this.ui.pause.addEventListener('click', () => this.togglePause());
    // adenosine's input preventDefaults its interact keys (space, w, z) on the
    // window, which would make W and Z impossible to type here. Stop the
    // event at the field instead.
    this.ui.initialsInput.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') this.saveInitials();
    });
    this.ui.initialsInput.addEventListener('input', () => {
      const el = this.ui.initialsInput;
      el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    });

    CA.touch.init(canvas, this);
    this.initPicker();
    CA.hints.init();
    CA.sfx.init();

    // The mute state is visible BEFORE a run, since it persists across
    // sessions and a player who muted last week would otherwise meet
    // silence with no explanation. It is also the only mute on a phone.
    this.ui.sound = document.getElementById('btnSound');
    this.ui.sound.addEventListener('click', e => { e.stopPropagation(); e.currentTarget.blur(); this.toggleSound(); });
    this.showSound();

    CA.game.on(type => {
      if (type === 'dead') this.deadFrames = 70;
    });

    AdRPG.initInput({
      bindings: {
        moveUp: ['w'], moveDown: ['s'], moveLeft: ['arrowleft', 'a'], moveRight: ['arrowright', 'd'],
        // Pause is handled in onKey, not here: adenosine fires its pause
        // callback on every keydown including auto-repeat, so a P held a
        // moment too long paused and unpaused in the same press.
        pause: [],
        interact: [' ', 'arrowup', 'w', 'z'],
      },
      onInteract: () => { if (this.state === 'playing') this.jumpQueued = true; },
    });

    // A click anywhere on the game resumes. Touch already does, in touch.js.
    canvas.addEventListener('click', () => { if (this.state === 'paused') this.togglePause(); });

    window.addEventListener('keydown', e => this.onKey(e));
    // Losing focus mid-run would leave a held key held for ever.
    window.addEventListener('blur', () => {
      for (const k of Object.keys(AdRPG.keysPressed)) AdRPG.keysPressed[k] = false;
      if (this.state === 'playing') this.togglePause();
    });

    // OUR OWN FIXED STEP, because adenosine's dropped ticks. Its loop ticks
    // when 1/60 s has accumulated and then keeps only the remainder (`%`).
    // A 60 Hz display delivers frames a fraction of a millisecond either
    // side of 1/60 s, so an early one skipped its tick: measured by replaying
    // that accumulator, 30 to 47 skipped ticks per 100 s at normal jitter, a
    // visible hitch every two or three seconds. And the `%` throws a backlog
    // away, so a 50 ms stall gave one tick rather than three.
    //
    // So the engine loop is asked to call us on EVERY animation frame
    // (fps: 1000) and the step is counted here, with two changes: a frame
    // within CLOCK.tolerance of a whole step counts as one, and the remainder
    // snaps to zero when it lands that close, which phase-locks to any
    // display from 59.94 to 60.5 Hz at one tick per frame. A real stall
    // catches up, up to CLOCK.maxCatchUp ticks; anything longer (a hidden
    // tab) is dropped rather than replayed.
    //
    // Drawing happens only on frames that ticked, so render.js effects keep
    // advancing at 60 per second on a 144 Hz screen too.
    const CLOCK = { step: 1000 / CA.TICK_FPS, tolerance: 1.5, maxCatchUp: 5 };
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

  newRun() {
    this.g = CA.game.create((Math.random() * 2 ** 32) >>> 0, this.character);
    CA.render.fx = [];
    CA.render.banner = { text: CA.CHAMBERS[0].name, sub: 'CHAMBER 1', until: CA.render.t + 120 };
    this.jumpQueued = false;
    CA.touch.reset();
    CA.sfx.unlock();
    CA.hints.start();
    this.setState('playing');
  },

  setState(state) {
    this.state = state;
    this.syncUi();
  },

  // Show the panel that belongs to the current state, and only that one.
  syncUi() {
    const u = this.ui;
    if (!u) return;
    u.title.hidden = this.state !== 'title';
    u.initials.hidden = this.state !== 'initials';
    u.over.hidden = this.state !== 'over';
    u.modal.hidden = this.state !== 'select';
    u.pause.hidden = !(CA.touch.seen && this.state === 'playing');
  },

  togglePause() {
    if (this.state === 'playing') this.setState('paused');
    else if (this.state === 'paused') this.setState('playing');
  },

  // ---------------------------------------------------------------
  //  THE PICKER
  // ---------------------------------------------------------------
  CHAR_KEY: 'caldera-character',

  initPicker() {
    try {
      const stored = localStorage.getItem(this.CHAR_KEY);
      const saved = CA.CAST.renamed[stored] || stored;
      if (CA.CAST.order.includes(saved)) this.character = saved;
    } catch (err) { /* defaults to CINDER */ }
  },

  // THE CLIMBER SELECT, shaped like Moonlight Drift's character modal: a
  // grid of cards, each a drawn preview, the name and star ratings. Click a
  // card or move with the arrows to choose, DONE (or Enter) to close. Opened
  // from the title it leads into the climb; opened from the end card with
  // CHANGE CLIMBER it returns there.
  openSelect(from) {
    this.selectFrom = from;
    this.renderGrid();
    this.setState('select');
  },

  closeSelect() {
    if (this.state !== 'select') return;
    if (this.selectFrom === 'over') this.setState('over');
    else this.newRun();
  },

  choose(id) {
    this.character = id;
    try { localStorage.setItem(this.CHAR_KEY, id); } catch (err) { /* not remembered */ }
    this.renderGrid();
  },

  // Arrow keys move through the grid, wrapping, by however many columns the
  // CSS has laid it out in, which differs on a phone.
  moveSelect(dx, dy) {
    const order = CA.CAST.order;
    const cols = getComputedStyle(this.ui.grid).gridTemplateColumns.split(' ').length || 1;
    let i = order.indexOf(this.character) + dx + dy * cols;
    i = ((i % order.length) + order.length) % order.length;
    this.choose(order[i]);
  },

  renderGrid() {
    const grid = this.ui.grid;
    // The grid scrolls once the roster passes what fits (it does on a
    // phone), and rebuilding it would snap that back to the top under the
    // player's thumb, so the scroll is carried across the rebuild.
    const keep = grid.scrollTop;
    grid.innerHTML = '';
    const all = CA.CAST.order.map(id => this.ratings(id));
    for (const id of CA.CAST.order) {
      const m = CA.CAST[id];
      const card = document.createElement('button');
      card.className = 'char-card' + (id === this.character ? ' selected' : '');
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', id === this.character ? 'true' : 'false');

      const preview = document.createElement('canvas');
      preview.width = 64;
      preview.height = 64;
      const pc = preview.getContext('2d');
      const P = CA.player.statsFor(id);
      const scale = 44 / Math.max(P.w, P.h);
      pc.save();
      pc.translate(32 - P.w * scale / 2, 58 - P.h * scale);
      pc.scale(scale, scale);
      // No heat on the cards: the border marks the selection.
      CA.render.drawCharacter(pc, id, 0, 0, P.w, P.h, 1, 0, '#ff5a1f', 0, P);
      pc.restore();

      const mine = this.ratings(id);
      const stars = Object.keys(mine).map(k => {
        const vals = all.map(r => r[k]);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const n = hi > lo ? 1 + Math.round(4 * (mine[k] - lo) / (hi - lo)) : 3;
        return `<div class="stat-row"><span>${k.toLowerCase()}</span><span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span></div>`;
      }).join('');

      card.innerHTML = `<div class="char-name">${m.name}</div><div class="char-role">${m.role}</div>`;
      card.insertBefore(preview, card.firstChild);
      card.insertAdjacentHTML('beforeend', `<div class="char-stats">${stars}</div>`);
      card.addEventListener('click', e => { e.stopPropagation(); e.currentTarget.blur(); this.choose(id); });
      grid.appendChild(card);
    }
    // The blurb first: when it wraps to a second line the grid gets
    // shorter, and measuring before that left the last row just out of view.
    const blurb = document.getElementById('charBlurb');
    if (blurb) blurb.textContent = CA.CAST[this.character].blurb;
    grid.scrollTop = keep;
    // Then bring the chosen card fully into view, as Moonlight Drift does,
    // moving the grid only and never the page.
    const sel = grid.querySelector('.char-card.selected');
    // Measured on screen, not by offsetTop, which misses the grid's padding
    // and left the last row a few pixels short.
    if (sel) {
      const r = sel.getBoundingClientRect(), g = grid.getBoundingClientRect();
      if (r.top < g.top) grid.scrollTop -= g.top - r.top + 2;
      else if (r.bottom > g.bottom) grid.scrollTop += r.bottom - g.bottom + 2;
    }
  },

  // Three ratings out of five, DERIVED from each character's stats against
  // the rest of the cast, so the card can never disagree with the physics.
  ratings(id) {
    const P = CA.player.statsFor(id);
    const apex = v => (v * v) / (2 * P.gravity);
    return {
      SPEED: P.maxRun,
      SPRING: apex(P.jumpBase),
      GRIP: P.runAccel + P.airAccel,
    };
  },

  toggleSound() {
    CA.sfx.toggle();
    this.showSound();
  },

  showSound() {
    const b = this.ui.sound;
    b.textContent = CA.sfx.muted ? 'SOUND: OFF' : 'SOUND: ON';
    b.setAttribute('aria-pressed', CA.sfx.muted ? 'true' : 'false');
  },

  saveInitials() {
    if (this.state !== 'initials') return;
    const name = (this.ui.initialsInput.value || 'AAA').padEnd(3, 'A');
    this.ui.initialsInput.blur();
    CA.scores.save(name, this.g);
    this.setState('over');
  },

  onKey(e) {
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();

    if (k === 'm' && !e.repeat) {
      this.toggleSound();
      return;
    }
    if ((k === 'p' || k === 'escape') && !e.repeat
        && (this.state === 'playing' || this.state === 'paused')) {
      this.togglePause();
      return;
    }
    if (this.state === 'paused') {
      // Every obvious way out works. Only P did, and the pause screen is
      // exactly where a player reaches for Escape, Enter or Space instead.
      if ((k === 'enter' || k === ' ') && !e.repeat) this.togglePause();
      return;
    }

    if (this.state === 'title') {
      if ((k === 'enter' || k === ' ') && !e.repeat) this.openSelect('title');
    } else if (this.state === 'select') {
      if (e.repeat && (k === 'enter' || k === ' ')) return;
      if (k === 'arrowleft' || k === 'a') this.moveSelect(-1, 0);
      else if (k === 'arrowright' || k === 'd') this.moveSelect(1, 0);
      else if (k === 'arrowup' || k === 'w') this.moveSelect(0, -1);
      else if (k === 'arrowdown' || k === 's') this.moveSelect(0, 1);
      else if (k === 'enter' || k === ' ' || k === 'escape') this.closeSelect();
    } else if (this.state === 'over') {
      if (k === 'enter' && !e.repeat) this.newRun();
    }
  },

  update() {
    if (this.state !== 'playing') return;
    const keys = AdRPG.keysPressed;
    const input = {
      left: !!(keys['arrowleft'] || keys['a']) || CA.touch.dir < 0,
      right: !!(keys['arrowright'] || keys['d']) || CA.touch.dir > 0,
      jump: CA.touch.takeJump() || this.jumpQueued,
    };
    this.jumpQueued = false;
    CA.game.step(this.g, input);
    CA.hints.update(this.g);

    // Let the splash play out before the card goes up.
    if (this.g.over && --this.deadFrames <= 0) {
      CA.touch.reset();
      if (CA.scores.qualifies(this.g.score)) {
        this.setState('initials');
        this.ui.initialsInput.value = '';
        // A phone would throw its keyboard up over the result; let a tap ask.
        if (!CA.touch.seen) this.ui.initialsInput.focus();
      } else {
        this.setState('over');
      }
    }
  },

  render() {
    if (this.state === 'title' || this.state === 'select') CA.title.draw(CA.render.ctx, CA.render.t++);
    else if (this.state === 'playing') CA.render.drawPlay(this.g);
    else CA.render.drawScreen(this);
  },

  // Fit the canvas to the window without distorting it.
  scaleToFit() {
    const root = document.getElementById('wrap');
    const resize = () => {
      const s = Math.min(window.innerWidth * 0.96 / CA.W, window.innerHeight * 0.96 / CA.H, 2);
      root.style.width = `${Math.floor(CA.W * s)}px`;
      root.style.height = `${Math.floor(CA.H * s)}px`;
    };
    window.addEventListener('resize', resize);
    resize();
  },
};

CA.main.start();
