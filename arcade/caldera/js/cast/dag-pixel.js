// dag-pixel.js -- Dag Henderson as transatlantic_colleague draws him.
//
// Moonlight Drift's Dag is drawn with a mirrored, translucent second self
// beside him, which belongs to that game and reads as a stray ghost here.
// transatlantic_colleague's Dag is a 16x24 pixel figure with a real walk
// cycle, authored in SPRITE//FORGE: these grids are copied verbatim from
// apps/sprite-forge/app/core/templates.js (DAG_UP_DOWN, DAG_UP_LEFT,
// LEGS_STAND, LEGS_SIDE, LEGS_SIDE_STEP_A/B) on 2026-10-17. Change him there
// first if he changes, so the two games keep one Dag.
//
// The colours are that template's DAG_SLOTS. The three shaded keys (d, C, F)
// are sprite-forge's shadeHex(slot, -1), resolved once with its own code:
// skin #f4d5b5 -> #f0c881, coat #34495e -> #1e293c, scarf #95a5a6 -> #718b91.
//
// The side-on frames face LEFT, as the template does; render.js mirrors them.

window.characters = window.characters || {};

(function () {
  const COLOR = {
    K: '#1c2733', s: '#f4d5b5', d: '#f0c881', h: '#5d4037',
    c: '#34495e', C: '#1e293c', f: '#95a5a6', F: '#718b91',
    n: '#c9b458', b: '#293845', B: '#18222c',
  };

  const BLANK = '................';

  const UP_DOWN = [
    '.....KKKKKK.....',
    '....KhhhhhhK....',
    '....KhsssshK....',
    '....KsKssKsK....',
    '....KssssssK....',
    '.....KsddsK.....',
    '......KFFK......',
    '.....KFFFFK.....',
    '...KccccccccK...',
    '..KcKccccccKcK..',
    '..KcKcnccncKcK..',
    '..KcKccccccKcK..',
    '..KsKccccccKsK..',
    '...KKccccccKK...',
    '....KCCCCCCK....',
    '....KCCCCCCK....',
    '....KKKKKKKK....',
  ];

  const UP_LEFT = [
    '....KKKKKK......',
    '...KhhhhhhK.....',
    '...KsssshhK.....',
    '...KsKsshhK.....',
    '..KsssshhK......',
    '...KsdhhK.......',
    '.....KFFK.......',
    '....KFFFFK......',
    '...KccccccK.....',
    '..KcKccccKcK....',
    '..KcKccccKcK....',
    '..KcKccccKcK....',
    '..KsKccccKsK....',
    '...KKccccKK.....',
    '....KCCCCK......',
    '....KCCCCK......',
    '....KKKKKK......',
  ];

  const LEGS_STAND = [
    '....KbbKKbbK....',
    '....KbbKKbbK....',
    '....KbbKKbbK....',
    '....KbbKKbbK....',
    '...KBBBKKBBBK...',
    '...KKKKKKKKKK...',
  ];
  const LEGS_STAND_TALL = ['....KbbKKbbK....', ...LEGS_STAND];

  const LEGS_SIDE = [
    '....KbbKbbK.....',
    '....KbbKbbK.....',
    '....KbbKbbK.....',
    '....KbbKbbK.....',
    '...KBBBKBBBK....',
    '...KKKKKKKKK....',
  ];
  const LEGS_SIDE_TALL = ['....KbbKbbK.....', ...LEGS_SIDE];
  const LEGS_SIDE_STEP_A = [
    '....KbbKbbK.....',
    '....KbbKbbK.....',
    '...KbbKKbbK.....',
    '..KbbK.KBBK.....',
    '..KBBK.KKKK.....',
    '..KKKK..........',
  ];
  const LEGS_SIDE_STEP_B = [
    '....KbbKbbK.....',
    '....KbbKbbK.....',
    '...KbbKKbbK.....',
    '..KBBK.KbbK.....',
    '..KKKK.KBBK.....',
    '.......KKKK.....',
  ];

  const rest = (upper, legs) => [BLANK, ...upper, ...legs];
  const bob = (upper, legs) => [...upper, ...legs];

  const FRAMES = {
    idle: [rest(UP_DOWN, LEGS_STAND), bob(UP_DOWN, LEGS_STAND_TALL)],
    run: [
      bob(UP_LEFT, LEGS_SIDE_TALL),
      rest(UP_LEFT, LEGS_SIDE_STEP_A),
      bob(UP_LEFT, LEGS_SIDE_TALL),
      rest(UP_LEFT, LEGS_SIDE_STEP_B),
    ],
    // Mid-leap: the open stride.
    air: [rest(UP_LEFT, LEGS_SIDE_STEP_A)],
  };

  // Draw one frame as 16x24 cells of size 1 at (x, y). The caller scales.
  // Each cell overdraws by a hair so a non-integer scale leaves no seams.
  function drawFrame(ctx, x, y, pose, i, faceRight) {
    const set = FRAMES[pose] || FRAMES.idle;
    const grid = set[i % set.length];
    const flip = faceRight && pose !== 'idle';
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let col = 0; col < 16; col++) {
        const col2 = row[flip ? 15 - col : col];
        const fill = COLOR[col2];
        if (!fill) continue;
        ctx.fillStyle = fill;
        ctx.fillRect(x + col, y + r, 1.04, 1.04);
      }
    }
  }

  window.characters['dag-pixel'] = {
    name: 'Dag Henderson',
    pixel: { w: 16, h: 24, frames: { idle: 2, run: 4, air: 1 } },
    drawFrame,
  };
})();
