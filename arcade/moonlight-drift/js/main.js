// Main game module - orchestrates all other modules and runs the game loop

const gameOverDisplay = document.getElementById('gameOver');
const instructionsDisplay = document.getElementById('instructions');
const titleOverlay = document.getElementById('titleOverlay');
const muteBtn = document.getElementById('muteBtn');

// Web Audio API setup via adenosine-audio
let musicStarted = false;

// iOS has no Ogg Vorbis decoder, and every browser on iOS is WebKit, so Chrome
// and Firefox there fail identically - the audio was simply silent on every
// iPhone and iPad. Each clip now ships as .ogg and .mp3; pick whichever this
// browser can actually decode. Ogg stays preferred where it works, since the
// mp3 is a transcode of it.
const AUDIO_EXT = document.createElement('audio')
    .canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3';
const audioSrc = (path) => path.replace(/\.ogg$/, AUDIO_EXT);

async function loadAudio() {
    await AdAudio.init({
        music: { url: audioSrc('audio/moonlightdrift-gameloop.ogg'), volume: 0.3, fadeIn: 2.0 },
        sfx: {
            crash:   { url: audioSrc('audio/crashsound.ogg'), volume: 0.5 },
            button1: { url: audioSrc('audio/buttonsound1.ogg'), volume: 0.4 },
            button2: { url: audioSrc('audio/buttonsound2.ogg'), volume: 0.4 },
        },
    });
    AdAudio.handleVisibility({ pauseMusic: true });
}

async function playMusic() {
    if (musicStarted) return;
    await AdAudio.playMusic();
    musicStarted = true;
    startBeatClock();
}

function toggleMute() {
    const muted = AdAudio.toggleMusicMute();
    AdAudio.setSfxMuted(muted);
    const buttonText = muted ? 'SFX OFF' : 'SFX ON';

    if (muteBtn) {
        muteBtn.textContent = buttonText;
    }
    const modalMuteBtn = document.getElementById('modalMuteBtn');
    if (modalMuteBtn) {
        modalMuteBtn.textContent = buttonText;
    }
}

function playCrashSound() {
    AdAudio.playSfx('crash');
}

function playButtonSound() {
    AdAudio.playSfx('button1');
}

function playButtonSound2() {
    AdAudio.playSfx('button2');
}

// Make sound functions available globally
window.playCrashSound = playCrashSound;
window.playButtonSound = playButtonSound;
window.playButtonSound2 = playButtonSound2;

// ── moments ──────────────────────────────────────────────────────────────────
// The game announces what happened as `drift:*` CustomEvents on document, named
// for the game rather than for any platform. On the website nothing listens.
// In the App Store build, ios/shim/ listens and turns them into haptics; it
// never reaches into the game, so nothing there re-derives a rule.
//
// Dispatched here and not in player.js or obstacles.js, because those are the
// rules the Wii, tui and Roblox versions port line for line, and the seam goes
// where the ports are not (HOUSE.md in hypnopompia, "The seam, and the shims").
//
//   drift:start      a run begins                    { mode }
//   drift:pass       obstacles passed this tick      { count, score }
//   drift:milestone  a milestone obstacle passed     { milestone, score }
//   drift:crash      the run ends in a crash         { cause: 'edge' | 'obstacle', score, best, mode }
//   drift:set-end    a moonlight set flown to time   { score, best }
//   drift:unlock     a pilot opened                  { pilot, locked }
//
// `pass` carries a count rather than repeating, so two obstacles cleared in one
// tick are one moment. `best` is whether the score makes the current mode's
// board, which is the same isHighScore() the game-over screen asks. `locked`
// is how many pilots are still closed after this one opened, so 0 is the whole
// roster; unlocks.js decides that, and a listener need not ask it.
function announce(name, detail = {}) {
    document.dispatchEvent(new CustomEvent('drift:' + name, { detail }));
}

// ── modes ────────────────────────────────────────────────────────────────────
// Web and iOS only, like the pilot unlocks: the Wii, tui and Roblox versions
// are endless. A mode is a layer around the run, not a rule of it, so
// player.js and obstacles.js do not know which one is being played.
//
// endless   the game as it always was: fly until you crash.
// set       a timed flight of SET_SECONDS, counted in game ticks rather than
//           read from the audio, so it is immune to muting, a paused song or a
//           backgrounded app. The song loops under it as in endless; the
//           shipped loop is 11 seconds, far too short to be a round itself.
//
// Each mode keeps its own board, so a 90-second score never shares a table
// with an endless one.
const SET_SECONDS = 90;
const MODES = {
    endless: { board: 'moonlight-drift', label: 'endless', best: 'best drifts' },
};
const MODE_KEY = 'drift_mode';

function readMode() {
    try {
        const saved = localStorage.getItem(MODE_KEY);
        if (saved && MODES[saved]) return saved;
    } catch (e) {
        // Private mode or storage disabled: endless.
    }
    return 'endless';
}

let mode = readMode();

function setTicks() {
    return Math.round(SET_SECONDS * 1000 / TICK_MS);
}

// Choose a mode: remember it, relabel everything that names it, and switch
// the board the game-over screen and BEST DRIFTS read and write.
function setMode(next) {
    if (!MODES[next]) return;
    mode = next;
    try {
        localStorage.setItem(MODE_KEY, mode);
    } catch (e) {}
    const modeBtn = document.getElementById('modeBtn');
    if (modeBtn) modeBtn.textContent = MODES[mode].label;
    const boardBtn = document.getElementById('scoreboardBtn');
    if (boardBtn) boardBtn.textContent = MODES[mode].best;
    // By id: #moonTonight is a .mode-note too, and the website's build
    // (site/package.mjs) removes this one, so a class query would land there.
    const note = document.getElementById('setNote');
    if (note) note.textContent = `moonlight set: ${SET_SECONDS} seconds, as far as you can drift`;
    const boardTitle = document.querySelector('#scoreboard h3');
    if (boardTitle) boardTitle.textContent = MODES[mode].best;
    document.querySelectorAll('#modeChoice [data-mode]').forEach((b) => {
        b.classList.toggle('chosen', b.dataset.mode === mode);
    });
    return setScoreBoard(MODES[mode].board);
}

let gameRunning = false;
let gameStarted = false;
let frameCount = 0;
window.modalOpen = false;
let characterSelected = false;
let readyToStart = false;

// Make gameRunning accessible globally for input handler
window.gameRunning = false;

async function showCharacterSelectorOnStart() {
    titleOverlay.style.display = 'none';

    const characterSelector = document.getElementById('characterSelector');
    if (characterSelector) {
        characterSelector.style.display = 'flex';
    }

    window.modalOpen = true;
    characterModal.style.display = 'flex';
    renderCharacterGrid();

    if (!musicStarted) {
        await playMusic();
    }
}

function showReadyScreen() {
    readyToStart = true;
    const readyOverlay = document.getElementById('readyOverlay');
    if (readyOverlay) {
        readyOverlay.style.display = 'block';
    }
    // Tonight's moon, the same one that rises during the run (js/moon.js).
    const moonTonight = document.getElementById('moonTonight');
    if (moonTonight) moonTonight.textContent = `tonight: ${moonPhaseName()}`;
}

async function actuallyStartGame() {
    gameStarted = true;
    gameRunning = true;
    window.gameRunning = true;
    readyToStart = false;
    document.body.classList.add('game-active');
    gameOverDisplay.style.display = 'none';
    instructionsDisplay.style.display = 'none';
    titleOverlay.style.display = 'none';

    const readyOverlay = document.getElementById('readyOverlay');
    if (readyOverlay) {
        readyOverlay.style.display = 'none';
    }

    hideInitialsPrompt();

    resetPlayer();

    const currentChar = getCurrentCharacter();
    if (window.applyCharacterPhysics) {
        window.applyCharacterPhysics(player, currentChar);
    }

    resetObstacles();
    resetScore();
    frameCount = 0;
    clearNewScoreFlags();
    runUnlocks = [];

    announce('start', { mode });
    return true;
}

async function startGame() {
    if (gameStarted && gameRunning) {
        return false;
    }

    if (!characterSelected) {
        showCharacterSelectorOnStart();
        return false;
    }

    if (readyToStart) {
        return await actuallyStartGame();
    }

    return await actuallyStartGame();
}

// Pilots opened during the current run, named on the game-over screen.
let runUnlocks = [];

// cause is 'edge' or 'obstacle' for a crash, 'time' for a set flown to the end.
function handleGameOver(cause) {
    gameRunning = false;
    window.gameRunning = false;
    document.body.classList.remove('game-active');
    const finalScore = getScore();
    setLastScore(finalScore);

    const best = isHighScore(finalScore);
    if (cause === 'time') {
        announce('set-end', { score: finalScore, best });
    } else {
        announce('crash', { cause, score: finalScore, best, mode });
    }

    const title = document.getElementById('gameOverTitle');
    if (title) title.textContent = cause === 'time' ? 'SET COMPLETE!' : 'DRIFT OVER!';

    const unlockMessage = document.getElementById('unlockMessage');
    if (unlockMessage) {
        unlockMessage.textContent = runUnlocks.length
            ? 'new pilot: ' + runUnlocks.map((id) => window.characters[id].name).join(', ')
            : '';
    }

    const finalScoreSpan = document.getElementById('finalScore');
    if (finalScoreSpan) {
        finalScoreSpan.textContent = finalScore;
    }

    showGameOverAchievement(finalScore);

    if (isHighScore(finalScore)) {
        showInitialsPrompt();
    } else {
        gameOverDisplay.style.display = 'block';
    }
}

function handleSubmitInitials() {
    if (window.playButtonSound2) {
        window.playButtonSound2();
    }
    submitInitials(() => {
        gameOverDisplay.style.display = 'block';
    });
}

function update() {
    if (!gameRunning) return;

    frameCount++;

    const canvas = getCanvas();
    const thrustActive = getThrustActive() || false;

    const boundaryCollision = updatePlayer(thrustActive, canvas.height);
    if (boundaryCollision) {
        handleGameOver('edge');
        return;
    }

    if (frameCount % 120 === 0) {
        createObstacle(canvas.width, canvas.height);
    }

    // Which milestone obstacles are still ahead, so the ones passed this tick
    // can be named afterwards. obstacles.js decides what a milestone is and
    // marks it; this only reads the mark and the `passed` flag it sets.
    const milestonesAhead = getObstacles().filter((obs) => obs.milestone && !obs.passed);

    const { collision, scoreIncrement } = updateObstacles(player);

    if (collision) {
        handleGameOver('obstacle');
        return;
    }

    for (let i = 0; i < scoreIncrement; i++) {
        incrementScore();
    }

    if (scoreIncrement > 0) {
        announce('pass', { count: scoreIncrement, score: getScore() });
        for (const obs of milestonesAhead) {
            if (obs.passed) announce('milestone', { milestone: obs.milestone, score: getScore() });
        }
        for (const pilot of recordDrifted(scoreIncrement)) {
            runUnlocks.push(pilot);
            announce('unlock', { pilot, locked: pilotOrder().filter((id) => !isPilotUnlocked(id)).length });
        }
    }

    // After this tick's scoring, so an obstacle cleared on the last tick counts.
    if (mode === 'set' && frameCount >= setTicks()) {
        handleGameOver('time');
    }
}

// The set's clock: a bar under the score box that empties over the flight, the
// way makemecookies draws its shift. A bar rather than digits, because how
// long is left is a feel, not a number to read mid-flight.
function drawSetClock() {
    const ctx = getContext();
    const left = Math.max(0, 1 - frameCount / setTicks());
    const x = 10, y = 66, w = 180, h = 8;
    ctx.save();
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = left > 0.15 ? '#ffd700' : '#ff4d4d';
    ctx.fillRect(x, y, Math.round(w * left), h);
    ctx.strokeStyle = '#6a7a9a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
}

function draw(timestamp = 0) {
    if (window.modalOpen) return;

    const thrustActive = getThrustActive();
    renderGame(thrustActive, gameRunning, timestamp, characterSelected);
    if (gameRunning && mode === 'set') drawSetClock();
}

// How far the moon (js/moon.js) has risen: 0 before the first run, then the
// run's ticks against MOON_RISE_SECONDS, held where it was once a run ends.
function moonProgress() {
    if (!gameStarted) return 0;
    return Math.min(1, frameCount / Math.round(MOON_RISE_SECONDS * 1000 / TICK_MS));
}

// The rules advance a fixed amount per call to update() -- OBSTACLE_SPEED,
// gravity, thrust, an obstacle every 120 ticks -- and were tuned at 60 calls a
// second. Calling it once per animation frame tied game speed to the display:
// half speed in iOS Low Power Mode (30 fps), double on a 120 Hz screen. So
// update() runs on a fixed 60 Hz clock and the frame rate only decides how
// many ticks a frame owes. player.js and obstacles.js are untouched, which is
// what keeps the Wii, terminal and Roblox ports and the tui oracle valid.
const TICK_MS = 1000 / 60;
// A frame that owes more than this (a backgrounded tab, a long GC pause)
// drops the rest instead of fast-forwarding the player into a wall.
const MAX_TICKS_PER_FRAME = 4;
// A 60 Hz display delivers frames a hair either side of TICK_MS. Without some
// slack the backlog sits just under one tick and a frame now and then gets
// zero ticks and the next gets two, which reads as a stutter. Letting the
// backlog go up to 1 ms negative keeps one tick per frame there; the average
// rate is unchanged because the debt is paid back on the next frame.
const TICK_SLACK_MS = 1;
let lastFrameTime = null;
let tickBacklog = 0;

function gameLoop(timestamp) {
    if (lastFrameTime === null) lastFrameTime = timestamp;
    tickBacklog += timestamp - lastFrameTime;
    advanceBeatClock(timestamp - lastFrameTime);
    lastFrameTime = timestamp;

    let ticks = 0;
    while (tickBacklog >= TICK_MS - TICK_SLACK_MS && ticks < MAX_TICKS_PER_FRAME) {
        update();
        tickBacklog -= TICK_MS;
        ticks++;
    }
    if (ticks === MAX_TICKS_PER_FRAME) tickBacklog = 0;

    // Draw only when the state moved. drawStars() steps its blink counters
    // per call, so drawing every frame at 120 Hz would blink them twice as
    // fast, and a second identical frame shows nothing new anyway.
    if (ticks > 0) draw(timestamp);
    requestAnimationFrame(gameLoop);
}

// Initialize game
async function initGame() {
    const canvas = getCanvas();
    const submitBtn = document.getElementById('submitInitials');

    await loadAudio();

    setStartGameCallback(startGame);
    setSubmitInitialsCallback(handleSubmitInitials);
    setupCanvasInput(canvas);
    setupSubmitButton(submitBtn);

    initializeStarLayers();
    createStars(canvas.width, canvas.height);

    await setMode(mode);

    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    requestAnimationFrame(gameLoop);
}

initGame();

if (titleOverlay) {
    titleOverlay.addEventListener('click', async () => {
        await startGame();
    });
}

// The flight plan's two mode buttons choose and start in one tap: the click
// bubbles on to the overlay, whose own listener starts the run.
document.querySelectorAll('#modeChoice [data-mode]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
});

// The menu bar's mode button, for every run after the first.
const modeBtn = document.getElementById('modeBtn');
if (modeBtn) {
    modeBtn.addEventListener('click', () => {
        if (window.playButtonSound2) window.playButtonSound2();
        setMode(mode === 'endless' ? 'set' : 'endless');
    });
}

const readyOverlay = document.getElementById('readyOverlay');
if (readyOverlay) {
    readyOverlay.addEventListener('click', async () => {
        await startGame();
    });
}

function resizeCanvas() {
    // Canvas size is handled by CSS (100% of container)
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
});
resizeCanvas();

// Character selector
const characterModal = document.getElementById('characterModal');
const changeCharacterBtn = document.getElementById('changeCharacterBtn');
const closeModalBtn = document.getElementById('closeModal');
const characterGrid = document.getElementById('characterGrid');

if (changeCharacterBtn) {
    changeCharacterBtn.addEventListener('click', () => {
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = true;
        characterModal.style.display = 'flex';
        renderCharacterGrid();
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = false;
        characterModal.style.display = 'none';

        if (!characterSelected) {
            characterSelected = true;
            showReadyScreen();
        }
    });
}

if (characterModal) {
    characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) {
            window.modalOpen = false;
            characterModal.style.display = 'none';

            if (!characterSelected) {
                characterSelected = true;
                showReadyScreen();
            }
        }
    });
}

// The panel under the grid: who a pilot is and where the name comes from
// (js/pilot-bios.js). Shows the selected pilot, or a locked one that was
// tapped, so a player can see who they are flying toward.
function showPilotBio(id) {
    const panel = document.getElementById('pilotBio');
    if (!panel || !window.characters[id]) return;
    const locked = !isPilotUnlocked(id);
    panel.querySelector('.pilot-bio-name').textContent =
        window.characters[id].name + (locked ? ' (locked)' : '');
    panel.querySelector('.pilot-bio-line').textContent = pilotLine(id);
    panel.querySelector('.pilot-bio-credit').textContent = pilotCredit(id);
}

function renderCharacterGrid() {
    characterGrid.innerHTML = '';
    const allChars = getAllCharacters();
    const current = getCurrentCharacter();

    allChars.forEach(char => {
        const locked = !isPilotUnlocked(char.id);
        const option = document.createElement('div');
        option.className = 'character-option' + (char.id === current ? ' selected' : '') + (locked ? ' locked' : '');
        option.dataset.pilot = char.id;

        const preview = document.createElement('canvas');
        preview.className = 'character-preview';
        preview.width = 100;
        preview.height = 100;
        const previewCtx = preview.getContext('2d');

        previewCtx.fillStyle = '#1a1a2e';
        previewCtx.fillRect(0, 0, 100, 100);

        try {
            if (window.characters && window.characters[char.id] && window.characters[char.id].draw) {
                previewCtx.save();
                window.characters[char.id].draw(previewCtx, 30, 30, false, true, 0);
                previewCtx.restore();
            }
        } catch (e) {
            console.error('Error drawing character preview:', e);
        }

        // A locked pilot is shown, dimmed, so there is something to fly for.
        if (locked) {
            previewCtx.fillStyle = 'rgba(10, 10, 30, 0.72)';
            previewCtx.fillRect(0, 0, 100, 100);
        }

        const name = document.createElement('div');
        name.className = 'character-name';
        name.textContent = char.name;

        option.appendChild(preview);
        option.appendChild(name);

        if (locked) {
            const hint = document.createElement('div');
            hint.className = 'unlock-hint';
            hint.textContent = `locked: drift ${pilotUnlockAt(char.id) - lifetimeDrifted()} more`;
            option.appendChild(hint);
        } else if (window.getCharacterStats) {
            const stats = window.getCharacterStats(char.id);
            if (stats) {
                const statsDiv = document.createElement('div');
                statsDiv.className = 'character-stats';
                statsDiv.innerHTML = `
                    <div class="stat-row">
                        <span class="stat-label">size:</span>
                        <span class="stat-stars">${'★'.repeat(stats.sizeRating)}${'☆'.repeat(5-stats.sizeRating)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">agility:</span>
                        <span class="stat-stars">${'★'.repeat(stats.agilityRating)}${'☆'.repeat(5-stats.agilityRating)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">control:</span>
                        <span class="stat-stars">${'★'.repeat(stats.controlRating)}${'☆'.repeat(5-stats.controlRating)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">survival:</span>
                        <span class="stat-stars">${'★'.repeat(stats.survivabilityRating)}${'☆'.repeat(5-stats.survivabilityRating)}</span>
                    </div>
                `;
                option.appendChild(statsDiv);
            }
        }

        // Refused here rather than only styled, because the keyboard picker
        // selects by clicking the card. A locked card still shows its bio.
        option.addEventListener('click', () => {
            if (locked) {
                showPilotBio(char.id);
                return;
            }
            if (window.playButtonSound) {
                window.playButtonSound();
            }
            setCurrentCharacter(char.id);
            renderCharacterGrid();
        });

        characterGrid.appendChild(option);
    });
    showPilotBio(current);
}

// Mute button handlers
if (muteBtn) {
    muteBtn.addEventListener('click', toggleMute);
}

const modalMuteBtn = document.getElementById('modalMuteBtn');
if (modalMuteBtn) {
    modalMuteBtn.addEventListener('click', toggleMute);
}

// Credits modal
const creditsModal = document.getElementById('creditsModal');
const creditsBtn = document.getElementById('creditsBtn');
const closeCreditsBtn = document.getElementById('closeCreditsModal');

if (creditsBtn) {
    creditsBtn.addEventListener('click', () => {
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = true;
        creditsModal.style.display = 'flex';
    });
}

if (closeCreditsBtn) {
    closeCreditsBtn.addEventListener('click', () => {
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = false;
        creditsModal.style.display = 'none';
    });
}

if (creditsModal) {
    creditsModal.addEventListener('click', (e) => {
        if (e.target === creditsModal) {
            window.modalOpen = false;
            creditsModal.style.display = 'none';
        }
    });
}

window.addEventListener('beforeunload', () => {
    AdAudio.destroy();
});
