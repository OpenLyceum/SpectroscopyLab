/**
 * UVVisScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createUVVisIcon() in src/common/SpectroscopyLabScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createUVVisIcon } from "../common/SpectroscopyLabScreenIcons.js";
import SpectroscopyLabColors from "../SpectroscopyLabColors.js";
import { UVVisModel } from "./model/UVVisModel.js";
import { UVVisKeyboardHelpContent } from "./view/UVVisKeyboardHelpContent.js";
import { UVVisScreenView } from "./view/UVVisScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type UVVisScreenOptions = ScreenOptions & { tandem: Tandem };

export class UVVisScreen extends Screen<UVVisModel, UVVisScreenView> {
  public constructor(options: UVVisScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new UVVisModel(),
      // View factory — receives the model instance
      (model) =>
        new UVVisScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<UVVisScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new UVVisKeyboardHelpContent(),
          homeScreenIcon: createUVVisIcon(),
          navigationBarIcon: createUVVisIcon(),
        },
        options,
      ),
    );
  }
}
