import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        auth: resolve(__dirname, 'auth.html'),
        clients: resolve(__dirname, 'clients.html'),
        users: resolve(__dirname, 'users.html'),
        habitTracking: resolve(__dirname, 'habit-tracking/dashboard.html'),
        projectA: resolve(__dirname, 'project-a/dashboard.html'),
        regulationAssistant: resolve(__dirname, 'regulation-assistant/dashboard.html'),
      },
    },
  },
});
