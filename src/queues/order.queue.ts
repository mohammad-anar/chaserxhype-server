import { Queue } from "bullmq";
import { getRedisOptions, getIsRedisAvailable } from "../config/redis.js";
import colors from "colors";

export const ORDER_AUTOMATION_QUEUE_NAME = "orderAutomationQueue";

export enum OrderJobNames {
  PROCESS_ORDER = "PROCESS_ORDER",
  RETRY_ORDER = "RETRY_ORDER",
}

export interface IOrderJobData {
  orderId: string;
  triggeredAt: string;
  retryCount?: number;
}

let orderQueue: Queue | null = null;

export const getOrderQueue = (): Queue | null => {
  try {
    if (!orderQueue) {
      const redisOptions = getRedisOptions();
      orderQueue = new Queue(ORDER_AUTOMATION_QUEUE_NAME, {
        connection: redisOptions as any,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 3000,
          },
          removeOnComplete: {
            age: 86400, // keep for 24h
            count: 1000,
          },
          removeOnFail: {
            age: 604800, // keep for 7 days
          },
        },
      });

      orderQueue.on("error", (err) => {
        console.warn(colors.yellow(`⚠️ BullMQ Order Queue Notice: ${err.message}`));
      });
    }
    return orderQueue;
  } catch (error: any) {
    console.warn(colors.yellow(`⚠️ Failed to initialize BullMQ Order Queue: ${error.message}`));
    return null;
  }
};

/**
 * Adds an order to the automation queue.
 * If Redis/BullMQ is offline, falls back to direct async automation execution.
 */
export const enqueueOrderAutomation = async (
  orderId: string,
  retryCount = 0
): Promise<{ enqueued: boolean; jobId?: string; mode: "QUEUE" | "DIRECT_ASYNC" }> => {
  try {
    const queue = getOrderQueue();
    if (queue && getIsRedisAvailable()) {
      const job = await queue.add(
        OrderJobNames.PROCESS_ORDER,
        {
          orderId,
          triggeredAt: new Date().toISOString(),
          retryCount,
        },
        {
          jobId: `order-${orderId}-${retryCount}`,
        }
      );
      console.log(colors.cyan(`📦 Order #${orderId} enqueued to BullMQ (Job ID: ${job.id})`));
      return { enqueued: true, jobId: job.id, mode: "QUEUE" };
    }
  } catch (err: any) {
    console.warn(colors.yellow(`⚠️ Could not enqueue to BullMQ (${err.message}). Using direct async executor fallback.`));
  }

  // Resilient Fallback: Execute asynchronously without blocking HTTP response
  import("../app/modules/automation/automation.service.js").then(({ AutomationServices }) => {
    AutomationServices.processOrderAutomation(orderId)
      .then((res) => {
        console.log(colors.green(`✅ Direct async automation finished for order #${orderId}`));
      })
      .catch((err) => {
        console.error(colors.red(`❌ Direct async automation failed for order #${orderId}: ${err.message}`));
      });
  });

  return { enqueued: true, mode: "DIRECT_ASYNC" };
};
