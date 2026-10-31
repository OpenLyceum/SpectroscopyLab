/**
 * MoleculeViewerNode.ts
 *
 * The interactive 3D viewport, trimmed from MolScope. A CanvasNode paints the molecule through
 * {@link MoleculeRenderer}; a transparent hit rectangle on top takes the input:
 *
 *   drag     rotate (trackball about the screen x/y axes)
 *   wheel    zoom
 *   hover    tooltip describing the atom under the pointer
 *   click    pick the atom (the screen decides what that does — e.g. select its NMR signal)
 *
 * The node is focusable: arrow keys rotate, +/− zoom, Home resets, N/P walk a keyboard cursor
 * through the atoms (announced) and Enter/Space picks it, so picking works without a pointer.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import type { Bounds2 } from "scenerystack/dot";
import { Vector2 } from "scenerystack/dot";
import { optionize } from "scenerystack/phet-core";
import {
  CanvasNode,
  type Color,
  KeyboardListener,
  Node,
  type NodeOptions,
  type PressListenerEvent,
  Rectangle,
  RichText,
  type SceneryEvent,
  Text,
  type TInputListener,
} from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import type { MoleculeViewModel } from "../model/MoleculeViewModel.js";
import SpectroscopyLabHotkeyData from "../SpectroscopyLabHotkeyData.js";
import { disposeSubtree } from "./disposeSubtree.js";
import { MoleculeRenderer } from "./MoleculeRenderer.js";

/** Degrees of rotation per pixel of drag. */
const DEGREES_PER_PIXEL = 0.5;
/** Degrees per arrow-key press. */
const KEY_ROTATION = 10;
/** Pixels of movement below which a press-release counts as a click. */
const CLICK_SLOP = 4;
/** Zoom factor per wheel notch / key press. */
const ZOOM_STEP = 1.15;
const LABEL_FONT = new PhetFont({ size: 13, weight: "bold" });
const TOOLTIP_FONT = new PhetFont(12);

class MoleculeCanvasNode extends CanvasNode {
  public readonly moleculeRenderer = new MoleculeRenderer();
  private readonly model: MoleculeViewModel;
  private readonly colorProperties: readonly TReadOnlyProperty<Color>[];

  public constructor(model: MoleculeViewModel, bounds: Bounds2) {
    super({ canvasBounds: bounds, pickable: false });
    this.model = model;
    this.colorProperties = [
      SpectroscopyLabColors.viewerLabelColorProperty,
      SpectroscopyLabColors.highlightColorProperty,
      SpectroscopyLabColors.hoverColorProperty,
      SpectroscopyLabColors.lobePositiveColorProperty,
      SpectroscopyLabColors.lobeNegativeColorProperty,
    ];
  }

  public paintCanvas(ctx: CanvasRenderingContext2D): void {
    const model = this.model;
    const molecule = model.molecule;
    if (!molecule) {
      return;
    }
    const bounds = this.canvasBounds;
    ctx.save();
    ctx.translate(bounds.minX, bounds.minY);
    this.moleculeRenderer.render(ctx, {
      width: bounds.width,
      height: bounds.height,
      molecule,
      positions: model.currentPositions(),
      rotation: model.rotationProperty.value,
      center: model.center(),
      radius: model.boundingRadius(),
      zoom: model.zoomProperty.value,
      hovered: model.hoveredAtomProperty.value,
      highlighted: model.highlightedAtomsProperty.value,
      labels: model.atomLabelsProperty.value,
      lobes: model.orbitalLobesProperty.value,
      colors: {
        label: SpectroscopyLabColors.viewerLabelColorProperty.value.toCSS(),
        highlight: SpectroscopyLabColors.highlightColorProperty.value.toCSS(),
        hover: SpectroscopyLabColors.hoverColorProperty.value.toCSS(),
        lobePositive: SpectroscopyLabColors.lobePositiveColorProperty.value.toNumber(),
        lobeNegative: SpectroscopyLabColors.lobeNegativeColorProperty.value.toNumber(),
      },
      font: LABEL_FONT.toCSS(),
    });
    ctx.restore();
  }

  public get overlayColorProperties(): readonly TReadOnlyProperty<Color>[] {
    return this.colorProperties;
  }
}

type SelfOptions = {
  /** Text for the tooltip and the keyboard-cursor announcement ("C 2 — 1.2 ppm"). */
  describeAtom?: (index: number) => string;
};

export type MoleculeViewerNodeOptions = SelfOptions & NodeOptions;

export class MoleculeViewerNode extends Node {
  private readonly model: MoleculeViewModel;
  private readonly canvasNode: MoleculeCanvasNode;
  private readonly tooltip: Node;
  private readonly tooltipText: RichText;
  private readonly describeAtom: (index: number) => string;
  private readonly repaintMultilink: { dispose(): void };
  private readonly tooltipLink: () => void;
  private readonly colorListener: () => void;
  private readonly keyboardListener: KeyboardListener<never[]>;
  private readonly unlinkLoadError: () => void;

  /** Keyboard cursor through the atoms. */
  private atomCursor = -1;

  public constructor(model: MoleculeViewModel, viewBounds: Bounds2, providedOptions?: MoleculeViewerNodeOptions) {
    const a11y = StringManager.getInstance().getViewerStrings();
    const options = optionize<MoleculeViewerNodeOptions, SelfOptions, NodeOptions>()(
      {
        describeAtom: (index) => defaultAtomDescription(model, index),
        tagName: "div",
        focusable: true,
        accessibleName: a11y.accessibleNameStringProperty,
        accessibleHelpText: a11y.helpTextStringProperty,
      },
      providedOptions,
    );
    super(options);
    this.model = model;
    this.describeAtom = options.describeAtom;

    const hitArea = new Rectangle(viewBounds, { fill: "rgba(0,0,0,0)", cursor: "grab" });
    this.canvasNode = new MoleculeCanvasNode(model, viewBounds);
    this.tooltipText = new RichText("", { font: TOOLTIP_FONT, fill: SpectroscopyLabColors.textColorProperty });
    const tooltipBackground = new Rectangle(0, 0, 1, 1, {
      fill: SpectroscopyLabColors.panelBackgroundColorProperty,
      stroke: SpectroscopyLabColors.panelBorderColorProperty,
      cornerRadius: 4,
      opacity: 0.92,
    });
    this.tooltip = new Node({ children: [tooltipBackground, this.tooltipText], visible: false, pickable: false });
    this.tooltipText.boundsProperty.link((b) => {
      tooltipBackground.setRect(b.minX - 5, b.minY - 3, b.width + 10, b.height + 6);
    });
    const loadError = new Text(a11y.loadErrorStringProperty, {
      font: new PhetFont(16),
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: viewBounds.width - 24,
      pickable: false,
    });
    const centerLoadError = () => {
      loadError.center = viewBounds.center;
    };
    const showLoadError = () => {
      loadError.visible = model.loadErrorProperty.value;
    };
    loadError.boundsProperty.link(centerLoadError);
    model.loadErrorProperty.link(showLoadError);
    this.children = [this.canvasNode, hitArea, loadError, this.tooltip];
    this.unlinkLoadError = () => {
      loadError.boundsProperty.unlink(centerLoadError);
      model.loadErrorProperty.unlink(showLoadError);
    };

    // Repaint on anything the renderer reads.
    const invalidate = () => this.canvasNode.invalidatePaint();
    this.repaintMultilink = Multilink.multilinkAny(
      [
        model.moleculeProperty,
        model.rotationProperty,
        model.zoomProperty,
        model.hoveredAtomProperty,
        model.highlightedAtomsProperty,
        model.atomLabelsProperty,
        model.displacementProperty,
        model.orbitalLobesProperty,
        model.vibrationPhaseProperty,
      ],
      invalidate,
    );
    // Overlay colours change with the colour profile.
    this.colorListener = invalidate;
    for (const property of this.canvasNode.overlayColorProperties) {
      property.lazyLink(this.colorListener);
    }

    this.tooltipLink = () => this.updateTooltip();
    model.hoveredAtomProperty.lazyLink(this.tooltipLink);
    model.rotationProperty.lazyLink(this.tooltipLink);

    hitArea.addInputListener(this.createPointerListener(hitArea));
    this.keyboardListener = this.createKeyboardListener();
    this.addInputListener(this.keyboardListener);
  }

  private localPoint(event: SceneryEvent): Vector2 {
    const p = this.globalToLocalPoint(event.pointer.point);
    const b = this.canvasNode.canvasBounds;
    return new Vector2(p.x - b.minX, p.y - b.minY);
  }

  private createPointerListener(hitArea: Rectangle): TInputListener {
    const model = this.model;
    let pressed = false;
    let activePointer: SceneryEvent["pointer"] | null = null;
    let start = new Vector2(0, 0);
    let last = new Vector2(0, 0);
    let travelled = 0;

    const dragListener: TInputListener = {
      move: (event) => {
        const p = this.localPoint(event);
        const dx = p.x - last.x;
        const dy = p.y - last.y;
        last = p;
        travelled = Math.max(travelled, p.distance(start));
        if (travelled >= CLICK_SLOP) {
          model.rotationProperty.value = model.rotationProperty.value
            .rotatedAboutScreenAxis([0, 1, 0], dx * DEGREES_PER_PIXEL)
            .rotatedAboutScreenAxis([1, 0, 0], dy * DEGREES_PER_PIXEL);
        }
      },
      up: (event) => release(event),
      cancel: () => release(null),
      interrupt: () => release(null),
    };

    const release = (event: SceneryEvent | null) => {
      if (!pressed) {
        return;
      }
      pressed = false;
      hitArea.cursor = "grab";
      // Always detach: touch pointers are disposed after cancel/interrupt too.
      if (activePointer?.listeners.includes(dragListener)) {
        activePointer.removeInputListener(dragListener);
      }
      activePointer = null;
      if (event && travelled < CLICK_SLOP) {
        const p = this.localPoint(event);
        const atom = this.canvasNode.moleculeRenderer.pick(p.x, p.y);
        if (atom !== null) {
          model.pickAtom(atom);
        }
      }
    };

    return {
      down: (event: PressListenerEvent) => {
        if (pressed || !event.canStartPress()) {
          return;
        }
        pressed = true;
        start = this.localPoint(event);
        last = start;
        travelled = 0;
        hitArea.cursor = "grabbing";
        activePointer = event.pointer;
        event.pointer.addInputListener(dragListener, true);
        this.focus();
      },
      move: (event: SceneryEvent) => {
        if (pressed || event.pointer.isTouchLike()) {
          return;
        }
        const p = this.localPoint(event);
        model.hoveredAtomProperty.value = this.canvasNode.moleculeRenderer.pick(p.x, p.y);
      },
      exit: () => {
        if (!pressed) {
          model.hoveredAtomProperty.value = null;
        }
      },
      wheel: (event: SceneryEvent<WheelEvent>) => {
        const delta = event.domEvent?.deltaY ?? 0;
        model.zoomBy(delta < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
        event.handle();
      },
    };
  }

  private createKeyboardListener(): KeyboardListener<never[]> {
    const model = this.model;
    const keys = [
      ...SpectroscopyLabHotkeyData.ROTATE.keyStringProperties,
      ...SpectroscopyLabHotkeyData.ZOOM_IN.keyStringProperties,
      ...SpectroscopyLabHotkeyData.ZOOM_OUT.keyStringProperties,
      ...SpectroscopyLabHotkeyData.RESET_VIEW.keyStringProperties,
      ...SpectroscopyLabHotkeyData.NEXT_ATOM.keyStringProperties,
      ...SpectroscopyLabHotkeyData.PREVIOUS_ATOM.keyStringProperties,
      ...SpectroscopyLabHotkeyData.PICK_ATOM.keyStringProperties,
    ];
    const actions: Record<string, () => void> = {
      arrowLeft: () => model.rotate([0, 1, 0], -KEY_ROTATION),
      arrowRight: () => model.rotate([0, 1, 0], KEY_ROTATION),
      arrowUp: () => model.rotate([1, 0, 0], -KEY_ROTATION),
      arrowDown: () => model.rotate([1, 0, 0], KEY_ROTATION),
      equals: () => model.zoomBy(ZOOM_STEP),
      plus: () => model.zoomBy(ZOOM_STEP),
      minus: () => model.zoomBy(1 / ZOOM_STEP),
      home: () => model.resetView(),
      n: () => this.moveCursor(1),
      p: () => this.moveCursor(-1),
      enter: () => this.pickCursor(),
      space: () => this.pickCursor(),
    };
    return new KeyboardListener({
      keyStringProperties: keys,
      fire: (_event, keysPressed) => actions[keysPressed]?.(),
    });
  }

  private pickCursor(): void {
    if (this.atomCursor >= 0) {
      this.model.pickAtom(this.atomCursor);
    }
  }

  /** Walks the keyboard cursor through the atoms and announces each one. */
  private moveCursor(direction: 1 | -1): void {
    const n = this.model.molecule?.elements.length ?? 0;
    if (n === 0) {
      return;
    }
    this.atomCursor = (((this.atomCursor + direction) % n) + n) % n;
    this.model.hoveredAtomProperty.value = this.atomCursor;
    this.addAccessibleResponse(this.describeAtom(this.atomCursor));
  }

  private updateTooltip(): void {
    const index = this.model.hoveredAtomProperty.value;
    const position = index === null ? null : this.canvasNode.moleculeRenderer.screenPosition(index);
    if (index === null || !position) {
      this.tooltip.visible = false;
      return;
    }
    this.tooltipText.string = this.describeAtom(index);
    const b = this.canvasNode.canvasBounds;
    const x = Math.min(b.maxX - this.tooltip.width - 4, b.minX + position.x + 14);
    const y = Math.max(b.minY + 4, b.minY + position.y - 30);
    this.tooltip.translation = new Vector2(x - this.tooltipText.left + 5, y - this.tooltipText.top + 3);
    this.tooltip.visible = true;
  }

  /** Repaints after a change the multilink cannot see (e.g. the screen swapped data in place). */
  public invalidate(): void {
    this.canvasNode.invalidatePaint();
  }

  /** Hides the tooltip and keyboard cursor (Reset All). */
  public reset(): void {
    this.atomCursor = -1;
    this.tooltip.visible = false;
  }

  public override dispose(): void {
    this.repaintMultilink.dispose();
    for (const property of this.canvasNode.overlayColorProperties) {
      property.unlink(this.colorListener);
    }
    this.model.hoveredAtomProperty.unlink(this.tooltipLink);
    this.model.rotationProperty.unlink(this.tooltipLink);
    this.keyboardListener.dispose();
    this.unlinkLoadError();
    super.dispose();
    disposeSubtree(this.tooltip);
    this.tooltip.dispose();
  }
}

/** "C 2" — element symbol and 1-based atom number. */
export function defaultAtomDescription(model: MoleculeViewModel, index: number): string {
  const element = model.molecule?.elements[index];
  return element ? `${element.symbol} ${index + 1}` : "";
}
