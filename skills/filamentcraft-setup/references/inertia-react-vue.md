# FilamentCraft in an Inertia / React / Vue / Livewire app

## Contents
- What renders where
- Wire it up (checklist)
- Editor links as props
- Public sites next to an SPA
- React/Vue islands in the same app
- Uninstall
- Verify
- Common failures

Read standalone-and-kits.md for kit-specific edits (Team slug hook, permissions, seeder, gitignore). This file is the architecture and the order of work.

## What renders where

| Surface | Technology | Notes |
|---|---|---|
| Visual editor | Filament + Livewire, in an editor-only panel, full page | The user's app never renders it. Links to it are plain `<a href>` (full page load) |
| Published pages, sitemap, `robots.txt`, `llms.txt` | Laravel routes + Blade (`<x-filamentcraft::layout>`) | Server rendered. They are **not** Inertia pages and cannot be returned from an Inertia controller |
| Site/page lists, "Edit" buttons, team UI | The app's own Inertia/React/Vue/Livewire pages | They receive editor URLs as props |

`filamentcraft/filamentcraft` requires `filament/filament`, so Composer installs it. The editor-only panel has no dashboard, resources or Inbox, and its home and tenant-home URLs return 404 (there is nothing to land on); a host inbox is the app's own page over `Submission`.

## Wire it up (checklist)

1. `composer require filamentcraft/filamentcraft`, then `php artisan filamentcraft:install --standalone --owner="App\Models\Team" --path=builder --no-interaction`. Omit `--owner` for one site. `--path` may be nested (`app/builder`) and must not equal another panel's path; the panel id stays `site-editor`. The command writes and registers `app/Providers/Filament/WebsiteEditorPanelProvider.php` (an `EditorPanelProvider`) and prints the remaining steps.
2. User model: `implements FilamentUser, HasTenants` (owner mode; `FilamentUser` only for one site), `use HasWebsiteEditor`, override `canUseWebsiteEditor()` and (owner mode) `editableWebsiteOwners()`. The default `canUseWebsiteEditor()` is `false`: nobody can open the editor until you change it.
3. Owner model: `implements SiteOwner`, `use HasSite`. `primarySite()` returns the first **live** site, so use `sites()` when you need drafts.
4. Public route under a prefix, never at the root: `Route::prefix('s')->group(fn () => Route::filamentCraftTenant(Team::class, name: 'website.public'))`. The default tenant pattern is `^(?!admin\b)[A-Za-z0-9-]+`, so a root-mounted route would treat `/login`, `/dashboard` and `/settings` as tenant slugs. Return the same name from `publicRouteName()` in the provider. Single site: `'public_routes' => true` in config instead.
5. Provider hooks: `exitUrl(Template $template)` returns the app's page list (`null` hides "All pages"), `ownerModel()`, `isDefault()` returns `false` when a Filament admin panel also exists, `configureEditor(FilamentCraftPlugin $plugin)` registers sections, themes, blueprints. Re-running install with `--force` rewrites the provider only while it is exactly as generated.
6. Provision a site per owner: `StarterSiteBlueprint::seed(StarterFamily::Modern, owner: $team, name: $team->name, slug: $team->slug)` (or your own blueprint) in a team-created action. Theme rows are synced on demand, so no `filamentcraft:sync-themes` is needed first.
7. Keep the owner slug stable; editor and public URLs contain it.
8. Deploy: add `@php artisan filamentcraft:upgrade --no-migrate` to the host `composer.json` `post-autoload-dump` (the kits already do; the installer does not) so editor assets exist in CI/Docker.

## Editor links as props

```php
use FilamentCraft\Editor\EditorUrl;
use FilamentCraft\Models\Template;

'pages' => Template::query()->forSite($site->getKey())->orderBy('name')->get()
    ->map(fn (Template $page): array => [
        'name' => $page->name,
        'editUrl' => EditorUrl::to($page->setRelation('site', $site)),
    ]),
```

- `EditorUrl::to($siteOrTemplate, RegionName $region = null, string $locale = null, string $panel = null)` picks the editor-only panel and the tenant segment itself. Never concatenate the URL by hand.
- It returns `null` for a site with no pages, when no panel hosts the editor, and (tenant panel) when the site has no owner. Type the prop as `string | null` and hide the button.
- Set the `site` relation on each template, or every call queries the site.
- Render with `<a href={editUrl}>`. Do not use Inertia's `<Link>` or `wire:navigate`: the editor is a different document with its own scripts.
- Route-name tools (Wayfinder, Ziggy) can use `filament.{panelId}.pages.filamentcraft.editor` (editor-only panels only). Still build links with `EditorUrl`, because it fills the tenant parameter.
- Pages are added, renamed and deleted inside the editor's page menu, not from the app.
- Authorize the page with the same policy the editor uses (`Gate::authorize('manageWebsite', $team)`); the editor additionally answers 404 for owners the user cannot edit.

## Public sites next to an SPA

- The SPA catch-all (`Route::get('{any}', …)`) must not shadow the FilamentCraft prefix or the fallback route; register the FilamentCraft routes first or exclude their prefix.
- A host route on `/` beats FilamentCraft's fallback, so single-site installs must delete the welcome route.
- A custom domain or subdomain maps to a site through the host-matching rules in host-matching-and-urls.md.
- Visitors load no Filament assets and no Inertia bundle on these pages.

## React/Vue islands in the same app

Interactive widgets inside FilamentCraft pages are islands, not Inertia components: `php artisan make:filamentcraft-island Name --react|--vue`, then `npm run build`. The islands entry (`resources/js/filamentcraft-islands.ts`) is a separate Vite input from the Inertia app entry, loaded only on pages that contain an island. Authoring rules: filamentcraft-sections, references/interactive.md.

## Uninstall

`php artisan filamentcraft:uninstall` removes the generated provider (only while it still `extends EditorPanelProvider`), its `bootstrap/providers.php` line, published assets and config (`--keep-config` keeps it), then lists app files that still reference FilamentCraft. Data stays unless `--drop-tables`, which aborts when an app table has a foreign key into a FilamentCraft table. It asks first (default no) and in production needs `--force`. Then `composer remove filamentcraft/filamentcraft`.

## Verify

```bash
php artisan route:list --name=filamentcraft          # editor route `filament.{panelId}.pages.filamentcraft.editor`
php artisan route:list --name=website                # tenant public routes; use your `name:` (default `filamentcraft.tenant.public`)
php artisan filamentcraft:doctor
```

```php
// php artisan tinker
$u = \App\Models\User::first();
$u->canUseWebsiteEditor();                          // true for an allowed user
$u->editableWebsiteOwners()->pluck('id');           // the owners they may edit
\FilamentCraft\Editor\EditorUrl::to(\FilamentCraft\Models\Site::query()->forOwner(\App\Models\Team::first())->first());   // string, not null (an owner-less site returns null in a tenant panel)
```

Then sign in as an allowed user, open the page that lists pages, click Edit, confirm the editor opens full screen, and that "All pages" returns to the app. Open `/s/{team-slug}` in a private window and confirm the published page, a `view-source` with no Inertia `data-page`, and `/s/{team-slug}/sitemap.xml`.

## Common failures

| Symptom | Cause |
|---|---|
| Signed-out visitor to the editor gets a 500 `Route [login] not defined` | the host app has no route named `login` (the editor panel redirects guests there); define it |
| Nobody can open the editor | `canUseWebsiteEditor()` still `false`, or user lacks `FilamentUser`/`HasTenants` |
| Editor 404 for one team | `editableWebsiteOwners()` does not include it (the tenant gate) |
| `EditorUrl::to()` null | site has no pages, or owner-less site in a tenant panel |
| Link opens the editor in the SPA shell | used `<Link>`; use `<a href>` |
| `/login` or `/dashboard` caught as a team | tenant route mounted at the root; add a prefix |
| Unstyled editor in CI/Docker | `filamentcraft:upgrade` not run after install |
| Links to editor/public pages break after a team rename | the kit regenerates the slug on update; remove that hook |
| "Open live" link wrong | `publicRouteName()` differs from the `name:` given to `Route::filamentCraftTenant()` |
