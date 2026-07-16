import express from "express";
import { UserController } from "./user.controller.js";

const router = express.Router();

router.post("/create-patient", UserController.createPatient);

export const UserRouter = router;
