import {
  expect,
  test
} from "@playwright/test";

test.describe("Workforce Security Portal", () => {
  test.beforeEach(async ({ request }) => {
    const resetResponse = await request.post(
      "/test/reset"
    );

    expect(resetResponse.status()).toBe(200);
  });

  test(
    "analyst can investigate and contain an API incident through the portal",
    async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByRole("heading", {
          name: "Apps",
          exact: true
        })
      ).toBeVisible();

      await expect(
        page.getByText(
          "Fraud Operations Reporting",
          {
            exact: true
          }
        )
      ).toBeVisible();

      await page
        .getByRole("button", {
          name: "Run Normal Request"
        })
        .click();

      await expect(
        page.locator("#scenario-result")
      ).toContainText('"status": 200');

      await page
        .getByRole("button", {
          name: "Generate Suspicious Activity"
        })
        .click();

      await expect(
        page.locator("#scenario-result")
      ).toContainText('"status": 403');

      await page
        .getByRole("button", {
          name: "Security Events"
        })
        .click();

      await expect(
        page.getByText(
          "Unusual API request volume"
        )
      ).toBeVisible();

      await expect(
        page.getByText("event-1001")
      ).toBeVisible();

      await page
        .getByRole("button", {
          name: "Start Investigation"
        })
        .click();

      await expect(
        page.getByText(
          "Investigating",
          {
            exact: true
          }
        )
      ).toBeVisible();

      await page
        .getByRole("button", {
          name: "Revoke API Key"
        })
        .click();

      await expect(
        page.getByText(
          "Contained",
          {
            exact: true
          }
        )
      ).toBeVisible();

      await page
        .getByRole("button", {
          name: "Apps",
          exact: true
        })
        .click();

      await expect(
        page.locator("#integration-status")
      ).toHaveText("Revoked");

      await page
        .getByRole("button", {
          name: "Run Normal Request"
        })
        .click();

      await expect(
        page.locator("#scenario-result")
      ).toContainText('"status": 401');

      await expect(
        page.locator("#scenario-result")
      ).toContainText("API_KEY_REVOKED");

      await page
        .getByRole("button", {
          name: "Audit Trail"
        })
        .click();

      await expect(
        page.locator("#audit-output")
      ).toContainText(
        "SECURITY_EVENT_INVESTIGATION_STARTED"
      );

      await expect(
        page.locator("#audit-output")
      ).toContainText(
        "API_KEY_REVOKED"
      );
    }
  );
});
