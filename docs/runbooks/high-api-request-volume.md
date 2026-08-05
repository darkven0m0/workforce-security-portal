# High Workforce API Request Volume

## Purpose

Use this runbook when Grafana detects unusually high application request
volume against the Workforce Security API.

## Alert condition

The alert fires when application request volume exceeds the configured
threshold during the detection window.

Health checks and Prometheus `/metrics` scrapes are excluded.

## Validate

1. Confirm that the Grafana alert is firing.
2. Review the affected API route and request volume.
3. Determine whether testing or maintenance was scheduled.
4. Confirm the organization and integration involved.
5. Review related application logs in Loki.

## Investigate

Review:

- Organization ID
- Integration ID
- Source IP
- Request count
- Expected baseline
- HTTP status codes
- Affected routes
- Related audit records
- Structured application logs

## Analyst response

1. Locate the event in the Security Events view.
2. Change the event from `Open` to `Investigating`.
3. Preserve relevant evidence.
4. Escalate to a Security Admin when containment is justified.

## Administrator containment

1. Confirm authorization to contain the integration.
2. Revoke the affected API key.
3. Confirm that the event changes to `Contained`.
4. Coordinate replacement credentials with the integration owner.

## Recovery verification

Confirm that:

- The revoked key is rejected.
- Request volume returns to baseline.
- Grafana sends a resolved notification.
- Audit records capture the response actions.
- The event remains contained.

## Expected audit actions

- `SECURITY_EVENT_INVESTIGATION_STARTED`
- `API_KEY_REVOKED`
