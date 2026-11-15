/**
 * UVVisDescriptions.ts
 *
 * Shared UV-Vis description helpers for the screen view and summary.
 */

import { moleculeName } from "../../common/view/moleculeName.js";
import type { UVVisModel } from "../model/UVVisModel.js";

/** Spoken name of the molecule (shared with the summary). */
export function uvMoleculeName(model: UVVisModel): string {
  const molecule = model.viewer.molecule;
  return molecule ? moleculeName(molecule.id) : "";
}
