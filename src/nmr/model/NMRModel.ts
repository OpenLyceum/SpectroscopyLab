/**
 * NMRModel.ts
 *
 * State of the ¹H NMR screen: the molecule, the spectrometer frequency, a D₂O shake, the TMS
 * reference line, the proton environments with their first-order multiplets, the full spectrum
 * (and its integral trace), and a zoom on the selected signal.
 *
 * Shifts are fixed in ppm; splittings are fixed in Hz. Raising the field therefore narrows every
 * multiplet on the ppm axis (the zoom shows it) — the reason chemists pay for high-field magnets.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { hasMoleculeData, loadMolecule } from "../../common/model/library/SpectroscopyLibrary.js";
import { MoleculeChooser } from "../../common/model/MoleculeChooser.js";
import { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import { MoleculeViewModel } from "../../common/model/MoleculeViewModel.js";
import { lorentzianSum, type SampledCurve, type StickPeak } from "../../common/model/SpectrumCurve.js";
import { multipletLines, type ProtonEnvironment, protonEnvironments } from "./ProtonSpectrum.js";

/** Chemical-shift window, ppm (TMS at 0, carboxylic acids near 12). */
export const SHIFT_RANGE = new Range(-0.5, 12.5);
/** Window of the multiplet zoom, ppm either side of the signal centre. */
export const ZOOM_HALF_WIDTH = 0.3;
export const ZOOM_RANGE = new Range(-ZOOM_HALF_WIDTH, ZOOM_HALF_WIDTH);
/** Spectrometer (¹H Larmor) frequency, MHz. */
export const FIELD_RANGE = new Range(60, 600);
const DEFAULT_FIELD = 300;

/** Natural line half-width (HWHM) of a sharp signal, and of a broad exchanging O–H/N–H, Hz. */
const LINE_HALF_WIDTH_HZ = 0.8;
const BROAD_HALF_WIDTH_HZ = 12;
const SPECTRUM_SAMPLES = 6500;
const ZOOM_SAMPLES = 1500;
/** The tallest line is drawn at this height; the integral trace tops out at INTEGRAL_HEIGHT. */
const PEAK_HEIGHT = 1;
const INTEGRAL_HEIGHT = 0.9;

/** Molecules the screen offers: any with hydrogen except HCl (no C–H, no meaningful ¹H spectrum). */
const NMR_EXCLUDED = new Set(["hydrogen-chloride"]);
const INITIAL_MOLECULE = "ethanol";

export class NMRModel implements TModel {
  public readonly viewer = new MoleculeViewModel();
  public readonly chooser: MoleculeChooser;
  public readonly fieldProperty: NumberProperty;
  public readonly d2oShakeProperty: BooleanProperty;
  public readonly showTmsProperty: BooleanProperty;
  public readonly showIntegralProperty: BooleanProperty;
  /** Index into environmentsProperty of the selected signal, or null. */
  public readonly selectedSignalProperty: Property<number | null>;

  /** All proton environments of the molecule (D₂O-exchanged ones included). */
  public readonly allEnvironmentsProperty: TReadOnlyProperty<readonly ProtonEnvironment[]>;
  /** The environments that give a signal (exchangeable ones vanish after a D₂O shake). */
  public readonly environmentsProperty: TReadOnlyProperty<readonly ProtonEnvironment[]>;
  public readonly spectrumProperty: TReadOnlyProperty<SampledCurve>;
  public readonly integralProperty: TReadOnlyProperty<SampledCurve>;
  /** The selected signal on ZOOM_RANGE (offset from its centre, ppm); flat when none is selected. */
  public readonly zoomProperty: TReadOnlyProperty<SampledCurve>;

  public constructor() {
    this.chooser = new MoleculeChooser(
      INITIAL_MOLECULE,
      (entry) => hasMoleculeData(entry.id) && entry.formula.includes("H") && !NMR_EXCLUDED.has(entry.id),
    );
    this.fieldProperty = new NumberProperty(DEFAULT_FIELD, { range: FIELD_RANGE });
    this.d2oShakeProperty = new BooleanProperty(false);
    this.showTmsProperty = new BooleanProperty(true);
    this.showIntegralProperty = new BooleanProperty(false);
    this.selectedSignalProperty = new Property<number | null>(null);

    this.allEnvironmentsProperty = new DerivedProperty(
      [this.viewer.moleculeProperty],
      (molecule): readonly ProtonEnvironment[] => (molecule ? protonEnvironments(new MoleculeGraph(molecule)) : []),
    );
    this.environmentsProperty = new DerivedProperty(
      [this.allEnvironmentsProperty, this.d2oShakeProperty],
      (environments, d2o) => (d2o ? environments.filter((e) => !e.exchangeable) : environments),
    );
    this.spectrumProperty = new DerivedProperty(
      [this.environmentsProperty, this.fieldProperty, this.showTmsProperty],
      (environments, field, tms) => fullSpectrum(environments, field, tms),
    );
    this.integralProperty = new DerivedProperty(
      [this.environmentsProperty, this.fieldProperty],
      (environments, field) => integralTrace(fullSpectrum(environments, field, false)),
    );
    this.zoomProperty = new DerivedProperty(
      [this.environmentsProperty, this.selectedSignalProperty, this.fieldProperty],
      (environments, index, field) => zoomSpectrum(index === null ? undefined : environments[index], field),
    );

    this.chooser.moleculeIdProperty.link((id) => {
      this.selectedSignalProperty.value = null;
      loadMolecule(id).then(
        (molecule) => {
          if (this.chooser.moleculeIdProperty.value === id) {
            this.viewer.moleculeProperty.value = molecule;
            this.updateLabels();
          }
        },
        () => {
          this.viewer.moleculeProperty.value = null;
        },
      );
    });
    this.d2oShakeProperty.lazyLink(() => {
      this.selectedSignalProperty.value = null;
      this.updateLabels();
    });
    this.selectedSignalProperty.link((index) => {
      const environment = index === null ? undefined : this.environmentsProperty.value[index];
      this.viewer.highlightedAtomsProperty.value = environment ? environment.atoms : [];
    });
    this.viewer.atomPickedEmitter.addListener((atom) => this.selectAtom(atom));
  }

  public get selectedSignal(): ProtonEnvironment | null {
    const index = this.selectedSignalProperty.value;
    return index === null ? null : (this.environmentsProperty.value[index] ?? null);
  }

  /** Selects the signal of a hydrogen, or of the hydrogens on a clicked heavy atom. */
  public selectAtom(atom: number): void {
    const molecule = this.viewer.molecule;
    if (!molecule) {
      return;
    }
    const hydrogens =
      molecule.elements[atom]?.symbol === "H"
        ? [atom]
        : molecule.bonds
            .filter((b) => b.a === atom || b.b === atom)
            .map((b) => (b.a === atom ? b.b : b.a))
            .filter((n) => molecule.elements[n]?.symbol === "H");
    const index = this.environmentsProperty.value.findIndex((e) => hydrogens.some((h) => e.atoms.includes(h)));
    this.selectedSignalProperty.value = index >= 0 ? index : null;
  }

  /** Selects the signal with a line nearest `shift`, within its multiplet width plus `tolerance` ppm. */
  public selectNear(shift: number, tolerance: number): void {
    const field = this.fieldProperty.value;
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.environmentsProperty.value.forEach((environment, index) => {
      for (const line of multipletLines(environment.couplings)) {
        const distance = Math.abs(environment.shift + line.offsetHz / field - shift);
        if (distance <= tolerance && distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      }
    });
    this.selectedSignalProperty.value = best;
  }

  /** Next (+1, upfield) or previous (−1, downfield) signal; environments are ordered downfield first. */
  public stepSelection(direction: 1 | -1): void {
    const count = this.environmentsProperty.value.length;
    if (count === 0) {
      return;
    }
    const current = this.selectedSignalProperty.value;
    this.selectedSignalProperty.value =
      current === null ? (direction > 0 ? 0 : count - 1) : (current + direction + count) % count;
  }

  /** Letters a, b, c… on each hydrogen, matching the signal table. */
  private updateLabels(): void {
    const molecule = this.viewer.molecule;
    if (!molecule) {
      return;
    }
    const labels: (string | null)[] = molecule.elements.map(() => null);
    for (const environment of this.environmentsProperty.value) {
      for (const atom of environment.atoms) {
        labels[atom] = environment.label;
      }
    }
    this.viewer.atomLabelsProperty.value = labels;
  }

  public reset(): void {
    this.fieldProperty.reset();
    this.d2oShakeProperty.reset();
    this.showTmsProperty.reset();
    this.showIntegralProperty.reset();
    this.selectedSignalProperty.reset();
    this.chooser.reset();
    this.viewer.reset();
    this.updateLabels();
  }

  public step(dt: number): void {
    this.viewer.step(dt);
  }
}

/** Every line of every signal, as sticks on the ppm axis, with heights for equal-area broadening. */
export function spectrumSticks(environments: readonly ProtonEnvironment[], field: number, tms: boolean): StickPeak[] {
  const sticks: StickPeak[] = [];
  for (const environment of environments) {
    // A broad line spreads the same area over a wider Lorentzian, so it is proportionally lower.
    const breadth = environment.exchangeable ? LINE_HALF_WIDTH_HZ / BROAD_HALF_WIDTH_HZ : 1;
    for (const line of multipletLines(environment.couplings)) {
      sticks.push({
        position: environment.shift + line.offsetHz / field,
        height: environment.atoms.length * line.weight * breadth,
      });
    }
  }
  if (tms) {
    sticks.push({ position: 0, height: 1 });
  }
  return sticks;
}

export function fullSpectrum(environments: readonly ProtonEnvironment[], field: number, tms: boolean): SampledCurve {
  const sharp = spectrumSticks(
    environments.filter((e) => !e.exchangeable),
    field,
    tms,
  );
  const broad = spectrumSticks(
    environments.filter((e) => e.exchangeable),
    field,
    false,
  );
  // Never narrower than ~1.2 sample spacings, so a line cannot fall between samples.
  const spacing = SHIFT_RANGE.getLength() / (SPECTRUM_SAMPLES - 1);
  const sharpWidth = Math.max(LINE_HALF_WIDTH_HZ / field, 1.2 * spacing);
  const curve = lorentzianSum(sharp, SHIFT_RANGE.min, SHIFT_RANGE.max, SPECTRUM_SAMPLES, sharpWidth);
  // Keep equal areas when the sharp lines had to be widened for sampling.
  const sharpScale = LINE_HALF_WIDTH_HZ / field / sharpWidth;
  // Broad-line heights were already scaled for equal area in spectrumSticks.
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

function zoomSpectrum(environment: ProtonEnvironment | undefined, field: number): SampledCurve {
  if (!environment) {
    return lorentzianSum([], ZOOM_RANGE.min, ZOOM_RANGE.max, ZOOM_SAMPLES, 1);
  }
  const halfWidth = (environment.exchangeable ? BROAD_HALF_WIDTH_HZ : LINE_HALF_WIDTH_HZ) / field;
  const sticks = multipletLines(environment.couplings).map((line) => ({
    position: line.offsetHz / field,
    height: line.weight,
  }));
  return normalize(lorentzianSum(sticks, ZOOM_RANGE.min, ZOOM_RANGE.max, ZOOM_SAMPLES, halfWidth), PEAK_HEIGHT);
}

function normalize(curve: SampledCurve, height: number): SampledCurve {
  let maximum = 0;
  for (const value of curve.y) {
    maximum = Math.max(maximum, value);
  }
  return maximum > 0 ? { x: curve.x, y: curve.y.map((value) => (value * height) / maximum) } : curve;
}
