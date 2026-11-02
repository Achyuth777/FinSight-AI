#!/usr/bin/env bash
# One-time installer for an Ubuntu 24.04 VM (Oracle Cloud Always Free, ARM or x86).
# Run on the VM as the default login user:   bash setup.sh <your-hostname> [repo-url]
# Example:                                    bash setup.sh finsight-demo.duckdns.org
# Safe to re-run: it updates the code, rebuilds, and keeps the existing secrets and database.
set -euo pipefail

DOMAIN="${1:?Usage: bash setup.sh <hostname> [repo-url]}"
REPO="${2:-https://github.com/Achyuth777/FinSight-AI.git}"
APP=/opt/finsight
DATA=/var/lib/finsight
ENVFILE=/etc/finsight.env

echo "==> Packages"
sudo apt-get update -y
sudo apt-get install -y git curl ca-certificates gnupg build-essential python3-venv python3-pip iptables-persistent debian-keyring debian-archive-keyring apt-transport-https

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  echo "==> Node 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  echo "==> Caddy"
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi

echo "==> Firewall: open 80 and 443 on the VM (Oracle images block them by default)"
for port in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -p tcp --dport "$port" -j ACCEPT
done
sudo netfilter-persistent save

echo "==> Service user and folders"
id finsight >/dev/null 2>&1 || sudo useradd --system --home "$APP" --shell /usr/sbin/nologin finsight
sudo mkdir -p "$APP" "$DATA"
sudo chown finsight:finsight "$APP" "$DATA"
sudo chmod 700 "$DATA"

echo "==> Code"
if [ -d "$APP/.git" ]; then
  sudo -u finsight git -C "$APP" pull --ff-only
else
  sudo -u finsight git clone "$REPO" "$APP"
fi

echo "==> Backend dependencies"
sudo -u finsight python3 -m venv "$APP/.venv"
sudo -u finsight "$APP/.venv/bin/pip" install --upgrade pip
sudo -u finsight "$APP/.venv/bin/pip" install -r "$APP/requirements.txt"

echo "==> Web app build"
sudo -u finsight npm ci --prefix "$APP/frontend"
sudo -u finsight npm run build --prefix "$APP/frontend"

if [ ! -f "$ENVFILE" ]; then
  echo "==> Secrets (written once to $ENVFILE, readable only by root)"
  while true; do
    read -rsp "Choose the workspace password (16+ characters, you will type it to sign in): " OWNER_PW; echo
    [ "${#OWNER_PW}" -ge 16 ] && break
    echo "Too short."
  done
  API_KEY="$(openssl rand -hex 32)"
  SESSION_SECRET="$(openssl rand -hex 32)"
  sudo tee "$ENVFILE" >/dev/null <<EOF
DATABASE_URL=sqlite:////var/lib/finsight/finsight.db
FINSIGHT_API_KEY=$API_KEY
ALLOWED_HOSTS=127.0.0.1,localhost
API_URL=http://127.0.0.1:8000
FINSIGHT_OWNER_PASSWORD=$OWNER_PW
FINSIGHT_SESSION_SECRET=$SESSION_SECRET
NODE_ENV=production
EOF
  sudo chmod 600 "$ENVFILE"
  unset OWNER_PW API_KEY SESSION_SECRET
else
  echo "==> Keeping the existing $ENVFILE"
fi

echo "==> Services"
sudo cp "$APP/deploy/oracle/finsight-backend.service" /etc/systemd/system/
sudo cp "$APP/deploy/oracle/finsight-web.service" /etc/systemd/system/
sed "s/__DOMAIN__/$DOMAIN/g" "$APP/deploy/oracle/Caddyfile" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable finsight-backend finsight-web caddy
sudo systemctl restart finsight-backend finsight-web
sudo systemctl reload caddy || sudo systemctl restart caddy

sleep 4
echo "==> Health"
curl -fsS http://127.0.0.1:8000/api/health && echo
echo "Done. Open https://$DOMAIN once DNS points at this VM (the certificate is issued on the first visit)."
