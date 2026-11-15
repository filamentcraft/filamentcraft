# Building a set of presets (one per business type)

Use this for anything from 3 to 50 presets that share structure: "one preset per industry", "a theme for every shop type", "20 site templates for our tenants".

## Contents

- Why one parameterized class
- Get the table first
- File layout
- Step by step
- Registration, order and hiding the built-ins
- Provisioning tenants and per-tenant branding
- Scaling from 3 to 20

## Why one parameterized class

The four built-in presets were hand-written: 39 sections times four variants, bundled photos and logos. Copying that per business type is weeks of work and 20 copies of the same 300 lines that drift apart. A host app that shipped 13 presets did this instead: **one enum, one preset class that takes the enum, shared page builders**. Adding a preset is then one enum case, one ~20-line home page, a block of copy and three photos.

## Get the table first

Before writing code, have one row per preset. Ask the user for what is missing; never invent business facts.

| Column | Example | Used by |
|---|---|---|
| slug | `bakery` | enum value, URL of images, registry key |
| name, one-line description | Bakery / Warm and handmade, for bakeries… | card, lang file |
| feel / palette | warm cream, rust primary | `tokens()` (all 22) |
| heading + body font | `fraunces` + `work-sans` | `style()` |
| radius, scale | 14 / 1.3 | `style()` |
| home section order | hero, features, story, faq, cta | `Homes/*Home.php` |
| copy | from the user, or plain placeholders that say what to write | `lang/{locale}/shop-presets.php` |
| photos | user-supplied files, or none yet | `public/images/themes/{slug}/` |
| locales | en, ar | `lang/` folders, preset `locales()` |

## File layout

The templates in `assets/set/` are a complete, tested 3-preset set (bakery, fashion, services). Copy them, dropping the `.stub` suffix:

```text
app/Shop/ShopType.php                  ← assets/set/ShopType.php.stub       (the table: tokens, fonts, home class, photos)
app/Shop/ShopPreset.php                ← assets/set/ShopPreset.php.stub     (ThemePreset + BindsToSite, takes the enum)
app/Shop/Pages/HomePage.php            ← assets/set/Pages/HomePage.php.stub (abstract: hero(), features(), story(), faq(), cta())
app/Shop/Pages/ContactPage.php         ← assets/set/Pages/ContactPage.php.stub (shared by every preset)
app/Shop/Pages/Homes/BakeryHome.php    ← assets/set/Pages/Homes/*.php.stub  (~20 lines: order + a few layout knobs)
lang/en/shop-presets.php               ← assets/set/shop-presets.php.stub   (copy per type)
public/images/themes/{slug}/           ← home.webp, role photos, CREDITS.md (assets/CREDITS.md)
tests/Feature/ShopPresetsTest.php      ← assets/set/ShopPresetsTest.php.stub
```

Rename `Shop`/`ShopType` to the user's domain (`Academy`, `ClinicType`…) consistently. `ShopPreset` implements `ProvidesThemePresets`, so its class name registers every case wherever it lives; `app/Shop` keeps the set together. (Without the contract, discovery skips a class with constructor arguments and logs a warning.) An abstract base in `app/Themes/Presets` is skipped, so a shared parent is safe.

Lang files: Laravel 11+ apps may have no `lang/` folder yet. Creating `lang/en/shop-presets.php` is enough (`php artisan lang:publish` is not needed).

## Step by step

1. **Discover.** `php artisan filamentcraft:sections` and `--json` for every section you plan to use. The templates use `hero`, `features`, `image-text`, `faq`, `cta`, `contact`, `header`, `footer`; add a builder to `HomePage` for any other (gallery, testimonials, pricing, steps, logo-cloud…), with every visible text set and `->blocks()` explicit.
2. **Build one preset end to end**: tokens, fonts, home, contact page, header, footer, photos, screenshot, passing test. Look at its screenshot.
3. **Refactor**: whatever you hard-coded for the first type moves into `HomePage` builders or the enum. The second preset is the real test of the builders.
4. **Show the user the first two** (screenshots + the table) before writing the rest, unless they said not to.
5. **Add the rest** as enum cases: one `tokens()` arm, one `style()` arm, one `homePage()` arm, one home class, one lang block, photos + `CREDITS.md`.
6. **Register, test, capture, verify** for the whole set (SKILL.md, step 7 onwards).

Variation that makes 20 presets look different without 20 designs: palette and fonts (the biggest lever), section order, hero `layout` (`spotlight`, `editorial`, `compact`) and `media_mode`, features `layout` (`cards`, `bands`, `minimal`) and `columns`, CTA `layout` (`center`, `split`, `banner`), `shape`, `density`, `button_radius`/`box_radius`, `button_uppercase`. Read the options from `--json`; don't guess.

## Registration, order and hiding the built-ins

In the panel provider:

```php
use App\Shop\ShopPreset;
use FilamentCraft\FilamentCraftPlugin;

FilamentCraftPlugin::make()
    ->withoutBuiltinThemePresets()
    ->themePresets([ShopPreset::class])
```

- A `ProvidesThemePresets` class name works in all three places: the plugin, config `themes.presets`, and discovery. Instances (`->themePresets(ShopPreset::themePresets())`) work too.
- Panel order = registration order. Sort `themePresets()` (enum case order) the way cards should appear.
- Preset slugs are stored on every site's restore point, so never rename an enum value once tenants use it.
- `withoutBuiltinThemePresets()` removes Modern, Editorial, Bold and Elegant from the panel. Sites that already applied one keep their look. Config equivalent: `filamentcraft.themes.builtin_presets => false`.
- A slug equal to a built-in (`modern`, `editorial`, `bold`, `elegant`) replaces it; avoid unless intended.
- Single presets with no constructor: put them in `app/Themes/Presets` (auto-discovered), or `->themePresets([BakeryPreset::class])`, or `->discoverThemePresetsIn(app_path('Presets'))` (top-level files only), or config `themes.presets` / `themes.preset_paths`.
- Confirm: `php artisan filamentcraft:presets` lists exactly the set with 0 problems and 0 warnings (`--strict` exits 1 otherwise).

## Provisioning tenants and per-tenant branding

```php
use FilamentCraft\Blueprints\SiteProvisioner;

$site = app(SiteProvisioner::class)->provision(new ShopPreset(ShopType::Bakery), $tenant, $tenant->name, $tenant->slug);
```

`ShopPreset::provision()` would build the class with no arguments and fail, so use the provisioner. Tenancy wiring (owner model, `tenantSites()`, onboarding hooks) is the `filamentcraft-setup` skill.

`ShopPreset` implements `BindsToSite` so the header and footer show the tenant site's name. To recolor each tenant's copy of a preset with their own brand color, compute the scheme from the bound site in the same way; keep `style()` working when `$this->site` is `null`.

## Scaling from 3 to 20

- Budget: the shared base takes the longest. After that, most time per preset goes into honest copy and choosing photos.
- One commit-sized step per few presets; run the test and capture after each batch, not only at the end.
- Keep palettes distinct: no two presets with the same primary and fonts. A quick table of `slug, primary, heading_font, default_font` catches duplicates.
- Copy stays plain and honest. Placeholders that tell the owner what to write ("Describe your first service.") beat invented specifics (awards, prices, years in business, reviews, named people).
