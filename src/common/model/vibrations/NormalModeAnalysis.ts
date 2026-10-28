/**
 * NormalModeAnalysis.ts
 *
 * Harmonic normal modes and IR intensities from a Cartesian Hessian and dipole derivatives.
 *
 *   1. Mass-weight the Hessian: H'ᵢⱼ = Hᵢⱼ / √(mᵢ mⱼ).
 *   2. Project out the 6 (5 for a linear molecule) translations and rotations, so the external
 *      motions are exact zero modes instead of small spurious frequencies.
 *   3. Diagonalise: eigenvalues λ give ω = √λ, eigenvectors give the mass-weighted mode shapes.
 *   4. IR intensity of mode k: I = (NA π / 3c²) |∂μ/∂Qₖ|², with ∂μ/∂Qₖ = Σᵢ (∂μ/∂xᵢ) Lᵢₖ/√mᵢ.
 *
 * The Hessian does not depend on the masses, so swapping an isotope only re-runs this analysis.
 * Everything here is in atomic units internally; results are in cm⁻¹, km/mol and Å.
 */

import type { VibrationData } from "../Molecule.js";
import { symmetricEigen } from "../math/symmetricEigen.js";

/** Electron masses per unified atomic mass unit. */
const AMU_IN_ELECTRON_MASSES = 1822.888486;

/** cm⁻¹ per hartree. */
const HARTREE_TO_WAVENUMBER = 219474.6313705;

/** Å per bohr. */
const BOHR = 0.529177210903;

/** km/mol per (e / √u)² — the IR intensity prefactor (NA π / 3c²) in these units. */
const INTENSITY_KM_PER_MOL = 974.8801118;

/**
 * A translation/rotation vector that Gram–Schmidt shrinks below this fraction of the longest candidate
 * is dependent — the rotation about the axis of a linear molecule.
 */
const EXTERNAL_TOLERANCE = 1e-3;

export type NormalMode = {
  /** Scaled harmonic wavenumber, cm⁻¹ (negative for an imaginary mode). */
  readonly wavenumber: number;
  /** Unscaled harmonic wavenumber, cm⁻¹. */
  readonly harmonicWavenumber: number;
  /** IR intensity, km/mol. */
  readonly intensity: number;
  /** Reduced mass of the mode, u. */
  readonly reducedMass: number;
  /** Cartesian displacement per atom (x0, y0, z0, …), normalised so the largest atom moves 1 Å. */
  readonly displacements: Float64Array;
};

/**
 * Normal modes, lowest wavenumber first, without the translations and rotations.
 *
 * @param positions - x0, y0, z0, … in Å (used only to build the rotation vectors)
 * @param masses - atomic masses in u, one per atom (isotope-specific)
 */
export function analyzeNormalModes(
  positions: Float64Array,
  masses: readonly number[],
  data: VibrationData,
): NormalMode[] {
  const n = masses.length;
  const n3 = 3 * n;
  const sqrtMass = new Float64Array(n3); // √m in electron masses, per Cartesian coordinate
  for (let i = 0; i < n3; i++) {
    sqrtMass[i] = Math.sqrt((masses[Math.floor(i / 3)] ?? 1) * AMU_IN_ELECTRON_MASSES);
  }

  const weighted = new Float64Array(n3 * n3);
  let k = 0;
  for (let i = 0; i < n3; i++) {
    for (let j = i; j < n3; j++) {
      const value = (data.hessian[k++] ?? 0) / ((sqrtMass[i] ?? 1) * (sqrtMass[j] ?? 1));
      weighted[i * n3 + j] = value;
      weighted[j * n3 + i] = value;
    }
  }

  const external = externalBasis(positions, masses);
  const projected = project(weighted, external, n3);

  const { values: eigenvalues, vectors } = symmetricEigen(projected, n3);
  const vector = (i: number, column: number) => vectors[i * n3 + column] ?? 0;

  // The external motions are the eigenvectors that lie in the translation/rotation space.
  const overlaps = Array.from({ length: n3 }, (_, column) => {
    let total = 0;
    for (const basis of external) {
      let projection = 0;
      for (let i = 0; i < n3; i++) {
        projection += (basis[i] ?? 0) * vector(i, column);
      }
      total += projection * projection;
    }
    return total;
  });
  const externalColumns = new Set(
    overlaps
      .map((overlap, column) => ({ overlap, column }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, external.length)
      .map((entry) => entry.column),
  );

  const modes: NormalMode[] = [];
  for (let column = 0; column < n3; column++) {
    if (externalColumns.has(column)) {
      continue;
    }
    const lambda = eigenvalues[column] ?? 0;
    const harmonic = Math.sign(lambda) * Math.sqrt(Math.abs(lambda)) * HARTREE_TO_WAVENUMBER;

    // Cartesian displacement per unit mass-weighted normal coordinate (Q in bohr·√u).
    const cartesian = new Float64Array(n3);
    let normSquared = 0;
    for (let i = 0; i < n3; i++) {
      const value = (vector(i, column) * Math.sqrt(AMU_IN_ELECTRON_MASSES)) / (sqrtMass[i] ?? 1);
      cartesian[i] = value;
      normSquared += value * value;
    }

    let intensity = 0;
    for (const row of data.dipoleDerivatives) {
      let derivative = 0;
      for (let i = 0; i < n3; i++) {
        derivative += (row[i] ?? 0) * (cartesian[i] ?? 0);
      }
      intensity += derivative * derivative;
    }

    modes.push({
      wavenumber: harmonic * data.scale,
      harmonicWavenumber: harmonic,
      intensity: INTENSITY_KM_PER_MOL * intensity,
      reducedMass: 1 / normSquared,
      displacements: normalizeDisplacements(cartesian, n),
    });
  }
  return modes.sort((a, b) => a.wavenumber - b.wavenumber);
}

/** Orthonormal mass-weighted translation and rotation vectors (5 for linear molecules, else 6). */
function externalBasis(positions: Float64Array, masses: readonly number[]): Float64Array[] {
  const n = masses.length;
  let totalMass = 0;
  const center = [0, 0, 0];
  for (let a = 0; a < n; a++) {
    const m = masses[a] ?? 0;
    totalMass += m;
    for (let c = 0; c < 3; c++) {
      center[c] = (center[c] ?? 0) + m * (positions[3 * a + c] ?? 0);
    }
  }
  for (let c = 0; c < 3; c++) {
    center[c] = (center[c] ?? 0) / (totalMass || 1);
  }

  const candidates: Float64Array[] = [];
  for (let axis = 0; axis < 3; axis++) {
    const translation = new Float64Array(3 * n);
    const rotation = new Float64Array(3 * n);
    for (let a = 0; a < n; a++) {
      const s = Math.sqrt(masses[a] ?? 0);
      translation[3 * a + axis] = s;
      // Rotation about `axis`: e_axis × r, with r measured from the centre of mass (bohr).
      const r = [0, 1, 2].map((c) => ((positions[3 * a + c] ?? 0) - (center[c] ?? 0)) / BOHR);
      const next = (axis + 1) % 3;
      const previous = (axis + 2) % 3;
      rotation[3 * a + next] = -s * (r[previous] ?? 0);
      rotation[3 * a + previous] = s * (r[next] ?? 0);
    }
    candidates.push(translation);
    candidates.push(rotation);
  }

  const longest = Math.max(...candidates.map((vector) => Math.sqrt(dotProduct(vector, vector))));
  const basis: Float64Array[] = [];
  for (const vector of candidates) {
    for (const previous of basis) {
      const projection = dotProduct(vector, previous);
      for (let i = 0; i < vector.length; i++) {
        vector[i] = (vector[i] ?? 0) - projection * (previous[i] ?? 0);
      }
    }
    const norm = Math.sqrt(dotProduct(vector, vector));
    if (norm > EXTERNAL_TOLERANCE * longest) {
      basis.push(vector.map((value) => value / norm));
    }
  }
  return basis;
}

/** P H P with P = I − Σ v vᵀ, for row-major square H of size n3. */
function project(matrix: Float64Array, basis: readonly Float64Array[], n3: number): Float64Array {
  const result = matrix.slice();
  for (const v of basis) {
    // H ← (I − v vᵀ) H (I − v vᵀ) = H − v (vᵀH) − (H v) vᵀ + (vᵀ H v) v vᵀ
    const hv = new Float64Array(n3);
    for (let i = 0; i < n3; i++) {
      let sum = 0;
      for (let j = 0; j < n3; j++) {
        sum += (result[i * n3 + j] ?? 0) * (v[j] ?? 0);
      }
      hv[i] = sum;
    }
    const vhv = dotProduct(v, hv);
    for (let i = 0; i < n3; i++) {
      for (let j = 0; j < n3; j++) {
        result[i * n3 + j] =
          (result[i * n3 + j] ?? 0) -
          (v[i] ?? 0) * (hv[j] ?? 0) -
          (hv[i] ?? 0) * (v[j] ?? 0) +
          vhv * (v[i] ?? 0) * (v[j] ?? 0);
      }
    }
  }
  return result;
}

function normalizeDisplacements(cartesian: Float64Array, n: number): Float64Array {
  let largest = 0;
  for (let a = 0; a < n; a++) {
    const x = cartesian[3 * a] ?? 0;
    const y = cartesian[3 * a + 1] ?? 0;
    const z = cartesian[3 * a + 2] ?? 0;
    largest = Math.max(largest, Math.hypot(x, y, z));
  }
  return largest > 0 ? cartesian.map((value) => value / largest) : cartesian;
}

function dotProduct(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
}
