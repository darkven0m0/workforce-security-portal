import type { NextFunction, Request, Response } from "express";
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from "../metrics";

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSeconds =
      Number(process.hrtime.bigint() - startTime) / 1_000_000_000;

    const route = req.route?.path || req.path || "unknown";

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
}