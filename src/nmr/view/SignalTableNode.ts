/**
 * SignalTableNode.ts
 *
 * The list of NMR signals, one row per environment: a main line (¹H: letter, shift, integration,
 * multiplicity; ¹³C: number, shift, CHₙ type, count) and a detail line (J values, or ¹J and DEPT
 * behaviour). Clicking a row selects that signal; the selected row is drawn in the highlight colour.
 */

import { Multilink, type Property, type TReadOnlyProperty } from "scenerystack/axon";
import { FireListener, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";

const ROW_FONT = new PhetFont({ size: 13, family: "monospace" });
const DETAIL_FONT = new PhetFont(12);
const HEADING_FONT = new PhetFont({ size: 14, weight: "bold" });
const MAX_ROWS = 8;

export type SignalRow = {
  readonly main: string;
  readonly detail: string;
};

export class SignalTableNode extends VBox {
  private readonly disposeSignalTableNode: () => void;

  public constructor(
    rowsProperty: TReadOnlyProperty<readonly SignalRow[]>,
    selectedProperty: Property<number | null>,
    width: number,
  ) {
    const strings = StringManager.getInstance().getNMRStrings();
    const rows = Array.from({ length: MAX_ROWS }, (_, index) => {
      const main = new Text("", { font: ROW_FONT, maxWidth: width });
      const detail = new Text("", {
        font: DETAIL_FONT,
        maxWidth: width - 16,
        fill: SpectroscopyLabColors.textColorProperty,
      });
      const listener = new FireListener({
        fire: () => {
          selectedProperty.value = index;
        },
      });
      const content = new VBox({
        align: "left",
        spacing: 1,
        children: [main, detail],
        cursor: "pointer",
        inputListeners: [listener],
      });
      return { main, detail, content, listener };
    });
    const heading = new Text(strings.signalsStringProperty, {
      font: HEADING_FONT,
      fill: SpectroscopyLabColors.textColorProperty,
      maxWidth: width,
    });

    super({ align: "left", spacing: 4, children: [heading, ...rows.map((r) => r.content)] });

    const multilink = Multilink.multilink([rowsProperty, selectedProperty], (signalRows, selected) => {
      rows.forEach((r, index) => {
        const row = signalRows[index];
        r.content.visible = !!row;
        if (row) {
          r.main.string = row.main;
          r.main.fill =
            selected === index ? SpectroscopyLabColors.highlightColorProperty : SpectroscopyLabColors.textColorProperty;
          r.detail.string = row.detail;
        }
      });
    });

    this.disposeSignalTableNode = () => {
      multilink.dispose();
      heading.dispose();
      for (const r of rows) {
        r.listener.dispose();
        r.main.dispose();
        r.detail.dispose();
      }
    };
  }

  public override dispose(): void {
    this.disposeSignalTableNode();
    super.dispose();
  }
}
