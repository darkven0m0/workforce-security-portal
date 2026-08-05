import type {
  NextFunction,
  Request,
  Response
} from "express";

import {
  createRemoteJWKSet,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload
} from "jose";

export type UserRole =
  | "customer"
  | "analyst"
  | "admin";

export type AuthenticationType =
  | "demo"
  | "entra";

export interface AuthenticatedIdentity {
  subject: string;
  username?: string;
  displayName?: string;
  organizationId: string;
  role: UserRole;
  scopes: string[];
  authenticationType: AuthenticationType;
  tenantId?: string;
  objectId?: string;
}

export interface DemoApiClient {
  organizationId: string;
  integrationId: string;
  status: "active" | "revoked";
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedIdentity;
  apiClient?: DemoApiClient;
  tokenClaims?: JWTPayload;
}

export const demoIdentities: Record<
  string,
  AuthenticatedIdentity
> = {
  "acme-demo-token": {
    subject: "acme-user-001",
    organizationId: "acme-financial",
    role: "customer",
    scopes: ["workforceapi"],
    authenticationType: "demo"
  },

  "northstar-demo-token": {
    subject: "northstar-user-001",
    organizationId: "northstar-health",
    role: "customer",
    scopes: ["workforceapi"],
    authenticationType: "demo"
  },

  "security-analyst-token": {
    subject: "security-analyst-001",
    organizationId: "*",
    role: "analyst",
    scopes: [
      "workforceapi",
      "security:respond"
    ],
    authenticationType: "demo"
  },

  "security-admin-token": {
    subject: "security-admin-001",
    organizationId: "*",
    role: "admin",
    scopes: [
      "workforceapi",
      "security:respond"
    ],
    authenticationType: "demo"
  }
};

export const demoApiClients: Record<
  string,
  DemoApiClient
> = {
  "acme-demo-api-key": {
    organizationId: "acme-financial",
    integrationId:
      "integration-reporting-prod",
    status: "active"
  },

  "northstar-demo-api-key": {
    organizationId: "northstar-health",
    integrationId:
      "integration-employee-sync",
    status: "active"
  },

  "analyst-demo-api-key": {
    organizationId: "*",
    integrationId:
      "security-operations",
    status: "active"
  },

  "admin-demo-api-key": {
    organizationId: "*",
    integrationId:
      "security-administration",
    status: "active"
  }
};

const entraOrganizationMappings: Record<
  string,
  string
> = {
  "acme.user@darkven0m.onmicrosoft.com":
    "acme-financial",

  "northstar.user@darkven0m.onmicrosoft.com":
    "northstar-health"
};

let cachedJwks:
  | ReturnType<typeof createRemoteJWKSet>
  | undefined;

let cachedJwksTenantId:
  | string
  | undefined;

function getBearerToken(
  authorization: string | undefined
): string | undefined {
  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return undefined;
  }

  const token = authorization
    .slice("Bearer ".length)
    .trim();

  return token || undefined;
}

function looksLikeJwt(
  token: string
): boolean {
  return token.split(".").length === 3;
}

function getRequiredEntraConfiguration(): {
  tenantId: string;
  apiClientId: string;
} {
  const tenantId =
    process.env.ENTRA_TENANT_ID?.trim();

  const apiClientId =
    process.env.ENTRA_API_CLIENT_ID?.trim();

  const missingVariables = [
    ["ENTRA_TENANT_ID", tenantId],
    ["ENTRA_API_CLIENT_ID", apiClientId]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required Entra configuration: ${
        missingVariables.join(", ")
      }`
    );
  }

  return {
    tenantId: tenantId as string,
    apiClientId: apiClientId as string
  };
}

function getEntraJwks(
  tenantId: string
): ReturnType<typeof createRemoteJWKSet> {
  if (
    !cachedJwks ||
    cachedJwksTenantId !== tenantId
  ) {
    cachedJwks = createRemoteJWKSet(
      new URL(
        "https://login.microsoftonline.com/" +
        `${tenantId}/discovery/v2.0/keys`
      )
    );

    cachedJwksTenantId = tenantId;
  }

  return cachedJwks;
}

function getStringClaim(
  payload: JWTPayload,
  claimName: string
): string | undefined {
  const value = payload[claimName];

  return typeof value === "string"
    ? value
    : undefined;
}

function getStringArrayClaim(
  payload: JWTPayload,
  claimName: string
): string[] {
  const value = payload[claimName];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function getEntraRole(
  payload: JWTPayload
): UserRole | undefined {
  const roles =
    getStringArrayClaim(
      payload,
      "roles"
    );

  if (roles.includes("Admin")) {
    return "admin";
  }

  if (roles.includes("Analyst")) {
    return "analyst";
  }

  if (roles.includes("User")) {
    return "customer";
  }

  return undefined;
}

function getEntraOrganization(
  role: UserRole,
  username: string | undefined
): string | undefined {
  if (
    role === "analyst" ||
    role === "admin"
  ) {
    return "*";
  }

  if (!username) {
    return undefined;
  }

  return entraOrganizationMappings[
    username.toLowerCase()
  ];
}

async function authenticateEntraToken(
  token: string
): Promise<{
  identity: AuthenticatedIdentity;
  payload: JWTPayload;
}> {
  const {
    tenantId,
    apiClientId
  } = getRequiredEntraConfiguration();

  const acceptedIssuers = [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`
  ];

  const acceptedAudiences = [
    apiClientId,
    `api://${apiClientId}`
  ];

  const verification =
    await jwtVerify(
      token,
      getEntraJwks(tenantId),
      {
        issuer: acceptedIssuers,
        audience: acceptedAudiences
      }
    );

  const payload =
    verification.payload;

  const tokenTenantId =
    getStringClaim(payload, "tid");

  if (tokenTenantId !== tenantId) {
    throw new Error(
      "The access token was issued by an unauthorized tenant."
    );
  }

  const scopes =
    typeof payload.scp === "string"
      ? payload.scp
          .split(" ")
          .filter(Boolean)
      : [];

  if (
    !scopes.includes(
      "access_as_user"
    )
  ) {
    throw new Error(
      "The access_as_user scope is required."
    );
  }

  const role =
    getEntraRole(payload);

  if (!role) {
    throw new Error(
      "The authenticated account does not have a supported application role."
    );
  }

  const username =
    getStringClaim(
      payload,
      "preferred_username"
    ) ??
    getStringClaim(
      payload,
      "upn"
    );

  const organizationId =
    getEntraOrganization(
      role,
      username
    );

  if (!organizationId) {
    throw new Error(
      "The authenticated user is not mapped to a workforce organization."
    );
  }

  const objectId =
    getStringClaim(
      payload,
      "oid"
    );

  const subject =
    username ??
    objectId ??
    payload.sub;

  if (!subject) {
    throw new Error(
      "The access token does not contain a usable subject."
    );
  }

  const normalizedScopes = [
    ...scopes,
    "workforceapi"
  ];

  if (
    role === "analyst" ||
    role === "admin"
  ) {
    normalizedScopes.push(
      "security:respond"
    );
  }

  return {
    identity: {
      subject,
      username,
      displayName:
        getStringClaim(
          payload,
          "name"
        ),
      organizationId,
      role,
      scopes: [
        ...new Set(
          normalizedScopes
        )
      ],
      authenticationType:
        "entra",
      tenantId,
      objectId
    },

    payload
  };
}

function writeAuthenticationFailureLog(
  error: unknown
): void {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  console.warn(
    JSON.stringify({
      timestamp:
        new Date().toISOString(),
      level: "warn",
      event:
        "ENTRA_ACCESS_TOKEN_REJECTED",
      message
    })
  );
}

export async function authenticateWorkforceRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token =
    getBearerToken(
      req.headers.authorization
    );

  const apiKeyHeader =
    req.headers["x-api-key"];

  if (!token) {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode:
        "AUTHORIZATION_REQUIRED",
      message:
        "A bearer token is required."
    });

    return;
  }

  if (
    typeof apiKeyHeader !==
    "string"
  ) {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode: "API_KEY_REQUIRED",
      message:
        "The x-api-key header is required."
    });

    return;
  }

  const apiClient =
    demoApiClients[
      apiKeyHeader
    ];

  if (!apiClient) {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode:
        "INVALID_API_KEY",
      message:
        "The supplied API key is invalid."
    });

    return;
  }

  if (
    apiClient.status ===
    "revoked"
  ) {
    res.status(401).json({
      kind: "ErrorResponse",
      errorCode:
        "API_KEY_REVOKED",
      message:
        "The supplied API key has been revoked."
    });

    return;
  }

  try {
    const demoIdentity =
      demoIdentities[token];

    if (demoIdentity) {
      req.user =
        demoIdentity;

      req.apiClient =
        apiClient;

      next();
      return;
    }

    if (!looksLikeJwt(token)) {
      res.status(401).json({
        kind: "ErrorResponse",
        errorCode:
          "INVALID_CREDENTIALS",
        message:
          "The supplied credentials are invalid."
      });

      return;
    }

    const {
      identity,
      payload
    } =
      await authenticateEntraToken(
        token
      );

    req.user = identity;
    req.apiClient = apiClient;
    req.tokenClaims = payload;

    console.log(
      JSON.stringify({
        timestamp:
          new Date().toISOString(),
        level: "info",
        event:
          "ENTRA_ACCESS_TOKEN_ACCEPTED",
        subject:
          identity.subject,
        username:
          identity.username,
        role:
          identity.role,
        organizationId:
          identity.organizationId,
        tenantId:
          identity.tenantId,
        objectId:
          identity.objectId,
        scopes:
          identity.scopes
      })
    );

    next();
  } catch (error) {
    writeAuthenticationFailureLog(
      error
    );

    const errorCode =
      error instanceof
        joseErrors.JWTExpired
        ? "ACCESS_TOKEN_EXPIRED"
        : "INVALID_ACCESS_TOKEN";

    res.status(401).json({
      kind: "ErrorResponse",
      errorCode,
      message:
        "The Microsoft Entra access token could not be validated."
    });
  }
}

export function authorizeOrganization(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestedOrganizationId =
    req.params.orgId;

  const hasGlobalAccess =
    req.user?.role ===
      "analyst" ||
    req.user?.role ===
      "admin";

  const userCanAccess =
    hasGlobalAccess ||
    req.user?.organizationId ===
      requestedOrganizationId;

  const apiClientCanAccess =
    hasGlobalAccess ||
    req.apiClient
      ?.organizationId ===
      requestedOrganizationId;

  if (
    !userCanAccess ||
    !apiClientCanAccess
  ) {
    res.status(403).json({
      kind: "ErrorResponse",
      errorCode:
        "ORGANIZATION_ACCESS_DENIED",
      message:
        "The credentials cannot access this organization."
    });

    return;
  }

  next();
}
