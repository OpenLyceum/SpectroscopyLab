/**
 * NMRDescriptions.ts
 *
 * Shared NMR description helpers for the screen view and summary.
 */

import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { lookupStringProperty, StringManager } from "../../i18n/StringManager.js";
import { type CarbonEnvironment, carbonTypeName } from "../model/CarbonSpectrum.js";
import type { ProtonEnvironment } from "../model/ProtonSpectrum.js";

export { moleculeName } from "../../common/view/moleculeName.js";

/** Localised multiplicity word ("quartet"), falling back to the code ("ddt"). */
function multiplicityWord(code: string): string {
  const words = StringManager.getInstance().getNMRStrings().multiplicities;
  return lookupStringProperty(words, `${code}StringProperty`)?.value ?? code;
}

function isProton(signal: ProtonEnvironment | CarbonEnvironment): signal is ProtonEnvironment {
  return "multiplicity" in signal;
}

/** The spoken description of a signal. */
export function describeSignal(signal: ProtonEnvironment | CarbonEnvironment): string {
  const a11y = StringManager.getInstance().getNMRA11yStrings();
  return isProton(signal)
    ? StringUtils.fillIn(a11y.signalStringProperty.value, {
        label: signal.label,
        count: signal.atoms.length,
        shift: toFixed(signal.shift, 2),
        multiplicity: multiplicityWord(signal.multiplicity),
      })
    : StringUtils.fillIn(a11y.carbonSignalStringProperty.value, {
        label: signal.label,
        count: signal.atoms.length,
        type: carbonTypeName(signal.hydrogens),
        shift: toFixed(signal.shift, 1),
      });
}
