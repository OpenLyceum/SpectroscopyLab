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
import { loadMolecule } from "../../common/model/library/SpectroscopyLibrary.js";
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
import { SpectrumChartNode } from "../../common/view/SpectrumChartNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import { IR_RANGE } from "../../infrared/model/InfraredModel.js";
import { CARBON_SHIFT_RANGE, Nucleus, type NucleusValue, SHIFT_RANGE } from "../../nmr/model/NMRModel.js";
import { moleculeName } from "../../nmr/view/NMRScreenView.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import { SCREEN_VIEW_MARGIN } from "../../SpectroscopyLabConstants.js";
import { degreeOfUnsaturation, formulaText, molecularIonCluster } from "../model/MolecularFormula.js";
import { GuessResult, LEVEL_COUNT, type UnknownsModel } from "../model/UnknownsModel.js";
import { UnknownsScreenSummaryContent } from "./UnknownsScreenSummaryContent.js";

const THUMB_WIDTH = 184;
const THUMB_HEIGHT = 112;
const CHART_WIDTH = 500;
const CHART_HEIGHT = 175;
const BAR_MAX_HEIGHT = 46;
const BAR_WIDTH = 16;
const TITLE_FONT = new PhetFont({ size: 15, weight: "bold" });
const INFO_FONT = new PhetFont(13);
const NAME_FONT = new PhetFont(13);
const MARK_FONT = new PhetFont({ size: 64, weight: "bold" });

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

    // ── Candidates ──────────────────────────────────────────────────────────────
    const question = new Text(strings.questionStringProperty, {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: 2 * THUMB_WIDTH,
    });
    const grid = new VBox({ spacing: 10, align: "left" });
    const feedback = new Text("", {
      font: INFO_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: 2 * THUMB_WIDTH + 20,
    });
    const candidatesGroup = new VBox({
      align: "left",
      spacing: 8,
      children: [question, grid, feedback],
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + 12,
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
        const name = new Text(moleculeName(molecule.id), {
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
        const frame = new Rectangle(-3, -3, THUMB_WIDTH + 6, THUMB_HEIGHT + 6, {
          stroke: SpectroscopyLabColors.rightAnswerColorProperty,
          lineWidth: 4,
          cornerRadius: 6,
          visible: false,
        });
        const plate = new Rectangle(0, 0, THUMB_WIDTH, THUMB_HEIGHT, {
          fill: SpectroscopyLabColors.chartBackgroundColorProperty,
          cornerRadius: 4,
        });
        const content = new VBox({
          spacing: 4,
          children: [new Node({ children: [plate, thumbnail, mark, frame] }), name],
        });
        const button = new RectangularPushButton({
          ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
          content,
          xMargin: 6,
          yMargin: 6,
          listener: () => model.guess(molecule.id),
          accessibleName: moleculeName(molecule.id),
        });
        return { id: molecule.id, button, content, mark, frame };
      });
      for (let i = 0; i < buttons.length; i += 2) {
        grid.addChild(new HBox({ spacing: 10, children: buttons.slice(i, i + 2).map((b) => b.button) }));
      }
      updateMarks();
    };
    const updateMarks = () => {
      const unknown = model.unknownProperty.value;
      for (const entry of buttons) {
        const wrong = model.wrongGuessesProperty.value.includes(entry.id);
        const right = model.solved && entry.id === unknown?.target.id;
        entry.mark.visible = wrong;
        entry.frame.visible = right;
        entry.button.enabled = !(wrong || model.solved);
      }
      const result = model.resultProperty.value;
      const lastWrong = model.wrongGuessesProperty.value.at(-1);
      feedback.string = model.loadErrorProperty.value
        ? strings.loadErrorStringProperty.value
        : result === GuessResult.CORRECT && unknown
          ? StringUtils.fillIn(strings.correctStringProperty.value, { name: moleculeName(unknown.target.id) })
          : result === GuessResult.INCORRECT && lastWrong
            ? StringUtils.fillIn(strings.incorrectStringProperty.value, { name: moleculeName(lastWrong) })
            : unknown
              ? ""
              : strings.noFamiliesStringProperty.value;
      feedback.fill =
        result === GuessResult.CORRECT
          ? SpectroscopyLabColors.regionTextColorProperty
          : SpectroscopyLabColors.textColorProperty;
      if (result !== GuessResult.NONE && feedback.string) {
        grid.addAccessibleResponse(feedback.string);
      }
    };
    const unknownListener = () => {
      rebuildCandidates().catch(() => {
        grid.removeAllChildren();
        model.loadErrorProperty.value = true;
      });
    };
    model.unknownProperty.link(unknownListener);
    const marksMultilink = Multilink.multilink(
      [model.wrongGuessesProperty, model.resultProperty, model.loadErrorProperty],
      updateMarks,
    );

    // ── Formula, unsaturation, molecular ion, controls ─────────────────────────
    const formulaLine = new Text("", {
      font: TITLE_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: 200,
    });
    const unsaturationLine = new Text("", {
      font: INFO_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: 200,
    });
    const ionBars = new Node();
    const ionGroup = new VBox({
      align: "left",
      spacing: 4,
      children: [
        new Text(strings.ionClusterStringProperty, {
          font: INFO_FONT,
          fill: SpectroscopyLabColors.textColorProperty,
          maxWidth: 180,
        }),
        ionBars,
      ],
    });
    const scoreText = new Text("", { font: TITLE_FONT, fill: SpectroscopyLabColors.textColorProperty, maxWidth: 160 });
    const levelRadio = radioGroup(
      model.levelProperty,
      Array.from({ length: LEVEL_COUNT }, (_, i) => ({
        value: i + 1,
        label: new DerivedProperty([strings.levelValueStringProperty], (pattern) =>
          StringUtils.fillIn(pattern, { level: i + 1 }),
        ),
      })),
      strings.levelStringProperty,
      30,
      "horizontal",
    );
    const newButton = pushButton(strings.newUnknownStringProperty, () => model.newUnknown());
    const infoPanel = new SpectroscopyLabPanel(
      new HBox({
        spacing: 26,
        align: "top",
        children: [
          new VBox({ align: "left", spacing: 6, children: [formulaLine, unsaturationLine, ionGroup] }),
          new VBox({
            align: "left",
            spacing: 10,
            children: [
              new HBox({ spacing: 8, children: [label(strings.levelStringProperty, 60), levelRadio] }),
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
                  font: new PhetFont(10),
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
      yRange: new Range(0, 100),
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
      yRange: new Range(0, 1.08),
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
      yRange: new Range(0, 1.08),
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
      40,
      "horizontal",
    );
    const title = (text: TReadOnlyProperty<string>) =>
      new Text(text, { font: TITLE_FONT, fill: SpectroscopyLabColors.textColorProperty, maxWidth: CHART_WIDTH - 120 });
    const spectra = new VBox({
      align: "left",
      spacing: 6,
      children: [
        title(strings.irTitleStringProperty),
        irChart,
        new Node({ children: [], localBounds: new Bounds2(0, 0, 1, 4) }),
        new HBox({ spacing: 24, children: [title(nmrTitleProperty), nucleusRadio] }),
        new Node({ children: [nmrChart, carbonChart] }),
      ],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + 8,
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
