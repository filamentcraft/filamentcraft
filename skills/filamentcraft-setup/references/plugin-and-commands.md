# Plugin methods, commands and config

## `FilamentCraftPlugin::make()`

| Area | Methods |
|---|---|
| Tenancy | `tenantSites(Owner::class, …)`, `singleSite(?id)`, `tenancy('auto'\|'none'\|'filament'\|'owner')`, `siteOwnerModel(Owner::class)` |
| Access | `canAccessUsing(Closure)`, `allowSiteCreation(bool\|Closure)`, `lockBlueprintPages(bool\|Closure)`, `siteRoutingFields(bool\|Closure)`, `editorOnly()`, `withEditor(bool)`, `showAdvancedResources()` |
| Sections | `registerSection($class, $prefix = '')`, `discoverSectionsIn($path, $prefix = '')` (app/Sections is already scanned), `withBuiltinSections(bool)`, `allowSections([...])`, `withoutSections([...])`, `hidePresets($class, [...])`, `addPresets($class, [...])`, `renderHook(RenderHook, Closure, ?array $sections)`, `settingComponentUsing($settingClass, Closure)` |
| Themes and design | `registerTheme($class)`, `registerThemes([...])`, `withoutBuiltinThemes()`, `theme('slug')`, `themePresets([...])`, `discoverThemePresetsIn($dir)`, `withoutBuiltinThemePresets()`, `brandKit(BrandKit)`, `brandFonts([...])`, `brandPalette([...], locked: true)`, `withoutBuiltinSchemes(bool\|array)`, `registerFont(BrandFont)` |
| Pages | `registerBlueprint($class)`, `discoverBlueprintsIn($dir)`, `dynamicTemplates([...])` |
| Commerce | `catalogs([...])`, `catalogCollections([...])` |
| URLs | `publicUrlsViaNamedRoute(...)`, `publicUrlUsing(Closure)`, `localeUrlsUsing(Closure)` |
| Assets | `stylesheet($url)`, `script($url)`, `viteBuild($dir, [$entries])`, `viteManifest($path, [$entries])`, `mirrorEditorStyles()`, `imageSizesUsing(Closure)` |
| Editor chrome | `editorExitUrlUsing(...)`, `editorDocumentTitleUsing(...)`, `editorPrimaryColor(...)`, `usePanelPrimaryColor()`, `navigationGroup()`, `navigationLabel()` and the other `*NavigationLabel()` methods |
| Forms | `withSubmissionsInbox(bool)`, `formRecipientsUsing(Closure(Site, SubmissionType))` |
| AI assistant | `ai(bool)`, `aiProvider()`, `aiModels()`, `aiDefaultTier()`, `aiSiteKeys()`, `aiUsage()`, `aiLimits()`, `aiInstructions()`, `aiVoice()`, `aiAccess()`, `aiModel(AiTier, string)`, `aiProviderOptions([...])`, `aiPromptUsing(Closure(AiRequest): AiRequest)` (needs `laravel/ai`, PHP 8.3+) |
| License | `softLicense(bool)` |

Plugin-level `stylesheet()`, `script()`, `viteBuild()` and `viteManifest()` reach public pages only when the plugin is on the default panel (config-pitfalls.md). `mirrorEditorStyles()` affects the editor canvas only. Pitfalls for assets, cache, key types, model overrides and licence tiers: [config-pitfalls.md](config-pitfalls.md).

Register one configured plugin instance per panel. Config (`config/filamentcraft.php`) mirrors most of these and also applies to public routes, so prefer config for themes and sections that must render outside the panel.

## Artisan

| Command | Purpose |
|---|---|
| `filamentcraft:install` | `--no-interaction --no-example --family= --keys=int\|uuid\|ulid --no-assets --folio --standalone --owner= --path= --force` |
| `filamentcraft:upgrade` | run on every deploy (`--no-assets`, `--no-migrate`, which also skips sync-themes) |
| `filamentcraft:clear-cache` | `[site]`: flush fragments and sitemap, keep editor drafts; run after deploys that change section views |
| `filamentcraft:doctor` | health check (`--json`, `--strict`) |
| `filamentcraft:sections` | list registered section types; `<slug>` for one schema; `--json` |
| `filamentcraft:import` | import an export `.zip` or a JSON site spec (`--dry-run`, `--live`, `--owner=Model:key`, `--replace=`, `--slug=`, `--force`) |
| `filamentcraft:export` | site to `.zip` (`--path=`, `--with-history`, `--with-submissions`) |
| `filamentcraft:starter` | seed a published starter site (`--family= --owner= --name=`) |
| `filamentcraft:seed-blueprints` | seed registered page blueprints as drafts (`--site= --owner= --force --dry-run`) |
| `filamentcraft:sync-themes` | create Theme rows for registered themes |
| `filamentcraft:media-sync` | register images used in sections into the site's media library |
| `filamentcraft:customize-section` | variant or replacement of a built-in (`--replace --copy-view --slug= --namespace= --path= --view-path= --force`); prints the `->registerSection()` line when the target is outside `app/Sections` |
| `filamentcraft:uninstall` | remove generated files (`--drop-tables`, `--keep-config`, `--force`; refuses under `--no-interaction` without `--force`) |
| `make:filamentcraft-section` | `--livewire --slug= --view= --view-path= --path= --namespace= --force`. All `make:filamentcraft-*` commands prompt for a missing name: pass it under `--no-interaction` |
| `make:filamentcraft-island` | `--react --vue --slug= --namespace= --path= --force` |
| `make:filamentcraft-blueprint` | `--site` for a site blueprint |
| `make:filamentcraft-theme` | theme class |
| `make:filamentcraft-theme-preset` | `--from-site=` exports a styled site as a preset class |
| `make:filamentcraft-model` | override a package model (registered in config) |

## Config keys worth knowing

| Key | Default | Notes |
|---|---|---|
| `public_routes` | false | fallback route + SEO files |
| `tenancy.mode` / `owner_model` / `single_site_id` | auto / null / null | |
| `domain.primary` | APP_URL host | subdomain matching |
| `database.key_type` / `owner_key_type` / `user_key_type` | int / null / null | set before the first migrate |
| `blueprints.auto_seed` | true | seed every registered page blueprint into each new site |
| `models.*` | package models | swap with `make:filamentcraft-model` |
| `regions.enabled` | `['header', 'footer']` | add `'announcement'` before `'header'` |
| `sections.register` / `paths` / `allowed` / `disabled` | | |
| `themes.register` / `builtin_enabled` / `presets` | | |
| `assets.extra_styles` / `extra_scripts` / `vite_builds` / `site_css_enabled` / `site_js_enabled` | | apply to public pages in every panel setup; see config-pitfalls.md |
| `uploads.disk` / `directory` / `max_size_kb` | public / filamentcraft/uploads | the disk must be publicly readable (`storage:link`) |
| `cache.enabled` / `store` / `ttl` | true / default / 3600 | fragment cache; works on taggable stores (redis, memcached) |
| `forms.store` / `notify` / `throttle` | | contact and newsletter submissions |
| `seo.sitemap` / `robots_txt` / `llms_txt` / `indexnow` | | |
| `rendering.show_errors` | false | show the failed-section card on public pages (staging only) |
| `ai.*` | | assistant provider, models, limits |
| `editor.enabled` / `autosave_ms` / `undo_depth` / `devices` | | `editor.enabled = false` is a per-environment kill switch |

## AI assistant notes

Config `ai.timeout` (45 s of model time per web request; keep it under the web server timeout), `ai.prompts.voice` / `ai.prompts.instructions` (keyed by `AiTask` value or `*`), `ai.usage.track` (needed for the monthly token budget). Install: `composer require laravel/ai`, then `filamentcraft:upgrade` (publishes and runs the AI migrations). In tests use `FilamentCraft\Ai\Testing\FakeAiRunner::install()->on(AiTask::X, [...])` and `->lastRequest()` so nothing reaches the SDK. Ask/Generate write an `ai-brand` scheme and site-wide changes immediately, outside page undo: never probe them on a client site.
