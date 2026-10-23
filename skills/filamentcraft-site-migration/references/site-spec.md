# JSON site spec

`php artisan filamentcraft:import path/to/site.json` builds a complete site from this file. It is checked against the sections registered in the app, image paths are resolved relative to the file, and the result goes through the same importer as a site export: one transaction, images copied into the site's media library, a **new draft site**.

```bash
php artisan filamentcraft:import .fc-migration/site.json --dry-run      # validate only
php artisan filamentcraft:import .fc-migration/site.json --owner="App\Models\Team:1" [--live] [--slug=acme]
php artisan filamentcraft:import .fc-migration/site.json --replace=acme --force   # overwrite an existing site's matching pages (undo in the Themes panel)
```

## Top level

| Key | Required | Meaning |
|---|---|---|
| `name` | yes | site name |
| `slug` | no | site slug (`/^[a-z0-9][a-z0-9_-]*$/`); default slug of the name, made unique |
| `default_locale` | no | default `en` |
| `locales` | no | extra locales, e.g. `["en", "fr", "ar"]` |
| `theme` | no | slug of a registered theme; default theme otherwise |
| `settings` | no | stored on the site: `color_scheme`, `schemes`, theme setting ids (`default_font`, `heading_font`, `button_radius`, `box_radius`, `container_max_width`, `section_spacing`…), `seo` (site-wide SEO: `title_suffix`, `description`, `og_image`, `org_logo`, `social`) |
| `media` | no | `[{ "file": "assets/x.jpg", "alt": "…", "title": "…" }]`: alt and title for images used anywhere in the spec |
| `pages` | yes | list of pages (below) |
| `regions` | no | `header`, `footer`, `announcement` (below) |
| `redirects` | no | `[{ "from": "/old/path.html", "to": "/new-path", "status": 301 }]`; `status` 301 (default) or 302; `to` may be absolute |

## Pages

```json
{
  "name": "Web design",
  "slug": "services/web-design",
  "type": "page",
  "homepage": false,
  "publish": true,
  "seo": { "title": "…", "description": "…", "og_image": "assets/og.jpg", "canonical": null, "indexable": true },
  "sections": [ /* default-locale sections */ ],
  "translations": { "fr": [ /* the same page in French */ ] }
}
```

- `slug`: the URL path without the leading slash; nested paths allowed; unique. `home` plus `"homepage": true` for the root page. If no page is marked, the first page becomes the homepage.
- `type`: `page` (default), `post`, `landing`, `custom`.
- `publish`: default true, meaning the page is published inside the (draft) site. False keeps it as a draft page.
- `seo`: a flat object for the default locale, or keyed by locale: `{ "en": {...}, "fr": {...} }`.
- `locales` + `translations`: do not list a locale you will not translate. An extra locale with no content still advertises hreflang and sitemap entries that serve the default language (duplicate content).
- `translations`: a full section list per extra locale. A locale without a list falls back to the default locale on the public site. Translate every visible string; don't leave mixed languages.

## Sections

```json
{
  "type": "features",
  "preset": "editorial",
  "defaults": "design",
  "settings": { "title": "What we do", "columns": "3", "align": "start" },
  "blocks": [
    { "type": "feature", "settings": { "icon": "heroicon-o-bolt", "title": "Branding", "description": "…" } }
  ],
  "hidden": false,
  "id": "features-main"
}
```

| Key | Meaning |
|---|---|
| `type` | a registered section slug (`php artisan filamentcraft:sections`) |
| `settings` | setting id ⇒ value; ids come from `filamentcraft:sections <slug>` |
| `blocks` | list of `{ "type", "settings", "id"? }`; `type` must be one of the section's block slugs |
| `preset` | start from one of the section's presets (`modern`, `editorial`, `bold`, `elegant`): its layout, style **and effect** values apply (e.g. Hero `modern` turns on `backdrop=aurora` and `heading_effect=generate`, `bold` sets `cta_style=glow-border`, `editorial` sets `backdrop=dots`), your settings win. Design mode blanks only copy fields (text, link, image), so effects the source site never had survive: set `backdrop`, `heading_effect`, `cta_style`, `rotating_words` to `none`/empty in `settings`, or skip `preset` |
| `defaults` | `design` (default): keep the section's layout/style defaults but **blank every text, link and image field you don't set**, and add no default blocks, so no placeholder copy appears. `all`: keep default copy and blocks, and preset copy and blocks too (useful for scaffolding, never for migration). `none`: store only what you give |
| `hidden` | keep the section but don't render it |
| `id` | optional stable id; generated otherwise |

### Values

- **Text / textarea**: plain strings.
- **Rich text** (`richtext` fields, such as `rich-text`'s `body`): an HTML string. It is sanitised; keep to `p`, `h2`–`h4`, `ul`/`ol`/`li`, `strong`, `em`, `a`, `blockquote`.
- **Link**: a string href (`/about`, `https://…`, `mailto:`, `tel:`). Use the new site's paths for internal links.
- **Image**: a path relative to the spec file (`assets/hero.jpg`), or an absolute URL (rendered, but not copied into the media library). Alt text comes from `media[]`, or set `"<field>_alt": "…"` next to the field.
- **Select / enum buttons**: the option value as a string (`"3"`, not `3`). Allowed values are in `filamentcraft:sections <slug> --json` under `options`.
- **Checkbox / toggle**: `true`/`false`.
- **Icon**: a Heroicon name (`heroicon-o-bolt`, `heroicon-s-star`) or a short emoji/glyph.
- **Color scheme** (`scheme`): a scheme slug, or `"__inherit"` to follow the page and site scheme.

The dry run reports unknown setting ids and invalid option values as warnings, and unknown section or block types, unknown presets and missing or non-raster images as errors.

## Regions

```json
"regions": {
  "header": [
    { "type": "header", "settings": { "brand_text": "Harbor Bakery", "brand_logo": "assets/logo.png", "cta_label": "Order", "cta_url": "/order" },
      "blocks": [ { "type": "nav-link", "settings": { "label": "Menu", "url": "/menu" } } ] }
  ],
  "footer": {
    "sections": [ { "type": "footer", "settings": { "brand": "Harbor Bakery", "description": "…", "copyright": "© 2026 Harbor Bakery" },
      "blocks": [ { "type": "link", "settings": { "column": "Visit", "label": "Opening hours", "url": "/hours" } } ] } ],
    "translations": { "fr": [ /* … */ ] }
  }
}
```

A region is a section list, or `{ "sections": [...], "translations": {...} }`. Header and footer content is shared by every page. Always set the footer's brand and copyright; its defaults name FilamentCraft.

Header and hero CTAs: set `cta_enabled` explicitly (`true` with `cta_label`/`cta_url`, `false` to hide the button). Footer `link` blocks with no column heading: omit `column`; they render as one unlabelled group.

## After importing

- `php artisan filamentcraft:doctor` must stay green.
- The site is a draft until `--live` or `$site->markLive()`. Imported pages are published inside it.
- Every image is in the site's media library with its alt text. Re-running the import creates another site, so delete the earlier draft once the new one is right (ask the user first).
