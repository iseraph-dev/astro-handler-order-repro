# The Hono examples do not follow `astro()`

Someone who copies the Hono snippets does not get the same request handling as `astro()`, or as an Astro app that never replaces the pipeline. `astro()` is `handleRequest`. The examples mount a shorter chain, and they mount `i18n()` after `pages()`. `pages()` does not call `next()`, so that `i18n()` never runs.

I would like those docs to show one order, the one `handleRequest` already uses. This reproduction is that order as far as I can tell from the current code. Please check it. If a step is in the wrong place, the docs should use the corrected order, not this file.

## Astro Info

```
Astro                    v7.3.6
Node                     v26.10.0
System                   Linux (x64)
Package Manager          pnpm
Output                   server
Adapter                  @astrojs/cloudflare@14.3.4
Integrations             none
```

Also installed: `hono@4.13.13`, `wrangler@4.147.0`.

## Where the docs disagree

[Advanced routing](https://docs.astro.build/en/guides/routing/#advanced-routing) says the built-in pipeline is trailing-slash normalization, then redirects, sessions, actions, user middleware, page rendering, i18n, and caching.

That sentence is not `handleRequest`. Sessions are set up before a redirect returns. Actions run only when middleware calls `next()`. i18n runs after middleware, and cache wraps that pair instead of sitting at the end.

The copy-paste examples are a different list again. [Using with Hono](https://docs.astro.build/en/guides/routing/#using-with-hono) shows this twice, once for `src/fetch.ts` and once under the `/dashboard` guard:

```ts
app.use(actions());
app.use(middleware());
app.use(pages());
app.use(i18n());
```

[Cloudflare: Using advanced routing](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#using-advanced-routing), under “With Hono”, adds `cf()` and keeps the same four:

```ts
app.use(cf());
app.use(actions());
app.use(middleware());
app.use(pages());
app.use(i18n());
```

`trailingSlash()`, `sessions()`, `redirects()`, and `cache()` are missing from both.

## Order in this project

`wrangler.json` sets `main` to `src/worker.ts`. There is no `src/fetch.ts`, and the worker does not call `App.render`.

```ts
import { Hono } from 'hono';
import { actions, cache, i18n, middleware, pages, redirects, sessions, trailingSlash } from 'astro/hono';
import { cf } from '@astrojs/cloudflare/hono';

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
```

`cf()` is Cloudflare setup, not an Astro stage. After it, a redirect returns before cache, i18n, and middleware. `i18n()` is registered before `middleware()`, so it post-processes the page and still sits inside `cache()`. `pages()` is last.

On `pnpm reproduce`:

- `GET /` is **302** to `/en`. The locale redirect ran after the page.
- `GET /en` is **200**.
- `GET /old` is **301** to `/en`. The redirect from config returned before i18n and middleware.

## What this project leaves out

The handlers are all mounted. Not every feature behind them is turned on.

Cloudflare sessions need a KV binding. This project sets `session: false`, so `sessions()` is in the chain and nothing is stored. `cache()` is in the chain without `cacheCloudflare()`. On `astro@7.3.6` that provider makes `cache()` throw `Cannot use 'in' operator to search for 'Symbol(astro:cache:apply)' in undefined`, because `provideCache` never runs. The fix is on `main` in [#18240](https://github.com/withastro/astro/pull/18240) ([#18227](https://github.com/withastro/astro/issues/18227)) and is not in this release, which is why the provider stays off. There is no `src/middleware.ts` and no actions module. `trailingSlash` is `'never'`. `astro dev` rejects `GET /en/` instead of redirecting. `astro preview` redirects. The script does not request a slashed path.

[PR #18265](https://github.com/withastro/astro/pull/18265) adds `notFound()`. `astro@7.3.6` does not export it, so it is not here. In `handleRequest` that step is after the trailing-slash check and before the rest of rendering. The docs can add it when the PR lands.

## Link to Minimal Reproducible Example

```sh
pnpm install
pnpm reproduce
```

`pnpm reproduce` exits 0 when the three responses above hold.
