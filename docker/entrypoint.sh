#!/bin/sh
# =============================================================================
# entrypoint.sh
#
# Runs at container startup BEFORE Nginx launches.
# Reads environment variables and generates /usr/share/nginx/html/config.js
# from the template, so the React app can read runtime config via
# window.__APP_CONFIG__ without requiring a rebuild.
#
# Usage: Set these environment variables in docker-compose.yml or .env:
#   API_URL, SIGNALR_URL, OIDC_AUTHORITY, OIDC_CLIENT_ID,
#   OIDC_REDIRECT_URI, OIDC_POST_LOGOUT_REDIRECT_URI, OIDC_SCOPE
# =============================================================================

set -e

TEMPLATE="/usr/share/nginx/html/config.template.js"
OUTPUT="/usr/share/nginx/html/config.js"

echo "[entrypoint] Generating runtime config..."

# envsubst replaces ${VAR} placeholders in the template with actual env values.
# We explicitly list only our known variables so other $ signs in the file
# are NOT accidentally replaced.
envsubst '${API_URL} ${SIGNALR_URL} ${OIDC_AUTHORITY} ${OIDC_CLIENT_ID} ${OIDC_REDIRECT_URI} ${OIDC_POST_LOGOUT_REDIRECT_URI} ${OIDC_SCOPE}' \
  < "$TEMPLATE" \
  > "$OUTPUT"

echo "[entrypoint] config.js written:"
cat "$OUTPUT"

echo "[entrypoint] Starting Nginx..."
exec nginx -g "daemon off;"
