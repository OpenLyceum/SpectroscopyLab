/**
 * InfraredScreenSummaryContent.ts
 *
 * The accessible screen summary for the Infrared screen. Its current-details paragraph is live:
 * it names the molecule, counts its normal modes and describes the selected peak.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { nameKey } from "../../common/model/library/SpectroscopyLibrary.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { InfraredModel } from "../model/InfraredModel.js";
import { describeLine, describePeak } from "./InfraredScreenView.js";

export class InfraredScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: InfraredModel) {
    const stringManager = StringManager.getInstance();
    const a11y = stringManager.getInfraredA11yStrings();
    const names = stringManager.getMoleculeNames() as unknown as Record<string, TReadOnlyProperty<string>>;

    // ScreenSummaryContent lives as long as its ScreenView (the whole sim), so this is never disposed.
    const currentDetailsProperty = DerivedProperty.deriveAny(
      [
        model.viewer.moleculeProperty,
        model.peaksProperty,
        model.selectedPeakProperty,
        model.selectedLineDataProperty,
        model.fineStructureShownProperty,
        a11y.currentDetailsStringProperty,
        a11y.noSelectionStringProperty,
        a11y.peakStringProperty,
      ],
      () => {
        const molecule = model.viewer.molecule;
        const peak = model.selectedPeak;
        const line = model.fineStructureShownProperty.value ? model.selectedLineDataProperty.value : null;
        const species = line ? model.fineProperty.value?.isotopologues[line.isotopologue] : undefined;
        const selection = line && species ? describeLine(line, species.label) : peak ? describePeak(peak) : null;
        return StringUtils.fillIn(a11y.currentDetailsStringProperty.value, {
          molecule: molecule ? (names[`${nameKey(molecule.id)}StringProperty`]?.value ?? molecule.id) : "",
          count: model.peaksProperty.value.length,
          selection: selection ?? a11y.noSelectionStringProperty.value,
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
