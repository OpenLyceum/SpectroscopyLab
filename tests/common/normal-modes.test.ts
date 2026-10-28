/**
 * normal-modes.test.ts
 *
 * The in-browser normal-mode analysis against the committed B3LYP library data and experiment:
 * mode counts (3N − 6 / 3N − 5), fundamentals, IR selection rules and isotope shifts.
 */

import { describe, expect, it } from "vitest";
import { defaultIsotopeMass } from "../../src/common/model/Isotopes.js";
import carbonDioxideFile from "../../src/common/model/library/data/carbon-dioxide.json";
import hydrogenChlorideFile from "../../src/common/model/library/data/hydrogen-chloride.json";
import waterFile from "../../src/common/model/library/data/water.json";
import { type Molecule, type MoleculeFile, moleculeFromFile } from "../../src/common/model/Molecule.js";
import { analyzeNormalModes, type NormalMode } from "../../src/common/model/vibrations/NormalModeAnalysis.js";

const DEUTERIUM = 2.01410178;
const CHLORINE_37 = 36.9659026;

function defaultMasses(molecule: Molecule): number[] {
  return molecule.elements.map((element) => defaultIsotopeMass(element.symbol, element.mass));
}

function modesOf(molecule: Molecule, masses = defaultMasses(molecule)): NormalMode[] {
  const data = molecule.vibrations;
  if (!data) {
    throw new Error(`${molecule.id} has no vibration data`);
  }
  return analyzeNormalModes(molecule.positions, masses, data);
}

const water = moleculeFromFile(waterFile as MoleculeFile);
const carbonDioxide = moleculeFromFile(carbonDioxideFile as MoleculeFile);
const hydrogenChloride = moleculeFromFile(hydrogenChlorideFile as MoleculeFile);

describe("normal-mode analysis", () => {
  it("finds 3N − 6 modes for water, within 5 % of the gas-phase fundamentals", () => {
    const modes = modesOf(water);
    expect(modes).toHaveLength(3);
    [1595, 3657, 3756].forEach((experiment, i) => {
      expect(Math.abs((modes[i]?.wavenumber ?? 0) - experiment) / experiment).toBeLessThan(0.05);
    });
    // Every water mode changes the dipole; the bend is the strongest.
    expect(modes.every((mode) => mode.intensity > 1)).toBe(true);
    expect(modes[0]?.intensity).toBeGreaterThan(modes[1]?.intensity ?? 0);
  });

  it("finds 3N − 5 modes for linear CO₂, with an IR-inactive symmetric stretch", () => {
    const modes = modesOf(carbonDioxide);
    expect(modes).toHaveLength(4);
    const [bendA, bendB, symmetric, antisymmetric] = modes;
    expect(bendA?.wavenumber).toBeCloseTo(bendB?.wavenumber ?? 0, 0);
    expect(symmetric?.intensity).toBeLessThan(1e-3 * (antisymmetric?.intensity ?? 0));
    expect(Math.abs((antisymmetric?.wavenumber ?? 0) - 2349) / 2349).toBeLessThan(0.05);
  });

  it("shifts O–H stretches by about 1/√2 on deuteration", () => {
    const h2o = modesOf(water);
    const masses = water.elements.map((element) =>
      element.symbol === "H" ? DEUTERIUM : defaultIsotopeMass(element.symbol, element.mass),
    );
    const d2o = modesOf(water, masses);
    const ratio = (d2o[2]?.wavenumber ?? 0) / (h2o[2]?.wavenumber ?? 1);
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(0.76);
  });

  it("gives HCl one stretch, with a ³⁵Cl/³⁷Cl splitting of about 2 cm⁻¹", () => {
    const h35 = modesOf(hydrogenChloride);
    expect(h35).toHaveLength(1);
    expect(Math.abs((h35[0]?.wavenumber ?? 0) - 2886) / 2886).toBeLessThan(0.05);
    const masses = hydrogenChloride.elements.map((element) =>
      element.symbol === "Cl" ? CHLORINE_37 : defaultIsotopeMass(element.symbol, element.mass),
    );
    const shift = (h35[0]?.wavenumber ?? 0) - (modesOf(hydrogenChloride, masses)[0]?.wavenumber ?? 0);
    expect(shift).toBeGreaterThan(1.5);
    expect(shift).toBeLessThan(2.8);
  });

  it("normalises displacements so the largest atom moves 1 Å", () => {
    for (const mode of modesOf(water)) {
      let largest = 0;
      for (let a = 0; a < 3; a++) {
        const d = mode.displacements;
        largest = Math.max(largest, Math.hypot(d[3 * a] ?? 0, d[3 * a + 1] ?? 0, d[3 * a + 2] ?? 0));
      }
      expect(largest).toBeCloseTo(1, 10);
    }
  });
});
