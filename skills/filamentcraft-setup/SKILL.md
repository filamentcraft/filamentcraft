---
name: filamentcraft-setup
description: "Install, configure, deploy and troubleshoot the FilamentCraft website builder (filamentcraft/filamentcraft) in a Laravel app: Filament panel install or standalone install for React/Vue/Livewire apps, public routes, custom domains and subdomains, multi-tenancy (one site per team/workspace, tenant URLs), provisioning a site for every new tenant with site blueprints, access control, license key, upgrades and `filamentcraft:doctor`. Use this whenever the user sets up or wires FilamentCraft, configures `FilamentCraftPlugin::make()` or `config/filamentcraft.php`, builds a SaaS or agency platform where each customer gets a website, or reports \"pages 404\", \"editor won't open\", \"site not found\" or other setup errors."
license: MIT
metadata:
  author: filamentcraft
---

# FilamentCraft setup

FilamentCraft is a Laravel package. The **editor** runs inside a Filament panel. The **published sites** are plain Laravel routes and need no Filament on the front end. A **site** belongs to an optional owner (any Eloquent model: Team, Workspace, Store) and has pages (templates), a header and footer (regions), a theme and settings.

Always start by reading what's there: `composer.json` (Laravel, Filament and Livewire versions; is `filamentcraft/filamentcraft` already required?), `config/filamentcraft.php` if published, the panel providers in `app/Providers/Filament`, and `php artisan filamentcraft:doctor` output if installed.

## Install

The package comes from a private Composer registry. The username is the purchase email and the password is the license key. Never commit `auth.json`; on CI and servers use `COMPOSER_AUTH`.

```bash
composer config repositories.filamentcraft composer https://packages.filamentcraft.dev
composer config http-basic.packages.filamentcraft.dev "$EMAIL" "$LICENSE_KEY"
composer require filamentcraft/filamentcraft
```

**App with a Filament panel:**

```bash
php artisan filamentcraft:install --no-interaction
```

```php
// app/Providers/Filament/AdminPanelProvider.php
->plugin(\FilamentCraft\FilamentCraftPlugin::make())
```

**App whose own UI is React, Vue or Livewire (no Filament panel yet):**

```bash
php artisan filamentcraft:install --standalone --owner="App\Models\Team" --path=site-editor --no-interaction
```

This writes an editor-only panel provider. The user model then needs `FilamentUser`, `HasTenants` and the `HasWebsiteEditor` trait, plus a `canUseWebsiteEditor()` override, which returns `false` until you change it, so nobody gets in. Details in [references/tenancy-and-provisioning.md](references/tenancy-and-provisioning.md).

Install publishes config and migrations, runs the migrations (always pass `--no-interaction`; the prompt hangs in non-TTY shells), publishes assets, links storage, syncs themes and seeds a published example site. Useful flags: `--no-example`, `--family=modern|editorial|bold|elegant`, `--keys=int|uuid|ulid` (choose before the first migrate; it can't change later), `--folio`.

Then:

1. **License**: `FILAMENTCRAFT_LICENSE_KEY=…` in `.env`. Without it, public pages carry a small "Built with FilamentCraft" link.
2. **Serve public pages** (off by default): `'public_routes' => true` in `config/filamentcraft.php`, and delete the welcome `Route::get('/')` in `routes/web.php`, because host routes win over FilamentCraft's fallback route.
3. **Check**: `php artisan filamentcraft:doctor`. It groups environment, database, panel, config, themes, sections, content, SEO, assets and license checks, and prints a fix for each problem (`--json` for CI, `--strict` to fail on warnings).

## Deploy

Add `php artisan filamentcraft:upgrade` after `migrate` in every deploy script. It publishes migrations added by a package update, runs them, syncs themes and refreshes the editor assets. Skipping it is the most common cause of a broken editor after `composer update`.

## Pick the tenancy shape

| Shape | Configuration |
|---|---|
| One website for the whole app | `FilamentCraftPlugin::make()->singleSite()`; or `tenancy.mode = none` |
| One website per team/workspace, edited in a Filament tenant panel | `->tenantSites(Workspace::class)`, and the owner model `implements SiteOwner` with `use HasSite` |
| Same, but the app's own UI is React/Vue/Livewire | `--standalone --owner=…`, plus `HasWebsiteEditor` on the user model |
| Agency managing many client sites in one panel, no tenancy | default `auto` mode; sites are listed and created in the panel |

Never `require` a tenancy package for FilamentCraft. It resolves sites from Filament's tenant or the owner model itself.

Each tenant gets a live site the moment it exists through a **site blueprint** plus a model observer, so onboarding needs no manual step. Recipe, access control and the public tenant URL scheme (`/{tenantSlug}/{path}`) are in [references/tenancy-and-provisioning.md](references/tenancy-and-provisioning.md).

## URLs and domains

- `public_routes` on registers a fallback route plus `sitemap.xml`, `robots.txt` and `llms.txt`. A request maps to a site by exact `domain`, then `subdomain` under `filamentcraft.domain.primary` (the APP_URL host by default), then tenancy, then the first live site. A host that matches a **non-live** site returns 404.
- Tenants under a path: `Route::filamentCraftTenant(Team::class)` in `routes/web.php` serves `/{tenantSlug}/{path?}` (and a sitemap per tenant).
- If the app builds page URLs its own way, tell FilamentCraft with `->publicUrlsViaNamedRoute(...)` or `->publicUrlUsing(fn (Template $t): ?string => …)`, so editor links, sitemaps and canonicals agree.
- Page URLs are the page slug. Nested slugs (`services/web-design`) work. Locale is `?locale=fr`, unless you return path-prefixed URLs from `->localeUrlsUsing(...)`.

More in [references/routing.md](references/routing.md).

## Plugin and config reference

Every `FilamentCraftPlugin` method, every artisan command and the config keys that matter: [references/plugin-and-commands.md](references/plugin-and-commands.md). The most used:

```php
FilamentCraftPlugin::make()
    ->tenantSites(Workspace::class)            // or ->singleSite()
    ->canAccessUsing(fn (?Model $user): bool => $user?->can('manage-website') ?? false)
    ->allowSiteCreation(false)                 // one site per tenant
    ->registerTheme(\App\Themes\AcmeTheme::class)
    ->withoutSections(['countdown'])
    ->brandFonts(['inter', 'lora'])
    ->viteBuild('build', ['resources/css/site.css']);
```

## Troubleshooting

| Symptom | Usual cause |
|---|---|
| Every public page 404s | `public_routes` off, the welcome route still on `/`, the site isn't **live**, or the page isn't **published** |
| Tenant URL 404s | the owner's sites are all drafts (`primarySite()` returns live sites only), or the tenant slug column differs from `slug` |
| "No themes exist" on provisioning | `filamentcraft:sync-themes` never ran in that environment (install and upgrade run it) |
| Editor opens but looks unstyled or broken after an update | `filamentcraft:upgrade` (or `filament:assets`) not run on deploy |
| Nobody can open the standalone editor | `canUseWebsiteEditor()` still returns false |
| Interactive section 419s on the live site | the Livewire section isn't registered (see filamentcraft-sections) |
| Custom section Tailwind classes do nothing | the package's prebuilt `site.css` lacks them; ship your own CSS (see filamentcraft-sections) |
| Changes don't show on the live site | not published yet, or a stale fragment cache after raw database writes: `app(\FilamentCraft\Rendering\FragmentCacheStore::class)->flush($siteId)` |

When stuck, run `php artisan filamentcraft:doctor --json` and `php artisan about` (it has a FilamentCraft section), and read the package source in `vendor/filamentcraft/filamentcraft/src`, which is fully typed. Docs for agents: `https://filamentcraft.dev/llms-full.txt`, or any page as Markdown by appending `.md`.
