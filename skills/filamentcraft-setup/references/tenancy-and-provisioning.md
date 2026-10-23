# Tenancy and provisioning

## Contents
- How a site is resolved
- Single site
- One site per tenant (Filament tenant panel)
- Standalone editor for React/Vue/Livewire apps
- Provisioning a site for every tenant
- Access control

## How a site is resolved

Two resolvers are registered as singletons. Reuse them; never re-implement owner-to-site lookups.

- `FilamentCraft\Resolvers\TenancyResolver::resolve()` finds "the current site": the configured single-site id, then the Filament tenant's site, then a container-bound owner's site, then the first live site. `resolveAccessibleSite()` adds an access check.
- `FilamentCraft\Resolvers\TenantSiteResolver::resolve($ownerModel, $slug, $slugColumn = null)` loads the owner by slug, sets it as the Filament tenant, and returns its live site. The `filamentcraft.tenant` middleware and the layout component use it.

Query sites with the model scopes: `Site::query()->forOwner($team)->live()`.

Config: `tenancy.mode` (`auto` default, `none`, `filament`, `owner`), `tenancy.owner_model`, `tenancy.single_site_id`.

## Single site

```php
FilamentCraftPlugin::make()->singleSite();      // mode none, first live site
FilamentCraftPlugin::make()->singleSite($siteId); // pin one
```

## One site per tenant (Filament tenant panel)

```php
use FilamentCraft\Concerns\HasSite;
use FilamentCraft\Contracts\SiteOwner;

class Workspace extends Model implements SiteOwner
{
    use HasSite;      // sites() morphMany + primarySite()
}
```

```php
FilamentCraftPlugin::make()
    ->tenantSites(Workspace::class)          // panel tenant + resolution + public URLs in one call
    ->allowSiteCreation(false);              // or fn (?Authenticatable $user) => $user?->isAdmin()
```

`tenantSites()` named arguments: `tenantSlugColumn: 'slug'`, `publicRouteName: 'filamentcraft.tenant.public'`, `tenantParameter: 'tenantSlug'`, `pathParameter: 'path'`, `ownershipRelationship: null`. The user model implements Filament's `HasTenants` (`getTenants()`, `canAccessTenant()`). `canAccessTenant()` is the real guard against URL manipulation.

Public pages for those tenants: `Route::filamentCraftTenant(Workspace::class);` in `routes/web.php`, giving `/{tenantSlug}/{path?}` and a per-tenant sitemap. Keep `public_routes` off in that setup unless you also serve domains.

`primarySite()` returns **live sites only**. A tenant whose site is still a draft 404s publicly.

## Standalone editor for React/Vue/Livewire apps

```bash
php artisan filamentcraft:install --standalone --owner="App\Models\Team" --path=site-editor --no-interaction
```

This writes `app/Providers/Filament/WebsiteEditorPanelProvider.php` (extends `FilamentCraft\Editor\EditorPanelProvider`; hooks: `id()`, `path()`, `isDefault()`, `ownerModel()`, `ownerSlugColumn()`, `publicRouteName()`, `exitUrl(Template)`, `exitLabel()`, `configureEditor(FilamentCraftPlugin)`, `configurePanel(Panel)`). More in [standalone-and-kits.md](standalone-and-kits.md).

```php
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasTenants;
use FilamentCraft\Concerns\HasWebsiteEditor;

class User extends Authenticatable implements FilamentUser, HasTenants
{
    use HasWebsiteEditor;

    public function canUseWebsiteEditor(): bool
    {
        return $this->hasVerifiedEmail();          // false by default: nobody gets in
    }

    public function editableWebsiteOwners(): Collection
    {
        return $this->teams->filter(fn (Team $team) => $this->can('manageWebsite', $team))->values();
    }
}
```

Link into the editor from your UI with a plain `<a href>` (it is a full page load):

```php
use FilamentCraft\Editor\EditorUrl;

EditorUrl::to($site);                       // homepage
EditorUrl::to($template, locale: 'fr');
EditorUrl::to($site, RegionName::Header);
```

`EditorUrl::to()` returns `null` when the site has no pages, no editor panel exists, or the site has no owner in a tenant panel.

## Provisioning a site for every tenant

```bash
php artisan make:filamentcraft-blueprint Client --site
php artisan make:filamentcraft-blueprint ClientHome
```

The `--site` command appends `SiteBlueprint` to the name, so `Client` generates `ClientSiteBlueprint`. Its `pages()` stub lists `// HomeBlueprint::class`: replace that with `ClientHomeBlueprint::class` or the site gets no pages.

```php
use FilamentCraft\Blueprints\AbstractBlueprint;
use FilamentCraft\Blueprints\BlueprintRegion;
use FilamentCraft\Blueprints\BlueprintSection;
use FilamentCraft\Blueprints\SiteBlueprint;
use FilamentCraft\Enums\RegionName;
use FilamentCraft\Sections\Builtin\{CtaSection, FeaturesSection, FooterSection, HeaderSection, HeroSection};

final class ClientHomeBlueprint extends AbstractBlueprint
{
    public function name(): string { return 'Home'; }
    public function slug(): string { return 'home'; }
    public function isHomepage(): bool { return true; }

    public function sections(): array
    {
        $hero = BlueprintSection::fromPreset(HeroSection::class, 'modern');

        return [
            $hero->settings([...$hero->getSettings(), 'heading' => 'Welcome']),   // settings() replaces, so spread the preset's
            BlueprintSection::fromPreset(FeaturesSection::class, 'modern'),
            BlueprintSection::fromPreset(CtaSection::class, 'modern'),
        ];
    }
}

final class ClientSiteBlueprint extends SiteBlueprint
{
    public function name(): string { return 'Client site'; }
    public function pages(): array { return [ClientHomeBlueprint::class]; }
    public function locales(): array { return ['en']; }
    public function regions(): array
    {
        return [
            BlueprintRegion::make(RegionName::Header)->sections([BlueprintSection::fromPreset(HeaderSection::class, 'modern')]),
            BlueprintRegion::make(RegionName::Footer)->sections([BlueprintSection::fromPreset(FooterSection::class, 'modern')]),
        ];
    }
}
```

```php
use FilamentCraft\Concerns\HasSite;
use FilamentCraft\Contracts\SiteOwner;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;

#[ObservedBy(WorkspaceObserver::class)]
class Workspace extends Model implements SiteOwner { use HasSite; }

final class WorkspaceObserver
{
    public function created(Workspace $workspace): void
    {
        ClientSiteBlueprint::provision($workspace);
    }
}
```

- `provision()` takes no host or subdomain. Set it afterwards, validating user-supplied input with `HostClaimRule::subdomain()` (host-matching-and-urls.md): `$site = ClientSiteBlueprint::provision($workspace, name: $workspace->name); $site->update(['subdomain' => $workspace->slug]);` (the setter normalises it to a host label).
- `provision()` runs in one transaction: site, theme, pages (published, and the site live, unless `publish()` returns false), homepage, regions. `app(SiteProvisioner::class)->provision($class, $owner, name:, slug:)` picks a blueprint dynamically.
- Overridable: `themeSlug()`, `locales()` (first entry is the default), `publish()`, `siteSettings()` (initial `settings_json`: scheme, fonts, theme knobs).
- `provision()` syncs missing Theme rows itself. It throws only when no theme is registered or `themeSlug()` names an unregistered slug; fix the registration (config `themes.register` or the plugin's `registerTheme()`), not `sync-themes`.
- Provisioning without an owner creates an owner-less site that every operator in tenant panels can see; always pass the owner instance.
- Presets bring non-copy settings and demo assets with them: effects (Hero `modern` sets `backdrop=aurora`, `heading_effect=generate`; `bold` sets `cta_style=glow-border`; `editorial` sets `backdrop=dots`), bundled stock images (`bg_image` under `/images/filamentcraft/presets/`) and dummy links such as `/start`. For client sites, override those settings (`none`, empty image, real URLs) after spreading the preset's.
- Registering a blueprint with `registerBlueprint()` also seeds it as a draft into every new site (`blueprints.auto_seed`); see config-pitfalls.md.
- Blueprint page slugs are slugified, so they can't be nested (`services/web-design` becomes `servicesweb-design`). Create nested pages with a JSON site spec import or in the editor.
- Footer defaults mention FilamentCraft; set your own brand and copyright in the footer section's settings.
- `->lockBlueprintPages()` stops tenants renaming or deleting blueprint pages; `sealed()` on a page blueprint hides Add section (register it with `registerBlueprint()` too).
- The built-in four-family starter: `StarterSiteBlueprint::seed(StarterFamily::Editorial, $owner)`, or `php artisan filamentcraft:starter --family=editorial --owner=1`.
- A `DatabaseSeeder` using `WithoutModelEvents` mutes the `SiteCreated` event that auto-seeding listens to.

## Access control

- `->canAccessUsing(fn (?Model $user): bool => …)` gates the whole builder (403).
- `->aiAccess(...)`, `->allowSiteCreation(...)`, `->lockBlueprintPages(...)` and `->siteRoutingFields(...)` take booleans or closures.
- Write a policy for anything your own UI exposes. In panels, rely on Filament's tenant scoping, and never strip global scopes.
