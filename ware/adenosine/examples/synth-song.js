// synth-song: a four-track chiptune loop on the Web Audio clock
var Y = AdSynth;
var el = document.getElementById('output-content');
el.innerHTML = '';

// Two bars of 16 ticks each: lead, harmony, bass, drums
var song = Y.createSong({ bpm: 132, length: 32 });
var lead = song.tracks[0], harmony = song.tracks[1], bass = song.tracks[2], drums = song.tracks[3];

[72, 76, 79, 76, 74, 77, 81, 77].forEach(function (p, i) {
  lead.notes.push({ tick: i * 4, length: 3, pitch: p });
});
[64, 67, 62, 65].forEach(function (p, i) {
  harmony.notes.push({ tick: i * 8, length: 7, pitch: p, velocity: 0.5 });
});
[48, 48, 43, 43, 50, 50, 45, 45].forEach(function (p, i) {
  bass.notes.push({ tick: i * 4, length: 2, pitch: p });
  bass.notes.push({ tick: i * 4 + 2, length: 2, pitch: p + 12 });
});
for (var t = 0; t < 32; t += 2) {
  drums.notes.push({ tick: t, length: 1, pitch: t % 8 === 4 ? 72 : 90, velocity: t % 4 ? 0.4 : 0.8 });
}

var info = document.createElement('p');
info.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;margin:0;';
info.textContent = 'Web Audio needs a click to start. Tracks: '
  + song.tracks.map(function (tr) { return tr.name + ' (' + tr.instrument.wave + ')'; }).join(', ');
el.appendChild(info);

function button(text, color) {
  var b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = 'margin:0 0 0 1rem;padding:.6rem 1.2rem;font-size:15px;'
    + 'background:' + color + ';color:#fff;border:none;border-radius:6px;cursor:pointer;';
  el.appendChild(b);
  return b;
}
var playBtn = button('Play', '#3b82f6');
var stopBtn = button('Stop', '#555');

var pos = document.createElement('p');
pos.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;font-family:monospace;';
pos.textContent = 'stopped';
el.appendChild(pos);

var ctx = null, seq = null, raf = 0;

function tick() {
  if (!seq || !seq.playing) { pos.textContent = 'stopped'; return; }
  var p = Math.floor(seq.position);
  pos.textContent = 'tick ' + String(p).padStart(2, '0') + ' / ' + song.length + '  '
    + '#'.repeat(p + 1) + '.'.repeat(song.length - p - 1);
  raf = requestAnimationFrame(tick);
}

playBtn.addEventListener('click', function () {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (!seq) seq = new Y.Sequencer(song, { context: ctx, volume: 0.25 });
  ctx.resume();
  seq.play();
  cancelAnimationFrame(raf);
  tick();
});

stopBtn.addEventListener('click', function () {
  if (seq) seq.stop();
});

console.log(song.bpm + ' bpm, one tick = ' + (Y.tickSeconds(song) * 1000).toFixed(0) + ' ms');
console.log('Song: ' + song.tracks.reduce(function (n, tr) { return n + tr.notes.length; }, 0)
  + ' notes, lead starts on ' + Y.noteName(lead.notes[0].pitch));
