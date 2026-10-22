---
name: filamentcraft-storefront
description: "Connect a Laravel app's own products, categories and orders to FilamentCraft's commerce sections (product carousel, product listing, product page, category grid, cart, checkout) through the Storefront contract, give products and categories real URLs with dynamic templates, and wrap host pages (cart, account, checkout, lesson player) in the FilamentCraft site shell. Use this whenever the task involves a shop, catalog, products, collections, courses or events on a FilamentCraft site, implementing or debugging `FilamentCraft\\Commerce\\Contracts\\Storefront`, `Catalog`, `dynamicTemplates`, `DynamicTemplateDefinition`, `#[Storefront]`, `<x-filamentcraft::layout>`, product SEO or JSON-LD, or migrating an e-commerce site (WooCommerce, Shopify) onto FilamentCraft."
license: MIT
metadata:
  author: filamentcraft
---

# FilamentCraft storefront

## The model

FilamentCraft never stores products. Products, prices, stock and orders stay in the host app's own tables. Commerce sections read them through one adapter class implementing `FilamentCraft\Commerce\Contracts\Storefront`. So:

- **Never put catalog data in section settings.** A product carousel holds a *query* (collection, category, limit), not products.
- **Moving a shop onto FilamentCraft** means keeping (or importing) the catalog in host models, writing the adapter, and building the pages around it. It never means copying products into pages.
- Without an adapter, the default `NullStorefront` renders empty states, and its `placeOrder()` pretends to succeed. A checkout that "works" with no adapter bound proves nothing.

## Workflow

1. **Read the host's models first.** Find the product, category and order models, their columns, relationships and **local scopes**, and reuse those scopes in the adapter instead of raw `where()` chains. Note how prices are stored (decimal vs integer cents) and how images are stored (disk path vs URL).
2. **Write the adapter** in `app/Storefront/EloquentStorefront.php`. The full annotated example is in [references/adapter.md](references/adapter.md).
3. **Bind it** in `AppServiceProvider::boot()`:
   ```php
   $this->app->singleton(\FilamentCraft\Commerce\Contracts\Storefront::class, \App\Storefront\EloquentStorefront::class);
   ```
   There is no config key or plugin method for this binding.
4. **Give products and categories URLs** with a dynamic template, so one published page serves every product ([references/dynamic-pages.md](references/dynamic-pages.md)):
   ```php
   FilamentCraftPlugin::make()->dynamicTemplates([
       DynamicTemplateDefinition::make('product.show')
           ->path('shop/{product}')
           ->templateSlug('product')
           ->bind('product', fn (Site $site, string $slug): ?object => Product::query()->where('slug', $slug)->first()),
   ]);
   ```
5. **Create the store pages**, each a normal page holding the matching section: `shop` (product-listing), `product` (product-detail; the template the definition above renders), `cart` (cart), `checkout` (checkout), plus product-carousel, category-grid and store-hero wherever they fit. Build them in the editor, or in code so they are reproducible: a page blueprint (a class extending `FilamentCraft\Blueprints\AbstractBlueprint` whose sections come from `BlueprintSection::fromPreset(ProductListingSection::class, 'modern')->settings([...])`) seeded with `app(\FilamentCraft\Blueprints\BlueprintSeeder::class)->seedOne($site, $blueprint, publish: true)`, skipping slugs that already exist. Add the shop and cart to the header with `app(\FilamentCraft\Support\HeaderMenu::class)->addPage($site, $page)`. A whole new site can instead come from a JSON site spec (`php artisan filamentcraft:import site.json`, see the filamentcraft-site-migration skill).
   - The product template page is also reachable at its own slug and shows the first product. Pick a slug no existing link uses (check the header: starter sites link `/product` to a marketing page), and keep it noindex.
6. **Decide who owns checkout** ([references/cart-and-checkout.md](references/cart-and-checkout.md)). Either use the built-in session cart and cash-on-delivery checkout, which call your `placeOrder()`, or keep the host's checkout or payment provider and point `url('checkout')` at it.
7. **Verify**: `php artisan filamentcraft:doctor` (it warns when published pages use commerce sections but no adapter is bound), unit-test the adapter, then in a browser open the shop, filter, open a product, add to cart, change the quantity and place an order. Confirm the order row exists in the host table.

## Adapter rules that matter

- **Prices are integer minor units** (`priceMinor: 1999` for 19.99). Convert decimals with `(int) round($price * 100)`. Use `MoneyFormatter::toMinor()` for strings.
- **`url()` must return root-relative paths** (`/shop/linen-shirt`, `/cart`). The cart's redirect after add-to-cart only follows paths starting with `/`; an absolute URL falls back to "back".
- **Set `ProductData::$url`** for every product. Cards link with it, and the product page's canonical URL and JSON-LD use it.
- **Set `currencyCode`** (ISO 4217) unless the shop is USD. JSON-LD otherwise guesses from the symbol and maps `$` to USD.
- **`products()` must honour `collection`** (`all`, `featured`, `new`, and any custom collection you register), `categorySlug` and `limit`. Product listing filters also send `sort` (`price-asc`, `price-desc`, `rating`, else featured), `minMinor`/`maxMinor` and `search`. Unknown collections should behave like `all`.
- **`variants` are option names only** (strings). There is no per-variant price, SKU or stock; the cart rejects a variant that isn't in the list.
- **`placeOrder()` re-reads every price** from the database inside a transaction (never trust the cart), writes the host's order, and returns `OrderResult::failed()` when nothing resolves.
- **Image URLs** must be absolute or root-relative. Resolve storage paths with `Storage::disk('public')->url($path)`.
- Optional `meta` keys feed SEO: `sku`, `mpn`, `gtin`, `brand`, `updated_at` (sitemap lastmod), `price_valid_until`.

## Caching

`category-grid`, `product-carousel`, `product-listing`, `product-detail`, `store-hero`, `cart` and `checkout` opt out of the fragment cache, so catalog changes show immediately. If you write your own section that reads the catalog, return `cacheable(): false` too.

## More than products

Courses, events, rooms and similar listings each get their own `Catalog` (same read methods, plus `key()` and `label()`), registered with `->catalogs([CourseCatalog::class])` or `filamentcraft.commerce.catalogs`. Product sections then show a "Catalog" picker. Custom carousel collections come from `->catalogCollections(['sale' => 'On sale'])`; the key reaches `products()` as `$query->collection`. Reskin product cards everywhere with `filamentcraft.commerce.card_view`. Details are in [references/adapter.md](references/adapter.md).

## Host pages in the site shell

Pages that aren't FilamentCraft templates (account, order history, a custom checkout, a lesson player) can still wear the site's header, footer, fonts and colors. There are four ways in: `#[\FilamentCraft\Attributes\Storefront]` on a full-page Livewire component, `Route::filamentCraftStorefront()`, Folio, or wrapping any Blade view in `<x-filamentcraft::layout>`. See [references/dynamic-pages.md](references/dynamic-pages.md).

## Done means

- `filamentcraft:doctor` is green with the store pages published, and `app(\FilamentCraft\Commerce\Contracts\Storefront::class)` resolves to your adapter.
- A Pest test covers the adapter: `products()` per collection, `product()` hit and miss, `url()` shapes, and `placeOrder()` creating an order at database prices.
- The shop, a product page, a category filter, the cart and checkout work in a real browser. Unknown product URLs return 404, and the product page source has Product JSON-LD with the right currency.
