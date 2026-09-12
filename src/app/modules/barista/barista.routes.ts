import express from "express";
import { BaristaController } from "./barista.controller.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.get("/me", auth("BARISTA", "ADMIN"), BaristaController.getMyBaristaProfile);
router.patch("/me", auth("BARISTA", "ADMIN"), BaristaController.updateMyBaristaProfile);
router.post("/claim/:orderId", auth("BARISTA", "ADMIN"), BaristaController.claimOrder);

router.get("/", auth("ADMIN", "BARISTA"), BaristaController.getAllBaristas);
router.post("/", auth("ADMIN"), BaristaController.createBarista);
router.patch("/:id", auth("ADMIN"), BaristaController.updateBaristaProfile);
router.post("/assign/:orderId", auth("ADMIN"), BaristaController.assignBaristaToOrder);

export const BaristaRouter = router;
