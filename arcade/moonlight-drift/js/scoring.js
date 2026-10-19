// Scoring module - handles score display, leaderboard, and API communication

const scoreDisplay = document.getElementById('score');
const scoreListDisplay = document.getElementById('scoreList');
// const loadingScoresDisplay = document.getElementById('loadingScores');
const initialsPromptDiv = document.getElementById('initialsPrompt');
const initialsInput = document.getElementById('initialsInput');
const submitButton = document.getElementById('submitInitials');

let score = 0;
let sessionScores = [];
let lastScore = 0;
let waitingForInitials = false;
let submittingInitials = false; // Flag to prevent double submission

// Score display
function updateScoreDisplay() {
    scoreDisplay.textContent = `drifted: ${score}`;
}

function drawScoreOnCanvas(ctx) {
    ctx.save();
    
    // SNES-style score box background
    const boxX = 10;
    const boxY = 10;
    const boxHeight = 50;
    const text = `drifted: ${score}`;
    ctx.font = '16px "Press Start 2P", monospace';
    // Sized to the text: at 16px the pixel font is 16px a character, so the
    // old fixed 180px box held "score: 9999" and nothing longer.
    const boxWidth = Math.max(180, Math.ceil(ctx.measureText(text).width) + 30);
    
    // Draw background box (SNES blue-gray)
    ctx.fillStyle = '#3a4466';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw chunky SNES border using multiple rectangles
    // Outer light border
    ctx.strokeStyle = '#6a7a9a';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Inner dark border
    ctx.strokeStyle = '#2a3a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 4, boxY + 4, boxWidth - 8, boxHeight - 8);
    
    // Score text with pixel font
    ctx.fillStyle = '#ffd700'; // Gold color
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const textX = boxX + 15;
    const textY = boxY + 17;
    
    // Draw text outline for better visibility
    ctx.strokeText(text, textX, textY);
    // Draw text fill
    ctx.fillText(text, textX, textY);
    
    ctx.restore();
}

function incrementScore() {
    score++;
    updateScoreDisplay();
}

function resetScore() {
    score = 0;
    updateScoreDisplay();
}

function getScore() {
    return score;
}

function setLastScore(value) {
    lastScore = value;
}

// The board the current mode reads and writes; main.js's setMode() chooses it.
let scoreBoard = 'moonlight-drift';

function setScoreBoard(board) {
    scoreBoard = board;
    return loadScores();
}

// Leaderboard management — MAGMA//OPS backend with localStorage fallback
async function loadScores() {
    try {
        sessionScores = await scoreClient.load(scoreBoard);
        updateScoreboard();
    } catch (error) {
        console.error('Error loading scores:', error);
    }
}

// Score entries come back from the shared score server, which stores what
// players' browsers send it, so their text goes into the table as text.
function escapeScoreText(value) {
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
}

function updateScoreboard() {
    scoreListDisplay.innerHTML = '';
    
    const leftColumn = document.createElement('div');
    leftColumn.className = 'scoreColumn';
    leftColumn.innerHTML = '<div class="columnTitle">top 5</div>';
    
    const rightColumn = document.createElement('div');
    rightColumn.className = 'scoreColumn';
    rightColumn.innerHTML = '<div class="columnTitle">ranks 6-10</div>';
    
    sessionScores.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'scoreEntry' + (entry.isNew ? ' newScore' : '');
        div.innerHTML = `
            <span class="scoreRank">#${index + 1}</span>
            <span class="scoreInitials">${escapeScoreText(entry.initials)}</span>
            <span class="scoreValue">${escapeScoreText(entry.score)} pts</span>
        `;
        
        if (index < 5) {
            leftColumn.appendChild(div);
        } else {
            rightColumn.appendChild(div);
        }
    });
    
    scoreListDisplay.appendChild(leftColumn);
    scoreListDisplay.appendChild(rightColumn);
}

function clearNewScoreFlags() {
    sessionScores.forEach(s => s.isNew = false);
}

// High score checking
function isHighScore(finalScore) {
    // Must have at least score of 1 to qualify
    if (finalScore < 1) return false;
    
    // If less than 10 scores, it's automatically a high score
    if (sessionScores.length < 10) return true;
    
    // Otherwise, must beat the 10th place score
    const lowestTopScore = sessionScores[9].score;
    return finalScore > lowestTopScore;
}

function showInitialsPrompt() {
    waitingForInitials = true;
    
    // Calculate what rank this score will be
    let rank = 1;
    for (let i = 0; i < sessionScores.length; i++) {
        if (lastScore <= sessionScores[i].score) {
            rank = i + 2; // +2 because array is 0-indexed and we're inserting after
        }
    }
    
    // Get the achievement message element
    const achievementDiv = document.getElementById('achievementMessage');
    const titleElement = document.getElementById('initialsTitle');
    
    if (achievementDiv && titleElement) {
        // Create sophisticated messaging based on rank
        if (rank === 1) {
            // ALL TIME HIGH SCORE - Gold and spectacular
            achievementDiv.innerHTML = `
                <div style="font-size: 2em; font-weight: bold; color: #ffd700; text-shadow: 0 0 20px rgba(255, 215, 0, 0.9); margin-bottom: 15px; animation: pulse 1s infinite;">
                    ★ ALL TIME<br>BEST DRIFT! ★
                </div>
                <div style="font-size: 1.2em; color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.8); margin-bottom: 10px;">
                    you've topped<br>the logbook!
                </div>
            `;
            titleElement.style.color = '#ffd700';
        } else if (rank === 2) {
            // Second place - Silver
            achievementDiv.innerHTML = `
                <div style="font-size: 1.8em; font-weight: bold; color: #c0c0c0; text-shadow: 0 0 15px rgba(192, 192, 192, 0.8); margin-bottom: 15px;">
                    ★ 2ND PLACE! ★
                </div>
                <div style="font-size: 1.1em; color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.8); margin-bottom: 10px;">
                    so close to the top!
                </div>
            `;
            titleElement.style.color = '#c0c0c0';
        } else if (rank === 3) {
            // Third place - Bronze
            achievementDiv.innerHTML = `
                <div style="font-size: 1.8em; font-weight: bold; color: #cd7f32; text-shadow: 0 0 15px rgba(205, 127, 50, 0.8); margin-bottom: 15px;">
                    ★ 3RD PLACE! ★
                </div>
                <div style="font-size: 1.1em; color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.8); margin-bottom: 10px;">
                    top 3! impressive!
                </div>
            `;
            titleElement.style.color = '#cd7f32';
        } else if (rank <= 5) {
            // Top 5 - Cyan/Teal
            achievementDiv.innerHTML = `
                <div style="font-size: 1.6em; font-weight: bold; color: #00d4ff; text-shadow: 0 0 12px rgba(0, 212, 255, 0.8); margin-bottom: 15px;">
                    BEST DRIFT!<br>rank #${rank}
                </div>
                <div style="font-size: 1em; color: #ffffff; margin-bottom: 10px;">
                    you're in the elite!
                </div>
            `;
            titleElement.style.color = '#00d4ff';
        } else {
            // Top 10 - Green
            achievementDiv.innerHTML = `
                <div style="font-size: 1.5em; font-weight: bold; color: #2ecc71; text-shadow: 0 0 10px rgba(46, 204, 113, 0.7); margin-bottom: 15px;">
                    BEST DRIFT!<br>rank #${rank}
                </div>
                <div style="font-size: 1em; color: #ffffff; margin-bottom: 10px;">
                    you made the top 10!
                </div>
            `;
            titleElement.style.color = '#2ecc71';
        }
    }
    
    initialsPromptDiv.style.display = 'block';
    setTimeout(() => initialsInput.focus(), 100);
}

function hideInitialsPrompt() {
    initialsPromptDiv.style.display = 'none';
}

function showGameOverAchievement(finalScore) {
    const achievementDiv = document.getElementById('gameOverAchievement');
    const gameOverDiv = document.getElementById('gameOver');
    
    // Safety check - if elements don't exist, just return
    if (!achievementDiv || !gameOverDiv) {
        console.warn('Achievement or game over div not found');
        return;
    }
    
    // Calculate what rank this score would be
    let rank = 1;
    for (let i = 0; i < sessionScores.length; i++) {
        if (finalScore <= sessionScores[i].score) {
            rank = i + 2;
        }
    }
    
    // Remove all previous highscore classes
    gameOverDiv.className = '';
    
    // Only show achievement message if it's a high score
    if (isHighScore(finalScore)) {
        if (rank === 1) {
            achievementDiv.innerHTML = `
                <div style="font-size: 1.4em; font-weight: bold; color: #ffd700; text-shadow: 0 0 20px rgba(255, 215, 0, 0.9); margin: 10px 0 5px 0; animation: pulse 1s infinite; line-height: 1.3;">
                    ★ NEW ALL TIME BEST DRIFT! ★
                </div>
            `;
            if (gameOverDiv) gameOverDiv.classList.add('highscore-rank1');
        } else if (rank === 2) {
            achievementDiv.innerHTML = `
                <div style="font-size: 1.3em; font-weight: bold; color: #c0c0c0; text-shadow: 0 0 15px rgba(192, 192, 192, 0.8); margin: 10px 0 5px 0; line-height: 1.3;">
                    ★ 2ND PLACE! ★
                </div>
            `;
            if (gameOverDiv) gameOverDiv.classList.add('highscore-rank2');
        } else if (rank === 3) {
            achievementDiv.innerHTML = `
                <div style="font-size: 1.3em; font-weight: bold; color: #cd7f32; text-shadow: 0 0 15px rgba(205, 127, 50, 0.8); margin: 10px 0 5px 0; line-height: 1.3;">
                    ★ 3RD PLACE! ★
                </div>
            `;
            if (gameOverDiv) gameOverDiv.classList.add('highscore-rank3');
        } else if (rank <= 5) {
            achievementDiv.innerHTML = `
                <div style="font-size: 1.2em; font-weight: bold; color: #00d4ff; text-shadow: 0 0 12px rgba(0, 212, 255, 0.8); margin: 10px 0 5px 0; line-height: 1.3;">
                    ★ BEST DRIFT! rank #${rank} ★
                </div>
            `;
            if (gameOverDiv) gameOverDiv.classList.add('highscore-top5');
        } else {
            achievementDiv.innerHTML = `
                <div style="font-size: 1.1em; font-weight: bold; color: #2ecc71; text-shadow: 0 0 10px rgba(46, 204, 113, 0.7); margin: 10px 0 5px 0; line-height: 1.3;">
                    ★ BEST DRIFT! rank #${rank} ★
                </div>
            `;
            if (gameOverDiv) gameOverDiv.classList.add('highscore-top10');
        }
    } else {
        // Clear the achievement div if not a high score
        achievementDiv.innerHTML = '';
    }
}

function isWaitingForInitials() {
    return waitingForInitials;
}

function submitInitials(onComplete) {
    // Prevent double submission
    if (submittingInitials) {
        console.log('Already submitting initials, ignoring duplicate call');
        return;
    }
    
    submittingInitials = true;
    
    const initials = initialsInput.value.trim() || 'AAA';
    // sessionScores is the on-screen list only (isNew drives the highlight);
    // scoreClient owns persistence, per board, to localStorage and the backend.
    sessionScores.push({ initials: initials, score: lastScore, isNew: true });
    sessionScores.sort((a, b) => b.score - a.score);
    sessionScores = sessionScores.slice(0, 10);
    scoreClient.save(scoreBoard, initials, lastScore);
    updateScoreboard();
    initialsPromptDiv.style.display = 'none';
    initialsInput.value = '';
    waitingForInitials = false;
    
    // NOW show the game over display with the achievement banner
    const gameOverDiv = document.getElementById('gameOver');
    if (gameOverDiv) {
        gameOverDiv.style.display = 'block';
    }
    
    // Reset the flag after a short delay
    setTimeout(() => {
        submittingInitials = false;
    }, 500);
    
    if (onComplete) onComplete();
}

// Event listeners for initials input
initialsInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});

initialsInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent Enter from also triggering the button click
        submitInitials();
    }
});

// Submit button click listener
if (submitButton) {
    submitButton.addEventListener('click', () => {
        submitInitials();
    });
}