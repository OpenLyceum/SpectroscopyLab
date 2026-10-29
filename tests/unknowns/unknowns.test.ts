/**
 * unknowns.test.ts
 *
 * Formula bookkeeping (Hill formula, degree of unsaturation, molecular-ion cluster), the isomer
 * families, and the scoring rules of the game.
 */

import { describe, expect, it } from "vitest";
import { LIBRARY, loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import { degreeOfUnsaturation, formulaText, molecularIonCluster } from "../../src/unknowns/model/MolecularFormula.js";
import { buildUnknown, GuessResult, LEVEL_FAMILIES, UnknownsModel } from "../../src/unknowns/model/UnknownsModel.js";

describe("molecular formula", () => {
  it("writes Hill formulas with subscripts and counts unsaturation", async () => {
    const acetone = await loadMolecule("acetone");
    expect(formulaText(acetone)).toBe("C₃H₆O");
    expect(degreeOfUnsaturation(acetone)).toBe(1);
    expect(degreeOfUnsaturation(await loadMolecule("benzene"))).toBe(4);
    expect(degreeOfUnsaturation(await loadMolecule("chloroethane"))).toBe(0);
  });

  it("gives the molecular-ion cluster: M+1 ≈ 1.1 % per carbon, M+2 ≈ 32 % for one chlorine", async () => {
    const [m, m1] = molecularIonCluster(await loadMolecule("ethyl-acetate"));
    expect(m?.mz).toBe(88);
    expect(m1?.relative).toBeCloseTo(4 * 1.08 + 8 * 0.0115 + 2 * 0.038, 1);
    const [, , chlorine] = molecularIonCluster(await loadMolecule("chloroethane"));
    expect(chlorine?.mz).toBe(66);
    expect(chlorine?.relative).toBeGreaterThan(31);
    expect(chlorine?.relative).toBeLessThan(34);
  });

  it("builds isomer families whose members share one formula", () => {
    for (const family of LEVEL_FAMILIES.flat()) {
      const formulas = new Set(family.map((id) => LIBRARY.find((e) => e.id === id)?.formula));
      expect(formulas.size, family.join(", ")).toBe(1);
    }
  });
});

describe("Unknowns game", () => {
  it("scores only a first-try answer", async () => {
    const model = new UnknownsModel();
    model.unknownProperty.value = await buildUnknown("ethanol", ["ethanol", "dimethyl-ether"]);
    model.wrongGuessesProperty.value = [];
    model.resultProperty.value = GuessResult.NONE;

    model.guess("dimethyl-ether");
    expect(model.resultProperty.value).toBe(GuessResult.INCORRECT);
    model.guess("ethanol");
    expect(model.resultProperty.value).toBe(GuessResult.CORRECT);
    expect(model.scoreProperty.value).toBe(0);
    expect(model.roundsProperty.value).toBe(1);

    model.unknownProperty.value = await buildUnknown("dimethyl-ether", ["ethanol", "dimethyl-ether"]);
    model.wrongGuessesProperty.value = [];
    model.resultProperty.value = GuessResult.NONE;
    model.guess("dimethyl-ether");
    expect(model.scoreProperty.value).toBe(1);
    // Guesses after solving are ignored.
    model.guess("ethanol");
    expect(model.roundsProperty.value).toBe(2);
  });

  it("gives an unknown its spectra", async () => {
    const unknown = await buildUnknown("ethanol", ["ethanol", "dimethyl-ether"]);
    expect(Math.min(...unknown.irSpectrum.y)).toBeLessThan(50);
    expect(Math.max(...unknown.nmrSpectrum.y)).toBeCloseTo(1, 6);
  });
});

describe("¹³C clue", () => {
  it("shows one line per kind of carbon plus TMS (o-xylene: 4 + 1)", async () => {
    const unknown = await buildUnknown("o-xylene", ["o-xylene", "m-xylene", "p-xylene", "ethylbenzene"]);
    const y = unknown.carbonSpectrum.y;
    let peaks = 0;
    for (let i = 1; i < y.length - 1; i++) {
      if ((y[i] ?? 0) > 0.1 && (y[i] ?? 0) >= (y[i - 1] ?? 0) && (y[i] ?? 0) > (y[i + 1] ?? 0)) {
        peaks++;
      }
    }
    expect(peaks).toBe(5);
  });
});
