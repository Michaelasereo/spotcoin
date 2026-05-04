import { describe, expect, it } from "vitest";
import { pollResultsEffectiveVisible } from "@/lib/services/pollService";

describe("pollResultsEffectiveVisible", () => {
  it("shows after end for AUTO_AFTER_END", () => {
    const past = new Date(Date.now() - 60_000);
    expect(
      pollResultsEffectiveVisible({
        resultVisibility: "AUTO_AFTER_END",
        resultsVisible: false,
        endsAt: past,
        closedAt: null,
      }),
    ).toBe(true);
  });

  it("hides before end for AUTO_AFTER_END", () => {
    const future = new Date(Date.now() + 60_000);
    expect(
      pollResultsEffectiveVisible({
        resultVisibility: "AUTO_AFTER_END",
        resultsVisible: true,
        endsAt: future,
        closedAt: null,
      }),
    ).toBe(false);
  });

  it("uses resultsVisible flag for MANUAL", () => {
    const future = new Date(Date.now() + 60_000);
    expect(
      pollResultsEffectiveVisible({
        resultVisibility: "MANUAL",
        resultsVisible: true,
        endsAt: future,
        closedAt: null,
      }),
    ).toBe(true);
    expect(
      pollResultsEffectiveVisible({
        resultVisibility: "MANUAL",
        resultsVisible: false,
        endsAt: future,
        closedAt: null,
      }),
    ).toBe(false);
  });
});
