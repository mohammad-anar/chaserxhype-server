import express from "express";
import { AIController } from "./ai.controller.js";
import {
  ChatInputZodSchema,
  MoodRecommendationInputZodSchema,
  ProductSearchInputZodSchema,
} from "./ai.schemas.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

// Optional auth wrapper: extracts user if token provided, but continues as guest for invalid/expired tokens
const optionalAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    // Call auth but swallow authentication errors — allows anonymous guests through
    return auth("USER", "ADMIN", "BARISTA")(req, res, (err: any) => {
      // If token is invalid/expired, silently continue as unauthenticated guest
      next();
    });
  }
  next();
};

router.post(
  "/mood-recommendation",
  optionalAuth,
  validateRequest(MoodRecommendationInputZodSchema),
  AIController.getMoodRecommendation
);

router.post(
  "/product-search",
  validateRequest(ProductSearchInputZodSchema),
  AIController.naturalLanguageProductSearch
);

router.post(
  "/chat",
  validateRequest(ChatInputZodSchema),
  AIController.customerAssistantChat
);

router.get(
  "/recommendations/history",
  auth("ADMIN", "BARISTA", "USER"),
  AIController.getRecommendationHistory
);

export const AIRouter = router;
