// Renderer module - handles all canvas drawing operations

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function drawBackground() {
    // Just clear the canvas - stars will be visible through transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // No boundary lines. renderer.js used to stroke a faint cyan line along the
    // top and bottom edges; on a phone only half of each 2px line landed on the
    // canvas and the scaled sliver shimmered against the notch and the home
    // indicator. The edge of the play area is the edge of the screen there.
}

function renderGame(thrustActive, isGameRunning, timestamp = 0, showCharacter = true) {
    drawBackground();
    drawStars(ctx);
    // Behind the pillars, in front of the stars (js/moon.js).
    drawMoon(ctx, moonProgress());
    drawObstacles(ctx, canvas.height);
    drawMilestoneMarkers(ctx, canvas.height);
    
    // Only draw character if showCharacter is true
    if (showCharacter) {
        drawPlayer(ctx, thrustActive, isGameRunning, timestamp);
    }
    
    // Only draw score when game is actually running (not on title/character/ready screens)
    if (isGameRunning) {
        drawScoreOnCanvas(ctx);
    }
}

function getCanvas() {
    return canvas;
}

function getContext() {
    return ctx;
}