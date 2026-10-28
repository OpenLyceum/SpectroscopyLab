/**
 * InfraredKeyboardHelpContent.ts
 *
 * Keyboard Shortcuts dialog for the Infrared screen: the molecule viewer and spectrum on the left,
 * the stock basic-actions and slider sections on the right. Wired via the Screen's
 * createKeyboardHelpNode.
 */

import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import {
  createSpectrumKeyboardHelpSection,
  createViewerKeyboardHelpSection,
} from "../../common/view/SpectroscopyLabKeyboardHelpSections.js";

export class InfraredKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [createViewerKeyboardHelpSection(), createSpectrumKeyboardHelpSection()],
      [new BasicActionsKeyboardHelpSection(), new SliderControlsKeyboardHelpSection()],
    );
  }
}
