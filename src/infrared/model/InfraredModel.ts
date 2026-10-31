/**
 * InfraredModel.ts
 *
 * State of the Infrared screen: the molecule, an isotope substitution, the normal modes computed
 * in the browser from the molecule's B3LYP Hessian, the broadened transmittance spectrum, and the
 * selected mode, which the viewer animates.
 *
 * Isotope substitution only changes masses, so it re-runs the normal-mode analysis on the same
 * Hessian — exactly the Born–Oppenheimer statement that isotopes share one potential surface.
 *
 * For HCl a high-resolution mode replaces the single band by its rotational fine structure
 * (RotationalFineStructure.ts): P and R branches whose envelope depends on the temperature.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { defaultIsotopeMass, isotopesFor } from "../../common/model/Isotopes.js";
import { hasVibrationData, loadMolecule } from "../../common/model/library/SpectroscopyLibrary.js";
import type { Molecule } from "../../common/model/Molecule.js";
import { neighborLists } from "../../common/model/Molecule.js";
import { MoleculeChooser } from "../../common/model/MoleculeChooser.js";
import { MoleculeViewModel } from "../../common/model/MoleculeViewModel.js";
import { lorentzianSum, type SampledCurve, type StickPeak } from "../../common/model/SpectrumCurve.js";
import { describeMode, type ModeCharacter } from "../../common/model/vibrations/ModeCharacter.js";
import { analyzeNormalModes, type NormalMode } from "../../common/model/vibrations/NormalModeAnalysis.js";
import {
  DEFAULT_TEMPERATURE,
  type FineStructure,
  fineAbsorbance,
  fineStructure,
  fineZoomAbsorbance,
  hasFineStructure,
  LINE_ZOOM_HALF_WIDTH,
  type RotationalLine,
  TEMPERATURE_RANGE,
} from "./RotationalFineStructure.js";

/** The molecule shown first: three modes, all IR-active, easy to see. */
const INITIAL_MOLECULE = "water";

/** Wavenumber window of a mid-IR spectrometer, cm⁻¹. */
export const IR_RANGE = new Range(400, 4000);
const CURVE_SAMPLES = 1200;

/** Line half-width (HWHM) range and default, cm⁻¹. */
export const HALF_WIDTH_RANGE = new Range(2, 40);
const DEFAULT_HALF_WIDTH = 10;

/** The strongest band is scaled to this absorbance, so it dips to ~5 % transmittance. */
export const PEAK_ABSORBANCE = 1.3;

/** Modes weaker than this fraction of the strongest are not offered to the peak cursor. */
const VISIBLE_FRACTION = 0.01;

export const IsotopeScheme = {
  NATURAL: "natural",
  EXCHANGE_DEUTERIUM: "exchangeDeuterium",
  ALL_DEUTERIUM: "allDeuterium",
  CARBON_13: "carbon13",
  OXYGEN_18: "oxygen18",
  CHLORINE_37: "chlorine37",
} as const;
export type IsotopeSchemeValue = (typeof IsotopeScheme)[keyof typeof IsotopeScheme];

/** Identifies a rotational line across changes of temperature (which add or drop weak lines). */
export type RotationalLineKey = {
  readonly branch: RotationalLine["branch"];
  readonly j: number;
  readonly isotopologue: number;
};

export type InfraredPeak = NormalMode & {
  /** Index into the mode list. */
  readonly index: number;
  readonly character: ModeCharacter;
  /** Intensity relative to the strongest mode, 0–1. */
  readonly relativeIntensity: number;
};

export class InfraredModel implements TModel {
  public readonly viewer = new MoleculeViewModel();
  private disposed = false;
  private loadGeneration = 0;
  public readonly chooser: MoleculeChooser;
  public readonly isotopeSchemeProperty: Property<IsotopeSchemeValue>;
  public readonly halfWidthProperty: NumberProperty;
  public readonly showSticksProperty: BooleanProperty;
  public readonly showRegionsProperty: BooleanProperty;
  /** Index into peaksProperty of the selected (animating) mode, or null. */
  public readonly selectedPeakProperty: Property<number | null>;
  /** Show the rotational fine structure instead of the band (only where hasFineStructure). */
  public readonly fineStructureProperty: BooleanProperty;
  /** Gas temperature for the fine structure, K. */
  public readonly temperatureProperty: NumberProperty;
  public readonly selectedLineProperty: Property<RotationalLineKey | null>;

  /** Whether the current molecule offers a fine-structure view. */
  public readonly fineStructureAvailableProperty: TReadOnlyProperty<boolean>;
  /** True while the fine structure is shown. */
  public readonly fineStructureShownProperty: TReadOnlyProperty<boolean>;
  public readonly fineProperty: TReadOnlyProperty<FineStructure | null>;
  public readonly fineRangeProperty: TReadOnlyProperty<Range>;
  public readonly fineAbsorbanceProperty: TReadOnlyProperty<SampledCurve>;
  public readonly fineTransmittanceProperty: TReadOnlyProperty<SampledCurve>;
  public readonly selectedLineDataProperty: TReadOnlyProperty<RotationalLine | null>;
  /** ±LINE_ZOOM_HALF_WIDTH around the selected line (or the band origin). */
  public readonly lineZoomRangeProperty: TReadOnlyProperty<Range>;
  public readonly lineZoomAbsorbanceProperty: TReadOnlyProperty<SampledCurve>;
  public readonly lineZoomTransmittanceProperty: TReadOnlyProperty<SampledCurve>;

  public readonly peaksProperty: TReadOnlyProperty<readonly InfraredPeak[]>;
  /** Plot as absorbance (a Preferences option) rather than percent transmittance. */
  public readonly absorbanceProperty: TReadOnlyProperty<boolean>;
  /** Percent transmittance across IR_RANGE. */
  public readonly spectrumProperty: TReadOnlyProperty<SampledCurve>;
  /** Absorbance across IR_RANGE (the strongest band reaches PEAK_ABSORBANCE). */
  public readonly absorbanceSpectrumProperty: TReadOnlyProperty<SampledCurve>;

  public constructor(absorbanceProperty: TReadOnlyProperty<boolean>) {
    this.absorbanceProperty = absorbanceProperty;
    this.chooser = new MoleculeChooser(INITIAL_MOLECULE, (entry) => hasVibrationData(entry.id));
    this.isotopeSchemeProperty = new Property<IsotopeSchemeValue>(IsotopeScheme.NATURAL);
    this.halfWidthProperty = new NumberProperty(DEFAULT_HALF_WIDTH, { range: HALF_WIDTH_RANGE });
    this.showSticksProperty = new BooleanProperty(false);
    this.showRegionsProperty = new BooleanProperty(true);
    this.selectedPeakProperty = new Property<number | null>(null);
    this.fineStructureProperty = new BooleanProperty(false);
    this.temperatureProperty = new NumberProperty(DEFAULT_TEMPERATURE, { range: TEMPERATURE_RANGE });
    this.selectedLineProperty = new Property<RotationalLineKey | null>(null);

    this.peaksProperty = new DerivedProperty(
      [this.viewer.moleculeProperty, this.isotopeSchemeProperty],
      (molecule, scheme): readonly InfraredPeak[] => (molecule ? computePeaks(molecule, scheme) : []),
    );
    this.absorbanceSpectrumProperty = new DerivedProperty(
      [this.peaksProperty, this.halfWidthProperty],
      (peaks, halfWidth) => absorbanceCurve(peaks, halfWidth),
    );
    this.spectrumProperty = new DerivedProperty([this.absorbanceSpectrumProperty], (absorbance) =>
      transmittanceFromAbsorbance(absorbance),
    );

    this.fineStructureAvailableProperty = new DerivedProperty([this.viewer.moleculeProperty], hasFineStructure);
    this.fineStructureShownProperty = DerivedProperty.and([
      this.fineStructureProperty,
      this.fineStructureAvailableProperty,
    ]);
    this.fineProperty = new DerivedProperty(
      [this.viewer.moleculeProperty, this.isotopeSchemeProperty, this.temperatureProperty],
      (molecule, scheme, temperature) =>
        molecule && hasFineStructure(molecule)
          ? fineStructure(molecule, isotopeMasses(molecule, scheme), temperature)
          : null,
    );
    this.fineRangeProperty = new DerivedProperty([this.fineProperty], (fine) => fine?.range ?? IR_RANGE);
    this.fineAbsorbanceProperty = new DerivedProperty([this.fineProperty], (fine) =>
      fine ? fineAbsorbance(fine, PEAK_ABSORBANCE) : EMPTY_CURVE,
    );
    this.fineTransmittanceProperty = new DerivedProperty([this.fineAbsorbanceProperty], transmittanceFromAbsorbance);
    this.selectedLineDataProperty = new DerivedProperty([this.fineProperty, this.selectedLineProperty], (fine, key) =>
      fine && key ? (fine.lines.find((line) => sameLine(line, key)) ?? null) : null,
    );
    this.lineZoomRangeProperty = new DerivedProperty(
      [this.selectedLineDataProperty, this.fineProperty],
      (line, fine) => {
        const centre = line?.wavenumber ?? fine?.isotopologues[0]?.origin ?? 0;
        return new Range(centre - LINE_ZOOM_HALF_WIDTH, centre + LINE_ZOOM_HALF_WIDTH);
      },
    );
    this.lineZoomAbsorbanceProperty = new DerivedProperty(
      [this.fineProperty, this.lineZoomRangeProperty],
      (fine, range) => (fine ? fineZoomAbsorbance(fine, range.getCenter(), PEAK_ABSORBANCE) : EMPTY_CURVE),
    );
    this.lineZoomTransmittanceProperty = new DerivedProperty(
      [this.lineZoomAbsorbanceProperty],
      transmittanceFromAbsorbance,
    );

    this.chooser.moleculeIdProperty.link((id) => {
      this.selectedPeakProperty.value = null;
      this.selectedLineProperty.value = null;
      this.viewer.loadErrorProperty.value = false;
      const generation = ++this.loadGeneration;
      loadMolecule(id).then(
        (molecule) => {
          // Ignore a load that finishes after the user has already moved on, or after dispose.
          if (!this.disposed && generation === this.loadGeneration && this.chooser.moleculeIdProperty.value === id) {
            this.viewer.moleculeProperty.value = molecule;
          }
        },
        () => {
          if (!this.disposed && generation === this.loadGeneration && this.chooser.moleculeIdProperty.value === id) {
            this.viewer.moleculeProperty.value = null;
            this.viewer.loadErrorProperty.value = true;
          }
        },
      );
    });
    this.isotopeSchemeProperty.lazyLink(() => {
      this.selectedPeakProperty.value = null;
      this.selectedLineProperty.value = null;
    });
    this.fineStructureShownProperty.lazyLink(() => {
      this.selectedPeakProperty.value = null;
      this.selectedLineProperty.value = null;
    });
    // A selected rotational line still belongs to the one stretching mode, so the molecule vibrates.
    this.selectedLineProperty.link((key) => {
      if (key || this.selectedPeakProperty.value === null) {
        const stretch = key ? this.peaksProperty.value[0] : undefined;
        this.viewer.displacementProperty.value = stretch ? stretch.displacements : null;
        this.viewer.highlightedAtomsProperty.value = stretch ? stretch.character.atoms : [];
      }
    });
    this.selectedPeakProperty.link((index) => {
      const peak = index === null ? undefined : this.peaksProperty.value[index];
      this.viewer.displacementProperty.value = peak ? peak.displacements : null;
      this.viewer.highlightedAtomsProperty.value = peak ? peak.character.atoms : [];
    });
  }

  /** The selected peak, if any. */
  public get selectedPeak(): InfraredPeak | null {
    const index = this.selectedPeakProperty.value;
    return index === null ? null : (this.peaksProperty.value[index] ?? null);
  }

  /** Peaks strong enough to see, in increasing wavenumber (the keyboard cursor's stops). */
  public visiblePeaks(): InfraredPeak[] {
    return this.peaksProperty.value.filter(
      (peak) => peak.relativeIntensity >= VISIBLE_FRACTION && IR_RANGE.contains(peak.wavenumber),
    );
  }

  /** Rotational lines strong enough to see (≥ 1 % of the strongest), in increasing wavenumber. */
  public visibleLines(): RotationalLine[] {
    return (this.fineProperty.value?.lines ?? []).filter((line) => line.intensity >= VISIBLE_FRACTION);
  }

  /** Selects the strongest visible peak within `tolerance` cm⁻¹ of `wavenumber`; clears if none. */
  public selectNear(wavenumber: number, tolerance: number): void {
    if (this.fineStructureShownProperty.value) {
      let line: RotationalLine | null = null;
      for (const candidate of this.visibleLines()) {
        const distance = Math.abs(candidate.wavenumber - wavenumber);
        if (distance <= tolerance && (!line || distance < Math.abs(line.wavenumber - wavenumber))) {
          line = candidate;
        }
      }
      this.selectedLineProperty.value = line ? lineKey(line) : null;
      return;
    }
    let best: InfraredPeak | null = null;
    for (const peak of this.visiblePeaks()) {
      if (Math.abs(peak.wavenumber - wavenumber) <= tolerance && (!best || peak.intensity > best.intensity)) {
        best = peak;
      }
    }
    this.selectedPeakProperty.value = best ? best.index : null;
  }

  /** Moves the selection to the next (+1) or previous (−1) visible peak by wavenumber. */
  public stepSelection(direction: 1 | -1): void {
    if (this.fineStructureShownProperty.value) {
      const lines = this.visibleLines();
      const key = this.selectedLineProperty.value;
      const current = key ? lines.findIndex((line) => sameLine(line, key)) : -1;
      const next =
        current < 0 ? (direction > 0 ? 0 : lines.length - 1) : (current + direction + lines.length) % lines.length;
      const nextLine = lines[next];
      this.selectedLineProperty.value = nextLine ? lineKey(nextLine) : null;
      return;
    }
    const peaks = this.visiblePeaks();
    if (peaks.length === 0) {
      return;
    }
    const current = peaks.findIndex((peak) => peak.index === this.selectedPeakProperty.value);
    const next =
      current < 0 ? (direction > 0 ? 0 : peaks.length - 1) : (current + direction + peaks.length) % peaks.length;
    this.selectedPeakProperty.value = peaks[next]?.index ?? null;
  }

  public reset(): void {
    this.isotopeSchemeProperty.reset();
    this.halfWidthProperty.reset();
    this.showSticksProperty.reset();
    this.showRegionsProperty.reset();
    this.selectedPeakProperty.reset();
    this.fineStructureProperty.reset();
    this.temperatureProperty.reset();
    this.selectedLineProperty.reset();
    this.chooser.reset();
    this.viewer.reset();
  }

  public step(dt: number): void {
    this.viewer.step(dt);
  }

  public dispose(): void {
    this.disposed = true;
    for (const property of [
      this.lineZoomTransmittanceProperty,
      this.lineZoomAbsorbanceProperty,
      this.lineZoomRangeProperty,
      this.selectedLineDataProperty,
      this.fineTransmittanceProperty,
      this.fineAbsorbanceProperty,
      this.fineRangeProperty,
      this.fineProperty,
      this.fineStructureShownProperty,
      this.fineStructureAvailableProperty,
      this.spectrumProperty,
      this.absorbanceSpectrumProperty,
      this.peaksProperty,
    ]) {
      disposeOwned(property);
    }
    this.viewer.dispose();
    this.chooser.dispose();
    for (const property of [
      this.isotopeSchemeProperty,
      this.halfWidthProperty,
      this.showSticksProperty,
      this.showRegionsProperty,
      this.selectedPeakProperty,
      this.fineStructureProperty,
      this.temperatureProperty,
      this.selectedLineProperty,
    ]) {
      property.dispose();
    }
  }
}

function disposeOwned(property: object): void {
  (property as { dispose?: () => void }).dispose?.();
}

const EMPTY_CURVE: SampledCurve = { x: new Float64Array(0), y: new Float64Array(0) };

function lineKey(line: RotationalLine): RotationalLineKey {
  return { branch: line.branch, j: line.j, isotopologue: line.isotopologue };
}

function sameLine(line: RotationalLine, key: RotationalLineKey): boolean {
  return line.branch === key.branch && line.j === key.j && line.isotopologue === key.isotopologue;
}

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
