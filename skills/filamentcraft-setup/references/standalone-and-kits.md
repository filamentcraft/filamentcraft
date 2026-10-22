# Standalone editor details and starter kits

## Contents
- Starter kits
- Standalone editor details
- Owner-less sites
- Uninstall and upgrade flags

## Starter kits

Public repos `filamentcraft/starter-site`, `starter-store`, `starter-multistore` (Filament panel) and `starter-react`, `starter-vue`, `starter-livewire` (Laravel starter kits with teams, one-command `composer setup`). The React kit is a working reference for the standalone wiring below; offer a kit when the user starts a new app. When adding FilamentCraft to an existing Laravel starter kit:

1. Remove the Team model's `updating` hook that regenerates the slug: the slug is in the editor and public URLs.
2. Add a `ManageWebsite` permission and a policy method; return it from `canUseWebsiteEditor()` / `editableWebsiteOwners()`.
3. Mount the public route under a prefix: `Route::prefix('s')->group(fn () => Route::filamentCraftTenant(Team::class, name: 'website.public'))`, and return the same name from `publicRouteName()`.
4. Point `exitUrl()` at the kit's website page.
5. Remove `WithoutModelEvents` from the seeder (it mutes `SiteCreated`).
6. Gitignore the published editor assets (below) and add `public/**` to the formatter's ignore list.

## Standalone editor details

- `HasTenants` and `editableWebsiteOwners()` are needed only with `--owner`. A single-site standalone install has no tenancy; any user whose `canUseWebsiteEditor()` is true edits the one site.
- `EditorPanelProvider::isDefault()` defaults to `true` (Filament needs exactly one default panel). Return `false` when the app also has a Filament admin panel. The default panel is also the one `FilamentCraftPlugin::get()` resolves on public requests (see "Assets" in config-pitfalls.md).
- `--path` is one or more segments of `[A-Za-z0-9_-]` and must not collide with another panel. The panel id stays `site-editor` regardless of `--path`. `--force` rewrites the provider only while it is pristine.
- The editor-only route name is `filament.{panelId}.pages.filamentcraft.editor`, so Wayfinder and Ziggy can reference it.
- `EditorUrl::to()` returns **`null`** for a site with no pages, when no editor panel exists, or (tenant panel) when the site has no owner. Handle null. It also takes `panel:`. In lists, `$page->setRelation('site', $site)` avoids N+1.
- Editor-only panels have no dashboard, resources or Inbox. A host inbox is your own page over `Submission`.
- Published editor assets live under `public/css|js/filamentcraft/filamentcraft/*` and `public/images/filamentcraft/*`. Kits gitignore them and rebuild them in composer `post-autoload-dump`:

```json
"post-autoload-dump": [
    "@php artisan filament:upgrade --ansi",
    "@php artisan filamentcraft:upgrade --no-migrate --ansi"
]
```

Any CI or Docker image that ignores `public/` must run `filamentcraft:upgrade`, or it ships an unstyled editor.
- `install --standalone --owner=X` on an empty owner table does **not** seed the example site ("No site owner exists yet"). Creating a team's site is the host's job: `StarterSiteBlueprint::seed(StarterFamily::Modern, owner: $team, name: ..., slug: ...)` or a provisioning observer. `--no-interaction` is required because of the migrate confirmation.

## Owner-less sites

`filamentcraft:starter --owner=ID` only **warns** and provisions an owner-less site when `tenancy.owner_model` is unset or the id does not exist. The same happens for `Site::create()` or `SiteProvisioner::provision($blueprint)` with no owner. In tenant panels owner-less sites (`owner_type IS NULL`) are visible to every operator. In code always pass the owner instance, and after `starter --owner` confirm `sites.owner_id` is set.

## Uninstall and upgrade flags

- `filamentcraft:uninstall` confirms with a default of no: under `--no-interaction` it refuses unless `--force`. `--drop-tables` aborts when host tables have foreign keys into FilamentCraft tables. It deletes the standalone provider only while it still `extends EditorPanelProvider`, never edits other host files, and prints leftovers.
- `filamentcraft:upgrade --no-migrate` also skips `sync-themes`. It runs `filament:assets`, but it does not republish config: merge new keys into a published `config/filamentcraft.php` by hand (`doctor` flags missing typed-config keys).
- `filamentcraft:clear-cache [site]` clears fragments and the sitemap without touching editor drafts.
