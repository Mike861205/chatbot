# Liquid Web Deploy Guide — AlmaLinux 9

## Specs del servidor
- 2 vCPUs, 6GB RAM, 120GB SSD
- AlmaLinux 9 64-bit
- Self Managed

---

## Paso 1 — Subir los archivos al servidor

Desde tu máquina Windows, abre PowerShell y ejecuta:

```powershell
# Reemplaza SERVER_IP con la IP del VPS de Liquid Web
scp -r C:\chatbot root@SERVER_IP:/var/www/restaubot
```

Si no tienes `scp`, instala [WinSCP](https://winscp.net) y arrastra la carpeta.

---

## Paso 2 — Conectarte al servidor

```bash
ssh root@SERVER_IP
```

---

## Paso 3 — Setup inicial (solo una vez)

```bash
cd /var/www/restaubot/deploy
chmod +x 1_setup_server.sh 2_deploy.sh
bash 1_setup_server.sh tudominio.com
```

---

## Paso 4 — Configurar variables de entorno

```bash
nano /var/www/restaubot/backend/.env
```

Cambia estos valores:
- `JWT_SECRET` → genera uno en: https://generate-secret.vercel.app/64
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` → tus credenciales
- `FRONTEND_URL` → `https://tudominio.com`
- `OPENAI_API_KEY` → tu key de OpenAI (para el chatbot)
- `WHATSAPP_VERIFY_TOKEN` → cualquier string secreto

Los datos de Neon ya están precargados.

---

## Paso 5 — Deploy

```bash
bash /var/www/restaubot/deploy/2_deploy.sh tudominio.com
```

---

## Paso 6 — SSL/HTTPS (obligatorio para WhatsApp)

```bash
certbot --nginx -d tudominio.com -d www.tudominio.com
```

---

## Paso 7 — Apuntar el dominio al servidor

En el panel de tu dominio (GoDaddy, Cloudflare, etc.) crea:
```
Tipo: A
Nombre: @
Valor: SERVER_IP

Tipo: A
Nombre: www
Valor: SERVER_IP
```

---

## Comandos útiles en el servidor

```bash
pm2 list                    # ver estado del proceso
pm2 logs restaubot-api      # ver logs en tiempo real
pm2 restart restaubot-api   # reiniciar
pm2 monit                   # monitor en tiempo real

nginx -t                    # probar config de nginx
systemctl reload nginx      # recargar nginx

# Actualizar la app después de cambios:
bash /var/www/restaubot/deploy/2_deploy.sh tudominio.com
```

---

## WhatsApp Webhook URL

Una vez con HTTPS activo, configura en Meta Developers:
```
URL: https://tudominio.com/api/whatsapp/webhook
Verify Token: (el que pusiste en WHATSAPP_VERIFY_TOKEN)
```
