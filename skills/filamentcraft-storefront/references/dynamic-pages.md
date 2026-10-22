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
```

Without a panel, register on the container: `app(\FilamentCraft\Routing\DynamicTemplateRegistry::class)->register($definition)`.

How it resolves (with `public_routes` on or the tenant route macro):

1. `/` is the homepage.
2. A published page whose slug equals the path always wins.
3. Otherwise each definition is tried in registration order. A match renders the template `templateSlug` with a `RenderContext` (path, route name, parameters, bindings).
4. A missing template or a `bind()` that returns null gives a 404. An unbound `{product}` parameter on a page with a `product-detail` section also 404s when the catalog has no such product.

There is no product page type. A "product page" is any page containing a `product-detail` section. In the editor (no route parameter) it previews the product set in its `preview_slug` setting, or the first product.

Sections read the context with `$section->context('product')`, `$section->currentRecordKey('product', 'record')` and `$section->routeContext()`. Product pages get Product JSON-LD automatically. A definition whose only parameter is `{product}` on a `product-detail` page lists every catalog product in the sitemap; for anything else, return entries from `->sitemap()`.

### Rendering a template from your own controller

```php
app()->instance(Site::class, $site);
$template = Template::query()->forSite($site->getKey())->published()->where('slug', 'product')->firstOrFail();
abort_if(app(Storefront::class)->product($slug) === null, 404);

return response(app(TemplateRenderer::class)->render($template, 'published', $locale, new RenderContext(parameters: ['product' => $slug])));
```

This skips redirects, the definition's `seo()` hook and the unknown-slug 404, so add those yourself. Prefer definitions.

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
- A Livewire host page can use `FilamentCraft\Livewire\Concerns\RendersInSiteShell` to keep the visitor's locale across requests.
- Middleware aliases: `filamentcraft.site` (resolve the site from the host or domain) and `filamentcraft.tenant:{param},{OwnerModel},{slugColumn}`.
