/**
 * ControlFactory.ts
 *
 * Themed builders for panel controls (copied from MolScope). `accessibleName` is a required
 * argument, so a control without one is a compile error rather than a silent gap.
 */

import type { PhetioProperty, Property, TReadOnlyProperty } from "scenerystack/axon";
import { HBox, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { AquaRadioButtonGroup, Checkbox, ComboBox, type ComboBoxItem, TextPushButton } from "scenerystack/sun";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import {
  FLAT_PANEL_PUSH_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
  SPECTROSCOPY_LAB_COMBO_BOX_OPTIONS,
} from "../SpectroscopyLabButtonOptions.js";
import { SPECTROSCOPY_LAB_CHECKBOX_OPTIONS } from "../SpectroscopyLabControlOptions.js";

export const CONTROL_FONT = new PhetFont(13);
export const SMALL_FONT = new PhetFont(12);
export const HEADING_FONT = new PhetFont({ size: 14, weight: "bold" });

export function heading(text: TReadOnlyProperty<string>, maxWidth: number): Text {
  return new Text(text, { font: HEADING_FONT, fill: SpectroscopyLabColors.textColorProperty, maxWidth });
}

export function label(text: TReadOnlyProperty<string> | string, maxWidth: number): Text {
  return new Text(text, { font: CONTROL_FONT, fill: SpectroscopyLabColors.textColorProperty, maxWidth });
}

export type ComboChoice<T> = { readonly value: T; readonly label: TReadOnlyProperty<string> };

export function comboBox<T>(
  property: PhetioProperty<T>,
  choices: readonly ComboChoice<T>[],
  listParent: Node,
  accessibleName: TReadOnlyProperty<string>,
  maxWidth: number,
): ComboBox<T> {
  const items: ComboBoxItem<T>[] = choices.map((choice) => ({
    value: choice.value,
    createNode: () =>
      new Text(choice.label, { font: CONTROL_FONT, fill: LIGHT_SURFACE_TEXT_FILL, maxWidth: maxWidth - 40 }),
    accessibleName: choice.label,
  }));
  return new ComboBox(property, items, listParent, {
    ...SPECTROSCOPY_LAB_COMBO_BOX_OPTIONS,
    xMargin: 8,
    yMargin: 3,
    cornerRadius: 4,
    accessibleName,
  });
}

/** A label above a control, left-aligned. */
export function labeled(text: TReadOnlyProperty<string>, control: Node, maxWidth: number): VBox {
  return new VBox({ align: "left", spacing: 3, children: [label(text, maxWidth), control] });
}

export function checkbox(property: Property<boolean>, text: TReadOnlyProperty<string>, maxWidth: number): Checkbox {
  return new Checkbox(property, label(text, maxWidth), {
    ...SPECTROSCOPY_LAB_CHECKBOX_OPTIONS,
    accessibleName: text,
  });
}

export function pushButton(
  text: TReadOnlyProperty<string>,
  listener: () => void,
  accessibleName = text,
): TextPushButton {
  return new TextPushButton(text, {
    ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
    font: CONTROL_FONT,
    textFill: LIGHT_SURFACE_TEXT_FILL,
    xMargin: 8,
    yMargin: 4,
    maxTextWidth: 180,
    listener,
    accessibleName,
  });
}

export function radioGroup<T>(
  property: PhetioProperty<T>,
  choices: readonly ComboChoice<T>[],
  accessibleName: TReadOnlyProperty<string>,
  maxWidth: number,
  orientation: "vertical" | "horizontal" = "vertical",
): AquaRadioButtonGroup<T> {
  return new AquaRadioButtonGroup(
    property,
    choices.map((choice) => ({
      value: choice.value,
      createNode: () => label(choice.label, maxWidth),
      options: { accessibleName: choice.label },
    })),
    {
      orientation,
      spacing: orientation === "vertical" ? 4 : 10,
      radioButtonOptions: { radius: 6, selectedColor: SpectroscopyLabColors.accentColorProperty },
      accessibleName,
    },
  );
}

/** Two checkboxes side by side (or one) for compact panels. */
export function pairRow(left: Node, right: Node | null, columnWidth: number): HBox {
  return new HBox({
    spacing: 8,
    align: "center",
    children: right ? [sized(left, columnWidth), right] : [left],
  });
}

function sized(node: Node, width: number): Node {
  return new Node({ children: [node], localBounds: node.localBounds.withMaxX(Math.max(node.localBounds.maxX, width)) });
}
