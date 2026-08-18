/* Tiny WebAudio chip-tune sfx. Context is created lazily on first user gesture. */

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem("hr-muted") === "1";
} catch {
  /* ignore */
}

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.05,
  slideTo?: number,
  delay = 0
) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  try {
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  isMuted: () => muted,
  setMuted(m: boolean) {
    muted = m;
    try {
      localStorage.setItem("hr-muted", m ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
  jump() {
    tone(300, 0.13, "square", 0.045, 590);
  },
  land() {
    tone(170, 0.06, "square", 0.028, 120);
  },
  pickup() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.11, "square", 0.045, undefined, i * 0.07)
    );
  },
  era() {
    [392, 523, 659, 880].forEach((f, i) =>
      tone(f, 0.16, "triangle", 0.06, undefined, i * 0.09)
    );
  },
  crash() {
    tone(220, 0.32, "sawtooth", 0.07, 42);
    tone(96, 0.36, "square", 0.05, 30, 0.02);
  },
  click() {
    tone(680, 0.05, "square", 0.03);
  },
};
