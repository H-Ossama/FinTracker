import AsyncStorage from '@react-native-async-storage/async-storage';

import { getBackendApiRoot } from '../config/apiConfig';

type AILogLevel = 'silent' | 'info' | 'debug';

// Reduce console noise by default.
// To enable verbose logs in dev, run in the JS console:
// `globalThis.__FINTRACKER_AI_LOG_LEVEL = 'debug'`
const getAiLogLevel = (): AILogLevel => {
  const maybe = (globalThis as any)?.__FINTRACKER_AI_LOG_LEVEL;
  if (maybe === 'debug' || maybe === 'info' || maybe === 'silent') return maybe;
  return 'silent';
};

const aiLogInfo = (...args: any[]) => {
  const level = getAiLogLevel();
  if (level === 'info' || level === 'debug') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

const aiLogDebug = (...args: any[]) => {
  if (getAiLogLevel() === 'debug') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

// Cache keys
const CACHE_KEYS = {
  RECOMMENDATIONS: 'gemini_cache_recommendations',
  RECOMMENDATIONS_TIMESTAMP: 'gemini_cache_recommendations_ts',
  TREND_INSIGHTS: 'gemini_cache_trend_insights',
  TREND_INSIGHTS_TIMESTAMP: 'gemini_cache_trend_insights_ts',
  SPENDING_INSIGHTS: 'gemini_cache_spending_insights',
  SPENDING_INSIGHTS_TIMESTAMP: 'gemini_cache_spending_insights_ts',
};

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

interface GeminiResponse {
  recommendations: Array<{
    type: 'warning' | 'achievement' | 'tip';
    title: string;
    description: string;
    emoji: string;
  }>;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

class GeminiAIService {
  private isRateLimited = false;
  private rateLimitResetTime = 0;

  private normalizeJsonString(input: string): string {
    let output = '';
    let inString = false;
    let escape = false;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];

      if (escape) {
        output += ch;
        escape = false;
        continue;
      }

      if (ch === '\\') {
        output += ch;
        escape = true;
        continue;
      }

      if (ch === '"') {
        output += ch;
        inString = !inString;
        continue;
      }

      if (inString && (ch === '\n' || ch === '\r')) {
        output += '\\n';
        continue;
      }

      output += ch;
    }

    return output;
  }

  private parseRecommendationsResponse(responseText: string): GeminiResponse['recommendations'] {
    aiLogDebug('📝 Parsing AI response...');

    // Clean up response - handle various formats
    let cleanResponse = responseText.trim();

    // Remove markdown code blocks if present
    cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    aiLogDebug('🔎 Gemini raw (first 200 chars):', cleanResponse.slice(0, 200));
    aiLogDebug('🔎 Gemini raw (last 120 chars):', cleanResponse.slice(Math.max(0, cleanResponse.length - 120)));
    aiLogDebug('🔎 Gemini raw length:', cleanResponse.length);

    const normalized = this.normalizeJsonString(cleanResponse);

    // 1) Try parsing the entire response as JSON
    try {
      const parsed = JSON.parse(normalized) as GeminiResponse;
      if (Array.isArray((parsed as any)?.recommendations)) {
        aiLogDebug('✅ JSON parsed successfully (full response)');
        return (parsed as any).recommendations;
      }
    } catch {
      // continue
    }

    // 2) If it looks like an array, wrap it
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      const arr = JSON.parse(normalized);
      if (Array.isArray(arr)) {
        aiLogDebug('✅ JSON parsed successfully (array wrapped)');
        return arr;
      }
    }

    // 3) Fallback: extract a JSON object and parse it
    const jsonMatch = normalized.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('⚠️ No JSON object found in response');
      throw new Error('No JSON found in response');
    }

    const jsonStr = jsonMatch[0];
    const normalizedJsonStr = this.normalizeJsonString(jsonStr);
    aiLogDebug('🔍 Extracted JSON string length:', normalizedJsonStr.length);
    const parsed = JSON.parse(normalizedJsonStr) as GeminiResponse;
    const recommendations = (parsed as any)?.recommendations;
    if (!Array.isArray(recommendations)) {
      throw new Error('Invalid JSON shape: missing recommendations array');
    }
    aiLogDebug('✅ JSON parsed successfully (extracted object)');
    return recommendations;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const now = Date.now();
    return (now - timestamp) < CACHE_DURATION_MS;
  }

  /**
   * Get cached data if available and valid
   */
  private async getCachedData<T>(cacheKey: string, timestampKey: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      const timestamp = await AsyncStorage.getItem(timestampKey);

      if (cached && timestamp) {
        const ts = parseInt(timestamp, 10);
        if (this.isCacheValid(ts)) {
          aiLogInfo('💡 Using cached AI data');
          return JSON.parse(cached) as T;
        }
      }
    } catch (error) {
      console.warn(`Error retrieving cache for ${cacheKey}:`, error);
    }
    return null;
  }

  /**
   * Save data to cache
   */
  private async saveCacheData<T>(cacheKey: string, timestampKey: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      await AsyncStorage.setItem(timestampKey, Date.now().toString());
    } catch (error) {
      console.warn(`Error saving cache for ${cacheKey}:`, error);
    }
  }

  /**
   * Clear cache for a specific key
   */
  async clearCache(cacheKey: string, timestampKey: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(cacheKey);
      await AsyncStorage.removeItem(timestampKey);
      aiLogInfo('🗑️ Cleared AI cache');
    } catch (error) {
      console.warn(`Error clearing cache:`, error);
    }
  }

  /**
   * Make API call with rate limiting
   */
  private async callGeminiAPI(
    prompt: string,
    options?: {
      responseMimeType?: 'text/plain' | 'application/json';
      temperature?: number;
      maxOutputTokens?: number;
    }
  ): Promise<string> {
    // Check if rate limited
    if (this.isRateLimited && Date.now() < this.rateLimitResetTime) {
      throw new Error('Rate limited. Please try again later.');
    }

    try {
      const apiRoot = getBackendApiRoot();
      const url = `${apiRoot}/ai/gemini`;

      aiLogDebug('📡 Calling backend AI proxy');
      aiLogDebug(`📡 URL: ${url}`);

      const responseMimeType = options?.responseMimeType ?? 'text/plain';
      const temperature = options?.temperature ?? 0.7;
      const maxOutputTokens = options?.maxOutputTokens ?? 500;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          options: {
            responseMimeType,
            temperature,
            maxOutputTokens,
          }
        }),
      });

      if (response.status === 429) {
        // Rate limited
        this.isRateLimited = true;
        this.rateLimitResetTime = Date.now() + 60000; // 1 minute
        console.warn('⚠️ API rate limited (429). Will retry after 1 minute.');
        throw new Error('API rate limited');
      }

      if (!response.ok) {
        let message = `API error (${response.status})`;
        try {
          const errorBody: any = await response.json();
          message = errorBody?.error || errorBody?.message || message;
        } catch {
          // ignore
        }
        console.error('❌ AI proxy error:', message);
        throw new Error(message);
      }

      const data: any = await response.json();
      const content = data?.content;
      if (typeof content !== 'string' || !content) throw new Error('No content in response');

      aiLogDebug('✅ Gemini API response received successfully');
      return content;
    } catch (error) {
      console.error('❌ Error calling Gemini API:', error);
      throw error;
    }
  }

  /**
   * Generate AI recommendations based on spending data
   */
  async generateRecommendations(
    spendingData: any,
    forceRefresh = false
  ): Promise<GeminiResponse['recommendations']> {
    const cacheKey = CACHE_KEYS.RECOMMENDATIONS;
    const timestampKey = CACHE_KEYS.RECOMMENDATIONS_TIMESTAMP;

    // Try to get cached data first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.getCachedData<GeminiResponse['recommendations']>(
        cacheKey,
        timestampKey
      );
      if (cached) {
        return cached;
      }
    }

    try {
      aiLogInfo('🤖 Calling Gemini AI for recommendations...');

      const basePrompt = `You are a helpful financial advisor. Based on this spending data, provide 3 personalized financial recommendations.

Spending Data:
- Total Spent: $${spendingData.totalSpent}
- Period: ${spendingData.period.type}
- Categories: ${spendingData.categories.map((c: any) => `${c.name} ($${c.amount})`).join(', ')}

Return ONLY valid JSON (no markdown, no commentary). Keep the JSON minified in ONE LINE.
Do NOT include raw line breaks inside string values; if needed, escape them as \\n.
Use ONLY these values for type: warning | achievement | tip.

Respond with a JSON object in this exact format:
{
  "recommendations": [
    {
      "type": "warning|achievement|tip",
      "title": "short title",
      "description": "detailed description",
      "emoji": "appropriate emoji"
    }
  ]
}`;

      const attempt = async (prompt: string, attemptName: string) => {
        aiLogDebug(`🧠 Gemini recommendations attempt: ${attemptName}`);
        const response = await this.callGeminiAPI(prompt, {
          responseMimeType: 'application/json',
          temperature: 0.0,
          maxOutputTokens: 1000,
        });
        return this.parseRecommendationsResponse(response);
      };

      let recommendations: GeminiResponse['recommendations'] | null = null;

      try {
        recommendations = await attempt(basePrompt, 'primary');
      } catch (primaryError) {
        console.warn('⚠️ Primary parse failed, retrying once with stricter prompt:', primaryError);
        const strictPrompt = `${basePrompt}\n\nIMPORTANT: Output MUST be a single-line JSON object only. No trailing text.`;
        try {
          recommendations = await attempt(strictPrompt, 'retry');
        } catch (retryError) {
          console.warn('❌ Retry parse failed, using fallback:', retryError);
          recommendations = null;
        }
      }

      if (!recommendations || recommendations.length === 0) {
        return this.getFallbackRecommendations();
      }

      // Cache the results
      await this.saveCacheData(cacheKey, timestampKey, recommendations);

      return recommendations;
    } catch (error) {
      console.warn('Error generating recommendations:', error);
      // Return fallback recommendations
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Generate AI insights for trends
   */
  async generateTrendInsights(
    trendData: any,
    forceRefresh = false
  ): Promise<string> {
    const cacheKey = CACHE_KEYS.TREND_INSIGHTS;
    const timestampKey = CACHE_KEYS.TREND_INSIGHTS_TIMESTAMP;

    // Try to get cached data first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.getCachedData<string>(cacheKey, timestampKey);
      if (cached) {
        return cached;
      }
    }

    try {
      console.log('🤖 Calling Gemini AI for trend insights...');

      const recentTrends = trendData.trend.slice(-7);
      const prompt = `You are a financial analyst. Analyze these spending trends and provide 1-2 key insights in 1-2 sentences.

Recent Trends (last 7 periods):
${recentTrends.map((t: any) => `- ${t.date}: Income $${t.income}, Expense $${t.expense}, Net $${t.net}`).join('\n')}

Provide concise, actionable insights without formatting or markdown.`;

      const response = await this.callGeminiAPI(prompt);
      
      // Cache the results
      await this.saveCacheData(cacheKey, timestampKey, response);

      return response;
    } catch (error) {
      console.warn('Error generating trend insights:', error);
      return 'Keep tracking your spending patterns to identify trends.';
    }
  }

  /**
   * Generate AI insights for spending patterns
   */
  async generateSpendingInsights(
    spendingData: any,
    forceRefresh = false
  ): Promise<string> {
    const cacheKey = CACHE_KEYS.SPENDING_INSIGHTS;
    const timestampKey = CACHE_KEYS.SPENDING_INSIGHTS_TIMESTAMP;

    // Try to get cached data first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.getCachedData<string>(cacheKey, timestampKey);
      if (cached) {
        return cached;
      }
    }

    try {
      console.log('🤖 Calling Gemini AI for spending insights...');

      const topCategories = spendingData.categories.slice(0, 3);
      const prompt = `You are a financial advisor. Analyze this spending breakdown and provide 1 key insight in 1-2 sentences.

Spending Breakdown:
- Total: $${spendingData.totalSpent}
- Top Categories: ${topCategories.map((c: any) => `${c.name} ($${c.amount}, ${c.percentage}%)`).join(', ')}

Provide a concise insight about their spending pattern without formatting or markdown.`;

      const response = await this.callGeminiAPI(prompt);
      
      // Cache the results
      await this.saveCacheData(cacheKey, timestampKey, response);

      return response;
    } catch (error) {
      console.warn('Error generating spending insights:', error);
      return 'Your largest expense category shows your main spending focus.';
    }
  }

  /**
   * Fallback recommendations when AI fails
   */
  private getFallbackRecommendations(): GeminiResponse['recommendations'] {
    return [
      {
        type: 'tip',
        title: 'Track your spending consistently',
        description: 'Regular tracking helps you identify patterns and make better financial decisions.',
        emoji: '📊',
      },
      {
        type: 'tip',
        title: 'Set category budgets',
        description: 'Create spending limits for each category to better control your expenses.',
        emoji: '🎯',
      },
      {
        type: 'achievement',
        title: 'Keep up the habit',
        description: 'You\'re doing great by actively monitoring your finances!',
        emoji: '💪',
      },
    ];
  }

  /**
   * Check if data is cached and still valid
   */
  async isTimestampKeyValid(timestampKey: string): Promise<boolean> {
    try {
      const timestamp = await AsyncStorage.getItem(timestampKey);
      if (!timestamp) return false;
      return this.isCacheValid(parseInt(timestamp, 10));
    } catch {
      return false;
    }
  }
}

export const geminiAIService = new GeminiAIService();
