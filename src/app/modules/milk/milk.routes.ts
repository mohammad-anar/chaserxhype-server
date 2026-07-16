import express from "express";
import { MilkController } from "./milk.controller.js";
import { MilkValidation } from "./milk.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(MilkValidation.createMilkZodSchema),
  MilkController.createMilk
);

router.get(
  "/",
  MilkController.getAllMilks
);

router.delete(
  "/:id",
  auth("ADMIN"),
  MilkController.deleteMilk
);

export const MilkRouter = router;
