// Keyboard + mouse input. The sim reads this, never the DOM directly.
// Mouse aim is in canvas pixels; the canvas is exactly the logical view, so no scaling.
export function makeInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    mouseX: 640,
    mouseY: 360,
    pressedKeys: new Set(),
  };
}

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export function attachInput(input, canvas, hooks) {
  window.addEventListener('keydown', (event) => {
    const field = KEYMAP[event.code];
    if (field) {
      input[field] = true;
      event.preventDefault();
    }
    if (event.code === 'Space') event.preventDefault();
    if (!event.repeat) {
      input.pressedKeys.add(event.code);
      if (hooks && hooks.onKey) hooks.onKey(event.code);
    }
  });
  window.addEventListener('keyup', (event) => {
    const field = KEYMAP[event.code];
    if (field) input[field] = false;
    input.pressedKeys.delete(event.code);
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.fire = true;
      if (hooks && hooks.onMouseDown) hooks.onMouseDown(input.mouseX, input.mouseY);
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.fire = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.fire = false;
    input.pressedKeys.clear();
  });
}

// Normalised WASD direction, or null when no key is held.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.up) y -= 1;
  if (input.down) y += 1;
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}
