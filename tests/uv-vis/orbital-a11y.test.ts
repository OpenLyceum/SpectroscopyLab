/**
 * orbital-a11y.test.ts
 *
 * The energy-level diagram announces the orbital that is drawn on the molecule.
 */

import { describe, expect, it } from "vitest";
import type { ElectronicStructure } from "../../src/uv-vis/model/PiSystem.js";
import { describeOrbital } from "../../src/uv-vis/view/EnergyLevelDiagramNode.js";

const structure: ElectronicStructure = {
  homo: 1,
  lumo: 2,
  orbitals: [
    { energy: -1, occupancy: 2, coefficients: [1] },
    { energy: -0.5, occupancy: 2, coefficients: [1] },
    { energy: 0.5, occupancy: 0, coefficients: [1] },
    { energy: 1, occupancy: 0, coefficients: [1] },
  ],
};

describe("Orbital announcement", () => {
  it("names the orbital, its electron count and the HOMO or LUMO role", () => {
    expect(describeOrbital(1, structure)).toBe("Orbital 2 of 4, 2 electrons, HOMO.");
    expect(describeOrbital(2, structure)).toBe("Orbital 3 of 4, 0 electrons, LUMO.");
    expect(describeOrbital(0, structure)).toBe("Orbital 1 of 4, 2 electrons.");
  });
});
