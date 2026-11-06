/**
 * SpectroscopyLabScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each screen.
 * Drawn on the standard PhET 548 × 373 canvas using SpectroscopyLabColors.
 * Bond vibrations and IR dips, NMR multiplets, an absorption band and cuvette,
 * and molecular detective work. All paints follow the active colour profile.
 */
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import { ScreenIcon } from "scenerystack/sim";
import SpectroscopyLabColors from "../SpectroscopyLabColors.js";

const W = 548;
const H = 373;
const CHART_LEFT = 55;
const CHART_RIGHT = W - 45;
const CHART_TOP = 195;
const CHART_BOTTOM = H - 48;
const CURVE_STEP = 2;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: SpectroscopyLabColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: SpectroscopyLabColors.backgroundColorProperty,
  });
}

function chart(): Node {
  const fill = new Rectangle(CHART_LEFT, CHART_TOP, CHART_RIGHT - CHART_LEFT, CHART_BOTTOM - CHART_TOP, {
    fill: SpectroscopyLabColors.chartBackgroundColorProperty,
  });
  const axes = new Path(
    new Shape().moveTo(CHART_LEFT, CHART_TOP).lineTo(CHART_LEFT, CHART_BOTTOM).lineTo(CHART_RIGHT, CHART_BOTTOM),
    { stroke: SpectroscopyLabColors.chartAxisColorProperty, lineWidth: 4 },
  );
  return new Node({ children: [fill, axes] });
}

/** Stylized spectra: their peaks communicate the technique, not a particular molecule. */
function spectrum(yAt: (x: number) => number): Path {
  const shape = new Shape();
  for (let x = CHART_LEFT + 5; x <= CHART_RIGHT; x += CURVE_STEP) {
    const y = yAt(x);
    x === CHART_LEFT + 5 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  return new Path(shape, {
    stroke: SpectroscopyLabColors.spectrumColorProperty,
    lineWidth: 5,
    lineJoin: "round",
  });
}

export function createInfraredIcon(): ScreenIcon {
  const bond = new Line(215, 105, 333, 105, {
    stroke: SpectroscopyLabColors.chartAxisColorProperty,
    lineWidth: 16,
  });
  const atoms = [215, 333].map(
    (x) =>
      new Circle(31, {
        centerX: x,
        centerY: 105,
        fill: SpectroscopyLabColors.spectrumColorProperty,
        stroke: SpectroscopyLabColors.textColorProperty,
        lineWidth: 3,
      }),
  );
  const arrows = (
    [
      [165, 110],
      [383, 438],
    ] as const
  ).map(
    ([start, end]) =>
      new ArrowNode(start, 105, end, 105, {
        fill: SpectroscopyLabColors.highlightColorProperty,
        stroke: null,
        tailWidth: 7,
        headWidth: 23,
        headHeight: 20,
      }),
  );
  // Downward transmittance bands distinguish IR from the other spectra.
  const dips = [
    [151, 18, 70],
    [289, 8, 102],
    [369, 10, 55],
    [419, 7, 74],
  ] as const;
  const trace = spectrum(
    (x) =>
      210 + dips.reduce((sum, [center, width, depth]) => sum + depth * Math.exp(-(((x - center) / width) ** 2)), 0),
  );
  return iconFrom(
    new Node({
      children: [background(), chart(), trace, bond, ...atoms, ...arrows],
    }),
  );
}

export function createNMRIcon(): ScreenIcon {
  const tube = new Rectangle(250, 40, 48, 125, 18, 18, {
    fill: SpectroscopyLabColors.chartBackgroundColorProperty,
    stroke: SpectroscopyLabColors.chartAxisColorProperty,
    lineWidth: 5,
  });
  const sample = new Rectangle(257, 95, 34, 62, 12, 12, {
    fill: SpectroscopyLabColors.spectrumColorProperty,
  });
  const field = [181, 367].map(
    (x) =>
      new ArrowNode(x, 157, x, 49, {
        fill: SpectroscopyLabColors.highlightColorProperty,
        stroke: null,
        tailWidth: 6,
        headWidth: 22,
        headHeight: 20,
      }),
  );
  const trace = spectrum((x) => {
    const multiplet = (center: number, spacing: number, heights: readonly number[]) =>
      heights.reduce((sum, height, i) => sum + height / (1 + ((x - center - i * spacing) / 2.5) ** 2), 0);
    return 318 - multiplet(137, 15, [45, 90, 45]) - multiplet(325, 14, [30, 85, 85, 30]);
  });
  return iconFrom(
    new Node({
      children: [background(), chart(), trace, tube, sample, ...field],
    }),
  );
}

export function createUVVisIcon(): ScreenIcon {
  const cuvette = new Rectangle(245, 44, 70, 120, {
    fill: SpectroscopyLabColors.chartBackgroundColorProperty,
    stroke: SpectroscopyLabColors.chartAxisColorProperty,
    lineWidth: 5,
  });
  const solution = new Rectangle(252, 73, 56, 84, {
    fill: SpectroscopyLabColors.lobePositiveColorProperty,
    opacity: 0.65,
  });
  const incident = new ArrowNode(90, 108, 231, 108, {
    fill: SpectroscopyLabColors.highlightColorProperty,
    stroke: null,
    tailWidth: 18,
    headWidth: 38,
    headHeight: 26,
  });
  const transmitted = new ArrowNode(329, 108, 458, 108, {
    fill: SpectroscopyLabColors.highlightColorProperty,
    stroke: null,
    tailWidth: 7,
    headWidth: 22,
    headHeight: 22,
  });
  const trace = spectrum(
    (x) => 318 - 105 * Math.exp(-(((x - 240) / 47) ** 2)) - 42 * Math.exp(-(((x - 379) / 32) ** 2)),
  );
  return iconFrom(
    new Node({
      children: [background(), chart(), trace, cuvette, solution, incident, transmitted],
    }),
  );
}

export function createUnknownsIcon(): ScreenIcon {
  const evidence = new Rectangle(310, 57, 177, 256, 10, 10, {
    fill: SpectroscopyLabColors.chartBackgroundColorProperty,
    stroke: SpectroscopyLabColors.chartAxisColorProperty,
    lineWidth: 5,
  });
  const clues = new Path(
    new Shape()
      .moveTo(333, 137)
      .lineTo(353, 137)
      .lineTo(366, 177)
      .lineTo(379, 137)
      .lineTo(401, 137)
      .lineTo(411, 194)
      .lineTo(421, 137)
      .lineTo(464, 137)
      .moveTo(333, 284)
      .lineTo(464, 284)
      .moveTo(351, 284)
      .lineTo(351, 251)
      .moveTo(365, 284)
      .lineTo(365, 229)
      .moveTo(379, 284)
      .lineTo(379, 251)
      .moveTo(438, 284)
      .lineTo(438, 239),
    { stroke: SpectroscopyLabColors.spectrumColorProperty, lineWidth: 5, lineJoin: "round" },
  );
  const handle = new Line(218, 222, 278, 300, {
    stroke: SpectroscopyLabColors.chartAxisColorProperty,
    lineWidth: 22,
    lineCap: "round",
  });
  const lens = new Circle(88, {
    centerX: 160,
    centerY: 154,
    fill: SpectroscopyLabColors.panelBackgroundColorProperty,
    stroke: SpectroscopyLabColors.highlightColorProperty,
    lineWidth: 9,
  });
  // A question-mark symbol avoids introducing language-dependent text into the artwork.
  const question = new Path(
    new Shape().moveTo(132, 128).cubicCurveTo(132, 88, 197, 88, 197, 125).cubicCurveTo(197, 151, 160, 146, 160, 174),
    { stroke: SpectroscopyLabColors.textColorProperty, lineWidth: 11, lineCap: "round" },
  );
  const dot = new Circle(7, { centerX: 160, centerY: 199, fill: SpectroscopyLabColors.textColorProperty });
  return iconFrom(
    new Node({
      children: [background(), evidence, clues, handle, lens, question, dot],
    }),
  );
}
