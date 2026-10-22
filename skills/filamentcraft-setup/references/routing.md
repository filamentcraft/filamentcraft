# Public routing

## Fallback route (`public_routes`)

```php
// config/filamentcraft.php
'public_routes' => true,
```

This registers `sitemap.xml`, `robots.txt`, `llms.txt` and a `Route::fallback` named `filamentcraft.public`. Host routes always win, so remove `Route::get('/', …)`. A request resolves to a site in this order:

1. a **live** site whose `domain` equals the host,
2. a live site whose `subdomain` sits under `filamentcraft.domain.primary` (APP_URL host by default),
3. a host that matches a non-live site returns **404** (fail-closed),
4. otherwise tenancy resolution, then the first live site.

Then the path resolves: `''` is the homepage, then an exact published page slug (nested slugs allowed), then dynamic templates, then redirects. Redirects only fire when nothing else matched.

Domains and subdomains are unique per site and normalised on save. A tenant's custom domain needs DNS pointed at the app and a certificate; FilamentCraft only matches the host.

## Tenant paths

```php
Route::filamentCraftTenant(Workspace::class);   // GET /{tenantSlug}/{path?}, name filamentcraft.tenant.public
```

Named arguments: `tenantParameter`, `tenantSlugColumn`, `pathParameter`, `name`, `tenantPattern` (default excludes `admin`), `sitemap`.

For a custom URL shape, bind the site in your own middleware (`app()->instance(Site::class, $site)`) and call the controller:

```php
Route::middleware(['web', ResolveShopSite::class])
    ->get('/shop/{tenant}/{path?}', fn (Request $request, string $tenant, ?string $path = null) => app(PublicSiteController::class)->show($request, $path ?? ''))
    ->where('path', '.*');
```

Pass `''`, not `null`, for the homepage.

## Telling FilamentCraft your URLs

Editor "view live" links, sitemaps, canonicals and hreflang all ask the plugin for a page's URL:

```php
->publicUrlsViaNamedRoute('filamentcraft.tenant.public', tenantParameter: 'tenantSlug')
->publicUrlUsing(fn (Template $template): ?string => route('page.show', $template->slug))   // null falls through
->localeUrlsUsing(fn (Site $site, string $locale, bool $isDefault): ?string => $isDefault ? url('/') : url("/{$locale}"))
```

## Redirects

`FilamentCraft\Models\Redirect` (`site_id`, `from_path` **without** a leading slash, `to_path` with a leading `/` or an absolute URL, `status` `RedirectStatus::Permanent`/`Temporary`). They're created when an editor renames a page slug, on import, or in code:

```php
Redirect::query()->updateOrCreate(
    ['site_id' => $site->getKey(), 'from_path' => 'old/about.html'],
    ['to_path' => '/about', 'status' => RedirectStatus::Permanent],
);
```

Matching is exact and case-sensitive against the request path without the query string. The query string is carried over.

## SEO pieces

- Per page: `FilamentCraft\Seo\TemplateSeo::write($template, 'en', ['title' => …, 'description' => …, 'og_image' => …, 'canonical' => …, 'indexable' => true])`. `seo_json` isn't mass-assignable.
- Site-wide defaults: `FilamentCraft\Seo\SiteSeoSettings::write($site, ['title_suffix' => ' | Acme', 'description' => …, 'og_image' => …, 'org_logo' => …, 'social' => [...], 'indexing' => true])`.
- Extra sitemap URLs: `SitemapBuilder::appendUsing(fn (Site $site): iterable => [['loc' => …, 'lastmod' => …]])`.
