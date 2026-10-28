/**
 * ProtonSpectrum.ts
 *
 * A first-order ¹H NMR spectrum from the molecular graph:
 *
 *  1. **Environments.** Hydrogens in one topological symmetry class are chemically equivalent and
 *     give one signal, whose area is proportional to the number of protons (integration). A class
 *     is split when its members couple differently — the two =CH₂ protons of a vinyl group are
 *     topologically alike but sit cis and trans across the double bond, so they are distinct.
 *  2. **Shifts** from {@link estimateShift}.
 *  3. **Splitting.** Each signal is split by the protons three bonds away (H–C–C–H) in *other*
 *     environments — equivalent protons do not split each other. n neighbours with the same J give
 *     n + 1 lines with binomial (Pascal's triangle) intensities; different J values nest (dd, dt…).
 *     O–H and N–H protons exchange fast, so they neither split nor are split.
 *
 * J is a property of the molecule in hertz, while the shift scale is ppm of the spectrometer
 * frequency: a 7 Hz splitting is 0.117 ppm at 60 MHz but 0.0117 ppm at 600 MHz. That is why
 * line positions are computed in hertz and divided by the field only at the end.
 */

import { toFixed } from "scenerystack/dot";
import type { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import { dihedral, type Vec3 } from "../../common/model/structure/Geometry.js";
import { estimateShift } from "./ChemicalShiftRules.js";

/** Typical vicinal (³J) coupling constants, Hz. */
export const COUPLING = {
  saturated: 7.0,
  aldehyde: 2.0,
  alkeneCis: 10.5,
  alkeneTrans: 17.0,
  allylic: 6.5,
  aromaticOrtho: 7.8,
} as const;

/** Downfield offset of the =CH₂ proton trans to the vinyl CH (it is cis to the substituent), ppm. */
const TRANS_VINYL_OFFSET = 0.08;

/** Couplings closer than this (Hz) are treated as equal, so the n + 1 rule merges them. */
const SAME_J = 0.6;

export type CouplingGroup = {
  /** Coupling constant, Hz. */
  readonly j: number;
  /** Number of equivalent-J neighbours. */
  readonly count: number;
};

export type ProtonEnvironment = {
  /** "a", "b", … in order of decreasing shift (left to right on the spectrum). */
  readonly label: string;
  readonly atoms: readonly number[];
  readonly shift: number;
  readonly exchangeable: boolean;
  /** Largest J first. */
  readonly couplings: readonly CouplingGroup[];
  /** "s", "d", "t", "q", "quint", "sext", "sept", "dd", "dt", …, or "m". */
  readonly multiplicity: string;
};

export type SpectrumLine = {
  /** Offset from the signal centre, Hz. */
  readonly offsetHz: number;
  /** Fraction of the signal's area (lines of one signal sum to 1). */
  readonly weight: number;
};

const MULTIPLET_NAMES = ["s", "d", "t", "q", "quint", "sext", "sept", "oct", "non"];
const SHORT_NAMES = ["", "d", "t", "q"];

export function protonEnvironments(graph: MoleculeGraph): ProtonEnvironment[] {
  const hydrogens = Array.from({ length: graph.atomCount }, (_, i) => i).filter((i) => graph.symbol(i) === "H");
  const byClass = new Map<number, number[]>();
  for (const h of hydrogens) {
    const c = graph.classes[h] ?? -1;
    byClass.set(c, [...(byClass.get(c) ?? []), h]);
  }
  const exchangeable = (h: number) => {
    const parent = graph.neighbors[h]?.[0] ?? -1;
    return graph.symbol(parent) === "O" || graph.symbol(parent) === "N";
  };
  const couplingsOf = (h: number, own: readonly number[]): number[] => {
    if (exchangeable(h)) {
      return [];
    }
    const js: number[] = [];
    for (const other of hydrogens) {
      if (!(own.includes(other) || exchangeable(other))) {
        const j = vicinalCoupling(graph, h, other);
        if (j > 0) {
          js.push(j);
        }
      }
    }
    return js;
  };

  // Split each symmetry class by coupling signature (cis/trans vinyl protons).
  const groups: { atoms: number[]; couplings: CouplingGroup[] }[] = [];
  for (const members of byClass.values()) {
    const bySignature = new Map<string, number[]>();
    for (const h of members) {
      const signature = groupCouplings(couplingsOf(h, members))
        .map((g) => `${g.count}x${toFixed(g.j, 1)}`)
        .join(",");
      bySignature.set(signature, [...(bySignature.get(signature) ?? []), h]);
    }
    for (const atoms of bySignature.values()) {
      groups.push({ atoms, couplings: groupCouplings(couplingsOf(atoms[0] ?? 0, atoms)) });
    }
  }

  const estimated = groups.map((group) => {
    const estimate = estimateShift(graph, group.atoms[0] ?? 0);
    // Of two split vinyl protons, the one trans to the other alkene H (J ≈ 17 Hz) lies a little downfield.
    const offset = isTransVinylProton(graph, group.atoms[0] ?? 0, group.couplings) ? TRANS_VINYL_OFFSET : 0;
    return { ...group, ...estimate, shift: estimate.shift + offset };
  });

  return estimated
    .sort((p, q) => q.shift - p.shift)
    .map((group, index) => ({
      label: String.fromCharCode(97 + index),
      atoms: group.atoms,
      shift: group.shift,
      exchangeable: group.exchangeable,
      couplings: group.couplings,
      multiplicity: multiplicityName(group.couplings),
    }));
}

/** A =CH₂ proton whose large coupling (≈ 17 Hz) is to the vinyl CH across the double bond. */
function isTransVinylProton(graph: MoleculeGraph, hydrogen: number, couplings: readonly CouplingGroup[]): boolean {
  const carbon = graph.neighbors[hydrogen]?.[0] ?? -1;
  return (
    graph.isAlkeneCarbon(carbon) &&
    graph.hydrogenCount(carbon) === 2 &&
    couplings.some((g) => g.j > COUPLING.alkeneTrans - 1)
  );
}

/** ³J between two hydrogens on bonded carbons, or 0 when they are not three bonds apart. */
export function vicinalCoupling(graph: MoleculeGraph, h1: number, h2: number): number {
  const c1 = graph.neighbors[h1]?.[0] ?? -1;
  const c2 = graph.neighbors[h2]?.[0] ?? -1;
  if (graph.symbol(c1) !== "C" || graph.symbol(c2) !== "C" || c1 === c2 || graph.order(c1, c2) === 0) {
    return 0;
  }
  if (graph.isCarbonylCarbon(c1) || graph.isCarbonylCarbon(c2)) {
    return COUPLING.aldehyde;
  }
  if (graph.isAromatic(c1) && graph.isAromatic(c2)) {
    return COUPLING.aromaticOrtho;
  }
  if (graph.order(c1, c2) === 2) {
    const p = graph.molecule.positions;
    const at = (i: number): Vec3 => [p[3 * i] ?? 0, p[3 * i + 1] ?? 0, p[3 * i + 2] ?? 0];
    const angle = Math.abs(dihedral(at(h1), at(c1), at(c2), at(h2)));
    return angle < 90 ? COUPLING.alkeneCis : COUPLING.alkeneTrans;
  }
  if (graph.isAlkeneCarbon(c1) || graph.isAlkeneCarbon(c2)) {
    return COUPLING.allylic;
  }
  return COUPLING.saturated;
}

function groupCouplings(js: readonly number[]): CouplingGroup[] {
  const groups: { j: number; count: number }[] = [];
  for (const j of [...js].sort((a, b) => b - a)) {
    const group = groups.find((g) => Math.abs(g.j - j) < SAME_J);
    if (group) {
      group.count++;
    } else {
      groups.push({ j, count: 1 });
    }
  }
  return groups;
}

export function multiplicityName(couplings: readonly CouplingGroup[]): string {
  if (couplings.length === 0) {
    return "s";
  }
  if (couplings.length === 1) {
    return MULTIPLET_NAMES[couplings[0]?.count ?? 0] ?? "m";
  }
  if (couplings.length > 3 || couplings.some((g) => g.count >= SHORT_NAMES.length)) {
    return "m";
  }
  return couplings.map((g) => SHORT_NAMES[g.count] ?? "").join("");
}

/** The first-order lines of a signal: each coupling group splits every line into count + 1. */
export function multipletLines(couplings: readonly CouplingGroup[]): SpectrumLine[] {
  let lines: SpectrumLine[] = [{ offsetHz: 0, weight: 1 }];
  for (const { j, count } of couplings) {
    const pascal = binomialRow(count);
    const total = 2 ** count;
    const next: SpectrumLine[] = [];
    for (const line of lines) {
      pascal.forEach((c, k) => {
        next.push({ offsetHz: line.offsetHz + (k - count / 2) * j, weight: (line.weight * c) / total });
      });
    }
    lines = next;
  }
  return lines;
}

function binomialRow(n: number): number[] {
  const row = [1];
  for (let k = 1; k <= n; k++) {
    row.push(((row[k - 1] ?? 1) * (n - k + 1)) / k);
  }
  return row;
}
