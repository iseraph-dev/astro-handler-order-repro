import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

export default defineConfig({
	adapter: cloudflare(),
	output: 'server',
	session: false,
	trailingSlash: 'never',
	redirects: {
		'/old': '/en',
	},
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'fr'],
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: true,
		},
	},
});
