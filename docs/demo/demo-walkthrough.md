# Demo Walkthrough

## 1. Introduce the project

Explain that the Workforce API is a representative multi-tenant workload.
The surrounding platform demonstrates prevention, detection, investigation,
and containment.

## 2. Walk through the architecture

Cover:

- Microsoft Entra ID authentication
- Bearer-token and API-key validation
- Organization authorization
- MicroK8s deployment
- Kyverno admission policy
- Prometheus metrics
- Alloy log collection
- Loki log storage
- Grafana dashboards and alerting
- Discord notifications
- Playwright security testing
- Analyst investigation
- Administrator containment

## 3. Verify service health

    curl -s http://localhost:3000/health

## 4. Generate controlled high-volume traffic

    for i in $(seq 1 25); do
      curl -s         -X POST         http://localhost:3000/via/v2/organizations/acme-financial/workforce/search/employees         -H 'Authorization: Bearer acme-demo-token'         -H 'x-api-key: acme-demo-api-key'         -H 'Content-Type: application/json'         -d '{"pageSize":25}'         > /dev/null &
    done

    wait

## 5. Observe detection

Show:

- The security event
- Prometheus request metrics
- The Grafana alert
- The Discord notification
- The linked runbook
- Related Loki logs

## 6. Investigate and contain

Demonstrate:

- Analyst changes the event to `Investigating`
- Administrator revokes the API key
- Audit entries are created
- The revoked key is rejected
- The Grafana alert resolves

## 7. Close

Summarize the lifecycle:

    Prevent → detect → notify → investigate → contain → verify
