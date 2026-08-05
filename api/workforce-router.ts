import express, {
  type Response
} from "express";

import {
  authenticateWorkforceRequest,
  authorizeOrganization,
  type AuthenticatedRequest
} from "./auth.js";

import {
  auditOrganizationAccessDenied
} from "./organization-audit.js";

import {
  detectHighRequestVolume
} from "./request-volume-detector.js";

import {
  employees,
  forecastGroups,
  intraDayPerformance
} from "./data.js";

export const workforceRouter =
  express.Router({
    mergeParams: true
  });

workforceRouter.use(
  authenticateWorkforceRequest,
  auditOrganizationAccessDenied,
  authorizeOrganization,
  detectHighRequestVolume
);

workforceRouter.post(
  "/search/employees",
  (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const organizationId =
      req.params.orgId;

    const selector =
      req.body ?? {};

    let results =
      employees.filter(
        employee =>
          employee.organizationId ===
          organizationId
      );

    if (
      Array.isArray(
        selector.employeeIds
      )
    ) {
      results =
        results.filter(
          employee =>
            selector.employeeIds.includes(
              employee.id
            )
        );
    }

    if (
      typeof selector.status ===
      "string"
    ) {
      results =
        results.filter(
          employee =>
            employee.status ===
            selector.status
        );
    }

    const startIndex =
      Math.max(
        Number(
          selector.startIndex ?? 0
        ),
        0
      );

    const pageSize =
      Math.min(
        Math.max(
          Number(
            selector.pageSize ?? 100
          ),
          1
        ),
        100
      );

    const page =
      results.slice(
        startIndex,
        startIndex + pageSize
      );

    res.json({
      kind:
        "EmployeeCollection",
      employees: page,
      totalItems:
        results.length,
      startIndex,
      pageSize
    });
  }
);

workforceRouter.post(
  "/search/forecastGroups",
  (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const organizationId =
      req.params.orgId;

    const selector =
      req.body ?? {};

    let results =
      forecastGroups.filter(
        group =>
          group.organizationId ===
          organizationId
      );

    if (
      Array.isArray(
        selector.forecastGroupIds
      )
    ) {
      results =
        results.filter(
          group =>
            selector
              .forecastGroupIds
              .includes(
                group.id
              )
        );
    }

    res.json({
      kind:
        "ForecastGroupCollection",
      forecastGroups:
        results,
      totalItems:
        results.length
    });
  }
);

workforceRouter.post(
  "/intraDayPerformance/:id",
  (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    const organizationId =
      req.params.orgId;

    const performanceId =
      req.params.id;

    const selector =
      req.body ?? {};

    const performance =
      intraDayPerformance.find(
        item =>
          item.id ===
            performanceId &&
          item.organizationId ===
            organizationId
      );

    if (!performance) {
      res.status(404).json({
        kind:
          "ErrorResponse",
        errorCode:
          "INTRADAY_PERFORMANCE_NOT_FOUND",
        message:
          "No matching intra-day performance record was found."
      });

      return;
    }

    res.json({
      kind:
        "IntraDayPerformanceResponse",
      organizationId,
      id:
        performance.id,
      generatedAt:
        new Date().toISOString(),
      selector,
      performance
    });
  }
);
