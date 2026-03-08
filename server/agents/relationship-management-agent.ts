/**
 * Relationship Management Agent
 * 
 * Monitors and optimizes client relationships:
 * - Sentiment analysis on communications
 * - VIP client monitoring
 * - Upsell opportunity detection
 * - Churn risk prediction
 * - Referral request timing
 */

import { smsCommandSystem } from './sms-command-system';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { leads } from '../../drizzle/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export interface ClientSentiment {
  leadId: number;
  leadName: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  reason: string;
  actionRequired: boolean;
}

export interface UpsellOpportunity {
  leadId: number;
  leadName: string;
  opportunity: string;
  confidence: number;
  estimatedValue: number;
}

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

export class RelationshipManagementAgent {
  /**
   * Analyze sentiment of recent client communications
   */
  async analyzeSentiment(): Promise<void> {
    console.log('[Relationship Management] Analyzing client sentiment...');
    
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get leads with recent activity - use valid status values
    const recentLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          sql`status IN ('qualified', 'contacted', 'new')`,
          gte(leads.updatedAt, sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`)
        )
      )
      .limit(20);
    
    const sentiments: ClientSentiment[] = [];
    
    for (const lead of recentLeads) {
      try {
        // Analyze sentiment based on lead notes and custom fields
        const customData = lead.customFields ? JSON.parse(lead.customFields as string) : {};
        const notes = lead.notes || '';
        const lastInteraction = customData.last_interaction || '';
        
        if (!notes && !lastInteraction) continue;
        
        const sentiment = await this.getSentimentFromText(`${notes} ${lastInteraction}`);
        
        sentiments.push({
          leadId: lead.id,
          leadName: lead.firstName || 'Unknown',
          sentiment: sentiment.sentiment,
          score: sentiment.score,
          reason: sentiment.reason,
          actionRequired: sentiment.sentiment === 'negative'
        });
        
        // Alert on negative sentiment
        if (sentiment.sentiment === 'negative') {
          await smsCommandSystem.agentToOperations({
            fromAgent: 'Relationship Management Agent',
            priority: 'high',
            message: `⚠️ Negative sentiment detected for ${lead.firstName}: "${sentiment.reason}". Recommend immediate follow-up.`,
            requiresResponse: true
          });
        }
        
      } catch (error) {
        console.error(`[Relationship Management] Error analyzing sentiment for lead ${lead.id}:`, error);
      }
    }
    
    // Store sentiment analysis results
    await this.storeSentimentAnalysis(sentiments);
  }
  
  /**
   * Get sentiment from text using LLM
   */
  private async getSentimentFromText(text: string): Promise<{ sentiment: 'positive' | 'neutral' | 'negative', score: number, reason: string }> {
    const prompt = `Analyze the sentiment of this client communication:

"${text}"

Determine:
1. Overall sentiment (positive, neutral, or negative)
2. Sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
3. Brief reason for the sentiment

Respond in JSON format.`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a sentiment analysis expert for client communications.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentiment_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
              score: { type: 'number' },
              reason: { type: 'string' }
            },
            required: ['sentiment', 'score', 'reason'],
            additionalProperties: false
          }
        }
      }
    });
    
    return JSON.parse(extractText(response.choices[0].message.content));
  }
  
  /**
   * Detect upsell opportunities
   */
  async detectUpsellOpportunities(): Promise<void> {
    console.log('[Relationship Management] Detecting upsell opportunities...');
    
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get clients who closed deals 6+ months ago
    const pastClients = await db.execute(sql`
      SELECT l.*, 
        DATEDIFF(NOW(), l.updatedAt) as days_since_close
      FROM leads l
      WHERE l.status = 'closed_won'
        AND l.updatedAt >= DATE_SUB(NOW(), INTERVAL 12 MONTHS)
        AND l.updatedAt <= DATE_SUB(NOW(), INTERVAL 6 MONTHS)
      LIMIT 10
    `);
    
    const opportunities: UpsellOpportunity[] = [];
    
    for (const client of pastClients as any[]) {
      try {
        const customData = client.custom_fields ? JSON.parse(client.custom_fields) : {};
        const loanType = customData.loan_type || 'purchase';
        
        // Determine upsell opportunity based on loan type and time since close
        let opportunity = '';
        let confidence = 0;
        let estimatedValue = 0;
        
        if (loanType === 'purchase') {
          opportunity = 'Refinance opportunity - rates may have improved since purchase';
          confidence = 0.7;
          estimatedValue = 2000;
        } else if (loanType === 'refinance') {
          opportunity = 'HELOC opportunity - tap into home equity';
          confidence = 0.6;
          estimatedValue = 1500;
        }
        
        if (opportunity) {
          opportunities.push({
            leadId: client.id,
            leadName: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown',
            opportunity,
            confidence,
            estimatedValue
          });
        }
        
      } catch (error) {
        console.error(`[Relationship Management] Error detecting upsell for client ${client.id}:`, error);
      }
    }
    
    // Alert on high-confidence opportunities
    for (const opp of opportunities) {
      if (opp.confidence >= 0.7) {
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Relationship Management Agent',
          priority: 'medium',
          message: `💰 Upsell opportunity: ${opp.leadName} - ${opp.opportunity} (${(opp.confidence * 100).toFixed(0)}% confidence, $${opp.estimatedValue} value)`,
          requiresResponse: false
        });
      }
    }
  }
  
  /**
   * Identify VIP clients who need special attention
   */
  async monitorVIPClients(): Promise<void> {
    console.log('[Relationship Management] Monitoring VIP clients...');
    
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get VIP clients (high score, recent activity)
    const vipClients = await db.execute(sql`
      SELECT l.*,
        DATEDIFF(NOW(), l.updatedAt) as days_since_contact
      FROM leads l
      WHERE l.score >= 100
        AND l.status IN ('qualified', 'contacted', 'appointment_set', 'closed_won')
      ORDER BY l.updatedAt ASC
      LIMIT 10
    `);
    
    for (const client of vipClients as any[]) {
      const daysSinceContact = client.days_since_contact || 0;
      
      // Alert if VIP hasn't been contacted in 30+ days
      if (daysSinceContact > 30) {
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Relationship Management Agent',
          priority: 'high',
          message: `⭐ VIP client ${client.first_name} hasn't been contacted in ${daysSinceContact} days. Recommend reaching out.`,
          requiresResponse: true
        });
      }
    }
  }
  
  /**
   * Predict churn risk for active clients
   */
  async predictChurnRisk(): Promise<void> {
    console.log('[Relationship Management] Predicting churn risk...');
    
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get active leads that haven't progressed in 14+ days
    const staleLeads = await db.execute(sql`
      SELECT l.*,
        DATEDIFF(NOW(), l.updatedAt) as days_stale
      FROM leads l
      WHERE l.status IN ('qualified', 'contacted', 'new')
        AND l.updatedAt <= DATE_SUB(NOW(), INTERVAL 14 DAY)
      ORDER BY l.updatedAt ASC
      LIMIT 10
    `);
    
    for (const lead of staleLeads as any[]) {
      const daysStale = lead.days_stale || 0;
      const churnRisk = daysStale > 30 ? 'high' : daysStale > 21 ? 'medium' : 'low';
      
      if (churnRisk === 'high') {
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Relationship Management Agent',
          priority: 'high',
          message: `🚨 High churn risk: ${lead.first_name} (${daysStale} days inactive). Recommend immediate re-engagement.`,
          requiresResponse: true
        });
      }
    }
  }
  
  /**
   * Identify clients ready for referral requests
   */
  async identifyReferralOpportunities(): Promise<void> {
    console.log('[Relationship Management] Identifying referral opportunities...');
    
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get recently closed deals (30-60 days ago)
    const recentCloses = await db.execute(sql`
      SELECT l.*
      FROM leads l
      WHERE l.status = 'closed_won'
        AND l.updatedAt >= DATE_SUB(NOW(), INTERVAL 60 DAY)
        AND l.updatedAt <= DATE_SUB(NOW(), INTERVAL 30 DAY)
      LIMIT 5
    `);
    
    for (const client of recentCloses as any[]) {
      await smsCommandSystem.agentToOperations({
        fromAgent: 'Relationship Management Agent',
        priority: 'low',
        message: `🤝 Referral opportunity: ${client.first_name} ${client.last_name} closed 30-60 days ago. Good time to request referrals.`,
        requiresResponse: false
      });
    }
  }
  
  /**
   * Store sentiment analysis results
   */
  private async storeSentimentAnalysis(sentiments: ClientSentiment[]): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    for (const sentiment of sentiments) {
      await db.execute(sql`
        UPDATE leads
        SET custom_fields = JSON_SET(
          COALESCE(custom_fields, '{}'),
          '$.sentiment',
          ${sentiment.sentiment},
          '$.sentiment_score',
          ${sentiment.score},
          '$.sentiment_reason',
          ${sentiment.reason},
          '$.sentiment_updated_at',
          NOW()
        )
        WHERE id = ${sentiment.leadId}
      `);
    }
  }
  
  /**
   * Get stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_analyzed,
        SUM(CASE WHEN custom_fields->>'$.sentiment' = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN custom_fields->>'$.sentiment' = 'neutral' THEN 1 ELSE 0 END) as neutral,
        SUM(CASE WHEN custom_fields->>'$.sentiment' = 'negative' THEN 1 ELSE 0 END) as negative,
        AVG(CAST(custom_fields->>'$.sentiment_score' AS DECIMAL(3,2))) as avg_sentiment_score
      FROM leads
      WHERE custom_fields->>'$.sentiment_updated_at' BETWEEN ${startDate} AND ${endDate}
    `);
    
    return stats[0] || {
      total_analyzed: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      avg_sentiment_score: 0
    };
  }
}

// Singleton instance
export const relationshipManagementAgent = new RelationshipManagementAgent();
