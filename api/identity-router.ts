import express, { type Response } from "express";

import type {
  AuthenticatedRequest
} from "./auth.js";

import {
  EntraConfigurationError,
  EntraGraphError,
  getRecentEntraSignIns
} from "./entra-client.js";

export const identityRouter = express.Router();

function maskUserPrincipalName(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  const [localPart, domain] = value.split("@");

  if (!domain) {
    return "***";
  }

  const visiblePrefix =
    localPart.length > 1
      ? localPart.slice(0, 1)
      : "";

  return `${visiblePrefix}***@${domain}`;
}

function maskIpAddress(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  if (value.includes(":")) {
    const segments = value.split(":");

    return `${segments.slice(0, 3).join(":")}::`;
  }

  const octets = value.split(".");

  if (octets.length !== 4) {
    return "***";
  }

  return `${octets[0]}.${octets[1]}.x.x`;
}

identityRouter.get(
  "/sign-ins",
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    if (req.user?.role !== "analyst") {
      res.status(403).json({
        kind: "ErrorResponse",
        errorCode: "ANALYST_ROLE_REQUIRED",
        message:
          "Security analyst access is required."
      });
      return;
    }

    const requestedLimit =
      typeof req.query.limit === "string"
        ? Number(req.query.limit)
        : 10;

    const limit =
      Number.isFinite(requestedLimit)
        ? Math.min(
            Math.max(Math.floor(requestedLimit), 1),
            50
          )
        : 10;

    const startedAt = process.hrtime.bigint();

    try {
      const signIns =
        await getRecentEntraSignIns(limit);

      const completedAt = process.hrtime.bigint();

      const graphLatencyMs =
        Number(completedAt - startedAt) / 1_000_000;

      const failedSignIns = signIns.filter(
        signIn => signIn.status?.errorCode !== 0
      );

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "info",
          event: "ENTRA_SIGNINS_RETRIEVED",
          actor: req.user.subject,
          recordsReturned: signIns.length,
          failedSignIns: failedSignIns.length,
          graphLatencyMs:
            Number(graphLatencyMs.toFixed(2))
        })
      );

      for (const signIn of signIns) {
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level:
              signIn.status?.errorCode === 0
                ? "info"
                : "warn",
            event: "ENTRA_SIGN_IN_OBSERVED",
            entraEventId: signIn.id,
            occurredAt: signIn.createdDateTime,
            userPrincipalName:
              maskUserPrincipalName(
                signIn.userPrincipalName
              ),
            application: signIn.appDisplayName,
            sourceIp:
              maskIpAddress(signIn.ipAddress),
            clientAppUsed: signIn.clientAppUsed,
            conditionalAccessStatus:
              signIn.conditionalAccessStatus,
            riskLevel:
              signIn.riskLevelDuringSignIn,
            riskState: signIn.riskState,
            result:
              signIn.status?.errorCode === 0
                ? "success"
                : "failure",
            errorCode:
              signIn.status?.errorCode ?? null,
            failureReason:
              signIn.status?.failureReason ?? null
          })
        );
      }

      res.json({
        kind: "EntraSignInCollection",
        signIns,
        totalItems: signIns.length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      const completedAt = process.hrtime.bigint();

      const graphLatencyMs =
        Number(completedAt - startedAt) / 1_000_000;

      if (error instanceof EntraConfigurationError) {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "error",
            event:
              "ENTRA_CONFIGURATION_ERROR",
            actor: req.user.subject,
            message: error.message
          })
        );

        res.status(503).json({
          kind: "ErrorResponse",
          errorCode:
            "ENTRA_INTEGRATION_NOT_CONFIGURED",
          message:
            "The Microsoft Entra integration is not configured."
        });
        return;
      }

      if (error instanceof EntraGraphError) {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "error",
            event: "ENTRA_GRAPH_REQUEST_FAILED",
            actor: req.user.subject,
            graphStatusCode: error.statusCode,
            graphErrorCode:
              error.graphCode ?? null,
            graphLatencyMs:
              Number(graphLatencyMs.toFixed(2)),
            message: error.message
          })
        );

        res.status(502).json({
          kind: "ErrorResponse",
          errorCode:
            "ENTRA_GRAPH_REQUEST_FAILED",
          message:
            "The API could not retrieve Microsoft Entra sign-ins.",
          graphStatusCode: error.statusCode,
          graphErrorCode:
            error.graphCode ?? null
        });
        return;
      }

      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          event:
            "ENTRA_SIGNINS_UNEXPECTED_ERROR",
          actor: req.user.subject,
          graphLatencyMs:
            Number(graphLatencyMs.toFixed(2)),
          message:
            error instanceof Error
              ? error.message
              : "Unknown error"
        })
      );

      res.status(500).json({
        kind: "ErrorResponse",
        errorCode: "INTERNAL_SERVER_ERROR",
        message:
          "An unexpected error occurred."
      });
    }
  }
);
