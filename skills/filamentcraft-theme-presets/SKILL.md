---
name: filamentcraft-theme-presets
description: "Build FilamentCraft theme presets end to end: one ready-made site look (palette, fonts, pages, header and footer) or a whole set, one per business type, driven by an enum. Use this whenever the user says \"theme preset\", \"preset per industry\", \"a preset for every shop type\", \"bakery/fashion/services theme\", \"site template for tenants\", \"starter look for new tenants\", \"turn this site into a preset\", \"export the AI-generated site as a preset\", \"preset screenshots\" or \"hide the built-in presets\", or writes a `ThemePreset`, `PresetPage` or `ThemePresetTester` test, or runs `make:filamentcraft-theme-preset` (also `--from-site=`). Covers file layout, pages and regions, section presets and the four families, photos and credits, Playwright screenshots, Pest tests, registration and verification. Not for one-off color, font or token changes on one site (use filamentcraft-theming) or for writing section classes (use filamentcraft-sections)."
license: MIT
metadata:
  author: filamentcraft
---

# FilamentCraft theme presets

A theme preset is a ready-made look an operator picks in the editor's **Themes** panel: a set of values for the theme's knobs (`style()`: color scheme, fonts, radius), plus optional content (`pages()`, and a header and footer in `regions()`). `ThemePreset` extends `SiteBlueprint`, so the same class also provisions a new tenant's site. Applying one in Full mode replaces the pages and regions it declares; Style mode changes only the design. Both keep a restore point.

Use this skill for the preset itself. Pair it with `filamentcraft-theming` for the meaning of each token and setting, `filamentcraft-sections` to write a new section class, and `filamentcraft-setup` for tenancy and provisioning wiring.

There is no FilamentCraft MCP server and no screenshot command. You work through artisan, the app's code, Pest and the Playwright script bundled here.

## Pick the path

| The user wants | Path | Read |
|---|---|---|
| One preset ("a bakery theme with a home page") | One class in `app/Themes/Presets` (auto-discovered) | [references/anatomy.md](references/anatomy.md), template `assets/BakeryPreset.php.stub` |
| A set, one per business type (3 to 50) | One enum + one parameterized preset class + shared page builders | [references/preset-sets.md](references/preset-sets.md), templates in `assets/set/` |
| "Turn this site into a preset" (AI-generated or hand-built) | `make:filamentcraft-theme-preset Name --from-site=<slug or id>`, then clean up: keep every page, section and block, rewrite only one business's facts | [references/from-ai-site.md](references/from-ai-site.md) |

Whichever path: build **one** preset completely (style, pages, regions, photos, test, screenshot) before you build more. The first one exposes every wrong assumption about ids, schemes and copy; the rest are then cheap.

## Workflow

### 1. Read the app first

- Existing presets: `php artisan filamentcraft:presets` lists every registered preset with its class, source and problem/warning counts. Also `grep -rn "extends ThemePreset" app/` and the panel provider's `FilamentCraftPlugin::make()` chain (`themePresets`, `withoutBuiltinThemePresets`). Follow the house pattern if there is one.
- Registered sections and their real ids: `php artisan filamentcraft:sections`, then `php artisan filamentcraft:sections <slug> --json` for every section you will use. The JSON lists each setting's `id`, `type` and `options`, the block types, the `defaults` and the family `presets`. Never write a setting id, block type or option value you have not seen there: a wrong id is dropped silently and the section shows its demo copy (`assertStrict()` in step 7 catches it, but only after the fact).
- Does the app have a storefront? Commerce sections (`product-carousel`, `product-listing`, `cart`…) need one; skip them otherwise.

### 2. Ask for what you cannot invent

Business types, names, one-line descriptions, the feel or brand colors, copy, photos and languages come from the user. Ask once, in one message, for whatever is missing. While waiting you may draft palettes and fonts, but write copy as plain placeholders that tell the owner what to say ("Describe your first service."), never invented awards, prices, reviews, years in business or named people. Those end up on every tenant's live site.

### 3. Write the style

```php
public function style(): array
{
    return [
        'color_scheme' => 'bakery',
        'schemes' => ['bakery' => [/* all 22 tokens */]],
        'heading_font' => 'fraunces',
        'default_font' => 'work-sans',
        'heading_scale' => 1.3,
        'button_radius' => 14,
        'box_radius' => 16,
    ];
}
```

- **Author all 22 tokens** (`ColorSchemes::REQUIRED_TOKENS`) with every `on-*` at 4.5:1 or better. A missing token silently becomes the stock `modern` value, so one badge comes out teal. `FilamentCraft\Ai\Support\Contrast::ratio()` measures; `Contrast::foregroundFor($bg)` picks a passing ink.
- **Set both fonts.** Applying resets theme settings first and the stock font is a placeholder, so a preset that sets only `heading_font` changes the body font too. Values are Bunny Fonts slugs; check with `app(\FilamentCraft\Support\FontCatalog::class)->find($slug)`.
- Only ids the site's theme declares apply (Studio: see the `filamentcraft-theming` skill's `references/tokens.md`). A preset cannot carry `seo` or `ai`.
- Keep presets light and branded; never default to the `dark` scheme.

### 4. Write pages and regions

```php
PresetPage::make('Home')->homepage()->withSections([
    BlueprintSection::make(HeroSection::class)->settings([
        'heading' => '…', 'subheading' => '…', 'cta_label' => '…', 'cta_url' => '/visit',
        'cta_secondary_label' => '', 'supporting_text' => '',
        'scheme' => ColorSchemes::INHERIT,
    ])->blocks([]),
]),
```

Three facts about seeding explain most broken presets:

1. **Your settings are merged onto the section's defaults.** Every text setting you skip shows demo copy ("See how it works", "© 2026 FilamentCraft"). Set each visible field or blank it with `''`.
2. **Not calling `->blocks()` seeds the demo blocks** (hero proof points, header links to `/pricing` and `/about`). Pass real blocks or `->blocks([])`.
3. **A pinned scheme beats the preset's.** Built-in defaults pin `modern`; family presets pin `modern`/`silk`/`velocity`/`neutral`. Put `'scheme' => ColorSchemes::INHERIT` on every section you write, header and footer included, or the page background changes and every section stays stock teal.

Then:

- Exactly one `homepage()`; fixed kebab-case page slugs; header nav links pointing at those slugs.
- **Always declare `regions()`** with a header and a footer. Full apply replaces only the regions a preset declares, so without them the previous brand's navigation survives the switch.
- `BlueprintSection::fromPreset(Class::class, 'editorial')` reuses a built-in family variant, but brings its pinned scheme, stock photos and effects. Change single settings on it with `->set('scheme', ColorSchemes::INHERIT)` (merges); `->settings([...])` after it replaces all of the preset's settings. For sets, explicit settings with shared builder methods are clearer. Details, and adding your own family key with `addPresets()`: [references/anatomy.md](references/anatomy.md).
- More than one language: write copy with `__()` from lang files. Each site locale is seeded with that locale active, so translations come for free. Tenant-specific copy (the site's name in the header): implement `BindsToSite`.

### 5. Photos and credits

Use the user's photos; if they have none, ask before sourcing any, and ship none rather than hotlinking. Files go in `public/images/themes/{slug}/` as WebP with fixed role names (`hero.webp`, `story.webp`), referenced by root-relative URL, each listed in a `CREDITS.md` (source, author, licence; template `assets/CREDITS.md`). The templates switch the media layout to `none` when a role file is missing, so a preset without photos still looks finished. Remote URLs break offline and rot, `/storage/...` URLs belong to one site, and `PresetImage`/`/images/filamentcraft/presets/` are the package's own stock photos. Details: [references/assets-and-screenshots.md](references/assets-and-screenshots.md).

### 6. Register, and hide the built-ins if asked

- A class without constructor arguments in `app/Themes/Presets` is discovered automatically (top-level files only). Abstract classes there are skipped.
- A parameterized set implements `FilamentCraft\Theming\Presets\Contracts\ProvidesThemePresets`: a static `themePresets()` returns one instance per case. The class name then registers the whole set, from discovery, the plugin or config `themes.presets`:

```php
FilamentCraftPlugin::make()
    ->withoutBuiltinThemePresets()        // hides Modern, Editorial, Bold, Elegant
    ->themePresets([ShopPreset::class])   // every preset themePresets() returns, in that order
```

- A discovered class that needs constructor arguments and does not implement the contract is skipped with a log warning ("its constructor needs arguments"), so it silently misses the panel. `filamentcraft:presets` shows what actually registered.

- Never reuse a built-in slug (`modern`, `editorial`, `bold`, `elegant`) unless replacing it is the point.
- New tenant site from a preset: `BakeryPreset::provision($tenant, $name, $slug)`, or `app(SiteProvisioner::class)->provision(new ShopPreset($type), $tenant, $name, $slug)` when the class takes arguments.

### 7. Test

```php
uses(RefreshDatabase::class);

it('ships a working preset', function (ShopType $type): void {
    ThemePresetTester::for(new ShopPreset($type))->assertStrict()->assertRendersEveryLocale();
})->with(ShopType::cases());
```

`assertStrict()` runs the doctor's checks (slug, theme, scheme, fonts, page slugs, homepage, screenshot files) **plus** the mistakes that still render: setting or block ids the section does not have, a `fromPreset()` slug that does not exist, an unregistered section, a header or footer pinning its own scheme, empty `regions()`, `heading_font` without `default_font`, `style()` keys the theme lacks. It checks every locale in `locales()`. `assertRendersEveryLocale()` provisions a site and renders every page in every locale (`assertRenders()` does the default locale only). Use `assertValid()` only on a release older than 1.41.29. Add the contrast test from [references/testing.md](references/testing.md) (or copy `assets/set/ShopPresetsTest.php.stub`): the tester does not check contrast or demo copy.

### 8. Screenshots

1. Append `assets/preview-routes.php.stub` to `routes/web.php`. It adds local-only `/_presets` and `/_presets/{slug}/{locale?}`, which render a preset in memory with `ThemePresetPreview` (one existing site is needed; `php artisan filamentcraft:starter` makes one).
2. `npm i -D playwright sharp && npx playwright install chromium`, then from the app root:
   `node <skill>/scripts/capture-preset-screenshots.mjs --base=http://your-app.test`
   It writes `public/images/themes/{slug}/home.webp` (800 px wide, full page) and desktop + phone review PNGs in `.fc-presets/review/`, and flags failed sections, broken images, stock-pinned sections and phone overflow.
3. **Open every review image and critique it** before listing it in `screenshots()`: teal sections, leftover demo copy, broken photos, weak contrast, overflow, fallback fonts, and whether the card reads as that business at a glance. Fix and re-capture. A script cannot judge whether it looks right; you can.

### 9. Verify before you say done

Run all of these and report the results; don't claim done on a red or unrun step.

```bash
php artisan filamentcraft:presets --strict            # every preset registered, 0 problems, 0 warnings (exit 1 otherwise)
php artisan test --filter=Preset                     # ThemePresetTester + contrast tests
php artisan filamentcraft:doctor                     # Theme presets group OK
node <skill>/scripts/verify-presets.mjs --src=app/Shop,app/Themes/Presets
node <skill>/scripts/capture-preset-screenshots.mjs --base=http://your-app.test
```

`verify-presets.mjs` reads the doctor's JSON for preset problems, lints preset sources (hotlinked or `/storage/` images, `PresetImage`, stock-pinned schemes, `fromPreset()` leftovers, emoji), checks every `public/images/themes/{slug}/` has `home.webp` and a `CREDITS.md` that names each file, and runs a test file with `--test=`. Exit 1 means errors.

Then open the editor's Themes panel, apply the preset to a throwaway site, and look at it on desktop and phone width.

## Done means

- Each preset: all 22 tokens readable, both fonts set, every section inherits the scheme, header and footer declared, no demo copy, one homepage.
- Every image local, credited, licence fits a resold template; no invented claims in copy.
- `filamentcraft:presets --strict`, tests and doctor green; screenshots captured, looked at, and listed.
- Registered the way the user asked (built-ins hidden or not), in a sensible order.

## References

- [references/anatomy.md](references/anatomy.md): every method, `style()` keys and ranges, how seeding merges settings and blocks, regions, section presets and families, languages, `BindsToSite`, apply modes, provisioning.
- [references/preset-sets.md](references/preset-sets.md): the enum-driven set, file layout, the table to collect, registration and order, per-tenant branding, scaling to 20.
- [references/from-ai-site.md](references/from-ai-site.md): exporting a site, what the export keeps and drops, clean-up checklist.
- [references/assets-and-screenshots.md](references/assets-and-screenshots.md): photos, credits, preview route, capture script, what to look for.
- [references/testing.md](references/testing.md): what the tester checks, single and set tests, demo-copy test, doctor.
- [references/traps.md](references/traps.md): symptom, cause, fix.
- Templates (drop `.stub` when copying): `assets/BakeryPreset.php.stub`, `assets/set/*`, `assets/preview-routes.php.stub`, `assets/CREDITS.md`.
- Scripts: `scripts/capture-preset-screenshots.mjs`, `scripts/verify-presets.mjs`.
