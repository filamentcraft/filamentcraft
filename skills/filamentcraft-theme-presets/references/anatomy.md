# Anatomy of a theme preset

## Contents

- How the pieces fit
- The class, method by method
- `style()`: what it may hold
- Pages and blocks: what a blueprint section really seeds
- Regions: header, footer, announcement
- Section presets and the four families
- Languages and the tenant's site
- Apply modes and provisioning
- Full example

## How the pieces fit

| Layer | Class | Owns |
|---|---|---|
| Theme | `ThemeContract` (the built-in is `studio`) | Which knobs exist: fonts, radius, spacing, the 22 color tokens. Not a look. |
| Theme preset | `FilamentCraft\Theming\Presets\ThemePreset` | Values for those knobs (`style()`), plus optional content: pages and header/footer. The card an operator picks in the editor's Themes panel. |
| Section preset | `FilamentCraft\Sections\Preset` from a section's `presets()` | A named variant (settings + blocks) of one section type. |

- `ThemePreset` extends `FilamentCraft\Blueprints\SiteBlueprint`. One class is a Themes-panel card **and** a site starter for new tenants.
- A style family (`modern`, `editorial`, `bold`, `elegant`) is not a class. It is the shared key every built-in section uses for its presets, so `fromPreset(HeroSection::class, 'bold')` and `fromPreset(CtaSection::class, 'bold')` match. `FilamentCraft\Blueprints\StarterFamily` is an enum for those four keys; you never need it.
- `ThemePresetRegistry` (presets by slug) and `BlueprintRegistry` (page blueprints) are unrelated. Presets never go through `BlueprintRegistry`.

## The class, method by method

| Method | Required | Notes |
|---|---|---|
| `slug(): string` | yes | Kebab-case, unique, stable. The registry keys on it; `modern`, `editorial`, `bold`, `elegant` replace the built-ins. |
| `name(): string` | yes | Card title, and the default site name when provisioning without one. |
| `style(): array` | yes | Keyed like `Site.settings_json` (below). |
| `pages(): array` | yes | `PresetPage` instances, `AbstractBlueprint` instances, or `AbstractBlueprint` class names. |
| `description(): ?string` | no | One line on the card: who it is for. |
| `screenshots(): array` | no | Paths under `public/`, root-relative paths or URLs; first is the cover. `ThemePresetValidator` fails on a listed file that is missing, so list only files that exist. |
| `regions(): array` | no | `list<BlueprintRegion>`. Defaults to `[]`, which keeps the old header and footer on a Full apply. Always declare header and footer. |
| `themeSlug(): ?string` | no | Switches the site to another registered theme. `null` keeps the site's theme. |
| `locales(): array` | no | Locales for a site **provisioned** from the preset; first is the default. Defaults to `['en']`. |
| `publish(): bool` | no | Provisioned site goes live (default `true`). |

`siteSettings()`, `screenshotUrls()` and `resolvedPages()` are `final`: don't override them.

`PresetPage::make(string $name, ?string $slug = null)` then `->homepage()`, `->withSections([...])`, `->ofType(TemplateType::...)`, `->seal()` (hides "Add section" on that page). Each call returns a copy. The slug defaults to `Str::slug($name)`; pass a fixed slug when the name is translated. Exactly one page should be `homepage()` (more than one fails validation; none makes the first page the homepage).

## `style()`: what it may hold

```php
[
    'color_scheme' => 'bakery',                       // the authored slug below, or a built-in scheme
    'schemes' => ['bakery' => [/* all 22 tokens */]], // merged onto the site's schemes
    'heading_font' => 'fraunces',                     // Bunny Fonts slug
    'default_font' => 'work-sans',
    'heading_scale' => 1.3,                           // 1-2
    'button_radius' => 14,                            // 0-24
    'input_border_radius' => 10,                      // 0-24
    'box_radius' => 16,                               // 0-32
    'button_uppercase' => false,
    'container_max_width' => 1280,                    // 960-1600, step 20
    'section_spacing' => 64,                          // 32-128, step 4
]
```

- Only ids the site's theme declares are applied; anything else is dropped without an error. So `seo` and `ai` can never come from a preset. Check ids: the `filamentcraft-theming` skill's `references/tokens.md`, or the theme class's `settingsSchema()`.
- A Range value outside its min/max renders the theme default.
- The 22 tokens are `ColorSchemes::REQUIRED_TOKENS`: `background`, `surface`, `surface-alt`, `primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `danger`, each with its `on-*`. A missing token silently falls back to the stock `modern` value. Every `on-*` needs 4.5:1 against its surface: `FilamentCraft\Ai\Support\Contrast::ratio($a, $b)` measures, `Contrast::foregroundFor($background)` returns a passing ink. It is a plain helper; it works without `laravel/ai`.
- Set **both** `heading_font` and `default_font`. Applying resets theme settings to their defaults first, and the stock font value is a placeholder, so a preset that skips one changes it anyway. Check a slug with `app(\FilamentCraft\Support\FontCatalog::class)->find('fraunces')` (array, or `null` = it will not load).
- Never default a preset to the `dark` scheme. A light, branded scheme is the house default.

## Pages and blocks: what a blueprint section really seeds

`BlueprintSection::make(HeroSection::class)->settings([...])->blocks([...])`, plus `->lock()`, `->hide()`, `->schedule($from, $until)`.

The seeder does this for each section:

```php
$settings = array_merge($defaults['settings'], $yourSettings);   // defaults fill every id you skip
$blocks   = $yourBlocks ?? $defaults['blocks'];                  // null (not called) seeds the demo blocks
```

So:

- **Every setting you skip shows the section's demo copy.** Hero's `supporting_text` ("Built-in sections now adapt…") and `cta_secondary_label` ("See how it works"), CTA's `badge` and `note`, Footer's `copyright` ("© 2026 FilamentCraft…"). Set each visible text field, or blank it with `''`.
- **Not calling `->blocks()` seeds the demo blocks**: Hero's proof points, Header's Home/Pricing/About links, Footer's Product/Company columns. Pass your own blocks, or `->blocks([])` for none.
- `->settings()` replaces the whole override array. After `fromPreset()` it throws the preset's settings away (its blocks stay). To change a few, use `->set('heading', 'Fresh bread')` or fluent calls (`->heading('Fresh bread')->ctaLabel('Order')`); both merge. Fluent names are snake-cased, so ids with digits or acronyms (`image_2`) need `set()`, and names starting with `get`/`with` throw. `BlueprintSection::for(Class::class)` is an alias of `make()` that reads well with them.
- Every section you write gets `'scheme' => ColorSchemes::INHERIT` (`'__inherit'`). Built-in defaults pin `modern` and family presets pin `modern`/`silk`/`velocity`/`neutral`; a pinned scheme beats the preset's `color_scheme`, so the page background changes and every section stays stock teal.
- A block is `['id' => 'feature-1', 'type' => 'feature', 'settings' => [...]]`. Block `type` values are the slugs in `filamentcraft:sections <slug> --json` under `blocks` (`feature`, `item`, `quote`, `image`, `nav-link`, `column`, `proof`…), not the display names.
- Select and enum values are the option keys from the same JSON (`'media_mode' => 'end'`, `'layout' => 'editorial'`, `'columns' => '3'` as a string).
- Images are URLs: root-relative files you ship (`/images/themes/bakery/hero.webp`), or `''` for none. Set the layout knob to match (`media_mode`/`media_placement` `'none'`) when there is no photo.
- Icons are Heroicon names (`heroicon-o-cake`), never emoji.
- Commerce sections (`product-carousel`, `product-listing`, `product-detail`, `category-grid`, `cart`, `checkout`, `store-hero`) need a `Storefront` from the host (`filamentcraft-storefront` skill). Leave them out of a preset for an app without one.

Look every id up before you write it:

```bash
php artisan filamentcraft:sections                    # all slugs
php artisan filamentcraft:sections hero --json        # settings (id, type, options), blocks, defaults, presets
```

## Regions: header, footer, announcement

```php
BlueprintRegion::make(RegionName::Header)->sections([BlueprintSection::make(HeaderSection::class)->settings([...])->blocks([...])]),
BlueprintRegion::make(RegionName::Footer)->sections([...]),
```

`RegionName` is `FilamentCraft\Enums\RegionName` (`Header`, `Footer`, `Announcement`). Header nav links are `nav-link` blocks (`label`, `url`); point them at the preset's own page slugs. Footer link columns are `column` blocks (`heading`, `links` as a list of `['label' => …, 'url' => …]`). `->sectionsUsing(fn (string $locale): array => [...])` builds a region per locale.

## Section presets and the four families

Three ways to style sections in a preset:

1. Explicit `->settings([...])` with shared helper methods. Best for a set: you control every value.
2. `BlueprintSection::fromPreset(HeroSection::class, 'editorial')`. Fast, but it brings the family's pinned scheme, stock photos (`/images/filamentcraft/presets/...`), effects (`backdrop`, `heading_effect`, `cta_style`) and dummy links. Override all of those. A slug the section does not have falls back to its defaults; `assertStrict()` reports it with the slugs that exist.
3. Your own key on built-in sections, when the same variant repeats across presets or operators should pick it from the section panel:

```php
use FilamentCraft\Sections\Builtin\HeroSection;
use FilamentCraft\Sections\Preset;

FilamentCraftPlugin::make()->addPresets(HeroSection::class, [
    Preset::make('bakery', 'Bakery')->settings(['layout' => 'editorial', 'content_align' => 'start', 'scheme' => '__inherit']),
]);
```

`->hidePresets(HeroSection::class, ['bold'])` hides a family from the picker; blueprints that seed it still work. Writing presets on your **own** section classes is the `filamentcraft-sections` skill.

## Languages and the tenant's site

- Each site locale is seeded with that locale active, so copy written with `__()` in `pages()`, `regions()` and page `sections()` comes out translated. Lang files (`lang/en/shop-presets.php`, `lang/ar/...`) are the whole multi-language story for most presets. Use fixed page slugs (`PresetPage::make(__('...'), 'visit')`).
- Copy from somewhere else (a table, a CMS): implement `FilamentCraft\Blueprints\Contracts\LocalizedBlueprint` on the page (`sectionsForLocale(string $locale): array`).
- Copy that depends on the tenant (brand name, address): implement `FilamentCraft\Blueprints\Contracts\BindsToSite` (`forSite(Site $site): static`, return a clone). The applier, the preview, the seeder and the gallery all call it. `style()`, `pages()`, `regions()` and `locales()` are also called with no site (validation, provisioning), so they must work when the site is still `null`. `assets/set/ShopPreset.php.stub` uses it for the header brand.

## Apply modes and provisioning

- **Full** (`ThemeApplyMode::Full`): writes the style, replaces pages the preset declares (matched by blueprint slug, then slug, then homepage), creates the missing ones, and replaces only the regions it declares. Keeps the site's `seo`, `ai` and own schemes.
- **Style**: resets style settings (colors, schemes, fonts, ranges, spacing) to theme defaults, lays `style()` on top, leaves content alone.
- Both write a restore point first (`SiteSnapshot`, 10 per site; needs `php artisan filamentcraft:upgrade` on old installs) and fire `FilamentCraft\Events\ThemePresetApplied` after commit.
- In code: `app(\FilamentCraft\Theming\Presets\ThemePresetApplier::class)->apply($site, new BakeryPreset, \FilamentCraft\Enums\ThemeApplyMode::Full)`.
- New tenant site: `BakeryPreset::provision($tenant, 'Joe\'s Bakery', 'joes-bakery')` for a class without constructor arguments, or `app(\FilamentCraft\Blueprints\SiteProvisioner::class)->provision(new ShopPreset(ShopType::Bakery), $tenant, $name, $slug)` for one with arguments. New-site dialogs also show a "Start from" picker with the registered presets.
- Editing a preset later never changes sites that already applied it.

## Full example

`assets/BakeryPreset.php.stub` is a complete, tested single preset: authored scheme (contrast-checked), both fonts, Home and Visit pages, header and footer with real nav, every demo text blanked, photos optional by role, screenshot listed only once it exists. Copy it to `app/Themes/Presets/BakeryPreset.php` (auto-discovered), then replace the copy with the user's. Its header says "Your bakery": implement `BindsToSite` as in `assets/set/ShopPreset.php.stub` to use the site's name instead.
