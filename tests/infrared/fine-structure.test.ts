/**
 * fine-structure.test.ts
 *
 * HCl rotation–vibration lines: P/R branches with no Q branch, spacing ≈ 2B, branch convergence
 * from B₁ < B₀, the ³⁵Cl/³⁷Cl doubling, DCl isotope ratios, and the thermal envelope.
 */

import { describe, expect, it } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import type { Molecule } from "../../src/common/model/Molecule.js";
import { IsotopeScheme, isotopeMasses, PEAK_ABSORBANCE } from "../../src/infrared/model/InfraredModel.js";
import {
  fineAbsorbance,
  fineStructure,
  fineZoomAbsorbance,
  hasFineStructure,
  type RotationalLine,
} from "../../src/infrared/model/RotationalFineStructure.js";

function hcl(): Promise<Molecule> {
  return loadMolecule("hydrogen-chloride");
}

const line = (lines: readonly RotationalLine[], branch: "P" | "R", j: number, isotopologue = 0) =>
  lines.find((l) => l.branch === branch && l.j === j && l.isotopologue === isotopologue)?.wavenumber ?? Number.NaN;

describe("HCl rotational fine structure", () => {
  it("is offered for HCl only", async () => {
    expect(hasFineStructure(await hcl())).toBe(true);
    expect(hasFineStructure(await loadMolecule("water"))).toBe(false);
  });

  it("gives B and r close to experiment (B₀ = 10.44 cm⁻¹, r = 1.275 Å)", async () => {
    const molecule = await hcl();
    const [h35] = fineStructure(molecule, isotopeMasses(molecule, IsotopeScheme.NATURAL), 298).isotopologues;
    expect(h35?.label).toBe("H³⁵Cl");
    expect(Math.abs((h35?.bondLength ?? 0) - 1.275)).toBeLessThan(0.03);
    expect(Math.abs((h35?.groundB ?? 0) - 10.44) / 10.44).toBeLessThan(0.05);
  });

  it("has P and R branches spaced ≈ 2B, with a 4B gap and no line at the band origin", async () => {
    const molecule = await hcl();
    const fine = fineStructure(molecule, isotopeMasses(molecule, IsotopeScheme.NATURAL), 298);
    const h35 = fine.isotopologues[0];
    const b = h35?.groundB ?? 0;
    const origin = h35?.origin ?? 0;
    const gap = line(fine.lines, "R", 0) - line(fine.lines, "P", 1);
    expect(gap / (4 * b)).toBeGreaterThan(0.95);
    expect(gap / (4 * b)).toBeLessThan(1.02);
    expect(fine.lines.some((l) => Math.abs(l.wavenumber - origin) < b / 2)).toBe(false);
    // B₁ < B₀: R lines close up and P lines spread out.
    const rSpacing = (j: number) => line(fine.lines, "R", j + 1) - line(fine.lines, "R", j);
    const pSpacing = (j: number) => line(fine.lines, "P", j) - line(fine.lines, "P", j + 1);
    expect(rSpacing(5)).toBeLessThan(rSpacing(1));
    expect(pSpacing(5)).toBeGreaterThan(pSpacing(1));
    // R(1) − R(0) = 4B₁ − 2B₀ (centrifugal distortion is < 0.01 cm⁻¹ here).
    expect(rSpacing(0)).toBeCloseTo(4 * (h35?.excitedB ?? 0) - 2 * b, 1);
  });

  it("doubles every line with H³⁷Cl: about 2 cm⁻¹ lower and a third as strong", async () => {
    const molecule = await hcl();
    const fine = fineStructure(molecule, isotopeMasses(molecule, IsotopeScheme.NATURAL), 298);
    expect(fine.isotopologues.map((s) => s.label)).toEqual(["H³⁵Cl", "H³⁷Cl"]);
    const shift = line(fine.lines, "R", 0, 0) - line(fine.lines, "R", 0, 1);
    expect(shift).toBeGreaterThan(1.5);
    expect(shift).toBeLessThan(2.6);
    const strength = (isotopologue: number) =>
      fine.lines.find((l) => l.branch === "R" && l.j === 3 && l.isotopologue === isotopologue)?.intensity ?? 0;
    expect(strength(1) / strength(0)).toBeCloseTo(0.2424 / 0.7576, 1);
    // Substituting ³⁷Cl leaves one isotopologue.
    expect(fineStructure(molecule, isotopeMasses(molecule, IsotopeScheme.CHLORINE_37), 298).isotopologues).toHaveLength(
      1,
    );
  });

  it("moves DCl by the reduced-mass ratios: ν₀ × 0.717, B × 0.515", async () => {
    const molecule = await hcl();
    const h = fineStructure(molecule, isotopeMasses(molecule, IsotopeScheme.NATURAL), 298).isotopologues[0];
    const d = fineStructure(molecule, isotopeMasses(molecule, IsotopeScheme.ALL_DEUTERIUM), 298).isotopologues[0];
    expect(d?.label).toBe("D³⁵Cl");
    expect((d?.origin ?? 0) / (h?.origin ?? 1)).toBeCloseTo(0.717, 2);
    expect((d?.rotationalConstant ?? 0) / (h?.rotationalConstant ?? 1)).toBeCloseTo(0.515, 2);
    expect(Math.abs((h?.forceConstant ?? 0) - 480)).toBeLessThan(50);
  });

  it("shifts the envelope to higher J as the gas warms (J_max ≈ √(kT/2hcB) − ½)", async () => {
    const molecule = await hcl();
    const masses = isotopeMasses(molecule, IsotopeScheme.NATURAL);
    const strongestJ = (temperature: number) => {
      const r = fineStructure(molecule, masses, temperature).lines.filter(
        (l) => l.branch === "R" && l.isotopologue === 0,
      );
      return r.reduce((best, l) => (l.intensity > best.intensity ? l : best)).j;
    };
    expect(strongestJ(100)).toBeLessThan(strongestJ(298));
    expect(strongestJ(298)).toBeLessThan(strongestJ(1000));
    expect(strongestJ(298)).toBeGreaterThanOrEqual(2);
    expect(strongestJ(298)).toBeLessThanOrEqual(4);
  });

  it("scales the band so its strongest point is the peak absorbance, and the zoom keeps that scale", async () => {
    const molecule = await hcl();
    const fine = fineStructure(molecule, isotopeMasses(molecule, IsotopeScheme.NATURAL), 298);
    const band = fineAbsorbance(fine, PEAK_ABSORBANCE);
    expect(Math.max(...band.y)).toBeCloseTo(PEAK_ABSORBANCE, 6);
    const strongest = fine.lines.reduce((best, candidate) => (candidate.intensity > best.intensity ? candidate : best));
    const zoom = fineZoomAbsorbance(fine, strongest.wavenumber, PEAK_ABSORBANCE);
    expect(Math.max(...zoom.y)).toBeCloseTo(PEAK_ABSORBANCE, 1);
    const weak = fine.lines.reduce((best, candidate) => (candidate.intensity < best.intensity ? candidate : best));
    const weakZoom = fineZoomAbsorbance(fine, weak.wavenumber, PEAK_ABSORBANCE);
    expect(Math.max(...weakZoom.y)).toBeLessThan(PEAK_ABSORBANCE * 0.5);
  });
});
