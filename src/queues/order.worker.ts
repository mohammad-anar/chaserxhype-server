import { Worker, Job } from "bullmq";
import { getRedisOptions } from "../config/redis.js";
import { ORDER_AUTOMATION_QUEUE_NAME, IOrderJobData } from "./order.queue.js";
import { AutomationServices } from "../app/modules/automation/automation.service.js";
import config from "../config/index.js";
import colors from "colors";

let orderWorker: Worker<IOrderJobData> | null = null;

export const initOrderWorker = (): Worker<IOrderJobData> | null => {
  try {
    if (orderWorker) return orderWorker;

    const redisOptions = getRedisOptions();
    orderWorker = new Worker<IOrderJobData>(
      ORDER_AUTOMATION_QUEUE_NAME,
      async (job: Job<IOrderJobData>) => {
        console.log(
          colors.blue(
            `🚀 [Worker] Processing BullMQ Job: ${job.name} (ID: ${job.id}) for Order #${job.data.orderId}`
          )
        );

        const result = await AutomationServices.processOrderAutomation(job.data.orderId);

        if (!result.success && result.status === "FAILED") {
          throw new Error(result.error || "Automation failed");
        }

        return result;
      },
      {
        connection: redisOptions as any,
        concurrency: config.queue.concurrency || 5,
      }
    );

    orderWorker.on("completed", (job: Job) => {
      console.log(colors.green(`🎉 [Worker] Job ${job.id} completed successfully.`));
    });

    orderWorker.on("failed", (job: Job | undefined, err: Error) => {
      console.error(
        colors.red(`💥 [Worker] Job ${job?.id || "unknown"} failed with error: ${err.message}`)
      );
    });

    orderWorker.on("error", (err: Error) => {
      // Quiet worker reconnect notices
    });

    console.log(colors.green("🟢 Order Automation Worker initialized"));
    return orderWorker;
  } catch (error: any) {
    console.warn(colors.yellow(`⚠️ Failed to start Order Worker: ${error.message}`));
    return null;
  }
};

export const closeOrderWorker = async (): Promise<void> => {
  if (orderWorker) {
    await orderWorker.close();
    orderWorker = null;
    console.log("🛑 Order Worker closed gracefully.");
  }
};
