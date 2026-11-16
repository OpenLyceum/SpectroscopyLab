/** Pure spectrum sampling and display ranges shared by NMR and Unknowns. */
import { Range } from "scenerystack/dot";
import { NMR_SPECTRUM_SETTINGS } from "../../../SpectroscopyLabConstants.js";
import type { MoleculeGraph } from "../MoleculeGraph.js";
import { lorentzianSum, type SampledCurve, type StickPeak } from "../SpectrumCurve.js";
import { type CarbonEnvironment, type CarbonLine, PROTON_TO_CARBON_FREQUENCY } from "./CarbonSpectrum.js";
import type { ProtonEnvironment } from "./ProtonSpectrum.js";
import { type ResolvedLine, resolvedLines } from "./SpinSystem.js";

/** ¹H chemical-shift window, ppm (TMS at 0, carboxylic acids near 12). */
export const SHIFT_RANGE = new Range(NMR_SPECTRUM_SETTINGS.SHIFT_RANGE_MIN, NMR_SPECTRUM_SETTINGS.SHIFT_RANGE_MAX);
/** ¹³C chemical-shift window, ppm (TMS at 0, ketones near 210). */
export const CARBON_SHIFT_RANGE = new Range(
  NMR_SPECTRUM_SETTINGS.CARBON_SHIFT_RANGE_MIN,
  NMR_SPECTRUM_SETTINGS.CARBON_SHIFT_RANGE_MAX,
);
/** Window of the multiplet zoom, ppm either side of the signal centre. */
const ZOOM_HALF_WIDTH: number = NMR_SPECTRUM_SETTINGS.ZOOM_HALF_WIDTH;
export const ZOOM_RANGE = new Range(-ZOOM_HALF_WIDTH, ZOOM_HALF_WIDTH);
/** Minimum ¹³C zoom; expanded when a selected multiplet extends beyond it. */
const CARBON_ZOOM_HALF_WIDTH: number = NMR_SPECTRUM_SETTINGS.CARBON_ZOOM_HALF_WIDTH;
export const CARBON_ZOOM_RANGE = new Range(-CARBON_ZOOM_HALF_WIDTH, CARBON_ZOOM_HALF_WIDTH);
/** Spectrometer (¹H Larmor) frequency, MHz. */
export const FIELD_RANGE = new Range(NMR_SPECTRUM_SETTINGS.FIELD_RANGE_MIN, NMR_SPECTRUM_SETTINGS.FIELD_RANGE_MAX);

/** Natural line half-width (HWHM) of a sharp signal, and of a broad exchanging O–H/N–H, Hz. */
const LINE_HALF_WIDTH_HZ: number = NMR_SPECTRUM_SETTINGS.LINE_HALF_WIDTH_HZ;
const BROAD_HALF_WIDTH_HZ: number = NMR_SPECTRUM_SETTINGS.BROAD_HALF_WIDTH_HZ;
const CARBON_HALF_WIDTH_HZ: number = NMR_SPECTRUM_SETTINGS.CARBON_HALF_WIDTH_HZ;
/** Leave at least this margin beyond the carbon lines, ppm. */
const CARBON_WINDOW_MARGIN = 1;
const SPECTRUM_SAMPLES: number = NMR_SPECTRUM_SETTINGS.SPECTRUM_SAMPLES;
const ZOOM_SAMPLES: number = NMR_SPECTRUM_SETTINGS.ZOOM_SAMPLES;
/** The tallest line is drawn at this height; the integral trace tops out at INTEGRAL_HEIGHT. */
const PEAK_HEIGHT = 1;
const INTEGRAL_HEIGHT: number = NMR_SPECTRUM_SETTINGS.INTEGRAL_HEIGHT;

export const Nucleus = {
  PROTON: "proton",
  CARBON: "carbon",
} as const;
export type NucleusValue = (typeof Nucleus)[keyof typeof Nucleus];

/**
 * First-order lines of every signal as sticks on the ppm axis, with heights for equal-area broadening.
 * @internal Exported for unit tests; not part of the application API.
 */
export function spectrumSticks(environments: readonly ProtonEnvironment[], field: number, tms: boolean): StickPeak[] {
  return linesToSticks(resolvedLines(environments, field, null), tms);
}

function linesToSticks(lines: readonly ResolvedLine[], tms: boolean): StickPeak[] {
  // A broad line spreads the same area over a wider Lorentzian, so it is proportionally lower.
  const sticks = lines.map((line) => ({
    position: line.position,
    height: line.weight * (line.broad ? LINE_HALF_WIDTH_HZ / BROAD_HALF_WIDTH_HZ : 1),
  }));
  if (tms) {
    sticks.push({ position: 0, height: 1 });
  }
  return sticks;
}

/**
 * The ¹H spectrum. Pass the molecule's graph for exact (second-order) lines; without it, each
 * signal is a first-order multiplet.
 */
export function fullSpectrum(
  environments: readonly ProtonEnvironment[],
  field: number,
  tms: boolean,
  graph: MoleculeGraph | null = null,
): SampledCurve {
  return spectrumFromLines(resolvedLines(environments, field, graph), field, tms);
}

export function spectrumFromLines(lines: readonly ResolvedLine[], field: number, tms: boolean): SampledCurve {
  const sharp = linesToSticks(
    lines.filter((line) => !line.broad),
    tms,
  );
  const broad = linesToSticks(
    lines.filter((line) => line.broad),
    false,
  );
  // Never narrower than ~1.2 sample spacings, so a line cannot fall between samples.
  const spacing = SHIFT_RANGE.getLength() / (SPECTRUM_SAMPLES - 1);
  const sharpWidth = Math.max(LINE_HALF_WIDTH_HZ / field, 1.2 * spacing);
  const curve = lorentzianSum(sharp, SHIFT_RANGE.min, SHIFT_RANGE.max, SPECTRUM_SAMPLES, sharpWidth);
  // Keep equal areas when the sharp lines had to be widened for sampling.
  const sharpScale = LINE_HALF_WIDTH_HZ / field / sharpWidth;
  // Broad-line heights were already scaled for equal area in linesToSticks.
  const broadCurve = lorentzianSum(
    broad,
    SHIFT_RANGE.min,
    SHIFT_RANGE.max,
    SPECTRUM_SAMPLES,
    BROAD_HALF_WIDTH_HZ / field,
  );
  const y = curve.y.map((value, i) => value * sharpScale + (broadCurve.y[i] ?? 0));
  return normalize({ x: curve.x, y }, PEAK_HEIGHT);
}

/** Running integral from the downfield end, scaled so the total reaches INTEGRAL_HEIGHT. */
export function integralTrace(curve: SampledCurve): SampledCurve {
  const y = new Float64Array(curve.y.length);
  let total = 0;
  for (let i = curve.y.length - 1; i >= 0; i--) {
    total += curve.y[i] ?? 0;
    y[i] = total;
  }
  return normalize({ x: curve.x, y }, INTEGRAL_HEIGHT);
}

/** Every line within the zoom window around the selected signal — overlapping neighbours included. */
export function zoomSpectrum(
  lines: readonly ResolvedLine[],
  environment: ProtonEnvironment | undefined,
  field: number,
): SampledCurve {
  if (!environment) {
    return lorentzianSum([], ZOOM_RANGE.min, ZOOM_RANGE.max, ZOOM_SAMPLES, 1);
  }
  const halfWidth = (environment.exchangeable ? BROAD_HALF_WIDTH_HZ : LINE_HALF_WIDTH_HZ) / field;
  const sticks = lines
    .filter((line) => line.broad === environment.exchangeable)
    .map((line) => ({ position: line.position - environment.shift, height: line.weight }))
    .filter((stick) => Math.abs(stick.position) < 2 * ZOOM_HALF_WIDTH);
  return normalize(lorentzianSum(sticks, ZOOM_RANGE.min, ZOOM_RANGE.max, ZOOM_SAMPLES, halfWidth), PEAK_HEIGHT);
}

/** The ¹³C spectrum: signed heights (DEPT-135), tallest |height| = 1. */
export function carbonSpectrum(lines: readonly CarbonLine[], field: number, tms: boolean): SampledCurve {
  const sticks: StickPeak[] = lines.map((line) => ({ position: line.position, height: line.height }));
  if (tms) {
    sticks.push({ position: 0, height: 1 });
  }
  const range = new Range(
    Math.min(CARBON_SHIFT_RANGE.min, ...lines.map((line) => line.position - CARBON_WINDOW_MARGIN)),
    Math.max(CARBON_SHIFT_RANGE.max, ...lines.map((line) => line.position + CARBON_WINDOW_MARGIN)),
  );
  const spacing = range.getLength() / (SPECTRUM_SAMPLES - 1);
  const width = Math.max(CARBON_HALF_WIDTH_HZ / (field / PROTON_TO_CARBON_FREQUENCY), 1.2 * spacing);
  return normalize(lorentzianSum(sticks, range.min, range.max, SPECTRUM_SAMPLES, width), PEAK_HEIGHT);
}

export function carbonZoom(
  lines: readonly CarbonLine[],
  environments: readonly CarbonEnvironment[],
  index: number | null,
  field: number,
): SampledCurve {
  const environment = index === null ? undefined : environments[index];
  if (!environment) {
    return lorentzianSum([], CARBON_ZOOM_RANGE.min, CARBON_ZOOM_RANGE.max, ZOOM_SAMPLES, 1);
  }
  const halfWidth = Math.max(
    CARBON_ZOOM_HALF_WIDTH,
    ...lines
      .filter((line) => line.environment === index)
      .map((line) => Math.abs(line.position - environment.shift) + CARBON_WINDOW_MARGIN),
  );
  const range = new Range(-halfWidth, halfWidth);
  const sticks = lines
    .map((line) => ({ position: line.position - environment.shift, height: line.height }))
    .filter((stick) => Math.abs(stick.position) < 2 * halfWidth);
  const width = CARBON_HALF_WIDTH_HZ / (field / PROTON_TO_CARBON_FREQUENCY);
  const spacing = range.getLength() / (ZOOM_SAMPLES - 1);
  return normalize(
    lorentzianSum(sticks, range.min, range.max, ZOOM_SAMPLES, Math.max(width, 1.2 * spacing)),
    PEAK_HEIGHT,
  );
}

export function sampledRange(curve: SampledCurve, fallback: Range): Range {
  return new Range(curve.x[0] ?? fallback.min, curve.x.at(-1) ?? fallback.max);
}

/** Scales so the largest |y| is `height` (signed curves keep their sign). */
function normalize(curve: SampledCurve, height: number): SampledCurve {
  let maximum = 0;
  for (const value of curve.y) {
    maximum = Math.max(maximum, Math.abs(value));
  }
  return maximum > 0 ? { x: curve.x, y: curve.y.map((value) => (value * height) / maximum) } : curve;
}
