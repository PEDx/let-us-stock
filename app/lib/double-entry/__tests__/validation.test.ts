import { describe, expect, it } from "vitest";

import { addLine, createEntry } from "../entry";
import { EntryLineType } from "../types";
import { validateEntry } from "../validation";

describe("validateEntry", () => {
  it("flags unbalanced multi-line entry", () => {
    let entry = createEntry({
      date: "2024-01-01",
      description: "Split payment",
    });

    entry = addLine(entry, "a1", 100, EntryLineType.DEBIT);
    entry = addLine(entry, "a2", 50, EntryLineType.DEBIT);
    entry = addLine(entry, "a3", 120, EntryLineType.CREDIT);

    const result = validateEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/借贷不平衡/);
  });

  it("accepts balanced multi-line entry", () => {
    let entry = createEntry({
      date: "2024-01-01",
      description: "Split payment",
    });

    entry = addLine(entry, "a1", 100, EntryLineType.DEBIT);
    entry = addLine(entry, "a2", 50, EntryLineType.DEBIT);
    entry = addLine(entry, "a3", 150, EntryLineType.CREDIT);

    const result = validateEntry(entry);
    expect(result.valid).toBe(true);
  });
});
