/**
 * symmetric-eigen.test.ts
 *
 * The Jacobi solver must report a failed diagonalisation instead of returning it.
 */

import { describe, expect, it } from "vitest";
import { EigenConvergenceError, symmetricEigen } from "../../src/common/model/math/symmetricEigen.js";

describe("symmetricEigen", () => {
  it("diagonalises a 2×2 matrix", () => {
    const { values } = symmetricEigen(Float64Array.of(2, 1, 1, 2), 2);
    expect(values[0]).toBeCloseTo(1);
    expect(values[1]).toBeCloseTo(3);
  });

  it("throws when it is not allowed enough sweeps to finish", () => {
    expect(() => symmetricEigen(Float64Array.of(1, 0.5, 0.5, 1), 2, 0)).toThrow(EigenConvergenceError);
  });
});
