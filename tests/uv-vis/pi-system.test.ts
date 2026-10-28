/**
 * pi-system.test.ts
 *
 * Hückel and free-electron models against textbook results and measured λmax; the per-family
 * calibration constants are re-derived by least squares; perceived colours are checked by hue.
 */

import { describe, expect, it } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import { MoleculeGraph } from "../../src/common/model/MoleculeGraph.js";
import { boxWavelength, PiSystem } from "../../src/uv-vis/model/PiSystem.js";
import {
  colorOfBand,
  ElectronicModel,
  familyOf,
  HUECKEL_CALIBRATION,
  MEASURED_MAXIMA,
  predict,
} from "../../src/uv-vis/model/UVVisModel.js";

const piSystem = async (id: string) => new PiSystem(new MoleculeGraph(await loadMolecule(id)));
const HC = 1239.84; // eV·nm

describe("π-system models", () => {
  it("gives butadiene's Hückel levels α ± 1.618β and α ± 0.618β", async () => {
    const { orbitals, homo, lumo } = (await piSystem("1-3-butadiene")).hueckel();
    expect(orbitals.map((o) => o.energy)).toEqual(
      [-1.618, -0.618, 0.618, 1.618].map((value) => expect.closeTo(value, 3)),
    );
    expect([homo, lumo]).toEqual([1, 2]);
    expect(orbitals.map((o) => o.occupancy)).toEqual([2, 2, 0, 0]);
  });

  it("finds benzene's degenerate HOMO and LUMO pairs", async () => {
    const energies = (await piSystem("benzene")).hueckel().orbitals.map((o) => o.energy);
    expect(energies[1]).toBeCloseTo(energies[2] ?? 0, 6);
    expect(energies[3]).toBeCloseTo(energies[4] ?? 0, 6);
    expect(energies[0]).toBeCloseTo(-2, 6);
  });

  it("counts a cyanine's π electrons as atoms + 1 (the amine nitrogen gives two)", async () => {
    const pi = await piSystem("pentamethine-cyanine");
    expect(pi.atoms).toHaveLength(7);
    expect(pi.electrons).toBe(8);
    expect(pi.isLinearChain).toBe(true);
    expect((await piSystem("naphthalene")).isLinearChain).toBe(false);
  });

  it("predicts cyanine λmax with the free-electron model within 15 % and no fitting", async () => {
    for (const id of ["trimethine-cyanine", "pentamethine-cyanine", "heptamethine-cyanine", "nonamethine-cyanine"]) {
      const pi = await piSystem(id);
      const predicted = boxWavelength(pi.boxLength(), pi.electrons);
      expect(Math.abs(predicted / (MEASURED_MAXIMA[id] ?? 1) - 1), id).toBeLessThan(0.15);
    }
  });

  it("overestimates polyene λmax badly with the box (bond alternation), worse as chains grow", async () => {
    const ratio = async (id: string) => {
      const pi = await piSystem(id);
      return boxWavelength(pi.boxLength(), pi.electrons) / (MEASURED_MAXIMA[id] ?? 1);
    };
    expect(await ratio("1-3-5-7-octatetraene")).toBeGreaterThan(1.5);
    expect(await ratio("beta-carotene")).toBeGreaterThan(await ratio("1-3-5-7-octatetraene"));
  });

  it("uses calibration constants that are the least-squares fit of each family", async () => {
    for (const family of ["polyenes", "acenes", "cyanines"] as const) {
      // Benzene shares the acene calibration (it is the first member of the series).
      const ids = Object.keys(MEASURED_MAXIMA).filter(
        (id) => (familyOf(id) === family || (family === "acenes" && id === "benzene")) && id !== "azulene",
      );
      const points: [number, number][] = [];
      for (const id of ids) {
        const { orbitals, homo, lumo } = (await piSystem(id)).hueckel();
        points.push([(orbitals[lumo]?.energy ?? 0) - (orbitals[homo]?.energy ?? 0), HC / (MEASURED_MAXIMA[id] ?? 1)]);
      }
      const n = points.length;
      const mx = points.reduce((s, [x]) => s + x, 0) / n;
      const my = points.reduce((s, [, y]) => s + y, 0) / n;
      const b =
        points.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / points.reduce((s, [x]) => s + (x - mx) ** 2, 0);
      const a = my - b * mx;
      expect(HUECKEL_CALIBRATION[family]?.a, family).toBeCloseTo(a, 2);
      expect(HUECKEL_CALIBRATION[family]?.b, family).toBeCloseTo(b, 2);
    }
  });

  it("predicts each calibrated family within 15 %", async () => {
    for (const id of Object.keys(MEASURED_MAXIMA).filter((key) => key !== "azulene")) {
      const prediction = predict(await piSystem(id), ElectronicModel.HUECKEL, familyOf(id));
      expect(Math.abs((prediction?.wavelength ?? 0) / (MEASURED_MAXIMA[id] ?? 1) - 1), id).toBeLessThan(0.15);
    }
  });

  it("colours β-carotene orange, pentacene blue-violet, and leaves UV absorbers white", () => {
    const [r1, g1, b1] = colorOfBand(452);
    expect(r1).toBeGreaterThan(g1);
    expect(g1).toBeGreaterThan(b1);
    const [r2, g2, b2] = colorOfBand(580);
    expect(b2).toBeGreaterThan(g2);
    expect(r2).toBeLessThan(b2 + 40);
    expect(Math.min(...colorOfBand(217))).toBeGreaterThan(245);
  });
});
