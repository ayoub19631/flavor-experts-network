import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { vitePrerenderPlugin } from 'vite-prerender-plugin';
import Sitemap from 'vite-plugin-sitemap';
import { getBlogRoutes } from './prerender/blog-routes.js';
import { getSitemapLastmod } from './prerender/blog-sitemap.js';

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const defaultDescription =
    "A professional community for flavor scientists, food technologists, and industry specialists.";
  env.VITE_APP_TITLE ??= process.env.OVERVIEW_TITLE ?? 'Flavor Experts Network';
  env.VITE_APP_DESCRIPTION ??=
    process.env.OVERVIEW_DESCRIPTION ?? defaultDescription;
  // Stale Vercel env leftovers from private preview should not ship in public HTML.
  if (/under development|قيد التطوير/i.test(env.VITE_APP_DESCRIPTION || '')) {
    env.VITE_APP_DESCRIPTION = defaultDescription;
  }
  env.VITE_APP_TITLE = escapeHtmlAttr(env.VITE_APP_TITLE);
  env.VITE_APP_DESCRIPTION = escapeHtmlAttr(env.VITE_APP_DESCRIPTION);
  env.VITE_APP_LOGO_URL ??= '/favicon.svg';
  env.VITE_SITE_URL ??= 'https://flavorexpertsnetwork.com';
  env.VITE_SUPPORT_EMAIL ??= env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
  env.VITE_PRIVACY_EMAIL ??= env.NEXT_PUBLIC_PRIVACY_EMAIL || '';
  process.env.VITE_SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL;
  process.env.VITE_PRIVACY_EMAIL = env.VITE_PRIVACY_EMAIL;
  // Vite HTML %VITE_*% replacement reads process.env / mode env files — not the local object.
  process.env.VITE_APP_TITLE = env.VITE_APP_TITLE;
  process.env.VITE_APP_DESCRIPTION = env.VITE_APP_DESCRIPTION;
  process.env.VITE_SITE_URL = env.VITE_SITE_URL;
  process.env.VITE_APP_LOGO_URL = env.VITE_APP_LOGO_URL;

  const isPlatformPrivate = env.VITE_PLATFORM_PRIVATE === 'true';
  const blogPrerenderRoutes = command === 'build' && !isPlatformPrivate ? getBlogRoutes() : [];

  return {
    plugins: [
      react(),
      ...(command === 'build' && !isPlatformPrivate
        ? [
            Sitemap({
              hostname: env.VITE_SITE_URL || 'https://flavorexpertsnetwork.com',
              lastmod: getSitemapLastmod(),
              readable: true,
              generateRobotsTxt: false,
              dynamicRoutes: [
                '/',
                '/community',
                '/courses',
                '/members',
                '/jobs',
                '/forum',
                '/market',
                '/blog',
                '/consultations',
                '/enterprise',
                '/terms',
                '/privacy',
                ...getBlogRoutes(),
              ],
              exclude: [
                '/admin',
                '/dashboard',
                '/auth',
                '/learn',
                '/messages',
                '/verify-email',
                '/email-verified',
              ],
            }),
          ]
        : []),
      ...(blogPrerenderRoutes.length > 0
        ? vitePrerenderPlugin({
            renderTarget: '#root',
            prerenderScript: path.resolve(__dirname, 'prerender/blog.js'),
            additionalPrerenderRoutes: blogPrerenderRoutes,
          })
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_PORT || '3000'),
      watch: { usePolling: true, interval: 600 },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-aspect-ratio',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-hover-card',
              '@radix-ui/react-label',
              '@radix-ui/react-menubar',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-progress',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group',
              '@radix-ui/react-tooltip',
            ],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'utils-vendor': [
              'clsx',
              'tailwind-merge',
              'class-variance-authority',
              'date-fns',
              'lucide-react',
            ],
            'query-vendor': ['@tanstack/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  };
});
