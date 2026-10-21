// The jukebox page: a VIEW over the site's one jukebox engine.
//
// assets/jukebox.js owns the <audio> element and runs media-player's playback
// core; this page reads its state, calls window.MCJukebox, and re-renders when
// it changes. The nav's mini-player is a second view over the same engine, so
// the two can no longer disagree, play the same song twice, or lose the music
// when you leave the page. See the header of assets/jukebox.js.
//
// It used to be a whole player of its own, with a "+" queue that consumed
// itself with shift() while "previous" counted back through the master list,
// so after a queued song "previous" went somewhere the listener had never
// been. That queue is media-player's queueNext now, with tests.

(function () {
  'use strict';

  var selectedId = null;
  // file -> release id, from songs.json's `release` field. The engine's track
  // list carries only what playing needs, so the page reads the manifest
  // itself; the browser has it cached from the engine's own fetch.
  var releaseOf = {};
  var J = null;
  var unsubscribe = null;
  // What was last written, compared as strings. Comparing against innerHTML
  // never matched, because the browser re-serialises it (&#9654; comes back
  // as the character), so the list was rebuilt on every tick, four times a
  // second, and a button could be replaced between mousedown and mouseup.
  var lastSongs = '';
  var lastQueue = '';

  /* ── DOM REFS ── */
  var npTitle = document.getElementById('npTitle');
  var npArtist = document.getElementById('npArtist');
  var npElapsed = document.getElementById('npElapsed');
  var npDuration = document.getElementById('npDuration');
  var playBtn = document.getElementById('playBtn');
  var stopBtn = document.getElementById('stopBtn');
  var playingIndicator = document.getElementById('playingIndicator');
  var neonLights = document.getElementById('neonLights');
  var songListInner = document.getElementById('songListInner');
  var slPage = document.getElementById('slPage');
  var queueList = document.getElementById('queueList');

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── RELEASES ──
     Songs grouped under the release they come from, with its cover, in the
     manifest's order: songs.json keeps each release's songs together, newest
     release first, so the queue (which plays the manifest in order) runs
     through an album rather than jumping between artists. Songs with no
     release share a group at the end. Titles, years and covers come from
     music/distributed-music/releases.js, the catalogue the streaming page
     renders, and covers are its 320px thumbnails. */
  var catalogueBase = new URL('../distributed-music/', location.href);

  function releaseInfo(id) {
    var list = window.RELEASES || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      var r = list[i];
      var m = /^(.*?)\s*\((\d{4})\)$/.exec(r.title);
      var art = r.art ? new URL(r.art, catalogueBase).pathname : '';
      var thumb = art.replace(/(\/assets\/album-art\/)(.+)\.[^./]+$/, function (x, dir, name) {
        return dir + 'thumbs/' + name.split('/').join('__') + '.jpg';
      });
      return { name: m ? m[1] : r.title, year: m ? m[2] : '', artist: r.artist, art: art, thumb: thumb };
    }
    return null;
  }

  function groups() {
    var out = [];
    var at = {};
    J.tracks().forEach(function (t) {
      var key = releaseOf[t.id] || '';
      if (!(key in at)) {
        at[key] = out.length;
        out.push({ key: key, info: key ? releaseInfo(key) : null, tracks: [] });
      }
      out[at[key]].tracks.push(t);
    });
    // The no-release group goes last whatever order the manifest is in.
    out.sort(function (a, b) { return (a.key ? 0 : 1) - (b.key ? 0 : 1); });
    return out;
  }

  // The full cover is the fallback if a thumbnail is ever missing; see the
  // error listener in bind().
  function coverOf(info) {
    return info && info.thumb
      ? '<img class="rg-cover" src="' + esc(info.thumb) + '" alt="" width="56" height="56" loading="lazy"' +
        (info.thumb !== info.art ? ' data-full="' + esc(info.art) + '"' : '') + '>'
      : '<div class="rg-cover rg-vinyl" aria-hidden="true"></div>';
  }

  function buttons(t) {
    return '<div class="song-btns">' +
        '<button class="song-btn play" data-action="play" data-id="' + esc(t.id) + '" aria-label="play ' + esc(t.title) + '">&#9654;</button>' +
        '<button class="song-btn queue" data-action="queue" data-id="' + esc(t.id) + '" aria-label="play ' + esc(t.title) + ' next">+</button>' +
      '</div>';
  }

  function rowClass(t, state, extra) {
    return 'song-item' + (extra || '') + (t.id === state.id ? ' playing' : '') + (t.id === selectedId ? ' selected' : '');
  }

  /* Most releases here are represented by one song, and a header over a
     single row doubled the list's length for nothing. One song is one row:
     the cover, the song, and where it is from. */
  function singleRow(g, t, state) {
    var info = g.info;
    var where = (t.title === info.name ? '' : 'from ' + info.name + ' \u00b7 ') +
      info.artist + (info.year ? ' \u00b7 ' + info.year : '');
    return '<section class="release-group single">' +
        '<div class="' + rowClass(t, state, ' has-cover') + '">' + coverOf(info) +
          '<div class="song-info">' +
            '<div class="song-title">' + esc(t.title) + '</div>' +
            '<div class="song-artist">' + esc(where) + '</div>' +
          '</div>' + buttons(t) +
        '</div>' +
      '</section>';
  }

  function groupHead(g) {
    var info = g.info;
    if (!info) {
      return '<div class="rg-head">' +
          '<div class="rg-cover rg-vinyl" aria-hidden="true"></div>' +
          '<div class="rg-text"><div class="rg-title">other recordings</div>' +
          '<div class="rg-meta">not on a release</div></div>' +
        '</div>';
    }
    return '<div class="rg-head">' + coverOf(info) +
        '<div class="rg-text"><div class="rg-title">' + esc(info.name) + '</div>' +
        '<div class="rg-meta">' + esc(info.artist) + (info.year ? ' \u00b7 ' + info.year : '') + '</div></div>' +
      '</div>';
  }

  function renderSongList(state) {
    var gs = groups();
    var count = J.tracks().length;
    var releases = gs.filter(function (g) { return g.key; }).length;
    slPage.textContent = count + ' songs \u00b7 ' + releases + ' releases';
    var html = '';
    gs.forEach(function (g) {
      if (g.info && g.tracks.length === 1) { html += singleRow(g, g.tracks[0], state); return; }
      var groupArtist = g.info ? g.info.artist : null;
      html += '<section class="release-group">' + groupHead(g);
      g.tracks.forEach(function (t, i) {
        html +=
          '<div class="' + rowClass(t, state) + '">' +
            '<span class="song-num">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<div class="song-info">' +
              '<div class="song-title">' + esc(t.title) + '</div>' +
              // The release header names the artist once; a row repeats it
              // only where it differs, which is every row of the other group.
              (t.artist !== groupArtist ? '<div class="song-artist">' + esc(t.artist) + '</div>' : '') +
            '</div>' + buttons(t) +
          '</div>';
      });
      html += '</section>';
    });
    if (html !== lastSongs) { songListInner.innerHTML = html; lastSongs = html; }
  }

  function renderNowPlaying(state) {
    var t = state.id ? J.track(state.id) : null;
    var playing = state.status === 'playing';
    if (t) {
      npTitle.textContent = state.status === 'error' ? '\u2014 playback error \u2014' : t.title;
      npArtist.textContent = t.artist;
      npElapsed.textContent = fmtTime(J.position());
      npDuration.textContent = t.duration || fmtTime(J.duration());
    } else {
      npTitle.textContent = '\u2014 select a song \u2014';
      npArtist.textContent = '';
      npElapsed.textContent = '0:00';
      npDuration.textContent = '0:00';
    }
    playBtn.textContent = playing ? 'PAUSE' : 'PLAY';
    playBtn.classList.toggle('playing', playing);
    playingIndicator.classList.toggle('active', playing);
    neonLights.classList.toggle('active', playing);
  }

  function renderQueue() {
    var ids = J.upNext();
    var html = ids.length === 0
      ? '<div class="queue-empty">queue empty</div>'
      : ids.map(function (id, i) {
          var t = J.track(id) || { title: id, artist: '' };
          return '<div class="queue-item">' +
            '<span>' + (i + 1) + '. ' + esc(t.title) + ' \u2014 ' + esc(t.artist) + '</span>' +
            '<button class="queue-remove" data-action="dequeue" data-idx="' + i + '" aria-label="remove ' + esc(t.title) + ' from up next">✕</button>' +
          '</div>';
        }).join('');
    if (html !== lastQueue) { queueList.innerHTML = html; lastQueue = html; }
  }

  function render(state) {
    renderNowPlaying(state);
    renderSongList(state);
    renderQueue();
  }

  /* ── EVENTS ── */
  function onKey(e) {
    // The nav player handles these keys while its panel is open, and marks
    // them; one press is never acted on twice.
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); J.toggle(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); J.prev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); J.next(); }
    else if (e.key === 'Escape') { J.stop(); }
  }

  function bind() {
    playBtn.addEventListener('click', function () { J.toggle(); });
    stopBtn.addEventListener('click', function () { J.stop(); });

    // A missing thumbnail falls back to the full cover. Delegated, because
    // the list is rebuilt, and error does not bubble, hence the capture.
    songListInner.addEventListener('error', function (e) {
      var img = e.target;
      if (img.tagName === 'IMG' && img.dataset.full && img.src.indexOf(img.dataset.full) < 0) {
        img.src = img.dataset.full;
      }
    }, true);

    songListInner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var id = btn.dataset.id;
      selectedId = id;
      if (btn.dataset.action === 'play') J.play(id);
      else if (btn.dataset.action === 'queue') J.queueNext(id);
    });

    queueList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="dequeue"]');
      if (btn) J.removeUpNext(parseInt(btn.dataset.idx, 10));
    });

    window.addEventListener('keydown', onKey);
  }

  /* ── START ──
     On a direct load this page brings assets/jukebox.js itself; after an SPA
     navigation the nav already has it. Either way the engine may still be
     loading its core and the manifest, so everything waits on ready. */
  function start() {
    J = window.MCJukebox;
    var manifest = fetch('songs.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) { list.forEach(function (x) { if (x.release) releaseOf[x.file] = x.release; }); })
      .catch(function () { /* ungrouped is still a working jukebox */ });
    Promise.all([J.ready, manifest]).then(function () {
      var s = J.state();
      bind();
      render(s);
      unsubscribe = J.subscribe(render);
    }).catch(function () {
      npTitle.textContent = '\u2014 jukebox unavailable \u2014';
    });
  }

  if (window.MCJukebox) start();
  else {
    var waited = 0;
    var poll = setInterval(function () {
      if (window.MCJukebox) { clearInterval(poll); start(); }
      else if ((waited += 50) > 10000) { clearInterval(poll); npTitle.textContent = '\u2014 jukebox unavailable \u2014'; }
    }, 50);
  }

  /* ── LEAVING THE PAGE ──
     The SPA router's hook. The music carries on, because the engine belongs
     to the nav; only this page's listeners go. */
  window.__pageCleanup = function () {
    if (unsubscribe) unsubscribe();
    window.removeEventListener('keydown', onKey);
  };
})();
