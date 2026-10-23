# Setting types

## Contents
- Shared API
- The 20 types (fluent methods, stored value, what `get()` returns)
- Value objects
- Reading values: `SettingsValues`
- Raw Filament components
- Blocks and presets API

All types live in `FilamentCraft\Settings\Types` and extend `FilamentCraft\Settings\Setting`.

## Shared API

| Method | Notes |
|---|---|
| `make(string $id)` | id matches `/^[a-z0-9_][a-z0-9_-]*$/i`; don't start with `_` |
| `label(string)` | always set it |
| `default(mixed)` | used when the stored value is missing |
| `info(string)` / `helperText(string)` | help text under the field |
| `required(bool = true)` | |
| `visibleIf(array)` | `['layout' => 'split', 'cta_enabled' => true]`: strict `===`, all must match |
| `cssVar(string, ?unit)` | theme settings only; ignored on sections |

The editor picks the live mode itself. Toggles and selects update the canvas instantly; typed fields (Text, Textarea, Number, Range, Color, Image, Link, RichText) update on blur.

## Types

| Class | Specific methods | Stored | `get()` returns |
|---|---|---|---|
| `Text` | `placeholder()`, `maxLength()` | string | string |
| `Textarea` | `placeholder()`, `rows()` (3) | string | string |
| `Number` | `min()`, `max()`, `step()` (ints) | number | number |
| `Range` | `min()`, `max()`, `step()`, `unit()` | number | number |
| `Select` | `options(array\|EnumClass::class)`, `searchable()`; no multi-select | string key (`'3'`, not `3`) | string |
| `Radio` | `options(array\|EnumClass::class)` | string | string |
| `Checkbox` | `cssValues(on, off)` (themes only) | bool | bool |
| `EnumButtons` | `enum(EnumClass::class)`: backed enum implementing `HasLabel`, `HasColor`, `HasIcon` | enum value | string; default with `->default(Enum::Case->value)` |
| `Color` | `allowAlpha()`, `palette([...], allowCustom: false)` | `#hex` / `rgba()` | `?ColorValue` |
| `Gradient` | `linearOnly()`, `allowRadial()`, `allowAlpha()`, `minStops()`, `maxStops()` | object | `?GradientValue` |
| `ColorScheme` | `inheritable()` (**default true**: pass `false` to drop the "inherit" option) | scheme slug or `'__inherit'` | use `$section->colorScheme()` instead |
| `ColorSchemeGroup` | | | theme panels only |
| `Font` | `onlyCategory()`, `only([...slugs])`, `clearable()` | Bunny font slug | `?FontValue` |
| `Image` | `accept([...])`, `maxSize(kb)`, `editor()`, `editorMode()`, `aspectRatios([...])`, `alt(bool)`, `altLabel()`, `altInfo()`, `disk()`, `directory()`, `visibility()` | path string; alt text in sibling `{id}_alt` | `?ImageValue` |
| `Icon` | `set('heroicons')`; the raw `IconPicker::make()->sets()/styles()/gridColumns()/searchLimit()/clearable()` limits only the picker, rendering accepts any installed set | e.g. `heroicon-o-bolt` (or a short emoji/glyph) | string; render with `<x-filamentcraft::icon :name>` (blank, silently, if the set is not installed) |
| `Link` | | href string | `?LinkValue` (unsafe schemes become null) |
| `RichText` | `inline()` for a bold/italic/link-only toolbar | TipTap document (or HTML) | `?RichTextValue` (sanitised) |
| `Spacing` | `min()`, `max()`, `step()`, `unit()`, `sides([...])` | `{top,right,bottom,left,linked}` | `?SpacingValue` |
| `Group` | `collapsed()` (open by default), `icon()`, `content()` | | panel divider |
| `Category` | | | theme panels only; throws in a section |

## Value objects

All are `Stringable`, so `{{ $value }}` prints something sensible.

| Object | Properties / methods | Prints |
|---|---|---|
| `ImageValue` | `path`, `url`, `width`, `height`, `alt`, `srcset()`, `small()`, `medium()`, `large()` (all return the original URL unless a resolver is registered, see below) | url |
| `LinkValue` | `href`, `label`, `external`, `target` | href |
| `ColorValue` | `hex`, `alpha`, `rgba()` | hex |
| `FontValue` | `family`, `weight`, `style`, `cssFamily()` | css family |
| `GradientValue` | `css()`, `isLinear()`, `firstColor()`, `lastColor()` | css |
| `SpacingValue` | `css()`, `top()`, `right()`, `bottom()`, `left()` | css shorthand |
| `RichTextValue` | `toHtml()`, `isEmpty()`; `Htmlable` | sanitised HTML |
| `ColorSchemeValue` | `slug`, `attributes()`, `classes()`, `token($name)`, `background()`, `foreground()` | slug |

### Image sizes

`small()`, `medium()`, `large()` and `srcset()` return the **original URL** until the host registers `FilamentCraftPlugin::make()->imageSizesUsing(fn (ImageValue $image, string $size): string => …)` (`$size` is `small|medium|large`). The built-in `<x-filamentcraft::image>` never emits a `srcset`, so the resolver affects only views that call `$image->srcset()` themselves (and island props). The resolver is process-wide static: call `FilamentCraft\Settings\Values\ImageSizeResolver::reset()` in tests. Image values may also be absolute `http(s)://` or root-relative URLs, which pass through untouched. `TemplateUrlPicker` (`FilamentCraft\Filament\Forms\Components\TemplateUrlPicker`, `forSite()`, `forAllSites()`, `searchLimit()`) stores the public URL of a **published** page: use it in a section schema instead of free-text Link when the target is a page.

## Reading values: `$section->settings` / `$block->settings`

- `get($id, $fallback = null)`: the stored value, transformed. If nothing is stored it returns the setting's `->default()` when one is declared; only then `$fallback`. So `get('eyebrow', '')` returns the schema default if you declared one.
- `$settings->title` is shorthand for `get('title')`.
- `has($id)` (stored only), `only('a', 'b')`, `except(...)`, `filter(fn ($v, $id) => …)`, `whereStartsWith('social_')`, `toArray()` (raw stored values).
- There is no `image()` helper. Use `get('photo')`, which returns an `ImageValue` or null.

Cast scalars for comparisons: `(string) $s->get('columns', '3') === '3'`.

## Raw Filament components

Any Filament form component can sit in `settings()` or a block's settings: `Toggle`, `Repeater`, `KeyValue`, `TagsInput`, your own fields. The editor wires live preview for them. `FileUpload`, `RichEditor` and `ColorPicker` values are transformed like their DSL twins; everything else comes back raw. Use the DSL `Group`, not Filament's `Section`, for headers. Ids must be unique across DSL and raw fields. A raw `Repeater` stores a plain list of row arrays (`[['text' => 'Fast'], ['text' => 'Safe']]`, no uuid keys) and `get()` returns it untouched, so read it with `(array) $b->get('features', [])` and `$row['text'] ?? ''`. Prefer blocks for anything editors reorder.

## Blocks

```php
Block::make('plan')          // slug: /^[a-z][a-z0-9-]*$/
    ->name('Plan')
    ->limit(4)               // max of this type in the repeater
    ->settings([...]);       // any setting types or raw Filament fields
```

Stored as `['id' => 'plan-1', 'type' => 'plan', 'settings' => [...]]`. In the view, `$section->blocks` is a list of `BlockData` (`id`, `type`, `settings`, `liveUpdate()`). With several block types the editor groups them by type in declaration order, so filter on `$block->type` if you mix them in one loop.

## Presets

```php
Preset::make('modern', 'Modern')
    ->settings(['title' => '…', 'scheme' => 'modern'])
    ->blocks([['id' => 'plan-1', 'type' => 'plan', 'settings' => [...]]]);
```

Applying a preset replaces the section's content. Settings it doesn't set fall back to schema defaults. Host apps can add or hide presets on any section without subclassing: `FilamentCraftPlugin::make()->addPresets(HeroSection::class, [Preset::make(...)])` and `->hidePresets(HeroSection::class, ['bold'])`.
