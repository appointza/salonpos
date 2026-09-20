import { useCallback, useEffect, useRef, useState } from "react";
import { ArcElement, Chart, PieController } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import type { Row } from "@/lib/store";
import { pickWheelSegment } from "@/lib/qr-loyalty";
import { selectWheelSegment } from "@/lib/wheel/wheel-service";
import type { TierWeights } from "@/lib/reward-distribution";
import { cn } from "@/lib/utils";

Chart.register(ArcElement, PieController, ChartDataLabels);

const DEFAULT_COLORS = [
  "#E74C3C",
  "#7D3C98",
  "#2E86C1",
  "#138D75",
  "#F1C40F",
  "#D35400",
  "#8E44AD",
  "#16A085",
  "#E67E22",
  "#2980B9",
  "#C0392B",
  "#27AE60",
];

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
  onSpinStart,
  onResult,
}: {
  segments: Row[];
  disabled?: boolean;
  tierWeights?: TierWeights;
  showFrame?: boolean;
  onSpinStart?: () => Row | null;
  onResult: (segment: Row) => void;
}) {
  const slices = segments.filter((s) => String(s["active"] ?? "Yes") !== "No");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"pie", number[], string> | null>(null);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [status, setStatus] = useState("Click on the spin button to start");

  const labelsKey = slices.map((s) => `${String(s.id)}:${segmentDisplay(s)}`).join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    chartRef.current?.destroy();
    chartRef.current = null;

    if (slices.length === 0) return;

    const labels = slices.map(segmentDisplay);
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
            rotation: 90,
            color: "#ffffff",
            formatter: (_, context) => context.chart.data.labels?.[context.dataIndex] ?? "",
            font: {
              size: Math.max(10, Math.min(14, Math.floor(180 / slices.length))),
              weight: "600",
              family: "Poppins, Plus Jakarta Sans, sans-serif",
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

    const won =
      onSpinStart?.() ??
      (tierWeights ? selectWheelSegment(slices, tierWeights) : pickWheelSegment(slices));
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
      setStatus(`Congratulations! You won ${prizeLabel}`);
      onResult(won);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [disabled, onResult, onSpinStart, slices, tierWeights]);

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
      <div className="mt-6 text-center font-[Poppins,Plus_Jakarta_Sans,sans-serif] text-[clamp(1rem,2.5vw,1.35rem)] font-medium text-foreground">
        <p>{status}</p>
      </div>
    </div>
  );

  if (!showFrame) return wheel;

  return (
    <div className="mx-auto w-full max-w-[36rem] rounded-[1em] bg-gradient-to-br from-[#c3a3f1] to-[#6414e9] p-4 sm:p-6">
      <div className="rounded-[1em] bg-white px-6 py-8 shadow-[0_4em_5em_rgba(27,8,53,0.2)] sm:px-10 sm:py-10">
        {wheel}
      </div>
    </div>
  );
}
