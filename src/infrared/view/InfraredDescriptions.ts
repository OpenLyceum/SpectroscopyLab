/**
 * InfraredDescriptions.ts
 *
 * Shared IR description helpers for the screen view and summary.
 */

import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import type { InfraredPeak } from "../../common/model/infrared/InfraredSpectrum.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { RotationalLine } from "../model/RotationalFineStructure.js";

/** "H³⁵Cl R(3): J 3 → 4 — 2945.1 cm⁻¹". */
export function describeLine(line: RotationalLine, isotopologue: string): string {
  return StringUtils.fillIn(StringManager.getInstance().getInfraredStrings().lineTitleStringProperty.value, {
    isotopologue,
    branch: line.branch,
    j: line.j,
    upper: line.branch === "R" ? line.j + 1 : line.j - 1,
    wavenumber: toFixed(line.wavenumber, 1),
  });
}

/** "C=O stretch" / "H–C–H bend", localised. */
export function modeName(peak: InfraredPeak): string {
  const strings = StringManager.getInstance().getInfraredStrings();
  return peak.character.kind === "stretch"
    ? StringUtils.fillIn(strings.stretchStringProperty.value, { bond: peak.character.label })
    : StringUtils.fillIn(strings.bendStringProperty.value, { angle: peak.character.label });
}

/** The spoken description of a peak. */
export function describePeak(peak: InfraredPeak): string {
  return StringUtils.fillIn(StringManager.getInstance().getInfraredA11yStrings().peakStringProperty.value, {
    mode: modeName(peak),
    wavenumber: toFixed(peak.wavenumber, 0),
    intensity: toFixed(peak.intensity, 0),
  });
}
