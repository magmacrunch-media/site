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

  var SONGS_PER_PAGE = 4;
  var currentPage = 1;
  var selectedId = null;
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
  var prevPageBtn = document.getElementById('prevPageBtn');
  var nextPageBtn = document.getElementById('nextPageBtn');
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

  /* ── RENDER ── */
  function totalPages() {
    return Math.max(1, Math.ceil(J.tracks().length / SONGS_PER_PAGE));
  }

  function renderSongList(state) {
    var tracks = J.tracks();
    var pages = totalPages();
    if (currentPage > pages) currentPage = pages;
    var start = (currentPage - 1) * SONGS_PER_PAGE;
    var end = Math.min(start + SONGS_PER_PAGE, tracks.length);
    slPage.textContent = currentPage + '/' + pages;
    var html = '';
    for (var i = start; i < end; i++) {
      var t = tracks[i];
      html +=
        '<div class="song-item' + (t.id === state.id ? ' playing' : '') + (t.id === selectedId ? ' selected' : '') + '">' +
          '<span class="song-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<div class="song-info">' +
            '<div class="song-title">' + esc(t.title) + '</div>' +
            '<div class="song-artist">' + esc(t.artist) + '</div>' +
          '</div>' +
          '<div class="song-btns">' +
            '<button class="song-btn play" data-action="play" data-id="' + esc(t.id) + '" aria-label="play ' + esc(t.title) + '">&#9654;</button>' +
            '<button class="song-btn queue" data-action="queue" data-id="' + esc(t.id) + '" aria-label="play ' + esc(t.title) + ' next">+</button>' +
          '</div>' +
        '</div>';
    }
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

    prevPageBtn.addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; renderSongList(J.state()); }
    });
    nextPageBtn.addEventListener('click', function () {
      if (currentPage < totalPages()) { currentPage++; renderSongList(J.state()); }
    });

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
    J.ready.then(function () {
      var s = J.state();
      // Open on the page holding what is playing, not always page one.
      var at = s.id ? J.tracks().findIndex(function (t) { return t.id === s.id; }) : -1;
      if (at >= 0) currentPage = Math.floor(at / SONGS_PER_PAGE) + 1;
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
