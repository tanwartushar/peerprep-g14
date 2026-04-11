import "dotenv/config";
import express, { type Application } from "express";
import cors, { type CorsOptions } from "cors";
import matchingRouter from "./routes/matchingRoutes.js";

const app: Application = express();
const PORT = Number.parseInt(process.env.PORT ?? "3003", 10);

/** Allow Vite dev (localhost / 127.0.0.1) and optional extra origin from env. */
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Add your exact ALB DNS name here:
  "http://peerprep-1486465808.ap-southeast-1.elb.amazonaws.com"
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

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/matching", matchingRouter);

app.listen(PORT, () => {
  console.log(`matching-service listening on http://localhost:${PORT}`);
});
