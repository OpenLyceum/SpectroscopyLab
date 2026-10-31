/**
 * MoleculeChooserNode.ts
 *
 * Family and molecule combo boxes for a {@link MoleculeChooser}. There is one molecule combo box
 * per family, bound to that family's own selection, and only the active family's box is shown.
 */

import { HBox, Node, VBox } from "scenerystack/scenery";
import type { ComboBox } from "scenerystack/sun";
import { lookupStringProperty, StringManager } from "../../i18n/StringManager.js";
import { nameKey } from "../model/library/SpectroscopyLibrary.js";
import type { MoleculeChooser } from "../model/MoleculeChooser.js";
import { comboBox, label } from "./ControlFactory.js";

const LABEL_WIDTH = 80;

export class MoleculeChooserNode extends VBox {
  private readonly disposeMoleculeChooserNode: () => void;

  public constructor(chooser: MoleculeChooser, listParent: Node, width: number) {
    const stringManager = StringManager.getInstance();
    const controls = stringManager.getControlStrings();
    const familyNames = stringManager.getFamilyNames();
    const moleculeNames = stringManager.getMoleculeNames();
    const comboWidth = width - LABEL_WIDTH - 10;

    const familyCombo = comboBox(
      chooser.familyProperty,
      chooser.families.map((family) => ({
        value: family,
        label: lookupStringProperty(familyNames, `${family}StringProperty`) ?? controls.familyStringProperty,
      })),
      listParent,
      controls.familyStringProperty,
      comboWidth,
    );

    const moleculeCombos: ComboBox<string>[] = chooser.families.map((family) => {
      const selection = chooser.selections.get(family);
      if (!selection) {
        throw new Error(`no selection for ${family}`);
      }
      const combo = comboBox(
        selection,
        chooser.entries(family).map((entry) => ({
          value: entry.id,
          label:
            lookupStringProperty(moleculeNames, `${nameKey(entry.id)}StringProperty`) ??
            controls.moleculeStringProperty,
        })),
        listParent,
        controls.moleculeStringProperty,
        comboWidth,
      );
      return combo;
    });
    const moleculeSlot = new Node({ children: moleculeCombos });

    const familyListener = (family: string) => {
      chooser.families.forEach((f, i) => {
        const combo = moleculeCombos[i];
        if (combo) {
          combo.visible = f === family;
        }
      });
    };
    chooser.familyProperty.link(familyListener);

    super({
      align: "left",
      spacing: 6,
      children: [
        new HBox({ spacing: 10, children: [label(controls.familyStringProperty, LABEL_WIDTH), familyCombo] }),
        new HBox({ spacing: 10, children: [label(controls.moleculeStringProperty, LABEL_WIDTH), moleculeSlot] }),
      ],
    });

    this.disposeMoleculeChooserNode = () => {
      chooser.familyProperty.unlink(familyListener);
      familyCombo.dispose();
      for (const combo of moleculeCombos) {
        combo.dispose();
      }
    };
  }

  public override dispose(): void {
    this.disposeMoleculeChooserNode();
    super.dispose();
  }
}
