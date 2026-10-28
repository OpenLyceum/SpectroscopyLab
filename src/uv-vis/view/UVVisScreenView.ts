/**
 * UVVisScreenView.ts
 *
 * Layout: the conjugated molecule (top left, one π orbital drawn as signed lobes) above its
 * controls; the π energy levels and the absorption spectrum (top right) above a panel comparing
 * the predicted and measured λmax and the colours they give.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { Color, HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, VisibleColor } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SpectroscopyLabButtonOptions.js";
import { SpectroscopyLabPanel } from "../../common/SpectroscopyLabPanel.js";
import { label, radioGroup } from "../../common/view/ControlFactory.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { MoleculeViewerNode } from "../../common/view/MoleculeViewerNode.js";
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import { moleculeName } from "../../nmr/view/NMRScreenView.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import {
  ElectronicModel,
  type ElectronicModelValue,
  familyOf,
  HUECKEL_CALIBRATION,
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
    const controls = new SpectroscopyLabPanel(
      new VBox({
        align: "left",
        spacing: 10,
        children: [chooser, new HBox({ spacing: 10, children: [label(strings.modelStringProperty, 80), modelRadio] })],
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
    const chart = new SpectrumChartNode({
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: WAVELENGTH_RANGE,
      yRange: new Range(0, 1.1),
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

    this.children = [viewer, controls, upper, results, resetAllButton, listParent];
    this.addChild(new Node({ pdomOrder: [this.viewerNode, diagram, controls, resetAllButton] }));

    this.disposeUVVisScreenView = () => {
      resultsMultilink.dispose();
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
