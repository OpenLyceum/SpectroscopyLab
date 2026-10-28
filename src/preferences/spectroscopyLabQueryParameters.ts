/**
 * spectroscopyLabQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in SpectroscopyLabPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?absorbance=true` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import SpectroscopyLabNamespace from "../SpectroscopyLabNamespace.js";

const spectroscopyLabQueryParameters = QueryStringMachine.getAll({
  /**
   * Plot infrared spectra as absorbance (peaks up) instead of percent transmittance (dips down).
   * Public, so a teacher can link straight to the absorbance view with ?absorbance=true.
   */
  absorbance: {
    type: "boolean",
    defaultValue: false,
    public: true,
  },
});

SpectroscopyLabNamespace.register("spectroscopyLabQueryParameters", spectroscopyLabQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default spectroscopyLabQueryParameters;
