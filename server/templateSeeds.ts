// Pre-built content templates with optimized prompts

export const defaultTemplates = [
  {
    name: "Product Review Template",
    description: "Comprehensive product review with pros, cons, and verdict",
    category: "product-review" as const,
    prompt: `You are an expert product reviewer. Write a detailed, honest product review that includes:

1. **Introduction**: Brief overview of the product and who it's for
2. **Key Features**: List and explain the main features
3. **Pros**: What works well (be specific with examples)
4. **Cons**: What could be improved (be honest but fair)
5. **Performance**: Real-world testing results and observations
6. **Value for Money**: Is it worth the price?
7. **Verdict**: Final recommendation with rating

Use a conversational but authoritative tone. Include specific details and examples. Be honest and balanced in your assessment.`,
    structure: JSON.stringify({
      sections: ["Introduction", "Key Features", "Pros", "Cons", "Performance", "Value for Money", "Verdict"],
      wordCount: "1200-1500",
      tone: "Professional yet conversational",
    }),
  },
  {
    name: "How-To Guide Template",
    description: "Step-by-step tutorial with clear instructions",
    category: "how-to" as const,
    prompt: `You are an expert instructor. Write a clear, actionable how-to guide that includes:

1. **Introduction**: What the reader will learn and why it matters
2. **What You'll Need**: List of tools, materials, or prerequisites
3. **Step-by-Step Instructions**: Numbered steps with clear, concise directions
4. **Tips & Best Practices**: Pro tips to improve results
5. **Common Mistakes**: What to avoid
6. **Troubleshooting**: Solutions to common problems
7. **Conclusion**: Summary and next steps

Use simple language. Break complex tasks into manageable steps. Include specific details and examples.`,
    structure: JSON.stringify({
      sections: ["Introduction", "What You'll Need", "Step-by-Step Instructions", "Tips & Best Practices", "Common Mistakes", "Troubleshooting", "Conclusion"],
      wordCount: "1000-1300",
      tone: "Clear and instructional",
    }),
  },
  {
    name: "Listicle Template",
    description: "Engaging numbered list article with detailed explanations",
    category: "listicle" as const,
    prompt: `You are an expert content creator. Write an engaging listicle that includes:

1. **Introduction**: Hook the reader and explain what the list covers
2. **Numbered Items**: Each item should have:
   - A clear, catchy subheading
   - 2-3 paragraphs of explanation
   - Specific examples or data points
   - Why it matters
3. **Conclusion**: Tie everything together and provide actionable takeaways

Use an engaging, conversational tone. Make each item valuable and actionable. Include specific examples and data where relevant.`,
    structure: JSON.stringify({
      sections: ["Introduction", "List Items (7-10)", "Conclusion"],
      wordCount: "1500-2000",
      tone: "Engaging and conversational",
    }),
  },
  {
    name: "Comparison Article Template",
    description: "Side-by-side comparison of products, services, or concepts",
    category: "comparison" as const,
    prompt: `You are an expert analyst. Write a detailed comparison article that includes:

1. **Introduction**: What you're comparing and why it matters
2. **Overview**: Brief description of each option
3. **Feature-by-Feature Comparison**: Compare specific aspects:
   - Features & Functionality
   - Pricing & Value
   - Ease of Use
   - Performance
   - Support & Resources
4. **Pros & Cons Table**: Quick reference for each option
5. **Use Cases**: Who each option is best for
6. **Final Verdict**: Clear recommendation based on different scenarios

Be objective and balanced. Use specific data and examples. Help readers make informed decisions.`,
    structure: JSON.stringify({
      sections: ["Introduction", "Overview", "Feature Comparison", "Pros & Cons", "Use Cases", "Verdict"],
      wordCount: "1500-2000",
      tone: "Objective and analytical",
    }),
  },
  {
    name: "Tutorial Guide Template",
    description: "In-depth educational content for learning a new skill",
    category: "tutorial" as const,
    prompt: `You are an expert educator. Write a comprehensive tutorial that includes:

1. **Introduction**: What the reader will learn and prerequisites
2. **Background/Theory**: Foundational concepts to understand
3. **Core Concepts**: Main ideas explained clearly with examples
4. **Practical Application**: Hands-on exercises or examples
5. **Advanced Tips**: Take skills to the next level
6. **Common Pitfalls**: What to watch out for
7. **Resources**: Additional learning materials
8. **Conclusion**: Summary and next steps

Use clear explanations with examples. Build from basics to advanced. Make it practical and actionable.`,
    structure: JSON.stringify({
      sections: ["Introduction", "Background", "Core Concepts", "Practical Application", "Advanced Tips", "Common Pitfalls", "Resources", "Conclusion"],
      wordCount: "2000-2500",
      tone: "Educational and thorough",
    }),
  },
  {
    name: "Case Study Template",
    description: "Real-world success story with results and insights",
    category: "case-study" as const,
    prompt: `You are an expert business analyst. Write a compelling case study that includes:

1. **Executive Summary**: Key results and takeaways
2. **Background**: Company/situation overview and challenges
3. **The Challenge**: Specific problems that needed solving
4. **The Solution**: What was implemented and why
5. **Implementation**: How it was executed (timeline, process)
6. **Results**: Specific, measurable outcomes with data
7. **Key Takeaways**: Lessons learned and best practices
8. **Conclusion**: Impact and future plans

Use specific data and metrics. Tell a compelling story. Focus on results and insights.`,
    structure: JSON.stringify({
      sections: ["Executive Summary", "Background", "Challenge", "Solution", "Implementation", "Results", "Key Takeaways", "Conclusion"],
      wordCount: "1500-2000",
      tone: "Professional and data-driven",
    }),
  },
  {
    name: "News Article Template",
    description: "Timely news coverage with context and analysis",
    category: "news" as const,
    prompt: `You are an expert journalist. Write a news article that includes:

1. **Headline**: Clear, compelling, and informative
2. **Lead Paragraph**: Who, what, when, where, why, how
3. **Background**: Context and relevant history
4. **Key Details**: Important facts and quotes
5. **Impact**: Why this matters to readers
6. **Expert Opinions**: Analysis from relevant sources
7. **What's Next**: Future implications or developments

Use the inverted pyramid structure. Be objective and fact-based. Provide context and analysis.`,
    structure: JSON.stringify({
      sections: ["Headline", "Lead", "Background", "Key Details", "Impact", "Expert Opinions", "What's Next"],
      wordCount: "800-1200",
      tone: "Objective and informative",
    }),
  },
  {
    name: "Opinion/Editorial Template",
    description: "Thought-provoking opinion piece with strong arguments",
    category: "opinion" as const,
    prompt: `You are an expert opinion writer. Write a compelling opinion piece that includes:

1. **Hook**: Grab attention with a strong opening
2. **Thesis**: Clear statement of your position
3. **Background**: Context and why this topic matters
4. **Arguments**: 3-4 main points supporting your position, each with:
   - Clear reasoning
   - Evidence and examples
   - Addressing counterarguments
5. **Implications**: What this means for readers/society
6. **Call to Action**: What should happen next
7. **Conclusion**: Reinforce your main point

Use persuasive language. Support claims with evidence. Address counterarguments fairly.`,
    structure: JSON.stringify({
      sections: ["Hook", "Thesis", "Background", "Arguments", "Implications", "Call to Action", "Conclusion"],
      wordCount: "1000-1500",
      tone: "Persuasive and authoritative",
    }),
  },
];
