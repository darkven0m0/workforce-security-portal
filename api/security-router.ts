import express, {
  type NextFunction,
  type Response
} from "express";

import {
  authenticateWorkforceRequest,
  demoApiClients,
  type AuthenticatedRequest
} from "./auth.js";

import {
  auditEntries,
  securityEvents
} from "./data.js";

import {
  identityRouter
} from "./identity-router.js";

export const securityRouter =
  express.Router();

function requireSecurityRole(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const role =
    req.user?.role;

  if (
    role !== "analyst" &&
    role !== "admin"
  ) {
    res.status(403).json({
      kind: "ErrorResponse",
      errorCode:
        "SECURITY_ROLE_REQUIRED",
      message:
        "Security Analyst or Admin access is required."
    });

    return;
  }

  next();
}

function requireAdminRole(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (
    req.user?.role !==
    "admin"
  ) {
    res.status(403).json({
      kind: "ErrorResponse",
      errorCode:
        "ADMIN_ROLE_REQUIRED",
      message:
        "Security Admin access is required for this containment action."
    });

    return;
  }

  next();
}

securityRouter.use(
  authenticateWorkforceRequest
);

securityRouter.use(
  requireSecurityRole
);

securityRouter.use(
  "/identity",
  identityRouter
);

securityRouter.get(
  "/events",
  (
    _req: AuthenticatedRequest,
    res: Response
  ) => {
    res.json({
      kind:
        "SecurityEventCollection",
      securityEvents,
      totalItems:
        securityEvents.length
    });
  }
);

securityRouter.patch(
  "/events/:eventId/investigate",
  (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const event =
      securityEvents.find(
        item =>
          item.id ===
          req.params.eventId
      );

    if (!event) {
      res.status(404).json({
        kind: "ErrorResponse",
        errorCode:
          "SECURITY_EVENT_NOT_FOUND",
        message:
          "The requested security event does not exist."
      });

      return;
    }

    event.status =
      "Investigating";

    auditEntries.push({
      id:
        `audit-${
          auditEntries.length + 1
        }`,
      organizationId:
        event.organizationId,
      actor:
        req.user?.subject ??
        "unknown",
      action:
        "SECURITY_EVENT_INVESTIGATION_STARTED",
      target:
        event.id,
      createdAt:
        new Date().toISOString()
    });

    res.json({
      kind:
        "SecurityEventResponse",
      event
    });
  }
);

securityRouter.patch(
  "/events/:eventId/revoke-api-key",
  requireAdminRole,
  (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const event =
      securityEvents.find(
        item =>
          item.id ===
          req.params.eventId
      );

    if (!event) {
      res.status(404).json({
        kind: "ErrorResponse",
        errorCode:
          "SECURITY_EVENT_NOT_FOUND",
        message:
          "The requested security event does not exist."
      });

      return;
    }

    const matchingKey =
      Object.entries(
        demoApiClients
      ).find(
        ([, client]) =>
          client.integrationId ===
          event.integrationId
      );

    if (!matchingKey) {
      res.status(404).json({
        kind: "ErrorResponse",
        errorCode:
          "API_CLIENT_NOT_FOUND",
        message:
          "No API client matches the affected integration."
      });

      return;
    }

    const [
      apiKey,
      apiClient
    ] = matchingKey;

    apiClient.status =
      "revoked";

    event.status =
      "Contained";

    auditEntries.push({
      id:
        `audit-${
          auditEntries.length + 1
        }`,
      organizationId:
        event.organizationId,
      actor:
        req.user?.subject ??
        "unknown",
      action:
        "API_KEY_REVOKED",
      target:
        apiClient.integrationId,
      createdAt:
        new Date().toISOString()
    });

    res.json({
      kind:
        "ContainmentResponse",
      event,
      integrationId:
        apiClient.integrationId,
      apiKeySuffix:
        apiKey.slice(-4),
      status:
        "revoked"
    });
  }
);

securityRouter.get(
  "/audit",
  (
    _req: AuthenticatedRequest,
    res: Response
  ) => {
    res.json({
      kind:
        "AuditEntryCollection",
      auditEntries,
      totalItems:
        auditEntries.length
    });
  }
);
