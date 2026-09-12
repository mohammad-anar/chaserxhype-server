import { Redis, RedisOptions } from "ioredis";
import config from "./index.js";
import colors from "colors";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export const getRedisOptions = (): RedisOptions => {
  const retryStrategy = (times: number) => {
    if (times > 3) {
      return null; // Stop retrying if Redis is not running
    }
    return Math.min(times * 2000, 5000);
  };

  if (config.redis.url) {
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy,
    };
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy,
  };
};

export const createRedisConnection = (): Redis => {
  const options = getRedisOptions();
  const client = config.redis.url
    ? new Redis(config.redis.url, options)
    : new Redis(options);

  client.on("connect", () => {
    isRedisAvailable = true;
    console.log(colors.green("🟢 Connected to Redis successfully"));
  });

  client.on("error", (err: any) => {
    isRedisAvailable = false;
  });

  client.on("close", () => {
    isRedisAvailable = false;
  });

  return client;
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = createRedisConnection();
    redisClient.connect().catch(() => {
      // Offline fallback is used
    });
  }
  return redisClient;
};

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return pong === "PONG";
  } catch (error) {
    return false;
  }
};

export const getIsRedisAvailable = (): boolean => isRedisAvailable;
