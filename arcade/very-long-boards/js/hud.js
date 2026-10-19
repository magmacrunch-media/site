// ═══════════════════════════════════════════════
// Very Long Boards — HUD (DOM-based)
// ═══════════════════════════════════════════════

let hudScoreEl, hudSpeedEl, hudDistEl, kickPromptEl, hudBalanceEl, hudBalanceWrapEl;

/** True on a phone or tablet, where the prompts talk about taps, not keys. */
window.IS_TOUCH = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

/**
 * Press Start 2P has no arrow glyphs, so "← →" drew as two dots. Text that names
 * a key writes (LEFT), (RIGHT), (UP) or (DOWN) and this swaps in an arrow drawn
 * in CSS. Only ever called on strings written in this codebase, never on input.
 */
window.withGlyphs = function(text) {
    return text.replace(/\((LEFT|RIGHT|UP|DOWN)\)/g, (_, d) =>
        '<span class="arrow arrow-' + d.toLowerCase() + '" aria-label="' + d.toLowerCase() + ' arrow"></span>');
};

/**
 * Elements carrying data-keys (and optionally data-touch) get their text from
 * there, so the markup states both versions of a prompt in one place.
 */
function applyPromptText() {
    document.querySelectorAll('[data-keys]').forEach((el) => {
        const text = window.IS_TOUCH && el.dataset.touch ? el.dataset.touch : el.dataset.keys;
        el.innerHTML = window.withGlyphs(text);
    });
}

window.initHUD = function() {
    hudScoreEl = document.getElementById('hudScore');
    hudSpeedEl = document.getElementById('hudSpeed');
    hudDistEl = document.getElementById('hudDist');
    kickPromptEl = document.getElementById('kickPrompt');
    hudBalanceEl = document.getElementById('hudBalance');
    hudBalanceWrapEl = document.getElementById('hudBalanceWrap');
    applyPromptText();
};

function updateHUD() {
    if (hudScoreEl) hudScoreEl.textContent = player.score;
    if (hudSpeedEl) hudSpeedEl.textContent = Math.floor(player.speed * CONFIG.SPEED_DISPLAY_FACTOR);
    if (hudDistEl) hudDistEl.textContent = Math.floor(player.distance);
    if (kickPromptEl) kickPromptEl.style.display = player.kicked ? 'none' : 'block';

    // The balance meter. The run has always ended when this reached zero, and
    // until it was drawn here the only warning was Carl wobbling.
    if (hudBalanceEl) {
        const frac = player.stability / CONFIG.STABILITY_MAX;
        hudBalanceEl.style.width = (frac * 100).toFixed(1) + '%';
        const low = player.stability < CONFIG.STABILITY_WOBBLE_AT;
        const critical = player.stability < CONFIG.STABILITY_WOBBLE_AT * 0.5;
        hudBalanceWrapEl.classList.toggle('low', low);
        hudBalanceWrapEl.classList.toggle('critical', critical);
        hudBalanceWrapEl.classList.toggle('carving', !!player.carving);
    }
}
