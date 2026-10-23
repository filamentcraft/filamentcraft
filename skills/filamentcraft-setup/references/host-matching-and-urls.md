# Host matching, public URLs and route gotchas

## Contents
- Host matching rules
- Setting `domain` and `subdomain` from code
- `public_routes` is read when routes load
- Tenant path mounts
- Binding the site yourself
- APP_URL and APP_DEBUG

## Host matching rules

`Rendering/DomainResolver` decides which site a host belongs to (fallback route and `filamentcraft.site` middleware).

- An exact `domain` match outranks the `www.` twin; either serves. A tenant who points both `acme.com` and `www.acme.com` at the app needs only `domain = acme.com`.
- Once **any** site has a `subdomain`, an unknown `{label}.{primary}` host returns **404**. It never falls through to the first live site. `www` is exempt.
- A host that matches a **non-live** site returns 404 (fail-closed).
- `domain.primary` defaults to the `APP_URL` host. The primary host itself is reserved and cannot be claimed.

## Setting `domain` and `subdomain` from code

The `Site` mutators normalise (`https://Shop.X.com/` becomes `shop.x.com`), but nothing validates cross-column shadowing: a domain `acme.myapp.com` against another site's subdomain `acme`, a `www` subdomain, or the primary host. The unique index only catches same-column duplicates. Any "custom domain per customer" form or API you build must add the package rules:

```php
use FilamentCraft\Support\HostClaimRule;

'domain' => ['nullable', HostClaimRule::domain($site?->getKey())],
'subdomain' => ['nullable', HostClaimRule::subdomain($site?->getKey())],
```

The panel's `domain` and `subdomain` fields are hidden unless `public_routes` is on or the plugin has `->siteRoutingFields()`. With `public_routes` off, nothing reads those columns unless your own routes carry the `filamentcraft.site` middleware (alias of `SiteContext`); `filamentcraft:doctor` warns about it.

## `public_routes` is read when routes load

`routes/web.php` checks `config('filamentcraft.public_routes')` once, at route registration. The config default is a literal `false` with no env var.

- Deploy: after enabling it, `php artisan route:clear` (or re-run `route:cache`).
- Tests: `config(['filamentcraft.public_routes' => true])` inside a test body registers nothing. Set it in the test case's `defineEnvironment()` (Testbench) or before the app boots.
- Without it, `Route::filamentCraftTenant()` still serves tenant pages, redirects and `{tenant}/sitemap.xml`. Only the host-level `sitemap.xml`, `robots.txt`, `llms.txt`, the IndexNow key file and the fallback route need `public_routes`.

## Tenant path mounts

`Route::filamentCraftTenant(Team::class)` registers `GET {tenantSlug}/{path?}`. The default `tenantPattern` excludes only `admin`.

- Mounted at the root it also matches `/login`, `/dashboard`, `/up` and any second panel path. Mount it under a prefix and match `publicRouteName()` / `publicUrlsViaNamedRoute()` to it, or pass a `tenantPattern` that excludes your root routes:

```php
Route::prefix('s')->group(fn () => Route::filamentCraftTenant(Team::class, name: 'website.public'));
```

- A redirect whose `to_path` is root-relative (`/about`) is prefixed with the mount (`/acme/about`). Absolute URLs pass through.
- Only `{tenant}/sitemap.xml` and `sitemap-{page}.xml` exist per tenant. There is no per-tenant `robots.txt` or `llms.txt`. For a root `robots.txt` that lists every tenant sitemap, see "Tenant path mounts" in the filamentcraft-content SEO reference.
- If the Filament panel path is not `admin`, pass a `tenantPattern` that excludes it, or `/your-panel/users` is captured as a tenant.

## Binding the site yourself

`SiteContext` (`filamentcraft.site`) and `ResolveSiteFromTenant` (`filamentcraft.tenant`) bind `Site` with `app()->instance()` unconditionally. A host middleware that pre-binds a site is **overwritten** on any route carrying either alias, and on the `public_routes` fallback route (wrapped in `SiteContext`). Run your custom binder on routes that carry neither alias, or after them. Pass `''`, not `null`, as the homepage path to `PublicSiteController::show()`.

## APP_URL and APP_DEBUG

- The scheme for **every** public URL (custom domain and subdomain included) comes from `config('app.url')`; the fallback host is the `APP_URL` host. A production `.env` with `APP_URL=http://localhost` gives canonicals, sitemap, `og:url`, hreflang and the editor's "open live" link the wrong scheme or host. Fix it before blaming routing.
- Canonicals, sitemap and hreflang are built as `scheme://domain` (or subdomain host) with no port, so locally they omit `:8000`. Browse through `APP_URL`, or give the site a hosts-entry domain (`shop.test`) instead of `127.0.0.1`.
- `publicUrl()` is null for a page that is not published.
- The helpful 404 text (names the site and lists its unpublished pages) shows only when `APP_DEBUG=true`. `SiteContext` aborts with `no Site resolved for host [x]`. For "page 404s", set `APP_DEBUG=true` locally and read the message.
- `publicUrlsViaNamedRoute($name, tenantParameter:, homepagePath:, extraParameters:)` covers routes that need a literal homepage segment or a locale parameter. Resolvers are keyed per panel with a global default as fallback.
