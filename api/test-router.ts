import {
  Router
} from "express";

import {
  demoApiClients
} from "./auth.js";

import {
  auditEntries,
  securityEvents
} from "./data.js";

import {
  resetRequestVolumeDetector
} from "./request-volume-detector.js";

export const testRouter =
  Router();

testRouter.post(
  "/reset",
  (_req, res) => {
    const acmeClient =
      demoApiClients[
        "acme-demo-api-key"
      ];

    if (acmeClient) {
      acmeClient.status =
        "active";
    }

    const event =
      securityEvents.find(
        securityEvent =>
          securityEvent.id ===
          "event-1001"
      );

    if (event) {
      event.status =
        "Open";
    }

    for (
      let index =
        securityEvents.length - 1;
      index >= 0;
      index -= 1
    ) {
      if (
        securityEvents[
          index
        ]?.id.startsWith(
          "event-volume-"
        )
      ) {
        securityEvents.splice(
          index,
          1
        );
      }
    }

    auditEntries.length = 0;

    resetRequestVolumeDetector();

    res.json({
      status: "reset",
      apiKeyStatus:
        acmeClient?.status,
      securityEventStatus:
        event?.status,
      auditEntryCount:
        auditEntries.length,
      dynamicEventCount:
        securityEvents.filter(
          securityEvent =>
            securityEvent.id.startsWith(
              "event-volume-"
            )
        ).length
    });
  }
);
