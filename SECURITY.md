# Security Policy

## Project scope

This repository is an educational and portfolio security engineering lab.
It is not intended to be deployed as a production security platform without
additional hardening.

## Reporting a vulnerability

Please do not publish suspected vulnerabilities, credentials, tokens,
webhook URLs, tenant configuration, or private keys in a public issue.

Use GitHub private vulnerability reporting when available, or contact the
repository owner privately.

## Sensitive data

Do not commit:

- `.env` files
- Microsoft Entra client secrets
- Discord webhook URLs
- Grafana passwords
- Kubernetes Secret manifests containing real values
- Private keys or certificates
- Real customer or employee data

## Demo limitations

- Demo users, organizations, tokens, and API keys are fictional.
- Security events and audit records are stored in memory.
- Detection thresholds are intentionally low.
- Local port-forwarding is used instead of production ingress.
- The project requires additional hardening before production use.
