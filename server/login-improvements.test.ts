import { describe, it, expect } from "vitest";
import { onboardingRouter } from "./routers/onboarding";

describe("Login improvements", () => {
  it("onboardingRouter has getLoginMethod procedure", () => {
    expect(onboardingRouter._def.procedures.getLoginMethod).toBeDefined();
  });

  it("onboardingRouter has requestPasswordReset procedure", () => {
    expect(onboardingRouter._def.procedures.requestPasswordReset).toBeDefined();
  });

  it("onboardingRouter has resetPassword procedure", () => {
    expect(onboardingRouter._def.procedures.resetPassword).toBeDefined();
  });
});
