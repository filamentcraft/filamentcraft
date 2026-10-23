# Visitor dark-mode toggle

## Contents
- What it is
- Turn it on
- Make the dark scheme on-brand
- Behaviour and limits
- Custom sections and custom layouts
- Verify

## What it is

An opt-in sun/moon button that lets a visitor flip the whole site to another color scheme. It is a manual toggle: there is no `prefers-color-scheme` handling, and nothing follows the OS setting. The server never knows the choice; it lives in the visitor's browser.

It is a scheme swap, not a second theme: every scheme is already compiled into `<style id="fc-tokens">`, and one attribute on `<html>` re-tokens the page and every section, including sections that pin their own scheme.

## Turn it on

Only the built-in **Header** and **Footer** sections render it. Settings (group "Dark mode"):

| Setting | Values | Default |
|---|---|---|
| `show_scheme_toggle` | bool | `false` |
| `scheme_toggle_placement` | `inline` or `floating` (only read when the toggle is on) | `inline` |

`inline` puts the button in the header actions or the footer bottom row. `floating` is a fixed round button; it is moved to `<body>` at runtime, and if header and footer both float only the first stays.

Set them in the editor's Header or Footer section panel, or put `'show_scheme_toggle' => true, 'scheme_toggle_placement' => 'floating'` in the header/footer section settings of a blueprint.

On an **existing** site, write it into each region's stored payload, in every locale bucket (region saves are live):

```php
use FilamentCraft\Editor\State\TemplateState;
use FilamentCraft\Enums\RegionName;
use FilamentCraft\Models\Region;

foreach ([RegionName::Header, RegionName::Footer] as $name) {
    $region = Region::query()->where('site_id', $site->getKey())->where('name', $name->value)->first();
    $state = TemplateState::fromRegion($region, $site->default_locale);

    foreach ($state->locales as $bucket) {
        foreach ($bucket->order as $id) {
            if ($bucket->sections[$id]['type'] === $name->value) {
                $bucket->applySettings($id, ['show_scheme_toggle' => true, 'scheme_toggle_placement' => 'floating']);
            }
        }
    }

    $region->sections_json = new \ArrayObject($state->toRegionPayload());
    $region->save();
}
```

Usually enable only one of the two (two buttons otherwise), then `php artisan filamentcraft:clear-cache <site>`. The stored shape is `sections_json['locales'][<locale>]['sections'][<id>]['settings']`; see the filamentcraft-content skill, `regions-and-menus.md`.

The Header and Footer toggle always targets the scheme slug `dark`. They cannot point at another scheme; a different target needs the partial below.

## Make the dark scheme on-brand

The target `dark` scheme is the package's stone-950 palette with orange primary. On a rebranded site that looks wrong, so override it per site with the same 22 tokens as any scheme (see SKILL.md recipe):

```php
$schemes = SiteColorSchemes::forSite($site);
$schemes['dark'] = $brandDark;            // 22 tokens, dark background, readable on-* colors
SiteColorSchemes::syncOverrides($site, $schemes);
```

`syncOverrides()` replaces the map, so always start from `forSite()`. Do not set the site's active scheme to `dark` just to preview it: the toggle assumes a light default and flips to `dark` when the current override is not `dark`. On a site whose default is already dark, clicking it changes nothing visible.

## Behaviour and limits

- Click sets `data-fc-scheme-override="<slug>"` on `<html>` and stores the slug in `localStorage` under `fc-scheme-override-{siteId}`; a second click removes both. `aria-pressed` tracks the state.
- An inline script in `<head>` restores the stored slug before first paint (no flash) and again after each `wire:navigate` hop.
- Inside the editor canvas the flip is preview only: `sessionStorage` under the same key plus `:editor`. It never touches a visitor's saved choice.
- The compiled override selector is `html[data-fc-scheme-override="<slug>"]` and `html[...] [data-fc-color-scheme]`, emitted for **every** scheme slug. Slugs are reduced to `[a-z0-9-]` (`_` and `.` become `-`).
- No `.dark` class is set. Host CSS or Tailwind `dark:` variants do not follow the toggle. Style with scheme tokens (`bg-background`, `text-on-background`, `var(--fc-color-*)`) so the swap reaches custom markup.
- Choosing the toggle stores a browser preference (localStorage) but sets no cookie and sends nothing to the server. Mention it if the site has a privacy page.

## Custom sections and custom layouts

Reuse the shipped partial instead of writing a new toggle:

```blade
@include('filamentcraft::sections.partials.scheme-toggle', ['floating' => false, 'darkScheme' => 'nord'])
```

`darkScheme` is any scheme slug (default `dark`), exposed as `data-fc-scheme-dark` on the button. Each include re-prints its inline script, which binds its click handler once per page.

A host layout that does not use `<x-filamentcraft::layout>` must copy two things from `resources/views/components/layout.blade.php`: the `data-fc-scheme-key="fc-scheme-override-{{ $site->getKey() }}"` attribute on `<html>` and `@include('filamentcraft::renderer.scheme-restore')` in `<head>`. Without them the choice is not restored after reload.

## Verify

```bash
# toggle rendered on a published page (0 = toggle not enabled on Header/Footer)
curl -s https://site.test/ | grep -c 'data-fc-scheme-toggle'
# override layer for the dark scheme is compiled
curl -s https://site.test/ | grep -o 'html\[data-fc-scheme-override="dark"\]' | head -1
# restore script and key are present
curl -s https://site.test/ | grep -o 'data-fc-scheme-key="[^"]*"'
```

Then in a browser: click the button, wait about half a second (or reload) before reading computed colors, (the swap animates ~250ms, so an immediate read returns the old colors), then confirm `document.documentElement.dataset.fcSchemeOverride === 'dark'`, `localStorage.getItem('fc-scheme-override-<siteId>') === 'dark'`, reload and confirm the page paints dark with no flash, and check `aria-pressed="true"`. Run `php artisan filamentcraft:doctor` after changing scheme overrides.
