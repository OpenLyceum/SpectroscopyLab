/**
 * NMRScreenSummaryContent.ts
 *
 * The accessible screen summary for the NMR screen. Its current-details paragraph is live: it
 * names the molecule, counts its signals at the current field and describes the selected one.
 */

import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { NMRModel } from "../model/NMRModel.js";
import { describeSignal, moleculeName } from "./NMRScreenView.js";

export class NMRScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: NMRModel) {
    const a11y = StringManager.getInstance().getNMRA11yStrings();

    // ScreenSummaryContent lives as long as its ScreenView (the whole sim), so this is never disposed.
    const currentDetailsProperty = DerivedProperty.deriveAny(
      [
        model.viewer.moleculeProperty,
        model.environmentsProperty,
        model.selectedSignalProperty,
        model.fieldProperty,
        a11y.currentDetailsStringProperty,
        a11y.noSelectionStringProperty,
        a11y.signalStringProperty,
      ],
      () => {
        const molecule = model.viewer.molecule;
        const signal = model.selectedSignal;
        return StringUtils.fillIn(a11y.currentDetailsStringProperty.value, {
          molecule: molecule ? moleculeName(molecule.id) : "",
          count: model.environmentsProperty.value.length,
          field: toFixed(model.fieldProperty.value, 0),
          selection: signal ? describeSignal(signal) : a11y.noSelectionStringProperty.value,
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
