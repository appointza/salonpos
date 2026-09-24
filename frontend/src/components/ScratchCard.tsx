import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ScratchCardProps = {
  prizeLabel: string;
  brandName?: string;
  disabled?: boolean;
  completed?: boolean;
  onBegin: () => string | null | Promise<string | null>;
  onRevealed?: (label: string) => void;
};

function scratchPercent(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) transparent++;
  }
  return transparent / (w * h);
}

function paintMetallicFoil(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#8f8f8f");
  gradient.addColorStop(0.18, "#d8d8d8");
  gradient.addColorStop(0.42, "#ffffff");
  gradient.addColorStop(0.58, "#ececec");
  gradient.addColorStop(0.78, "#a8a8a8");
  gradient.addColorStop(1, "#707070");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = Math.random() * 0.22;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 0.35})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }

  ctx.save();
  ctx.globalAlpha = 0.14;
  for (let offset = -height; offset < width + height; offset += 7) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + height * 0.55, height);
    ctx.stroke();
  }
  ctx.restore();

  const band = ctx.createLinearGradient(0, height * 0.35, 0, height * 0.65);
  band.addColorStop(0, "rgba(255,255,255,0)");
  band.addColorStop(0.5, "rgba(255,255,255,0.45)");
  band.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(55,55,55,0.55)";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.28em";
  ctx.fillText("SCRATCH HERE", width / 2, height / 2 + 4);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, width - 20, height - 20);
}

export function ScratchCard({ prizeLabel, brandName, disabled, completed, onBegin, onRevealed }: ScratchCardProps) {
  const serial = useId().replace(/:/g, "").slice(0, 8).toUpperCase();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [localLabel, setLocalLabel] = useState(prizeLabel);
  const beganRef = useRef(false);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (prizeLabel) setLocalLabel(prizeLabel);
  }, [prizeLabel]);

  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    paintMetallicFoil(ctx, rect.width, rect.height);
  }, []);

  useEffect(() => {
    if (!completed && !revealed) paintFoil();
  }, [paintFoil, completed, revealed, prizeLabel]);

  useEffect(() => {
    if (completed) setRevealed(true);
  }, [completed]);

  function scratchAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || revealed || disabled) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = "destination-out";

    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      ctx.arc(x, y, 26 - r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const pct = scratchPercent(ctx, canvas.width, canvas.height);
    if (pct >= 0.38) {
      setRevealed(true);
      onRevealed?.(localLabel || prizeLabel);
    }
  }

  function beginIfNeeded() {
    if (beganRef.current || disabled || revealed) return;
    void Promise.resolve(onBegin()).then((label) => {
      if (!label || beganRef.current) return;
      setLocalLabel(label);
      beganRef.current = true;
      setActive(true);
    });
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || revealed) return;
    beginIfNeeded();
    drawingRef.current = true;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    scratchAt(e.clientX, e.clientY);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled || revealed) return;
    scratchAt(e.clientX, e.clientY);
  }

  function onPointerUp() {
    drawingRef.current = false;
  }

  const displayLabel = localLabel || prizeLabel || "Your prize";

  return (
    <div className="mx-auto w-full max-w-md">
      <div
        className={cn(
          "scratch-ticket relative overflow-hidden rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]",
          disabled && "opacity-60",
        )}
      >
        <div className="absolute inset-x-6 top-0 z-20 flex -translate-y-1/2 justify-between">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="size-3 rounded-full bg-background shadow-inner" />
          ))}
        </div>
        <div className="absolute inset-x-6 bottom-0 z-20 flex translate-y-1/2 justify-between">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="size-3 rounded-full bg-background shadow-inner" />
          ))}
        </div>

        <div className="border border-amber-500/40 bg-gradient-to-b from-amber-600 via-amber-500 to-amber-700 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold tracking-[0.35em] text-amber-50/90 uppercase">Lucky scratch</p>
          {brandName ? (
            <p className="mt-0.5 font-display text-sm font-medium tracking-wide text-white">{brandName}</p>
          ) : null}
        </div>

        <div
          ref={wrapRef}
          className="relative aspect-[5/3] overflow-hidden border-x border-amber-500/30 bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-amber-200/70"
                style={{
                  top: `${8 + (i * 17) % 82}%`,
                  left: `${4 + (i * 23) % 90}%`,
                  width: `${10 + (i % 3) * 4}px`,
                  height: `${10 + (i % 3) * 4}px`,
                  opacity: 0.15 + (i % 5) * 0.12,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div
              className={cn(
                "flex flex-col items-center transition-all duration-700",
                revealed ? "scale-100 opacity-100" : "scale-95 opacity-90",
              )}
            >
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 shadow-[0_8px_24px_rgba(251,191,36,0.45)] ring-2 ring-amber-100/50">
                <Gift className="size-7 text-amber-950" strokeWidth={1.75} />
              </div>
              <p className="text-[10px] font-semibold tracking-[0.25em] text-amber-200/80 uppercase">You won</p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-3xl">
                {displayLabel}
              </p>
              <p className="mt-2 text-xs text-violet-200/75">Show this at checkout to redeem</p>
            </div>
          </div>

          {!revealed ? (
            <>
              <canvas
                ref={canvasRef}
                className={cn(
                  "absolute inset-0 z-10 touch-none",
                  active ? "cursor-grabbing" : "cursor-grab scratch-foil-shimmer",
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                aria-label="Scratch card — rub to reveal your prize"
              />
              {!active && !disabled ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="scratch-coin-hint flex size-16 items-center justify-center rounded-full border-2 border-white/50 bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 shadow-lg">
                    <span className="text-lg font-bold text-amber-950">₹</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="scratch-confetti absolute block size-2 rounded-sm"
                  style={{
                    left: `${(i * 41) % 100}%`,
                    top: `${(i * 29) % 100}%`,
                    backgroundColor: ["#fbbf24", "#a78bfa", "#f472b6", "#34d399", "#60a5fa"][i % 5],
                    animationDelay: `${i * 0.04}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border border-t-0 border-amber-500/30 bg-amber-950/90 px-4 py-2.5 text-[10px] text-amber-100/80">
          <span>#{serial}</span>
          <span className="tracking-wide uppercase">One per day · Valid today</span>
        </div>
      </div>

      {!active && !revealed && !disabled ? (
        <p className="mt-3 text-center text-xs font-medium tracking-wide text-muted-foreground">
          Use your finger or mouse to scratch the silver foil
        </p>
      ) : null}
    </div>
  );
}
