import path from "node:path";

import cors from "cors";
import express from "express";

import {
  authConfigRouter
} from "./auth-config-router.js";

import {
  requestLogger
} from "./request-logger.js";

import {
  securityRouter
} from "./security-router.js";

import {
  testRouter
} from "./test-router.js";

import {
  workforceRouter
} from "./workforce-router.js";

import {
  metricsMiddleware
} from "./src/middleware/metricsMiddleware.js";

import {
  register
} from "./src/metrics.js";

const app = express();

const port =
  Number(process.env.PORT ?? 3000);

const webDirectory = path.resolve(
  process.cwd(),
  "web"
);

const indexFile = path.join(
  webDirectory,
  "index.html"
);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(cors());

app.use(
  express.json({
    limit: "50kb"
  })
);

app.use(requestLogger);
app.use(metricsMiddleware);

app.get(
  ["/", "/index.html"],
  (_req, res) => {
    res.sendFile(indexFile);
  }
);

app.get(
  "/redirect.html",
  (_req, res) => {
    /*
     * Do not add Cross-Origin-Opener-Policy
     * headers to this route. MSAL uses the
     * popup-to-main-window communication channel.
     */
    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.sendFile(
      path.join(
        webDirectory,
        "redirect.html"
      )
    );
  }
);

app.get(
  "/styles.css",
  (_req, res) => {
    res.sendFile(
      path.join(
        webDirectory,
        "styles.css"
      )
    );
  }
);

app.get(
  "/app.js",
  (_req, res) => {
    res.type("text/javascript");

    res.sendFile(
      path.join(
        webDirectory,
        "app.js"
      )
    );
  }
);

app.get(
  "/auth.js",
  (_req, res) => {
    res.type("text/javascript");

    res.sendFile(
      path.join(
        webDirectory,
        "auth.js"
      )
    );
  }
);

app.get(
  "/vendor/msal-browser.js",
  (_req, res) => {
    res.type("text/javascript");

    res.sendFile(
      path.join(
        webDirectory,
        "vendor",
        "msal-browser.js"
      )
    );
  }
);

app.get(
  "/vendor/msal-redirect-bridge.js",
  (_req, res) => {
    res.type("text/javascript");

    res.sendFile(
      path.join(
        webDirectory,
        "vendor",
        "msal-redirect-bridge.js"
      )
    );
  }
);

app.get(
  "/high-api-request-volume.html",
  (_req, res) => {
    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.sendFile(
      path.join(
        webDirectory,
        "high-api-request-volume.html"
      )
    );
  }
);

app.get(
  "/health",
  (_req, res) => {
    res.json({
      status: "healthy",
      service:
        "cloud-workforce-security-lab",
      timestamp:
        new Date().toISOString()
    });
  }
);

app.get(
  "/metrics",
  async (_req, res) => {
    try {
      res.setHeader(
        "Content-Type",
        register.contentType
      );

      res.end(
        await register.metrics()
      );
    } catch (error) {
      console.error(
        "Failed to generate metrics:",
        error
      );

      res.status(500).json({
        kind: "ErrorResponse",
        errorCode:
          "METRICS_GENERATION_FAILED",
        message:
          "Unable to generate Prometheus metrics."
      });
    }
  }
);

app.use(
  "/auth",
  authConfigRouter
);

app.use(
  "/via/v2/organizations/:orgId/workforce",
  workforceRouter
);

app.use(
  "/security/v1",
  securityRouter
);

if (
  process.env.ENABLE_TEST_ROUTES ===
  "true"
) {
  app.use(
    "/test",
    testRouter
  );
}

app.use(
  (_req, res) => {
    res.status(404).json({
      kind: "ErrorResponse",
      errorCode: "ROUTE_NOT_FOUND",
      message:
        "The requested route does not exist."
    });
  }
);

app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      JSON.stringify({
        timestamp:
          new Date().toISOString(),
        level: "info",
        event: "SERVICE_STARTED",
        service:
          "cloud-workforce-security-lab",
        port,
        webDirectory,
        testRoutesEnabled:
          process.env
            .ENABLE_TEST_ROUTES ===
          "true",
        interactiveEntraConfigured:
          Boolean(
            process.env
              .ENTRA_TENANT_ID &&
            process.env
              .ENTRA_SPA_CLIENT_ID &&
            process.env
              .ENTRA_API_CLIENT_ID &&
            process.env
              .ENTRA_API_SCOPE
          )
      })
    );
  }
);
