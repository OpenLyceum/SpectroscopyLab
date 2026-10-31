/**
 * NMRModel.ts
 *
 * State of the NMR screen: the molecule, the observed nucleus (¹H or ¹³C), the spectrometer
 * frequency, a D₂O shake, the TMS reference line, the signals, the full spectrum (and its ¹H
 * integral trace), and a zoom on the selected signal.
 *
 * Shifts are fixed in ppm; couplings are fixed in Hz. Raising the field therefore narrows every
 * multiplet on the ppm axis (the zoom shows it) and, because the shift differences grow in Hz
 * while J stays put, turns second-order patterns into clean n + 1 multiplets — the reason chemists
 * pay for high-field magnets. The ¹H spectrum is computed exactly from the spin Hamiltonian
 * (SpinSystem.ts) unless the first-order option is chosen.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { hasMoleculeData, loadMolecule } from "../../common/model/library/SpectroscopyLibrary.js";
import { MoleculeChooser } from "../../common/model/MoleculeChooser.js";
import { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import { MoleculeViewModel } from "../../common/model/MoleculeViewModel.js";
import { lorentzianSum, type SampledCurve, type StickPeak } from "../../common/model/SpectrumCurve.js";
import {
  type CarbonEnvironment,
  type CarbonLine,
  CarbonSpectrumType,
  type CarbonSpectrumTypeValue,
  carbonEnvironments,
  carbonLines,
  PROTON_TO_CARBON_FREQUENCY,
} from "./CarbonSpectrum.js";
import { type ProtonEnvironment, protonEnvironments } from "./ProtonSpectrum.js";
import { type ResolvedLine, resolvedLines } from "./SpinSystem.js";

/** ¹H chemical-shift window, ppm (TMS at 0, carboxylic acids near 12). */
export const SHIFT_RANGE = new Range(-0.5, 12.5);
/** ¹³C chemical-shift window, ppm (TMS at 0, ketones near 210). */
export const CARBON_SHIFT_RANGE = new Range(-5, 225);
/** Window of the multiplet zoom, ppm either side of the signal centre. */
export const ZOOM_HALF_WIDTH = 0.3;
export const ZOOM_RANGE = new Range(-ZOOM_HALF_WIDTH, ZOOM_HALF_WIDTH);
/** ¹³C zoom: wide enough for a ¹J-coupled quartet at 300 MHz. */
export const CARBON_ZOOM_HALF_WIDTH = 6;
export const CARBON_ZOOM_RANGE = new Range(-CARBON_ZOOM_HALF_WIDTH, CARBON_ZOOM_HALF_WIDTH);
/** Spectrometer (¹H Larmor) frequency, MHz. */
export const FIELD_RANGE = new Range(60, 600);
const DEFAULT_FIELD = 300;

/** Natural line half-width (HWHM) of a sharp signal, and of a broad exchanging O–H/N–H, Hz. */
const LINE_HALF_WIDTH_HZ = 0.8;
const BROAD_HALF_WIDTH_HZ = 12;
const CARBON_HALF_WIDTH_HZ = 1.5;
const SPECTRUM_SAMPLES = 6500;
const ZOOM_SAMPLES = 1500;
/** The tallest line is drawn at this height; the integral trace tops out at INTEGRAL_HEIGHT. */
const PEAK_HEIGHT = 1;
const INTEGRAL_HEIGHT = 0.9;

export const Nucleus = {
  PROTON: "proton",
  CARBON: "carbon",
} as const;
export type NucleusValue = (typeof Nucleus)[keyof typeof Nucleus];

/** Molecules the screen offers: any with hydrogen except HCl (no C–H, no meaningful ¹H spectrum). */
const NMR_EXCLUDED = new Set(["hydrogen-chloride"]);
const INITIAL_MOLECULE = "ethanol";

export class NMRModel implements TModel {
  public readonly viewer = new MoleculeViewModel();
  private disposed = false;
  private loadGeneration = 0;
  private readonly onAtomPicked = (atom: number) => this.selectAtom(atom);
  public readonly chooser: MoleculeChooser;
  public readonly nucleusProperty: Property<NucleusValue>;
  public readonly fieldProperty: NumberProperty;
  public readonly d2oShakeProperty: BooleanProperty;
  public readonly showTmsProperty: BooleanProperty;
  public readonly showIntegralProperty: BooleanProperty;
  /** Exact spin-Hamiltonian ¹H lines; false gives the first-order n + 1 rule. */
  public readonly secondOrderProperty: BooleanProperty;
  public readonly carbonSpectrumTypeProperty: Property<CarbonSpectrumTypeValue>;
  /** Index into the active nucleus's signal list (environmentsProperty or carbonEnvironmentsProperty), or null. */
  public readonly selectedSignalProperty: Property<number | null>;

  public readonly graphProperty: TReadOnlyProperty<MoleculeGraph | null>;
  /** All proton environments of the molecule (D₂O-exchanged ones included). */
  public readonly allEnvironmentsProperty: TReadOnlyProperty<readonly ProtonEnvironment[]>;
  /** The environments that give a signal (exchangeable ones vanish after a D₂O shake). */
  public readonly environmentsProperty: TReadOnlyProperty<readonly ProtonEnvironment[]>;
  /** Every ¹H line at the current field. */
  public readonly linesProperty: TReadOnlyProperty<readonly ResolvedLine[]>;
  public readonly spectrumProperty: TReadOnlyProperty<SampledCurve>;
  public readonly integralProperty: TReadOnlyProperty<SampledCurve>;
  /** The selected ¹H signal on ZOOM_RANGE (offset from its centre, ppm); flat when none is selected. */
  public readonly zoomProperty: TReadOnlyProperty<SampledCurve>;

  public readonly carbonEnvironmentsProperty: TReadOnlyProperty<readonly CarbonEnvironment[]>;
  public readonly carbonLinesProperty: TReadOnlyProperty<readonly CarbonLine[]>;
  /** Normalised so the tallest line has |height| 1; DEPT-135 CH₂ lines point down. */
  public readonly carbonSpectrumProperty: TReadOnlyProperty<SampledCurve>;
  public readonly carbonZoomProperty: TReadOnlyProperty<SampledCurve>;

  public constructor() {
    this.chooser = new MoleculeChooser(
      INITIAL_MOLECULE,
      (entry) => hasMoleculeData(entry.id) && entry.formula.includes("H") && !NMR_EXCLUDED.has(entry.id),
    );
    this.nucleusProperty = new Property<NucleusValue>(Nucleus.PROTON);
    this.fieldProperty = new NumberProperty(DEFAULT_FIELD, { range: FIELD_RANGE });
    this.d2oShakeProperty = new BooleanProperty(false);
    this.showTmsProperty = new BooleanProperty(true);
    this.showIntegralProperty = new BooleanProperty(false);
    this.secondOrderProperty = new BooleanProperty(true);
    this.carbonSpectrumTypeProperty = new Property<CarbonSpectrumTypeValue>(CarbonSpectrumType.DECOUPLED);
    this.selectedSignalProperty = new Property<number | null>(null);

    this.graphProperty = new DerivedProperty([this.viewer.moleculeProperty], (molecule) =>
      molecule ? new MoleculeGraph(molecule) : null,
    );
    this.allEnvironmentsProperty = new DerivedProperty([this.graphProperty], (graph): readonly ProtonEnvironment[] =>
      graph ? protonEnvironments(graph) : [],
    );
    this.environmentsProperty = new DerivedProperty(
      [this.allEnvironmentsProperty, this.d2oShakeProperty],
      (environments, d2o) => (d2o ? environments.filter((e) => !e.exchangeable) : environments),
    );
    this.linesProperty = new DerivedProperty(
      [this.environmentsProperty, this.fieldProperty, this.secondOrderProperty, this.graphProperty],
      (environments, field, exact, graph) => resolvedLines(environments, field, exact ? graph : null),
    );
    this.spectrumProperty = new DerivedProperty(
      [this.linesProperty, this.fieldProperty, this.showTmsProperty],
      (lines, field, tms) => spectrumFromLines(lines, field, tms),
    );
    this.integralProperty = new DerivedProperty([this.linesProperty, this.fieldProperty], (lines, field) =>
      integralTrace(spectrumFromLines(lines, field, false)),
    );
    this.zoomProperty = new DerivedProperty(
      [this.linesProperty, this.environmentsProperty, this.selectedSignalProperty, this.fieldProperty],
      (lines, environments, index, field) =>
        zoomSpectrum(lines, index === null ? undefined : environments[index], field),
    );

    this.carbonEnvironmentsProperty = new DerivedProperty(
      [this.graphProperty],
      (graph): readonly CarbonEnvironment[] => (graph ? carbonEnvironments(graph) : []),
    );
    this.carbonLinesProperty = new DerivedProperty(
      [this.carbonEnvironmentsProperty, this.carbonSpectrumTypeProperty, this.fieldProperty],
      (environments, type, field) => carbonLines(environments, type, field),
    );
    this.carbonSpectrumProperty = new DerivedProperty(
      [this.carbonLinesProperty, this.fieldProperty, this.showTmsProperty],
      (lines, field, tms) => carbonSpectrum(lines, field, tms),
    );
    this.carbonZoomProperty = new DerivedProperty(
      [this.carbonLinesProperty, this.carbonEnvironmentsProperty, this.selectedSignalProperty, this.fieldProperty],
      (lines, environments, index, field) => carbonZoom(lines, index === null ? undefined : environments[index], field),
    );

    this.chooser.moleculeIdProperty.link((id) => {
      this.selectedSignalProperty.value = null;
      this.viewer.loadErrorProperty.value = false;
      const generation = ++this.loadGeneration;
      loadMolecule(id).then(
        (molecule) => {
          if (!this.disposed && generation === this.loadGeneration && this.chooser.moleculeIdProperty.value === id) {
            this.viewer.moleculeProperty.value = molecule;
            this.updateLabels();
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
    const clearAndRelabel = () => {
      this.selectedSignalProperty.value = null;
      this.updateLabels();
    };
    this.d2oShakeProperty.lazyLink(clearAndRelabel);
    this.nucleusProperty.lazyLink(clearAndRelabel);
    this.carbonSpectrumTypeProperty.lazyLink(() => {
      this.selectedSignalProperty.value = null;
    });
    this.selectedSignalProperty.link(() => {
      this.viewer.highlightedAtomsProperty.value = this.selectedSignal?.atoms ?? [];
    });
    this.viewer.atomPickedEmitter.addListener(this.onAtomPicked);
  }

  public get isCarbon(): boolean {
    return this.nucleusProperty.value === Nucleus.CARBON;
  }

  /** The signals of the observed nucleus. */
  public get signals(): readonly (ProtonEnvironment | CarbonEnvironment)[] {
    return this.isCarbon ? this.carbonEnvironmentsProperty.value : this.environmentsProperty.value;
  }

  public get selectedSignal(): ProtonEnvironment | CarbonEnvironment | null {
    const index = this.selectedSignalProperty.value;
    return index === null ? null : (this.signals[index] ?? null);
  }

  /** Selects the signal of a clicked atom: its own for the observed nucleus, else that of its neighbours. */
  public selectAtom(atom: number): void {
    const molecule = this.viewer.molecule;
    if (!molecule) {
      return;
    }
    const observed = this.isCarbon ? "C" : "H";
    const bonded = molecule.bonds
      .filter((b) => b.a === atom || b.b === atom)
      .map((b) => (b.a === atom ? b.b : b.a))
      .filter((n) => molecule.elements[n]?.symbol === observed);
    const atoms = molecule.elements[atom]?.symbol === observed ? [atom] : bonded;
    const index = this.signals.findIndex((e) => atoms.some((a) => e.atoms.includes(a)));
    this.selectedSignalProperty.value = index >= 0 ? index : null;
  }

  /** Selects the signal with a line nearest `shift`, within `tolerance` ppm. */
  public selectNear(shift: number, tolerance: number): void {
    const lines: readonly { position: number; environment: number }[] = this.isCarbon
      ? this.carbonLinesProperty.value
      : this.linesProperty.value;
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const line of lines) {
      const distance = Math.abs(line.position - shift);
      if (distance <= tolerance && distance < bestDistance) {
        best = line.environment;
        bestDistance = distance;
      }
    }
    this.selectedSignalProperty.value = best;
  }

  /** Next (+1, upfield) or previous (−1, downfield) signal; signals are ordered downfield first. */
  public stepSelection(direction: 1 | -1): void {
    const count = this.signals.length;
    if (count === 0) {
      return;
    }
    const current = this.selectedSignalProperty.value;
    this.selectedSignalProperty.value =
      current === null ? (direction > 0 ? 0 : count - 1) : (current + direction + count) % count;
  }

  /** Letters a, b, c… on each hydrogen (¹H) or numbers 1, 2, 3… on each carbon (¹³C), matching the table. */
  private updateLabels(): void {
    const molecule = this.viewer.molecule;
    if (!molecule) {
      return;
    }
    const labels: (string | null)[] = molecule.elements.map(() => null);
    for (const environment of this.signals) {
      for (const atom of environment.atoms) {
        labels[atom] = environment.label;
      }
    }
    this.viewer.atomLabelsProperty.value = labels;
  }

  public reset(): void {
    this.nucleusProperty.reset();
    this.fieldProperty.reset();
    this.d2oShakeProperty.reset();
    this.showTmsProperty.reset();
    this.showIntegralProperty.reset();
    this.secondOrderProperty.reset();
    this.carbonSpectrumTypeProperty.reset();
    this.selectedSignalProperty.reset();
    this.chooser.reset();
    this.viewer.reset();
    this.updateLabels();
  }

  public dispose(): void {
    this.disposed = true;
    this.viewer.atomPickedEmitter.removeListener(this.onAtomPicked);
    for (const property of [
      this.carbonZoomProperty,
      this.carbonSpectrumProperty,
      this.carbonLinesProperty,
      this.carbonEnvironmentsProperty,
      this.zoomProperty,
      this.integralProperty,
      this.spectrumProperty,
      this.linesProperty,
      this.environmentsProperty,
      this.allEnvironmentsProperty,
      this.graphProperty,
    ]) {
      disposeOwned(property);
    }
    this.viewer.dispose();
    this.chooser.dispose();
    for (const property of [
      this.nucleusProperty,
      this.fieldProperty,
      this.d2oShakeProperty,
      this.showTmsProperty,
      this.showIntegralProperty,
      this.secondOrderProperty,
      this.carbonSpectrumTypeProperty,
      this.selectedSignalProperty,
    ]) {
      property.dispose();
    }
  }

  public step(dt: number): void {
    this.viewer.step(dt);
  }
}

function disposeOwned(property: object): void {
  (property as { dispose?: () => void }).dispose?.();
}

/** First-order lines of every signal as sticks on the ppm axis, with heights for equal-area broadening. */
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

function spectrumFromLines(lines: readonly ResolvedLine[], field: number, tms: boolean): SampledCurve {
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
function zoomSpectrum(
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
  const spacing = CARBON_SHIFT_RANGE.getLength() / (SPECTRUM_SAMPLES - 1);
  const width = Math.max(CARBON_HALF_WIDTH_HZ / (field / PROTON_TO_CARBON_FREQUENCY), 1.2 * spacing);
  return normalize(
    lorentzianSum(sticks, CARBON_SHIFT_RANGE.min, CARBON_SHIFT_RANGE.max, SPECTRUM_SAMPLES, width),
    PEAK_HEIGHT,
  );
}

function carbonZoom(lines: readonly CarbonLine[], environment: CarbonEnvironment | undefined, field: number) {
  if (!environment) {
    return lorentzianSum([], CARBON_ZOOM_RANGE.min, CARBON_ZOOM_RANGE.max, ZOOM_SAMPLES, 1);
  }
  const sticks = lines
    .map((line) => ({ position: line.position - environment.shift, height: line.height }))
    .filter((stick) => Math.abs(stick.position) < 2 * CARBON_ZOOM_HALF_WIDTH);
  const width = CARBON_HALF_WIDTH_HZ / (field / PROTON_TO_CARBON_FREQUENCY);
  const spacing = CARBON_ZOOM_RANGE.getLength() / (ZOOM_SAMPLES - 1);
  return normalize(
    lorentzianSum(sticks, CARBON_ZOOM_RANGE.min, CARBON_ZOOM_RANGE.max, ZOOM_SAMPLES, Math.max(width, 1.2 * spacing)),
    PEAK_HEIGHT,
  );
}

/** Scales so the largest |y| is `height` (signed curves keep their sign). */
function normalize(curve: SampledCurve, height: number): SampledCurve {
  let maximum = 0;
  for (const value of curve.y) {
    maximum = Math.max(maximum, Math.abs(value));
  }
  return maximum > 0 ? { x: curve.x, y: curve.y.map((value) => (value * height) / maximum) } : curve;
}
