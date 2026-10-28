/**
 * infrared-model.test.ts
 *
 * Mode naming, isotope schemes and the transmittance curve on the committed library data.
 */

import { describe, expect, it } from "vitest";
import ethanolFile from "../../src/common/model/library/data/ethanol.json";
import formaldehydeFile from "../../src/common/model/library/data/formaldehyde.json";
import waterFile from "../../src/common/model/library/data/water.json";
import { type MoleculeFile, moleculeFromFile } from "../../src/common/model/Molecule.js";
import {
  computePeaks,
  IR_RANGE,
  IsotopeScheme,
  isotopeMasses,
  isotopeSchemeApplies,
  transmittanceCurve,
} from "../../src/infrared/model/InfraredModel.js";

const water = moleculeFromFile(waterFile as MoleculeFile);
const ethanol = moleculeFromFile(ethanolFile as MoleculeFile);
const formaldehyde = moleculeFromFile(formaldehydeFile as MoleculeFile);

describe("Infrared model", () => {
  it("names water's modes: one bend, then two O–H stretches", () => {
    const peaks = computePeaks(water, IsotopeScheme.NATURAL);
    expect(peaks.map((p) => p.character.kind)).toEqual(["bend", "stretch", "stretch"]);
    expect(peaks[0]?.character.label).toBe("H–O–H");
    expect(peaks[2]?.character.label).toBe("O–H");
  });

  it("finds formaldehyde's C=O stretch near 1750 cm⁻¹", () => {
    const carbonyl = computePeaks(formaldehyde, IsotopeScheme.NATURAL).find((p) => p.character.label === "C=O");
    expect(carbonyl).toBeDefined();
    expect(carbonyl?.wavenumber).toBeGreaterThan(1700);
    expect(carbonyl?.wavenumber).toBeLessThan(1850);
  });

  it("deuterates only the hydroxyl hydrogen in a D₂O shake", () => {
    const masses = isotopeMasses(ethanol, IsotopeScheme.EXCHANGE_DEUTERIUM);
    const isDeuterium = (m: number) => m > 2 && m < 3;
    expect(masses.filter(isDeuterium)).toHaveLength(1);
    expect(isotopeMasses(ethanol, IsotopeScheme.ALL_DEUTERIUM).filter(isDeuterium)).toHaveLength(6);
  });

  it("moves ethanol's O–H stretch to an O–D stretch near 2700 cm⁻¹", () => {
    const highest = (scheme: (typeof IsotopeScheme)[keyof typeof IsotopeScheme]) =>
      computePeaks(ethanol, scheme)
        .filter((p) => p.character.label === "O–H")
        .map((p) => p.wavenumber);
    const oh = highest(IsotopeScheme.NATURAL);
    const od = highest(IsotopeScheme.EXCHANGE_DEUTERIUM);
    expect(oh[0]).toBeGreaterThan(3500);
    expect(od[0]).toBeGreaterThan(2550);
    expect(od[0]).toBeLessThan(2800);
  });

  it("offers only isotope schemes that change a mass", () => {
    expect(isotopeSchemeApplies(water, IsotopeScheme.CHLORINE_37)).toBe(false);
    expect(isotopeSchemeApplies(water, IsotopeScheme.OXYGEN_18)).toBe(true);
    expect(isotopeSchemeApplies(water, IsotopeScheme.CARBON_13)).toBe(false);
  });

  it("draws a transmittance curve between 0 and 100 % whose deepest dip is the strongest mode", () => {
    const peaks = computePeaks(water, IsotopeScheme.NATURAL);
    const curve = transmittanceCurve(peaks, 10);
    let minimum = 100;
    let minimumX = 0;
    curve.y.forEach((value, i) => {
      if (value < minimum) {
        minimum = value;
        minimumX = curve.x[i] ?? 0;
      }
    });
    expect(Math.max(...curve.y)).toBeLessThanOrEqual(100);
    expect(minimum).toBeGreaterThan(0);
    expect(minimum).toBeLessThan(10);
    const strongest = peaks.reduce((a, b) => (b.intensity > a.intensity ? b : a));
    expect(Math.abs(minimumX - strongest.wavenumber)).toBeLessThan(10);
    expect(curve.x[0]).toBe(IR_RANGE.min);
  });
});
