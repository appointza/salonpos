import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArcElement, Chart, PieController } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import type { Context as DataLabelsContext } from "chartjs-plugin-datalabels";
import type { Row } from "@/store";
import { pickWheelSegment } from "@/pages/LoyaltyQr/qr-loyalty";
import { PRIZE_COLOURS } from "@/pages/PrizeWheel/prize-colours";
import { uniquePrizeCatalog } from "@/pages/PrizeWheel/prize-help";
import { pickTierWeightedReward, offerAvailWithinMessage, type TierWeights } from "@/pages/PrizeWheel/reward-distribution";
import { cn } from "@/utils/utils";

Chart.register(ArcElement, PieController, ChartDataLabels);

const DEFAULT_COLORS = PRIZE_COLOURS.map((c) => c.value);

function segmentDisplay(segment: Row): string {
  const label = String(segment["label"] ?? "").trim();
  const type = String(segment["prizeType"] ?? "");
  const value = Number(segment["prizeValue"] ?? 0);
  if (type === "Bonus points" && value > 0) return `+${value} pts`;
  if (type === "Percentage discount" && value > 0) return `${value}% off`;
  if (type === "Flat discount" && value > 0) return `₹${value} off`;
  if (type === "No prize") return "Try again";
  return label || "Prize";
}

function wrapPrizeLabel(text: string, sliceCount: number): string {
  const maxChars = sliceCount <= 4 ? 12 : sliceCount <= 6 ? 9 : sliceCount <= 8 ? 8 : 6;
  const lines: string[] = [];
  let current = "";
  const words = text.trim().split(/\s+/).flatMap((word) => {
    if (word.length <= maxChars) return [word];
    const chunks: string[] = [];
    for (let i = 0; i < word.length; i += maxChars) chunks.push(word.slice(i, i + maxChars));
    return chunks;
  });
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3).join("\n");
}

function sliceLabelRotation(ctx: DataLabelsContext): number {
  const arc = ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.dataIndex] as ArcElement | undefined;
  if (!arc) return 0;
  const mid = (arc.startAngle + arc.endAngle) / 2;
  let deg = (mid * 180) / Math.PI + 90;
  const turn = ((deg % 360) + 360) % 360;
  if (turn > 90 && turn < 270) deg += 180;
  return deg;
}

function sliceLabelFont(sliceCount: number, wrapped: string) {
  const longest = Math.max(...wrapped.split("\n").map((line) => line.length), 1);
  const bySlices = Math.floor(240 / Math.max(sliceCount, 4));
  const byLength = Math.floor(140 / longest);
  return Math.max(13, Math.min(22, bySlices, byLength));
}

function spinDegreesForIndex(index: number, count: number, extraTurns = 6): number {
  const slice = 360 / count;
  const segmentCenter = (index + 0.5) * slice;
  const pointerAngle = 90;
  const offset = pointerAngle - segmentCenter;
  return extraTurns * 360 + offset;
}

export function SpinWheel({
  segments,
  disabled,
  tierWeights,
  showFrame = false,
  availWithinDays,
  onSpinStart,
  onResult,
}: {
  segments: Row[];
  disabled?: boolean;
  tierWeights?: TierWeights;
  showFrame?: boolean;
  availWithinDays?: number;
  onSpinStart?: () => Row | null;
  onResult: (segment: Row) => void;
}) {
  const slices = useMemo(() => {
    return uniquePrizeCatalog(segments.filter((s) => String(s["active"] ?? "Yes") !== "No"));
  }, [segments]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"pie", number[], string> | null>(null);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [status, setStatus] = useState("Click on the spin button to start");
  const [availHint, setAvailHint] = useState("");

  const labelsKey = slices.map((s) => `${String(s.id)}:${segmentDisplay(s)}`).join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    chartRef.current?.destroy();
    chartRef.current = null;

    if (slices.length === 0) return;

    const labels = slices.map((s) => wrapPrizeLabel(segmentDisplay(s), slices.length));
    const colors = slices.map((s, i) => String(s["colorHex"] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]));

    chartRef.current = new Chart(canvas, {
      type: "pie",
      plugins: [ChartDataLabels],
      data: {
        labels,
        datasets: [
          {
            data: slices.map(() => 1),
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 0 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: {
            clip: true,
            clamp: true,
            color: "#ffffff",
            textAlign: "center",
            anchor: "center",
            align: "center",
            offset: 0,
            rotation: sliceLabelRotation,
            formatter: (_, context) => String(context.chart.data.labels?.[context.dataIndex] ?? ""),
            font: (context) => {
              const wrapped = String(context.chart.data.labels?.[context.dataIndex] ?? "");
              return {
                size: sliceLabelFont(slices.length, wrapped),
                weight: "600",
                family: "Poppins, Plus Jakarta Sans, sans-serif",
              };
            },
            textStrokeColor: "rgba(0,0,0,0.35)",
            textStrokeWidth: 2,
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labelsKey]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const spin = useCallback(() => {
    if (spinningRef.current || disabled || slices.length === 0) return;

    const won = onSpinStart?.() ?? (tierWeights ? pickTierWeightedReward(slices, tierWeights) : pickWheelSegment(slices));
    if (!won) return;

    const idx = slices.findIndex((s) => String(s.id) === String(won.id));
    if (idx < 0) return;

    const prizeLabel = segmentDisplay(won);
    const startRotation = rotationRef.current;
    const delta = spinDegreesForIndex(idx, slices.length);
    const endRotation = startRotation + delta;

    spinningRef.current = true;
    setSpinning(true);
    setStatus("Best of luck!");
    setAvailHint("");

    const duration = 4200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startRotation + delta * eased;
      setWheelRotation(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      rotationRef.current = endRotation;
      setWheelRotation(endRotation);
      spinningRef.current = false;
      setSpinning(false);
      const wonType = String(won["prizeType"] ?? "");
      setStatus(`Congratulations! You won ${prizeLabel}`);
      setAvailHint(wonType === "No prize" ? "" : offerAvailWithinMessage(availWithinDays ?? 30, prizeLabel));
      onResult(won);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [availWithinDays, disabled, onResult, onSpinStart, slices, tierWeights]);

  const wheel = (
    <div className={cn("spin-wheel-ui w-full", showFrame ? "max-w-[34.37em]" : "max-w-full")}>
      <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
        <div
          className="size-full will-change-transform"
          style={{ transform: `rotate(${wheelRotation}deg)` }}
        >
          <canvas ref={canvasRef} className="block size-full" aria-hidden />
        </div>
        <button
          type="button"
          disabled={disabled || spinning || slices.length === 0}
          onClick={spin}
          className="absolute top-1/2 left-1/2 z-20 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-0 bg-[radial-gradient(#fdcf3b_50%,#d88a40_85%)] font-[Poppins,Plus_Jakarta_Sans,sans-serif] text-[clamp(0.95rem,3.5vw,1.35rem)] font-semibold tracking-[0.1em] text-[#c66e16] uppercase shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          aria-label={spinning ? "Spinning" : "Spin the wheel"}
        >
          {spinning ? "…" : "Spin"}
        </button>
        <div
          className="pointer-events-none absolute top-[45%] -right-[6%] z-10 w-[clamp(2.5rem,12vw,4rem)] -translate-y-1/2 sm:-right-[8%]"
          aria-hidden
        >
          <svg viewBox="0 0 64 64" className="size-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
            <path d="M8 32 L48 14 L48 26 L58 26 L58 38 L48 38 L48 50 Z" fill="#F5C518" />
          </svg>
        </div>
      </div>
      <div className="mt-6 space-y-1 text-center font-[Poppins,Plus_Jakarta_Sans,sans-serif] text-foreground">
        <p className="text-[clamp(1rem,2.5vw,1.35rem)] font-medium">{status}</p>
        {availHint ? <p className="text-sm font-normal text-muted-foreground">{availHint}</p> : null}
      </div>
    </div>
  );

  if (!showFrame) return wheel;

  return (
    <div className="mx-auto w-full max-w-[36rem] rounded-[1em] bg-gradient-to-br from-[#c3a3f1] to-[#6414e9] p-4 sm:p-6">
      <div className="rounded-[1em] bg-white px-3 py-6 shadow-[0_4em_5em_rgba(27,8,53,0.2)] sm:px-10 sm:py-10">
        {wheel}
      </div>
    </div>
  );
}
