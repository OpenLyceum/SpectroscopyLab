/**
 * UVVisModel.ts
 *
 * State of the UV-Vis screen: a conjugated molecule, the electronic model (Hückel or particle in a
 * box), the orbital shown in the viewer, the predicted absorption band and the colour the eye
 * would see, next to the measured λmax.
 *
 * Hückel gives the HOMO→LUMO gap in units of |β|. One |β| does not fit every family — bond
 * alternation and electron repulsion are missing — so the gap is converted to energy with a
 * linear calibration E = a + b·Δx fitted by least squares within each family (tests re-derive the
 * constants). The box needs no fitting at all, which is why it is so striking for cyanines.
 *
 * A quantitative (Beer–Lambert) mode puts the spectrum on an absolute scale, A(λ) = ε(λ)·b·c,
 * from the measured molar absorptivity at λmax, the path length and the concentration. The
 * colour then depends on how much is in the cuvette, and a calibration plot of A against c is a
 * straight line through the origin until stray light in the spectrometer bends it over near A ≈ 2.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  hasMoleculeData,
  LIBRARY,
  loadMolecule,
  MoleculeFamily,
  type MoleculeFamilyValue,
} from "../../common/model/library/SpectroscopyLibrary.js";
import { MoleculeChooser } from "../../common/model/MoleculeChooser.js";
import { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import { MoleculeViewModel } from "../../common/model/MoleculeViewModel.js";
import type { SampledCurve } from "../../common/model/SpectrumCurve.js";
import { Rotation3 } from "../../common/model/structure/Rotation3.js";
import { perceivedColor } from "./PerceivedColor.js";
import { boxWavelength, type ElectronicStructure, gapToWavelength, PiSystem } from "./PiSystem.js";

/**
 * Measured λmax of the lowest strong π→π* band, nm (hexane or gas; cyanines in solution).
 * Polyenes and benzenoids: Jaffé & Orchin, *Theory and Applications of Ultraviolet Spectroscopy*
 * (Wiley, 1962) and the NIST WebBook; benzene and the acenes are the ¹Lₐ (p) band; azulene is its
 * weak visible S₁ band. Streptocyanines Me₂N(CH)ₚNMe₂⁺: Malhotra & Whiting, J. Chem. Soc. 1960, 3812.
 */
export const MEASURED_MAXIMA: Readonly<Record<string, number>> = {
  ethene: 171,
  "1-3-butadiene": 217,
  "1-3-5-hexatriene": 258,
  "1-3-5-7-octatetraene": 290,
  "beta-carotene": 452,
  benzene: 204,
  naphthalene: 286,
  anthracene: 375,
  tetracene: 471,
  pentacene: 580,
  azulene: 580,
  "trimethine-cyanine": 312.5,
  "pentamethine-cyanine": 416,
  "heptamethine-cyanine": 519,
  "nonamethine-cyanine": 625,
};

/**
 * Molar absorptivity ε at λmax, L mol⁻¹ cm⁻¹, for the Beer–Lambert mode. Approximate (±30 %;
 * solvent-dependent): butadiene and β-carotene (hexane, E¹%₁cm = 2592) are standard textbook
 * values; the acenes are log ε 3.75–4.20 from compilations of their p bands; hexatriene,
 * octatetraene and the streptocyanines follow the usual growth of ε with chain length (cyanines
 * reach ~10⁵). The mode is about proportionality, not about these digits.
 */
export const MOLAR_ABSORPTIVITY: Readonly<Record<string, number>> = {
  ethene: 15_000,
  "1-3-butadiene": 21_000,
  "1-3-5-hexatriene": 35_000,
  "1-3-5-7-octatetraene": 50_000,
  "beta-carotene": 139_000,
  benzene: 7_900,
  naphthalene: 5_600,
  anthracene: 7_900,
  tetracene: 11_000,
  pentacene: 16_000,
  azulene: 350,
  "trimethine-cyanine": 64_000,
  "pentamethine-cyanine": 120_000,
  "heptamethine-cyanine": 200_000,
  "nonamethine-cyanine": 250_000,
};

/**
 * The concentration slider runs from 0 to a per-molecule maximum (µmol/L): the 1–2–5 step at or
 * above the concentration giving A = MAX_CONCENTRATION_ABSORBANCE in 1 cm, so a dye with
 * ε ≈ 10⁵ and azulene's weak band (ε ≈ 350) are both usable.
 */
const MAX_CONCENTRATION_ABSORBANCE = 4;
export const CONCENTRATION_FRACTION_RANGE = new Range(0, 1);
const DEFAULT_CONCENTRATION_FRACTION = 0.1;
export const PATH_LENGTH_RANGE = new Range(0.1, 5);
const DEFAULT_PATH_LENGTH = 1;
/** Fraction of stray light reaching the detector; it caps measured absorbance near −log₁₀(s) = 3. */
export const STRAY_LIGHT = 0.001;
const CALIBRATION_SAMPLES = 201;

/** E (eV) = a + b·Δx per family, least-squares over the family's measured maxima (azulene excluded). */
export const HUECKEL_CALIBRATION: Partial<Record<MoleculeFamilyValue, { readonly a: number; readonly b: number }>> = {
  [MoleculeFamily.POLYENES]: { a: 2.358, b: 2.552 },
  [MoleculeFamily.ACENES]: { a: 1.155, b: 2.496 },
  [MoleculeFamily.AROMATICS]: { a: 1.155, b: 2.496 },
  [MoleculeFamily.CYANINES]: { a: 0.319, b: 2.963 },
};

export const ElectronicModel = {
  HUECKEL: "hueckel",
  BOX: "box",
} as const;
export type ElectronicModelValue = (typeof ElectronicModel)[keyof typeof ElectronicModel];

/** Wavelength axis of the spectrum, nm. */
export const WAVELENGTH_RANGE = new Range(150, 800);
const SPECTRUM_SAMPLES = 651;
/** Gaussian band width in wavenumber, cm⁻¹ (a typical π→π* band envelope, FWHM ≈ 4700 cm⁻¹). */
const BAND_SIGMA = 2000;
/** Absorbance at λmax used for the perceived colour (90 % absorbed). */
const COLOR_ABSORBANCE = 1;
const INITIAL_MOLECULE = "1-3-butadiene";

export type Prediction = {
  readonly structure: ElectronicStructure;
  /** HOMO→LUMO gap in the model's own unit (|β| for Hückel, eV for the box). */
  readonly gap: number;
  readonly wavelength: number;
};

export class UVVisModel implements TModel {
  public readonly viewer = new MoleculeViewModel(Rotation3.aboutAxis([1, 0, 0], -55));
  public readonly chooser: MoleculeChooser;
  public readonly electronicModelProperty: Property<ElectronicModelValue>;
  /** Orbital drawn as lobes in the viewer (index into the structure's orbitals), or null. */
  public readonly selectedOrbitalProperty: Property<number | null>;

  public readonly piSystemProperty: TReadOnlyProperty<PiSystem | null>;
  /** Null when the box is chosen for a molecule that is not a linear chain. */
  public readonly predictionProperty: TReadOnlyProperty<Prediction | null>;
  public readonly measuredWavelengthProperty: TReadOnlyProperty<number | null>;
  public readonly spectrumProperty: TReadOnlyProperty<SampledCurve>;
  public readonly measuredSpectrumProperty: TReadOnlyProperty<SampledCurve>;
  public readonly predictedColorProperty: TReadOnlyProperty<readonly [number, number, number] | null>;
  public readonly measuredColorProperty: TReadOnlyProperty<readonly [number, number, number] | null>;

  /** Absolute absorbance (Beer–Lambert) instead of unit-height bands. */
  public readonly quantitativeProperty: BooleanProperty;
  /** Concentration as a fraction of maxConcentrationProperty (what the slider sets). */
  public readonly concentrationFractionProperty: NumberProperty;
  /** µmol/L. */
  public readonly maxConcentrationProperty: TReadOnlyProperty<number>;
  public readonly concentrationProperty: TReadOnlyProperty<number>;
  /** cm. */
  public readonly pathLengthProperty: NumberProperty;
  public readonly molarAbsorptivityProperty: TReadOnlyProperty<number | null>;
  /** ε·b·c at λmax — the true absorbance. */
  public readonly peakAbsorbanceProperty: TReadOnlyProperty<number>;
  /** What the spectrometer reads at λmax, with stray light. */
  public readonly measuredPeakAbsorbanceProperty: TReadOnlyProperty<number>;
  /** Measured A at λmax against concentration (0 to the maximum), and the ideal line εb·c. */
  public readonly calibrationProperty: TReadOnlyProperty<SampledCurve>;
  public readonly idealCalibrationProperty: TReadOnlyProperty<SampledCurve>;

  public constructor() {
    this.chooser = new MoleculeChooser(
      INITIAL_MOLECULE,
      (entry) => entry.id in MEASURED_MAXIMA && hasMoleculeData(entry.id),
    );
    this.electronicModelProperty = new Property<ElectronicModelValue>(ElectronicModel.HUECKEL);
    this.selectedOrbitalProperty = new Property<number | null>(null);
    this.quantitativeProperty = new BooleanProperty(false);
    this.concentrationFractionProperty = new NumberProperty(DEFAULT_CONCENTRATION_FRACTION, {
      range: CONCENTRATION_FRACTION_RANGE,
    });
    this.pathLengthProperty = new NumberProperty(DEFAULT_PATH_LENGTH, { range: PATH_LENGTH_RANGE });

    this.piSystemProperty = new DerivedProperty([this.viewer.moleculeProperty], (molecule) =>
      molecule ? new PiSystem(new MoleculeGraph(molecule)) : null,
    );
    this.predictionProperty = new DerivedProperty(
      [this.piSystemProperty, this.electronicModelProperty, this.chooser.moleculeIdProperty],
      (pi, model, id) => (pi ? predict(pi, model, familyOf(id)) : null),
    );
    this.measuredWavelengthProperty = new DerivedProperty([this.viewer.moleculeProperty], (molecule) =>
      molecule ? (MEASURED_MAXIMA[molecule.id] ?? null) : null,
    );
    this.molarAbsorptivityProperty = new DerivedProperty([this.viewer.moleculeProperty], (molecule) =>
      molecule ? (MOLAR_ABSORPTIVITY[molecule.id] ?? null) : null,
    );
    this.maxConcentrationProperty = new DerivedProperty([this.molarAbsorptivityProperty], maxConcentration);
    this.concentrationProperty = new DerivedProperty(
      [this.concentrationFractionProperty, this.maxConcentrationProperty],
      (fraction, maximum) => fraction * maximum,
    );
    this.peakAbsorbanceProperty = new DerivedProperty(
      [this.molarAbsorptivityProperty, this.pathLengthProperty, this.concentrationProperty],
      (epsilon, b, c) => beerLambert(epsilon ?? 0, b, c),
    );
    this.measuredPeakAbsorbanceProperty = new DerivedProperty([this.peakAbsorbanceProperty], measuredAbsorbance);
    // In the qualitative view every band is drawn (and coloured) at absorbance 1.
    const bandScaleProperty = new DerivedProperty(
      [this.quantitativeProperty, this.peakAbsorbanceProperty],
      (quantitative, peak) => (quantitative ? peak : null),
    );
    this.spectrumProperty = new DerivedProperty([this.predictionProperty, bandScaleProperty], (prediction, scale) =>
      bandSpectrum(prediction?.wavelength ?? null, scale),
    );
    this.measuredSpectrumProperty = new DerivedProperty(
      [this.measuredWavelengthProperty, bandScaleProperty],
      (wavelength, scale) => bandSpectrum(wavelength, scale),
    );
    this.predictedColorProperty = new DerivedProperty(
      [this.predictionProperty, bandScaleProperty],
      (prediction, scale) => (prediction ? colorOfBand(prediction.wavelength, scale ?? COLOR_ABSORBANCE) : null),
    );
    this.measuredColorProperty = new DerivedProperty(
      [this.measuredWavelengthProperty, bandScaleProperty],
      (wavelength, scale) => (wavelength === null ? null : colorOfBand(wavelength, scale ?? COLOR_ABSORBANCE)),
    );
    this.calibrationProperty = new DerivedProperty(
      [this.molarAbsorptivityProperty, this.pathLengthProperty, this.maxConcentrationProperty],
      (epsilon, b, maximum) => calibrationCurve(epsilon ?? 0, b, maximum, true),
    );
    this.idealCalibrationProperty = new DerivedProperty(
      [this.molarAbsorptivityProperty, this.pathLengthProperty, this.maxConcentrationProperty],
      (epsilon, b, maximum) => calibrationCurve(epsilon ?? 0, b, maximum, false),
    );

    this.chooser.moleculeIdProperty.link((id) => {
      loadMolecule(id).then(
        (molecule) => {
          if (this.chooser.moleculeIdProperty.value === id) {
            this.viewer.moleculeProperty.value = molecule;
            this.selectHomo();
          }
        },
        () => {
          this.viewer.moleculeProperty.value = null;
        },
      );
    });
    this.electronicModelProperty.lazyLink(() => this.selectHomo());
    this.selectedOrbitalProperty.link(() => this.updateLobes());
    this.predictionProperty.lazyLink(() => this.updateLobes());
  }

  /** Shows the HOMO, the orbital the absorbed photon empties. */
  public selectHomo(): void {
    const homo = this.predictionProperty.value?.structure.homo ?? -1;
    this.selectedOrbitalProperty.value = homo >= 0 ? homo : null;
    this.updateLobes();
  }

  private updateLobes(): void {
    const pi = this.piSystemProperty.value;
    const index = this.selectedOrbitalProperty.value;
    const orbital = index === null ? undefined : this.predictionProperty.value?.structure.orbitals[index];
    this.viewer.orbitalLobesProperty.value = pi && orbital ? pi.lobes(orbital) : null;
  }

  public reset(): void {
    this.electronicModelProperty.reset();
    this.quantitativeProperty.reset();
    this.concentrationFractionProperty.reset();
    this.pathLengthProperty.reset();
    this.chooser.reset();
    this.viewer.reset();
    this.selectHomo();
  }

  public step(dt: number): void {
    this.viewer.step(dt);
  }
}

export function familyOf(id: string): MoleculeFamilyValue | null {
  return LIBRARY.find((entry) => entry.id === id)?.family ?? null;
}

export function predict(
  pi: PiSystem,
  model: ElectronicModelValue,
  family: MoleculeFamilyValue | null,
): Prediction | null {
  if (pi.atoms.length < 2) {
    return null;
  }
  if (model === ElectronicModel.BOX) {
    if (!pi.isLinearChain) {
      return null;
    }
    const structure = pi.box();
    const gap = (structure.orbitals[structure.lumo]?.energy ?? 0) - (structure.orbitals[structure.homo]?.energy ?? 0);
    return { structure, gap, wavelength: boxWavelength(pi.boxLength(), pi.electrons) };
  }
  const structure = pi.hueckel();
  const gap = (structure.orbitals[structure.lumo]?.energy ?? 0) - (structure.orbitals[structure.homo]?.energy ?? 0);
  const calibration = (family && HUECKEL_CALIBRATION[family]) || HUECKEL_CALIBRATION[MoleculeFamily.POLYENES];
  const energy = (calibration?.a ?? 0) + (calibration?.b ?? 1) * gap;
  return { structure, gap, wavelength: gapToWavelength(energy) };
}

/**
 * A Gaussian band (in wavenumber) at λmax, sampled on WAVELENGTH_RANGE; flat for null. With
 * `peakAbsorbance` it is the spectrometer reading of a band that truly peaks there (stray light
 * included); without it, unit height.
 */
export function bandSpectrum(wavelength: number | null, peakAbsorbance: number | null = null): SampledCurve {
  const x = new Float64Array(SPECTRUM_SAMPLES);
  const y = new Float64Array(SPECTRUM_SAMPLES);
  const step = WAVELENGTH_RANGE.getLength() / (SPECTRUM_SAMPLES - 1);
  for (let i = 0; i < SPECTRUM_SAMPLES; i++) {
    x[i] = WAVELENGTH_RANGE.min + i * step;
    const band = wavelength === null ? 0 : bandAbsorbance(x[i] ?? 0, wavelength);
    y[i] = peakAbsorbance === null ? band : measuredAbsorbance(peakAbsorbance * band);
  }
  return { x, y };
}

/** A = ε·b·c with ε in L mol⁻¹ cm⁻¹, b in cm and c in µmol/L. */
export function beerLambert(epsilon: number, pathLength: number, concentration: number): number {
  return epsilon * pathLength * concentration * 1e-6;
}

/**
 * The absorbance a spectrometer reports when a fraction STRAY_LIGHT of its light bypasses the
 * sample: A_measured = −log₁₀((T + s)/(1 + s)), equal to A when dilute, capped near 3.
 */
export function measuredAbsorbance(absorbance: number): number {
  return -Math.log10((10 ** -absorbance + STRAY_LIGHT) / (1 + STRAY_LIGHT));
}

/** Top of the concentration slider for a molar absorptivity, µmol/L (1–2–5 steps). */
export function maxConcentration(epsilon: number | null): number {
  const target = epsilon ? (MAX_CONCENTRATION_ABSORBANCE * 1e6) / epsilon : 100;
  const decade = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5, 10].map((step) => step * decade).find((value) => value >= target * (1 - 1e-9)) ?? 10 * decade;
}

/** Absorbance at λmax against concentration from 0 to `maximum` (µmol/L), measured or ideal. */
export function calibrationCurve(
  epsilon: number,
  pathLength: number,
  maximum: number,
  measured: boolean,
): SampledCurve {
  const x = new Float64Array(CALIBRATION_SAMPLES);
  const y = new Float64Array(CALIBRATION_SAMPLES);
  for (let i = 0; i < CALIBRATION_SAMPLES; i++) {
    const c = (i * maximum) / (CALIBRATION_SAMPLES - 1);
    const a = beerLambert(epsilon, pathLength, c);
    x[i] = c;
    y[i] = measured ? measuredAbsorbance(a) : a;
  }
  return { x, y };
}

function bandAbsorbance(lambda: number, maximum: number): number {
  const t = (1e7 / lambda - 1e7 / maximum) / BAND_SIGMA;
  return Math.exp(-0.5 * t * t);
}

/** The colour seen through a sample whose band peaks at λmax with the given absorbance. */
export function colorOfBand(wavelength: number, peakAbsorbance = COLOR_ABSORBANCE): readonly [number, number, number] {
  return perceivedColor((lambda) => peakAbsorbance * bandAbsorbance(lambda, wavelength));
}
