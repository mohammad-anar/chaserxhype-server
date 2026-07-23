import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./config/index.js";
import router from "./app/routes/index.js";
import { PaymentController } from "./app/modules/payment/payment.controller.js";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";
import notFound from "./app/middlewares/notFound.js";

const app: Application = express();
const allowedOrigins = (config.cors_origin ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
  }),
);

//parser
app.use(
  express.json({
    verify: (req: any, res: any, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

app.use(express.static("uploads"));

app.post("/api/webhooks/stripe", PaymentController.stripeWebhook);
app.use("/api/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.send({
    message: "Server is running..",
    environment: config.node_env,
    uptime: process.uptime().toFixed(2) + " sec",
    timeStamp: new Date().toISOString(),
  });
});

app.use(globalErrorHandler);

app.use(notFound);

export default app;
