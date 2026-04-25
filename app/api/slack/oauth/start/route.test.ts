import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    SLACK_CLIENT_ID: "client_123",
  },
}));

vi.mock("@/lib/slack/oauthState", () => ({
  createSlackOAuthState: vi.fn(() => "signed_state"),
}));

describe("Slack OAuth start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to login", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects admins to Slack authorize URL with signed state", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin_1",
        role: "ADMIN",
        workspaceId: "ws_1",
      },
    } as never);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toContain("https://slack.com/oauth/v2/authorize?");
    expect(location).toContain("client_id=client_123");
    expect(location).toContain("state=signed_state");
  });
});
