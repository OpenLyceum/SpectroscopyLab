/**
 * SpectroscopyLabHotkeyData.ts
 *
 * Key bindings for the focused molecule viewer and spectrum charts. Each is HotkeyData, read both
 * by the KeyboardListener that handles it and by the keyboard-help row that documents it, so the
 * two cannot drift apart. Viewer keys are copied from MolScope.
 */

import { HotkeyData } from "scenerystack/scenery";
import { StringManager } from "../i18n/StringManager.js";

const REPO_NAME = "spectroscopy-lab";
const keyboardHelp = StringManager.getInstance().getKeyboardHelpStrings();

const SpectroscopyLabHotkeyData = {
  ROTATE: new HotkeyData({
    keys: ["arrowLeft", "arrowRight", "arrowUp", "arrowDown"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.rotateStringProperty,
  }),
  ZOOM_IN: new HotkeyData({
    keys: ["equals", "plus"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.zoomInStringProperty,
  }),
  ZOOM_OUT: new HotkeyData({
    keys: ["minus"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.zoomOutStringProperty,
  }),
  RESET_VIEW: new HotkeyData({
    keys: ["home"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.resetViewStringProperty,
  }),
  NEXT_ATOM: new HotkeyData({
    keys: ["n"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.nextAtomStringProperty,
  }),
  PREVIOUS_ATOM: new HotkeyData({
    keys: ["p"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.previousAtomStringProperty,
  }),
  PICK_ATOM: new HotkeyData({
    keys: ["enter", "space"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.pickAtomStringProperty,
  }),
  NEXT_PEAK: new HotkeyData({
    keys: ["arrowRight", "arrowDown"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.nextPeakStringProperty,
  }),
  PREVIOUS_PEAK: new HotkeyData({
    keys: ["arrowLeft", "arrowUp"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.previousPeakStringProperty,
  }),
  CLEAR_PEAK: new HotkeyData({
    keys: ["escape"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.clearPeakStringProperty,
  }),
  HIGHER_ORBITAL: new HotkeyData({
    keys: ["arrowUp", "arrowRight"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.higherOrbitalStringProperty,
  }),
  LOWER_ORBITAL: new HotkeyData({
    keys: ["arrowDown", "arrowLeft"],
    repoName: REPO_NAME,
    keyboardHelpDialogLabelStringProperty: keyboardHelp.lowerOrbitalStringProperty,
  }),
} as const;

export default SpectroscopyLabHotkeyData;
