# Traps and fixes

| Symptom | Cause | Fix |
|---|---|---|
| Page background changes, every section stays stock teal. | Built-in sections pin a scheme (`modern`; family presets pin `modern`/`silk`/`velocity`/`neutral`), and a pinned scheme beats the site's. | `'scheme' => ColorSchemes::INHERIT` on every section you write, header and footer included. After `fromPreset()`, override `scheme` too. |
| Placeholder text on the page ("Acme", "Get started", "See how it works", "© 2026 FilamentCraft"). | Seeding merges your settings **onto the section defaults**, and an uncalled `->blocks()` seeds the demo blocks. | Set every visible text setting or blank it with `''`; always call `->blocks([...])` (or `->blocks([])`). |
| After a Full apply the old header and footer are still there. | `regions()` defaults to `[]`; Full replaces only declared regions. | Declare header and footer in `regions()`. |
| Body font changed though the preset never mentions it. | Apply resets theme settings to defaults; the stock font value is a placeholder. | Set both `heading_font` and `default_font`. |
| Font does not load, headings in a system font. | Slug not in the Bunny catalog, or the capture ran offline. | `FontCatalog::find($slug)`; register a `BrandFont` for self-hosted fonts (`filamentcraft-theming` skill). |
| One color looks off in one place. | Partial scheme: missing tokens fall back to stock `modern`. | Author all 22 tokens. |
| A knob does nothing. | Setting id the theme does not declare (dropped silently), or a Range value outside min/max (renders the default). | Use ids from the theme schema; keep values in range. |
| Preset missing from the Themes panel. | Class outside `app/Themes/Presets` and not registered; or it has constructor arguments without `ProvidesThemePresets` (discovery skips it and logs "its constructor needs arguments"); or it is in a subfolder (discovery is top-level only). | `php artisan filamentcraft:presets` shows what registered. Implement `ProvidesThemePresets`, or register instances with `->themePresets([...])`. |
| `Unresolvable dependency resolving [Parameter #0 …]` at boot. | A parameterized preset listed by class name in `->themePresets()` or config `themes.presets`, without `ProvidesThemePresets` (or on a release before 1.41.29, also in `app/Themes/Presets`). | Implement `ProvidesThemePresets`, or register instances. |
| `…::themePresets() yields itself`. | A provider returned its own class name instead of instances. | Return `new self($case)` objects. |
| `Call to undefined method BlueprintSection::getHeading()` (or `with…`). | Fluent setting calls reject names starting with `get`/`with` and real method names. | `->set('heading', …)`. Digits and acronyms also need `set()`: `->image2()` writes `image2`, not `image_2`. |
| A built-in look disappeared or changed. | Your slug is `modern`, `editorial`, `bold` or `elegant`. | Rename the slug. |
| Card shows a specimen instead of a screenshot. | `screenshots()` empty, or file missing (doctor warns). | Capture, then list it. |
| `doctor`: "screenshot [...] was not found in public/". | Path listed before the file exists, or a leading path mismatch. | Paths are relative to `public/` (`images/themes/bakery/home.webp`); list only existing files. |
| Section looks default after `fromPreset()`. | That section has no preset with that slug; it fell back to defaults silently. | `assertStrict()` names it and lists the slugs it has; so does `filamentcraft:sections <slug>`. |
| Exported preset shows broken images on other sites. | The export keeps the source site's media-library or remote URLs. | Copy to `public/images/themes/{slug}/`, rewrite URLs. |
| Exported preset gives every tenant one company's social links or WhatsApp number. | The export copies the whole `settings_json` minus `seo`/`ai`. | Delete business-specific settings from `style()`. |
| `make:filamentcraft-theme-preset` hangs. | No name argument, or `--from-site=` with no value, or the file exists: it prompts. | Pass the name, a site slug or id, `--force` and `--no-interaction`. |
| `ShopPreset::provision()` fails. | `provision()` builds the class with no arguments. | `app(SiteProvisioner::class)->provision(new ShopPreset($type), $owner, $name, $slug)`. |
| Card is disabled with a reason. | The panel's Brand Kit blocks the preset's fonts, scheme or palette. | Fix the preset to fit the Brand Kit, or change the Brand Kit (`filamentcraft-theming` skill). |
| Commerce section renders empty or fails in the test. | No `Storefront` registered in the host app. | Leave commerce sections out, or wire a storefront (`filamentcraft-storefront` skill). |
| Preview route 404s. | `APP_ENV` is not `local`, cached routes, or no site exists. | `php artisan route:clear`; create a site with `filamentcraft:starter`. |
| Every screenshot has the first preset's colors. | Your own render loop reused the memoized design tokens. | Use `ThemePresetPreview` (it clears the compiler) or clear `DesignTokenCompiler` between renders. |
| Headless Chromium crashes during capture. | Emoji on the page with an old Chromium build. | Heroicons instead of emoji; `npx playwright install chromium`. |
| Translated site shows English copy. | Copy hard-coded in PHP, not `__()`, or the lang file is missing for that locale. | Lang files per locale; each locale is seeded with that locale active. |
| `PresetImage::photo()` URL is broken in the host. | It points at the package's bundled photos for the built-ins. | Use your own files. |
| Operators' existing sites didn't change after you edited a preset. | By design: applying copies the preset into the site. | Operators re-apply (with undo) if they want the new version. |
