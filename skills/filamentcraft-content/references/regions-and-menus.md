# Header, footer, announcement bar and menus

Regions are `FilamentCraft\Models\Region` rows: one per site and `name`, created lazily (a blueprint that declares the region, an import, or the editor opening it; a missing row renders nothing, so never `firstOrFail()`) (`RegionName::Header`, `Footer`, `Announcement`), holding the same per-locale section payload as a page (without page settings). They have **no draft and no history: saving is publishing**. Only names in `filamentcraft.regions.enabled` render (default header and footer; add `'announcement'` to show the bar).

## Edit a region

```php
use FilamentCraft\Editor\State\LocaleBucket;
use FilamentCraft\Editor\State\TemplateState;
use FilamentCraft\Enums\RegionName;
use FilamentCraft\Models\Region;
use Illuminate\Support\Facades\Artisan;

$region = Region::query()->firstOrCreate(
    ['site_id' => $site->getKey(), 'name' => RegionName::Footer->value],
    ['sections_json' => ['version' => TemplateState::PAYLOAD_VERSION, 'locales' => []]],
);
$state = TemplateState::fromRegion($region, $site->default_locale);

foreach ($state->locales as $locale => $bucket) {
    foreach ($bucket->order as $id) {
        if ($bucket->sections[$id]['type'] === 'footer') {
            $bucket->applySettings($id, ['copyright' => '© 2026 Harbor Clay Studio']);
        }
    }
}

$region->sections_json = new \ArrayObject($state->toRegionPayload());
$region->save();
Artisan::call('filamentcraft:clear-cache', ['site' => (string) $site->getKey()]);
```

Because it goes live at once: export the site first for anything bigger than a label (`filamentcraft:export <site>`), and do every locale in the same write.

## Menu links

The `header` section's nav is one ordered list of blocks: `nav-link` (`label`, `url`, `placement`: `everywhere`, `header` only, or `bottom_bar`, the phone bottom bar; `icon`), `nav-dropdown` (`label`, `links`: a list of `{label, url}`, optional `url` for a "view all" link) and `nav-categories` (the store's category tree, `depth` 1-3). Header settings include `brand_text`, `brand_logo`, `cta_label`, `cta_url`, `show_locale_switcher`.

- Add a page: `app(\FilamentCraft\Support\HeaderMenu::class)->addPage($site, $page)`. It appends `{label: page name, url}` to the first header section in each locale bucket that **already exists** in the header region, and saves. A locale with no bucket gets nothing (copy the default bucket into it first, e.g. `CopyLocaleContent`, then add the link). It returns null (doing nothing) when there is no header section, and skips a URL that is already there. The label is the page name in every locale, so translate the labels afterwards. The URL is **absolute**, baked from the site's domain or `app.url`: on a dev box that is the dev host and it breaks on a domain change. Rewrite it to relative after the call: for each header `nav-link` block whose `url` starts with the absolute base, set `url` to `parse_url($url, PHP_URL_PATH)` (keep any `?query`) and write back with `applyBlocks($id, $blocks)` in the same region save as the edit recipe above.
- Pure version for your own write: `HeaderMenu::withLink($payload, $url, $label, $site)`.
- Reorder, rename or remove links by rewriting the blocks with `applyBlocks($id, $blocks)`.
- Prefer relative URLs (`/pricing`) when writing links yourself; they survive a domain change.

### Menus from the host app

When the host already keeps its menus (a CMS table, a config file), bind `FilamentCraft\Navigation\Contracts\MenuSource` instead of copying links into regions:

```php
$this->app->singleton(MenuSource::class, AppMenuSource::class);
```

`menus(Site $site): array<string, string>` returns `key => label`; `items(Site $site, string $key): list<MenuItem>` returns `FilamentCraft\Navigation\MenuItem` entries (children render as dropdowns). The menus are read at render time, so changing them needs no publish. The header's `menu` setting (shown only when a source returns menus) picks one in place of its own items, and footer `menu` blocks list them. `main` is reserved for the header's own items. Unsafe URLs (`javascript:` and similar) are dropped.

The link picker in the editor also searches pages, store categories and products. Add your own results (blog posts, docs) with `FilamentCraftPlugin::make()->linkSources([PostLinkSource::class])`, where each class implements `FilamentCraft\Links\Contracts\LinkSource`.

## Footer

The `footer` section: settings `brand`, `description`, `copyright` and more (`filamentcraft:sections footer`). Its columns are blocks, one column each, in order:

- `column`: `heading` and `links`, a list of `{label, url}`.
- `menu`: `menu` (`main` repeats the header's links, or a host menu key) and an optional `heading`. A menu whose items have children becomes one column per parent.
- `text`: `heading` and `text` (an address, opening hours).

Older footers hold `link` blocks with a `column` name; they render and open as `column` blocks and save in the new shape on the next edit. Write new footers with `column` blocks. A new site's footer says "FilamentCraft" until you set brand and copyright.

## Announcement bar

1. Enable the region: `filamentcraft.regions.enabled` = `['announcement', 'header', 'footer']` (order is render order inside a placement; a disabled region keeps its content and `?region=` for it is ignored).
2. `firstOrCreate` the row as above with `RegionName::Announcement->value`, then add a `banner` section (settings `text`, `cta_label`, `cta_url`; `filamentcraft:sections banner`):

```php
$state = TemplateState::fromRegion($region, $site->default_locale);

foreach ($site->localeCodes() as $locale) {
    $bucket = $state->ensureBucket($locale);

    if (collect($bucket->sections)->contains(fn (array $s): bool => $s['type'] === 'banner')) {
        continue;
    }

    $id = LocaleBucket::newSectionId('banner');
    $bucket->upsertSection($id, 'banner', ['text' => 'Free shipping over $50', 'cta_label' => 'Shop', 'cta_url' => '/shop']);
}

$region->sections_json = new \ArrayObject($state->toRegionPayload());
$region->save();
```

Translate `text` and `cta_label` per locale before saving. Section scheduling (`_schedule_from` / `_schedule_until`) works here too for time-boxed promotions.
