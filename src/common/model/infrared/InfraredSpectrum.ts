/** Isotope substitution, normal-mode peaks and IR curves shared by Infrared and Unknowns. */
import { Range } from "scenerystack/dot";
import { defaultIsotopeMass, isotopesFor } from "../Isotopes.js";
import { type Molecule, neighborLists } from "../Molecule.js";
import { lorentzianSum, type SampledCurve, type StickPeak } from "../SpectrumCurve.js";
import { describeMode, type ModeCharacter } from "../vibrations/ModeCharacter.js";
import { analyzeNormalModes, type NormalMode } from "../vibrations/NormalModeAnalysis.js";

/** Wavenumber window of a mid-IR spectrometer, cm⁻¹. */
export const IR_RANGE = new Range(400, 4000);
const CURVE_SAMPLES = 1200;

/** The strongest band is scaled to this absorbance, so it dips to ~5 % transmittance. */
export const PEAK_ABSORBANCE = 1.3;

export const IsotopeScheme = {
  NATURAL: "natural",
  EXCHANGE_DEUTERIUM: "exchangeDeuterium",
  ALL_DEUTERIUM: "allDeuterium",
  CARBON_13: "carbon13",
  OXYGEN_18: "oxygen18",
  CHLORINE_37: "chlorine37",
} as const;
export type IsotopeSchemeValue = (typeof IsotopeScheme)[keyof typeof IsotopeScheme];

export type InfraredPeak = NormalMode & {
  /** Index into the mode list. */
  readonly index: number;
  readonly character: ModeCharacter;
  /** Intensity relative to the strongest mode, 0–1. */
  readonly relativeIntensity: number;
};

/** Isotope masses for a scheme; "exchange" deuterates only H on O or N, as shaking with D₂O does. */
export function isotopeMasses(molecule: Molecule, scheme: IsotopeSchemeValue): number[] {
  const neighbors = neighborLists(molecule);
  return molecule.elements.map((element, i) => {
    const heavy = (massNumberIndex: number) => isotopesFor(element.symbol)[massNumberIndex]?.mass;
    const natural = defaultIsotopeMass(element.symbol, element.mass);
    switch (scheme) {
      case IsotopeScheme.ALL_DEUTERIUM:
        return element.symbol === "H" ? (heavy(1) ?? natural) : natural;
      case IsotopeScheme.EXCHANGE_DEUTERIUM: {
        const exchangeable = (neighbors[i] ?? []).some((j) => ["O", "N"].includes(molecule.elements[j]?.symbol ?? ""));
        return element.symbol === "H" && exchangeable ? (heavy(1) ?? natural) : natural;
      }
      case IsotopeScheme.CARBON_13:
        return element.symbol === "C" ? (heavy(1) ?? natural) : natural;
      case IsotopeScheme.OXYGEN_18:
        return element.symbol === "O" ? (heavy(1) ?? natural) : natural;
      case IsotopeScheme.CHLORINE_37:
        return element.symbol === "Cl" ? (heavy(1) ?? natural) : natural;
      default:
        return natural;
    }
  });
}

/** Whether a scheme changes any mass in this molecule (the view disables the others). */
export function isotopeSchemeApplies(molecule: Molecule, scheme: IsotopeSchemeValue): boolean {
  const natural = isotopeMasses(molecule, IsotopeScheme.NATURAL);
  return isotopeMasses(molecule, scheme).some((mass, i) => mass !== natural[i]);
}

export function computePeaks(molecule: Molecule, scheme: IsotopeSchemeValue): InfraredPeak[] {
  if (!molecule.vibrations) {
    return [];
  }
  const masses = isotopeMasses(molecule, scheme);
  const modes = analyzeNormalModes(molecule.positions, masses, molecule.vibrations);
  const strongest = Math.max(...modes.map((mode) => mode.intensity), Number.MIN_VALUE);
  return modes
    .map((mode, index) => ({
      ...mode,
      index,
      character: describeMode(molecule, mode.displacements, masses),
      relativeIntensity: mode.intensity / strongest,
    }))
    .filter((peak) => peak.wavenumber > 0);
}

/** Absorbance: a Lorentzian sum of the modes, scaled so the strongest band reaches PEAK_ABSORBANCE. */
export function absorbanceCurve(peaks: readonly InfraredPeak[], halfWidth: number): SampledCurve {
  const sticks: StickPeak[] = peaks
    .filter((peak) => peak.wavenumber > 0)
    .map((peak) => ({ position: peak.wavenumber, height: peak.relativeIntensity }));
  const absorbance = lorentzianSum(sticks, IR_RANGE.min, IR_RANGE.max, CURVE_SAMPLES, halfWidth);
  let maximum = 0;
  for (const value of absorbance.y) {
    maximum = Math.max(maximum, value);
  }
  const scale = maximum > 0 ? PEAK_ABSORBANCE / maximum : 0;
  return { x: absorbance.x, y: absorbance.y.map((a) => scale * a) };
}

/** Percent transmittance T = 100 · 10^(−A) (Beer–Lambert). */
export function transmittanceFromAbsorbance(absorbance: SampledCurve): SampledCurve {
  return { x: absorbance.x, y: absorbance.y.map((a) => 100 * 10 ** -a) };
}

/** Percent transmittance of the modes (absorbanceCurve, then Beer–Lambert). */
export function transmittanceCurve(peaks: readonly InfraredPeak[], halfWidth: number): SampledCurve {
  return transmittanceFromAbsorbance(absorbanceCurve(peaks, halfWidth));
}
