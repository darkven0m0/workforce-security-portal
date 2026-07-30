import { Router } from "express";

import {
  demoApiClients
} from "./auth.js";

import {
  auditEntries,
  securityEvents
} from "./data.js";

export const testRouter = Router();

testRouter.post("/reset", (_req, res) => {
  const acmeClient =
    demoApiClients["acme-demo-api-key"];

  if (acmeClient) {
    acmeClient.status = "active";
  }

  const event = securityEvents.find(
    (securityEvent) =>
      securityEvent.id === "event-1001"
  );

  if (event) {
    event.status = "Open";
  }

  auditEntries.length = 0;

  res.json({
    status: "reset",
    apiKeyStatus: acmeClient?.status,
    securityEventStatus: event?.status,
    auditEntryCount: auditEntries.length
  });
});
