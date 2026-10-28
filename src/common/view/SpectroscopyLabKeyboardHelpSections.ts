/**
 * SpectroscopyLabKeyboardHelpSections.ts
 *
 * Keyboard-help sections for the focused molecule viewer and spectrum chart. Rows are built from
 * {@link SpectroscopyLabHotkeyData}, so they always match the keys the listeners handle.
 */

import {
  KeyboardHelpIconFactory,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  TextKeyNode,
} from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabHotkeyData from "../SpectroscopyLabHotkeyData.js";

export const createViewerKeyboardHelpSection = (): KeyboardHelpSection =>
  new KeyboardHelpSection(StringManager.getInstance().getKeyboardHelpStrings().viewerSectionStringProperty, [
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.ROTATE, {
      icon: KeyboardHelpIconFactory.arrowKeysRowIcon(),
    }),
    // The stock icon map has no "=" key, so the zoom rows draw their own key caps.
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.ZOOM_IN, {
      icon: KeyboardHelpIconFactory.iconOrIcon(new TextKeyNode("+"), new TextKeyNode("=")),
    }),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.ZOOM_OUT, { icon: new TextKeyNode("−") }),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.RESET_VIEW),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.NEXT_ATOM),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.PREVIOUS_ATOM),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.PICK_ATOM, {
      icon: KeyboardHelpIconFactory.spaceOrEnter(),
    }),
  ]);

export const createSpectrumKeyboardHelpSection = (): KeyboardHelpSection =>
  new KeyboardHelpSection(StringManager.getInstance().getKeyboardHelpStrings().spectrumSectionStringProperty, [
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.NEXT_PEAK),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.PREVIOUS_PEAK),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.CLEAR_PEAK),
  ]);

export const createEnergyLevelsKeyboardHelpSection = (): KeyboardHelpSection =>
  new KeyboardHelpSection(StringManager.getInstance().getKeyboardHelpStrings().levelsSectionStringProperty, [
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.HIGHER_ORBITAL),
    KeyboardHelpSectionRow.fromHotkeyData(SpectroscopyLabHotkeyData.LOWER_ORBITAL),
  ]);
