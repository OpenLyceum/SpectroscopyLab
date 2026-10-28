/**
 * Geometry.ts
 *
 * Small allocation-light 3-vector helpers and the three measurements the viewer
 * reports: distance (Å), bond angle (degrees) and dihedral/torsion angle (degrees,
 * IUPAC sign convention, −180 to 180).
 */

export type Vec3 = [number, number, number];

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return [x, y, z];
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Angle a–b–c at vertex b, degrees. */
export function angle(a: Vec3, b: Vec3, c: Vec3): number {
  const u = normalize(subtract(a, b));
  const v = normalize(subtract(c, b));
  const cosine = Math.min(1, Math.max(-1, dot(u, v)));
  return (Math.acos(cosine) * 180) / Math.PI;
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
