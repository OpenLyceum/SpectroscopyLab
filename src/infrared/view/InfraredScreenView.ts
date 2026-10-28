/**
 * InfraredScreenView.ts
 *
 * Layout: the 3D molecule (top left) above its control panel; the transmittance spectrum (top
 * right) above a panel describing the selected normal mode. Clicking a dip — or stepping through
 * peaks with the arrow keys — selects that mode; the molecule then vibrates in it and the atoms of
 * its dominant bond or angle are ringed.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { HSlider } from "scenerystack/sun";
import { nameKey } from "../../common/model/library/SpectroscopyLibrary.js";
import type { Molecule } from "../../common/model/Molecule.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SpectroscopyLabButtonOptions.js";
import { SPECTROSCOPY_LAB_SLIDER_OPTIONS } from "../../common/SpectroscopyLabControlOptions.js";
import { SpectroscopyLabPanel } from "../../common/SpectroscopyLabPanel.js";
import { checkbox, comboBox, label, labeled } from "../../common/view/ControlFactory.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { MoleculeViewerNode } from "../../common/view/MoleculeViewerNode.js";
import { SpectrumChartNode, type SpectrumRegion } from "../../common/view/SpectrumChartNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import {
  HALF_WIDTH_RANGE,
  type InfraredModel,
  type InfraredPeak,
  IR_RANGE,
  IsotopeScheme,
  type IsotopeSchemeValue,
  isotopeSchemeApplies,
  PEAK_ABSORBANCE,
} from "../model/InfraredModel.js";
import { InfraredScreenSummaryContent } from "./InfraredScreenSummaryContent.js";

const VIEWER_SIZE = 380;
const VIEWER_HEIGHT = 330;
const CHART_WIDTH = 520;
const CHART_HEIGHT = 270;
const CONTROL_WIDTH = 356;
const INFO_WIDTH = 560;
/** Top of the absorbance axis, a little above the strongest band. */
const ABSORBANCE_AXIS_MAX = 1.5;
const TITLE_FONT = new PhetFont({ size: 16, weight: "bold" });
const INFO_FONT = new PhetFont(14);
/** Below this a mode is reported as IR-inactive (km/mol). */
const INACTIVE_INTENSITY = 0.5;

export type InfraredScreenViewOptions = ScreenViewOptions;

export class InfraredScreenView extends ScreenView {
  private readonly viewerNode: MoleculeViewerNode;
  private readonly disposeInfraredScreenView: () => void;

  public constructor(model: InfraredModel, providedOptions?: InfraredScreenViewOptions) {
    const options = optionize<InfraredScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new InfraredScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance().getInfraredStrings();
    const a11y = StringManager.getInstance().getInfraredA11yStrings();
    const listParent = new Node();

    // ── Viewer ──────────────────────────────────────────────────────────────────
    const viewerBounds = new Bounds2(0, 0, VIEWER_SIZE, VIEWER_HEIGHT);
    const viewerFrame = new Rectangle(viewerBounds, {
      fill: SpectroscopyLabColors.chartBackgroundColorProperty,
      stroke: SpectroscopyLabColors.panelBorderColorProperty,
      cornerRadius: 6,
    });
    this.viewerNode = new MoleculeViewerNode(model.viewer, viewerBounds);
    const viewer = new Node({
      children: [viewerFrame, this.viewerNode],
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + 12,
    });

    // ── Controls ────────────────────────────────────────────────────────────────
    const chooser = new MoleculeChooserNode(model.chooser, listParent, CONTROL_WIDTH);
    const isotopeChoices = Object.values(IsotopeScheme).map((value) => ({
      value,
      label: strings.isotopeSchemes[`${value}StringProperty`],
    }));
    const isotopeCombo = comboBox<IsotopeSchemeValue>(
      model.isotopeSchemeProperty,
      isotopeChoices,
      listParent,
      strings.isotopesStringProperty,
      CONTROL_WIDTH - 90,
    );
    // Offer only substitutions that change a mass in this molecule.
    const isotopeLink = (molecule: Molecule | null) => {
      for (const choice of isotopeChoices) {
        isotopeCombo.setItemVisible(
          choice.value,
          choice.value === IsotopeScheme.NATURAL || (!!molecule && isotopeSchemeApplies(molecule, choice.value)),
        );
      }
      model.isotopeSchemeProperty.reset();
    };
    model.viewer.moleculeProperty.link(isotopeLink);
    const widthSlider = new HSlider(model.halfWidthProperty, HALF_WIDTH_RANGE, {
      ...SPECTROSCOPY_LAB_SLIDER_OPTIONS,
      accessibleName: strings.lineWidthStringProperty,
      keyboardStep: 2,
    });
    const controls = new SpectroscopyLabPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          chooser,
          new HBox({ spacing: 8, children: [label(strings.isotopesStringProperty, 80), isotopeCombo] }),
          labeled(strings.lineWidthStringProperty, widthSlider, CONTROL_WIDTH),
          new HBox({
            spacing: 16,
            children: [
              checkbox(model.showSticksProperty, strings.showModesStringProperty, 150),
              checkbox(model.showRegionsProperty, strings.showRegionsStringProperty, 150),
            ],
          }),
        ],
      }),
      { minWidth: VIEWER_SIZE, left: viewer.left, top: viewer.bottom + 10 },
    );

    // ── Spectrum ────────────────────────────────────────────────────────────────
    const regions: SpectrumRegion[] = [
      { min: 3200, max: 3650, labelStringProperty: strings.regions.ohStringProperty },
      { min: 2850, max: 3100, labelStringProperty: strings.regions.chStringProperty },
      { min: 2100, max: 2260, labelStringProperty: strings.regions.tripleBondStringProperty },
      { min: 1650, max: 1780, labelStringProperty: strings.regions.carbonylStringProperty },
      { min: 400, max: 1500, labelStringProperty: strings.regions.fingerprintStringProperty },
    ];
    const sticksProperty = new DerivedProperty([model.peaksProperty], (peaks) =>
      peaks
        .filter((peak) => peak.wavenumber > 0)
        .map((peak) => ({ position: peak.wavenumber, height: 0.95 * peak.relativeIntensity })),
    );
    // In absorbance the sticks rise to the band height they would reach if isolated.
    const absorbanceSticksProperty = new DerivedProperty([sticksProperty], (sticks) =>
      sticks.map((stick) => ({
        position: stick.position,
        height: (stick.height * PEAK_ABSORBANCE) / ABSORBANCE_AXIS_MAX,
      })),
    );
    const selectedXProperty = new DerivedProperty([model.selectedPeakProperty, model.peaksProperty], (index, peaks) =>
      index === null ? null : (peaks[index]?.wavenumber ?? null),
    );
    // One chart per y quantity; the Preferences "absorbance" option picks which is shown.
    const createChart = (absorbance: boolean) =>
      new SpectrumChartNode({
        chartWidth: CHART_WIDTH,
        chartHeight: CHART_HEIGHT,
        xRange: IR_RANGE,
        yRange: absorbance ? new Range(0, ABSORBANCE_AXIS_MAX) : new Range(0, 100),
        xInverted: true,
        xTickSpacing: 500,
        yTickSpacing: absorbance ? 0.25 : 20,
        yTickDecimals: absorbance ? 2 : 0,
        xLabelStringProperty: strings.wavenumberAxisStringProperty,
        yLabelStringProperty: absorbance
          ? strings.absorbanceAxisStringProperty
          : strings.transmittanceAxisStringProperty,
        curveProperty: absorbance ? model.absorbanceSpectrumProperty : model.spectrumProperty,
        sticksProperty: absorbance ? absorbanceSticksProperty : sticksProperty,
        sticksVisibleProperty: model.showSticksProperty,
        sticksFromTop: !absorbance,
        regions,
        regionsVisibleProperty: model.showRegionsProperty,
        selectedXProperty,
        pick: (x, tolerance) => model.selectNear(x, Math.max(tolerance, 3 * model.halfWidthProperty.value)),
        step: (direction) => model.stepSelection(direction),
        clear: () => {
          model.selectedPeakProperty.value = null;
        },
        accessibleName: a11y.spectrumStringProperty,
        accessibleHelpText: a11y.spectrumHelpStringProperty,
        right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
        top: viewer.top,
      });
    const transmittanceChart = createChart(false);
    const absorbanceChart = createChart(true);
    const chartVisibilityListener = (absorbance: boolean) => {
      transmittanceChart.visible = !absorbance;
      absorbanceChart.visible = absorbance;
    };
    model.absorbanceProperty.link(chartVisibilityListener);
    const visibleChart = () => (model.absorbanceProperty.value ? absorbanceChart : transmittanceChart);

    // ── Selected-mode panel ─────────────────────────────────────────────────────
    const modeTitle = new Text("", {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: INFO_WIDTH,
    });
    const infoLine = () =>
      new Text("", { font: INFO_FONT, fill: SpectroscopyLabColors.textColorProperty, maxWidth: INFO_WIDTH });
    const modeLines = [infoLine(), infoLine(), infoLine()] as const;
    const infoContent = new VBox({ align: "left", spacing: 5, children: [modeTitle, ...modeLines] });
    const infoPanel = new SpectroscopyLabPanel(infoContent, {
      minWidth: INFO_WIDTH + 24,
      minHeight: 120,
      align: "left",
      right: transmittanceChart.right,
      top: viewer.top + CHART_HEIGHT + 62,
    });
    const moleculeNames = StringManager.getInstance().getMoleculeNames() as unknown as Record<
      string,
      TReadOnlyProperty<string>
    >;
    const infoMultilink = Multilink.multilinkAny(
      [
        model.selectedPeakProperty,
        model.peaksProperty,
        model.viewer.moleculeProperty,
        strings.stretchStringProperty,
        strings.wavenumberStringProperty,
        strings.intensityStringProperty,
        strings.selectHintStringProperty,
        strings.modeCountStringProperty,
      ],
      () => {
        const peak = model.selectedPeak;
        const molecule = model.viewer.molecule;
        if (peak) {
          modeTitle.string = `${modeName(peak)} — ${formatWavenumber(peak.wavenumber)}`;
          modeLines[0].string = StringUtils.fillIn(strings.intensityStringProperty.value, {
            value: toFixed(peak.intensity, 1),
          });
          modeLines[1].string = StringUtils.fillIn(strings.reducedMassStringProperty.value, {
            value: toFixed(peak.reducedMass, 2),
          });
          modeLines[2].string = peak.intensity < INACTIVE_INTENSITY ? strings.inactiveStringProperty.value : "";
        } else {
          const name = molecule ? (moleculeNames[`${nameKey(molecule.id)}StringProperty`]?.value ?? molecule.id) : "";
          const count = model.peaksProperty.value.length;
          const atoms = molecule?.elements.length ?? 0;
          modeTitle.string = name;
          modeLines[0].string = StringUtils.fillIn(strings.modeCountStringProperty.value, {
            count,
            external: 3 * atoms - count,
          });
          modeLines[1].string = molecule?.vibrations
            ? StringUtils.fillIn(strings.methodStringProperty.value, { scale: molecule.vibrations.scale })
            : "";
          modeLines[2].string = strings.selectHintStringProperty.value;
        }
      },
    );

    // Announce the selected mode when it changes (keyboard users hear each peak).
    const announce = () => {
      const peak = model.selectedPeak;
      if (peak) {
        visibleChart().addAccessibleResponse(describePeak(peak));
      }
    };
    model.selectedPeakProperty.lazyLink(announce);

    // ── Reset All ───────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    this.children = [viewer, controls, transmittanceChart, absorbanceChart, infoPanel, resetAllButton, listParent];
    this.addChild(
      new Node({ pdomOrder: [this.viewerNode, transmittanceChart, absorbanceChart, controls, resetAllButton] }),
    );

    // The ScreenView lives for the whole sim, but keep the links releasable for tests.
    this.disposeInfraredScreenView = () => {
      model.viewer.moleculeProperty.unlink(isotopeLink);
      model.selectedPeakProperty.unlink(announce);
      infoMultilink.dispose();
      model.absorbanceProperty.unlink(chartVisibilityListener);
      absorbanceSticksProperty.dispose();
      sticksProperty.dispose();
      selectedXProperty.dispose();
    };
  }

  public reset(): void {
    this.viewerNode.reset();
  }

  public override dispose(): void {
    this.disposeInfraredScreenView();
    super.dispose();
  }
}

/** "C=O stretch" / "H–C–H bend", localised. */
export function modeName(peak: InfraredPeak): string {
  const strings = StringManager.getInstance().getInfraredStrings();
  return peak.character.kind === "stretch"
    ? StringUtils.fillIn(strings.stretchStringProperty.value, { bond: peak.character.label })
    : StringUtils.fillIn(strings.bendStringProperty.value, { angle: peak.character.label });
}

function formatWavenumber(value: number): string {
  return StringUtils.fillIn(StringManager.getInstance().getInfraredStrings().wavenumberStringProperty.value, {
    value: toFixed(value, 0),
  });
}

/** The spoken description of a peak. */
export function describePeak(peak: InfraredPeak): string {
  return StringUtils.fillIn(StringManager.getInstance().getInfraredA11yStrings().peakStringProperty.value, {
    mode: modeName(peak),
    wavenumber: toFixed(peak.wavenumber, 0),
    intensity: toFixed(peak.intensity, 0),
  });
}
