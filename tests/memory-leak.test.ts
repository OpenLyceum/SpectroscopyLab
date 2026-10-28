/**
 * Memory-leak regression suite (fleet standard).
 *
 * List every model/view object that links Properties, adds listeners, or owns child
 * nodes, with a factory that builds a fresh instance. The shared harness in
 * tests/helpers/memoryLeak.ts (template-owned) checks that each one is garbage
 * collected after dispose() and leaves no survivors across repeated cycles
 * (idempotentDispose: true also checks a second dispose()). Add sim-specific leak
 * tests below using forceGC().
 */

import { NumberProperty, Property } from "scenerystack/axon";
import { Bounds2, Range } from "scenerystack/dot";
import { Node } from "scenerystack/scenery";
import { loadMolecule } from "../src/common/model/library/SpectroscopyLibrary.js";
import { MoleculeChooser } from "../src/common/model/MoleculeChooser.js";
import { MoleculeViewModel } from "../src/common/model/MoleculeViewModel.js";
import { lorentzianSum } from "../src/common/model/SpectrumCurve.js";
import { MoleculeChooserNode } from "../src/common/view/MoleculeChooserNode.js";
import { MoleculeThumbnailNode } from "../src/common/view/MoleculeThumbnailNode.js";
import { MoleculeViewerNode } from "../src/common/view/MoleculeViewerNode.js";
import { SpectrumChartNode } from "../src/common/view/SpectrumChartNode.js";
import { StringManager } from "../src/i18n/StringManager.js";
import { SignalTableNode } from "../src/nmr/view/SignalTableNode.js";
import type { Prediction } from "../src/uv-vis/model/UVVisModel.js";
import { EnergyLevelDiagramNode } from "../src/uv-vis/view/EnergyLevelDiagramNode.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

// Long-lived models, as in the sim: the views below must not leak into them.
const viewer = new MoleculeViewModel();
const water = await loadMolecule("water");
const chooser = new MoleculeChooser("water");
const curveProperty = new Property(lorentzianSum([{ position: 1600, height: 1 }], 400, 4000, 200, 10));
const selectedXProperty = new Property<number | null>(null);
const sticksVisibleProperty = new Property(true);
const halfWidthProperty = new NumberProperty(10);
const strings = StringManager.getInstance().getInfraredStrings();
const environmentsProperty = new Property([
  { label: "a", atoms: [3, 4], shift: 3.65, exchangeable: false, couplings: [{ j: 7, count: 3 }], multiplicity: "q" },
]);
const selectedSignalProperty = new Property<number | null>(0);
const predictionProperty = new Property<Prediction | null>({
  gap: 1.236,
  wavelength: 225,
  structure: {
    homo: 1,
    lumo: 2,
    orbitals: [-1.618, -0.618, 0.618, 1.618].map((energy, i) => ({
      energy,
      occupancy: i < 2 ? 2 : 0,
      coefficients: [0.5, 0.5, 0.5, 0.5],
    })),
  },
});
const selectedOrbitalProperty = new Property<number | null>(1);

describeDisposalLeaks([
  { name: "MoleculeViewerNode", create: () => new MoleculeViewerNode(viewer, new Bounds2(0, 0, 300, 300)) },
  {
    name: "EnergyLevelDiagramNode",
    create: () =>
      new EnergyLevelDiagramNode(
        predictionProperty,
        selectedOrbitalProperty,
        strings.lineWidthStringProperty,
        150,
        280,
      ),
  },
  { name: "SignalTableNode", create: () => new SignalTableNode(environmentsProperty, selectedSignalProperty, 200) },
  { name: "MoleculeThumbnailNode", create: () => new MoleculeThumbnailNode(water, new Bounds2(0, 0, 100, 80)) },
  { name: "MoleculeChooserNode", create: () => new MoleculeChooserNode(chooser, new Node(), 300) },
  {
    name: "SpectrumChartNode",
    create: () =>
      new SpectrumChartNode({
        chartWidth: 400,
        chartHeight: 200,
        xRange: new Range(400, 4000),
        yRange: new Range(0, 1),
        xInverted: true,
        xTickSpacing: 500,
        yTickSpacing: 0.2,
        xLabelStringProperty: strings.wavenumberAxisStringProperty,
        yLabelStringProperty: strings.transmittanceAxisStringProperty,
        curveProperty,
        sticksProperty: new Property([{ position: 1600, height: halfWidthProperty.value / 10 }]),
        sticksVisibleProperty,
        regions: [{ min: 1650, max: 1780, labelStringProperty: strings.regions.carbonylStringProperty }],
        regionsVisibleProperty: sticksVisibleProperty,
        selectedXProperty,
        pick: () => undefined,
        step: () => undefined,
        clear: () => undefined,
      }),
  },
]);
