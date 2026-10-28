/* ==========================================================================
   Oslo Run: the drawing.
   Everything visible in the game world comes from the artwork files in
   /public/images/oslo-run, except the runner, who is drawn here so she can
   really run, and the hanging banners, which have no file of their own. The
   ground stands still; the scenery behind it slides past at different
   speeds, and the gameplay pieces come in from the right. Dust, sparkle and
   a pop for each coffee are drawn on top.
   ========================================================================== */

import { playerState, type Particle, type Tone, type World } from "./engine";
import { ARTWORK, BANNER, COFFEE, type Hazard } from "./rules";

const ASSET_DIR = "/images/oslo-run/";

const FILES = {
  sky: "bg-sky.png",
  skyline: "bg-skyline.png",
  fjord: "bg-fjord.png",
  promenade: "bg-promenade.png",
  bin: ARTWORK.bin.file,
  bench: ARTWORK.bench.file,
  scooter: ARTWORK.scooter.file,
  coffee: ARTWORK.coffee.file,
  gull: ARTWORK.gull.file,
} as const;

type Source = HTMLImageElement | HTMLCanvasElement;

export type Images = Record<keyof typeof FILES, Source>;

export async function loadImages(): Promise<Images> {
  const pairs = await Promise.all(
    Object.entries(FILES).map(
      ([key, file]) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => resolve([key, image]);
          image.onerror = () => reject(new Error(`Fant ikke ${file}`));
          image.src = ASSET_DIR + encodeURIComponent(file);
        }),
    ),
  );
  const images = Object.fromEntries(pairs) as Record<keyof typeof FILES, HTMLImageElement>;
  return {
    ...images,
    promenade: clearChecker(removeProps(images.promenade)),
    gull: fillHoles(images.gull),
    bin: sticker(images.bin),
    bench: sticker(images.bench),
    scooter: sticker(images.scooter),
    // The logo already has its own outline, so it only needs shrinking.
    coffee: shrink(images.coffee, ARTWORK.coffee.w),
  };
}

/* --------------------------------------------------------------------------
   Two repairs to the artwork, made in memory as it loads.
   The asset pack says its transparency was rebuilt from a checkerboard
   preview, and two files show it: the promenade still has the checkerboard
   between the railing bars, and the seagull lost most of its white body.
   A third change takes the benches, bin and gull out of the promenade
   picture, so they are not mistaken for the obstacles that come running.
   -------------------------------------------------------------------------- */

function pixels(image: Source) {
  const canvas = document.createElement("canvas");
  canvas.width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  canvas.height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  return { canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

/**
 * Covers the benches, bin and gull drawn into the promenade with a bare
 * stretch of the same railing and paving, taken from x 200–257 of the same
 * picture. Positions are in the file's own pixels.
 */
const PROPS = [
  [295, 328],
  [431, 552],
  [705, 759],
  [869, 959],
];
const BARE_RAILING = { x: 200, width: 57, top: 64, bottom: 120 };

function removeProps(image: HTMLImageElement): Source {
  const p = pixels(image);
  if (!p) return image;
  const { x, width, top, bottom } = BARE_RAILING;
  const height = bottom - top;
  for (const [from, to] of PROPS) {
    p.ctx.clearRect(from, top, to - from, height);
    for (let dx = from; dx < to; dx += width) {
      const w = Math.min(width, to - dx);
      p.ctx.drawImage(image, x, top, w, height, dx, top, w, height);
    }
  }
  return p.canvas;
}

/** Makes the light, colourless checkerboard between the railing bars see-through again. */
function clearChecker(image: Source): Source {
  const p = pixels(image);
  if (!p) return image;
  const { data, width } = p.data;
  for (let y = 78; y <= 109; y++) {
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      const low = Math.min(data[k], data[k + 1], data[k + 2]);
      const high = Math.max(data[k], data[k + 1], data[k + 2]);
      if (low < 180 || high - low > 16) continue;
      // Fully clear for the checker itself, softer at the anti-aliased edges.
      data[k + 3] = low >= 215 ? 0 : Math.round((data[k + 3] * (215 - low)) / 35);
    }
  }
  p.ctx.putImageData(p.data, 0, 0);
  return p.canvas;
}

/** Fills the holes inside the seagull's outline with its own white. */
function fillHoles(image: HTMLImageElement, radius = 4): Source {
  const p = pixels(image);
  if (!p) return image;
  const { data, width: w, height: h } = p.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = data[i * 4 + 3] > 60 ? 1 : 0;

  // Grows the set pixels of a mask outwards by `radius`.
  const dilate = (mask: Uint8Array) => {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
          }
        }
      }
    }
    return out;
  };

  // Close the outline, flood the outside from the edges, and whatever the
  // flood cannot reach is the inside of the bird.
  const closed = dilate(solid);
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop() as number;
    if (outside[i] || closed[i]) continue;
    outside[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  // Shrink back by the same amount: the outside grows into the closed ring.
  const outsideGrown = dilate(outside);

  // The bird's own lightest colour, to paint behind it.
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    if (data[k + 3] > 200 && data[k] > 200 && data[k + 1] > 200 && data[k + 2] > 200) {
      r += data[k];
      g += data[k + 1];
      b += data[k + 2];
      n++;
    }
  }
  const fill = n ? [r / n, g / n, b / n] : [246, 244, 240];

  const backing = p.ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    if (outsideGrown[i]) continue;
    backing.data[i * 4] = fill[0];
    backing.data[i * 4 + 1] = fill[1];
    backing.data[i * 4 + 2] = fill[2];
    backing.data[i * 4 + 3] = 255;
  }
  p.ctx.putImageData(backing, 0, 0);
  p.ctx.drawImage(image, 0, 0);
  return p.canvas;
}

/** A small copy of a very large image, so it is cheap to draw every frame. */
function shrink(image: HTMLImageElement, size: number): Source {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return image;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, size, size);
  return canvas;
}

/** Room around a gameplay piece for its outline, in the file's own pixels. */
const STICKER_PAD = 8;

/**
 * Gives a gameplay piece a light halo and a dark outline. Only the things
 * you jump or catch get one, so they stand apart from the scenery behind.
 */
function sticker(image: HTMLImageElement): Source {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w + STICKER_PAD * 2;
  canvas.height = h + STICKER_PAD * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return image;

  // The piece's own shape in one colour.
  const silhouette = (color: string) => {
    const shape = document.createElement("canvas");
    shape.width = w;
    shape.height = h;
    const shapeCtx = shape.getContext("2d");
    if (!shapeCtx) return shape;
    shapeCtx.drawImage(image, 0, 0);
    shapeCtx.globalCompositeOperation = "source-in";
    shapeCtx.fillStyle = color;
    shapeCtx.fillRect(0, 0, w, h);
    return shape;
  };
  // Stamping the shape in a ring around itself grows it evenly.
  const ring = (shape: HTMLCanvasElement, radii: number[]) => {
    for (const radius of radii) {
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        ctx.drawImage(
          shape,
          STICKER_PAD + Math.cos(angle) * radius,
          STICKER_PAD + Math.sin(angle) * radius,
        );
      }
    }
  };

  ring(silhouette("rgba(255, 251, 244, 0.85)"), [7, 5]);
  ring(silhouette("rgba(31, 26, 28, 0.92)"), [3.5, 2]);
  ctx.drawImage(image, STICKER_PAD, STICKER_PAD);
  return canvas;
}

export type Palette = {
  paper: string;
  coral: string;
  ink: string;
  brand: string;
  sans: string;
};

export function readPalette(element: HTMLElement): Palette {
  const styles = getComputedStyle(element);
  const token = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    paper: token("--color-paper", "#fffaf3"),
    coral: token("--color-coral", "#ff914d"),
    ink: token("--color-ink", "#231f20"),
    brand: token("--color-green", "#9c4a18"),
    sans: token("--font-inter", "system-ui, sans-serif"),
  };
}

export type View = {
  width: number;
  height: number;
  /** Device pixels per world unit. */
  pixelScale: number;
};

/* --------------------------------------------------------------------------
   The scene.
   Behind: sky, skyline, fjord and the promenade railing, each sliding left at
   its own pace as the runner goes. In front: one still, dark strip of ground
   along the bottom that never moves, so the ground under the runner's feet
   is steady. The gameplay pieces move across it.

   Measured from the files: the railing stands on row 108 of the promenade,
   the fjord is solid from row 52, and the skyline is see-through above its
   roofs. Each strip is tucked under the solid part of the one in front, so
   no gap shows. The moving strips repeat with every other copy mirrored, so
   edges always meet a matching edge.
   -------------------------------------------------------------------------- */

/** Parallax: how far each layer moves for every unit the runner runs. */
const PACE = { sky: 0.03, skyline: 0.1, fjord: 0.2, promenade: 0.35 };

/** The still ground along the bottom. */
const GROUND_HEIGHT = 35;
/** The runner's feet and every obstacle stand on this line, near the ground's top edge. */
const FEET_ABOVE_BOTTOM = 33;

const RAILING_ROW = 108;

/** The promenade row the gulls perch on: the top rail. */
const TOP_RAIL_ROW = 81;

const SKY = { w: 973, h: 123 };
const SKYLINE = { w: 998, h: 123 };
const FJORD = { w: 898, h: 119 };
const PROMENADE = { w: 1073, h: 120 };

/** The runner stands this far in from the left edge. */
export const PLAYER_SHARE = 0.18;

function layout(view: View) {
  const H = view.height;
  const k = H / 300;
  const groundTop = H - GROUND_HEIGHT;
  const ground = H - FEET_ABOVE_BOTTOM;

  // The railing's foot sits just behind the top edge of the pavement.
  const promenadeTop = groundTop + 2 - RAILING_ROW * k;
  const fjordTop = groundTop + 2 - FJORD.h * k;
  const skylineTop = fjordTop + 56 * k - SKYLINE.h * k;
  const skyHeight = fjordTop + 52 * k + 12;
  return { k, groundTop, ground, promenadeTop, fjordTop, skylineTop, skyHeight };
}

/** The still ground: a plain dark strip, painted once per window size. */
export function buildGround(view: View): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(view.width * view.pixelScale);
  canvas.height = Math.round(GROUND_HEIGHT * view.pixelScale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(view.pixelScale, 0, 0, view.pixelScale, 0, 0);

  ctx.fillStyle = "#1d1e21";
  ctx.fillRect(0, 0, view.width, GROUND_HEIGHT);
  // A soft top edge, like the lip of a quay.
  ctx.fillStyle = "#3a3c42";
  ctx.fillRect(0, 0, view.width, 2);
  ctx.fillStyle = "#121315";
  ctx.fillRect(0, 2, view.width, 1.5);
  // A faint grain, the same every time.
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < view.width * 0.6; i++) {
    ctx.fillStyle = next() < 0.5 ? "rgba(255, 255, 255, 0.045)" : "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(next() * view.width, 5 + next() * (GROUND_HEIGHT - 6), 1.5, 1.5);
  }
  return canvas;
}

/** Draws one frame: the moving backdrop, the still pavement, then the gameplay. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: World,
  view: View,
  images: Images,
  ground: HTMLCanvasElement,
  c: Palette,
) {
  const { width: W } = view;
  const d = w.distance;
  const t = w.time;
  const L = layout(view);
  const G = L.ground;
  const k = L.k;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Sky, 2. skyline, 3. fjord with its boats, 4. promenade railing.
  const skyW = (SKY.w * L.skyHeight) / SKY.h;
  strip(ctx, images.sky, d * PACE.sky, 0, skyW, L.skyHeight, W);
  strip(ctx, images.skyline, d * PACE.skyline, L.skylineTop, SKYLINE.w * k, SKYLINE.h * k, W);
  strip(ctx, images.fjord, d * PACE.fjord, L.fjordTop, FJORD.w * k, FJORD.h * k, W);
  strip(ctx, images.promenade, d * PACE.promenade, L.promenadeTop, PROMENADE.w * k, PROMENADE.h * k, W);

  // Gulls perched on the railing. They belong to the scenery and move with it.
  const railing = d * PACE.promenade;
  const perch = L.promenadeTop + TOP_RAIL_ROW * k;
  const gullGap = 640;
  for (let i = Math.floor((railing - 100) / gullGap); i < (railing + W + 100) / gullGap; i++) {
    if (((i * 7919) % 5 + 5) % 5 > 2) continue;
    const x = i * gullGap + (((i * 104729) % 300) + 300) % 300 - railing;
    piece(ctx, images.gull, ARTWORK.gull, x, perch);
  }

  // 5. The ground: always in the same place.
  ctx.drawImage(ground, 0, L.groundTop, W, GROUND_HEIGHT);

  // 6. Gameplay pieces, coming in from the right.
  const visible = (x: number, width: number) => x + width > -80 && x < W + 80;

  for (const h of w.course.hazards) {
    const x = h.x - d;
    if (!visible(x, h.w)) continue;
    if (h.kind === "banner") {
      drawBanner(ctx, h, x, G, c);
      continue;
    }
    shadow(ctx, x + h.w / 2, G, h.w * 0.5);
    piece(ctx, images[h.kind], ARTWORK[h.kind], x, G, STICKER_PAD);
  }

  for (const cup of w.course.coffees) {
    const x = cup.x - d;
    if (cup.taken || !visible(x, COFFEE.w)) continue;
    const bob = Math.sin(t * 3.4 + cup.seed) * 2.5;
    const cx = x + COFFEE.w / 2;
    const cy = G - cup.lift - COFFEE.h / 2 - bob;
    const pulse = 0.5 + 0.2 * Math.sin(t * 4 + cup.seed);
    const glow = ctx.createRadialGradient(cx, cy, 3, cx, cy, 34);
    glow.addColorStop(0, `rgba(255, 216, 130, ${pulse})`);
    glow.addColorStop(1, "rgba(255, 216, 130, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 34, cy - 34, 68, 68);
    piece(ctx, images.coffee, ARTWORK.coffee, x, G - cup.lift - bob);
  }

  // 7. The runner stays in place on screen; the world comes to meet them.
  shadow(ctx, w.playerX, G, 18 * Math.max(0.45, 1 - w.y / 160));
  const blink = w.invulnerable > 0 && w.phase === "running" && Math.floor(w.time * 14) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  drawRunner(ctx, w, G);
  ctx.globalAlpha = 1;

  drawParticles(ctx, w.particles, d, G, c);
  drawTexts(ctx, w, d, G, c);
}

/**
 * A background strip repeated across the window as it slides left. Every
 * other copy is mirrored, so the edges always meet a matching edge.
 */
function strip(
  ctx: CanvasRenderingContext2D,
  image: Source,
  offset: number,
  y: number,
  width: number,
  height: number,
  W: number,
) {
  const first = Math.floor(offset / width) - 1;
  for (let i = first; ; i++) {
    const x = i * width - offset;
    if (x > W + 20) break;
    if (x + width < -20) continue;
    if (((i % 2) + 2) % 2 === 0) {
      ctx.drawImage(image, x, y, width + 0.75, height);
    } else {
      ctx.save();
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -0.75, 0, width + 0.75, height);
      ctx.restore();
    }
  }
}

/**
 * Draws a piece of artwork with its visible part's left edge at `x` and its
 * bottom on `baseline`. `pad` is the extra border a sticker version has.
 */
function piece(
  ctx: CanvasRenderingContext2D,
  image: Source,
  art: { w: number; h: number; box: readonly number[]; scale: number },
  x: number,
  baseline: number,
  pad = 0,
) {
  const k = art.scale;
  ctx.drawImage(
    image,
    x - (art.box[0] + pad) * k,
    baseline - (art.box[3] + pad) * k,
    (art.w + pad * 2) * k,
    (art.h + pad * 2) * k,
  );
}

/**
 * The high obstacle: a banner hanging on two ropes from above, with its
 * lower edge just over a ducking runner's head. It gets the same light halo
 * and dark outline as the other gameplay pieces.
 */
function drawBanner(ctx: CanvasRenderingContext2D, h: Hazard, x: number, G: number, c: Palette) {
  const bottom = G - h.h;
  const top = bottom - BANNER.h;
  const w = h.w;

  ctx.lineCap = "round";
  for (const rx of [x + 14, x + w - 14]) {
    ctx.beginPath();
    ctx.moveTo(rx, top + 2);
    ctx.lineTo(rx, -10);
    ctx.strokeStyle = "rgba(255, 251, 244, 0.85)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = "#1f1a1c";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  roundRect(ctx, x, top, w, BANNER.h, 8);
  ctx.strokeStyle = "rgba(255, 251, 244, 0.85)";
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.fillStyle = c.coral;
  ctx.fill();
  ctx.strokeStyle = "#1f1a1c";
  ctx.lineWidth = 3;
  ctx.stroke();

  // An inner line and the label.
  roundRect(ctx, x + 5, top + 5, w - 10, BANNER.h - 10, 5);
  ctx.strokeStyle = "rgba(255, 250, 243, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = c.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = (h.label ?? "").split(" ");
  ctx.font = `800 ${words.length > 1 ? 12.5 : 15}px ${c.sans}`;
  words.forEach((word, i) => {
    ctx.fillText(word, x + w / 2, top + BANNER.h / 2 + (i - (words.length - 1) / 2) * 15);
  });
}

function shadow(ctx: CanvasRenderingContext2D, x: number, G: number, radius: number) {
  ctx.fillStyle = "rgba(35, 31, 32, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x, G + 1.5, radius, radius * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ----------------------------------------------------------- Runner ---- */

/*
 * The runner is drawn rather than taken from runner-sprites.png: the eight
 * "run" frames in that file are nearly the same pose, so looped they only
 * shimmer in place. She keeps the look of the sprite (orange hoodie, dark
 * trousers, white trainers, brown ponytail) and gets a real run cycle, with a
 * dark outline like the gameplay pieces so she stands out from the scenery.
 */

/** A limb as two angles, upper then lower part, from straight down; positive is forward. */
type Limb = [number, number];

const LOOK = {
  ink: "#1f1a1c",
  skin: "#f2c19b",
  skinShade: "#dea47d",
  hoodie: "#f47c2c",
  hoodieShade: "#d6621d",
  pants: "#2d3556",
  pantsBack: "#20263f",
  shoe: "#f8f7f4",
  hair: "#5b3522",
  hairTie: "#ff914d",
  cheek: "rgba(240, 118, 90, 0.45)",
};

/** Body measurements in world units; about 72 tall from shoe to hair. */
const BODY = { hip: 31, thigh: 16, shin: 16, torso: 21, upperArm: 11, forearm: 10, head: 9 };

/** One full run cycle (a step with each leg) per this many units run. */
const STRIDE = 150;

type Pose = {
  /** Front, then back. */
  legs: [Limb, Limb];
  arms: [Limb, Limb];
  lean: number;
  bob: number;
  squash: number;
  fall: number;
  hop: number;
  smile: boolean;
  /** Ponytail swing, -1 to 1. */
  swing: number;
};

function poseOf(w: World): Pose {
  const t = w.time;
  const phi = (w.stride / STRIDE) * Math.PI * 2;
  const state = playerState(w);

  // The run cycle: the legs and arms swing in opposition, the knee folds
  // high on the way forward, and the body dips as each foot lands.
  const leg = (p: number): Limb => {
    const thigh = 0.8 * Math.sin(p);
    return [thigh, thigh - (0.2 + 1.45 * Math.max(0, Math.cos(p)))];
  };
  const arm = (p: number): Limb => {
    const upper = -0.9 * Math.sin(p);
    return [upper, upper + 1.65];
  };

  let pose: Pose = {
    legs: [leg(phi), leg(phi + Math.PI)],
    arms: [arm(phi), arm(phi + Math.PI)],
    lean: 0.2,
    bob: 2.6 * Math.abs(Math.cos(phi)) - 1.3,
    squash: 1,
    fall: 0,
    hop: 0,
    smile: false,
    swing: Math.sin(phi * 2) * 0.5,
  };

  if (w.phase === "ready") {
    pose = {
      ...pose,
      legs: [
        [0.12, 0.06],
        [-0.1, -0.06],
      ],
      arms: [
        [0.2, 0.75],
        [-0.15, 0.35],
      ],
      lean: 0.04,
      bob: Math.sin(t * 2.4) * 0.6,
      swing: Math.sin(t * 1.6) * 0.15,
    };
  } else if (state === "gameOver") {
    const k = w.phase === "done" ? 1 : Math.min(1, w.phaseTime / 0.45);
    pose = {
      ...pose,
      legs: [
        [0.9, 0.4],
        [0.5, 0.1],
      ],
      arms: [
        [2.5, 2.9],
        [-2.2, -2.6],
      ],
      lean: 0,
      bob: 0,
      fall: (1 - Math.pow(1 - k, 3)) * 1.45,
      swing: -0.6,
    };
  } else if (state === "ducking" || (state === "hit" && w.ducking)) {
    // A slide: low, leaning back, the front leg stretched out along the
    // street and the back leg folded under. About half her standing height.
    pose = {
      ...pose,
      legs: [
        [1.3, 1.45],
        [1.0, -1.6],
      ],
      arms: [
        [1.5, 1.95],
        [-0.3, 0.1],
      ],
      lean: -1.0,
      bob: 22,
      swing: -0.9,
    };
  } else if (state === "jumping" || state === "falling") {
    // Knee up and arms reaching on the way up; legs reaching down after.
    pose =
      state === "jumping"
        ? {
            ...pose,
            legs: [
              [1.35, 0.25],
              [-0.55, -1.2],
            ],
            arms: [
              [2.3, 2.95],
              [-1.0, -0.35],
            ],
            lean: 0.12,
            bob: 0,
            swing: -0.6,
          }
        : {
            ...pose,
            legs: [
              [0.6, 0.35],
              [-0.25, -0.75],
            ],
            arms: [
              [1.5, 2.2],
              [-1.3, -0.8],
            ],
            lean: 0.16,
            bob: 0,
            swing: 0.5,
          };
  } else if (state === "landing") {
    pose = {
      ...pose,
      legs: [
        [0.7, -0.3],
        [-0.3, -0.9],
      ],
      bob: 3,
      squash: 0.9,
    };
  }

  if (state === "hit" && !w.ducking) {
    pose = {
      ...pose,
      lean: -0.35,
      arms: [
        [2.5, 2.95],
        [-2.2, -2.7],
      ],
    };
  }
  return pose;
}

/** A two-part limb with an outline; returns where it ends. */
function bone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  [upper, lower]: Limb,
  first: number,
  second: number,
  width: number,
  color: string,
) {
  const kx = x + Math.sin(upper) * first;
  const ky = y + Math.cos(upper) * first;
  const ex = kx + Math.sin(lower) * second;
  const ey = ky + Math.cos(lower) * second;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(ex, ey);
  };
  path();
  ctx.strokeStyle = LOOK.ink;
  ctx.lineWidth = width + 3;
  ctx.stroke();
  path();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  return { ex, ey, lower };
}

function drawLeg(ctx: CanvasRenderingContext2D, hipY: number, limb: Limb, color: string) {
  const { ex, ey, lower } = bone(ctx, 0, hipY, limb, BODY.thigh, BODY.shin, 8, color);
  // The trainer points along the foot, which is square to the shin.
  const fx = Math.cos(lower);
  const fy = -Math.sin(lower);
  const shoe = () => {
    ctx.beginPath();
    ctx.moveTo(ex - fx * 2, ey - fy * 2);
    ctx.lineTo(ex + fx * 6, ey + fy * 6);
  };
  shoe();
  ctx.strokeStyle = LOOK.ink;
  ctx.lineWidth = 7;
  ctx.stroke();
  shoe();
  ctx.strokeStyle = LOOK.shoe;
  ctx.lineWidth = 4.2;
  ctx.stroke();
}

function drawArm(ctx: CanvasRenderingContext2D, limb: Limb, sleeve: string, hand: string) {
  const { ex, ey } = bone(ctx, 2.5, -BODY.torso + 3, limb, BODY.upperArm, BODY.forearm, 6, sleeve);
  ctx.beginPath();
  ctx.arc(ex, ey, 3.3, 0, Math.PI * 2);
  ctx.fillStyle = hand;
  ctx.fill();
  ctx.strokeStyle = LOOK.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawTorso(ctx: CanvasRenderingContext2D) {
  const top = -BODY.torso - 2;
  // The hood, folded behind the neck.
  ctx.beginPath();
  ctx.arc(-4.5, top + 3, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = LOOK.hoodieShade;
  ctx.fill();
  ctx.strokeStyle = LOOK.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  roundRect(ctx, -8.5, top, 17, BODY.torso + 5, 7);
  ctx.fillStyle = LOOK.hoodie;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Shade on the back half, the drawstrings and the pocket.
  ctx.save();
  roundRect(ctx, -8.5, top, 17, BODY.torso + 5, 7);
  ctx.clip();
  ctx.fillStyle = LOOK.hoodieShade;
  ctx.fillRect(-8.5, top, 5, BODY.torso + 5);
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(4, top + 4);
  ctx.lineTo(4.2, top + 9);
  ctx.moveTo(6.5, top + 4);
  ctx.lineTo(6.2, top + 8.5);
  ctx.stroke();
  ctx.strokeStyle = LOOK.hoodieShade;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2.5, -4);
  ctx.lineTo(7.5, -4);
  ctx.stroke();
}

function drawHead(ctx: CanvasRenderingContext2D, pose: Pose) {
  const r = BODY.head;
  const cx = 3;
  const cy = -BODY.torso - 10;

  // Ponytail first, so the head sits in front of it.
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 3);
    ctx.quadraticCurveTo(cx - 14, cy - 5 + pose.swing * 3, cx - 17 + pose.swing * 2, cy + 5 + pose.swing * 5);
  };
  tail();
  ctx.strokeStyle = LOOK.ink;
  ctx.lineWidth = 9.5;
  ctx.stroke();
  tail();
  ctx.strokeStyle = LOOK.hair;
  ctx.lineWidth = 6.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 6.5, cy - 3, 2, 0, Math.PI * 2);
  ctx.fillStyle = LOOK.hairTie;
  ctx.fill();

  // Neck and face.
  ctx.fillStyle = LOOK.skinShade;
  ctx.fillRect(cx - 3, cy + 6, 5, 5);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = LOOK.skin;
  ctx.fill();
  ctx.strokeStyle = LOOK.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Hair over the top and back of the head, with a fringe.
  ctx.beginPath();
  ctx.arc(cx - 0.5, cy - 0.5, r + 0.8, Math.PI * 0.82, Math.PI * 1.98);
  ctx.quadraticCurveTo(cx + 5, cy - 4, cx + 1, cy - 3.5);
  ctx.quadraticCurveTo(cx - 3, cy - 1, cx - 4, cy + 4);
  ctx.closePath();
  ctx.fillStyle = LOOK.hair;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ear, eye, cheek and mouth.
  ctx.beginPath();
  ctx.arc(cx - 1.5, cy + 1.5, 2.1, 0, Math.PI * 2);
  ctx.fillStyle = LOOK.skinShade;
  ctx.fill();
  ctx.fillStyle = LOOK.ink;
  ctx.beginPath();
  ctx.arc(cx + 5, cy + 0.5, 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LOOK.cheek;
  ctx.beginPath();
  ctx.arc(cx + 4.2, cy + 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LOOK.ink;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  if (pose.smile) ctx.arc(cx + 6, cy + 4.2, 2, 0.15, Math.PI - 0.5);
  else {
    ctx.moveTo(cx + 5.6, cy + 5.4);
    ctx.lineTo(cx + 7.6, cy + 5.1);
  }
  ctx.stroke();
}

/** The runner, standing on screen at the world's runner position. */
function drawRunner(ctx: CanvasRenderingContext2D, w: World, G: number) {
  const pose = poseOf(w);
  const feet = G - w.y - pose.hop;
  const hipY = -BODY.hip + pose.bob;

  ctx.save();
  ctx.translate(w.playerX, feet);
  if (pose.fall) ctx.rotate(-pose.fall);
  ctx.scale(2 - pose.squash, pose.squash);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Back arm and back leg first, in a shade darker, so she reads in depth.
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.lean);
  drawArm(ctx, pose.arms[1], LOOK.hoodieShade, LOOK.skinShade);
  ctx.restore();
  drawLeg(ctx, hipY, pose.legs[1], LOOK.pantsBack);
  drawLeg(ctx, hipY, pose.legs[0], LOOK.pants);

  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(pose.lean);
  drawTorso(ctx);
  drawHead(ctx, pose);
  drawArm(ctx, pose.arms[0], LOOK.hoodie, LOOK.skin);
  ctx.restore();

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* -------------------------------------------------------- Particles ---- */

function toneColor(tone: Tone, c: Palette) {
  switch (tone) {
    case "coral":
      return c.coral;
    case "paper":
      return c.paper;
    case "ink":
      return c.ink;
    case "dust":
      return "rgba(214, 196, 170, 0.9)";
    case "gold":
      return "#f5c451";
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], d: number, G: number, c: Palette) {
  for (const p of particles) {
    const k = Math.max(0, p.life / p.max);
    const x = p.x - d;
    const y = G - p.y;
    ctx.globalAlpha = k;
    ctx.fillStyle = toneColor(p.tone, c);

    if (p.kind === "ring") {
      ctx.strokeStyle = toneColor(p.tone, c);
      ctx.lineWidth = 2.5 * k;
      ctx.beginPath();
      ctx.arc(x, y, p.size * (1 - k) + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === "spark") {
      ctx.fillRect(x - p.size / 2, y - 1, p.size, 2);
      ctx.fillRect(x - 1, y - p.size / 2, 2, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, p.size * (0.6 + 0.4 * k), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx: CanvasRenderingContext2D, w: World, d: number, G: number, c: Palette) {
  ctx.font = `700 17px ${c.sans}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = c.paper;
  ctx.fillStyle = c.brand;
  for (const text of w.texts) {
    ctx.globalAlpha = Math.min(1, (text.life / text.max) * 2);
    ctx.strokeText(text.text, text.x - d, G - text.y);
    ctx.fillText(text.text, text.x - d, G - text.y);
  }
  ctx.globalAlpha = 1;
}
