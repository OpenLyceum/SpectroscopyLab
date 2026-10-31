/**
 * SpectroscopyLabPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in spectroscopyLabQueryParameters.
 *
 * Remove the example preference (and its query parameter / UI control) if the
 * sim has no sim-specific preferences.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import SpectroscopyLabNamespace from "../SpectroscopyLabNamespace.js";
import spectroscopyLabQueryParameters from "./spectroscopyLabQueryParameters.js";

export class SpectroscopyLabPreferencesModel {
  /** Plot IR spectra as absorbance instead of transmittance; starts from the `absorbance` query parameter. */
  public readonly absorbanceProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.absorbanceProperty = new BooleanProperty(
      spectroscopyLabQueryParameters.absorbance,
      tandem ? { tandem: tandem.createTandem("absorbanceProperty") } : undefined,
    );
  }

  public reset(): void {
    this.absorbanceProperty.reset();
  }

  public dispose(): void {
    this.absorbanceProperty.dispose();
  }
}

SpectroscopyLabNamespace.register("SpectroscopyLabPreferencesModel", SpectroscopyLabPreferencesModel);
