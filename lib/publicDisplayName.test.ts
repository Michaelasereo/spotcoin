import { describe, expect, it } from "vitest";
import { publicFeedDisplayName } from "@/lib/publicDisplayName";

describe("publicFeedDisplayName", () => {
  it("uses trimmed username when present", () => {
    expect(publicFeedDisplayName({ username: "  alex_k ", email: "alex@corp.com" })).toBe("alex_k");
  });

  it("falls back to email when username is empty", () => {
    expect(publicFeedDisplayName({ username: null, email: "pat@corp.com" })).toBe("pat@corp.com");
    expect(publicFeedDisplayName({ username: "", email: "pat@corp.com" })).toBe("pat@corp.com");
  });
});
