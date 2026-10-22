# Pitfalls: slugs, cache, styling, catalog, contract

## Contents
- Slug collisions
- The fragment cache ignores your code
- Editor canvas vs the published page
- No-code builder sections
- Catalog curation
- Section contract notes
- Rendering and debugging

## Slug collisions

The default `slug()` is the kebab-cased class name minus `-section`. Registration runs after the built-ins and is **last-wins**, so `app/Sections/FaqSection.php`, `HeroSection.php`, `PricingSection.php`, `TeamSection.php`, `StatsSection.php`, `FooterSection.php` and so on silently **replace the built-in everywhere**: every stored page and the header/footer regions render your class with the old stored settings, no error. `doctor` only warns about an "accidental" same-slug class.

- Run `php artisan filamentcraft:sections` first and pick a slug (and class name) that is not in the list, unless replacing is the goal (then use `filamentcraft:customize-section --replace`).
- `custom::<slug>` slugs belong to no-code builder sections (`SectionDefinition::SLUG_NAMESPACE`). Never hand-register a section with prefix `custom`.
- `registerSection($class, $prefix)` / `discoverSectionsIn($path, $prefix)` and config `sections.paths` (path => prefix) namespace the slug as `prefix::slug`; the Livewire alias becomes `filamentcraft-section.prefix.slug`. A prefix avoids collisions with built-ins and with other packages.
- Rollback of an accidental replacement: delete the class and run `composer dump-autoload`.

## The fragment cache ignores your code

The cache key covers site, section id, a hash of settings/blocks/scheme/context, locale and theme version. It does **not** see your Blade view, section class, `defaults()` or the package version. On a live site with a taggable cache store (redis, memcached), a changed view serves stale HTML for up to `cache.ttl` (3600 s). On `file`/`database` stores nothing is cached, so dev can look fine while prod is stale.

After changing a section on a live site, run `php artisan filamentcraft:clear-cache` and put it in the deploy script. Sections that read the request, session, cart, user or time return `cacheable(): false`.

## Editor canvas vs the published page

The canvas can show classes the public page lacks. `mirrorEditorStyles()` and a panel theme `@source` on `app/Sections` style the **editor only**; public pages load `site.css` plus whatever `filamentcraft.assets.*` and the theme add. So `line-clamp-2`, `min-w-5` or `text-[13px]` look right in the editor and are absent live.

- Judge styling on the **published URL**, and run `scripts/check-classes.php` regardless.
- A host Tailwind bundle's **layered** utilities lose to the package's same-named ones (`site.css` declares `@layer theme, base, components, utilities, filamentcraft`); unlayered host CSS wins. A React/Vue island's scaffolded stylesheet (`resources/css/filamentcraft-islands.css`) puts its utilities in a `filamentcraft-islands` layer; if `h-60` or `bg-teal-500` lose to site.css base rules, that layer is ordered before the package's `filamentcraft` layer: declare it after.
- `assets.site_css_enabled = false` removes the package CSS entirely. `viteManifest()` with a wrong path registers nothing, silently. Plugin-level asset calls reach public pages only through the default panel: prefer `filamentcraft.assets.*` (setup skill, config-pitfalls.md).

## No-code builder sections

Config `section_definitions`: `enabled` (env `FILAMENTCRAFT_SECTION_DEFINITIONS`), `max_per_site` 50, `max_nodes` 100, `allow_custom_code` false (raw `<script>` for the html element; a developer decision, never expose to tenants). They are stored per site as type `custom::<slug>`, exported with the site, and need the `filamentcraft_section_definitions` migration. Deleting a definition blanks every placed instance. `withoutSections()` limits built-in and PHP sections; the builder is governed by `section_definitions.enabled` (false stops resolving builder sections). When writing site specs or revisions by hand, builder sections appear as `custom::name`.

## Catalog curation

- `allowSections()` / `withoutSections()` / config `sections.allowed|disabled` are enforced by `isSectionAddable()` on the **editor's insert paths** only. A revision or blueprint written in code can still contain a "hidden" section, and existing instances keep rendering.
- `withBuiltinSections(false)` **unregisters** the 38 built-ins: stored pages that use them render nothing. Use it only on a fresh install.
- Hook rules (`hidePresets`, `addPresets`) apply to subclasses of the named section. Setting types are non-final: subclass one and register `settingComponentUsing()` for just the subclass. A render hook that throws renders nothing; hooks are global across panels.

## Section contract notes

- `enabledOn()` / `disabledOn()` are listed by `filamentcraft:sections --json` but **not enforced**; do not rely on them. `wrapper()` is descriptive and wraps nothing. `maxBlocks()` (default 16) is only the AI assistant's fallback cap; `Block::limit()` is the enforced cap.
- `category()` groups the catalog (default `general`); `description()` and `$previewImage` feed the picker.
- `filamentcraft:sections <slug> --json` includes defaults and full presets.
- Section ids become anchors: sanitised to `A-Za-z0-9._-`; empty gives no anchor; ids starting `fc-` get none.
- `ColorScheme::make()` is `inheritable()` by default, so editors always get an "inherit" option unless you call `inheritable(false)`.

## Rendering and debugging

- A section that throws is dropped from the public page and recorded for `doctor`. On staging set `FILAMENTCRAFT_SHOW_RENDER_ERRORS=true` (`rendering.show_errors`) to see the failure card instead of a silent hole.
- `sections.alpine_root = false` stops the automatic `x-data` root, for sections you root by hand.
- `SectionRenderer` sets the app locale per section render, so `__()` and `Carbon::locale` in a section view follow the section's locale.
- Exactly one h1 per page: `fc-title--display` is the h1. The SEO checklist counts h1 only from `hero`, `store-hero`, `product-detail`, `cart` and `checkout`, so a custom hero plus a built-in hero gives two.
- Custom `position: fixed` elements must clear the phone bottom bar: `bottom: calc(1rem + var(--fc-bottom-chrome, 0px) + env(safe-area-inset-bottom, 0px))`.
- Links in custom commerce markup should carry `data-fc-nav="product|shop|category|cart|checkout"` (plus `data-fc-nav-slug`) and locale links `data-fc-locale`, so the editor canvas switches pages instead of leaving the editor. Built-ins set them.
- Custom forms: render the `website` honeypot input (`wire:model="website"`, hidden) when you use `GuardsFormSubmissions`, or the guard does nothing; dispatch `ContactFormSubmitted` with the real `Site` and a `sectionId`, or nothing is stored.
