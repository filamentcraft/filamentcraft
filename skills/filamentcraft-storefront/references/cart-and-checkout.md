# Cart and checkout

## Option 1: the built-in cart and checkout

The `cart` and `checkout` sections use a session cart (one per site) and post to package routes that are always registered (`web` plus `throttle:60,1`, prefix `filamentcraft/cart`):

| Route | Fields |
|---|---|
| `filamentcraft.cart.add` | `slug`, `catalog`, `variant`, `qty` (1–99), `store`, `return` |
| `filamentcraft.cart.update` | `key`, `qty` (0 removes), `store`, `return` |
| `filamentcraft.cart.remove` | `key`, `store`, `return` |
| `filamentcraft.cart.checkout` | `name`, `email`, `phone`, `address`, `city`, `postal`, `country`, `note`, plus signed shipping fields |

Facts to rely on:

- Cart lines store slug, variant, quantity and catalog only, never a price. Prices are re-read from the catalog on every request, and `placeOrder()` must re-read them again.
- Checkout is cash on delivery: it calls your `placeOrder()` and shows the confirmation (`?placed={number}`). No payment is captured. For card payments, use option 2, or integrate payment inside `placeOrder()` and your own confirmation flow.
- Shipping comes from the checkout section's `shipping_flat` and `free_threshold` settings. The form carries an HMAC signature over those values, the store, the site, the catalogs and an expiry (24 hours), keyed on `APP_KEY`. Rotating `APP_KEY` invalidates open checkout forms.
- `return` only accepts root-relative paths, which is why `Storefront::url()` must return them.
- Checkout refuses requests coming from the editor preview, empty carts and out-of-stock lines.
- Browser events: `filamentcraft:cart-updated` (`{count, store}`) and `filamentcraft:toast`. Elements with `[data-fc-cart-count]` update automatically.

If you build your own checkout form against `filamentcraft.cart.checkout`, reproduce every hidden field the built-in view sends:

```blade
@csrf
<input type="hidden" name="store" value="{{ $storeKey }}">            {{-- the site's slug --}}
<input type="hidden" name="return" value="{{ $returnPath }}">
<input type="hidden" name="shipping_flat" value="{{ $flat }}">
<input type="hidden" name="free_threshold" value="{{ $threshold }}">
<input type="hidden" name="site" value="{{ $site->getKey() }}">
<input type="hidden" name="shipping_expires" value="{{ $expires = \FilamentCraft\Commerce\ShippingSignature::expiry() }}">
<input type="hidden" name="shipping_sig" value="{{ \FilamentCraft\Commerce\ShippingSignature::sign($flat, $threshold, $storeKey, (string) $site->getKey(), app(\FilamentCraft\Commerce\CartService::class)->catalogKeys($storeKey), $expires) }}">
```

## Option 2: the host keeps checkout

When the shop already has a checkout (Cashier, Stripe Checkout, Paddle, a Shopify-hosted checkout):

- Return the host's URLs from `url('cart')` / `url('checkout')`, and leave the `cart`/`checkout` sections off your pages (or use only `cart`).
- To keep the host's cart page but give it the site's look, wrap it with `<x-filamentcraft::layout>` (see dynamic-pages.md).
- Make `placeOrder()` return `OrderResult::failed()` so the built-in flow can never create orphan orders.
- Add-to-cart buttons (on `product-listing` cards and the `product-detail` section) post to the package cart. For the host's own cart, either point `filamentcraft.commerce.card_view` at a card that posts to your route and customize `product-detail` (`filamentcraft:customize-section product-detail --replace --copy-view`), or keep the package cart and send its checkout button to your checkout.

## Migrating a shop

- Products, variants, categories and images go into host models with a normal importer: a seeder or command reading the old platform's export (WooCommerce CSV, Shopify `products.json` pages, the Admin API). Keep handles as slugs and prices as integer cents.
- Customers and orders move only through the platform's authenticated export, by the owner, into the host's tables. Never scrape them.
- Map every old product and collection URL to its new path in the site's redirects (the filamentcraft-site-migration skill covers the redirect map).
