import { UNKNOWNS_SCREEN_VIEW_SETTINGS } from "../../SpectroscopyLabConstants.js";
/**
 * UnknownsScreenView.ts
 *
 * Layout: the candidate structures as buttons (top left) above the formula, degree of
 * unsaturation, molecular-ion cluster and game controls; the unknown's IR and ¹H (or ¹³C) NMR
 * spectra on the right. A wrong guess crosses that candidate out; the right one is framed in green.
 */

import { DerivedProperty, Multilink, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, toFixed } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { RectangularPushButton } from "scenerystack/sun";
import { IR_RANGE } from "../../common/model/infrared/InfraredSpectrum.js";
import { loadMolecule, nameKey } from "../../common/model/library/SpectroscopyLibrary.js";
import { CARBON_SHIFT_RANGE, Nucleus, type NucleusValue, SHIFT_RANGE } from "../../common/model/nmr/NMRSpectrum.js";
import { lorentzianSum, type SampledCurve } from "../../common/model/SpectrumCurve.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/SpectroscopyLabButtonOptions.js";
import { SpectroscopyLabPanel } from "../../common/SpectroscopyLabPanel.js";
import { label, pushButton, radioGroup } from "../../common/view/ControlFactory.js";
import { disposeSubtree } from "../../common/view/disposeSubtree.js";
import { MoleculeThumbnailNode } from "../../common/view/MoleculeThumbnailNode.js";
import { moleculeName } from "../../common/view/moleculeName.js";
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { lookupStringProperty, StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import { degreeOfUnsaturation, formulaText, molecularIonCluster } from "../model/MolecularFormula.js";
import { GuessResult, LEVEL_COUNT, type UnknownsModel } from "../model/UnknownsModel.js";
import { UnknownsScreenSummaryContent } from "./UnknownsScreenSummaryContent.js";

const THUMB_WIDTH: number = UNKNOWNS_SCREEN_VIEW_SETTINGS.THUMB_WIDTH;
const THUMB_HEIGHT: number = UNKNOWNS_SCREEN_VIEW_SETTINGS.THUMB_HEIGHT;
const CHART_WIDTH: number = UNKNOWNS_SCREEN_VIEW_SETTINGS.CHART_WIDTH;
const CHART_HEIGHT: number = UNKNOWNS_SCREEN_VIEW_SETTINGS.CHART_HEIGHT;
const BAR_MAX_HEIGHT: number = UNKNOWNS_SCREEN_VIEW_SETTINGS.BAR_MAX_HEIGHT;
const BAR_WIDTH: number = UNKNOWNS_SCREEN_VIEW_SETTINGS.BAR_WIDTH;
const TITLE_FONT = new PhetFont({ size: UNKNOWNS_SCREEN_VIEW_SETTINGS.TITLE_FONT_SIZE, weight: "bold" });
const INFO_FONT = new PhetFont(UNKNOWNS_SCREEN_VIEW_SETTINGS.INFO_FONT_SIZE);
const NAME_FONT = new PhetFont(UNKNOWNS_SCREEN_VIEW_SETTINGS.NAME_FONT_SIZE);
const MARK_FONT = new PhetFont({ size: UNKNOWNS_SCREEN_VIEW_SETTINGS.MARK_FONT_SIZE, weight: "bold" });

export type UnknownsScreenViewOptions = ScreenViewOptions;

export class UnknownsScreenView extends ScreenView {
  private readonly disposeUnknownsScreenView: () => void;

  public constructor(model: UnknownsModel, providedOptions?: UnknownsScreenViewOptions) {
    const options = optionize<UnknownsScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new UnknownsScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance().getUnknownsStrings();
    const a11y = StringManager.getInstance().getUnknownsA11yStrings();
    const irStrings = StringManager.getInstance().getInfraredStrings();
    const nmrStrings = StringManager.getInstance().getNMRStrings();
    const moleculeNames = StringManager.getInstance().getMoleculeNames();

    // ── Candidates ──────────────────────────────────────────────────────────────
    const question = new Text(strings.questionStringProperty, {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: 2 * THUMB_WIDTH,
    });
    const grid = new VBox({ spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.GRID_SPACING, align: "left" });
    const feedback = new Text("", {
      font: INFO_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: 2 * THUMB_WIDTH + UNKNOWNS_SCREEN_VIEW_SETTINGS.FEEDBACK_MAX_WIDTH_OFFSET,
    });
    const candidatesGroup = new VBox({
      align: "left",
      spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.CANDIDATES_GROUP_SPACING,
      children: [question, grid, feedback],
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + UNKNOWNS_SCREEN_VIEW_SETTINGS.CANDIDATES_GROUP_TOP_OFFSET,
    });

    let buttons: { id: string; button: RectangularPushButton; content: Node; mark: Text; frame: Rectangle }[] = [];
    let buildToken = 0;
    const rebuildCandidates = async () => {
      const token = ++buildToken;
      const unknown = model.unknownProperty.value;
      const molecules = unknown ? await Promise.all(unknown.candidates.map((id) => loadMolecule(id))) : [];
      if (token !== buildToken) {
        return;
      }
      for (const entry of buttons) {
        disposeSubtree(entry.content);
        entry.button.dispose();
      }
      grid.removeAllChildren();
      buttons = molecules.map((molecule) => {
        const thumbnail = new MoleculeThumbnailNode(molecule, new Bounds2(0, 0, THUMB_WIDTH, THUMB_HEIGHT));
        const nameProperty =
          lookupStringProperty(moleculeNames, `${nameKey(molecule.id)}StringProperty`) ?? moleculeName(molecule.id);
        const name = new Text(nameProperty, {
          font: NAME_FONT,
          fill: LIGHT_SURFACE_TEXT_FILL,
          maxWidth: THUMB_WIDTH,
        });
        const mark = new Text("✗", {
          font: MARK_FONT,
          fill: SpectroscopyLabColors.wrongGuessColorProperty,
          visible: false,
          center: thumbnail.center,
        });
        const frame = new Rectangle(
          UNKNOWNS_SCREEN_VIEW_SETTINGS.FRAME_X,
          UNKNOWNS_SCREEN_VIEW_SETTINGS.FRAME_Y,
          THUMB_WIDTH + 6,
          THUMB_HEIGHT + 6,
          {
            stroke: SpectroscopyLabColors.rightAnswerColorProperty,
            lineWidth: UNKNOWNS_SCREEN_VIEW_SETTINGS.FRAME_LINE_WIDTH,
            cornerRadius: UNKNOWNS_SCREEN_VIEW_SETTINGS.FRAME_CORNER_RADIUS,
            visible: false,
          },
        );
        const plate = new Rectangle(0, 0, THUMB_WIDTH, THUMB_HEIGHT, {
          fill: SpectroscopyLabColors.chartBackgroundColorProperty,
          cornerRadius: UNKNOWNS_SCREEN_VIEW_SETTINGS.PLATE_CORNER_RADIUS,
        });
        const content = new VBox({
          spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.CONTENT_SPACING,
          children: [new Node({ children: [plate, thumbnail, mark, frame] }), name],
        });
        const button = new RectangularPushButton({
          ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
          content,
          xMargin: UNKNOWNS_SCREEN_VIEW_SETTINGS.BUTTON_X_MARGIN,
          yMargin: UNKNOWNS_SCREEN_VIEW_SETTINGS.BUTTON_Y_MARGIN,
          listener: () => model.guess(molecule.id),
          accessibleName: nameProperty,
        });
        return { id: molecule.id, button, content, mark, frame };
      });
      for (let i = 0; i < buttons.length; i += 2) {
        grid.addChild(
          new HBox({
            spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.REBUILD_CANDIDATES_SPACING,
            children: buttons.slice(i, i + 2).map((b) => b.button),
          }),
        );
      }
      updateMarks();
    };
    const feedbackText = (): string => {
      if (model.isLoadingProperty.value) {
        return strings.loadingStringProperty.value;
      }
      if (model.loadErrorProperty.value) {
        return strings.loadErrorStringProperty.value;
      }
      const unknown = model.unknownProperty.value;
      if (model.resultProperty.value === GuessResult.CORRECT && unknown) {
        return StringUtils.fillIn(strings.correctStringProperty.value, { name: moleculeName(unknown.target.id) });
      }
      const lastWrong = model.wrongGuessesProperty.value.at(-1);
      if (model.resultProperty.value === GuessResult.INCORRECT && lastWrong) {
        return StringUtils.fillIn(strings.incorrectStringProperty.value, { name: moleculeName(lastWrong) });
      }
      return unknown ? "" : strings.noFamiliesStringProperty.value;
    };
    const updateMarks = () => {
      const unknown = model.unknownProperty.value;
      for (const entry of buttons) {
        const wrong = model.wrongGuessesProperty.value.includes(entry.id);
        const right = model.solved && entry.id === unknown?.target.id;
        entry.mark.visible = wrong;
        entry.frame.visible = right;
        entry.button.enabled = !(wrong || model.solved || model.isLoadingProperty.value);
      }
      const result = model.resultProperty.value;
      feedback.string = feedbackText();
      feedback.fill =
        result === GuessResult.CORRECT
          ? SpectroscopyLabColors.regionTextColorProperty
          : SpectroscopyLabColors.textColorProperty;
    };
    const unknownListener = () => {
      rebuildCandidates().catch(() => {
        grid.removeAllChildren();
        model.loadErrorProperty.value = true;
      });
    };
    model.unknownProperty.link(unknownListener);
    const marksMultilink = Multilink.multilinkAny(
      [
        model.wrongGuessesProperty,
        model.resultProperty,
        model.loadErrorProperty,
        model.isLoadingProperty,
        strings.loadingStringProperty,
        strings.loadErrorStringProperty,
        strings.correctStringProperty,
        strings.incorrectStringProperty,
        strings.noFamiliesStringProperty,
        ...Object.values(moleculeNames),
      ],
      updateMarks,
    );
    // Language changes refresh feedback without re-announcing the previous guess.
    let announcedGuess: string | null = null;
    const resultMultilink = Multilink.multilinkAny([model.resultProperty, model.wrongGuessesProperty], () => {
      const result = model.resultProperty.value;
      const guess =
        result === GuessResult.CORRECT
          ? "correct"
          : result === GuessResult.INCORRECT
            ? (model.wrongGuessesProperty.value.at(-1) ?? null)
            : null;
      if (guess !== null && guess !== announcedGuess) {
        grid.addAccessibleResponse(feedbackText());
      }
      announcedGuess = guess;
    });

    // ── Formula, unsaturation, molecular ion, controls ─────────────────────────
    const formulaLine = new Text("", {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: UNKNOWNS_SCREEN_VIEW_SETTINGS.FORMULA_LINE_MAX_WIDTH,
    });
    const unsaturationLine = new Text("", {
      font: INFO_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: UNKNOWNS_SCREEN_VIEW_SETTINGS.UNSATURATION_LINE_MAX_WIDTH,
    });
    const ionBars = new Node();
    const ionGroup = new VBox({
      align: "left",
      spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.ION_GROUP_SPACING,
      children: [
        new Text(strings.ionClusterStringProperty, {
          font: INFO_FONT,
          fill: SpectroscopyLabColors.textColorProperty,
          maxWidth: UNKNOWNS_SCREEN_VIEW_SETTINGS.ION_GROUP_MAX_WIDTH,
        }),
        ionBars,
      ],
    });
    const scoreText = new Text("", {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: UNKNOWNS_SCREEN_VIEW_SETTINGS.SCORE_TEXT_MAX_WIDTH,
    });
    const levelRadio = radioGroup(
      model.levelProperty,
      Array.from({ length: LEVEL_COUNT }, (_, i) => ({
        value: i + 1,
        label: new DerivedProperty([strings.levelValueStringProperty], (pattern) =>
          StringUtils.fillIn(pattern, { level: i + 1 }),
        ),
      })),
      strings.levelStringProperty,
      UNKNOWNS_SCREEN_VIEW_SETTINGS.LEVEL_RADIO_GROUP_MAX_WIDTH,
      "horizontal",
    );
    const newButton = pushButton(strings.newUnknownStringProperty, () => model.newUnknown());
    const infoPanel = new SpectroscopyLabPanel(
      new HBox({
        spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.INFO_PANEL_SPACING,
        align: "top",
        children: [
          new VBox({
            align: "left",
            spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.INFO_PANEL_ITEM_1_SPACING,
            children: [formulaLine, unsaturationLine, ionGroup],
          }),
          new VBox({
            align: "left",
            spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.INFO_PANEL_ITEM_2_SPACING,
            children: [
              new HBox({
                spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.INFO_PANEL_ITEM_1_SPACING_VARIANT_2,
                children: [
                  label(strings.levelStringProperty, UNKNOWNS_SCREEN_VIEW_SETTINGS.LEVEL_LABEL_MAX_WIDTH),
                  levelRadio,
                ],
              }),
              newButton,
              scoreText,
            ],
          }),
        ],
      }),
      { left: candidatesGroup.left },
    );
    // The panel grows when the ion bars fill in; keep it anchored to the bottom.
    const anchorInfoPanel = () => {
      infoPanel.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    };
    infoPanel.boundsProperty.link(anchorInfoPanel);

    const infoMultilink = Multilink.multilinkAny(
      [
        model.unknownProperty,
        model.scoreProperty,
        model.roundsProperty,
        strings.formulaStringProperty,
        strings.scoreStringProperty,
        strings.unsaturationStringProperty,
        strings.ionPeakStringProperty,
      ],
      () => {
        const target = model.unknownProperty.value?.target;
        formulaLine.string = target
          ? StringUtils.fillIn(strings.formulaStringProperty.value, { formula: formulaText(target) })
          : "";
        unsaturationLine.string = target
          ? StringUtils.fillIn(strings.unsaturationStringProperty.value, { value: degreeOfUnsaturation(target) })
          : "";
        scoreText.string = StringUtils.fillIn(strings.scoreStringProperty.value, {
          score: model.scoreProperty.value,
          rounds: model.roundsProperty.value,
        });
        disposeSubtree(ionBars);
        ionBars.removeAllChildren();
        if (target) {
          molecularIonCluster(target).forEach((peak, i) => {
            const height = Math.max(1, (peak.relative / 100) * BAR_MAX_HEIGHT);
            const x = i * (BAR_WIDTH + 56);
            ionBars.addChild(
              new Rectangle(x, BAR_MAX_HEIGHT - height, BAR_WIDTH, height, {
                fill: SpectroscopyLabColors.spectrumColorProperty,
              }),
            );
            ionBars.addChild(
              new Text(
                StringUtils.fillIn(strings.ionPeakStringProperty.value, {
                  mz: peak.mz,
                  relative: toFixed(peak.relative, 1),
                }),
                {
                  font: new PhetFont(UNKNOWNS_SCREEN_VIEW_SETTINGS.INFO_MULTILINK_FONT_SIZE),
                  fill: SpectroscopyLabColors.textColorProperty,
                  left: x,
                  top: BAR_MAX_HEIGHT + 2,
                },
              ),
            );
          });
        }
      },
    );

    // ── Spectra ─────────────────────────────────────────────────────────────────
    const empty: SampledCurve = lorentzianSum([], 0, 1, 2, 1);
    const curve = (pick: (u: NonNullable<UnknownsModel["unknownProperty"]["value"]>) => SampledCurve) =>
      new DerivedProperty([model.unknownProperty], (unknown) => (unknown ? pick(unknown) : empty));
    const irCurve = curve((u) => u.irSpectrum);
    const nmrCurve = curve((u) => u.nmrSpectrum);
    const nmrIntegral = curve((u) => u.nmrIntegral);
    const carbonCurve = curve((u) => u.carbonSpectrum);
    const noSelection = new Property<number | null>(null);
    const showIntegral = new Property(true);
    const chartOptions = {
      pick: () => undefined,
      step: () => undefined,
      clear: () => undefined,
      focusable: false,
    } as const;
    const irChart = new SpectrumChartNode({
      ...chartOptions,
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: IR_RANGE,
      yRange: new Range(0, UNKNOWNS_SCREEN_VIEW_SETTINGS.IR_CHART_RANGE_MAX),
      xInverted: true,
      xTickSpacing: 500,
      yTickSpacing: 25,
      xLabelStringProperty: irStrings.wavenumberAxisStringProperty,
      yLabelStringProperty: irStrings.transmittanceAxisStringProperty,
      curveProperty: irCurve,
      selectedXProperty: noSelection,
      tagName: "div",
      accessibleName: strings.irTitleStringProperty,
      accessibleParagraph: a11y.irDescriptionStringProperty,
    });
    const nmrChart = new SpectrumChartNode({
      ...chartOptions,
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: SHIFT_RANGE,
      yRange: new Range(0, UNKNOWNS_SCREEN_VIEW_SETTINGS.NMR_CHART_RANGE_MAX),
      xInverted: true,
      xTickSpacing: 1,
      yTickSpacing: 0.25,
      yTickDecimals: 2,
      xLabelStringProperty: nmrStrings.shiftAxisStringProperty,
      yLabelStringProperty: nmrStrings.intensityAxisStringProperty,
      curveProperty: nmrCurve,
      secondaryCurveProperty: nmrIntegral,
      secondaryVisibleProperty: showIntegral,
      selectedXProperty: noSelection,
      tagName: "div",
      accessibleName: strings.nmrTitleStringProperty,
      accessibleParagraph: a11y.nmrDescriptionStringProperty,
    });
    const carbonChart = new SpectrumChartNode({
      ...chartOptions,
      chartWidth: CHART_WIDTH,
      chartHeight: CHART_HEIGHT,
      xRange: CARBON_SHIFT_RANGE,
      yRange: new Range(0, UNKNOWNS_SCREEN_VIEW_SETTINGS.CARBON_CHART_RANGE_MAX),
      xInverted: true,
      xTickSpacing: 20,
      yTickSpacing: 0.25,
      yTickDecimals: 2,
      xLabelStringProperty: nmrStrings.shiftAxisStringProperty,
      yLabelStringProperty: nmrStrings.intensityAxisStringProperty,
      curveProperty: carbonCurve,
      selectedXProperty: noSelection,
      tagName: "div",
      accessibleName: strings.carbonTitleStringProperty,
      accessibleParagraph: a11y.carbonDescriptionStringProperty,
    });
    const nucleusListener = (nucleus: NucleusValue) => {
      nmrChart.visible = nucleus === Nucleus.PROTON;
      carbonChart.visible = nucleus === Nucleus.CARBON;
    };
    model.nucleusProperty.link(nucleusListener);
    const nmrTitleProperty = new DerivedProperty(
      [model.nucleusProperty, strings.nmrTitleStringProperty, strings.carbonTitleStringProperty],
      (nucleus, proton, carbon) => (nucleus === Nucleus.CARBON ? carbon : proton),
    );
    const nucleusRadio = radioGroup<NucleusValue>(
      model.nucleusProperty,
      [
        { value: Nucleus.PROTON, label: nmrStrings.protonStringProperty },
        { value: Nucleus.CARBON, label: nmrStrings.carbonStringProperty },
      ],
      nmrStrings.nucleusStringProperty,
      UNKNOWNS_SCREEN_VIEW_SETTINGS.NUCLEUS_RADIO_GROUP_MAX_WIDTH,
      "horizontal",
    );
    const title = (text: TReadOnlyProperty<string>) =>
      new Text(text, {
        font: TITLE_FONT,
        fill: SpectroscopyLabColors.textColorProperty,
        maxWidth: CHART_WIDTH - UNKNOWNS_SCREEN_VIEW_SETTINGS.TITLE_MAX_WIDTH_OFFSET,
      });
    const spectra = new VBox({
      align: "left",
      spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.SPECTRA_SPACING,
      children: [
        title(strings.irTitleStringProperty),
        irChart,
        new Node({ children: [], localBounds: new Bounds2(0, 0, 1, UNKNOWNS_SCREEN_VIEW_SETTINGS.SPECTRA_MAX_Y) }),
        new HBox({
          spacing: UNKNOWNS_SCREEN_VIEW_SETTINGS.SPECTRA_ITEM_4_SPACING,
          children: [title(nmrTitleProperty), nucleusRadio],
        }),
        new Node({ children: [nmrChart, carbonChart] }),
      ],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + UNKNOWNS_SCREEN_VIEW_SETTINGS.SPECTRA_TOP_OFFSET,
    });

    // ── Reset All ───────────────────────────────────────────────────────────────
    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => model.reset(),
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });

    this.children = [candidatesGroup, infoPanel, spectra, resetAllButton];
    this.addChild(
      new Node({ pdomOrder: [irChart, nucleusRadio, nmrChart, carbonChart, infoPanel, grid, resetAllButton] }),
    );

    this.disposeUnknownsScreenView = () => {
      model.unknownProperty.unlink(unknownListener);
      marksMultilink.dispose();
      resultMultilink.dispose();
      infoMultilink.dispose();
      infoPanel.boundsProperty.unlink(anchorInfoPanel);
      irCurve.dispose();
      nmrCurve.dispose();
      nmrIntegral.dispose();
      carbonCurve.dispose();
      nmrTitleProperty.dispose();
      model.nucleusProperty.unlink(nucleusListener);
    };
  }

  public override dispose(): void {
    this.disposeUnknownsScreenView();
    super.dispose();
  }
}
