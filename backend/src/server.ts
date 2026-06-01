import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { runMigrations } from "./db/migrate";
import { pool } from "./db/pool";

async function start() {
  try {
    // Run DB migrations on startup
    await runMigrations();

    const server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`WhatsApp webhook: POST /api/whatsapp/webhook`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      server.close(async () => {
        await pool.end();
        logger.info("DB pool closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
