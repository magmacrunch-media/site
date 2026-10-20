// Card previews for the arcade hub, originally the four genre pages'
// inline scripts (keyboard nav removed). Each block draws into its own
// canvas id and returns early when that canvas is absent. The genre pages
// were retired on 2026-10-19 and now redirect to the hub, so this is the
// only copy.

// from board-games/index.html

// ── Chess preview ──
(function() {
    const c = document.getElementById('cChess');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);
    const sq = 8;
    for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 8; col++) {
            const x = 4 + col * sq;
            const y = 4 + r * sq;
            const isDark = (r + col) % 2 === 1;
            ctx.fillStyle = isDark ? '#1a0a2a' : '#2a1a3a';
            ctx.fillRect(x, y, sq, sq);
            if (r === 0) {
                ctx.fillStyle = '#ff2d78';
                ctx.fillRect(x + 2, y + 2, 4, 4);
            } else if (r === 1) {
                ctx.fillStyle = '#ff2d78';
                ctx.beginPath();
                ctx.arc(x + sq/2, y + sq/2, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (r === 6) {
                ctx.fillStyle = '#00f5ff';
                ctx.beginPath();
                ctx.arc(x + sq/2, y + sq/2, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (r === 7) {
                ctx.fillStyle = '#00f5ff';
                ctx.fillRect(x + 2, y + 2, 4, 4);
            }
        }
    }
})();

// ── Checkers preview ──
(function() {
    const c = document.getElementById('cCheckers');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);
    const sq = 8;
    for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 8; col++) {
            const x = 4 + col * sq;
            const y = 4 + r * sq;
            const isDark = (r + col) % 2 === 1;
            ctx.fillStyle = isDark ? '#1a0a2a' : '#2a1a3a';
            ctx.fillRect(x, y, sq, sq);
            if (isDark) {
                if (r < 3) {
                    ctx.fillStyle = '#ff2d78';
                    ctx.beginPath();
                    ctx.arc(x + sq/2, y + sq/2, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                } else if (r > 4) {
                    ctx.fillStyle = '#00f5ff';
                    ctx.beginPath();
                    ctx.arc(x + sq/2, y + sq/2, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }
})();

// ── Backgammon preview ──
(function() {
    const c = document.getElementById('cBackgammon');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0d0820';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);
    const triW = 5, triH = 25, startX = 6, gap = 1;
    for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0,245,255,0.4)' : 'rgba(255,45,120,0.4)';
        ctx.beginPath();
        ctx.moveTo(startX + i * (triW + gap), 4);
        ctx.lineTo(startX + i * (triW + gap) + triW, 4);
        ctx.lineTo(startX + i * (triW + gap) + triW / 2, 4 + triH);
        ctx.closePath();
        ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0,245,255,0.4)' : 'rgba(255,45,120,0.4)';
        ctx.beginPath();
        ctx.moveTo(startX + i * (triW + gap), 68);
        ctx.lineTo(startX + i * (triW + gap) + triW, 68);
        ctx.lineTo(startX + i * (triW + gap) + triW / 2, 68 - triH);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(34, 4, 4, 64);
    [[8,50],[13,50],[18,50],[8,55],[13,55]].forEach(([x,y]) => {
        ctx.fillStyle = '#00f5ff';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
    });
    [[54,22],[59,22],[64,22],[54,17],[59,17]].forEach(([x,y]) => {
        ctx.fillStyle = '#ff2d78';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5; ctx.stroke();
    });
    ctx.fillStyle = '#ffe03a';
    ctx.fillRect(22, 30, 8, 8);
    ctx.fillRect(42, 30, 8, 8);
    ctx.fillStyle = '#0a0612';
    ctx.beginPath(); ctx.arc(26, 34, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(46, 34, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7c1f';
    ctx.fillRect(33, 30, 6, 6);
    ctx.fillStyle = '#0a0612';
    ctx.font = '4px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2', 36, 35);
})();

// ── Parchís preview ──
(function() {
    const c = document.getElementById('cParchisi');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#F1BF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    // Draw cross-shaped board
    const cx = 36, cy = 36, arm = 10, len = 22;

    // Vertical arm
    ctx.fillStyle = '#2a1410';
    ctx.fillRect(cx - arm, cy - len, arm * 2, len * 2);

    // Horizontal arm
    ctx.fillRect(cx - len, cy - arm, len * 2, arm * 2);

    // Colored quadrants
    ctx.fillStyle = 'rgba(170,21,27,0.3)';
    ctx.fillRect(cx - arm, cy, arm, len);
    ctx.fillStyle = 'rgba(64,89,200,0.3)';
    ctx.fillRect(cx - arm, cy - len, arm, len);
    ctx.fillStyle = 'rgba(57,211,83,0.3)';
    ctx.fillRect(cx, cy - len, arm, len);
    ctx.fillStyle = 'rgba(255,225,53,0.3)';
    ctx.fillRect(cx, cy, arm, len);

    // Center
    ctx.fillStyle = '#F1BF00';
    ctx.fillRect(cx - 4, cy - 4, 8, 8);

    // Track dots
    const positions = [
        [26, 58], [26, 52], [26, 46], [26, 40], [26, 34],
        [20, 28], [14, 28], [8, 28],
        [8, 22], [8, 16], [14, 16], [20, 16], [26, 16],
        [26, 10], [26, 4],
        [36, 4], [46, 4],
        [46, 10], [46, 16], [52, 16], [58, 16], [64, 16],
        [64, 22], [64, 28], [58, 28], [52, 28],
        [46, 28], [46, 34], [46, 40], [46, 46], [46, 52], [46, 58],
        [36, 58],
    ];
    positions.forEach(([x, y]) => {
        ctx.fillStyle = '#2a1a50';
        ctx.fillRect(x - 2, y - 2, 4, 4);
    });

    // Tokens
    const tokens = [
        { x: 14, y: 58, color: '#AA151B' },
        { x: 58, y: 14, color: '#4059c8' },
        { x: 58, y: 58, color: '#39d353' },
        { x: 14, y: 14, color: '#F1BF00' },
    ];
    tokens.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    // Dice
    ctx.fillStyle = '#F1BF00';
    ctx.fillRect(30, 30, 6, 6);
    ctx.fillRect(38, 34, 6, 6);
    ctx.fillStyle = '#0a0612';
    ctx.beginPath(); ctx.arc(33, 33, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(41, 37, 1, 0, Math.PI * 2); ctx.fill();
})();

// ── Chinese Checkers preview ──
(function() {
    const c = document.getElementById('cChineseCheckers');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#c45fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    // Draw hexagonal star shape
    const cx = 36, cy = 36;

    // Draw hex cells in a star pattern
    const hexSize = 5;
    const positions = [
        // Top triangle
        [0, -4], [-1, -3], [0, -3], [1, -3],
        [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2],
        // Middle row
        [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
        [-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
        [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1],
        // Bottom triangle
        [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2],
        [-1, 3], [0, 3], [1, 3],
        [0, 4]
    ];

    positions.forEach(([q, r]) => {
        const x = cx + q * hexSize * 1.8;
        const y = cy + r * hexSize * 1.6;

        // Draw hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 180 * (60 * i);
            const hx = x + (hexSize - 1) * Math.cos(angle);
            const hy = y + (hexSize - 1) * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = '#2a1a3a';
        ctx.fill();
        ctx.strokeStyle = '#3a2d5c';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    // Draw player 1 pieces (top - cyan)
    const p1Positions = [[0, -4], [-1, -3], [0, -3], [1, -3], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2]];
    p1Positions.forEach(([q, r]) => {
        const x = cx + q * hexSize * 1.8;
        const y = cy + r * hexSize * 1.6;
        ctx.fillStyle = '#00f5ff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    // Draw player 2 pieces (bottom - magenta)
    const p2Positions = [[-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [-1, 3], [0, 3], [1, 3], [0, 4]];
    p2Positions.forEach(([q, r]) => {
        const x = cx + q * hexSize * 1.8;
        const y = cy + r * hexSize * 1.6;
        ctx.fillStyle = '#ff2d78';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });
})();



// from card-games/index.html

// ── Klondike Solitaire preview ──
(function() {
    const canvas = document.getElementById('cSolitaire');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#003838';
    ctx.fillRect(0, 0, 72, 72);
    ctx.fillStyle = '#ff2d78';
    ctx.fillRect(0, 0, 72, 3);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 3, 24, 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(48, 3, 24, 2);
    const cardY = 20, cardH = 24, cardW = 18;
    ctx.fillStyle = '#1a4a4a';
    ctx.fillRect(6, cardY, cardW, cardH);
    ctx.fillStyle = '#2a6a6a';
    for (let py = 0; py < cardH; py += 4) {
        for (let px = 0; px < cardW; px += 4) {
            ctx.fillRect(6 + px, cardY + py, 2, 2);
        }
    }
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, cardY, cardW, cardH);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(27, cardY, cardW, cardH);
    ctx.strokeStyle = '#ffd700';
    ctx.strokeRect(27, cardY, cardW, cardH);
    ctx.fillStyle = '#ff2d78';
    ctx.font = 'bold 8px serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', 36, cardY + 10);
    ctx.fillText('\u2665', 36, cardY + 20);
    ctx.fillStyle = '#1a4a4a';
    ctx.fillRect(48, cardY, cardW, cardH);
    ctx.fillStyle = '#2a6a6a';
    for (let py = 0; py < cardH; py += 4) {
        for (let px = 0; px < cardW; px += 4) {
            ctx.fillRect(48 + px, cardY + py, 2, 2);
        }
    }
    ctx.strokeStyle = '#00e5ff';
    ctx.strokeRect(48, cardY, cardW, cardH);
    ctx.fillStyle = '#ff2d78';
    ctx.font = '10px serif';
    ctx.fillText('\u2665', 16, 58);
    ctx.fillText('\u2666', 36, 58);
    ctx.fillStyle = '#111';
    ctx.fillText('\u2660', 56, 58);
})();

// ── Scandinavian Stud preview ──
(function() {
    const c = document.getElementById('cSoko');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, 72, 72);
    const grad = ctx.createRadialGradient(36, 36, 0, 36, 36, 40);
    grad.addColorStop(0, '#1a2a44');
    grad.addColorStop(1, '#0a1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 72, 72);
    const cardW = 14, cardH = 20, startY = 12;
    const cards = [
        { x: 10, suit: 'spades',   rank: 'K', faceUp: false },
        { x: 22, suit: 'hearts',   rank: 'A', faceUp: true },
        { x: 32, suit: 'diamonds', rank: 'Q', faceUp: true },
        { x: 42, suit: 'clubs',    rank: 'J', faceUp: true },
        { x: 52, suit: 'spades',   rank: '10', faceUp: true }
    ];
    cards.forEach(card => {
        if (!card.faceUp) {
            ctx.fillStyle = '#162040';
            ctx.fillRect(card.x, startY, cardW, cardH);
            ctx.strokeStyle = '#00f5ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(card.x, startY, cardW, cardH);
            ctx.fillStyle = '#1e3050';
            for (let py = 2; py < cardH - 2; py += 3) {
                for (let px = 2; px < cardW - 2; px += 3) {
                    ctx.fillRect(card.x + px, startY + py, 1, 1);
                }
            }
        } else {
            ctx.fillStyle = '#f0ead8';
            ctx.fillRect(card.x, startY, cardW, cardH);
            ctx.strokeStyle = '#00f5ff';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(card.x, startY, cardW, cardH);
            ctx.fillStyle = card.suit === 'hearts' || card.suit === 'diamonds' ? '#ff3d6e' : '#0a1628';
            ctx.font = '5px "Press Start 2P", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(card.rank, card.x + 2, startY + 7);
            const symbols = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
            ctx.font = '8px serif';
            ctx.textAlign = 'center';
            ctx.fillText(symbols[card.suit], card.x + cardW / 2, startY + 16);
        }
    });
    ctx.fillStyle = '#00f5ff';
    ctx.font = '8px serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u2660\u2665\u2666\u2663', 36, 62);
    ctx.fillStyle = '#39ff6e';
    ctx.fillRect(10, 68, 52, 2);
})();

// ── Texas Hold'em Lava Dome preview ──
(function() {
    const c = document.getElementById('cTHLD');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1c0000';
    ctx.fillRect(0, 0, 72, 72);
    const lava = ctx.createLinearGradient(0, 50, 0, 72);
    lava.addColorStop(0, '#6b0000');
    lava.addColorStop(0.5, '#9b0000');
    lava.addColorStop(1, '#ff5500');
    ctx.fillStyle = lava;
    ctx.fillRect(0, 50, 72, 22);
    ctx.fillStyle = '#ff7700';
    ctx.beginPath(); ctx.arc(12, 62, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(36, 66, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(60, 60, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc2200';
    ctx.beginPath(); ctx.arc(52, 18, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.arc(52, 18, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc2200';
    ctx.beginPath(); ctx.arc(52, 18, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff5500';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(52, 18, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(14, 10, 18, 26);
    ctx.strokeStyle = '#1c0000';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 10, 18, 26);
    ctx.fillStyle = '#1c0000';
    ctx.font = 'bold 7px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A', 20, 20);
    ctx.fillText('\u2660', 25, 32);
})();



// from puzzles/index.html

// ── 2048 preview ──
(function() {
    const c = document.getElementById('c2048');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#150005';
    ctx.fillRect(0, 0, 72, 72);
    const tiles = [
        { color: '#0a2a4a', text: '2',  textColor: '#5aaedd' },
        { color: '#0d4a7a', text: '4',  textColor: '#7ec8f0' },
        { color: '#1e0810', text: '',   textColor: '' },
        { color: '#0a7abf', text: '8',  textColor: '#fff' },
        { color: '#6a0060', text: '16', textColor: '#f07ad0' },
        { color: '#b0006a', text: '32', textColor: '#fff' },
        { color: '#1e0810', text: '',   textColor: '' },
        { color: '#F23C8F', text: '64', textColor: '#fff' },
        { color: '#1e0810', text: '',   textColor: '' },
        { color: '#c47a00', text: '128',textColor: '#fff0a0' },
        { color: '#FFD54A', text: '256',textColor: '#1a0a00' },
        { color: '#b02070', text: '512',textColor: '#fff' },
        { color: '#39ff6e', text: '2',  textColor: '#fff' },
        { color: '#ff7c1f', text: '4',  textColor: '#fff' },
        { color: '#ffe03a', text: '8',  textColor: '#000' },
        { color: '#1e0810', text: '?',  textColor: '#555' },
    ];
    const cellSize = 17, gap = 2, boardPad = 4;
    tiles.forEach((t, i) => {
        const x = (i % 4) * cellSize + boardPad;
        const y = Math.floor(i / 4) * cellSize + boardPad;
        ctx.fillStyle = t.color;
        ctx.fillRect(x, y, cellSize - gap, cellSize - gap);
        if (t.text && t.text !== '?') {
            ctx.fillStyle = t.textColor;
            ctx.font = `bold ${t.text.length > 2 ? '4' : '5'}px 'Press Start 2P', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(t.text, x + (cellSize - gap) / 2, y + (cellSize - gap) / 2 + 3);
        }
    });
    ctx.strokeStyle = '#F23C8F';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);
})();

// ── George Boole preview ──
(function() {
    const c = document.getElementById('cBoole');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, 72, 72);
    ctx.fillStyle = '#39ff6e';
    ctx.fillRect(4, 8, 14, 8);
    ctx.fillRect(4, 24, 14, 8);
    ctx.fillStyle = '#ff3d6e';
    ctx.fillRect(4, 40, 14, 8);
    ctx.fillRect(4, 56, 14, 8);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(22, 8, 24, 20);
    ctx.strokeStyle = '#ffe03a';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 8, 24, 20);
    ctx.fillStyle = '#ffe03a';
    ctx.font = '6px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AND', 34, 21);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(22, 40, 24, 20);
    ctx.strokeStyle = '#c45fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 40, 24, 20);
    ctx.fillStyle = '#c45fff';
    ctx.fillText('OR', 34, 53);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(46, 18); ctx.lineTo(58, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(46, 50); ctx.lineTo(58, 50); ctx.stroke();
    ctx.fillStyle = '#39ff6e';
    ctx.fillRect(58, 15, 8, 6);
    ctx.fillStyle = '#ff3d6e';
    ctx.fillRect(58, 47, 8, 6);
})();

// ── 15 Puzzle preview ──
(function() {
    const c = document.getElementById('cFifteen');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);
    const tiles = [
        [1,  2,  3,  4],
        [5,  6,  7,  8],
        [9,  10, 11, 0],
        [13, 14, 15, 12]
    ];
    const colors = {
        1: '#0a2a5a', 2: '#0a3a6a', 3: '#0a4a7a', 4: '#006a8a',
        5: '#007a6a', 6: '#008a5a', 7: '#1a7a1a', 8: '#3a7a00',
        9: '#6a6a00', 10: '#8a5a00', 11: '#aa4a00', 12: '#c43a00',
        13: '#aa1a3a', 14: '#8a0a5a', 15: '#6a0080'
    };
    const textColors = {
        1: '#5ba3f5', 2: '#6ec8ff', 3: '#8ed8ff', 4: '#a0f0ff',
        5: '#40ffc8', 6: '#39ff6e', 7: '#5fff5f', 8: '#a0ff40',
        9: '#ffe03a', 10: '#ffc832', 11: '#ffb03a', 12: '#ff9040',
        13: '#ff5a7a', 14: '#ff3d8e', 15: '#e040ff'
    };
    const cellSize = 16, gap = 1, boardPad = 3;
    for (let r = 0; r < 4; r++) {
        for (let col = 0; col < 4; col++) {
            const val = tiles[r][col];
            const x = boardPad + col * (cellSize + gap);
            const y = boardPad + r * (cellSize + gap);
            ctx.fillStyle = val === 0 ? 'rgba(0,0,0,0.3)' : colors[val];
            ctx.fillRect(x, y, cellSize, cellSize);
            if (val > 0) {
                ctx.fillStyle = textColors[val];
                ctx.font = 'bold 7px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val.toString(), x + cellSize / 2, y + cellSize / 2 + 1);
            }
        }
    }
})();

// ── Threes preview ──
(function() {
    const c = document.getElementById('cThrees');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a0a2a';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);
    const tiles = [
        [1,  3,  6,  0],
        [2,  3,  12, 24],
        [0,  1,  6,  12],
        [2,  1,  3,  6]
    ];
    const colors = {
        1: '#1a1a2e', 2: '#0a2a5a', 3: '#005a6a',
        6: '#006a4a', 12: '#4a6a00', 24: '#7a4a00'
    };
    const textColors = {
        1: '#f0ead8', 2: '#6ec8ff', 3: '#00f5ff',
        6: '#39ff6e', 12: '#ffe03a', 24: '#ff7c1f'
    };
    const cellSize = 16, gap = 1, boardPad = 3;
    for (let r = 0; r < 4; r++) {
        for (let col = 0; col < 4; col++) {
            const val = tiles[r][col];
            const x = boardPad + col * (cellSize + gap);
            const y = boardPad + r * (cellSize + gap);
            ctx.fillStyle = val === 0 ? 'rgba(0,0,0,0.3)' : colors[val];
            ctx.fillRect(x, y, cellSize, cellSize);
            if (val > 0) {
                ctx.fillStyle = textColors[val];
                ctx.font = 'bold 7px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val.toString(), x + cellSize / 2, y + cellSize / 2 + 1);
            }
        }
    }
})();

// ── Klotski preview ──
(function() {
    const c = document.getElementById('cKlotski');
    if (!c) return;
    const ctx = c.getContext('2d');

    // Dark indigo background
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(0, 0, 72, 72);

    // Board border (neon red)
    ctx.strokeStyle = '#ff2d4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    // Grid: 4 cols × 5 rows
    const cellW = 16, cellH = 13, gap = 1, padX = 3, padY = 3;

    // 2×2 block (gold) at center top
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(padX + cellW + gap, padY, cellW * 2 + gap, cellH * 2 + gap);
    ctx.fillStyle = '#ff8c00';
    ctx.fillRect(padX + cellW + gap + 2, padY + 2, cellW * 2 + gap - 4, cellH * 2 + gap - 4);
    ctx.fillStyle = '#1a0a00';
    ctx.font = 'bold 7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('曹', padX + cellW + gap + cellW, padY + cellH + 3);

    // 2×1 vertical blocks (jade green)
    const jadeBlocks = [[0, 0], [3, 0], [0, 3], [3, 3], [1, 2], [2, 2]];
    jadeBlocks.forEach(([col, row]) => {
        ctx.fillStyle = '#00cc88';
        ctx.fillRect(padX + col * (cellW + gap), padY + row * (cellH + gap), cellW, cellH * 2 + gap);
        ctx.fillStyle = '#009966';
        ctx.fillRect(padX + col * (cellW + gap) + 2, padY + row * (cellH + gap) + 2, cellW - 4, cellH * 2 + gap - 4);
    });

    // 1×1 blocks (cyan)
    ctx.fillStyle = '#0088aa';
    ctx.fillRect(padX, padY + 4 * (cellH + gap), cellW, cellH);
    ctx.fillRect(padX + 3 * (cellW + gap), padY + 4 * (cellH + gap), cellW, cellH);

    // Exit indicator (dashed red at bottom center)
    ctx.strokeStyle = 'rgba(255, 45, 74, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(padX + cellW + gap, padY + 3 * (cellH + gap), cellW * 2 + gap, cellH * 2 + gap);
    ctx.setLineDash([]);
})();

// ── Tetris preview ──
(function() {
    const canvas = document.getElementById('cTetris');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a192f';
    ctx.fillRect(0, 0, 72, 72);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 28, 72, 8);
    ctx.fillRect(26, 0, 8, 72);
    ctx.fillStyle = '#003580';
    ctx.fillRect(0, 30, 72, 4);
    ctx.fillRect(28, 0, 4, 72);
    ctx.fillStyle = '#00ffff';
    [[0,0],[1,0],[2,0],[1,1]].forEach(([bx,by]) => {
        ctx.fillRect(30 + bx*9, 14 + by*9, 8, 8);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(30, 14, 27, 2);
    ctx.fillRect(30, 14, 2, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px Courier New, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('888420', 68, 70);
})();



// from action/index.html

// ── makemecookies!x4 preview ──
(function() {
    const c = document.getElementById('cCookies');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#180c18';
    ctx.fillRect(0, 0, 72, 72);
    // checkerboard floor
    for (let x = 0; x < 72; x += 9) {
        ctx.fillStyle = ((x / 9) | 0) % 2 ? '#34163a' : '#26122a';
        ctx.fillRect(x, 56, 9, 16);
    }
    // oven, glowing
    ctx.fillStyle = '#26122a';
    ctx.fillRect(44, 22, 24, 30);
    ctx.fillStyle = '#ffc93c';
    ctx.fillRect(48, 28, 16, 18);
    ctx.fillStyle = '#4b2e1e';
    ctx.beginPath(); ctx.arc(56, 37, 5, 0, Math.PI * 2); ctx.fill();
    // belt
    ctx.fillStyle = '#5c4c64';
    ctx.fillRect(2, 46, 44, 6);
    ctx.strokeStyle = '#8e7b96';
    ctx.lineWidth = 1;
    for (let x = 4; x < 46; x += 7) {
        ctx.beginPath(); ctx.moveTo(x, 52); ctx.lineTo(x + 3, 46); ctx.stroke();
    }
    // dough on the line
    [10, 24, 38].forEach((x) => {
        ctx.fillStyle = '#f2d8a7';
        ctx.beginPath(); ctx.arc(x, 41, 5, 0, Math.PI * 2); ctx.fill();
    });
    // mixer bowl
    ctx.strokeStyle = '#ff5fa2';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(12, 26, 9, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(12, 28); ctx.stroke();
})();

// ── Moonlight drift preview ──
// Threading the gap between two pillars, synth cat at the controls, the moon
// behind and a dotted arc showing the drift so far.
(function() {
    const c = document.getElementById('cDrift');
    if (!c) return;
    const ctx = c.getContext('2d');

    const sky = ctx.createLinearGradient(0, 0, 0, 72);
    sky.addColorStop(0, '#0a0e27');
    sky.addColorStop(1, '#2c2a5e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 72, 72);

    ctx.fillStyle = '#ffffff';
    for (const [x, y] of [[4, 6], [16, 3], [27, 10], [6, 30], [12, 52], [3, 64], [26, 66], [40, 4], [66, 40], [68, 58], [22, 40]]) {
        ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = '#8fb8ff';
    for (const [x, y] of [[10, 18], [30, 58]]) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
    }

    // Crescent moon, cut by the sky colour behind it.
    ctx.fillStyle = '#f0e68c';
    ctx.beginPath(); ctx.arc(58, 14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d1129';
    ctx.beginPath(); ctx.arc(54, 11, 9, 0, Math.PI * 2); ctx.fill();

    // The pillars, with the gap the pilot is aiming for.
    const pillar = (x, y, h, capY) => {
        ctx.fillStyle = '#26365c';
        ctx.fillRect(x, y, 10, h);
        ctx.fillStyle = '#3a5288';
        ctx.fillRect(x + 1, y, 2, h);
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(x - 1, capY, 12, 3);
        ctx.fillStyle = '#0a5a78';
        ctx.fillRect(x - 1, capY + 2, 12, 1);
    };
    pillar(46, 0, 26, 24);
    pillar(46, 48, 24, 46);

    // The drift so far: a dotted arc from the lower left.
    ctx.fillStyle = 'rgba(0,212,255,0.55)';
    for (const [x, y] of [[4, 50], [9, 46], [14, 43], [19, 41], [24, 40]]) {
        ctx.fillRect(x, y, 2, 1);
    }

    // Synth cat: orange, ears up, keytar under one arm.
    ctx.fillStyle = '#ff9a2e';
    ctx.fillRect(30, 34, 8, 7);
    ctx.fillRect(31, 41, 6, 4);
    ctx.fillRect(30, 32, 2, 2);
    ctx.fillRect(36, 32, 2, 2);
    ctx.fillStyle = '#c86a14';
    ctx.fillRect(30, 38, 8, 1);
    ctx.fillRect(28, 43, 3, 1);
    ctx.fillStyle = '#1a1028';
    ctx.fillRect(33, 36, 1, 1);
    ctx.fillRect(36, 36, 1, 1);
    ctx.fillStyle = '#ffd8b0';
    ctx.fillRect(34, 38, 2, 1);
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(31, 44, 10, 2);
    ctx.fillStyle = '#1a1028';
    for (let k = 32; k < 40; k += 2) ctx.fillRect(k, 44, 1, 1);
    ctx.fillStyle = '#ff2e9c';
    ctx.fillRect(40, 43, 2, 2);
})();

// ── Very Long Boards preview ──
// Side on, because that is how a longboarder stands: Carl in a tuck, carving
// down a mountain road at dusk, pines in the fog behind him. The road falls
// one pixel in four so the board can be drawn as clean steps.
(function() {
    const c = document.getElementById('cVLB');
    if (!c) return;
    const ctx = c.getContext('2d');
    const road = x => 30 + (x >> 2);       // road surface at column x
    const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    // A thick pixel line, so limbs stay crisp instead of antialiased.
    const seg = (x0, y0, x1, y1, w, col) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) {
            px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w, col);
        }
    };

    const sky = ctx.createLinearGradient(0, 0, 0, 48);
    sky.addColorStop(0, '#1c1f36');
    sky.addColorStop(1, '#4a3f62');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 72, 72);

    // Far ridge, then a nearer one, both fading into the fog.
    const ridge = (col, pts, base) => {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, base);
        for (const [x, y] of pts) ctx.lineTo(x, y);
        ctx.lineTo(72, base); ctx.closePath(); ctx.fill();
    };
    ridge('#3a3a58', [[0, 20], [14, 8], [26, 18], [40, 6], [56, 16], [72, 10]], 72);
    ridge('#2c2c46', [[0, 26], [10, 18], [22, 26], [36, 16], [50, 25], [62, 18], [72, 22]], 72);

    // Everything from here sits on the road, dropped low in the frame.
    ctx.save();
    ctx.translate(0, 9);

    // Pines on the bank above the road, smaller and paler further off.
    const pine = (x, base, h, col) => {
        for (let r = 0; r < h; r++) {
            const half = Math.floor((r + 1) * 0.42);
            px(x - half, base - h + r, half * 2 + 1, 1, col);
        }
        px(x, base, 1, 2, col);
    };
    [[4, 25, 8], [12, 27, 10], [21, 29, 7], [52, 33, 9], [61, 35, 12], [69, 36, 8]]
        .forEach(([x, b, h]) => pine(x, b, h, '#20243a'));
    [[30, 30, 5], [40, 32, 6], [46, 33, 4]].forEach(([x, b, h]) => pine(x, b, h, '#2a2c46'));

    // Road, its kerb, and the hillside falling away beneath it.
    for (let x = 0; x < 72; x++) {
        const y = road(x);
        px(x, y, 1, 1, '#6a6478');
        px(x, y + 1, 1, 3, '#2c2833');
        px(x, y + 4, 1, 72 - y, '#16231b');
    }
    for (let x = 2; x < 72; x += 10) px(x, road(x) + 2, 4, 1, '#d8c070');
    for (const [x, dy] of [[6, 9], [15, 13], [27, 8], [44, 11], [58, 7], [64, 12]]) {
        px(x, road(x) + dy, 1, 2, '#2c4a30');
        px(x + 2, road(x) + dy - 1, 1, 3, '#2c4a30');
    }

    // Speed lines streaming off behind him, parallel to the road.
    for (const [x, dy, len] of [[3, -9, 9], [7, -15, 7]]) {
        for (let i = 0; i < len; i++) px(x + i, road(x + i) + dy, 1, 1, 'rgba(230,220,255,0.6)');
    }

    // The board: a long deck stepped down the slope, kicktail at the back.
    for (let x = 18; x <= 44; x++) {
        const y = road(x) - 3;
        px(x, y, 1, 1, '#9a6232');
        px(x, y + 1, 1, 1, '#5a3418');
    }
    px(17, road(17) - 4, 1, 1, '#9a6232');
    px(22, road(22) - 2, 3, 2, '#d8d0e0');
    px(39, road(39) - 2, 3, 2, '#d8d0e0');

    // Carl, tucked: knees bent, chest down over the front foot, one arm back.
    const jeans = '#5a6ca8', hood = '#ff2e9c', hoodDark = '#b81f6e';
    const fb = road(36) - 4, bb = road(24) - 4;           // where each shoe meets the deck
    seg(25, 22, 30, 25, 2, jeans);                         // back thigh
    seg(30, 25, 25, bb - 1, 2, jeans);                     // back shin
    seg(27, 21, 34, 23, 2, jeans);                         // front thigh
    seg(34, 23, 36, fb - 1, 2, jeans);                     // front shin
    px(23, bb, 4, 2, '#ece8f4');
    px(35, fb, 4, 2, '#ece8f4');
    seg(25, 20, 36, 15, 4, hood);                          // back and shoulders, flat in the tuck
    seg(25, 22, 33, 19, 1, hoodDark);
    seg(32, 17, 26, 21, 2, hoodDark);                      // trailing arm, hand on the hip
    px(25, 21, 2, 2, '#f0c8a0');
    seg(37, 17, 41, 21, 2, hood);                          // leading arm, low for balance
    px(41, 21, 2, 2, '#f0c8a0');
    px(38, 10, 5, 5, '#f0c8a0');                           // head, chin forward
    px(37, 9, 5, 3, '#1a1a24');                            // helmet
    px(36, 10, 2, 2, '#1a1a24');
    px(41, 11, 2, 1, '#00d4ff');                           // visor glint
    ctx.restore();
})();

// ── Roderick Tron preview ──
(function() {
    const c = document.getElementById('cTron');
    if (!c) return;
    const ctx = c.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, 72);
    sky.addColorStop(0, '#1a1028');
    sky.addColorStop(0.7, '#3a1830');
    sky.addColorStop(1, '#0d2a4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 72, 72);
    ctx.fillStyle = '#1a1428';
    ctx.fillRect(56, 20, 4, 30);
    ctx.fillRect(57, 14, 2, 6);
    ctx.fillStyle = '#2a1818';
    ctx.fillRect(5, 42, 62, 30);
    ctx.fillStyle = '#3a2828';
    for (let s = 0; s < 4; s++) {
        const sw = 62 - s * 8;
        ctx.fillRect(5 + s * 4, 42 - s * 4, sw, 4);
    }
    ctx.fillStyle = '#1a0a08';
    for (let wy = 0; wy < 2; wy++) {
        for (let wx = 0; wx < 3; wx++) {
            ctx.fillRect(10 + wx * 18, 48 + wy * 12, 6, 8);
        }
    }
    ctx.fillStyle = '#8a4020';
    ctx.fillRect(5, 40, 62, 4);
    ctx.fillStyle = '#6a3018';
    ctx.fillRect(5, 40, 62, 2);
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(50, 30, 8, 8);
    ctx.fillRect(52, 28, 4, 3);
    ctx.fillStyle = '#ff3d6e';
    ctx.fillRect(53, 29, 1, 1);
    ctx.fillRect(55, 29, 1, 1);
    ctx.fillStyle = '#1a1828';
    ctx.fillRect(18, 24, 8, 10);
    ctx.fillRect(17, 28, 2, 5);
    ctx.fillRect(26, 28, 2, 5);
    ctx.fillStyle = '#8899aa';
    ctx.fillRect(19, 18, 6, 6);
    ctx.fillStyle = '#cc6620';
    ctx.fillRect(18, 21, 2, 3);
    ctx.fillRect(25, 21, 2, 3);
    ctx.fillStyle = '#00f5ff';
    ctx.fillRect(20, 19, 2, 2);
    ctx.fillRect(23, 19, 2, 2);
    ctx.fillStyle = 'rgba(0, 245, 255, 0.3)';
    ctx.fillRect(19, 18, 4, 4);
    ctx.fillRect(22, 18, 4, 4);
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(21, 23, 4, 2);
    ctx.fillStyle = '#1a1828';
    ctx.fillRect(19, 34, 3, 4);
    ctx.fillRect(24, 35, 3, 3);
    ctx.fillStyle = '#f0ead8';
    ctx.fillRect(32, 22, 3, 3);
    ctx.fillRect(35, 19, 1, 3);
    ctx.fillRect(36, 19, 2, 1);
    ctx.fillStyle = 'rgba(0, 245, 255, 0.2)';
    ctx.fillRect(31, 20, 6, 6);
    ctx.fillStyle = '#333';
    ctx.fillRect(40, 34, 1, 6);
    ctx.fillStyle = '#ffe03a';
    ctx.fillRect(39, 32, 3, 3);
    ctx.fillStyle = 'rgba(255, 224, 58, 0.15)';
    ctx.beginPath(); ctx.arc(40, 33, 6, 0, Math.PI * 2); ctx.fill();
})();

// ── The Jovian Humanitarian Conflict preview ──
// The game's own view in miniature: gas giant behind, cloud deck converging on
// the vanishing point, one convoy squawking and one hostile running dark.
(function() {
    const c = document.getElementById('cJovian');
    if (!c) return;
    const ctx = c.getContext('2d');

    const sky = ctx.createLinearGradient(0, 0, 0, 40);
    sky.addColorStop(0, '#05060f');
    sky.addColorStop(1, '#0d1230');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 72, 40);

    ctx.fillStyle = '#c8d4ff';
    for (const [sx, sy] of [[10, 6], [26, 12], [44, 5], [58, 15], [64, 8], [18, 20], [52, 24]]) {
        ctx.fillRect(sx, sy, 1, 1);
    }

    // Gas giant, banded and clipped by the deck below.
    ctx.save();
    ctx.beginPath();
    ctx.arc(20, 34, 19, 0, Math.PI * 2);
    ctx.clip();
    const bands = [
        [15, 5, '#5c3a28'], [20, 4, '#c99a63'], [24, 4, '#e8cfa0'],
        [28, 4, '#8f5f3c'], [32, 4, '#c99a63'], [36, 4, '#e8cfa0'],
        [40, 5, '#8f5f3c'], [45, 8, '#38222a'],
    ];
    for (const [by, bh, col] of bands) { ctx.fillStyle = col; ctx.fillRect(1, by, 38, bh); }
    ctx.fillStyle = '#b4523f';
    ctx.beginPath(); ctx.ellipse(14, 39, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Cloud deck.
    const deck = ctx.createLinearGradient(0, 40, 0, 72);
    deck.addColorStop(0, '#2a2340');
    deck.addColorStop(1, '#7a5a7e');
    ctx.fillStyle = deck;
    ctx.fillRect(0, 40, 72, 32);

    ctx.fillStyle = '#b489c4';
    let y = 42;
    for (let i = 0, step = 1.4; i < 9; i++, step *= 1.34) {
        ctx.globalAlpha = 0.16 + i * 0.06;
        ctx.fillRect(0, Math.round(y), 72, 1);
        y += step;
    }
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#b489c4';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(36, 40); ctx.lineTo(6, 72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(36, 40); ctx.lineTo(66, 72); ctx.stroke();
    ctx.globalAlpha = 1;

    // Aid convoy, squawking -- amber slab with a cross and a lit beacon.
    ctx.fillStyle = '#8a5f12';
    ctx.fillRect(44, 32, 14, 8);
    ctx.fillStyle = '#ffc247';
    ctx.fillRect(44, 32, 14, 4);
    ctx.fillStyle = '#fff2cf';
    ctx.fillRect(50, 32, 2, 8);
    ctx.fillRect(44, 35, 14, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(50, 27, 3, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath(); ctx.arc(51, 28, 5, 0, Math.PI * 2); ctx.fill();

    // Hostile, dark transponder -- angular delta, no beacon.
    ctx.fillStyle = '#7a1150';
    ctx.beginPath();
    ctx.moveTo(26, 44); ctx.lineTo(20, 37); ctx.lineTo(32, 37);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2fa8';
    ctx.beginPath();
    ctx.moveTo(26, 42); ctx.lineTo(22, 37); ctx.lineTo(30, 37);
    ctx.closePath(); ctx.fill();

    // The player's ship, low and center.
    ctx.fillStyle = '#7f90b8';
    ctx.fillRect(30, 60, 12, 3);
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.moveTo(36, 54); ctx.lineTo(40, 63); ctx.lineTo(32, 63);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5ff0ff';
    ctx.fillRect(35, 58, 2, 3);
    ctx.fillStyle = '#7ce8ff';
    ctx.fillRect(33, 63, 2, 4);
    ctx.fillRect(37, 63, 2, 4);
})();



// -- cave diving (not even once) preview --
// A headlamp cone in a flooded shaft: the whole game in 72 pixels.
(function() {
    const c = document.getElementById('cCave');
    if (!c) return;
    const ctx = c.getContext('2d');

    const water = ctx.createLinearGradient(0, 0, 0, 72);
    water.addColorStop(0, '#0b2430');
    water.addColorStop(1, '#030b10');
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, 72, 72);

    // Shaft walls, closing in toward the bottom.
    ctx.fillStyle = '#332b45';
    for (let y = 0; y < 72; y += 4) {
        const squeeze = y * 0.16;
        ctx.fillRect(0, y, 14 + squeeze, 4);
        ctx.fillRect(58 - squeeze, y, 14 + squeeze, 4);
    }
    ctx.fillStyle = '#564a70';
    for (let y = 0; y < 72; y += 4) {
        const squeeze = y * 0.16;
        ctx.fillRect(13 + squeeze, y, 2, 4);
        ctx.fillRect(57 - squeeze, y, 2, 4);
    }
    ctx.fillStyle = '#1b1526';
    ctx.fillRect(46, 40, 12, 6);

    // The beam, additive so the rock it lands on actually looks lit.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(34, 30);
    ctx.arc(34, 30, 42, 0.42, 2.28);
    ctx.closePath();
    ctx.clip();
    const beam = ctx.createRadialGradient(34, 30, 0, 34, 30, 42);
    beam.addColorStop(0, 'rgba(255,243,196,0.62)');
    beam.addColorStop(0.4, 'rgba(214,236,222,0.28)');
    beam.addColorStop(1, 'rgba(120,180,190,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(-8, -12, 88, 88);
    ctx.restore();

    // The diver, head down.
    ctx.fillStyle = '#2a6470';
    ctx.fillRect(29, 16, 8, 4);
    ctx.fillStyle = '#12333b';
    ctx.fillRect(29, 20, 8, 3);
    ctx.fillStyle = '#1e4a55';
    ctx.fillRect(28, 22, 10, 8);
    ctx.fillStyle = '#6e8794';
    ctx.fillRect(37, 23, 3, 5);
    ctx.fillStyle = '#0b1a22';
    ctx.fillRect(28, 30, 10, 2);
    ctx.fillStyle = '#9ff0ff';
    ctx.fillRect(30, 30, 5, 2);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(33, 32, 3, 2);

    // An air pocket, the thing you are always heading for.
    ctx.fillStyle = '#5fe8a4';
    ctx.fillRect(24, 56, 2, 2);
    ctx.fillRect(28, 59, 3, 3);
    ctx.fillRect(25, 62, 2, 2);
})();

// -- grocery-harrison preview --
// The scale is the whole idea: a tiny figure on the shelf between a cereal
// box and a carton too big for the card, the oat ring over his head.
(function() {
    const c = document.getElementById('cGroceryHarrison');
    if (!c) return;
    const ctx = c.getContext('2d');

    const air = ctx.createLinearGradient(0, 0, 0, 72);
    air.addColorStop(0, '#0b0d1e');
    air.addColorStop(1, '#2a1f3d');
    ctx.fillStyle = air;
    ctx.fillRect(0, 0, 72, 72);

    // A cereal box, cropped by the card's edge.
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 4, 24, 56);
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(2, 14, 18, 5);
    ctx.fillStyle = '#e8a93a';
    ctx.fillRect(5, 34, 4, 3);
    ctx.fillRect(11, 32, 4, 3);
    // A carton, gable top and all.
    ctx.fillStyle = '#e2d2ad';
    ctx.fillRect(52, 18, 20, 42);
    ctx.fillStyle = '#c9b88f';
    ctx.fillRect(54, 12, 18, 6);
    ctx.fillStyle = '#3f6fae';
    ctx.fillRect(52, 40, 20, 3);

    // A light from above, on him.
    ctx.fillStyle = 'rgba(255, 240, 210, 0.08)';
    ctx.beginPath();
    ctx.moveTo(32, 0); ctx.lineTo(42, 0); ctx.lineTo(48, 60); ctx.lineTo(26, 60);
    ctx.closePath();
    ctx.fill();

    // The shelf.
    ctx.fillStyle = '#b7bcc6';
    ctx.fillRect(0, 60, 72, 2);
    ctx.fillStyle = '#2c3140';
    ctx.fillRect(0, 62, 72, 10);

    // Harrison, small: jeans, flannel, beard, guitar.
    ctx.fillStyle = '#4169e1';
    ctx.fillRect(35, 55, 1, 5);
    ctx.fillRect(38, 55, 1, 5);
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(34, 49, 6, 6);
    ctx.fillStyle = '#d2691e';
    ctx.fillRect(32, 51, 3, 3);
    ctx.fillStyle = '#f4d5b5';
    ctx.fillRect(35, 45, 4, 4);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(35, 44, 4, 1);
    ctx.fillRect(35, 48, 4, 1);

    // The oat ring he is carrying, and a flake drifting down.
    ctx.strokeStyle = '#d9a85b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(37, 38, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8a93a';
    ctx.fillRect(43, 22, 5, 2);
})();

// -- caldera preview --
// Looking up the vent: ledges in silhouette over the magma, the climber on
// the lowest one.
(function() {
    const c = document.getElementById('cCaldera');
    if (!c) return;
    const ctx = c.getContext('2d');

    const air = ctx.createLinearGradient(0, 0, 0, 72);
    air.addColorStop(0, '#120b0a');
    air.addColorStop(0.7, '#5a1a06');
    air.addColorStop(1, '#c23a00');
    ctx.fillStyle = air;
    ctx.fillRect(0, 0, 72, 72);

    // The vent walls, narrowing toward the mouth.
    ctx.fillStyle = '#0d0907';
    for (let y = 0; y < 72; y += 4) {
        const open = y * 0.18;
        ctx.fillRect(0, y, 22 - open, 4);
        ctx.fillRect(50 + open, y, 22 - open, 4);
    }
    ctx.fillStyle = '#e8d8ff';
    ctx.fillRect(30, 3, 1, 1);
    ctx.fillRect(38, 6, 1, 1);
    ctx.fillRect(34, 1, 1, 1);

    // Ledges, lit from beneath.
    const ledges = [[26, 18, 14], [36, 30, 16], [20, 42, 18], [32, 53, 20]];
    for (const [x, y, w] of ledges) {
        ctx.fillStyle = '#1e1511';
        ctx.fillRect(x, y, w, 3);
        ctx.fillStyle = '#ff7a2a';
        ctx.fillRect(x, y + 3, w, 1);
    }

    // The climber: cooled rock with a molten seam.
    ctx.fillStyle = 'rgba(255,90,31,0.35)';
    ctx.fillRect(36, 43, 10, 12);
    ctx.fillStyle = '#26201c';
    ctx.fillRect(38, 45, 6, 8);
    ctx.fillStyle = '#ffe9c0';
    ctx.fillRect(40, 47, 1, 1);
    ctx.fillRect(42, 47, 1, 1);
    ctx.fillStyle = '#ff8a3a';
    ctx.fillRect(39, 50, 4, 1);

    // The magma.
    ctx.fillStyle = '#ff5a1f';
    ctx.fillRect(0, 62, 72, 10);
    ctx.fillStyle = '#fff0a0';
    for (let x = 0; x < 72; x += 6) ctx.fillRect(x, 61 + (x % 12 ? 0 : 1), 4, 1);
})();
