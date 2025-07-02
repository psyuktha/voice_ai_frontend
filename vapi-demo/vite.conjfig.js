// vite.config.js
export default {
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT) || 4173,
    allowedHosts: ['*']  // or use your exact render domain for better security
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
}
