/**
 * Isotopes.ts
 *
 * Exact isotope masses (u) for vibrational analysis. Normal modes use the mass of one isotope, not
 * the standard atomic weight, which is why HCl shows a ³⁵Cl/³⁷Cl doublet. Each element lists its
 * most abundant isotope first — the default the offline B3LYP run also used.
 *
 * Masses: AME2020 (Wang et al., Chinese Phys. C 45, 030003, 2021).
 */

export type Isotope = {
  /** Mass number, for labels ("²H", "¹³C"). */
  readonly massNumber: number;
  /** Atomic mass, u. */
  readonly mass: number;
};

const ISOTOPES: Readonly<Record<string, readonly Isotope[]>> = {
  H: [
    { massNumber: 1, mass: 1.00782503 },
    { massNumber: 2, mass: 2.01410178 },
  ],
  C: [
    { massNumber: 12, mass: 12 },
    { massNumber: 13, mass: 13.00335484 },
  ],
  N: [
    { massNumber: 14, mass: 14.00307401 },
    { massNumber: 15, mass: 15.0001089 },
  ],
  O: [
    { massNumber: 16, mass: 15.99491462 },
    { massNumber: 18, mass: 17.99915961 },
  ],
  Cl: [
    { massNumber: 35, mass: 34.96885268 },
    { massNumber: 37, mass: 36.9659026 },
  ],
};

/** The isotopes offered for an element (most abundant first); empty when only the default applies. */
export function isotopesFor(symbol: string): readonly Isotope[] {
  return ISOTOPES[symbol] ?? [];
}

/** Mass of the most abundant isotope, falling back to the standard atomic weight. */
export function defaultIsotopeMass(symbol: string, standardWeight: number): number {
  return ISOTOPES[symbol]?.[0]?.mass ?? standardWeight;
}
