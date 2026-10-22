# SEO and redirects on a live site

SEO values are **not versioned**: they apply the moment you save, whatever the page's draft state.

## Page SEO (per locale)

Stored in `templates.seo_json` keyed by locale; keys `title`, `description`, `og_title`, `og_description`, `og_image`, `canonical`, `indexable`. `seo_json` is not mass-assignable; use `TemplateSeo`:

```php
use FilamentCraft\Seo\TemplateSeo;

foreach (['en' => ['title' => 'Pottery classes', 'description' => 'Wheel and hand-building courses…']] as $locale => $values) {
    TemplateSeo::write($page, $locale, [...TemplateSeo::bucketFor($page, $locale), ...$values]);
}
```

- `write()` **replaces** the locale's whole entry, so merge with `bucketFor()` as above. Empty values are dropped.
- Translations inherit only `og_image` and `indexable` from the default locale; write title and description for every language.
- Fallbacks: with no page description the first meaningful section text is used, then the site description; the share image falls back to the first section image. Doctor's "missing description" is about stored SEO, not the rendered tag.
- `og_image`: a path on the uploads disk, or an absolute or root-relative URL. `canonical`: only when it should point elsewhere on purpose; it also drops that page and locale from hreflang and the sitemap. `indexable: false` = noindex and out of the sitemap, IndexNow and llms.txt.
- A page `title` is used exactly as written, so include the brand if you want it (`Pottery classes | Harbor Clay`). The site's `title_suffix` setting only applies to pages without an SEO title (`Page name — Site name`); the homepage falls back to the bare site name.
- Read back with `TemplateSeo::for($page, $locale)`; then `php artisan filamentcraft:clear-cache <site>` so the sitemap reflects it.

## Site-wide SEO

```php
use FilamentCraft\Seo\SiteSeoSettings;

$current = SiteSeoSettings::values($site);
SiteSeoSettings::write($site, [
    'description' => '…',
    'social' => [...($current['social'] ?? []), 'instagram' => 'https://instagram.com/harborclay'],
]);   // merges top-level keys only, so merge `social` yourself
```

Keys: `title_suffix` (bool), `description`, `og_image`, `org_logo`, `social` (`x`, `facebook`, `instagram`, `youtube`, `linkedin`, `tiktok`), `indexing` (false = noindex the whole site, empty sitemap), `ai_policy` (`max_visibility`, `protect_content`, `custom`) with `ai_overrides`, `llms_txt`, `indexnow`. Read with `SiteSeoSettings::values($site)`.

## Generated files

With `public_routes` on: `/sitemap.xml` (published, indexable pages per locale with hreflang; cached, flushed on publish), `/robots.txt` (with the AI crawler policy and the sitemap line), `/llms.txt`, and the IndexNow key file. Organization/WebSite JSON-LD on every page, Product JSON-LD on product pages.

- Site-wide `indexing=false` keeps `robots.txt` permissive on purpose (it sends `X-Robots-Tag: noindex` and an empty sitemap): do not add `Disallow: /`.
- A fresh Laravel app ships `public/robots.txt`; the web server serves it before Laravel, hiding FilamentCraft's. `filamentcraft:doctor` warns. Ask before deleting it.
- IndexNow pings on publish only for a live site on a public host (not `.test`, `.local`, IPs) with indexing on.
- Extend the sitemap: `SitemapBuilder::appendUsing(fn (Site $site) => [...])`; dynamic product pages via their definition's `->sitemap()`.

## Redirects

`FilamentCraft\Models\Redirect`: `site_id`, `from_path`, `to_path`, `status` (`RedirectStatus::Permanent` 301 or `Temporary` 302); scope `forSite($site)`; unique per site and `from_path`.

```php
Redirect::query()->updateOrCreate(
    ['site_id' => $site->getKey(), 'from_path' => 'old-page.html'],
    ['to_path' => '/classes', 'status' => \FilamentCraft\Enums\RedirectStatus::Permanent],
);
```

- `from_path` is stored **without leading or trailing slash** and matched exactly (no wildcards; case follows the DB collation). Percent-encoded legacy paths stay encoded.
- A redirect only fires when no published page (or dynamic record) answers that path: pages win.
- The query string is carried over unless `to_path` has its own. `to_path` may be absolute (`https://…`).
- Renaming a page: `Redirect::forSlugChange($site, $old, $new)` (also repoints older redirects so there are no chains).
- Redirects are served by the package's public routes. Pages a host controller renders don't consult them.
- Live immediately, never cached. Check with `curl -sI https://site/old-page.html`.
- `filamentcraft:import --replace` replaces all of a site's redirects with the bundle's.

## Tenant path mounts: root robots.txt and sitemap index

`Route::filamentCraftTenant()` serves `/{tenant}/sitemap.xml`, but crawlers read `robots.txt` only at the host root and `public_routes` stays off in that shape, so FilamentCraft serves none. Add a host route for `/robots.txt` (and `/sitemap.xml` if wanted) that uses:

- `FilamentCraft\Seo\SitemapIndex::for($sites)` renders a sitemap index, `::urls($sites)` lists the URLs, `::urlFor($site)` is one tenant's sitemap URL.
- `FilamentCraft\Seo\RobotsTxt::sitemapsUsing(fn (Site $site): array => [SitemapIndex::urlFor($site)])` makes `RobotsTxt::for($site)` keep the AI-crawler policy while listing the tenant sitemaps.
- Dynamic-template skeleton pages (the `product` template itself) are already left out of the sitemap and forced noindex.
