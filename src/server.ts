import app from "./app.js";
import config from "./config/index.js";
import { seedSuperAdmin } from "./db/seedSuperAdmin.js";
import { initSocket } from "./helpers/socketHelper.js";
import { initOrderWorker, closeOrderWorker } from "./queues/order.worker.js";
import colors from "colors";

let server: any;

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception detected:", error);
});

async function bootstrap() {
  try {
    server = app.listen(config.port, () => {
      console.log(colors.green(`🚀 Server running on http://localhost:${config.port}`));
    });

    initSocket(server);
    initOrderWorker();

    // Seeding admin in background so server is not blocked if DB is connecting
    seedSuperAdmin().catch((err) => {
      console.warn(colors.yellow(`⚠️ Admin seeding warning: ${err.message}`));
    });
  } catch (error) {
    console.error(colors.red("Error during server startup:"), error);
  }
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection detected:", error);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received.");
  await closeOrderWorker();
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT received.");
  await closeOrderWorker();
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  }
});

bootstrap();
