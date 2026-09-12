import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  ip_address: process.env.IP_ADDRESS,
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_round: Number(process.env.BCRYPT_SALT_ROUND),
  cors_origin: process.env.CORS_ORIGIN,
  frontend_url: process.env.FRONTEND_URL,
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,
  },
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
    jwt_refresh_expire_in: process.env.JWT_REFRESH_EXPIRE_IN,
  },
  admin: {
    name: process.env.NAME,
    email: process.env.EMAIL,
    phone: process.env.PHONE,
    password: process.env.PASSWORD,
    avatar: process.env.AVATAR,
  },
  stripe: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  redis: {
    url: process.env.REDIS_URL || "",
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  ai: {
    provider: process.env.AI_PROVIDER || "fallback", // 'openai' | 'gemini' | 'fallback'
    model: process.env.AI_MODEL || (process.env.AI_PROVIDER === "openai" ? "gpt-4o-mini" : "gemini-2.5-flash"),
    openai_api_key: process.env.OPENAI_API_KEY || "",
    gemini_api_key: process.env.GEMINI_API_KEY || "",
    timeout_ms: Number(process.env.AI_REQUEST_TIMEOUT) || 15000,
    max_retries: Number(process.env.AI_MAX_RETRIES) || 2,
  },
  queue: {
    concurrency: Number(process.env.QUEUE_CONCURRENCY) || 5,
  },
};

