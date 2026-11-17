// NEON SURGE — canvas rendering. Pure drawing from world state; no sim logic here.
// The shake offset is a sine of world time, never Math.random, so a staged frame is stable.
import { VIEW, COLORS, TOTAL_WAVES } from './config.js';
import {
  SCREEN_TITLE,
  SCREEN_PLAY,
  SCREEN_UPGRADE,
  SCREEN_PAUSE,
  SCREEN_OVER,
  SCREEN_WIN,
} from './world.js';

// Deterministic 0..1 hash for decoration only: same input, same output, every run.
// Never feeds the sim, so gameplay is untouched.
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, world) {
  const g = ctx.createRadialGradient(640, 360, 80, 640, 360, 900);
  g.addColorStop(0, COLORS.bg1);
  g.addColorStop(1, COLORS.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Slow aurora glows that breathe with the visual clock (a function of world.time
  // only, so a staged frame is stable). They lift the wide empty areas of the arena.
  glowCircle(ctx, 280, 170, 430, COLORS.cyan, 0.05 + 0.02 * Math.sin(world.time * 0.4));
  glowCircle(ctx, 1020, 560, 470, COLORS.chaser, 0.045 + 0.02 * Math.sin(world.time * 0.33 + 2));
  glowCircle(ctx, 640, 360, 520, '#7c5cff', 0.03 + 0.015 * Math.sin(world.time * 0.25 + 4));
  // Deterministic starfield: positions come from a fixed hash, never Math.random
  // and never the gameplay rng, so the sim is untouched.
  for (let i = 0; i < 80; i += 1) {
    const sx = hash(i) * VIEW.width;
    const sy = hash(i + 1000) * VIEW.height;
    const tw = 0.65 + 0.35 * Math.sin(world.time * 1.5 + i * 1.7);
    ctx.globalAlpha = (0.12 + hash(i + 3000) * 0.3) * tw;
    ctx.fillStyle = hash(i + 2000) > 0.8 ? COLORS.gold : COLORS.text;
    const sr = 0.6 + hash(i + 2000) * 1.3;
    ctx.fillRect(sx - sr / 2, sy - sr / 2, sr, sr);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW.height);
    ctx.stroke();
  }
  for (let y = 0; y <= VIEW.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y);
    ctx.stroke();
  }
  // Faint concentric rings around the centre, like a radar sweep of the arena.
  ctx.strokeStyle = COLORS.ring;
  for (let r = 120; r <= 600; r += 120) {
    ctx.beginPath();
    ctx.arc(640, 360, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawArenaProps(ctx, world);
  ctx.strokeStyle = 'rgba(139, 147, 184, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, VIEW.width - 12, VIEW.height - 12);
}

// Fixed arena props: glowing pylons and floor panels at fixed spots, drawn behind
// everything. Pure decoration — no collision, no sim effect, no rng.
const PYLONS = [
  [170, 170, 58, '#22d3ee'],
  [1110, 150, 66, '#ff2d95'],
  [160, 570, 62, '#ffd166'],
  [1120, 580, 54, '#22d3ee'],
  [430, 110, 46, '#ff2d95'],
  [850, 615, 58, '#ffd166'],
  [105, 360, 50, '#7c5cff'],
  [1175, 360, 50, '#39ff88'],
];
const PANELS = [
  [280, 500, 110, 64],
  [900, 160, 110, 64],
  [560, 92, 120, 54],
  [600, 620, 120, 54],
];

function drawArenaProps(ctx, world) {
  ctx.save();
  for (const [x, y, w, h] of PANELS) {
    ctx.strokeStyle = 'rgba(139, 147, 184, 0.28)';
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 8);
    ctx.stroke();
    // Corner ticks so the panel reads as floor marking, not a button.
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.lineWidth = 2;
    const t = 10;
    ctx.beginPath();
    ctx.moveTo(x, y + t);
    ctx.lineTo(x, y);
    ctx.lineTo(x + t, y);
    ctx.moveTo(x + w - t, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + t);
    ctx.moveTo(x + w, y + h - t);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - t, y + h);
    ctx.moveTo(x + t, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - t);
    ctx.stroke();
  }
  for (const [x, y, h, color] of PYLONS) {
    glowCircle(ctx, x, y, 42, color, 0.16 + 0.04 * Math.sin(world.time * 1.1 + x));
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x - 5, y - h / 2, 10, h);
    ctx.globalAlpha = 0.9;
    ctx.save();
    ctx.translate(x, y - h / 2 - 10);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPickups(ctx, world) {
  for (const k of world.pickups) {
    const pulse = 1 + Math.sin(world.time * 6 + k.x) * 0.15;
    if (k.kind === 'shard') {
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.shard;
      const s = 6 * pulse;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = COLORS.heart;
      ctx.beginPath();
      ctx.arc(k.x - 4, k.y - 2, 5, 0, Math.PI * 2);
      ctx.arc(k.x + 4, k.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(k.x - 8, k.y);
      ctx.lineTo(k.x + 8, k.y);
      ctx.lineTo(k.x, k.y + 9);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawEnemy(ctx, world, e) {
  const flash = e.flash > 0;
  const body = flash ? '#ffffff' : e.color;
  ctx.save();
  ctx.translate(e.x, e.y);
  glowCircle(ctx, 0, 0, e.radius * 2.2, e.color, 0.25);
  ctx.fillStyle = body;
  ctx.strokeStyle = body;
  ctx.lineWidth = 2;
  if (e.type === 'chaser') {
    ctx.rotate(e.angle);
    ctx.beginPath();
    ctx.moveTo(e.radius + 4, 0);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'tank') {
    ctx.rotate(world.time * 0.4 + e.id);
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.radius;
      const py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'shooter') {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(e.angle);
    ctx.fillStyle = body;
    ctx.fillRect(0, -3, e.radius + 6, 6);
  } else if (e.type === 'splitter') {
    ctx.beginPath();
    ctx.arc(-e.radius * 0.35, 0, e.radius * 0.62, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.35, 0, e.radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'mini') {
    ctx.rotate(e.angle);
    ctx.beginPath();
    ctx.moveTo(e.radius + 2, 0);
    ctx.lineTo(-e.radius, e.radius);
    ctx.lineTo(-e.radius, -e.radius);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'boss') {
    ctx.rotate(world.time * 0.25);
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? e.radius + 8 : e.radius - 4;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-world.time * 0.25);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-10, -6, 4, 0, Math.PI * 2);
    ctx.arc(10, -6, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // HP bar for anything hurt.
  if (e.hp < e.maxHp && e.type !== 'mini') {
    const w = e.radius * 2;
    const y = e.y - e.radius - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, y, w, 4);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 4);
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (!p.alive) return;
  const blink = p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  glowCircle(ctx, 0, 0, 44, COLORS.player, blink ? 0.12 : 0.3);
  ctx.rotate(p.angle);
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, 11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, -11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Aim tick: a short line toward the mouse so the aim reads at a glance.
  ctx.strokeStyle = 'rgba(255, 224, 102, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24);
  ctx.lineTo(p.x + Math.cos(p.angle) * 38, p.y + Math.sin(p.angle) * 38);
  ctx.stroke();
}

function drawBullets(ctx, world) {
  ctx.lineCap = 'round';
  for (const b of world.bullets) {
    ctx.strokeStyle = COLORS.bullet;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(b.x - (b.vx / 640) * 14, b.y - (b.vy / 640) * 14);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = COLORS.bulletCore;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - (b.vx / 640) * 8, b.y - (b.vy / 640) * 8);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const b of world.enemyBullets) {
    glowCircle(ctx, b.x, b.y, 14, COLORS.enemyBullet, 0.5);
    ctx.fillStyle = COLORS.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawRings(ctx, world) {
  for (const r of world.rings) {
    const f = 1 - r.life / r.maxLife;
    const rad = r.r0 + (r.r1 - r.r0) * f;
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// One big centre callout for a rising combo. Only drawn while playing, so it can
// never sit on top of an end card or the upgrade screen.
function drawCallout(ctx, world) {
  const c = world.callout;
  if (!c || world.screen !== SCREEN_PLAY) return;
  ctx.globalAlpha = Math.min(1, (c.life / c.maxLife) * 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.cyan;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 18;
  ctx.fillText(c.text, VIEW.width / 2, 132);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, world) {
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px system-ui, sans-serif`;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`WAVE ${Math.max(1, world.wave)}/${TOTAL_WAVES}`, 24, 38);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`${world.enemies.length + world.spawnQueue.length} hostiles left`, 24, 62);
  // HP bar, centre-top.
  const bw = 260;
  const bx = VIEW.width / 2 - bw / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, bx - 4, 18, bw + 8, 22, 8);
  ctx.fill();
  ctx.fillStyle = p.hp > 30 ? '#39ff88' : '#ff3355';
  rr(ctx, bx, 22, bw * Math.max(0, p.hp / p.maxHp), 14, 6);
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HULL ${Math.ceil(p.hp)}`, VIEW.width / 2, 33);
  // Score, shards, combo — right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`◆ ${world.shards}`, VIEW.width - 24, 38);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`SCORE ${world.score}`, VIEW.width - 24, 64);
  if (world.combo.mult > 1) {
    ctx.fillStyle = COLORS.cyan;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`COMBO x${world.combo.mult}`, VIEW.width - 24, 90);
  }
  // Nova meter, bottom-left.
  const ready = p.novaTimer <= 0;
  const frac = ready ? 1 : 1 - p.novaTimer / p.novaCooldown;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, 20, VIEW.height - 34, 150, 14, 7);
  ctx.fill();
  ctx.fillStyle = ready ? COLORS.nova : 'rgba(125,249,255,0.45)';
  rr(ctx, 22, VIEW.height - 32, 146 * frac, 10, 5);
  ctx.fill();
  ctx.fillStyle = ready ? COLORS.nova : COLORS.dim;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(ready ? 'SPACE — NOVA READY' : 'SPACE — NOVA CHARGING', 180, VIEW.height - 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD move · mouse aim · hold click to fire · P pause · M mute', VIEW.width - 24, VIEW.height - 22);
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 2, 16, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function bigTitle(ctx, text, y, color, size = 72) {
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.fillText(text, VIEW.width / 2, y);
  ctx.shadowBlur = 0;
}

function drawTitle(ctx, world) {
  dim(ctx, 0.55);
  // A second, wider glow pass under the title so it burns through the dim.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.cyan;
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 46;
  ctx.globalAlpha = 0.55;
  ctx.fillText('NEON SURGE', VIEW.width / 2, 185);
  ctx.globalAlpha = 1;
  bigTitle(ctx, 'NEON SURGE', 185, COLORS.cyan, 92);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('— twin-stick arena shooter —', VIEW.width / 2, 228);
  // Neon underline: cyan fading into magenta under the subtitle.
  const ug = ctx.createLinearGradient(VIEW.width / 2 - 210, 0, VIEW.width / 2 + 210, 0);
  ug.addColorStop(0, COLORS.cyan);
  ug.addColorStop(0.5, '#7c5cff');
  ug.addColorStop(1, COLORS.chaser);
  ctx.fillStyle = ug;
  ctx.fillRect(VIEW.width / 2 - 210, 246, 420, 4);
  ctx.fillStyle = COLORS.text;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('The swarm never stops. Hold the arena, ten waves, and light up the dark.', VIEW.width / 2, 288);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('WASD — move · mouse — aim · hold click — fire · SPACE — nova burst', VIEW.width / 2, 326);
  ctx.fillText('Clear a wave, pick 1 of 3 upgrades. Survive wave 10 to win.', VIEW.width / 2, 354);
  // Feature chips: the whole game in three words, readable at a glance.
  const chips = [
    ['10 WAVES', COLORS.cyan],
    ['8 UPGRADES', COLORS.gold],
    ['BOSS FINALE', COLORS.chaser],
  ];
  const cw = 176;
  const ch = 36;
  const gap = 18;
  const x0 = (VIEW.width - (cw * 3 + gap * 2)) / 2;
  chips.forEach(([label, color], i) => {
    const x = x0 + i * (cw + gap);
    ctx.fillStyle = 'rgba(13, 10, 36, 0.85)';
    rr(ctx, x, 392, cw, ch, 10);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    rr(ctx, x, 392, cw, ch, 10);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(label, x + cw / 2, 415);
  });
  // The call to play pulses so the eye lands on it first.
  ctx.globalAlpha = 0.72 + 0.28 * Math.sin(world.time * 4);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('▶  CLICK OR PRESS ENTER TO PLAY', VIEW.width / 2, 472);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = COLORS.dim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`best score ${world.best}`, VIEW.width / 2, 516);
  }
  ctx.fillStyle = 'rgba(139,147,184,0.8)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('seed 7 · deterministic', VIEW.width / 2, 690);
}

// Which upgrade card (0-2) sits under a click, or -1. Same geometry as drawUpgrade.
export function upgradeCardIndex(x, y) {
  const cw = 300;
  const ch = 210;
  const gap = 36;
  const total = cw * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y0 = 240;
  if (y < y0 || y > y0 + ch) return -1;
  for (let i = 0; i < 3; i += 1) {
    const cx = x0 + i * (cw + gap);
    if (x >= cx && x <= cx + cw) return i;
  }
  return -1;
}

function drawUpgrade(ctx, world, input) {
  dim(ctx, 0.62);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} CLEARED`, VIEW.width / 2, 130);
  ctx.fillStyle = COLORS.gold;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Pick one upgrade — press 1, 2 or 3, or click a card', VIEW.width / 2, 168);
  const cw = 300;
  const ch = 210;
  const gap = 36;
  const total = cw * 3 + gap * 2;
  const x0 = (VIEW.width - total) / 2;
  const y0 = 240;
  world.upgradeChoices.forEach((u, i) => {
    const x = x0 + i * (cw + gap);
    const hover = input && input.mouseX >= x && input.mouseX <= x + cw && input.mouseY >= y0 && input.mouseY <= y0 + ch;
    ctx.fillStyle = hover ? 'rgba(34, 211, 238, 0.16)' : 'rgba(13, 10, 36, 0.92)';
    rr(ctx, x, y0, cw, ch, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? COLORS.cyan : 'rgba(139, 147, 184, 0.6)';
    ctx.lineWidth = hover ? 3 : 2;
    rr(ctx, x, y0, cw, ch, 14);
    ctx.stroke();
    ctx.fillStyle = COLORS.cyan;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, x + cw / 2, y0 + 34);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(u.icon, x + cw / 2, y0 + 82);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText(u.name, x + cw / 2, y0 + 122);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(u.desc, x + cw / 2, y0 + 156);
  });
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`score ${world.score} · hull ${Math.ceil(world.player.hp)}/${world.player.maxHp}`, VIEW.width / 2, 510);
}

function drawPause(ctx) {
  dim(ctx, 0.6);
  bigTitle(ctx, 'PAUSED', 330, COLORS.text, 56);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.dim;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('press P to resume', VIEW.width / 2, 380);
}

function statLine(ctx, world, y) {
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}  ·  WAVE ${world.wave}/${TOTAL_WAVES}  ·  ${world.kills} destroyed`, VIEW.width / 2, y);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '17px system-ui, sans-serif';
  const mins = Math.floor(world.playTime / 60);
  const secs = Math.floor(world.playTime % 60);
  ctx.fillText(`time ${mins}:${String(secs).padStart(2, '0')}  ·  best ${world.best}`, VIEW.width / 2, y + 34);
}

function drawOver(ctx, world) {
  dim(ctx, 0.62);
  bigTitle(ctx, 'SIGNAL LOST', 250, COLORS.boss, 64);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Your hull gave out. The swarm keeps the arena — for now.', VIEW.width / 2, 300);
  statLine(ctx, world, 370);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('▶  PRESS R TO RETRY', VIEW.width / 2, 470);
}

function drawWin(ctx, world) {
  dim(ctx, 0.5);
  bigTitle(ctx, 'SECTOR CLEARED', 240, COLORS.gold, 64);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Ten waves. The swarm is scrap. The arena is yours.', VIEW.width / 2, 292);
  statLine(ctx, world, 362);
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('▶  PRESS R TO PLAY AGAIN', VIEW.width / 2, 462);
}

export function draw(ctx, world, input) {
  ctx.save();
  if (world.shake > 0.3) {
    const m = world.shake;
    ctx.translate(Math.sin(world.time * 91) * m * 0.5, Math.cos(world.time * 113) * m * 0.5);
  }
  drawBackground(ctx, world);
  drawPickups(ctx, world);
  for (const e of world.enemies) drawEnemy(ctx, world, e);
  drawPlayer(ctx, world);
  drawBullets(ctx, world);
  drawParticles(ctx, world);
  drawRings(ctx, world);
  drawTexts(ctx, world);
  drawCallout(ctx, world);
  ctx.restore();

  if (world.flash > 0) {
    ctx.fillStyle = `rgba(190, 240, 255, ${Math.min(0.4, world.flash)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  const screen = world.screen;
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) drawHud(ctx, world);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world);
  else if (screen === SCREEN_UPGRADE) {
    drawHud(ctx, world);
    drawUpgrade(ctx, world, input);
  } else if (screen === SCREEN_PAUSE) drawPause(ctx);
  else if (screen === SCREEN_OVER) drawOver(ctx, world);
  else if (screen === SCREEN_WIN) drawWin(ctx, world);
}
