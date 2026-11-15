/**
 * moleculeName.ts
 *
 * Display name for a library molecule id (shared across technique screens).
 */

import { lookupStringProperty, StringManager } from "../../i18n/StringManager.js";
import { nameKey } from "../model/library/SpectroscopyLibrary.js";

/** The molecule's display name. */
export function moleculeName(id: string): string {
  const names = StringManager.getInstance().getMoleculeNames();
  return lookupStringProperty(names, `${nameKey(id)}StringProperty`)?.value ?? id;
}
