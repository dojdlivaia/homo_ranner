import {
  ERAS,
  eraIndexAt,
  eraProgress,
  type FlyKind,
  type ObKind,
  type Palette,
  type PickupKind,
} from "./eras";
import {
  drawFlyer,
  drawGround,
  drawObstacle,
  drawPickup,
  drawPlayer,
  drawSceneBg,
  palMix,
} from "./draw";
import { sfx } from "./audio";

export const VIEW_W = 960;
export const VIEW_H = 340;
export const GROUND = 288;

export type GameEvent =
  | { type: "ui"; score: number; best: number; era: number; progress: number }
  | { type: "start" }
  | { type: "era"; index: number }
  | { type: "fact"; index: number }
  | {
      type: "over";
      score: number;
      best: number;
      newBest: boolean;
      era: number;
      facts: number[];
    };

export interface GameHandle {
  start(): void;
  press(): void;
  release(): void;
  setDuck(on: boolean): void;
  destroy(): void;
}

type Phase = "ready" | "playing" | "dying" | "over";

interface Ob {
  kind: ObKind;
  x: number;
  w: number;
  h: number;
  seed: number;
}
interface Fly {
  kind: FlyKind;
  x: number;
  bottom: number;
  w: number;
  h: number;
  seed: number;
}
interface Pick {
  kind: PickupKind;
  x: number;
  taken: boolean;
  respawned: boolean;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
}

const OB_SIZE: Record<ObKind, [number, number]> = {
  boulder: [38, 34],
  boulder2: [56, 40],
  fire: [42, 32],
  root: [64, 16],
  stone: [30, 22],
  log: [60, 15],
  amphora: [28, 36],
  column: [30, 48],
  barrel: [34, 32],
  gear: [40, 40],
  cone: [28, 34],
  crate: [36, 36],
};
const FLY_SIZE: Record<FlyKind, [number, number]> = {
  bird: [40, 22],
  spear: [52, 8],
  arrow: [52, 8],
  crow: [40, 22],
  drone: [44, 18],
};

const GRAV = 2700;
const JUMP_V = 930;
const STAND_H = 54;
const DUCK_H = 30;

function ease(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}
function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
function readBest(): number {
  try {
    return parseInt(localStorage.getItem("hr-best") || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function createGame(
  canvas: HTMLCanvasElement,
  emit: (e: GameEvent) => void
): GameHandle {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.imageSmoothingEnabled = false;

  const S = {
    phase: "ready" as Phase,
    t: 0,
    score: 0,
    best: readBest(),
    speed: 330,
    scroll: 0,
    eraIdx: 0,
    eraFrom: 0,
    eraMixT: 1,
    y: 0,
    vy: 0,
    grounded: true,
    ducking: false,
    runPhase: 0,
    blinkT: 0,
    pressT: -10,
    obstacles: [] as Ob[],
    flyers: [] as Fly[],
    pick: null as Pick | null,
    pickScheduled: false,
    carried: null as PickupKind | null,
    particles: [] as Particle[],
    runFacts: [] as number[],
    shake: 0,
    flashColor: "#ffffff",
    flashA: 0,
    nextOb: 620,
    lastWasFlyer: false,
    deadTimer: 0,
    overAt: -10,
    uiTimer: 0,
    dustTimer: 0,
    sparkTimer: 0,
  };

  let raf = 0;
  let last = performance.now();

  /* ---------- helpers ---------- */

  function pal(): Palette {
    return palMix(
      ERAS[S.eraFrom].palette,
      ERAS[S.eraIdx].palette,
      ease(S.eraMixT)
    );
  }

  function burst(x: number, y: number, n: number, colors: string[], up = true) {
    for (let i = 0; i < n; i++) {
      S.particles.push({
        x,
        y,
        vx: rnd(-140, 140),
        vy: up ? rnd(-260, -40) : rnd(-60, 60),
        life: 0,
        max: rnd(0.35, 0.8),
        size: rnd(3, 6),
        color: colors[Math.floor(Math.random() * colors.length)],
        grav: 700,
      });
    }
  }

  function dust(n: number) {
    const p = pal();
    for (let i = 0; i < n; i++) {
      S.particles.push({
        x: 78 + rnd(-8, 8),
        y: GROUND - rnd(0, 6),
        vx: rnd(-120, -30),
        vy: rnd(-60, -10),
        life: 0,
        max: rnd(0.25, 0.5),
        size: rnd(2, 4),
        color: p.ground,
        grav: 300,
      });
    }
  }

  function playerBox() {
    const duck = S.ducking && S.grounded;
    const h = duck ? DUCK_H : STAND_H;
    const w = duck ? 34 : 18;
    return { x: 76 + (24 - w) / 2 + 3, y: GROUND - S.y - h, w, h };
  }

  function spawnObstacle() {
    const era = ERAS[S.eraIdx];
    const wantFly =
      S.speed > 430 && !S.lastWasFlyer && Math.random() < 0.26;
    if (wantFly) {
      const kind = era.flyer;
      const [w, h] = FLY_SIZE[kind];
      const alwaysHigh = kind === "spear" || kind === "arrow";
      const high = alwaysHigh || Math.random() < 0.5;
      const bottom = high ? GROUND - 42 : GROUND - 14;
      S.flyers.push({
        kind,
        x: VIEW_W + 70,
        bottom,
        w,
        h,
        seed: Math.random() * 10,
      });
      S.lastWasFlyer = true;
    } else {
      const kinds = era.obstacles;
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const [w, h] = OB_SIZE[kind];
      S.obstacles.push({
        kind,
        x: VIEW_W + 60,
        w,
        h,
        seed: Math.floor(Math.random() * 8),
      });
      S.lastWasFlyer = false;
    }
    S.nextOb = 250 + S.speed * rnd(0.55, 1.15);
  }

  function die() {
    if (S.phase !== "playing") return;
    S.phase = "dying";
    S.deadTimer = 0;
    S.shake = 1;
    S.flashColor = "#ff4d4d";
    S.flashA = 0.32;
    sfx.crash();
    const p = pal();
    burst(90, GROUND - S.y - 30, 18, [p.ink, p.accent, "#ff4d4d", "#ffffff"]);
  }

  function start() {
    S.phase = "playing";
    S.score = 0;
    S.speed = 330;
    S.eraIdx = 0;
    S.eraFrom = 0;
    S.eraMixT = 1;
    S.y = 0;
    S.vy = 0;
    S.grounded = true;
    S.ducking = false;
    S.obstacles = [];
    S.flyers = [];
    S.particles = [];
    S.pick = null;
    S.pickScheduled = false;
    S.carried = null;
    S.runFacts = [];
    S.nextOb = 620;
    S.lastWasFlyer = false;
    S.shake = 0;
    S.flashColor = ERAS[0].palette.accent;
    S.flashA = 0.12;
    emit({ type: "start" });
    emit({ type: "era", index: 0 });
    emitUi();
  }

  function emitUi() {
    emit({
      type: "ui",
      score: Math.floor(S.score),
      best: S.best,
      era: S.eraIdx,
      progress: eraProgress(S.score, S.eraIdx),
    });
  }

  function finish() {
    S.phase = "over";
    S.overAt = S.t;
    const sc = Math.floor(S.score);
    const newBest = sc > S.best;
    if (newBest) {
      S.best = sc;
      try {
        localStorage.setItem("hr-best", String(sc));
      } catch {
        /* ignore */
      }
    }
    emit({
      type: "over",
      score: sc,
      best: S.best,
      newBest,
      era: S.eraIdx,
      facts: [...S.runFacts],
    });
  }

  /* ---------- update ---------- */

  function update(dt: number) {
    S.t += dt;
    S.blinkT += dt;
    if (S.eraMixT < 1) S.eraMixT = Math.min(1, S.eraMixT + dt / 1.1);
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 2.4);
    if (S.flashA > 0) S.flashA = Math.max(0, S.flashA - dt * 1.4);

    // particles always update
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.life += dt;
      if (p.life >= p.max) {
        S.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < 2) p.y = 2;
    }

    if (S.phase === "ready") {
      S.scroll += 46 * dt;
      return;
    }
    if (S.phase === "dying") {
      S.deadTimer += dt;
      if (S.deadTimer > 0.75) finish();
      return;
    }
    if (S.phase === "over") return;

    /* ----- playing ----- */
    S.speed = Math.min(S.speed + 7 * dt, 900);
    const move = S.speed * dt;
    S.scroll += move;
    S.score += move * 0.028;

    // era progression
    const idx = eraIndexAt(S.score);
    if (idx > S.eraIdx) {
      S.eraFrom = S.eraIdx;
      S.eraIdx = idx;
      S.eraMixT = 0;
      S.carried = null;
      S.pick = null;
      S.pickScheduled = false;
      S.speed = Math.max(S.speed, 330 + idx * 26);
      const p = ERAS[idx].palette;
      S.flashColor = p.accent;
      S.flashA = 0.16;
      sfx.era();
      burst(90, GROUND - 40, 20, [p.accent, p.accent2, "#ffffff"]);
      emit({ type: "era", index: idx });
    }

    // schedule this era's pickup
    if (!S.pickScheduled && S.score >= ERAS[S.eraIdx].at + 70) {
      S.pickScheduled = true;
      S.pick = { kind: ERAS[S.eraIdx].pickup, x: VIEW_W + 260, taken: false, respawned: false };
    }

    // player physics
    if (!S.grounded) {
      S.vy -= GRAV * dt;
      S.y += S.vy * dt;
      if (S.y <= 0) {
        S.y = 0;
        S.vy = 0;
        S.grounded = true;
        sfx.land();
        dust(5);
      }
    }
    if (S.grounded && S.t - S.pressT < 0.1) {
      S.pressT = -10;
      S.vy = JUMP_V;
      S.grounded = false;
      sfx.jump();
      dust(4);
    }
    S.runPhase += (move / 46) * 0.9;

    // spawn obstacles
    S.nextOb -= move;
    if (S.nextOb <= 0) spawnObstacle();

    // move + collide obstacles
    const pb = playerBox();
    for (let i = S.obstacles.length - 1; i >= 0; i--) {
      const o = S.obstacles[i];
      o.x -= move;
      if (o.x < -90) {
        S.obstacles.splice(i, 1);
        continue;
      }
      const inset = o.kind === "fire" ? 8 : 4;
      if (
        pb.x < o.x + o.w - inset &&
        pb.x + pb.w > o.x + inset &&
        pb.y < GROUND - 2 &&
        pb.y + pb.h > GROUND - o.h + inset
      ) {
        die();
        return;
      }
    }
    for (let i = S.flyers.length - 1; i >= 0; i--) {
      const f = S.flyers[i];
      f.x -= (S.speed + 60) * dt;
      if (f.x < -90) {
        S.flyers.splice(i, 1);
        continue;
      }
      const wob = Math.sin(S.t * 3 + f.seed) * 4;
      const fy = f.bottom + wob - f.h;
      if (
        pb.x < f.x + f.w - 5 &&
        pb.x + pb.w > f.x + 5 &&
        pb.y < fy + f.h - 3 &&
        pb.y + pb.h > fy + 3
      ) {
        die();
        return;
      }
    }

    // pickup
    if (S.pick && !S.pick.taken) {
      S.pick.x -= move;
      const px = S.pick.x;
      const py = GROUND - 52 + Math.sin(S.t * 3) * 4;
      if (
        pb.x < px + 20 &&
        pb.x + pb.w > px - 20 &&
        pb.y < py + 24 &&
        pb.y + pb.h > py - 24
      ) {
        S.pick.taken = true;
        S.carried = S.pick.kind;
        S.runFacts.push(S.eraIdx);
        const p = ERAS[S.eraIdx].palette;
        S.flashColor = p.accent;
        S.flashA = 0.14;
        sfx.pickup();
        burst(px, py, 16, [p.accent, p.accent2, "#ffffff"]);
        emit({ type: "fact", index: S.eraIdx });
      } else if (S.pick.x < -70) {
        const eraEnd =
          S.eraIdx + 1 < ERAS.length ? ERAS[S.eraIdx + 1].at : Infinity;
        if (!S.pick.respawned && S.score < eraEnd - 90) {
          S.pick.respawned = true;
          S.pick.x = VIEW_W + 260;
        } else {
          S.pick = null;
        }
      }
    }

    // ambient dust + torch sparks
    S.dustTimer -= dt;
    if (S.grounded && S.dustTimer <= 0) {
      S.dustTimer = 0.1;
      dust(1);
    }
    if (S.carried === "torch") {
      S.sparkTimer -= dt;
      if (S.sparkTimer <= 0) {
        S.sparkTimer = 0.05;
        S.particles.push({
          x: 118 + rnd(-4, 4),
          y: GROUND - 60 + rnd(-6, 2),
          vx: rnd(-40, 10),
          vy: rnd(20, 90),
          life: 0,
          max: rnd(0.2, 0.45),
          size: rnd(2, 4),
          color: Math.random() > 0.5 ? "#ffd23f" : "#ff7a3d",
          grav: -60,
        });
      }
    }

    S.uiTimer -= dt;
    if (S.uiTimer <= 0) {
      S.uiTimer = 0.12;
      emitUi();
    }
  }

  /* ---------- render ---------- */

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (S.shake > 0) {
      ctx.translate(
        Math.round((Math.random() - 0.5) * 10 * S.shake),
        Math.round((Math.random() - 0.5) * 8 * S.shake)
      );
    }
    const p = pal();

    drawSceneBg(
      ctx,
      VIEW_W,
      VIEW_H,
      GROUND,
      p,
      S.eraFrom,
      S.eraIdx,
      ease(S.eraMixT),
      S.scroll,
      S.t
    );
    drawGround(ctx, VIEW_W, VIEW_H, GROUND, p, S.eraIdx, S.scroll);

    // pickup
    if (S.pick && !S.pick.taken) {
      drawPickup(
        ctx,
        S.pick.kind,
        S.pick.x,
        GROUND - 52 + Math.sin(S.t * 3) * 4,
        p,
        S.t
      );
    }

    for (const o of S.obstacles) drawObstacle(ctx, o.kind, o.x, GROUND, p, S.t, o.seed);
    for (const f of S.flyers) {
      const wob = Math.sin(S.t * 3 + f.seed) * 4;
      drawFlyer(ctx, f.kind, f.x, f.bottom + wob - f.h, p, S.t, f.seed);
    }

    // player
    const blink = S.blinkT % 3.4 > 3.22 && S.phase !== "dying";
    const pose =
      S.phase === "dying" || S.phase === "over"
        ? "dead"
        : !S.grounded
          ? "jump"
          : S.ducking
            ? "duck"
            : "run";
    drawPlayer(
      ctx,
      76,
      GROUND - S.y,
      S.eraIdx,
      pose,
      Math.floor(S.runPhase) % 3,
      S.t,
      S.carried,
      blink,
      p
    );

    // particles
    for (const pt of S.particles) {
      ctx.globalAlpha = 1 - pt.life / pt.max;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, GROUND - pt.y, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    if (S.flashA > 0) {
      ctx.globalAlpha = S.flashA;
      ctx.fillStyle = S.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- loop ---------- */

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame((n) => {
    last = n;
    frame(n);
  });

  /* ---------- input ---------- */

  function press() {
    if (S.phase === "ready") {
      sfx.click();
      start();
      return;
    }
    if (S.phase === "over") {
      if (S.t - S.overAt > 0.35) {
        sfx.click();
        start();
      }
      return;
    }
    S.pressT = S.t;
    if (S.grounded) {
      // immediate jump; buffered path handles presses right after landing
      S.vy = JUMP_V;
      S.grounded = false;
      S.pressT = -10;
      sfx.jump();
      dust(4);
    }
  }

  function release() {
    if (S.phase === "playing" && !S.grounded && S.vy > 340) {
      S.vy = 340;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (!e.repeat) press();
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      e.preventDefault();
      S.ducking = true;
    } else if (e.code === "Enter") {
      if (S.phase === "ready" || (S.phase === "over" && S.t - S.overAt > 0.35)) {
        e.preventDefault();
        sfx.click();
        start();
      }
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      release();
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      S.ducking = false;
    }
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  emitUi();

  return {
    start() {
      if (S.phase === "ready" || S.phase === "over") start();
    },
    press,
    release,
    setDuck(on: boolean) {
      S.ducking = on;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
