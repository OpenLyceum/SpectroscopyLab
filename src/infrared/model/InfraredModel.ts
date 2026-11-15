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
import {
  absorbanceCurve,
  computePeaks,
  type InfraredPeak,
  IR_RANGE,
  IsotopeScheme,
  type IsotopeSchemeValue,
  isotopeMasses,
  PEAK_ABSORBANCE,
  transmittanceFromAbsorbance,
} from "../../common/model/infrared/InfraredSpectrum.js";
import { hasVibrationData, loadMolecule } from "../../common/model/library/SpectroscopyLibrary.js";
import { MoleculeChooser } from "../../common/model/MoleculeChooser.js";
import { MoleculeViewModel } from "../../common/model/MoleculeViewModel.js";
import type { SampledCurve } from "../../common/model/SpectrumCurve.js";
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

/** Line half-width (HWHM) range and default, cm⁻¹. */
export const HALF_WIDTH_RANGE = new Range(2, 40);
const DEFAULT_HALF_WIDTH = 10;

/** Modes weaker than this fraction of the strongest are not offered to the peak cursor. */
const VISIBLE_FRACTION = 0.01;

/** Identifies a rotational line across changes of temperature (which add or drop weak lines). */
export type RotationalLineKey = {
  readonly branch: RotationalLine["branch"];
  readonly j: number;
  readonly isotopologue: number;
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
