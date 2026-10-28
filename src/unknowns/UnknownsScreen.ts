/**
 * UnknownsScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createUnknownsIcon() in src/common/SpectroscopyLabScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createUnknownsIcon } from "../common/SpectroscopyLabScreenIcons.js";
import SpectroscopyLabColors from "../SpectroscopyLabColors.js";
import { UnknownsModel } from "./model/UnknownsModel.js";
import { UnknownsKeyboardHelpContent } from "./view/UnknownsKeyboardHelpContent.js";
import { UnknownsScreenView } from "./view/UnknownsScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type UnknownsScreenOptions = ScreenOptions & { tandem: Tandem };

export class UnknownsScreen extends Screen<UnknownsModel, UnknownsScreenView> {
  public constructor(options: UnknownsScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new UnknownsModel(),
      // View factory — receives the model instance
      (model) =>
        new UnknownsScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<UnknownsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new UnknownsKeyboardHelpContent(),
          homeScreenIcon: createUnknownsIcon(),
          navigationBarIcon: createUnknownsIcon(),
        },
        options,
      ),
    );
  }
}
