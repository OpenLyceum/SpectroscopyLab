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
 */

import { DerivedProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
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

  public constructor() {
    this.chooser = new MoleculeChooser(
      INITIAL_MOLECULE,
      (entry) => entry.id in MEASURED_MAXIMA && hasMoleculeData(entry.id),
    );
    this.electronicModelProperty = new Property<ElectronicModelValue>(ElectronicModel.HUECKEL);
    this.selectedOrbitalProperty = new Property<number | null>(null);

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
    this.spectrumProperty = new DerivedProperty([this.predictionProperty], (prediction) =>
      bandSpectrum(prediction?.wavelength ?? null),
    );
    this.measuredSpectrumProperty = new DerivedProperty([this.measuredWavelengthProperty], (wavelength) =>
      bandSpectrum(wavelength),
    );
    this.predictedColorProperty = new DerivedProperty([this.predictionProperty], (prediction) =>
      prediction ? colorOfBand(prediction.wavelength) : null,
    );
    this.measuredColorProperty = new DerivedProperty([this.measuredWavelengthProperty], (wavelength) =>
      wavelength === null ? null : colorOfBand(wavelength),
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

/** A unit-height Gaussian band (in wavenumber) at λmax, sampled on WAVELENGTH_RANGE; flat for null. */
export function bandSpectrum(wavelength: number | null): SampledCurve {
  const x = new Float64Array(SPECTRUM_SAMPLES);
  const y = new Float64Array(SPECTRUM_SAMPLES);
  const step = WAVELENGTH_RANGE.getLength() / (SPECTRUM_SAMPLES - 1);
  for (let i = 0; i < SPECTRUM_SAMPLES; i++) {
    x[i] = WAVELENGTH_RANGE.min + i * step;
    y[i] = wavelength === null ? 0 : bandAbsorbance(x[i] ?? 0, wavelength);
  }
  return { x, y };
}

function bandAbsorbance(lambda: number, maximum: number): number {
  const t = (1e7 / lambda - 1e7 / maximum) / BAND_SIGMA;
  return Math.exp(-0.5 * t * t);
}

/** The colour seen through a sample whose band peaks at λmax with absorbance COLOR_ABSORBANCE. */
export function colorOfBand(wavelength: number): readonly [number, number, number] {
  return perceivedColor((lambda) => COLOR_ABSORBANCE * bandAbsorbance(lambda, wavelength));
}
