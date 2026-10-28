/* ==========================================================================
   Oslo Run: the spawn director.
   Decides what comes next and where: which difficulty phase the run is in,
   which pattern to lay out, how much coffee, and how far apart things are.
   All the randomness in the course lives here, drawn from one seeded
   generator per run, so every run is different but each one is consistent.

   The structure follows the RunDirector in hermes-godspeed (MIT): weighted
   patterns per phase, a short warm-up without obstacles, and paired jump and
   slide obstacles. The spacing rules are Oslo Run's own: every gap is worked
   out from the jump and the pace at that point, plus a reaction time that
   shrinks phase by phase, so a pattern is never impossible.
   ========================================================================== */

import {
  AIR_TIME,
  APEX,
  BANNER,
  COFFEE,
  highHazard,
  lowHazard,
  METER,
  PLAYER_W,
  speedAt,
  type Coffee,
  type Hazard,
  type LowKind,
} from "./rules";

type PatternId =
  | "cupLine"
  | "cupArc"
  | "hop"
  | "hopArc"
  | "duck"
  | "lowPair"
  | "closePair"
  | "jumpDuck"
  | "duckJump"
  | "duckCupJump"
  | "highPair"
  | "triple";

export type DifficultyPhase = {
  name: string;
  /** Distance in metres where the phase begins. */
  from: number;
  /** Seconds the player gets to react between two obstacles. */
  reaction: number;
  /** Breathing room between patterns, in seconds at the current pace. */
  gap: [number, number];
  lowKinds: LowKind[];
  weights: Partial<Record<PatternId, number>>;
};

export const PHASES: DifficultyPhase[] = [
  {
    name: "Rolig start",
    from: 0,
    reaction: 0.45,
    gap: [1.2, 1.8],
    // Mostly bins at first: the easiest thing to clear.
    lowKinds: ["bin", "bin", "scooter"],
    weights: { cupLine: 30, cupArc: 18, hop: 32, hopArc: 20 },
  },
  {
    name: "Litt vanskeligere",
    from: 120,
    reaction: 0.36,
    gap: [1.0, 1.5],
    lowKinds: ["bin", "scooter", "bench"],
    weights: { cupLine: 14, cupArc: 8, hop: 18, hopArc: 12, duck: 22, lowPair: 14, highPair: 6 },
  },
  {
    name: "Variasjon",
    from: 350,
    reaction: 0.3,
    gap: [0.85, 1.3],
    lowKinds: ["bin", "scooter", "bench"],
    weights: {
      cupLine: 7,
      cupArc: 5,
      hop: 12,
      hopArc: 8,
      duck: 12,
      lowPair: 12,
      closePair: 10,
      jumpDuck: 12,
      duckJump: 12,
      duckCupJump: 8,
      highPair: 6,
    },
  },
  {
    name: "Vanskelig",
    from: 700,
    reaction: 0.25,
    gap: [0.75, 1.15],
    lowKinds: ["bin", "scooter", "bench"],
    weights: {
      cupLine: 4,
      cupArc: 3,
      hop: 8,
      hopArc: 6,
      duck: 9,
      lowPair: 12,
      closePair: 12,
      jumpDuck: 14,
      duckJump: 14,
      duckCupJump: 10,
      highPair: 8,
      triple: 12,
    },
  },
];

export function phaseAt(meters: number) {
  let phase = PHASES[0];
  for (const candidate of PHASES) if (meters >= candidate.from) phase = candidate;
  return phase;
}

/** The last obstacle placed, which the next one has to leave room after. */
type Placed = { high: boolean; left: number; right: number };

export type Director = {
  rng: () => number;
  /** Earliest x for the next item. */
  cursor: number;
  last: Placed | null;
  highCount: number;
  /** Every pattern laid out so far, for testing variety. */
  log: PatternId[];
};

/** A small, fast seeded generator (mulberry32). */
function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDirector(seed: number, start: number): Director {
  return { rng: seeded(seed), cursor: start, last: null, highCount: 0, log: [] };
}

type Course = { hazards: Hazard[]; coffees: Coffee[] };

/** Lays out patterns until the course reaches `until`. */
export function fillAhead(director: Director, course: Course, until: number) {
  if (director.cursor >= until) return;
  while (director.cursor < until) layPattern(director, course);
  // A coffee arc can start a little before the obstacle it belongs to, so
  // keep both lists in order along the street.
  course.hazards.sort((a, b) => a.x - b.x);
  course.coffees.sort((a, b) => a.x - b.x);
}

function layPattern(d: Director, course: Course) {
  const rng = d.rng;
  const meters = d.cursor / METER;
  const phase = phaseAt(meters);
  const pace = () => speedAt(d.cursor / METER);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rng() * list.length)];

  // The very first pattern is only coffee, so the run starts gently.
  const id: PatternId = d.log.length === 0 ? "cupLine" : weighted(rng, phase.weights);
  d.log.push(id);

  /** Earliest fair left edge for the next obstacle, given the one before. */
  const fairLeft = (high: boolean, width: number) => {
    const last = d.last;
    if (!last) return d.cursor;
    const v = pace();
    const air = v * AIR_TIME;
    const react = v * phase.reaction;
    let left: number;
    if (!last.high) {
      // After a jump: land, react, then either take off again or duck.
      const landing = (last.left + last.right) / 2 + air / 2;
      left = high ? landing + react + PLAYER_W / 2 : landing + react + air / 2 - width / 2;
    } else {
      // After ducking: come back up, react, then jump; or keep ducking.
      left = high ? last.right + 30 : last.right + PLAYER_W / 2 + react + air / 2 - width / 2;
    }
    return Math.max(d.cursor, left, last.right + 20);
  };

  const low = (kind: LowKind = pick(phase.lowKinds), extra = 0) => {
    const probe = lowHazard(kind, 0);
    const hazard = lowHazard(kind, fairLeft(false, probe.w) + extra);
    course.hazards.push(hazard);
    d.last = { high: false, left: hazard.x, right: hazard.x + hazard.w };
    d.cursor = hazard.x + hazard.w;
    return hazard;
  };

  const high = (extra = 0) => {
    // The first banners say what to do; after that they carry the name.
    const label = d.highCount < 2 ? "DUKK ↓" : "SOBER OSLO";
    d.highCount++;
    const hazard = highHazard(fairLeft(true, BANNER.w) + extra, label);
    course.hazards.push(hazard);
    d.last = { high: true, left: hazard.x, right: hazard.x + hazard.w };
    d.cursor = hazard.x + hazard.w;
    return hazard;
  };

  const cup = (x: number, lift: number) => {
    course.coffees.push({ x, lift, taken: false, seed: rng() * 10 });
  };

  /** A row of pickups on the ground, collected just by running. */
  const cupLine = (count: number, at = d.cursor + 40) => {
    const spacing = COFFEE.w + 10;
    for (let i = 0; i < count; i++) cup(at + i * spacing, 10);
    d.cursor = Math.max(d.cursor, at + count * spacing);
  };

  /** Three cups along the curve of a jump centred on `center`. */
  const cupArc = (center: number) => {
    const air = pace() * AIR_TIME;
    for (const s of [0.28, 0.5, 0.72]) {
      const height = APEX * 4 * s * (1 - s);
      cup(center + (s - 0.5) * air - COFFEE.w / 2, height + 12);
    }
  };

  /** A cup on the ground under a banner, for ducking. */
  const cupUnder = (banner: Hazard) => cup(banner.x + banner.w / 2 - COFFEE.w / 2, 6);

  switch (id) {
    case "cupLine":
      cupLine(3 + Math.floor(rng() * 3));
      break;
    case "cupArc": {
      const center = d.cursor + pace() * AIR_TIME * 0.6;
      cupArc(center);
      d.cursor = center + pace() * AIR_TIME * 0.5;
      break;
    }
    case "hop":
      low();
      break;
    case "hopArc": {
      const hazard = low();
      cupArc(hazard.x + hazard.w / 2);
      break;
    }
    case "duck": {
      const banner = high();
      if (rng() < 0.5) cupUnder(banner);
      break;
    }
    case "lowPair":
      low();
      if (rng() < 0.5) cupLine(1, d.cursor + 30);
      low();
      break;
    case "closePair": {
      // Two bins close enough to clear in one long jump.
      const first = low("bin");
      const second = lowHazard("bin", first.x + first.w + 12);
      course.hazards.push(second);
      d.last = { high: false, left: first.x, right: second.x + second.w };
      d.cursor = second.x + second.w;
      break;
    }
    case "jumpDuck":
      low();
      high();
      break;
    case "duckJump":
      high();
      low();
      break;
    case "duckCupJump": {
      high();
      cupLine(2, d.cursor + 30);
      low();
      break;
    }
    case "highPair": {
      const first = high();
      cupUnder(first);
      const second = high(10);
      cupUnder(second);
      break;
    }
    case "triple":
      low();
      high();
      low();
      break;
  }

  // Breathing room before the next pattern.
  const [min, max] = phase.gap;
  d.cursor += pace() * (min + rng() * (max - min));
}

function weighted(rng: () => number, weights: Partial<Record<PatternId, number>>): PatternId {
  const entries = Object.entries(weights) as [PatternId, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return entries[0][0];
}
