/**
 * ModeCharacter.ts
 *
 * A textbook name for a normal mode — "C=O stretch", "H–C–H bend" — from its dominant internal
 * coordinate, by a crude potential-energy distribution. For each bond the first-order change in
 * length is Δr = (uᵦ − uₐ)·êₐᵦ and its energy share k_s Δr²; for each bond angle the share is
 * k_b Δθ². Typical force constants (k_s ≈ 5 mdyn/Å per bond order, k_b ≈ 0.7 mdyn·Å/rad²) make the
 * comparison fair: a C=O stretch also opens the H–C–H angle, but far less energy goes into it.
 */

import type { Molecule } from "../Molecule.js";
import { neighborLists } from "../Molecule.js";

export const ModeKind = {
  STRETCH: "stretch",
  BEND: "bend",
} as const;
export type ModeKindValue = (typeof ModeKind)[keyof typeof ModeKind];

export type ModeCharacter = {
  readonly kind: ModeKindValue;
  /** Atoms of the dominant coordinate: [a, b] for a stretch, [a, centre, b] for a bend. */
  readonly atoms: readonly number[];
  /** "C=O", "O–H", "H–C–H". */
  readonly label: string;
  /** Order of the dominant bond for a stretch (1 for a bend). */
  readonly bondOrder: number;
};

const BOND_GLYPHS = ["", "–", "=", "≡"];

/** Stretch force constant per unit bond order, mdyn/Å. */
const STRETCH_CONSTANT = 5;
/** Bend force constant, mdyn·Å/rad². */
const BEND_CONSTANT = 0.7;

export function describeMode(molecule: Molecule, displacements: Float64Array): ModeCharacter {
  const p = molecule.positions;
  const d = displacements;
  const vector = (array: Float64Array, i: number): [number, number, number] => [
    array[3 * i] ?? 0,
    array[3 * i + 1] ?? 0,
    array[3 * i + 2] ?? 0,
  ];
  const minus = (u: number[], v: number[]) => [
    (u[0] ?? 0) - (v[0] ?? 0),
    (u[1] ?? 0) - (v[1] ?? 0),
    (u[2] ?? 0) - (v[2] ?? 0),
  ];
  const dot = (u: number[], v: number[]) =>
    (u[0] ?? 0) * (v[0] ?? 0) + (u[1] ?? 0) * (v[1] ?? 0) + (u[2] ?? 0) * (v[2] ?? 0);
  const norm = (u: number[]) => Math.sqrt(dot(u, u));

  let bestStretch = { value: -1, atoms: [0, 0], order: 1 };
  for (const bond of molecule.bonds) {
    const r = minus(vector(p, bond.b), vector(p, bond.a));
    const length = norm(r) || 1;
    const change = dot(minus(vector(d, bond.b), vector(d, bond.a)), r) / length;
    const value = STRETCH_CONSTANT * bond.order * change * change;
    if (value > bestStretch.value) {
      bestStretch = { value, atoms: [bond.a, bond.b], order: bond.order };
    }
  }

  let bestBend = { value: -1, atoms: [0, 0, 0] };
  neighborLists(molecule).forEach((neighbors, center) => {
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const a = neighbors[i] ?? 0;
        const b = neighbors[j] ?? 0;
        const value = BEND_CONSTANT * angleChange(p, d, a, center, b) ** 2;
        if (value > bestBend.value) {
          bestBend = { value, atoms: [a, center, b] };
        }
      }
    }
  });

  const symbol = (i: number) => molecule.elements[i]?.symbol ?? "?";
  if (bestStretch.value >= bestBend.value) {
    // As chemists write bonds: carbon first, hydrogen last, otherwise heavier first ("C=O", "O–H", "C–Cl").
    const rank = (i: number) => {
      const z = molecule.elements[i]?.number ?? 0;
      return z === 6 ? Number.POSITIVE_INFINITY : z;
    };
    const [heavy = 0, light = 0] = [...bestStretch.atoms].sort((x, y) => rank(y) - rank(x));
    return {
      kind: ModeKind.STRETCH,
      atoms: [heavy, light],
      label: `${symbol(heavy)}${BOND_GLYPHS[bestStretch.order] ?? "–"}${symbol(light)}`,
      bondOrder: bestStretch.order,
    };
  }
  const [end1 = 0, vertex = 0, end2 = 0] = bestBend.atoms;
  return {
    kind: ModeKind.BEND,
    atoms: [end1, vertex, end2],
    label: `${symbol(end1)}–${symbol(vertex)}–${symbol(end2)}`,
    bondOrder: 1,
  };
}

/** First-order change of angle a–centre–b, radians per unit displacement. */
function angleChange(p: Float64Array, d: Float64Array, a: number, center: number, b: number): number {
  const get = (array: Float64Array, i: number, c: number) => array[3 * i + c] ?? 0;
  const u = [0, 1, 2].map((c) => get(p, a, c) - get(p, center, c));
  const v = [0, 1, 2].map((c) => get(p, b, c) - get(p, center, c));
  const du = [0, 1, 2].map((c) => get(d, a, c) - get(d, center, c));
  const dv = [0, 1, 2].map((c) => get(d, b, c) - get(d, center, c));
  const angle = (x: number[], y: number[]) => {
    const nx = Math.hypot(x[0] ?? 0, x[1] ?? 0, x[2] ?? 0) || 1;
    const ny = Math.hypot(y[0] ?? 0, y[1] ?? 0, y[2] ?? 0) || 1;
    const cos = ((x[0] ?? 0) * (y[0] ?? 0) + (x[1] ?? 0) * (y[1] ?? 0) + (x[2] ?? 0) * (y[2] ?? 0)) / (nx * ny);
    return Math.acos(Math.max(-1, Math.min(1, cos)));
  };
  // Central difference along the displacement direction.
  const h = 1e-4;
  const plus = angle(
    u.map((value, c) => value + h * (du[c] ?? 0)),
    v.map((value, c) => value + h * (dv[c] ?? 0)),
  );
  const minus = angle(
    u.map((value, c) => value - h * (du[c] ?? 0)),
    v.map((value, c) => value - h * (dv[c] ?? 0)),
  );
  return (plus - minus) / (2 * h);
}
