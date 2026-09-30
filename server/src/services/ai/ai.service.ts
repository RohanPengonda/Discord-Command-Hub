import { GoogleGenerativeAI } from '@google/generative-ai';
import { PriorityLevel } from '@prisma/client';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface AIAnalysisResult {
  summary: string;
  category: string;
  priority: PriorityLevel;
  rawResponse?: any;
}

export class AIService {
  private static genAI: GoogleGenerativeAI | null = null;

  private static getGeminiClient(): GoogleGenerativeAI | null {
    if (!this.genAI && env.AI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.AI_API_KEY);
    }
    return this.genAI;
  }

  static async analyzeReport(reportText: string): Promise<AIAnalysisResult> {
    const fallback: AIAnalysisResult = {
      summary: reportText.length > 80 ? `${reportText.substring(0, 77)}...` : reportText,
      category: 'General',
      priority: PriorityLevel.MEDIUM,
    };

    if (!env.AI_API_KEY) {
      logger.info('AI_API_KEY is not configured. Returning fallback AI analysis.');
      return fallback;
    }

    try {
      if (env.AI_PROVIDER === 'gemini') {
        const client = this.getGeminiClient();
        if (!client) return fallback;

        const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Analyze the following issue report from a Discord user. 
Provide your response strictly as a JSON object without markdown formatting or code blocks.
JSON format:
{
  "summary": "Short concise title (max 10 words)",
  "category": "One word category e.g. Payment, Bug, UI, Infrastructure, Feature",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

Report Text: "${reportText}"`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean json output (strip markdown code block backticks if present)
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        const priority = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.priority?.toUpperCase())
          ? (parsed.priority.toUpperCase() as PriorityLevel)
          : PriorityLevel.MEDIUM;

        return {
          summary: parsed.summary || fallback.summary,
          category: parsed.category || fallback.category,
          priority,
          rawResponse: parsed,
        };
      } else {
        // Groq API implementation fallback via fetch
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.AI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content:
                  'You are a report classifier. Return strictly JSON with keys: summary, category, priority (LOW, MEDIUM, HIGH, CRITICAL).',
              },
              { role: 'user', content: reportText },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);

        return {
          summary: parsed.summary || fallback.summary,
          category: parsed.category || fallback.category,
          priority: (parsed.priority?.toUpperCase() as PriorityLevel) || PriorityLevel.MEDIUM,
          rawResponse: data,
        };
      }
    } catch (err: any) {
      logger.error('AI Processing failed. Falling back to default analysis without failing report pipeline.', {
        error: err.message,
      });
      return fallback;
    }
  }
}
