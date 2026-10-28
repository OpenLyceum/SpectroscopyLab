/**
 * Molecule.ts
 *
 * The plain-data molecule every screen works from: elements, Cartesian positions (Å), bonds with
 * orders (from the PubChem SDF, so NMR and Hückel never have to guess them), and the offline
 * B3LYP data the Infrared screen needs. A Molecule never changes after it is built; isotope
 * choices and highlights live in the screen models.
 *
 * Library files are produced by scripts/qm/compute_vibrations.py — see its header for units.
 */

import { type ElementData, elementForSymbol } from "./structure/Elements.js";

export type Bond = {
  readonly a: number;
  readonly b: number;
  /** 1, 2 or 3 (SDF bond orders; aromatic rings are Kekulé). */
  readonly order: number;
};

export type VibrationData = {
  /** Harmonic frequency scale factor for the method. */
  readonly scale: number;
  /** Packed upper triangle (i ≤ j, row-major) of the 3N×3N Cartesian Hessian, hartree / bohr². */
  readonly hessian: readonly number[];
  /** dμ/dx in e: three rows (μx, μy, μz) of 3N columns. */
  readonly dipoleDerivatives: readonly (readonly number[])[];
};

export type Molecule = {
  readonly id: string;
  readonly elements: readonly ElementData[];
  /** x0, y0, z0, x1, … in Å. */
  readonly positions: Float64Array;
  readonly bonds: readonly Bond[];
  readonly charge: number;
  readonly vibrations: VibrationData | null;
  /** Provenance for the info panel ("PubChem CID 702", "B3LYP/DEF2-SVP (PySCF 2.14.0)"). */
  readonly source: string;
  readonly method: string;
};

/** The JSON shape written by scripts/qm/compute_vibrations.py. */
export type MoleculeFile = {
  readonly id: string;
  readonly source: string;
  readonly method?: string;
  readonly elements: readonly string[];
  readonly positions: readonly (readonly number[])[];
  readonly bonds: readonly (readonly number[])[];
  readonly charge?: number;
  readonly vibrations?: VibrationData;
};

export class MoleculeFormatError extends Error {}

export function moleculeFromFile(file: MoleculeFile): Molecule {
  const n = file.elements.length;
  if (file.positions.length !== n) {
    throw new MoleculeFormatError(`${file.id}: ${n} elements but ${file.positions.length} positions`);
  }
  const positions = new Float64Array(3 * n);
  file.positions.forEach((p, i) => {
    positions[3 * i] = p[0] ?? 0;
    positions[3 * i + 1] = p[1] ?? 0;
    positions[3 * i + 2] = p[2] ?? 0;
  });
  const bonds = file.bonds.map(([a = 0, b = 0, order = 1]) => {
    if (a >= n || b >= n) {
      throw new MoleculeFormatError(`${file.id}: bond ${a}–${b} out of range`);
    }
    return { a, b, order };
  });
  const vibrations = file.vibrations ?? null;
  if (vibrations) {
    const n3 = 3 * n;
    if (vibrations.hessian.length !== (n3 * (n3 + 1)) / 2 || vibrations.dipoleDerivatives.length !== 3) {
      throw new MoleculeFormatError(`${file.id}: vibration data does not match ${n} atoms`);
    }
  }
  return {
    id: file.id,
    elements: file.elements.map(elementForSymbol),
    positions,
    bonds,
    charge: file.charge ?? 0,
    vibrations,
    source: file.source,
    method: file.method ?? "",
  };
}

/** Indices of the atoms bonded to each atom. */
export function neighborLists(molecule: Molecule): number[][] {
  const lists: number[][] = molecule.elements.map(() => []);
  for (const bond of molecule.bonds) {
    lists[bond.a]?.push(bond.b);
    lists[bond.b]?.push(bond.a);
  }
  return lists;
}
