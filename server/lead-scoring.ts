/**
 * Lead Scoring Algorithm
 * 
 * Automatically calculates lead scores based on engagement and intent signals
 * to help prioritize high-value prospects.
 */

export interface LeadScoringFactors {
  // Form submission quality (0-15 points)
  hasPhone: boolean;
  hasEmail: boolean;
  hasNotes: boolean;
  hasPropertyAddress: boolean;
  
  // Engagement signals (0-100 points)
  phoneAnswered: boolean;        // +30 points
  appointmentBooked: boolean;    // +50 points
  emailOpened: boolean;          // +10 points
  quickResponse: boolean;        // +10 points (responded within 1 hour)
  
  // Follow-up engagement (5 points per interaction)
  followUpCount: number;
}

export interface LeadScore {
  total: number;
  tier: 'hot' | 'warm' | 'cold';
  breakdown: {
    formQuality: number;
    engagement: number;
    followUp: number;
  };
}

/**
 * Calculate lead score based on engagement factors
 */
export function calculateLeadScore(factors: LeadScoringFactors): LeadScore {
  let formQuality = 0;
  let engagement = 0;
  let followUp = 0;

  // Form submission quality (max 15 points)
  if (factors.hasPhone) formQuality += 5;
  if (factors.hasEmail) formQuality += 5;
  if (factors.hasNotes) formQuality += 2;
  if (factors.hasPropertyAddress) formQuality += 3;

  // Engagement signals (max 100 points)
  if (factors.appointmentBooked) engagement += 50;  // Highest intent
  if (factors.phoneAnswered) engagement += 30;      // Very high intent
  if (factors.emailOpened) engagement += 10;        // Medium intent
  if (factors.quickResponse) engagement += 10;      // Shows urgency

  // Follow-up engagement (5 points per interaction, max 25)
  followUp = Math.min(factors.followUpCount * 5, 25);

  const total = formQuality + engagement + followUp;

  // Determine tier
  let tier: 'hot' | 'warm' | 'cold';
  if (total >= 80) {
    tier = 'hot';
  } else if (total >= 50) {
    tier = 'warm';
  } else {
    tier = 'cold';
  }

  return {
    total,
    tier,
    breakdown: {
      formQuality,
      engagement,
      followUp,
    },
  };
}

/**
 * Get lead score from database lead record
 */
export function getLeadScoreFromRecord(lead: any): LeadScore {
  // Parse activity log to determine engagement
  const activities = lead.custom_fields ? JSON.parse(lead.custom_fields) : {};
  const activityLog = activities.activityLog || [];

  // Check for engagement signals
  const phoneAnswered = activityLog.some((a: any) => 
    a.type === 'call' && a.details?.includes('answered')
  );
  
  const appointmentBooked = lead.appointment_date !== null;
  
  const emailOpened = activityLog.some((a: any) => 
    a.type === 'email' && a.details?.includes('opened')
  );

  // Check response time (quick response = within 1 hour of creation)
  const createdAt = new Date(lead.createdAt);
  const firstActivity = activityLog[1]; // Skip initial creation activity
  const quickResponse = firstActivity ? 
    (new Date(firstActivity.timestamp).getTime() - createdAt.getTime()) < 3600000 : false;

  // Count follow-up interactions
  const followUpCount = activityLog.filter((a: any) => 
    a.type === 'call' || a.type === 'email' || a.type === 'sms'
  ).length;

  const factors: LeadScoringFactors = {
    hasPhone: !!lead.phone,
    hasEmail: !!lead.email,
    hasNotes: !!lead.notes,
    hasPropertyAddress: !!activities.propertyAddress,
    phoneAnswered,
    appointmentBooked,
    emailOpened,
    quickResponse,
    followUpCount,
  };

  return calculateLeadScore(factors);
}

/**
 * Get visual indicator for lead tier
 */
export function getLeadTierBadge(tier: 'hot' | 'warm' | 'cold'): {
  emoji: string;
  label: string;
  color: string;
} {
  switch (tier) {
    case 'hot':
      return { emoji: '🔥', label: 'Hot Lead', color: 'red' };
    case 'warm':
      return { emoji: '⚡', label: 'Warm Lead', color: 'yellow' };
    case 'cold':
      return { emoji: '❄️', label: 'Cold Lead', color: 'blue' };
  }
}

/**
 * Get score breakdown explanation
 */
export function getScoreBreakdownText(score: LeadScore): string {
  const lines = [];
  
  lines.push(`Total Score: ${score.total}/140`);
  lines.push(`Tier: ${score.tier.toUpperCase()}`);
  lines.push('');
  lines.push('Breakdown:');
  lines.push(`• Form Quality: ${score.breakdown.formQuality}/15`);
  lines.push(`• Engagement: ${score.breakdown.engagement}/100`);
  lines.push(`• Follow-ups: ${score.breakdown.followUp}/25`);
  
  return lines.join('\n');
}
