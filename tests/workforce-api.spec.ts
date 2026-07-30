import {
  expect,
  test
} from "@playwright/test";

const acmeHeaders = {
  Authorization: "Bearer acme-demo-token",
  "x-api-key": "acme-demo-api-key",
  "Content-Type": "application/json"
};

const analystHeaders = {
  Authorization: "Bearer security-analyst-token",
  "x-api-key": "analyst-demo-api-key",
  "Content-Type": "application/json"
};

test.beforeEach(async ({ request }) => {
  const resetResponse = await request.post(
    "/test/reset"
  );

  expect(resetResponse.status()).toBe(200);

  const resetBody = await resetResponse.json();

  expect(resetBody).toMatchObject({
    status: "reset",
    apiKeyStatus: "active",
    securityEventStatus: "Open",
    auditEntryCount: 0
  });
});

test(
  "Acme can search its own employees",
  async ({ request }) => {
    const response = await request.post(
      "/via/v2/organizations/acme-financial/workforce/search/employees",
      {
        headers: acmeHeaders,
        data: {
          pageSize: 25
        }
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.kind).toBe("EmployeeCollection");
    expect(body.totalItems).toBe(2);
    expect(body.employees).toHaveLength(2);

    expect(
      body.employees.every(
        (employee: {
          organizationId: string;
        }) =>
          employee.organizationId ===
          "acme-financial"
      )
    ).toBe(true);
  }
);

test(
  "Acme cannot access Northstar employees",
  async ({ request }) => {
    const response = await request.post(
      "/via/v2/organizations/northstar-health/workforce/search/employees",
      {
        headers: acmeHeaders,
        data: {
          pageSize: 25
        }
      }
    );

    expect(response.status()).toBe(403);

    const body = await response.json();

    expect(body).toMatchObject({
      kind: "ErrorResponse",
      errorCode: "ORGANIZATION_ACCESS_DENIED"
    });
  }
);

test(
  "request without bearer token is rejected",
  async ({ request }) => {
    const response = await request.post(
      "/via/v2/organizations/acme-financial/workforce/search/employees",
      {
        headers: {
          "x-api-key": "acme-demo-api-key",
          "Content-Type": "application/json"
        },
        data: {
          pageSize: 25
        }
      }
    );

    expect(response.status()).toBe(401);

    const body = await response.json();

    expect(body.kind).toBe("ErrorResponse");
    expect(body.errorCode).toBe(
      "AUTHORIZATION_REQUIRED"
    );
  }
);

test(
  "request without API key is rejected",
  async ({ request }) => {
    const response = await request.post(
      "/via/v2/organizations/acme-financial/workforce/search/employees",
      {
        headers: {
          Authorization:
            "Bearer acme-demo-token",
          "Content-Type": "application/json"
        },
        data: {
          pageSize: 25
        }
      }
    );

    expect(response.status()).toBe(401);

    const body = await response.json();

    expect(body.kind).toBe("ErrorResponse");
    expect(body.errorCode).toBe(
      "API_KEY_REQUIRED"
    );
  }
);

test(
  "Acme can retrieve intra-day performance",
  async ({ request }) => {
    const response = await request.post(
      "/via/v2/organizations/acme-financial/workforce/intraDayPerformance/idp-1001",
      {
        headers: acmeHeaders,
        data: {
          includeConsolidationColumns: {
            columnIdentifiers: [
              "RVSFORVOL",
              "ORGFORVOL"
            ],
            forecastGroupIds: [
              "-9994561656",
              "-9994561254"
            ]
          }
        }
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.kind).toBe(
      "IntraDayPerformanceResponse"
    );

    expect(body.id).toBe("idp-1001");
    expect(body.organizationId).toBe(
      "acme-financial"
    );
  }
);

test(
  "analyst can investigate and contain a compromised integration",
  async ({ request }) => {
    const eventsResponse = await request.get(
      "/security/v1/events",
      {
        headers: analystHeaders
      }
    );

    expect(eventsResponse.status()).toBe(200);

    const eventsBody =
      await eventsResponse.json();

    expect(eventsBody.kind).toBe(
      "SecurityEventCollection"
    );

    expect(
      eventsBody.securityEvents
    ).toHaveLength(1);

    expect(
      eventsBody.securityEvents[0]
    ).toMatchObject({
      id: "event-1001",
      organizationId: "acme-financial",
      integrationId:
        "integration-reporting-prod",
      status: "Open"
    });

    const investigateResponse =
      await request.patch(
        "/security/v1/events/event-1001/investigate",
        {
          headers: analystHeaders
        }
      );

    expect(
      investigateResponse.status()
    ).toBe(200);

    const investigateBody =
      await investigateResponse.json();

    expect(
      investigateBody.event.status
    ).toBe("Investigating");

    const revokeResponse =
      await request.patch(
        "/security/v1/events/event-1001/revoke-api-key",
        {
          headers: analystHeaders
        }
      );

    expect(
      revokeResponse.status()
    ).toBe(200);

    const revokeBody =
      await revokeResponse.json();

    expect(
      revokeBody.event.status
    ).toBe("Contained");

    const blockedResponse =
      await request.post(
        "/via/v2/organizations/acme-financial/workforce/search/employees",
        {
          headers: acmeHeaders,
          data: {
            pageSize: 25
          }
        }
      );

    expect(
      blockedResponse.status()
    ).toBe(401);

    const blockedBody =
      await blockedResponse.json();

    expect(blockedBody).toMatchObject({
      kind: "ErrorResponse",
      errorCode: "API_KEY_REVOKED"
    });

    const auditResponse =
      await request.get(
        "/security/v1/audit",
        {
          headers: analystHeaders
        }
      );

    expect(
      auditResponse.status()
    ).toBe(200);

    const auditBody =
      await auditResponse.json();

    expect(auditBody.kind).toBe(
      "AuditEntryCollection"
    );

    expect(auditBody.totalItems).toBe(2);

    expect(
      auditBody.auditEntries.map(
        (entry: {
          action: string;
        }) => entry.action
      )
    ).toEqual([
      "SECURITY_EVENT_INVESTIGATION_STARTED",
      "API_KEY_REVOKED"
    ]);
  }
);
