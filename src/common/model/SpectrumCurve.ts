/**
 * SpectrumCurve.ts
 *
 * Turns a stick spectrum (peak positions and heights) into a sampled, broadened curve. Real lines
 * have a finite width — collisions and unresolved rotational structure in IR, relaxation in NMR —
 * so each stick is replaced by a unit-height Lorentzian, L(x) = γ² / ((x − x₀)² + γ²), with γ the
 * half-width at half-maximum.
 */

export type StickPeak = {
  readonly position: number;
  readonly height: number;
};

export type SampledCurve = {
  readonly x: Float64Array;
  readonly y: Float64Array;
};

/** Beyond this many half-widths a Lorentzian's contribution (< 1/2500) is skipped. */
const CUTOFF_HALF_WIDTHS = 50;

/** Sum of unit-height Lorentzians of half-width `halfWidth`, sampled at `samples` points on [min, max]. */
export function lorentzianSum(
  peaks: readonly StickPeak[],
  min: number,
  max: number,
  samples: number,
  halfWidth: number,
): SampledCurve {
  const x = new Float64Array(samples);
  const y = new Float64Array(samples);
  const dx = (max - min) / (samples - 1);
  const gamma2 = halfWidth * halfWidth;
  const cutoff = CUTOFF_HALF_WIDTHS * halfWidth;
  for (let i = 0; i < samples; i++) {
    x[i] = min + i * dx;
  }
  for (const peak of peaks) {
    const first = Math.max(0, Math.floor((peak.position - cutoff - min) / dx));
    const last = Math.min(samples - 1, Math.ceil((peak.position + cutoff - min) / dx));
    for (let i = first; i <= last; i++) {
      const d = (x[i] ?? 0) - peak.position;
      y[i] = (y[i] ?? 0) + (peak.height * gamma2) / (d * d + gamma2);
    }
  }
  return { x, y };
}
