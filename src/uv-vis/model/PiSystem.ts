/**
 * PiSystem.ts
 *
 * The conjugated π system of a molecule, and the two models of its electronic structure:
 *
 * **Hückel.** One p orbital per conjugated atom; the Hamiltonian has αᵢ = α + hᵢβ on the diagonal
 * and βᵢⱼ = kᵢⱼβ between bonded atoms (carbon h = 0, k = 1; nitrogen h = 1, k = 1, after
 * Streitwieser). Eigenvalues xₖ of the matrix [hᵢ; kᵢⱼ] give energies E = α + xβ; since β < 0, the
 * largest x is the lowest orbital. Electrons fill from the bottom, two per orbital.
 *
 * **Particle in a box** (Kuhn's free-electron model). The π electrons of a linear chain move freely
 * along a box of length L = (Nπ atoms + 1)·ℓ, ℓ = 1.39 Å: Eₙ = n²h²/(8mL²). The HOMO→LUMO gap of N
 * electrons gives λ = 8mcL²/(h(N + 1)). It works for cyanines, whose bonds are all equal, and fails
 * for polyenes, whose bonds alternate — the failure is the lesson.
 */

import type { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import type { OrbitalLobe } from "../../common/model/MoleculeViewModel.js";
import { symmetricEigen } from "../../common/model/math/symmetricEigen.js";
import type { Vec3 } from "../../common/model/structure/Geometry.js";

/** Free-electron bond length, m (Kuhn). */
export const BOX_BOND_LENGTH = 1.39e-10;
const ELECTRON_MASS = 9.1093837e-31; // kg
const PLANCK = 6.62607015e-34; // J·s
const LIGHT_SPEED = 2.99792458e8; // m/s
const ELECTRON_VOLT = 1.602176634e-19; // J

/** Hückel heteroatom parameters (Streitwieser): h on the diagonal, k for its bonds to carbon. */
const NITROGEN_H = 1.0;
const NITROGEN_K = 1.0;

export type Orbital = {
  /** Energy relative to α in units of |β| (negative = bonding) for Hückel; eV above the box floor for the box. */
  readonly energy: number;
  /** 0, 1 or 2 electrons. */
  readonly occupancy: number;
  /** Coefficient on each π atom (same order as PiSystem.atoms); unit-normalised. */
  readonly coefficients: readonly number[];
};

export type ElectronicStructure = {
  readonly orbitals: readonly Orbital[];
  readonly homo: number;
  readonly lumo: number;
};

export class PiSystem {
  public readonly graph: MoleculeGraph;
  /** Conjugated atoms, in chain order when the system is a linear chain. */
  public readonly atoms: readonly number[];
  public readonly electrons: number;
  /** True when the π atoms form one unbranched, unringed chain (the box model applies). */
  public readonly isLinearChain: boolean;

  public constructor(graph: MoleculeGraph) {
    this.graph = graph;
    const conjugated = findConjugatedAtoms(graph);
    const chain = orderAsChain(graph, conjugated);
    this.atoms = chain ?? conjugated;
    this.isLinearChain = chain !== null;
    this.electrons = conjugated.reduce((sum, atom) => sum + electronsContributed(graph, atom), 0);
  }

  public hueckel(): ElectronicStructure {
    const n = this.atoms.length;
    const matrix = new Float64Array(n * n);
    this.atoms.forEach((atom, i) => {
      matrix[i * n + i] = this.graph.symbol(atom) === "N" ? NITROGEN_H : 0;
      this.atoms.forEach((other, j) => {
        if (i !== j && this.graph.order(atom, other) > 0) {
          const nitrogen = this.graph.symbol(atom) === "N" || this.graph.symbol(other) === "N";
          matrix[i * n + j] = nitrogen ? NITROGEN_K : 1;
        }
      });
    });
    const { values, vectors } = symmetricEigen(matrix, n);
    // E = α + xβ with β < 0: the largest x is the most stable orbital. Report energies as −x (units of |β|).
    const orbitals = Array.from({ length: n }, (_, column) => ({
      energy: -(values[column] ?? 0),
      coefficients: Array.from({ length: n }, (_entry, i) => vectors[i * n + column] ?? 0),
    })).sort((a, b) => a.energy - b.energy);
    return fill(orbitals, this.electrons);
  }

  /** Box levels n = 1 … Nπ + 2, energies in eV, with the standing-wave coefficients sin(nπ(j + 1)/(Nπ + 1)). */
  public box(): ElectronicStructure {
    const n = this.atoms.length;
    const length = this.boxLength();
    const levels = Array.from({ length: Math.max(n, 1) }, (_, k) => {
      const quantum = k + 1;
      const raw = this.atoms.map((_atom, j) => Math.sin((quantum * Math.PI * (j + 1)) / (n + 1)));
      const norm = Math.hypot(...raw) || 1;
      return {
        energy: (quantum ** 2 * PLANCK ** 2) / (8 * ELECTRON_MASS * length ** 2) / ELECTRON_VOLT,
        coefficients: raw.map((c) => c / norm),
      };
    });
    return fill(levels, this.electrons);
  }

  /** Kuhn's box length, m. */
  public boxLength(): number {
    return (this.atoms.length + 1) * BOX_BOND_LENGTH;
  }

  /** Signed p-orbital lobes for one orbital, with normals perpendicular to the local π plane. */
  public lobes(orbital: Orbital): OrbitalLobe[] {
    const normals = this.normals();
    return this.atoms.map((atom, i) => ({
      atom,
      coefficient: orbital.coefficients[i] ?? 0,
      normal: normals[i] ?? [0, 0, 1],
    }));
  }

  private normals(): Vec3[] {
    const p = this.graph.molecule.positions;
    const at = (i: number): Vec3 => [p[3 * i] ?? 0, p[3 * i + 1] ?? 0, p[3 * i + 2] ?? 0];
    let reference: Vec3 | null = null;
    return this.atoms.map((atom) => {
      const neighbors = this.graph.neighbors[atom] ?? [];
      const center = at(atom);
      const u = at(neighbors[0] ?? atom).map((value, c) => value - (center[c] ?? 0));
      const v = at(neighbors[1] ?? neighbors[0] ?? atom).map((value, c) => value - (center[c] ?? 0));
      let normal: Vec3 = [
        (u[1] ?? 0) * (v[2] ?? 0) - (u[2] ?? 0) * (v[1] ?? 0),
        (u[2] ?? 0) * (v[0] ?? 0) - (u[0] ?? 0) * (v[2] ?? 0),
        (u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0),
      ];
      const length = Math.hypot(...normal) || 1;
      normal = [normal[0] / length, normal[1] / length, normal[2] / length];
      // Keep one orientation across the molecule, so coefficient signs read consistently.
      if (reference && normal[0] * reference[0] + normal[1] * reference[1] + normal[2] * reference[2] < 0) {
        normal = [-normal[0], -normal[1], -normal[2]];
      }
      reference ??= normal;
      return normal;
    });
  }
}

/** HOMO→LUMO wavelength, nm, for a gap in eV. */
export function gapToWavelength(gapEv: number): number {
  return gapEv > 0 ? (PLANCK * LIGHT_SPEED) / (gapEv * ELECTRON_VOLT) / 1e-9 : Number.POSITIVE_INFINITY;
}

/** Kuhn's closed form λ = 8mcL²/(h(N + 1)), nm. */
export function boxWavelength(length: number, electrons: number): number {
  return (8 * ELECTRON_MASS * LIGHT_SPEED * length ** 2) / (PLANCK * (electrons + 1)) / 1e-9;
}

function fill(levels: { energy: number; coefficients: number[] }[], electrons: number): ElectronicStructure {
  let remaining = electrons;
  const orbitals = levels.map((level) => {
    const occupancy = Math.min(2, Math.max(0, remaining));
    remaining -= occupancy;
    return { ...level, occupancy };
  });
  const homo = orbitals.reduce((last, orbital, index) => (orbital.occupancy > 0 ? index : last), -1);
  return { orbitals, homo, lumo: Math.min(homo + 1, orbitals.length - 1) };
}

/** sp² carbon and nitrogen atoms joined into one conjugated network (a double or aromatic bond, or N next to one). */
function findConjugatedAtoms(graph: MoleculeGraph): number[] {
  const inDoubleBond = (atom: number) =>
    (graph.neighbors[atom] ?? []).some((n) => graph.order(atom, n) >= 1.5 && graph.symbol(n) !== "O");
  const atoms: number[] = [];
  for (let atom = 0; atom < graph.atomCount; atom++) {
    const symbol = graph.symbol(atom);
    if (symbol === "C" && inDoubleBond(atom)) {
      atoms.push(atom);
    } else if (symbol === "N") {
      // An imine N, or an amine N donating its lone pair into an adjacent π atom (cyanine ends).
      const nextToPi = (graph.neighbors[atom] ?? []).some((n) => graph.symbol(n) === "C" && inDoubleBond(n));
      if (inDoubleBond(atom) || nextToPi) {
        atoms.push(atom);
      }
    }
  }
  return atoms;
}

/** π electrons from one atom: 1 from a π bond, 2 from a lone pair on a singly bonded N. */
function electronsContributed(graph: MoleculeGraph, atom: number): number {
  const doubly = (graph.neighbors[atom] ?? []).some((n) => graph.order(atom, n) >= 1.5);
  return graph.symbol(atom) === "N" && !doubly ? 2 : 1;
}

/** The atoms in path order if they form one unbranched chain, else null. */
function orderAsChain(graph: MoleculeGraph, atoms: readonly number[]): number[] | null {
  const set = new Set(atoms);
  const piNeighbors = (atom: number) => (graph.neighbors[atom] ?? []).filter((n) => set.has(n));
  if (atoms.some((atom) => piNeighbors(atom).length > 2)) {
    return null;
  }
  const ends = atoms.filter((atom) => piNeighbors(atom).length <= 1);
  if (ends.length !== 2 && atoms.length > 1) {
    return null;
  }
  const chain: number[] = [];
  let previous = -1;
  let current = ends[0] ?? atoms[0] ?? -1;
  while (current >= 0 && chain.length < atoms.length) {
    chain.push(current);
    const next = piNeighbors(current).find((n) => n !== previous && !chain.includes(n));
    previous = current;
    current = next ?? -1;
  }
  return chain.length === atoms.length ? chain : null;
}
