/**
 * MoleculeRenderer.ts
 *
 * A painter's-algorithm ball-and-stick renderer drawing straight to a 2D canvas context, trimmed
 * from MolScope's renderer (which follows Jmol's software renderer). Every frame it rotates and
 * projects the atoms, builds one list of depth-tagged primitives (shaded spheres, cylinder halves,
 * translucent orbital lobes), sorts it back to front, and paints. Highlight halos, the hover ring
 * and atom labels go on top. The last projection is kept for picking.
 */

import { elementColor } from "../model/AtomStyle.js";
import type { Molecule } from "../model/Molecule.js";
import type { OrbitalLobe } from "../model/MoleculeViewModel.js";
import type { Vec3 } from "../model/structure/Geometry.js";
import type { Rotation3 } from "../model/structure/Rotation3.js";

/** Camera distance in units of the bounding radius (Jmol's default `cameraDepth` is 3). */
const CAMERA_DEPTH = 3;
/** Sprite resolution for shaded spheres, px. */
const SPRITE_SIZE = 128;
/** Minimum pick radius, px. */
const MIN_PICK_RADIUS = 6;
/** Ball radius as a fraction of the van der Waals radius (Jmol's ball-and-stick is 20 %). */
const BALL_FRACTION = 0.25;
/** Stick radius, Å. */
const STICK_RADIUS = 0.11;
/** Orbital lobe radius for |c| = 1, Å, and the lobe centre's offset along the π normal per Å of radius. */
const LOBE_RADIUS = 1.6;
const LOBE_OFFSET = 0.9;
const LOBE_ALPHA = 0.62;

const Kind = {
  SPHERE: 0,
  CYLINDER: 1,
  LOBE: 2,
} as const;

/** One depth-sorted primitive; pooled and reused between frames. */
type Item = {
  kind: number;
  z: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Radius (sphere, lobe) or width (cylinder), px. */
  extent: number;
  color: number;
};

export type OverlayColors = {
  readonly label: string;
  readonly highlight: string;
  readonly hover: string;
  /** Lobe colours for positive and negative MO coefficients, 0xRRGGBB. */
  readonly lobePositive: number;
  readonly lobeNegative: number;
};

export type RenderInput = {
  readonly width: number;
  readonly height: number;
  readonly molecule: Molecule;
  readonly positions: Float64Array;
  readonly rotation: Rotation3;
  readonly center: Vec3;
  readonly radius: number;
  readonly zoom: number;
  readonly hovered: number | null;
  readonly highlighted: readonly number[];
  readonly labels: readonly (string | null)[] | null;
  readonly lobes: readonly OrbitalLobe[] | null;
  readonly colors: OverlayColors;
  readonly font: string;
};

export class MoleculeRenderer {
  private items: Item[] = [];
  private itemCount = 0;
  private order: number[] = [];
  private readonly sprites = new Map<number, HTMLCanvasElement>();
  private readonly cssCache = new Map<number, string>();

  // Last projection, for picking.
  private sx = new Float32Array(0);
  private sy = new Float32Array(0);
  private sz = new Float32Array(0);
  private sr = new Float32Array(0);
  private scale = 1;
  private cx = 0;
  private cy = 0;
  private depth = 1;

  public render(ctx: CanvasRenderingContext2D, input: RenderInput): void {
    this.project(input);
    this.itemCount = 0;
    this.addAtomsAndBonds(input);
    if (input.lobes) {
      this.addLobes(input.lobes, input);
    }
    this.paintItems(ctx);
    this.paintOverlays(ctx, input);
  }

  /** Front-most atom whose disc contains (x, y), or null. */
  public pick(x: number, y: number): number | null {
    let best: number | null = null;
    let bestZ = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < this.sx.length; i++) {
      const r = Math.max(this.sr[i] ?? 0, MIN_PICK_RADIUS);
      const dx = (this.sx[i] ?? 0) - x;
      const dy = (this.sy[i] ?? 0) - y;
      if (dx * dx + dy * dy <= r * r && (this.sz[i] ?? 0) > bestZ) {
        best = i;
        bestZ = this.sz[i] ?? 0;
      }
    }
    return best;
  }

  /** Screen position of atom i from the last frame. */
  public screenPosition(i: number): { x: number; y: number } | null {
    return i >= 0 && i < this.sx.length ? { x: this.sx[i] ?? 0, y: this.sy[i] ?? 0 } : null;
  }

  // ── Projection ───────────────────────────────────────────────────────────────

  private project(input: RenderInput): void {
    const { molecule, positions, rotation, center, width, height } = input;
    const n = molecule.elements.length;
    if (this.sx.length !== n) {
      this.sx = new Float32Array(n);
      this.sy = new Float32Array(n);
      this.sz = new Float32Array(n);
      this.sr = new Float32Array(n);
    }
    this.cx = width / 2;
    this.cy = height / 2;
    this.scale = (input.zoom * Math.min(width, height)) / 2 / input.radius;
    this.depth = CAMERA_DEPTH * input.radius;
    const v: Vec3 = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      this.projectPoint(
        (positions[3 * i] ?? 0) - center[0],
        (positions[3 * i + 1] ?? 0) - center[1],
        (positions[3 * i + 2] ?? 0) - center[2],
        rotation,
        v,
      );
      this.sx[i] = v[0];
      this.sy[i] = v[1];
      this.sz[i] = v[2];
      this.sr[i] = BALL_FRACTION * (molecule.elements[i]?.vdwRadius ?? 1.5) * this.scale * this.perspectiveFactor(v[2]);
    }
  }

  private perspectiveFactor(z: number): number {
    return this.depth / Math.max(this.depth - z, this.depth * 0.1);
  }

  /** Rotates a centred model-frame point and projects it to [screen x, screen y, depth z]. */
  private projectPoint(x: number, y: number, z: number, rotation: Rotation3, out: Vec3): Vec3 {
    rotation.apply(x, y, z, out);
    const f = this.perspectiveFactor(out[2]);
    out[0] = this.cx + out[0] * this.scale * f;
    out[1] = this.cy - out[1] * this.scale * f;
    return out;
  }

  // ── Building the item list ────────────────────────────────────────────────────

  private item(kind: number, z: number): Item {
    let it = this.items[this.itemCount];
    if (!it) {
      it = { kind, z, x1: 0, y1: 0, x2: 0, y2: 0, extent: 0, color: 0 };
      this.items.push(it);
    }
    it.kind = kind;
    it.z = z;
    this.itemCount++;
    return it;
  }

  private addAtomsAndBonds(input: RenderInput): void {
    const { molecule } = input;
    const n = molecule.elements.length;
    for (let i = 0; i < n; i++) {
      const it = this.item(Kind.SPHERE, this.sz[i] ?? 0);
      it.x1 = this.sx[i] ?? 0;
      it.y1 = this.sy[i] ?? 0;
      it.extent = this.sr[i] ?? 0;
      it.color = elementColor(molecule.elements[i]);
    }
    for (const bond of molecule.bonds) {
      this.addBond(bond.a, bond.b, bond.order, input);
    }
  }

  private addBond(a: number, b: number, order: number, input: RenderInput): void {
    const ax = this.sx[a] ?? 0;
    const ay = this.sy[a] ?? 0;
    const bx = this.sx[b] ?? 0;
    const by = this.sy[b] ?? 0;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) {
      return;
    }
    const za = this.sz[a] ?? 0;
    const zb = this.sz[b] ?? 0;
    const width = 2 * STICK_RADIUS * this.scale * this.perspectiveFactor((za + zb) / 2);
    // Start each half at the sphere surface so it does not paint over the ball's face.
    const trimA = Math.min(0.45, Math.sqrt(Math.max(0, (this.sr[a] ?? 0) ** 2 - (width / 2) ** 2)) / len);
    const trimB = Math.min(0.45, Math.sqrt(Math.max(0, (this.sr[b] ?? 0) ** 2 - (width / 2) ** 2)) / len);
    const strands = Math.max(1, Math.min(3, Math.round(order)));
    const strandWidth = strands > 1 ? width / (strands * 0.8) : width;
    const spacing = strands > 1 ? strandWidth * 1.3 : 0;
    const px = (-dy / len) * spacing;
    const py = (dx / len) * spacing;
    const ca = elementColor(input.molecule.elements[a]);
    const cb = elementColor(input.molecule.elements[b]);
    for (let s = 0; s < strands; s++) {
      const offset = s - (strands - 1) / 2;
      const ox = px * offset;
      const oy = py * offset;
      const x1 = ax + dx * trimA + ox;
      const y1 = ay + dy * trimA + oy;
      const x2 = bx - dx * trimB + ox;
      const y2 = by - dy * trimB + oy;
      const mx = (ax + bx) / 2 + ox;
      const my = (ay + by) / 2 + oy;
      const h1 = this.item(Kind.CYLINDER, (3 * za + zb) / 4);
      Object.assign(h1, { x1, y1, x2: mx, y2: my, extent: strandWidth, color: ca });
      const h2 = this.item(Kind.CYLINDER, (za + 3 * zb) / 4);
      Object.assign(h2, { x1: mx, y1: my, x2, y2, extent: strandWidth, color: cb });
    }
  }

  /** Each lobe pair is two translucent spheres on either side of the π plane, opposite in sign. */
  private addLobes(lobes: readonly OrbitalLobe[], input: RenderInput): void {
    const { positions, center, rotation, colors } = input;
    const v: Vec3 = [0, 0, 0];
    for (const lobe of lobes) {
      const radius = LOBE_RADIUS * Math.sqrt(Math.abs(lobe.coefficient));
      if (radius < 0.05) {
        continue;
      }
      const offset = LOBE_OFFSET * radius;
      for (const side of [1, -1]) {
        const x = (positions[3 * lobe.atom] ?? 0) + side * offset * lobe.normal[0] - center[0];
        const y = (positions[3 * lobe.atom + 1] ?? 0) + side * offset * lobe.normal[1] - center[1];
        const z = (positions[3 * lobe.atom + 2] ?? 0) + side * offset * lobe.normal[2] - center[2];
        this.projectPoint(x, y, z, rotation, v);
        const it = this.item(Kind.LOBE, v[2]);
        it.x1 = v[0];
        it.y1 = v[1];
        it.extent = radius * this.scale * this.perspectiveFactor(v[2]);
        it.color = side * lobe.coefficient > 0 ? colors.lobePositive : colors.lobeNegative;
      }
    }
  }

  // ── Painting ─────────────────────────────────────────────────────────────────

  private paintItems(ctx: CanvasRenderingContext2D): void {
    const count = this.itemCount;
    this.order.length = count;
    for (let i = 0; i < count; i++) {
      this.order[i] = i;
    }
    const items = this.items;
    this.order.sort((p, q) => (items[p]?.z ?? 0) - (items[q]?.z ?? 0));
    for (const index of this.order) {
      const it = items[index];
      if (!it) {
        continue;
      }
      if (it.kind === Kind.CYLINDER) {
        this.paintCylinder(ctx, it);
      } else if (it.extent >= 0.75) {
        ctx.globalAlpha = it.kind === Kind.LOBE ? LOBE_ALPHA : 1;
        ctx.drawImage(this.sprite(it.color), it.x1 - it.extent, it.y1 - it.extent, 2 * it.extent, 2 * it.extent);
        ctx.globalAlpha = 1;
      }
    }
  }

  /** Three concentric strokes fake a lit cylinder: dark rim, body, highlight. */
  private paintCylinder(ctx: CanvasRenderingContext2D, it: Item): void {
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(it.x1, it.y1);
    ctx.lineTo(it.x2, it.y2);
    ctx.lineWidth = it.extent;
    ctx.strokeStyle = this.css(shadeColor(it.color, 0.55));
    ctx.stroke();
    if (it.extent < 2.5) {
      return;
    }
    ctx.lineWidth = it.extent * 0.7;
    ctx.strokeStyle = this.css(it.color);
    ctx.stroke();
    if (it.extent < 5) {
      return;
    }
    const dx = it.x2 - it.x1;
    const dy = it.y2 - it.y1;
    const len = Math.hypot(dx, dy) || 1;
    // Offset the highlight toward the upper-left light.
    let ox = (-dy / len) * it.extent * 0.17;
    let oy = (dx / len) * it.extent * 0.17;
    if (ox + oy > 0) {
      ox = -ox;
      oy = -oy;
    }
    ctx.beginPath();
    ctx.moveTo(it.x1 + ox, it.y1 + oy);
    ctx.lineTo(it.x2 + ox, it.y2 + oy);
    ctx.lineWidth = it.extent * 0.22;
    ctx.strokeStyle = this.css(lighten(it.color, 0.45));
    ctx.stroke();
  }

  private paintOverlays(ctx: CanvasRenderingContext2D, input: RenderInput): void {
    const { colors } = input;
    ctx.save();
    ctx.strokeStyle = colors.highlight;
    ctx.lineWidth = 3;
    for (const i of input.highlighted) {
      this.ring(ctx, i, 3);
    }
    if (input.hovered !== null) {
      ctx.strokeStyle = colors.hover;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      this.ring(ctx, input.hovered, 6);
      ctx.setLineDash([]);
    }
    if (input.labels) {
      // Labels sit to the upper right of their atom.
      ctx.font = input.font;
      ctx.fillStyle = colors.label;
      ctx.textBaseline = "bottom";
      input.labels.forEach((label, i) => {
        if (label) {
          const r = Math.max(this.sr[i] ?? 0, 3) * 0.7;
          ctx.fillText(label, (this.sx[i] ?? 0) + r + 1, (this.sy[i] ?? 0) - r - 1);
        }
      });
    }
    ctx.restore();
  }

  private ring(ctx: CanvasRenderingContext2D, i: number, pad: number): void {
    if (i < 0 || i >= this.sx.length) {
      return;
    }
    ctx.beginPath();
    ctx.arc(this.sx[i] ?? 0, this.sy[i] ?? 0, Math.max(this.sr[i] ?? 0, 4) + pad, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // ── Colour helpers ───────────────────────────────────────────────────────────

  private css(color: number): string {
    let s = this.cssCache.get(color);
    if (!s) {
      s = `#${color.toString(16).padStart(6, "0")}`;
      this.cssCache.set(color, s);
    }
    return s;
  }

  /** A pre-shaded sphere for one colour: radial gradient with a specular highlight. */
  private sprite(color: number): HTMLCanvasElement {
    const cached = this.sprites.get(color);
    if (cached) {
      return cached;
    }
    const canvas = document.createElement("canvas");
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const c = canvas.getContext("2d");
    if (c) {
      const r = SPRITE_SIZE / 2;
      const g = c.createRadialGradient(r * 0.65, r * 0.6, r * 0.05, r, r, r);
      g.addColorStop(0, this.css(lighten(color, 0.75)));
      g.addColorStop(0.25, this.css(lighten(color, 0.25)));
      g.addColorStop(0.7, this.css(color));
      g.addColorStop(1, this.css(shadeColor(color, 0.35)));
      c.fillStyle = g;
      c.beginPath();
      c.arc(r, r, r - 0.5, 0, 2 * Math.PI);
      c.fill();
    }
    this.sprites.set(color, canvas);
    return canvas;
  }
}

/** Scales a colour's brightness (0 = black, 1 = unchanged). */
export function shadeColor(color: number, factor: number): number {
  const r = Math.round(((color >> 16) & 255) * factor);
  const g = Math.round(((color >> 8) & 255) * factor);
  const b = Math.round((color & 255) * factor);
  return (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);
}

/** Blends a colour toward white. */
export function lighten(color: number, amount: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return (
    (Math.round(r + (255 - r) * amount) << 16) |
    (Math.round(g + (255 - g) * amount) << 8) |
    Math.round(b + (255 - b) * amount)
  );
}
