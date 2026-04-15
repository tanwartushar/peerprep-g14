import "dotenv/config";
import express, { type Application } from "express";
import type { Server } from "node:http";
import cors, { type CorsOptions } from "cors";
import matchingRouter from "./routes/matchingRoutes.js";
import { runReadinessChecks } from "./health/readiness.js";
import { disconnectDatabase } from "./prisma.js";
import { closeRabbitMq } from "./messaging/rabbitmqPublisher.js";

const app: Application = express();
const PORT = Number.parseInt(process.env.PORT ?? "3003", 10);

/** Allow Vite dev (localhost / 127.0.0.1) and optional extra origin from env. */
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
] as const;
const extra = process.env.FRONTEND_ORIGIN?.trim();
const allowList = extra
  ? [...defaultOrigins, extra]
  : [...defaultOrigins];

const corsOptions: CorsOptions = {
  origin: allowList,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

/** Liveness: process is up (no dependency checks). */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", liveness: true });
});

/**
 * Readiness: Postgres (required); RabbitMQ when `RABBITMQ_URL` is set.
 * Use for orchestration (e.g. Docker/K8s) to restart or stop routing when dependencies fail.
 */
app.get("/ready", async (_req, res) => {
  try {
    const result = await runReadinessChecks();
    if (result.ok) {
      res.status(200).json({
        status: "ready",
        checks: result.checks,
      });
      return;
    }
    res.status(503).json({
      status: "not_ready",
      checks: result.checks,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[readiness]", e);
    res.status(503).json({
      status: "not_ready",
      error: message,
    });
  }
});

app.use("/matching", matchingRouter);

const SHUTDOWN_HTTP_MS = Number.parseInt(
  process.env.SHUTDOWN_HTTP_MS ?? "25000",
  10,
);

let server: Server | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`[shutdown] ${signal} received, draining HTTP connections...`);

  const httpServer = server;
  if (!httpServer) {
    await closeRabbitMq();
    await disconnectDatabase();
    process.exit(0);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      console.warn(
        `[shutdown] HTTP drain exceeded ${SHUTDOWN_HTTP_MS}ms; closing open connections`,
      );
      if (typeof httpServer.closeAllConnections === "function") {
        httpServer.closeAllConnections();
      }
    }, SHUTDOWN_HTTP_MS);

    httpServer.close((err) => {
      clearTimeout(t);
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  }).catch((e) => {
    console.error("[shutdown] server.close error:", e);
  });

  console.log("[shutdown] HTTP server closed; closing RabbitMQ and database...");
  try {
    await closeRabbitMq();
  } catch (e) {
    console.error("[shutdown] RabbitMQ close:", e);
  }
  try {
    await disconnectDatabase();
  } catch (e) {
    console.error("[shutdown] database disconnect:", e);
  }

  console.log("[shutdown] cleanup complete");
  process.exit(0);
}

process.once("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

server = app.listen(PORT, () => {
  console.log(`matching-service listening on http://localhost:${PORT}`);
});
