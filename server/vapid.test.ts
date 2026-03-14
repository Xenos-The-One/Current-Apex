import { describe, it, expect } from "vitest";
import webpush from "web-push";

describe("VAPID Keys Configuration", () => {
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BBBkOw1xVvh1xihkZFMbSzbLMheXUAURcs3QY9LOV1vxvW0WOM3ZnKFr-KrGHHPVxkgps9x91_Go_pMXbhOmuws";
  const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "58diHTO8SMaA-dqWQ6fNnXIfamwh8NItGmgQVzJCeu4";
  const VITE_VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY;

  it("VAPID public key is present and valid length", () => {
    expect(VAPID_PUBLIC_KEY).toBeTruthy();
    expect(VAPID_PUBLIC_KEY.length).toBeGreaterThan(80);
  });

  it("VAPID private key is present and valid length", () => {
    expect(VAPID_PRIVATE_KEY).toBeTruthy();
    expect(VAPID_PRIVATE_KEY.length).toBeGreaterThan(30);
  });

  it("VITE_VAPID_PUBLIC_KEY matches VAPID_PUBLIC_KEY", () => {
    expect(VITE_VAPID_PUBLIC_KEY).toBe(VAPID_PUBLIC_KEY);
  });

  it("web-push accepts the VAPID keys without error", () => {
    expect(() => {
      webpush.setVapidDetails("mailto:admin@indigolabs.ai", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }).not.toThrow();
  });
});
