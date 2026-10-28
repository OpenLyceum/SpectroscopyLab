/**
 * ChemicalShiftRules.ts
 *
 * ¹H chemical shifts (ppm from TMS, CDCl₃-like) estimated by the additivity rules taught in
 * introductory organic chemistry — the same reasoning a student uses to predict a spectrum:
 *
 *  - **sp³ C–H**: a base value for CH₃ / CH₂ / CH, plus an α increment for each substituent on that
 *    carbon (O, N, Cl, C=O, aryl, C=C, C≡N) and a smaller β increment for each such group one
 *    carbon further away (Shoolery-type rule; Pretsch et al., *Structure Determination of Organic
 *    Compounds*, tables for alkanes).
 *  - **Aromatic C–H**: 7.27 ppm plus ortho/meta/para substituent increments (Pretsch, benzene table).
 *  - **Alkene C–H**, **aldehyde**, **O–H**, **N–H**: characteristic values; O–H and N–H are broad and
 *    exchange with D₂O.
 *
 * Additivity is approximate (±0.2–0.3 ppm typically); tests compare against literature spectra.
 */

import type { MoleculeGraph } from "../../common/model/MoleculeGraph.js";

/** Methane, and base values for CH₃ / CH₂ / CH in an alkane, ppm. */
const METHANE = 0.23;
const BASE_METHYL = 0.86;
const BASE_METHYLENE = 1.25;
const BASE_METHINE = 1.5;

/** α increments on the carbon bearing the proton, ppm. */
const ALPHA = {
  alcoholOxygen: 2.4,
  etherOxygen: 2.4,
  esterOxygen: 2.85,
  amine: 1.45,
  chlorine: 2.3,
  ketoneOrAldehyde: 1.25,
  acidOrEsterOrAmide: 1.15,
  aryl: 1.45,
  alkene: 0.85,
  nitrile: 1.15,
} as const;

/** With two or more α groups the increments are not fully additive; their sum is scaled by this. */
const MULTIPLE_ALPHA_FACTOR = 0.85;

/** β increment for each electron-withdrawing group one carbon further away, ppm. */
const BETA = 0.3;
/** β-chlorine pulls harder than the generic β group. */
const BETA_CHLORINE = 0.55;

const BENZENE = 7.27;
/** Substituent increments [ortho, meta, para] for aromatic protons, ppm. */
const AROMATIC_INCREMENTS = {
  alkyl: [-0.17, -0.09, -0.18],
  hydroxyl: [-0.53, -0.14, -0.43],
  formyl: [0.56, 0.22, 0.29],
} as const;

export type ShiftEstimate = {
  readonly shift: number;
  /** Exchangeable proton on O or N: broad, uncoupled, removed by a D₂O shake. */
  readonly exchangeable: boolean;
};

export function estimateShift(graph: MoleculeGraph, hydrogen: number): ShiftEstimate {
  const parent = graph.neighbors[hydrogen]?.[0];
  if (parent === undefined) {
    return { shift: 0, exchangeable: false };
  }
  const symbol = graph.symbol(parent);
  if (symbol === "O") {
    return { shift: hydroxylShift(graph, parent), exchangeable: true };
  }
  if (symbol === "N") {
    return {
      shift: graph.isCarbonylCarbon(otherNeighbor(graph, parent, hydrogen) ?? -1) ? 6.0 : 1.2,
      exchangeable: true,
    };
  }
  if (symbol !== "C") {
    return { shift: 1, exchangeable: false };
  }
  if (graph.isCarbonylCarbon(parent)) {
    // Aldehyde H; conjugation with a ring moves it a little downfield.
    return { shift: graph.neighbors[parent]?.some((n) => graph.isAromatic(n)) ? 9.98 : 9.75, exchangeable: false };
  }
  if (graph.isAromatic(parent)) {
    return { shift: aromaticShift(graph, parent), exchangeable: false };
  }
  if (graph.isAlkeneCarbon(parent)) {
    return { shift: alkeneShift(graph, parent), exchangeable: false };
  }
  return { shift: saturatedShift(graph, parent), exchangeable: false };
}

function otherNeighbor(graph: MoleculeGraph, atom: number, exclude: number): number | undefined {
  return graph.neighbors[atom]?.find((n) => n !== exclude && graph.symbol(n) !== "H");
}

function hydroxylShift(graph: MoleculeGraph, oxygen: number): number {
  const carbon = otherNeighbor(graph, oxygen, -1);
  if (carbon === undefined) {
    return 4.8; // water (HOD in D₂O-referenced spectra)
  }
  if (graph.isCarbonylCarbon(carbon)) {
    return 11.5; // carboxylic acid
  }
  if (graph.isAromatic(carbon)) {
    return 5.3; // phenol
  }
  return 2.0; // alcohol: concentration-dependent, typically 1–3 ppm
}

/** α increment for a substituent `x` on the proton-bearing carbon `carbon`, or 0 for plain alkyl. */
function alphaIncrement(graph: MoleculeGraph, carbon: number, x: number): number {
  const symbol = graph.symbol(x);
  if (symbol === "O") {
    const beyond = otherNeighbor(graph, x, carbon);
    if (beyond === undefined || graph.symbol(beyond) === "H") {
      return ALPHA.alcoholOxygen;
    }
    return graph.isCarbonylCarbon(beyond) ? ALPHA.esterOxygen : ALPHA.etherOxygen;
  }
  if (symbol === "N") {
    return ALPHA.amine;
  }
  if (symbol === "Cl") {
    return ALPHA.chlorine;
  }
  if (symbol !== "C") {
    return 0;
  }
  if (graph.isCarbonylCarbon(x)) {
    const heteroatom = (graph.neighbors[x] ?? []).some(
      (n) => n !== carbon && graph.order(x, n) === 1 && (graph.symbol(n) === "O" || graph.symbol(n) === "N"),
    );
    return heteroatom ? ALPHA.acidOrEsterOrAmide : ALPHA.ketoneOrAldehyde;
  }
  if (graph.isAromatic(x)) {
    return ALPHA.aryl;
  }
  if (graph.isAlkeneCarbon(x)) {
    return ALPHA.alkene;
  }
  if ((graph.neighbors[x] ?? []).some((n) => graph.order(x, n) === 3)) {
    return ALPHA.nitrile;
  }
  return 0;
}

function saturatedShift(graph: MoleculeGraph, carbon: number): number {
  const hydrogens = graph.hydrogenCount(carbon);
  if (hydrogens === 4) {
    return METHANE;
  }
  let shift = hydrogens === 3 ? BASE_METHYL : hydrogens === 2 ? BASE_METHYLENE : BASE_METHINE;
  const alphas: number[] = [];
  for (const x of graph.neighbors[carbon] ?? []) {
    if (graph.symbol(x) === "H") {
      continue;
    }
    const alpha = alphaIncrement(graph, carbon, x);
    if (alpha > 0) {
      alphas.push(alpha);
    }
    shift += betaIncrement(graph, carbon, x);
  }
  const alphaSum = alphas.reduce((sum, value) => sum + value, 0);
  return shift + (alphas.length > 1 ? MULTIPLE_ALPHA_FACTOR * alphaSum : alphaSum);
}

/** β effects: electron-withdrawing groups on a neighbouring saturated carbon `x`. */
function betaIncrement(graph: MoleculeGraph, carbon: number, x: number): number {
  if (!graph.isSaturatedCarbon(x)) {
    return 0;
  }
  let increment = 0;
  for (const y of graph.neighbors[x] ?? []) {
    if (y === carbon || graph.symbol(y) === "H") {
      continue;
    }
    if (graph.symbol(y) === "Cl") {
      increment += BETA_CHLORINE;
    } else if (alphaIncrement(graph, x, y) > 0) {
      increment += BETA;
    }
  }
  return increment;
}

function aromaticShift(graph: MoleculeGraph, carbon: number): number {
  const ring = graph.aromaticRings.find((r) => r.includes(carbon)) ?? [];
  const position = ring.indexOf(carbon);
  let shift = BENZENE;
  ring.forEach((ringAtom, index) => {
    const separation = Math.min(Math.abs(index - position), 6 - Math.abs(index - position));
    if (separation === 0) {
      return;
    }
    for (const x of graph.neighbors[ringAtom] ?? []) {
      if (ring.includes(x) || graph.symbol(x) === "H") {
        continue;
      }
      const increments =
        graph.symbol(x) === "O"
          ? AROMATIC_INCREMENTS.hydroxyl
          : graph.isCarbonylCarbon(x)
            ? AROMATIC_INCREMENTS.formyl
            : AROMATIC_INCREMENTS.alkyl;
      shift += increments[separation - 1] ?? 0;
    }
  });
  return shift;
}

/** Characteristic alkene values: oxygen on the carbon deshields it; oxygen across the bond shields. */
function alkeneShift(graph: MoleculeGraph, carbon: number): number {
  const partner = graph.doublyBonded(carbon, "C");
  const hasOxygen = (atom: number | null) => atom !== null && graph.neighborsOf(atom, "O").length > 0;
  const terminal = graph.hydrogenCount(carbon) === 2;
  if (hasOxygen(carbon)) {
    return 6.45; // =CH–O (vinyl ether)
  }
  if (hasOxygen(partner)) {
    return 4.1; // =CH₂ of a vinyl ether, shielded by O lone-pair donation
  }
  return terminal ? 5.2 : 5.9;
}
