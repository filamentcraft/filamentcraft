# Theme classes, theme presets and Brand Kit

## Contents
- Theme class: when you need one, scaffold, schema, registration, assigning it to a site
- Theme presets: one-click looks (and whole starter sites)
- Brand Kit: locking fonts and colors for an agency's editors

## Theme class

Write one only when the built-in `studio` theme lacks a knob you need (a new CSS variable the editor should control) or you must ship a stylesheet with the theme. Otherwise configure `studio` through settings and schemes.

```bash
php artisan make:filamentcraft-theme Acme   # app/Themes/AcmeTheme.php; --slug= --namespace= --path= --force
```

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
- `cssVar()` works only in a theme schema. On a section setting it is silently ignored.
- `Checkbox` needs `->cssValues(on, off)` to emit anything.
- `Range` values outside min/max fall back to the default when emitted.
- Top-level `Setting`s without a `Category` land in an implicit "General" group.
- `stylesheets()` / `scripts()` URLs load on public pages **and** in the editor preview.

**Register it in config.** Config registration covers panel, preview and public routes. The plugin's `->registerTheme()` only applies inside the panel, so public pages could fall back to the default theme.

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

Registering a class with an existing slug replaces that theme. An unknown slug on a site's theme row silently falls back to the default theme.

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
    ->withoutBuiltinSchemes();                            // or ->withoutBuiltinSchemes(['cupcake', 'nord'])
```

- Pass a whole kit with `->brandKit(BrandKit::make()->fonts([...])->palette([...]))`, or return one from a theme that implements `FilamentCraft\Theming\HasBrandKit` (the theme's kit wins over the panel's).
- Brand schemes to keep visible belong on `Theme.tokens_json['schemes']` or the site.
- Hiding schemes never empties the picker completely.
- Fonts added by editors in the font picker are scoped to that site. Fonts registered in code with `->registerFont(BrandFont …)` are available to every site.
