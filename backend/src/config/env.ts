import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    name: process.env.DB_NAME || "restaurant_chatbot",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: process.env.DB_SSL === "true",
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "dev-secret-change-in-production-min-64-chars-long",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  whatsapp: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "default_verify_token",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v18.0",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || "admin@chatbot.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "Admin123!",
  },
};
