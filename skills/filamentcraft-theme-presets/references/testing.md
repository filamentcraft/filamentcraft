# Testing presets

## What `ThemePresetTester` checks

`FilamentCraft\Testing\ThemePresetTester::for($classOrInstance)`:

- `->assertValid()` runs `ThemePresetValidator` (the same checks `filamentcraft:doctor` runs): kebab-case slug; `themeSlug()` is a registered theme; `color_scheme` is a built-in scheme, one of its theme's, or authored in `schemes`; font slugs are in the catalog; no two pages share a slug; at most one `homepage()`; `pages()` and `regions()` don't throw; every listed screenshot exists in `public/`.
- `->assertStrict()` (1.41.29+) runs `assertValid()` plus `ThemePresetValidator::warnings()`, in every locale of `locales()`: a section class that is not registered; a `fromPreset()` slug the section has no preset for (the message lists the ones it has); setting or block ids the section does not declare; a header or footer that pins its own scheme while the preset sets `color_scheme`; empty `regions()`; `heading_font` without `default_font`; `style()` keys the preset's theme does not have. All of these render without an error, which is why `assertValid()` misses them. **Use `assertStrict()` for every preset you write.**
- `->assertRenders()` provisions a real site from the preset (creating the default theme row if the table is empty), checks every page was seeded, and renders each one, failing on `fc-missing-section` (a section that threw).
- `->assertRendersEveryLocale()` (1.41.29+) does the same for each locale the preset lists, so a missing translation key or a locale-only crash shows up.
- `->site()` returns that provisioned site for your own assertions.

It does **not** check contrast, leftover demo copy, photos or looks. That is what the extra tests below and the screenshot review are for.

## One preset

```php
<?php

declare(strict_types=1);

use App\Themes\Presets\BakeryPreset;
use FilamentCraft\Ai\Support\Contrast;
use FilamentCraft\Support\ColorSchemes;
use FilamentCraft\Testing\ThemePresetTester;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('ships a valid bakery preset that renders every page', function (): void {
    ThemePresetTester::for(BakeryPreset::class)->assertStrict()->assertRendersEveryLocale();
});

it('authors every color token with readable text', function (): void {
    $tokens = (new BakeryPreset)->style()['schemes']['bakery'];

    expect(array_keys($tokens))->toEqualCanonicalizing(ColorSchemes::REQUIRED_TOKENS);

    foreach ($tokens as $name => $color) {
        if (str_starts_with($name, 'on-')) {
            expect(Contrast::ratio($color, $tokens[substr($name, 3)]))->toBeGreaterThanOrEqual(4.5, $name);
        }
    }
});
```

Put it in `tests/Feature/`. If the app uses PHPUnit classes instead of Pest, wrap the same calls in a `TestCase` method with `use RefreshDatabase;`.

## A set

`assets/set/ShopPresetsTest.php.stub` runs both tests above for every enum case with `->with(ShopType::cases())`, checks the registry holds exactly the set (built-ins hidden), and that every preset has a screenshot. Add the screenshot test after the first capture; it is meant to fail until then.

## Useful extra assertions

```php
it('leaves no demo copy behind', function (): void {
    $site = ThemePresetTester::for(BakeryPreset::class)->site();
    $html = app(\FilamentCraft\Theming\Presets\ThemePresetPreview::class)
        ->render($site, new BakeryPreset, \FilamentCraft\Enums\ThemeApplyMode::Full, null, null);

    expect($html)->not->toContain('Acme')
        ->not->toContain('Build pages that already look intentional')
        ->not->toContain('FilamentCraft. All rights reserved');
});
```

Pull other demo strings from `php artisan filamentcraft:sections <slug> --json` (`defaults`) for the sections you use.

## Running them

```bash
php artisan test --filter=Preset             # or: vendor/bin/pest tests/Feature/ShopPresetsTest.php
php artisan filamentcraft:presets            # table: slug, class, source, problem and warning counts, then each message
php artisan filamentcraft:presets bakery --json
php artisan filamentcraft:presets --strict   # exit 1 on any warning, not only on problems
php artisan filamentcraft:doctor             # Theme presets group: problems as warnings, strict count in the label
```

`filamentcraft:presets` is the quickest loop while editing: it needs no test database and reads the presets the app actually registered. A preset missing from its list never reached the registry (see `traps.md`).

- Tests need the FilamentCraft migrations in `database/migrations` (published by `filamentcraft:install`) and `RefreshDatabase`.
- Font checks only run when the full Bunny Fonts list (more than 100 fonts) loaded. Offline, the catalog falls back to four fonts and the check is skipped, so a typo can pass in CI. With network, check slugs once: `php artisan tinker --execute="dump(app(\FilamentCraft\Support\FontCatalog::class)->find('fraunces'));" </dev/null`. After a failed fetch, `app(\FilamentCraft\Support\FontCatalog::class)->flush()`.
- `doctor` warns "Theme presets … `filamentcraft_site_snapshots` table is missing" on old installs: run `php artisan filamentcraft:upgrade`.
- `doctor` skips the built-ins; a warning names the preset and the problem.
- `BindsToSite` presets are checked unbound (`$site` is `null`), so keep `pages()` and `regions()` working without a site.
