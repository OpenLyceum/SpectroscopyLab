/**
 * MolecularFormula.ts
 *
 * What a chemist reads off a formula and a low-resolution mass spectrum before looking at IR or
 * NMR: the degree of unsaturation (rings + π bonds) and the molecular-ion cluster M⁺, M+1, M+2.
 *
 *  - Degree of unsaturation: (2C + 2 + N − H − X) / 2.
 *  - M+1 comes mostly from ¹³C (1.07 % per carbon), M+2 from ¹⁸O (0.205 % per oxygen) and ³⁷Cl
 *    (32 % per chlorine). Abundances: IUPAC CIAAW representative isotopic compositions.
 */

import type { Molecule } from "../../common/model/Molecule.js";

/** Nominal (integer) masses of the most abundant isotopes. */
const NOMINAL_MASS: Readonly<Record<string, number>> = { H: 1, C: 12, N: 14, O: 16, Cl: 35 };
/** Heavy-isotope abundance relative to the light one, per atom. */
const M_PLUS_1: Readonly<Record<string, number>> = { C: 0.0107 / 0.9893, H: 0.000115, N: 0.00366, O: 0.00038 };
const M_PLUS_2: Readonly<Record<string, number>> = { O: 0.00205, Cl: 0.2424 / 0.7576 };

export type IonPeak = {
  readonly mz: number;
  /** Relative to M⁺ = 100. */
  readonly relative: number;
};

export function elementCounts(molecule: Molecule): Map<string, number> {
  const counts = new Map<string, number>();
  for (const element of molecule.elements) {
    counts.set(element.symbol, (counts.get(element.symbol) ?? 0) + 1);
  }
  return counts;
}

/** Hill order (C, H, then alphabetical) with Unicode subscripts: "C₃H₆O". */
export function formulaText(molecule: Molecule): string {
  const counts = elementCounts(molecule);
  const symbols = [...counts.keys()].sort((a, b) => {
    const rank = (s: string) => (s === "C" ? 0 : s === "H" ? 1 : 2);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const subscript = (n: number) => (n === 1 ? "" : String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)] ?? d));
  return symbols.map((symbol) => `${symbol}${subscript(counts.get(symbol) ?? 0)}`).join("");
}

export function degreeOfUnsaturation(molecule: Molecule): number {
  const counts = elementCounts(molecule);
  const n = (symbol: string) => counts.get(symbol) ?? 0;
  return (2 * n("C") + 2 + n("N") - n("H") - n("Cl")) / 2;
}

/** M⁺, M+1 and M+2 intensities to first order in the heavy-isotope abundances. */
export function molecularIonCluster(molecule: Molecule): IonPeak[] {
  const counts = elementCounts(molecule);
  let mass = 0;
  let plus1 = 0;
  let plus2 = 0;
  for (const [symbol, count] of counts) {
    mass += (NOMINAL_MASS[symbol] ?? 0) * count;
    plus1 += (M_PLUS_1[symbol] ?? 0) * count;
    plus2 += (M_PLUS_2[symbol] ?? 0) * count;
  }
  // Two ¹³C at once also lands on M+2.
  const carbon13 = (M_PLUS_1["C"] ?? 0) * (counts.get("C") ?? 0);
  plus2 += (carbon13 * carbon13) / 2;
  return [
    { mz: mass, relative: 100 },
    { mz: mass + 1, relative: 100 * plus1 },
    { mz: mass + 2, relative: 100 * plus2 },
  ];
}
