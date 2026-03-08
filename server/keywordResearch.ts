/**
 * Keyword Research Module
 * Provides keyword suggestions, search volume, and difficulty metrics
 */

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  difficulty: number; // 0-100
  cpc?: number;
  competition?: string;
  trend?: "rising" | "stable" | "declining";
}

export interface KeywordSuggestion {
  keyword: string;
  relevance: number; // 0-100
  searchVolume: number;
  difficulty: number;
}

/**
 * Get keyword suggestions and metrics using AI-powered analysis
 * This uses the built-in LLM to generate keyword suggestions based on topic
 */
export async function getKeywordSuggestions(
  topic: string,
  count: number = 10
): Promise<KeywordSuggestion[]> {
  const { invokeLLM } = await import("./_core/llm");

  const prompt = `You are an SEO keyword research expert. Analyze the following topic and provide ${count} highly relevant keyword suggestions.

Topic: ${topic}

For each keyword, provide:
1. The keyword phrase
2. Relevance score (0-100, how relevant to the topic)
3. Estimated monthly search volume (realistic numbers)
4. SEO difficulty (0-100, where 0 is easy and 100 is very difficult)

Consider:
- Long-tail keywords (3-5 words) are often easier to rank for
- Include a mix of informational, transactional, and navigational keywords
- Focus on keywords with good search volume but manageable difficulty
- Include semantic variations and related terms

Return ONLY a JSON array with this exact structure:
[
  {
    "keyword": "example keyword phrase",
    "relevance": 85,
    "searchVolume": 2400,
    "difficulty": 45
  }
]`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an SEO keyword research expert. Always respond with valid JSON only, no explanations." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "keyword_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    keyword: { type: "string" },
                    relevance: { type: "number" },
                    searchVolume: { type: "number" },
                    difficulty: { type: "number" }
                  },
                  required: ["keyword", "relevance", "searchVolume", "difficulty"],
                  additionalProperties: false
                }
              }
            },
            required: ["keywords"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);
    return parsed.keywords || [];
  } catch (error) {
    console.error("Keyword research failed:", error);
    // Return fallback suggestions based on topic
    return generateFallbackKeywords(topic, count);
  }
}

/**
 * Generate fallback keyword suggestions when API fails
 */
function generateFallbackKeywords(topic: string, count: number): KeywordSuggestion[] {
  const baseKeyword = topic.toLowerCase().trim();
  const suggestions: KeywordSuggestion[] = [];

  // Generate variations
  const prefixes = ["how to", "what is", "best", "top", "guide to", "tips for", "benefits of"];
  const suffixes = ["guide", "tutorial", "tips", "examples", "strategies", "tools", "techniques"];

  // Add base keyword
  suggestions.push({
    keyword: baseKeyword,
    relevance: 100,
    searchVolume: Math.floor(Math.random() * 5000) + 1000,
    difficulty: Math.floor(Math.random() * 40) + 30
  });

  // Add prefix variations
  for (const prefix of prefixes.slice(0, Math.min(4, count - 1))) {
    suggestions.push({
      keyword: `${prefix} ${baseKeyword}`,
      relevance: Math.floor(Math.random() * 20) + 70,
      searchVolume: Math.floor(Math.random() * 3000) + 500,
      difficulty: Math.floor(Math.random() * 30) + 20
    });
  }

  // Add suffix variations
  for (const suffix of suffixes.slice(0, Math.min(4, count - suggestions.length))) {
    suggestions.push({
      keyword: `${baseKeyword} ${suffix}`,
      relevance: Math.floor(Math.random() * 20) + 65,
      searchVolume: Math.floor(Math.random() * 2000) + 300,
      difficulty: Math.floor(Math.random() * 35) + 25
    });
  }

  return suggestions.slice(0, count);
}

/**
 * Analyze content and suggest keyword optimizations
 */
export async function analyzeContentKeywords(
  content: string,
  targetKeywords: string[]
): Promise<{
  keywordDensity: Record<string, number>;
  suggestions: string[];
  score: number;
}> {
  const wordCount = content.split(/\s+/).length;
  const contentLower = content.toLowerCase();

  // Calculate keyword density
  const keywordDensity: Record<string, number> = {};
  for (const keyword of targetKeywords) {
    const regex = new RegExp(keyword.toLowerCase(), "gi");
    const matches = content.match(regex);
    const count = matches ? matches.length : 0;
    keywordDensity[keyword] = (count / wordCount) * 100;
  }

  // Generate optimization suggestions
  const suggestions: string[] = [];
  for (const [keyword, density] of Object.entries(keywordDensity)) {
    if (density === 0) {
      suggestions.push(`Add the keyword "${keyword}" to your content (currently not present)`);
    } else if (density < 0.5) {
      suggestions.push(`Increase usage of "${keyword}" (current density: ${density.toFixed(2)}%, recommended: 0.5-2%)`);
    } else if (density > 3) {
      suggestions.push(`Reduce usage of "${keyword}" to avoid keyword stuffing (current density: ${density.toFixed(2)}%, recommended: 0.5-2%)`);
    }
  }

  // Calculate SEO score (0-100)
  let score = 50; // Base score

  // Bonus for keyword presence
  const presentKeywords = Object.values(keywordDensity).filter(d => d > 0).length;
  score += (presentKeywords / targetKeywords.length) * 30;

  // Bonus for optimal density
  const optimalKeywords = Object.values(keywordDensity).filter(d => d >= 0.5 && d <= 2).length;
  score += (optimalKeywords / targetKeywords.length) * 20;

  // Penalty for keyword stuffing
  const stuffedKeywords = Object.values(keywordDensity).filter(d => d > 3).length;
  score -= stuffedKeywords * 10;

  score = Math.max(0, Math.min(100, score));

  return {
    keywordDensity,
    suggestions,
    score: Math.round(score)
  };
}

/**
 * Optimize content for target keywords using AI
 */
export async function optimizeContentForKeywords(
  content: string,
  targetKeywords: string[]
): Promise<string> {
  const { invokeLLM } = await import("./_core/llm");

  const prompt = `You are an SEO content optimization expert. Optimize the following content to naturally include these target keywords while maintaining readability and quality.

Target Keywords: ${targetKeywords.join(", ")}

Original Content:
${content}

Instructions:
1. Naturally incorporate the target keywords throughout the content
2. Maintain the original meaning and structure
3. Ensure keyword density is between 0.5-2% for each keyword
4. Keep the content readable and engaging
5. Don't force keywords where they don't fit naturally
6. Return ONLY the optimized content, no explanations

Optimized Content:`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an SEO content optimization expert. Return only the optimized content, no explanations or meta-commentary." },
        { role: "user", content: prompt }
      ]
    });

    const responseContent = response.choices[0]?.message?.content;
    const optimizedContent = typeof responseContent === 'string' ? responseContent.trim() : content;
    return optimizedContent || content;
  } catch (error) {
    console.error("Content optimization failed:", error);
    return content;
  }
}
