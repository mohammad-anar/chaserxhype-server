import { prisma } from "../../../helpers/prisma.js";
import { Prisma } from "@prisma/client";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { getAIProvider } from "./ai.provider.js";
import {
  LLMMoodRankingSchema,
  LLMSearchCriteriaSchema,
} from "./ai.schemas.js";
import {
  IChatPayload,
  IMoodRecommendationPayload,
  IProductSearchPayload,
} from "./ai.types.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import colors from "colors";

/**
 * Deterministic fallback scoring when AI is unreachable or response is invalid
 */
const computeDeterministicMoodRanking = (
  candidates: any[],
  mood: string,
  preferences?: IMoodRecommendationPayload["preferences"]
) => {
  const lowerMood = mood.toLowerCase();

  return candidates.map((prod, index) => {
    let score = 8.0;
    let reason = "A balanced beverage selection crafted to match your current vibe.";

    if (lowerMood.includes("stress") || lowerMood.includes("tired") || lowerMood.includes("exhausted")) {
      // Reward lower caffeine and warm, comforting drinks
      if (prod.temperatureType === "HOT" || prod.temperatureType === "BOTH") score += 1.0;
      if ((prod.caffeineMg || 0) <= 80) score += 0.8;
      reason = "Smooth and comforting drink with soothing warm notes to help reduce stress and calm your day.";
    } else if (lowerMood.includes("energetic") || lowerMood.includes("focus") || lowerMood.includes("busy") || lowerMood.includes("sleepy")) {
      // Reward higher caffeine and strength
      if ((prod.caffeineMg || 0) >= 80) score += 1.2;
      if ((prod.strengthLevel || 3) >= 3) score += 0.6;
      reason = "Rich, robust blend delivering invigorating energy and mental clarity.";
    } else if (lowerMood.includes("happy") || lowerMood.includes("excited") || lowerMood.includes("celebrate")) {
      if ((prod.sweetnessLevel || 3) >= 3) score += 0.8;
      reason = "Vibrant, uplifting flavor profile that matches your joyful and celebratory mood.";
    } else if (lowerMood.includes("chill") || lowerMood.includes("relaxed")) {
      if (prod.temperatureType === "COLD") score += 0.5;
      reason = "Refreshingly smooth and easy-going drink suited for taking it easy.";
    }

    if (preferences?.temperature && prod.temperatureType === preferences.temperature) {
      score += 0.5;
    }

    return {
      productId: prod.id,
      score: Number(Math.min(10, Math.max(1, score - index * 0.1)).toFixed(1)),
      reason,
      product: prod,
    };
  });
};

/**
 * Mood-Based Beverage Recommendation
 */
const getMoodRecommendation = async (
  userId: string | null,
  payload: IMoodRecommendationPayload
) => {
  const { mood, inputText, preferences } = payload;
  const userQueryText = inputText ? `${mood}. ${inputText}` : mood;

  // 1. Fetch candidate products from PostgreSQL
  const candidateConditions: Prisma.ProductWhereInput = {
    isDeleted: false,
    isAvailable: true,
  };

  if (preferences?.temperature && preferences.temperature !== "BOTH") {
    candidateConditions.temperatureType = {
      in: [preferences.temperature as any, "BOTH"],
    };
  }

  const candidateProducts = await prisma.product.findMany({
    where: candidateConditions,
    take: 15,
    include: {
      category: { select: { id: true, name: true } },
      productSizes: true,
      productMilks: true,
    },
  });

  if (candidateProducts.length === 0) {
    // If no candidates match specific filter, fetch all available
    const fallbackProducts = await prisma.product.findMany({
      where: { isDeleted: false, isAvailable: true },
      take: 10,
      include: {
        category: { select: { id: true, name: true } },
        productSizes: true,
        productMilks: true,
      },
    });
    candidateProducts.push(...fallbackProducts);
  }

  if (candidateProducts.length === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No available products in menu to recommend");
  }

  const validProductIds = new Set(candidateProducts.map((p) => p.id));
  const aiProvider = getAIProvider();

  let rankedItems: Array<{ productId: string; score: number; reason: string }> = [];

  try {
    const candidateSummary = candidateProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category?.name,
      basePrice: Number(p.basePrice),
      caffeineMg: p.caffeineMg,
      sweetnessLevel: p.sweetnessLevel,
      bitternessLevel: p.bitternessLevel,
      strengthLevel: p.strengthLevel,
      temperatureType: p.temperatureType,
      flavorProfile: p.flavorProfile,
      description: p.shortDescription || p.description,
    }));

    const systemPrompt = `You are a master barista and beverage recommendation AI for a specialty coffee shop.
Your goal is to recommend the best 3 to 5 beverages for the customer from the provided candidate list based on their mood and preferences.
CRITICAL RULES:
1. ONLY recommend products that are explicitly provided in the candidate list with their exact "id".
2. Assign a score between 1.0 and 10.0 (where 10.0 is the best match).
3. Provide a warm, personalized 1-2 sentence reason for why each drink matches their mood and taste.
4. Return pure JSON matching the schema: { "recommendations": [{ "productId": string, "score": number, "reason": string }], "moodSummary": string }`;

    const userPrompt = `Customer Mood: "${mood}"
Additional Details: "${userQueryText}"
Preferences: ${JSON.stringify(preferences || {})}

Candidate Products:
${JSON.stringify(candidateSummary, null, 2)}`;

    const aiResponse = await aiProvider.generateStructured(
      systemPrompt,
      userPrompt,
      LLMMoodRankingSchema
    );

    // Validate that returned IDs strictly exist in our PostgreSQL candidate list
    const validated = aiResponse.recommendations.filter((rec) => validProductIds.has(rec.productId));

    if (validated.length > 0) {
      rankedItems = validated;
    } else {
      throw new Error("No valid candidate product IDs returned from AI");
    }
  } catch (aiErr: any) {
    console.warn(
      colors.yellow(
        `⚠️ AI mood ranking using fallback deterministic scoring (${aiErr.message})`
      )
    );
    rankedItems = computeDeterministicMoodRanking(candidateProducts, mood, preferences);
  }

  // Sort by score descending and take top 5
  rankedItems.sort((a, b) => b.score - a.score);
  const topRecommendations = rankedItems.slice(0, 5);

  // Map back to full product entities
  const productMap = new Map(candidateProducts.map((p) => [p.id, p]));
  const finalResult = topRecommendations.map((rec, index) => ({
    rank: index + 1,
    score: rec.score,
    reason: rec.reason,
    product: productMap.get(rec.productId)!,
  }));

  // Save recommendation history in database for analytics
  try {
    const savedRec = await prisma.moodRecommendation.create({
      data: {
        userId: userId || null,
        mood,
        rawInput: userQueryText,
        preferences: preferences ? (preferences as any) : undefined,
        items: {
          create: finalResult.map((item) => ({
            productId: item.product.id,
            score: item.score,
            reason: item.reason,
            rank: item.rank,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return {
      recommendationId: savedRec.id,
      mood,
      recommendations: finalResult,
    };
  } catch (dbErr) {
    return {
      mood,
      recommendations: finalResult,
    };
  }
};

/**
 * Natural Language Product Search
 * Extracts structured criteria from natural language and queries PostgreSQL safely with Prisma.
 */
const naturalLanguageProductSearch = async (payload: IProductSearchPayload) => {
  const { query } = payload;
  const aiProvider = getAIProvider();

  let criteria: any = {};

  try {
    const systemPrompt = `You are a search query parser for a coffee shop catalog.
Convert the user's natural language request into structured search criteria.
Extract:
- temperature: "HOT" | "COLD" | "BOTH"
- sweetnessMax: number (1 to 5)
- sweetnessMin: number (1 to 5)
- caffeineMax: number (in mg, e.g. 50 for low caffeine, 0 for decaf)
- caffeineMin: number (in mg, e.g. 100 for strong)
- flavorKeywords: array of string flavors (e.g. ["caramel", "vanilla", "nutty", "creamy"])
- searchTerm: main drink keyword if specified (e.g. "latte", "cappuccino", "cold brew")
Return pure JSON matching the schema.`;

    criteria = await aiProvider.generateStructured(
      systemPrompt,
      `Search query: "${query}"`,
      LLMSearchCriteriaSchema
    );
  } catch (err: any) {
    console.warn(colors.yellow(`⚠️ AI search extraction fallback used: ${err.message}`));
    // Rule-based basic parsing
    const lower = query.toLowerCase();
    if (lower.includes("cold") || lower.includes("iced")) criteria.temperature = "COLD";
    if (lower.includes("hot") || lower.includes("warm")) criteria.temperature = "HOT";
    if (lower.includes("sweet")) criteria.sweetnessMin = 3;
    if (lower.includes("not sweet") || lower.includes("less sweet")) criteria.sweetnessMax = 2;
  }

  // Safe Prisma query builder based on validated structured criteria
  const andConditions: Prisma.ProductWhereInput[] = [
    { isDeleted: false },
    { isAvailable: true },
  ];

  if (criteria.temperature && criteria.temperature !== "BOTH") {
    andConditions.push({
      temperatureType: { in: [criteria.temperature as any, "BOTH"] },
    });
  }

  if (criteria.sweetnessMax) {
    andConditions.push({ sweetnessLevel: { lte: criteria.sweetnessMax } });
  }

  if (criteria.sweetnessMin) {
    andConditions.push({ sweetnessLevel: { gte: criteria.sweetnessMin } });
  }

  if (criteria.caffeineMax) {
    andConditions.push({ caffeineMg: { lte: criteria.caffeineMax } });
  }

  if (criteria.caffeineMin) {
    andConditions.push({ caffeineMg: { gte: criteria.caffeineMin } });
  }

  if (criteria.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: criteria.searchTerm, mode: "insensitive" } },
        { description: { contains: criteria.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (criteria.flavorKeywords && criteria.flavorKeywords.length > 0) {
    andConditions.push({
      OR: criteria.flavorKeywords.map((kw: string) => ({
        OR: [
          { name: { contains: kw, mode: "insensitive" } },
          { description: { contains: kw, mode: "insensitive" } },
          { flavorProfile: { has: kw.toLowerCase() } },
        ],
      })),
    });
  }

  let products = await prisma.product.findMany({
    where: { AND: andConditions },
    include: {
      category: { select: { id: true, name: true } },
      productSizes: true,
      productMilks: true,
      productExtras: true,
    },
    take: 20,
  });

  // If no strict match, fallback to general search
  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isAvailable: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        productSizes: true,
        productMilks: true,
        productExtras: true,
      },
      take: 10,
    });
  }

  return {
    query,
    extractedCriteria: criteria,
    count: products.length,
    products,
  };
};

/**
 * AI Customer Assistant Chat
 * Answers customer questions grounded strictly in the active PostgreSQL database catalog.
 */
const customerAssistantChat = async (payload: IChatPayload) => {
  const { message, conversationHistory } = payload;
  const aiProvider = getAIProvider();

  // Fetch current store products for ground truth context
  const activeProducts = await prisma.product.findMany({
    where: { isDeleted: false, isAvailable: true },
    select: {
      id: true,
      name: true,
      basePrice: true,
      caffeineMg: true,
      sweetnessLevel: true,
      temperatureType: true,
      flavorProfile: true,
      shortDescription: true,
      category: { select: { name: true } },
    },
    take: 25,
  });

  const catalogContext = activeProducts
    .map(
      (p) =>
        `- ${p.name} ($${Number(p.basePrice)}): Category: ${p.category?.name || "Drink"}, Temp: ${
          p.temperatureType
        }, Sweetness (1-5): ${p.sweetnessLevel}, Caffeine: ${p.caffeineMg}mg, Flavors: ${p.flavorProfile.join(
          ", "
        )}. ${p.shortDescription}`
    )
    .join("\n");

  const systemPrompt = `You are "Bean Fien AI", a helpful, knowledgeable, and polite barista assistant for our specialty coffee shop.
You help customers understand the menu, recommend drinks, explain caffeine content, and guide their orders.

GROUNDING RULES:
1. ONLY recommend and mention products that exist in the Menu Catalog below.
2. NEVER invent products, ingredients, or fake pricing.
3. If asked about a drink not on our menu, politely inform the customer what similar options we offer instead.
4. Keep answers concise, warm, and inviting.

MENU CATALOG:
${catalogContext}`;

  const responseText = await aiProvider.generateText(
    systemPrompt,
    message,
    conversationHistory
  );

  return {
    reply: responseText,
    provider: aiProvider.name,
  };
};

/**
 * Retrieves past mood recommendations for user or store analytics.
 */
const getRecommendationHistory = async (userId?: string, options?: any) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options || {});

  const where: Prisma.MoodRecommendationWhereInput = userId ? { userId } : {};

  const result = await prisma.moodRecommendation.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy || "createdAt"]: sortOrder || "desc",
    },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, basePrice: true, image: true },
          },
        },
        orderBy: { rank: "asc" },
      },
    },
  });

  const total = await prisma.moodRecommendation.count({ where });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

export const AIServices = {
  getMoodRecommendation,
  naturalLanguageProductSearch,
  customerAssistantChat,
  getRecommendationHistory,
};
