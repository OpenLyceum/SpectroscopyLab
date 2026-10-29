/**
 * SpinSystem.ts
 *
 * The exact (second-order) ¹H spectrum: the spin Hamiltonian of each group of coupled protons,
 * diagonalised, instead of the n + 1 rule.
 *
 * In frequency units (Hz) the Hamiltonian of N coupled spins-½ is
 *
 *     H = Σᵢ νᵢ Izᵢ + Σᵢ<ⱼ Jᵢⱼ Iᵢ·Iⱼ,   νᵢ = δᵢ × spectrometer frequency,
 *
 * where Iᵢ·Iⱼ = IzᵢIzⱼ + ½(I⁺ᵢI⁻ⱼ + I⁻ᵢI⁺ⱼ). The flip-flop term mixes product states only when two
 * spins have similar frequencies, so when every |νᵢ − νⱼ| ≫ Jᵢⱼ the eigenstates are product states
 * and the n + 1 rule is exact. When the shift difference in Hz is only a few J, as at 60 MHz or
 * between neighbouring ring protons, lines move and change height: the inner lines of two coupled
 * multiplets grow at the expense of the outer ones ("roofing"), and AB, ABX, AA′BB′ patterns appear.
 * Shifts are fixed in ppm but J is fixed in Hz, so raising the field makes the spectrum first order.
 *
 * Total Iz commutes with H, so H is block-diagonal by the number of β spins; each block is
 * diagonalised separately (cyclic Jacobi). Observed lines are transitions between neighbouring
 * blocks, at Eₐ − E_b with intensity |⟨b|I⁻|a⟩|², I⁻ = Σᵢ I⁻ᵢ.
 */

import type { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import { symmetricEigen } from "../../common/model/math/symmetricEigen.js";
import { multipletLines, type ProtonEnvironment, vicinalCoupling } from "./ProtonSpectrum.js";

/** Larger coupled groups fall back to first order (a 10-spin block is 252 × 252; 9 spins is 126). */
export const MAX_EXACT_SPINS = 9;
/** Lines weaker than this (in protons) are dropped. */
const MIN_WEIGHT = 1e-4;
/**
 * Lines of one signal closer than this (Hz) are merged: the many (near-)degenerate transitions of
 * methyl groups, split by hundredths of a hertz, far below the 0.8 Hz natural line width.
 */
const MERGE_HZ = 0.1;

export type ResolvedLine = {
  /** Chemical shift of the line, ppm. */
  readonly position: number;
  /** Area in protons: the lines of a molecule sum to its number of (observed) protons. */
  readonly weight: number;
  /** Index of the signal the line belongs to (the environment whose spins dominate the transition). */
  readonly environment: number;
  /** An exchanging O–H/N–H line, drawn broad. */
  readonly broad: boolean;
};

/**
 * Every line of the spectrum. With a graph the coupled protons are treated exactly; without one
 * (or for a coupled group larger than MAX_EXACT_SPINS) each signal is a first-order multiplet.
 */
export function resolvedLines(
  environments: readonly ProtonEnvironment[],
  field: number,
  graph: MoleculeGraph | null,
): ResolvedLine[] {
  const lines: ResolvedLine[] = [];
  const firstOrder = (index: number) => {
    const environment = environments[index];
    if (!environment) {
      return;
    }
    for (const line of multipletLines(environment.couplings)) {
      lines.push({
        position: environment.shift + line.offsetHz / field,
        weight: environment.atoms.length * line.weight,
        environment: index,
        broad: environment.exchangeable,
      });
    }
  };
  if (!graph) {
    environments.forEach((_, index) => {
      firstOrder(index);
    });
    return lines;
  }

  // Exchanging protons are decoupled from everything; each is its own broad singlet.
  const spins: { atom: number; environment: number; frequency: number }[] = [];
  environments.forEach((environment, index) => {
    if (environment.exchangeable) {
      firstOrder(index);
    } else {
      for (const atom of environment.atoms) {
        spins.push({ atom, environment: index, frequency: environment.shift * field });
      }
    }
  });

  const n = spins.length;
  const coupling = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const j0 = vicinalCoupling(graph, spins[i]?.atom ?? -1, spins[j]?.atom ?? -1);
      coupling[i * n + j] = j0;
      coupling[j * n + i] = j0;
    }
  }

  const components = connectedComponents(n, (i, j) => (coupling[i * n + j] ?? 0) !== 0);
  const fallback = new Set<number>();
  for (const component of components) {
    if (component.length > MAX_EXACT_SPINS) {
      for (const i of component) {
        fallback.add(spins[i]?.environment ?? -1);
      }
    }
  }
  for (const index of fallback) {
    firstOrder(index);
  }
  for (const component of components) {
    if (component.some((i) => fallback.has(spins[i]?.environment ?? -1))) {
      continue;
    }
    const members = component.map((i) => spins[i] ?? { atom: -1, environment: -1, frequency: 0 });
    const js = component.map((i) => component.map((j) => coupling[i * n + j] ?? 0));
    for (const line of exactLines(
      members.map((m) => m.frequency),
      js,
      members.map((m) => m.environment),
    )) {
      lines.push({ position: line.frequency / field, weight: line.weight, environment: line.group, broad: false });
    }
  }
  return lines;
}

export type ExactLine = {
  /** Hz. */
  readonly frequency: number;
  /** Area in spins (the lines of a system sum to its number of spins). */
  readonly weight: number;
  /** The group label (from `groups`) contributing most to the transition. */
  readonly group: number;
};

/**
 * Lines of one coupled spin system.
 * @param frequencies - νᵢ, Hz
 * @param couplings - symmetric Jᵢⱼ, Hz (diagonal ignored)
 * @param groups - a label per spin (its signal), used to attribute each line
 */
export function exactLines(
  frequencies: readonly number[],
  couplings: readonly (readonly number[])[],
  groups: readonly number[],
): ExactLine[] {
  const n = frequencies.length;
  if (n === 0) {
    return [];
  }
  // Work relative to the mean frequency: better conditioned, and added back at the end.
  const mean = frequencies.reduce((sum, f) => sum + f, 0) / n;
  const nu = frequencies.map((f) => f - mean);
  const j = (a: number, b: number) => couplings[a]?.[b] ?? 0;
  const m = (state: number, spin: number) => ((state >> spin) & 1 ? -0.5 : 0.5);

  // Basis states grouped by the number of β spins (set bits).
  const blocks: number[][] = Array.from({ length: n + 1 }, () => []);
  for (let state = 0; state < 1 << n; state++) {
    blocks[popCount(state)]?.push(state);
  }
  const position = new Map<number, number>();
  for (const block of blocks) {
    block.forEach((state, index) => {
      position.set(state, index);
    });
  }

  const solved = blocks.map((block) => {
    const size = block.length;
    const h = new Float64Array(size * size);
    block.forEach((state, row) => {
      let diagonal = 0;
      for (let a = 0; a < n; a++) {
        diagonal += (nu[a] ?? 0) * m(state, a);
        for (let b = a + 1; b < n; b++) {
          const jab = j(a, b);
          if (jab !== 0) {
            diagonal += jab * m(state, a) * m(state, b);
            if (m(state, a) !== m(state, b)) {
              const column = position.get(state ^ (1 << a) ^ (1 << b)) ?? 0;
              h[row * size + column] = jab / 2;
            }
          }
        }
      }
      h[row * size + row] = diagonal;
    });
    return symmetricEigen(h, size);
  });

  const labels = [...new Set(groups)];
  const raw: ExactLine[] = [];
  // 2^(N−1) transitions per uncoupled spin: dividing by it makes the total intensity N.
  const normalisation = 2 ** (n - 1);
  for (let k = 0; k < n; k++) {
    const upper = blocks[k] ?? [];
    const lower = blocks[k + 1] ?? [];
    const upperVectors = solved[k];
    const lowerVectors = solved[k + 1];
    if (!(upperVectors && lowerVectors)) {
      continue;
    }
    const sizeU = upper.length;
    const sizeL = lower.length;
    // S[g] = (Σ_{i in g} I⁻ᵢ) applied to each upper eigenvector, in the lower product basis.
    const lowered = labels.map(() => new Float64Array(sizeL * sizeU));
    upper.forEach((state, row) => {
      for (let spin = 0; spin < n; spin++) {
        if (!((state >> spin) & 1)) {
          const target = position.get(state | (1 << spin)) ?? 0;
          const g = labels.indexOf(groups[spin] ?? 0);
          const s = lowered[g];
          if (s) {
            for (let a = 0; a < sizeU; a++) {
              s[target * sizeU + a] = (s[target * sizeU + a] ?? 0) + (upperVectors.vectors[row * sizeU + a] ?? 0);
            }
          }
        }
      }
    });
    for (let a = 0; a < sizeU; a++) {
      for (let b = 0; b < sizeL; b++) {
        let total = 0;
        let best = 0;
        let bestGroup = labels[0] ?? 0;
        labels.forEach((label, g) => {
          const s = lowered[g];
          let amplitude = 0;
          for (let t = 0; t < sizeL; t++) {
            amplitude += (lowerVectors.vectors[t * sizeL + b] ?? 0) * (s?.[t * sizeU + a] ?? 0);
          }
          total += amplitude;
          if (Math.abs(amplitude) > best) {
            best = Math.abs(amplitude);
            bestGroup = label;
          }
        });
        const weight = (total * total) / normalisation;
        if (weight > MIN_WEIGHT) {
          raw.push({
            frequency: (upperVectors.values[a] ?? 0) - (lowerVectors.values[b] ?? 0) + mean,
            weight,
            group: bestGroup,
          });
        }
      }
    }
  }
  return mergeLines(raw);
}

function mergeLines(lines: readonly ExactLine[]): ExactLine[] {
  const sorted = [...lines].sort((p, q) => p.frequency - q.frequency);
  const merged: ExactLine[] = [];
  for (const line of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.group === line.group && line.frequency - last.frequency < MERGE_HZ) {
      const weight = last.weight + line.weight;
      merged[merged.length - 1] = {
        frequency: (last.frequency * last.weight + line.frequency * line.weight) / weight,
        weight,
        group: last.group,
      };
    } else {
      merged.push(line);
    }
  }
  return merged;
}

function popCount(value: number): number {
  let count = 0;
  for (let v = value; v; v &= v - 1) {
    count++;
  }
  return count;
}

function connectedComponents(n: number, linked: (i: number, j: number) => boolean): number[][] {
  const seen = new Array<boolean>(n).fill(false);
  const components: number[][] = [];
  for (let start = 0; start < n; start++) {
    if (seen[start]) {
      continue;
    }
    const component: number[] = [];
    const stack = [start];
    seen[start] = true;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      component.push(i);
      for (let j = 0; j < n; j++) {
        if (!seen[j] && linked(i, j)) {
          seen[j] = true;
          stack.push(j);
        }
      }
    }
    components.push(component.sort((a, b) => a - b));
  }
  return components;
}
