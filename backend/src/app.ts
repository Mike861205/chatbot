import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { logger } from "./utils/logger";

import authRoutes from "./modules/auth/auth.routes";
import menuRoutes from "./modules/menu/menu.routes";
import ordersRoutes from "./modules/orders/orders.routes";
import customersRoutes from "./modules/customers/customers.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.isDev ? "*" : [env.frontendUrl],
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// HTTP logging
app.use(
  morgan(env.isDev ? "dev" : "combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Stricter limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/super/login", authLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error("Unhandled error", err);
    res.status(500).json({
      error: env.isDev ? err.message : "Internal server error",
    });
  },
);

export default app;
