/**
 * proton-spectrum.test.ts
 *
 * Environments, shifts and first-order multiplets against literature ¹H spectra (CDCl₃; values as
 * tabulated in SDBS / Pretsch). Rule-based shifts must land within 0.3 ppm.
 */

import { describe, expect, it } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import type { Molecule } from "../../src/common/model/Molecule.js";
import { MoleculeGraph } from "../../src/common/model/MoleculeGraph.js";
import { elementForSymbol } from "../../src/common/model/structure/Elements.js";
import { dihedral, type Vec3 } from "../../src/common/model/structure/Geometry.js";
import { COUPLING, multipletLines, protonEnvironments, vicinalCoupling } from "../../src/nmr/model/ProtonSpectrum.js";

const TOLERANCE = 0.3;

/** Literature shift (ppm), proton count and multiplicity per signal, in decreasing shift. */
const LITERATURE: Record<string, readonly [number, number, string][]> = {
  ethanol: [
    [3.69, 2, "q"],
    [2.6, 1, "s"],
    [1.22, 3, "t"],
  ],
  acetone: [[2.17, 6, "s"]],
  "ethyl-acetate": [
    [4.12, 2, "q"],
    [2.05, 3, "s"],
    [1.26, 3, "t"],
  ],
  "2-propanol": [
    [4.03, 1, "sept"],
    [2.2, 1, "s"],
    [1.2, 6, "d"],
  ],
  "1-propanol": [
    [3.58, 2, "t"],
    [2.2, 1, "s"],
    [1.57, 2, "sext"],
    [0.93, 3, "t"],
  ],
  propanal: [
    [9.79, 1, "t"],
    [2.46, 2, "qd"],
    [1.13, 3, "t"],
  ],
  chloroethane: [
    [3.57, 2, "q"],
    [1.48, 3, "t"],
  ],
  "methyl-propanoate": [
    [3.67, 3, "s"],
    [2.32, 2, "q"],
    [1.14, 3, "t"],
  ],
  "2-butanone": [
    [2.44, 2, "q"],
    [2.14, 3, "s"],
    [1.06, 3, "t"],
  ],
  "allyl-alcohol": [
    [5.95, 1, "m"],
    [5.27, 1, "d"],
    [5.15, 1, "d"],
    [4.13, 2, "d"],
    [2.2, 1, "s"],
  ],
  benzaldehyde: [
    [10.0, 1, "s"],
    [7.88, 2, "d"],
    [7.62, 1, "t"],
    [7.52, 2, "t"],
  ],
  "p-xylene": [
    [7.05, 4, "s"],
    [2.31, 6, "s"],
  ],
  "dimethyl-ether": [[3.24, 6, "s"]],
  acetonitrile: [[2.0, 3, "s"]],
};

describe("¹H NMR prediction", () => {
  for (const [id, expected] of Object.entries(LITERATURE)) {
    it(`${id}: signals, integrals and multiplicities`, async () => {
      const environments = protonEnvironments(new MoleculeGraph(await loadMolecule(id)));
      expect(environments.map((e) => e.atoms.length)).toEqual(expected.map(([, count]) => count));
      environments.forEach((environment, i) => {
        const [shift, , multiplicity] = expected[i] ?? [0, 0, ""];
        // O–H shifts depend on concentration; only check that they are exchangeable singlets.
        if (!environment.exchangeable) {
          expect(Math.abs(environment.shift - shift), `${id} ${environment.label}`).toBeLessThan(TOLERANCE);
        }
        if (multiplicity !== "m") {
          expect(environment.multiplicity, `${id} ${environment.label}`).toBe(multiplicity);
        }
      });
    });
  }

  it("treats toluene's ring protons by position, not by Kekulé form", async () => {
    const environments = protonEnvironments(new MoleculeGraph(await loadMolecule("toluene")));
    expect(environments.map((e) => e.atoms.length).sort((a, b) => a - b)).toEqual([1, 2, 2, 3]);
  });

  it("splits the vinyl-ether =CH into a doublet of doublets (trans 17 Hz, cis 10.5 Hz)", async () => {
    const environments = protonEnvironments(new MoleculeGraph(await loadMolecule("methyl-vinyl-ether")));
    const vinyl = environments.find((e) => e.atoms.length === 1);
    expect(vinyl?.multiplicity).toBe("dd");
    expect(vinyl?.couplings.map((c) => Math.round(c.j))).toEqual([17, 11]);
  });

  it("gives a twisted =CH₂ one cis and one trans coupling", () => {
    // Both methylene hydrogens sit on the same side of the C=C–H plane, so a raw 90° cut would
    // call both cis. The smaller torsion is cis and the larger is trans.
    const positions = [0, 0, 0, 1.34, 0, 0, -0.55, 0.95, 0.15, -0.45, 0.35, 0.85, 1.9, 0.95, 0, 1.9, -0.9, 0];
    const at = (i: number): Vec3 => [positions[3 * i] ?? 0, positions[3 * i + 1] ?? 0, positions[3 * i + 2] ?? 0];
    const torsion = (hydrogen: number) => Math.abs(dihedral(at(hydrogen), at(0), at(1), at(4)));
    expect(torsion(2)).toBeLessThan(90);
    expect(torsion(3)).toBeLessThan(90);
    expect(torsion(2)).not.toBeCloseTo(torsion(3), 0);

    const molecule: Molecule = {
      id: "twisted-vinyl",
      elements: ["C", "C", "H", "H", "H", "C"].map((symbol) => elementForSymbol(symbol)),
      positions: Float64Array.from(positions),
      bonds: [
        { a: 0, b: 1, order: 2 },
        { a: 0, b: 2, order: 1 },
        { a: 0, b: 3, order: 1 },
        { a: 1, b: 4, order: 1 },
        { a: 1, b: 5, order: 1 },
      ],
      charge: 0,
      vibrations: null,
      source: "test",
      method: "test",
    };
    const graph = new MoleculeGraph(molecule);
    const couplings = new Set([vicinalCoupling(graph, 2, 4), vicinalCoupling(graph, 3, 4)]);
    expect(couplings).toEqual(new Set([COUPLING.alkeneCis, COUPLING.alkeneTrans]));
  });

  it("builds Pascal-triangle multiplets whose weights sum to 1", () => {
    const quartet = multipletLines([{ j: 7, count: 3 }]);
    expect(quartet.map((l) => l.weight * 8)).toEqual([1, 3, 3, 1]);
    expect(quartet.map((l) => l.offsetHz)).toEqual([-10.5, -3.5, 3.5, 10.5]);
    const dd = multipletLines([
      { j: 17, count: 1 },
      { j: 10, count: 1 },
    ]);
    expect(dd).toHaveLength(4);
    expect(dd.reduce((sum, l) => sum + l.weight, 0)).toBeCloseTo(1, 12);
  });
});
