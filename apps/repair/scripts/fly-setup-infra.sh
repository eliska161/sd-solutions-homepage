#!/usr/bin/env bash
# One-time / repair Fly infra for sd-solutions-repair (volume, IPs, domain).
# Usage (from apps/repair):
#   ./scripts/fly-setup-infra.sh
# Optional:
#   APP=sd-solutions-repair REGION=arn DOMAIN=repair.sd-solutions.org ./scripts/fly-setup-infra.sh

set -euo pipefail

APP="${APP:-sd-solutions-repair}"
REGION="${REGION:-arn}"
DOMAIN="${DOMAIN:-repair.sd-solutions.org}"
VOLUME_NAME="${VOLUME_NAME:-repair_uploads}"
VOLUME_SIZE_GB="${VOLUME_SIZE_GB:-3}"

echo "==> App: $APP  region: $REGION  domain: $DOMAIN"

if ! command -v flyctl >/dev/null 2>&1 && ! command -v fly >/dev/null 2>&1; then
  echo "Install Fly CLI first: https://fly.io/docs/hands-on/install-flyctl/"
  exit 1
fi

FLY=(fly)
command -v flyctl >/dev/null 2>&1 && FLY=(flyctl)

echo "==> Ensure app exists"
"${FLY[@]}" apps list | grep -q "$APP" || "${FLY[@]}" apps create "$APP" --org personal || true

echo "==> Allocate public IPs (v4 + v6)"
# Shared IPv4 is enough for HTTP; dedicated optional.
"${FLY[@]}" ips allocate-v4 --shared -a "$APP" || true
"${FLY[@]}" ips allocate-v6 -a "$APP" || true
"${FLY[@]}" ips list -a "$APP" || true

echo "==> Ensure volume '$VOLUME_NAME' (${VOLUME_SIZE_GB}GB) in $REGION"
if "${FLY[@]}" volumes list -a "$APP" | grep -q "$VOLUME_NAME"; then
  echo "Volume already exists"
  "${FLY[@]}" volumes list -a "$APP"
else
  "${FLY[@]}" volumes create "$VOLUME_NAME" \
    --region "$REGION" \
    --size "$VOLUME_SIZE_GB" \
    --app "$APP" \
    --yes
fi

echo "==> Add certificate / domain: $DOMAIN"
"${FLY[@]}" certs add "$DOMAIN" -a "$APP" || true
"${FLY[@]}" certs show "$DOMAIN" -a "$APP" || "${FLY[@]}" certs list -a "$APP" || true

echo
echo "==> Next DNS steps"
echo "1. Run: fly certs show $DOMAIN -a $APP"
echo "2. Add the CNAME/A/AAAA records Fly prints at your DNS host"
echo "3. Wait until certificate status is Ready"
echo
echo "==> Then deploy from apps/repair:"
echo "  fly deploy -a $APP --config fly.toml"
echo
echo "Done."
