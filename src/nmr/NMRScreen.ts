/**
 * NMRScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createNMRIcon() in src/common/SpectroscopyLabScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createNMRIcon } from "../common/SpectroscopyLabScreenIcons.js";
import SpectroscopyLabColors from "../SpectroscopyLabColors.js";
import { NMRModel } from "./model/NMRModel.js";
import { NMRKeyboardHelpContent } from "./view/NMRKeyboardHelpContent.js";
import { NMRScreenView } from "./view/NMRScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type NMRScreenOptions = ScreenOptions & { tandem: Tandem };

export class NMRScreen extends Screen<NMRModel, NMRScreenView> {
  public constructor(options: NMRScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new NMRModel(),
      // View factory — receives the model instance
      (model) =>
        new NMRScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<NMRScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new NMRKeyboardHelpContent(),
          homeScreenIcon: createNMRIcon(),
          navigationBarIcon: createNMRIcon(),
        },
        options,
      ),
    );
  }
}
