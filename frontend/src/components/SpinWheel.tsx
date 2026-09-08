import { useState } from "react";
import { Star } from "lucide-react";
import type { Row } from "@/lib/store";
import { pickWheelSegment } from "@/lib/qr-loyalty";

function segmentDisplay(segment: Row): string {
  const label = String(segment["label"] ?? "").trim();
  const type = String(segment["prizeType"] ?? "");
  const value = Number(segment["prizeValue"] ?? 0);
  if (type === "Bonus points" && value > 0) return `+${value}`;
  if (type === "Percentage discount" && value > 0) return `${value}%`;
  if (type === "Flat discount" && value > 0) return `₹${value}`;
  if (type === "No prize") return "Try again";
  return label || "Prize";
}

function segmentLines(text: string): [string] | [string, string] {
  if (text.length <= 8) return [text];
  const words = text.split(/\s+/);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }
  const split = Math.ceil(text.length / 2);
  return [text.slice(0, split), text.slice(split)];
}

export function SpinWheel({
  segments,
  disabled,
  onResult,
}: {
  segments: Row[];
  disabled?: boolean;
  onResult: (segment: Row) => void;
}) {
  const slices = segments.filter((s) => String(s["active"] ?? "Yes") !== "No");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const count = slices.length;
  const slice = count > 0 ? 360 / count : 0;

  function spin() {
    const won = pickWheelSegment(slices);
    if (!won) return;
    const idx = slices.findIndex((s) => String(s.id) === String(won.id));
    const target = 360 * 5 + (360 - idx * slice - slice / 2);
    setSpinning(true);
    setAngle((prev) => prev + target);
    window.setTimeout(() => {
      setSpinning(false);
      onResult(won);
    }, 2300);
  }

  return (
    <div className="flex justify-center py-2">
      <div
        className="relative aspect-square size-[min(100vw-2rem,22rem)] max-w-[22rem]"
        style={{ fontSize: "calc(min(100vw - 2rem, 22rem) / 20)" }}
      >
        {/* Pointer */}
        <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2" aria-hidden>
          <div className="mx-auto size-0 border-x-[11px] border-x-transparent border-t-[20px] border-t-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
          <div className="mx-auto -mt-0.5 size-2.5 rounded-full bg-red-600 ring-2 ring-white" />
        </div>

        {/* Rotating wheel */}
        <div
          className="absolute inset-[0.65rem] rounded-full border-[7px] border-zinc-300 bg-zinc-400 shadow-[inset_0_0_14px_rgba(0,0,0,0.22),0_10px_28px_rgba(0,0,0,0.18)] transition-transform ease-out"
          style={{
            transform: `rotate(${angle}deg)`,
            transitionDuration: spinning ? "2.2s" : "0s",
          }}
        >
          <div
            className="absolute inset-1 overflow-hidden rounded-full"
            style={{
              background:
                count === 0
                  ? "hsl(var(--muted))"
                  : `conic-gradient(from -90deg, ${slices
                      .map((s, i) => {
                        const start = (i / count) * 360;
                        const end = ((i + 1) / count) * 360;
                        return `${String(s["colorHex"] || "#64748b")} ${start}deg ${end}deg`;
                      })
                      .join(", ")})`,
            }}
          />

          {/* Rim studs on segment dividers */}
          {slices.map((s, i) => (
            <div
              key={`stud-${String(s.id)}`}
              className="absolute left-1/2 top-1/2 z-10 origin-center"
              style={{ transform: `rotate(${i * slice - 90}deg) translateY(-9.1em)` }}
            >
              <div className="size-2.5 -translate-x-1/2 rounded-full border border-zinc-500/80 bg-gradient-to-b from-zinc-50 to-zinc-400 shadow-sm" />
            </div>
          ))}

          {/* Prize labels — upright text, icon + value */}
          {slices.map((s, i) => {
            const mid = i * slice + slice / 2 - 90;
            const text = segmentDisplay(s);
            const lines = segmentLines(text);
            return (
              <div
                key={String(s.id)}
                className="absolute left-1/2 top-1/2 z-10 origin-center"
                style={{ transform: `rotate(${mid}deg) translateY(-6.6em)` }}
              >
                <div
                  className="flex -translate-x-1/2 flex-col items-center gap-0.5"
                  style={{ transform: `rotate(${-mid}deg)` }}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 shadow-[0_2px_4px_rgba(0,0,0,0.25)] ring-1 ring-amber-700/40">
                    <Star className="size-3.5 fill-amber-50 text-amber-900" strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col items-center leading-none">
                    {lines.map((line) => (
                      <span
                        key={line}
                        className="text-center text-[10px] font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center SPIN button */}
        <button
          type="button"
          disabled={disabled || spinning || count === 0}
          onClick={spin}
          className="absolute left-1/2 top-1/2 z-20 flex size-[4.75em] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[0.2em] border-amber-800/50 bg-gradient-to-b from-amber-50 via-amber-200 to-amber-400 text-[0.85em] font-extrabold tracking-[0.18em] text-amber-950 shadow-[0_4px_14px_rgba(0,0,0,0.3),inset_0_2px_6px_rgba(255,255,255,0.7)] transition-transform hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          aria-label={spinning ? "Spinning" : "Spin the wheel"}
        >
          {spinning ? "…" : "SPIN"}
        </button>
      </div>
    </div>
  );
}
