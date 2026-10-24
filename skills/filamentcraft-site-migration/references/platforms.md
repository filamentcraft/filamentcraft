# Getting content out of the old platform

Golden rule: take **content** from the best structured source available, and the **look** from the rendered page (crawl screenshots and `tokens.json`). `crawl.mjs` prints the detected platform.

| Source | Best content route |
|---|---|
| Repository access (Laravel/Blade, static, SPA source) | read the source: Blade partials and components are the section boundaries, `@foreach` loops are blocks, `php artisan route:list --json` is the URL inventory |
| WordPress | REST API, or an XML export (WXR) |
| Shopify | theme files plus the public JSON endpoints |
| Webflow | code export plus CMS CSV export |
| Next/Nuxt/React SPA | hydration data or the headless CMS behind it |
| Wix, Squarespace, anything else | the rendered DOM (the crawl) |

## WordPress

- `GET /wp-json/wp/v2/pages?per_page=100&page=N` (also `/posts`, `/media`, `/categories`, custom types listed at `/wp-json/wp/v2/types`). Read `X-WP-TotalPages` for pagination. Trim payloads with `_fields=id,slug,link,title,content,excerpt,featured_media,parent,menu_order,yoast_head_json`, and add `_embed` for media.
- `content.rendered` is final HTML. With an Application Password, `?context=edit` returns raw block markup (`<!-- wp:cover {...} -->`), which is the best possible section signal (see the Gutenberg aliases in section-mapping.md).
- SEO: Yoast's `yoast_head_json` (title, description, canonical, og, schema); Rank Math via `/wp-json/rankmath/v1/getHead?url=`.
- Menus: `/wp-json/wp/v2/menu-items` (needs auth), or the crawl's `navigation`.
- Page builders: Elementor sections show as `.elementor-section` / `.e-con` in the DOM; Divi as `.et_pb_section`.
- Existing redirects (Redirection plugin, Yoast Premium): ask the user for a CSV export and merge it into the redirect map.
- REST disabled? Tools → Export (WXR) has posts, pages, terms and attachment URLs.

## Shopify

- Products: `/products.json?limit=250&page=N` until an empty page (also `/collections.json`, `/collections/<handle>/products.json`, `/products/<handle>.js` for full variants). Some stores disable these; then use the Admin API with the owner's token or the Products CSV export.
- Theme: if the owner can download the theme (`shopify theme pull`, or Online Store → Themes → Download), parse `templates/*.json`. These are ordered typed sections with settings and blocks, the same model as FilamentCraft. `config/settings_data.json` holds the colors and fonts. This beats scraping.
- Without theme files, the DOM keeps `.shopify-section` wrappers whose ids name the section type.
- URLs: `/products/:handle`, `/collections/:handle`, `/collections/:c/products/:handle` (duplicate of the product URL), `/pages/:handle`, `/blogs/:blog/:article`, `/policies/*`. Checkout stays on Shopify unless the owner moves payments.

## Webflow

- The code export (paid plans) has static HTML/CSS but no CMS items. Export each CMS collection as CSV from the Designer. Image fields are Webflow CDN URLs, so download them now; they die with the project.
- Sections are top-level `.section` / `[data-w-id]` elements.

## SPAs (React, Vue, Next, Nuxt)

- The crawler renders with Playwright, so the DOM is complete. Content is often cleaner in `__NEXT_DATA__`, `window.__NUXT__` or the JSON the page fetches; prefer that for long text.
- If a headless CMS (Contentful, Sanity, Strapi) feeds the site, migrate from its API with the owner's token.
- Client-only routes may be missing from the sitemap. Click through the navigation, or read the router manifest.
- A truly interactive widget (configurator, calculator) can be kept as a React/Vue island section instead of rebuilt (filamentcraft-sections, interactive reference).

## Another Laravel app

- Usually the same codebase is gaining FilamentCraft. Read `resources/views`: each `@include`/component in a page is a candidate section, and its variables are the settings.
- Data-driven pieces (latest posts, products, team from the database) stay queries: a custom section that reads the model, or a dynamic template, never a copy of the rows.
- Keep the app's routes for anything dynamic (dashboard, account, checkout), and wrap them in the site shell (filamentcraft-storefront, dynamic pages reference) so they share the new header and footer.

## Forms, embeds, scripts

- Name/email/message forms map to `contact`; other forms map to `form` with one field block per input. Payment, multi-step or logic-heavy forms stay the host's own. List the fields for the user.
- Calendly, Typeform, HubSpot forms, maps and chat widgets: list them, don't rebuild them. A custom section can embed them if the user wants.
- Analytics and tag managers belong in the layout (`fc-head` stack or `filamentcraft.assets.extra_scripts`), not in sections.
