import { ERAS, type FlyKind, type ObKind, type Palette, type PickupKind } from "./eras";

/* ---------------- color helpers ---------------- */

function parseColor(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const h = c.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  return [0, 0, 0];
}

export function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  const r = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}

export function palMix(A: Palette, B: Palette, t: number): Palette {
  return {
    skyTop: mix(A.skyTop, B.skyTop, t),
    skyBottom: mix(A.skyBottom, B.skyBottom, t),
    sun: mix(A.sun, B.sun, t),
    far: mix(A.far, B.far, t),
    ground: mix(A.ground, B.ground, t),
    line: mix(A.line, B.line, t),
    ink: mix(A.ink, B.ink, t),
    accent: mix(A.accent, B.accent, t),
    accent2: mix(A.accent2, B.accent2, t),
  };
}

export function luminance(col: string): number {
  const [r, g, b] = parseColor(col);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ---------------- background ---------------- */

export function drawSceneBg(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  groundY: number,
  pal: Palette,
  eraA: number,
  eraB: number,
  mixT: number,
  scroll: number,
  t: number
) {
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, groundY);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const dark = luminance(pal.skyTop) < 0.3;

  // stars on dark skies
  if (dark) {
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 26; i++) {
      const sx = (i * 149.7) % W;
      const sy = (i * 89.3) % (groundY * 0.55);
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i * 1.7));
      ctx.globalAlpha = 0.5 * tw;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  // sun / moon
  const sunY = 82 + Math.sin(t * 0.5) * 3;
  ctx.fillStyle = pal.sun;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(W - 168, sunY, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(W - 168, sunY, 42, 0, Math.PI * 2);
  ctx.fill();
  if (dark) {
    // moon craters
    ctx.fillStyle = mix(pal.sun, pal.skyTop, 0.35);
    ctx.fillRect(W - 182, sunY - 10, 8, 8);
    ctx.fillRect(W - 162, sunY + 8, 6, 6);
    ctx.fillRect(W - 156, sunY - 18, 5, 5);
  }

  // clouds
  const cloudAlpha = dark ? 0.14 : 0.45;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 5; i++) {
    const cw = 56 + (i % 3) * 22;
    const cx = ((i * 231 - scroll * 0.22) % (W + 260) + W + 260) % (W + 260) - 130;
    const cy = 34 + ((i * 53) % 78);
    ctx.globalAlpha = cloudAlpha * (0.6 + 0.4 * ((i * 37) % 10) / 10);
    ctx.fillRect(cx, cy, cw, 10);
    ctx.fillRect(cx + 12, cy - 8, cw - 26, 8);
    ctx.fillRect(cx + 8, cy + 10, cw - 18, 6);
  }
  ctx.globalAlpha = 1;

  // far silhouette layers, cross-faded between eras
  drawFarLayer(ctx, eraA, groundY, pal, scroll, t, 1 - mixT, W);
  if (mixT > 0.01) drawFarLayer(ctx, eraB, groundY, pal, scroll, t, mixT, W);
}

function drawFarLayer(
  ctx: CanvasRenderingContext2D,
  era: number,
  groundY: number,
  pal: Palette,
  scroll: number,
  t: number,
  alpha: number,
  W: number
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const period = 480;
  const off = -((scroll * 0.35) % period);
  for (let k = -1; k * period + off < W + period; k++) {
    drawFarTile(ctx, era, off + k * period, groundY, pal, t);
  }
  ctx.restore();
}

function drawFarTile(
  ctx: CanvasRenderingContext2D,
  era: number,
  ox: number,
  gy: number,
  pal: Palette,
  t: number
) {
  const F = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(ox + x, gy - y - h, w, h);
  };
  const far = pal.far;
  const ink = pal.line;
  switch (era) {
    case 0: {
      // stepped mountains + cave
      const rows = [150, 128, 106, 84, 62, 40];
      rows.forEach((w, i) => F(170 - w / 2, i * 22, w, 22, far));
      const rows2 = [110, 88, 66, 44];
      rows2.forEach((w, i) => F(360 - w / 2, i * 20, w, 20, mix(far, pal.skyTop, 0.25)));
      // cave
      F(60, 0, 76, 56, far);
      F(72, 56, 52, 14, far);
      F(84, 0, 26, 40, ink);
      // bones
      F(410, 0, 16, 4, mix(far, "#ffffff", 0.4));
      F(414, 4, 4, 6, mix(far, "#ffffff", 0.4));
      break;
    }
    case 1: {
      // hills + hut + wheat
      for (let i = 0; i < 4; i++) F(40 + i * 8, i * 10, 160 - i * 16, 10, far);
      for (let i = 0; i < 3; i++) F(300 + i * 8, i * 10, 120 - i * 16, 10, mix(far, pal.skyTop, 0.2));
      // hut
      F(210, 0, 56, 30, far);
      F(218, 30, 40, 10, far);
      F(226, 40, 24, 8, far);
      F(230, 0, 12, 18, ink);
      // wheat
      for (let i = 0; i < 5; i++) {
        const sway = Math.sin(t * 2 + i) > 0 ? 1 : 0;
        F(390 + i * 10, 0, 3, 16 + (i % 3) * 5, mix(far, pal.accent2, 0.5));
        F(388 + i * 10 + sway, 16 + (i % 3) * 5, 5, 5, pal.accent);
      }
      break;
    }
    case 2: {
      // ziggurat + palms
      F(60, 0, 120, 26, far);
      F(76, 26, 88, 24, far);
      F(92, 50, 56, 22, far);
      F(108, 72, 24, 16, far);
      F(114, 0, 12, 88, mix(far, "#ffffff", 0.15));
      // palm
      F(340, 0, 6, 46, far);
      F(326, 42, 14, 5, far);
      F(346, 44, 16, 5, far);
      F(334, 50, 10, 5, far);
      F(348, 52, 12, 5, far);
      F(420, 0, 6, 34, far);
      F(408, 30, 12, 5, far);
      F(426, 32, 14, 5, far);
      break;
    }
    case 3: {
      // aqueduct + broken column
      F(0, 56, 480, 12, far);
      for (let p = 0; p < 6; p++) F(14 + p * 80, 0, 18, 56, far);
      F(410, 0, 22, 44, far);
      F(406, 44, 30, 6, far);
      F(414, 50, 6, 6, far);
      F(424, 50, 6, 8, far);
      break;
    }
    case 4: {
      // castle
      F(120, 0, 240, 54, far);
      for (let m = 0; m < 12; m++) F(120 + m * 20, 54, 12, 8, far);
      F(120, 0, 30, 100, far);
      for (let m = 0; m < 2; m++) F(120 + m * 18, 100, 12, 8, far);
      F(330, 0, 30, 84, far);
      for (let m = 0; m < 2; m++) F(330 + m * 18, 84, 12, 8, far);
      F(222, 0, 26, 30, ink);
      F(222, 30, 26, 8, ink);
      // flag
      const fl = Math.sin(t * 6) > 0 ? 14 : 10;
      F(132, 108, 2, 20, far);
      ctx.fillStyle = pal.accent;
      ctx.fillRect(ox + 134, gy - 128, fl, 8);
      break;
    }
    case 5: {
      // factory + chimneys
      F(40, 0, 150, 62, far);
      for (let s = 0; s < 5; s++) F(40 + s * 30, 62, 22, 14, far);
      F(70, 0, 18, 128, far);
      F(160, 0, 14, 96, far);
      F(300, 0, 120, 46, far);
      F(320, 0, 16, 110, far);
      // smoke puffs
      ctx.fillStyle = mix(pal.far, "#ffffff", 0.3);
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 14 + i * 26) % 80);
        ctx.globalAlpha *= 1;
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * Math.max(0, 1 - ph / 80) * 0.8;
        ctx.fillRect(ox + 66 + i * 6, gy - 132 - ph, 12 + ph / 4, 10);
        ctx.globalAlpha = a;
      }
      break;
    }
    default: {
      // city skyline
      const towers: [number, number, number][] = [
        [30, 54, 120],
        [96, 70, 78],
        [178, 46, 150],
        [236, 66, 96],
        [316, 58, 128],
        [388, 76, 66],
      ];
      towers.forEach(([tx, tw, th], ti) => {
        F(tx, 0, tw, th, far);
        // windows
        for (let wy = 10; wy < th - 10; wy += 16) {
          for (let wx = 6; wx < tw - 8; wx += 14) {
            const on = hash(ti * 97 + wy * 13 + wx) > 0.45;
            const blink = hash(ti * 31 + wy + wx) > 0.93 && Math.sin(t * 2 + wx) > 0;
            if (on || blink) {
              ctx.fillStyle = blink ? pal.accent : pal.accent2;
              ctx.globalAlpha *= 1;
              const a = ctx.globalAlpha;
              ctx.globalAlpha = a * 0.85;
              ctx.fillRect(ox + tx + wx, gy - wy - 6, 5, 7);
              ctx.globalAlpha = a;
            }
          }
        }
      });
      // antenna
      F(198, 150, 3, 26, far);
      const blinkOn = t % 1 < 0.5;
      if (blinkOn) {
        ctx.fillStyle = pal.accent;
        ctx.fillRect(ox + 196, gy - 182, 6, 6);
      }
      break;
    }
  }
}

/* ---------------- ground ---------------- */

export function drawGround(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  groundY: number,
  pal: Palette,
  era: number,
  scroll: number
) {
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = pal.line;
  ctx.fillRect(0, groundY, W, 3);
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, groundY + 12, W, 2);
  ctx.globalAlpha = 1;

  const slot = 72;
  const base = Math.floor(scroll / slot);
  const shift = scroll % slot;
  for (let k = -1; k < W / slot + 2; k++) {
    const sx = k * slot - shift;
    const seed = base + k;
    const r1 = hash(seed);
    const r2 = hash(seed * 3.7);
    const dy = 8 + Math.floor(r1 * 3) * 6;
    ctx.fillStyle = mix(pal.ground, pal.line, 0.65);
    switch (era) {
      case 0:
      case 4:
        ctx.fillRect(sx + r2 * 40, groundY + dy, r1 > 0.5 ? 8 : 5, 4);
        ctx.fillRect(sx + 20 + r2 * 30, groundY + dy + 8, 6, 4);
        break;
      case 1: {
        ctx.fillStyle = mix(pal.accent2, pal.ground, 0.25);
        const gx = sx + r2 * 44;
        ctx.fillRect(gx, groundY + 3, 3, 10);
        ctx.fillRect(gx + 5, groundY + 3, 3, 14);
        ctx.fillRect(gx + 10, groundY + 3, 3, 8);
        break;
      }
      case 2:
        ctx.fillStyle = pal.accent;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(sx + r2 * 50, groundY + dy, 4, 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = mix(pal.ground, pal.line, 0.65);
        ctx.fillRect(sx + 24, groundY + dy + 6, 10, 3);
        break;
      case 3:
        // paving joints
        ctx.fillRect(sx + r2 * 30, groundY + 6, 2, 10);
        ctx.fillRect(sx + 34 + r2 * 20, groundY + 18, 2, 10);
        break;
      case 5:
        ctx.fillRect(sx + 8, groundY + 8, 4, 4);
        ctx.fillRect(sx + 44, groundY + 8, 4, 4);
        ctx.globalAlpha = 0.4;
        ctx.fillRect(sx + 60, groundY + 4, 2, 22);
        ctx.globalAlpha = 1;
        break;
      default: {
        if (seed % 2 === 0) {
          ctx.fillStyle = pal.accent2;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(sx + 16, groundY + 16, 30, 4);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = mix(pal.ground, pal.line, 0.65);
        ctx.fillRect(sx + r2 * 50, groundY + dy + 10, 5, 3);
        break;
      }
    }
  }
}

/* ---------------- player ---------------- */

export type PlayerPose = "run" | "jump" | "duck" | "dead";

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  hitX: number,
  groundY: number,
  era: number,
  pose: PlayerPose,
  frame: number,
  t: number,
  carried: PickupKind | null,
  blink: boolean,
  pal: Palette
) {
  const C = 4;
  const x = pose === "duck" ? hitX - 12 : hitX - 9;
  const yF = groundY;
  const ink = pal.ink;
  const acc = pal.accent;
  const acc2 = pal.accent2;
  const px = (cx: number, cy: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x + cx * C), Math.round(yF - (cy + h) * C), w * C, h * C);
  };
  const eye = blink ? ink : "#ffffff";

  if (pose === "duck") {
    // body
    px(2, 3, 8, 4, ink);
    px(9, 5, 4, 3, ink);
    px(12, 6, 1, 1, eye);
    // legs
    if (frame % 2 === 0) {
      px(3, 0, 1, 3, ink);
      px(3, 0, 2, 1, ink);
      px(7, 1, 1, 2, ink);
    } else {
      px(7, 0, 1, 3, ink);
      px(7, 0, 2, 1, ink);
      px(3, 1, 1, 2, ink);
    }
    // era headgear while ducking
    if (era === 1) {
      px(8, 8, 6, 1, acc);
      px(9, 9, 4, 1, acc);
    } else if (era === 2) px(9, 8, 4, 1, acc);
    else if (era === 3) px(9, 8, 4, 1, "#aab3bd");
    else if (era === 4) {
      px(9, 8, 4, 1, "#aab3bd");
      px(9, 9, 1, 2, acc);
    } else if (era === 5) px(8, 8, 6, 1, "#5a5f6a");
    else if (era === 6) {
      px(8, 5, 1, 3, "#2c3a63");
      px(9, 8, 4, 1, "#2c3a63");
    }
    return;
  }

  // ----- standing / running / jumping body -----
  // torso
  px(4, 5, 4, 5, ink);
  // head
  px(4, 10, 5, 4, ink);
  px(8, 12, 1, 1, eye);
  // arms
  const armY = pose === "run" && frame === 1 ? 8 : 7;
  px(8, armY, 2, 1, ink);

  // legs
  if (pose === "jump") {
    px(4, 1, 1, 4, ink);
    px(6, 1, 1, 4, ink);
    px(4, 0, 2, 1, ink);
    px(6, 0, 2, 1, ink);
  } else {
    const f = pose === "dead" ? 0 : frame % 3;
    if (f === 0) {
      px(6, 0, 1, 5, ink);
      px(6, 0, 2, 1, ink);
      px(3, 1, 1, 4, ink);
      px(2, 1, 1, 1, ink);
    } else if (f === 1) {
      px(5, 0, 1, 5, ink);
      px(6, 0, 1, 5, ink);
      px(4, 0, 2, 1, ink);
      px(6, 0, 2, 1, ink);
    } else {
      px(4, 0, 1, 5, ink);
      px(4, 0, 2, 1, ink);
      px(7, 1, 1, 4, ink);
      px(8, 1, 1, 1, ink);
    }
  }

  // ----- era gear -----
  if (era === 0) {
    px(4, 14, 1, 1, ink);
    px(6, 14, 1, 2, ink);
    px(8, 14, 1, 1, ink);
    px(4, 4, 4, 1, mix(ink, "#8a6238", 0.55));
    if (carried === "torch") {
      px(10, 7, 1, 5, "#7a5230");
      const f1 = Math.sin(t * 21) > -0.3;
      const f2 = Math.sin(t * 17 + 2) > 0;
      px(10, 12, 1, 2, "#ff4d2e");
      if (f1) px(9, 13, 1, 2, "#ff7a3d");
      if (f2) px(11, 13, 1, 1, "#ff7a3d");
      px(10, 14, 1, 1, "#ffd23f");
      // glow
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 13);
      ctx.fillStyle = "#ff9d3d";
      ctx.beginPath();
      ctx.arc(x + 42, yF - 58, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      px(10, 9, 1, 3, "#7a5230");
      px(9, 12, 3, 2, "#8a6238");
    }
  } else if (era === 1) {
    px(2, 14, 9, 1, acc);
    px(4, 15, 5, 2, acc);
    px(4, 9, 4, 1, mix(acc, ink, 0.4));
    if (carried === "plow") {
      px(0, 8, 3, 1, "#8a6238");
      px(-4, 5, 5, 1, "#8a6238");
      px(-6, 2, 2, 4, "#9aa5ad");
      px(-7, 1, 2, 2, "#9aa5ad");
    }
  } else if (era === 2) {
    px(4, 13, 5, 1, acc);
    px(8, 11, 1, 2, acc);
    if (carried === "sword") {
      px(10, 9, 1, 2, "#7a5230");
      px(9, 11, 3, 1, "#8a5a22");
      px(10, 12, 1, 4, "#e8e2cf");
      px(10, 16, 1, 1, "#ffffff");
    }
  } else if (era === 3) {
    px(4, 13, 5, 1, "#aab3bd");
    px(4, 10, 1, 3, "#aab3bd");
    px(3, 14, 7, 1, acc);
    px(4, 15, 5, 1, acc);
    px(5, 16, 3, 1, acc);
    // shield
    px(9, 4, 3, 6, acc);
    px(10, 6, 1, 2, acc2);
    if (carried === "scroll") {
      px(9, 11, 4, 2, "#efe6cf");
      px(8, 11, 1, 2, "#d8cfae");
      px(13, 11, 1, 2, "#d8cfae");
    }
  } else if (era === 4) {
    px(4, 13, 5, 1, "#aab3bd");
    px(4, 14, 1, 2, acc);
    px(5, 15, 1, 2, acc);
    px(6, 16, 1, 1, acc);
    // shield with cross
    px(9, 4, 3, 6, "#aab3bd");
    px(10, 4, 1, 6, acc);
    px(9, 6, 3, 1, acc);
    if (carried === "book") {
      px(9, 11, 4, 3, "#8f2b2b");
      px(10, 12, 2, 1, acc2);
    }
  } else if (era === 5) {
    px(3, 13, 6, 1, "#5a5f6a");
    px(9, 13, 2, 1, "#5a5f6a");
    px(5, 6, 1, 4, acc);
    px(7, 6, 1, 4, acc);
    if (carried === "cog") {
      const cxp = x + 42;
      const cyp = yF - 42;
      ctx.save();
      ctx.translate(cxp, cyp);
      ctx.rotate(t * 3);
      ctx.fillStyle = "#9aa5ad";
      for (let k = 0; k < 6; k++) {
        ctx.rotate(Math.PI / 3);
        ctx.fillRect(-3, -12, 6, 5);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      px(10, 7, 1, 3, "#9aa5ad");
      px(9, 10, 3, 1, "#9aa5ad");
    }
  } else {
    px(3, 9, 1, 5, "#2c3a63");
    px(4, 14, 5, 1, "#2c3a63");
    px(9, 10, 1, 4, "#2c3a63");
    // phone with glow
    px(9, 8, 2, 3, "#0c1322");
    const gl = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.fillStyle = acc;
    ctx.globalAlpha = 0.55 + 0.3 * gl;
    ctx.fillRect(x + 38, yF - 40, 4, 4);
    ctx.globalAlpha = 0.1 + 0.08 * gl;
    ctx.beginPath();
    ctx.arc(x + 40, yF - 38, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* ---------------- obstacles ---------------- */

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  kind: ObKind,
  x: number,
  groundY: number,
  pal: Palette,
  t: number,
  seed: number
) {
  const gy = groundY;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x - 2, gy - 2, 44, 4);
  const R = (rx: number, ry: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x + rx, gy - ry - h, w, h);
  };
  const rock = mix(pal.ink, pal.far, 0.45);
  const rockHi = mix(rock, "#ffffff", 0.28);
  switch (kind) {
    case "boulder": {
      const w = 36 + Math.floor(seed % 3) * 4;
      R(0, 0, w, 20, rock);
      R(4, 20, w - 10, 9, rock);
      R(10, 29, w - 22, 4, rock);
      R(3, 14, 8, 4, rockHi);
      R(w - 12, 6, 2, 10, pal.line);
      break;
    }
    case "boulder2": {
      R(0, 0, 24, 16, rock);
      R(3, 16, 18, 6, rock);
      R(2, 11, 6, 3, rockHi);
      R(24, 0, 30, 24, mix(rock, pal.ink, 0.2));
      R(28, 24, 22, 9, mix(rock, pal.ink, 0.2));
      R(34, 33, 12, 5, mix(rock, pal.ink, 0.2));
      R(27, 17, 8, 4, rockHi);
      R(44, 8, 2, 12, pal.line);
      break;
    }
    case "fire": {
      R(2, 0, 38, 7, "#6b4423");
      R(6, 5, 30, 5, "#7a5230");
      for (let i = 0; i < 5; i++) {
        const fh = 12 + Math.sin(t * 19 + i * 1.9 + seed) * 5 + (i === 2 ? 6 : 0);
        const fx = 8 + i * 6;
        R(fx, 8, 4, fh * 0.45, "#ff4d2e");
        R(fx, 8 + fh * 0.45, 4, fh * 0.35, "#ff7a3d");
        R(fx, 8 + fh * 0.8, 4, fh * 0.2, "#ffd23f");
      }
      ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 15 + seed);
      ctx.fillStyle = "#ff9d3d";
      ctx.beginPath();
      ctx.arc(x + 21, gy - 24, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case "root": {
      const rr = mix(pal.ground, pal.line, 0.5);
      R(0, 0, 64, 8, rr);
      R(10, 8, 10, 6, rr);
      R(34, 8, 12, 8, rr);
      R(52, 8, 6, 4, rr);
      R(0, 4, 64, 2, mix(rr, "#ffffff", 0.15));
      R(12, 12, 4, 3, rr);
      R(38, 14, 4, 3, rr);
      break;
    }
    case "stone": {
      R(2, 0, 26, 14, rock);
      R(6, 14, 18, 6, rock);
      R(5, 10, 6, 3, rockHi);
      break;
    }
    case "log": {
      R(2, 0, 54, 14, "#6b4423");
      R(2, 11, 54, 3, "#7a5230");
      for (let i = 0; i < 4; i++) R(10 + i * 12, 3, 2, 8, "#57371c");
      ctx.fillStyle = "#8a6238";
      ctx.beginPath();
      ctx.ellipse(x + 56, gy - 7, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a87e4a";
      ctx.beginPath();
      ctx.ellipse(x + 56, gy - 7, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "amphora": {
      const clay = "#c9803c";
      R(6, 0, 16, 20, clay);
      R(4, 4, 20, 12, clay);
      R(9, 20, 10, 9, clay);
      R(7, 29, 14, 4, clay);
      R(8, 33, 12, 3, "#a5642a");
      R(2, 18, 4, 9, "#a5642a");
      R(22, 18, 4, 9, "#a5642a");
      R(8, 8, 12, 3, pal.accent2);
      break;
    }
    case "column": {
      const st = mix(pal.accent2, pal.far, 0.2);
      R(0, 0, 30, 7, st);
      R(3, 7, 24, 36, st);
      R(3, 43, 28, 5, st);
      R(8, 10, 2, 30, mix(st, pal.line, 0.3));
      R(16, 10, 2, 30, mix(st, pal.line, 0.3));
      R(3, 48, 8, 4, st);
      R(15, 48, 10, 6, st);
      R(24, 12, 2, 24, mix(st, "#ffffff", 0.3));
      break;
    }
    case "barrel": {
      R(2, 0, 30, 32, "#7a5230");
      R(0, 4, 34, 24, "#7a5230");
      R(0, 24, 34, 3, pal.line);
      R(0, 9, 34, 3, pal.line);
      R(4, 27, 4, 5, "#8a6238");
      R(28, 4, 3, 24, mix("#7a5230", "#ffffff", 0.18));
      break;
    }
    case "gear": {
      ctx.save();
      ctx.translate(x + 20, gy - 20);
      ctx.rotate(t * 2.4 + seed);
      ctx.fillStyle = "#5a5f6a";
      for (let k = 0; k < 8; k++) {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -22, 8, 8);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.line;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "cone": {
      R(10, 28, 8, 6, "#ff8c42");
      R(7, 18, 14, 10, "#ff8c42");
      R(4, 8, 20, 10, "#ff8c42");
      R(0, 0, 28, 8, "#e06a24");
      R(6, 19, 16, 5, "#f2ede2");
      R(13, 30, 2, 3, mix("#ff8c42", "#ffffff", 0.35));
      break;
    }
    default: {
      // crate
      R(0, 0, 36, 36, "#3a4152");
      R(0, 32, 36, 4, "#2c3242");
      R(2, 2, 32, 2, "#4a5266");
      ctx.strokeStyle = "#4a5266";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, gy - 33);
      ctx.lineTo(x + 33, gy - 3);
      ctx.moveTo(x + 33, gy - 33);
      ctx.lineTo(x + 3, gy - 3);
      ctx.stroke();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(x + 8, gy - 26, 4, 4);
      ctx.fillRect(x + 24, gy - 26, 4, 4);
      break;
    }
  }
}

/* ---------------- flyers ---------------- */

export function drawFlyer(
  ctx: CanvasRenderingContext2D,
  kind: FlyKind,
  x: number,
  y: number,
  pal: Palette,
  t: number,
  seed: number
) {
  const flap = Math.floor(t * 9 + seed) % 2 === 0;
  const R = (rx: number, ry: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x + rx, y + ry, w, h);
  };
  switch (kind) {
    case "bird":
    case "crow": {
      const body = kind === "crow" ? pal.ink : mix(pal.ink, pal.far, 0.5);
      if (flap) R(10, -6, 16, 10, body);
      else R(10, 16, 16, 8, body);
      R(6, 6, 24, 10, body);
      R(0, 6, 8, 6, body);
      R(28, 2, 10, 10, body);
      R(38, 6, 6, 3, pal.accent2);
      R(32, 4, 2, 2, "#ffffff");
      break;
    }
    case "spear":
    case "arrow": {
      const shaft = kind === "spear" ? "#7a5230" : mix(pal.ink, "#ffffff", 0.2);
      R(8, 3, 34, 3, shaft);
      ctx.fillStyle = mix(pal.far, "#ffffff", 0.5);
      ctx.beginPath();
      ctx.moveTo(x + 52, y + 4);
      ctx.lineTo(x + 42, y);
      ctx.lineTo(x + 42, y + 8);
      ctx.closePath();
      ctx.fill();
      R(0, 0, 4, 8, pal.accent);
      R(4, 1, 4, 6, pal.accent);
      break;
    }
    default: {
      // drone
      R(10, 6, 24, 8, "#2c3a52");
      R(14, 14, 4, 4, pal.ink);
      R(26, 14, 4, 4, pal.ink);
      const rw = Math.floor(t * 30 + seed) % 2 === 0 ? 16 : 6;
      R(8 - rw / 2 + 2, 0, rw, 2, mix(pal.ink, "#ffffff", 0.3));
      R(34 - rw / 2 + 2, 0, rw, 2, mix(pal.ink, "#ffffff", 0.3));
      R(8, 2, 2, 5, pal.ink);
      R(34, 2, 2, 5, pal.ink);
      if (t % 0.8 < 0.4) R(20, 8, 3, 3, "#ff4d4d");
      R(26, 8, 3, 3, pal.accent);
      break;
    }
  }
}

/* ---------------- pickups ---------------- */

export function drawPickup(
  ctx: CanvasRenderingContext2D,
  kind: PickupKind,
  x: number,
  y: number,
  pal: Palette,
  t: number
) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  // glow rings
  ctx.globalAlpha = 0.1 + 0.06 * pulse;
  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.arc(x, y, 26 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.16 + 0.08 * pulse;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const C = 4;
  const px = (cx: number, cy: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x + cx * C - 2, y + cy * C - 2, w * C, h * C);
  };
  switch (kind) {
    case "torch": {
      px(0, -2, 1, 5, "#7a5230");
      px(-1, 2, 3, 1, "#e9e2cf");
      const f1 = Math.sin(t * 19) > -0.2;
      px(0, 3, 1, 2, "#ff4d2e");
      if (f1) px(-1, 4, 1, 2, "#ff7a3d");
      px(1, 4, 1, 1, "#ff7a3d");
      px(0, 5, 1, 1, "#ffd23f");
      break;
    }
    case "plow": {
      px(-3, -2, 6, 1, "#8a6238");
      px(2, -4, 1, 3, "#8a6238");
      px(-4, -1, 2, 3, "#9aa5ad");
      px(-5, 1, 2, 2, "#b8c2cc");
      break;
    }
    case "sword": {
      px(0, -5, 1, 1, "#ffffff");
      px(0, -4, 1, 5, "#e8e2cf");
      px(-1, 1, 3, 1, "#e6b93d");
      px(0, 2, 1, 2, "#7a5230");
      px(0, 4, 1, 1, "#e6b93d");
      break;
    }
    case "scroll": {
      px(-2, -2, 5, 4, "#efe6cf");
      px(-3, -3, 1, 6, "#d8cfae");
      px(3, -3, 1, 6, "#d8cfae");
      px(-1, -1, 3, 1, mix("#d8cfae", "#8a8266", 0.5));
      px(1, 1, 1, 1, "#c94040");
      break;
    }
    case "book": {
      px(-2, -2, 5, 4, "#8f2b2b");
      px(-2, -2, 1, 4, "#6e1f1f");
      px(2, -1, 1, 2, "#efe6cf");
      px(0, -1, 1, 1, "#e0b64b");
      break;
    }
    case "cog": {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 2.5);
      ctx.fillStyle = "#9aa5ad";
      for (let k = 0; k < 6; k++) {
        ctx.rotate(Math.PI / 3);
        ctx.fillRect(-3, -12, 6, 5);
      }
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    default: {
      px(-1, -3, 3, 6, "#0c1322");
      px(0, -2, 1, 3, pal.accent);
      px(0, 2, 1, 1, mix("#0c1322", "#ffffff", 0.3));
      const sig = Math.floor(t * 3) % 2;
      if (sig) px(2, -4, 1, 1, pal.accent);
      break;
    }
  }
}
