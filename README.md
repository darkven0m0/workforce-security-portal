# Workforce Security Portal

A fictional cloud workforce API and SecOps investigation lab built to demonstrate tenant isolation, API authentication, security monitoring, incident containment, and automated regression testing.

## Features

- Multi-tenant workforce API
- Bearer token and API key authentication
- Cross-tenant access prevention
- Security event investigation workflow
- API key revocation and containment
- Immutable-style audit trail
- Structured JSON logging
- Dockerized deployment
- Playwright security regression tests
- Groundcover-ready container telemetry

## Security Scenario

A customer reporting integration begins generating abnormal API traffic from a previously unseen source IP.

The workflow demonstrates:

1. Detect abnormal API activity
2. Correlate the integration and organization
3. Investigate the security event
4. Revoke the affected API key
5. Verify future requests are blocked
6. Record analyst actions in the audit trail

## Architecture

```text
Client
  |
  v
Express Workforce API
  |-- Authentication
  |-- Tenant authorization
  |-- Workforce endpoints
  |-- Security investigation endpoints
  |-- Structured JSON logs
  |
  v
Docker stdout
  |
  v
Kubernetes / Groundcover