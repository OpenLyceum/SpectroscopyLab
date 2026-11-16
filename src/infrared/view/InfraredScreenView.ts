import { INFRARED_SCREEN_VIEW_SETTINGS } from "../../SpectroscopyLabConstants.js";
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

import { DerivedProperty, Multilink, PatternStringProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { HSlider } from "scenerystack/sun";
import {
  IR_RANGE,
  IsotopeScheme,
  type IsotopeSchemeValue,
  isotopeSchemeApplies,
  PEAK_ABSORBANCE,
} from "../../common/model/infrared/InfraredSpectrum.js";
import { nameKey } from "../../common/model/library/SpectroscopyLibrary.js";
import type { Molecule } from "../../common/model/Molecule.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SpectroscopyLabButtonOptions.js";
import { SPECTROSCOPY_LAB_SLIDER_OPTIONS } from "../../common/SpectroscopyLabControlOptions.js";
import { SpectroscopyLabPanel } from "../../common/SpectroscopyLabPanel.js";
import { checkbox, comboBox, label, labeled } from "../../common/view/ControlFactory.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { MoleculeViewerNode } from "../../common/view/MoleculeViewerNode.js";
import { SpectrumChartNode, type SpectrumRegion } from "../../common/view/SpectrumChartNode.js";
import { lookupStringProperty, StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import { HALF_WIDTH_RANGE, type InfraredModel } from "../model/InfraredModel.js";
import {
  type FineStructure,
  LINE_ZOOM_HALF_WIDTH,
  type RotationalLine,
  TEMPERATURE_RANGE,
} from "../model/RotationalFineStructure.js";
import { describeLine, describePeak, modeName } from "./InfraredDescriptions.js";
import { InfraredScreenSummaryContent } from "./InfraredScreenSummaryContent.js";

const VIEWER_SIZE: number = INFRARED_SCREEN_VIEW_SETTINGS.VIEWER_SIZE;
const VIEWER_HEIGHT: number = INFRARED_SCREEN_VIEW_SETTINGS.VIEWER_HEIGHT;
const CHART_WIDTH: number = INFRARED_SCREEN_VIEW_SETTINGS.CHART_WIDTH;
const CHART_HEIGHT: number = INFRARED_SCREEN_VIEW_SETTINGS.CHART_HEIGHT;
const CONTROL_WIDTH: number = INFRARED_SCREEN_VIEW_SETTINGS.CONTROL_WIDTH;
const INFO_WIDTH: number = INFRARED_SCREEN_VIEW_SETTINGS.INFO_WIDTH;
/** Top of the absorbance axis, a little above the strongest band. */
const ABSORBANCE_AXIS_MAX: number = INFRARED_SCREEN_VIEW_SETTINGS.ABSORBANCE_AXIS_MAX;
const TITLE_FONT = new PhetFont({ size: INFRARED_SCREEN_VIEW_SETTINGS.TITLE_FONT_SIZE, weight: "bold" });
const INFO_FONT = new PhetFont(INFRARED_SCREEN_VIEW_SETTINGS.INFO_FONT_SIZE);
/** Below this a mode is reported as IR-inactive (km/mol). */
const INACTIVE_INTENSITY: number = INFRARED_SCREEN_VIEW_SETTINGS.INACTIVE_INTENSITY;
const LINE_ZOOM_WIDTH: number = INFRARED_SCREEN_VIEW_SETTINGS.LINE_ZOOM_WIDTH;
const LINE_ZOOM_HEIGHT: number = INFRARED_SCREEN_VIEW_SETTINGS.LINE_ZOOM_HEIGHT;
/** Info text width beside the line zoom. */
const FINE_TEXT_WIDTH = INFO_WIDTH - LINE_ZOOM_WIDTH - 70;
const TEMPERATURE_STEP: number = INFRARED_SCREEN_VIEW_SETTINGS.TEMPERATURE_STEP;

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
      cornerRadius: INFRARED_SCREEN_VIEW_SETTINGS.VIEWER_FRAME_CORNER_RADIUS,
    });
    this.viewerNode = new MoleculeViewerNode(model.viewer, viewerBounds);
    const viewer = new Node({
      children: [viewerFrame, this.viewerNode],
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + INFRARED_SCREEN_VIEW_SETTINGS.VIEWER_TOP_OFFSET,
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
      keyboardStep: INFRARED_SCREEN_VIEW_SETTINGS.WIDTH_SLIDER_KEYBOARD_STEP,
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
        spacing: INFRARED_SCREEN_VIEW_SETTINGS.CONTROLS_SPACING,
        children: [
          chooser,
          new HBox({
            spacing: INFRARED_SCREEN_VIEW_SETTINGS.CONTROLS_SPACING,
            children: [
              label(strings.isotopesStringProperty, INFRARED_SCREEN_VIEW_SETTINGS.ISOTOPES_LABEL_MAX_WIDTH),
              isotopeCombo,
            ],
          }),
          // The temperature slider takes the line-width slider's place in fine-structure mode.
          new Node({ children: [widthControl, temperatureControl] }),
          new HBox({
            spacing: INFRARED_SCREEN_VIEW_SETTINGS.CONTROLS_ITEM_4_SPACING,
            children: [
              checkbox(
                model.showSticksProperty,
                strings.showModesStringProperty,
                INFRARED_SCREEN_VIEW_SETTINGS.SHOW_STICKS_CHECKBOX_MAX_WIDTH,
              ),
              checkbox(
                model.showRegionsProperty,
                strings.showRegionsStringProperty,
                INFRARED_SCREEN_VIEW_SETTINGS.SHOW_REGIONS_CHECKBOX_MAX_WIDTH,
              ),
            ],
          }),
          fineCheckbox,
        ],
      }),
      {
        minWidth: VIEWER_SIZE,
        left: viewer.left,
        top: viewer.bottom + INFRARED_SCREEN_VIEW_SETTINGS.CONTROLS_TOP_OFFSET,
      },
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
        .map((peak) => ({
          position: peak.wavenumber,
          height: INFRARED_SCREEN_VIEW_SETTINGS.STICKS_PROPERTY_HEIGHT_FACTOR * peak.relativeIntensity,
        })),
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
        yRange: absorbance
          ? new Range(0, ABSORBANCE_AXIS_MAX)
          : new Range(0, INFRARED_SCREEN_VIEW_SETTINGS.CREATE_CHART_RANGE_MAX),
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
        height: absorbance
          ? (line.intensity * PEAK_ABSORBANCE) / ABSORBANCE_AXIS_MAX
          : INFRARED_SCREEN_VIEW_SETTINGS.FINE_STICKS_PROPERTY_HEIGHT_FACTOR * line.intensity,
      })),
    );
    // y axes of the fine-structure charts: band and line zoom, in transmittance or absorbance.
    const fineYAxis = (absorbance: boolean, zoom: boolean) => {
      const axis = absorbance
        ? {
            max: ABSORBANCE_AXIS_MAX,
            spacing: zoom ? 0.5 : INFRARED_SCREEN_VIEW_SETTINGS.AXIS_SPACING,
            decimals: zoom ? 1 : 2,
          }
        : {
            max: 100,
            spacing: zoom
              ? INFRARED_SCREEN_VIEW_SETTINGS.FINE_Y_AXIS_AXIS_SPACING
              : INFRARED_SCREEN_VIEW_SETTINGS.CONSTRUCTOR_AXIS_SPACING,
            decimals: 0,
          };
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
      spacing: INFRARED_SCREEN_VIEW_SETTINGS.LINE_ZOOM_SPACING,
      children: [
        new Text(new PatternStringProperty(strings.lineZoomStringProperty, { width: 2 * LINE_ZOOM_HALF_WIDTH }), {
          font: new PhetFont(INFRARED_SCREEN_VIEW_SETTINGS.LINE_ZOOM_FONT_SIZE),
          fill: SpectroscopyLabColors.textColorProperty,
          maxWidth: LINE_ZOOM_WIDTH + INFRARED_SCREEN_VIEW_SETTINGS.LINE_ZOOM_MAX_WIDTH_OFFSET,
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
      spacing: INFRARED_SCREEN_VIEW_SETTINGS.INFO_CONTENT_SPACING,
      align: "top",
      children: [
        new VBox({
          align: "left",
          spacing: INFRARED_SCREEN_VIEW_SETTINGS.INFO_CONTENT_ITEM_1_SPACING,
          children: [modeTitle, ...modeLines],
        }),
        lineZoom,
      ],
    });
    const infoPanel = new SpectroscopyLabPanel(infoContent, {
      minWidth: INFO_WIDTH + INFRARED_SCREEN_VIEW_SETTINGS.INFO_PANEL_MIN_WIDTH_OFFSET,
      minHeight: INFRARED_SCREEN_VIEW_SETTINGS.INFO_PANEL_MIN_HEIGHT,
      align: "left",
      right: transmittanceChart.right,
      top: viewer.top + CHART_HEIGHT + INFRARED_SCREEN_VIEW_SETTINGS.INFO_PANEL_TOP_OFFSET,
    });
    const moleculeNames = StringManager.getInstance().getMoleculeNames();
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
          const name = molecule
            ? (lookupStringProperty(moleculeNames, `${nameKey(molecule.id)}StringProperty`)?.value ?? molecule.id)
            : "";
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
