/**
 * MoleculeChooser.ts
 *
 * Two-level choice of a library molecule: a family, then a molecule in that family. Each family
 * remembers its own selection, so the per-family combo boxes always hold a value from their own
 * item list (ComboBox asserts that), and `moleculeIdProperty` follows whichever family is active.
 */

import { DerivedProperty, Property, StringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import {
  availableEntries,
  LIBRARY,
  type LibraryEntry,
  MoleculeFamily,
  type MoleculeFamilyValue,
} from "./library/SpectroscopyLibrary.js";

export class MoleculeChooser {
  public readonly familyProperty: Property<MoleculeFamilyValue>;
  /** Families that have at least one molecule with data, in library order. */
  public readonly families: readonly MoleculeFamilyValue[];
  public readonly selections: ReadonlyMap<MoleculeFamilyValue, StringProperty>;
  public readonly moleculeIdProperty: TReadOnlyProperty<string>;
  private readonly allSelections: StringProperty[];
  private readonly accept: (entry: LibraryEntry) => boolean;

  /**
   * @param initialId - starting molecule; its family becomes the starting family
   * @param accept - restricts the offered molecules (e.g. to those with vibration data)
   */
  public constructor(initialId: string, accept: (entry: LibraryEntry) => boolean = () => true) {
    this.accept = accept;
    const entries = availableEntries().filter(accept);
    this.families = Object.values(MoleculeFamily).filter((family) => entries.some((e) => e.family === family));
    const initial = entries.find((e) => e.id === initialId) ?? entries[0] ?? LIBRARY[0];
    const selections = new Map<MoleculeFamilyValue, StringProperty>();
    for (const family of this.families) {
      const first = entries.find((e) => e.family === family);
      selections.set(family, new StringProperty(initial?.family === family ? initial.id : (first?.id ?? "")));
    }
    this.selections = selections;
    this.allSelections = [...selections.values()];
    this.familyProperty = new Property<MoleculeFamilyValue>(initial?.family ?? MoleculeFamily.SMALL);
    this.moleculeIdProperty = DerivedProperty.deriveAny(
      [this.familyProperty, ...this.allSelections],
      () => selections.get(this.familyProperty.value)?.value ?? initial?.id ?? "",
    );
  }

  /** Molecules offered in one family. */
  public entries(family: MoleculeFamilyValue): LibraryEntry[] {
    return availableEntries(family).filter(this.accept);
  }

  /** Jumps to a molecule by id (switching family). */
  public select(id: string): void {
    const entry = LIBRARY.find((e) => e.id === id);
    const selection = entry ? this.selections.get(entry.family) : undefined;
    if (entry && selection) {
      selection.value = id;
      this.familyProperty.value = entry.family;
    }
  }

  public reset(): void {
    for (const selection of this.allSelections) {
      selection.reset();
    }
    this.familyProperty.reset();
  }

  public dispose(): void {
    disposeOwned(this.moleculeIdProperty);
    this.familyProperty.dispose();
    for (const selection of this.allSelections) {
      selection.dispose();
    }
  }
}

function disposeOwned(property: object): void {
  (property as { dispose?: () => void }).dispose?.();
}
