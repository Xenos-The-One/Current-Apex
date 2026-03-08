/**
 * Business Hours Utility
 * 
 * Manages business hours for automated calling and lead contact
 */

export interface BusinessHours {
  start: number; // Hour in 24h format (0-23)
  end: number;   // Hour in 24h format (0-23)
  timezone: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
}

// Default business hours: 9 AM - 10 PM PST, 7 days a week
export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  start: 9,  // 9 AM
  end: 22,   // 10 PM
  timezone: 'America/Los_Angeles', // PST/PDT
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
};

/**
 * Check if current time is within business hours
 */
export function isWithinBusinessHours(
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): boolean {
  const now = new Date();
  
  // Convert to business timezone
  const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: hours.timezone }));
  
  const currentHour = timeInZone.getHours();
  const currentDay = timeInZone.getDay();
  
  // Check if current day is a business day
  if (!hours.daysOfWeek.includes(currentDay)) {
    return false;
  }
  
  // Check if current hour is within business hours
  return currentHour >= hours.start && currentHour < hours.end;
}

/**
 * Get the next business hours start time
 */
export function getNextBusinessHoursStart(
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): Date {
  const now = new Date();
  const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: hours.timezone }));
  
  const currentHour = timeInZone.getHours();
  const currentDay = timeInZone.getDay();
  
  // If we're before business hours today, return today's start time
  if (hours.daysOfWeek.includes(currentDay) && currentHour < hours.start) {
    const nextStart = new Date(timeInZone);
    nextStart.setHours(hours.start, 0, 0, 0);
    return nextStart;
  }
  
  // Otherwise, find the next business day
  let daysToAdd = 1;
  let nextDay = (currentDay + 1) % 7;
  
  while (!hours.daysOfWeek.includes(nextDay) && daysToAdd < 7) {
    daysToAdd++;
    nextDay = (currentDay + daysToAdd) % 7;
  }
  
  const nextStart = new Date(timeInZone);
  nextStart.setDate(nextStart.getDate() + daysToAdd);
  nextStart.setHours(hours.start, 0, 0, 0);
  
  return nextStart;
}

/**
 * Format business hours for display
 */
export function formatBusinessHours(
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): string {
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour} ${period}`;
  };
  
  const days = hours.daysOfWeek.length === 7 
    ? '7 days a week' 
    : hours.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
  
  return `${formatHour(hours.start)} - ${formatHour(hours.end)}, ${days}`;
}

/**
 * Calculate delay until next business hours (in milliseconds)
 */
export function getDelayUntilBusinessHours(
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): number {
  if (isWithinBusinessHours(hours)) {
    return 0;
  }
  
  const now = new Date();
  const nextStart = getNextBusinessHoursStart(hours);
  
  return nextStart.getTime() - now.getTime();
}
