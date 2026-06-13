/**
 * Tests for guest-session middleware
 */

import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { guestSessionMiddleware } from "./guest-session";

const TEST_SECRET = "test-secret-for-guest-sessions-32chars!";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(guestSessionMiddleware({ GAME_SESSION_SECRET: TEST_SECRET }));
  app.get("/test", (req, res) => {
    res.json({ guest: (req as any).guest ?? null });
  });
  return app;
}

describe("guestSessionMiddleware", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  it("sets a fuzzy_guest cookie on first visit", async () => {
    const res = await request(app).get("/test");

    expect(res.status).toBe(200);
    expect(res.body.guest).toBeTruthy();
    expect(res.body.guest.type).toBe("guest");
    expect(res.body.guest.deviceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    // Cookie should be set
    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
    const guestCookie = cookies!.find((c: string) =>
      c.startsWith("fuzzy_guest="),
    );
    expect(guestCookie).toBeDefined();
    expect(guestCookie).toContain("HttpOnly");
    expect(guestCookie).toContain("SameSite=Strict");
    expect(guestCookie).toContain("Path=/");
  });

  it("preserves the same deviceId across requests", async () => {
    // First request — get the cookie
    const res1 = await request(app).get("/test");
    const deviceId1 = res1.body.guest.deviceId;

    // Extract cookie
    const cookies = res1.headers["set-cookie"] as unknown as string[];
    const guestCookie = cookies
      .find((c: string) => c.startsWith("fuzzy_guest="))!
      .split(";")[0];

    // Second request — send the cookie back
    const res2 = await request(app)
      .get("/test")
      .set("Cookie", guestCookie!);

    expect(res2.status).toBe(200);
    expect(res2.body.guest.type).toBe("guest");
    expect(res2.body.guest.deviceId).toBe(deviceId1);
  });

  it("mints a new guest when cookie is tampered", async () => {
    const res = await request(app)
      .get("/test")
      .set("Cookie", "fuzzy_guest=tampered.token.value");

    expect(res.status).toBe(200);
    expect(res.body.guest.type).toBe("guest");
    expect(res.body.guest.deviceId).toBeTruthy();

    // Should also set a new cookie
    const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies).toBeDefined();
  });
});
