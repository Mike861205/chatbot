// PM2 Ecosystem — RestauBot Backend
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 reload ecosystem.config.js   ← zero-downtime reload
//   pm2 logs restaubot-api
//   pm2 monit

module.exports = {
  apps: [
    {
      name: 'restaubot-api',
      script: './dist/server.js',
      cwd: '/var/www/restaubot/backend',
      instances: 2,           // 2 instances for the 2 vCPUs
      exec_mode: 'cluster',   // load balance between instances
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/restaubot/error.log',
      out_file: '/var/log/restaubot/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Auto-restart on crash
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
