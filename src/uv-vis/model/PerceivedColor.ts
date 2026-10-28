/**
 * PerceivedColor.ts
 *
 * The colour of a substance seen in white light: what is left after it absorbs. The transmitted
 * spectrum T(λ) = 10^(−A(λ)) is weighted by the CIE 1931 colour-matching functions to give XYZ,
 * converted to linear sRGB, white-balanced so that T = 1 is exactly white, and gamma-encoded.
 *
 * Colour-matching functions: the multi-lobe Gaussian fit of Wyman, Sloan & Shirley, "Simple
 * Analytic Approximations to the CIE XYZ Color Matching Functions", JCGT 2(2), 2013 — accurate to a
 * few per cent and table-free.
 */

const STEP_NM = 2;
const VISIBLE_MIN = 380;
const VISIBLE_MAX = 780;

function lobe(lambda: number, mu: number, below: number, above: number): number {
  const t = (lambda - mu) / (lambda < mu ? below : above);
  return Math.exp(-0.5 * t * t);
}

/** CIE 1931 2° observer, x̄ ȳ z̄ at a wavelength in nm. */
export function colorMatching(lambda: number): [number, number, number] {
  return [
    1.056 * lobe(lambda, 599.8, 37.9, 31.0) +
      0.362 * lobe(lambda, 442.0, 16.0, 26.7) -
      0.065 * lobe(lambda, 501.1, 20.4, 26.2),
    0.821 * lobe(lambda, 568.8, 46.9, 40.5) + 0.286 * lobe(lambda, 530.9, 16.3, 31.1),
    1.217 * lobe(lambda, 437.0, 11.8, 36.0) + 0.681 * lobe(lambda, 459.0, 26.0, 13.8),
  ];
}

function linearRgb(transmittance: (lambda: number) => number): [number, number, number] {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let lambda = VISIBLE_MIN; lambda <= VISIBLE_MAX; lambda += STEP_NM) {
    const t = transmittance(lambda);
    const [xb, yb, zb] = colorMatching(lambda);
    x += t * xb;
    y += t * yb;
    z += t * zb;
  }
  return [
    3.2406 * x - 1.5372 * y - 0.4986 * z,
    -0.9689 * x + 1.8758 * y + 0.0415 * z,
    0.0557 * x - 0.204 * y + 1.057 * z,
  ];
}

const WHITE = linearRgb(() => 1);

function gammaEncode(linear: number): number {
  const c = Math.min(1, Math.max(0, linear));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** sRGB components 0–255 of light transmitted through a sample with absorbance A(λ). */
export function perceivedColor(absorbance: (lambda: number) => number): [number, number, number] {
  const rgb = linearRgb((lambda) => 10 ** -absorbance(lambda));
  return [0, 1, 2].map((c) => Math.round(255 * gammaEncode((rgb[c] ?? 0) / (WHITE[c] ?? 1)))) as [
    number,
    number,
    number,
  ];
}
