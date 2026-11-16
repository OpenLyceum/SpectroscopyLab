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
import { SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS } from "../SpectroscopyLabConstants.js";

const W = 548;
const H = 373;
const CHART_LEFT: number = SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CHART_LEFT;
const CHART_RIGHT = W - 45;
const CHART_TOP: number = SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CHART_TOP;
const CHART_BOTTOM = H - 48;
const CURVE_STEP: number = SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CURVE_STEP;

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
    {
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.AXES_LINE_WIDTH,
    },
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
    lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SPECTRUM_LINE_WIDTH,
    lineJoin: "round",
  });
}

export function createInfraredIcon(): ScreenIcon {
  const bond = new Line(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.BOND_START_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.BOND_START_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.BOND_END_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.BOND_END_Y,
    {
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.BOND_LINE_WIDTH,
    },
  );
  const atoms = [215, 333].map(
    (x) =>
      new Circle(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ATOMS_RADIUS, {
        centerX: x,
        centerY: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ATOMS_CENTER_Y,
        fill: SpectroscopyLabColors.spectrumColorProperty,
        stroke: SpectroscopyLabColors.textColorProperty,
        lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ATOMS_LINE_WIDTH,
      }),
  );
  const arrows = (
    [
      [165, 110],
      [383, 438],
    ] as const
  ).map(
    ([start, end]) =>
      new ArrowNode(
        start,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ARROWS_START_Y,
        end,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ARROWS_END_Y,
        {
          fill: SpectroscopyLabColors.highlightColorProperty,
          stroke: null,
          tailWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ARROWS_TAIL_WIDTH,
          headWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ARROWS_HEAD_WIDTH,
          headHeight: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.ARROWS_HEAD_HEIGHT,
        },
      ),
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
  const tube = new Rectangle(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TUBE_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TUBE_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TUBE_WIDTH,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TUBE_HEIGHT,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TUBE_CORNER_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TUBE_CORNER_Y,
    {
      fill: SpectroscopyLabColors.chartBackgroundColorProperty,
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TUBE_LINE_WIDTH,
    },
  );
  const sample = new Rectangle(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SAMPLE_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SAMPLE_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SAMPLE_WIDTH,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SAMPLE_HEIGHT,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SAMPLE_CORNER_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SAMPLE_CORNER_Y,
    {
      fill: SpectroscopyLabColors.spectrumColorProperty,
    },
  );
  const field = [181, 367].map(
    (x) =>
      new ArrowNode(
        x,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.FIELD_START_Y,
        x,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.FIELD_END_Y,
        {
          fill: SpectroscopyLabColors.highlightColorProperty,
          stroke: null,
          tailWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.FIELD_TAIL_WIDTH,
          headWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.FIELD_HEAD_WIDTH,
          headHeight: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.FIELD_HEAD_HEIGHT,
        },
      ),
  );
  const trace = spectrum((x) => {
    const multiplet = (center: number, spacing: number, heights: readonly number[]) =>
      heights.reduce((sum, height, i) => sum + height / (1 + ((x - center - i * spacing) / 2.5) ** 2), 0);
    return (
      318 -
      multiplet(137, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRACE_SPACING, [45, 90, 45]) -
      multiplet(325, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRACE_SPACING_SEGMENT_2, [30, 85, 85, 30])
    );
  });
  return iconFrom(
    new Node({
      children: [background(), chart(), trace, tube, sample, ...field],
    }),
  );
}

export function createUVVisIcon(): ScreenIcon {
  const cuvette = new Rectangle(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CUVETTE_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CUVETTE_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CUVETTE_WIDTH,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CUVETTE_HEIGHT,
    {
      fill: SpectroscopyLabColors.chartBackgroundColorProperty,
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CUVETTE_LINE_WIDTH,
    },
  );
  const solution = new Rectangle(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SOLUTION_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SOLUTION_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SOLUTION_WIDTH,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SOLUTION_HEIGHT,
    {
      fill: SpectroscopyLabColors.lobePositiveColorProperty,
      opacity: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.SOLUTION_OPACITY,
    },
  );
  const incident = new ArrowNode(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.INCIDENT_START_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.INCIDENT_START_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.INCIDENT_END_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.INCIDENT_END_Y,
    {
      fill: SpectroscopyLabColors.highlightColorProperty,
      stroke: null,
      tailWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.INCIDENT_TAIL_WIDTH,
      headWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.INCIDENT_HEAD_WIDTH,
      headHeight: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.INCIDENT_HEAD_HEIGHT,
    },
  );
  const transmitted = new ArrowNode(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRANSMITTED_START_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRANSMITTED_START_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRANSMITTED_END_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRANSMITTED_END_Y,
    {
      fill: SpectroscopyLabColors.highlightColorProperty,
      stroke: null,
      tailWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRANSMITTED_TAIL_WIDTH,
      headWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRANSMITTED_HEAD_WIDTH,
      headHeight: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.TRANSMITTED_HEAD_HEIGHT,
    },
  );
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
  const evidence = new Rectangle(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.EVIDENCE_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.EVIDENCE_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.EVIDENCE_WIDTH,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.EVIDENCE_HEIGHT,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.EVIDENCE_CORNER_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.EVIDENCE_CORNER_Y,
    {
      fill: SpectroscopyLabColors.chartBackgroundColorProperty,
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.EVIDENCE_LINE_WIDTH,
    },
  );
  const clues = new Path(
    new Shape()
      .moveTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y)
      .lineTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_2, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y)
      .lineTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_3,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_2,
      )
      .lineTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_4, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y)
      .lineTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_5, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y)
      .lineTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_6,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_3,
      )
      .lineTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_7, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y)
      .lineTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_8, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y)
      .moveTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_MOVE_TO_Y)
      .lineTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_8,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_4,
      )
      .moveTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_9,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_4,
      )
      .lineTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_9,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_5,
      )
      .moveTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_10,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_6,
      )
      .lineTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_10,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_7,
      )
      .moveTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_11,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_8,
      )
      .lineTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_11,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_9,
      )
      .moveTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_12,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_10,
      )
      .lineTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_X_SEGMENT_12,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_Y_SEGMENT_11,
      ),
    {
      stroke: SpectroscopyLabColors.spectrumColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.CLUES_LINE_WIDTH,
      lineJoin: "round",
    },
  );
  const handle = new Line(
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.HANDLE_START_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.HANDLE_START_Y,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.HANDLE_END_X,
    SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.HANDLE_END_Y,
    {
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.HANDLE_LINE_WIDTH,
      lineCap: "round",
    },
  );
  const lens = new Circle(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.LENS_RADIUS, {
    centerX: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.LENS_CENTER_X,
    centerY: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.LENS_CENTER_Y,
    fill: SpectroscopyLabColors.panelBackgroundColorProperty,
    stroke: SpectroscopyLabColors.highlightColorProperty,
    lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.LENS_LINE_WIDTH,
  });
  // A question-mark symbol avoids introducing language-dependent text into the artwork.
  const question = new Path(
    new Shape()
      .moveTo(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_X, SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_Y)
      .cubicCurveTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_1_X,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_1_Y,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_2_X,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_2_Y,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_END_X,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_END_Y,
      )
      .cubicCurveTo(
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_1_X_SEGMENT_2,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_1_Y_SEGMENT_2,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_2_X_SEGMENT_2,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_CONTROL_2_Y_SEGMENT_2,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_END_X_SEGMENT_2,
        SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_END_Y_SEGMENT_2,
      ),
    {
      stroke: SpectroscopyLabColors.textColorProperty,
      lineWidth: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.QUESTION_LINE_WIDTH,
      lineCap: "round",
    },
  );
  const dot = new Circle(SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.DOT_RADIUS, {
    centerX: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.DOT_CENTER_X,
    centerY: SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS.DOT_CENTER_Y,
    fill: SpectroscopyLabColors.textColorProperty,
  });
  return iconFrom(
    new Node({
      children: [background(), evidence, clues, handle, lens, question, dot],
    }),
  );
}
