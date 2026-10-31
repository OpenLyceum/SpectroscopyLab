/**
 * load-error.test.ts
 *
 * A failed library load leaves a message in the viewer instead of a blank stage.
 */

import { Bounds2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { MoleculeViewModel } from "../../src/common/model/MoleculeViewModel.js";
import { MoleculeViewerNode } from "../../src/common/view/MoleculeViewerNode.js";

describe("Molecule load error", () => {
  it("shows the message only after a load fails", () => {
    const model = new MoleculeViewModel();
    const viewer = new MoleculeViewerNode(model, new Bounds2(0, 0, 300, 240));
    const message = viewer.children.find((child) => child.visible === false && "string" in child);
    expect(message?.visible).toBe(false);
    model.loadErrorProperty.value = true;
    expect(message?.visible).toBe(true);
    viewer.dispose();
    model.dispose();
  });
});
