// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // roll-a-die is only imported lazily, so pre-bundle it up front or the dev server can serve a stale copy.
  vite: { optimizeDeps: { include: ['roll-a-die'] } },
});
