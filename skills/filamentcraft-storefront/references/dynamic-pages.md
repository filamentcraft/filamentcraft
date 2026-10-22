# Dynamic pages

Two different needs:

- **A**: one published FilamentCraft page renders many records (`/shop/{product}`, `/courses/{course}`). Use a `DynamicTemplateDefinition`.
- **B**: a page your app renders itself (account, order history, custom checkout) should look like the site. Use one of the four shell "doors".

## A. Dynamic templates

```php
use FilamentCraft\Models\Site;
use FilamentCraft\Routing\DynamicTemplateDefinition;
use FilamentCraft\Routing\RenderContext;
use FilamentCraft\Seo\RecordSeo;

FilamentCraftPlugin::make()->dynamicTemplates([
    DynamicTemplateDefinition::make('product.show')
        ->path('shop/{product}')              // each {param} matches one path segment
        ->templateSlug('product')             // the published page to render
        ->bind('product', fn (Site $site, string $slug, array $parameters): ?object => Product::query()->where('slug', $slug)->first())
        ->seo(fn (RenderContext $context, Site $site, string $locale): ?RecordSeo => new RecordSeo(title: $context->binding('product')->name))
        ->sitemap(fn (Site $site): iterable => /* SitemapEntry objects */ []),
]);

// RecordSeo(title, description, image, url, ogType: OgType, author, publishedAt, modifiedAt, authorUrl); OgType::Article also emits BlogPosting JSON-LD
// SitemapEntry(url, lastmod, images[]); a relative url is mounted on the site root
```

Without a panel, register on the container: `app(\FilamentCraft\Routing\DynamicTemplateRegistry::class)->register($definition)`.

How it resolves (with `public_routes` on or the tenant route macro):

1. `/` is the homepage.
2. A published page whose slug equals the path always wins.
3. Otherwise each definition is tried in registration order. A match renders the template `templateSlug` with a `RenderContext` (path, route name, parameters, bindings).
4. A missing template or a `bind()` that returns null gives a 404. An unbound `{product}` parameter on a page with a `product-detail` section also 404s when the catalog has no such product.

Binding gotchas (each a real production failure):

- **A `bind()` closure must return an object (or null).** An array, string or int counts as "not found" and 404s.
- **Cache identity ignores record changes.** An Eloquent binding is keyed by `morphClass:key` only (no `updated_at`), and any other object by its class name. A cacheable custom section that renders `$section->context('course')` shows stale data for the TTL. Any custom section reading `context()` bindings must return `cacheable(): false`.
- **Only Eloquent models survive a Livewire round trip** (`RenderContext::toLivewire()` drops every other binding). In a `LivewireSection`, bind models, or re-resolve from the route parameter in the component.
- A definition's own template slug (`/product`) is a context-less skeleton: already forced noindex and left out of the sitemap, IndexNow and llms.txt; you only need to pick a slug no existing link uses.

There is no product page type. A "product page" is any page containing a `product-detail` section. In the editor (no route parameter) it previews the product set in its `preview_slug` setting, or the first product.

Sections read the context with `$section->context('product')`, `$section->currentRecordKey('product', 'record')` and `$section->routeContext()`. Product pages get Product JSON-LD automatically. A definition whose only parameter is `{product}` on a `product-detail` page lists every catalog product in the sitemap; for anything else, return entries from `->sitemap()`.

### Rendering a template from your own controller

```php
app()->instance(Site::class, $site);
$template = Template::query()->forSite($site->getKey())->published()->where('slug', 'product')->firstOrFail();
abort_if(app(Storefront::class)->product($slug) === null, 404);

return response(app(TemplateRenderer::class)->render($template, 'published', $locale, new RenderContext(parameters: ['product' => $slug])));
```

This skips redirects, the definition's `seo()` hook and the unknown-slug 404, so add those yourself. Prefer definitions. Clamp `$locale` first: `$locale = $site->hasLocale($requested) ? $requested : $site->default_locale;` (and `app()->setLocale($locale)`), or an unknown code renders an empty page.

A fresh hand-created `Site` has no `Region` rows, so the shell renders without header or footer until regions exist (blueprints seed them; see the content skill's regions reference).

## B. The four doors into the site shell

All four render inside `<x-filamentcraft::layout>`: the site's header and footer regions, theme tokens, fonts and color scheme.

| Door | Usage |
|---|---|
| Livewire full-page component | add `#[\FilamentCraft\Attributes\Storefront]` (a Livewire `#[Layout]` pinned to the site layout; optional `['title' => …]`) |
| Route group | `Route::filamentCraftStorefront(Team::class, function () { Route::get('account', AccountPage::class); });`. Prefixes `{tenantSlug}` and resolves the tenant's site. Register it **before** `Route::filamentCraftTenant()` |
| Folio | `php artisan filamentcraft:install --folio` scaffolds `resources/views/storefront/` and prints the `Folio::path(...)` registration |
| Any Blade view | wrap it: `<x-filamentcraft::layout :site="$site" title="My account">…</x-filamentcraft::layout>` |

Layout props: `site`, `title`, `color-scheme`, `mode` (`published`), `locale`, `livewire` (true), `indexable` (false: host pages are noindex unless you say otherwise), `seo` (a `SeoData`), `viewport`. The site resolves from the prop, then the container's bound `Site`, then tenancy, then the URL's tenant parameter. If none of those finds a site, it throws.

- Put `fc-page` on your outer element so headings use the theme fonts. Push head tags to the `fc-head` stack and scripts to `fc-scripts`, from the page, not from a section.
- A Livewire host page can use `FilamentCraft\Livewire\Concerns\RendersInSiteShell` to pin the visitor's locale (a `#[Locked]` property) and, via `PinsPageUrl`, the page URL so locale-switcher links don't point at `/livewire/update`. `siteShellLayoutData($site, $title)` returns the layout props to spread.
- **The site binding does not survive `/livewire/update`.** The tenant middleware runs on the page GET only, and Livewire updates carry no `{tenantSlug}`; `Layout::resolveSite()` then falls back to `TenancyResolver` (config site, Filament tenant, first live site), which can be the wrong tenant after the first wire action. Override `shellSite()` to return the component's own site (hold the site key in a `#[Locked]` property), re-`app()->instance(Site::class, $site)` in `render()`, and test with a second tenant.
- `<x-filamentcraft::layout>` emits no hreflang. In a multi-locale shop add `@push('fc-head') <x-filamentcraft::hreflang :site="$site" :current="$locale" /> @endpush` and `<x-filamentcraft::locale-switcher :site="$site" :current="$locale" />` (content skill, locales reference).
- `#[Storefront(['title' => …])]` uses only `title`; other params are dropped (publish the layout view to use more). `Route::filamentCraftStorefront(?string $ownerModel, ?Closure $routes, $tenantParameter, $tenantSlugColumn, $tenantPattern)` defaults `tenantPattern` to exclude only `admin`: if your Filament panel path differs, pass a pattern that excludes it, or `/control-panel/users` is captured as a tenant.
- Middleware aliases: `filamentcraft.site` (resolve the site from the host or domain) and `filamentcraft.tenant:{param},{OwnerModel},{slugColumn}`.
