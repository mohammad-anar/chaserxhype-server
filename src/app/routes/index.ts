import express from "express";
import { UserRouter } from "../modules/user/user.routes.js";
import { AuthRoutes } from "../modules/auth/auth.routes.js";
import { AddressRouter } from "../modules/address/address.routes.js";
import { WalletRouter } from "../modules/wallet/wallet.routes.js";
import { SavedCardRouter } from "../modules/savedCard/savedCard.routes.js";
import { SupportTicketRouter } from "../modules/supportTicket/supportTicket.routes.js";
import { CategoryRouter } from "../modules/category/category.routes.js";
import { SizeRouter } from "../modules/size/size.routes.js";
import { MilkRouter } from "../modules/milk/milk.routes.js";
import { ExtraRouter } from "../modules/extra/extra.routes.js";
import { ProductRouter } from "../modules/product/product.routes.js";
import { CoinProductRouter } from "../modules/coinProduct/coinProduct.routes.js";

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
  {
    path: "/category",
    route: CategoryRouter,
  },
  {
    path: "/size",
    route: SizeRouter,
  },
  {
    path: "/milk",
    route: MilkRouter,
  },
  {
    path: "/extra",
    route: ExtraRouter,
  },
  {
    path: "/product",
    route: ProductRouter,
  },
  {
    path: "/coin-product",
    route: CoinProductRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
