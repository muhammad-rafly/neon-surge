// NEON SURGE — configuration. Every number the sim uses lives here so tuning is one edit.
// All colours are neon-on-dark: the arena is deep indigo, everything that matters glows.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const TOTAL_WAVES = 10;

export const COLORS = {
  bg0: '#070512',
  bg1: '#0d0a24',
  grid: 'rgba(124, 92, 255, 0.13)',
  ring: 'rgba(124, 92, 255, 0.26)',
  player: '#ffe066',
  playerCore: '#ffffff',
  bullet: '#8ef6ff',
  bulletCore: '#ffffff',
  enemyBullet: '#ff5c5c',
  shard: '#ffd166',
  heart: '#ff5c8a',
  nova: '#7df9ff',
  chaser: '#ff2d95',
  tank: '#ff7a18',
  shooter: '#b967ff',
  splitter: '#39ff88',
  mini: '#7dffb0',
  boss: '#ff3355',
  text: '#e8ecff',
  dim: '#8b93b8',
  gold: '#ffd166',
  cyan: '#22d3ee',
};

export const PLAYER = {
  radius: 14,
  speed: 270,
  maxHp: 100,
  fireInterval: 0.18,
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 5,
  multishot: 1,
  spread: 0.14,
  magnet: 95,
  novaCooldown: 12,
  novaDamage: 70,
  novaRadius: 230,
  invuln: 0.7,
};

export const ENEMIES = {
  chaser: { hp: 18, speed: 185, radius: 13, damage: 10, score: 10, color: COLORS.chaser, cost: 1 },
  tank: { hp: 95, speed: 66, radius: 23, damage: 16, score: 30, color: COLORS.tank, cost: 3 },
  shooter: { hp: 26, speed: 100, radius: 14, damage: 10, score: 20, color: COLORS.shooter, cost: 2 },
  splitter: { hp: 32, speed: 122, radius: 16, damage: 10, score: 15, color: COLORS.splitter, cost: 2 },
  mini: { hp: 9, speed: 215, radius: 8, damage: 6, score: 5, color: COLORS.mini, cost: 0 },
  boss: { hp: 1100, speed: 50, radius: 44, damage: 25, score: 500, color: COLORS.boss, cost: 20 },
};

// How a wave is built from a point budget. Chasers are cheap, tanks are dear.
export const WAVE = {
  baseBudget: 8,
  budgetPerWave: 5,
  spawnInterval: 0.5,
  spawnIntervalMin: 0.18,
  hpScale: 0.12,
  speedScale: 0.03,
  speedCap: 1.3,
};

export const PICKUPS = {
  shardValue: 1,
  heartHeal: 20,
  heartChance: 0.04,
  magnetPull: 420,
};

export const COMBO = { window: 2.5, maxMult: 5 };

// Upgrade pool: three are drawn after every cleared wave. Each one changes the run.
export const UPGRADES = [
  { id: 'damage', name: 'OVERCHARGE', desc: '+25% bullet damage', icon: 'DMG' },
  { id: 'firerate', name: 'RAPID CYCLER', desc: '+20% fire rate', icon: 'RPM' },
  { id: 'multishot', name: 'SPLIT BARREL', desc: '+1 bullet per shot', icon: 'x2' },
  { id: 'speed', name: 'ION THRUSTERS', desc: '+15% move speed', icon: 'SPD' },
  { id: 'hull', name: 'REINFORCED HULL', desc: '+25 max HP and heal 25', icon: 'HP' },
  { id: 'magnet', name: 'TRACTOR FIELD', desc: '+60% pickup magnet', icon: 'MAG' },
  { id: 'nova', name: 'NOVA CORE', desc: '+30 nova damage, faster recharge', icon: 'NOVA' },
  { id: 'pierce', name: 'PIERCING ROUNDS', desc: 'Bullets pierce +1 enemy', icon: 'PIERCE' },
];
