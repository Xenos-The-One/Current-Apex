/**
 * Lead Qualification Agent
 * 
 * Automatically scores and routes incoming leads based on quality criteria.
 * Integrates with existing lead scoring system and automation workflows.
 */

import { getDb } from '../db';
import { leads, leadActivities } from '../../drizzle/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { smsCommandSystem } from './sms-command-system';
import { invokeLLM } from '../_core/llm';

export interface LeadScore {
  leadId: number;
  score: number;
  tier: 'hot' | 'warm' | 'cold' | 'spam';
  reasons: string[];
  recommendedAction: string;
}

export class LeadQualificationAgent {
  /**
   * Score a lead based on multiple criteria
   */
  async scoreLead(leadId: number): Promise<LeadScore> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get lead data
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId));
    
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }
    
    let score = 0;
    const reasons: string[] = [];
    
    // Scoring criteria
    
    // 1. Source quality (20 points)
    if (lead.source === 'facebook_webhook') {
      score += 15;
      reasons.push('High-quality source (Facebook Lead Ad)');
    } else if (lead.source === 'webinar_registration') {
      score += 20;
      reasons.push('Very high intent (Webinar registration)');
    } else if (lead.source === 'referral') {
      score += 18;
      reasons.push('Trusted source (Referral)');
    }
    
    // 2. Contact information completeness (20 points)
    if (lead.email && lead.phone) {
      score += 20;
      reasons.push('Complete contact information');
    } else if (lead.email || lead.phone) {
      score += 10;
      reasons.push('Partial contact information');
    }
    
    // 3. Response time (15 points)
    const now = new Date();
    const createdAt = new Date(lead.createdAt);
    const minutesSinceCreated = (now.getTime() - createdAt.getTime()) / 1000 / 60;
    
    if (minutesSinceCreated < 5) {
      score += 15;
      reasons.push('Fresh lead (< 5 minutes old)');
    } else if (minutesSinceCreated < 60) {
      score += 10;
      reasons.push('Recent lead (< 1 hour old)');
    } else if (minutesSinceCreated < 1440) {
      score += 5;
      reasons.push('Same-day lead');
    }
    
    // 4. Engagement signals (15 points)
    const activities = await db
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId));
    
    if (activities.length > 0) {
      score += Math.min(15, activities.length * 3);
      reasons.push(`${activities.length} engagement activities`);
    }
    
    // 5. Lead metadata quality (15 points)
    const metadata = lead.customFields as any;
    if (metadata) {
      if (metadata.loan_type || metadata.property_type) {
        score += 10;
        reasons.push('Specific intent indicated');
      }
      if (metadata.timeline === 'immediate' || metadata.urgency === 'high') {
        score += 5;
        reasons.push('High urgency');
      }
    }
    
    // 6. Spam detection (-50 points)
    const spamIndicators = this.detectSpam(lead);
    if (spamIndicators.length > 0) {
      score -= 50;
      reasons.push(...spamIndicators.map(s => `SPAM: ${s}`));
    }
    
    // Determine tier
    let tier: 'hot' | 'warm' | 'cold' | 'spam';
    let recommendedAction: string;
    
    if (score < 0) {
      tier = 'spam';
      recommendedAction = 'Mark as spam, do not contact';
    } else if (score >= 60) {
      tier = 'hot';
      recommendedAction = 'Immediate Vapi call + SMS follow-up';
    } else if (score >= 40) {
      tier = 'warm';
      recommendedAction = 'Schedule Vapi call within 1 hour';
    } else {
      tier = 'cold';
      recommendedAction = 'Add to nurture campaign, call within 24 hours';
    }
    
    return {
      leadId,
      score,
      tier,
      reasons,
      recommendedAction
    };
  }
  
  /**
   * Detect spam indicators
   */
  private detectSpam(lead: any): string[] {
    const indicators: string[] = [];
    
    // Check for test/fake data
    if (lead.email?.includes('test@') || lead.email?.includes('@test.')) {
      indicators.push('Test email address');
    }
    
    if (lead.phone === '5555551234' || lead.phone?.startsWith('555555')) {
      indicators.push('Fake phone number');
    }
    
    if (lead.firstName?.toLowerCase().includes('test') || lead.firstName?.toLowerCase() === 'john doe') {
      indicators.push('Generic/test name');
    }
    
    // Check for gibberish
    if (lead.firstName && !/^[a-zA-Z\s'-]+$/.test(lead.firstName)) {
      indicators.push('Invalid characters in name');
    }
    
    return indicators;
  }
  
  /**
   * Route lead based on score
   */
  async routeLead(leadScore: LeadScore): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Update lead with score
    await db
      .update(leads)
      .set({
        score: leadScore.score,
        status: leadScore.tier === 'spam' ? 'closed_lost' : 'new'
      })
      .where(eq(leads.id, leadScore.leadId));
    
    // Take action based on tier
    switch (leadScore.tier) {
      case 'hot':
        // Immediate Vapi call
        await this.triggerVapiCall(leadScore.leadId, 0); // 0 delay
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Lead Qualification Agent',
          priority: 'high',
          message: `🔥 Hot lead #${leadScore.leadId} (Score: ${leadScore.score})\n${leadScore.reasons.join(', ')}\nAction: Immediate Vapi call triggered`,
          requiresResponse: false
        });
        break;
      
      case 'warm':
        // Schedule Vapi call in 1 hour
        await this.triggerVapiCall(leadScore.leadId, 60); // 60 min delay
        break;
      
      case 'cold':
        // Add to nurture campaign
        await this.addToNurtureCampaign(leadScore.leadId);
        break;
      
      case 'spam':
        // Mark as spam
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Lead Qualification Agent',
          priority: 'low',
          message: `🚫 Spam lead #${leadScore.leadId} detected and marked`,
          requiresResponse: false
        });
        break;
    }
  }
  
  /**
   * Trigger Vapi call for a lead
   */
  private async triggerVapiCall(leadId: number, delayMinutes: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId));
    
    if (!lead || !lead.phone) {
      console.log(`[Lead Qualification] Cannot trigger Vapi call for lead ${leadId}: missing phone`);
      return;
    }
    
    // Add to  table (existing system)
    await db.execute(sql`
      INSERT INTO  (lead_id, phone_number, scheduled_for, status)
      VALUES (${leadId}, ${lead.phone}, DATE_ADD(NOW(), INTERVAL ${delayMinutes} MINUTE), 'pending')
    `);
    
    console.log(`[Lead Qualification] Vapi call queued for lead ${leadId} (delay: ${delayMinutes} min)`);
  }
  
  /**
   * Add lead to nurture campaign
   */
  private async addToNurtureCampaign(leadId: number): Promise<void> {
    // This will be implemented by Client Nurture Agent
    console.log(`[Lead Qualification] Lead ${leadId} added to nurture campaign`);
  }
  
  /**
   * Process all new leads (called by cron)
   */
  async processNewLeads(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get all leads created in last 5 minutes that haven't been scored
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const newLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          gte(leads.createdAt, fiveMinutesAgo),
          eq(leads.score, 0) // Not yet scored
        )
      );
    
    console.log(`[Lead Qualification] Processing ${newLeads.length} new leads`);
    
    for (const lead of newLeads) {
      try {
        const leadScore = await this.scoreLead(lead.id);
        await this.routeLead(leadScore);
      } catch (error) {
        console.error(`[Lead Qualification] Error processing lead ${lead.id}:`, error);
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Lead Qualification Agent',
          priority: 'medium',
          message: `⚠️ Error processing lead #${lead.id}: ${error instanceof Error ? error.message : String(error)}`,
          requiresResponse: false
        });
      }
    }
  }
  
  /**
   * Get qualification stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_leads,
        AVG(score) as avg_score,
        SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END) as hot_leads,
        SUM(CASE WHEN score >= 40 AND score < 60 THEN 1 ELSE 0 END) as warm_leads,
        SUM(CASE WHEN score > 0 AND score < 40 THEN 1 ELSE 0 END) as cold_leads,
        SUM(CASE WHEN score < 0 OR status = 'disqualified' THEN 1 ELSE 0 END) as spam_leads
      FROM leads
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `);
    
    return stats[0];
  }
}

// Singleton instance
export const leadQualificationAgent = new LeadQualificationAgent();
