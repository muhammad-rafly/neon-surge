// NEON SURGE — the simulation. Fixed-step, seeded, no DOM except through input/audio.
// Screens: title → play → (upgrade between waves) → win | over. Pause freezes the sim.
import { VIEW, STEP, TOTAL_WAVES, PLAYER, ENEMIES, WAVE, PICKUPS, COMBO, UPGRADES, COLORS } from './config.js';
import { makeRng, range, pick, shuffle } from './random.js';
import { moveVector } from './input.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export const EVENT_NONE = 0;
export const EVENT_WAVE_CLEAR = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;

export function makeWorld(seed) {
  const world = {
    seed,
    rng: makeRng(seed),
    screen: SCREEN_TITLE,
    time: 0,
    wave: 0,
    score: 0,
    kills: 0,
    shards: 0,
    combo: { count: 0, timer: 0, mult: 1 },
    player: null,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    texts: [],
    pickups: [],
    spawnQueue: [],
    spawnTimer: 0,
    upgradeChoices: [],
    upgradesTaken: [],
    shake: 0,
    flash: 0,
    playTime: 0,
    best: 0,
    nextId: 1,
  };
  resetPlayer(world);
  return world;
}

function resetPlayer(world) {
  world.player = {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireTimer: 0,
    fireInterval: PLAYER.fireInterval,
    damage: PLAYER.bulletDamage,
    bulletSpeed: PLAYER.bulletSpeed,
    multishot: PLAYER.multishot,
    spread: PLAYER.spread,
    pierce: 0,
    magnet: PLAYER.magnet,
    novaTimer: 0,
    novaCooldown: PLAYER.novaCooldown,
    novaDamage: PLAYER.novaDamage,
    novaRadius: PLAYER.novaRadius,
    invuln: 0,
    alive: true,
  };
}

export function reset(world) {
  world.rng = makeRng(world.seed);
  world.screen = SCREEN_TITLE;
  world.time = 0;
  world.wave = 0;
  world.score = 0;
  world.kills = 0;
  world.shards = 0;
  world.combo = { count: 0, timer: 0, mult: 1 };
  world.enemies = [];
  world.bullets = [];
  world.enemyBullets = [];
  world.particles = [];
  world.texts = [];
  world.pickups = [];
  world.spawnQueue = [];
  world.spawnTimer = 0;
  world.upgradeChoices = [];
  world.upgradesTaken = [];
  world.shake = 0;
  world.flash = 0;
  world.playTime = 0;
  world.nextId = 1;
  resetPlayer(world);
}

export function startGame(world) {
  reset(world);
  world.screen = SCREEN_PLAY;
  beginWave(world, 1);
}

// Build the spawn queue for a wave. Budget grows; wave 10 opens with a boss.
function buildWave(world, n) {
  const queue = [];
  let budget = WAVE.baseBudget + WAVE.budgetPerWave * n;
  if (n === TOTAL_WAVES) {
    queue.push('boss');
    budget -= ENEMIES.boss.cost;
  }
  const table = ['chaser', 'chaser', 'chaser', 'shooter', 'splitter', 'tank'];
  while (budget > 0) {
    const type = pick(world.rng, table);
    const cost = ENEMIES[type].cost;
    if (cost > budget && budget < 3) {
      queue.push('chaser');
      budget -= 1;
    } else if (cost <= budget) {
      queue.push(type);
      budget -= cost;
    } else {
      queue.push('chaser');
      budget -= 1;
    }
  }
  return shuffle(world.rng, queue);
}

function beginWave(world, n) {
  world.wave = n;
  world.spawnQueue = buildWave(world, n);
  world.spawnTimer = 0.8;
  if (world.audioRef) sfx.wave(world.audioRef);
}

function edgePoint(world) {
  const side = Math.floor(world.rng() * 4);
  const m = 34;
  if (side === 0) return { x: range(world.rng, m, VIEW.width - m), y: m };
  if (side === 1) return { x: range(world.rng, m, VIEW.width - m), y: VIEW.height - m };
  if (side === 2) return { x: m, y: range(world.rng, m, VIEW.height - m) };
  return { x: VIEW.width - m, y: range(world.rng, m, VIEW.height - m) };
}

function spawnEnemy(world, type, x, y) {
  const def = ENEMIES[type];
  const hpScale = 1 + WAVE.hpScale * (world.wave - 1);
  const speedScale = Math.min(1 + WAVE.speedScale * (world.wave - 1), WAVE.speedCap);
  const at = x === undefined ? edgePoint(world) : { x, y };
  world.enemies.push({
    id: world.nextId,
    type,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * speedScale,
    radius: def.radius,
    damage: def.damage,
    score: def.score,
    color: def.color,
    shootTimer: range(world.rng, 1.2, 2.4),
    burstTimer: 3.5,
    spawnTimer: 8,
    flash: 0,
    angle: 0,
  });
  world.nextId += 1;
}

function burst(world, x, y, color, n, speed, life = 0.6, size = 3) {
  for (let i = 0; i < n; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const v = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: range(world.rng, life * 0.5, life),
      maxLife: life,
      color,
      size: range(world.rng, size * 0.6, size * 1.4),
    });
  }
  if (world.particles.length > 420) world.particles.splice(0, world.particles.length - 420);
}

function addText(world, x, y, text, color, size = 15) {
  world.texts.push({ x, y, text, life: 0.9, maxLife: 0.9, color, size });
}

function dropPickup(world, x, y, kind) {
  world.pickups.push({
    kind,
    x: x + range(world.rng, -8, 8),
    y: y + range(world.rng, -8, 8),
    vx: range(world.rng, -30, 30),
    vy: range(world.rng, -30, 30),
    life: 9,
  });
}

function killEnemy(world, enemy, awardScore) {
  const idx = world.enemies.indexOf(enemy);
  if (idx < 0) return;
  world.enemies.splice(idx, 1);
  world.kills += 1;
  if (awardScore) {
    world.combo.count += 1;
    world.combo.timer = COMBO.window;
    world.combo.mult = Math.min(1 + Math.floor(world.combo.count / 4), COMBO.maxMult);
    const gained = enemy.score * world.combo.mult;
    world.score += gained;
    addText(world, enemy.x, enemy.y - 14, `+${gained}`, world.combo.mult > 1 ? COLORS.gold : COLORS.text, world.combo.mult > 1 ? 18 : 14);
  }
  burst(world, enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 60 : 16, 260);
  sfx.explode(world.audioRef);
  world.shake = Math.max(world.shake, enemy.type === 'boss' ? 14 : 5);
  if (enemy.type === 'splitter') {
    for (let i = 0; i < 2; i += 1) spawnEnemy(world, 'mini', enemy.x + (i === 0 ? -14 : 14), enemy.y);
  }
  if (enemy.type === 'boss') {
    for (let i = 0; i < 15; i += 1) dropPickup(world, enemy.x, enemy.y, 'shard');
    dropPickup(world, enemy.x, enemy.y, 'heart');
  } else {
    const shards = enemy.type === 'tank' ? 3 : enemy.type === 'shooter' ? 2 : 1;
    for (let i = 0; i < shards; i += 1) dropPickup(world, enemy.x, enemy.y, 'shard');
    if (world.rng() < PICKUPS.heartChance) dropPickup(world, enemy.x, enemy.y, 'heart');
  }
}

function damagePlayer(world, amount, fromX, fromY) {
  const p = world.player;
  if (!p.alive || p.invuln > 0) return;
  p.hp -= amount;
  p.invuln = PLAYER.invuln;
  world.shake = Math.max(world.shake, 9);
  world.flash = 0.25;
  burst(world, p.x, p.y, '#ff5c5c', 12, 220);
  sfx.hurt(world.audioRef);
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    burst(world, p.x, p.y, COLORS.player, 50, 380, 1.0, 4);
    burst(world, p.x, p.y, COLORS.nova, 30, 300, 0.8, 3);
    world.shake = 16;
    sfx.over(world.audioRef);
  }
}

function fireNova(world) {
  const p = world.player;
  if (!p.alive || p.novaTimer > 0) return;
  p.novaTimer = p.novaCooldown;
  world.flash = 0.35;
  world.shake = Math.max(world.shake, 12);
  sfx.nova(world.audioRef);
  for (let i = world.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = world.enemyBullets[i];
    if (Math.hypot(b.x - p.x, b.y - p.y) < p.novaRadius + 10) world.enemyBullets.splice(i, 1);
  }
  for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
    const e = world.enemies[i];
    if (Math.hypot(e.x - p.x, e.y - p.y) < p.novaRadius + e.radius) {
      e.hp -= p.novaDamage;
      e.flash = 0.12;
      if (e.hp <= 0) killEnemy(world, e, true);
    }
  }
  burst(world, p.x, p.y, COLORS.nova, 40, 420, 0.7, 3);
}

function playerShoot(world) {
  const p = world.player;
  const n = p.multishot;
  for (let i = 0; i < n; i += 1) {
    const off = n === 1 ? 0 : (i - (n - 1) / 2) * p.spread;
    const a = p.angle + off;
    world.bullets.push({
      x: p.x + Math.cos(a) * (p.radius + 8),
      y: p.y + Math.sin(a) * (p.radius + 8),
      vx: Math.cos(a) * p.bulletSpeed,
      vy: Math.sin(a) * p.bulletSpeed,
      damage: p.damage,
      pierce: p.pierce,
      radius: PLAYER.bulletRadius,
      life: 1.1,
    });
  }
  sfx.shoot(world.audioRef);
}

export function applyUpgrade(world, id) {
  const p = world.player;
  if (id === 'damage') p.damage *= 1.25;
  else if (id === 'firerate') p.fireInterval *= 0.8;
  else if (id === 'multishot') p.multishot += 1;
  else if (id === 'speed') p.speed *= 1.15;
  else if (id === 'hull') {
    p.maxHp += 25;
    p.hp = Math.min(p.maxHp, p.hp + 25);
  } else if (id === 'magnet') p.magnet *= 1.6;
  else if (id === 'nova') {
    p.novaCooldown *= 0.75;
    p.novaDamage += 30;
  } else if (id === 'pierce') p.pierce += 1;
  world.upgradesTaken.push(id);
  sfx.upgrade(world.audioRef);
}

function drawUpgrades(world) {
  // Each upgrade stacks at most 3 times (hull is repeatable); a full pool is topped
  // back up from the rest so the player always sees three cards.
  const counts = {};
  for (const id of world.upgradesTaken) counts[id] = (counts[id] || 0) + 1;
  const pool = UPGRADES.filter((u) => {
    if (u.id === 'hull') return true;
    if (u.id === 'multishot') return world.player.multishot < 4;
    return (counts[u.id] || 0) < 3;
  });
  let choices = shuffle(world.rng, pool).slice(0, 3);
  if (choices.length < 3) {
    const rest = UPGRADES.filter((u) => !choices.includes(u));
    choices = choices.concat(shuffle(world.rng, rest).slice(0, 3 - choices.length));
  }
  world.upgradeChoices = choices;
  world.screen = SCREEN_UPGRADE;
}

function enemiesLeft(world) {
  return world.enemies.length + world.spawnQueue.length;
}

// One fixed step. Returns an event bitmask. `input` is the live input object;
// the autopilot in shots.js drives the same object, so staging plays by the real rules.
export function step(world, dt, input, audio) {
  world.audioRef = audio;
  world.time += dt;
  if (world.screen !== SCREEN_PLAY) return EVENT_NONE;
  world.playTime += dt;
  const p = world.player;

  if (p.invuln > 0) p.invuln -= dt;
  if (p.novaTimer > 0) p.novaTimer -= dt;
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (world.combo.timer > 0) {
    world.combo.timer -= dt;
    if (world.combo.timer <= 0) {
      world.combo.count = 0;
      world.combo.mult = 1;
    }
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt);

  // --- player movement + aim ---
  if (p.alive) {
    const mv = moveVector(input);
    if (mv) {
      p.x += mv.x * p.speed * dt;
      p.y += mv.y * p.speed * dt;
      p.x = Math.max(p.radius + 6, Math.min(VIEW.width - p.radius - 6, p.x));
      p.y = Math.max(p.radius + 6, Math.min(VIEW.height - p.radius - 6, p.y));
    }
    p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
    if (input.fire && p.fireTimer <= 0) {
      playerShoot(world);
      p.fireTimer = p.fireInterval;
    }
    if (input.pressedKeys && input.pressedKeys.has('Space')) {
      input.pressedKeys.delete('Space');
      fireNova(world);
    }
  }

  // --- spawning ---
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const interval = Math.max(WAVE.spawnIntervalMin, WAVE.spawnInterval - world.wave * 0.03);
      world.spawnTimer = interval;
      const type = world.spawnQueue.shift();
      if (type === 'boss') spawnEnemy(world, 'boss', VIEW.width / 2, 60);
      else spawnEnemy(world, type);
    }
  }

  // --- enemies ---
  for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
    const e = world.enemies[i];
    if (e.flash > 0) e.flash -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    if (e.type === 'shooter') {
      // Keep a firing distance, strafe slowly, shoot at the player.
      const want = 280;
      const radial = dist > want + 40 ? 1 : dist < want - 40 ? -1 : 0;
      const strafe = Math.sin(world.time * 0.9 + e.id) * 0.6;
      e.x += (nx * radial + -ny * strafe) * e.speed * dt;
      e.y += (ny * radial + nx * strafe) * e.speed * dt;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && p.alive && dist < 560) {
        e.shootTimer = range(world.rng, 1.6, 2.2);
        world.enemyBullets.push({
          x: e.x,
          y: e.y,
          vx: nx * 260,
          vy: ny * 260,
          damage: e.damage,
          radius: 6,
          life: 4,
        });
        burst(world, e.x, e.y, e.color, 3, 60, 0.3, 2);
      }
    } else if (e.type === 'boss') {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
      e.burstTimer -= dt;
      if (e.burstTimer <= 0) {
        e.burstTimer = 3.5;
        for (let k = 0; k < 16; k += 1) {
          const a = (k / 16) * Math.PI * 2 + world.time;
          world.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, damage: 12, radius: 6, life: 5 });
        }
        sfx.shoot(audio);
      }
      e.spawnTimer -= dt;
      if (e.spawnTimer <= 0) {
        e.spawnTimer = 6;
        if (world.enemies.length < 24) {
          spawnEnemy(world, 'chaser', e.x - 40, e.y);
          spawnEnemy(world, 'chaser', e.x + 40, e.y);
        }
      }
    } else {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
    }
    e.x = Math.max(e.radius, Math.min(VIEW.width - e.radius, e.x));
    e.y = Math.max(e.radius, Math.min(VIEW.height - e.radius, e.y));
    e.angle = Math.atan2(dy, dx);
    // Contact damage.
    if (p.alive && dist < e.radius + p.radius - 2) {
      damagePlayer(world, e.damage, e.x, e.y);
      // The enemy bounces off a little so one touch is not a chain of hits.
      e.x -= nx * 18;
      e.y -= ny * 18;
    }
  }

  // Gentle separation so enemies do not stack on one pixel.
  for (let i = 0; i < world.enemies.length; i += 1) {
    for (let j = i + 1; j < world.enemies.length; j += 1) {
      const a = world.enemies[i];
      const b = world.enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = (a.radius + b.radius) * 0.8;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }

  // --- player bullets ---
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20;
    if (!dead) {
      for (let j = world.enemies.length - 1; j >= 0; j -= 1) {
        const e = world.enemies[j];
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
          e.hp -= b.damage;
          e.flash = 0.09;
          burst(world, b.x, b.y, e.color, 4, 140, 0.3, 2);
          sfx.hit(audio);
          if (e.hp <= 0) killEnemy(world, e, true);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            dead = true;
          }
          break;
        }
      }
    }
    if (dead) world.bullets.splice(i, 1);
  }

  // --- enemy bullets ---
  for (let i = world.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = world.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20;
    if (!dead && p.alive && Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius - 2) {
      damagePlayer(world, b.damage, b.x, b.y);
      dead = true;
    }
    if (dead) world.enemyBullets.splice(i, 1);
  }

  // --- pickups: drift, magnet, collect ---
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const k = world.pickups[i];
    k.life -= dt;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    k.vx *= 1 - 2 * dt;
    k.vy *= 1 - 2 * dt;
    const d = Math.hypot(p.x - k.x, p.y - k.y);
    if (p.alive && d < p.magnet) {
      const pull = PICKUPS.magnetPull * dt;
      k.x += ((p.x - k.x) / (d || 1)) * pull;
      k.y += ((p.y - k.y) / (d || 1)) * pull;
    }
    let gone = k.life <= 0;
    if (p.alive && d < p.radius + 12) {
      if (k.kind === 'shard') {
        world.shards += 1;
        world.score += 5;
        sfx.shard(audio);
      } else {
        p.hp = Math.min(p.maxHp, p.hp + PICKUPS.heartHeal);
        addText(world, p.x, p.y - 22, `+${PICKUPS.heartHeal} HP`, COLORS.heart, 16);
        sfx.upgrade(audio);
      }
      burst(world, k.x, k.y, k.kind === 'shard' ? COLORS.shard : COLORS.heart, 5, 90, 0.35, 2);
      gone = true;
    }
    if (gone) world.pickups.splice(i, 1);
  }

  // --- particles + floating texts ---
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const pt = world.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 1 - 2.4 * dt;
    pt.vy *= 1 - 2.4 * dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.texts.length - 1; i >= 0; i -= 1) {
    const t = world.texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) world.texts.splice(i, 1);
  }

  // --- wave clear / win / loss ---
  if (!p.alive) {
    world.screen = SCREEN_OVER;
    if (world.score > world.best) world.best = world.score;
    return EVENT_OVER;
  }
  if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
    world.score += 100 * world.wave;
    if (world.wave >= TOTAL_WAVES) {
      world.screen = SCREEN_WIN;
      if (world.score > world.best) world.best = world.score;
      sfx.win(audio);
      return EVENT_WIN;
    }
    drawUpgrades(world);
    return EVENT_WAVE_CLEAR;
  }
  return EVENT_NONE;
}

// The next wave starts once the player picked an upgrade.
export function nextWave(world) {
  if (world.screen !== SCREEN_UPGRADE) return;
  world.screen = SCREEN_PLAY;
  world.upgradeChoices = [];
  beginWave(world, world.wave + 1);
}

export function waveProgress(world) {
  return { left: enemiesLeft(world), wave: world.wave, total: TOTAL_WAVES };
}
