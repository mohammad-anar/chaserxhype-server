import express from "express";
import { SizeController } from "./size.controller.js";
import { SizeValidation } from "./size.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(SizeValidation.createSizeZodSchema),
  SizeController.createSize
);

router.get(
  "/",
  SizeController.getAllSizes
);

router.delete(
  "/:id",
  auth("ADMIN"),
  SizeController.deleteSize
);

export const SizeRouter = router;
