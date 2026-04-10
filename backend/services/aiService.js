import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeBugWithAI = async (title, description) => {
  try {
    const prompt = `
You are a bug analysis expert. Analyze the following bug report and provide:
1. Severity level (Critical, High, Medium, Low)
2. Category (e.g., UI, Performance, Logic, Security, Database, API, Other)
3. Keywords (3-5 relevant tags)
4. Suggestions for fixing (2-3 actionable suggestions)
5. Confidence score (0-100)

Bug Title: ${title}
Bug Description: ${description}

Respond in JSON format:
{
  "severity": "High",
  "category": "UI",
  "keywords": ["button", "responsive", "mobile"],
  "suggestions": ["Check CSS media queries", "Test on mobile devices"],
  "confidenceScore": 85
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful bug analysis assistant. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    const analysis = JSON.parse(content);

    return {
      severity: analysis.severity || 'Medium',
      category: analysis.category || 'Other',
      keywords: analysis.keywords || [],
      suggestions: analysis.suggestions || [],
      confidenceScore: (analysis.confidenceScore || 50) / 100,
    };
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    throw new Error(`AI Analysis failed: ${error.message}`);
  }
};

export const findDuplicateBugs = async (newBugAnalysis, existingBugs) => {
  try {
    if (!existingBugs || existingBugs.length === 0) return [];

    const bugsData = existingBugs
      .filter((b) => b.aiAnalysis?.keywords?.length > 0)
      .map(
        (b, idx) =>
          `Bug ${idx + 1}: Category: ${b.aiAnalysis.category}, Keywords: ${b.aiAnalysis.keywords.join(', ')}`
      )
      .join('\n');

    const prompt = `
Given these existing bug reports:
${bugsData}

And this new bug analysis:
Category: ${newBugAnalysis.category}
Keywords: ${newBugAnalysis.keywords.join(', ')}

Which existing bugs are most likely duplicates or related? Return a JSON array with bug indices (0-based) that are related.
Example: {"relatedBugIndices": [0, 2]}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a bug deduplication assistant. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content);
    return result.relatedBugIndices || [];
  } catch (error) {
    console.error('Duplicate Detection Error:', error.message);
    return [];
  }
};

export const generateSummary = async (bugDetails) => {
  try {
    const prompt = `Provide a concise 2-3 sentence executive summary of this bug:
Title: ${bugDetails.title}
Description: ${bugDetails.description}
Category: ${bugDetails.category}
Severity: ${bugDetails.severity}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer. Provide concise, clear summaries.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Summary Generation Error:', error.message);
    return null;
  }
};
