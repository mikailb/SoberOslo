"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/Button";
import { buildGround, drawFrame, loadImages, PLAYER_SHARE, readPalette, type View } from "./draw";
import { createWorld, metersOf, requestJump, setDuck, step } from "./engine";
import { MAX_LIVES } from "./rules";

type Phase = "loading" | "ready" | "running" | "paused" | "over" | "failed";

type Result = { score: number; meters: number; coffee: number; best: number; line: string };

/** A line for the game over screen, depending on how far the run went. */
const GAME_OVER_LINES: [number, string[]][] = [
  [0, ["Det der var en kort tur. Prøv igjen!", "Snublet før start? Det skjer de beste.", "Oslo venter fortsatt på deg."]],
  [100, ["Du kom forbi første benk. Godt jobba!", "Oppvarmingen er gjort. Nå starter det.", "Fin start. Sparkesyklene vant denne gangen."]],
  [250, ["Halvveis til Operaen!", "Du begynner å få flyt.", "Måkene er imponert."]],
  [500, ["500 meter! Du løper som en lokal.", "Nå snakker vi. Klar for en ny runde?", "Du er offisielt raskere enn trikken."]],
  [1000, ["Over en kilometer! Helt rått.", "Legende på havnepromenaden.", "Ta en pause, du har fortjent den."]],
  [2000, ["Er du egentlig et menneske?", "Oslo Run-mester. Del det med vennene dine!"]],
];

function gameOverLine(meters: number) {
  let lines = GAME_OVER_LINES[0][1];
  for (const [from, options] of GAME_OVER_LINES) if (meters >= from) lines = options;
  return lines[Math.floor(Math.random() * lines.length)];
}

/** Physics runs at a fixed rate, so the game plays the same at 60 and 120 Hz. */
const STEP = 1 / 120;
/** The game window is this many world units tall on a desktop screen ... */
const BASE_HEIGHT = 326;
/** ... and is never scaled up further than this, e.g. in fullscreen ... */
const MAX_SCALE = 1.6;
/** ... nor narrower than this, so a phone still shows enough road ahead. */
const MIN_WIDTH = 500;
const LOGO_ICON = "/images/oslo-run/SoberOslo%20Logo.png";

const JUMP_KEYS = new Set(["Space", "ArrowUp", "KeyW"]);
const DUCK_KEYS = new Set(["ArrowDown", "KeyS"]);
const PAUSE_KEYS = new Set(["KeyP", "Escape"]);

const noSubscribe = () => () => {};
const onFullscreenChange = (callback: () => void) => {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
};

type Controls = {
  start: () => void;
  togglePause: () => void;
  jump: () => void;
  duck: (held: boolean) => void;
};

/**
 * Oslo Run: an endless runner along the harbour. Jump the low obstacles,
 * duck under the banners, collect coffee, and see how far you get before the
 * hearts run out.
 *
 * The world lives outside React. One animation frame loop runs only while a
 * run is in progress, and the score, hearts and counters are written straight
 * to the DOM when they change, so React renders only when the phase changes.
 * Everything is released when the component unmounts.
 */
export function OsloRun() {
  const cardRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<Result | null>(null);

  const canFullscreen = useSyncExternalStore(
    noSubscribe,
    () => document.fullscreenEnabled,
    () => false,
  );
  const isFullscreen = useSyncExternalStore(
    onFullscreenChange,
    () => document.fullscreenElement !== null && document.fullscreenElement === cardRef.current,
    () => false,
  );

  useEffect(() => {
    const card = cardRef.current;
    const play = playRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!card || !play || !canvas || !ctx) return;

    const field = (name: string) => card.querySelector<HTMLElement>(`[data-hud="${name}"]`);
    const scoreEl = field("score");
    const coffeeEl = field("coffee");
    const metersEl = field("meters");
    const hearts = Array.from(card.querySelectorAll<HTMLElement>("[data-heart]"));

    const palette = readPalette(canvas);
    const newSeed = () => Math.floor(Math.random() * 2 ** 31);

    let images: Awaited<ReturnType<typeof loadImages>> | null = null;
    let ground: HTMLCanvasElement | null = null;
    let view: View = { width: 1200, height: BASE_HEIGHT, pixelScale: 1 };
    let world = createWorld(view.width * PLAYER_SHARE, view.width, newSeed());
    let current: Phase = "loading";
    let frame = 0;
    let last = 0;
    let carry = 0;
    let visible = true;
    let best = 0;
    let alive = true;
    const shown = { score: -1, lives: -1, coffee: -1, meters: -1 };

    const setCurrent = (next: Phase) => {
      current = next;
      setPhase(next);
    };

    const render = () => {
      if (!images || !ground) return;
      ctx.setTransform(view.pixelScale, 0, 0, view.pixelScale, 0, 0);
      drawFrame(ctx, world, view, images, ground, palette);
      syncHud();
    };

    const syncHud = () => {
      if (world.score !== shown.score && scoreEl) {
        shown.score = world.score;
        scoreEl.textContent = String(world.score);
      }
      if (world.lives !== shown.lives) {
        shown.lives = world.lives;
        hearts.forEach((heart, i) => (heart.dataset.full = String(i < world.lives)));
      }
      if (world.coffee !== shown.coffee && coffeeEl) {
        shown.coffee = world.coffee;
        coffeeEl.textContent = String(world.coffee);
      }
      const meters = metersOf(world);
      if (meters !== shown.meters && metersEl) {
        shown.meters = meters;
        metersEl.textContent = `${meters} m`;
      }
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(box.width * ratio);
      canvas.height = Math.round(box.height * ratio);
      const height = Math.max(
        BASE_HEIGHT,
        box.height / MAX_SCALE,
        (box.height * MIN_WIDTH) / box.width,
      );
      const scale = box.height / height;
      view = { width: box.width / scale, height, pixelScale: scale * ratio };
      world.playerX = view.width * PLAYER_SHARE;
      world.viewWidth = view.width;
      ground = buildGround(view);
      render();
    };

    const loop = (now: number) => {
      carry += Math.min((now - last) / 1000, 0.1);
      last = now;
      while (carry >= STEP) {
        step(world, STEP);
        carry -= STEP;
      }
      render();

      if (world.phase === "done") {
        end();
        return;
      }
      if (current === "running") frame = requestAnimationFrame(loop);
    };

    const run = () => {
      setCurrent("running");
      last = performance.now();
      carry = 0;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!images) return;
      // Everything starts over: score, distance, coffee, hearts, pace, phase.
      world = createWorld(view.width * PLAYER_SHARE, view.width, newSeed());
      world.phase = "running";
      run();
      play.focus({ preventScroll: true });
    };

    // Pausing stops the loop itself, so nothing moves, spawns or counts.
    const pause = () => {
      if (current !== "running") return;
      cancelAnimationFrame(frame);
      setDuck(world, false);
      setCurrent("paused");
    };

    const togglePause = () => {
      if (current === "running") pause();
      else if (current === "paused") run();
    };

    const end = () => {
      best = Math.max(best, world.score);
      const meters = metersOf(world);
      setResult({ score: world.score, meters, coffee: world.coffee, best, line: gameOverLine(meters) });
      setCurrent("over");
    };

    const jump = () => {
      if (current === "running") requestJump(world);
    };

    const duck = (held: boolean) => {
      if (current === "running" || !held) setDuck(world, held);
    };

    controls.current = { start, togglePause, jump, duck };

    loadImages()
      .then((loaded) => {
        if (!alive) return;
        images = loaded;
        setCurrent("ready");
        resize();
      })
      .catch(() => {
        if (alive) setCurrent("failed");
      });

    const onKeyDown = (event: KeyboardEvent) => {
      if (!visible) return;
      const target = event.target as HTMLElement | null;
      const onControl = Boolean(target?.closest("button, a, input, textarea, select"));

      if (PAUSE_KEYS.has(event.code)) {
        if (current === "running" || current === "paused") {
          event.preventDefault();
          if (!event.repeat) togglePause();
        }
        return;
      }

      if (DUCK_KEYS.has(event.code)) {
        if (current === "running") {
          event.preventDefault();
          duck(true);
        }
        return;
      }

      if (!JUMP_KEYS.has(event.code)) return;
      if (current === "running") {
        event.preventDefault();
        if (!event.repeat) jump();
        return;
      }
      // Space on a focused button or link should still press that button.
      if (onControl || event.repeat) return;
      if (current === "ready" || current === "over") {
        event.preventDefault();
        start();
      } else if (current === "paused") {
        event.preventDefault();
        run();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (DUCK_KEYS.has(event.code)) duck(false);
    };

    // A key let go while the window had no focus would leave her ducking.
    const onBlur = () => duck(false);

    // Pause when the tab is hidden or the game scrolls out of sight, so no
    // one loses a heart to something they could not see.
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    const viewObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (entry.intersectionRatio < 0.3) pause();
      },
      { threshold: [0, 0.3] },
    );
    viewObserver.observe(play);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      controls.current = null;
    };
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (phase === "running") controls.current?.jump();
    else if (phase === "paused") controls.current?.togglePause();
    else if (phase === "ready" || phase === "over") controls.current?.start();
  }

  function pressDuck(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    controls.current?.duck(true);
  }

  function releaseDuck() {
    controls.current?.duck(false);
  }

  function toggleFullscreen() {
    const card = cardRef.current;
    if (!card) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else card.requestFullscreen().catch(() => {});
  }

  return (
    <div
      ref={cardRef}
      className={`flex flex-col bg-paper ${
        isFullscreen
          ? "h-full w-full p-3 sm:p-4"
          : "rounded-[24px] p-2.5 shadow-[0_18px_40px_-22px_rgba(35,31,32,0.35),0_1px_3px_rgba(35,31,32,0.06)] sm:p-[15px]"
      }`}
    >
      {/* --------------------------------------------- Game window + HUD */}
      <div
        ref={playRef}
        tabIndex={-1}
        onPointerDown={handlePointerDown}
        className={`relative overflow-hidden rounded-[14px] bg-[#8fc8ee] outline-none select-none sm:rounded-[16px] ${
          isFullscreen ? "min-h-0 flex-1" : "aspect-[4/3] sm:aspect-auto sm:h-[clamp(280px,23vw,330px)]"
        } ${phase === "running" ? "touch-none" : "touch-manipulation"}`}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Oslo Run: en løper på havnepromenaden i Oslo hopper over søppelbøtter, benker og sparkesykler, dukker under bannere og samler Sober Oslo-logoer."
          className="absolute inset-0 block h-full w-full"
        />

        {phase !== "running" ? (
          <Overlay dim={phase !== "ready"}>
            {phase === "loading" ? (
              <p className="text-sm text-ink/70">Laster Oslo …</p>
            ) : phase === "failed" ? (
              <p className="max-w-xs text-sm text-ink/80">
                Spillet kunne ikke lastes akkurat nå. Last siden på nytt for å prøve igjen.
              </p>
            ) : phase === "paused" ? (
              <>
                <p className="font-display text-3xl font-medium tracking-wide text-ink sm:text-4xl">
                  PAUSE
                </p>
                <Button className="mt-3" onClick={() => controls.current?.togglePause()}>
                  Fortsett
                </Button>
              </>
            ) : phase === "over" && result ? (
              <>
                <p className="font-display text-3xl font-medium tracking-wide text-ink sm:text-4xl">
                  GAME OVER
                </p>
                <p className="mt-1 text-base font-medium text-green sm:text-lg">{result.line}</p>
                <dl className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-ink/75 sm:text-base">
                  <div className="flex gap-1">
                    <dt>Poeng:</dt>
                    <dd className="font-semibold text-ink">{result.score}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Distanse:</dt>
                    <dd className="font-semibold text-ink">{result.meters} m</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Logoer:</dt>
                    <dd className="font-semibold text-ink">{result.coffee}</dd>
                  </div>
                </dl>
                {result.best > result.score ? (
                  <p className="mt-1 text-xs text-ink/60">Rekord denne økten: {result.best}</p>
                ) : null}
                <Button className="mt-3" onClick={() => controls.current?.start()}>
                  Prøv igjen
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" onClick={() => controls.current?.start()}>
                  Start
                </Button>
                <p className="mt-2.5 rounded-full bg-paper/85 px-3 py-1 text-xs text-ink/80 sm:text-sm">
                  <span className="pointer-coarse:hidden">Hopp: Space / ↑ · Dukk: hold ↓ / S · Pause: P</span>
                  <span className="hidden pointer-coarse:inline">Tapp for å hoppe · Hold «Dukk» for å dukke</span>
                </p>
              </>
            )}
          </Overlay>
        ) : null}

        {/* The HUD sits on the sky, like a game's own top bar. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-3 pt-2.5 pb-6 sm:px-5 sm:pt-3.5"
          // A soft light band, so the counters stay readable over sky and ropes.
          style={{ background: "linear-gradient(rgba(255, 250, 243, 0.7), rgba(255, 250, 243, 0))" }}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hidden h-8 w-8 shrink-0 text-ink sm:block"
            >
              <circle cx="14.5" cy="4" r="2.1" fill="currentColor" stroke="none" />
              <path d="M13.5 7.5 11.5 12.5M11.5 12.5l3 2.5-1 5M11.5 12.5 9 16l-3.5.5M13 8.5l3 2 2.5-1.5M12.8 8.3 9.5 9l-2 2.5" />
            </svg>
            <div className="min-w-0">
              <p className="text-base leading-tight font-bold text-ink sm:text-[21px]">Oslo Run</p>
              <p className="mt-0.5 hidden items-center gap-1 text-sm text-ink/85 sm:flex">
                Løp gjennom Oslo og samle logoer
                <Image src={LOGO_ICON} alt="" width={64} height={64} className="h-5 w-5" />
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 text-sm text-ink sm:gap-6 sm:text-lg">
            <p className="flex items-center gap-1 font-semibold sm:gap-1.5">
              <Image src={LOGO_ICON} alt="Logoer" width={96} height={96} className="-my-1 h-7 w-7 sm:h-10 sm:w-10" />
              <span data-hud="coffee" className="tabular-nums">
                0
              </span>
            </p>
            <div role="img" aria-label={`${MAX_LIVES} liv`} className="flex gap-0.5">
              {Array.from({ length: MAX_LIVES }, (_, i) => (
                <svg
                  key={i}
                  data-heart
                  data-full="true"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-[#e5262e] drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] data-[full=false]:text-[#d9d4cf] sm:h-6 sm:w-6"
                >
                  <path
                    fill="currentColor"
                    d="M12 21s-8.5-5.2-8.5-11.6A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.5 2.8C20.5 15.8 12 21 12 21Z"
                  />
                </svg>
              ))}
            </div>
            <p>
              <span className="sr-only sm:not-sr-only">Poeng: </span>
              <span data-hud="score" className="font-semibold tabular-nums">
                0
              </span>
            </p>
            <p>
              <span className="sr-only lg:not-sr-only">Distanse: </span>
              <span data-hud="meters" className="font-semibold tabular-nums">
                0 m
              </span>
            </p>
            <button
              type="button"
              onClick={() => controls.current?.togglePause()}
              disabled={phase !== "running" && phase !== "paused"}
              aria-label={phase === "paused" ? "Fortsett" : "Pause"}
              className="pointer-events-auto -my-1 flex h-9 w-9 items-center justify-center rounded-full bg-paper/85 text-ink shadow-[0_1px_3px_rgba(35,31,32,0.2)] transition-colors hover:bg-paper disabled:opacity-40 sm:h-10 sm:w-10"
            >
              {phase === "paused" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
                  <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* On touch screens: hold to duck. Tapping anywhere else jumps. */}
        {phase === "running" ? (
          <button
            type="button"
            onPointerDown={pressDuck}
            onPointerUp={releaseDuck}
            onPointerCancel={releaseDuck}
            onLostPointerCapture={releaseDuck}
            aria-label="Dukk"
            className="absolute right-2.5 bottom-2.5 z-20 hidden h-14 w-14 touch-none flex-col items-center justify-center rounded-full bg-paper/90 text-[11px] font-semibold text-ink shadow-[0_2px_6px_rgba(35,31,32,0.3)] active:bg-coral pointer-coarse:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4v15M5.5 12.5 12 19l6.5-6.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dukk
          </button>
        ) : null}
      </div>

      {/* ------------------------------------------------------- Footer */}
      <div className="flex h-11 items-center justify-between gap-4 px-1.5 pt-1 sm:h-[50px] sm:px-2.5">
        <p className="text-xs text-muted sm:text-sm">
          <span className="pointer-coarse:hidden">
            <Kbd>Space</Kbd> hopp · <Kbd>↓</Kbd> dukk · <Kbd>P</Kbd> pause
          </span>
          <span className="hidden pointer-coarse:inline">Tapp for å hoppe · hold «Dukk» for å dukke</span>
        </p>
        {canFullscreen ? (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Avslutt fullskjerm" : "Spill i fullskjerm"}
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={
                  isFullscreen
                    ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
                    : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
                }
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-cream px-1.5 py-px font-sans text-[0.7rem] text-ink">
      {children}
    </kbd>
  );
}

function Overlay({ children, dim }: { children: ReactNode; dim: boolean }) {
  return (
    <div
      aria-live="polite"
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto px-5 pt-10 pb-3 text-center sm:pt-14 ${
        dim ? "bg-paper/70 backdrop-blur-[2px]" : "bg-paper/15"
      }`}
      style={{ animation: "so-fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      {children}
    </div>
  );
}
