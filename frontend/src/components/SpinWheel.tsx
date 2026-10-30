import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Row } from "@/store";
import { pickWheelSegment } from "@/pages/LoyaltyQr/qr-loyalty";
import { PRIZE_COLOURS } from "@/pages/PrizeWheel/prize-colours";
import { uniquePrizeCatalog } from "@/pages/PrizeWheel/prize-help";
import { pickTierWeightedReward, offerAvailWithinMessage, type TierWeights } from "@/pages/PrizeWheel/reward-distribution";
import { cn } from "@/utils/utils";

const HOME_COLORS = ["#e2725b", "#e8b86b", "#6b3a7d", "#3fa98a"];
const FALLBACK_COLORS = PRIZE_COLOURS.map((c) => c.value);

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

function sliceColor(segment: Row, index: number) {
  const hex = String(segment["colorHex"] ?? "").trim();
  if (hex) return hex;
  return HOME_COLORS[index % HOME_COLORS.length] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function sliceLabelStyle(index: number, count: number, text: string) {
  const mid = ((index + 0.5) * 360) / count;
  const rad = (mid * Math.PI) / 180;
  const radius = count <= 3 ? 34 : count <= 6 ? 32 : 30;
  const len = text.trim().length;
  const fontSize =
    len > 32 ? "0.48rem" : len > 22 ? "0.52rem" : len > 14 ? "0.58rem" : count <= 3 ? "0.62rem" : "0.55rem";
  return {
    left: `${50 + radius * Math.sin(rad)}%`,
    top: `${50 - radius * Math.cos(rad)}%`,
    maxWidth: count <= 3 ? "40%" : count <= 6 ? "30%" : "22%",
    fontSize,
  };
}

function conicBackground(slices: Row[]) {
  const n = Math.max(slices.length, 1);
  const step = 360 / n;
  const stops = slices.map((slice, i) => {
    const color = sliceColor(slice, i);
    return `${color} ${i * step}deg ${(i + 1) * step}deg`;
  });
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

function readRotationDeg(el: HTMLElement): number {
  const raw = getComputedStyle(el).transform;
  if (!raw || raw === "none") return 0;
  try {
    const matrix = new DOMMatrixReadOnly(raw);
    const deg = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
  } catch {
    return 0;
  }
}

function spinDeltaFrom(currentDeg: number, index: number, count: number, extraTurns = 8): number {
  const slice = 360 / count;
  const segmentCenter = (index + 0.5) * slice;
  const targetMod = (360 - segmentCenter) % 360;
  const currentMod = ((currentDeg % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  return extraTurns * 360 + delta;
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
  const diskRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);
  const [idle, setIdle] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [status, setStatus] = useState("Tap the wheel to spin");
  const [availHint, setAvailHint] = useState("");

  const gradient = useMemo(() => conicBackground(slices), [slices]);

  useEffect(() => {
    return () => {
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    };
  }, []);

  const spin = useCallback(() => {
    const disk = diskRef.current;
    if (!disk || spinningRef.current || disabled || slices.length === 0) return;

    const won = onSpinStart?.() ?? (tierWeights ? pickTierWeightedReward(slices, tierWeights) : pickWheelSegment(slices));
    if (!won) return;

    const idx = slices.findIndex((s) => String(s.id) === String(won.id));
    if (idx < 0) return;

    const prizeLabel = segmentDisplay(won);
    const startRotation = idle ? readRotationDeg(disk) : rotationRef.current;
    const delta = spinDeltaFrom(startRotation, idx, slices.length);
    const endRotation = startRotation + delta;
    const duration = 5200;

    spinningRef.current = true;
    setIdle(false);
    setSpinning(true);
    setStatus("Best of luck!");
    setAvailHint("");

    disk.classList.remove("spin-wheel-idle");
    disk.style.animation = "none";
    disk.style.transition = "none";
    disk.style.transform = `rotate(${startRotation}deg) translateZ(0)`;
    void disk.offsetWidth;
    disk.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.82, 0.08, 1)`;
    disk.style.transform = `rotate(${endRotation}deg) translateZ(0)`;

    const finish = () => {
      if (!spinningRef.current) return;
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      disk.removeEventListener("transitionend", onEnd);
      rotationRef.current = endRotation;
      spinningRef.current = false;
      setSpinning(false);
      const wonType = String(won["prizeType"] ?? "");
      setStatus(`You won ${prizeLabel}`);
      setAvailHint(wonType === "No prize" ? "" : offerAvailWithinMessage(availWithinDays ?? 30, prizeLabel));
      onResult(won);
    };

    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      finish();
    };

    disk.addEventListener("transitionend", onEnd);
    finishTimerRef.current = window.setTimeout(finish, duration + 120);
  }, [availWithinDays, disabled, idle, onResult, onSpinStart, slices, tierWeights]);

  const wheel = (
    <div className="krios-wheel-stage">
      <div className="krios-wheel-wrap">
        <div
          ref={diskRef}
          className={cn("krios-wheel-disk", idle && !disabled ? "spin-wheel-idle" : "")}
          style={{ background: gradient }}
        >
          {slices.map((slice, i) => {
            const text = segmentDisplay(slice);
            return (
              <span key={String(slice.id)} className="krios-wheel-label" style={sliceLabelStyle(i, slices.length, text)}>
                {text}
              </span>
            );
          })}
        </div>
        <span className="krios-wheel-hub" aria-hidden />
        <span className="krios-wheel-pointer" aria-hidden />
        <button
          type="button"
          className="krios-wheel-hit"
          disabled={disabled || spinning || slices.length === 0}
          onClick={spin}
          aria-label={spinning ? "Spinning" : "Spin the wheel"}
        />
      </div>
      <p className="krios-wheel-status">{status}</p>
      {availHint ? <p className="krios-wheel-hint">{availHint}</p> : null}
    </div>
  );

  if (!showFrame) return wheel;

  return <div className="krios-wheel-frame">{wheel}</div>;
}
