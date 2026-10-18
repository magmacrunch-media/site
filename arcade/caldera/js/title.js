// title.js -- the title card: the moment before the climb, drawn rather than
// explained.
//
// Looking up the vent from the bottom. The magma pool glows at your feet, the
// climber stands on the first ledge, and the shaft narrows overhead, ledge
// after ledge in silhouette, lit from beneath, up to the crater mouth and a
// scrap of night sky. Embers rise the whole way. Every so often the pool
// swells, the light jumps and the rock shudders, and then it settles. Nothing
// on this screen says what any of it means; the controls are on the pause
// screen, as cave-diving does it.
//
// All of its state lives here, it draws with Math.random only for effects,
// and main.js only calls draw(). The climber is render.js's own sprite.

CA.title = (function () {
  const W = CA.W, H = CA.H;
  const MOUTH = 64;          // where the crater rim is, seen from below
  const POOL = 646;          // the resting magma surface
  const ROW = 4;

  // A fixed generator, so the vent is the same rock every visit.
  const rand = CA.rng(2026);

  // The walls, one row per 4px: narrow at the mouth, opening out into the
  // chamber at the bottom.
  const walls = [];
  (function () {
    let jl = 0, jr = 0;
    for (let y = 0; y < H + ROW; y += ROW) {
      jl = jl * 0.72 + (rand() - 0.5) * 10;
      jr = jr * 0.72 + (rand() - 0.5) * 10;
      const open = Math.min(1, Math.max(0, y / (H - 40)));
      const half = 62 + 168 * Math.pow(open, 0.75);
      walls.push({ y, lo: W / 2 - half + jl, hi: W / 2 + half + jr });
    }
  })();
  const wallAt = y => walls[Math.max(0, Math.min(walls.length - 1, Math.floor(y / ROW)))];

  // The ledges, up the shaft, alternating sides and narrowing as it narrows.
  // The bottom one is the climber's.
  const ledges = [];
  (function () {
    const start = { y: 584, x: 150, w: 170 };
    ledges.push(start);
    let side = 1;
    for (let y = 520; y > MOUTH + 30; y -= 64 + Math.floor(rand() * 10)) {
      const wl = wallAt(y);
      const span = wl.hi - wl.lo;
      const w = Math.max(44, Math.min(150, span * (0.32 + rand() * 0.12)));
      const x = side > 0 ? wl.hi - w - 6 - rand() * span * 0.25 : wl.lo + 6 + rand() * span * 0.25;
      ledges.push({ y, x, w });
      side = -side;
    }
  })();
  const VENT = ledges[3];   // the one that fires

  const stars = [];
  for (let i = 0; i < 40; i++) {
    stars.push({ x: W / 2 - 90 + rand() * 180, y: rand() * MOUTH * 1.4, tw: rand() * 6.28, b: rand() < 0.2 });
  }

  let embers = [];
  const bubbles = [];
  let shake = 0;
  let meteor = null;

  // The pool swells every so often: 0 at rest, 1 at the top of a surge.
  const SURGE_EVERY = 780, SURGE_FIRST = 420, SURGE_LEN = 110;
  function surge(t) {
    if (t < SURGE_FIRST) return 0;
    const p = (t - SURGE_FIRST) % SURGE_EVERY;
    if (p > SURGE_LEN) return 0;
    return Math.sin((p / SURGE_LEN) * Math.PI);
  }

  function sky(c, t) {
    const g = c.createLinearGradient(0, 0, 0, MOUTH * 2);
    g.addColorStop(0, '#05060f');
    g.addColorStop(1, '#1a0d10');
    c.fillStyle = g;
    c.fillRect(0, 0, W, MOUTH * 2.5);
    for (const s of stars) {
      const a = 0.35 + 0.35 * Math.sin(t * 0.03 + s.tw);
      c.fillStyle = `rgba(230,225,255,${a.toFixed(3)})`;
      c.fillRect(Math.round(s.x), Math.round(s.y), s.b ? 2 : 1, s.b ? 2 : 1);
    }
    // Now and then something crosses the gap.
    if (!meteor && t % 1100 === 700) meteor = { x: W / 2 - 80, y: 10, life: 26 };
    if (meteor) {
      c.strokeStyle = `rgba(255,240,220,${(meteor.life / 26).toFixed(3)})`;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(meteor.x, meteor.y);
      c.lineTo(meteor.x - 14, meteor.y - 5);
      c.stroke();
      meteor.x += 6; meteor.y += 2;
      if (--meteor.life <= 0) meteor = null;
    }
  }

  // Heat in the air of the shaft, strongest low down.
  function air(c, s) {
    const g = c.createLinearGradient(0, MOUTH, 0, H);
    g.addColorStop(0, 'rgba(20,6,6,0)');
    g.addColorStop(0.1, 'rgba(20,6,6,1)');
    g.addColorStop(0.55, 'rgba(60,14,6,1)');
    g.addColorStop(1, `rgba(${150 + 60 * s},${40 + 20 * s},8,1)`);
    c.fillStyle = g;
    c.fillRect(0, MOUTH, W, H);
  }

  function rock(c, s) {
    for (const w of walls) {
      const lo = Math.round(w.lo), hi = Math.round(w.hi);
      // How much of the pool's light reaches this row.
      const lit = Math.pow(Math.min(1, w.y / H), 2.2) * (0.8 + 0.4 * s);
      c.fillStyle = '#0d0907';
      c.fillRect(0, w.y, lo, ROW);
      c.fillRect(hi, w.y, W - hi, ROW);
      c.fillStyle = '#1e1511';
      c.fillRect(lo - 12, w.y, 12, ROW);
      c.fillRect(hi, w.y, 12, ROW);
      c.fillStyle = `rgba(255,${110 + 60 * s},40,${(0.08 + 0.75 * lit).toFixed(3)})`;
      c.fillRect(lo - 3, w.y, 3, ROW);
      c.fillRect(hi, w.y, 3, ROW);
    }
  }

  // Ledges in silhouette, with their undersides catching the light.
  function drawLedges(c, s, t) {
    for (let i = ledges.length - 1; i >= 0; i--) {
      const l = ledges[i];
      const lit = Math.pow(l.y / H, 2) * (0.85 + 0.4 * s);
      c.fillStyle = i === 0 ? '#3d322c' : '#140e0b';
      c.fillRect(l.x, l.y, l.w, 14);
      c.fillStyle = `rgba(255,${100 + 70 * s},30,${(0.15 + 0.8 * lit).toFixed(3)})`;
      c.fillRect(l.x + 2, l.y + 11, l.w - 4, 3);
      if (i === 0) {
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.fillRect(l.x, l.y, l.w, 2);
      }
    }
    // The vent hisses, then fires.
    const cx = VENT.x + VENT.w / 2;
    const p = t % 340;
    if (p > 250 && p < 320 && t % 3 === 0) {
      embers.push({ x: cx + (Math.random() - 0.5) * 10, y: VENT.y - 2, vx: (Math.random() - 0.5) * 0.3,
        vy: -0.5 - Math.random() * 0.6, life: 30, steam: true });
    }
    if (p >= 320) {
      c.fillStyle = 'rgba(232,226,208,0.35)';
      c.fillRect(cx - 12, VENT.y - 110, 24, 108);
      c.fillStyle = 'rgba(255,207,74,0.25)';
      c.fillRect(cx - 5, VENT.y - 150, 10, 148);
    }
  }

  function pool(c, t, s) {
    const top = POOL - 18 * s;
    // The glow thrown up off the surface.
    c.save();
    c.globalCompositeOperation = 'lighter';
    const glow = c.createRadialGradient(W / 2, top, 10, W / 2, top, 360 + 80 * s);
    glow.addColorStop(0, `rgba(255,120,30,${(0.45 + 0.3 * s).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = glow;
    c.fillRect(0, top - 440, W, 460);
    c.restore();

    c.beginPath();
    c.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      c.lineTo(x, top + Math.sin(x * 0.04 + t * 0.05) * 4 + Math.sin(x * 0.11 - t * 0.08) * 2);
    }
    c.lineTo(W, H);
    c.closePath();
    const g = c.createLinearGradient(0, top - 6, 0, H);
    g.addColorStop(0, '#fff2a8');
    g.addColorStop(0.12, '#ff7a1a');
    g.addColorStop(0.5, '#c22a00');
    g.addColorStop(1, '#4a0700');
    c.fillStyle = g;
    c.fill();

    // Bubbles that swell and burst.
    if (Math.random() < 0.03 + 0.1 * s) {
      bubbles.push({ x: 30 + Math.random() * (W - 60), r: 0, max: 3 + Math.random() * 6 });
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.r += 0.25;
      c.strokeStyle = 'rgba(255,240,170,0.8)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(b.x, top + 4, b.r, Math.PI, 0);
      c.stroke();
      if (b.r >= b.max) {
        for (let k = 0; k < 5; k++) {
          embers.push({ x: b.x, y: top, vx: (Math.random() - 0.5) * 2.4, vy: -1.5 - Math.random() * 2.5,
            life: 40, drop: true });
        }
        bubbles.splice(i, 1);
      }
    }
    return top;
  }

  function particles(c, top, s) {
    const n = 1 + Math.floor(3 * s);
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.7) {
        embers.push({ x: 40 + Math.random() * (W - 80), y: top, vx: (Math.random() - 0.5) * 0.5,
          vy: -0.8 - Math.random() * 1.8, life: 200 + Math.random() * 200 });
      }
    }
    const keep = [];
    for (const e of embers) {
      e.x += e.vx + (e.steam ? 0 : Math.sin(e.y * 0.03) * 0.2);
      e.y += e.vy;
      if (e.drop) e.vy += 0.12;
      if (--e.life <= 0 || e.y < MOUTH * 0.4 || (e.drop && e.y > top)) continue;
      // Embers cool as they climb.
      const h = Math.max(0, Math.min(1, e.y / H));
      const a = Math.min(1, e.life / 40);
      c.fillStyle = e.steam
        ? `rgba(220,214,200,${(0.5 * a).toFixed(3)})`
        : `rgba(255,${Math.round(90 + 150 * h)},${Math.round(40 * h)},${(a * (0.3 + 0.7 * h)).toFixed(3)})`;
      const size = e.steam ? 3 : (h > 0.6 ? 2 : 1);
      c.fillRect(Math.round(e.x), Math.round(e.y), size, size);
      keep.push(e);
    }
    embers = keep.length > 500 ? keep.slice(-500) : keep;
  }

  function climber(c, t, s) {
    const l = ledges[0];
    // Whoever is picked on the card stands here.
    const id = (CA.main && CA.main.character) || 'cinder';
    const P = CA.player.statsFor(id);
    // Breathing: a slow squash. During a surge it braces.
    const breath = Math.sin(t * 0.05) * 0.04 + 0.08 * s;
    const w = P.w * (1 + breath), h = P.h * (1 - breath * 0.8);
    const x = l.x + l.w * 0.42 - w / 2;
    const y = l.y - h;
    // Heat only when the pool surges, so a still title has no glow box.
    const heat = 0.6 * s;
    CA.render.drawCharacter(c, id, x, y, w, h, Math.floor(t / 300) % 2 ? -1 : 1, heat, '#ff5a1f', 0, P,
      { name: 'idle', frame: Math.floor(t / 32) });
  }

  function vignette(c) {
    const g = c.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  return {
    draw(c, t) {
      const s = surge(t);
      if (s > 0.6 && Math.random() < 0.3) shake = Math.max(shake, 3 * s);

      c.save();
      if (shake > 0) {
        c.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
        shake *= 0.85;
        if (shake < 0.3) shake = 0;
      }
      sky(c, t);
      air(c, s);
      rock(c, s);
      drawLedges(c, s, t);
      climber(c, t, s);
      const top = pool(c, t, s);
      particles(c, top, s);
      c.restore();
      vignette(c);
    },
  };
})();
