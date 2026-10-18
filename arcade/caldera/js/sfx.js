// sfx.js -- sound effects through adenosine-audio, with no audio files.
//
// Each effect is synthesized here at load, as a few hundred milliseconds of
// PCM, wrapped in a WAV header and handed to AdAudio.loadSfx as a blob: URL.
// So playback is the arcade's own engine (pooled sources, one mute switch)
// while there is nothing to ship, nothing to 404 and no codec question: WAV
// decodes everywhere decodeAudioData exists, iOS Safari included.
//
// adenosine-audio has no pitch control, so the jump comes in three variants
// and the faster you run, the higher the one you hear.
//
// Not AdAudio.init(): it loads a manifest under one Promise.all, so one
// failure silences everything. Each sound loads on its own and a failure
// leaves just that one silent; AdAudio.playSfx already ignores unknown names.

CA.sfx = {

  RATE: 22050,
  KEY: 'caldera-muted',
  available: false,
  muted: false,
  loaded: [],
  failed: [],

  // ---------------------------------------------------------------
  //  SYNTHESIS
  // ---------------------------------------------------------------
  // Every voice is a function of time t (seconds) returning -1..1, over a
  // fixed length, with its own envelope. Noise is seeded so a sound is the
  // same on every load.
  voices() {
    let seed = 7;
    const noise = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 1073741823.5 - 1;
    };
    const sq = (ph) => (ph % 1 < 0.5 ? 1 : -1);
    const tri = (ph) => 4 * Math.abs((ph % 1) - 0.5) - 1;
    const env = (t, len, attack = 0.005) => Math.min(1, t / attack) * Math.pow(1 - t / len, 2);

    // A chirp from f0 to f1, integrated so the sweep is clean.
    const chirp = (f0, f1, len, wave, vol) => ({
      len,
      fn: (t) => {
        const ph = f0 * t + (f1 - f0) * t * t / (2 * len);
        return wave(ph) * env(t, len) * vol;
      },
    });

    let lp = 0;
    const lowNoise = (k) => { lp += (noise() - lp) * k; return lp; };

    return {
      jump0: chirp(220, 440, 0.12, sq, 0.22),
      jump1: chirp(260, 560, 0.13, sq, 0.22),
      jump2: chirp(310, 720, 0.15, sq, 0.22),
      land: { len: 0.09, fn: (t) => (tri(70 * t) * 0.6 + lowNoise(0.3) * 0.5) * env(t, 0.09) * 0.5 },
      wall: { len: 0.06, fn: (t) => (sq(900 * t) * 0.4 + noise() * 0.4) * env(t, 0.06, 0.001) * 0.35 },
      launch: { len: 0.45, fn: (t) => (noise() * 0.7 + sq(120 * t + 200 * t * t) * 0.2) * env(t, 0.45, 0.02) * 0.4 },
      crumble: { len: 0.3, fn: (t) => (noise() > 0.7 ? noise() : lowNoise(0.5) * 0.4) * env(t, 0.3) * 0.5 },
      crunch: {
        len: 0.42,
        fn: (t) => {
          // A rising arpeggio, the reward.
          const notes = [523, 659, 784, 1047];
          const i = Math.min(3, Math.floor(t / 0.07));
          return sq(notes[i] * t) * env(t, 0.42) * 0.22;
        },
      },
      chamber: { len: 0.9, fn: (t) => (tri(55 * t) * 0.7 + lowNoise(0.05) * 0.6) * env(t, 0.9, 0.03) * 0.6 },
      dead: { len: 0.8, fn: (t) => (lowNoise(0.6) * 0.7 + tri((90 - 60 * t) * t) * 0.4) * env(t, 0.8, 0.01) * 0.6 },
    };
  },

  // 16-bit mono PCM in a RIFF/WAVE container.
  wav(voice) {
    const n = Math.floor(voice.len * this.RATE);
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, this.RATE, true); v.setUint32(28, this.RATE * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, voice.fn(i / this.RATE)));
      v.setInt16(44 + i * 2, s * 32767, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  },

  // ---------------------------------------------------------------
  //  SETUP
  // ---------------------------------------------------------------
  async init() {
    this.available = typeof AdAudio === 'object'
      && (typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function');
    try { this.muted = localStorage.getItem(this.KEY) === '1'; } catch (err) { this.muted = false; }
    if (!this.available) return;
    AdAudio.setSfxMuted(this.muted);

    const voices = this.voices();
    await Promise.all(Object.keys(voices).map(async (name) => {
      try {
        const url = URL.createObjectURL(this.wav(voices[name]));
        await AdAudio.loadSfx(name, url, { pool: name.startsWith('jump') || name === 'land' ? 3 : 2 });
        URL.revokeObjectURL(url);
        this.loaded.push(name);
      } catch (err) {
        this.failed.push(name);
      }
    }));

    CA.game.on((type, data) => this.onEvent(type, data));
  },

  onEvent(type, data) {
    if (type === 'jump') {
      const speed = Math.abs(data.vx) / data.P.maxRun;
      this.play(speed > 0.75 ? 'jump2' : speed > 0.4 ? 'jump1' : 'jump0');
    } else if (type === 'land' || type === 'wall' || type === 'launch' || type === 'crumble'
               || type === 'crunch' || type === 'chamber' || type === 'dead') {
      this.play(type);
    }
  },

  // iOS only lets an AudioContext start from inside a user gesture, and
  // every sound here plays from the game loop, which is not one. So the
  // press that starts a run resumes it explicitly.
  unlock() {
    if (!this.available) return;
    try { AdAudio.resumeCtx(); } catch (err) { /* stays silent until the next gesture */ }
  },

  play(name) {
    if (!this.available || this.muted) return;
    try { AdAudio.playSfx(name); } catch (err) { /* one silent sound, never a crash */ }
  },

  toggle() {
    this.muted = !this.muted;
    if (this.available) AdAudio.setSfxMuted(this.muted);
    try { localStorage.setItem(this.KEY, this.muted ? '1' : '0'); } catch (err) { /* not remembered */ }
    return this.muted;
  },

  // What loaded, for the console.
  report() {
    return { available: this.available, muted: this.muted, loaded: this.loaded, failed: this.failed };
  },
};
