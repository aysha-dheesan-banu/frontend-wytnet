import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Helper to find all sub-apps
const getAppInputs = () => {
  const inputs = {
    main: resolve(__dirname, 'index.html'),
    dashboard: resolve(__dirname, 'dashboard.html'),
    auth: resolve(__dirname, 'auth.html'),
    clients: resolve(__dirname, 'clients.html'),
    users: resolve(__dirname, 'users.html'),
  };

  // Find all directories that contain a dashboard.html
  const dirs = fs.readdirSync(__dirname, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !['node_modules', 'dist', 'public', 'src', '.git'].includes(dirent.name));

  dirs.forEach(dir => {
    const dashPath = resolve(__dirname, dir.name, 'dashboard.html');
    if (fs.existsSync(dashPath)) {
      // Preserve the folder structure: 'habit-tracking/dashboard'
      inputs[`${dir.name}/dashboard`] = dashPath;
    }
  });

  return inputs;
};

export default defineConfig({
  build: {
    rollupOptions: {
      input: getAppInputs(),
    },
  },
});

