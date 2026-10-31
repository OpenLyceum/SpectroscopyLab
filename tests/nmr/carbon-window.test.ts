import { expect, it, vi } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import type { SampledCurve } from "../../src/common/model/SpectrumCurve.js";
import { CarbonSpectrumType } from "../../src/nmr/model/CarbonSpectrum.js";
import { NMRModel, Nucleus } from "../../src/nmr/model/NMRModel.js";

function peakCount(curve: SampledCurve): number {
  let count = 0;
  for (let i = 1; i < curve.y.length - 1; i++) {
    const value = curve.y[i] ?? 0;
    if (value > 0.05 && value > (curve.y[i - 1] ?? 0) && value >= (curve.y[i + 1] ?? 0)) {
      count++;
    }
  }
  return count;
}

for (const { id, hydrogens } of [
  { id: "ethanol", hydrogens: 3 },
  { id: "methane", hydrogens: 4 },
]) {
  for (const field of [60, 600]) {
    it(`retains every component of ${id}'s coupled carbon multiplet at ${field} MHz`, async () => {
      const model = new NMRModel();
      try {
        await vi.waitFor(() => expect(model.viewer.molecule?.id).toBe("ethanol"));
        model.viewer.moleculeProperty.value = await loadMolecule(id);
        model.nucleusProperty.value = Nucleus.CARBON;
        model.carbonSpectrumTypeProperty.value = CarbonSpectrumType.COUPLED;
        model.fieldProperty.value = field;
        model.showTmsProperty.value = false;
        const index = model.carbonEnvironmentsProperty.value.findIndex((e) => e.hydrogens === hydrogens);
        model.selectedSignalProperty.value = index;
        const environment = model.carbonEnvironmentsProperty.value[index]!;
        const lines = model.carbonLinesProperty.value.filter((line) => line.environment === index);
        expect(lines).toHaveLength(hydrogens + 1);
        // The selected CH3/CH4 has J = 125 Hz; a "60 MHz" field observes carbon at 60/3.9767 MHz.
        const halfSpan = (hydrogens * 125 * 3.9767) / (2 * field);
        expect(lines[0]!.position).toBeCloseTo(environment.shift - halfSpan, 9);
        expect(lines.at(-1)!.position).toBeCloseTo(environment.shift + halfSpan, 9);
        const full = model.carbonSpectrumProperty.value;
        const zoom = model.carbonZoomProperty.value;
        expect(full.x[0]).toBeLessThan(environment.shift - halfSpan);
        expect(full.x.at(-1)).toBeGreaterThan(environment.shift + halfSpan);
        expect(zoom.x[0]).toBeLessThan(-halfSpan);
        expect(zoom.x.at(-1)).toBeGreaterThan(halfSpan);
        expect(peakCount(zoom)).toBe(hydrogens + 1);
      } finally {
        model.dispose();
      }
    });
  }
}
