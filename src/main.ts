/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "./i18n/StringManager.js";
import { InfraredScreen } from "./infrared/InfraredScreen.js";
import { NMRScreen } from "./nmr/NMRScreen.js";
import { SpectroscopyLabPreferencesModel } from "./preferences/SpectroscopyLabPreferencesModel.js";
import { SpectroscopyLabPreferencesNode } from "./preferences/SpectroscopyLabPreferencesNode.js";
import SpectroscopyLabColors from "./SpectroscopyLabColors.js";
import { UnknownsScreen } from "./unknowns/UnknownsScreen.js";
import { UVVisScreen } from "./uv-vis/UVVisScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from spectroscopyLabQueryParameters.
  const simPreferences = new SpectroscopyLabPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new InfraredScreen(simPreferences, {
      name: stringManager.getScreenNames().infraredStringProperty,
      tandem: Tandem.ROOT.createTandem("infraredScreen"),
      backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
    }),
    new NMRScreen({
      name: stringManager.getScreenNames().nmrStringProperty,
      tandem: Tandem.ROOT.createTandem("nmrScreen"),
      backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
    }),
    new UVVisScreen({
      name: stringManager.getScreenNames().uvVisStringProperty,
      tandem: Tandem.ROOT.createTandem("uvVisScreen"),
      backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
    }),
    new UnknownsScreen({
      name: stringManager.getScreenNames().unknownsStringProperty,
      tandem: Tandem.ROOT.createTandem("unknownsScreen"),
      backgroundColorProperty: SpectroscopyLabColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new SpectroscopyLabPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
