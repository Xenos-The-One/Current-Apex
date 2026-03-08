/**
 * Performance Analytics Agent
 * 
 * Responsibilities:
 * - Track KPIs (leads, conversions, revenue, CPL, show rates)
 * - Generate insights using LLM
 * - Forecast pipeline and revenue
 * - Identify trends and anomalies
 * - Send weekly performance reports
 */

import { getDb } from '../db';
import { leads, appointments, webinarRegistrations, leadActivities } from '../../drizzle/schema';
import { sql, desc, eq, and, gte, between } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { invokeLLM } from '../_core/llm';

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

export interface KPIMetrics {
  period: string;
  totalLeads: number;
  appointmentsBooked: number;
  appointmentsShown: number;
  webinarSignups: number;
  webinarAttendance: number;
  callsMade: number;
  conversionRate: number;
  showRate: number;
  avgResponseTime: number;
}

export interface TrendAnalysis {
  metric: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  insight: string;
}

export class PerformanceAnalyticsAgent {
  
  /**
   * Get KPI metrics for a time period
   */
  async getKPIs(startDate: Date, endDate: Date): Promise<KPIMetrics> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Use raw SQL for date comparisons to avoid type issues
    const metrics = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM leads WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}) as total_leads,
        (SELECT COUNT(*) FROM appointments WHERE created_at >= ${startDate} AND created_at <= ${endDate}) as appointments_booked,
        (SELECT COUNT(*) FROM appointments WHERE status = 'completed' AND created_at >= ${startDate} AND created_at <= ${endDate}) as appointments_shown,
        (SELECT COUNT(*) FROM webinar_registrations WHERE created_at >= ${startDate} AND created_at <= ${endDate}) as webinar_signups,
        (SELECT COUNT(*) FROM lead_activities WHERE activity_type = 'call' AND createdAt >= ${startDate} AND createdAt <= ${endDate}) as calls_made
    `);
    
    const row = (metrics as any)[0] || {};
    const totalLeads = Number(row.total_leads) || 0;
    const appointmentsBooked = Number(row.appointments_booked) || 0;
    const appointmentsShown = Number(row.appointments_shown) || 0;
    const webinarSignups = Number(row.webinar_signups) || 0;
    const callsMade = Number(row.calls_made) || 0;
    
    // Calculate rates
    const conversionRate = totalLeads > 0 ? (appointmentsBooked / totalLeads) * 100 : 0;
    const showRate = appointmentsBooked > 0 ? (appointmentsShown / appointmentsBooked) * 100 : 0;
    
    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalLeads,
      appointmentsBooked,
      appointmentsShown,
      webinarSignups,
      webinarAttendance: 0, // TODO: Track actual attendance
      callsMade,
      conversionRate: Math.round(conversionRate * 10) / 10,
      showRate: Math.round(showRate * 10) / 10,
      avgResponseTime: 0 // TODO: Calculate from lead_activities
    };
  }
  
  /**
   * Compare two time periods and identify trends
   */
  async analyzeTrends(currentPeriod: KPIMetrics, previousPeriod: KPIMetrics): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];
    
    // Helper function to calculate trend
    const calculateTrend = (current: number, previous: number): { trend: 'up' | 'down' | 'stable', change: number } => {
      if (previous === 0) return { trend: 'stable', change: 0 };
      const change = ((current - previous) / previous) * 100;
      if (Math.abs(change) < 5) return { trend: 'stable', change: 0 };
      return { trend: change > 0 ? 'up' : 'down', change: Math.abs(change) };
    };
    
    // Analyze each metric
    const leadsTrend = calculateTrend(currentPeriod.totalLeads, previousPeriod.totalLeads);
    trends.push({
      metric: 'Total Leads',
      trend: leadsTrend.trend,
      change: leadsTrend.change,
      insight: `Leads ${leadsTrend.trend === 'up' ? 'increased' : leadsTrend.trend === 'down' ? 'decreased' : 'remained stable'} by ${leadsTrend.change.toFixed(1)}%`
    });
    
    const conversionTrend = calculateTrend(currentPeriod.conversionRate, previousPeriod.conversionRate);
    trends.push({
      metric: 'Conversion Rate',
      trend: conversionTrend.trend,
      change: conversionTrend.change,
      insight: `Conversion rate ${conversionTrend.trend === 'up' ? 'improved' : conversionTrend.trend === 'down' ? 'declined' : 'remained stable'} by ${conversionTrend.change.toFixed(1)}%`
    });
    
    const showRateTrend = calculateTrend(currentPeriod.showRate, previousPeriod.showRate);
    trends.push({
      metric: 'Show Rate',
      trend: showRateTrend.trend,
      change: showRateTrend.change,
      insight: `Show rate ${showRateTrend.trend === 'up' ? 'improved' : showRateTrend.trend === 'down' ? 'declined' : 'remained stable'} by ${showRateTrend.change.toFixed(1)}%`
    });
    
    return trends;
  }
  
  /**
   * Generate AI-powered insights from metrics
   */
  async generateInsights(metrics: KPIMetrics, trends: TrendAnalysis[]): Promise<string> {
    const prompt = `Analyze the following business metrics and provide actionable insights:

Current Period Metrics:
- Total Leads: ${metrics.totalLeads}
- Appointments Booked: ${metrics.appointmentsBooked}
- Appointments Shown: ${metrics.appointmentsShown}
- Webinar Signups: ${metrics.webinarSignups}
- Calls Made: ${metrics.callsMade}
- Conversion Rate: ${metrics.conversionRate}%
- Show Rate: ${metrics.showRate}%

Trends:
${trends.map(t => `- ${t.metric}: ${t.insight}`).join('\n')}

Provide:
1. Top 3 insights (what's working, what's not)
2. Top 3 action items to improve performance
3. One strategic recommendation for growth

Keep it concise and actionable.`;
    
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a business analyst specializing in lead generation and conversion optimization.' },
        { role: 'user', content: prompt }
      ]
    });
    
    return extractText(response.choices[0].message.content) || 'Unable to generate insights';
  }
  
  /**
   * Forecast next period's performance
   */
  async forecastPerformance(historicalMetrics: KPIMetrics[]): Promise<KPIMetrics> {
    if (historicalMetrics.length < 2) {
      throw new Error('Need at least 2 periods of historical data for forecasting');
    }
    
    // Simple linear regression for forecasting
    const avgLeadGrowth = historicalMetrics.reduce((sum, m, i) => {
      if (i === 0) return 0;
      return sum + (m.totalLeads - historicalMetrics[i - 1].totalLeads);
    }, 0) / (historicalMetrics.length - 1);
    
    const lastPeriod = historicalMetrics[historicalMetrics.length - 1];
    const forecastedLeads = Math.max(0, Math.round(lastPeriod.totalLeads + avgLeadGrowth));
    const forecastedAppointments = Math.round(forecastedLeads * (lastPeriod.conversionRate / 100));
    const forecastedShows = Math.round(forecastedAppointments * (lastPeriod.showRate / 100));
    
    return {
      period: 'Next Period (Forecast)',
      totalLeads: forecastedLeads,
      appointmentsBooked: forecastedAppointments,
      appointmentsShown: forecastedShows,
      webinarSignups: Math.round(lastPeriod.webinarSignups * 1.1), // Assume 10% growth
      webinarAttendance: 0,
      callsMade: Math.round(forecastedLeads * 0.8), // Assume 80% call rate
      conversionRate: lastPeriod.conversionRate,
      showRate: lastPeriod.showRate,
      avgResponseTime: lastPeriod.avgResponseTime
    };
  }
  
  /**
   * Generate and send weekly performance report
   */
  async sendWeeklyReport(): Promise<void> {
    try {
      // Get current week metrics
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(weekAgo);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
      
      const currentWeek = await this.getKPIs(weekAgo, today);
      const previousWeek = await this.getKPIs(twoWeeksAgo, weekAgo);
      
      // Analyze trends
      const trends = await this.analyzeTrends(currentWeek, previousWeek);
      
      // Generate insights
      const insights = await this.generateInsights(currentWeek, trends);
      
      // Format report
      const report = `📊 Weekly Performance Report

**Current Week (${currentWeek.period})**
- Leads: ${currentWeek.totalLeads}
- Appointments: ${currentWeek.appointmentsBooked} (${currentWeek.conversionRate}% conversion)
- Shows: ${currentWeek.appointmentsShown} (${currentWeek.showRate}% show rate)
- Webinar Signups: ${currentWeek.webinarSignups}
- AI Calls: ${currentWeek.callsMade}

**Trends vs. Previous Week**
${trends.map(t => `${t.trend === 'up' ? '📈' : t.trend === 'down' ? '📉' : '➡️'} ${t.metric}: ${t.insight}`).join('\n')}

**AI-Generated Insights**
${insights}`;
      
      // Send to owner
      await notifyOwner({
        title: '📊 Weekly Performance Report',
        content: report
      });
      
      console.log('[Analytics Agent] Weekly report sent');
    } catch (error) {
      console.error('[Analytics Agent] Failed to send weekly report:', error);
    }
  }
  
  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(): Promise<void> {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const todayMetrics = await this.getKPIs(yesterday, today);
      const weekAvg = await this.getKPIs(weekAgo, today);
      
      const anomalies: string[] = [];
      
      // Check for significant drops
      if (todayMetrics.totalLeads < weekAvg.totalLeads * 0.5) {
        anomalies.push(`⚠️ Lead volume dropped significantly: ${todayMetrics.totalLeads} vs ${Math.round(weekAvg.totalLeads)} avg`);
      }
      
      if (todayMetrics.conversionRate < weekAvg.conversionRate * 0.7) {
        anomalies.push(`⚠️ Conversion rate dropped: ${todayMetrics.conversionRate}% vs ${weekAvg.conversionRate}% avg`);
      }
      
      if (anomalies.length > 0) {
        await notifyOwner({
          title: '🚨 Performance Anomaly Detected',
          content: anomalies.join('\n')
        });
      }
    } catch (error) {
      console.error('[Analytics Agent] Failed to detect anomalies:', error);
    }
  }
}

// Singleton instance
export const analyticsAgent = new PerformanceAnalyticsAgent();
