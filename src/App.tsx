import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createGame, type GameEvent, type GameHandle } from "./game/engine";
import { ERAS, ROMAN, TRIVIA } from "./game/eras";
import { sfx } from "./game/audio";

/* ------------------------------------------------------------------ */
/* icons                                                               */
/* ------------------------------------------------------------------ */

const ICONS: Record<string, React.ReactNode> = {
  flame: (
    <path d="M12 3c1.8 2.7 4.5 4.7 4.5 8a4.5 4.5 0 0 1-9 0c0-1.9.8-3.3 1.9-4.8.5 1 1.2 1.6 1.9 1.8C11 6.6 11.2 4.9 12 3z" />
  ),
  plow: (
    <path d="M4 20C11 20 16.5 15 18 7M18 7l2.5-3M18 7l3 2.5M4 20l3.5-3.5M7.5 16.5l2 2" />
  ),
  sword: (
    <path d="M19 3l2 2-9.5 9.5M5 21l-2-2 4.5-4.5M7 13.5l3.5 3.5M19 3h-4.5M19 3v4.5" />
  ),
  column: (
    <path d="M5 21h14M6.5 18h11M8.5 18V8M12 18V8M15.5 18V8M5 8h14M7 4h10l-1.2 4H8.2L7 4z" />
  ),
  book: (
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7M9 10.5h5" />
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" />
    </>
  ),
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" />
      <path d="M9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" />
      <rect x="10.5" y="10.5" width="3" height="3" />
    </>
  ),
  sound: (
    <path d="M4 10v4h4l5 4V6L8 10H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  ),
  soundOff: (
    <path d="M4 10v4h4l5 4V6L8 10H4zM16.5 9.5l5 5M21.5 9.5l-5 5" />
  ),
  play: <path d="M7 4.5l12 7.5-12 7.5z" />,
  retry: <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3M3.5 4.5V9H8" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11M12 14.5v2" />
    </>
  ),
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 5H4.5A3.5 3.5 0 0 0 8 8.5M16 5h3.5A3.5 3.5 0 0 1 16 8.5M12 13v3.5M8.5 21h7M10 16.5h4l.8 4.5H9.2l.8-4.5z" />
  ),
  spark: (
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
  ),
};

const ERA_ICONS = ["flame", "plow", "sword", "column", "book", "gear", "chip"];

function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

/* tiny pixel-art logo: a running hominid */
function Logo({ accent }: { accent: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 16 16" className="shrink-0">
      <rect x="8" y="1" width="4" height="4" fill="currentColor" />
      <rect x="11" y="2" width="1" height="1" fill="#fff" />
      <rect x="7" y="5" width="5" height="5" fill="currentColor" />
      <rect x="12" y="6" width="2" height="1" fill="currentColor" />
      <rect x="5" y="6" width="2" height="1" fill="currentColor" />
      <rect x="8" y="10" width="2" height="3" fill="currentColor" />
      <rect x="11" y="10" width="2" height="2" fill="currentColor" />
      <rect x="12" y="3" width="1" height="4" fill={accent} />
      <rect x="12" y="1" width="1" height="2" fill={accent} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* scroll reveal wrapper                                               */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* app                                                                 */
/* ------------------------------------------------------------------ */

type UiPhase = "ready" | "playing" | "over";

interface OverInfo {
  score: number;
  best: number;
  newBest: boolean;
  era: number;
  facts: number[];
  trivia: string;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const keyRef = useRef(0);

  const [phase, setPhase] = useState<UiPhase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [eraIdx, setEraIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [banner, setBanner] = useState<{ idx: number; key: number } | null>(null);
  const [plaque, setPlaque] = useState<{ idx: number; key: number } | null>(null);
  const [over, setOver] = useState<OverInfo | null>(null);
  const [muted, setMuted] = useState(sfx.isMuted());
  const [chronicle, setChronicle] = useState<number[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("hr-facts") || "[]");
      return Array.isArray(v) ? v.filter((n) => typeof n === "number") : [];
    } catch {
      return [];
    }
  });
  const [resetArm, setResetArm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("hr-facts", JSON.stringify(chronicle));
    } catch {
      /* ignore */
    }
  }, [chronicle]);

  const onEvent = useCallback((e: GameEvent) => {
    switch (e.type) {
      case "ui":
        setScore(e.score);
        setBest(e.best);
        setEraIdx(e.era);
        setProgress(e.progress);
        break;
      case "start":
        setPhase("playing");
        setOver(null);
        setPlaque(null);
        break;
      case "era":
        setBanner({ idx: e.index, key: ++keyRef.current });
        break;
      case "fact":
        setPlaque({ idx: e.index, key: ++keyRef.current });
        setChronicle((prev) =>
          prev.includes(e.index) ? prev : [...prev, e.index]
        );
        break;
      case "over":
        setPhase("over");
        setOver({
          score: e.score,
          best: e.best,
          newBest: e.newBest,
          era: e.era,
          facts: e.facts,
          trivia: TRIVIA[Math.floor(Math.random() * TRIVIA.length)],
        });
        break;
    }
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const g = createGame(cv, onEvent);
    gameRef.current = g;
    return () => g.destroy();
  }, [onEvent]);

  // banner / plaque auto-hide
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(t);
  }, [banner]);
  useEffect(() => {
    if (!plaque) return;
    const t = setTimeout(() => setPlaque(null), 4400);
    return () => clearTimeout(t);
  }, [plaque]);

  const era = ERAS[eraIdx];
  const acc = era.palette.accent;
  const acc2 = era.palette.accent2;

  const cssVars = {
    "--acc": acc,
    "--acc2": acc2,
  } as CSSProperties;

  const timeline = useMemo(
    () =>
      ERAS.map((e, i) => {
        const fill = i < eraIdx ? 100 : i === eraIdx ? progress * 100 : 0;
        return { e, i, fill };
      }),
    [eraIdx, progress]
  );

  return (
    <div
      style={cssVars}
      className="relative min-h-screen overflow-hidden font-body"
    >
      {/* ambient background */}
      <div
        className="pointer-events-none fixed inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(900px 480px at 85% -10%, ${acc}26, transparent 65%), radial-gradient(800px 500px at -10% 110%, ${acc2}1f, transparent 60%)`,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-3 sm:px-6">
        {/* ---------------- HUD ---------------- */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 sm:py-5">
          <div className="flex items-center gap-2.5 text-chalk">
            <span style={{ color: acc }} className="transition-colors duration-700">
              <Logo accent={acc} />
            </span>
            <div className="leading-tight">
              <div className="pixel-title text-[11px] sm:text-[13px] tracking-wide">
                ХОМО РАННЕР
              </div>
              <div className="text-[11px] text-fog">бег сквозь историю</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div
              className="pixel-title hidden items-center gap-2 border-2 px-2.5 py-1.5 text-[9px] transition-colors duration-700 sm:flex"
              style={{ borderColor: acc, color: acc }}
            >
              <Icon name={ERA_ICONS[eraIdx]} size={14} />
              <span>
                ЭРА {era.numeral} · {era.name.toUpperCase()}
              </span>
            </div>
            <div className="text-right leading-tight">
              <div className="pixel-title text-[13px] sm:text-[15px] tabular-nums text-chalk">
                {String(score).padStart(5, "0")}
              </div>
              <div className="flex items-center justify-end gap-1 text-[11px] text-fog">
                <Icon name="trophy" size={12} />
                <span className="tabular-nums">{best}</span>
              </div>
            </div>
            <button
              onClick={() => {
                const m = !muted;
                setMuted(m);
                sfx.setMuted(m);
              }}
              className="border-2 border-line p-2 text-fog transition-colors hover:border-fog hover:text-chalk"
              aria-label={muted ? "Включить звук" : "Выключить звук"}
              title={muted ? "Включить звук" : "Выключить звук"}
            >
              <Icon name={muted ? "soundOff" : "sound"} size={16} />
            </button>
          </div>
        </header>

        {/* ---------------- timeline ---------------- */}
        <div className="mb-3 flex gap-1">
          {timeline.map(({ e, i, fill }) => {
            const active = i === eraIdx;
            const done = i < eraIdx;
            return (
              <div
                key={e.id}
                className="era-seg relative flex-1 border px-1 py-1.5 sm:px-2"
                style={{
                  borderColor: active || done ? acc : "#322c45",
                  background: active ? `${acc}1a` : "transparent",
                  color: active ? acc : done ? "#c9c3d6" : "#6f6984",
                }}
                title={`${e.numeral} · ${e.name}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="pixel-title text-[8px] sm:text-[9px]">
                    {e.numeral}
                  </span>
                  <span className="hidden text-[10px] font-medium lg:inline">
                    {e.short}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full bg-[#2a2540]">
                  <div
                    className="h-full transition-[width] duration-300"
                    style={{
                      width: `${fill}%`,
                      background: done || active ? acc : "#3a3450",
                    }}
                  />
                </div>
                {active && (
                  <div
                    className="animate-glow absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45"
                    style={{ background: acc }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ---------------- game frame ---------------- */}
        <div className="relative">
        <div className="game-frame scanlines relative h-[clamp(240px,36vw,420px)] w-full overflow-hidden bg-void">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "contain", objectPosition: "center" }}
            onPointerDown={() => gameRef.current?.press()}
            onPointerUp={() => gameRef.current?.release()}
            onPointerLeave={() => gameRef.current?.release()}
          />

          {/* era banner */}
          {banner && (
            <div
              key={banner.key}
              className="animate-banner pointer-events-none absolute left-1/2 top-3 z-20 w-[92%] -translate-x-1/2 text-center sm:top-5"
            >
              <div
                className="pixel-title pixel-shadow inline-block px-3 py-2 text-[11px] sm:text-[15px]"
                style={{ color: ERAS[banner.idx].palette.accent }}
              >
                ЭРА {ERAS[banner.idx].numeral} — {ERAS[banner.idx].name.toUpperCase()}
              </div>
              <div className="pixel-shadow mx-auto mt-1 w-fit bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white/90 sm:text-[13px]">
                {ERAS[banner.idx].tagline}
              </div>
            </div>
          )}

          {/* fact plaque */}
          {plaque && (
            <div
              key={plaque.key}
              className="animate-plaque absolute bottom-2 right-2 z-20 w-[min(330px,86%)] border-2 bg-[#16131fee] shadow-[6px_6px_0_rgba(0,0,0,0.4)]"
              style={{ borderColor: ERAS[plaque.idx].palette.accent }}
            >
              <div
                className="pixel-title flex items-center gap-2 px-3 py-1.5 text-[8px]"
                style={{
                  background: ERAS[plaque.idx].palette.accent,
                  color: "#14121a",
                }}
              >
                <Icon name={ERA_ICONS[plaque.idx]} size={13} />
                {ERAS[plaque.idx].fact.year.toUpperCase()}
              </div>
              <div className="px-3 py-2">
                <div className="text-[13px] font-bold text-chalk">
                  {ERAS[plaque.idx].fact.title}
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-fog">
                  {ERAS[plaque.idx].fact.text}
                </p>
                <div
                  className="mt-1.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: ERAS[plaque.idx].palette.accent }}
                >
                  ▸ записано в летопись
                </div>
              </div>
            </div>
          )}

          {/* start overlay */}
          {phase === "ready" && (
            <div
              className="absolute inset-0 z-30 flex cursor-pointer items-end bg-gradient-to-t from-black/80 via-black/35 to-black/5"
              onPointerDown={() => gameRef.current?.press()}
            >
              <div className="w-full p-3 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                  <div className="animate-rise">
                    <div
                      className="pixel-title pixel-shadow text-[17px] leading-tight sm:text-[26px]"
                      style={{ color: acc }}
                    >
                      ХОМО РАННЕР
                    </div>
                    <p className="mt-2 max-w-md text-[11px] leading-snug text-white/85 sm:text-[13px]">
                      Путь человечества от первого камня до смартфона — в одном
                      забеге. Семь эпох, семь великих открытий. Перепрыгивай
                      препятствия и подбирай реликвии прогресса.
                    </p>
                  </div>
                  <button
                    className="chunky-btn animate-rise flex items-center gap-2.5 px-5 py-3.5"
                    style={{ color: acc, background: "#14121acc", animationDelay: "0.1s" }}
                  >
                    <Icon name="play" size={14} />
                    СТАРТ
                  </button>
                </div>
                <div
                  className="animate-rise mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/70"
                  style={{ animationDelay: "0.18s" }}
                >
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <span className="keycap">SPACE</span> прыжок
                  </span>
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <span className="keycap">↓</span> пригнуться
                  </span>
                  <span className="sm:hidden">
                    на телефоне — кнопки «прыжок» и «пригнуться» под экраном
                  </span>
                  <span
                    className="animate-blink pixel-title ml-auto hidden text-[8px] sm:inline"
                    style={{ color: acc }}
                  >
                    НАЖМИ SPACE
                  </span>
                </div>
                <div
                  className="animate-rise mt-3 hidden gap-1 overflow-x-auto pb-0.5 sm:flex"
                  style={{ animationDelay: "0.26s" }}
                >
                  {ERAS.map((e, i) => (
                    <div
                      key={e.id}
                      className="flex shrink-0 items-center gap-1.5 border border-white/20 bg-black/30 px-2 py-1 text-[10px] text-white/75"
                    >
                      <span style={{ color: e.palette.accent }}>
                        <Icon name={ERA_ICONS[i]} size={12} />
                      </span>
                      <span className="pixel-title text-[7px]">{e.numeral}</span>
                      {e.short}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

          {/* game over overlay */}
          {phase === "over" && over && (
            <div
              className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/60 p-3"
              onPointerDown={() => gameRef.current?.press()}
            >
              <div
                className="animate-rise max-h-[86vh] w-full max-w-md overflow-y-auto border-2 bg-[#16131f] p-4 shadow-[8px_8px_0_rgba(0,0,0,0.45)] sm:p-5"
                style={{ borderColor: ERAS[over.era].palette.accent }}
                onPointerDown={(ev) => ev.stopPropagation()}
              >
                <div className="pixel-title text-[12px] text-white/60 sm:text-[13px]">
                  ЗАБЕГ ОКОНЧЕН
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <div
                      className="pixel-title text-[20px] tabular-nums sm:text-[26px]"
                      style={{ color: ERAS[over.era].palette.accent }}
                    >
                      {String(over.score).padStart(5, "0")}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-fog">
                      <Icon name="trophy" size={13} />
                      рекорд {over.best}
                      {over.newBest && (
                        <span
                          className="pixel-title ml-1 px-1.5 py-0.5 text-[7px] text-[#14121a]"
                          style={{ background: acc2 }}
                        >
                          НОВЫЙ РЕКОРД
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[12px] leading-snug text-fog">
                    добежал до
                    <div className="font-bold text-chalk">
                      Эра {ROMAN[over.era]} · {ERAS[over.era].name}
                    </div>
                    <div className="text-[11px]">
                      открытий за забег: {over.facts.length} / 7
                    </div>
                  </div>
                </div>

                {over.facts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {over.facts.map((f) => (
                      <span
                        key={f}
                        className="flex items-center gap-1.5 border px-2 py-1 text-[10px]"
                        style={{
                          borderColor: ERAS[f].palette.accent,
                          color: ERAS[f].palette.accent,
                        }}
                      >
                        <Icon name={ERA_ICONS[f]} size={12} />
                        {ERAS[f].fact.title}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 border border-dashed border-line bg-black/25 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fog">
                    <Icon name="spark" size={12} className="text-[#ffd23f]" />
                    А знаете ли вы?
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-chalk/90">
                    {over.trivia}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    className="chunky-btn flex items-center gap-2 px-4 py-3 text-[#14121a]"
                    style={{ background: acc, borderColor: "#14121a" }}
                    onClick={() => gameRef.current?.start()}
                  >
                    <Icon name="retry" size={13} />
                    ЕЩЁ РАЗ
                  </button>
                  <span className="text-[11px] text-fog">
                    или нажмите <span className="keycap">SPACE</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* touch controls */}
        <div className="mt-3 grid grid-cols-2 gap-3 md:hidden">
          <button
            className="chunky-btn py-4 text-[10px]"
            style={{ color: acc }}
            onPointerDown={(e) => {
              e.preventDefault();
              gameRef.current?.press();
            }}
            onPointerUp={() => gameRef.current?.release()}
            onPointerLeave={() => gameRef.current?.release()}
          >
            ▲ ПРЫЖОК
          </button>
          <button
            className="chunky-btn py-4 text-[10px]"
            style={{ color: acc2 }}
            onPointerDown={(e) => {
              e.preventDefault();
              gameRef.current?.setDuck(true);
            }}
            onPointerUp={() => gameRef.current?.setDuck(false)}
            onPointerLeave={() => gameRef.current?.setDuck(false)}
          >
            ▼ ПРИГНУТЬСЯ
          </button>
        </div>

        {/* ---------------- chronicle ---------------- */}
        <section className="mt-10 sm:mt-14">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="pixel-title text-[10px]" style={{ color: acc }}>
                  ЛЕТОПИСЬ ОТКРЫТИЙ
                </div>
                <h2 className="mt-2 text-2xl font-bold leading-tight text-chalk sm:text-3xl">
                  Соберите все 7 реликвий прогресса
                </h2>
                <p className="mt-1 max-w-xl text-[13px] text-fog">
                  Реликвия подбирается на бегу — факт сохраняется в летописи
                  навсегда, даже если забег оборвался. Прогресс:{" "}
                  <span className="font-bold text-chalk">
                    {chronicle.length} / 7
                  </span>
                </p>
              </div>
              <div className="flex h-2 w-full max-w-[240px] overflow-hidden border border-line">
                {ERAS.map((e, i) => (
                  <div
                    key={e.id}
                    className="h-full flex-1 transition-colors duration-500"
                    style={{
                      background: chronicle.includes(i)
                        ? e.palette.accent
                        : "#241f33",
                    }}
                  />
                ))}
              </div>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ERAS.map((e, i) => {
              const got = chronicle.includes(i);
              return (
                <Reveal key={e.id} delay={(i % 3) * 90}>
                  {got ? (
                    <article
                      className="group h-full border-2 bg-panel p-4 transition-transform duration-200 hover:-translate-y-1"
                      style={{ borderColor: e.palette.accent }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="flex items-center gap-2 text-[12px]"
                          style={{ color: e.palette.accent }}
                        >
                          <Icon name={ERA_ICONS[i]} size={16} />
                          <span className="font-semibold">{e.fact.year}</span>
                        </span>
                        <span className="pixel-title text-[8px] text-fog">
                          ЭРА {e.numeral}
                        </span>
                      </div>
                      <h3 className="mt-2 text-[15px] font-bold text-chalk">
                        {e.fact.title}
                      </h3>
                      <p className="mt-1 text-[12.5px] leading-snug text-fog">
                        {e.fact.text}
                      </p>
                    </article>
                  ) : (
                    <article className="flex h-full flex-col border-2 border-dashed border-line bg-panel/40 p-4">
                      <div className="flex items-center justify-between text-fog">
                        <span className="flex items-center gap-2 text-[12px]">
                          <Icon name="lock" size={15} />
                          <span>Реликвия не найдена</span>
                        </span>
                        <span className="pixel-title text-[8px]">
                          ЭРА {e.numeral}
                        </span>
                      </div>
                      <h3 className="mt-2 text-[15px] font-bold text-fog">
                        {e.name}
                      </h3>
                      <p className="mt-1 text-[12.5px] leading-snug text-fog/70">
                        Добегите до эпохи «{e.name}» и подберите реликвию —
                        «{e.fact.title.toLowerCase()}».
                      </p>
                      <div
                        className="pixel-title mt-auto pt-3 text-[8px]"
                        style={{ color: e.palette.accent }}
                      >
                        {e.tagline.toUpperCase()}
                      </div>
                    </article>
                  )}
                </Reveal>
              );
            })}

            {/* reset card */}
            <Reveal delay={90}>
              <div className="flex h-full flex-col items-start justify-center border-2 border-line bg-panel/40 p-4">
                <div className="text-[12.5px] leading-snug text-fog">
                  Летопись хранится в этом браузере. Хотите начать историю с
                  чистого листа?
                </div>
                <button
                  onClick={() => {
                    if (!resetArm) {
                      setResetArm(true);
                      setTimeout(() => setResetArm(false), 2600);
                      return;
                    }
                    setChronicle([]);
                    setResetArm(false);
                    sfx.click();
                  }}
                  className="chunky-btn mt-3 px-3 py-2.5 text-[9px]"
                  style={{ color: resetArm ? "#ff6b6b" : "#8f89a3" }}
                >
                  {resetArm ? "ТОЧНО СТЕРЕТЬ?" : "СТЕРЕТЬ ЛЕТОПИСЬ"}
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- footer ---------------- */}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-[11.5px] text-fog">
          <div className="flex items-center gap-2">
            <Icon name="spark" size={13} className="text-[#ffd23f]" />
            Факты упрощены для забега, но честны. Оммаж T-Rex Runner из Chrome.
          </div>
          <div className="flex items-center gap-3">
            <span className="keycap">SPACE</span>
            <span>прыжок</span>
            <span className="keycap">↓</span>
            <span>присесть</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
