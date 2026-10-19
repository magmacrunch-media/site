// ═══════════════════════════════════════════════
// Very Long Boards — Obstacles (3D)
// Realistic road hazards
// ═══════════════════════════════════════════════

window.obstacles = [];
let obsMaxZ = 0;
let obsMaterials = {};

window.createObstacles = function(scene) {
    // Lit, with a little emissive so they hold up against the grey road at
    // distance, and each warmer or darker than the asphalt. The old rock was
    // grey on grey and read as a four-pixel smudge eighteen metres out.
    const mat = (name, rgb, glow) => {
        const m = new BABYLON.StandardMaterial(name, scene);
        m.diffuseColor = new BABYLON.Color3(rgb[0], rgb[1], rgb[2]);
        m.emissiveColor = new BABYLON.Color3(rgb[0] * glow, rgb[1] * glow, rgb[2] * glow);
        m.specularColor = BABYLON.Color3.Black();
        return m;
    };
    obsMaterials = {
        rock: mat('rockMat', [0.62, 0.5, 0.38], 0.35),
        branch: mat('branchMat', [0.42, 0.24, 0.08], 0.3),
        puddle: (() => { const m = mat('puddleMat', [0.35, 0.6, 0.85], 0.5); m.alpha = 0.8; return m; })(),
        pinecone: mat('pineconeMat', [0.55, 0.32, 0.12], 0.3),
        stick: mat('stickMat', [0.6, 0.42, 0.18], 0.3),
        beacon: (() => {
            // A warning triangle over anything that ends the run. Drawn once,
            // shared by every beacon.
            const tex = new BABYLON.DynamicTexture('beaconTex', { width: 64, height: 64 }, scene, false);
            tex.hasAlpha = true;
            const c = tex.getContext();
            c.clearRect(0, 0, 64, 64);
            c.fillStyle = '#ffe03a';
            c.strokeStyle = '#1a0a00';
            c.lineWidth = 5;
            c.beginPath(); c.moveTo(32, 5); c.lineTo(60, 57); c.lineTo(4, 57); c.closePath();
            c.fill(); c.stroke();
            c.fillStyle = '#1a0a00';
            c.fillRect(29, 22, 6, 20);
            c.fillRect(29, 46, 6, 6);
            tex.update();
            const m = new BABYLON.StandardMaterial('beaconMat', scene);
            m.diffuseTexture = tex;
            m.emissiveTexture = tex;
            m.opacityTexture = tex;
            m.disableLighting = true;
            m.backFaceCulling = false;
            m.fogEnabled = false;
            return m;
        })(),
        shadow: (() => {
            const m = new BABYLON.StandardMaterial('obsShadowMat', scene);
            m.diffuseColor = BABYLON.Color3.Black();
            m.specularColor = BABYLON.Color3.Black();
            m.disableLighting = true;
            m.alpha = 0.45;
            return m;
        })(),
    };
};

// `fatal` hazards end the run; the rest are a stumble (CONFIG.STUMBLE_COST off
// the balance meter). hitR is also the size drawn, so what you see is what hits
// you: the old meshes were drawn at about half their hit radius, so a rock you
// had visibly cleared could still put you on the floor.
const OBS_TYPES = [
    { type: 'rock',     prob: 0.3,  hitR: 0.38, nearMissR: 0.8,  fatal: true },
    { type: 'branch',   prob: 0.25, hitR: 0.5,  nearMissR: 0.9,  fatal: true },
    { type: 'puddle',   prob: 0.15, hitR: 0.6,  nearMissR: 0.95, fatal: false },
    { type: 'pinecone', prob: 0.15, hitR: 0.2,  nearMissR: 0.5,  fatal: false },
    { type: 'stick',    prob: 0.15, hitR: 0.32, nearMissR: 0.6,  fatal: false }
];

function pickObsType() {
    const r = Math.random();
    let acc = 0;
    for (const t of OBS_TYPES) {
        acc += t.prob;
        if (r < acc) return t;
    }
    return OBS_TYPES[0];
}

function spawnObstacle(z, scene, worldX) {
    const t = pickObsType();
    if (worldX === undefined) worldX = (Math.random() * 2 - 1) * CONFIG.OBS_SPAWN_HALF_W;

    const obs = {
        worldX, z, hitR: t.hitR, nearMissR: t.nearMissR, fatal: t.fatal,
        type: t.type, active: true, nearMissed: false, mesh: null, shadow: null, beacon: null
    };

    let mesh;
    switch (t.type) {
        case 'rock':
            mesh = BABYLON.MeshBuilder.CreateSphere('rock', { diameter: t.hitR * 2, segments: 4 }, scene);
            mesh.scaling.y = 0.65;
            break;
        case 'branch':
            mesh = BABYLON.MeshBuilder.CreateCylinder('branch', { height: t.hitR * 2, diameter: 0.14, tessellation: 5 }, scene);
            mesh.rotation.z = Math.PI / 2;
            // Mostly across the road: a branch lying along it barely reads.
            mesh.rotation.y = (Math.random() - 0.5) * 0.9;
            break;
        case 'puddle':
            mesh = BABYLON.MeshBuilder.CreateDisc('puddle', { radius: t.hitR, tessellation: 10 }, scene);
            mesh.rotation.x = Math.PI / 2;
            break;
        case 'pinecone':
            mesh = BABYLON.MeshBuilder.CreateSphere('pinecone', { diameter: t.hitR * 1.6, segments: 4 }, scene);
            mesh.scaling.y = 1.3;
            break;
        case 'stick':
            mesh = BABYLON.MeshBuilder.CreateCylinder('stick', { height: t.hitR * 2, diameter: 0.08, tessellation: 4 }, scene);
            mesh.rotation.z = Math.PI / 2;
            mesh.rotation.y = (Math.random() - 0.5) * 1.2;
            break;
    }

    if (mesh) {
        mesh.material = obsMaterials[t.type];
        mesh.isPickable = false;
        obs.mesh = mesh;
    }
    // A dark contact patch under anything standing on the road, which is what
    // makes it read as an object at a glance rather than a mark on the tarmac.
    if (t.type !== 'puddle') {
        const sh = BABYLON.MeshBuilder.CreateDisc('obsShadow', { radius: t.hitR * 1.1, tessellation: 8 }, scene);
        sh.rotation.x = Math.PI / 2;
        sh.material = obsMaterials.shadow;
        sh.isPickable = false;
        obs.shadow = sh;
    }

    // The beacon is what you actually see first. A rock 45 m out is about six
    // pixels wide by the vanishing point, which at full speed is half a second
    // of warning; this is held at a constant size on screen until it is close
    // enough for the rock itself to read, then fades out.
    if (t.fatal) {
        const b = BABYLON.MeshBuilder.CreatePlane('beacon', { size: 1 }, scene);
        b.material = obsMaterials.beacon;
        b.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        b.isPickable = false;
        obs.beacon = b;
    }

    obstacles.push(obs);
    if (z > obsMaxZ) obsMaxZ = z;
}

/** How far ahead the next hazard goes, closing in as the run goes on. */
function nextGap(distance) {
    const t = Math.min(1, distance / CONFIG.OBS_RAMP_DIST);
    const base = CONFIG.OBS_GAP_START + (CONFIG.OBS_GAP_END - CONFIG.OBS_GAP_START) * t;
    return base + Math.random() * CONFIG.OBS_GAP_JITTER;
}

/**
 * One hazard, or later in the run sometimes two side by side with a gap between
 * them, so that dodging means choosing a line rather than drifting off one.
 */
function spawnRow(z, scene) {
    const pairChance = z < CONFIG.OBS_PAIR_FROM ? 0 :
        CONFIG.OBS_PAIR_CHANCE_MAX * Math.min(1, (z - CONFIG.OBS_PAIR_FROM) / CONFIG.OBS_RAMP_DIST);
    if (Math.random() < pairChance) {
        const hw = CONFIG.OBS_SPAWN_HALF_W;
        const gapCentre = (Math.random() * 2 - 1) * (hw - 1.4);
        // At least three units of clear road between them, which is room for
        // Carl and both hit radii with some to spare.
        const left = Math.max(-hw, gapCentre - 1.5 - Math.random() * 1.5);
        const right = Math.min(hw, gapCentre + 1.5 + Math.random() * 1.5);
        spawnObstacle(z, scene, left);
        spawnObstacle(z + (Math.random() - 0.5) * 2, scene, right);
    } else {
        spawnObstacle(z, scene);
    }
}

/**
 * Hides every beacon at once. They are switched per frame only while a run is
 * live, so without this the last ones stayed up behind the game-over screen.
 */
window.hideBeacons = function() {
    for (const o of obstacles) if (o.beacon) o.beacon.setEnabled(false);
};

function disposeObstacle(o) {
    if (o.mesh) o.mesh.dispose();
    if (o.shadow) o.shadow.dispose();
    if (o.beacon) o.beacon.dispose();
}

window.initObstacles = function(scene) {
    for (const o of obstacles) disposeObstacle(o);
    obstacles.length = 0;
    obsMaxZ = 0;
    let z = CONFIG.OBS_FIRST;
    for (let i = 0; i < 4; i++) {
        spawnRow(z, scene);
        z += nextGap(z);
    }
};

window.updateObstacles = function(scene, terrain) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].z < player.distance - 30) {
            disposeObstacle(obstacles[i]);
            obstacles.splice(i, 1);
        }
    }
    if (obsMaxZ < player.distance + 150) {
        spawnRow(obsMaxZ + nextGap(obsMaxZ), scene);
    }
};

window.updateObstaclePositions = function(terrain, scrollOffset) {
    for (const obs of obstacles) {
        if (!obs.mesh) continue;
        const relZ = obs.z - scrollOffset;
        const curve = terrain.curveAt(obs.z);
        const cx = curve * relZ;
        const ground = terrain.hillAt(obs.z);
        obs.mesh.position.x = obs.worldX + cx;

        let yOff = 0.1;
        if (obs.type === 'rock') yOff = obs.hitR * 0.6;
        else if (obs.type === 'branch') yOff = 0.07;
        else if (obs.type === 'stick') yOff = 0.04;
        else if (obs.type === 'puddle') yOff = 0.02;
        else if (obs.type === 'pinecone') yOff = obs.hitR * 0.9;

        obs.mesh.position.y = ground + yOff;
        obs.mesh.position.z = relZ;
        obs.mesh.setEnabled(obs.active);
        if (obs.beacon) {
            const dz = obs.z - player.distance;
            // Size in world units grows with distance, so its size on screen
            // holds steady; visibility ramps out between 14 and 8 units.
            const size = 0.6 * Math.max(1, dz / 10);
            obs.beacon.scaling.setAll(size);
            obs.beacon.position.x = obs.mesh.position.x;
            obs.beacon.position.y = ground + 0.6 + size * 0.6;
            obs.beacon.position.z = relZ;
            obs.beacon.visibility = Math.max(0, Math.min(1, (dz - 8) / 6));
            obs.beacon.setEnabled(obs.active && dz > 8 && gameState === 'playing');
        }
        if (obs.shadow) {
            obs.shadow.position.x = obs.mesh.position.x;
            obs.shadow.position.y = ground + 0.015;
            obs.shadow.position.z = relZ;
            obs.shadow.setEnabled(obs.active);
        }
    }
};

/**
 * Returns null, 'stumble' or 'wipeout'.
 *
 * `start` is player.distance at the start of the frame, as main.js passes it;
 * player.prevDistance stands in when it is not given. The test is against the
 * whole stretch Carl covered this frame, not just where he ended up: at speed
 * he covers more than an obstacle's depth in one frame (1.6 units at 60 Hz,
 * against a pinecone's 0.45), so testing the end point alone let him ride
 * straight through one, more often the lower the frame rate.
 */
window.checkObstacleCollisions = function(terrain, start) {
    if (player.bailing) return null;
    const airborne = window.isAirborne();
    const begin = start === undefined ? player.prevDistance : start;
    const from = Math.min(begin, player.distance);
    const to = Math.max(begin, player.distance);

    for (const obs of obstacles) {
        if (!obs.active) continue;
        const dx = Math.abs(player.x - obs.worldX);
        const crossed = (r) => obs.z >= from - r && obs.z <= to + r;

        // 0.15 is half the width of Carl's board.
        if (!player.invincible && !airborne && dx < obs.hitR + 0.15 && crossed(obs.hitR)) {
            obs.active = false;
            return obs.fatal ? 'wipeout' : 'stumble';
        }

        // Clearing something in the air counts as a near miss too: that is the
        // move the ollie is there for.
        if (!obs.nearMissed && dx < obs.nearMissR + 0.15 && obs.z <= to && obs.z >= from - obs.nearMissR) {
            obs.nearMissed = true;
            player.scoreRaw += CONFIG.NEAR_MISS_POINTS;
            player.score = Math.floor(player.scoreRaw);
            playNearMissSound();
        }
    }
    return null;
};
