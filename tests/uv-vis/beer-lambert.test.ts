/**
 * beer-lambert.test.ts
 *
 * The quantitative UV-Vis mode: A = εbc, stray-light saturation, per-molecule concentration
 * ranges, and colour that deepens with concentration.
 */

import { describe, expect, it } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import {
  beerLambert,
  calibrationCurve,
  MEASURED_MAXIMA,
  MOLAR_ABSORPTIVITY,
  maxConcentration,
  measuredAbsorbance,
  UVVisModel,
} from "../../src/uv-vis/model/UVVisModel.js";

describe("Beer–Lambert mode", () => {
  it("has an ε for every molecule with a measured λmax", () => {
    const byName = (a: string, b: string) => a.localeCompare(b);
    expect(Object.keys(MOLAR_ABSORPTIVITY).sort(byName)).toEqual(Object.keys(MEASURED_MAXIMA).sort(byName));
  });

  it("is linear in ε, b and c (A = εbc, c in µmol/L)", () => {
    expect(beerLambert(21_000, 1, 20)).toBeCloseTo(0.42, 10);
    expect(beerLambert(21_000, 2, 20)).toBeCloseTo(0.84, 10);
    expect(beerLambert(21_000, 1, 40)).toBeCloseTo(0.84, 10);
  });

  it("reads true absorbance when dilute and saturates near 3 from 0.1 % stray light", () => {
    expect(measuredAbsorbance(0.5)).toBeCloseTo(0.5, 2);
    expect(measuredAbsorbance(2)).toBeLessThan(2);
    expect(measuredAbsorbance(2)).toBeGreaterThan(1.9);
    expect(measuredAbsorbance(10)).toBeCloseTo(3, 2);
    const curve = calibrationCurve(21_000, 1, 200, true);
    const ideal = calibrationCurve(21_000, 1, 200, false);
    expect(ideal.y.at(-1)).toBeCloseTo(4.2, 10);
    expect(curve.y.at(-1) ?? 0).toBeLessThan(3);
  });

  it("scales the concentration slider in 1–2–5 steps so the top gives A ≥ 4 in 1 cm", () => {
    expect(maxConcentration(21_000)).toBe(200);
    expect(maxConcentration(139_000)).toBe(50);
    expect(maxConcentration(350)).toBe(20_000);
    for (const epsilon of Object.values(MOLAR_ABSORPTIVITY)) {
      expect(beerLambert(epsilon, 1, maxConcentration(epsilon))).toBeGreaterThanOrEqual(4 - 1e-9);
    }
  });

  it("deepens the colour of β-carotene with concentration", async () => {
    const model = new UVVisModel();
    model.viewer.moleculeProperty.value = await loadMolecule("beta-carotene");
    model.quantitativeProperty.value = true;
    const blueness = () => model.measuredColorProperty.value?.[2] ?? 0;
    model.concentrationFractionProperty.value = 0.02;
    const pale = blueness();
    model.concentrationFractionProperty.value = 0.5;
    expect(blueness()).toBeLessThan(pale - 50);
    expect(model.peakAbsorbanceProperty.value).toBeCloseTo(beerLambert(139_000, 1, 25), 10);
  });
});
