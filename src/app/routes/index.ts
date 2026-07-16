import express from "express";
import { UserRouter } from "../modules/user/user.routes.js";
import { AuthRoutes } from "../modules/auth/auth.routes.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/user",
    route: UserRouter,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
