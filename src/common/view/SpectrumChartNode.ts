/**
 * SpectrumChartNode.ts
 *
 * A spectrum plot shared by the IR, NMR and UV-Vis screens, built on bamboo. It draws a sampled
 * curve, optional stick markers (the underlying line spectrum), optional shaded regions with labels
 * (IR functional-group windows), and a cursor line at the selected peak.
 *
 * Spectroscopists plot IR wavenumber and NMR chemical shift decreasing to the right, so the x axis
 * can be inverted. Clicking the plot calls `pick` with the model x and a tolerance of a few pixels;
 * when focused, arrow keys step between peaks and Escape clears, via `step` and `clear`.
 *
 * The axis ranges may follow Properties (`xRangeProperty`, `yRangeProperty`) — the IR fine-structure
 * window tracks the band of the current isotopologue, and DEPT-135 needs a negative half.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { ChartRectangle, ChartTransform, GridLineSet, LinePlot, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { type Range, toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Orientation, optionize } from "scenerystack/phet-core";
import {
  KeyboardListener,
  Line,
  Node,
  type NodeOptions,
  Path,
  type PressListenerEvent,
  Rectangle,
  Text,
} from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import type { SampledCurve, StickPeak } from "../model/SpectrumCurve.js";
import SpectroscopyLabHotkeyData from "../SpectroscopyLabHotkeyData.js";

const TICK_FONT = new PhetFont(11);
const AXIS_LABEL_FONT = new PhetFont(12);
const REGION_FONT = new PhetFont(10);
/** Click tolerance, px. */
const PICK_TOLERANCE = 8;

export type SpectrumRegion = {
  readonly min: number;
  readonly max: number;
  readonly labelStringProperty: TReadOnlyProperty<string>;
};

type SelfOptions = {
  chartWidth: number;
  chartHeight: number;
  xRange: Range;
  yRange: Range;
  /** When given, the axis follows it (initial value replaces xRange / yRange). */
  xRangeProperty?: TReadOnlyProperty<Range> | null;
  yRangeProperty?: TReadOnlyProperty<Range> | null;
  /** When given, the x grid, ticks and labels follow it (for an x range that changes scale). */
  xTickSpacingProperty?: TReadOnlyProperty<number> | null;
  /** Plot x decreasing to the right (IR wavenumber, NMR shift). */
  xInverted?: boolean;
  xTickSpacing: number;
  yTickSpacing: number;
  /** Decimal places on tick labels. */
  xTickDecimals?: number;
  yTickDecimals?: number;
  xLabelStringProperty: TReadOnlyProperty<string>;
  yLabelStringProperty: TReadOnlyProperty<string>;
  curveProperty: TReadOnlyProperty<SampledCurve>;
  /** A second trace on the same axes (the NMR integral), drawn when its visibility Property is true. */
  secondaryCurveProperty?: TReadOnlyProperty<SampledCurve> | null;
  secondaryVisibleProperty?: TReadOnlyProperty<boolean> | null;
  /** Stick heights are fractions of the y range; drawn down from the top when `sticksFromTop`. */
  sticksProperty?: TReadOnlyProperty<readonly StickPeak[]> | null;
  sticksVisibleProperty?: TReadOnlyProperty<boolean> | null;
  sticksFromTop?: boolean;
  regions?: readonly SpectrumRegion[];
  regionsVisibleProperty?: TReadOnlyProperty<boolean> | null;
  /** Model x of the selected peak, or null. */
  selectedXProperty: TReadOnlyProperty<number | null>;
  /** Called with the clicked model x and a tolerance in model units. */
  pick: (x: number, tolerance: number) => void;
  step: (direction: 1 | -1) => void;
  clear: () => void;
};

export type SpectrumChartNodeOptions = SelfOptions & NodeOptions;

export class SpectrumChartNode extends Node {
  private readonly disposeSpectrumChartNode: () => void;

  public constructor(providedOptions: SpectrumChartNodeOptions) {
    const options = optionize<SpectrumChartNodeOptions, SelfOptions, NodeOptions>()(
      {
        xInverted: false,
        xTickDecimals: 0,
        yTickDecimals: 0,
        xRangeProperty: null,
        yRangeProperty: null,
        xTickSpacingProperty: null,
        sticksProperty: null,
        secondaryCurveProperty: null,
        secondaryVisibleProperty: null,
        sticksVisibleProperty: null,
        sticksFromTop: false,
        regions: [],
        regionsVisibleProperty: null,
        tagName: "div",
        focusable: true,
      },
      providedOptions,
    );
    super();

    const chartTransform = new ChartTransform({
      viewWidth: options.chartWidth,
      viewHeight: options.chartHeight,
      modelXRange: options.xRangeProperty?.value ?? options.xRange,
      modelYRange: options.yRangeProperty?.value ?? options.yRange,
      modelXRangeInverted: options.xInverted,
    });

    const background = new ChartRectangle(chartTransform, {
      fill: SpectroscopyLabColors.chartBackgroundColorProperty,
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      cursor: "pointer",
    });
    const xGridLines = new GridLineSet(chartTransform, Orientation.HORIZONTAL, options.xTickSpacing, {
      stroke: SpectroscopyLabColors.chartGridColorProperty,
    });
    const gridLines = new Node({
      children: [
        xGridLines,
        new GridLineSet(chartTransform, Orientation.VERTICAL, options.yTickSpacing, {
          stroke: SpectroscopyLabColors.chartGridColorProperty,
        }),
      ],
      pickable: false,
    });

    const regionLayer = new Node({ pickable: false });
    const regionNodes = options.regions.map((region) => {
      const rectangle = new Rectangle(0, 0, 1, options.chartHeight, {
        fill: SpectroscopyLabColors.regionFillColorProperty,
      });
      const label = new Text(region.labelStringProperty, {
        font: REGION_FONT,
        fill: SpectroscopyLabColors.regionTextColorProperty,
      });
      regionLayer.addChild(rectangle);
      regionLayer.addChild(label);
      return { region, rectangle, label };
    });
    const layoutRegions = () => {
      for (const { region, rectangle, label } of regionNodes) {
        const left = chartTransform.modelToViewX(region.min);
        const right = chartTransform.modelToViewX(region.max);
        const width = Math.abs(right - left);
        rectangle.setRect(Math.min(left, right), 0, width, options.chartHeight);
        label.maxWidth = Math.max(width + 24, 40);
        label.centerX = Math.min(left, right) + width / 2;
        label.top = 3;
      }
    };
    for (const { label } of regionNodes) {
      label.boundsProperty.link(layoutRegions);
    }

    const plot = new LinePlot(chartTransform, [], {
      stroke: SpectroscopyLabColors.spectrumColorProperty,
      lineWidth: 1.6,
      pickable: false,
    });
    const secondaryPlot = new LinePlot(chartTransform, [], {
      stroke: SpectroscopyLabColors.integralColorProperty,
      lineWidth: 1.4,
      pickable: false,
    });
    const sticks = new Path(null, {
      stroke: SpectroscopyLabColors.peakMarkerColorProperty,
      lineWidth: 1,
      opacity: 0.8,
      pickable: false,
    });
    const cursor = new Line(0, 0, 0, options.chartHeight, {
      stroke: SpectroscopyLabColors.peakMarkerColorProperty,
      lineWidth: 2,
      lineDash: [5, 3],
      pickable: false,
      visible: false,
    });

    // Everything inside the plot area is clipped to it.
    const plotArea = new Node({
      children: [regionLayer, gridLines, secondaryPlot, plot, sticks, cursor],
      clipArea: Shape.rect(0, 0, options.chartWidth, options.chartHeight),
      pickable: false,
    });

    const xTicks = new TickMarkSet(chartTransform, Orientation.HORIZONTAL, options.xTickSpacing, {
      edge: "min",
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
    });
    const yTicks = new TickMarkSet(chartTransform, Orientation.VERTICAL, options.yTickSpacing, {
      edge: "min",
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
    });
    const tickText = (value: number, decimals: number) =>
      new Text(toFixed(value, decimals), { font: TICK_FONT, fill: SpectroscopyLabColors.textColorProperty });
    const xLabels = new TickLabelSet(chartTransform, Orientation.HORIZONTAL, options.xTickSpacing, {
      edge: "min",
      createLabel: (value: number) => tickText(value, options.xTickDecimals),
    });
    const yLabels = new TickLabelSet(chartTransform, Orientation.VERTICAL, options.yTickSpacing, {
      edge: "min",
      createLabel: (value: number) => tickText(value, options.yTickDecimals),
    });

    const xAxisLabel = new Text(options.xLabelStringProperty, {
      font: AXIS_LABEL_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: options.chartWidth,
    });
    const yAxisLabel = new Text(options.yLabelStringProperty, {
      font: AXIS_LABEL_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      rotation: -Math.PI / 2,
      maxWidth: options.chartHeight,
    });
    const layoutAxisLabels = () => {
      xAxisLabel.centerX = options.chartWidth / 2;
      xAxisLabel.top = xLabels.bottom + 4;
      yAxisLabel.centerY = options.chartHeight / 2;
      yAxisLabel.right = yLabels.left - 6;
    };
    // Tick labels are built lazily, so re-place the axis titles whenever any of them changes size.
    for (const node of [xAxisLabel, yAxisLabel, xLabels, yLabels]) {
      node.boundsProperty.link(layoutAxisLabels);
    }

    this.children = [background, plotArea, xTicks, yTicks, xLabels, yLabels, xAxisLabel, yAxisLabel];
    // Mutate after the children exist so layout options (left, top, …) see the real bounds.
    this.mutate(options);

    // ── Data ────────────────────────────────────────────────────────────────────
    const curveListener = (curve: SampledCurve) => {
      plot.setDataSet(Array.from(curve.x, (x, i) => new Vector2(x, curve.y[i] ?? 0)));
    };
    options.curveProperty.link(curveListener);
    const secondaryMultilink = options.secondaryCurveProperty
      ? Multilink.multilinkAny(
          [
            options.secondaryCurveProperty,
            ...(options.secondaryVisibleProperty ? [options.secondaryVisibleProperty] : []),
          ],
          () => {
            const curve = options.secondaryCurveProperty?.value;
            const visible = (options.secondaryVisibleProperty?.value ?? true) && !!curve;
            secondaryPlot.visible = visible;
            if (visible && curve) {
              secondaryPlot.setDataSet(Array.from(curve.x, (x, i) => new Vector2(x, curve.y[i] ?? 0)));
            }
          },
        )
      : null;

    const drawSticks = () => {
      const visible = options.sticksVisibleProperty?.value ?? true;
      const yMin = chartTransform.modelYRange.min;
      const ySpan = chartTransform.modelYRange.getLength();
      const shape = new Shape();
      for (const stick of visible ? (options.sticksProperty?.value ?? []) : []) {
        const x = chartTransform.modelToViewX(stick.position);
        const baseline = options.sticksFromTop ? yMin + ySpan : yMin;
        const tip = options.sticksFromTop ? baseline - stick.height * ySpan : baseline + stick.height * ySpan;
        shape.moveTo(x, chartTransform.modelToViewY(baseline)).lineTo(x, chartTransform.modelToViewY(tip));
      }
      sticks.shape = shape;
    };
    const sticksMultilink = options.sticksProperty
      ? Multilink.multilinkAny(
          [options.sticksProperty, ...(options.sticksVisibleProperty ? [options.sticksVisibleProperty] : [])],
          drawSticks,
        )
      : null;

    const regionsListener = (visible: boolean) => {
      regionLayer.visible = visible;
    };
    options.regionsVisibleProperty?.link(regionsListener);

    const cursorListener = (x: number | null) => {
      cursor.visible = x !== null;
      if (x !== null) {
        const viewX = chartTransform.modelToViewX(x);
        cursor.setLine(viewX, 0, viewX, options.chartHeight);
      }
    };
    options.selectedXProperty.link(cursorListener);

    // ── Ranges ──────────────────────────────────────────────────────────────────
    const transformListener = () => {
      layoutRegions();
      if (options.sticksProperty) {
        drawSticks();
      }
      cursorListener(options.selectedXProperty.value);
    };
    chartTransform.changedEmitter.addListener(transformListener);
    const xRangeListener = (range: Range) => chartTransform.setModelXRange(range);
    const yRangeListener = (range: Range) => chartTransform.setModelYRange(range);
    options.xRangeProperty?.link(xRangeListener);
    options.yRangeProperty?.link(yRangeListener);
    const xSpacingListener = (spacing: number) => {
      xGridLines.setSpacing(spacing);
      xTicks.setSpacing(spacing);
      xLabels.setSpacing(spacing);
    };
    options.xTickSpacingProperty?.link(xSpacingListener);

    // ── Input ───────────────────────────────────────────────────────────────────
    background.addInputListener({
      down: (event: PressListenerEvent) => {
        if (!event.canStartPress()) {
          return;
        }
        const local = background.globalToParentPoint(event.pointer.point);
        options.pick(chartTransform.viewToModelX(local.x), Math.abs(chartTransform.viewToModelDeltaX(PICK_TOLERANCE)));
        this.focus();
      },
    });

    const keyboardListener = new KeyboardListener({
      keyStringProperties: [
        ...SpectroscopyLabHotkeyData.NEXT_PEAK.keyStringProperties,
        ...SpectroscopyLabHotkeyData.PREVIOUS_PEAK.keyStringProperties,
        ...SpectroscopyLabHotkeyData.CLEAR_PEAK.keyStringProperties,
      ],
      fire: (_event, keysPressed) => {
        // Arrow keys follow the screen direction: right moves toward the right of the plot.
        const towardRight = options.xInverted ? -1 : 1;
        if (keysPressed === "arrowRight" || keysPressed === "arrowDown") {
          options.step(towardRight);
        } else if (keysPressed === "arrowLeft" || keysPressed === "arrowUp") {
          options.step(towardRight === 1 ? -1 : 1);
        } else if (keysPressed === "escape") {
          options.clear();
        }
      },
    });
    this.addInputListener(keyboardListener);

    this.disposeSpectrumChartNode = () => {
      options.curveProperty.unlink(curveListener);
      sticksMultilink?.dispose();
      secondaryMultilink?.dispose();
      options.regionsVisibleProperty?.unlink(regionsListener);
      options.selectedXProperty.unlink(cursorListener);
      options.xRangeProperty?.unlink(xRangeListener);
      options.yRangeProperty?.unlink(yRangeListener);
      options.xTickSpacingProperty?.unlink(xSpacingListener);
      chartTransform.changedEmitter.removeListener(transformListener);
      for (const { label } of regionNodes) {
        label.boundsProperty.unlink(layoutRegions);
      }
      keyboardListener.dispose();
      for (const node of [xAxisLabel, yAxisLabel, xLabels, yLabels]) {
        node.boundsProperty.unlink(layoutAxisLabels);
      }
      for (const node of [xAxisLabel, yAxisLabel, ...regionLayer.children]) {
        node.dispose();
      }
    };
  }

  public override dispose(): void {
    this.disposeSpectrumChartNode();
    super.dispose();
  }
}
