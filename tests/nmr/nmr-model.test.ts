/**
 * nmr-model.test.ts
 *
 * Field dependence (J fixed in Hz, so multiplets narrow in ppm), the D₂O shake, and picking.
 */

import { describe, expect, it } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import { MoleculeGraph } from "../../src/common/model/MoleculeGraph.js";
import { NMRModel, Nucleus, spectrumSticks } from "../../src/nmr/model/NMRModel.js";
import { protonEnvironments } from "../../src/nmr/model/ProtonSpectrum.js";

async function ethanolModel(): Promise<NMRModel> {
  const model = new NMRModel();
  model.viewer.moleculeProperty.value = await loadMolecule("ethanol");
  return model;
}

describe("NMR model", () => {
  it("narrows a multiplet tenfold in ppm from 60 to 600 MHz", async () => {
    const environments = protonEnvironments(new MoleculeGraph(await loadMolecule("ethanol")));
    const quartet = environments.filter((e) => e.multiplicity === "q");
    const width = (field: number) => {
      const positions = spectrumSticks(quartet, field, false).map((s) => s.position);
      return Math.max(...positions) - Math.min(...positions);
    };
    expect(width(60)).toBeCloseTo(21 / 60, 6);
    expect(width(60) / width(600)).toBeCloseTo(10, 6);
  });

  it("removes the O–H signal on a D₂O shake", async () => {
    const model = await ethanolModel();
    expect(model.environmentsProperty.value).toHaveLength(3);
    model.d2oShakeProperty.value = true;
    expect(model.environmentsProperty.value).toHaveLength(2);
    expect(model.environmentsProperty.value.every((e) => !e.exchangeable)).toBe(true);
  });

  it("selects a signal from a click near one of its lines, and from an atom", async () => {
    const model = await ethanolModel();
    model.selectNear(3.65 + 3.5 / 300, 0.01);
    expect(model.selectedSignal?.atoms).toHaveLength(2);
    const methylHydrogen = model.environmentsProperty.value.find((e) => e.atoms.length === 3)?.atoms[0] ?? -1;
    model.selectAtom(methylHydrogen);
    expect(model.environmentsProperty.value[model.selectedSignalProperty.value ?? -1]?.multiplicity).toBe("t");
    model.selectNear(7, 0.05);
    expect(model.selectedSignal).toBeNull();
  });

  it("integrates to the proton counts", async () => {
    const model = await ethanolModel();
    const sticks = spectrumSticks(model.environmentsProperty.value, 300, false);
    const total = sticks.reduce((sum, s) => sum + s.height, 0);
    // The broad O–H stick is scaled down for its width, so compare the sharp ones: 2 + 3 protons.
    const sharp = spectrumSticks(
      model.environmentsProperty.value.filter((e) => !e.exchangeable),
      300,
      false,
    );
    expect(sharp.reduce((sum, s) => sum + s.height, 0)).toBeCloseTo(5, 10);
    expect(total).toBeGreaterThan(5);
  });

  it("switches to ¹³C: signals are carbons, and clicking a hydrogen selects its carbon", async () => {
    const model = await ethanolModel();
    model.nucleusProperty.value = Nucleus.CARBON;
    expect(model.signals).toHaveLength(2);
    const methylHydrogen = model.environmentsProperty.value.find((e) => e.atoms.length === 3)?.atoms[0] ?? -1;
    model.selectAtom(methylHydrogen);
    const carbon = model.carbonEnvironmentsProperty.value[model.selectedSignalProperty.value ?? -1];
    expect(carbon?.hydrogens).toBe(3);
    model.selectNear(carbon?.shift ?? 0, 0.5);
    expect(model.selectedSignal).toBe(carbon);
    expect(model.viewer.highlightedAtomsProperty.value).toEqual(carbon?.atoms);
  });

  it("uses exact lines by default and first-order lines when asked", async () => {
    const model = await ethanolModel();
    model.fieldProperty.value = 60;
    const exact = model.linesProperty.value.length;
    model.secondOrderProperty.value = false;
    expect(model.linesProperty.value.length).toBeLessThan(exact);
  });
});
