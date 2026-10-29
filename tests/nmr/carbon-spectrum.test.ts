/**
 * carbon-spectrum.test.ts
 *
 * ¹³C environments and additivity shifts against typical literature values (CDCl₃, ppm, as
 * tabulated in SDBS / Pretsch), and the decoupled, DEPT and coupled spectrum types.
 */

import { describe, expect, it } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import { MoleculeGraph } from "../../src/common/model/MoleculeGraph.js";
import {
  CarbonSpectrumType,
  carbonEnvironments,
  carbonLines,
  PROTON_TO_CARBON_FREQUENCY,
} from "../../src/nmr/model/CarbonSpectrum.js";

/** Additivity is good to a few ppm; 1,4-dioxane (ring gauche effects) is the worst case, ~5 ppm. */
const TOLERANCE = 5;

/** Literature shifts in decreasing order, one per carbon environment. */
const LITERATURE: Record<string, readonly number[]> = {
  methane: [-2.3],
  ethanol: [58.3, 18.4],
  "dimethyl-ether": [59.7],
  "1-propanol": [64.2, 25.9, 10.1],
  "2-propanol": [64.0, 25.3],
  "allyl-alcohol": [137.3, 115.0, 63.6],
  "1-4-dioxane": [67.2],
  acetone: [206.6, 30.8],
  propanal: [202.8, 37.3, 6.0],
  "2-butanone": [209.3, 36.9, 29.4, 7.9],
  "acetic-acid": [177.2, 20.8],
  "butanoic-acid": [180.6, 36.2, 18.5, 13.7],
  "ethyl-acetate": [171.1, 60.5, 21.0, 14.2],
  "methyl-propanoate": [174.8, 51.5, 27.5, 9.2],
  acetonitrile: [116.9, 1.9],
  chloroethane: [39.9, 18.7],
  benzene: [128.5],
  toluene: [137.9, 129.1, 128.3, 125.4, 21.5],
  phenol: [155.0, 129.7, 121.0, 115.4],
  benzaldehyde: [192.4, 136.4, 134.5, 129.7, 129.0],
  ethylbenzene: [144.3, 128.4, 127.9, 125.7, 29.0, 15.6],
  "p-xylene": [134.7, 129.0, 21.0],
  "1-3-butadiene": [137.2, 116.6],
};

async function environmentsOf(id: string) {
  return carbonEnvironments(new MoleculeGraph(await loadMolecule(id)));
}

describe("¹³C NMR prediction", () => {
  for (const [id, expected] of Object.entries(LITERATURE)) {
    it(`${id}: one line per kind of carbon, shifts within ${TOLERANCE} ppm`, async () => {
      const environments = await environmentsOf(id);
      expect(environments.map((e) => e.shift).length).toBe(expected.length);
      environments.forEach((environment, i) => {
        expect(Math.abs(environment.shift - (expected[i] ?? 0)), `${id} C${environment.label}`).toBeLessThan(TOLERANCE);
      });
    });
  }

  it("tells the xylenes apart by counting lines: o 4, m 5, p 3", async () => {
    expect((await environmentsOf("o-xylene")).length).toBe(4);
    expect((await environmentsOf("m-xylene")).length).toBe(5);
    expect((await environmentsOf("p-xylene")).length).toBe(3);
  });

  it("finds both rings of naphthalene whichever Kekulé form was drawn: 3 kinds of carbon", async () => {
    expect((await environmentsOf("naphthalene")).map((e) => e.atoms.length)).toEqual([2, 4, 4]);
  });

  it("DEPT-135 points CH₂ down and drops C; DEPT-90 keeps only CH", async () => {
    // Ethylbenzene: ipso C, three ring CH, CH₂, CH₃.
    const environments = await environmentsOf("ethylbenzene");
    const dept135 = carbonLines(environments, CarbonSpectrumType.DEPT_135, 300);
    const typeOf = (index: number) => environments[index]?.hydrogens;
    expect(dept135).toHaveLength(5);
    for (const line of dept135) {
      expect(Math.sign(line.height)).toBe(typeOf(line.environment) === 2 ? -1 : 1);
    }
    const dept90 = carbonLines(environments, CarbonSpectrumType.DEPT_90, 300);
    expect(dept90.map((l) => typeOf(l.environment))).toEqual([1, 1, 1]);
  });

  it("splits each carbon by its own hydrogens without decoupling (¹J in Hz, so narrower at high field)", async () => {
    const environments = await environmentsOf("ethanol");
    const methyl = environments.findIndex((e) => e.hydrogens === 3);
    const quartet = (field: number) =>
      carbonLines(environments, CarbonSpectrumType.COUPLED, field)
        .filter((l) => l.environment === methyl)
        .map((l) => l.position);
    expect(quartet(300)).toHaveLength(4);
    const span = (field: number) => Math.max(...quartet(field)) - Math.min(...quartet(field));
    expect(span(300)).toBeCloseTo((3 * 125) / (300 / PROTON_TO_CARBON_FREQUENCY), 6);
    expect(span(60) / span(600)).toBeCloseTo(10, 6);
  });
});
