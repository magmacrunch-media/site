// sound.js -- every sound in the game, synthesized here, with no audio files.
//
// CALDERA's arrangement, taken further. Each effect and each piece of music is
// rendered at load as PCM, wrapped in a WAV header and handed to
// adenosine-audio as a blob: URL, so playback is the arcade's own engine
// (pooled effects, one looping music track, one mute) and there is nothing to
// ship, nothing to 404 and no codec question.
//
// Three instruments do all of it:
//   chip   pulse, triangle and noise voices with an envelope, for chiptune
//   pluck  Karplus-Strong: a burst of noise fed round a short delay line, which
//          is what a plucked string sounds like. Harrison is a folk musician,
//          so his strum and the title music are real plucked strings
//   drums  a pitched-down sine for the kick, noise for snare and hat
//
// Music is one short loop per place: each aisle, the bowl, and the title and
// directory. A loop is rendered the first time it is wanted, not at load, so
// the page opens fast; the longest takes a few tens of milliseconds.
//
// Browser half only: game.js emits events and this listens. Nothing here
// feeds back into the logic, so it may use Math.random, though the noise is
// seeded so a sound is the same every time.
//
// Not AdAudio.init(): it loads a manifest under one Promise.all, so one
// failure would silence everything. Each sound loads on its own, and a failure
// leaves only that one silent.

GH.sound = {

  RATE: 22050,
  KEY: 'grocery-harrison-muted',
  available: false,
  muted: false,
  loaded: [],
  failed: [],
  musicNow: null,        // the track playing, by name
  musicCache: {},        // name -> blob URL, rendered once
  musicWant: null,       // what should be playing, set before audio unlocks
  unlocked: false,

  // ---------------------------------------------------------------------------
  //  INSTRUMENTS
  // ---------------------------------------------------------------------------
  freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); },

  noiseGen(seed = 7) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 1073741823.5 - 1;
    };
  },

  // Write one chip note into `out` at `start` samples, wrapping round the end
  // so a loop's last note rings into its first bar.
  chipNote(out, start, len, midi, v) {
    const R = this.RATE;
    const f = this.freq(midi);
    const n = Math.floor((len + (v.release || 0.05)) * R);
    const duty = v.duty || 0.5;
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / R;
      const vib = v.vibrato ? 1 + Math.sin(t * 2 * Math.PI * 5.5) * v.vibrato * Math.min(1, t * 3) : 1;
      ph += f * vib / R;
      const p = ph % 1;
      let w;
      if (v.wave === 'tri') w = 4 * Math.abs(p - 0.5) - 1;
      else if (v.wave === 'sine') w = Math.sin(p * 2 * Math.PI);
      else w = p < duty ? 1 : -1;
      // ADSR, with the release starting at the note's length.
      const a = v.attack || 0.004, d = v.decay || 0.08, s = v.sustain === undefined ? 0.6 : v.sustain;
      let e = t < a ? t / a : t < a + d ? 1 - (1 - s) * (t - a) / d : s;
      if (t > len) e *= Math.max(0, 1 - (t - len) / (v.release || 0.05));
      const k = (start + i) % out.length;
      out[k] += w * e * v.vol;
    }
  },

  // Karplus-Strong: noise round a delay line one period long, averaged and
  // damped each pass. `bright` is how much of the raw noise's top end is kept.
  pluckNote(out, start, len, midi, v, seed) {
    const R = this.RATE;
    const period = Math.max(2, Math.round(R / this.freq(midi)));
    const line = new Float32Array(period);
    const rnd = this.noiseGen(seed || (midi * 977 + 13));
    const bright = v.bright === undefined ? 0.6 : v.bright;
    let lp = 0;
    for (let i = 0; i < period; i++) {
      const x = rnd();
      lp += (x - lp) * bright;
      line[i] = lp;
    }
    const damp = v.damp || 0.996;
    const n = Math.floor(len * R);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const cur = line[idx];
      const nxt = line[(idx + 1) % period];
      line[idx] = (cur + nxt) * 0.5 * damp;
      idx = (idx + 1) % period;
      const fade = i > n - 400 ? (n - i) / 400 : 1;
      const k = (start + i) % out.length;
      out[k] += cur * v.vol * fade;
    }
  },

  drum(out, start, kind, vol, rnd) {
    const R = this.RATE;
    if (kind === 'k') {
      const n = Math.floor(0.16 * R);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / R;
        ph += (45 + 110 * Math.exp(-t * 30)) / R;
        out[(start + i) % out.length] += Math.sin(ph * 2 * Math.PI) * Math.exp(-t * 18) * vol;
      }
    } else if (kind === 's') {
      const n = Math.floor(0.14 * R);
      for (let i = 0; i < n; i++) {
        const t = i / R;
        const tone = Math.sin(t * 2 * Math.PI * 190) * Math.exp(-t * 30);
        out[(start + i) % out.length] += (rnd() * 0.8 + tone * 0.4) * Math.exp(-t * 22) * vol;
      }
    } else {
      // Hat or shaker: noise with its low end subtracted away.
      const n = Math.floor((kind === 'sh' ? 0.07 : 0.035) * R);
      let prev = 0;
      for (let i = 0; i < n; i++) {
        const t = i / R;
        const x = rnd();
        out[(start + i) % out.length] += (x - prev) * 0.5 * Math.exp(-t * (kind === 'sh' ? 40 : 90)) * vol;
        prev = x;
      }
    }
  },

  // ---------------------------------------------------------------------------
  //  MUSIC
  // ---------------------------------------------------------------------------
  // A song is a tempo, a length in bars, and voices. Each voice lists notes as
  // [step, length in steps, midi], a step being a sixteenth. `drums` lists
  // [step, kind]. A pattern repeated through the song is written once with
  // `rep`.
  rep(notes, every, times) {
    const out = [];
    for (let k = 0; k < times; k++) for (const [s, l, m] of notes) out.push([s + k * every, l, m]);
    return out;
  },

  // Chords as roots for a bass, and arpeggios over them, so a song is short.
  arp(start, chordNotes, pattern, len = 1) {
    return pattern.map((ix, i) => [start + i * len, len, chordNotes[ix % chordNotes.length]]);
  },

  songs() {
    const rep = (n, e, t) => this.rep(n, e, t);
    const arp = (s, c, p, l) => this.arp(s, c, p, l);
    const drumsBeat = (bars, kick, snare, hat) => {
      const d = [];
      for (let b = 0; b < bars; b++) {
        for (const s of kick) d.push([b * 16 + s, 'k']);
        for (const s of snare) d.push([b * 16 + s, 's']);
        for (const s of hat) d.push([b * 16 + s, 'h']);
      }
      return d;
    };

    // ---- the cereal aisle: bright, bouncy, C major, a breakfast march ----
    const cerealChords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    const cerealLead = [
      [0, 2, 76], [2, 2, 79], [4, 2, 76], [6, 1, 74], [7, 1, 72], [8, 4, 74], [12, 4, 72],
      [16, 2, 72], [18, 2, 76], [20, 2, 72], [22, 2, 69], [24, 6, 72], [30, 2, 69],
      [32, 2, 69], [34, 2, 72], [36, 2, 77], [38, 2, 76], [40, 4, 74], [44, 4, 72],
      [48, 2, 71], [50, 2, 74], [52, 2, 79], [54, 2, 77], [56, 6, 74], [62, 2, 71],
    ];
    const cereal = {
      bpm: 132, bars: 8,
      voices: [
        { wave: 'pulse', duty: 0.25, vol: 0.16, decay: 0.12, sustain: 0.5, release: 0.04,
          notes: [...cerealLead, ...cerealLead.map(([s, l, m]) => [s + 64, l, m + (s >= 48 ? 0 : 0)])] },
        { wave: 'tri', vol: 0.3, sustain: 0.8, release: 0.03,
          notes: cerealChords.flatMap((c, i) => rep([[0, 3, c[0] - 24], [4, 3, c[0] - 12], [8, 3, c[0] - 24], [12, 3, c[2] - 24]], 16, 1)
            .map(([s, l, m]) => [s + i * 16, l, m])).concat([]) },
        { wave: 'pulse', duty: 0.125, vol: 0.07, decay: 0.05, sustain: 0.2, release: 0.02,
          notes: cerealChords.flatMap((c, i) => arp(i * 16, c.map(n => n + 12), [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1])) },
      ],
      drums: drumsBeat(8, [0, 8], [4, 12], [2, 6, 10, 14]),
    };
    // Repeat the bass and arps over the second four bars.
    cereal.voices[1].notes = rep(cereal.voices[1].notes, 64, 2);
    cereal.voices[2].notes = rep(cereal.voices[2].notes, 64, 2);

    // ---- the dairy case: cold and sparse, D dorian, bells over a slow bass ----
    const dairy = {
      bpm: 92, bars: 8,
      voices: [
        // Bells: a sine with a long tail, high and few.
        { wave: 'sine', vol: 0.18, attack: 0.002, decay: 0.6, sustain: 0.15, release: 0.6,
          notes: rep([[0, 3, 81], [6, 2, 77], [10, 4, 74], [24, 3, 79], [30, 2, 76], [34, 6, 72],
            [48, 3, 81], [54, 2, 84], [58, 6, 81]], 64, 2) },
        { wave: 'tri', vol: 0.32, sustain: 0.9, release: 0.2,
          notes: rep([[0, 14, 38], [16, 14, 36], [32, 14, 41], [48, 14, 43]], 64, 2) },
        { wave: 'pulse', duty: 0.125, vol: 0.06, attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.3,
          notes: rep([...arp(0, [62, 65, 69, 72], [0, 2, 1, 3], 4), ...arp(16, [60, 64, 67, 71], [0, 2, 1, 3], 4),
            ...arp(32, [65, 69, 72, 76], [0, 2, 1, 3], 4), ...arp(48, [67, 71, 74, 77], [0, 2, 1, 3], 4)], 64, 2) },
      ],
      drums: [].concat(...Array.from({ length: 8 }, (_, b) => [[b * 16, 'k'], [b * 16 + 8, 'h'], [b * 16 + 12, 'h']])),
    };

    // ---- the produce aisle: a tropical shuffle, F major, marimba and clave ----
    const produceChords = [[53, 57, 60], [58, 62, 65], [60, 64, 67], [53, 57, 60]];
    const produce = {
      bpm: 112, bars: 8,
      voices: [
        // Marimba: a triangle that dies away fast, in a syncopated figure.
        { wave: 'tri', vol: 0.24, attack: 0.002, decay: 0.12, sustain: 0.0, release: 0.05,
          notes: rep(produceChords.flatMap((c, i) => [0, 3, 6, 8, 10, 13].map((s, j) => [i * 16 + s, 2, c[j % 3] + 12])), 64, 2) },
        // The tresillo bass, 3 + 3 + 2.
        { wave: 'tri', vol: 0.34, sustain: 0.7, release: 0.05,
          notes: rep(produceChords.flatMap((c, i) => [[i * 16, 3, c[0] - 12], [i * 16 + 6, 2, c[0] - 12], [i * 16 + 12, 3, c[2] - 12]]), 64, 2) },
        { wave: 'pulse', duty: 0.5, vol: 0.09, decay: 0.2, sustain: 0.6, release: 0.1, vibrato: 0.004,
          notes: [[0, 6, 77], [8, 4, 76], [12, 4, 72], [16, 6, 74], [24, 8, 70],
            [32, 6, 72], [40, 4, 76], [44, 4, 79], [48, 12, 77],
            [64, 6, 81], [72, 4, 79], [76, 4, 77], [80, 6, 76], [88, 8, 74],
            [96, 6, 72], [104, 4, 74], [108, 4, 76], [112, 12, 77]] },
      ],
      drums: [].concat(...Array.from({ length: 8 }, (_, b) => [
        [b * 16, 'k'], [b * 16 + 10, 'k'],
        ...[0, 2, 4, 6, 8, 10, 12, 14].map(s => [b * 16 + s, 'sh']),
        [b * 16 + 3, 's'], [b * 16 + 6, 's'], [b * 16 + 12, 's'],
      ])),
      snareVol: 0.12,
    };

    // ---- the bowl: dreamy, E-flat lydian, slow and floating ----
    const bowl = {
      bpm: 76, bars: 4,
      voices: [
        { wave: 'pulse', duty: 0.5, vol: 0.1, attack: 0.08, decay: 0.4, sustain: 0.7, release: 0.5, vibrato: 0.01,
          notes: [[0, 8, 75], [8, 8, 79], [16, 8, 81], [24, 8, 79], [32, 12, 77], [44, 4, 75], [48, 16, 74]] },
        { wave: 'tri', vol: 0.2, attack: 0.002, decay: 0.2, sustain: 0.3, release: 0.2,
          notes: rep([...arp(0, [63, 67, 70, 74, 69], [0, 1, 2, 3, 4, 3, 2, 1], 2)], 16, 4) },
        { wave: 'sine', vol: 0.26, sustain: 0.9, release: 0.4, notes: [[0, 30, 39], [32, 30, 41]] },
      ],
      drums: [],
    };

    // ---- the title and the directory: fingerpicked folk guitar, G major ----
    // Travis picking: an alternating bass on the thumb, a melody over it.
    const pick = (start, bass1, bass2, top) => [
      [start, 4, bass1], [start + 2, 2, top[0]], [start + 4, 4, bass2], [start + 6, 2, top[1]],
      [start + 8, 4, bass1], [start + 10, 2, top[2]], [start + 12, 4, bass2], [start + 14, 2, top[1]],
    ];
    const folk = {
      bpm: 96, bars: 4,
      voices: [
        { pluck: true, vol: 0.55, bright: 0.55, damp: 0.995,
          notes: [
            ...pick(0, 43, 50, [71, 74, 79]),
            ...pick(16, 48, 55, [72, 76, 79]),
            ...pick(32, 43, 50, [71, 74, 79]),
            ...pick(48, 50, 57, [72, 74, 78]),
          ] },
      ],
      drums: [],
    };

    return { cereal, dairy, produce, bowl, folk };
  },

  render(song) {
    const R = this.RATE;
    const step = 60 / song.bpm / 4;
    const total = song.bars * 16;
    const out = new Float32Array(Math.round(total * step * R));
    song.voices.forEach((v, vi) => {
      for (const [s, l, m] of v.notes) {
        const start = Math.round(s * step * R);
        if (v.pluck) this.pluckNote(out, start, l * step + 0.6, m, v, s * 31 + m + vi);
        else this.chipNote(out, start, l * step, m, v);
      }
    });
    const rnd = this.noiseGen(99);
    for (const [s, kind] of song.drums) {
      const vol = kind === 'k' ? 0.5 : kind === 's' ? (song.snareVol || 0.25) : kind === 'sh' ? 0.1 : 0.12;
      this.drum(out, Math.round(s * step * R), kind, vol, rnd);
    }
    return this.master(out);
  },

  // Peak-normalize and soften the very top, so no song is louder than another.
  master(out, peak = 0.8) {
    let max = 0;
    for (let i = 0; i < out.length; i++) max = Math.max(max, Math.abs(out[i]));
    const k = max > 0 ? peak / max : 1;
    for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * k * 1.1) / Math.tanh(1.1);
    return out;
  },

  // ---------------------------------------------------------------------------
  //  EFFECTS
  // ---------------------------------------------------------------------------
  // Each returns a Float32Array, built from the same instruments.
  effects() {
    const R = this.RATE;
    const make = (len, draw) => { const out = new Float32Array(Math.floor(len * R)); draw(out); return this.master(out, 0.7); };
    const rnd = this.noiseGen(5);
    const chip = (o, at, len, m, v) => this.chipNote(o, Math.floor(at * R), len, m, v);
    const blip = { wave: 'pulse', duty: 0.25, vol: 0.5, decay: 0.04, sustain: 0.3, release: 0.03 };
    const sweep = (f0, f1, len, wave, vol) => make(len, (o) => {
      let ph = 0;
      for (let i = 0; i < o.length; i++) {
        const t = i / R;
        ph += (f0 + (f1 - f0) * t / len) / R;
        const p = ph % 1;
        const w = wave === 'tri' ? 4 * Math.abs(p - 0.5) - 1 : p < 0.5 ? 1 : -1;
        o[i] = w * vol * Math.min(1, t / 0.005) * Math.pow(1 - t / len, 2);
      }
    });
    return {
      jump: sweep(240, 520, 0.12, 'pulse', 0.5),
      jumpHeavy: sweep(180, 380, 0.14, 'pulse', 0.5),
      land: make(0.09, (o) => { let lp = 0; for (let i = 0; i < o.length; i++) { const t = i / R; lp += (rnd() - lp) * 0.25; o[i] = (Math.sin(t * 2 * Math.PI * 70) * 0.6 + lp * 0.6) * Math.pow(1 - t / 0.09, 2); } }),
      // The strum: a G major chord, string by string, low to high.
      strum: make(1.3, (o) => [43, 47, 50, 55, 59, 67].forEach((m, i) =>
        this.pluckNote(o, Math.floor(i * 0.018 * R), 1.3 - i * 0.018, m, { vol: 0.5, bright: 0.7, damp: 0.994 }, 300 + i))),
      stomp: make(0.12, (o) => { chip(o, 0, 0.05, 72, blip); chip(o, 0.04, 0.06, 60, blip); }),
      boing: sweep(180, 720, 0.28, 'tri', 0.6),
      hurt: make(0.3, (o) => { let ph = 0; for (let i = 0; i < o.length; i++) { const t = i / R; ph += (220 - 400 * t) / R; o[i] = ((ph % 1) < 0.5 ? 0.5 : -0.5) * Math.pow(1 - t / 0.3, 1.5) + rnd() * 0.15 * (1 - t / 0.3); } }),
      drop: make(0.35, (o) => { for (const [at, m] of [[0, 67], [0.08, 64], [0.16, 60]]) chip(o, at, 0.06, m, blip); }),
      regrab: make(0.18, (o) => { chip(o, 0, 0.05, 72, blip); chip(o, 0.06, 0.08, 79, blip); }),
      sugar: make(0.16, (o) => { chip(o, 0, 0.04, 88, { ...blip, wave: 'sine', vol: 0.5 }); chip(o, 0.05, 0.08, 93, { ...blip, wave: 'sine', vol: 0.4 }); }),
      checkpoint: make(0.4, (o) => { chip(o, 0, 0.1, 76, { ...blip, wave: 'sine' }); chip(o, 0.12, 0.25, 83, { ...blip, wave: 'sine' }); }),
      grab: make(0.1, (o) => { for (let i = 0; i < o.length; i++) { const t = i / R; o[i] = rnd() * 0.4 * Math.sin(Math.PI * t / 0.1); } }),
      fall: sweep(900, 180, 0.6, 'tri', 0.5),
      splash: make(0.45, (o) => { let lp = 0; for (let i = 0; i < o.length; i++) { const t = i / R; lp += (rnd() - lp) * 0.15; o[i] = lp * Math.pow(1 - t / 0.45, 1.5) + Math.sin(t * 2 * Math.PI * (300 - 400 * t)) * 0.2 * Math.exp(-t * 12); } }),
      quest: make(0.5, (o) => { for (const [i, m] of [72, 76, 79, 84].entries()) chip(o, i * 0.08, 0.12, m, { ...blip, duty: 0.5 }); }),
      // Restored: a little fanfare, with the guitar under it.
      restored: make(1.6, (o) => {
        for (const [i, m] of [67, 72, 76, 79, 84].entries()) chip(o, i * 0.1, i === 4 ? 0.7 : 0.09, m, { ...blip, duty: 0.5, vol: 0.4 });
        [43, 47, 50, 55, 59, 67].forEach((m, i) => this.pluckNote(o, Math.floor((0.4 + i * 0.02) * R), 1.1, m, { vol: 0.35, bright: 0.7, damp: 0.995 }, 500 + i));
      }),
      magma: make(1.0, (o) => { let lp = 0; for (let i = 0; i < o.length; i++) { const t = i / R; lp += (rnd() - lp) * 0.05; o[i] = lp * 1.5 * Math.min(1, t * 8) * Math.pow(1 - t, 1.2) + (rnd() > 0.97 ? rnd() * 0.4 : 0); } }),
      prize: make(1.2, (o) => { for (const [i, m] of [72, 76, 79, 84, 88, 91].entries()) chip(o, i * 0.07, 0.1, m, { ...blip, wave: 'sine', vol: 0.5 }); chip(o, 0.45, 0.6, 96, { ...blip, wave: 'sine', vol: 0.4, release: 0.4 }); }),
      talk: make(0.05, (o) => chip(o, 0, 0.03, 79, { ...blip, vol: 0.3 })),
      tick: make(0.04, (o) => chip(o, 0, 0.02, 84, { ...blip, vol: 0.25 })),
      choose: make(0.2, (o) => { chip(o, 0, 0.05, 76, blip); chip(o, 0.06, 0.1, 83, blip); }),
    };
  },

  // 16-bit mono PCM in a RIFF/WAVE container, as CALDERA builds it.
  wav(samples) {
    const n = samples.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, this.RATE, true); v.setUint32(28, this.RATE * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
    return new Blob([buf], { type: 'audio/wav' });
  },

  // ---------------------------------------------------------------------------
  //  SETUP AND PLAYBACK
  // ---------------------------------------------------------------------------
  async init() {
    this.available = typeof AdAudio === 'object'
      && (typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function');
    try { this.muted = localStorage.getItem(this.KEY) === '1'; } catch (err) { this.muted = false; }
    GH.game.on((type, data) => this.onEvent(type, data));
    if (!this.available) return;
    AdAudio.setSfxMuted(this.muted);
    AdAudio.setMusicMuted(this.muted);

    const fx = this.effects();
    await Promise.all(Object.keys(fx).map(async (name) => {
      try {
        const url = URL.createObjectURL(this.wav(fx[name]));
        const pool = /^(jump|land|sugar|tick|talk)/.test(name) ? 3 : 2;
        await AdAudio.loadSfx(name, url, { pool, volume: name === 'strum' ? 0.9 : 0.7 });
        URL.revokeObjectURL(url);
        this.loaded.push(name);
      } catch (err) {
        this.failed.push(name);
      }
    }));
  },

  onEvent(type, data) {
    if (type === 'jump') this.play(GH.main.g && GH.main.g.player.carrying ? 'jumpHeavy' : 'jump');
    else if (type === 'respawn') { if (data && data.outOfHearts) this.play('fall'); }
    else if (type === 'aisle') this.music('aisle');
    else if (type === 'bowl') this.music('bowl');
    else if (['land', 'strum', 'stomp', 'boing', 'hurt', 'drop', 'regrab', 'sugar', 'checkpoint', 'grab',
      'fall', 'splash', 'quest', 'restored', 'magma', 'prize'].includes(type)) this.play(type);
  },

  play(name) {
    if (!this.available || this.muted) return;
    try { AdAudio.playSfx(name); } catch (err) { /* one silent sound, never a crash */ }
  },

  // Browsers only let audio start from inside a user gesture, so every press
  // that changes screens calls this, and it plays the menu click there and
  // then. adenosine-audio exports no resume call, and playSfx resumes the
  // context itself, so a real sound inside the press IS the unlock.
  unlock(sound = 'choose') {
    if (!this.available) return;
    this.unlocked = true;
    this.play(sound);
    if (this.musicWant && this.musicWant !== this.musicNow) this.music(this.musicWant);
  },

  // Which loop belongs where: 'title', 'aisle' (the running level's) or 'bowl'.
  trackFor(where) {
    if (where === 'bowl') return 'bowl';
    if (where === 'aisle') return GH.main.g ? GH.main.g.level.id : 'folk';
    return 'folk';
  },

  async music(where) {
    const name = this.trackFor(where);
    this.musicWant = name;
    if (!this.available || !this.unlocked || name === this.musicNow) return;
    this.musicNow = name;
    try {
      if (!this.musicCache[name]) {
        const song = this.songs()[name];
        if (!song) return;
        this.musicCache[name] = URL.createObjectURL(this.wav(this.render(song)));
      }
      AdAudio.stopMusic();
      await AdAudio.loadMusic(this.musicCache[name], { volume: 0.32 });
      // A newer request may have arrived while this one loaded.
      if (this.musicNow !== name) return;
      await AdAudio.playMusic(0.8);
    } catch (err) {
      this.musicNow = null;
    }
  },

  toggle() {
    this.muted = !this.muted;
    if (this.available) {
      AdAudio.setSfxMuted(this.muted);
      AdAudio.setMusicMuted(this.muted);
    }
    try { localStorage.setItem(this.KEY, this.muted ? '1' : '0'); } catch (err) { /* not remembered */ }
    // Unmuting is a press, so it can start the music it may never have started.
    if (!this.muted) this.unlock('tick');
    return this.muted;
  },

  // What loaded, for the console.
  report() {
    return { available: this.available, muted: this.muted, loaded: this.loaded, failed: this.failed, music: this.musicNow };
  },
};
