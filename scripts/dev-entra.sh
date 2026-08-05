#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." &&
  pwd
)"

ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Missing local environment file: %s\n' "$ENV_FILE" >&2
  printf '%s\n' \
    "Create it with:" \
    "  cp .env.example .env" \
    "Then replace the placeholder values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required_variables=(
  ENTRA_TENANT_ID
  ENTRA_CLIENT_ID
  ENTRA_CLIENT_SECRET
  ENTRA_SPA_CLIENT_ID
  ENTRA_API_CLIENT_ID
  ENTRA_API_SCOPE
)

for variable_name in "${required_variables[@]}"; do
  variable_value="${!variable_name:-}"

  if [[ -z "$variable_value" || "$variable_value" == *"REPLACE_ME"* ]]; then
    printf 'Missing or placeholder value: %s\n' \
      "$variable_name" >&2
    exit 1
  fi
done

printf '%s\n' \
  "Starting Workforce Security Portal" \
  "Microsoft Entra configuration loaded from .env."

cd "$PROJECT_ROOT"
exec npm run dev
