/**
 * NMRScreenView.ts
 *
 * Layout: the 3D molecule (top left, hydrogens lettered by environment) above its controls; the
 * full ¹H spectrum (top right); below it a zoom on the selected signal and the signal table.
 * Selecting a signal — by clicking a peak, a table row or an atom, or with the arrow keys on the
 * focused spectrum — rings its hydrogens in the viewer.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { nameKey } from "../../common/model/library/SpectroscopyLibrary.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SpectroscopyLabButtonOptions.js";
import { SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS } from "../../common/SpectroscopyLabControlOptions.js";
import { SpectroscopyLabPanel } from "../../common/SpectroscopyLabPanel.js";
import { CONTROL_FONT, checkbox } from "../../common/view/ControlFactory.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { MoleculeViewerNode } from "../../common/view/MoleculeViewerNode.js";
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import { FIELD_RANGE, type NMRModel, SHIFT_RANGE, ZOOM_RANGE } from "../model/NMRModel.js";
import type { ProtonEnvironment } from "../model/ProtonSpectrum.js";
import { NMRScreenSummaryContent } from "./NMRScreenSummaryContent.js";
import { SignalTableNode } from "./SignalTableNode.js";

const VIEWER_SIZE = 380;
const VIEWER_HEIGHT = 330;
const CHART_WIDTH = 520;
const CHART_HEIGHT = 200;
const ZOOM_WIDTH = 230;
const ZOOM_HEIGHT = 150;
const TABLE_WIDTH = 230;
const CONTROL_WIDTH = 356;
const FIELD_STEP = 20;
const ZOOM_TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });

export type NMRScreenViewOptions = ScreenViewOptions;

export class NMRScreenView extends ScreenView {
  private readonly viewerNode: MoleculeViewerNode;
  private readonly disposeNMRScreenView: () => void;

  public constructor(model: NMRModel, providedOptions?: NMRScreenViewOptions) {
    const options = optionize<NMRScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new NMRScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance().getNMRStrings();
    const a11y = StringManager.getInstance().getNMRA11yStrings();
    const listParent = new Node();

    // ── Viewer ──────────────────────────────────────────────────────────────────
    const viewerBounds = new Bounds2(0, 0, VIEWER_SIZE, VIEWER_HEIGHT);
    this.viewerNode = new MoleculeViewerNode(model.viewer, viewerBounds, {
      describeAtom: (index) => describeAtom(model, index),
    });
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
    const fieldControl = new NumberControl(strings.fieldStringProperty, model.fieldProperty, FIELD_RANGE, {
      ...SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS,
      delta: FIELD_STEP,
      titleNodeOptions: { font: CONTROL_FONT, fill: SpectroscopyLabColors.textColorProperty, maxWidth: 140 },
      numberDisplayOptions: { valuePattern: strings.fieldValueStringProperty, decimalPlaces: 0 },
      sliderOptions: {
        ...SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS.sliderOptions,
        constrainValue: (value: number) => Math.round(value / FIELD_STEP) * FIELD_STEP,
        keyboardStep: FIELD_STEP,
        majorTicks: [60, 300, 600].map((value) => ({ value })),
      },
      accessibleName: strings.fieldStringProperty,
    });
    const controls = new SpectroscopyLabPanel(
      new VBox({
        align: "left",
        spacing: 8,
        children: [
          chooser,
          fieldControl,
          new HBox({
            spacing: 14,
            children: [
              checkbox(model.d2oShakeProperty, strings.d2oShakeStringProperty, 110),
              checkbox(model.showTmsProperty, strings.tmsStringProperty, 110),
              checkbox(model.showIntegralProperty, strings.integralStringProperty, 90),
            ],
          }),
        ],
      }),
      { minWidth: VIEWER_SIZE, left: viewer.left, top: viewer.bottom + 10 },
    );

    // ── Spectrum ────────────────────────────────────────────────────────────────
    const selectedShiftProperty = new DerivedProperty(
      [model.selectedSignalProperty, model.environmentsProperty],
      (index, environments) => (index === null ? null : (environments[index]?.shift ?? null)),
    );
    const chart = new SpectrumChartNode({
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: SHIFT_RANGE,
      yRange: new Range(0, 1.08),
      xInverted: true,
      xTickSpacing: 1,
      yTickSpacing: 0.25,
      yTickDecimals: 2,
      xLabelStringProperty: strings.shiftAxisStringProperty,
      yLabelStringProperty: strings.intensityAxisStringProperty,
      curveProperty: model.spectrumProperty,
      secondaryCurveProperty: model.integralProperty,
      secondaryVisibleProperty: model.showIntegralProperty,
      selectedXProperty: selectedShiftProperty,
      pick: (x, tolerance) => model.selectNear(x, Math.max(tolerance, 0.05)),
      step: (direction) => model.stepSelection(direction),
      clear: () => {
        model.selectedSignalProperty.value = null;
      },
      accessibleName: a11y.spectrumStringProperty,
      accessibleHelpText: a11y.spectrumHelpStringProperty,
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: viewer.top,
    });

    // ── Zoom on the selected signal ─────────────────────────────────────────────
    const zoomTitle = new Text("", {
      font: ZOOM_TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: ZOOM_WIDTH + 40,
    });
    const zoomChart = new SpectrumChartNode({
      chartWidth: ZOOM_WIDTH,
      chartHeight: ZOOM_HEIGHT,
      xRange: ZOOM_RANGE,
      yRange: new Range(0, 1.08),
      xInverted: true,
      xTickSpacing: 0.1,
      xTickDecimals: 1,
      yTickSpacing: 0.5,
      yTickDecimals: 1,
      xLabelStringProperty: strings.zoomAxisStringProperty,
      yLabelStringProperty: strings.intensityAxisStringProperty,
      curveProperty: model.zoomProperty,
      selectedXProperty: new DerivedProperty([model.selectedSignalProperty], () => null),
      pick: () => undefined,
      step: (direction) => model.stepSelection(direction),
      clear: () => {
        model.selectedSignalProperty.value = null;
      },
      focusable: false,
    });
    const zoomGroup = new VBox({ align: "left", spacing: 6, children: [zoomTitle, zoomChart] });

    const table = new SignalTableNode(model.environmentsProperty, model.selectedSignalProperty, TABLE_WIDTH);
    const tablePanel = new SpectroscopyLabPanel(table, { minWidth: TABLE_WIDTH + 24, minHeight: 200, align: "left" });

    const lowerRow = new HBox({
      spacing: 22,
      align: "top",
      children: [zoomGroup, tablePanel],
      right: chart.right,
      top: chart.bottom + 14,
    });

    const zoomTitleMultilink = Multilink.multilinkAny(
      [
        model.selectedSignalProperty,
        model.environmentsProperty,
        model.fieldProperty,
        strings.zoomTitleStringProperty,
        strings.zoomHintStringProperty,
      ],
      () => {
        const signal = model.selectedSignal;
        zoomTitle.string = signal
          ? StringUtils.fillIn(strings.zoomTitleStringProperty.value, {
              label: signal.label,
              field: toFixed(model.fieldProperty.value, 0),
            })
          : strings.zoomHintStringProperty.value;
      },
    );

    // Announce the selected signal (keyboard users hear each one).
    const announce = () => {
      const signal = model.selectedSignal;
      if (signal) {
        chart.addAccessibleResponse(describeSignal(signal));
      }
    };
    model.selectedSignalProperty.lazyLink(announce);

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

    this.children = [viewer, controls, chart, lowerRow, resetAllButton, listParent];
    this.addChild(new Node({ pdomOrder: [this.viewerNode, chart, controls, resetAllButton] }));

    this.disposeNMRScreenView = () => {
      model.selectedSignalProperty.unlink(announce);
      zoomTitleMultilink.dispose();
      selectedShiftProperty.dispose();
    };
  }

  public reset(): void {
    this.viewerNode.reset();
  }

  public override dispose(): void {
    this.disposeNMRScreenView();
    super.dispose();
  }
}

/** Localised multiplicity word ("quartet"), falling back to the code ("ddt"). */
export function multiplicityWord(code: string): string {
  const words = StringManager.getInstance().getNMRStrings().multiplicities as unknown as Record<
    string,
    TReadOnlyProperty<string>
  >;
  return words[code]?.value ?? code;
}

/** The spoken description of a signal. */
export function describeSignal(signal: ProtonEnvironment): string {
  return StringUtils.fillIn(StringManager.getInstance().getNMRA11yStrings().signalStringProperty.value, {
    label: signal.label,
    count: signal.atoms.length,
    shift: toFixed(signal.shift, 2),
    multiplicity: multiplicityWord(signal.multiplicity),
  });
}

/** Tooltip text: "H 5 — b, δ 1.16" for a hydrogen, the element and number otherwise. */
function describeAtom(model: NMRModel, index: number): string {
  const element = model.viewer.molecule?.elements[index];
  const signal = model.environmentsProperty.value.find((e) => e.atoms.includes(index));
  const base = element ? `${element.symbol} ${index + 1}` : "";
  return signal ? `${base} — ${signal.label}, δ ${toFixed(signal.shift, 2)}` : base;
}

/** The molecule's display name. */
export function moleculeName(id: string): string {
  const names = StringManager.getInstance().getMoleculeNames() as unknown as Record<string, TReadOnlyProperty<string>>;
  return names[`${nameKey(id)}StringProperty`]?.value ?? id;
}
