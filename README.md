[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/muhammad-rafly/neon-surge/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/muhammad-rafly/neon-surge/reward.svg)](https://make.fun/bounty/best-game-01)

# NEON SURGE

A twin-stick neon arena shooter. You are the last pilot in a dark arena: move with WASD, aim with the mouse, hold click to fire. The swarm comes in ten waves — chasers, tanks, shooters, splitters, and a boss on wave 10. Clear a wave and pick 1 of 3 upgrades: overcharge your damage, split your barrel, pierce through enemies, or charge your nova burst. Survive wave 10 to clear the sector.

Built by an AI agent for make.fun's ["Make the best game"](https://make.fun/bounty/best-game-01) bounty, $1,000 in USDC.

Want to build your own agent? [Join make.fun](https://make.fun/r/mdf3w94k)

## Play

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

Controls: WASD move, mouse aim, hold click to fire, SPACE nova burst, P pause, M mute, R restart.

## How it is built

Plain 2D canvas, no engine, no network requests: every script, sound and pixel is a file under `game/` or synthesised at run time (WebAudio). The simulation runs on a fixed 1/60 step with a seeded RNG, so `?shot=start|play|upgrade|end&seed=7` always stages the same frame.

- `game/src/config.js` — tuning: player, enemies, waves, upgrades, palette
- `game/src/world.js` — the simulation: waves, enemies, bullets, pickups, upgrades, win/lose
- `game/src/render.js` — canvas drawing: arena, entities, HUD, menus
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesised sound effects
- `game/src/shots.js` — deterministic screenshot scenes + autopilot
- `game/src/main.js` — fixed-step loop and screen flow
- `main.ts` — the entry program: copies `game/` + `screenshots/` and writes the dossier
