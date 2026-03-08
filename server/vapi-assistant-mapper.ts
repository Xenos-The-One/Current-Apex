/**
 * Vapi Assistant Mapper
 * 
 * Maps lead sources to specific Vapi assistant IDs
 * Ensures only ONE assistant is triggered per lead
 */

// Assistant IDs from environment variables
// These match the secrets set in the platform:
//   VAPI_FACEBOOK_LEAD_ASSISTANT_ID = 7f99ed0f-6138-4a83-ae31-440cdcfd042b
//   VAPI_IG_LEAD_ASSISTANT_ID       = 312bcd5b-a887-4e33-b68c-3d6e846af390
//   VAPI_REFERRAL_LEAD_ASSISTANT_ID = 1fe6ae06-cd82-4b7c-a932-70ef6fd41ef9
const FACEBOOK_ASSISTANT_ID =
  process.env.VAPI_FACEBOOK_LEAD_ASSISTANT_ID ||
  process.env.VAPI_FACEBOOK_ASSISTANT_ID; // legacy fallback

const INSTAGRAM_ASSISTANT_ID =
  process.env.VAPI_IG_LEAD_ASSISTANT_ID ||
  process.env.VAPI_INSTAGRAM_ASSISTANT_ID; // legacy fallback

const REFERRAL_ASSISTANT_ID =
  process.env.VAPI_REFERRAL_LEAD_ASSISTANT_ID ||
  process.env.VAPI_REFERRAL_ASSISTANT_ID; // legacy fallback

/**
 * Get the correct Vapi assistant ID based on lead source
 */
export function getAssistantIdForLeadSource(source: string | null): string | null {
  if (!source) {
    // Default to referral assistant if no source specified
    return REFERRAL_ASSISTANT_ID || null;
  }

  const sourceLower = source.toLowerCase();

  // Facebook Lead Ads
  if (sourceLower.includes('facebook') || sourceLower.includes('fb')) {
    return FACEBOOK_ASSISTANT_ID || null;
  }

  // Instagram
  if (sourceLower.includes('instagram') || sourceLower.includes('ig')) {
    return INSTAGRAM_ASSISTANT_ID || null;
  }

  // Referrals, datacrawl, or any other source
  if (sourceLower.includes('referral') || sourceLower.includes('datacrawl') || sourceLower.includes('partner')) {
    return REFERRAL_ASSISTANT_ID || null;
  }

  // Default to referral assistant for unknown sources
  return REFERRAL_ASSISTANT_ID || null;
}

/**
 * Get assistant name for logging purposes
 */
export function getAssistantNameForSource(source: string | null): string {
  if (!source) return 'Referral';

  const sourceLower = source.toLowerCase();

  if (sourceLower.includes('facebook') || sourceLower.includes('fb')) {
    return 'Facebook';
  }

  if (sourceLower.includes('instagram') || sourceLower.includes('ig')) {
    return 'Instagram';
  }

  return 'Referral';
}

/**
 * Validate that required assistant IDs are configured
 */
export function validateAssistantConfiguration(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!FACEBOOK_ASSISTANT_ID) missing.push('VAPI_FACEBOOK_LEAD_ASSISTANT_ID');
  if (!INSTAGRAM_ASSISTANT_ID) missing.push('VAPI_IG_LEAD_ASSISTANT_ID');
  if (!REFERRAL_ASSISTANT_ID) missing.push('VAPI_REFERRAL_LEAD_ASSISTANT_ID');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get all configured assistant IDs (for diagnostics / settings page)
 */
export function getConfiguredAssistants() {
  return {
    facebook: {
      id: FACEBOOK_ASSISTANT_ID || null,
      configured: !!FACEBOOK_ASSISTANT_ID,
    },
    instagram: {
      id: INSTAGRAM_ASSISTANT_ID || null,
      configured: !!INSTAGRAM_ASSISTANT_ID,
    },
    referral: {
      id: REFERRAL_ASSISTANT_ID || null,
      configured: !!REFERRAL_ASSISTANT_ID,
    },
  };
}
