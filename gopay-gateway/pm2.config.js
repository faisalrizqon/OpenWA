// PM2 configuration for GoPay Gateway
module.exports = {
  apps: [
    {
      name: "gopay-gateway",
      script: "./server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
      env_production: {
        PORT: 3000,
        NODE_ENV: "production",
      },
      error_file: "./logs/gopay-err.log",
      out_file: "./logs/gopay-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      restart_delay: 4000,
      max_restarts: 10,
    },
  ],
};
