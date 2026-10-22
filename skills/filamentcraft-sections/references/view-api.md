# View API

## Contents
- `$section` (SectionData)
- Live editing (`liveUpdate`)
- Blade components
- CSS primitives and tokens
- What wraps your view

## `$section`

| Member | Use |
|---|---|
| `$section->settings` | `SettingsValues` (see settings.md) |
| `$section->blocks` | list of `BlockData` (`id`, `type`, `settings`, `liveUpdate()`) |
| `$section->id` | instance id; also the anchor (`#id`) |
| `$section->type` | slug |
| `$section->designMode` | true inside the editor canvas: show hints and empty states |
| `$section->site` | `?Site` (null in some tests) |
| `$section->locale` | render locale (the app locale is set to it while rendering, so `__()` works) |
| `$section->colorScheme($id = 'scheme')` | never null: section scheme, else page scheme, else `modern` |
| `$section->liveUpdate($settingId)` | live-edit binding (below) |
| `$section->context($key, $default)` / `routeContext()` | dynamic-page route data (bound models, parameters) |
| `$section->currentRecordKey('product', 'record')` | the current record's key on a dynamic page |

## Live editing

`liveUpdate()` returns an attribute string; echo it with `{!! !!}` on the element that shows the setting's raw value.

| Call | Canvas does |
|---|---|
| `liveUpdate('title')` / `->text()` | sets `textContent` |
| `->html()` | sets `innerHTML` (rich text) |
| `->outerHtml()` | replaces the element |
| `->attr('src')`, `->attr('href')` | sets the attribute (empty `src` hides an `<img>`) |
| `->style('--accent')` | sets a style property |
| `->toggleClass('is-featured')` | toggles a class from a boolean |

The editor sends the raw stored value (an image's URL, a link's href). Bind only elements that display exactly that value. When a changed setting has no binding on the page, the editor re-renders the whole section, so bindings are an optimisation, never required for correctness.

Optional elements: always render them and hide when empty, so the canvas can reveal them while the editor types.

```blade
<p {!! $section->liveUpdate('eyebrow') !!} data-fc-hide-empty class="fc-eyebrow"
   @if ($eyebrow === '') hidden @endif>{{ $eyebrow }}</p>
```

## Blade components (`x-filamentcraft::`)

| Component | Props | Notes |
|---|---|---|
| `image` | `image` (ImageValue/string/null), `alt`, `decorative`, `eager`, `bind` | lazy `<img>`; editor-written alt wins over `alt`; stays in the DOM (hidden when empty) |
| `icon` | `name`, `fallback` | Heroicons by name; up to 4 characters render as a glyph (emoji, "01") |
| `empty-state` | `title`, `hint`, `icon`, `actionLabel`, `actionUrl` | for `@elseif ($section->designMode)` |
| `carousel` + `carousel.slide` | `section`, `id`, `label`/`labelledby`, `columns`, `gap`, `peek`, `arrows`, `dots`, `count`; slide: `index`, `total` | accessible carousel; JS ships with the site bundle |
| `section`, `container`, `box`, `button` | | convenience wrappers used by the make stub; built-ins hand-write the same markup |
| `sheet`, `pills`, `skeleton` | | drawer, radio pills, loading placeholder |
| `island` | `name`, `section`, `props` | mount a React/Vue component inside a Blade section |

## CSS primitives

The public page loads the package's prebuilt `site.css`. Classes your view uses must exist there or in CSS you ship yourself.

| Class | Meaning |
|---|---|
| `fc-container` | theme container width; pair with `mx-auto` |
| `fc-pad-compact` / `-comfortable` / `-airy` | section vertical padding from the theme's section spacing |
| `fc-eyebrow` (+ `fc-eyebrow--line` when start-aligned) | small label above a title |
| `fc-title`, `fc-title--display` | section h2 / hero h1, scaled by the theme's heading scale |
| `fc-lede` | intro paragraph |
| `fc-box` (+ `fc-box--relaxed`, `fc-box--roomy`, `fc-box-border`) | theme radius and padding |
| `fc-card` | surface background, on-surface text, hairline outline; compose with `fc-box` |
| `fc-lift` | hover lift (translate, never scale) |
| `fc-elevate-1/2/3` | shadows |
| `fc-card--clickable` + `fc-card__hit-area` | whole-card link: one stretched `<a class="fc-card__hit-area">` |
| `fc-btn` + `fc-btn-primary` / `-secondary` / `-outline` / `-text`; `fc-btn-sm` / `-lg` / `-block` | theme buttons |
| `fc-icon-tile` (`--lg`) | tinted icon square |
| `fc-media` + `fc-media__ph` | image frame with placeholder monogram |
| `fc-media-frame` | rounded clipped image frame |
| `fc-reveal`, `fc-reveal-stagger` (children get `style="--i: {{ $loop->index }}"`) | entrance animation, off for reduced motion |
| `fc-tag` (`--sale`, `--new`, `--accent`), `fc-chip`, `fc-stat-number`, `fc-divider-gradient`, `fc-visually-hidden`, `fc-input`, `fc-field` | misc |

Utilities: the package ships the layout utilities its own sections use, plus a safelist (flex/grid, gap, grid-cols 1–6 with `sm:`/`md:`/`lg:`, spacing, text sizes and weights, rounded, shadow, opacity steps, aspect, object-fit, and so on). Anything else, especially arbitrary values (`text-[13px]`) and plugins (`line-clamp-*`), is absent. Check with `scripts/check-classes.php`.

Colors: `var(--fc-color-{token})` for the 22 scheme tokens (`background`, `on-background`, `surface`, `on-surface`, `surface-alt`, `primary`, `on-primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `danger`, and their `on-*`), plus `--fc-color-on-background-muted`. Tailwind aliases `bg-primary`, `text-on-surface` and `border-primary` exist. For tints use `color-mix(in oklab, var(--fc-color-primary) 14%, transparent)`.

Theme variables: `--container-max`, `--box-radius`, `--box-padding`, `--button-radius`, `--section-spacing`, `--font-heading`, `--font-default`.

## What wraps your view

FilamentCraft wraps each section in `<div id="{anchor}" data-fc-section-id data-fc-section-type …>`. Look-knob classes (`fc-cards--bordered`, `fc-corners--round`) and per-section font overrides go on that wrapper, and `x-data` is added automatically when your markup uses Alpine. Your root element is its first child. Don't put `x-data` on your root yourself.

Rendering errors don't break the page: the editor shows a failure card, the public page drops the section and records the error for `filamentcraft:doctor`.
