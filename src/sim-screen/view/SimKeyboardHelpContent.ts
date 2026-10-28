/**
 * SimKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 * The template's only interactions are buttons and Reset All, so a single
 * basic-actions section covers the available keyboard controls. When the sim
 * grows, fill the right column (pattern stubbed below).
 */

import {
  BasicActionsKeyboardHelpSection,
  // SliderControlsKeyboardHelpSection,
  // TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class SimKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const leftColumn = [new BasicActionsKeyboardHelpSection()];

    // Right column — uncomment when the sim adds sliders and/or TimeControlNode:
    // const rightColumn = [
    //   new SliderControlsKeyboardHelpSection(),
    //   // new TimeControlsKeyboardHelpSection(),
    // ];
    const rightColumn: never[] = [];

    super(leftColumn, rightColumn);
  }
}
