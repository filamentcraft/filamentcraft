# Customizing built-in sections

Pick the smallest change that works:

| Goal | Tool |
|---|---|
| Different copy, media, layout or blocks on one page | the editor, no code |
| Colors, fonts, spacing, buttons site-wide | theme settings and schemes (filamentcraft-theming skill) |
| A new section derived from a built-in, with the original still available | **variant** |
| Change how every existing instance of a built-in renders | **replacement** (`--replace`) |
| Inject markup into a built-in view | render hook |
| Hide or add presets | `hidePresets()` / `addPresets()` |
| Change how a setting type edits everywhere | `settingComponentUsing()` |
| Hide sections from the Add section catalog | `withoutSections([...])` / `allowSections([...])` |

## Variant and replacement

```bash
php artisan filamentcraft:customize-section hero ProductHero --no-interaction             # new slug product-hero
php artisan filamentcraft:customize-section hero AppHero --replace --copy-view --no-interaction
```

- The class lands in `app/Sections` (auto-discovered) and inherits settings, blocks, presets, defaults and the view. Other flags: `--slug=` (rejected with `--replace`), `--namespace`, `--path`, `--view-path`, `--force` (rolls back on failure). When the target is outside `app/Sections` it prints the exact `->registerSection()` line. After a change on a live site run `filamentcraft:clear-cache`.
- `--copy-view` copies the Blade view into `resources/views/sections` so you own the markup. Without it, the class keeps following the package view on updates.
- `--copy-view` copies only the top view. A view that does `@include('filamentcraft::sections.partials.*')` keeps rendering the package's partials: copy the partials you want to change into `resources/views/sections/partials` and repoint the `@include` paths (e.g. the testimonials `moving` layout includes `partials.fx.cards-moving`, which includes `partials.fx.cards-moving-card`; `grep -n '@include' <view>`).
- **Replacement keeps the built-in slug.** Every stored page and region resolves to your class with no migration, so stay compatible: keep existing setting and block keys, give new settings defaults, and tolerate legacy values. Test pages and regions (header and footer are regions).
- Contact and Newsletter stay Livewire components when subclassed.

Extend instead of rebuilding:

```php
public static function settings(): array
{
    return [...parent::settings(), Text::make('campaign_label')->label('Campaign label')];
}

public static function defaults(): array
{
    $defaults = parent::defaults();
    $defaults['settings']['campaign_label'] = 'Featured';

    return $defaults;
}
```

Add a field to one block of a built-in (`Block::$settings` is public and mutable; give the new field a default and have your copied view read it):

```php
public static function blocks(): array
{
    return array_map(
        fn (Block $block) => $block->slug === 'quote'
            ? tap($block, fn (Block $b) => $b->settings = [...$b->settings, Image::make('company_logo')->label('Company logo')])
            : $block,
        parent::blocks(),
    );
}
```

## Render hooks

```php
use FilamentCraft\Enums\RenderHook;

FilamentCraftPlugin::make()
    ->renderHook(RenderHook::HeaderNavEnd, fn (SectionData $section) => view('shop.mega-menu', ['site' => $section->site]))
    ->renderHook(RenderHook::ProductDetailPriceAfter, fn (SectionData $section, array $context) => view('shop.stock', ['product' => $context['product']]))
    ->renderHook(RenderHook::SectionEnd, fn () => view('shop.trust-badges'), [HeroSection::class]);
```

Hooks: `SectionStart`, `SectionEnd` (limit with the third argument), `HeaderNavStart`, `HeaderNavEnd`, `HeaderMobileMenuEnd`, `HeaderActionsStart`, `HeaderActionsEnd`, `FooterStart`, `FooterEnd`, `HeroContentEnd`, `ProductDetailGalleryAfter`, `ProductDetailPriceAfter`, `ProductDetailAddToCartAfter`, `ProductDetailInfoEnd` (the product-detail hooks get `['product' => ProductData]`).

Return a view, an `Htmlable` or a string (escaped). A section with a hook skips the fragment cache, so per-request output stays live.

## Presets and catalog

```php
FilamentCraftPlugin::make()
    ->hidePresets(HeroSection::class, ['bold'])
    ->addPresets(HeroSection::class, [Preset::make('shop-launch', 'Shop launch')->settings(['heading' => 'New in store'])])
    ->withoutSections(['countdown', 'marquee'])   // hidden from Add section; existing instances still render
    ->allowSections(['hero', 'features', 'cta']); // or an allow-list
```

Config equivalents: `filamentcraft.sections.allowed` (null = all) and `filamentcraft.sections.disabled`. These are enforced on the editor's insert paths only. `->withBuiltinSections(false)` **unregisters** every built-in, so stored pages that use them render nothing; see [pitfalls.md](pitfalls.md).

## Setting editors

`FilamentCraftPlugin::make()->settingComponentUsing(Link::class, fn (Link $setting, ?Site $site, ?Theme $theme) => MyLinkPicker::make($setting->id))` replaces the form component for every setting of that type. Label, default, helper text, required and `visibleIf` are still applied.
