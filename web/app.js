const demoIdentities = {
  acme: {
    label: "Acme Financial",
    organizationId: "acme-financial",
    token: "acme-demo-token",
    apiKey: "acme-demo-api-key",
    role: "customer"
  },

  northstar: {
    label: "Northstar Health",
    organizationId: "northstar-health",
    token: "northstar-demo-token",
    apiKey: "northstar-demo-api-key",
    role: "customer"
  },

  analyst: {
    label: "Security Analyst",
    organizationId: "*",
    token: "security-analyst-token",
    apiKey: "analyst-demo-api-key",
    role: "analyst"
  }
};

let selectedIdentity =
  demoIdentities.acme;

function getSelectedHeaders() {
  return {
    Authorization:
      `Bearer ${selectedIdentity.token}`,
    "x-api-key":
      selectedIdentity.apiKey,
    "Content-Type":
      "application/json"
  };
}

function getEntraAuthentication() {
  const authentication =
    window.workforceEntraAuth;

  if (
    !authentication?.accessToken ||
    !authentication?.tokenClaims
  ) {
    throw new Error(
      "Sign in with Microsoft before accessing security operations."
    );
  }

  return authentication;
}

function getEntraRoles() {
  const authentication =
    window.workforceEntraAuth;

  const roles =
    authentication?.tokenClaims?.roles;

  return Array.isArray(roles)
    ? roles
    : [];
}

function hasEntraRole(role) {
  return getEntraRoles().includes(role);
}

function getSecurityHeaders() {
  const authentication =
    getEntraAuthentication();

  return {
    Authorization:
      `Bearer ${authentication.accessToken}`,
    "x-api-key":
      "analyst-demo-api-key",
    "Content-Type":
      "application/json"
  };
}

function getEntraIdentitySummary() {
  const authentication =
    window.workforceEntraAuth;

  if (!authentication) {
    return {
      signedIn: false,
      name: null,
      username: null,
      roles: []
    };
  }

  const claims =
    authentication.tokenClaims ?? {};

  return {
    signedIn: true,

    name:
      claims.name ??
      authentication.account?.name ??
      null,

    username:
      claims.preferred_username ??
      authentication.account?.username ??
      null,

    roles:
      Array.isArray(claims.roles)
        ? claims.roles
        : []
  };
}

const sections = {
  apps:
    document.querySelector(
      "#apps-section"
    ),

  events:
    document.querySelector(
      "#events-section"
    ),

  identity:
    document.querySelector(
      "#identity-section"
    ),

  audit:
    document.querySelector(
      "#audit-section"
    )
};

const title =
  document.querySelector(
    "#page-title"
  );

const scenarioResult =
  document.querySelector(
    "#scenario-result"
  );

const eventsContainer =
  document.querySelector(
    "#events-container"
  );

const auditOutput =
  document.querySelector(
    "#audit-output"
  );

const integrationStatus =
  document.querySelector(
    "#integration-status"
  );

const identitySelect =
  document.querySelector(
    "#identity-select"
  );

const currentIdentityLabel =
  document.querySelector(
    "#current-identity-label"
  );

const currentIdentityDetails =
  document.querySelector(
    "#current-identity-details"
  );

const appsDescription =
  document.querySelector(
    "#apps-description"
  );

const identityContainer =
  document.querySelector(
    "#identity-container"
  );

const identityTotal =
  document.querySelector(
    "#identity-total"
  );

const identitySuccessful =
  document.querySelector(
    "#identity-successful"
  );

const identityFailed =
  document.querySelector(
    "#identity-failed"
  );

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateIdentityDisplay() {
  currentIdentityLabel.textContent =
    selectedIdentity.label;

  const roleLabel =
    selectedIdentity.role ===
      "analyst"
      ? "Analyst"
      : "Customer";

  currentIdentityDetails.textContent =
    `${roleLabel} · ${
      selectedIdentity.organizationId
    }`;

  if (
    selectedIdentity.role ===
    "analyst"
  ) {
    appsDescription.textContent =
      "Security analyst access across the demo workforce environment.";
  } else {
    appsDescription.textContent =
      `Applications connected to ${
        selectedIdentity.label
      }'s workforce environment.`;
  }
}

function showSection(name) {
  for (
    const [
      sectionName,
      element
    ] of Object.entries(sections)
  ) {
    element.classList.toggle(
      "hidden",
      sectionName !== name
    );
  }

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.section ===
          name
      );
    });

  const titles = {
    apps: "Apps",
    events: "Security Events",
    identity: "Identity Activity",
    audit: "Audit Trail"
  };

  title.textContent =
    titles[name] ??
    "Workforce Security";

  if (name === "events") {
    loadEvents();
  }

  if (name === "identity") {
    loadIdentityActivity();
  }

  if (name === "audit") {
    loadAudit();
  }
}

async function runWorkforceRequest(
  organizationId
) {
  try {
    const response =
      await fetch(
        `/via/v2/organizations/${
          organizationId
        }/workforce/search/employees`,
        {
          method: "POST",
          headers:
            getSelectedHeaders(),
          body:
            JSON.stringify({
              pageSize: 25
            })
        }
      );

    const body =
      await response.json();

    scenarioResult.textContent =
      JSON.stringify(
        {
          authenticationMode:
            "Demo tenant identity",

          signedInAs:
            selectedIdentity.label,

          authenticatedOrganization:
            selectedIdentity
              .organizationId,

          role:
            selectedIdentity.role,

          requestedOrganization:
            organizationId,

          status:
            response.status,

          response:
            body
        },
        null,
        2
      );
  } catch (error) {
    scenarioResult.textContent =
      JSON.stringify(
        {
          signedInAs:
            selectedIdentity.label,

          requestedOrganization:
            organizationId,

          error:
            String(error)
        },
        null,
        2
      );
  }
}

async function runSuspiciousRequest() {
  selectedIdentity =
    demoIdentities.acme;

  identitySelect.value =
    "acme";

  updateIdentityDisplay();

  await runWorkforceRequest(
    "northstar-health"
  );
}

function renderAuthenticationRequired(
  container,
  operation
) {
  container.innerHTML = `
    <div class="card identity-error-card">
      <h3>Microsoft sign-in required</h3>

      <p>
        Sign in with Microsoft before accessing
        ${escapeHtml(operation)}.
      </p>

      <pre>${escapeHtml(
        JSON.stringify(
          {
            errorCode:
              "ENTRA_AUTHENTICATION_REQUIRED",
            message:
              "Use the Microsoft Entra Authentication card on the Apps page."
          },
          null,
          2
        )
      )}</pre>
    </div>
  `;
}

async function loadEvents() {
  eventsContainer.innerHTML =
    '<div class="card">Loading events...</div>';

  let headers;

  try {
    headers =
      getSecurityHeaders();
  } catch {
    renderAuthenticationRequired(
      eventsContainer,
      "security events"
    );

    return;
  }

  try {
    const response =
      await fetch(
        "/security/v1/events",
        {
          headers
        }
      );

    const body =
      await response.json();

    if (!response.ok) {
      eventsContainer.innerHTML = `
        <div class="card identity-error-card">
          <h3>Unable to load security events</h3>

          <p>
            The security API returned
            HTTP ${response.status}.
          </p>

          <pre>${escapeHtml(
            JSON.stringify(
              body,
              null,
              2
            )
          )}</pre>
        </div>
      `;

      return;
    }

    const events =
      body.securityEvents ?? [];

    if (
      !Array.isArray(events) ||
      events.length === 0
    ) {
      eventsContainer.innerHTML =
        '<div class="card">No security events found.</div>';

      return;
    }

    const canRevoke =
      hasEntraRole("Admin");

    const identity =
      getEntraIdentitySummary();

    eventsContainer.innerHTML =
      events
        .map(
          event => `
            <article class="card event-card">
              <div class="section-heading">
                <div>
                  <h3>
                    ${escapeHtml(
                      event.title ??
                      "Unusual API Activity"
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      event.id
                    )}
                  </p>
                </div>

                <span class="status-pill ${
                  event.status ===
                    "Contained"
                    ? "active-status"
                    : "revoked-status"
                }">
                  ${escapeHtml(
                    event.status
                  )}
                </span>
              </div>

              <div class="event-grid">
                <div class="event-field">
                  <span>Organization</span>

                  <strong>
                    ${escapeHtml(
                      event.organizationId
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>Integration</span>

                  <strong>
                    ${escapeHtml(
                      event.integrationId
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>Source IP</span>

                  <strong>
                    ${escapeHtml(
                      event.sourceIp
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>
                    Observed Requests
                  </span>

                  <strong>
                    ${escapeHtml(
                      event.requestCount
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>
                    Expected Requests
                  </span>

                  <strong>
                    ${escapeHtml(
                      event.normalRequestCount
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>Severity</span>

                  <strong>
                    ${escapeHtml(
                      event.severity
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>
                    Authenticated analyst
                  </span>

                  <strong>
                    ${escapeHtml(
                      identity.username ??
                      identity.name ??
                      "Unknown"
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>Entra roles</span>

                  <strong>
                    ${escapeHtml(
                      identity.roles.join(
                        ", "
                      ) || "None"
                    )}
                  </strong>
                </div>
              </div>

              <div class="event-actions">
                <button
                  class="secondary-button"
                  onclick="investigateEvent('${
                    escapeHtml(event.id)
                  }')"
                  ${
                    event.status ===
                      "Contained"
                      ? "disabled"
                      : ""
                  }
                >
                  Start Investigation
                </button>

                <button
                  class="danger-button"
                  onclick="revokeIntegration('${
                    escapeHtml(event.id)
                  }')"
                  ${
                    event.status ===
                      "Contained" ||
                    !canRevoke
                      ? "disabled"
                      : ""
                  }
                  title="${
                    canRevoke
                      ? "Revoke the affected API key"
                      : "The Admin role is required"
                  }"
                >
                  ${
                    canRevoke
                      ? "Revoke API Key"
                      : "Admin Required"
                  }
                </button>
              </div>
            </article>
          `
        )
        .join("");
  } catch (error) {
    eventsContainer.innerHTML = `
      <div class="card identity-error-card">
        <h3>Unable to load security events</h3>

        <pre>${escapeHtml(
          String(error)
        )}</pre>
      </div>
    `;
  }
}

async function investigateEvent(
  eventId
) {
  let headers;

  try {
    headers =
      getSecurityHeaders();
  } catch (error) {
    scenarioResult.textContent =
      JSON.stringify(
        {
          action:
            "investigate",

          status:
            "blocked",

          error:
            String(error)
        },
        null,
        2
      );

    return;
  }

  const response =
    await fetch(
      `/security/v1/events/${
        eventId
      }/investigate`,
      {
        method: "PATCH",
        headers
      }
    );

  const body =
    await response.json();

  const identity =
    getEntraIdentitySummary();

  scenarioResult.textContent =
    JSON.stringify(
      {
        action:
          "investigate",

        authenticationMode:
          "Microsoft Entra",

        signedInAs:
          identity.username ??
          identity.name,

        roles:
          identity.roles,

        status:
          response.status,

        response:
          body
      },
      null,
      2
    );

  await loadEvents();
}

async function revokeIntegration(
  eventId
) {
  let headers;

  try {
    headers =
      getSecurityHeaders();
  } catch (error) {
    scenarioResult.textContent =
      JSON.stringify(
        {
          action:
            "revoke-api-key",

          status:
            "blocked",

          error:
            String(error)
        },
        null,
        2
      );

    return;
  }

  const response =
    await fetch(
      `/security/v1/events/${
        eventId
      }/revoke-api-key`,
      {
        method: "PATCH",
        headers
      }
    );

  const body =
    await response.json();

  const identity =
    getEntraIdentitySummary();

  scenarioResult.textContent =
    JSON.stringify(
      {
        action:
          "revoke-api-key",

        authenticationMode:
          "Microsoft Entra",

        signedInAs:
          identity.username ??
          identity.name,

        roles:
          identity.roles,

        status:
          response.status,

        response:
          body
      },
      null,
      2
    );

  if (response.ok) {
    integrationStatus.textContent =
      "Revoked";

    integrationStatus.classList.remove(
      "active-status"
    );

    integrationStatus.classList.add(
      "revoked-status"
    );
  }

  await loadEvents();
}

function maskUserPrincipalName(
  value
) {
  if (
    !value ||
    !value.includes("@")
  ) {
    return "Unknown user";
  }

  const [
    localPart,
    domain
  ] = value.split("@");

  const firstCharacter =
    localPart.slice(0, 1);

  return `${firstCharacter}***@${domain}`;
}

function maskIpAddress(value) {
  if (!value) {
    return "Unknown";
  }

  if (value.includes(":")) {
    return `${
      value
        .split(":")
        .slice(0, 3)
        .join(":")
    }::`;
  }

  const octets =
    value.split(".");

  if (octets.length !== 4) {
    return "Unknown";
  }

  return `${
    octets[0]
  }.${octets[1]}.x.x`;
}

function formatIdentityTime(
  value
) {
  if (!value) {
    return "Unknown";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed.toLocaleString();
}

async function loadIdentityActivity() {
  identityContainer.innerHTML =
    '<div class="card">Loading Microsoft Entra sign-ins...</div>';

  identityTotal.textContent =
    "—";

  identitySuccessful.textContent =
    "—";

  identityFailed.textContent =
    "—";

  let headers;

  try {
    headers =
      getSecurityHeaders();
  } catch {
    renderAuthenticationRequired(
      identityContainer,
      "identity activity"
    );

    return;
  }

  try {
    const response =
      await fetch(
        "/security/v1/identity/sign-ins?limit=10",
        {
          headers
        }
      );

    const body =
      await response.json();

    if (!response.ok) {
      identityContainer.innerHTML = `
        <div class="card identity-error-card">
          <h3>
            Unable to retrieve identity activity
          </h3>

          <p>
            The Microsoft Entra integration returned
            HTTP ${response.status}.
          </p>

          <pre>${escapeHtml(
            JSON.stringify(
              body,
              null,
              2
            )
          )}</pre>
        </div>
      `;

      return;
    }

    const signIns =
      Array.isArray(body.signIns)
        ? body.signIns
        : [];

    const failedSignIns =
      signIns.filter(
        signIn =>
          signIn.status
            ?.errorCode !== 0
      );

    const successfulSignIns =
      signIns.length -
      failedSignIns.length;

    identityTotal.textContent =
      String(signIns.length);

    identitySuccessful.textContent =
      String(
        successfulSignIns
      );

    identityFailed.textContent =
      String(
        failedSignIns.length
      );

    if (
      signIns.length === 0
    ) {
      identityContainer.innerHTML =
        '<div class="card">No Entra sign-ins found.</div>';

      return;
    }

    identityContainer.innerHTML =
      signIns
        .map(signIn => {
          const failed =
            signIn.status
              ?.errorCode !== 0;

          const resultClass =
            failed
              ? "identity-result-failure"
              : "identity-result-success";

          const resultText =
            failed
              ? "Failed"
              : "Successful";

          const errorDetails =
            failed
              ? `
                <div class="identity-error-details">
                  <strong>
                    Error ${escapeHtml(
                      signIn.status
                        ?.errorCode
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      signIn.status
                        ?.failureReason ??
                      "Authentication failed."
                    )}
                  </span>
                </div>
              `
              : "";

          return `
            <article class="card identity-card ${
              failed
                ? "identity-card-failed"
                : ""
            }">
              <div class="identity-card-header">
                <div>
                  <h3>
                    ${escapeHtml(
                      signIn
                        .appDisplayName ??
                      "Unknown application"
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      formatIdentityTime(
                        signIn
                          .createdDateTime
                      )
                    )}
                  </p>
                </div>

                <span class="identity-result ${
                  resultClass
                }">
                  ${resultText}
                </span>
              </div>

              <div class="identity-grid">
                <div class="event-field">
                  <span>User</span>

                  <strong>
                    ${escapeHtml(
                      maskUserPrincipalName(
                        signIn
                          .userPrincipalName
                      )
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>
                    Source IP
                  </span>

                  <strong>
                    ${escapeHtml(
                      maskIpAddress(
                        signIn
                          .ipAddress
                      )
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>Client</span>

                  <strong>
                    ${escapeHtml(
                      signIn
                        .clientAppUsed ??
                      "Unknown"
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>
                    Conditional Access
                  </span>

                  <strong>
                    ${escapeHtml(
                      signIn
                        .conditionalAccessStatus ??
                      "Unknown"
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>
                    Risk Level
                  </span>

                  <strong>
                    ${escapeHtml(
                      signIn
                        .riskLevelDuringSignIn ??
                      "Unknown"
                    )}
                  </strong>
                </div>

                <div class="event-field">
                  <span>
                    Risk State
                  </span>

                  <strong>
                    ${escapeHtml(
                      signIn
                        .riskState ??
                      "Unknown"
                    )}
                  </strong>
                </div>
              </div>

              ${errorDetails}
            </article>
          `;
        })
        .join("");
  } catch (error) {
    identityContainer.innerHTML = `
      <div class="card identity-error-card">
        <h3>
          Unable to load identity activity
        </h3>

        <pre>${escapeHtml(
          String(error)
        )}</pre>
      </div>
    `;
  }
}

async function loadAudit() {
  auditOutput.textContent =
    "Loading audit entries...";

  let headers;

  try {
    headers =
      getSecurityHeaders();
  } catch (error) {
    auditOutput.textContent =
      JSON.stringify(
        {
          errorCode:
            "ENTRA_AUTHENTICATION_REQUIRED",

          message:
            String(error)
        },
        null,
        2
      );

    return;
  }

  try {
    const response =
      await fetch(
        "/security/v1/audit",
        {
          headers
        }
      );

    const body =
      await response.json();

    auditOutput.textContent =
      JSON.stringify(
        {
          authenticatedIdentity:
            getEntraIdentitySummary(),

          status:
            response.status,

          response:
            body
        },
        null,
        2
      );
  } catch (error) {
    auditOutput.textContent =
      JSON.stringify(
        {
          error:
            String(error)
        },
        null,
        2
      );
  }
}

document
  .querySelectorAll(
    ".nav-item"
  )
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        showSection(
          button.dataset.section
        );
      }
    );
  });

identitySelect.addEventListener(
  "change",
  () => {
    selectedIdentity =
      demoIdentities[
        identitySelect.value
      ] ??
      demoIdentities.acme;

    updateIdentityDisplay();

    scenarioResult.textContent =
      JSON.stringify(
        {
          event:
            "DEMO_IDENTITY_CHANGED",

          signedInAs:
            selectedIdentity.label,

          organizationId:
            selectedIdentity
              .organizationId,

          role:
            selectedIdentity.role
        },
        null,
        2
      );
  }
);

document
  .querySelector(
    "#run-own-tenant-request"
  )
  .addEventListener(
    "click",
    () => {
      if (
        selectedIdentity.role ===
        "analyst"
      ) {
        scenarioResult.textContent =
          JSON.stringify(
            {
              signedInAs:
                selectedIdentity.label,

              role:
                selectedIdentity.role,

              message:
                "Select Acme Financial or Northstar Health to demonstrate a customer tenant request."
            },
            null,
            2
          );

        return;
      }

      runWorkforceRequest(
        selectedIdentity
          .organizationId
      );
    }
  );

document
  .querySelector(
    "#run-acme-request"
  )
  .addEventListener(
    "click",
    () => {
      runWorkforceRequest(
        "acme-financial"
      );
    }
  );

document
  .querySelector(
    "#run-northstar-request"
  )
  .addEventListener(
    "click",
    () => {
      runWorkforceRequest(
        "northstar-health"
      );
    }
  );

document
  .querySelector(
    "#run-suspicious-request"
  )
  .addEventListener(
    "click",
    runSuspiciousRequest
  );

document
  .querySelector(
    "#refresh-events"
  )
  .addEventListener(
    "click",
    loadEvents
  );

document
  .querySelector(
    "#refresh-identity"
  )
  .addEventListener(
    "click",
    loadIdentityActivity
  );

document
  .querySelector(
    "#refresh-audit"
  )
  .addEventListener(
    "click",
    loadAudit
  );

document
  .querySelector(
    "#open-reporting-app"
  )
  .addEventListener(
    "click",
    () => {
      showSection("events");
    }
  );

window.investigateEvent =
  investigateEvent;

window.revokeIntegration =
  revokeIntegration;

updateIdentityDisplay();
