/**
 * EnergyLevelDiagramNode.ts
 *
 * The π energy levels of the current model, lowest at the bottom, each with its electrons drawn as
 * ↑↓ arrows. The HOMO and LUMO are labelled, the absorbing HOMO→LUMO transition is an arrow, and
 * the orbital drawn on the molecule is highlighted. Click a level (or use the arrow keys when the
 * diagram is focused) to choose which orbital is drawn.
 */

import { Multilink, type Property, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { KeyboardListener, Line, Node, Rectangle, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import SpectroscopyLabHotkeyData from "../../common/SpectroscopyLabHotkeyData.js";
import { StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import type { ElectronicStructure } from "../model/PiSystem.js";
import type { Prediction } from "../model/UVVisModel.js";

const LEVEL_WIDTH = 64;
const LABEL_FONT = new PhetFont(11);
const ELECTRON_FONT = new PhetFont({ size: 11, weight: "bold" });
/** Levels closer than this (px) are degenerate pairs drawn side by side. */
const DEGENERATE_PX = 2;

type LevelDrawing = {
  readonly x: number;
  readonly y: number;
  readonly occupancy: number;
  readonly selected: boolean;
  readonly label: TReadOnlyProperty<string> | null;
  readonly labelWidth: number;
  readonly select: () => void;
};

/** Spoken description of the orbital drawn on the molecule. `index` is 0-based. */
export function describeOrbital(index: number, structure: ElectronicStructure): string {
  const a11y = StringManager.getInstance().getUVVisA11yStrings();
  const strings = StringManager.getInstance().getUVVisStrings();
  const orbital = structure.orbitals[index];
  const role =
    index === structure.homo
      ? `, ${strings.homoStringProperty.value}`
      : index === structure.lumo
        ? `, ${strings.lumoStringProperty.value}`
        : "";
  return StringUtils.fillIn(a11y.orbitalStringProperty.value, {
    number: index + 1,
    count: structure.orbitals.length,
    occupancy: orbital?.occupancy ?? 0,
    role,
  });
}

/** One level: its line, a click target, its electrons, and a HOMO/LUMO label. */
function drawLevel(layer: Node, level: LevelDrawing): void {
  const { x, y } = level;
  layer.addChild(
    new Line(x - LEVEL_WIDTH / 2, y, x + LEVEL_WIDTH / 2, y, {
      stroke: level.selected ? SpectroscopyLabColors.highlightColorProperty : SpectroscopyLabColors.textColorProperty,
      lineWidth: level.selected ? 3 : 1.5,
    }),
  );
  const hit = new Rectangle(x - LEVEL_WIDTH / 2, y - 5, LEVEL_WIDTH, 10, { fill: "rgba(0,0,0,0)", cursor: "pointer" });
  hit.addInputListener({ down: level.select });
  layer.addChild(hit);
  if (level.occupancy > 0) {
    layer.addChild(
      new Text(level.occupancy === 2 ? "↑↓" : "↑", {
        font: ELECTRON_FONT,
        fill: SpectroscopyLabColors.spectrumColorProperty,
        centerX: x,
        bottom: y - 1,
      }),
    );
  }
  if (level.label) {
    layer.addChild(
      new Text(level.label, {
        font: LABEL_FONT,
        fill: SpectroscopyLabColors.textColorProperty,
        left: x + LEVEL_WIDTH / 2 + 4,
        centerY: y,
        maxWidth: Math.max(level.labelWidth, 10),
      }),
    );
  }
}

export class EnergyLevelDiagramNode extends Node {
  private readonly disposeEnergyLevelDiagramNode: () => void;

  public constructor(
    predictionProperty: TReadOnlyProperty<Prediction | null>,
    selectedOrbitalProperty: Property<number | null>,
    axisLabelProperty: TReadOnlyProperty<string>,
    width: number,
    height: number,
  ) {
    const strings = StringManager.getInstance().getUVVisStrings();
    const a11y = StringManager.getInstance().getUVVisA11yStrings();
    super({
      tagName: "div",
      focusable: true,
      accessibleName: a11y.levelsStringProperty,
      accessibleHelpText: a11y.levelsHelpStringProperty,
    });

    const frame = new Rectangle(0, 0, width, height, {
      fill: SpectroscopyLabColors.chartBackgroundColorProperty,
      stroke: SpectroscopyLabColors.chartAxisColorProperty,
      cornerRadius: 4,
    });
    const axisLabel = new Text(axisLabelProperty, {
      font: LABEL_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      rotation: -Math.PI / 2,
      maxWidth: height,
    });
    axisLabel.boundsProperty.link(() => {
      axisLabel.right = -4;
      axisLabel.centerY = height / 2;
    });
    const axis = new ArrowNode(10, height - 8, 10, 8, {
      headHeight: 6,
      headWidth: 6,
      tailWidth: 1,
      fill: SpectroscopyLabColors.chartAxisColorProperty,
      stroke: null,
    });
    const levelsLayer = new Node();
    this.children = [frame, axisLabel, axis, levelsLayer];

    const update = () => {
      for (const child of levelsLayer.children) {
        child.dispose();
      }
      levelsLayer.removeAllChildren();
      const prediction = predictionProperty.value;
      if (!prediction) {
        return;
      }
      const { orbitals, homo, lumo } = prediction.structure;
      // Show every occupied level and up to as many empty ones, but at least three above the LUMO.
      const shown = orbitals.slice(0, Math.min(orbitals.length, Math.max(2 * (homo + 1), lumo + 3)));
      const energies = shown.map((o) => o.energy);
      const low = Math.min(...energies);
      const high = Math.max(...energies);
      const span = high - low || 1;
      const yOf = (energy: number) => height - 14 - ((energy - low) / span) * (height - 28);
      const centerX = width / 2 + 6;

      shown.forEach((orbital, index) => {
        const y = yOf(orbital.energy);
        // Degenerate partner: shift this level sideways.
        const partner = shown.findIndex((o, j) => j !== index && Math.abs(yOf(o.energy) - y) < DEGENERATE_PX);
        const offset = partner < 0 ? 0 : (index < partner ? -1 : 1) * (LEVEL_WIDTH / 2 + 3);
        const role = index === homo ? strings.homoStringProperty : index === lumo ? strings.lumoStringProperty : null;
        drawLevel(levelsLayer, {
          x: centerX + offset,
          y,
          occupancy: orbital.occupancy,
          selected: selectedOrbitalProperty.value === index,
          label: partner < 0 ? role : null,
          labelWidth: width - (centerX + offset + LEVEL_WIDTH / 2 + 6),
          select: () => {
            selectedOrbitalProperty.value = index;
          },
        });
      });

      // The absorbing transition.
      const homoY = yOf(orbitals[homo]?.energy ?? 0);
      const lumoY = yOf(orbitals[lumo]?.energy ?? 0);
      if (lumo > homo && Math.abs(lumoY - homoY) > 10) {
        levelsLayer.addChild(
          new ArrowNode(centerX - LEVEL_WIDTH / 2 - 8, homoY - 2, centerX - LEVEL_WIDTH / 2 - 8, lumoY + 2, {
            headHeight: 7,
            headWidth: 7,
            tailWidth: 2,
            fill: SpectroscopyLabColors.peakMarkerColorProperty,
            stroke: null,
          }),
        );
      }
    };
    const multilink = Multilink.multilink([predictionProperty, selectedOrbitalProperty], update);

    const keyboardListener = new KeyboardListener({
      keyStringProperties: [
        ...SpectroscopyLabHotkeyData.HIGHER_ORBITAL.keyStringProperties,
        ...SpectroscopyLabHotkeyData.LOWER_ORBITAL.keyStringProperties,
      ],
      fire: (_event, keysPressed) => {
        const count = predictionProperty.value?.structure.orbitals.length ?? 0;
        if (count === 0) {
          return;
        }
        const current = selectedOrbitalProperty.value ?? predictionProperty.value?.structure.homo ?? 0;
        const up = keysPressed === "arrowUp" || keysPressed === "arrowRight";
        selectedOrbitalProperty.value = Math.min(count - 1, Math.max(0, current + (up ? 1 : -1)));
      },
    });
    this.addInputListener(keyboardListener);

    const announceOrbital = () => {
      const prediction = predictionProperty.value;
      const index = selectedOrbitalProperty.value;
      if (!prediction || index === null) {
        return;
      }
      this.addAccessibleResponse(describeOrbital(index, prediction.structure));
    };
    selectedOrbitalProperty.lazyLink(announceOrbital);

    this.disposeEnergyLevelDiagramNode = () => {
      selectedOrbitalProperty.unlink(announceOrbital);
      multilink.dispose();
      keyboardListener.dispose();
      axisLabel.dispose();
      for (const child of levelsLayer.children) {
        child.dispose();
      }
    };
  }

  public override dispose(): void {
    this.disposeEnergyLevelDiagramNode();
    super.dispose();
  }
}
