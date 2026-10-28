/* ==========================================================================
   Oslo Run: the game state.
   Pure logic with no drawing and no DOM: the runner and her states, the
   endless course, collisions, distance and score. What comes next on the
   course is decided by the spawn director.
   ========================================================================== */

import { createDirector, fillAhead, type Director } from "./director";
import {
  COFFEE,
  DUCK_H,
  GRAVITY,
  JUMP_SPEED,
  MAX_LIVES,
  METER,
  PLAYER_H,
  PLAYER_W,
  speedAt,
  type Coffee,
  type Hazard,
} from "./rules";

/** A press this long before landing still jumps on landing. */
const JUMP_BUFFER = 0.12;
const INVULNERABLE_TIME = 1.2;
const HIT_TIME = 0.35;
const MAX_PARTICLES = 160;
/** How far ahead of the screen's right edge the course is laid out. */
const LOOKAHEAD = 600;

export type Tone = "coral" | "paper" | "ink" | "dust" | "gold";

export type Particle = {
  kind: "dot" | "ring" | "spark";
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  max: number;
  size: number;
  tone: Tone;
};

export type FloatText = { x: number; y: number; text: string; life: number; max: number };

export type Phase = "ready" | "running" | "dying" | "done";

export type PlayerState = "running" | "jumping" | "falling" | "landing" | "ducking" | "hit" | "gameOver";

export type World = {
  course: { hazards: Hazard[]; coffees: Coffee[] };
  director: Director;
  /** Where the runner stands on screen, from the left edge. Set from the view. */
  playerX: number;
  /** Width of the visible world, so the course is laid out ahead of it. */
  viewWidth: number;
  phase: Phase;
  phaseTime: number;
  time: number;
  distance: number;
  speed: number;
  /** Advances with the distance run; drives the run cycle. */
  stride: number;
  y: number;
  vy: number;
  grounded: boolean;
  duckHeld: boolean;
  ducking: boolean;
  jumpBuffer: number;
  landTimer: number;
  hitTimer: number;
  invulnerable: number;
  lives: number;
  coffee: number;
  score: number;
  dustTimer: number;
  particles: Particle[];
  texts: FloatText[];
};

export function createWorld(playerX: number, viewWidth: number, seed: number): World {
  return {
    course: { hazards: [], coffees: [] },
    // The first pattern starts a couple of seconds in.
    director: createDirector(seed, playerX + 900),
    playerX,
    viewWidth,
    phase: "ready",
    phaseTime: 0,
    time: 0,
    distance: 0,
    speed: speedAt(0),
    stride: 0,
    y: 0,
    vy: 0,
    grounded: true,
    duckHeld: false,
    ducking: false,
    jumpBuffer: 0,
    landTimer: 0,
    hitTimer: 0,
    invulnerable: 0,
    lives: MAX_LIVES,
    coffee: 0,
    score: 0,
    dustTimer: 0,
    particles: [],
    texts: [],
  };
}

export const metersOf = (w: World) => Math.floor(w.distance / METER);

/** What the runner is doing right now. */
export function playerState(w: World): PlayerState {
  if (w.phase === "dying" || w.phase === "done") return "gameOver";
  if (w.hitTimer > 0) return "hit";
  if (!w.grounded) return w.vy > 0 ? "jumping" : "falling";
  if (w.ducking) return "ducking";
  if (w.landTimer > 0) return "landing";
  return "running";
}

/** A jump only happens from the ground, and not while ducking. */
export function requestJump(w: World) {
  if (w.phase === "running" && !w.duckHeld) w.jumpBuffer = JUMP_BUFFER;
}

/** Ducking only starts on the ground; held in the air, it starts on landing. */
export function setDuck(w: World, held: boolean) {
  w.duckHeld = held;
  if (held) w.jumpBuffer = 0;
}

/** Advances the world by `dt` seconds. Called at a fixed rate. */
export function step(w: World, dt: number) {
  w.time += dt;
  updateParticles(w, dt);
  if (w.phase !== "running" && w.phase !== "dying") return;
  w.phaseTime += dt;

  if (w.phase === "dying") {
    // Everything stops where it is; only the fall plays out.
    if (!w.grounded) fall(w, dt);
    if (w.phaseTime > 1.1) w.phase = "done";
    return;
  }

  w.speed = speedAt(w.distance / METER);
  const dx = w.speed * dt;
  w.distance += dx;
  w.stride += dx;

  w.ducking = w.duckHeld && w.grounded;
  w.jumpBuffer = Math.max(0, w.jumpBuffer - dt);
  if (w.jumpBuffer > 0 && w.grounded && !w.ducking) {
    w.vy = JUMP_SPEED;
    w.grounded = false;
    w.jumpBuffer = 0;
    puff(w, w.distance + w.playerX, 3, 1);
  }
  if (!w.grounded) fall(w, dt);

  w.landTimer = Math.max(0, w.landTimer - dt);
  w.hitTimer = Math.max(0, w.hitTimer - dt);
  w.invulnerable = Math.max(0, w.invulnerable - dt);

  fillAhead(w.director, w.course, w.distance + w.viewWidth + LOOKAHEAD);
  checkCourse(w);
  prune(w);

  w.dustTimer -= dt;
  if (w.grounded && w.dustTimer <= 0) {
    // A slide throws up more dust than running does.
    w.dustTimer = w.ducking ? 0.06 : 0.16;
    puff(w, w.distance + w.playerX - 4, 1, w.ducking ? 1.2 : 0.5);
  }

  w.score = Math.floor(w.distance / METER) * 2 + w.coffee * 50;
}

function fall(w: World, dt: number) {
  w.vy -= GRAVITY * dt;
  w.y += w.vy * dt;
  if (w.y > 0) return;
  w.y = 0;
  w.vy = 0;
  w.grounded = true;
  w.landTimer = 0.12;
  if (w.phase === "running") puff(w, w.distance + w.playerX + 6, 4, 1.2);
}

function checkCourse(w: World) {
  const px = w.distance + w.playerX;
  const left = px - PLAYER_W / 2;
  const right = px + PLAYER_W / 2;
  const bottom = w.y;
  // The hitbox is half as tall while ducking; that is what lets her under.
  const top = w.y + (w.ducking ? DUCK_H : PLAYER_H);

  for (const h of w.course.hazards) {
    if (h.x > right + 10) break;
    if (h.hit) continue;
    // A little forgiveness on every side, so near misses feel fair.
    const across = right > h.x + 4 && left < h.x + h.w - 4;
    const overlaps = h.high ? across && top > h.h + 2 : across && bottom < h.h - 4;
    if (overlaps) {
      h.hit = true;
      hurt(w, h);
      if (w.phase !== "running") return;
    }
  }

  for (const c of w.course.coffees) {
    if (c.x > right + 20) break;
    if (c.taken) continue;
    const overlaps =
      right > c.x - 5 && left < c.x + COFFEE.w + 5 && top > c.lift - 5 && bottom < c.lift + COFFEE.h + 5;
    if (overlaps) collect(w, c);
  }
}

/** Drops what is well behind the runner, so the lists stay short forever. */
function prune(w: World) {
  const behind = w.distance - 200;
  const { hazards, coffees } = w.course;
  while (hazards.length && hazards[0].x + hazards[0].w < behind) hazards.shift();
  while (coffees.length && coffees[0].x + COFFEE.w < behind) coffees.shift();
}

function hurt(w: World, h: Hazard) {
  // One collision costs one heart, and a short grace period follows.
  if (w.invulnerable > 0) return;
  w.lives -= 1;
  w.invulnerable = INVULNERABLE_TIME;
  w.hitTimer = HIT_TIME;
  const y = h.high ? h.h + 20 : h.h * 0.7;
  for (let i = 0; i < 6; i++) {
    spawn(w, {
      kind: "spark",
      x: h.x + h.w / 2,
      y,
      vx: (Math.random() - 0.5) * 200,
      vy: 70 + Math.random() * 150,
      gravity: 450,
      life: 0.5,
      max: 0.5,
      size: 4,
      tone: "coral",
    });
  }

  if (w.lives <= 0) {
    w.phase = "dying";
    w.phaseTime = 0;
    w.ducking = false;
    w.speed = 0;
  }
}

function collect(w: World, c: Coffee) {
  c.taken = true;
  w.coffee += 1;
  const cx = c.x + COFFEE.w / 2;
  const cy = c.lift + COFFEE.h / 2;

  spawn(w, { kind: "ring", x: cx, y: cy, vx: 0, vy: 0, gravity: 0, life: 0.45, max: 0.45, size: 30, tone: "gold" });
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    spawn(w, {
      kind: "dot",
      x: cx,
      y: cy,
      vx: Math.cos(angle) * 130,
      vy: Math.sin(angle) * 130 + 50,
      gravity: 260,
      life: 0.5,
      max: 0.5,
      size: 2.6,
      tone: i % 2 ? "paper" : "gold",
    });
  }
  w.texts.push({ x: cx, y: cy + 24, text: "+50", life: 0.9, max: 0.9 });
}

function puff(w: World, x: number, count: number, strength: number) {
  for (let i = 0; i < count; i++) {
    spawn(w, {
      kind: "dot",
      x: x + (Math.random() - 0.5) * 8,
      y: 1,
      vx: -20 - Math.random() * 50 * strength,
      vy: 10 + Math.random() * 30 * strength,
      gravity: 40,
      life: 0.35 + Math.random() * 0.25,
      max: 0.6,
      size: 2 + Math.random() * 2 * strength,
      tone: "dust",
    });
  }
}

function spawn(w: World, particle: Particle) {
  // A fixed ceiling keeps a long run from slowing a phone down.
  if (w.particles.length >= MAX_PARTICLES) w.particles.shift();
  w.particles.push(particle);
}

function updateParticles(w: World, dt: number) {
  if (w.phase === "ready") return;
  for (const p of w.particles) {
    p.life -= dt;
    p.vy -= p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Nothing falls through the street.
    if (p.y < 0) p.y = 0;
  }
  w.particles = w.particles.filter((p) => p.life > 0);

  for (const t of w.texts) {
    t.life -= dt;
    t.y += 36 * dt;
  }
  w.texts = w.texts.filter((t) => t.life > 0);
}
