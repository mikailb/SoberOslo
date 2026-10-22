"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type ScratchCardProps = {
  /** What lies under the cover. */
  children: ReactNode;
  /** Large words printed on the cover. */
  coverLabel: string;
  /** Small line under the cover label. */
  coverHint?: string;
  /** Read out by screen readers for the card itself. */
  ariaLabel: string;
  /** Share of the cover, in percent, that has to be gone before it lifts. */
  finishPercent?: number;
  onReveal?: () => void;
  /** Move keyboard focus to the card when it appears, e.g. after a reset. */
  autoFocus?: boolean;
  className?: string;
};

type Point = { x: number; y: number };

/** How often, at most, the cleared share is measured while scratching. */
const CHECK_INTERVAL_MS = 180;

/**
 * A card with a cover you scratch away with a mouse or a finger.
 *
 * Based on the approach in react-scratchcard-v5 (MIT, gshudhanshu/phoenick):
 * a canvas over the result, `destination-out` strokes that erase it, and a
 * pixel count that lifts the rest once enough is gone. Ported rather than
 * installed, because the package only accepts React 16, ships a 400 KB brush
 * image in its bundle, has a fixed pixel size, and puts touches in the wrong
 * place on a scrolled page. Here it uses pointer events, sizes itself to its
 * box, stops the page scrolling under the finger, and can be opened from the
 * keyboard with Enter or Space.
 *
 * To start over, give it a new `key`.
 */
export function ScratchCard({
  children,
  coverLabel,
  coverHint,
  ariaLabel,
  finishPercent = 55,
  onReveal,
  autoFocus = false,
  className = "",
}: ScratchCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const lastCheck = useRef(0);
  const scratched = useRef(false);
  const done = useRef(false);
  const [revealed, setRevealed] = useState(false);

  // Paint the cover, and paint it again if the card changes width (a phone
  // turned sideways). Scratches made before such a change start over.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = 0;

    const paint = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      width = box.width;
      paintCover(canvas, box.width, box.height, coverLabel, coverHint);
      // Read by CSS to show the result only once it is safely covered.
      canvas.dataset.painted = "true";
    };

    paint();

    // Brand fonts may still be loading on a first visit. Repaint once they
    // arrive, unless someone has already started scratching.
    if (document.fonts && document.fonts.status !== "loaded") {
      document.fonts.ready.then(() => {
        if (!scratched.current && !done.current) paint();
      });
    }

    const observer = new ResizeObserver(() => {
      if (done.current) return;
      const next = canvas.getBoundingClientRect().width;
      if (Math.abs(next - width) > 1) paint();
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [coverLabel, coverHint]);

  useEffect(() => {
    if (autoFocus) wrapperRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  function reveal() {
    if (done.current) return;
    done.current = true;
    drawing.current = false;
    setRevealed(true);
    onReveal?.();
  }

  function pointFrom(event: PointerEvent<HTMLCanvasElement>): Point {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function scratch(from: Point, to: Point) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const brush = Math.max(18, canvas.getBoundingClientRect().width * 0.045);

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = brush * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.01, to.y);
    ctx.stroke();
    scratched.current = true;
  }

  function checkProgress(force = false) {
    const canvas = canvasRef.current;
    if (!canvas || done.current) return;

    const now = performance.now();
    if (!force && now - lastCheck.current < CHECK_INTERVAL_MS) return;
    lastCheck.current = now;

    if (clearedPercent(canvas) >= finishPercent) reveal();
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (done.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const point = pointFrom(event);
    lastPoint.current = point;
    scratch(point, point);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPoint.current) return;

    const point = pointFrom(event);
    scratch(lastPoint.current, point);
    lastPoint.current = point;
    checkProgress();
  }

  function handlePointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    checkProgress(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (revealed) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      reveal();
    }
  }

  return (
    <div
      ref={wrapperRef}
      tabIndex={revealed ? -1 : 0}
      role={revealed ? undefined : "button"}
      aria-label={revealed ? undefined : ariaLabel}
      onKeyDown={handleKeyDown}
      className={`relative isolate overflow-hidden bg-coral select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        className={`peer absolute inset-0 z-10 h-full w-full touch-none transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          revealed ? "pointer-events-none opacity-0" : "cursor-crosshair"
        }`}
      />

      {/* Hidden until the cover is painted, so a slow device never shows
          the answer for a moment before the cover lands on top of it. */}
      <div
        aria-hidden={!revealed}
        className="invisible absolute inset-0 peer-data-[painted]:visible"
      >
        {children}
      </div>
    </div>
  );
}

/** Draws the cover: brand orange, a quiet dot grid and the label. */
function paintCover(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  label: string,
  hint?: string,
) {
  // Capped at 2: sharper than that is not visible on a cover, and it keeps
  // the pixel count cheap on phones with very dense screens.
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const styles = getComputedStyle(canvas);
  const token = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  const coral = token("--color-coral", "#ff914d");
  const ink = token("--color-ink", "#231f20");
  const display = token("--font-fraunces", "Georgia, serif");
  const sans = token("--font-inter", "system-ui, sans-serif");

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = coral;
  ctx.fillRect(0, 0, width, height);

  // A soft dot grid gives the cover a little texture, like paper.
  ctx.fillStyle = "rgba(35, 31, 32, 0.07)";
  const gap = 18;
  for (let y = gap / 2; y < height; y += gap) {
    for (let x = gap / 2; x < width; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const labelSize = Math.min(width * 0.12, 64);

  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${labelSize}px ${display}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${labelSize * 0.06}px`;
  ctx.fillText(label, centerX, centerY - (hint ? labelSize * 0.25 : 0));

  if (hint) {
    const hintSize = Math.max(13, Math.min(width * 0.032, 16));
    ctx.font = `500 ${hintSize}px ${sans}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillStyle = "rgba(35, 31, 32, 0.7)";
    ctx.fillText(hint, centerX, centerY + labelSize * 0.6);
  }

  // The same small round mark as next to the logo.
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(width - 28, 28, 5, 0, Math.PI * 2);
  ctx.fill();
}

/** Share of the cover that has been scratched off, in percent. */
function clearedPercent(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Every 8th pixel is plenty to judge the share, and far cheaper.
  const step = 4 * 8;
  let cleared = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += step) {
    total++;
    if (data[i] === 0) cleared++;
  }
  return total ? (cleared / total) * 100 : 0;
}
