// NEON SURGE — entry point. Fixed-step sim (1/60), render every frame.
// ?shot=start|play|upgrade|end&seed=N stages a deterministic screenshot scene instead
// of the interactive game; anything else is the game itself.
import { VIEW, STEP } from './config.js';
import { makeInput, attachInput } from './input.js';
import { makeAudio, unlockAudio } from './audio.js';
import {
  makeWorld,
  startGame,
  step,
  applyUpgrade,
  nextWave,
  SCREEN_TITLE,
  SCREEN_PLAY,
  SCREEN_UPGRADE,
  SCREEN_PAUSE,
  SCREEN_OVER,
  SCREEN_WIN,
} from './world.js';
import { draw, upgradeCardIndex } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '7', 10) || 7;

const world = makeWorld(seed);
const input = makeInput();
const audio = makeAudio();

let lastScreen = world.screen;
function announce() {
  if (world.screen === lastScreen || !statusEl) return;
  lastScreen = world.screen;
  const lines = {
    [SCREEN_TITLE]: 'NEON SURGE. Press Enter to play.',
    [SCREEN_PLAY]: `Wave ${world.wave}. Score ${world.score}.`,
    [SCREEN_UPGRADE]: 'Wave cleared. Pick one upgrade.',
    [SCREEN_PAUSE]: 'Paused.',
    [SCREEN_OVER]: `Game over. Score ${world.score}. Press R to retry.`,
    [SCREEN_WIN]: `Sector cleared. Score ${world.score}. Press R to play again.`,
  };
  statusEl.textContent = lines[world.screen] || '';
}

if (shotName) {
  // Screenshot staging: play the real rules forward, draw once, stop.
  const staged = stageShot(shotName, world, audio);
  world.screen = staged.screen;
  draw(ctx, world, input);
  announce();
} else {
  attachInput(input, canvas, {
    onKey(code) {
      unlockAudio(audio);
      if (code === 'KeyM') {
        audio.muted = !audio.muted;
        return;
      }
      if (world.screen === SCREEN_TITLE && (code === 'Enter' || code === 'Space')) {
        // Space is also the nova key: drop it from the pressed set so starting
        // the game with Space does not spend the nova on the first frame.
        input.pressedKeys.delete('Space');
        startGame(world);
        return;
      }
      if (world.screen === SCREEN_PLAY && code === 'KeyP') {
        world.screen = SCREEN_PAUSE;
        return;
      }
      if (world.screen === SCREEN_PAUSE && code === 'KeyP') {
        world.screen = SCREEN_PLAY;
        return;
      }
      if (world.screen === SCREEN_UPGRADE && (code === 'Digit1' || code === 'Digit2' || code === 'Digit3')) {
        const idx = Number(code.slice(-1)) - 1;
        const choice = world.upgradeChoices[idx];
        if (choice) {
          applyUpgrade(world, choice.id);
          nextWave(world);
        }
        return;
      }
      if ((world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) && code === 'KeyR') {
        startGame(world);
      }
    },
    onMouseDown(x, y) {
      unlockAudio(audio);
      if (world.screen === SCREEN_TITLE) {
        startGame(world);
        return;
      }
      if (world.screen === SCREEN_UPGRADE) {
        const idx = upgradeCardIndex(x, y);
        const choice = idx >= 0 ? world.upgradeChoices[idx] : null;
        if (choice) {
          applyUpgrade(world, choice.id);
          nextWave(world);
        }
        return;
      }
      if (world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) {
        startGame(world);
      }
    },
  });

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (world.screen === SCREEN_PLAY) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 4) {
        step(world, STEP, input, audio);
        acc -= STEP;
        n += 1;
      }
      if (n === 4) acc = 0;
    } else {
      // Menus still animate (pulses, rings) on the visual clock.
      world.time += dt;
    }
    draw(ctx, world, input);
    announce();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
