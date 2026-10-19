// ═══════════════════════════════════════════════
// Very Long Boards — Player (3D)
// Simple downhill skateboarding
// ═══════════════════════════════════════════════

window.player = {
    x: 0, speed: 0, lean: 0, targetLean: 0,
    distance: 0, score: 0, alive: true,

    // Points are banked as a float and floored only for display. Awarding
    // Math.floor(...) of a per-frame amount instead throws the remainder away
    // sixty-plus times a second, which made the score depend on the refresh
    // rate: the same ride paid ~180/s at 60 Hz and ~144/s at 144 Hz, and below
    // about 0.34 speed on a fast monitor the per-frame award floored to zero
    // and a slow start scored literally nothing.
    scoreRaw: 0,

    /** What the last trick actually paid, so the banner can report it. */
    lastTrickScore: 0,
    invincible: false, invincibleTimer: 0,
    stability: 100, wobbling: false, wobblePhase: 0,
    bailing: false, bailTimer: 0,
    groundY: 0, kicked: false,
    tricking: false, trickTimer: 0, trickCooldown: 0,

    // Which way the current carve is going and how long it has gone that way,
    // which is what makes a carve go stale. prevDistance lets the collision test
    // sweep the stretch covered this frame rather than sampling one point.
    carveDir: 0, carveTime: 0, carving: false, prevDistance: 0,

    // Derived each frame by updatePlayer and read by the audio mix and the HUD.
    // Kept here rather than recomputed by whoever needs them.
    //
    // speedFactor is how fast you are going against CONFIG.REFERENCE_SPEED - the
    // fastest pairing in the game - and NOT against your own ceiling. Everything
    // that asks "how fast is this rider going" must use it; see the note on the
    // stability drain below for what happens otherwise.
    maxSpeed: 1, speedFactor: 0, braking: false
};

window.playerMesh = null;
window.currentBoard = 'standard';

/** The emissive lift on Carl's materials: a quarter of the lit colour. */
function glowOf(c) {
    return new BABYLON.Color3(c.r * 0.25, c.g * 0.25, c.b * 0.25);
}

window.createPlayer = function(scene) {
    const root = new BABYLON.TransformNode('playerRoot', scene);

    // Turned 55 degrees off the board, not the full 90 of a side-on stance.
    // The camera sits behind, so a rider standing fully side-on presented only
    // the 0.28-deep edge of his body to it: a thin dark column on a plank, which
    // at small sizes read as a man on a pogo stick. Opening the shoulders the
    // way a downhill rider does in a tuck shows his chest and both arms.
    const charNode = new BABYLON.TransformNode('charNode', scene);
    charNode.parent = root;
    charNode.rotation.y = Math.PI * 0.3;

    const deckMat = new BABYLON.StandardMaterial('deckMat', scene);
    deckMat.diffuseColor = new BABYLON.Color3(0.5, 0.25, 0.06);
    deckMat.specularColor = BABYLON.Color3.Black();

    const gripMat = new BABYLON.StandardMaterial('gripMat', scene);
    gripMat.diffuseColor = new BABYLON.Color3(0.22, 0.22, 0.22);
    gripMat.specularColor = BABYLON.Color3.Black();

    const wheelMat = new BABYLON.StandardMaterial('wheelMat', scene);
    wheelMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    wheelMat.specularColor = BABYLON.Color3.Black();

    // Longboard proportions against a 1.4-tall Carl. The deck was 0.7 by 1.8,
    // which from the closer camera read as a door he was standing on.
    const deck = BABYLON.MeshBuilder.CreateBox('deck', { width: 0.5, height: 0.06, depth: 1.35 }, scene);
    deck.material = deckMat;
    deck.parent = root;
    deck.position.y = 0.15;

    const grip = BABYLON.MeshBuilder.CreateBox('grip', { width: 0.46, height: 0.02, depth: 1.2 }, scene);
    grip.material = gripMat;
    grip.parent = root;
    grip.position.y = 0.19;

    const wheelPos = [[-0.22, 0.05, 0.42], [0.22, 0.05, 0.42], [-0.22, 0.05, -0.42], [0.22, 0.05, -0.42]];
    for (const [wx, wy, wz] of wheelPos) {
        const w = BABYLON.MeshBuilder.CreateCylinder('wh', { height: 0.1, diameter: 0.12, tessellation: 6 }, scene);
        w.material = wheelMat;
        w.rotation.z = Math.PI / 2;
        w.parent = root;
        w.position = new BABYLON.Vector3(wx, wy, wz);
    }

    const skinMat = new BABYLON.StandardMaterial('skinMat', scene);
    skinMat.diffuseColor = new BABYLON.Color3(0.92, 0.82, 0.64);
    skinMat.specularColor = BABYLON.Color3.Black();

    const shirtMat = new BABYLON.StandardMaterial('shirtMat', scene);
    shirtMat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.2);
    shirtMat.specularColor = BABYLON.Color3.Black();

    const pantsMat = new BABYLON.StandardMaterial('pantsMat', scene);
    pantsMat.diffuseColor = new BABYLON.Color3(0.2, 0.22, 0.28);
    pantsMat.specularColor = BABYLON.Color3.Black();

    const hairMat = new BABYLON.StandardMaterial('hairMat', scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12);
    hairMat.specularColor = BABYLON.Color3.Black();

    const body = BABYLON.MeshBuilder.CreateBox('body', { width: 0.5, height: 0.55, depth: 0.28 }, scene);
    body.material = shirtMat;
    body.parent = charNode;
    body.position.y = 0.75;

    const legL = BABYLON.MeshBuilder.CreateBox('legL', { width: 0.16, height: 0.32, depth: 0.16 }, scene);
    legL.material = pantsMat;
    legL.parent = charNode;
    legL.position = new BABYLON.Vector3(-0.14, 0.35, 0);

    const legR = BABYLON.MeshBuilder.CreateBox('legR', { width: 0.16, height: 0.32, depth: 0.16 }, scene);
    legR.material = pantsMat;
    legR.parent = charNode;
    legR.position = new BABYLON.Vector3(0.14, 0.35, 0);

    const head = BABYLON.MeshBuilder.CreateBox('head', { size: 0.28 }, scene);
    head.material = skinMat;
    head.parent = charNode;
    head.position.y = 1.2;

    const hair = BABYLON.MeshBuilder.CreateBox('hair', { width: 0.3, height: 0.09, depth: 0.3 }, scene);
    hair.material = hairMat;
    hair.parent = charNode;
    hair.position.y = 1.38;

    const armL = BABYLON.MeshBuilder.CreateBox('armL', { width: 0.1, height: 0.38, depth: 0.1 }, scene);
    armL.material = skinMat;
    armL.parent = charNode;
    armL.position = new BABYLON.Vector3(-0.34, 0.82, 0);
    armL.rotation.z = 0.2;

    const armR = BABYLON.MeshBuilder.CreateBox('armR', { width: 0.1, height: 0.38, depth: 0.1 }, scene);
    armR.material = skinMat;
    armR.parent = charNode;
    armR.position = new BABYLON.Vector3(0.34, 0.82, 0);
    armR.rotation.z = -0.2;

    root._armL = armL;
    root._armR = armR;
    root._shirtMat = shirtMat;
    root._pantsMat = pantsMat;
    root._skinMat = skinMat;
    root._hairMat = hairMat;
    root._deckMat = deckMat;
    root._gripMat = gripMat;

    // A soft contact shadow, so Carl sits on the road instead of floating over
    // it, and a light emissive lift and dark outline on every part of him, so a
    // dark Carl still separates from grey asphalt and dark pines.
    const shadowMat = new BABYLON.StandardMaterial('riderShadowMat', scene);
    shadowMat.diffuseColor = BABYLON.Color3.Black();
    shadowMat.specularColor = BABYLON.Color3.Black();
    shadowMat.disableLighting = true;
    shadowMat.alpha = 0.4;
    const shadow = BABYLON.MeshBuilder.CreateDisc('riderShadow', { radius: 0.45, tessellation: 12 }, scene);
    shadow.rotation.x = Math.PI / 2;
    shadow.scaling.y = 1.6;
    shadow.material = shadowMat;
    shadow.position.y = 0.01;
    shadow.parent = root;

    for (const mat of [deckMat, skinMat, shirtMat, pantsMat, hairMat]) {
        mat.emissiveColor = glowOf(mat.diffuseColor);
    }
    for (const m of root.getChildMeshes()) {
        m.isPickable = false;
        if (m === shadow) continue;
        m.renderOutline = true;
        m.outlineColor = new BABYLON.Color3(0.05, 0.03, 0.08);
        m.outlineWidth = 0.025;
    }
    root._shadow = shadow;

    playerMesh = root;
    return root;
};

window.resetPlayer = function() {
    player.x = 0;
    player.speed = 0;
    player.lean = 0;
    player.targetLean = 0;
    player.distance = 0;
    player.score = 0;
    player.scoreRaw = 0;
    player.alive = true;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.stability = CONFIG.STABILITY_MAX;
    player.wobbling = false;
    player.wobblePhase = 0;
    player.bailing = false;
    player.bailTimer = 0;
    player.groundY = 0;
    player.speedFactor = 0;
    player.kicked = false;
    player.carveDir = 0;
    player.carveTime = 0;
    player.carving = false;
    player.prevDistance = 0;
    player.tricking = false;
    player.trickTimer = 0;
    player.trickCooldown = 0;
    player.braking = false;
    player.lastTrickScore = 0;
};

window.updatePlayer = function(input, terrain, dt) {
    const char = CHARACTERS[currentCharacter];
    const board = BOARDS[currentBoard] || BOARDS['standard'];
    const speedMult = char.speedMult * board.speedMult;
    const handling = CONFIG.TURN_SPEED * char.handlingMult * board.handlingMult * 0.15;
    const stabMult = char.stabilityMult * board.stabilityMult;
    const dtScale = dt * 60;

    // SPD buys a lower drag coefficient, so a fast rider genuinely settles at a
    // higher speed instead of carrying a ceiling he never touches. The ceiling
    // is a safety rail; nothing in normal play reaches it.
    const drag = CONFIG.DRAG / speedMult;
    const maxSpd = CONFIG.SPEED_RAIL * speedMult;
    player.maxSpeed = maxSpd;

    if (player.bailing) {
        player.bailTimer -= dtScale;
        player.speed *= (1 - 0.05 * dtScale);
        player.wobblePhase += 0.3 * dtScale;
        if (player.bailTimer <= 0) return 'bail';
        return 'falling';
    }

    if (!player.kicked) {
        if (input.trick) {
            player.kicked = true;
            player.speed = CONFIG.KICK_SPEED;
            playKickSound();
        }
        player.groundY = terrain ? terrain.hillAt(0) : 0;
        return null;
    }

    const slope = terrain ? (terrain.hillAt(player.distance + 3) - terrain.hillAt(player.distance)) / 3 : 0;
    const slopeAccel = -slope * CONFIG.SLOPE_ACCEL;
    player.speed += slopeAccel * dtScale;
    player.speed *= Math.pow(1 - drag, dtScale);

    player.braking = Boolean(input.brake);
    if (input.brake) {
        player.speed *= Math.pow(1 - CONFIG.BRAKE_DRAG, dtScale);
    }

    if (player.tricking) {
        player.trickTimer -= dtScale;
        if (player.trickTimer <= 0) {
            player.tricking = false;
        }
    }
    if (player.trickCooldown > 0) player.trickCooldown -= dtScale;
    if (player.invincible) {
        player.invincibleTimer -= dtScale;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }

    // An ollie. It lifts Carl clear of the road for the middle of its arc (see
    // isAirborne) and costs balance to land, so it is a way over a hazard and a
    // source of points that the meter has to pay for. It used to cost nothing
    // and clear nothing: a squash of the mesh and free points every half second.
    //
    // It is scored and the frame carries on. It used to return here, so the
    // frame Carl tricked he did not steer, travel or score his distance, and his
    // balance neither drained nor refilled.
    let result = null;
    if (input.trick && !player.tricking && player.trickCooldown <= 0 && player.speed > 0.2) {
        player.tricking = true;
        player.trickTimer = CONFIG.TRICK_FRAMES;
        player.trickCooldown = CONFIG.TRICK_FRAMES + 8;
        player.stability -= CONFIG.TRICK_COST / stabMult;
        const trickScore = CONFIG.TRICK_POINTS * char.trickMult * (1 + player.speed);
        player.scoreRaw += trickScore;
        player.score = Math.floor(player.scoreRaw);
        player.lastTrickScore = Math.floor(trickScore);
        result = 'trick';
    }

    if (input.left) {
        player.targetLean = -1;
    } else if (input.right) {
        player.targetLean = 1;
    } else {
        player.targetLean = 0;
    }
    player.lean += (player.targetLean - player.lean) * 0.12 * dtScale;
    const xBefore = player.x;
    player.x += player.lean * handling * 0.1 * Math.min(1, player.speed * 1.5) * dtScale;

    player.speed = Math.max(0.02, Math.min(maxSpd, player.speed));
    player.x = Math.max(-CONFIG.RIDE_HALF_W, Math.min(CONFIG.RIDE_HALF_W, player.x));

    // Measured against the fastest pairing in the game, not against this rider's
    // own ceiling.
    //
    // This used to be speed/maxSpd, and maxSpd was scaled by the rider's SPD. A
    // faster rider therefore reached any given speed at a LOWER fraction of his
    // own ceiling, so raising SPD quietly bought stability: Party Carl on a
    // Cruiser - the pairing the cards bill as the wildest in the game, SPD 5 and
    // STAB 1 - held a line 21% LONGER than Office Carl on a Standard. Measured
    // at matched speed: 8.36 stability/second against 10.13.
    player.speedFactor = Math.min(player.speed / CONFIG.REFERENCE_SPEED, 1);

    // ── Balance ──
    //
    // The drain runs all the time you are rolling; carving pays it back. The
    // refill is for sideways distance actually covered (after the clamp, so
    // leaning into the edge of the road earns nothing), and it fades the longer
    // a carve keeps going the same way. This replaces a flat refill for holding
    // any turn key, under which holding left pinned Carl to the verge with a full
    // meter for as long as you liked.
    const carveDir = player.lean > 0.15 ? 1 : player.lean < -0.15 ? -1 : 0;
    if (carveDir !== 0 && carveDir !== player.carveDir) player.carveTime = 0;
    if (carveDir !== 0) player.carveDir = carveDir;
    player.carveTime += dt;
    const fresh = Math.max(0, 1 - player.carveTime / CONFIG.CARVE_FRESH_SECS);
    const lateral = Math.abs(player.x - xBefore);
    player.carving = lateral > 0.01 && fresh > 0;
    // Divided by the rider's turn rate and multiplied by the same speed term as
    // the drain, so that how much of the time you must spend carving depends on
    // STAB and nothing else. Without those two terms a low-HAND, high-SPD pairing
    // was charged three times over - slower to swing, faster to drain, smaller
    // refill - and Party Carl on a Cruiser bailed in twenty seconds of perfect
    // carving while Office Carl on a Standard could not get below 95.
    const turnRate = char.handlingMult * board.handlingMult;
    player.stability += (lateral / turnRate) * CONFIG.CARVE_GAIN * (0.2 + player.speedFactor) * fresh;

    if (player.speed > 0.3) {
        // STAB lives here, in the drain, and only here. It once only multiplied
        // the refill, so a board sold as "steady & stable" was no steadier while
        // you held a line. It then did both, which squared it: with the carve
        // refill, Party Carl on a Cruiser (STAB 0.77) had to carve 2.7 times as
        // much as Office Carl on Old School (1.25) rather than 1.6.
        player.stability -= CONFIG.STABILITY_DECAY * (0.2 + player.speedFactor) / stabMult * dtScale;
    }
    player.stability = Math.max(0, Math.min(CONFIG.STABILITY_MAX, player.stability));

    player.wobbling = player.stability < CONFIG.STABILITY_WOBBLE_AT;
    player.wobblePhase += player.wobbling ? (0.12 + (1 - player.stability / CONFIG.STABILITY_WOBBLE_AT) * 0.25) * dtScale : 0;

    if (player.stability <= CONFIG.STABILITY_BAIL_AT && player.speed > 0.5) {
        window.startBail();
        return result;
    }

    player.groundY = terrain ? terrain.hillAt(player.distance) : 0;
    player.prevDistance = player.distance;
    player.distance += player.speed * dtScale;
    player.scoreRaw += player.speed * 3 * dtScale;
    player.score = Math.floor(player.scoreRaw);

    return result;
};

/**
 * True for the middle of an ollie, when the board is off the road and nothing
 * on it can be hit. The take-off and the landing are on the ground, so a trick
 * has to be timed rather than mashed.
 */
window.isAirborne = function() {
    if (!player.tricking) return false;
    const p = 1 - player.trickTimer / CONFIG.TRICK_FRAMES;
    return p > 0.15 && p < 0.85;
};

/** Off the board: plays the fall, after which updatePlayer returns 'bail'. */
window.startBail = function() {
    player.bailing = true;
    player.bailTimer = 40;
    player.tricking = false;
};

/** A small hazard: knocks the balance down and gives a moment's grace. */
window.stumblePlayer = function() {
    player.stability = Math.max(0, player.stability - CONFIG.STUMBLE_COST);
    player.invincible = true;
    player.invincibleTimer = CONFIG.STUMBLE_GRACE_FRAMES;
};

window.updatePlayerMesh = function(terrain, frame) {
    if (!playerMesh) return;

    let wobbleX = 0;
    if (player.wobbling && !player.bailing) {
        const str = 1 - (player.stability / CONFIG.STABILITY_WOBBLE_AT);
        wobbleX = Math.sin(player.wobblePhase * 6) * str * 0.3;
    }

    // The ollie's arc: up and down over TRICK_FRAMES, with a full turn of the
    // board and rider. It used to be a 15% squash, which read as nothing at all.
    let hop = 0, spin = 0;
    if (player.tricking && !player.bailing) {
        const p = 1 - player.trickTimer / CONFIG.TRICK_FRAMES;
        hop = Math.sin(Math.PI * p) * 0.9;
        spin = p * Math.PI * 2;
    }

    playerMesh.position.x = player.x + wobbleX;
    playerMesh.position.y = player.groundY + 0.1 + hop;
    playerMesh.position.z = 0;
    if (playerMesh._shadow) {
        // Left on the road during an ollie, and shrinking with height, which is
        // how you can tell how high he is and when he will land.
        playerMesh._shadow.position.y = 0.01 - hop;
        const s = 1 - hop * 0.35;
        playerMesh._shadow.scaling.x = s;
        playerMesh._shadow.scaling.y = 1.6 * s;
    }

    if (player.bailing) {
        const progress = 1 - (player.bailTimer / 40);
        playerMesh.rotation.z = progress * progress * 3;
        playerMesh.rotation.x = progress * 1.0;
        playerMesh.scaling.y = 1 - progress * 0.2;
    } else {
        const curve = terrain ? terrain.curveAt(player.distance) : 0;
        const curveAngle = -Math.atan(curve);
        playerMesh.rotation.z = player.lean * 0.18 + wobbleX * 0.08;
        playerMesh.rotation.y = player.lean * 0.12 + curveAngle + spin;
        playerMesh.rotation.x = 0;
        playerMesh.scaling.y = 1;
    }

    // A stumble's grace period blinks, so it is clear why the next rock did not
    // count and when it will again.
    playerMesh.setEnabled(!(player.invincible && !player.bailing && Math.floor(frame / 4) % 2 === 0));

    if (playerMesh._armL) {
        if (!player.kicked) {
            playerMesh._armL.rotation.z = 0.6;
            playerMesh._armR.rotation.z = -0.6;
        } else {
            const armSwing = Math.sin(frame * 0.1) * 0.3 * Math.min(1, player.speed * 2);
            playerMesh._armL.rotation.z = 0.2 + armSwing;
            playerMesh._armR.rotation.z = -0.2 - armSwing;
        }
    }
};

window.updatePlayerColors = function(charKey) {
    if (!playerMesh) return;
    const colors = CHARACTERS[charKey] && CHARACTERS[charKey].colors;
    if (!colors) return;
    playerMesh._shirtMat.diffuseColor = new BABYLON.Color3(colors.shirt[0], colors.shirt[1], colors.shirt[2]);
    playerMesh._hairMat.diffuseColor = new BABYLON.Color3(colors.hair[0], colors.hair[1], colors.hair[2]);
    playerMesh._skinMat.diffuseColor = new BABYLON.Color3(colors.skin[0], colors.skin[1], colors.skin[2]);
    playerMesh._pantsMat.diffuseColor = new BABYLON.Color3(colors.pants[0], colors.pants[1], colors.pants[2]);
    for (const m of [playerMesh._shirtMat, playerMesh._hairMat, playerMesh._skinMat, playerMesh._pantsMat]) {
        m.emissiveColor = glowOf(m.diffuseColor);
    }
};

window.updatePlayerBoardColor = function(boardKey) {
    if (!playerMesh) return;
    const board = BOARDS[boardKey] && BOARDS[boardKey];
    if (!board) return;
    playerMesh._deckMat.diffuseColor = new BABYLON.Color3(board.deckColor[0], board.deckColor[1], board.deckColor[2]);
    playerMesh._deckMat.emissiveColor = glowOf(playerMesh._deckMat.diffuseColor);
    playerMesh._gripMat.diffuseColor = new BABYLON.Color3(board.gripColor[0], board.gripColor[1], board.gripColor[2]);
};
