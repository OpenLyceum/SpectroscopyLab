import { NMR_SCREEN_VIEW_SETTINGS } from "../../SpectroscopyLabConstants.js";
/**
 * NMRScreenView.ts
 *
 * Layout: the 3D molecule (top left, hydrogens lettered or carbons numbered by environment) above
 * its controls; the full spectrum of the observed nucleus (top right); below it a zoom on the
 * selected signal and the signal table. Selecting a signal — by clicking a peak, a table row or an
 * atom, or with the arrow keys on the focused spectrum — rings its atoms in the viewer.
 *
 * The ¹H and ¹³C spectra are separate charts (different shift scales and tick spacings) shown one
 * at a time; their option rows swap in the control panel.
 */

import { DerivedProperty, Multilink } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { NumberControl, PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import {
  type CarbonEnvironment,
  CarbonSpectrumType,
  type CarbonSpectrumTypeValue,
  carbonTypeName,
  PROTON_TO_CARBON_FREQUENCY,
} from "../../common/model/nmr/CarbonSpectrum.js";
import {
  CARBON_SHIFT_RANGE,
  CARBON_ZOOM_RANGE,
  FIELD_RANGE,
  Nucleus,
  type NucleusValue,
  SHIFT_RANGE,
  ZOOM_RANGE,
} from "../../common/model/nmr/NMRSpectrum.js";
import type { ProtonEnvironment } from "../../common/model/nmr/ProtonSpectrum.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SpectroscopyLabButtonOptions.js";
import { SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS } from "../../common/SpectroscopyLabControlOptions.js";
import { SpectroscopyLabPanel } from "../../common/SpectroscopyLabPanel.js";
import { CONTROL_FONT, checkbox, comboBox, label, radioGroup } from "../../common/view/ControlFactory.js";
import { MoleculeChooserNode } from "../../common/view/MoleculeChooserNode.js";
import { MoleculeViewerNode } from "../../common/view/MoleculeViewerNode.js";
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { lookupStringProperty, StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import type { NMRModel } from "../model/NMRModel.js";
import { describeSignal } from "./NMRDescriptions.js";
import { NMRScreenSummaryContent } from "./NMRScreenSummaryContent.js";
import { type SignalRow, SignalTableNode } from "./SignalTableNode.js";

const VIEWER_SIZE: number = NMR_SCREEN_VIEW_SETTINGS.VIEWER_SIZE;
const VIEWER_HEIGHT: number = NMR_SCREEN_VIEW_SETTINGS.VIEWER_HEIGHT;
const CHART_WIDTH: number = NMR_SCREEN_VIEW_SETTINGS.CHART_WIDTH;
const CHART_HEIGHT: number = NMR_SCREEN_VIEW_SETTINGS.CHART_HEIGHT;
const ZOOM_WIDTH: number = NMR_SCREEN_VIEW_SETTINGS.ZOOM_WIDTH;
const ZOOM_HEIGHT: number = NMR_SCREEN_VIEW_SETTINGS.ZOOM_HEIGHT;
const TABLE_WIDTH: number = NMR_SCREEN_VIEW_SETTINGS.TABLE_WIDTH;
const CONTROL_WIDTH: number = NMR_SCREEN_VIEW_SETTINGS.CONTROL_WIDTH;
const FIELD_STEP: number = NMR_SCREEN_VIEW_SETTINGS.FIELD_STEP;
const ZOOM_TITLE_FONT = new PhetFont({ size: NMR_SCREEN_VIEW_SETTINGS.ZOOM_TITLE_FONT_SIZE, weight: "bold" });
const POSITIVE_RANGE = new Range(0, NMR_SCREEN_VIEW_SETTINGS.POSITIVE_RANGE_MAX);
/** DEPT-135 draws CH₂ downward. */
const SIGNED_RANGE = new Range(NMR_SCREEN_VIEW_SETTINGS.SIGNED_RANGE_MIN, NMR_SCREEN_VIEW_SETTINGS.SIGNED_RANGE_MAX);

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
          cornerRadius: NMR_SCREEN_VIEW_SETTINGS.VIEWER_CORNER_RADIUS,
        }),
        this.viewerNode,
      ],
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + NMR_SCREEN_VIEW_SETTINGS.VIEWER_TOP_OFFSET,
    });

    // ── Controls ────────────────────────────────────────────────────────────────
    const chooser = new MoleculeChooserNode(model.chooser, listParent, CONTROL_WIDTH);
    const fieldControl = new NumberControl(strings.fieldStringProperty, model.fieldProperty, FIELD_RANGE, {
      ...SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS,
      delta: FIELD_STEP,
      titleNodeOptions: {
        font: CONTROL_FONT,
        fill: SpectroscopyLabColors.textColorProperty,
        maxWidth: NMR_SCREEN_VIEW_SETTINGS.FIELD_CONTROL_MAX_WIDTH,
      },
      numberDisplayOptions: { valuePattern: strings.fieldValueStringProperty, decimalPlaces: 0 },
      sliderOptions: {
        ...SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS.sliderOptions,
        constrainValue: (value: number) => Math.round(value / FIELD_STEP) * FIELD_STEP,
        keyboardStep: FIELD_STEP,
        majorTicks: [60, 300, 600].map((value) => ({ value })),
      },
      accessibleName: strings.fieldStringProperty,
    });
    const nucleusRadio = radioGroup<NucleusValue>(
      model.nucleusProperty,
      [
        { value: Nucleus.PROTON, label: strings.protonStringProperty },
        { value: Nucleus.CARBON, label: strings.carbonStringProperty },
      ],
      strings.nucleusStringProperty,
      NMR_SCREEN_VIEW_SETTINGS.NUCLEUS_RADIO_GROUP_MAX_WIDTH,
      "horizontal",
    );
    const protonOptions = new VBox({
      align: "left",
      spacing: NMR_SCREEN_VIEW_SETTINGS.PROTON_OPTIONS_SPACING,
      children: [
        new HBox({
          spacing: NMR_SCREEN_VIEW_SETTINGS.PROTON_OPTIONS_ITEM_1_SPACING,
          children: [
            checkbox(
              model.d2oShakeProperty,
              strings.d2oShakeStringProperty,
              NMR_SCREEN_VIEW_SETTINGS.D2O_SHAKE_CHECKBOX_MAX_WIDTH,
            ),
            checkbox(
              model.showTmsProperty,
              strings.tmsStringProperty,
              NMR_SCREEN_VIEW_SETTINGS.SHOW_TMS_CHECKBOX_MAX_WIDTH,
            ),
            checkbox(
              model.showIntegralProperty,
              strings.integralStringProperty,
              NMR_SCREEN_VIEW_SETTINGS.SHOW_INTEGRAL_CHECKBOX_MAX_WIDTH,
            ),
          ],
        }),
        checkbox(model.secondOrderProperty, strings.secondOrderStringProperty, CONTROL_WIDTH - 30),
      ],
    });
    const spectrumTypeCombo = comboBox<CarbonSpectrumTypeValue>(
      model.carbonSpectrumTypeProperty,
      Object.values(CarbonSpectrumType).map((value) => ({
        value,
        label: strings.carbonSpectrumTypes[`${value}StringProperty`],
      })),
      listParent,
      strings.spectrumTypeStringProperty,
      NMR_SCREEN_VIEW_SETTINGS.CARBON_SPECTRUM_TYPE_COMBO_BOX_MAX_WIDTH,
    );
    const carbonFrequencyText = new Text("", {
      font: CONTROL_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: CONTROL_WIDTH,
    });
    const carbonOptions = new VBox({
      align: "left",
      spacing: NMR_SCREEN_VIEW_SETTINGS.CARBON_OPTIONS_SPACING,
      children: [
        new HBox({
          spacing: NMR_SCREEN_VIEW_SETTINGS.CARBON_OPTIONS_ITEM_1_SPACING,
          children: [
            label(strings.spectrumTypeStringProperty, NMR_SCREEN_VIEW_SETTINGS.SPECTRUM_TYPE_LABEL_MAX_WIDTH),
            spectrumTypeCombo,
          ],
        }),
        new HBox({
          spacing: NMR_SCREEN_VIEW_SETTINGS.CARBON_OPTIONS_ITEM_2_SPACING,
          children: [
            checkbox(
              model.showTmsProperty,
              strings.tmsStringProperty,
              NMR_SCREEN_VIEW_SETTINGS.SHOW_TMS_CHECKBOX_MAX_WIDTH,
            ),
            carbonFrequencyText,
          ],
        }),
      ],
    });
    // Both option sets occupy the same slot, so the panel keeps its size when the nucleus changes.
    const optionSlot = new Node({ children: [protonOptions, carbonOptions] });
    const controls = new SpectroscopyLabPanel(
      new VBox({
        align: "left",
        spacing: NMR_SCREEN_VIEW_SETTINGS.CONTROLS_SPACING,
        children: [
          chooser,
          new HBox({
            spacing: NMR_SCREEN_VIEW_SETTINGS.CONTROLS_ITEM_2_SPACING,
            children: [
              label(strings.nucleusStringProperty, NMR_SCREEN_VIEW_SETTINGS.NUCLEUS_LABEL_MAX_WIDTH),
              nucleusRadio,
            ],
          }),
          fieldControl,
          optionSlot,
        ],
      }),
      { minWidth: VIEWER_SIZE, left: viewer.left, top: viewer.bottom + NMR_SCREEN_VIEW_SETTINGS.CONTROLS_TOP_OFFSET },
    );

    // ── Spectrum ────────────────────────────────────────────────────────────────
    const selectedShiftProperty = DerivedProperty.deriveAny(
      [
        model.selectedSignalProperty,
        model.environmentsProperty,
        model.carbonEnvironmentsProperty,
        model.nucleusProperty,
      ],
      () => model.selectedSignal?.shift ?? null,
    );
    const pickSignal = (x: number, tolerance: number, minimum: number) =>
      model.selectNear(x, Math.max(tolerance, minimum));
    const clearSignal = () => {
      model.selectedSignalProperty.value = null;
    };
    const chart = new SpectrumChartNode({
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: SHIFT_RANGE,
      yRange: new Range(0, NMR_SCREEN_VIEW_SETTINGS.CHART_RANGE_MAX),
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
      pick: (x, tolerance) => pickSignal(x, tolerance, 0.05),
      step: (direction) => model.stepSelection(direction),
      clear: clearSignal,
      accessibleName: a11y.spectrumStringProperty,
      accessibleHelpText: a11y.spectrumHelpStringProperty,
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: viewer.top,
    });
    const carbonYRangeProperty = new DerivedProperty([model.carbonSpectrumTypeProperty], (type) =>
      type === CarbonSpectrumType.DEPT_135 ? SIGNED_RANGE : POSITIVE_RANGE,
    );
    const carbonChart = new SpectrumChartNode({
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: CARBON_SHIFT_RANGE,
      xRangeProperty: model.carbonRangeProperty,
      yRange: POSITIVE_RANGE,
      yRangeProperty: carbonYRangeProperty,
      xInverted: true,
      xTickSpacing: 20,
      yTickSpacing: 0.25,
      yTickDecimals: 2,
      xLabelStringProperty: strings.shiftAxisStringProperty,
      yLabelStringProperty: strings.intensityAxisStringProperty,
      curveProperty: model.carbonSpectrumProperty,
      selectedXProperty: selectedShiftProperty,
      pick: (x, tolerance) => pickSignal(x, tolerance, 1),
      step: (direction) => model.stepSelection(direction),
      clear: clearSignal,
      accessibleName: a11y.carbonSpectrumStringProperty,
      accessibleHelpText: a11y.spectrumHelpStringProperty,
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: viewer.top,
    });

    // ── Zoom on the selected signal ─────────────────────────────────────────────
    const zoomTitle = new Text("", {
      font: ZOOM_TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: ZOOM_WIDTH + NMR_SCREEN_VIEW_SETTINGS.ZOOM_TITLE_MAX_WIDTH_OFFSET,
    });
    const zoomChart = new SpectrumChartNode({
      chartWidth: ZOOM_WIDTH,
      chartHeight: ZOOM_HEIGHT,
      xRange: ZOOM_RANGE,
      yRange: new Range(0, NMR_SCREEN_VIEW_SETTINGS.ZOOM_CHART_RANGE_MAX),
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
      clear: clearSignal,
      focusable: false,
    });
    const carbonZoomTickProperty = new DerivedProperty([model.carbonZoomRangeProperty], (range) =>
      range.getLength() > 20 ? 5 : 2,
    );
    const carbonZoomChart = new SpectrumChartNode({
      chartWidth: ZOOM_WIDTH,
      chartHeight: ZOOM_HEIGHT,
      xRange: CARBON_ZOOM_RANGE,
      xRangeProperty: model.carbonZoomRangeProperty,
      yRange: POSITIVE_RANGE,
      yRangeProperty: carbonYRangeProperty,
      xInverted: true,
      xTickSpacing: 2,
      xTickSpacingProperty: carbonZoomTickProperty,
      yTickSpacing: 0.5,
      yTickDecimals: 1,
      xLabelStringProperty: strings.zoomAxisStringProperty,
      yLabelStringProperty: strings.intensityAxisStringProperty,
      curveProperty: model.carbonZoomProperty,
      selectedXProperty: new DerivedProperty([model.selectedSignalProperty], () => null),
      pick: () => undefined,
      step: (direction) => model.stepSelection(direction),
      clear: clearSignal,
      focusable: false,
    });
    const zoomGroup = new VBox({
      align: "left",
      spacing: NMR_SCREEN_VIEW_SETTINGS.ZOOM_GROUP_SPACING,
      children: [zoomTitle, new Node({ children: [zoomChart, carbonZoomChart] })],
    });

    // ── Nucleus switch ──────────────────────────────────────────────────────────
    const nucleusListener = (nucleus: NucleusValue) => {
      const carbon = nucleus === Nucleus.CARBON;
      chart.visible = !carbon;
      zoomChart.visible = !carbon;
      protonOptions.visible = !carbon;
      carbonChart.visible = carbon;
      carbonZoomChart.visible = carbon;
      carbonOptions.visible = carbon;
    };
    model.nucleusProperty.link(nucleusListener);
    const carbonFrequencyLink = Multilink.multilink(
      [model.fieldProperty, strings.carbonFrequencyStringProperty],
      (field, pattern) => {
        carbonFrequencyText.string = StringUtils.fillIn(pattern, {
          value: toFixed(field / PROTON_TO_CARBON_FREQUENCY, 0),
        });
      },
    );

    const rowsProperty = DerivedProperty.deriveAny(
      [
        model.nucleusProperty,
        model.environmentsProperty,
        model.carbonEnvironmentsProperty,
        model.carbonSpectrumTypeProperty,
        strings.signalRowStringProperty,
        strings.carbonRowStringProperty,
        strings.broadStringProperty,
        strings.couplingValueStringProperty,
        strings.carbonCouplingStringProperty,
        strings.quaternaryStringProperty,
      ],
      (): readonly SignalRow[] =>
        model.isCarbon
          ? model.carbonEnvironmentsProperty.value.map(carbonRow)
          : model.environmentsProperty.value.map(protonRow),
    );
    const table = new SignalTableNode(rowsProperty, model.selectedSignalProperty, TABLE_WIDTH);
    const tablePanel = new SpectroscopyLabPanel(table, {
      minWidth: TABLE_WIDTH + NMR_SCREEN_VIEW_SETTINGS.TABLE_PANEL_MIN_WIDTH_OFFSET,
      minHeight: NMR_SCREEN_VIEW_SETTINGS.TABLE_PANEL_MIN_HEIGHT,
      align: "left",
    });

    const lowerRow = new HBox({
      spacing: NMR_SCREEN_VIEW_SETTINGS.LOWER_ROW_SPACING,
      align: "top",
      children: [zoomGroup, tablePanel],
      right: chart.right,
      top: chart.bottom + NMR_SCREEN_VIEW_SETTINGS.LOWER_ROW_TOP_OFFSET,
    });

    const zoomTitleMultilink = Multilink.multilinkAny(
      [
        model.selectedSignalProperty,
        model.environmentsProperty,
        model.carbonEnvironmentsProperty,
        model.nucleusProperty,
        model.fieldProperty,
        strings.zoomTitleStringProperty,
        strings.zoomHintStringProperty,
      ],
      () => {
        const signal = model.selectedSignal;
        const field = model.fieldProperty.value / (model.isCarbon ? PROTON_TO_CARBON_FREQUENCY : 1);
        zoomTitle.string = signal
          ? StringUtils.fillIn(strings.zoomTitleStringProperty.value, {
              label: signal.label,
              field: toFixed(field, 0),
            })
          : strings.zoomHintStringProperty.value;
      },
    );

    // Announce the selected signal (keyboard users hear each one).
    const announce = () => {
      const signal = model.selectedSignal;
      if (signal) {
        (model.isCarbon ? carbonChart : chart).addAccessibleResponse(describeSignal(signal));
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

    this.children = [viewer, controls, chart, carbonChart, lowerRow, resetAllButton, listParent];
    this.addChild(new Node({ pdomOrder: [this.viewerNode, chart, carbonChart, table, controls, resetAllButton] }));

    this.disposeNMRScreenView = () => {
      model.selectedSignalProperty.unlink(announce);
      model.nucleusProperty.unlink(nucleusListener);
      carbonFrequencyLink.dispose();
      zoomTitleMultilink.dispose();
      rowsProperty.dispose();
      selectedShiftProperty.dispose();
      carbonYRangeProperty.dispose();
      carbonZoomTickProperty.dispose();
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

/** "a   δ 3.65   2H   q" over "J = 7.0 Hz". */
function protonRow(environment: ProtonEnvironment): SignalRow {
  const strings = StringManager.getInstance().getNMRStrings();
  return {
    main: StringUtils.fillIn(strings.signalRowStringProperty.value, {
      label: environment.label,
      shift: toFixed(environment.shift, 2),
      count: environment.atoms.length,
      multiplicity: environment.multiplicity,
    }),
    detail: environment.exchangeable
      ? strings.broadStringProperty.value
      : environment.couplings
          .map((c) => StringUtils.fillIn(strings.couplingValueStringProperty.value, { j: toFixed(c.j, 1) }))
          .join(", ") ||
        (lookupStringProperty(strings.multiplicities, `${environment.multiplicity}StringProperty`)?.value ?? ""),
  };
}

/** "1   δ 128.5   CH   ×6" over "¹J(C–H) = 159 Hz". */
function carbonRow(environment: CarbonEnvironment): SignalRow {
  const strings = StringManager.getInstance().getNMRStrings();
  return {
    main: StringUtils.fillIn(strings.carbonRowStringProperty.value, {
      label: environment.label,
      shift: toFixed(environment.shift, 1),
      type: carbonTypeName(environment.hydrogens),
      count: environment.atoms.length,
    }),
    detail:
      environment.hydrogens > 0
        ? StringUtils.fillIn(strings.carbonCouplingStringProperty.value, {
            j: toFixed(environment.oneBondCoupling, 0),
          })
        : strings.quaternaryStringProperty.value,
  };
}

/** Tooltip text: "H 5 — b, δ 1.16" for an observed atom, the element and number otherwise. */
function describeAtom(model: NMRModel, index: number): string {
  const element = model.viewer.molecule?.elements[index];
  const signal = model.signals.find((e) => e.atoms.includes(index));
  const base = element ? `${element.symbol} ${index + 1}` : "";
  return signal ? `${base} — ${signal.label}, δ ${toFixed(signal.shift, model.isCarbon ? 1 : 2)}` : base;
}
