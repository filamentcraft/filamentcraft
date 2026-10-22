---
name: filamentcraft-site-migration
description: "Migrate an existing website the user owns (WordPress, Shopify, WooCommerce, Webflow, Wix, Squarespace, static HTML, another Laravel/Blade app, a React/Vue/Next SPA) into FilamentCraft as editable sections, with the same content, a matching look, preserved SEO and 301 redirects. Use this whenever the user wants to import, move, convert, rebuild, clone or \"make editable\" a current site in FilamentCraft, even if they only paste a URL and say \"put this into FilamentCraft\" or \"can I import my site?\". Covers crawling, design-token extraction, mapping page blocks to built-in or custom sections, building a JSON site spec, importing it with `filamentcraft:import`, visual and text verification against the original, and e-commerce catalogs."
license: MIT
metadata:
  author: filamentcraft
---

# Migrate a site into FilamentCraft

The goal: the user's current site, rebuilt as a FilamentCraft site whose every word, image, link and setting is editable in the visual editor, that looks like the original, and that keeps its URLs and SEO.

You do this in phases. Each phase writes files under `.fc-migration/` in the Laravel app, so the work is resumable and reviewable. Read the screenshots and JSON from disk one page at a time instead of loading everything into context.

Related skills: **filamentcraft-setup** (install first), **filamentcraft-sections** (custom sections), **filamentcraft-theming** (matching the look), **filamentcraft-storefront** (shops).

## Phase 0: rights, target and scope

1. **Ownership.** Ask: "Do you own this site, or have the owner's permission to migrate it?" Continue only on yes. Don't rebuild a third party's site, login or checkout pages, or brand. Using another site only as loose inspiration is fine, without copying its text, logos or photos.
2. **Target.** FilamentCraft must be installed and `php artisan filamentcraft:doctor` green (filamentcraft-setup skill). Note the site owner model, if any; the import needs `--owner=Model:key` when the app has tenancy.
3. **Scope.** Agree on the page budget, which languages to bring, whether a shop is involved, and whether the user has better sources than the public HTML: the repository (Blade app), a WordPress login or export, a Shopify theme download, a Webflow export. A real source beats scraping. See [references/platforms.md](references/platforms.md).

Finish when: ownership confirmed, target app ready, scope written to `.fc-migration/plan.md`.

## Phase 1: discover

```bash
mkdir -p .fc-migration && echo '{"private": true}' > .fc-migration/package.json
npm i -D --prefix .fc-migration playwright pixelmatch pngjs && npx --prefix .fc-migration playwright install chromium
node <skill>/scripts/crawl.mjs --url=https://old-site.example --max-pages=60 --out=.fc-migration/crawl
node <skill>/scripts/fetch-assets.mjs --crawl=.fc-migration/crawl --out=.fc-migration/assets
```

`<skill>` is this skill's directory, e.g. `vendor/filamentcraft/filamentcraft/resources/boost/skills/filamentcraft-site-migration` or the copy your agent installed. Run the scripts from the app root: they find Playwright in the app's own `node_modules` or in `.fc-migration`.

You get:

- `crawl/inventory.json`: every URL with status, title and description, plus `templateGroups`, which clusters pages by URL pattern and structure.
- `crawl/pages/<slug>/`: `page.json` (SEO tags, navigation, `sections[]` with headings, paragraphs, buttons, images, repeated items and cleaned `html`), `full-<width>.png`, and `section-NN.png` crops.
- `crawl/tokens.json`: computed colors, fonts, radii, container widths, h1/h2/body/button styles, CSS variables.
- `assets/assets.json`: each image's source URL, local file, alt text and host.

Finish when: you know every page type (expect 5–15 even on big sites), which page represents each type, and the platform.

## Phase 2: plan the mapping

Get the installed catalog: `php artisan filamentcraft:sections --json > .fc-migration/sections.json`, and `php artisan filamentcraft:sections <slug>` for one section's exact fields. For every source section on each representative page, pick a FilamentCraft section using [references/section-mapping.md](references/section-mapping.md):

- **Prefer a built-in section with the matching role** (hero, features, testimonials, pricing, faq, stats, logo-cloud, team, gallery, image-text, cta, contact, rich-text…). A small visual difference is fine; the theme handles color, type and radius.
- **Repeated cards or items become blocks** of that section, never separate sections and never numbered fields.
- **Only when nothing fits** (a distinctive layout the site is known for, or data-driven content) write a custom section with the filamentcraft-sections skill, schema first and every string a setting. Expect zero to three per site.
- **Header and footer** become the `header` and `footer` regions: nav links as `nav-link` blocks, footer links as `link` blocks.
- **Repeated content types** (blog posts, products, team members, locations) stay data. Products go through the Storefront adapter. A blog or directory with hundreds of entries belongs in host models with a dynamic template, not hundreds of hand-made pages; migrate the representative pages and ask before bulk-creating.
- **Third-party embeds** (Calendly, Typeform, maps, chat widgets) are listed for the user, not rebuilt.

Write the mapping into `.fc-migration/plan.md`: one table per page type (source section, then FilamentCraft type, preset if any, notes), the custom sections to build, and open questions. For large or ambiguous sites, show the plan to the user before building.

## Phase 3: theme

Translate `tokens.json` into site settings using the filamentcraft-theming skill: a complete 22-token `brand` scheme with good contrast, written onto `modern` too (built-in sections pin `modern`), fonts as Bunny slugs, radius, container width and section spacing. In a site spec these all go under `settings` (see below). Pick a dark scheme only when the source site is dark throughout. Check font licensing: Google fonts are fine, but Typekit/Adobe and commercial foundries need the user's confirmation or an open substitute.

## Phase 4: custom sections

Build only the ones the plan lists (filamentcraft-sections skill). Each gets its schema, view, four presets and a test, and the class checker passes. They live in `app/Sections` and appear in `filamentcraft:sections` once registered.

## Phase 5: write the site spec

Create `.fc-migration/site.json`, a plain description of the whole site that `filamentcraft:import` validates against the installed sections and turns into a real site. The full format is in [references/site-spec.md](references/site-spec.md); a page looks like this:

```json
{
  "name": "Harbor Bakery",
  "default_locale": "en",
  "settings": { "color_scheme": "brand", "schemes": { "brand": { "background": "#fffaf3", "on-background": "#2b1d14", "primary": "#b45309", "on-primary": "#ffffff" } }, "default_font": "inter", "heading_font": "playfair-display" },
  "media": [{ "file": "assets/3f9a1c2e.jpg", "alt": "Loaves cooling on the counter" }],
  "pages": [{
    "name": "Home", "slug": "home", "homepage": true,
    "seo": { "title": "Harbor Bakery | Sourdough by the sea", "description": "…" },
    "sections": [
      { "type": "hero", "settings": { "heading": "Sourdough by the sea", "subheading": "…", "bg_image": "assets/3f9a1c2e.jpg", "cta_label": "Order now", "cta_url": "/order" } },
      { "type": "testimonials", "settings": { "title": "Neighbours say" }, "blocks": [
        { "type": "quote", "settings": { "quote": "Best croissant in town.", "name": "Sam R." } }
      ] }
    ]
  }],
  "regions": { "header": [], "footer": [] },
  "redirects": [{ "from": "/about-us.html", "to": "/about" }]
}
```

Rules:

- **Every string comes from the crawl** (`page.json` headings, paragraphs, buttons, repeated items, `html`), never invented and never retyped from a screenshot. Screenshots are for layout only. If something is missing (an alt text, a button label), leave it empty and list it for the user.
- **Fill every visible field.** Text, link and image fields you don't set are stored empty, so no FilamentCraft placeholder copy leaks onto the page. That is the default `"defaults": "design"` mode. Look at `section-NN.png` to set layout options (columns, alignment, media position) to match.
- **Images** are paths relative to `site.json`, usually `assets/<file>` from `assets.json`. The importer copies them into the site's media library and fills alt text from `media[]`. It accepts jpg, png, webp, gif and avif; SVGs are rasterised by `fetch-assets.mjs` when Playwright is present.
- **Copy small print exactly.** Keep inline labels ("Phone:", "Email:", "From $"), and copy `tel:`, `mailto:` and external hrefs character for character (`tel:+16035550142`, not a reformatted number). These are the strings visitors and parity checks notice first.
- **Keep the URLs.** Use each page's old path as its slug when you can (`about`, `services/web-design`), so no redirect is needed. Map everything else in `redirects`. See [references/seo-and-redirects.md](references/seo-and-redirects.md).
- **Carry SEO**: title, description and `og_image` per page, translations under `translations`, site-wide defaults in `settings.seo`.

(A real spec lists all 22 tokens and copies `brand` onto `modern`, as Phase 3 says.)

Then validate until clean, and import:

```bash
php artisan filamentcraft:import .fc-migration/site.json --dry-run
php artisan filamentcraft:import .fc-migration/site.json --owner="App\Models\Team:1"
```

`--dry-run` lists unknown section or block types, setting ids that aren't in the schema, option values that aren't allowed, and missing images. Fix every error and warning. The import creates a **new draft site** and never touches existing sites. Pages whose `publish` isn't false are published within it. Add `--live` only when the user wants it served immediately. To redo, re-import and delete the old draft (ask first), or use `--replace=<site>` after confirming.

## Phase 6: verify and repair

For each representative page, compare the original with the rebuild:

```bash
node <skill>/scripts/visual-diff.mjs --before=https://old-site.example/about --after=http://app.test/about --viewports=1440,390 --out=.fc-migration/diff
```

It gates on **text parity** (90% by default), **missing headings** and **horizontal overflow**, and reports links that disappeared plus a pixel-mismatch figure. The pixel number is informational, because the FilamentCraft theme deliberately renders the same content with its own components. **Look at the before, after and diff images yourself.** Then fix the biggest gap first: wrong section type, missing items, wrong layout option, wrong scheme, missing image. Fix it in `site.json` and re-import into a fresh draft, or edit the imported pages in the editor. Repeat until every page passes or the remaining differences are deliberate and written down.

Draft sites aren't served publicly. Preview them from the editor, mark the site live on a local or staging copy (`--live`), or point the diff at a staging URL.

Serving the rebuild locally, check these before blaming the import:

- **Images 404 or point at the wrong host:** `APP_URL` must match the host and port you browse, and `public/storage` must link to this app's `storage/app/public` (`php artisan storage:link --force`).
- **Another site answers instead of yours:** with several live sites, the request host decides. Give the new site the host you serve it on rather than taking other sites down: `php artisan tinker --execute='FilamentCraft\Models\Site::query()->findOrFail(7)->update(["domain" => "127.0.0.1"]);'` (the id the import printed, `#7`). Ask before changing any site you didn't create.
- **`/robots.txt` is Laravel's stock file:** a static `public/robots.txt` hides FilamentCraft's generated one (and its sitemap line). `filamentcraft:doctor` warns about it; ask before deleting it.

Also check: every page at 390px wide (nav collapses, nothing overflows), RTL pages for Arabic or Hebrew, and that every header and footer link resolves.

## Phase 7: SEO and go-live

Work through [references/seo-and-redirects.md](references/seo-and-redirects.md): every old URL from the inventory must answer 200, or 301 to a 200, on the new site in one hop. Titles, descriptions, canonicals and hreflang must carry over, and the sitemap must list the new pages. Then hand over a go-live checklist: domain on the site, DNS, `markLive` or `--live`, the Search Console address change if the domain changes, and keeping the redirects for at least a year.

## Phase 8: report

Write `.fc-migration/report.md`: pages migrated (old URL, new URL, status), sections per page, custom sections created, anything left out (embeds, forms, dynamic features) and why, assets flagged for licensing, strings left empty, visual-diff results, and next steps. Summarise it for the user.

## Shops

The catalog is data, not page content. Products, variants, categories and images go into the host app's models through a normal importer, read by the Storefront adapter (filamentcraft-storefront skill). Then build shop, product, cart and checkout pages from the commerce sections, with product URLs from a dynamic template. Redirect old product and collection URLs, including Shopify's `/collections/x/products/y` duplicates. Customers and orders move only through the platform's own authenticated export.
