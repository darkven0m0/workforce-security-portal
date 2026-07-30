import express, { type Response } from "express";

import {
  authenticateWorkforceRequest,
  demoApiClients,
  type AuthenticatedRequest
} from "./auth.js";

import {
  auditEntries,
  securityEvents
} from "./data.js";

export const securityRouter = express.Router();

securityRouter.use(authenticateWorkforceRequest);

securityRouter.get(
  "/events",
  (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== "analyst") {
      res.status(403).json({
        kind: "ErrorResponse",
        errorCode: "ANALYST_ROLE_REQUIRED",
        message: "Security analyst access is required."
      });
      return;
    }

    res.json({
      kind: "SecurityEventCollection",
      securityEvents,
      totalItems: securityEvents.length
    });
  }
);

securityRouter.patch(
  "/events/:eventId/investigate",
  (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== "analyst") {
      res.status(403).json({
        kind: "ErrorResponse",
        errorCode: "ANALYST_ROLE_REQUIRED",
        message: "Security analyst access is required."
      });
      return;
    }

    const event = securityEvents.find(
      item => item.id === req.params.eventId
    );

    if (!event) {
      res.status(404).json({
        kind: "ErrorResponse",
        errorCode: "SECURITY_EVENT_NOT_FOUND",
        message: "The requested security event does not exist."
      });
      return;
    }

    event.status = "Investigating";

    auditEntries.push({
      id: `audit-${auditEntries.length + 1}`,
      organizationId: event.organizationId,
      actor: req.user.subject,
      action: "SECURITY_EVENT_INVESTIGATION_STARTED",
      target: event.id,
      createdAt: new Date().toISOString()
    });

    res.json({
      kind: "SecurityEventResponse",
      event
    });
  }
);

securityRouter.patch(
  "/events/:eventId/revoke-api-key",
  (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== "analyst") {
      res.status(403).json({
        kind: "ErrorResponse",
        errorCode: "ANALYST_ROLE_REQUIRED",
        message: "Security analyst access is required."
      });
      return;
    }

    const event = securityEvents.find(
      item => item.id === req.params.eventId
    );

    if (!event) {
      res.status(404).json({
        kind: "ErrorResponse",
        errorCode: "SECURITY_EVENT_NOT_FOUND",
        message: "The requested security event does not exist."
      });
      return;
    }

    const matchingKey = Object.entries(demoApiClients).find(
      ([, client]) =>
        client.integrationId === event.integrationId
    );

    if (!matchingKey) {
      res.status(404).json({
        kind: "ErrorResponse",
        errorCode: "API_CLIENT_NOT_FOUND",
        message: "No API client matches the affected integration."
      });
      return;
    }

    const [apiKey, apiClient] = matchingKey;

    apiClient.status = "revoked";
    event.status = "Contained";

    auditEntries.push({
      id: `audit-${auditEntries.length + 1}`,
      organizationId: event.organizationId,
      actor: req.user.subject,
      action: "API_KEY_REVOKED",
      target: apiClient.integrationId,
      createdAt: new Date().toISOString()
    });

    res.json({
      kind: "ContainmentResponse",
      event,
      integrationId: apiClient.integrationId,
      apiKeySuffix: apiKey.slice(-4),
      status: "revoked"
    });
  }
);

securityRouter.get(
  "/audit",
  (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== "analyst") {
      res.status(403).json({
        kind: "ErrorResponse",
        errorCode: "ANALYST_ROLE_REQUIRED",
        message: "Security analyst access is required."
      });
      return;
    }

    res.json({
      kind: "AuditEntryCollection",
      auditEntries,
      totalItems: auditEntries.length
    });
  }
);
