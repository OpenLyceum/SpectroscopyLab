/**
 * SignalTableNode.ts
 *
 * The list of ¹H signals — letter, shift, integration, multiplicity and J — one row per proton
 * environment. Clicking a row selects that signal; the selected row is drawn in the highlight colour.
 */

import { Multilink, type Property, type TReadOnlyProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { FireListener, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
import type { ProtonEnvironment } from "../model/ProtonSpectrum.js";

const ROW_FONT = new PhetFont({ size: 13, family: "monospace" });
const DETAIL_FONT = new PhetFont(12);
const HEADING_FONT = new PhetFont({ size: 14, weight: "bold" });
const MAX_ROWS = 8;

export class SignalTableNode extends VBox {
  private readonly disposeSignalTableNode: () => void;

  public constructor(
    environmentsProperty: TReadOnlyProperty<readonly ProtonEnvironment[]>,
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

    const multiplicities = strings.multiplicities as unknown as Record<string, TReadOnlyProperty<string>>;
    const update = () => {
      const environments = environmentsProperty.value;
      rows.forEach((r, index) => {
        const environment = environments[index];
        r.content.visible = !!environment;
        if (!environment) {
          return;
        }
        r.main.string = StringUtils.fillIn(strings.signalRowStringProperty.value, {
          label: environment.label,
          shift: toFixed(environment.shift, 2),
          count: environment.atoms.length,
          multiplicity: environment.multiplicity,
        });
        const selected = selectedProperty.value === index;
        r.main.fill = selected ? SpectroscopyLabColors.highlightColorProperty : SpectroscopyLabColors.textColorProperty;
        r.detail.string = environment.exchangeable
          ? strings.broadStringProperty.value
          : environment.couplings
              .map((c) => StringUtils.fillIn(strings.couplingValueStringProperty.value, { j: toFixed(c.j, 1) }))
              .join(", ") ||
            (multiplicities[environment.multiplicity]?.value ?? "");
      });
    };
    const multilink = Multilink.multilinkAny(
      [environmentsProperty, selectedProperty, strings.signalRowStringProperty, strings.broadStringProperty],
      update,
    );

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
