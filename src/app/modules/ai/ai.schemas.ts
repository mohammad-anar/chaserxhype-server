import { z } from "zod";

export const MoodRecommendationInputZodSchema = z.object({
  mood: z.string().min(1, "Mood is required"),
  inputText: z.string().optional(),
  preferences: z
    .object({
      sweet: z.union([z.boolean(), z.enum(["low", "medium", "high"])]).optional(),
      milk: z.boolean().optional(),
      caffeine: z.enum(["none", "low", "medium", "high"]).optional(),
      temperature: z.enum(["HOT", "COLD", "BOTH"]).optional(),
    })
    .optional(),
});

export const ProductSearchInputZodSchema = z.object({
  query: z.string().min(1, "Search query is required"),
});

export const ChatInputZodSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .optional(),
});

// Structured schema expected back from LLM for Mood Ranking
export const LLMMoodRankingSchema = z.object({
  recommendations: z.array(
    z.object({
      productId: z.string(),
      score: z.number().min(0).max(10),
      reason: z.string().min(3),
    })
  ),
  moodSummary: z.string().optional(),
});

// Structured schema expected back from LLM for Natural Language Query Extraction
export const LLMSearchCriteriaSchema = z.object({
  temperature: z.enum(["HOT", "COLD", "BOTH"]).optional(),
  sweetnessMax: z.number().min(1).max(5).optional(),
  sweetnessMin: z.number().min(1).max(5).optional(),
  caffeineMax: z.number().optional(), // mg
  caffeineMin: z.number().optional(),
  flavorKeywords: z.array(z.string()).optional(),
  categoryName: z.string().optional(),
  searchTerm: z.string().optional(),
});
