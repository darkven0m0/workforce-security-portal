interface EntraConfiguration {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  error?: string;
  error_description?: string;
}

export interface EntraSignInStatus {
  errorCode: number;
  failureReason: string | null;
  additionalDetails: string | null;
}

export interface EntraSignIn {
  id: string;
  createdDateTime: string;
  userDisplayName: string | null;
  userPrincipalName: string | null;
  appDisplayName: string | null;
  ipAddress: string | null;
  clientAppUsed: string | null;
  conditionalAccessStatus: string | null;
  riskLevelDuringSignIn: string | null;
  riskState: string | null;
  status: EntraSignInStatus;
}

interface GraphSignInResponse {
  value?: EntraSignIn[];
  error?: {
    code?: string;
    message?: string;
  };
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

const graphBaseUrl = "https://graph.microsoft.com/v1.0";

let cachedToken: CachedToken | undefined;

export class EntraConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntraConfigurationError";
  }
}

export class EntraGraphError extends Error {
  readonly statusCode: number;
  readonly graphCode?: string;

  constructor(
    message: string,
    statusCode: number,
    graphCode?: string
  ) {
    super(message);
    this.name = "EntraGraphError";
    this.statusCode = statusCode;
    this.graphCode = graphCode;
  }
}

function loadConfiguration(): EntraConfiguration {
  const tenantId = process.env.ENTRA_TENANT_ID?.trim();
  const clientId = process.env.ENTRA_CLIENT_ID?.trim();
  const clientSecret = process.env.ENTRA_CLIENT_SECRET?.trim();

  const missingVariables = [
    ["ENTRA_TENANT_ID", tenantId],
    ["ENTRA_CLIENT_ID", clientId],
    ["ENTRA_CLIENT_SECRET", clientSecret]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new EntraConfigurationError(
      `Missing required Entra configuration: ${missingVariables.join(", ")}`
    );
  }

  return {
    tenantId: tenantId as string,
    clientId: clientId as string,
    clientSecret: clientSecret as string
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function acquireAccessToken(): Promise<string> {
  const now = Date.now();

  if (
    cachedToken &&
    cachedToken.expiresAt > now + 60_000
  ) {
    return cachedToken.value;
  }

  const configuration = loadConfiguration();

  const tokenUrl =
    `https://login.microsoftonline.com/` +
    `${encodeURIComponent(configuration.tenantId)}` +
    `/oauth2/v2.0/token`;

  const requestBody = new URLSearchParams({
    client_id: configuration.clientId,
    client_secret: configuration.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });

  let response: Response;

  try {
    response = await fetchWithTimeout(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: requestBody
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown token request error";

    throw new EntraGraphError(
      `Microsoft Entra token request failed: ${message}`,
      502
    );
  }

  const body =
    (await response.json()) as TokenResponse;

  if (!response.ok || !body.access_token) {
    throw new EntraGraphError(
      body.error_description ??
        body.error ??
        "Microsoft Entra did not return an access token.",
      response.status,
      body.error
    );
  }

  const expiresInSeconds = body.expires_in ?? 3600;

  cachedToken = {
    value: body.access_token,
    expiresAt:
      Date.now() + expiresInSeconds * 1000
  };

  return cachedToken.value;
}

export async function getRecentEntraSignIns(
  limit: number
): Promise<EntraSignIn[]> {
  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    50
  );

  const accessToken = await acquireAccessToken();

  const query = new URLSearchParams({
    "$top": String(safeLimit),
    "$orderby": "createdDateTime desc",
    "$select": [
      "id",
      "createdDateTime",
      "userDisplayName",
      "userPrincipalName",
      "appDisplayName",
      "ipAddress",
      "clientAppUsed",
      "conditionalAccessStatus",
      "riskLevelDuringSignIn",
      "riskState",
      "status"
    ].join(",")
  });

  const url =
    `${graphBaseUrl}/auditLogs/signIns?${query.toString()}`;

  let response: Response;

  try {
    response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Microsoft Graph request error";

    throw new EntraGraphError(
      `Microsoft Graph request failed: ${message}`,
      502
    );
  }

  const body =
    (await response.json()) as GraphSignInResponse;

  if (!response.ok) {
    throw new EntraGraphError(
      body.error?.message ??
        "Microsoft Graph rejected the request.",
      response.status,
      body.error?.code
    );
  }

  return Array.isArray(body.value)
    ? body.value
    : [];
}
