/**
 * MoleculeThumbnailNode.ts
 *
 * A small, still ball-and-stick picture of a molecule (the Unknowns screen's answer choices),
 * painted once by the shared {@link MoleculeRenderer} from a fixed, slightly tilted viewpoint.
 */

import type { Bounds2 } from "scenerystack/dot";
import { CanvasNode } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import type { Molecule } from "../model/Molecule.js";
import type { Vec3 } from "../model/structure/Geometry.js";
import { Rotation3 } from "../model/structure/Rotation3.js";
import { MoleculeRenderer } from "./MoleculeRenderer.js";

const VIEW_ROTATION = Rotation3.aboutAxis([1, 0, 0], -25).times(Rotation3.aboutAxis([0, 1, 0], 20));
const FONT = new PhetFont(11).toCSS();

export class MoleculeThumbnailNode extends CanvasNode {
  private readonly moleculeRenderer = new MoleculeRenderer();
  private readonly molecule: Molecule;
  private readonly moleculeCenter: Vec3;
  private readonly radius: number;
  private readonly colorListener: () => void;

  public constructor(molecule: Molecule, bounds: Bounds2) {
    super({ canvasBounds: bounds, pickable: false });
    this.molecule = molecule;
    const p = molecule.positions;
    const n = molecule.elements.length;
    const c: Vec3 = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      c[0] += (p[3 * i] ?? 0) / n;
      c[1] += (p[3 * i + 1] ?? 0) / n;
      c[2] += (p[3 * i + 2] ?? 0) / n;
    }
    this.moleculeCenter = c;
    let r = 0;
    for (let i = 0; i < n; i++) {
      r = Math.max(r, Math.hypot((p[3 * i] ?? 0) - c[0], (p[3 * i + 1] ?? 0) - c[1], (p[3 * i + 2] ?? 0) - c[2]));
    }
    this.radius = r + 1;
    this.colorListener = () => this.invalidatePaint();
    SpectroscopyLabColors.highlightColorProperty.lazyLink(this.colorListener);
  }

  public paintCanvas(ctx: CanvasRenderingContext2D): void {
    const b = this.canvasBounds;
    ctx.save();
    ctx.translate(b.minX, b.minY);
    this.moleculeRenderer.render(ctx, {
      width: b.width,
      height: b.height,
      molecule: this.molecule,
      positions: this.molecule.positions,
      rotation: VIEW_ROTATION,
      center: this.moleculeCenter,
      radius: this.radius,
      zoom: 1,
      hovered: null,
      highlighted: [],
      labels: null,
      lobes: null,
      colors: {
        label: SpectroscopyLabColors.textColorProperty.value.toCSS(),
        highlight: SpectroscopyLabColors.highlightColorProperty.value.toCSS(),
        hover: SpectroscopyLabColors.hoverColorProperty.value.toCSS(),
        lobePositive: 0,
        lobeNegative: 0,
      },
      font: FONT,
    });
    ctx.restore();
  }

  public override dispose(): void {
    SpectroscopyLabColors.highlightColorProperty.unlink(this.colorListener);
    super.dispose();
  }
}
