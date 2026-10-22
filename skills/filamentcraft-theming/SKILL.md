---
name: filamentcraft-theming
description: "Style FilamentCraft sites: color schemes, fonts, radius, spacing, theme classes, theme presets, Brand Kit and custom CSS. Use this whenever the task touches how a FilamentCraft site looks: matching an existing brand or website, changing colors or fonts in code, adding a self-hosted font, writing a theme (`make:filamentcraft-theme`, `ThemeContract`, `settingsSchema`, `cssVar`), shipping a theme preset, locking a palette with Brand Kit, or debugging why a color, font or token does not apply (\"sections stay teal\", \"font not loading\", \"my CSS variable is ignored\"). Not for writing section markup; use filamentcraft-sections for that."
license: MIT
metadata:
  author: filamentcraft
---

# FilamentCraft theming

## How a site gets its look

Three layers, all compiled into one `<style id="fc-tokens">` that is printed **after** every stylesheet link:

1. **Color schemes.** A scheme is 22 color tokens (`background`, `on-background`, `surface`, `primary`, `on-primary`, … `danger`, `on-danger`). They become `--fc-color-*` / `--color-*` variables plus Tailwind-style shade ramps. The site has one active scheme; any section can pin its own.
2. **Theme settings.** The site's theme class declares settings (fonts, body size, heading scale, button/input/box radius, paddings, container width, section spacing). Each one with `->cssVar()` becomes a plain variable such as `--font-default` or `--button-radius`. Values live in `Site.settings_json`, keyed by setting id.
3. **site.css.** The package stylesheet's `fc-*` classes consume both layers.

Two consequences follow, and they explain most "it doesn't apply" bugs:

- A host stylesheet that sets `:root { --fc-color-primary: … }` loses, because fc-tokens comes later. Change tokens through schemes and settings, not CSS.
- The built-in theme (`studio`) already exposes every common knob. A migration or rebrand almost never needs a custom theme class. Write one only to add new knobs or ship a stylesheet.

## The trap that breaks every rebrand

Built-in sections store a pinned scheme. Their `defaults()` set `'scheme' => 'modern'`, and the style-family presets pin `modern`, `silk`, `velocity` or `neutral`. A pinned scheme beats the site's active one. So setting the site to a new `brand` scheme only recolors the page background, and every section still renders the stock teal.

Fix it one of two ways:

- **Override the built-in schemes per site.** Write the brand tokens onto `modern` too, plus any family scheme the site's sections use. This is the right choice for a rebrand: every existing and future section follows. Sections added later from the editorial, bold or elegant presets pin `silk`, `velocity` or `neutral`, so brand those too (light variants of the palette), or tell the user they stay stock.
- **Make sections inherit.** Store `'scheme' => \FilamentCraft\Support\ColorSchemes::INHERIT` (`'__inherit'`) in each section's settings. This is what the AI assistant writes. Use it when you generate the page content yourself.

## Recipe: match an existing brand

Extract the source site's tokens first (the `filamentcraft-site-migration` skill's crawler writes `tokens.json`), then map them:

| Source CSS | FilamentCraft |
|---|---|
| page background / body text | `background` / `on-background` |
| card or panel background (+ its text) | `surface` / `on-surface` |
| alternate band background | `surface-alt` / `on-surface-alt` |
| main button background / its text | `primary` / `on-primary` |
| highlight, badge, second accent | `accent` / `on-accent` (`secondary` for soft tints) |
| button `border-radius` | `button_radius` (0–24) |
| card and image radius | `box_radius` (0–32) |
| input radius | `input_border_radius` (0–24) |
| main container `max-width` | `container_max_width` (960–1600) |
| desktop vertical padding between sections, P | `section_spacing` ≈ P / 1.5 (default density is 1.5× on desktop) |
| h1 size relative to the default | `heading_scale` (1–2) |

```php
use FilamentCraft\Enums\ThemeApplyMode;
use FilamentCraft\Models\Site;
use FilamentCraft\Models\Theme;
use FilamentCraft\Support\SiteColorSchemes;
use FilamentCraft\Support\SiteThemeSettings;

$site = Site::query()->forOwner($team)->live()->firstOrFail();   // or by id; slugs are unique per owner only

if ($site->theme === null) {
    $site->theme()->associate(Theme::forSlug('studio'))->save();
}

// Undo point: the editor's Themes panel can restore this snapshot.
app(\FilamentCraft\Theming\Presets\ThemePresetApplier::class)->snapshot($site, 'Before rebrand', null, ThemeApplyMode::Style, [], []);

$brand = [
    'background' => '#ffffff',  'on-background' => '#111827',
    'surface' => '#f9fafb',     'on-surface' => '#111827',
    'surface-alt' => '#f3f4f6', 'on-surface-alt' => '#374151',
    'primary' => '#0f766e',     'on-primary' => '#ffffff',
    'secondary' => '#ccfbf1',   'on-secondary' => '#134e4a',
    'accent' => '#f59e0b',      'on-accent' => '#111827',
    'neutral' => '#6b7280',     'on-neutral' => '#ffffff',
    'info' => '#2563eb',        'on-info' => '#ffffff',
    'success' => '#059669',     'on-success' => '#ffffff',
    'warning' => '#d97706',     'on-warning' => '#ffffff',
    'danger' => '#dc2626',      'on-danger' => '#ffffff',
];

$schemes = SiteColorSchemes::forSite($site);   // start from the merged map so other schemes survive
$schemes['brand'] = $brand;
$schemes['modern'] = $brand;                    // built-in sections pin 'modern'
SiteColorSchemes::syncOverrides($site, $schemes);
SiteColorSchemes::setActive($site, 'brand');    // only after the scheme exists

$schema = $site->theme->templateSettings();
SiteThemeSettings::sync($site, $schema, [
    ...SiteThemeSettings::values($site, $schema),
    'default_font' => 'inter',
    'heading_font' => 'playfair-display',
    'button_radius' => 12,
    'input_border_radius' => 12,
    'box_radius' => 12,
]);
```

Rules this recipe depends on:

- **Author all 22 tokens.** A partial scheme is accepted, but missing tokens are not emitted and silently inherit from `modern` or the parent section. Work out every `on-*` color for contrast (4.5:1 for text). `FilamentCraft\Ai\Support\Contrast::foregroundFor($background)` returns a passing ink.
- **`syncOverrides()` and `sync()` replace, they don't merge.** Always spread the current values in, as above, or other schemes and settings are wiped.
- **Settings must exist on the site's theme.** `sync()` silently drops ids the theme doesn't declare.
- **A Range value outside its min/max renders the default.** `box_radius => 40` renders 4, not 32.
- **Set fonts explicitly.** The Studio theme's stock font value is a placeholder, so a migrated site should always store `default_font` and `heading_font`.
- **If the site shows the visitor dark-mode toggle,** override the `dark` scheme with a branded dark palette too. The toggle switches to `dark` unless the element has `data-fc-scheme-dark="nord"`. Enable it with the Header/Footer settings `show_scheme_toggle` and `scheme_toggle_placement` (`inline` or `floating`); custom sections can `@include('filamentcraft::sections.partials.scheme-toggle', ['floating' => true, 'darkScheme' => 'dark'])`.
- **Source sections that are deliberately dark** (a dark hero band) get their own scheme, e.g. `brand-dark`, set on those sections' `scheme` setting. Keep the site default light unless the source site is dark throughout.

## Fonts

- Font values are **Bunny Fonts slugs** (`inter`, `playfair-display`, `dm-sans`): the Google Fonts families under kebab-case ids. Each one adds a `fonts.bunny.net` link with weights 400–700 (no italics).
- A free-form CSS stack is also accepted (`'"Acme Serif", Georgia, serif'`). No link is emitted, so the font must already be loaded.
- For licensed or self-hosted fonts, register a `BrandFont` and use its slug:

```php
use FilamentCraft\Enums\FontCategory;
use FilamentCraft\Support\BrandFont;

FilamentCraftPlugin::make()->registerFont(
    BrandFont::make('acme-sans', 'Acme Sans')
        ->category(FontCategory::Sans)
        ->face(asset('fonts/acme-sans-400.woff2'), '400')
        ->face(asset('fonts/acme-sans-700.woff2'), '700'),
);
```

The `@font-face` rules are emitted at the top of fc-tokens. Only bundle a commercial font after the user confirms the license covers the new site. `BrandFont::make(…)->stack('Arial, sans-serif')` registers a web-safe stack; `->face($url, $weight, FontStyle::Italic)` adds italics (Bunny links have none).

**A slug that is not in the catalog loads nothing**: the value renders as a bare `font-family: playfair-display` with no `<link>`. Verify with `app(\FilamentCraft\Support\FontCatalog::class)->find($slug)` (null means it will not load). The catalog is fetched from Bunny once and cached for 24 h, **including a 4-font fallback (inter, roboto, merriweather, jetbrains-mono) when the fetch fails** (sandbox, CI, deploy script, no network). After a failed fetch run `app(\FilamentCraft\Support\FontCatalog::class)->flush()`. Registering a `BrandFont` also fixes fonts you control.

## Custom CSS

There is no custom-CSS field. Ship CSS through one of these:

- the theme class's `stylesheets()`,
- the plugin's `->stylesheet($url)` or `->viteBuild(...)`,
- `config('filamentcraft.assets.extra_styles')`.

Unlayered host CSS beats every package rule (site.css lives in `@layer theme, base, components, utilities, filamentcraft`), so `.fc-btn { … }` overrides work; a host bundle's **layered** utilities lose to the package's same-named ones. Variables on `:root` do not win (see above). Plugin-level `->stylesheet()` / `->viteBuild()` reach public pages only through the default panel, and a wrong `viteManifest()` path registers nothing without error: prefer `filamentcraft.assets.*` config (setup skill). Page order: package, plugin, `extra_styles`, `vite_builds`, theme `stylesheets()` (later wins). `mirrorEditorStyles()` affects the editor canvas only. Prefer settings and schemes, because those stay editable in the editor; CSS is for what the knobs can't express.

## Writing a theme class, a theme preset, or a Brand Kit

Read [references/theme-authoring.md](references/theme-authoring.md) when you need to:

- add new design knobs with `cssVar()` (custom theme class, `make:filamentcraft-theme`),
- package a look as a one-click **theme preset** (`make:filamentcraft-theme-preset --from-site=`),
- lock fonts and palette for an agency's editors with **Brand Kit**.

Token and setting tables (every scheme token, every Studio setting with its CSS variable and range, the 14 built-in schemes) are in [references/tokens.md](references/tokens.md).

## Check your work

1. Open a published page and view the source of `<style id="fc-tokens">`. Confirm your scheme selector, `--font-default`, `--font-heading` and the radius variables are present.
2. Open a page built from built-in sections. If the sections are still teal, you hit the pinned-scheme trap.
3. Check mobile width and, for Arabic/Hebrew sites, `dir="rtl"`.
4. `php artisan filamentcraft:doctor` must stay green.
