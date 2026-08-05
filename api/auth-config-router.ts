import express from "express";

export const authConfigRouter =
  express.Router();

authConfigRouter.get(
  "/config",
  (_req, res) => {
    const tenantId =
      process.env.ENTRA_TENANT_ID?.trim();

    const spaClientId =
      process.env.ENTRA_SPA_CLIENT_ID?.trim();

    const apiClientId =
      process.env.ENTRA_API_CLIENT_ID?.trim();

    const apiScope =
      process.env.ENTRA_API_SCOPE?.trim();

    const missingVariables = [
      ["ENTRA_TENANT_ID", tenantId],
      ["ENTRA_SPA_CLIENT_ID", spaClientId],
      ["ENTRA_API_CLIENT_ID", apiClientId],
      ["ENTRA_API_SCOPE", apiScope]
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missingVariables.length > 0) {
      res.status(503).json({
        kind: "ErrorResponse",
        errorCode:
          "ENTRA_AUTH_NOT_CONFIGURED",
        message:
          "Interactive Microsoft Entra authentication is not configured.",
        missingVariables
      });

      return;
    }

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.json({
      kind: "EntraAuthConfiguration",
      authMode: "entra",
      tenantId,
      spaClientId,
      apiClientId,
      apiScope,
      authority:
        `https://login.microsoftonline.com/${tenantId}`,
      redirectUri:
        "http://localhost:3000/redirect.html",
      applicationUri:
        "http://localhost:3000"
    });
  }
);
