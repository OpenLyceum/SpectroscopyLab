/**
 * InfraredScreenView.ts
 *
 * Layout: the 3D molecule (top left) above its control panel; the transmittance spectrum (top
 * right) above a panel describing the selected normal mode. Clicking a dip — or stepping through
 * peaks with the arrow keys — selects that mode; the molecule then vibrates in it and the atoms of
 * its dominant bond or angle are ringed.
 *
 * For HCl a "rotational fine structure" option swaps the band for its P and R branches on a window
 * around the band origin, the line-width slider for a temperature slider, and adds a zoom on the
 * selected line (which shows the ³⁵Cl/³⁷Cl pair) to the info panel.
 */

import { DerivedProperty, Multilink, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
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
import {
  type FineStructure,
  LINE_ZOOM_HALF_WIDTH,
  type RotationalLine,
  TEMPERATURE_RANGE,
} from "../model/RotationalFineStructure.js";
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
const LINE_ZOOM_WIDTH = 190;
const LINE_ZOOM_HEIGHT = 80;
/** Info text width beside the line zoom. */
const FINE_TEXT_WIDTH = INFO_WIDTH - LINE_ZOOM_WIDTH - 70;
const TEMPERATURE_STEP = 10;

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
    const widthControl = labeled(strings.lineWidthStringProperty, widthSlider, CONTROL_WIDTH);
    const temperatureLabelProperty = new PatternStringProperty(strings.temperatureStringProperty, {
      value: new DerivedProperty([model.temperatureProperty], (t) => toFixed(t, 0)),
    });
    const temperatureSlider = new HSlider(model.temperatureProperty, TEMPERATURE_RANGE, {
      ...SPECTROSCOPY_LAB_SLIDER_OPTIONS,
      constrainValue: (value: number) => Math.round(value / TEMPERATURE_STEP) * TEMPERATURE_STEP,
      keyboardStep: TEMPERATURE_STEP * 5,
      accessibleName: strings.temperatureNameStringProperty,
    });
    const temperatureControl = labeled(temperatureLabelProperty, temperatureSlider, CONTROL_WIDTH);
    const fineCheckbox = checkbox(model.fineStructureProperty, strings.fineStructureStringProperty, CONTROL_WIDTH - 30);
    const controls = new SpectroscopyLabPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          chooser,
          new HBox({ spacing: 8, children: [label(strings.isotopesStringProperty, 80), isotopeCombo] }),
          // The temperature slider takes the line-width slider's place in fine-structure mode.
          new Node({ children: [widthControl, temperatureControl] }),
          new HBox({
            spacing: 16,
            children: [
              checkbox(model.showSticksProperty, strings.showModesStringProperty, 150),
              checkbox(model.showRegionsProperty, strings.showRegionsStringProperty, 150),
            ],
          }),
          fineCheckbox,
        ],
      }),
      { minWidth: VIEWER_SIZE, left: viewer.left, top: viewer.bottom + 10 },
    );

    // Info-panel texts (filled in below); created first because the chart switch resizes them.
    const modeTitle = new Text("", {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: INFO_WIDTH,
    });
    const infoLine = () =>
      new Text("", { font: INFO_FONT, fill: SpectroscopyLabColors.textColorProperty, maxWidth: INFO_WIDTH });
    const modeLines = [infoLine(), infoLine(), infoLine()] as const;

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

    // ── Fine structure ──────────────────────────────────────────────────────────
    const selectedLineXProperty = new DerivedProperty(
      [model.selectedLineDataProperty],
      (line) => line?.wavenumber ?? null,
    );
    const fineSticksProperty = new DerivedProperty([model.fineProperty, model.absorbanceProperty], (fine, absorbance) =>
      (fine?.lines ?? []).map((line) => ({
        position: line.wavenumber,
        height: absorbance ? (line.intensity * PEAK_ABSORBANCE) / ABSORBANCE_AXIS_MAX : 0.95 * line.intensity,
      })),
    );
    // y axes of the fine-structure charts: band and line zoom, in transmittance or absorbance.
    const fineYAxis = (absorbance: boolean, zoom: boolean) => {
      const axis = absorbance
        ? { max: ABSORBANCE_AXIS_MAX, spacing: zoom ? 0.5 : 0.25, decimals: zoom ? 1 : 2 }
        : { max: 100, spacing: zoom ? 50 : 20, decimals: 0 };
      return {
        yRange: new Range(0, axis.max),
        yTickSpacing: axis.spacing,
        yTickDecimals: axis.decimals,
        yLabelStringProperty: absorbance
          ? strings.absorbanceAxisStringProperty
          : strings.transmittanceAxisStringProperty,
        xLabelStringProperty: strings.wavenumberAxisStringProperty,
        xRange: IR_RANGE,
        xInverted: true,
        pick: (x: number, tolerance: number) => model.selectNear(x, Math.max(tolerance, 2)),
        step: (direction: 1 | -1) => model.stepSelection(direction),
        clear: () => {
          model.selectedLineProperty.value = null;
        },
      };
    };
    const createFineChart = (absorbance: boolean) =>
      new SpectrumChartNode({
        ...fineYAxis(absorbance, false),
        chartWidth: CHART_WIDTH,
        chartHeight: CHART_HEIGHT,
        xRangeProperty: model.fineRangeProperty,
        xTickSpacing: 100,
        curveProperty: absorbance ? model.fineAbsorbanceProperty : model.fineTransmittanceProperty,
        sticksProperty: fineSticksProperty,
        sticksVisibleProperty: model.showSticksProperty,
        sticksFromTop: !absorbance,
        selectedXProperty: selectedLineXProperty,
        accessibleName: a11y.fineSpectrumStringProperty,
        accessibleHelpText: a11y.spectrumHelpStringProperty,
        right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
        top: viewer.top,
      });
    const noCursorProperty = new DerivedProperty([model.selectedLineProperty], () => null);
    const createZoomChart = (absorbance: boolean) =>
      new SpectrumChartNode({
        ...fineYAxis(absorbance, true),
        chartWidth: LINE_ZOOM_WIDTH,
        chartHeight: LINE_ZOOM_HEIGHT,
        xRangeProperty: model.lineZoomRangeProperty,
        xTickSpacing: 2,
        curveProperty: absorbance ? model.lineZoomAbsorbanceProperty : model.lineZoomTransmittanceProperty,
        selectedXProperty: noCursorProperty,
        focusable: false,
      });
    const fineTransmittanceChart = createFineChart(false);
    const fineAbsorbanceChart = createFineChart(true);
    const zoomTransmittanceChart = createZoomChart(false);
    const zoomAbsorbanceChart = createZoomChart(true);
    const lineZoom = new VBox({
      spacing: 2,
      children: [
        new Text(new PatternStringProperty(strings.lineZoomStringProperty, { width: 2 * LINE_ZOOM_HALF_WIDTH }), {
          font: new PhetFont(12),
          fill: SpectroscopyLabColors.textColorProperty,
          maxWidth: LINE_ZOOM_WIDTH + 40,
        }),
        new Node({ children: [zoomTransmittanceChart, zoomAbsorbanceChart] }),
      ],
    });

    const chartVisibilityMultilink = Multilink.multilink(
      [model.absorbanceProperty, model.fineStructureShownProperty, model.fineStructureAvailableProperty],
      (absorbance, fine, available) => {
        transmittanceChart.visible = !(absorbance || fine);
        absorbanceChart.visible = absorbance && !fine;
        fineTransmittanceChart.visible = !absorbance && fine;
        fineAbsorbanceChart.visible = absorbance && fine;
        zoomTransmittanceChart.visible = !absorbance;
        zoomAbsorbanceChart.visible = absorbance;
        lineZoom.visible = fine;
        widthControl.visible = !fine;
        temperatureControl.visible = fine;
        fineCheckbox.visible = available;
        for (const text of [modeTitle, ...modeLines]) {
          text.maxWidth = fine ? FINE_TEXT_WIDTH : INFO_WIDTH;
        }
      },
    );
    const visibleChart = () =>
      model.fineStructureShownProperty.value
        ? model.absorbanceProperty.value
          ? fineAbsorbanceChart
          : fineTransmittanceChart
        : model.absorbanceProperty.value
          ? absorbanceChart
          : transmittanceChart;

    // ── Selected-mode panel ─────────────────────────────────────────────────────
    const infoContent = new HBox({
      spacing: 20,
      align: "top",
      children: [new VBox({ align: "left", spacing: 5, children: [modeTitle, ...modeLines] }), lineZoom],
    });
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
        model.fineStructureShownProperty,
        model.fineProperty,
        model.selectedLineDataProperty,
        strings.lineTitleStringProperty,
        strings.bandTitleStringProperty,
        strings.rotationalConstantsStringProperty,
        strings.bandConstantsStringProperty,
        strings.fineHintStringProperty,
        strings.isotopologueHintStringProperty,
        strings.stretchStringProperty,
        strings.wavenumberStringProperty,
        strings.intensityStringProperty,
        strings.selectHintStringProperty,
        strings.modeCountStringProperty,
      ],
      () => {
        const peak = model.selectedPeak;
        const molecule = model.viewer.molecule;
        const fine = model.fineProperty.value;
        if (model.fineStructureShownProperty.value && fine) {
          const texts = fineStructureInfo(fine, model.selectedLineDataProperty.value);
          [modeTitle, ...modeLines].forEach((text, i) => {
            text.string = texts[i] ?? "";
          });
          return;
        }
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

    // Announce the selected mode or line when it changes (keyboard users hear each peak).
    const announce = () => {
      const peak = model.selectedPeak;
      if (peak) {
        visibleChart().addAccessibleResponse(describePeak(peak));
      }
    };
    model.selectedPeakProperty.lazyLink(announce);
    const announceLine = (line: RotationalLine | null) => {
      const species = line ? model.fineProperty.value?.isotopologues[line.isotopologue] : undefined;
      if (line && species) {
        visibleChart().addAccessibleResponse(describeLine(line, species.label));
      }
    };
    model.selectedLineDataProperty.lazyLink(announceLine);

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

    this.children = [
      viewer,
      controls,
      transmittanceChart,
      absorbanceChart,
      fineTransmittanceChart,
      fineAbsorbanceChart,
      infoPanel,
      resetAllButton,
      listParent,
    ];
    this.addChild(
      new Node({
        pdomOrder: [
          this.viewerNode,
          transmittanceChart,
          absorbanceChart,
          fineTransmittanceChart,
          fineAbsorbanceChart,
          controls,
          resetAllButton,
        ],
      }),
    );

    // The ScreenView lives for the whole sim, but keep the links releasable for tests.
    this.disposeInfraredScreenView = () => {
      model.viewer.moleculeProperty.unlink(isotopeLink);
      model.selectedPeakProperty.unlink(announce);
      model.selectedLineDataProperty.unlink(announceLine);
      infoMultilink.dispose();
      chartVisibilityMultilink.dispose();
      temperatureLabelProperty.dispose();
      fineSticksProperty.dispose();
      selectedLineXProperty.dispose();
      noCursorProperty.dispose();
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

/** Title and three lines for the info panel in fine-structure mode: line or band, B and r, ν₀ and k, a hint. */
function fineStructureInfo(fine: FineStructure, line: RotationalLine | null): string[] {
  const strings = StringManager.getInstance().getInfraredStrings();
  const species = fine.isotopologues[line?.isotopologue ?? 0];
  if (!species) {
    return [];
  }
  const minor = fine.isotopologues[1];
  return [
    line
      ? describeLine(line, species.label)
      : StringUtils.fillIn(strings.bandTitleStringProperty.value, { isotopologue: species.label }),
    StringUtils.fillIn(strings.rotationalConstantsStringProperty.value, {
      b0: toFixed(species.groundB, 2),
      b1: toFixed(species.excitedB, 2),
      r: toFixed(species.bondLength, 3),
    }),
    StringUtils.fillIn(strings.bandConstantsStringProperty.value, {
      origin: toFixed(species.origin, 0),
      k: toFixed(species.forceConstant, 0),
    }),
    minor
      ? StringUtils.fillIn(strings.isotopologueHintStringProperty.value, {
          minor: minor.label,
          percent: toFixed(100 * minor.abundance, 0),
        })
      : strings.fineHintStringProperty.value,
  ];
}

/** "H³⁵Cl R(3): J 3 → 4 — 2945.1 cm⁻¹". */
export function describeLine(line: RotationalLine, isotopologue: string): string {
  return StringUtils.fillIn(StringManager.getInstance().getInfraredStrings().lineTitleStringProperty.value, {
    isotopologue,
    branch: line.branch,
    j: line.j,
    upper: line.branch === "R" ? line.j + 1 : line.j - 1,
    wavenumber: toFixed(line.wavenumber, 1),
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
