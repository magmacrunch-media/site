// scope-tones: two tones a fifth apart on an oscilloscope; try X-Y for a Lissajous figure
var S = AdScope;
var el = document.getElementById('output-content');
el.innerHTML = '';

// A re-run builds a fresh panel, so let go of the last one and its sound.
if (window.__scopeDemo) {
  window.__scopeDemo.view.destroy();
  if (window.__scopeDemo.ctx) window.__scopeDemo.ctx.close();
}

var info = document.createElement('p');
info.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;margin:0;';
info.textContent = 'Web Audio needs a click to start. 220 Hz on the left channel, '
  + '330 Hz on the right. Switch the panel to X-Y to plot one against the other.';
el.appendChild(info);

function button(text, color) {
  var b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = 'margin:0 0 1rem 1rem;padding:.6rem 1.2rem;font-size:15px;'
    + 'background:' + color + ';color:#fff;border:none;border-radius:6px;cursor:pointer;';
  el.appendChild(b);
  return b;
}
var playBtn = button('Play', '#3b82f6');
var stopBtn = button('Stop', '#555');

// The panel lives in its own element's shadow root.
var host = document.createElement('div');
host.style.cssText = 'height:240px;margin:0 1rem 1rem;';
el.appendChild(host);
var view = new S.ScopeView(host, { settings: { mode: 'yt', timebase: 2 } });
var demo = window.__scopeDemo = { view: view, ctx: null };

playBtn.addEventListener('click', function () {
  if (demo.ctx) return;
  var ctx = demo.ctx = new (window.AudioContext || window.webkitAudioContext)();
  var merge = ctx.createChannelMerger(2);
  [220, 330].forEach(function (hz, channel) {
    var osc = ctx.createOscillator();
    osc.frequency.value = hz;
    osc.connect(merge, 0, channel);
    osc.start();
  });
  var out = ctx.createGain();
  out.gain.value = 0.05;
  merge.connect(out);
  out.connect(ctx.destination);
  // The scope listens off a branch of `merge`, ahead of the volume, so it
  // sees the tones at full scale while what you hear stays quiet. It is
  // never in the signal path.
  view.attach(merge);
  console.log('Attached:', view.attached, '- settings:', JSON.stringify(view.settings));
});

stopBtn.addEventListener('click', function () {
  if (!demo.ctx) return;
  view.detach();
  demo.ctx.close();
  demo.ctx = null;
  console.log('Stopped. Attached:', view.attached);
});
