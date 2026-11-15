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
import type { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { hasMoleculeData, loadMolecule } from "../../common/model/library/SpectroscopyLibrary.js";
import { MoleculeChooser } from "../../common/model/MoleculeChooser.js";
import { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import { MoleculeViewModel } from "../../common/model/MoleculeViewModel.js";
import {
  type CarbonEnvironment,
  type CarbonLine,
  CarbonSpectrumType,
  type CarbonSpectrumTypeValue,
  carbonEnvironments,
  carbonLines,
} from "../../common/model/nmr/CarbonSpectrum.js";
import {
  CARBON_SHIFT_RANGE,
  CARBON_ZOOM_RANGE,
  carbonSpectrum,
  carbonZoom,
  FIELD_RANGE,
  integralTrace,
  Nucleus,
  type NucleusValue,
  sampledRange,
  spectrumFromLines,
  zoomSpectrum,
} from "../../common/model/nmr/NMRSpectrum.js";
import { type ProtonEnvironment, protonEnvironments } from "../../common/model/nmr/ProtonSpectrum.js";
import { type ResolvedLine, resolvedLines } from "../../common/model/nmr/SpinSystem.js";
import type { SampledCurve } from "../../common/model/SpectrumCurve.js";

const DEFAULT_FIELD = 300;

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
  /** Display windows follow the actual sampled domains, including low-field coupling lines. */
  public readonly carbonRangeProperty: TReadOnlyProperty<Range>;
  public readonly carbonZoomRangeProperty: TReadOnlyProperty<Range>;

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
      carbonZoom,
    );
    this.carbonRangeProperty = new DerivedProperty([this.carbonSpectrumProperty], (curve) =>
      sampledRange(curve, CARBON_SHIFT_RANGE),
    );
    this.carbonZoomRangeProperty = new DerivedProperty([this.carbonZoomProperty], (curve) =>
      sampledRange(curve, CARBON_ZOOM_RANGE),
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
      this.carbonZoomRangeProperty,
      this.carbonRangeProperty,
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
