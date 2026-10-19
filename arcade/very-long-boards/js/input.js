// ═══════════════════════════════════════════════
// Very Long Boards — Input Handler
// ═══════════════════════════════════════════════

const input = {
    left: false,
    right: false,
    brake: false,
    trick: false,
    enter: false,
    escape: false,
    tab: false,
};

const keyState = {};

// Presses latched until the next frame reads them. input.left and input.right
// are cleared on keyup, and the game polls once a frame, so a press and release
// inside one frame - a quick tap, or any synthetic key event - was never seen at
// all: picking Party Carl with a fast tap of the right arrow left you riding
// Office Carl, and a quick tap of up never kicked off. consumeInput() ORs
// these in and clears them.
const pressed = { left: false, right: false, trick: false };

document.addEventListener('keydown', (e) => {
    if (keyState[e.code]) return;
    keyState[e.code] = true;
    
    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            input.left = true;
            pressed.left = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            input.right = true;
            pressed.right = true;
            break;
        case 'Space':
        case 'ArrowDown':
        case 'KeyS':
            input.brake = true;
            break;
        case 'ArrowUp':
        case 'KeyW':
            input.trick = true;
            pressed.trick = true;
            break;
        case 'Enter':
            input.enter = true;
            break;
        case 'Escape':
            input.escape = true;
            break;
        case 'Tab':
            input.tab = true;
            e.preventDefault();
            break;
    }
    
    // Prevent scrolling with arrow keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
    
    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            input.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            input.right = false;
            break;
        case 'Space':
        case 'ArrowDown':
        case 'KeyS':
            input.brake = false;
            break;
        case 'ArrowUp':
        case 'KeyW':
            input.trick = false;
            break;
    }
});

// A key released while the window is out of focus sends no keyup here, so a
// steer or brake held through an alt-tab stayed held when the player came back,
// and the next press of that key was swallowed as a repeat. Let go of
// everything when focus goes.
window.addEventListener('blur', () => {
    for (const code of Object.keys(keyState)) keyState[code] = false;
    input.left = false;
    input.right = false;
    input.brake = false;
    pressed.left = false;
    pressed.right = false;
    pressed.trick = false;
});

function consumeInput() {
    const consumed = { ...input };
    consumed.left = input.left || pressed.left;
    consumed.right = input.right || pressed.right;
    consumed.trick = input.trick || pressed.trick;
    pressed.left = false;
    pressed.right = false;
    pressed.trick = false;
    input.enter = false;
    input.escape = false;
    input.trick = false;
    input.tab = false;
    return consumed;
}

// Touch controls
let touchStartX = null;
let touchStartTime = 0;
let touchActive = false;

/**
 * Taps on things that are meant to be tapped - the select cards, the game-over
 * actions, the initials field - are left to the browser so they arrive as
 * clicks. Everything else on the screen is the steering pad.
 */
function isRiding() {
    return typeof gameState !== 'undefined' && gameState === 'playing';
}

function isUiTarget(e) {
    return e.target && e.target.closest &&
        e.target.closest('.cs-card, .bs-card, .go-action, input, a');
}

document.addEventListener('touchstart', (e) => {
    if (isUiTarget(e)) { touchActive = false; return; }
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    touchActive = true;
    // Off the road, a touch is only ever a tap: steering a menu with the
    // thirds and then confirming on release picked whatever the edge moved to.
    if (!isRiding()) return;

    const screenW = window.innerWidth;
    const x = e.touches[0].clientX;
    if (x < screenW * 0.35) {
        input.left = true;
        input.right = false;
    } else if (x > screenW * 0.65) {
        input.right = true;
        input.left = false;
    } else {
        input.left = false;
        input.right = false;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!touchActive) return;
    e.preventDefault();
    if (!isRiding()) return;
    const screenW = window.innerWidth;
    const x = e.touches[0].clientX;
    if (x < screenW * 0.35) {
        input.left = true;
        input.right = false;
    } else if (x > screenW * 0.65) {
        input.right = true;
        input.left = false;
    } else {
        input.left = false;
        input.right = false;
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    const elapsed = Date.now() - touchStartTime;
    // In a run the thirds are the controls, so only the middle is a trick. On
    // every other screen a tap anywhere means "go": the title used to ignore a
    // tap that happened to land in the left or right third.
    const riding = isRiding();
    if (touchActive && elapsed < 250 && (!riding || (!input.left && !input.right))) {
        input.trick = true;
        input.enter = true;
    }
    touchActive = false;
    input.left = false;
    input.right = false;
    input.brake = false;
    pressed.left = false;
    pressed.right = false;
    pressed.trick = false;
});
