/**
 * signal-table.test.ts
 *
 * Signal rows are buttons, so the list is in the tab order and not only a click target.
 */

import { Property } from "scenerystack/axon";
import { describe, expect, it } from "vitest";
import { SignalTableNode } from "../../src/nmr/view/SignalTableNode.js";

describe("Signal table", () => {
  it("exposes each filled row as a focusable button and hides the rest", () => {
    const rows = new Property([{ main: "a   δ 1.22   3H   t", detail: "J = 7.0 Hz" }]);
    const selected = new Property<number | null>(null);
    const table = new SignalTableNode(rows, selected, 220);
    const buttons = table.children.filter((child) => child.tagName === "button");
    expect(buttons).toHaveLength(8);
    expect(buttons[0]?.visible).toBe(true);
    expect(buttons[0]?.focusable).toBe(true);
    expect(buttons[0]?.accessibleName).toContain("δ 1.22");
    expect(buttons[1]?.visible).toBe(false);
    expect(buttons[1]?.focusable).toBe(false);
    table.dispose();
    rows.dispose();
    selected.dispose();
  });
});
