/**
 * UnknownsKeyboardHelpContent.ts
 *
 * Keyboard Shortcuts dialog for the Unknowns screen: the candidates and controls are standard
 * buttons and radio buttons, so the stock basic-actions section covers them. Wired via the
 * Screen's createKeyboardHelpNode.
 */

import { BasicActionsKeyboardHelpSection, TwoColumnKeyboardHelpContent } from "scenerystack/scenery-phet";

export class UnknownsKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new BasicActionsKeyboardHelpSection()], []);
  }
}
