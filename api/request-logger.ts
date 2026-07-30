import { randomUUID } from "node:crypto";

import type {
  NextFunction,
  Request,
  Response
} from "express";

interface RequestLog {
  timestamp: string;
  level: "info";
  event: "WORKFORCE_API_REQUEST";
  requestId: string;
  method: string;
  path: string;
  route?: string;
  sourceIp: string;
  userAgent?: string;
  organizationId?: string;
  authenticatedOrganization?: string;
  subject?: string;
  role?: string;
  integrationId?: string;
  statusCode: number;
  durationMs: number;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startedAt = process.hrtime.bigint();
  const requestId = randomUUID();

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const completedAt = process.hrtime.bigint();

    const durationMs =
      Number(completedAt - startedAt) / 1_000_000;

    const authenticatedRequest = req as Request & {
      user?: {
        subject: string;
        organizationId: string;
        role: string;
      };
      apiClient?: {
        organizationId: string;
        integrationId: string;
      };
    };

    const organizationId =
      typeof req.params.orgId === "string"
        ? req.params.orgId
        : undefined;

    const forwardedFor = req.get("x-forwarded-for");

    const sourceIp =
      req.ip ??
      forwardedFor?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      level: "info",
      event: "WORKFORCE_API_REQUEST",
      requestId,
      method: req.method,
      path: req.originalUrl,
      route: req.route?.path,
      sourceIp,
      userAgent: req.get("user-agent"),
      organizationId,
      authenticatedOrganization:
        authenticatedRequest.user?.organizationId,
      subject: authenticatedRequest.user?.subject,
      role: authenticatedRequest.user?.role,
      integrationId:
        authenticatedRequest.apiClient?.integrationId,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    };

    console.log(JSON.stringify(log));
  });

  next();
}
