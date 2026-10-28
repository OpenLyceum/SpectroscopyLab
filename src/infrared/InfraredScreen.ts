/**
 * InfraredScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createInfraredIcon() in src/common/SpectroscopyLabScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createInfraredIcon } from "../common/SpectroscopyLabScreenIcons.js";
import type { SpectroscopyLabPreferencesModel } from "../preferences/SpectroscopyLabPreferencesModel.js";
import SpectroscopyLabColors from "../SpectroscopyLabColors.js";
import { InfraredModel } from "./model/InfraredModel.js";
import { InfraredKeyboardHelpContent } from "./view/InfraredKeyboardHelpContent.js";
import { InfraredScreenView } from "./view/InfraredScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type InfraredScreenOptions = ScreenOptions & { tandem: Tandem };

export class InfraredScreen extends Screen<InfraredModel, InfraredScreenView> {
  public constructor(preferences: SpectroscopyLabPreferencesModel, options: InfraredScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new InfraredModel(preferences.absorbanceProperty),
      // View factory — receives the model instance
      (model) =>
        new InfraredScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<InfraredScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new InfraredKeyboardHelpContent(),
          homeScreenIcon: createInfraredIcon(),
          navigationBarIcon: createInfraredIcon(),
        },
        options,
      ),
    );
  }
}
