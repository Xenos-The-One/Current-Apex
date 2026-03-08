/**
 * Content Creation Agent
 * 
 * Generates marketing content using AI:
 * - HeyGen video creation (when API key is available)
 * - Email templates
 * - Social media posts
 * - Market updates
 * - Blog posts
 */

import { smsCommandSystem } from './sms-command-system';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

export interface ContentRequest {
  type: 'video' | 'email' | 'social' | 'blog' | 'market_update';
  topic: string;
  targetAudience: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'educational';
  length?: 'short' | 'medium' | 'long';
}

export interface GeneratedContent {
  type: string;
  content: string;
  metadata?: any;
}

/** Helper to extract text from LLM response content (may be string or array) */
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

export class ContentCreationAgent {
  /**
   * Generate content based on request
   */
  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    switch (request.type) {
      case 'video':
        return await this.generateVideoScript(request);
      case 'email':
        return await this.generateEmailTemplate(request);
      case 'social':
        return await this.generateSocialPost(request);
      case 'blog':
        return await this.generateBlogPost(request);
      case 'market_update':
        return await this.generateMarketUpdate(request);
      default:
        throw new Error(`Unknown content type: ${request.type}`);
    }
  }
  
  /**
   * Generate video script for HeyGen
   */
  private async generateVideoScript(request: ContentRequest): Promise<GeneratedContent> {
    const prompt = `Create a video script for a mortgage loan officer about ${request.topic}.

Target audience: ${request.targetAudience}
Tone: ${request.tone || 'professional'}
Length: ${request.length === 'short' ? '30-45 seconds' : request.length === 'long' ? '2-3 minutes' : '60-90 seconds'}

Requirements:
- Start with a hook to grab attention
- Explain the topic clearly and concisely
- Include a clear call-to-action
- Use simple language (8th grade reading level)
- Be conversational and friendly
- End with: "I'm Tim Haskins, Home Loan Coach, NMLS #1116876"

Format: Just the script, no stage directions or labels.`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a professional scriptwriter for mortgage industry video content.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const script = extractText(response.choices[0].message.content);
    
    return {
      type: 'video',
      content: script,
      metadata: {
        topic: request.topic,
        estimatedDuration: request.length === 'short' ? 45 : request.length === 'long' ? 180 : 90,
        heygenReady: true
      }
    };
  }
  
  /**
   * Generate email template
   */
  private async generateEmailTemplate(request: ContentRequest): Promise<GeneratedContent> {
    const prompt = `Create an email template for a mortgage loan officer about ${request.topic}.

Target audience: ${request.targetAudience}
Tone: ${request.tone || 'professional'}

Requirements:
- Compelling subject line
- Personalization placeholders ({{name}}, {{loan_type}}, etc.)
- Clear value proposition
- Strong call-to-action
- Professional signature
- Under 200 words

Format:
SUBJECT: [subject line]

BODY:
[email body]`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a professional email copywriter for the mortgage industry.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const emailContent = extractText(response.choices[0].message.content);
    
    return {
      type: 'email',
      content: emailContent,
      metadata: {
        topic: request.topic,
        hasPersonalization: emailContent.includes('{{')
      }
    };
  }
  
  /**
   * Generate social media post
   */
  private async generateSocialPost(request: ContentRequest): Promise<GeneratedContent> {
    const prompt = `Create a social media post for a mortgage loan officer about ${request.topic}.

Target audience: ${request.targetAudience}
Tone: ${request.tone || 'casual'}
Platform: Facebook/Instagram

Requirements:
- Attention-grabbing first line
- Include relevant emojis
- 2-3 hashtags
- Call-to-action
- Under 150 words
- Conversational and engaging

Format: Just the post text, ready to copy-paste.`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a social media content creator for the mortgage industry.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const postContent = extractText(response.choices[0].message.content);
    
    return {
      type: 'social',
      content: postContent,
      metadata: {
        topic: request.topic,
        platform: 'facebook_instagram',
        hasHashtags: postContent.includes('#')
      }
    };
  }
  
  /**
   * Generate blog post
   */
  private async generateBlogPost(request: ContentRequest): Promise<GeneratedContent> {
    const prompt = `Write a blog post for a mortgage loan officer about ${request.topic}.

Target audience: ${request.targetAudience}
Tone: ${request.tone || 'educational'}
Length: ${request.length === 'short' ? '400-600 words' : request.length === 'long' ? '1200-1500 words' : '800-1000 words'}

Requirements:
- SEO-friendly title
- Introduction with hook
- 3-5 main sections with subheadings
- Actionable tips or insights
- Conclusion with call-to-action
- Author bio at the end

Format: Markdown with proper headings (##, ###).`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a professional content writer for the mortgage industry.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const blogContent = extractText(response.choices[0].message.content);
    
    return {
      type: 'blog',
      content: blogContent,
      metadata: {
        topic: request.topic,
        wordCount: blogContent.split(' ').length,
        hasSubheadings: blogContent.includes('##')
      }
    };
  }
  
  /**
   * Generate market update
   */
  private async generateMarketUpdate(request: ContentRequest): Promise<GeneratedContent> {
    const prompt = `Create a market update email for mortgage clients about ${request.topic}.

Target audience: ${request.targetAudience}
Tone: ${request.tone || 'professional'}

Requirements:
- Current mortgage rate trends
- What it means for buyers/refinancers
- Action items
- Clear call-to-action
- Under 250 words

Include placeholders for:
- [CURRENT_RATE]
- [RATE_CHANGE]
- [MARKET_TREND]

Format: Email-ready text with subject line.`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a mortgage market analyst writing client updates.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const updateContent = extractText(response.choices[0].message.content);
    
    return {
      type: 'market_update',
      content: updateContent,
      metadata: {
        topic: request.topic,
        needsDataFill: true,
        placeholders: ['CURRENT_RATE', 'RATE_CHANGE', 'MARKET_TREND']
      }
    };
  }
  
  /**
   * Generate weekly content batch
   */
  async generateWeeklyContentBatch(): Promise<void> {
    console.log('[Content Creation] Generating weekly content batch...');
    
    const contentRequests: ContentRequest[] = [
      {
        type: 'video',
        topic: 'Down Payment Assistance Programs',
        targetAudience: 'First-time homebuyers',
        tone: 'educational',
        length: 'short'
      },
      {
        type: 'social',
        topic: 'Mortgage rate update',
        targetAudience: 'Potential buyers',
        tone: 'casual',
        length: 'short'
      },
      {
        type: 'email',
        topic: 'Pre-approval benefits',
        targetAudience: 'Leads in pipeline',
        tone: 'professional',
        length: 'medium'
      },
      {
        type: 'blog',
        topic: 'How to improve your credit score before applying for a mortgage',
        targetAudience: 'Prospective homebuyers',
        tone: 'educational',
        length: 'medium'
      }
    ];
    
    const generatedContent: GeneratedContent[] = [];
    
    for (const request of contentRequests) {
      try {
        const content = await this.generateContent(request);
        generatedContent.push(content);
        
        // Store in database for content calendar
        await this.saveToContentCalendar(content);
        
      } catch (error) {
        console.error(`[Content Creation] Error generating ${request.type} content:`, error);
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Content Creation Agent',
          priority: 'low',
          message: `⚠️ Failed to generate ${request.type} content about "${request.topic}"`,
          requiresResponse: false
        });
      }
    }
    
    // Notify Operations Agent
    await smsCommandSystem.agentToOperations({
      fromAgent: 'Content Creation Agent',
      priority: 'low',
      message: `📝 Weekly content batch generated: ${generatedContent.length}/${contentRequests.length} pieces created`,
      requiresResponse: false
    });
  }
  
  /**
   * Save generated content to content calendar
   */
  private async saveToContentCalendar(content: GeneratedContent): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Store in content_calendar table (to be created)
    await db.execute(sql`
      INSERT INTO content_calendar (type, content, metadata, status, created_at)
      VALUES (
        ${content.type},
        ${content.content},
        ${JSON.stringify(content.metadata)},
        'draft',
        NOW()
      )
    `);
    
    console.log(`[Content Creation] Saved ${content.type} content to calendar`);
  }
  
  /**
   * Get content creation stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_content,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as videos,
        SUM(CASE WHEN type = 'email' THEN 1 ELSE 0 END) as emails,
        SUM(CASE WHEN type = 'social' THEN 1 ELSE 0 END) as social_posts,
        SUM(CASE WHEN type = 'blog' THEN 1 ELSE 0 END) as blog_posts,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
      FROM content_calendar
      WHERE created_at BETWEEN ${startDate} AND ${endDate}
    `);
    
    return stats[0] || {
      total_content: 0,
      videos: 0,
      emails: 0,
      social_posts: 0,
      blog_posts: 0,
      published: 0
    };
  }
}

// Singleton instance
export const contentCreationAgent = new ContentCreationAgent();
