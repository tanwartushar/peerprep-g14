import "dotenv/config";
import express, { type Application } from "express";
import cors, { type CorsOptions } from "cors";
import matchingRouter from "./routes/matchingRoutes.js";
import { runReadinessChecks } from "./health/readiness.js";

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

app.listen(PORT, () => {
  console.log(`matching-service listening on http://localhost:${PORT}`);
});
