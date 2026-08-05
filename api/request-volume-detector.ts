import type {
  NextFunction,
  Response
} from "express";

import type {
  AuthenticatedRequest
} from "./auth.js";

import {
  securityEvents
} from "./data.js";

const WINDOW_MS = 10_000;
const REQUEST_THRESHOLD = 10;
const NORMAL_REQUEST_COUNT = 5;

const requestTimestamps =
  new Map<string, number[]>();

function getSourceIp(
  req: AuthenticatedRequest
): string {
  const forwardedFor =
    req.get("x-forwarded-for");

  return (
    forwardedFor
      ?.split(",")[0]
      ?.trim() ??
    req.ip ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

export function resetRequestVolumeDetector(): void {
  requestTimestamps.clear();
}

export function detectHighRequestVolume(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  res.on(
    "finish",
    () => {
      if (
        res.statusCode < 200 ||
        res.statusCode >= 300 ||
        !req.user ||
        !req.apiClient
      ) {
        return;
      }

      const now = Date.now();

      const integrationId =
        req.apiClient.integrationId;

      const organizationId =
        req.user.organizationId === "*"
          ? req.apiClient.organizationId
          : req.user.organizationId;

      const previousTimestamps =
        requestTimestamps.get(
          integrationId
        ) ?? [];

      const activeTimestamps =
        previousTimestamps.filter(
          timestamp =>
            now - timestamp <=
            WINDOW_MS
        );

      activeTimestamps.push(now);

      requestTimestamps.set(
        integrationId,
        activeTimestamps
      );

      if (
        activeTimestamps.length <
        REQUEST_THRESHOLD
      ) {
        return;
      }

      const eventId =
        `event-volume-${integrationId}`;

      const existingEvent =
        securityEvents.find(
          event =>
            event.id === eventId
        );

      if (existingEvent) {
        existingEvent.requestCount =
          activeTimestamps.length;

        existingEvent.createdAt =
          new Date().toISOString();

        return;
      }

      securityEvents.push({
        id: eventId,
        organizationId,
        integrationId,
        title:
          "Automated test detected unusual API request volume",
        severity: "High",
        sourceIp:
          getSourceIp(req),
        requestCount:
          activeTimestamps.length,
        normalRequestCount:
          NORMAL_REQUEST_COUNT,
        status: "Open",
        createdAt:
          new Date().toISOString()
      });

      console.warn(
        JSON.stringify({
          timestamp:
            new Date().toISOString(),
          level: "warn",
          event:
            "HIGH_API_REQUEST_VOLUME_DETECTED",
          organizationId,
          integrationId,
          sourceIp:
            getSourceIp(req),
          requestCount:
            activeTimestamps.length,
          threshold:
            REQUEST_THRESHOLD,
          windowSeconds:
            WINDOW_MS / 1000
        })
      );
    }
  );

  next();
}
