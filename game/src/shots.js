// NEON SURGE — deterministic screenshot scenes behind ?shot=start|play|upgrade|end.
// Each scene plays the real rules forward from a fresh world, steered by an autopilot
// (kite away from enemies, aim at the nearest one, fire always, nova when crowded),
// so the frame is what a real game looks like and the same seed always gives the same frame.
import { STEP, TOTAL_WAVES } from './config.js';
import { makeInput } from './input.js';
import {
  makeWorld,
  reset,
  startGame,
  step,
  applyUpgrade,
  nextWave,
  SCREEN_TITLE,
  SCREEN_PLAY,
  SCREEN_UPGRADE,
  SCREEN_OVER,
  SCREEN_WIN,
} from './world.js';

// Upgrade priority for the autopilot: damage first, hull only when hurt.
const PICK_ORDER = ['damage', 'firerate', 'multishot', 'pierce', 'speed', 'nova', 'magnet', 'hull'];

function autopilotInput(world, input) {
  const p = world.player;
  let target = null;
  let best = Infinity;
  for (const e of world.enemies) {
    const d = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
    if (d < best) {
      best = d;
      target = e;
    }
  }
  if (target) {
    input.mouseX = target.x;
    input.mouseY = target.y;
  }
  // Flee nearby enemies, seek shards when safe, keep off the walls.
  let mx = 0;
  let my = 0;
  for (const e of world.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 230) {
      const w = (230 - d) / 230;
      mx += (dx / d) * w;
      my += (dy / d) * w;
    }
  }
  if (mx === 0 && my === 0) {
    let shard = null;
    let bd = Infinity;
    for (const k of world.pickups) {
      if (k.kind !== 'shard') continue;
      const d = (k.x - p.x) * (k.x - p.x) + (k.y - p.y) * (k.y - p.y);
      if (d < bd) {
        bd = d;
        shard = k;
      }
    }
    if (shard) {
      const d = Math.sqrt(bd) || 1;
      mx = (shard.x - p.x) / d;
      my = (shard.y - p.y) / d;
    } else {
      mx = (640 - p.x) / 640;
      my = (360 - p.y) / 360;
    }
  }
  if (p.x < 130) mx += 1;
  if (p.x > 1150) mx -= 1;
  if (p.y < 130) my += 1;
  if (p.y > 590) my -= 1;
  // A mild pull to the middle keeps the fight in the frame's centre.
  mx += ((640 - p.x) / 640) * 0.45;
  my += ((360 - p.y) / 360) * 0.45;
  const len = Math.hypot(mx, my) || 1;
  mx /= len;
  my /= len;
  input.left = mx < -0.3;
  input.right = mx > 0.3;
  input.up = my < -0.3;
  input.down = my > 0.3;
  input.fire = target !== null;
  let near = 0;
  for (const e of world.enemies) {
    if (Math.hypot(e.x - p.x, e.y - p.y) < 210) near += 1;
  }
  if (near >= 5 && p.novaTimer <= 0) input.pressedKeys.add('Space');
  else input.pressedKeys.delete('Space');
}

function pickUpgrade(world) {
  const order = world.player.hp < world.player.maxHp * 0.45 ? ['hull', ...PICK_ORDER] : PICK_ORDER;
  for (const id of order) {
    const found = world.upgradeChoices.find((u) => u.id === id);
    if (found) {
      applyUpgrade(world, found.id);
      return;
    }
  }
  if (world.upgradeChoices.length > 0) applyUpgrade(world, world.upgradeChoices[0].id);
}

// Step the world with the autopilot until `done(world)` is true, or the step cap hits.
// Handles the upgrade screen on the way (the autopilot picks and moves on).
function runUntil(world, input, audio, done, maxSeconds) {
  const maxSteps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.screen === SCREEN_UPGRADE) {
      pickUpgrade(world);
      nextWave(world);
      continue;
    }
    if (world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) break;
    autopilotInput(world, input);
    step(world, STEP, input, audio);
    if (done(world)) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw.
 * start: title over a live wave-1 arena. play: mid wave 6, arena busy.
 * upgrade: the pick-1-of-3 screen after wave 2. end: the win screen after wave 10.
 */
export function stageShot(name, world, audio) {
  const input = makeInput();
  reset(world);
  if (name === 'start') {
    startGame(world);
    runUntil(world, input, audio, () => world.time > 5, 6);
    // A clean backdrop for the title: keep the arena and its enemies, drop the
    // floating score texts and particles that would clutter the title.
    world.texts = [];
    world.particles = [];
    world.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'upgrade') {
    startGame(world);
    runUntil(world, input, audio, () => world.screen === SCREEN_UPGRADE, 300);
    return { screen: world.screen };
  }
  if (name === 'end') {
    startGame(world);
    runUntil(world, input, audio, () => world.screen === SCREEN_WIN, 900);
    return { screen: world.screen };
  }
  // play (default): a busy mid-wave frame.
  startGame(world);
  runUntil(
    world,
    input,
    audio,
    () => world.wave >= 5 && world.enemies.length >= 8 && world.screen === SCREEN_PLAY,
    600,
  );
  return { screen: world.screen };
}

export function makeShotWorld(seed) {
  return makeWorld(seed);
}

export { TOTAL_WAVES };
