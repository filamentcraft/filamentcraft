# Token reference

## Contents
- Scheme tokens (22) and derived colors
- Studio theme settings (ids, CSS variables, defaults, ranges)
- Where site.css reads them
- The 14 built-in schemes
- Storage shape on the site

## Scheme tokens

A complete scheme has these 22 keys (`FilamentCraft\Support\ColorSchemes::REQUIRED_TOKENS`):

`background`, `on-background`, `surface`, `on-surface`, `surface-alt`, `on-surface-alt`, `primary`, `on-primary`, `secondary`, `on-secondary`, `accent`, `on-accent`, `neutral`, `on-neutral`, `info`, `on-info`, `success`, `on-success`, `warning`, `on-warning`, `danger`, `on-danger`.

- There is no `border`, `muted`, `text` or `foreground` token. Borders are `color-mix()` of the `on-*` color in site.css. Three colors are derived in CSS: `--fc-color-on-background-muted`, `--fc-color-on-surface-muted`, `--fc-color-danger-ink`.
- The aliases `bg`, `fg` and `foreground` are normalised to `background` / `on-background`.
- Each token is emitted as `--fc-color-{token}` and `--color-{token}`. Every non-`on-*` token also gets OkLch shades `--color-{token}-50 … -950`.
- Tailwind utilities `bg-{token}`, `text-{token}` and `border-{token}` exist in the package CSS for the base tokens. Shade utilities such as `bg-primary-600` do not; a host build must map those variables.
- `:root` always carries `modern`. The active scheme is applied through `<html data-fc-color-scheme="…">`, and a section with a pinned scheme sets its own `data-fc-color-scheme`.

## Studio theme settings

Stored on `Site.settings_json[<id>]`. Out-of-range values render the default.

| id | type | CSS variable | default | range |
|---|---|---|---|---|
| `color_scheme` | ColorSchemeGroup | (scheme pipeline) | `modern` | |
| `default_font` | Font | `--font-default` | placeholder, always set it | Bunny slug or CSS stack |
| `heading_font` | Font | `--font-heading` | placeholder, always set it | Bunny slug or CSS stack |
| `body_size` | Range px | `--font-body-size` | 16 | 12–20 |
| `heading_scale` | Range | `--font-heading-scale` | 1.25 | 1–2, step 0.05 |
| `button_radius` | Range px | `--button-radius` | 4 | 0–24 |
| `button_padding_y` | Range px | `--button-py` | 12 | 8–20 |
| `button_padding_x` | Range px | `--button-px` | 20 | 12–32 |
| `button_uppercase` | Checkbox | `--button-text-transform` | false | |
| `button_letter_spacing` | Range em | `--button-tracking` | 0 | 0–0.2 |
| `input_height` | Range px | `--input-height` | 40 | 32–56 |
| `input_border_width` | Range px | `--input-border-width` | 1 | 0–3 |
| `input_border_radius` | Range px | `--input-radius` | 4 | 0–24 |
| `box_radius` | Range px | `--box-radius` | 4 | 0–32 |
| `box_border_width` | Range px | `--box-border-width` | 1 | 0–3 |
| `box_padding` | Range px | `--box-padding` | 24 | 8–32 |
| `container_max_width` | Range px | `--container-max` | 1280 | 960–1600 |
| `section_spacing` | Range px | `--section-spacing` | 64 | 32–128 |
| `social_facebook` … `social_tiktok` | Link | | | |
| `header_layout` | Select | | `logo-left` | `centered`, `logo-left`, `transparent` |
| `header_sticky` | Checkbox | | true | |
| `header_announcement_text` | Text | | `''` | |
| `enable_back_to_top`, `enable_whatsapp`, `whatsapp_number`, `whatsapp_position` | floating buttons | | | |

`php artisan filamentcraft:sections` does not list theme settings. Read the site's schema with `$site->theme->templateSettings()`.

## Where site.css reads them

- Body: background `--fc-color-background`, text `--fc-color-on-background`, font `--font-default` (fallback Instrument Sans / Inter), size `--font-body-size`.
- Headings: `--font-heading`. `.fc-title` and the `text-3xl…6xl` steps inside sections scale with `--font-heading-scale`.
- `.fc-container`: `max-width: var(--container-max)`.
- `.fc-btn`: `--button-radius`, `--button-py`, `--button-px`, `--button-text-transform`, `--button-tracking`. Variants `.fc-btn-primary` (primary / on-primary), `.fc-btn-secondary`, `.fc-btn-outline`, `.fc-btn-text`; sizes `fc-btn-sm`, `fc-btn-lg`, `fc-btn-block`.
- `.fc-box`: `--box-radius`, `--box-padding`; `.fc-box-border` uses `--box-border-width`. Media frames and many surfaces reuse `--box-radius`.
- `.fc-input`: `--input-height`, `--input-border-width`, `--input-radius`.
- Section density `compact` / `comfortable` / `airy` multiplies `--section-spacing` by 0.75 / 1 / 1.25 on mobile and 1 / 1.5 / 2 from 640px up.
- Card shadows are deliberately flat. Depth comes only from `.fc-elevate-1/2/3`, and `.fc-glow` and the decorative mesh/dots backgrounds are hidden.

## Per-section look knobs

Sections that opt in (`lookKnobs()`) get these settings, which add wrapper classes:

| setting | values |
|---|---|
| `_card_style` | elevated, bordered, minimal, overlay |
| `_media_ratio` | wide, standard, square, portrait, hidden |
| `_arrangement` | grid, list, showcase |
| `_corners` | sharp, soft, round |
| `_actions` | solid, outline, soft |

Sections can also override fonts with `_heading_font` / `_body_font` (config `sections.typography_overrides`).

## Built-in schemes

| slug | background | on-background | surface | primary | on-primary | accent |
|---|---|---|---|---|---|---|
| modern (default) | #ffffff | #1f2937 | #f9fafb | #00897b | #ffffff | #26a69a |
| light | #f5f1e8 | #1c1917 | #fffef8 | #c2410c | #fffef8 | #166534 |
| dark | #0c0a09 | #f5f1e8 | #1c1917 | #fb923c | #1c1917 | #22c55e |
| default | #f8f8f8 | #272322 | #f5f5f4 | #92400e | #ffffff | #4ade80 |
| velocity | #ffffff | #1f2937 | #f7f7f7 | #2d2a7b | #ffffff | #fdafab |
| neutral | #f8fafc | #0f172a | #ffffff | #475569 | #ffffff | #64748b |
| accent | #ecfeff | #164e63 | #cffafe | #0891b2 | #ffffff | #06b6d4 |
| inverse | #020617 | #f8fafc | #0f172a | #f8fafc | #020617 | #38bdf8 |
| brand-primary | #c2410c | #fffef8 | #9a3412 | #fffef8 | #7c2d12 | #f5f1e8 |
| brand-secondary | #0f766e | #ffffff | #115e59 | #ccfbf1 | #134e4a | #99f6e4 |
| cupcake | #faf7f5 | #291334 | #efeae6 | #44ebd3 | #005d58 | #ffd6a7 |
| lofi | #ffffff | #000000 | #f5f5f5 | #0d0d0d | #ffffff | #262626 |
| nord | #eceff4 | #2e3440 | #e5e9f0 | #5e81ac | #03060b | #88c0d0 |
| silk | #f7f5f3 | #4b4743 | #f3ede9 | #1c1c29 | #e1ff00 | #1c1c29 |

`modern` in full, a good template for a light brand scheme: background #ffffff, on-background #1f2937, surface #f9fafb, on-surface #1f2937, surface-alt #f3f4f6, on-surface-alt #374151, primary #00897b, on-primary #ffffff, secondary #e0f2f1, on-secondary #00695c, accent #26a69a, on-accent #ffffff, neutral #9ca3af, on-neutral #1f2937, info #3b82f6, on-info #ffffff, success #10b981, on-success #ffffff, warning #f59e0b, on-warning #ffffff, danger #ef4444, on-danger #ffffff.

## Storage on the site

Merge order, later wins: package defaults, then `Theme.tokens_json['schemes']` (shared by every site on that theme), then `Site.settings_json['schemes']`.

```php
// Site.settings_json
[
    'color_scheme' => 'brand',          // active slug; absent means 'modern'
    'schemes' => [                      // only authored or overridden schemes
        'brand' => [/* 22 tokens */],
        'modern' => [/* per-site override of a built-in */],
    ],
    'default_font' => 'inter',
    'heading_font' => 'playfair-display',
    'button_radius' => 12,
    'seo' => [/* … */],                 // reserved keys, kept by SiteThemeSettings::sync()
    'ai' => [/* … */],
]
```

`SiteColorSchemes`: `forSite($site)` (merged map), `overrides($site)`, `activeFor($site)`, `setActive($site, $slug)`, `syncOverrides($site, $schemes)` (replaces the `schemes` key), `add($site, cloneFrom:, slug:)`, `remove($site, $slug)`, `isBuiltIn($slug)`.

`SiteThemeSettings`: `values($site, $schema)`, `sync($site, $schema, $values)` (replaces all theme settings; keeps `color_scheme`, `schemes`, `seo`, `ai`), `overrides($site)`.
