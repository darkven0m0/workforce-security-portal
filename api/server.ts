import cors from "cors";
import express from "express";

import {
  requestLogger
} from "./request-logger.js";

import {
  securityRouter
} from "./security-router.js";

import {
  workforceRouter
} from "./workforce-router.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(cors());

app.use(
  express.json({
    limit: "50kb"
  })
);

app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "cloud-workforce-security-lab",
    timestamp: new Date().toISOString()
  });
});

app.use(
  "/via/v2/organizations/:orgId/workforce",
  workforceRouter
);

app.use(
  "/security/v1",
  securityRouter
);

app.use((_req, res) => {
  res.status(404).json({
    kind: "ErrorResponse",
    errorCode: "ROUTE_NOT_FOUND",
    message: "The requested route does not exist."
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "SERVICE_STARTED",
      service: "cloud-workforce-security-lab",
      port
    })
  );
});
