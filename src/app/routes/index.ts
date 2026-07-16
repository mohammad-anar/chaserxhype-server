import express from "express";
import { UserRouter } from "../modules/user/user.routes.js";
import { AuthRoutes } from "../modules/auth/auth.routes.js";
import { AddressRouter } from "../modules/address/address.routes.js";
import { WalletRouter } from "../modules/wallet/wallet.routes.js";
import { SavedCardRouter } from "../modules/savedCard/savedCard.routes.js";
import { SupportTicketRouter } from "../modules/supportTicket/supportTicket.routes.js";

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
  {
    path: "/address",
    route: AddressRouter,
  },
  {
    path: "/wallet",
    route: WalletRouter,
  },
  {
    path: "/saved-card",
    route: SavedCardRouter,
  },
  {
    path: "/support-ticket",
    route: SupportTicketRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
