# Building a set of theme presets

Use this when the task is "make N theme presets" (one per business type), "turn this site into a preset", or "capture preset screenshots". For one preset and the preset API, see the "Theme presets" section of [theme-authoring.md](theme-authoring.md). Human guide: https://filamentcraft.dev/guide/theme-presets

There is no FilamentCraft MCP server. Work through artisan commands, the host repo's code, Pest and Playwright.

## Model

- `ThemePreset` extends `SiteBlueprint`: `style()` (values for the theme's knobs), `pages()`, `regions()`, `screenshots()`. One class is both a Themes-panel entry and a tenant-provisioning blueprint.
- A style family is only the shared preset key (`modern`, `editorial`, `bold`, `elegant`) on built-in sections. `BlueprintSection::fromPreset($class, $slug)` falls back to section defaults when the slug does not exist, so a typo is silent. For a set, prefer explicit `->settings([...])` with shared helpers. Add a custom key to built-ins with `FilamentCraftPlugin::make()->addPresets(HeroSection::class, [Preset::make('bakery', 'Bakery')->settings([...])])`.
- Only theme-declared setting ids in `style()` apply. A preset cannot set `seo` or `ai`; Full apply keeps the site's own.
- The built-in four were written by hand. Do not copy that method for a set.

## Discover, never guess

```bash
php artisan filamentcraft:sections                 # every section slug
php artisan filamentcraft:sections hero --json     # settings ids, block types, defaults, presets
php artisan filamentcraft:doctor                   # validates host presets
```

Read the JSON before writing any `->settings()` or `->blocks()`. A block is `['id' => 'feature-1', 'type' => 'feature', 'settings' => [...]]`.

## Build a set (workflow)

1. Get the table from the user: slug, name, one-line description, brand feel, fonts, section order, copy, photo source. If it is missing, ask for it.
2. Use one parameterized class, not N classes:
   - `app/Shop/ShopType.php` (enum: tokens, fonts, radius, photo roles, home page class),
   - `app/Shop/ShopPreset.php` (`extends ThemePreset`, constructor takes the enum, `static all(): list<self>`),
   - shared page blueprints (`AbstractBlueprint`), one abstract home with section builders, one small home per type,
   - `lang/en/shop-presets.php`, `public/images/themes/{slug}/` (screenshot, photos, `CREDITS.md`), a Pest test.
3. Keep `ShopPreset` OUT of `app/Themes/Presets`. Auto-discovery builds classes with no arguments and fails on a constructor argument. Register instances: `FilamentCraftPlugin::make()->withoutBuiltinThemePresets()->themePresets(ShopPreset::all())`. Config `themes.presets` takes class names only.
4. Build ONE preset end to end first (tokens, home, header, footer, photos, screenshot, test). Move hard-coded bits into the shared builders. Then add the rest as enum cases.
5. Provision a tenant site from an instance with `app(\FilamentCraft\Blueprints\SiteProvisioner::class)->provision(new ShopPreset($type), $owner, $name, $slug)`. `ShopPreset::provision()` cannot build a class that needs constructor arguments.

## Style rules

- Author all 22 tokens in `schemes`, with `on-*` at 4.5:1 or better (`\FilamentCraft\Ai\Support\Contrast::foregroundFor($background)`). Set `color_scheme` to the authored slug.
- Set `heading_font` AND `default_font` explicitly (Bunny slugs; check `app(\FilamentCraft\Support\FontCatalog::class)->find($slug)`). A preset that omits one changes the body font silently.
- Every section you write gets `'scheme' => \FilamentCraft\Support\ColorSchemes::INHERIT`, or it stays on its pinned stock scheme. Header and footer both take it.
- Declare `regions()` (header and footer). Full apply replaces only declared regions, so an empty `regions()` keeps the old brand's header and footer.
- Exactly one homepage. Slugs are kebab-case and stable.
- Copy in lang files, never invented: no awards, press, prices, reviews or people.
- Images: local files under `public/images/themes/{slug}/`, root-relative URLs (`/images/themes/bakery/hero.webp`), WebP, fixed role names (`hero`, `action`), a `CREDITS.md` per preset (source URL, photographer, licence). Never hotlink. `PresetImage::photo()` points at the package's own photos: do not use it.

## Screenshots

`ThemePresetPreview` renders a preset in memory and returns the full HTML. There is no route, so add a local-only one to the host app:

```php
if (app()->isLocal()) {
    Route::get('/_presets', fn () => array_keys(app(ThemePresetRegistry::class)->all()));
    Route::get('/_presets/{slug}', function (string $slug) {
        $preset = app(ThemePresetRegistry::class)->find($slug) ?? abort(404);
        $site = Site::query()->orderBy('id')->firstOrFail();

        return response(app(ThemePresetPreview::class)->render($site, $preset, ThemeApplyMode::Full, null, null));
    });
}
```

(`FilamentCraft\Theming\Presets\ThemePresetPreview`, `ThemePresetRegistry`, `FilamentCraft\Enums\ThemeApplyMode`, `FilamentCraft\Models\Site`.) Use a site that belongs to a tenant if the presets read the tenant. Full mode always renders the homepage.

Capture with Playwright (`npm i -D playwright sharp && npx playwright install chromium`):

- viewport 1440x900, abort every request except the app host and `fonts.bunny.net`,
- `await page.evaluate(() => document.fonts.ready)`, then scroll the page top to bottom so lazy images load,
- `page.screenshot({ fullPage: true })`, then `sharp(png).resize({ width: 800 }).webp({ quality: 80 })` to `public/images/themes/{slug}/home.webp`,
- list it in `screenshots()` (first = cover; the card crops 16:10 from the top).

The full script is in https://filamentcraft.dev/guide/theme-presets#screenshots. Old headless Chromium crashes on emoji pages; use Heroicons. After capturing, OPEN each image and critique it: contrast, empty sections, broken photos, overflow, sections that stayed teal. Fix, re-render, re-capture.

## Test

```php
it('ships a working preset', function (ShopType $type): void {
    ThemePresetTester::for(new ShopPreset($type))->assertValid()->assertRenders();
})->with(ShopType::cases());
```

`FilamentCraft\Testing\ThemePresetTester`. Run it, plus `php artisan filamentcraft:doctor`. Font checks are skipped when the Bunny list fell back to four fonts; run `app(\FilamentCraft\Support\FontCatalog::class)->flush()` after a failed fetch.

## From an AI-generated site

The in-product AI assistant writes a normal site. Export it as a draft:

```bash
php artisan make:filamentcraft-theme-preset Bakery --from-site=bakery-draft   # --slug --path --namespace --force
```

Limits and fixes:

| Limit | Fix |
|---|---|
| Default locale only | Implement `LocalizedBlueprint` on the page (`sectionsForLocale()`), or move strings to lang files with `__()`. |
| No `seo` / `ai` | Set tenant defaults in provisioning code or a `ThemePresetApplied` listener. |
| No-code builder sections skipped (warning printed) | Rebuild as built-in or custom section classes, re-export. |
| No media handling (image URLs are the source site's media library or remote URLs) | Copy files to `public/images/themes/{slug}/`, rewrite every URL (search for `http` and `/storage/`). To carry images, use `filamentcraft:export` or the site-migration skill's JSON spec with `filamentcraft:import --dry-run`. |
| Copy is literal strings | Move into lang files. |
| `schedule()` not exported | Add it back by hand. |

Treat the export as a draft: review copy, photos and contrast, then add `screenshots()` and tests.

## Done when

- `filamentcraft:doctor` is clean and the Pest dataset test passes for every preset.
- Every card has a screenshot you looked at, on desktop and phone width.
- Every image is local and listed in `CREDITS.md`; copy has no invented claims.
- No section stays on a stock pinned scheme; header and footer are declared; fonts are explicit.
