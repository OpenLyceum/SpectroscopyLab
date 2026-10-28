/**
 * MoleculeGraph.ts
 *
 * The bonding graph of a molecule with the chemistry the NMR and Hückel models need:
 *
 *  - **Aromaticity.** SDF files give benzene rings as Kekulé structures (alternating 1 and 2).
 *    Any six-membered ring of alternating single and double bonds is re-marked aromatic (order 1.5),
 *    so toluene's two ortho carbons are not told apart by which Kekulé form PubChem drew.
 *  - **Topological symmetry classes** by colour refinement (Morgan's algorithm): start from an
 *    invariant per atom (element, degree, bond orders) and repeatedly append the sorted classes of
 *    the neighbours until the partition stops splitting. Atoms in one class are interchangeable by
 *    a graph symmetry — for protons, chemically equivalent. (Like any purely topological method,
 *    it treats diastereotopic protons as equivalent.)
 */

import type { Molecule } from "./Molecule.js";

export const AROMATIC_ORDER = 1.5;

export class MoleculeGraph {
  public readonly molecule: Molecule;
  public readonly neighbors: readonly (readonly number[])[];
  /** Symmetry class of each atom (0-based, numbered in order of first appearance). */
  public readonly classes: readonly number[];
  /** Six-membered aromatic rings, as atom lists in ring order. */
  public readonly aromaticRings: readonly (readonly number[])[];
  private readonly orders = new Map<string, number>();
  private readonly aromaticAtoms: ReadonlySet<number>;

  public constructor(molecule: Molecule) {
    this.molecule = molecule;
    const neighbors: number[][] = molecule.elements.map(() => []);
    for (const bond of molecule.bonds) {
      neighbors[bond.a]?.push(bond.b);
      neighbors[bond.b]?.push(bond.a);
      this.orders.set(key(bond.a, bond.b), bond.order);
    }
    this.neighbors = neighbors;
    this.aromaticRings = findAromaticRings(this);
    const aromaticAtoms = new Set<number>();
    for (const ring of this.aromaticRings) {
      ring.forEach((atom, i) => {
        aromaticAtoms.add(atom);
        this.orders.set(key(atom, ring[(i + 1) % ring.length] ?? atom), AROMATIC_ORDER);
      });
    }
    this.aromaticAtoms = aromaticAtoms;
    this.classes = refineClasses(this);
  }

  public get atomCount(): number {
    return this.molecule.elements.length;
  }

  public symbol(atom: number): string {
    return this.molecule.elements[atom]?.symbol ?? "";
  }

  /** Bond order between two atoms (1.5 for aromatic), or 0 if not bonded. */
  public order(a: number, b: number): number {
    return this.orders.get(key(a, b)) ?? 0;
  }

  public isAromatic(atom: number): boolean {
    return this.aromaticAtoms.has(atom);
  }

  /** Neighbours with a given element symbol. */
  public neighborsOf(atom: number, symbol: string): number[] {
    return (this.neighbors[atom] ?? []).filter((n) => this.symbol(n) === symbol);
  }

  public hydrogenCount(atom: number): number {
    return this.neighborsOf(atom, "H").length;
  }

  /** A neighbour joined by a double bond to an element (e.g. the O of a carbonyl carbon), or null. */
  public doublyBonded(atom: number, symbol: string): number | null {
    return (this.neighbors[atom] ?? []).find((n) => this.symbol(n) === symbol && this.order(atom, n) === 2) ?? null;
  }

  /** True for a carbon with a C=O. */
  public isCarbonylCarbon(atom: number): boolean {
    return this.symbol(atom) === "C" && this.doublyBonded(atom, "O") !== null;
  }

  /** True for a non-aromatic carbon in a C=C. */
  public isAlkeneCarbon(atom: number): boolean {
    return this.symbol(atom) === "C" && !this.isAromatic(atom) && this.doublyBonded(atom, "C") !== null;
  }

  /** True for a carbon with only single bonds. */
  public isSaturatedCarbon(atom: number): boolean {
    return this.symbol(atom) === "C" && (this.neighbors[atom] ?? []).every((n) => this.order(atom, n) === 1);
  }

  /** Shortest path length between two atoms counted in bonds, within `limit`; Infinity if farther. */
  public distance(from: number, to: number, limit = Number.POSITIVE_INFINITY): number {
    if (from === to) {
      return 0;
    }
    let frontier = [from];
    const seen = new Set([from]);
    for (let depth = 1; depth <= limit && frontier.length > 0; depth++) {
      const next: number[] = [];
      for (const atom of frontier) {
        for (const n of this.neighbors[atom] ?? []) {
          if (n === to) {
            return depth;
          }
          if (!seen.has(n)) {
            seen.add(n);
            next.push(n);
          }
        }
      }
      frontier = next;
    }
    return Number.POSITIVE_INFINITY;
  }
}

function key(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Six-rings whose bonds alternate 1/2 around the ring (a Kekulé benzene), each reported once. */
function findAromaticRings(graph: MoleculeGraph): number[][] {
  const rings: number[][] = [];
  const seen = new Set<string>();
  const walk = (path: number[]) => {
    const last = path[path.length - 1] ?? 0;
    if (path.length === 6) {
      const first = path[0] ?? 0;
      if (!graph.neighbors[last]?.includes(first)) {
        return;
      }
      const id = [...path].sort((a, b) => a - b).join(",");
      if (seen.has(id)) {
        return;
      }
      const orders = path.map((atom, i) => graph.order(atom, path[(i + 1) % 6] ?? atom));
      const alternating = orders.every((o, i) => o === (i % 2 === 0 ? orders[0] : 3 - (orders[0] ?? 0)));
      if (alternating && orders.includes(2) && orders.includes(1)) {
        seen.add(id);
        rings.push([...path]);
      }
      return;
    }
    for (const n of graph.neighbors[last] ?? []) {
      if (!path.includes(n) && graph.symbol(n) !== "H" && n > (path[0] ?? 0)) {
        walk([...path, n]);
      }
    }
  };
  for (let start = 0; start < graph.atomCount; start++) {
    if (graph.symbol(start) !== "H") {
      walk([start]);
    }
  }
  return rings;
}

/** Colour refinement to a stable partition. */
function refineClasses(graph: MoleculeGraph): number[] {
  const n = graph.atomCount;
  let labels = Array.from({ length: n }, (_, atom) => {
    const element = graph.molecule.elements[atom]?.number ?? 0;
    const orders = (graph.neighbors[atom] ?? []).map((m) => graph.order(atom, m)).sort();
    return `${element}|${orders.join(",")}`;
  });
  let classes = renumber(labels);
  for (let round = 0; round < n; round++) {
    labels = Array.from({ length: n }, (_, atom) => {
      const around = (graph.neighbors[atom] ?? [])
        .map((m) => `${classes[m]}:${graph.order(atom, m)}`)
        .sort()
        .join(",");
      return `${classes[atom]}|${around}`;
    });
    const next = renumber(labels);
    const count = (c: number[]) => new Set(c).size;
    if (count(next) === count(classes)) {
      break;
    }
    classes = next;
  }
  return classes;
}

function renumber(labels: readonly string[]): number[] {
  const ids = new Map<string, number>();
  return labels.map((label) => {
    let id = ids.get(label);
    if (id === undefined) {
      id = ids.size;
      ids.set(label, id);
    }
    return id;
  });
}
