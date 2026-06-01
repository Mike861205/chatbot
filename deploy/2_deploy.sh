#!/bin/bash
# ============================================================
# RestauBot - Deploy / Update script
# Run this every time you want to deploy or update the app
# Usage: bash 2_deploy.sh yourdomain.com
# ============================================================
set -e

DOMAIN=${1:-"yourdomain.com"}
APP_DIR="/var/www/restaubot"
REPO_URL="https://github.com/TU_USUARIO/TU_REPO.git"  # ← CAMBIA ESTO

echo "======================================"
echo " RestauBot Deploy"
echo " Domain: $DOMAIN"
echo "======================================"

# ── 1. Clone or pull latest code ──────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "[1/7] Pulling latest code..."
  cd $APP_DIR
  git pull origin main
else
  echo "[1/7] Cloning repository..."
  # If no git, copy files from local (run from repo root via scp first)
  # OR clone:
  git clone $REPO_URL $APP_DIR
  cd $APP_DIR
fi

# ── 2. Backend: install deps & build ──────────────────────
echo "[2/7] Building backend..."
cd $APP_DIR/backend
npm ci --omit=dev
npm run build

# ── 3. Copy ecosystem config ──────────────────────────────
echo "[3/7] Copying PM2 config..."
cp $APP_DIR/deploy/ecosystem.config.js $APP_DIR/backend/ecosystem.config.js

# ── 4. Create .env if not exists ──────────────────────────
if [ ! -f "$APP_DIR/backend/.env" ]; then
  echo "[4/7] .env not found - copying template..."
  cp $APP_DIR/deploy/.env.production $APP_DIR/backend/.env
  echo ""
  echo "  ⚠️  IMPORTANT: Edit $APP_DIR/backend/.env with your real values!"
  echo "  Run: nano $APP_DIR/backend/.env"
  echo "  Then run this script again."
  exit 1
else
  echo "[4/7] .env found - skipping..."
fi

# ── 5. Frontend: install deps & build ─────────────────────
echo "[5/7] Building frontend..."
cd $APP_DIR/frontend
npm ci
VITE_API_URL=https://$DOMAIN npm run build

# ── 6. Nginx config & reload ──────────────────────────────
echo "[6/7] Updating Nginx config..."
sed "s/yourdomain.com/$DOMAIN/g" $APP_DIR/deploy/nginx.conf > /etc/nginx/conf.d/restaubot.conf
nginx -t && systemctl reload nginx

# ── 7. Start / reload PM2 ─────────────────────────────────
echo "[7/7] Starting/reloading application..."
mkdir -p /var/log/restaubot
cd $APP_DIR/backend

if pm2 list | grep -q "restaubot-api"; then
  pm2 reload ecosystem.config.js --env production
  echo "  → App reloaded (zero downtime)"
else
  pm2 start ecosystem.config.js --env production
  pm2 save
  echo "  → App started"
fi

# ── SSL (only first time) ─────────────────────────────────
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo ""
  echo "======================================"
  echo " Run SSL setup (first time only):"
  echo " certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  echo "======================================"
fi

echo ""
echo "======================================"
echo " Deploy complete!"
echo " App running at: https://$DOMAIN"
echo " PM2 status:     pm2 list"
echo " Logs:           pm2 logs restaubot-api"
echo "======================================"
