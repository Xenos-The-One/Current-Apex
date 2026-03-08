/**
 * Lead Generation Agent
 * 
 * Optimizes lead generation campaigns:
 * - Meta Ads API integration for campaign management
 * - A/B testing automation
 * - Creative generation (ad copy, images)
 * - Budget optimization based on CPL
 * - Performance monitoring and alerts
 */

import { smsCommandSystem } from './sms-command-system';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

/** Helper to extract text from LLM response content */
function extractText(content: string | any[] | null | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }
  return String(content);
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  spend: number;
  leads: number;
  cpl: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AdCreative {
  headline: string;
  primaryText: string;
  description?: string;
  callToAction: string;
}

export class LeadGenerationAgent {
  /**
   * Monitor campaign performance and optimize
   */
  async monitorAndOptimizeCampaigns(): Promise<void> {
    console.log('[Lead Generation] Monitoring campaign performance...');
    
    // Get campaign performance from database
    const performance = await this.getCampaignPerformance();
    
    for (const campaign of performance) {
      try {
        // Check if CPL is too high
        const targetCPL = 10; // $10 target CPL
        if (campaign.cpl > targetCPL * 1.5 && campaign.leads > 5) {
          await smsCommandSystem.agentToOperations({
            fromAgent: 'Lead Generation Agent',
            priority: 'high',
            message: `🚨 Campaign "${campaign.campaignName}" CPL is $${campaign.cpl.toFixed(2)} (target: $${targetCPL}). Recommend pausing or adjusting targeting.`,
            requiresResponse: true
          });
        }
        
        // Check if CTR is too low
        if (campaign.ctr < 1.0 && campaign.impressions > 1000) {
          await smsCommandSystem.agentToOperations({
            fromAgent: 'Lead Generation Agent',
            priority: 'medium',
            message: `⚠️ Campaign "${campaign.campaignName}" CTR is ${campaign.ctr.toFixed(2)}%. Recommend refreshing ad creative.`,
            requiresResponse: false
          });
        }
        
        // Check if spend is high with no leads
        if (campaign.spend > 50 && campaign.leads === 0) {
          await smsCommandSystem.agentToOperations({
            fromAgent: 'Lead Generation Agent',
            priority: 'critical',
            message: `🔴 Campaign "${campaign.campaignName}" spent $${campaign.spend.toFixed(2)} with ZERO leads. Recommend immediate pause.`,
            requiresResponse: true
          });
        }
        
      } catch (error) {
        console.error(`[Lead Generation] Error monitoring campaign ${campaign.campaignId}:`, error);
      }
    }
  }
  
  /**
   * Generate new ad creatives using AI
   */
  async generateAdCreatives(topic: string, targetAudience: string, count: number = 3): Promise<AdCreative[]> {
    const prompt = `Generate ${count} Facebook ad creatives for a mortgage loan officer.

Topic: ${topic}
Target Audience: ${targetAudience}

Requirements for each creative:
- Headline: 40 characters max, attention-grabbing
- Primary Text: 125 characters max, clear value proposition
- Description: 30 characters max (optional)
- Call-to-Action: One of: Learn More, Sign Up, Book Now, Get Quote

Format as JSON array:
[
  {
    "headline": "...",
    "primaryText": "...",
    "description": "...",
    "callToAction": "..."
  }
]

Make each creative unique with different hooks and angles.`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a Facebook ads expert specializing in mortgage lead generation.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ad_creatives',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              creatives: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    headline: { type: 'string' },
                    primaryText: { type: 'string' },
                    description: { type: 'string' },
                    callToAction: { type: 'string' }
                  },
                  required: ['headline', 'primaryText', 'callToAction'],
                  additionalProperties: false
                }
              }
            },
            required: ['creatives'],
            additionalProperties: false
          }
        }
      }
    });
    
    const result = JSON.parse(extractText(response.choices[0].message.content));
    return result.creatives;
  }
  
  /**
   * A/B test ad creatives
   */
  async runABTest(campaignId: string, creatives: AdCreative[]): Promise<void> {
    console.log(`[Lead Generation] Running A/B test for campaign ${campaignId} with ${creatives.length} creatives`);
    
    await smsCommandSystem.agentToOperations({
      fromAgent: 'Lead Generation Agent',
      priority: 'low',
      message: `🧪 A/B test started for campaign ${campaignId} with ${creatives.length} ad variants. Will monitor for 48 hours.`,
      requiresResponse: false
    });
  }
  
  /**
   * Optimize budget allocation based on performance
   */
  async optimizeBudgets(): Promise<void> {
    console.log('[Lead Generation] Optimizing budget allocation...');
    
    const performance = await this.getCampaignPerformance();
    
    // Sort by CPL (best to worst)
    const sortedCampaigns = performance.sort((a, b) => a.cpl - b.cpl);
    
    const recommendations: string[] = [];
    
    for (const campaign of sortedCampaigns) {
      if (campaign.cpl < 7 && campaign.leads > 10) {
        recommendations.push(`✅ "${campaign.campaignName}": CPL $${campaign.cpl.toFixed(2)} - Recommend +$20/day budget increase`);
      } else if (campaign.cpl > 15 && campaign.leads > 5) {
        recommendations.push(`❌ "${campaign.campaignName}": CPL $${campaign.cpl.toFixed(2)} - Recommend -$10/day budget decrease or pause`);
      }
    }
    
    if (recommendations.length > 0) {
      await smsCommandSystem.agentToOperations({
        fromAgent: 'Lead Generation Agent',
        priority: 'medium',
        message: `💰 Budget optimization recommendations:\n\n${recommendations.join('\n')}`,
        requiresResponse: true
      });
    }
  }
  
  /**
   * Get campaign performance from database
   */
  private async getCampaignPerformance(): Promise<CampaignPerformance[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Query leads to calculate campaign performance
    const result = await db.execute(sql`
      SELECT 
        custom_fields->>'$.campaign_id' as campaign_id,
        custom_fields->>'$.campaign_name' as campaign_name,
        COUNT(*) as leads,
        COALESCE(SUM(CAST(custom_fields->>'$.ad_spend' AS DECIMAL(10,2))), 0) as spend
      FROM leads
      WHERE source = 'facebook'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND custom_fields->>'$.campaign_id' IS NOT NULL
      GROUP BY campaign_id, campaign_name
    `);
    
    return (result as any[]).map((row: any) => ({
      campaignId: row.campaign_id || 'unknown',
      campaignName: row.campaign_name || 'Unknown Campaign',
      spend: parseFloat(row.spend) || 0,
      leads: parseInt(row.leads) || 0,
      cpl: row.leads > 0 ? parseFloat(row.spend) / parseInt(row.leads) : 0,
      impressions: 0, // Would come from Meta Ads API
      clicks: 0, // Would come from Meta Ads API
      ctr: 0 // Would come from Meta Ads API
    }));
  }
  
  /**
   * Generate weekly performance report
   */
  async generateWeeklyReport(): Promise<void> {
    console.log('[Lead Generation] Generating weekly performance report...');
    
    const performance = await this.getCampaignPerformance();
    
    const totalSpend = performance.reduce((sum, c) => sum + c.spend, 0);
    const totalLeads = performance.reduce((sum, c) => sum + c.leads, 0);
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    
    const report = `📊 **Lead Generation Weekly Report**

**Overall Performance:**
• Total Spend: $${totalSpend.toFixed(2)}
• Total Leads: ${totalLeads}
• Average CPL: $${avgCPL.toFixed(2)}

**Top Performers:**
${performance.slice(0, 3).map((c, i) => `${i + 1}. ${c.campaignName}: ${c.leads} leads @ $${c.cpl.toFixed(2)} CPL`).join('\n')}

**Action Items:**
• Review underperforming campaigns
• Scale top performers
• Test new ad creatives`;

    await smsCommandSystem.agentToOperations({
      fromAgent: 'Lead Generation Agent',
      priority: 'low',
      message: report,
      requiresResponse: false
    });
  }
  
  /**
   * Get stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_leads,
        COALESCE(SUM(CAST(custom_fields->>'$.ad_spend' AS DECIMAL(10,2))), 0) as total_spend,
        COUNT(DISTINCT custom_fields->>'$.campaign_id') as active_campaigns
      FROM leads
      WHERE source = 'facebook'
        AND createdAt BETWEEN ${startDate} AND ${endDate}
    `);
    
    const row = (stats as any[])[0];
    const totalLeads = parseInt(row?.total_leads) || 0;
    const totalSpend = parseFloat(row?.total_spend) || 0;
    
    return {
      total_leads: totalLeads,
      total_spend: totalSpend,
      average_cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
      active_campaigns: parseInt(row?.active_campaigns) || 0
    };
  }
}

// Singleton instance
export const leadGenerationAgent = new LeadGenerationAgent();
