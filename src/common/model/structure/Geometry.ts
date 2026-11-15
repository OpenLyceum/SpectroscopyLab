/**
 * Geometry.ts
 *
 * Small allocation-light 3-vector helpers and dihedral/torsion angle (degrees,
 * IUPAC sign convention, −180 to 180).
 */

export type Vec3 = [number, number, number];

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}

/** Dihedral a–b–c–d about the b–c axis, degrees in (−180, 180]. */
export function dihedral(a: Vec3, b: Vec3, c: Vec3, d: Vec3): number {
  const b1 = subtract(b, a);
  const b2 = subtract(c, b);
  const b3 = subtract(d, c);
  const n1 = cross(b1, b2);
  const n2 = cross(b2, b3);
  const x = dot(n1, n2);
  const y = dot(cross(n1, n2), normalize(b2));
  return (Math.atan2(y, x) * 180) / Math.PI;
}
