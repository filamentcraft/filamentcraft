# Theme classes, theme presets and Brand Kit

## Contents
- Theme class: when you need one, scaffold, schema, registration, assigning it to a site
- Theme presets: one-click looks (and whole starter sites)
- Brand Kit: locking fonts and colors for an agency's editors

## Theme class

Write one only when the built-in `studio` theme lacks a knob you need (a new CSS variable the editor should control) or you must ship a stylesheet with the theme. Otherwise configure `studio` through settings and schemes.

A theme added only to ship CSS drops Studio's knobs (a site's stored overrides are kept only for ids the new theme declares, and `StudioTheme` is `final`). Keep them with `return (new \FilamentCraft\Theming\Themes\StudioTheme)->settingsSchema();` in your `settingsSchema()`.

```bash
php artisan make:filamentcraft-theme Acme   # app/Themes/AcmeTheme.php; --slug= --namespace= --path= --force
```

The scaffold's default `brand_primary` Color setting (`--brand-primary`) is read by no section. Replace it with the variables `site.css` reads (`--font-default`, `--font-heading`, `--button-radius`, …; see tokens.md).

```php
namespace App\Themes;

use FilamentCraft\Settings\Types\Category;
use FilamentCraft\Settings\Types\Checkbox;
use FilamentCraft\Settings\Types\ColorSchemeGroup;
use FilamentCraft\Settings\Types\Font;
use FilamentCraft\Settings\Types\Range;
use FilamentCraft\Theming\AbstractTheme;

final class AcmeTheme extends AbstractTheme
{
    public function slug(): string
    {
        return 'acme';
    }

    public function name(): string
    {
        return 'Acme';
    }

    public function settingsSchema(): array
    {
        return [
            Category::make('colors')->label('Colors')->icon('heroicon-o-swatch')->collapsed(false)->settings([
                ColorSchemeGroup::make('color_scheme'),
            ]),
            Category::make('typography')->label('Typography')->icon('heroicon-o-language')->settings([
                Font::make('default_font')->cssVar('--font-default')->default('inter'),
                Font::make('heading_font')->cssVar('--font-heading')->default('playfair-display'),
                Range::make('body_size')->cssVar('--font-body-size', 'px')->unit('px')->min(12)->max(20)->default(16),
            ]),
            Category::make('buttons')->label('Buttons')->icon('heroicon-o-cursor-arrow-rays')->settings([
                Range::make('button_radius')->cssVar('--button-radius', 'px')->unit('px')->min(0)->max(24)->default(8),
                Checkbox::make('button_uppercase')->cssVar('--button-text-transform')->cssValues('uppercase', 'none')->default(false),
            ]),
        ];
    }

    public function stylesheets(): array
    {
        return [asset('css/acme-brand.css')];
    }
}
```

Keep these in mind:

- **Reuse the variable names site.css already reads** (`--font-default`, `--font-heading`, `--font-body-size`, `--font-heading-scale`, `--button-radius`, `--button-py`, `--button-px`, `--button-text-transform`, `--button-tracking`, `--input-height`, `--input-border-width`, `--input-radius`, `--box-radius`, `--box-border-width`, `--box-padding`, `--container-max`, `--section-spacing`). Then every built-in section reacts. A new variable only does something where your own CSS or sections read it.
- **The scheme is decided by the site.** `ColorSchemeGroup->default(...)` does not choose what renders: an unset site renders `modern`. Set the active scheme on the site (`SiteColorSchemes::setActive`) or in a preset's `style()`.
- A theme `Color->cssVar('--fc-color-*')` aimed at a scheme token does nothing visible: the vars are emitted on `:root`, but each scheme re-declares every `--fc-color-*` / `--color-*` on `[data-fc-color-scheme="…"]` (the page, and every section that pins a scheme), which wins on those elements. Drive colors through schemes; use `cssVar()` for non-scheme variables.
- `cssVar()` works only in a theme schema. On a section setting it is silently ignored.
- `Checkbox` needs `->cssValues(on, off)` to emit anything.
- `Range` values outside min/max fall back to the default when emitted.
- Top-level `Setting`s without a `Category` land in an implicit "General" group.
- `stylesheets()` / `scripts()` URLs load on public pages **and** in the editor preview.

**Register it in config** (prefer it over the scaffold docblock's `->registerTheme()` hint, which is optional). Config registration needs no panel at all, so it is the safest route for public pages, queue jobs and console commands. The plugin's `->registerTheme()` is also booted for every registered panel's plugin on each request (`FilamentCraftPlugin::bootPanelRegistries`), so it normally works on public pages too; if a public page falls back to the default theme, move the registration to config.

```php
// config/filamentcraft.php
'themes' => [
    'builtin_enabled' => true,              // false removes the studio theme
    'register' => [\App\Themes\AcmeTheme::class],
],
```

Then create the DB rows and assign the theme:

```bash
php artisan filamentcraft:sync-themes
```

```php
use FilamentCraft\Models\Theme;

$site->theme()->associate(Theme::forSlug('acme'))->save();
```

Registering a class with an existing slug replaces that theme. An unknown slug on a site's theme row silently falls back to the default theme. `sync-themes` (and `Theme::forSlug`) only create **missing** rows: renaming `name()` never updates an existing row, and changing `slug()` orphans the old row. Blueprint provisioning syncs rows itself.

Host CSS that wants Tailwind shade utilities (`bg-primary-600`) maps the variables in Tailwind v4: `@theme inline { --color-primary: var(--color-primary); … }` for each token you use. Emitted helpers: `--fc-scheme-current-bg` / `-fg` (aliases `--color-bg` / `--color-fg`) and per-scheme swatches `--fc-scheme-{slug}-bg` / `-fg`. A `Group` inside a theme `Category` does not group (it renders an empty header): nest a `Category`. `Font::onlyCategory([...])` accepts `sans`, `serif`, `mono`, `display`, `handwriting`, `system`.

## Theme presets

A theme preset is a named look (scheme + theme settings) that can also carry pages and header/footer, applied from the editor's Themes panel. It extends `ThemePreset`, which is a site blueprint, so the same class can also provision a new tenant's site.

Fastest path: style a site in the editor, then export it:

```bash
php artisan make:filamentcraft-theme-preset Harbor --from-site=harbor-demo
```

By hand:

```php
use FilamentCraft\Theming\Presets\PresetPage;
use FilamentCraft\Theming\Presets\ThemePreset;
use FilamentCraft\Blueprints\BlueprintSection;
use FilamentCraft\Sections\Builtin\HeroSection;

final class HarborPreset extends ThemePreset
{
    public function slug(): string
    {
        return 'harbor';
    }

    public function name(): string
    {
        return 'Harbor';
    }

    public function style(): array
    {
        return [
            'color_scheme' => 'harbor',
            'schemes' => ['harbor' => [/* all 22 tokens */]],
            'heading_font' => 'lora',
            'default_font' => 'work-sans',
            'button_radius' => 6,
        ];
    }

    public function pages(): array
    {
        return [
            PresetPage::make('Home')->homepage()->withSections([
                BlueprintSection::make(HeroSection::class)->settings(['heading' => 'Stay by the water', 'scheme' => '__inherit']),
            ]),
        ];
    }
}
```

- `style()` is keyed like `Site.settings_json`: `color_scheme`, `schemes` (merged onto the site's), and any theme setting id. Ids the site's theme doesn't declare are ignored, so one preset works across themes. Override `themeSlug()` to switch theme too.
- Author all 22 tokens. Missing ones inherit from `modern` or the parent section, not from a complete scheme.
- Auto-discovered from `app/Themes/Presets`. Or register via config `themes.presets` / `themes.preset_paths`, or plugin `->themePresets([...])` / `->discoverThemePresetsIn($path)`. `->withoutBuiltinThemePresets()` hides the four built-in families.
- **`regions()` is empty by default, and `Full` apply replaces only the regions the preset declares.** A preset without `regions()` keeps the old header and footer, so the previous brand's nav and logo survive. Declare them: `BlueprintRegion::make(RegionName::Header)->sections([BlueprintSection::fromPreset(HeaderSection::class, 'modern')])`, and the same for the footer.
- More API: `description()`, `previewImage()`, `screenshots()`; `PresetPage::make(…)->seal()` hides Add section on that page and `->ofType(TemplateType::…)`; `static provision(?Model $owner, ?string $name, ?string $slug): Site` provisions a new tenant's site from it. `make:filamentcraft-theme-preset --from-site=` skips no-code builder sections with a warning. Applying records a snapshot (10 restore points per site, needs the `filamentcraft_site_snapshots` migration); style-only apply resets all theme settings to defaults first (keeping SEO, AI settings and the site's own schemes). A preset that omits `default_font` therefore silently changes the body font: always set `default_font` and `heading_font` explicitly in `style()`. Applying stores only values that differ from the theme's setting default, so a font equal to the default is not written to `settings_json` (it still renders correctly). A preset whose `themeSlug()` names a custom theme needs that class registered, not `filamentcraft:sync-themes`: the applier creates the missing Theme row itself via `Theme::forSlug()`.
- Apply in code: `app(\FilamentCraft\Theming\Presets\ThemePresetApplier::class)->apply($site, new HarborPreset, \FilamentCraft\Enums\ThemeApplyMode::Full)`. `Full` replaces pages and regions; the style-only mode resets style settings. The newest apply can be undone from a snapshot.
- Test it: `\FilamentCraft\Testing\ThemePresetTester::for(HarborPreset::class)->assertValid()->assertRenders();`

The four built-in families, for reference:

| family | scheme | heading_font | default_font | heading_scale | button_radius |
|---|---|---|---|---|---|
| modern | modern | plus-jakarta-sans | inter | 1.25 | 10 |
| editorial | silk | lora | work-sans | 1.4 | 2 |
| bold | velocity | space-grotesk | dm-sans | 1.5 | 24 (uppercase buttons) |
| elegant | neutral | eb-garamond | manrope | 1.35 | 0 |

## Brand Kit

Brand Kit changes nothing that renders. It limits what editors may pick, so an agency's clients can't drift off-brand. It is scoped to the panel it's configured on.

```php
use FilamentCraft\FilamentCraftPlugin;

FilamentCraftPlugin::make()
    ->brandFonts(['inter', 'playfair-display'])          // every font picker becomes an allow-list
    ->brandPalette(['#0f766e' => 'Teal', '#f59e0b' => 'Amber'], locked: true)  // plain Color pickers become swatches
    ->withoutBuiltinSchemes(['cupcake', 'nord']);         // hide only these
```

- `->brandFonts()` limits the options, but "Add custom font" stays visible; only a per-field `Font::only([...])` hides it.
- Pass a whole kit with `->brandKit(BrandKit::make()->fonts([...])->palette([...]))`, or return one from a theme that implements `FilamentCraft\Theming\HasBrandKit`. Resolution order: theme kit, then panel plugin kit, then `config('filamentcraft.brand')`. `Font::only([...])` is an exact per-field list. A kit blocks a preset in the UI (disabled card with the reason), enforced server-side too.
- Verify: `app(\FilamentCraft\Support\BrandKitResolver::class)->configuredKits()` in tinker lists the kits per panel id (and `config`). `fontAllowlist()` returns null outside a panel request, so check the editor side by opening the Themes pickers.
- Brand schemes to keep visible belong on `Theme.tokens_json['schemes']` or the site.
- Bare `->withoutBuiltinSchemes()` hides every built-in, including `modern`, which built-in sections pin. Pass the array form unless the site brands `modern` itself.
- Hiding schemes never empties the picker completely.
- Fonts added by editors in the font picker are scoped to that site. Fonts registered in code with `->registerFont(BrandFont …)` are available to every site.
