# Workforce Security Portal

A Kubernetes-based security engineering lab built around a representative
multi-tenant Workforce API.

The project demonstrates how identity, authorization, Kubernetes policy,
automated security testing, runtime observability, alerting, investigation,
and containment can be connected into one security operations workflow.

## What this project demonstrates

The Workforce API acts as the protected application workload. Security
controls are implemented around it to demonstrate:

- Microsoft Entra ID authentication
- Bearer-token and API-key validation
- Organization-level tenant isolation
- Analyst and administrator role separation
- Kubernetes deployment with MicroK8s
- Admission policy enforcement with Kyverno
- Prometheus application metrics
- Structured application logging
- Log collection with Grafana Alloy
- Centralized log storage with Loki
- Dashboards and alerting with Grafana
- Discord firing and resolved notifications
- Playwright security regression tests
- Security-event investigation
- Administrator-only API-key revocation
- Audit logging
- A hosted incident-response runbook

## Security lifecycle

The project demonstrates the following end-to-end workflow:

    Authenticate
        ↓
    Authorize organization access
        ↓
    Process Workforce API request
        ↓
    Generate metrics, logs, audit records, and security events
        ↓
    Detect abnormal activity
        ↓
    Notify the security team
        ↓
    Investigate
        ↓
    Contain
        ↓
    Verify recovery

## Architecture

The architecture follows a prevention, detection, and response model.

### Identity and access

Microsoft Entra ID authenticates interactive users. The application then
performs authorization based on the user's role, organization membership,
and the calling integration's API key.

Authentication proves who the caller is. Application authorization determines
which organization and security actions that identity may access.

### Application workload

The Workforce API is a representative multi-tenant application containing:

- Employee search
- Forecast-group search
- Intraday workforce performance data
- Security events
- Audit records
- Investigation actions
- API-key containment

Organization-level authorization prevents one customer from requesting
another customer's workforce records.

### Kubernetes platform

The application is containerized and deployed to MicroK8s.

Kubernetes provides:

- Deployments and Pods
- Service discovery
- Namespaces
- Health probes
- Resource requests and limits
- Workload metadata
- Policy enforcement integration

Kyverno applies preventive admission controls before workloads are accepted
into the cluster.

### Metrics pipeline

The application exposes Prometheus-formatted telemetry through `/metrics`.

    Workforce API
        ↓
    /metrics
        ↓
    Prometheus Kubernetes discovery
        ↓
    Prometheus time-series storage
        ↓
    Grafana dashboards and alert rules

Prometheus answers questions such as how many requests occurred, how often
they occurred, and whether request volume exceeded the expected threshold.

### Logging pipeline

The application writes structured JSON logs to standard output.

    Workforce API container logs
        ↓
    Kubernetes node log files
        ↓
    Grafana Alloy
        ↓
    Loki
        ↓
    Grafana log exploration

Alloy collects and enriches Kubernetes logs. Loki stores and queries them.
Grafana provides the common interface for both metrics and logs.

Prometheus answers “how much and how often,” while Loki helps explain
“what exactly happened.”

### Detection and response

Playwright generates controlled security scenarios, including:

- Cross-organization access attempts
- Missing bearer tokens
- Missing API keys
- Analyst investigation
- Administrator containment
- High request-volume behavior

The high-volume scenario increases an application request counter, creates a
security event, emits a structured log, and causes the Grafana alert rule to
fire.

Grafana sends a Discord notification containing a link to the hosted runbook.
The analyst investigates the event, and an administrator can revoke the
affected API key.

## Security controls

### Preventive controls

- Microsoft Entra ID authentication
- Bearer-token validation
- API-key validation
- Organization-level authorization
- Least-privilege role separation
- Kyverno admission policies
- Non-root container execution
- Kubernetes health probes
- Resource requests and limits

### Detective controls

- Structured JSON logging
- Prometheus request metrics
- Grafana dashboards
- Grafana alert rules
- Loki log queries
- Cross-organization access audit records
- High-volume security events
- Playwright security regression tests

### Responsive controls

- Analyst investigation workflow
- Administrator-only API-key revocation
- Discord alert notifications
- Hosted incident-response runbook
- Audit records for response actions
- Firing and resolved alert notifications

## Application endpoints

### Portal and operations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Workforce Security Portal |
| GET | `/health` | Service health |
| GET | `/metrics` | Prometheus metrics |
| GET | `/high-api-request-volume.html` | Incident-response runbook |

### Workforce API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/via/v2/organizations/:orgId/workforce/search/employees` | Search employees |
| POST | `/via/v2/organizations/:orgId/workforce/search/forecastGroups` | Search forecast groups |
| POST | `/via/v2/organizations/:orgId/workforce/intraDayPerformance/:id` | Retrieve intraday performance |

### Security operations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/security/v1/events` | List security events |
| PATCH | `/security/v1/events/:eventId/investigate` | Begin an investigation |
| PATCH | `/security/v1/events/:eventId/revoke-api-key` | Revoke an integration API key |
| GET | `/security/v1/audit` | View security audit records |

### Test-only operations

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/test/reset` | Reset demo security state |

The test reset endpoint is available only when `ENABLE_TEST_ROUTES=true`.

## Technology stack

- TypeScript
- Node.js
- Express
- Microsoft Entra ID
- MSAL
- Docker
- MicroK8s
- Kubernetes
- Kyverno
- Prometheus
- Grafana
- Grafana Alloy
- Loki
- Playwright
- Discord

## Project structure

    api/                    Express API and security logic
    api/src/                Metrics and middleware
    web/                    Browser portal and hosted runbook
    tests/                  Playwright security tests
    kubernetes/             Application and observability manifests
    kyverno/                Kubernetes admission policies
    scripts/                Development and frontend build scripts
    docs/                   Architecture and operational documentation
    screenshots/            Demo screenshots

## Local development

Install dependencies:

    npm ci

Create local configuration:

    cp .env.example .env

Replace each `REPLACE_ME` value in `.env`, then protect the file:

    chmod 600 .env

Start the application:

    ./scripts/dev-entra.sh

The application is available at:

    http://localhost:3000

## Validation

Run TypeScript validation:

    npm run typecheck

Run the API security tests:

    npm run test:api

Run the portal tests:

    npm run test:portal

Run the full test suite:

    npm test

Build the container:

    docker build -t workforce-security-api:local .

## Kubernetes configuration

Create the local Entra Kubernetes Secret from `.env`:

    microk8s kubectl create secret generic       workforce-entra-credentials       -n dev       --from-env-file=.env       --dry-run=client       -o yaml       | microk8s kubectl apply -f -

Deploy the API:

    microk8s kubectl apply       -f kubernetes/workforce-api.yaml

Wait for deployment:

    microk8s kubectl rollout status       deployment/workforce-security-api       -n dev

Forward the service:

    microk8s kubectl port-forward       -n dev       service/workforce-security-api       3000:3000

## Demo scenario

Generate controlled high-volume traffic:

    for i in $(seq 1 25); do
      curl -s         -X POST         http://localhost:3000/via/v2/organizations/acme-financial/workforce/search/employees         -H 'Authorization: Bearer acme-demo-token'         -H 'x-api-key: acme-demo-api-key'         -H 'Content-Type: application/json'         -d '{"pageSize":25}'         > /dev/null &
    done

    wait

Expected workflow:

1. Application request metrics increase.
2. A high-volume security event is created.
3. A structured detection log is emitted.
4. Prometheus scrapes the updated metric.
5. Grafana evaluates the alert rule.
6. Discord receives a firing notification.
7. The responder opens the runbook.
8. An analyst begins investigation.
9. An administrator revokes the API key.
10. Audit records capture the response.
11. Grafana sends a resolved notification after traffic returns to baseline.

## Limitations

This is an educational and portfolio demonstration rather than a production
security platform.

- Security events and audit records are stored in memory.
- Dynamically generated state is cleared when the API restarts.
- Alert thresholds are intentionally low for demonstration.
- Local port-forwarding is used instead of a production ingress.
- Demo users, organizations, tokens, and API keys are fictional.
- The local runbook URL is accessible only from the demonstration machine.
- Grafana alerting is metric-based; Loki supports related log investigation.
- Production secrets should be stored in a dedicated secrets-management
  platform rather than a local `.env` file.

## Production improvements

Potential production enhancements include:

- Persistent PostgreSQL storage
- Azure Key Vault or another secrets manager
- Managed identities or workload identity
- TLS ingress and DNS
- Enterprise on-call integration
- Persistent security case management
- CI/CD security gates
- GitHub Actions
- Container and dependency scanning
- Infrastructure as code
- Runtime detection with Falco
- Centralized SIEM integration
- Long-term audit and metrics retention

## Documentation

- [Prerequisites](docs/PREREQUISITES.md)
- [High request-volume runbook](web/high-api-request-volume.html)

## Disclaimer

All organizations, users, tokens, API keys, and security scenarios in this
repository are fictional and intended solely for educational and demonstration
purposes.
