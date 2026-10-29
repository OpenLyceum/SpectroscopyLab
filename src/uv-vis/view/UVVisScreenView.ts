/**
 * UVVisScreenView.ts
 *
 * Layout: the conjugated molecule (top left, one π orbital drawn as signed lobes) above its
 * controls; the π energy levels and the absorption spectrum (top right) above a panel comparing
 * the predicted and measured λmax and the colours they give. In the Beer–Lambert mode the spectrum
 * is on an absolute absorbance scale set by the concentration and path-length sliders, and a
 * calibration panel below the results plots A at λmax against concentration.
 */

import { DerivedProperty, Multilink, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { Color, HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, VisibleColor } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { HSlider } from "scenerystack/sun";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SpectroscopyLabButtonOptions.js";
import { SPECTROSCOPY_LAB_SLIDER_OPTIONS } from "../../common/SpectroscopyLabControlOptions.js";
import { SpectroscopyLabPanel } from "../../common/SpectroscopyLabPanel.js";
import { checkbox, label, labeled, radioGroup } from "../../common/view/ControlFactory.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { MoleculeViewerNode } from "../../common/view/MoleculeViewerNode.js";
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import { moleculeName } from "../../nmr/view/NMRScreenView.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import {
  CONCENTRATION_FRACTION_RANGE,
  ElectronicModel,
  type ElectronicModelValue,
  familyOf,
  HUECKEL_CALIBRATION,
  PATH_LENGTH_RANGE,
  type UVVisModel,
  WAVELENGTH_RANGE,
} from "../model/UVVisModel.js";
import { EnergyLevelDiagramNode } from "./EnergyLevelDiagramNode.js";
import { UVVisScreenSummaryContent } from "./UVVisScreenSummaryContent.js";

const VIEWER_SIZE = 380;
const VIEWER_HEIGHT = 330;
const CONTROL_WIDTH = 356;
const DIAGRAM_WIDTH = 150;
const DIAGRAM_HEIGHT = 280;
const CHART_WIDTH = 330;
const CHART_HEIGHT = 230;
const STRIP_HEIGHT = 8;
const SWATCH_SIZE = 46;
const INFO_WIDTH = 520;
const TITLE_FONT = new PhetFont({ size: 15, weight: "bold" });
const INFO_FONT = new PhetFont(13);
const CALIBRATION_WIDTH = 170;
const CALIBRATION_HEIGHT = 80;
const CALIBRATION_TEXT_WIDTH = 190;
/** Absorbance axes: unit bands, and the absolute scale (stray light caps readings near 3). */
const UNIT_RANGE = new Range(0, 1.1);
const ABSOLUTE_RANGE = new Range(0, 3.2);
const CONCENTRATION_STEPS = 100;
const PATH_LENGTH_STEP = 0.1;

export type UVVisScreenViewOptions = ScreenViewOptions;

export class UVVisScreenView extends ScreenView {
  private readonly viewerNode: MoleculeViewerNode;
  private readonly disposeUVVisScreenView: () => void;

  public constructor(model: UVVisModel, providedOptions?: UVVisScreenViewOptions) {
    const options = optionize<UVVisScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new UVVisScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance().getUVVisStrings();
    const listParent = new Node();

    // ── Viewer ──────────────────────────────────────────────────────────────────
    const viewerBounds = new Bounds2(0, 0, VIEWER_SIZE, VIEWER_HEIGHT);
    this.viewerNode = new MoleculeViewerNode(model.viewer, viewerBounds);
    const viewer = new Node({
      children: [
        new Rectangle(viewerBounds, {
          fill: SpectroscopyLabColors.chartBackgroundColorProperty,
          stroke: SpectroscopyLabColors.panelBorderColorProperty,
          cornerRadius: 6,
        }),
        this.viewerNode,
      ],
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + 12,
    });

    // ── Controls ────────────────────────────────────────────────────────────────
    const chooser = new MoleculeChooserNode(model.chooser, listParent, CONTROL_WIDTH);
    const modelRadio = radioGroup<ElectronicModelValue>(
      model.electronicModelProperty,
      [
        { value: ElectronicModel.HUECKEL, label: strings.hueckelStringProperty },
        { value: ElectronicModel.BOX, label: strings.boxStringProperty },
      ],
      strings.modelStringProperty,
      150,
      "horizontal",
    );
    const concentrationLabelProperty = new PatternStringProperty(strings.concentrationStringProperty, {
      value: new DerivedProperty([model.concentrationProperty, model.maxConcentrationProperty], (c, maximum) =>
        toFixed(c, maximum < 50 ? 1 : 0),
      ),
    });
    const pathLengthLabelProperty = new PatternStringProperty(strings.pathLengthStringProperty, {
      value: new DerivedProperty([model.pathLengthProperty], (b) => toFixed(b, 1)),
    });
    // The slider sets a fraction of the molecule's maximum concentration; its label shows µmol/L.
    const concentrationSlider = new HSlider(model.concentrationFractionProperty, CONCENTRATION_FRACTION_RANGE, {
      ...SPECTROSCOPY_LAB_SLIDER_OPTIONS,
      constrainValue: (value: number) => Math.round(value * CONCENTRATION_STEPS) / CONCENTRATION_STEPS,
      keyboardStep: 5 / CONCENTRATION_STEPS,
      accessibleName: strings.concentrationNameStringProperty,
    });
    const pathLengthSlider = new HSlider(model.pathLengthProperty, PATH_LENGTH_RANGE, {
      ...SPECTROSCOPY_LAB_SLIDER_OPTIONS,
      constrainValue: (value: number) => Math.round(value / PATH_LENGTH_STEP) * PATH_LENGTH_STEP,
      keyboardStep: PATH_LENGTH_STEP,
      accessibleName: strings.pathLengthNameStringProperty,
    });
    const quantitativeControls = new HBox({
      spacing: 16,
      children: [
        labeled(concentrationLabelProperty, concentrationSlider, CONTROL_WIDTH / 2),
        labeled(pathLengthLabelProperty, pathLengthSlider, CONTROL_WIDTH / 2),
      ],
    });
    const controls = new SpectroscopyLabPanel(
      new VBox({
        align: "left",
        spacing: 10,
        children: [
          chooser,
          new HBox({ spacing: 10, children: [label(strings.modelStringProperty, 80), modelRadio] }),
          checkbox(model.quantitativeProperty, strings.quantitativeStringProperty, CONTROL_WIDTH - 30),
          quantitativeControls,
        ],
      }),
      { minWidth: VIEWER_SIZE, left: viewer.left, top: viewer.bottom + 10 },
    );

    // ── Energy levels ───────────────────────────────────────────────────────────
    const energyAxisProperty = new DerivedProperty(
      [model.electronicModelProperty, strings.energyHueckelStringProperty, strings.energyBoxStringProperty],
      (electronic, hueckel, box) => (electronic === ElectronicModel.BOX ? box : hueckel),
    );
    const diagram = new EnergyLevelDiagramNode(
      model.predictionProperty,
      model.selectedOrbitalProperty,
      energyAxisProperty,
      DIAGRAM_WIDTH,
      DIAGRAM_HEIGHT,
    );
    const diagramGroup = new VBox({
      spacing: 4,
      children: [
        new Text(strings.orbitalsStringProperty, {
          font: TITLE_FONT,
          fill: SpectroscopyLabColors.textColorProperty,
          maxWidth: DIAGRAM_WIDTH,
        }),
        diagram,
      ],
    });

    // ── Spectrum ────────────────────────────────────────────────────────────────
    const predictedXProperty = new DerivedProperty([model.predictionProperty], (p) => p?.wavelength ?? null);
    const yRangeProperty = new DerivedProperty([model.quantitativeProperty], (quantitative) =>
      quantitative ? ABSOLUTE_RANGE : UNIT_RANGE,
    );
    const chart = new SpectrumChartNode({
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: WAVELENGTH_RANGE,
      yRange: UNIT_RANGE,
      yRangeProperty,
      xTickSpacing: 100,
      yTickSpacing: 0.25,
      yTickDecimals: 2,
      xLabelStringProperty: strings.wavelengthAxisStringProperty,
      yLabelStringProperty: strings.absorbanceAxisStringProperty,
      curveProperty: model.spectrumProperty,
      secondaryCurveProperty: model.measuredSpectrumProperty,
      selectedXProperty: predictedXProperty,
      pick: () => undefined,
      step: () => undefined,
      clear: () => undefined,
      focusable: false,
    });
    // The visible spectrum as a strip along the bottom of the plot.
    const strip = new Node({ pickable: false });
    const pixelsPerNm = CHART_WIDTH / WAVELENGTH_RANGE.getLength();
    for (let lambda = VisibleColor.MIN_WAVELENGTH; lambda < VisibleColor.MAX_WAVELENGTH; lambda += 2) {
      strip.addChild(
        new Rectangle(
          (lambda - WAVELENGTH_RANGE.min) * pixelsPerNm,
          CHART_HEIGHT - STRIP_HEIGHT,
          2 * pixelsPerNm + 0.5,
          STRIP_HEIGHT,
          {
            fill: VisibleColor.wavelengthToColor(lambda),
          },
        ),
      );
    }
    chart.addChild(strip);
    const chartGroup = new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(strings.absorbanceAxisStringProperty, {
          font: TITLE_FONT,
          fill: SpectroscopyLabColors.textColorProperty,
        }),
        chart,
      ],
    });

    const upper = new HBox({
      spacing: 70,
      align: "top",
      children: [diagramGroup, chartGroup],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: viewer.top,
    });

    // ── Results ─────────────────────────────────────────────────────────────────
    const line = () =>
      new Text("", {
        font: INFO_FONT,
        fill: SpectroscopyLabColors.textColorProperty,
        maxWidth: INFO_WIDTH - 2 * SWATCH_SIZE - 40,
      });
    const predictedText = new Text("", {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.spectrumColorProperty,
      maxWidth: INFO_WIDTH - 2 * SWATCH_SIZE - 40,
    });
    const measuredText = new Text("", {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.integralColorProperty,
      maxWidth: INFO_WIDTH - 2 * SWATCH_SIZE - 40,
    });
    const gapText = line();
    const methodText = line();
    const swatch = () =>
      new Rectangle(0, 0, SWATCH_SIZE, SWATCH_SIZE, {
        cornerRadius: 6,
        stroke: SpectroscopyLabColors.panelBorderColorProperty,
      });
    const predictedSwatch = swatch();
    const measuredSwatch = swatch();
    const swatchColumn = (node: Rectangle, text: TReadOnlyProperty<string>) =>
      new VBox({
        spacing: 3,
        children: [
          node,
          new Text(text, {
            font: INFO_FONT,
            fill: SpectroscopyLabColors.textColorProperty,
            maxWidth: SWATCH_SIZE + 20,
          }),
        ],
      });
    const results = new SpectroscopyLabPanel(
      new HBox({
        spacing: 24,
        align: "top",
        children: [
          new VBox({ align: "left", spacing: 5, children: [predictedText, measuredText, gapText, methodText] }),
          new VBox({
            spacing: 4,
            children: [
              new Text(strings.colorHeadingStringProperty, {
                font: INFO_FONT,
                fill: SpectroscopyLabColors.textColorProperty,
                maxWidth: 2 * SWATCH_SIZE + 30,
              }),
              new HBox({
                spacing: 12,
                children: [
                  swatchColumn(predictedSwatch, strings.predictedColorStringProperty),
                  swatchColumn(measuredSwatch, strings.measuredColorStringProperty),
                ],
              }),
            ],
          }),
        ],
      }),
      { minWidth: INFO_WIDTH + 24, align: "left", right: upper.right, top: upper.bottom + 16 },
    );

    const resultsMultilink = Multilink.multilinkAny(
      [
        model.predictionProperty,
        model.measuredWavelengthProperty,
        model.predictedColorProperty,
        model.measuredColorProperty,
        model.electronicModelProperty,
        strings.predictedStringProperty,
        strings.measuredStringProperty,
        strings.notLinearStringProperty,
      ],
      () => {
        const prediction = model.predictionProperty.value;
        const measured = model.measuredWavelengthProperty.value;
        const box = model.electronicModelProperty.value === ElectronicModel.BOX;
        const pi = model.piSystemProperty.value;
        predictedText.string = prediction
          ? StringUtils.fillIn(strings.predictedStringProperty.value, { value: toFixed(prediction.wavelength, 0) })
          : box
            ? strings.notLinearStringProperty.value
            : "";
        measuredText.string =
          measured === null
            ? ""
            : StringUtils.fillIn(strings.measuredStringProperty.value, { value: toFixed(measured, 0) });
        gapText.string = prediction
          ? StringUtils.fillIn((box ? strings.gapBoxStringProperty : strings.gapHueckelStringProperty).value, {
              gap: toFixed(prediction.gap, box ? 2 : 3),
            })
          : "";
        const calibration = HUECKEL_CALIBRATION[familyOf(model.chooser.moleculeIdProperty.value) ?? "polyenes"];
        methodText.string = !prediction
          ? ""
          : box && pi
            ? StringUtils.fillIn(strings.boxLengthStringProperty.value, {
                length: toFixed(pi.boxLength() * 1e10, 2),
                electrons: pi.electrons,
              })
            : StringUtils.fillIn(strings.calibrationStringProperty.value, {
                a: toFixed(calibration?.a ?? 0, 2),
                b: toFixed(calibration?.b ?? 0, 2),
              });
        const toColor = (rgb: readonly [number, number, number] | null) =>
          rgb ? new Color(rgb[0], rgb[1], rgb[2]) : SpectroscopyLabColors.panelBackgroundColorProperty.value;
        predictedSwatch.fill = toColor(model.predictedColorProperty.value);
        measuredSwatch.fill = toColor(model.measuredColorProperty.value);
      },
    );

    // ── Beer–Lambert calibration ────────────────────────────────────────────────
    const calibrationText = () =>
      new Text("", {
        font: INFO_FONT,
        fill: SpectroscopyLabColors.textColorProperty,
        maxWidth: CALIBRATION_TEXT_WIDTH,
      });
    const epsilonText = calibrationText();
    const absorbanceText = calibrationText();
    const transmittanceText = calibrationText();
    const strayText = new Text(strings.strayLightStringProperty, {
      font: new PhetFont(11),
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: CALIBRATION_TEXT_WIDTH,
    });
    const calibrationRangeProperty = new DerivedProperty(
      [model.maxConcentrationProperty],
      (maximum) => new Range(0, maximum),
    );
    const calibrationTickProperty = new DerivedProperty([model.maxConcentrationProperty], (maximum) => maximum / 5);
    const calibrationChart = new SpectrumChartNode({
      chartWidth: CALIBRATION_WIDTH,
      chartHeight: CALIBRATION_HEIGHT,
      xRange: new Range(0, 1),
      xRangeProperty: calibrationRangeProperty,
      xTickSpacingProperty: calibrationTickProperty,
      yRange: ABSOLUTE_RANGE,
      xTickSpacing: 1,
      yTickSpacing: 1,
      xLabelStringProperty: strings.concentrationAxisStringProperty,
      yLabelStringProperty: strings.peakAbsorbanceAxisStringProperty,
      curveProperty: model.calibrationProperty,
      secondaryCurveProperty: model.idealCalibrationProperty,
      selectedXProperty: model.concentrationProperty,
      pick: (c) => {
        const fraction = c / model.maxConcentrationProperty.value;
        model.concentrationFractionProperty.value = CONCENTRATION_FRACTION_RANGE.constrainValue(
          Math.round(fraction * CONCENTRATION_STEPS) / CONCENTRATION_STEPS,
        );
      },
      step: () => undefined,
      clear: () => undefined,
      focusable: false,
    });
    const calibrationPanel = new SpectroscopyLabPanel(
      new HBox({
        spacing: 14,
        align: "top",
        children: [
          new VBox({
            align: "left",
            spacing: 4,
            children: [
              new Text(strings.calibrationTitleStringProperty, {
                font: TITLE_FONT,
                fill: SpectroscopyLabColors.textColorProperty,
                maxWidth: CALIBRATION_TEXT_WIDTH,
              }),
              epsilonText,
              absorbanceText,
              transmittanceText,
              strayText,
            ],
          }),
          calibrationChart,
        ],
      }),
      { align: "left", left: results.left, top: results.bottom + 10 },
    );
    const calibrationMultilink = Multilink.multilinkAny(
      [
        model.quantitativeProperty,
        model.molarAbsorptivityProperty,
        model.measuredWavelengthProperty,
        model.peakAbsorbanceProperty,
        model.measuredPeakAbsorbanceProperty,
        strings.epsilonStringProperty,
        strings.absorbanceReadoutStringProperty,
        strings.transmittanceReadoutStringProperty,
      ],
      () => {
        const quantitative = model.quantitativeProperty.value;
        quantitativeControls.visible = quantitative;
        calibrationPanel.visible = quantitative;
        const epsilon = model.molarAbsorptivityProperty.value;
        epsilonText.string =
          epsilon === null
            ? ""
            : StringUtils.fillIn(strings.epsilonStringProperty.value, {
                value: toFixed(epsilon, 0),
                wavelength: toFixed(model.measuredWavelengthProperty.value ?? 0, 0),
              });
        const measured = model.measuredPeakAbsorbanceProperty.value;
        absorbanceText.string = StringUtils.fillIn(strings.absorbanceReadoutStringProperty.value, {
          ideal: toFixed(model.peakAbsorbanceProperty.value, 2),
          measured: toFixed(measured, 2),
        });
        transmittanceText.string = StringUtils.fillIn(strings.transmittanceReadoutStringProperty.value, {
          value: toFixed(100 * 10 ** -model.peakAbsorbanceProperty.value, 1),
        });
      },
    );

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

    this.children = [viewer, controls, upper, results, calibrationPanel, resetAllButton, listParent];
    this.addChild(new Node({ pdomOrder: [this.viewerNode, diagram, controls, resetAllButton] }));

    this.disposeUVVisScreenView = () => {
      resultsMultilink.dispose();
      calibrationMultilink.dispose();
      concentrationLabelProperty.dispose();
      pathLengthLabelProperty.dispose();
      yRangeProperty.dispose();
      calibrationRangeProperty.dispose();
      calibrationTickProperty.dispose();
      energyAxisProperty.dispose();
      predictedXProperty.dispose();
    };
  }

  public reset(): void {
    this.viewerNode.reset();
  }

  public override dispose(): void {
    this.disposeUVVisScreenView();
    super.dispose();
  }
}

/** Spoken name of the molecule (shared with the summary). */
export function uvMoleculeName(model: UVVisModel): string {
  const molecule = model.viewer.molecule;
  return molecule ? moleculeName(molecule.id) : "";
}
