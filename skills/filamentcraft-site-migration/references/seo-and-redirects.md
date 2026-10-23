# SEO and redirects

Search rankings survive a migration when every old URL still answers, in one hop, with equivalent content and metadata.

## Build the URL map

1. Take every URL from `crawl/inventory.json`, plus the user's analytics or Search Console top pages and any existing redirect export. Crawls miss pages that nothing links to.
2. For each old URL choose the new path:
   - **Same path** whenever possible: give the new page the old path as its slug (`about`, `services/web-design`). Nothing to redirect.
   - Otherwise map by pattern (`/2023/05/post-slug/` → `/blog/post-slug`, `/products/:h` → `/shop/:h`), then by slug match, then by title. Low-confidence matches go to the user.
   - Never send unrelated pages to the homepage, and never chain redirects.
3. Put the result in the spec's `redirects`. Include old variants that rank: `.html` paths, trailing-slash forms the old server answered, Shopify `/collections/x/products/y`, pagination and feed URLs you won't rebuild.

Redirect facts: matched exactly against the request path without its leading slash and without the query string, case-sensitive. The query string is carried to the target. A published page at the same path wins over a redirect. Percent-encoded legacy paths must be stored encoded.

## Metadata per page

Carry into each page's `seo`:

| From the crawl (`page.json` → `seo`) | Spec |
|---|---|
| `<title>` | `title`, copied whole: it is used exactly as written (the site's `title_suffix` only applies to pages without an SEO title) |
| meta description | `description` |
| `og:image` | `og_image` (download it with the assets) |
| canonical, if it pointed elsewhere on purpose | `canonical` (a page whose canonical points elsewhere leaves hreflang and the sitemap) |
| robots `noindex` | `indexable: false` |
| hreflang alternates | pair translations by these, then add them under `translations` |

Site-wide: `settings.seo` with `title_suffix`, `description`, `og_image`, `org_logo`, `social` profile URLs.

Structured data: FilamentCraft emits Organization/WebSite JSON-LD and Product JSON-LD on product pages itself. Hand-written JSON-LD from the old site (FAQ, events, recipes) needs a custom section or a head script; list it in the report.

## Check before go-live

With the new site reachable (live locally or on staging):

```bash
# every old path answers 200, or one redirect to a 200
node -e 'for (const p of require("./.fc-migration/crawl/inventory.json").pages) { const u = new URL(p.url); console.log(u.pathname + u.search); }' | while read -r pp; do
  curl -s -o /dev/null -w "%{http_code} %{redirect_url} $pp\n" "http://app.test$pp"
done
```

Then check the redirect targets themselves return 200, `/sitemap.xml` lists the new pages, each page's `<title>`, description and canonical match the plan (view source or the visual-diff output), and `php artisan filamentcraft:doctor` shows no SEO failures.

## Go-live checklist for the user

- Point the domain at the app and set it on the site (`domain` field), then mark the site live.
- Keep the redirects for at least a year; ideally forever.
- Same domain: submit the new sitemap in Search Console. New domain: also use Search Console's change-of-address tool.
- Watch 404s in the server logs for a few weeks and add redirects for anything missed.
