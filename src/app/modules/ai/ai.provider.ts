import { z } from "zod";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import config from "../../../config/index.js";
import colors from "colors";

export interface IAIProvider {
  name: string;
  generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T>;
  generateText(
    systemPrompt: string,
    userPrompt: string,
    conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ): Promise<string>;
}

/**
 * OpenAI Implementation of IAIProvider
 */
export class OpenAIProvider implements IAIProvider {
  name = "OpenAI";
  private client: OpenAI | null = null;

  constructor() {
    if (config.ai.openai_api_key) {
      this.client = new OpenAI({ apiKey: config.ai.openai_api_key });
    }
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    if (!this.client) {
      throw new Error("OpenAI client not initialized: Missing OPENAI_API_KEY");
    }

    const response = await this.client.chat.completions.create({
      model: config.ai.model || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${systemPrompt}\nYou must output valid JSON only.` },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);
    return schema.parse(parsed);
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ): Promise<string> {
    if (!this.client) {
      throw new Error("OpenAI client not initialized: Missing OPENAI_API_KEY");
    }

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    messages.push({ role: "user", content: userPrompt });

    const response = await this.client.chat.completions.create({
      model: config.ai.model || "gpt-4o-mini",
      messages,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "I am sorry, I could not process that request.";
  }
}

/**
 * Google Gemini Implementation of IAIProvider
 */
export class GeminiProvider implements IAIProvider {
  name = "Gemini";
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (config.ai.gemini_api_key) {
      this.ai = new GoogleGenAI({ apiKey: config.ai.gemini_api_key });
    }
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    if (!this.ai) {
      throw new Error("Gemini client not initialized: Missing GEMINI_API_KEY");
    }

    const modelName = config.ai.model || "gemini-2.5-flash";
    const prompt = `${systemPrompt}\n\nUser request:\n${userPrompt}\n\nIMPORTANT: Return pure JSON object matching expected schema without any markdown formatting or code blocks.`;

    const response = await this.ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim() || "";
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ): Promise<string> {
    if (!this.ai) {
      throw new Error("Gemini client not initialized: Missing GEMINI_API_KEY");
    }

    const modelName = config.ai.model || "gemini-2.5-flash";
    let fullPrompt = `System instructions:\n${systemPrompt}\n\n`;

    if (conversationHistory && conversationHistory.length > 0) {
      fullPrompt += "Conversation history:\n";
      for (const msg of conversationHistory) {
        fullPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      }
      fullPrompt += "\n";
    }

    fullPrompt += `USER: ${userPrompt}\nASSISTANT:`;

    const response = await this.ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
    });

    return response.text?.trim() || "I am sorry, I could not process your request.";
  }
}

/**
 * Fallback Provider: Deterministic, Rule-Based Natural Language Extractor & Ranker
 * Activates when AI provider is not configured or external API is down.
 */
export class FallbackAIProvider implements IAIProvider {
  name = "FallbackRuleEngine";

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodType<T>
  ): Promise<T> {
    const lowerPrompt = userPrompt.toLowerCase();

    // 1. Mood Ranking Fallback
    if (lowerPrompt.includes("candidate") || lowerPrompt.includes("recommend")) {
      try {
        const candidateMatch = userPrompt.match(/"id":\s*"([^"]+)"/g);
        const productIds = candidateMatch
          ? candidateMatch.map((m) => m.replace(/"id":\s*"/, "").replace('"', ""))
          : [];

        const recommendations = productIds.slice(0, 5).map((id, index) => {
          let reason = "A well-balanced selection crafted to match your current vibe.";
          if (lowerPrompt.includes("stress") || lowerPrompt.includes("tired")) {
            reason = "Smooth, comforting profile with soothing warm notes to help you unwind.";
          } else if (lowerPrompt.includes("energy") || lowerPrompt.includes("focus") || lowerPrompt.includes("busy")) {
            reason = "Bold, rich flavor delivering uplifting energy and sustained focus.";
          } else if (lowerPrompt.includes("happy") || lowerPrompt.includes("chill") || lowerPrompt.includes("relax")) {
            reason = "Delightfully balanced flavor profile that complements a positive, relaxed mood.";
          }

          return {
            productId: id,
            score: Number((9.5 - index * 0.4).toFixed(1)),
            reason,
          };
        });

        const result = {
          recommendations,
          moodSummary: "Recommendations generated via deterministic sensory rule matching.",
        };

        return schema.parse(result) as T;
      } catch (err) {
        // Continue to generic empty
      }
    }

    // 2. Search Criteria Fallback
    const searchCriteria: any = {};
    if (lowerPrompt.includes("cold") || lowerPrompt.includes("iced")) {
      searchCriteria.temperature = "COLD";
    } else if (lowerPrompt.includes("hot") || lowerPrompt.includes("warm")) {
      searchCriteria.temperature = "HOT";
    }

    if (lowerPrompt.includes("not too sweet") || lowerPrompt.includes("less sweet") || lowerPrompt.includes("low sugar")) {
      searchCriteria.sweetnessMax = 2;
    } else if (lowerPrompt.includes("sweet")) {
      searchCriteria.sweetnessMin = 4;
    }

    if (lowerPrompt.includes("low caffeine") || lowerPrompt.includes("decaf")) {
      searchCriteria.caffeineMax = 50;
    } else if (lowerPrompt.includes("strong") || lowerPrompt.includes("extra caffeine")) {
      searchCriteria.caffeineMin = 120;
    }

    return schema.parse(searchCriteria) as T;
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ): Promise<string> {
    const lower = userPrompt.toLowerCase();
    if (lower.includes("recommend") || lower.includes("suggest") || lower.includes("what should i drink")) {
      return "Based on our menu, our classic Latte, Cappuccino, and Cold Brew are customer favorites! If you prefer something smooth and warm, our Caramel Latte is a great choice.";
    }
    if (lower.includes("not sweet") || lower.includes("less sweet")) {
      return "If you prefer drinks that aren't too sweet, we recommend our Americano, Espresso, or Cappuccino with unsweetened oat or almond milk.";
    }
    if (lower.includes("sweet") || lower.includes("dessert")) {
      return "For a sweet and creamy treat, try our Mocha or Caramel Macchiato with extra vanilla!";
    }
    if (lower.includes("cold") || lower.includes("refreshing")) {
      return "For a refreshing cold drink, try our Iced Vanilla Latte or Nitro Cold Brew!";
    }

    return "Hello! I am your coffee assistant. I can recommend drinks based on your mood, flavor preferences, sweetness level, and caffeine strength. What kind of coffee are you craving today?";
  }
}

/**
 * AI Provider Factory
 */
export const getAIProvider = (): IAIProvider => {
  const providerType = (config.ai.provider || "").toLowerCase();

  if (providerType === "openai" && config.ai.openai_api_key) {
    return new OpenAIProvider();
  }

  if (providerType === "gemini" && config.ai.gemini_api_key) {
    return new GeminiProvider();
  }

  return new FallbackAIProvider();
};
