import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./config/index.js";
import router from "./app/routes/index.js";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";
import notFound from "./app/middlewares/notFound.js";

const app: Application = express();
app.use(
  cors({
    origin: ["http://localhost:3000", "http://10.10.7.102:3000"],
    credentials: true,
  }),
);

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("uploads"));

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
