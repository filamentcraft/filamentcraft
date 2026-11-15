# Turning a site into a preset (AI-generated or hand-built)

The editor's AI assistant (and any site built by hand in the editor) writes a normal site to the database. `make:filamentcraft-theme-preset --from-site` turns that site into a `ThemePreset` class. Treat the result as a **draft**: it is faithful, not finished.

**The site's design is what the user is asking you to keep.** Every page, section, section order, layout setting, block count and authored scheme is the tuning they did; a preset that drops sections or flattens the copy to a few generic lines throws that work away. Clean up only what belongs to one business (its facts, links and media), slot by slot, and keep everything else.

## Export

```bash
php artisan make:filamentcraft-theme-preset Harbor --from-site=5 --no-interaction
```

| Option | Meaning |
|---|---|
| `name` (argument) | Class name. `Harbor` and `HarborPreset` both give `HarborPreset`. Always pass it; without it the command prompts. |
| `--from-site=` | Site slug or id (the slug is tried first, then the id). An empty value opens a picker, which hangs a non-interactive agent: always pass a value. |
| `--slug=` | Preset slug. Defaults to the kebab-cased name (`harbor`). |
| `--path=` / `--namespace=` | Default `app/Themes/Presets` / `App\Themes\Presets` (auto-discovered). Any other path needs registering, and the command prints how. |
| `--force` | Overwrite an existing file without asking. |

Find the site first if the user gave a name, not an id:

```bash
php artisan tinker --execute="FilamentCraft\Models\Site::query()->get(['id','name','slug'])->each(fn (\$s) => print(\$s->id.' '.\$s->slug.' '.\$s->name.PHP_EOL));" </dev/null
```

The command prints a warning for each section it skipped. Read them.

## What the export contains

- `slug()`, `name()`, `themeSlug()` (the site's theme, usually `studio`), `screenshots()` returning `[]`, `style()`, `pages()`, `regions()`. No `description()`.
- `style()`: the site's whole `settings_json` minus `seo` and `ai`.
- `pages()`: every page of the site as `PresetPage::make(name, slug)`, the homepage marked, non-page types with `->ofType(TemplateType::...)`. Content comes from each page's **latest draft** (head revision), not the published one.
- Each section: `BlueprintSection::make(Class::class)` with only the settings that differ from that section's defaults, its blocks when they differ, `->lock()` / `->hide()` when set.
- `regions()`: every region the site has (header, footer, announcement).

## What it drops, and the fix for each

| Limit | Fix |
|---|---|
| **Default locale only.** Other languages are lost. | Move strings into `lang/{locale}/…` files and call `__()`; each site locale is seeded with that locale active. Or implement `LocalizedBlueprint` on a page. |
| **No `seo` / `ai`.** | Nothing to do for the preset: Full apply keeps each site's own. Seed defaults for new tenants in provisioning code or a `ThemePresetApplied` listener. |
| **No-code builder sections (`custom::…`) are skipped**, with a warning. | Rebuild with built-in sections or a section class (`filamentcraft-sections` skill), re-export or edit by hand. |
| **No media handling.** Image settings keep the source site's URLs: media-library paths (`/storage/…`) of that one site, or remote URLs. Other tenants get broken images. | Copy each file to `public/images/themes/{slug}/` (WebP, fixed role names), rewrite every URL to `/images/themes/{slug}/{role}.webp`, add `CREDITS.md`. Search the file for `http`, `/storage/` and `/images/filamentcraft/presets/` (stock photos). |
| **Copy is literal strings** in one language. | Move it to a lang file when the preset is reused or translated. |
| **Section schedules** (`->schedule()`) are not exported. | Add them back by hand if needed. |
| **Settings that are about that one business** travel in `style()`: `social_facebook`, `social_instagram`…, `whatsapp_number`, `enable_whatsapp`, `header_announcement_text`, `custom_css`. | Delete them from `style()`; a preset must not give every tenant one company's links. |
| **Site-specific schemes**: `schemes` holds every scheme the site overrode, maybe `modern` or `dark` too. | Keep only the scheme(s) the preset uses; author all 22 tokens; set `color_scheme` to it. |
| **Real business content**: the business name, people, phone numbers, addresses, prices, product names, testimonials with names. | Rewrite **in place**: keep the section, its layout and the same number of blocks, and replace each fact with a placeholder of the same shape ("Your signature product", "Name, role", "From $00"). Never delete a section or its blocks because the copy was specific: a team, testimonials, pricing or gallery section is part of the design. If unsure whether content is the user's to ship to every tenant, keep it as-is and ask. |

## Clean-up checklist

1. Run the export, read the warnings.
2. Open the class. Add `description()`.
3. Strip tenant-specific settings and schemes from `style()`; confirm `heading_font` and `default_font` are both set (add them if the site used theme defaults).
4. Check every section has `'scheme' => '__inherit'` (AI-generated sites write it) or deliberately pins a scheme the preset authors. Built-in defaults pin `modern`. Keep deliberate accent pins (a dark CTA band on an authored second scheme): author that scheme's 22 tokens in `schemes` too, and point the pin at it.
5. Re-home every image (above). Replace stock `/images/filamentcraft/presets/...` photos the AI kept.
6. Business facts, slot by slot (table above): keep every section and block, rewrite only the facts. Header and footer brand text is the source site's name: implement `BindsToSite` to use the tenant site's name (see `assets/set/ShopPreset.php.stub`), or make it neutral.
7. Before you finish, compare against the export: same pages, same sections in the same order, same block counts. Report anything you removed and why.
8. Move copy to lang files if the preset needs more than one language.
9. Add a test with `assertStrict()` (`references/testing.md`), capture a screenshot, list it in `screenshots()`.
10. Run `php artisan filamentcraft:presets harbor --strict` (setting ids the export carried over from an older section version show up here), `filamentcraft:doctor` and the verify script.

## Generating with the in-editor assistant first

If the user has no site yet and wants AI help: in the editor, open the assistant, choose **Whole site** with **Also design the site** on, give the business type, tone and one of the four style families, then tune the result by hand. The assistant needs `laravel/ai` and a configured provider; it writes over the site it runs on, so generate on a throwaway site. Then export as above. Generating a set of 20 this way gives 20 unrelated structures: for a set, export one or two as a reference and build the rest with `references/preset-sets.md`.
