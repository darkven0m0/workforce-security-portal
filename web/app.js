const customerHeaders = {
  Authorization: "Bearer acme-demo-token",
  "x-api-key": "acme-demo-api-key",
  "Content-Type": "application/json"
};

const analystHeaders = {
  Authorization: "Bearer security-analyst-token",
  "x-api-key": "analyst-demo-api-key",
  "Content-Type": "application/json"
};

const sections = {
  apps: document.querySelector("#apps-section"),
  events: document.querySelector("#events-section"),
  audit: document.querySelector("#audit-section")
};

const title = document.querySelector("#page-title");
const scenarioResult =
  document.querySelector("#scenario-result");
const eventsContainer =
  document.querySelector("#events-container");
const auditOutput =
  document.querySelector("#audit-output");
const integrationStatus =
  document.querySelector("#integration-status");

function showSection(name) {
  for (const [sectionName, element] of Object.entries(
    sections
  )) {
    element.classList.toggle(
      "hidden",
      sectionName !== name
    );
  }

  document.querySelectorAll(".nav-item").forEach(
    (button) => {
      button.classList.toggle(
        "active",
        button.dataset.section === name
      );
    }
  );

  const titles = {
    apps: "Apps",
    events: "Security Events",
    audit: "Audit Trail"
  };

  title.textContent = titles[name];

  if (name === "events") {
    loadEvents();
  }

  if (name === "audit") {
    loadAudit();
  }
}

async function runWorkforceRequest(organizationId) {
  try {
    const response = await fetch(
      `/via/v2/organizations/${organizationId}` +
        "/workforce/search/employees",
      {
        method: "POST",
        headers: customerHeaders,
        body: JSON.stringify({
          pageSize: 25
        })
      }
    );

    const body = await response.json();

    scenarioResult.textContent = JSON.stringify(
      {
        status: response.status,
        response: body
      },
      null,
      2
    );
  } catch (error) {
    scenarioResult.textContent = JSON.stringify(
      {
        error: String(error)
      },
      null,
      2
    );
  }
}

async function loadEvents() {
  eventsContainer.innerHTML =
    '<div class="card">Loading events...</div>';

  try {
    const response = await fetch(
      "/security/v1/events",
      {
        headers: analystHeaders
      }
    );

    const body = await response.json();

    if (!response.ok) {
      eventsContainer.innerHTML = `
        <div class="card">
          Failed to load events: ${response.status}
          <pre>${JSON.stringify(body, null, 2)}</pre>
        </div>
      `;
      return;
    }

    const events = body.securityEvents ?? [];

    if (!Array.isArray(events) || events.length === 0) {
      eventsContainer.innerHTML =
        '<div class="card">No security events found.</div>';
      return;
    }

    eventsContainer.innerHTML = events
      .map(
        (event) => `
          <article class="card event-card">
            <div class="section-heading">
              <div>
                <h3>
                  ${event.title ?? "Unusual API Activity"}
                </h3>
                <p>${event.id}</p>
              </div>

              <span class="status-pill ${
                event.status === "Contained"
                  ? "active-status"
                  : "revoked-status"
              }">
                ${event.status}
              </span>
            </div>

            <div class="event-grid">
              <div class="event-field">
                <span>Organization</span>
                <strong>${event.organizationId}</strong>
              </div>

              <div class="event-field">
                <span>Integration</span>
                <strong>${event.integrationId}</strong>
              </div>

              <div class="event-field">
                <span>Source IP</span>
                <strong>${event.sourceIp}</strong>
              </div>

              <div class="event-field">
                <span>Observed Requests</span>
                <strong>${event.requestCount}</strong>
              </div>

              <div class="event-field">
                <span>Expected Requests</span>
                <strong>${event.normalRequestCount}</strong>
              </div>

              <div class="event-field">
                <span>Severity</span>
                <strong>${event.severity}</strong>
              </div>
            </div>

            <div class="event-actions">
              <button
                class="secondary-button"
                onclick="investigateEvent('${event.id}')"
                ${
                  event.status === "Contained"
                    ? "disabled"
                    : ""
                }
              >
                Start Investigation
              </button>

              <button
                class="danger-button"
                onclick="revokeIntegration('${event.id}')"
                ${
                  event.status === "Contained"
                    ? "disabled"
                    : ""
                }
              >
                Revoke API Key
              </button>
            </div>
          </article>
        `
      )
      .join("");
  } catch (error) {
    eventsContainer.innerHTML = `
      <div class="card">
        Unable to load security events.
        <pre>${String(error)}</pre>
      </div>
    `;
  }
}

async function investigateEvent(eventId) {
  const response = await fetch(
    `/security/v1/events/${eventId}/investigate`,
    {
      method: "PATCH",
      headers: analystHeaders
    }
  );

  const body = await response.json();

  scenarioResult.textContent = JSON.stringify(
    {
      action: "investigate",
      status: response.status,
      response: body
    },
    null,
    2
  );

  await loadEvents();
}

async function revokeIntegration(eventId) {
  const response = await fetch(
    `/security/v1/events/${eventId}/revoke-api-key`,
    {
      method: "PATCH",
      headers: analystHeaders
    }
  );

  const body = await response.json();

  scenarioResult.textContent = JSON.stringify(
    {
      action: "revoke-api-key",
      status: response.status,
      response: body
    },
    null,
    2
  );

  if (response.ok) {
    integrationStatus.textContent = "Revoked";
    integrationStatus.classList.remove(
      "active-status"
    );
    integrationStatus.classList.add(
      "revoked-status"
    );
  }

  await loadEvents();
}

async function loadAudit() {
  auditOutput.textContent = "Loading audit entries...";

  try {
    const response = await fetch(
      "/security/v1/audit",
      {
        headers: analystHeaders
      }
    );

    const body = await response.json();

    auditOutput.textContent = JSON.stringify(
      body,
      null,
      2
    );
  } catch (error) {
    auditOutput.textContent = JSON.stringify(
      {
        error: String(error)
      },
      null,
      2
    );
  }
}

document.querySelectorAll(".nav-item").forEach(
  (button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.section);
    });
  }
);

document
  .querySelector("#run-normal-request")
  .addEventListener("click", () => {
    runWorkforceRequest("acme-financial");
  });

document
  .querySelector("#run-suspicious-request")
  .addEventListener("click", () => {
    runWorkforceRequest("northstar-health");
  });

document
  .querySelector("#refresh-events")
  .addEventListener("click", loadEvents);

document
  .querySelector("#refresh-audit")
  .addEventListener("click", loadAudit);

document
  .querySelector("#open-reporting-app")
  .addEventListener("click", () => {
    showSection("events");
  });

window.investigateEvent = investigateEvent;
window.revokeIntegration = revokeIntegration;
