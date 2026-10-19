// Beat-reactive visuals - web and iOS only, and presentation only: nothing
// here reaches player.js or obstacles.js, so no rule and no port changes.
//
// adenosine-audio exposes neither its AudioContext nor the playback position,
// so the beat is kept by a clock of our own, started when the music starts
// and advanced by the same animation frames that draw the game. The two stay
// together because they stop together: a hidden page gets no frames, and
// AdAudio.handleVisibility pauses the music and resumes it from where it was.
// A frame gap longer than MAX_STEP_MS is taken to be that pause and skipped.
//
// The numbers were measured from web/audio/moonlightdrift-gameloop.ogg on
// 2026-10-18, by spectral-flux onsets decoded with ffmpeg: the loop is
// 11.1495 s and 16 beats (86.1 BPM, 4 bars of 4; autocorrelation agrees), the
// hits land 87 ms into each beat, and beat 1 of the bar is the strongest by
// half again. The .mp3 decodes to the same length and lines up with the ogg
// to the sample, so one set serves both. Replacing the track means measuring
// again.

const BEAT_LOOP_SECONDS = 11.1495;
const BEATS_PER_LOOP = 16;
const BEATS_PER_BAR = 4;
const BEAT_OFFSET_SECONDS = 0.087;
const BEAT_SECONDS = BEAT_LOOP_SECONDS / BEATS_PER_LOOP;
const MAX_STEP_MS = 250;

// Seconds of music played, or null before the music starts.
let beatClock = null;

function startBeatClock() {
    beatClock = 0;
}

function advanceBeatClock(stepMs) {
    if (beatClock === null || !(stepMs > 0) || stepMs > MAX_STEP_MS) return;
    // Modulo the loop, as the music itself is, so the phase never drifts by
    // accumulated floating point over a long session.
    beatClock = (beatClock + stepMs / 1000) % BEAT_LOOP_SECONDS;
}

function reducedMotion() {
    return typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 0 between beats, rising to 1 on a downbeat (about 0.6 on the other three)
// and falling away over the beat. Silent music, reduced motion, or no music
// yet all read as 0, so nothing pulses that cannot be heard.
function beatPulse() {
    if (beatClock === null || reducedMotion()) return 0;
    if (typeof AdAudio !== 'undefined' && AdAudio.isMusicMuted && AdAudio.isMusicMuted()) return 0;
    const t = beatClock - BEAT_OFFSET_SECONDS + BEAT_LOOP_SECONDS;
    const beat = Math.floor(t / BEAT_SECONDS);
    const into = (t % BEAT_SECONDS) / BEAT_SECONDS;
    const accent = beat % BEATS_PER_BAR === 0 ? 1 : 0.6;
    return accent * Math.exp(-into * 6);
}
