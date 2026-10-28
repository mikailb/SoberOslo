/* ==========================================================================
   Oslo Run: shared rules and sizes.
   Distances are world units; on a desktop screen one unit is one CSS pixel.
   Heights are measured upwards from the street, so `y = 0` is the ground.
   ========================================================================== */

/** The runner's hitbox: a little narrower and shorter than the drawing. */
export const PLAYER_W = 28;
export const PLAYER_H = 62;
/** Hitbox height while ducking: half of standing, as in most runners. */
export const DUCK_H = 30;

export const GRAVITY = 2700;
export const JUMP_SPEED = 790;
/** Seconds from take-off to landing. Every gap in the course is built from it. */
export const AIR_TIME = (2 * JUMP_SPEED) / GRAVITY;
/** Highest point of a jump, in units above the ground. */
export const APEX = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);

export const MAX_LIVES = 1;
/** World units per metre on the distance counter. */
export const METER = 40;

export const BASE_SPEED = 500;
export const MAX_SPEED = 960;
/** How quickly the pace approaches its top speed, in metres. */
const SPEED_CURVE = 550;

/**
 * Pace at a given distance. It rises smoothly and keeps rising more slowly,
 * so there is never a sudden jump in speed, and it never passes the top.
 */
export function speedAt(meters: number) {
  return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (1 - Math.exp(-Math.max(0, meters) / SPEED_CURVE));
}

/**
 * The pieces drawn from image files, described by their file: its size, the
 * visible part of it in image pixels (left, top, right, bottom) and the scale
 * it is drawn at. Hitboxes are worked out from the visible part, so what you
 * see is what you hit.
 */
export const ARTWORK = {
  bin: { file: "trash-bin.png", w: 100, h: 120, box: [19, 13, 79, 106], scale: 0.65 },
  bench: { file: "bench.png", w: 200, h: 100, box: [19, 11, 183, 88], scale: 0.55 },
  scooter: { file: "scooter.png", w: 120, h: 100, box: [18, 10, 104, 88], scale: 0.75 },
  // The pickup is the Sober Oslo logo. The file is 6250 px square, so it is
  // shrunk to 200 px once as it loads; these numbers are for that copy.
  coffee: { file: "SoberOslo Logo.png", w: 200, h: 200, box: [35, 53, 157, 147], scale: 0.43 },
  gull: { file: "seagull.png", w: 120, h: 100, box: [24, 11, 97, 88], scale: 0.42 },
} as const;

/** Visible width and height of a piece of artwork, in world units. */
export function sizeOf(kind: keyof typeof ARTWORK) {
  const { box, scale } = ARTWORK[kind];
  return { w: (box[2] - box[0]) * scale, h: (box[3] - box[1]) * scale };
}

export const COFFEE = sizeOf("coffee");

/**
 * The high obstacle: a banner hanging down from above. Its lower edge is
 * between the ducking and the standing runner, and it reaches far above the
 * top of a jump, so the only way past is underneath.
 */
export const BANNER = { w: 86, h: 58, clearance: 44 };

export type LowKind = "bin" | "scooter" | "bench";
export type HazardKind = LowKind | "banner";

export type Hazard = {
  kind: HazardKind;
  /** High obstacles are ducked under; low ones are jumped over. */
  high: boolean;
  x: number;
  w: number;
  /** Low: height above the ground. High: height of the gap underneath. */
  h: number;
  hit: boolean;
  /** Text on a banner. */
  label?: string;
};

export type Coffee = { x: number; lift: number; taken: boolean; seed: number };

export function lowHazard(kind: LowKind, x: number): Hazard {
  const { w, h } = sizeOf(kind);
  return { kind, high: false, x, w, h, hit: false };
}

export function highHazard(x: number, label: string): Hazard {
  return { kind: "banner", high: true, x, w: BANNER.w, h: BANNER.clearance, hit: false, label };
}
