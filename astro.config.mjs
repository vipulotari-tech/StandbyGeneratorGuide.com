import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

const productionUrl = 'https://standbygeneratorguide.com';
const stagingUrl = 'https://homegeneratorguide.tender-telescope.workers.dev';
const requestedEnvironment = process.env.PUBLIC_SITE_ENV;
const isDevCommand = process.argv.some((argument) => argument === 'dev');
const siteEnvironment = requestedEnvironment ?? (isDevCommand ? 'staging' : 'production');

if (!['production', 'staging'].includes(siteEnvironment)) {
  throw new Error(`PUBLIC_SITE_ENV must be "production" or "staging"; received "${siteEnvironment}".`);
}

// Expose only the selected, non-secret build target to Astro page code.
process.env.PUBLIC_SITE_ENV = siteEnvironment;

export default defineConfig({
  site: siteEnvironment === 'production' ? productionUrl : stagingUrl,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    mdx(),
  ],
  vite: {
    server: {
      host: '0.0.0.0',
      allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
    },
    plugins: [tailwindcss()],
  },
});
