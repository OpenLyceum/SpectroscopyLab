/**
 * UnknownsScreenSummaryContent.ts
 *
 * The accessible screen summary for the Unknowns screen. Its current-details paragraph is live:
 * level, formula, number of candidates, score, and the last guess.
 */

import { DerivedProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import { moleculeName } from "../../nmr/view/NMRScreenView.js";
import { formulaText } from "../model/MolecularFormula.js";
import { GuessResult, type UnknownsModel } from "../model/UnknownsModel.js";

export class UnknownsScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: UnknownsModel) {
    const a11y = StringManager.getInstance().getUnknownsA11yStrings();
    const strings = StringManager.getInstance().getUnknownsStrings();

    // ScreenSummaryContent lives as long as its ScreenView (the whole sim), so this is never disposed.
    const currentDetailsProperty = DerivedProperty.deriveAny(
      [
        model.levelProperty,
        model.unknownProperty,
        model.scoreProperty,
        model.roundsProperty,
        model.resultProperty,
        model.wrongGuessesProperty,
        model.isLoadingProperty,
        model.loadErrorProperty,
        a11y.currentDetailsStringProperty,
        strings.loadingStringProperty,
        strings.loadErrorStringProperty,
        strings.correctStringProperty,
        strings.incorrectStringProperty,
        ...Object.values(StringManager.getInstance().getMoleculeNames()),
      ],
      () => {
        const unknown = model.unknownProperty.value;
        const lastWrong = model.wrongGuessesProperty.value.at(-1);
        const status = model.isLoadingProperty.value
          ? strings.loadingStringProperty.value
          : model.loadErrorProperty.value
            ? strings.loadErrorStringProperty.value
            : model.resultProperty.value === GuessResult.CORRECT && unknown
              ? StringUtils.fillIn(strings.correctStringProperty.value, { name: moleculeName(unknown.target.id) })
              : model.resultProperty.value === GuessResult.INCORRECT && lastWrong
                ? StringUtils.fillIn(strings.incorrectStringProperty.value, { name: moleculeName(lastWrong) })
                : "";
        return StringUtils.fillIn(a11y.currentDetailsStringProperty.value, {
          level: model.levelProperty.value,
          formula: unknown ? formulaText(unknown.target) : "",
          count: unknown?.candidates.length ?? 0,
          score: model.scoreProperty.value,
          rounds: model.roundsProperty.value,
          status,
        });
      },
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetailsProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
