import { expect, test } from "@playwright/test";

const acmeHeaders = {
  Authorization: "Bearer acme-demo-token",
  "x-api-key": "acme-demo-api-key"
};

test("Acme can search its own employees", async ({ request }) => {
  const response = await request.post(
    "/via/v2/organizations/acme-financial/workforce/search/employees",
    {
      headers: acmeHeaders,
      data: {
        status: "Active",
        startIndex: 0,
        pageSize: 25
      }
    }
  );

  expect(response.status()).toBe(200);

  const body = await response.json();

  expect(body.kind).toBe("EmployeeCollection");
  expect(body.totalItems).toBe(2);

  for (const employee of body.employees) {
    expect(employee.organizationId).toBe("acme-financial");
  }
});

test("Acme cannot access Northstar employees", async ({ request }) => {
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

  expect(body.kind).toBe("ErrorResponse");
  expect(body.errorCode).toBe("ORGANIZATION_ACCESS_DENIED");
});

test("request without bearer token is rejected", async ({ request }) => {
  const response = await request.post(
    "/via/v2/organizations/acme-financial/workforce/search/employees",
    {
      headers: {
        "x-api-key": "acme-demo-api-key"
      },
      data: {
        pageSize: 25
      }
    }
  );

  expect(response.status()).toBe(401);

  const body = await response.json();
  expect(body.errorCode).toBe("AUTHORIZATION_REQUIRED");
});

test("request without API key is rejected", async ({ request }) => {
  const response = await request.post(
    "/via/v2/organizations/acme-financial/workforce/search/employees",
    {
      headers: {
        Authorization: "Bearer acme-demo-token"
      },
      data: {
        pageSize: 25
      }
    }
  );

  expect(response.status()).toBe(401);

  const body = await response.json();
  expect(body.errorCode).toBe("API_KEY_REQUIRED");
});

test("Acme can retrieve intra-day performance", async ({ request }) => {
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
            "-300000001"
          ]
        },
        includeOpenHours: false,
        includeProperties: false
      }
    }
  );

  expect(response.status()).toBe(200);

  const body = await response.json();

  expect(body.kind).toBe("IntraDayPerformanceResponse");
  expect(body.organizationId).toBe("acme-financial");
  expect(body.performance.serviceLevel).toBe(91.4);
});

test("analyst can investigate and contain a compromised integration", async ({
  request
}) => {
  const analystHeaders = {
    Authorization: "Bearer security-analyst-token",
    "x-api-key": "analyst-demo-api-key"
  };

  const investigateResponse = await request.patch(
    "/security/v1/events/event-1001/investigate",
    {
      headers: analystHeaders
    }
  );

  expect(investigateResponse.status()).toBe(200);

  const investigateBody = await investigateResponse.json();
  expect(investigateBody.event.status).toBe("Investigating");

  const revokeResponse = await request.patch(
    "/security/v1/events/event-1001/revoke-api-key",
    {
      headers: analystHeaders
    }
  );

  expect(revokeResponse.status()).toBe(200);

  const revokeBody = await revokeResponse.json();
  expect(revokeBody.status).toBe("revoked");
  expect(revokeBody.event.status).toBe("Contained");

  const blockedResponse = await request.post(
    "/via/v2/organizations/acme-financial/workforce/search/employees",
    {
      headers: {
        Authorization: "Bearer acme-demo-token",
        "x-api-key": "acme-demo-api-key"
      },
      data: {
        pageSize: 25
      }
    }
  );

  expect(blockedResponse.status()).toBe(401);

  const blockedBody = await blockedResponse.json();
  expect(blockedBody.errorCode).toBe("API_KEY_REVOKED");

  const auditResponse = await request.get(
    "/security/v1/audit",
    {
      headers: analystHeaders
    }
  );

  expect(auditResponse.status()).toBe(200);

  const auditBody = await auditResponse.json();

  const actions = auditBody.auditEntries.map(
    (entry: { action: string }) => entry.action
  );

  expect(actions).toContain(
    "SECURITY_EVENT_INVESTIGATION_STARTED"
  );

  expect(actions).toContain(
    "API_KEY_REVOKED"
  );
});
