/**
 * UVVisScreenSummaryContent.ts
 *
 * The accessible screen summary for the UV-Vis screen. Its current-details paragraph is live: it
 * names the molecule and model and compares the predicted and measured λmax.
 */

import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import { ElectronicModel, type UVVisModel } from "../model/UVVisModel.js";
import { uvMoleculeName } from "./UVVisScreenView.js";

export class UVVisScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: UVVisModel) {
    const a11y = StringManager.getInstance().getUVVisA11yStrings();
    const strings = StringManager.getInstance().getUVVisStrings();

    // ScreenSummaryContent lives as long as its ScreenView (the whole sim), so this is never disposed.
    const currentDetailsProperty = DerivedProperty.deriveAny(
      [
        model.viewer.moleculeProperty,
        model.predictionProperty,
        model.measuredWavelengthProperty,
        model.electronicModelProperty,
        a11y.currentDetailsStringProperty,
        a11y.noPredictionStringProperty,
      ],
      () => {
        const prediction = model.predictionProperty.value;
        const measured = model.measuredWavelengthProperty.value;
        return StringUtils.fillIn(a11y.currentDetailsStringProperty.value, {
          molecule: uvMoleculeName(model),
          model:
            model.electronicModelProperty.value === ElectronicModel.BOX
              ? strings.boxStringProperty.value
              : strings.hueckelStringProperty.value,
          predicted: prediction ? toFixed(prediction.wavelength, 0) : a11y.noPredictionStringProperty.value,
          measured: measured === null ? "" : toFixed(measured, 0),
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
