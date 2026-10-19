// ═══════════════════════════════════════════════
// Very Long Boards — Scene Setup
// ═══════════════════════════════════════════════

window.createScene = function(canvas) {
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.58, 0.78, 0.92, 1);

    const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 12, -8), scene);
    camera.fov = 1.05;
    camera.minZ = 0.5;
    camera.maxZ = 600;

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.3, -0.8, 0.4), scene);
    sun.intensity = 0.95;
    sun.diffuse = new BABYLON.Color3(1.0, 0.95, 0.88);

    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.5;
    ambient.diffuse = new BABYLON.Color3(0.85, 0.9, 1.0);
    ambient.groundColor = new BABYLON.Color3(0.35, 0.42, 0.28);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.004;
    scene.fogColor = new BABYLON.Color3(0.58, 0.78, 0.92);

    const skyTex = new BABYLON.DynamicTexture('skyTex', { width: 1, height: 64 }, scene);
    const skyCtx = skyTex.getContext();
    const grad = skyCtx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#7aadcc');
    grad.addColorStop(0.4, '#a8cce8');
    grad.addColorStop(0.7, '#c8dff0');
    grad.addColorStop(1, '#dde8f0');
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 1, 64);
    skyTex.update();

    const sky = BABYLON.MeshBuilder.CreatePlane('sky', { width: 800, height: 250 }, scene);
    const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
    skyMat.diffuseTexture = skyTex;
    skyMat.emissiveTexture = skyTex;
    skyMat.disableLighting = true;
    skyMat.backFaceCulling = false;
    sky.material = skyMat;
    sky.position = new BABYLON.Vector3(0, 80, 350);
    sky.isPickable = false;

    const whiteTex = new BABYLON.DynamicTexture('particleTex', { width: 4, height: 4 }, scene);
    const ptCtx = whiteTex.getContext();
    ptCtx.fillStyle = '#ffffff';
    ptCtx.fillRect(0, 0, 4, 4);
    whiteTex.update();

    function updateCamera(playerMesh, slope, roadCurve) {
        const pPos = playerMesh.position;
        const slopeFactor = Math.max(0, Math.min(1, -slope / 2));

        // Closer and lower than it was (5 up, 7 back), so Carl fills about a third
        // as much again of the frame: from 7 m he was a 25 px figure at 800 px
        // wide. The look-at point is raised to his waist so the extra height goes
        // to him and the road ahead rather than to the tarmac under the board.
        const camHeight = 3.6 + slopeFactor * 2;
        const camDist = 6 + slopeFactor * 1.5;

        camera.position.x = pPos.x * 0.75;
        camera.position.y = pPos.y + camHeight;
        camera.position.z = pPos.z - camDist;

        const lookAhead = 15;
        const curveOffset = roadCurve * 40;
        camera.setTarget(new BABYLON.Vector3(
            pPos.x * 0.8 + curveOffset,
            pPos.y + 0.4,
            pPos.z + lookAhead
        ));
    }

    /**
     * A portrait phone gets a near-square canvas. With the vertical FOV fixed,
     * narrowing the canvas narrowed the view to less than the road, so below a
     * 1.2 aspect the HORIZONTAL field is pinned instead and the road keeps its
     * full width on screen.
     */
    function applyFov() {
        engine.resize();
        if (engine.getAspectRatio(camera) < 1.2) {
            camera.fovMode = BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED;
            camera.fov = 1.25;
        } else {
            camera.fovMode = BABYLON.Camera.FOVMODE_VERTICAL_FIXED;
            camera.fov = 1.05;
        }
    }
    // The engine was never told about a resize, so rotating a phone or resizing
    // the window stretched the first frame's buffer for the rest of the session.
    window.addEventListener('resize', applyFov);
    applyFov();

    function updateSky(playerMesh) {
        // Height follows Carl as x and z do. The road descends forever, and a
        // sky pinned at 80 was above the view a few kilometres in.
        sky.position.x = playerMesh.position.x * 0.3;
        sky.position.y = playerMesh.position.y + 80;
        sky.position.z = playerMesh.position.z + 350;
    }

    return { engine, scene, camera, sun, ambient, whiteTex, updateCamera, updateSky };
};
