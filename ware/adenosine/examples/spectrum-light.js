// spectrum-light: the visible spectrum, and the colour of a blackbody by temperature
var S = AdSpectrum;
var el = document.getElementById('output-content');
el.innerHTML = '';

function label(text) {
  var p = document.createElement('p');
  p.style.cssText = 'padding:.75rem 1rem .25rem;color:#9d99b5;font-size:13px;margin:0;';
  p.textContent = text;
  el.appendChild(p);
}

function strip(width, height, colorAt) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = 'display:block;margin:0 1rem;max-width:calc(100% - 2rem);border-radius:4px;';
  var ctx = canvas.getContext('2d');
  for (var x = 0; x < width; x++) {
    ctx.fillStyle = colorAt(x / (width - 1));
    ctx.fillRect(x, 0, 1, height);
  }
  el.appendChild(canvas);
}

// Monochromatic light, 380 to 700 nm, at full brightness and dimmed by the eye's response
label('wavelengthColor, 380 to 700 nm');
strip(480, 40, function (t) { return S.toCss(S.wavelengthColor(380 + t * 320)); });
label("brightness: 'luminous', so the ends fade as they do to the eye");
strip(480, 40, function (t) {
  return S.toCss(S.wavelengthColor(380 + t * 320, { brightness: 'luminous' }));
});

// Blackbody colour from candle flame to blue sky
label('lightColor(blackbody(K)), 1000 K to 12000 K');
strip(480, 40, function (t) { return S.toCss(S.lightColor(S.blackbody(1000 + t * 11000))); });

// A few named lights as swatches
label('swatches');
var row = document.createElement('div');
row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:.25rem 1rem 1rem;';
var lights = [
  ['candle 1900 K', S.blackbody(1900)],
  ['tungsten (A)', S.illuminantA()],
  ['Sun, space', S.blackbody(5778)],
  ['Sun through air', S.multiply(S.blackbody(5778), S.rayleigh(0.3))],
  ['daylight (D65)', S.illuminantD65()],
];
lights.forEach(function (l) {
  var rgb = S.lightColor(l[1]);
  var sw = document.createElement('div');
  sw.style.cssText = 'width:88px;font-size:11px;color:#9d99b5;text-align:center;';
  sw.innerHTML = '<div style="height:56px;border-radius:6px;background:' + S.toCss(rgb) + '"></div>' + l[0];
  row.appendChild(sw);
  console.log(l[0] + ' -> ' + S.toCss(rgb));
});
el.appendChild(row);

console.log('Wien peak of the Sun: ' + S.wienPeak(5778).toFixed(1) + ' nm');
