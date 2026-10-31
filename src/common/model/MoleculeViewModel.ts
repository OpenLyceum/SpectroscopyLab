/**
 * MoleculeViewModel.ts
 *
 * View-independent state of the 3D molecule viewer that every screen embeds: the molecule, the
 * camera (rotation, zoom), the hovered atom, which atoms are highlighted (the atoms behind the
 * selected peak), optional per-atom labels, an optional animated displacement (an IR normal mode),
 * and optional orbital lobes (a Hückel MO). Screens write these; MoleculeViewerNode reads them.
 *
 * Trimmed from MolScope's ViewerModel: no script engine, selection language, styles or measurements.
 */

import { BooleanProperty, Emitter, NumberProperty, Property } from "scenerystack/axon";
import type { Molecule } from "./Molecule.js";
import type { Vec3 } from "./structure/Geometry.js";
import { Rotation3 } from "./structure/Rotation3.js";

/** Vibration animation frequency on screen, Hz (real modes are ~10¹³ Hz). */
const VIBRATION_DISPLAY_FREQUENCY = 1.2;

/** Peak displacement of the fastest-moving atom when a mode animates, Å. */
export const VIBRATION_AMPLITUDE = 0.25;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 6;

/** A signed p-orbital lobe pair drawn on one atom (Hückel MO coefficients). */
export type OrbitalLobe = {
  readonly atom: number;
  /** Signed MO coefficient; the radius scales with |c| and the colour shows the sign. */
  readonly coefficient: number;
  /** Unit vector perpendicular to the π system at this atom (model frame). */
  readonly normal: Vec3;
};

export class MoleculeViewModel {
  public readonly moleculeProperty: Property<Molecule | null>;
  public readonly rotationProperty: Property<Rotation3>;
  public readonly zoomProperty: NumberProperty;
  public readonly hoveredAtomProperty: Property<number | null>;
  /** Atoms drawn with a highlight halo (e.g. the protons behind the selected NMR signal). */
  public readonly highlightedAtomsProperty: Property<readonly number[]>;
  /** Short labels drawn next to atoms ("a", "b" for proton environments); null entries are unlabelled. */
  public readonly atomLabelsProperty: Property<readonly (string | null)[] | null>;
  /** Cartesian displacement to animate (x0, y0, z0, …, largest atom = 1), or null for a still molecule. */
  public readonly displacementProperty: Property<Float64Array | null>;
  public readonly orbitalLobesProperty: Property<readonly OrbitalLobe[] | null>;
  /** Vibration phase, radians; advanced by step() while a displacement is set. */
  public readonly vibrationPhaseProperty: NumberProperty;
  /** True after a library load fails. The viewer draws a message instead of an empty stage. */
  public readonly loadErrorProperty: BooleanProperty;

  /** Fires with the atom index when the user clicks or keyboard-picks an atom. */
  public readonly atomPickedEmitter = new Emitter<[number]>({ parameters: [{ valueType: "number" }] });

  private readonly scratch = new Float64Array(0);
  private readonly defaultRotation: Rotation3;
  private animatedPositions: Float64Array = this.scratch;

  /** @param defaultRotation - the camera after Reset View (UV-Vis tilts so π lobes stand clear of the plane) */
  public constructor(defaultRotation: Rotation3 = Rotation3.IDENTITY) {
    this.defaultRotation = defaultRotation;
    this.moleculeProperty = new Property<Molecule | null>(null);
    this.rotationProperty = new Property(defaultRotation);
    this.zoomProperty = new NumberProperty(1);
    this.hoveredAtomProperty = new Property<number | null>(null);
    this.highlightedAtomsProperty = new Property<readonly number[]>([]);
    this.atomLabelsProperty = new Property<readonly (string | null)[] | null>(null);
    this.displacementProperty = new Property<Float64Array | null>(null);
    this.orbitalLobesProperty = new Property<readonly OrbitalLobe[] | null>(null);
    this.vibrationPhaseProperty = new NumberProperty(0);
    this.loadErrorProperty = new BooleanProperty(false);

    this.moleculeProperty.lazyLink(() => {
      this.hoveredAtomProperty.value = null;
      this.highlightedAtomsProperty.value = [];
      this.atomLabelsProperty.value = null;
      this.displacementProperty.value = null;
      this.orbitalLobesProperty.value = null;
      this.resetView();
    });
  }

  public get molecule(): Molecule | null {
    return this.moleculeProperty.value;
  }

  /** Centroid of the molecule, Å. */
  public center(): Vec3 {
    const positions = this.molecule?.positions;
    if (!positions || positions.length === 0) {
      return [0, 0, 0];
    }
    const n = positions.length / 3;
    const c: Vec3 = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      c[0] += positions[3 * i] ?? 0;
      c[1] += positions[3 * i + 1] ?? 0;
      c[2] += positions[3 * i + 2] ?? 0;
    }
    return [c[0] / n, c[1] / n, c[2] / n];
  }

  /** Bounding radius about the centroid plus a margin for the atom spheres, Å. */
  public boundingRadius(): number {
    const positions = this.molecule?.positions;
    if (!positions) {
      return 1;
    }
    const [cx, cy, cz] = this.center();
    let r = 0;
    for (let i = 0; i < positions.length / 3; i++) {
      r = Math.max(
        r,
        Math.hypot((positions[3 * i] ?? 0) - cx, (positions[3 * i + 1] ?? 0) - cy, (positions[3 * i + 2] ?? 0) - cz),
      );
    }
    return Math.max(r + 1.2, 2);
  }

  /** Positions to draw this frame: equilibrium plus the animated displacement. */
  public currentPositions(): Float64Array {
    const molecule = this.molecule;
    const displacement = this.displacementProperty.value;
    if (!molecule) {
      return this.scratch;
    }
    if (!displacement) {
      return molecule.positions;
    }
    if (this.animatedPositions.length !== molecule.positions.length) {
      this.animatedPositions = new Float64Array(molecule.positions.length);
    }
    const s = VIBRATION_AMPLITUDE * Math.sin(this.vibrationPhaseProperty.value);
    for (let i = 0; i < molecule.positions.length; i++) {
      this.animatedPositions[i] = (molecule.positions[i] ?? 0) + s * (displacement[i] ?? 0);
    }
    return this.animatedPositions;
  }

  public rotate(axis: Vec3, degrees: number): void {
    this.rotationProperty.value = this.rotationProperty.value.rotatedAboutScreenAxis(axis, degrees);
  }

  public zoomBy(factor: number): void {
    this.zoomProperty.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoomProperty.value * factor));
  }

  public pickAtom(index: number): void {
    this.atomPickedEmitter.emit(index);
  }

  public resetView(): void {
    this.rotationProperty.value = this.defaultRotation;
    this.zoomProperty.reset();
  }

  public step(dt: number): void {
    if (this.displacementProperty.value) {
      this.vibrationPhaseProperty.value =
        (this.vibrationPhaseProperty.value + 2 * Math.PI * VIBRATION_DISPLAY_FREQUENCY * dt) % (2 * Math.PI);
    }
  }

  public reset(): void {
    this.hoveredAtomProperty.reset();
    this.highlightedAtomsProperty.reset();
    this.atomLabelsProperty.reset();
    this.displacementProperty.reset();
    this.orbitalLobesProperty.reset();
    this.vibrationPhaseProperty.reset();
    this.loadErrorProperty.reset();
    this.resetView();
  }

  public dispose(): void {
    this.moleculeProperty.dispose();
    this.rotationProperty.dispose();
    this.zoomProperty.dispose();
    this.hoveredAtomProperty.dispose();
    this.highlightedAtomsProperty.dispose();
    this.atomLabelsProperty.dispose();
    this.displacementProperty.dispose();
    this.orbitalLobesProperty.dispose();
    this.vibrationPhaseProperty.dispose();
    this.loadErrorProperty.dispose();
    this.atomPickedEmitter.dispose();
  }
}
