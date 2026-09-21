#!/usr/bin/env bash
# Grant Linux + Chrome access to the locker USB label printer.
# The OTID TM#3 does not show up in Chrome's serial/TTY picker.

set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Kjør: sudo bash scripts/kiosk-usb-linux.sh"
  exit 1
fi

USER_NAME="${SUDO_USER:-${USER}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RULE_SRC="$ROOT/kiosk/udev/99-sd-kiosk-printer.rules"
RULE_DST=/etc/udev/rules.d/99-sd-kiosk-printer.rules

install -m 0644 "$RULE_SRC" "$RULE_DST"
printf 'blacklist usblp\n' >/etc/modprobe.d/sd-kiosk-usblp.conf
rmmod usblp 2>/dev/null || true

if id "$USER_NAME" >/dev/null 2>&1; then
  usermod -aG dialout,plugdev,lp "$USER_NAME" || true
fi

udevadm control --reload-rules
udevadm trigger

systemctl stop cups 2>/dev/null || true
systemctl stop cups-browsed 2>/dev/null || true

echo
echo "USB-enheter:"
lsusb || true
echo
echo "Skriver-noder (skal helst ikke være lp0 hvis Chrome skal eie USB):"
ls -l /dev/usb/lp* /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo "(ingen tty/lp ennå — det er normalt for ren USB-skriver)"
echo
CHROME_SNAP="$(command -v chromium-browser 2>/dev/null || true)"
if snap list chromium >/dev/null 2>&1 || [[ "${CHROME_SNAP}" == /snap/* ]]; then
  echo "Advarsel: Snap-Chrome/Chromium ser ofte ikke USB. Installer google-chrome-stable som .deb."
fi
echo
echo "Logg ut og inn (grupper). I kiosken: Administrasjon → Koble til USB."
echo "Ikke bruk «Koble til TTY» — OTID ligger ikke i den listen."
