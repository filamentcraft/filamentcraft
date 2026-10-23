---
name: filamentcraft-sections
description: "Build FilamentCraft sections the way the built-ins are built: PHP section classes (BladeSection, LivewireSection, IslandSection) with settings, repeatable blocks, presets, live editing in the editor canvas, and tests. Use this whenever the user wants a new or changed section, block or content widget on a FilamentCraft site (\"add a pricing table section\", \"make this hero editable\", \"turn this Blade partial into a section\", \"customize the built-in FAQ\"), touches app/Sections or resources/views/sections, runs make:filamentcraft-section, make:filamentcraft-island or filamentcraft:customize-section, or debugs a section (settings not saving, canvas not updating, Tailwind classes missing, Livewire 419s). Also use it to decide between a built-in section, the no-code builder and custom code."
license: MIT
metadata:
  author: filamentcraft
---

# FilamentCraft sections

A FilamentCraft page is an ordered list of **sections**. Each section type is a PHP class that declares a settings schema, optional repeatable **blocks**, and named **presets**, plus a Blade view (or Livewire component, or React/Vue island) that renders them. Editors change settings in the editor's side panel and see the canvas update live. Every value is stored per page and per locale. Nothing a visitor reads is hardcoded in the view.

## Before you write code

Pick the cheapest option that works, in this order:

1. **A built-in already does it.** There are 38 (hero, features, testimonials, pricing, faq, stats, team, gallery, cta, tabs, timeline, logo-cloud, bento, showcase, image-text, rich-text, contact, newsletter, video, countdown, locations, comparison, steps, marquee, portfolio, articles, banner, scroll-showcase, sticky-reveal, header, footer, plus the commerce sections). Run `php artisan filamentcraft:sections` to see what is registered in this app, and `php artisan filamentcraft:sections <slug>` (`--json` for scripts: includes defaults and full presets) for one section's settings, blocks and presets.
2. **A built-in is close.** `php artisan filamentcraft:customize-section` creates a subclass, either as a separate variant or replacing the built-in everywhere while keeping stored content. See [references/customizing-builtins.md](references/customizing-builtins.md).
3. **It is copy, images and layout, and editors should own it.** The no-code section builder in the editor (Add section, then "Create your own") makes reusable section types without a deploy (stored as `custom::<slug>`; config `section_definitions`). Per-site, flat generated settings, no blocks, presets or logic; limits, config, seeding from code, pitfalls: [references/section-builder.md](references/section-builder.md).
4. **It needs logic, data, interactivity or exact design control.** Write a section class (this skill).

When a built-in fits a request worded as "build a section", use it and say which one and why; a near-duplicate custom section splits the team's content across two types.

## Workflow

1. **Scaffold**: `php artisan make:filamentcraft-section Services` writes `app/Sections/ServicesSection.php` and `resources/views/sections/services.blade.php`. Add `--livewire` for an interactive section; use `make:filamentcraft-island Name --react|--vue` for a React/Vue one. `app/Sections` is auto-discovered, so nothing else needs registering there. The scaffold derives the slug from the class name and does not warn when it equals a built-in (`Faq` replaces the built-in `faq`): pick a distinct name or pin `slug()`, then confirm with `php artisan filamentcraft:sections <slug>` and `filamentcraft:doctor`.
2. **Design the schema** before the markup. List every visible string, image, link and choice, and decide which repeat (those become a block). See "Schema rules".
3. **Write the view** in house style (see "View rules" and the example below). The scaffolded stub wraps content in `<x-filamentcraft::section>` and `<x-filamentcraft::container>`; both exist and emit exactly the raw root below (scheme classes/attributes, density padding, `fc-container mx-auto`), so either form is fine. Adapt the stub's placeholder heading, button and `__SLUG__` class to your schema.
4. **Add presets** slugged `modern`, `editorial`, `bold`, `elegant` with real-sounding copy. Four is the target, not a requirement (see "Presets").
5. **Test it** with `SectionDataFactory` (see [references/testing.md](references/testing.md)).
6. **Check the CSS**: `php vendor/filamentcraft/filamentcraft/resources/boost/skills/filamentcraft-sections/scripts/check-classes.php resources/views/sections/services.blade.php`. Or run it from wherever this skill is installed. It lists Tailwind utilities the shipped `site.css` doesn't contain.
7. **Look at it in the editor**: add the section to a page, change every setting and confirm the canvas follows, check mobile width, then publish and view the **published URL**: the canvas can show classes the live page lacks. On a live site run `php artisan filamentcraft:clear-cache` after changing a view or class (the fragment cache key ignores your code). On a non-taggable cache store (`file`, `database`) it prints "Nothing to clear": FilamentCraft caches nothing there, so that is expected, not a failure.
8. **Place it on a page** only if the user asked: append a revision, never edit one, and leave it as a draft unless they asked for it live. Recipe: [references/placing-on-pages.md](references/placing-on-pages.md). The same applies when a built-in covered the request.

## Schema rules

- **Pin `slug()`, and make it unique.** It is stored in every saved page; renaming the class must not orphan content. The default slug comes from the class name and **silently replaces a built-in** with the same slug (`FaqSection`, `HeroSection`, `PricingSection`…) on every page. Check `php artisan filamentcraft:sections` first. `custom::*` is reserved for builder sections.
- **Every visible string is a setting.** No literal copy in the view, except accessibility text you translate with `__()`.
- **Anything that repeats is a block**, never numbered fields (`title_1`, `title_2`). Editors get a reorderable repeater, and the count isn't capped by your schema. Give the block's main field the id `title`, `label`, `name` or `heading`, so repeater rows are labelled.
- **Group the panel** with `Group::make('content_group')->label('Content')`, then `layout_group` and `style_group` with `->collapsed()`. A `Group` swallows the fields after it until the next `Group`.
- **Use the shared style enums** so your section feels native: `EnumButtons::make('density')->enum(SectionDensity::class)`, `align` with `SectionAlignment`, `shape` with `SectionShape` (all in `FilamentCraft\Enums\Sections`). End with `ColorScheme::make('scheme')`.
- **Defaults.** Choice settings get `->default(...)`. Text defaults show as placeholder copy wherever a value is missing, so keep them short or leave them off. `defaults()` is the content a section starts with when added.
- **Setting ids** match `/^[a-z0-9_][a-z0-9_-]*$/i`, are unique within the section, and never start with `_` or end in `_alt` after an image id. Those are reserved for the editor's look, typography and schedule controls and for image alt text.
- `->visibleIf(['layout' => 'split'])` shows a field conditionally (strict equality, AND across keys). Raw Filament components (`Toggle`, `Repeater`, your own fields) work inside `settings()` too.
- `cssVar()` does nothing on a section setting. Use an inline `style` in the view.
- `lookKnobs()` defaults to all five editor look controls. Return only the knobs your markup honours, e.g. `[SectionLook::CARD_STYLE, SectionLook::CORNERS]` when you render `.fc-card` and use the theme radius, or `[]`.

All 20 setting types, their options and what `get()` returns: [references/settings.md](references/settings.md).

## View rules

The view receives one variable, `$section` (a `SectionData`).

- **Root element**: `px-6 lg:px-8`, `$scheme->classes()`, `fc-pad-{density}`, `{!! $scheme->attributes() !!}` and `style="background-color: var(--fc-color-background); color: var(--fc-color-on-background)"`, where `$scheme = $section->colorScheme()`. That one line makes the section follow the site's color scheme and the editor's per-section scheme picker. Then `<div class="fc-container mx-auto">`.
- **Use the house primitives**, which read the theme's tokens: `fc-eyebrow`, `fc-title` (h2), `fc-title--display` (h1), `fc-lede`, `fc-box fc-card fc-lift` for cards, `fc-btn fc-btn-primary` / `fc-btn-outline` / `fc-btn-text` for buttons, `fc-icon-tile`, `fc-media`, `fc-reveal-stagger` with `style="--i: {{ $loop->index }}"` on children. Colors come from `var(--fc-color-primary)`, `var(--fc-color-on-surface)` and so on, never hex values.
- **Only utilities the package ships exist.** The public page loads a prebuilt `site.css`, and your view was never scanned to build it, so `line-clamp-2`, `min-w-5` or `text-[13px]` silently do nothing. Prefer `fc-*` classes, common layout utilities and inline styles with tokens. Run the class checker, or ship your own compiled CSS (`filamentcraft.assets.extra_styles`, or the plugin's `->viteBuild()`).
- **Make text live-editable**: put `{!! $section->liveUpdate('title') !!}` (or `$block->liveUpdate('title')` inside a block loop) on the element whose content **is** that setting's raw value. Use `->attr('src')` or `->attr('href')` for attributes and `->html()` for rich text. Don't bind computed output (an icon rendered from its name, a formatted number). The editor falls back to re-rendering the section, which is always correct, just slower.
- **Keep optional elements in the DOM**: render them with `data-fc-hide-empty` and `@if ($value === '') hidden @endif` instead of wrapping them in `@if`. Otherwise the canvas can't patch them in when an editor types a value.
- **Escape output** with `{{ }}`. `{!! !!}` is only for `liveUpdate()` and `$scheme->attributes()`. Rich text is an `Htmlable` value object, so `{{ }}` prints its sanitised HTML.
- **Images** go through `<x-filamentcraft::image :image="$image" :alt="$title" :bind="$block->liveUpdate('image')->attr('src')" />`. It's lazy by default, keeps the alt the editor wrote, and stays in the DOM.
- **Empty states**: wrap the block grid in `@if (count($section->blocks) > 0) … @elseif ($section->designMode) <x-filamentcraft::empty-state title="…" /> @endif`, so visitors never see an empty frame but editors get a hint.
- Use `@php … @endphp` blocks; don't mix them with inline `@php(...)` in one view. Use logical properties (`ms-*`, `text-start`) so RTL sites work. No `scale` hover effects (`fc-lift` moves, it doesn't grow).

Everything available on `$section`, the Blade components (sheet, pills, skeleton, carousel props, image has no `srcset`), all primitives and tokens: [references/view-api.md](references/view-api.md). Slug collisions, cache, canvas-vs-live CSS, no-code builder config, catalog curation and other traps: [references/pitfalls.md](references/pitfalls.md).

## Example

```php
<?php

declare(strict_types=1);

namespace App\Sections;

use FilamentCraft\Enums\Sections\SectionAlignment;
use FilamentCraft\Enums\Sections\SectionDensity;
use FilamentCraft\Sections\BladeSection;
use FilamentCraft\Sections\Block;
use FilamentCraft\Sections\Look\SectionLook;
use FilamentCraft\Sections\Preset;
use FilamentCraft\Settings\Types\ColorScheme;
use FilamentCraft\Settings\Types\EnumButtons;
use FilamentCraft\Settings\Types\Group;
use FilamentCraft\Settings\Types\Icon;
use FilamentCraft\Settings\Types\Link;
use FilamentCraft\Settings\Types\Select;
use FilamentCraft\Settings\Types\Text;
use FilamentCraft\Settings\Types\Textarea;

final class ServicesSection extends BladeSection
{
    protected static string $view = 'sections.services';

    public static function slug(): string
    {
        return 'services';
    }

    public static function name(): string
    {
        return 'Services';
    }

    public static function icon(): string
    {
        return 'heroicon-o-briefcase';
    }

    public static function lookKnobs(): array
    {
        return [SectionLook::CARD_STYLE, SectionLook::ARRANGEMENT, SectionLook::CORNERS];
    }

    public static function settings(): array
    {
        return [
            Group::make('content_group')->label('Content'),
            Text::make('eyebrow')->label('Eyebrow'),
            Text::make('title')->label('Title')->default('What we do'),
            Textarea::make('intro')->label('Intro'),
            Group::make('layout_group')->label('Layout')->collapsed(),
            Select::make('columns')->label('Columns')->default('3')->options(['2' => '2', '3' => '3', '4' => '4']),
            EnumButtons::make('align')->label('Heading alignment')->enum(SectionAlignment::class)->default(SectionAlignment::Center->value),
            EnumButtons::make('density')->label('Density')->enum(SectionDensity::class)->default(SectionDensity::Comfortable->value),
            Group::make('style_group')->label('Style')->collapsed(),
            ColorScheme::make('scheme')->label('Color scheme'),
        ];
    }

    public static function blocks(): array
    {
        return [
            Block::make('service')->name('Service')->limit(8)->settings([
                Icon::make('icon')->label('Icon'),
                Text::make('title')->label('Title'),
                Textarea::make('description')->label('Description'),
                Link::make('url')->label('Link'),
                Text::make('link_label')->label('Link label')->default('Learn more'),
            ]),
        ];
    }

    public static function presets(): array
    {
        $blocks = fn (array $titles): array => array_map(
            static fn (string $title, int $i): array => ['id' => "service-{$i}", 'type' => 'service', 'settings' => ['icon' => 'heroicon-o-sparkles', 'title' => $title]],
            $titles,
            array_keys($titles),
        );

        return [
            Preset::make('modern', 'Modern')->settings(['eyebrow' => 'Services', 'title' => 'Everything you need to launch', 'columns' => '3', 'scheme' => 'modern'])->blocks($blocks(['Strategy', 'Design', 'Engineering'])),
            Preset::make('editorial', 'Editorial')->settings(['eyebrow' => 'Practice', 'title' => 'Three disciplines, one studio', 'align' => 'start', 'density' => 'airy', 'scheme' => 'silk'])->blocks($blocks(['Research', 'Identity', 'Editorial'])),
            Preset::make('bold', 'Bold')->settings(['title' => 'Built to move fast', 'columns' => '4', 'density' => 'compact', 'scheme' => 'velocity'])->blocks($blocks(['Launch', 'Growth', 'Scale', 'Support'])),
            Preset::make('elegant', 'Elegant')->settings(['title' => 'Considered, end to end', 'columns' => '2', 'scheme' => 'neutral'])->blocks($blocks(['Advisory', 'Craft'])),
        ];
    }

    public static function defaults(): array
    {
        return ['settings' => ['title' => 'What we do'], 'blocks' => []];
    }
}
```

```blade
@php
    $s = $section->settings;
    $scheme = $section->colorScheme();
    $eyebrow = (string) $s->get('eyebrow', '');
    $intro = (string) $s->get('intro', '');
    $columns = (string) $s->get('columns', '3');
    $centered = $s->get('align') === 'center';
    $density = (string) $s->get('density', 'comfortable');
@endphp
<div @class(['px-6 lg:px-8', $scheme->classes(), 'fc-pad-'.$density])
    {!! $scheme->attributes() !!}
    style="background-color: var(--fc-color-background); color: var(--fc-color-on-background)">
    <div class="fc-container mx-auto">
        <div @class(['max-w-2xl', 'mx-auto text-center' => $centered])>
            <p {!! $section->liveUpdate('eyebrow') !!} data-fc-hide-empty @class(['fc-eyebrow mb-4', 'fc-eyebrow--line' => ! $centered]) @if ($eyebrow === '') hidden @endif>{{ $eyebrow }}</p>
            <h2 {!! $section->liveUpdate('title') !!} class="fc-title">{{ $s->get('title') }}</h2>
            <p {!! $section->liveUpdate('intro') !!} data-fc-hide-empty class="mt-4 fc-lede" @if ($intro === '') hidden @endif>{{ $intro }}</p>
        </div>

        @if (count($section->blocks) > 0)
            <div @class(['fc-reveal-stagger mt-12 grid gap-6 sm:grid-cols-2', 'lg:grid-cols-3' => $columns === '3', 'lg:grid-cols-4' => $columns === '4'])>
                @foreach ($section->blocks as $block)
                    @php
                        $b = $block->settings;
                        $icon = (string) $b->get('icon', '');
                        $description = (string) $b->get('description', '');
                        $href = $b->get('url')?->href ?? '';
                    @endphp
                    <article class="fc-box fc-card fc-lift flex flex-col" style="--i: {{ $loop->index }}">
                        <div class="fc-icon-tile mb-5" @if ($icon === '') hidden @endif>
                            <x-filamentcraft::icon :name="$icon" class="h-5 w-5" />
                        </div>
                        <h3 {!! $block->liveUpdate('title') !!} class="text-lg font-semibold">{{ $b->get('title') }}</h3>
                        <p {!! $block->liveUpdate('description') !!} data-fc-hide-empty class="mt-3 text-sm opacity-75" @if ($description === '') hidden @endif>{{ $description }}</p>
                        <a {!! $block->liveUpdate('url')->attr('href') !!} data-fc-hide-empty href="{{ $href }}" class="fc-btn fc-btn-text mt-5 text-sm" @if ($href === '') hidden @endif>
                            <span {!! $block->liveUpdate('link_label') !!}>{{ $b->get('link_label') }}</span>
                        </a>
                    </article>
                @endforeach
            </div>
        @elseif ($section->designMode)
            <x-filamentcraft::empty-state class="mt-12" title="Add a service to fill this grid." />
        @endif
    </div>
</div>
```

## Presets

A preset is a one-click starting point in the editor's preset browser. Ship four, slugged `modern`, `editorial`, `bold`, `elegant`; fewer (even none) is valid for an app-local section. A missing family falls back to the section's `defaults()` in `BlueprintSection::fromPreset()` and to its first preset (else defaults) in the AI assistant, so that family just gets less polished output. Starter sites, blueprints (`BlueprintSection::fromPreset(ServicesSection::class, 'bold')`) and the AI assistant pick sections by these family slugs. If a preset sets `scheme`, use that family's scheme: `modern`, `silk`, `velocity`, `neutral`. Never default to `dark`. Write copy that sounds like a real business, not lorem ipsum.

## Interactive sections

Read [references/interactive.md](references/interactive.md) before writing a `LivewireSection`, Alpine behaviour or an `IslandSection` (React/Vue island: scaffold with `make:filamentcraft-island`; app-level wiring for React/Inertia starter kits is in the setup skill's `references/inertia-react-vue.md`). The non-negotiables:

- A `LivewireSection` view must **start with its single root element**; nothing (no `@if`, no comment) may print above it.
- It must be **registered**: unregistered Livewire sections return 419 on every wire action on the live site, even though `Livewire::test()` passes.
- Never add `@livewireScripts` or your own Alpine; FilamentCraft injects them on pages that need them.
- Return `cacheable(): false` when output depends on the request, session, cart, time or CSRF.

## Done means

- `php artisan filamentcraft:sections <slug>` shows the schema you intended.
- A test (Pest, or a PHPUnit class where the app has no Pest) renders the section from its defaults and from a preset ([references/testing.md](references/testing.md)).
- The class checker passes, and the section looks right in the editor at desktop and mobile widths, in its default scheme and one other.
- Every setting visibly changes the canvas, and no visitor-facing string is hardcoded.
- `php artisan filamentcraft:doctor` is green.
