# Prerequisites

## Local development

The following tools are required:

- Node.js 20 or newer
- npm 10 or newer
- Git
- Docker

Install the application dependencies using the committed lock file:

    npm ci

## Environment configuration

Copy the public configuration template:

    cp .env.example .env

Replace each `REPLACE_ME` value in `.env`.

The completed `.env` file contains local configuration and secrets and must
never be committed to Git.

Protect the file locally:

    chmod 600 .env

## Automated tests

Install the Playwright Chromium browser:

    npx playwright install chromium

On a new Linux system, Playwright may also require operating-system
dependencies:

    npx playwright install-deps chromium

Run the API security test suite:

    npm run test:api

Run the portal test suite:

    npm run test:portal

Run the complete test suite:

    npm test

## Static validation

Run the TypeScript compiler without generating build output:

    npm run typecheck

Run all validation checks:

    npm run check

## Container build

Build the application image:

    docker build -t workforce-security-api:local .

## Kubernetes demonstration

The full demonstration additionally requires:

- MicroK8s
- MicroK8s DNS addon
- MicroK8s storage addon
- MicroK8s Helm 3 addon
- Microsoft Entra application registrations
- A Grafana notification destination such as Discord

Enable the required MicroK8s addons:

    microk8s enable dns storage helm3

Create the local Kubernetes namespace:

    microk8s kubectl create namespace dev

Create or update the Microsoft Entra Kubernetes Secret from the local
`.env` file:

    microk8s kubectl create secret generic \
      workforce-entra-credentials \
      -n dev \
      --from-env-file=.env \
      --dry-run=client \
      -o yaml \
      | microk8s kubectl apply -f -

Deploy the Workforce Security API:

    microk8s kubectl apply \
      -f kubernetes/workforce-api.yaml

Wait for the deployment:

    microk8s kubectl rollout status \
      deployment/workforce-security-api \
      -n dev

Forward the API locally:

    microk8s kubectl port-forward \
      -n dev \
      service/workforce-security-api \
      3000:3000

Verify the service:

    curl -s http://localhost:3000/health

## Dependency manifests

This is a Node.js and TypeScript project.

Dependencies are defined in:

- `package.json`
- `package-lock.json`

