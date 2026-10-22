# Storefront adapter

## Contents
- The contract and data objects
- A complete adapter
- Testing it
- Extra catalogs, collections, card view

## Contract

```php
namespace FilamentCraft\Commerce\Contracts;

interface Storefront
{
    /** @return Collection<int, ProductData> */
    public function products(CatalogQuery $query): Collection;   // Illuminate\Support\Collection
    public function product(string $slug): ?ProductData;
    /** @return Collection<int, CategoryData> */
    public function categories(?int $limit = null): Collection;
    public function category(string $slug): ?CategoryData;
    /** @param array<string, string> $params */
    public function url(string $name, array $params = []): string;   // home, shop, cart, checkout, product[slug], category[slug]; '#' otherwise
    /** @param list<array{slug: string, variant: string|null, qty: int, catalog: string}> $lines */
    public function placeOrder(array $lines, CustomerDetails $customer): OrderResult;
}
```

Data objects in `FilamentCraft\Commerce\Data`, all readonly with named arguments:

| Class | Fields |
|---|---|
| `CatalogQuery` | `collection` (`all`), `categorySlug`, `sort` (`featured`), `minMinor`, `maxMinor`, `search`, `limit`, `tag`, `brand` |
| `ProductData` | required `slug`, `title`, `priceMinor`; optional `compareMinor`, `currencySymbol` (`$`), `symbolPosition` (`before`/`after`), `images` (list of URLs), `categoryName`, `categorySlug`, `rating`, `reviews`, `description`, `variants` (list of names), `attributes` (name ⇒ value), `inStock`, `isNew`, `isFeatured`, `url`, `currencyCode`, `meta` |
| `CategoryData` | `slug`, `name`, `image`, `count`, `url`, `meta` |
| `CustomerDetails` | `name`, `email`, `phone`, `address`, `city`, `postal`, `country`, `note`, `shippingMinor` (computed by the server) |
| `OrderResult` | `number`, `totalMinor`, `itemCount`, `placed`; `OrderResult::failed()` |

`ProductData` helpers the sections use: `onSale()`, `savePercent()`, `primaryImage()`, `badge()`.

## A complete adapter

Adjust it to the host's real schema. Replace the `where()` calls with the models' own scopes when they exist (`Product::query()->featured()`).

```php
<?php

declare(strict_types=1);

namespace App\Storefront;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use FilamentCraft\Commerce\Contracts\Storefront;
use FilamentCraft\Commerce\Data\CatalogQuery;
use FilamentCraft\Commerce\Data\CategoryData;
use FilamentCraft\Commerce\Data\CustomerDetails;
use FilamentCraft\Commerce\Data\OrderResult;
use FilamentCraft\Commerce\Data\ProductData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class EloquentStorefront implements Storefront
{
    public function products(CatalogQuery $query): Collection
    {
        return Product::query()
            ->with('category')
            ->when($query->collection === 'featured', fn (Builder $q) => $q->where('is_featured', true))
            ->when($query->collection === 'new', fn (Builder $q) => $q->latest())
            ->when($query->categorySlug, fn (Builder $q, string $slug) => $q->whereRelation('category', 'slug', $slug))
            ->when($query->minMinor !== null, fn (Builder $q) => $q->where('price', '>=', $query->minMinor / 100))
            ->when($query->maxMinor !== null, fn (Builder $q) => $q->where('price', '<=', $query->maxMinor / 100))
            ->when($query->search, fn (Builder $q, string $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($query->sort === 'price-asc', fn (Builder $q) => $q->orderBy('price'))
            ->when($query->sort === 'price-desc', fn (Builder $q) => $q->orderByDesc('price'))
            ->when($query->limit, fn (Builder $q, int $limit) => $q->limit($limit))
            ->get()
            ->map(fn (Product $product): ProductData => $this->toData($product))
            ->values();
    }

    public function product(string $slug): ?ProductData
    {
        $product = Product::query()->with('category')->where('slug', $slug)->first();

        return $product === null ? null : $this->toData($product);
    }

    public function categories(?int $limit = null): Collection
    {
        return Category::query()
            ->withCount('products')
            ->when($limit, fn (Builder $q, int $limit) => $q->limit($limit))
            ->get()
            ->map(fn (Category $category): CategoryData => new CategoryData(
                slug: $category->slug,
                name: $category->name,
                image: $this->imageUrl($category->image),
                count: (int) $category->products_count,
                url: $this->url('category', ['slug' => $category->slug]),
            ))
            ->values();
    }

    public function category(string $slug): ?CategoryData
    {
        return $this->categories()->firstWhere('slug', $slug);
    }

    public function url(string $name, array $params = []): string
    {
        return match ($name) {
            'home' => '/',
            'shop' => '/shop',
            'cart' => '/cart',
            'checkout' => '/checkout',
            'product' => '/shop/'.rawurlencode($params['slug'] ?? ''),
            'category' => '/shop?category='.urlencode($params['slug'] ?? ''),
            default => '#',
        };
    }

    public function placeOrder(array $lines, CustomerDetails $customer): OrderResult
    {
        return DB::transaction(function () use ($lines, $customer): OrderResult {
            $items = [];

            foreach ($lines as $line) {
                $product = Product::query()->where('slug', $line['slug'])->lockForUpdate()->first();

                if ($product === null) {
                    continue;
                }

                $unit = (int) round((float) $product->price * 100);
                $items[] = ['product_id' => $product->id, 'variant' => $line['variant'], 'qty' => $line['qty'], 'unit_price' => $unit];
            }

            if ($items === []) {
                return OrderResult::failed();
            }

            $subtotal = array_sum(array_map(fn (array $item): int => $item['unit_price'] * $item['qty'], $items));

            $order = Order::query()->create([
                'number' => 'ORD-'.Str::upper(Str::random(8)),
                'customer_name' => $customer->name,
                'customer_email' => $customer->email,
                'customer_phone' => $customer->phone,
                'shipping_address' => trim("{$customer->address}, {$customer->postal} {$customer->city}, {$customer->country}", ' ,'),
                'note' => $customer->note,
                'subtotal' => $subtotal,
                'shipping' => $customer->shippingMinor,
                'total' => $subtotal + $customer->shippingMinor,
            ]);
            $order->items()->createMany($items);

            return new OrderResult(
                number: $order->number,
                totalMinor: $order->total,
                itemCount: array_sum(array_column($items, 'qty')),
            );
        });
    }

    private function toData(Product $product): ProductData
    {
        return new ProductData(
            slug: $product->slug,
            title: $product->name,
            priceMinor: (int) round((float) $product->price * 100),
            compareMinor: $product->compare_at_price ? (int) round((float) $product->compare_at_price * 100) : 0,
            currencySymbol: '€',
            images: array_values(array_filter(array_map($this->imageUrl(...), (array) $product->images))),
            categoryName: $product->category?->name ?? '',
            categorySlug: $product->category?->slug ?? '',
            description: (string) $product->description,
            inStock: (bool) $product->in_stock,
            isFeatured: (bool) $product->is_featured,
            url: $this->url('product', ['slug' => $product->slug]),
            currencyCode: 'EUR',
            meta: ['sku' => $product->sku, 'updated_at' => $product->updated_at?->toAtomString()],
        );
    }

    private function imageUrl(mixed $path): string
    {
        if (! is_string($path) || $path === '') {
            return '';
        }

        return Str::startsWith($path, ['http://', 'https://', '/']) ? $path : Storage::disk('public')->url($path);
    }
}
```

## Testing it

```php
it('maps products and urls', function (): void {
    $product = Product::factory()->create(['slug' => 'linen-shirt', 'price' => 49.90, 'is_featured' => true]);
    $store = app(Storefront::class);

    expect($store)->toBeInstanceOf(EloquentStorefront::class)
        ->and($store->product('linen-shirt')->priceMinor)->toBe(4990)
        ->and($store->product('missing'))->toBeNull()
        ->and($store->products(CatalogQuery::featured())->pluck('slug')->all())->toContain('linen-shirt')
        ->and($store->url('product', ['slug' => 'linen-shirt']))->toBe('/shop/linen-shirt');
});

it('prices orders from the database, not the cart', function (): void {
    Product::factory()->create(['slug' => 'mug', 'price' => 12.00]);

    $result = app(Storefront::class)->placeOrder(
        [['slug' => 'mug', 'variant' => null, 'qty' => 2, 'catalog' => 'products']],
        new CustomerDetails(name: 'Ana', email: 'ana@example.com', phone: '1', address: 'Main St 1', city: 'Lisbon', shippingMinor: 500),
    );

    expect($result->placed)->toBeTrue()->and($result->totalMinor)->toBe(2900);
});
```

## Extra catalogs

For courses, events, rooms and similar: implement `FilamentCraft\Commerce\Contracts\Catalog`. It has `key()`, `label()`, `items(CatalogQuery)`, `item($slug)`, `categories()`, `category()` and `url()`, and no `placeOrder()`.

```php
FilamentCraftPlugin::make()->catalogs([CourseCatalog::class]);
// or config('filamentcraft.commerce.catalogs')
```

- The bound Storefront is always the `products` catalog. Product sections show a "Catalog" picker once there is more than one.
- `->catalogCollections(['sale' => 'On sale', 'gifts' => fn () => __('Gifts')])` adds choices to the carousel's "Show" picker. The key arrives as `$query->collection`.
- `config('filamentcraft.commerce.card_view')` points at a Blade view that replaces every product card. It receives `$product`, `$locale`, `$storeKey`, `$cartUrl`, `$showAdd` and `$catalogKey`, and falls back to the built-in card if the view is missing.
