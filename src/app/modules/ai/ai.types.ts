export interface IMoodRecommendationPayload {
  mood: string;
  inputText?: string;
  preferences?: {
    sweet?: boolean | "low" | "medium" | "high";
    milk?: boolean;
    caffeine?: "none" | "low" | "medium" | "high";
    temperature?: "HOT" | "COLD" | "BOTH";
  };
}

export interface IProductSearchPayload {
  query: string;
}

export interface IChatPayload {
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}

export interface IStructuredMoodExtraction {
  mood: string;
  temperaturePreference: "HOT" | "COLD" | "BOTH";
  sweetnessTarget: number; // 1 - 5
  caffeineTarget: "none" | "low" | "medium" | "high";
  desiredVibe: string;
  flavorKeywords: string[];
}

export interface IRankedRecommendation {
  productId: string;
  score: number;
  reason: string;
  rank: number;
}
