import express from "express";
import { UserController } from "./user.controller.js";
import auth from "../../middlewares/auth.js";
import fileUploadHandler from "../../middlewares/fileUploadHandler.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { UserValidation } from "./user.validation.js";

const router = express.Router();

// Public User Signup
router.post(
  "/create-user",
  fileUploadHandler(),
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

// Get currently logged-in user profile
router.get(
  "/my-profile",
  auth("USER", "ADMIN"),
  UserController.getMyProfile
);

// Update currently logged-in user profile
router.patch(
  "/update-profile",
  auth("USER", "ADMIN"),
  fileUploadHandler(),
  validateRequest(UserValidation.updateUserProfileZodSchema),
  UserController.updateMyProfile
);

// Admin-only: Get all users
router.get(
  "/",
  auth("ADMIN"),
  UserController.getAllUsers
);

// Admin-only: Get user by ID
router.get(
  "/:id",
  auth("ADMIN"),
  UserController.getUserById
);

// Admin-only: Update user status
router.patch(
  "/:id/status",
  auth("ADMIN"),
  validateRequest(UserValidation.updateUserStatusZodSchema),
  UserController.updateUserStatus
);

// Delete user (Self or Admin)
router.delete(
  "/:id",
  auth("USER", "ADMIN"),
  UserController.deleteUser
);

export const UserRouter = router;
