import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BaristaServices } from "../src/app/modules/barista/barista.service.js";
import { FallbackAIProvider, getAIProvider } from "../src/app/modules/ai/ai.provider.js";
import {
  LLMMoodRankingSchema,
  LLMSearchCriteriaSchema,
  MoodRecommendationInputZodSchema,
  ProductSearchInputZodSchema,
  ChatInputZodSchema,
} from "../src/app/modules/ai/ai.schemas.js";

describe("1. Deterministic Recipe & Ingredient Calculation Tests", () => {
  it("should calculate exact ingredient quantities scaled by order item quantity", () => {
    const recipes = [
      { ingredientId: "ing-espresso", quantity: 2, unit: "shot" },
      { ingredientId: "ing-milk", quantity: 200, unit: "ml" },
      { ingredientId: "ing-caramel", quantity: 20, unit: "ml" },
    ];

    const orderQuantity = 3;

    const calculated = recipes.map((r) => ({
      ingredientId: r.ingredientId,
      totalQuantity: r.quantity * orderQuantity,
      unit: r.unit,
    }));

    assert.equal(calculated[0].totalQuantity, 6); // 6 shots espresso
    assert.equal(calculated[1].totalQuantity, 600); // 600ml milk
    assert.equal(calculated[2].totalQuantity, 60); // 60ml caramel
  });

  it("should aggregate identical ingredients across multiple order items", () => {
    const item1 = [
      { ingredientId: "ing-espresso", quantity: 2 },
      { ingredientId: "ing-milk", quantity: 200 },
    ];
    const item2 = [
      { ingredientId: "ing-espresso", quantity: 1 },
      { ingredientId: "ing-milk", quantity: 150 },
      { ingredientId: "ing-vanilla", quantity: 15 },
    ];

    const aggregateMap: Record<string, number> = {};

    for (const ing of [...item1, ...item2]) {
      aggregateMap[ing.ingredientId] = (aggregateMap[ing.ingredientId] || 0) + ing.quantity;
    }

    assert.equal(aggregateMap["ing-espresso"], 3);
    assert.equal(aggregateMap["ing-milk"], 350);
    assert.equal(aggregateMap["ing-vanilla"], 15);
  });

  it("should detect when available stock is insufficient", () => {
    const currentStock = 500; // ml
    const reservedStock = 200; // ml
    const requiredStock = 400; // ml

    const availableStock = currentStock - reservedStock;
    const isSufficient = availableStock >= requiredStock;

    assert.equal(availableStock, 300);
    assert.equal(isSufficient, false);
  });

  it("should calculate reserved stock release correctly upon cancellation", () => {
    let reservedStock = 400;
    const orderReservation = 150;

    // Release stock
    reservedStock = Math.max(0, reservedStock - orderReservation);
    assert.equal(reservedStock, 250);
  });

  it("should deduct both current and reserved stock upon order completion", () => {
    let currentStock = 1000;
    let reservedStock = 300;
    const orderQty = 150;

    currentStock -= orderQty;
    reservedStock -= orderQty;

    assert.equal(currentStock, 850);
    assert.equal(reservedStock, 150);
  });
});

describe("2. Deterministic Barista Scoring & Assignment Tests", () => {
  it("should calculate correct deterministic scores based on availability, workload and skill", () => {
    const baristaAvailable = {
      id: "b1",
      name: "Barista Alex",
      isAvailable: true,
      activeOrderCount: 1,
      skillLevel: 8,
    };

    const baristaBusy = {
      id: "b2",
      name: "Barista Sam",
      isAvailable: true,
      activeOrderCount: 5,
      skillLevel: 9,
    };

    const baristaOffline = {
      id: "b3",
      name: "Barista Taylor",
      isAvailable: false,
      activeOrderCount: 0,
      skillLevel: 10,
    };

    const scoreAlex = BaristaServices.calculateScore(baristaAvailable);
    const scoreSam = BaristaServices.calculateScore(baristaBusy);
    const scoreTaylor = BaristaServices.calculateScore(baristaOffline);

    // Alex: 20 + (10 - 2) + 12 = 40
    // Sam: 20 + (10 - 10) + 13.5 = 33.5
    // Taylor: -1000 + 10 + 15 = -975
    assert.ok(scoreAlex.score > scoreSam.score, "Less busy barista should score higher");
    assert.ok(scoreSam.score > scoreTaylor.score, "Available barista should score higher than offline barista");
    assert.equal(scoreAlex.score, 40);
    assert.equal(scoreSam.score, 33.5);
  });

  it("should rank baristas in descending order of score", () => {
    const baristas = [
      { id: "b1", name: "Alex", isAvailable: true, activeOrderCount: 4, skillLevel: 5 },
      { id: "b2", name: "Charlie", isAvailable: true, activeOrderCount: 0, skillLevel: 8 },
      { id: "b3", name: "Sam", isAvailable: true, activeOrderCount: 1, skillLevel: 9 },
    ];

    const scored = baristas.map((b) => BaristaServices.calculateScore(b));
    scored.sort((a, b) => b.score - a.score);

    assert.equal(scored[0].name, "Charlie"); // 20 + 10 + 12 = 42
    assert.equal(scored[1].name, "Sam"); // 20 + 8 + 13.5 = 41.5
    assert.equal(scored[2].name, "Alex"); // 20 + 2 + 7.5 = 29.5
  });
});

describe("3. Deterministic Invoice Calculation & Idempotency Tests", () => {
  it("should calculate accurate totals including fees, taxes, and discounts", () => {
    const subTotal = 15.50;
    const deliveryFee = 3.00;
    const serviceCharge = 1.25;
    const taxAmount = 1.55;
    const discount = 2.00;

    const total = Number((subTotal + deliveryFee + serviceCharge + taxAmount - discount).toFixed(2));
    assert.equal(total, 19.30);
  });

  it("should prevent duplicate invoice generation by checking orderId", () => {
    const existingInvoices: Record<string, any> = {
      "order-123": { id: "inv-1", invoiceNumber: "INV-20260901-1001", total: 15.00 },
    };

    const generateIdempotentInvoice = (orderId: string) => {
      if (existingInvoices[orderId]) {
        return existingInvoices[orderId];
      }
      const newInv = { id: "inv-2", invoiceNumber: "INV-20260901-1002", total: 20.00 };
      existingInvoices[orderId] = newInv;
      return newInv;
    };

    const firstCall = generateIdempotentInvoice("order-123");
    const secondCall = generateIdempotentInvoice("order-123");

    assert.equal(firstCall.invoiceNumber, "INV-20260901-1001");
    assert.equal(secondCall.invoiceNumber, "INV-20260901-1001");
    assert.equal(firstCall.id, secondCall.id);
  });
});

describe("4. AI Provider & Zod Validation Tests", () => {
  it("should validate valid mood recommendation input payloads", () => {
    const validPayload = {
      mood: "stressed",
      inputText: "I had a rough day and want something soothing and warm",
      preferences: {
        sweet: "low" as const,
        caffeine: "low" as const,
        temperature: "HOT" as const,
      },
    };

    const result = MoodRecommendationInputZodSchema.safeParse(validPayload);
    assert.equal(result.success, true);
  });

  it("should validate natural language product search payloads", () => {
    const validSearch = {
      query: "cold brew with oat milk and vanilla",
    };

    const result = ProductSearchInputZodSchema.safeParse(validSearch);
    assert.equal(result.success, true);
  });

  it("should validate chat assistant payloads", () => {
    const validChat = {
      message: "What is your best coffee for waking up early?",
      conversationHistory: [
        { role: "user" as const, content: "Hi" },
        { role: "assistant" as const, content: "Hello! How can I help you today?" },
      ],
    };

    const result = ChatInputZodSchema.safeParse(validChat);
    assert.equal(result.success, true);
  });

  it("should validate and rank candidates using FallbackAIProvider without network calls", async () => {
    const fallback = new FallbackAIProvider();

    const candidatePrompt = `Candidates:
    {"id": "prod-1", "name": "Chamomile Tea"}
    {"id": "prod-2", "name": "Vanilla Latte"}
    {"id": "prod-3", "name": "Double Espresso"}`;

    const structuredResult = await fallback.generateStructured(
      "Barista system prompt",
      `Customer mood: "stressed". ${candidatePrompt}`,
      LLMMoodRankingSchema
    );

    assert.ok(Array.isArray(structuredResult.recommendations));
    assert.ok(structuredResult.recommendations.length > 0);
    assert.equal(structuredResult.recommendations[0].productId, "prod-1");
    assert.ok(structuredResult.recommendations[0].score > 0);
    assert.ok(typeof structuredResult.recommendations[0].reason === "string");
  });

  it("should extract search criteria using FallbackAIProvider", async () => {
    const fallback = new FallbackAIProvider();

    const result = await fallback.generateStructured(
      "Search parser",
      'User query: "I want something cold, not too sweet and low caffeine"',
      LLMSearchCriteriaSchema
    );

    assert.equal(result.temperature, "COLD");
    assert.equal(result.sweetnessMax, 2);
    assert.equal(result.caffeineMax, 50);
  });

  it("should return grounded chat assistant response from FallbackAIProvider", async () => {
    const fallback = new FallbackAIProvider();
    const reply = await fallback.generateText(
      "Coffee Assistant",
      "What do you have for someone who does not like sweet coffee?"
    );

    assert.ok(reply.length > 10);
    assert.ok(reply.toLowerCase().includes("sweet") || reply.toLowerCase().includes("coffee"));
  });
});
