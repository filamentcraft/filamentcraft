# Header, footer, announcement bar and menus

Regions are `FilamentCraft\Models\Region` rows: one per site and `name` (`RegionName::Header`, `Footer`, `Announcement`), holding the same per-locale section payload as a page (without page settings). They have **no draft and no history: saving is publishing**. Only names in `filamentcraft.regions.enabled` render (default header and footer; add `'announcement'` to show the bar).

## Edit a region

```php
use FilamentCraft\Editor\State\TemplateState;
use FilamentCraft\Enums\RegionName;
use FilamentCraft\Models\Region;
use Illuminate\Support\Facades\Artisan;

$region = $site->regions()->where('name', RegionName::Footer->value)->firstOrFail();
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

The `header` section's nav is its `nav-link` blocks: settings `label`, `url`, `placement` (`everywhere`, `header` only, or `bottom_bar`, the phone bottom bar), `icon`. Header settings include `brand_text`, `brand_logo`, `cta_label`, `cta_url`, `show_locale_switcher`.

- Add a page: `app(\FilamentCraft\Support\HeaderMenu::class)->addPage($site, $page)`. It appends `{label: page name, url}` to the first header section in every locale and saves. It returns null (doing nothing) when there is no header section, and skips a URL that is already there. The label is the page name in every locale, so translate the labels afterwards, and note the URL is absolute (from the site's domain, or `app.url`).
- Pure version for your own write: `HeaderMenu::withLink($payload, $url, $label, $site)`.
- Reorder, rename or remove links by rewriting the blocks with `applyBlocks($id, $blocks)`.
- Prefer relative URLs (`/pricing`) when writing links yourself; they survive a domain change.

## Footer

The `footer` section: settings `brand`, `description`, `copyright` and more (`filamentcraft:sections footer`); links are `link` blocks with `column` (the heading they group under), `label`, `description`, `url`. A new site's footer says "FilamentCraft" until you set brand and copyright.

## Announcement bar

Enable the region in config, then give it a `banner` section (or any section) like any other region. Section scheduling (`_schedule_from` / `_schedule_until`) works here too for time-boxed promotions.
