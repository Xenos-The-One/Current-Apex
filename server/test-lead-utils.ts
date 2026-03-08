/**
 * Test Lead Detection Utilities
 *
 * Identifies test leads using three checks (all three must be false to allow outbound comms):
 *   1. email contains "test" (case-insensitive) or uses a test domain
 *   2. phone matches the +1555 test number pattern
 *   3. isTest flag is explicitly set to true on the lead record
 *
 * Usage:
 *   import { isTestLead, logTestLeadSuppression } from "../test-lead-utils";
 *   if (isTestLead(lead)) { logTestLeadSuppression("SMS", lead); return; }
 */

export interface LeadLike {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  isTest?: boolean | null;
}

// Test phone number patterns — +1555XXXXXXX range used for fake numbers
const TEST_PHONE_PATTERNS = [
  /^\+?1?555/,           // +1555... or 555...
  /^\+?1?5551[0-9]{6}$/, // +15551XXXXXX
  /^555-/,               // 555-XXXX-XXXX
  /\b555[0-9]{7}\b/,     // embedded 555 number
];

// Test email patterns
const TEST_EMAIL_PATTERNS = [
  /test/i,
  /example\.com$/i,
  /fake/i,
  /dummy/i,
  /placeholder/i,
  /noreply@/i,
  /no-reply@/i,
];

/**
 * Returns true if the lead should have all outbound communications suppressed.
 * Checks: isTest flag, email pattern, phone pattern.
 */
export function isTestLead(lead: LeadLike): boolean {
  // Check 1: Explicit isTest flag
  if (lead.isTest === true) return true;

  // Check 2: Test email pattern
  if (lead.email) {
    for (const pattern of TEST_EMAIL_PATTERNS) {
      if (pattern.test(lead.email)) return true;
    }
  }

  // Check 3: Test phone pattern
  if (lead.phone) {
    const digitsOnly = lead.phone.replace(/\D/g, "");
    for (const pattern of TEST_PHONE_PATTERNS) {
      if (pattern.test(lead.phone) || pattern.test(digitsOnly)) return true;
    }
  }

  return false;
}

/**
 * Logs a suppression event for debugging/auditing.
 */
export function logTestLeadSuppression(
  channel: "email" | "sms" | "push" | "vapi" | "all",
  lead: LeadLike,
  context?: string
): void {
  const name = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || `Lead #${lead.id}`;
  const reason = lead.isTest
    ? "isTest=true"
    : lead.email && TEST_EMAIL_PATTERNS.some((p) => p.test(lead.email!))
    ? `test email (${lead.email})`
    : `test phone (${lead.phone})`;
  console.log(
    `[TestLead] 🚫 Suppressed ${channel.toUpperCase()} for "${name}" — reason: ${reason}${context ? ` | context: ${context}` : ""}`
  );
}
