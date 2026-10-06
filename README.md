# Handler order for the Hono docs

The Hono snippets in the docs do not do what `astro()` does. This project is the order from `handleRequest`, so those pages can be checked against it.

Pages: [Advanced routing](https://docs.astro.build/en/guides/routing/#advanced-routing), [Using with Hono](https://docs.astro.build/en/guides/routing/#using-with-hono), [Cloudflare: Using advanced routing](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#using-advanced-routing).

`astro@7.3.6`, `@astrojs/cloudflare@14.3.4`, `hono@4.13.13`, `wrangler@4.147.0`. Node 26.10.0, pnpm.

```sh
pnpm install
pnpm reproduce
```

Exit 0: `GET /` is 302 `/en`, `GET /en` is 200, `GET /old` is 301 `/en`.

Sessions need a KV binding, so `session` is `false`. `cacheCloudflare()` still throws on `astro@7.3.6`. The fix is on `main` in [#18240](https://github.com/withastro/astro/pull/18240) and is not in this release. There is no `src/middleware.ts` and no action. `notFound()` is not in this Astro yet ([#18265](https://github.com/withastro/astro/pull/18265)). `astro dev` rejects a slashed path when `trailingSlash` is `'never'`. `astro preview` redirects it.
