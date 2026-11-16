import { SPECTROSCOPY_LAB_PREFERENCES_NODE_SETTINGS } from "../SpectroscopyLabConstants.js";
/**
 * SpectroscopyLabPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to SpectroscopyLabPreferencesModel Properties (whose initial values come from
 * spectroscopyLabQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { StringManager } from "../i18n/StringManager.js";
import SpectroscopyLabColors from "../SpectroscopyLabColors.js";
import SpectroscopyLabNamespace from "../SpectroscopyLabNamespace.js";
import type { SpectroscopyLabPreferencesModel } from "./SpectroscopyLabPreferencesModel.js";

export class SpectroscopyLabPreferencesNode extends VBox {
  public constructor(preferencesModel: SpectroscopyLabPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    // The Preferences dialog is always white, so use the dark "light control surface"
    // colors (readable on white in both default and projector profiles), not textColorProperty
    // (which is near-white in default mode and would be invisible on the white dialog).
    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: SPECTROSCOPY_LAB_PREFERENCES_NODE_SETTINGS.HEADER_FONT_SIZE, weight: "bold" }),
      fill: SpectroscopyLabColors.controlSurfaceTextColorProperty,
    });

    const absorbanceCheckbox = new Checkbox(
      preferencesModel.absorbanceProperty,
      new Text(prefStrings.absorbanceStringProperty, {
        font: new PhetFont(SPECTROSCOPY_LAB_PREFERENCES_NODE_SETTINGS.ABSORBANCE_CHECKBOX_FONT_SIZE),
        fill: SpectroscopyLabColors.controlSurfaceTextColorProperty,
      }),
      {
        checkboxColor: SpectroscopyLabColors.controlSurfaceTextColorProperty,
        checkboxColorBackground: SpectroscopyLabColors.controlSurfaceColorProperty,
        spacing: SPECTROSCOPY_LAB_PREFERENCES_NODE_SETTINGS.ABSORBANCE_CHECKBOX_SPACING,
        accessibleName: prefStrings.absorbanceStringProperty,
        ...(tandem && { tandem: tandem.createTandem("absorbanceCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: SPECTROSCOPY_LAB_PREFERENCES_NODE_SETTINGS.CONSTRUCTOR_SPACING,
      children: [header, absorbanceCheckbox],
    });
  }
}

SpectroscopyLabNamespace.register("SpectroscopyLabPreferencesNode", SpectroscopyLabPreferencesNode);
