/**
 * AtomStyle.ts
 *
 * Atom colours for the viewer. These are scientific data (Jmol's CPK table in Elements.ts), not
 * theme, so they live in the model rather than SpectroscopyLabColors.ts — the same carve-out as
 * MolScope. Carbon is lightened from Jmol's #909090 so it reads on the dark default background.
 */

import type { ElementData } from "./structure/Elements.js";

const CARBON_COLOR = 0xa8a8a8;

export function elementColor(element: ElementData | undefined): number {
  if (!element) {
    return 0xff1493;
  }
  return element.number === 6 ? CARBON_COLOR : element.color;
}
