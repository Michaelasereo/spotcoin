import { describe, expect, it } from "vitest";

import { safeInternalPath } from "@/lib/safeRedirect";

describe("safeInternalPath", () => {
  it("allows same-origin paths", () => {
    expect(safeInternalPath("/admin")).toBe("/admin");
    expect(safeInternalPath("/api/slack/oauth/start")).toBe("/api/slack/oauth/start");
  });

  it("rejects open redirects", () => {
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
  });

  it("rejects path traversal", () => {
    expect(safeInternalPath("/../admin")).toBeNull();
  });
});
