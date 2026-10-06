import { cf } from '@astrojs/cloudflare/hono';
import {
	actions,
	cache,
	i18n,
	middleware,
	pages,
	redirects,
	sessions,
	trailingSlash,
} from 'astro/hono';
import { Hono } from 'hono';

// Baseline order for the docs. cf() is the worker shell.
// notFound() from https://github.com/withastro/astro/pull/18265 is not in astro@7.3.6.
const app = new Hono();

app.use(cf());
app.use(trailingSlash());
app.use(sessions());
app.use(redirects());
app.use(cache());
app.use(i18n());
app.use(middleware());
app.use(actions());
app.use(pages());

export default app;
