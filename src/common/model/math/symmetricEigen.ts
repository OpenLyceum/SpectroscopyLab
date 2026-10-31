/**
 * symmetricEigen.ts
 *
 * Eigenvalues and eigenvectors of a real symmetric matrix by the cyclic Jacobi method. Used for
 * mass-weighted Hessians (≤ ~100×100) and Hückel π Hamiltonians (≤ ~40×40), where it is fast,
 * unconditionally stable, and gives orthonormal eigenvectors even for degenerate eigenvalues.
 *
 * Written here rather than using dot's EigenvalueDecomposition, whose getV() calls copy() on a
 * typed array and throws (scenerystack 3.0).
 */

const MAX_SWEEPS = 400;

export class EigenConvergenceError extends Error {
  public constructor(n: number, residual: number) {
    super(`Jacobi did not converge for a ${n}×${n} symmetric matrix (off-diagonal squared norm ${residual})`);
    this.name = "EigenConvergenceError";
  }
}

export type SymmetricEigenResult = {
  /** Eigenvalues in ascending order. */
  readonly values: Float64Array;
  /** Row-major n×n: column k (vectors[i * n + k]) is the unit eigenvector of values[k]. */
  readonly vectors: Float64Array;
};

/**
 * @param matrix - row-major n×n; only symmetric input is meaningful. It is not modified.
 * @param maxSweeps - override for tests. The default is enough for the Hessians and spin blocks here.
 * @throws {EigenConvergenceError} when off-diagonal entries remain after the last sweep.
 */
export function symmetricEigen(matrix: Float64Array, n: number, maxSweeps = MAX_SWEEPS): SymmetricEigenResult {
  const a = matrix.slice();
  const v = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    v[i * n + i] = 1;
  }

  let scale = 0;
  for (let i = 0; i < n * n; i++) {
    scale += (a[i] ?? 0) ** 2;
  }
  const threshold = 1e-30 * Math.max(scale, Number.MIN_VALUE);

  for (let sweep = 0; sweep < maxSweeps && offDiagonalSquared(a, n) > threshold; sweep++) {
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        rotate(a, v, n, p, q);
      }
    }
  }
  const residual = offDiagonalSquared(a, n);
  if (residual > threshold) {
    throw new EigenConvergenceError(n, residual);
  }

  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => (a[i * n + i] ?? 0) - (a[j * n + j] ?? 0));
  const values = new Float64Array(n);
  const vectors = new Float64Array(n * n);
  order.forEach((source, target) => {
    values[target] = a[source * n + source] ?? 0;
    for (let i = 0; i < n; i++) {
      vectors[i * n + target] = v[i * n + source] ?? 0;
    }
  });
  return { values, vectors };
}

function offDiagonalSquared(a: Float64Array, n: number): number {
  let sum = 0;
  for (let p = 0; p < n; p++) {
    for (let q = p + 1; q < n; q++) {
      sum += (a[p * n + q] ?? 0) ** 2;
    }
  }
  return sum;
}

/** One Jacobi rotation in the (p, q) plane that zeroes a[p][q], accumulated into v. */
function rotate(a: Float64Array, v: Float64Array, n: number, p: number, q: number): void {
  const apq = a[p * n + q] ?? 0;
  if (apq === 0) {
    return;
  }
  // Stable rotation angle (Numerical Recipes §11.1).
  const theta = ((a[q * n + q] ?? 0) - (a[p * n + p] ?? 0)) / (2 * apq);
  const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
  const c = 1 / Math.sqrt(t * t + 1);
  const s = t * c;
  for (let k = 0; k < n; k++) {
    const akp = a[k * n + p] ?? 0;
    const akq = a[k * n + q] ?? 0;
    a[k * n + p] = c * akp - s * akq;
    a[k * n + q] = s * akp + c * akq;
  }
  for (let k = 0; k < n; k++) {
    const apk = a[p * n + k] ?? 0;
    const aqk = a[q * n + k] ?? 0;
    a[p * n + k] = c * apk - s * aqk;
    a[q * n + k] = s * apk + c * aqk;
    const vkp = v[k * n + p] ?? 0;
    const vkq = v[k * n + q] ?? 0;
    v[k * n + p] = c * vkp - s * vkq;
    v[k * n + q] = s * vkp + c * vkq;
  }
}
