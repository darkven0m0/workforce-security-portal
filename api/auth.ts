import type {
  NextFunction,
  Request,
  Response
} from "express";

export type UserRole = "customer" | "analyst";

export interface DemoIdentity {
  subject: string;
  organizationId: string;
  role: UserRole;
  scopes: string[];
}

export interface DemoApiClient {
  organizationId: string;
  integrationId: string;
  status: "active" | "revoked";
}

export interface AuthenticatedRequest extends Request {
  user?: DemoIdentity;
  apiClient?: DemoApiClient;
}

export const demoIdentities: Record<string, DemoIdentity> = {
  "acme-demo-token": {
    subject: "acme-user-001",
    organizationId: "acme-financial",
    role: "customer",
    scopes: ["workforceapi"]
  },

  "northstar-demo-token": {
    subject: "northstar-user-001",
    organizationId: "northstar-health",
    role: "customer",
    scopes: ["workforceapi"]
  },

  "security-analyst-token": {
    subject: "security-analyst-001",
    organizationId: "*",
    role: "analyst",
    scopes: [
      "workforceapi",
      "security:respond"
    ]
  }
};

export const demoApiClients: Record<string, DemoApiClient> = {
  "acme-demo-api-key": {
    organizationId: "acme-financial",
    integrationId: "integration-reporting-prod",
    status: "active"
  },

  "northstar-demo-api-key": {
    organizationId: "northstar-health",
    integrationId: "integration-employee-sync",
    status: "active"
  },

  "analyst-demo-api-key": {
    organizationId: "*",
    integrationId: "security-operations",
    status: "active"
  }
};

export function authenticateWorkforceRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;
  const apiKeyHeader = req.headers["x-api-key"];

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode: "AUTHORIZATION_REQUIRED",
      message: "A bearer token is required."
    });
    return;
  }

  if (typeof apiKeyHeader !== "string") {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode: "API_KEY_REQUIRED",
      message: "The x-api-key header is required."
    });
    return;
  }

  const token = authorization.slice("Bearer ".length);
  const identity = demoIdentities[token];
  const apiClient = demoApiClients[apiKeyHeader];

  if (!identity || !apiClient) {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode: "INVALID_CREDENTIALS",
      message: "The supplied credentials are invalid."
    });
    return;
  }

  if (apiClient.status === "revoked") {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode: "API_KEY_REVOKED",
      message: "The supplied API key has been revoked."
    });
    return;
  }

  if (!identity.scopes.includes("workforceapi")) {
    res.status(403).json({
      kind: "ErrorResponse",
      errorCode: "INSUFFICIENT_SCOPE",
      message: "The workforceapi scope is required."
    });
    return;
  }

  req.user = identity;
  req.apiClient = apiClient;

  next();
}

export function authorizeOrganization(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestedOrganizationId = req.params.orgId;

  const userCanAccess =
    req.user?.role === "analyst" ||
    req.user?.organizationId === requestedOrganizationId;

  const apiClientCanAccess =
    req.user?.role === "analyst" ||
    req.apiClient?.organizationId === requestedOrganizationId;

  if (!userCanAccess || !apiClientCanAccess) {
    res.status(403).json({
      kind: "ErrorResponse",
      errorCode: "ORGANIZATION_ACCESS_DENIED",
      message: "The credentials cannot access this organization."
    });
    return;
  }

  next();
}
