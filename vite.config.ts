import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repo = process.env.GITHUB_REPOSITORY?.split('/').pop() ?? '';
const defaultBase = process.env.GITHUB_PAGES === 'true'
  ? (repo.endsWith('.github.io') ? '/' : `/${repo}/`)
  : '/';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || defaultBase,
});
