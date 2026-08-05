# Contributing

Thank you for your interest in the Workforce Security Portal.

## Development setup

1. Install dependencies:

       npm ci

2. Copy the environment template:

       cp .env.example .env

3. Replace the placeholder values in `.env`.

4. Run the application:

       ./scripts/dev-entra.sh

## Validation

Before opening a pull request, run:

    npm run typecheck
    npm run test:api
    npm run test:portal
    docker build -t workforce-security-api:local .

## Pull request guidelines

- Keep secrets and environment-specific values out of the repository.
- Update documentation when behavior or architecture changes.
- Add or update tests for security-control changes.
- Keep demo-only behavior clearly identified.
- Preserve organization isolation and role separation.
- Do not weaken Kyverno or authentication controls without documenting why.

## Security

Do not include real customer data, credentials, tokens, private keys,
Microsoft Entra secrets, Discord webhook URLs, or exported browser sessions.
