/**
 * RotationalFineStructure.ts
 *
 * The rotation–vibration spectrum of a diatomic gas (HCl) at high resolution. The v = 0 → 1 band
 * is not one line: each molecule also changes its rotational quantum number by ΔJ = ±1 (ΔJ = 0 is
 * forbidden for a ¹Σ diatomic, so there is no Q branch and a gap at the band origin):
 *
 *     R(J): ν = ν₀ + F₁(J + 1) − F₀(J),   J = 0, 1, …
 *     P(J): ν = ν₀ + F₁(J − 1) − F₀(J),   J = 1, 2, …
 *     F_v(J) = B_v J(J + 1) − D J²(J + 1)²,   B_v = B_e − α_e(v + ½)
 *
 * Lines are spaced by about 2B; because B₁ < B₀ the R branch closes up and the P branch spreads.
 * Each line's intensity is ν × (Hönl–London factor J + 1 or J) × exp(−hcF₀(J)/kT) / Q, so the
 * envelope's peak moves to higher J as the gas warms. Each isotopologue (H³⁵Cl and, 24 % of the
 * time, H³⁷Cl) gives its own set of lines, the heavier one slightly lower.
 *
 * Where the numbers come from:
 *  - ν₀ is the scaled B3LYP harmonic wavenumber of the current isotope masses (the same band the
 *    normal-mode spectrum shows), so a D substitution moves the band by the right factor.
 *  - B_e = h / (8π²c μ r_e²) from the B3LYP equilibrium bond length and the reduced mass.
 *  - α_e (vibration–rotation coupling) needs the anharmonic potential, which the harmonic Hessian
 *    lacks, so it is the measured H³⁵Cl value scaled to other isotopes as μ^(−3/2).
 *  - D = 4B_e³/ν₀² (Kratzer).
 */

import { Range } from "scenerystack/dot";
import { isotopesFor } from "../../common/model/Isotopes.js";
import type { Molecule } from "../../common/model/Molecule.js";
import { lorentzianSum, type SampledCurve, type StickPeak } from "../../common/model/SpectrumCurve.js";
import { analyzeNormalModes } from "../../common/model/vibrations/NormalModeAnalysis.js";

/** h / (8π²c), in cm⁻¹ · u · Å². */
const ROTATIONAL_CONSTANT_FACTOR = 16.857629;
/** Second radiation constant hc/k, cm · K. */
const HC_OVER_K = 1.438777;
/** Atomic mass unit, kg; speed of light, cm/s. */
const ATOMIC_MASS_UNIT = 1.66053907e-27;
const SPEED_OF_LIGHT = 2.99792458e10;

/**
 * Molecules the fine structure is offered for, with the measured vibration–rotation constant α_e
 * (cm⁻¹) of a reference isotopologue and that isotopologue's reduced mass (u).
 * H³⁵Cl: α_e = 0.3072 cm⁻¹ (Huber & Herzberg, *Constants of Diatomic Molecules*, 1979).
 */
const VIBRATION_ROTATION: Readonly<Record<string, { readonly alpha: number; readonly reducedMass: number }>> = {
  "hydrogen-chloride": { alpha: 0.3072, reducedMass: 0.9795925 },
};

/** Natural abundances (most abundant first, matching Isotopes.ts) for elements with a common minor isotope. */
const NATURAL_ABUNDANCE: Readonly<Record<string, readonly number[]>> = {
  Cl: [0.7576, 0.2424],
};

export const TEMPERATURE_RANGE = new Range(50, 1000);
export const DEFAULT_TEMPERATURE = 298;
/** Instrument line half-width (HWHM) of a high-resolution FTIR, cm⁻¹. */
export const FINE_HALF_WIDTH = 0.3;
/** The band window spans this far either side of the main isotopologue's origin, cm⁻¹. */
export const BAND_HALF_WIDTH = 450;
/** Half-width of the zoom on one line, cm⁻¹ (wide enough for the ³⁵Cl/³⁷Cl pair). */
export const LINE_ZOOM_HALF_WIDTH = 6;
const BAND_SAMPLES = 6000;
const ZOOM_SAMPLES = 600;
/** Lines weaker than this fraction of the strongest are left out. */
const MIN_RELATIVE_INTENSITY = 1e-4;
const MAX_J = 60;

export type Isotopologue = {
  /** "H³⁵Cl". */
  readonly label: string;
  readonly masses: readonly number[];
  readonly abundance: number;
  /** Reduced mass, u. */
  readonly reducedMass: number;
  /** Band origin, cm⁻¹. */
  readonly origin: number;
  /** Equilibrium bond length, Å. */
  readonly bondLength: number;
  readonly rotationalConstant: number;
  /** B₀ and B₁, cm⁻¹. */
  readonly groundB: number;
  readonly excitedB: number;
  /** Centrifugal distortion constant, cm⁻¹. */
  readonly distortion: number;
  /** Harmonic force constant from ν₀, N/m. */
  readonly forceConstant: number;
};

export type RotationalLine = {
  readonly branch: "P" | "R";
  /** Lower-state J. */
  readonly j: number;
  readonly wavenumber: number;
  /** Relative to the strongest line of all isotopologues, 0–1. */
  readonly intensity: number;
  /** Index into the isotopologue list. */
  readonly isotopologue: number;
};

export type FineStructure = {
  readonly isotopologues: readonly Isotopologue[];
  /** Sorted by wavenumber. */
  readonly lines: readonly RotationalLine[];
  /** The plotted window, centred on the most abundant isotopologue's origin. */
  readonly range: Range;
};

export function hasFineStructure(molecule: Molecule | null): boolean {
  return !!molecule?.vibrations && molecule.elements.length === 2 && molecule.id in VIBRATION_ROTATION;
}

/**
 * The isotopologues of a diatomic: the given masses, plus — for an atom left at its most abundant
 * isotope — each common minor isotope, weighted by natural abundance.
 */
export function isotopologues(molecule: Molecule, masses: readonly number[]): Isotopologue[] {
  const choices = molecule.elements.map((element, i) => {
    const mass = masses[i] ?? element.mass;
    const isotopes = isotopesFor(element.symbol);
    const abundances = NATURAL_ABUNDANCE[element.symbol];
    if (abundances && isotopes[0]?.mass === mass) {
      return isotopes.map((isotope, k) => ({ mass: isotope.mass, fraction: abundances[k] ?? 0 }));
    }
    return [{ mass, fraction: 1 }];
  });
  const result: Isotopologue[] = [];
  for (const first of choices[0] ?? []) {
    for (const second of choices[1] ?? []) {
      result.push(describeIsotopologue(molecule, [first.mass, second.mass], first.fraction * second.fraction));
    }
  }
  return result.sort((p, q) => q.abundance - p.abundance);
}

function describeIsotopologue(molecule: Molecule, masses: readonly number[], abundance: number): Isotopologue {
  const constants = VIBRATION_ROTATION[molecule.id] ?? { alpha: 0, reducedMass: 1 };
  const [m1 = 1, m2 = 1] = masses;
  const reducedMass = (m1 * m2) / (m1 + m2);
  const p = molecule.positions;
  const bondLength = Math.hypot((p[3] ?? 0) - (p[0] ?? 0), (p[4] ?? 0) - (p[1] ?? 0), (p[5] ?? 0) - (p[2] ?? 0));
  const vibrations = molecule.vibrations;
  const origin = vibrations ? (analyzeNormalModes(p, masses, vibrations)[0]?.wavenumber ?? 0) : 0;
  const rotationalConstant = ROTATIONAL_CONSTANT_FACTOR / (reducedMass * bondLength * bondLength);
  const alpha = constants.alpha * (constants.reducedMass / reducedMass) ** 1.5;
  const omega = 2 * Math.PI * SPEED_OF_LIGHT * origin;
  return {
    // Lighter atom first, as the formula is written: H³⁵Cl, not ³⁵ClH.
    label: molecule.elements
      .map((element, i) => ({ text: isotopeLabel(element.symbol, masses[i] ?? 0), mass: masses[i] ?? 0 }))
      .sort((first, second) => first.mass - second.mass)
      .map((part) => part.text)
      .join(""),
    masses,
    abundance,
    reducedMass,
    origin,
    bondLength,
    rotationalConstant,
    groundB: rotationalConstant - alpha / 2,
    excitedB: rotationalConstant - (3 * alpha) / 2,
    distortion: origin > 0 ? (4 * rotationalConstant ** 3) / (origin * origin) : 0,
    forceConstant: reducedMass * ATOMIC_MASS_UNIT * omega * omega,
  };
}

/** "H", "D", "³⁵Cl", "¹³C"… */
function isotopeLabel(symbol: string, mass: number): string {
  const isotopes = isotopesFor(symbol);
  const index = isotopes.findIndex((isotope) => Math.abs(isotope.mass - mass) < 1e-4);
  if (symbol === "H") {
    return index === 1 ? "D" : "H";
  }
  const massNumber = isotopes[index]?.massNumber;
  return massNumber === undefined ? symbol : `${superscript(massNumber)}${symbol}`;
}

function superscript(value: number): string {
  const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return [...`${value}`].map((d) => digits[Number(d)] ?? d).join("");
}

/** Rotational term F_v(J), cm⁻¹. */
function term(b: number, d: number, j: number): number {
  const x = j * (j + 1);
  return b * x - d * x * x;
}

export function fineStructure(molecule: Molecule, masses: readonly number[], temperature: number): FineStructure {
  const species = isotopologues(molecule, masses);
  const raw: Omit<RotationalLine, "intensity">[] = [];
  const strengths: number[] = [];
  species.forEach((s, index) => {
    const boltzmann = (j: number) => Math.exp((-HC_OVER_K * term(s.groundB, s.distortion, j)) / temperature);
    let partition = 0;
    for (let j = 0; j <= MAX_J; j++) {
      partition += (2 * j + 1) * boltzmann(j);
    }
    for (let j = 0; j <= MAX_J; j++) {
      const lower = term(s.groundB, s.distortion, j);
      const add = (branch: "P" | "R", upperJ: number, honlLondon: number) => {
        const wavenumber = s.origin + term(s.excitedB, s.distortion, upperJ) - lower;
        raw.push({ branch, j, wavenumber, isotopologue: index });
        strengths.push((s.abundance * wavenumber * honlLondon * boltzmann(j)) / partition);
      };
      add("R", j + 1, j + 1);
      if (j > 0) {
        add("P", j - 1, j);
      }
    }
  });
  const strongest = Math.max(...strengths, Number.MIN_VALUE);
  const lines = raw
    .map((line, i) => ({ ...line, intensity: (strengths[i] ?? 0) / strongest }))
    .filter((line) => line.intensity >= MIN_RELATIVE_INTENSITY)
    .sort((p, q) => p.wavenumber - q.wavenumber);
  const centre = species[0]?.origin ?? 0;
  return { isotopologues: species, lines, range: new Range(centre - BAND_HALF_WIDTH, centre + BAND_HALF_WIDTH) };
}

/**
 * Absorbance over the band window, scaled so the strongest point on the envelope reaches
 * `peakAbsorbance` — the same convention as the low-resolution band, which normalises the summed
 * curve rather than the sticks.
 */
export function fineAbsorbance(structure: FineStructure, peakAbsorbance: number): SampledCurve {
  const curve = summedAbsorbance(structure.lines, structure.range.min, structure.range.max, BAND_SAMPLES);
  return scaleAbsorbance(curve, peakAbsorbance, curveMaximum(curve));
}

/** Absorbance within ±LINE_ZOOM_HALF_WIDTH of `centre`, on the same scale as {@link fineAbsorbance}. */
export function fineZoomAbsorbance(structure: FineStructure, centre: number, peakAbsorbance: number): SampledCurve {
  const full = summedAbsorbance(structure.lines, structure.range.min, structure.range.max, BAND_SAMPLES);
  const zoom = summedAbsorbance(
    structure.lines,
    centre - LINE_ZOOM_HALF_WIDTH,
    centre + LINE_ZOOM_HALF_WIDTH,
    ZOOM_SAMPLES,
  );
  return scaleAbsorbance(zoom, peakAbsorbance, curveMaximum(full));
}

function summedAbsorbance(lines: readonly RotationalLine[], min: number, max: number, samples: number): SampledCurve {
  const sticks: StickPeak[] = lines.map((line) => ({ position: line.wavenumber, height: line.intensity }));
  return lorentzianSum(sticks, min, max, samples, FINE_HALF_WIDTH);
}

function curveMaximum(curve: SampledCurve): number {
  let maximum = 0;
  for (const value of curve.y) {
    maximum = Math.max(maximum, value);
  }
  return maximum;
}

function scaleAbsorbance(curve: SampledCurve, peakAbsorbance: number, referenceMaximum: number): SampledCurve {
  const scale = referenceMaximum > 0 ? peakAbsorbance / referenceMaximum : 0;
  return { x: curve.x, y: curve.y.map((a) => scale * a) };
}
