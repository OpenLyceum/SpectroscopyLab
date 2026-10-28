/**
 * disposeSubtree.ts
 *
 * Disposes the nodes a panel built for itself. Node.dispose() (and Panel.dispose())
 * do not dispose descendants, and a Text bound to a global StringProperty would
 * otherwise keep the whole panel alive through its bounds listeners.
 *
 * Layout containers (plain Node, VBox, HBox) are walked; anything else is treated as
 * a self-contained component — a Text, a Checkbox, a ComboBox — and disposed without
 * descending into its internals, which it owns and cleans up itself.
 */

import { HBox, Node, VBox } from "scenerystack/scenery";

export function disposeSubtree(root: Node): void {
  for (const child of [...root.children]) {
    const isContainer = child.constructor === Node || child instanceof VBox || child instanceof HBox;
    if (isContainer) {
      disposeSubtree(child);
    }
    if (!child.isDisposed) {
      child.dispose();
    }
  }
}
