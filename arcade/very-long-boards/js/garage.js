// ═══════════════════════════════════════════════
// Very Long Boards — Garage Backdrop (2D pixel-art)
// ═══════════════════════════════════════════════

window.drawGarage = function(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    // Back wall
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, w, h * 0.65);

    // Cinder block texture
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let row = 0; row < 7; row++) {
        const by = row * 32;
        const offset = row % 2 === 0 ? 0 : 42;
        for (let col = 0; col < 14; col++) {
            ctx.strokeRect(col * 84 + offset - 42, by, 84, 32);
        }
    }

    // Floor
    const floorY = h * 0.65;
    ctx.fillStyle = '#555';
    ctx.fillRect(0, floorY, w, h - floorY);

    // Floor perspective lines
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        const y = floorY + i * 12;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Floor vertical lines (perspective)
    ctx.strokeStyle = '#4d4d4d';
    for (let i = 0; i < 12; i++) {
        const x = i * 90 + 30;
        ctx.beginPath();
        ctx.moveTo(x, floorY);
        ctx.lineTo(x + (i - 5) * 8, h);
        ctx.stroke();
    }

    // Oil stain on floor
    ctx.fillStyle = 'rgba(30, 30, 30, 0.3)';
    ctx.beginPath();
    ctx.ellipse(w * 0.6, floorY + 60, 50, 20, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Workbench
    ctx.fillStyle = '#6d4c2a';
    ctx.fillRect(30, floorY - 90, 180, 14);
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(40, floorY - 76, 10, 76);
    ctx.fillRect(190, floorY - 76, 10, 76);
    // Workbench shelf
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(40, floorY - 30, 160, 8);

    // Items on workbench
    ctx.fillStyle = '#888';
    ctx.fillRect(50, floorY - 100, 12, 10); // box
    ctx.fillStyle = '#666';
    ctx.fillRect(80, floorY - 96, 8, 6); // can
    ctx.fillStyle = '#999';
    ctx.fillRect(120, floorY - 98, 20, 8); // toolbox
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(125, floorY - 98, 10, 4); // toolbox handle

    // Tools on wall
    // Hammer
    ctx.fillStyle = '#6d4c2a';
    ctx.fillRect(280, 60, 4, 40);
    ctx.fillStyle = '#888';
    ctx.fillRect(274, 52, 16, 10);

    // Wrench
    ctx.fillStyle = '#999';
    ctx.fillRect(320, 55, 4, 45);
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(322, 55, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(322, 55, 4, 0, Math.PI * 2);
    ctx.fill();

    // Screwdriver
    ctx.fillStyle = '#ff2e9c';
    ctx.fillRect(360, 60, 4, 30);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(360, 50, 4, 12);

    // Pegboard outline behind tools
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(260, 40, 120, 80);

    // Shelf on right wall, beside the window rather than under it: at w - 200
    // it ran 70px into the window's span, which is drawn after it and covered
    // the green bottle and the box.
    const shelfX = w - 290;
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(shelfX, 80, 140, 8);
    ctx.fillRect(shelfX, 80, 6, 40);
    ctx.fillRect(shelfX + 134, 80, 6, 40);

    // Items on shelf
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(shelfX + 10, 62, 16, 18); // bottle
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(shelfX + 40, 66, 12, 14); // can
    ctx.fillStyle = '#44cc44';
    ctx.fillRect(shelfX + 70, 64, 14, 16); // bottle
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(shelfX + 100, 68, 20, 12); // box

    // Window
    const winX = w - 130;
    const winY = 30;
    ctx.fillStyle = '#7aadcc';
    ctx.fillRect(winX, winY, 90, 110);
    // Window frame
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    ctx.strokeRect(winX, winY, 90, 110);
    // Cross bars
    ctx.beginPath();
    ctx.moveTo(winX + 45, winY);
    ctx.lineTo(winX + 45, winY + 110);
    ctx.moveTo(winX, winY + 55);
    ctx.lineTo(winX + 90, winY + 55);
    ctx.stroke();
    // Light glow from window
    ctx.fillStyle = 'rgba(122, 173, 204, 0.08)';
    ctx.beginPath();
    ctx.moveTo(winX, winY + 110);
    ctx.lineTo(winX - 40, h);
    ctx.lineTo(winX + 130, h);
    ctx.lineTo(winX + 90, winY + 110);
    ctx.fill();

    // Neon VLB sign
    ctx.save();
    ctx.shadowColor = '#ff2e9c';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ff2e9c';
    ctx.font = 'bold 42px monospace';
    ctx.fillText('VLB', w * 0.35, h * 0.18);
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 42px monospace';
    ctx.fillText('VLB', w * 0.35, h * 0.18);
    ctx.restore();

    // Small tagline under sign
    ctx.fillStyle = '#ff2e9c';
    ctx.globalAlpha = 0.5;
    ctx.font = '10px monospace';
    ctx.fillText('DOWNHILL SKATEBOARDS', w * 0.35 - 2, h * 0.18 + 16);
    ctx.globalAlpha = 1;

    // Leaning skateboard against wall (right side)
    ctx.save();
    ctx.translate(w - 50, floorY);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-4, -80, 8, 80);
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(0, -80, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ceiling line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(w, 3);
    ctx.stroke();

    // Fluorescent light fixture
    ctx.fillStyle = '#ddd';
    ctx.fillRect(w * 0.3, 0, 120, 6);
    ctx.fillStyle = 'rgba(255, 255, 240, 0.15)';
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 6);
    ctx.lineTo(w * 0.3 - 30, floorY);
    ctx.lineTo(w * 0.3 + 150, floorY);
    ctx.lineTo(w * 0.3 + 120, 6);
    ctx.fill();
};

/**
 * The board seen from above, nose to the right. Each board has its own outline,
 * because four ellipses differing only in colour told you nothing about which
 * was which: the Standard is a symmetric drop-through, the Cruiser has a
 * kicktail, the Carver is a pintail and the Old School a swallowtail with a
 * fat nose.
 */
const BOARD_OUTLINES = {
    // Each returns points around half the outline (top edge, tail to nose) as
    // [x, halfWidth] in 0..1 of length; the bottom edge is the mirror.
    'standard':   [[0, 0.55], [0.06, 0.9], [0.15, 1], [0.85, 1], [0.94, 0.9], [1, 0.55]],
    'cruiser':    [[0, 0.35], [0.08, 0.75], [0.2, 0.95], [0.6, 1], [0.85, 0.95], [0.96, 0.75], [1, 0.4]],
    'carver':     [[0, 0.1], [0.12, 0.55], [0.35, 0.95], [0.6, 1], [0.82, 0.7], [1, 0.08]],
    'old-school': [[0, 0.9], [0.05, 0.35], [0.1, 0.7], [0.3, 0.85], [0.75, 1], [0.92, 0.9], [1, 0.5]],
};

function boardPath(ctx, key, cx, cy, len, halfW) {
    const pts = BOARD_OUTLINES[key] || BOARD_OUTLINES.standard;
    const x0 = cx - len / 2;
    ctx.beginPath();
    pts.forEach(([u, v], i) => {
        const px = x0 + u * len, py = cy - v * halfW;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    for (let i = pts.length - 1; i >= 0; i--) {
        const [u, v] = pts[i];
        ctx.lineTo(x0 + u * len, cy + v * halfW);
    }
    ctx.closePath();
}

window.drawBoardPreview = function(ctx, boardKey, x, y, w, h) {
    const board = BOARDS[boardKey];
    if (!board) return;
    const rgb = (c, k = 1) => `rgb(${c[0] * 255 * k | 0},${c[1] * 255 * k | 0},${c[2] * 255 * k | 0})`;
    const cx = x + w / 2, cy = y + h / 2;
    const len = w * 0.9, halfW = h * 0.32;

    ctx.clearRect(x, y, w, h);
    // Trucks and wheels first, so the deck sits over them.
    ctx.fillStyle = '#1b1b1b';
    for (const u of [0.24, 0.76]) {
        const wx = cx - len / 2 + u * len;
        ctx.fillRect(wx - 3, cy - halfW - 2, 6, 4);
        ctx.fillRect(wx - 3, cy + halfW - 2, 6, 4);
    }
    // Deck edge in the board colour, grip on top inset by two pixels.
    ctx.fillStyle = rgb(board.deckColor);
    boardPath(ctx, boardKey, cx, cy, len, halfW);
    ctx.fill();
    ctx.fillStyle = rgb(board.gripColor);
    boardPath(ctx, boardKey, cx, cy, len - 6, halfW - 2.5);
    ctx.fill();
    // A stripe of the deck colour down the grip, so the colour reads at a glance.
    ctx.fillStyle = rgb(board.deckColor, 0.9);
    ctx.fillRect(cx - len * 0.3, cy - 1, len * 0.6, 2);
};
