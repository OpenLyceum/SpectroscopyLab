/**
 * spin-system.test.ts
 *
 * The exact ¹H spectrum against closed-form results (the AB quartet), the first-order limit at
 * high field, conservation of intensity, and roofing at low field.
 */

import { describe, expect, it } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import { MoleculeGraph } from "../../src/common/model/MoleculeGraph.js";
import { protonEnvironments } from "../../src/nmr/model/ProtonSpectrum.js";
import { exactLines, MAX_EXACT_SPINS, resolvedLines } from "../../src/nmr/model/SpinSystem.js";

async function setup(id: string) {
  const graph = new MoleculeGraph(await loadMolecule(id));
  return { graph, environments: protonEnvironments(graph) };
}

describe("exact spin systems", () => {
  it("reproduces the AB quartet: lines at ±(C ± J)/2, inner/outer intensity (1 ± J/C)", () => {
    const delta = 20;
    const j = 8;
    const c = Math.hypot(delta, j);
    const lines = exactLines(
      [100 + delta / 2, 100 - delta / 2],
      [
        [0, j],
        [j, 0],
      ],
      [0, 1],
    );
    expect(lines).toHaveLength(4);
    const offsets = lines.map((l) => l.frequency - 100);
    const expected = [-(c + j) / 2, -(c - j) / 2, (c - j) / 2, (c + j) / 2];
    offsets.forEach((offset, i) => {
      expect(offset).toBeCloseTo(expected[i] ?? 0, 9);
    });
    const weights = lines.map((l) => l.weight);
    expect(weights[1]).toBeCloseTo((1 + j / c) / 2, 9);
    expect(weights[0]).toBeCloseTo((1 - j / c) / 2, 9);
    expect(weights.reduce((s, w) => s + w, 0)).toBeCloseTo(2, 9);
  });

  it("collapses an A₂ pair to one line however strongly it couples", () => {
    const lines = exactLines(
      [50, 50],
      [
        [0, 7],
        [7, 0],
      ],
      [0, 0],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.weight).toBeCloseTo(2, 9);
  });

  it("approaches the n + 1 rule at high field (ethanol at 600 MHz)", async () => {
    const { graph, environments } = await setup("ethanol");
    const sharp = environments.filter((e) => !e.exchangeable);
    const exact = resolvedLines(sharp, 600, graph).sort((p, q) => p.position - q.position);
    const first = resolvedLines(sharp, 600, null).sort((p, q) => p.position - q.position);
    expect(exact).toHaveLength(first.length);
    exact.forEach((line, i) => {
      expect(Math.abs(line.position - (first[i]?.position ?? 0)) * 600).toBeLessThan(0.15); // Hz
      expect(line.weight).toBeCloseTo(first[i]?.weight ?? 0, 1);
    });
  });

  // Combination lines weaker than 10⁻⁴ protons are dropped, so the sum is exact only to ~10⁻².
  it("conserves intensity: the lines sum to the number of observed protons", async () => {
    for (const id of ["1-propanol", "ethylbenzene", "allyl-alcohol", "o-xylene"]) {
      const { graph, environments } = await setup(id);
      const lines = resolvedLines(environments, 60, graph);
      const protons = environments.reduce((s, e) => s + e.atoms.length, 0);
      expect(
        lines.reduce((s, l) => s + l.weight, 0),
        id,
      ).toBeCloseTo(protons, 1);
    }
  });

  it("roofs at 60 MHz: 1-propanol's CH₃ triplet leans toward the CH₂ it couples to", async () => {
    const { graph, environments } = await setup("1-propanol");
    const methyl = environments.findIndex((e) => e.atoms.length === 3);
    const centre = environments[methyl]?.shift ?? 0;
    // Outer-line intensity (more than J/2 from the centre; the centre line itself splits at low field)
    // on the downfield side, toward the CH₂ partner, over the upfield side.
    const lean = (field: number) => {
      const lines = resolvedLines(environments, field, graph).filter((l) => l.environment === methyl);
      const side = (sign: number) =>
        lines.filter((l) => sign * (l.position - centre) * field > 3.5).reduce((s, l) => s + l.weight, 0);
      return side(1) / side(-1);
    };
    expect(lean(60)).toBeGreaterThan(1.5);
    expect(lean(600)).toBeLessThan(1.1);
    expect(lean(600)).toBeGreaterThan(1);
  });

  it("falls back to first order for coupled groups larger than MAX_EXACT_SPINS", async () => {
    const { graph, environments } = await setup("1-3-5-7-octatetraene");
    expect(environments.reduce((s, e) => s + e.atoms.length, 0)).toBeGreaterThan(MAX_EXACT_SPINS);
    expect(resolvedLines(environments, 300, graph)).toEqual(resolvedLines(environments, 300, null));
  });

  it("solves a 9-spin system quickly (2-propanol-like ring of couplings)", async () => {
    const { graph, environments } = await setup("butanoic-acid");
    const start = performance.now();
    resolvedLines(environments, 60, graph);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
