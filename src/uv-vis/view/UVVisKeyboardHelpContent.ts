/**
 * UVVisKeyboardHelpContent.ts
 *
 * Keyboard Shortcuts dialog for the UV-Vis screen: the molecule viewer and the energy-level
 * diagram on the left; the concentration and path-length sliders and the stock basic actions on
 * the right. Wired via the Screen's createKeyboardHelpNode.
 */

import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import {
  createEnergyLevelsKeyboardHelpSection,
  createViewerKeyboardHelpSection,
} from "../../common/view/SpectroscopyLabKeyboardHelpSections.js";

export class UVVisKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [createViewerKeyboardHelpSection(), createEnergyLevelsKeyboardHelpSection()],
      [new SliderControlsKeyboardHelpSection(), new BasicActionsKeyboardHelpSection()],
    );
  }
}
