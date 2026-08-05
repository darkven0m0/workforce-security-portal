import type {
  NextFunction,
  Response
} from "express";

import type {
  AuthenticatedRequest
} from "./auth.js";

import {
  auditEntries
} from "./data.js";

export function auditOrganizationAccessDenied(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  res.on(
    "finish",
    () => {
      if (
        res.statusCode !== 403 ||
        !req.user ||
        !req.apiClient
      ) {
        return;
      }

      const orgParam =
        req.params.orgId;

      const requestedOrganizationId =
        Array.isArray(orgParam)
          ? orgParam[0]
          : orgParam;

      if (!requestedOrganizationId) {
        return;
      }

      const hasGlobalAccess =
        req.user.role === "analyst" ||
        req.user.role === "admin";

      const userOrganizationMismatch =
        !hasGlobalAccess &&
        req.user.organizationId !==
          requestedOrganizationId;

      const apiClientOrganizationMismatch =
        !hasGlobalAccess &&
        req.apiClient.organizationId !==
          requestedOrganizationId;

      if (
        !userOrganizationMismatch &&
        !apiClientOrganizationMismatch
      ) {
        return;
      }

      auditEntries.push({
        id:
          `audit-${
            auditEntries.length + 1
          }`,
        organizationId:
          requestedOrganizationId,
        actor:
          req.user.subject,
        action:
          "ORGANIZATION_ACCESS_DENIED",
        target:
          requestedOrganizationId,
        createdAt:
          new Date().toISOString()
      });

      console.warn(
        JSON.stringify({
          timestamp:
            new Date().toISOString(),
          level: "warn",
          event:
            "ORGANIZATION_ACCESS_DENIED",
          actor:
            req.user.subject,
          actorOrganizationId:
            req.user.organizationId,
          apiClientOrganizationId:
            req.apiClient.organizationId,
          requestedOrganizationId,
          integrationId:
            req.apiClient.integrationId
        })
      );
    }
  );

  next();
}
