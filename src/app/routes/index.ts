import express from "express";
import { UserRouter } from "../modules/user/user.routes.js";
import { AuthRoutes } from "../modules/auth/auth.routes.js";
import { AddressRouter } from "../modules/address/address.routes.js";
import { WalletRouter } from "../modules/wallet/wallet.routes.js";
import { SavedCardRouter } from "../modules/savedCard/savedCard.routes.js";
import { SupportTicketRouter } from "../modules/supportTicket/supportTicket.routes.js";
import { CategoryRouter } from "../modules/category/category.routes.js";
import { ProductRouter } from "../modules/product/product.routes.js";
import { CoinProductRouter } from "../modules/coinProduct/coinProduct.routes.js";
import { ProductSizeRouter } from "../modules/productSize/productSize.routes.js";
import { ProductMilkRouter } from "../modules/productMilk/productMilk.routes.js";
import { ProductExtraRouter } from "../modules/productExtra/productExtra.routes.js";
import { TaxRouter } from "../modules/tax/tax.routes.js";
import { DeliveryFeeRouter } from "../modules/deliveryFee/deliveryFee.routes.js";
import { ServiceChargeRouter } from "../modules/serviceCharge/serviceCharge.routes.js";
import { CartRouter } from "../modules/cart/cart.routes.js";
import { OrderRouter } from "../modules/order/order.routes.js";
import { PaymentRouter } from "../modules/payment/payment.routes.js";

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
    path: "/product",
    route: ProductRouter,
  },
  {
    path: "/coin-product",
    route: CoinProductRouter,
  },
  {
    path: "/product-size",
    route: ProductSizeRouter,
  },
  {
    path: "/product-milk",
    route: ProductMilkRouter,
  },
  {
    path: "/product-extra",
    route: ProductExtraRouter,
  },
  {
    path: "/tax",
    route: TaxRouter,
  },
  {
    path: "/delivery-fee",
    route: DeliveryFeeRouter,
  },
  {
    path: "/service-charge",
    route: ServiceChargeRouter,
  },
  {
    path: "/cart",
    route: CartRouter,
  },
  {
    path: "/order",
    route: OrderRouter,
  },
  {
    path: "/payment",
    route: PaymentRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
