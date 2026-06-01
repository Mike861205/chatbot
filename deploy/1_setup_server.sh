#!/bin/bash
# ============================================================
# RestauBot - Server Setup for AlmaLinux 9 (Liquid Web VPS)
# Run this ONCE as root after first login to the server
# Usage: bash 1_setup_server.sh yourdomain.com
# ============================================================
set -e

DOMAIN=${1:-"yourdomain.com"}
APP_USER="restaubot"
APP_DIR="/var/www/restaubot"

echo "======================================"
echo " RestauBot Server Setup - AlmaLinux 9"
echo " Domain: $DOMAIN"
echo "======================================"

# ── 1. System update ──────────────────────────────────────
echo "[1/9] Updating system..."
dnf update -y
dnf install -y curl wget git unzip tar epel-release

# ── 2. Node.js 20 ─────────────────────────────────────────
echo "[2/9] Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
node -v && npm -v

# ── 3. PM2 ────────────────────────────────────────────────
echo "[3/9] Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# ── 4. Nginx ──────────────────────────────────────────────
echo "[4/9] Installing Nginx..."
dnf install -y nginx
systemctl enable nginx
systemctl start nginx

# ── 5. Certbot (Let's Encrypt SSL) ────────────────────────
echo "[5/9] Installing Certbot..."
dnf install -y certbot python3-certbot-nginx

# ── 6. Firewall ───────────────────────────────────────────
echo "[6/9] Configuring firewall..."
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# ── 7. App user & directory ───────────────────────────────
echo "[7/9] Creating app user and directories..."
useradd -m -s /bin/bash $APP_USER 2>/dev/null || echo "User $APP_USER already exists"
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# ── 8. Nginx config ───────────────────────────────────────
echo "[8/9] Configuring Nginx..."
cp /var/www/restaubot/deploy/nginx.conf /etc/nginx/conf.d/restaubot.conf 2>/dev/null || \
cat > /etc/nginx/conf.d/restaubot.conf << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend (React build)
    root /var/www/restaubot/frontend/dist;
    index index.html;

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }

    # React SPA — all other routes serve index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

nginx -t && systemctl reload nginx

# ── 9. SELinux allow Nginx → Node proxy ───────────────────
echo "[9/9] Configuring SELinux for Nginx proxy..."
setsebool -P httpd_can_network_connect 1

echo ""
echo "======================================"
echo " Setup complete!"
echo " Next step: run 2_deploy.sh"
echo "======================================"
