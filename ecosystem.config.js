// ============================================================
// MudahSewa PM2 ecosystem config (production)
// Real secrets live in .env files on the server, NOT here.
// Names MUST use underscores matching aaPanel project records,
// otherwise the aaPanel Node.js Project UI shows OFFLINE.
// ============================================================
module.exports = {
  apps: [
    // Main MudahSewa Next.js App — port 3000
    // PENTING: jalankan bin `next` langsung, BUKAN `npm start`.
    // `npm start` melahirkan child next-server yang jadi orphan saat PM2
    // restart → port 3000 tetap terpegang → EADDRINUSE crash loop.
    {
      name: 'mudahsewa_app',
      cwd: '/www/wwwroot/dagdigdugdigicam.store',
      script: './node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/app-err.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      restart_delay: 4000,
      max_restarts: 10,
      max_memory_restart: '600M',
      // Bunuh seluruh process tree saat restart/stop
      kill_timeout: 5000,
      treekill: true,
    },

    // GoPay Gateway (payment processor) — port 3100
    // API key is read from .env in the gateway cwd (dotenv),
    // do not hardcode secrets here.
    {
      name: 'gopay_gateway',
      cwd: '/www/wwwroot/gopay-gateway',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3100',
      },
      error_file: './logs/gopay-err.log',
      out_file: './logs/gopay-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      restart_delay: 4000,
      max_restarts: 10,
      max_memory_restart: '200M',
    },

    // OpenWA WhatsApp integration — port 2785
    {
      name: 'openwa_server',
      cwd: '/www/wwwroot/openwa-server',
      script: 'node',
      args: 'dist/main',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
      error_file: './logs/openwa-err.log',
      out_file: './logs/openwa-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: '800M',
    },
  ],
};
