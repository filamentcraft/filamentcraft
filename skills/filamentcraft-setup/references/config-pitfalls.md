# Config, assets, cache and model pitfalls

## Contents
- Assets: where host CSS and JS reach
- Fragment cache and deploys
- Editor drafts cache
- Key types
- Model overrides
- Blueprints that seed every site
- Licence tiers
- Livewire 3 and 4
- Icons and images

## Assets: where host CSS and JS reach

- Plugin-level `->stylesheet()`, `->script()`, `->viteBuild()`, `->viteManifest()` reach **public pages only through the default panel**: the renderer calls `FilamentCraftPlugin::get()` inside a silent `try/catch`, and `filament('filamentcraft')` resolves via the current-or-default panel. If FilamentCraft is registered on a non-default panel, those calls do nothing on the live site while the editor looks right. On multi-panel apps use config, which applies everywhere:

```php
'assets' => [
    'site_css_enabled' => true,                   // false drops the package site.css entirely
    'site_js_enabled' => true,
    'extra_styles' => ['/build/assets/site.css'],
    'extra_scripts' => [],
    'vite_builds' => [
        'build',                                   // a directory string, or:
        ['directory' => 'build', 'entries' => ['resources/css/site.css'], 'manifest' => 'manifest.json'],
    ],
],
```

- `viteBuild($dir, $entries, $manifestFilename)` finds `.vite/manifest.json` or `manifest.json`. `viteManifest($path, ...)` with a wrong path registers nothing and says nothing.
- Order on the page: package `site.css`, plugin assets, `extra_styles`, `vite_builds`, then the theme class's `stylesheets()` (later wins).
- `site.css` declares `@layer theme, base, components, utilities, filamentcraft`. A host bundle's **layered** utilities lose to the package's same-named ones; **unlayered** host CSS wins.
- `mirrorEditorStyles()` copies the panel's compiled CSS into the **editor canvas only**. A class that looks right in the editor can be missing live. Judge styling on the published URL.

## Fragment cache and deploys

- The fragment cache key is site id, section id, a hash of settings/blocks/scheme/context, locale and theme version. **Nothing in it sees your Blade view, section class or package version.** After changing a section view, class or `defaults()`, or applying a `--replace` customization, a live site serves the old HTML for up to `cache.ttl` (3600 s). Put `php artisan filamentcraft:clear-cache` in the deploy script after `filamentcraft:upgrade`.
- Fragment caching exists only on **taggable** stores (redis, memcached, array). On `file` or `database` stores nothing is cached, `clear-cache` prints "Nothing to clear", and `FragmentCacheStore::flush()` is a silent no-op. So "stale content" on those stores is never this cache; it looks fine in dev (file) and misbehaves in prod (redis) or the reverse.
- `cache.tag_prefix` prefixes keys only; the invalidation tag is always `site:{id}`. Two apps sharing one redis with the same site id cross-flush.

## Editor drafts cache

Unsaved editor drafts and undo history use the app's **default** cache store (8 hours), not `filamentcraft.cache.store`. `CACHE_STORE=array`, or per-server `file` behind a load balancer, silently loses or splits drafts. `cache:clear` wipes them.

## Key types

`database.key_type` sets primary keys. `database.owner_key_type` and `user_key_type` set the type of `sites.owner_id` and the `user_id` columns; null detects them from `tenancy.owner_model` and `auth.providers.users.model` at migrate time. A UUID/ULID `Team` or `User` with default config needs these set **before the first migrate**; a mismatch means sites never match their owner (`doctor` reports it). Install flag: `--keys=`.

## Model overrides

`make:filamentcraft-model` scaffolds an override registered in `filamentcraft.models.*` (13 keys). It must extend the package class and keep the table name, or `ModelOverrides::resolve` throws. If the override defines `booted()`, call `parent::booted()`: `Site::booted()` fires `SiteCreated` and `SiteLocaleAdded`, so a missing parent call silently turns off blueprint auto-seeding and locale events.

## Blueprints that seed every site

`blueprints.auto_seed` (default **true**, `FILAMENTCRAFT_AUTO_SEED_BLUEPRINTS`): every blueprint registered with `registerBlueprint()` or `discoverBlueprintsIn()` is seeded as a **draft** page into every newly created site. Register a page blueprint only when you want that (or for `sealed()`); set `auto_seed` false otherwise. `SiteProvisioner::provision()` suspends auto-seed while it runs. `app/Blueprints` is not auto-discovered, and `discoverBlueprintsIn()` scans depth 0 only. Pages listed in a `SiteBlueprint::pages()` need no registration.

## Licence tiers

`LicenseTier`: Single = 1 site, Studio = 5, Agency (`unlimited`) and Platform = no ceiling. Nothing blocks you; `doctor` reports the allowance. Agency covers tenants you provision. A **self-serve SaaS where customers create their own sites needs the Platform licence**. Mention it when building `allowSiteCreation(true)` for tenants.

## Livewire 3 and 4

Package views avoid `wire:transition`. For custom `LivewireSection` views that must run on both versions (upstream docs, not testable in this repo): self-closing `<livewire:x />` tags, no `wire:transition` modifiers, stick to `#[Url]`, `#[Computed]`, `#[Locked]`, `#[On]` and `dispatch()`, and use `Livewire.hook('morphed', ...)` in custom JS. The AI assistant needs PHP 8.3 and Laravel 12.

## Icons and images

- `<x-filamentcraft::icon>` renders **nothing** for a name that does not resolve to a registered Blade Icons set when it is longer than 4 characters (the error is swallowed). A typo, or `phosphor-bold-star` without that icon package, is invisible with no error. Heroicon prefixes are `heroicon-o|s|m|c-`.
- `<x-filamentcraft::image>` emits `src`, `alt`, `loading`, `decoding` only: no `srcset`, `width` or `height`. See the sections skill (`settings.md`, Images).
- Uploads env: `FILAMENTCRAFT_UPLOADS_DISK|DIR|MAX_KB|VISIBILITY`.
