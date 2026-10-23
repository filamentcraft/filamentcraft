# No-code section builder (`custom::<slug>`)

## Contents
- When to use it
- Config and setup
- How a definition is stored and resolved
- What editors can build
- Creating one from code
- Moving, deleting, failing
- Verify

## When to use it

Editors compose a section from blocks in the editor (Add section, "Create your own"), save it, and it joins the catalog under "Custom sections" for that one site. Use it for copy, images and layout that editors own. Write a section class instead for logic, queries, blocks/repeaters, presets, Livewire or islands: a definition has none of those.

Constraints that decide it:

- **Per site.** Definitions belong to one site; another tenant never sees them. To share one design across sites, write a class or move the definition with export/import.
- **Flat settings only.** The settings panel is generated: one field per bound prop, in document order, named after the block (`Button · Label`). No repeater blocks, no `visibleIf`, no hand-ordered groups.
- **No presets.** The registry loads only slug, name, icon, category, schema, layout, `cacheable` and `version`; `presets_json` is never read.
- Agents cannot drive the editor's builder UI without a browser. To create a definition without one, write the row yourself (below).

## Config and setup

```php
// config/filamentcraft.php
'section_definitions' => [
    'enabled' => env('FILAMENTCRAFT_SECTION_DEFINITIONS', true),
    'max_per_site' => 50,        // saved (published) definitions per site; 0 = unlimited
    'max_nodes' => 100,          // blocks per section; also enforced when rendering
    'allow_custom_code' => false, // adds the HTML block to the palette and lets its JS run
],
```

The table comes from the `create_filamentcraft_section_definitions` migration (`filamentcraft:upgrade` publishes and runs missing ones). Without the table, `filamentcraft:doctor` warns "Section definitions table missing" and lookups return nothing.

`enabled=false` only stops `custom::` types from resolving (placed instances stop resolving and render empty). The editor's "Create your own" card is not gated by it, so hide the feature with `enabled=false` only if you accept that card still appearing.

`allow_custom_code=true` is a trust decision: it exposes raw JS to anyone who can edit a site. Never enable it where tenants are untrusted. The HTML block's markup and CSS are sanitised either way (CSS containing `<` is dropped, `@import` stripped), and JS containing `</script` is dropped.

## How a definition is stored and resolved

`SectionDefinition` (table `filamentcraft_section_definitions`): `site_id`, `slug`, `name`, `icon`, `category`, `status`, `schema_json`, `layout_json`, `presets_json`, `cacheable`, `version`.

- The section type stored on pages is `custom::<slug>` (`$definition->type()`; `SectionDefinition::isCustomType()`, `bareSlug()`). `custom::*` is reserved: never give a class that slug.
- Slug: `Str::slug(name)` made unique within the site by the builder (`section-…` prefix when it does not start with a letter or digit). Model `saving` rejects anything outside `^[a-z0-9][a-z0-9-]*$` and resets a malformed icon to `heroicon-o-squares-plus`.
- **Only `status = published` rows resolve** (`SectionDefinition::published()`). The builder creates a `draft-xxxxxxxxxxxx` placeholder row when opened; drafts older than a day are swept and never count toward `max_per_site`.
- `version` increments whenever `schema_json`, `layout_json`, `presets_json` or `cacheable` change. It feeds the theme-token hash, so fragment caches rebuild without a manual flush.
- `SectionDefinitionRegistry` caches the site's definitions forever and flushes on model `saved`/`deleted`. Raw `DB::table()` writes skip that: call `app(SectionDefinitionRegistry::class)->flushSite($siteId)`.

`layout_json` is `{version: 1, root: {padding, max_width}, nodes: [...]}`. A node is `{key, type, props, bind, children}`. `bind` maps a prop to a setting id (`'bind' => ['text' => 'title']`), which is how a generated setting reaches the markup. `schema_json` is a list of `Setting::toArray()` shapes (`id`, `type`, `label`, `default`, …). `SchemaFactory` accepts text, textarea, number, range, spacing, gradient, checkbox, select, radio, enum_buttons, color, color_scheme, font, image, icon, link, richtext, inline_richtext and group. Ids starting with `_` are reserved, and `category` / `color_scheme_group` are rejected.

## What editors can build

- 25 blocks in six groups: Typography (heading, eyebrow, text, quote, list), Actions (button, badge, accordion, callout), Media (image, video, avatar, icon, logo), Data (stat, rating, price, progress, timeline), Layout (container, card, columns, masonry, spacer, divider). The 26th, `html`, appears only with `allow_custom_code`, but a stored `html` node still renders (sanitised, no JS) when it is off.
- 24 starter layouts (`SectionStarter`), inserted as ordinary blocks.
- Nesting depth 4 (`DynamicSectionRenderer::MAX_DEPTH`). Container, card, columns and masonry take children.
- Section style: color scheme, padding (`compact|comfortable|airy|none`), width (`narrow|normal|wide|full`).
- The renderer drops nodes past depth 4 or past `max_nodes` silently and skips unknown node types (shows a placeholder only in the editor). Lowering `max_nodes` truncates sections already saved.

## Creating one from code

Only for seeding or migrations. Prefer the editor for design work.

```php
use FilamentCraft\Enums\TemplateStatus;
use FilamentCraft\Models\SectionDefinition;

SectionDefinition::query()->create([
    'site_id' => $site->getKey(),
    'slug' => 'team-intro',
    'name' => 'Team intro',
    'icon' => 'heroicon-o-user-group',
    'category' => 'custom',
    'status' => TemplateStatus::Published,
    'cacheable' => true,
    'version' => 1,
    'schema_json' => [[
        'id' => 'title', 'type' => 'text', 'label' => 'Title', 'default' => 'Meet the team',
        'info' => null, 'required' => false, 'visible_if' => [], 'css_var' => null,
        'css_unit' => null, 'placeholder' => null, 'max_length' => null,
    ]],
    'layout_json' => ['version' => 1, 'root' => [], 'nodes' => [[
        'key' => 'n1', 'type' => 'heading',
        'props' => ['level' => 2, 'size' => 'lg', 'align' => 'center'],
        'bind' => ['text' => 'title'],
    ]]],
]);
```

Place it on a page as a section with `'type' => 'custom::team-intro'` and `settings` keyed by setting id. Run `php artisan filamentcraft:doctor` afterwards.

Export/import carries definitions: the site export has a `sections.json`; import creates missing slugs and updates an existing one only when the incoming `version` is higher. Pages that reference a `custom::` type missing from both the site and the bundle are flagged on import.

## Moving, deleting, failing

- Deleting a definition (catalog card) leaves placed instances in the page data; they render as empty output. Check how many pages use it before deleting.
- Re-saving a definition updates every page using it.
- Duplicate in the catalog copies it with a `-copy`-style unique slug and `version` 1.
- A broken schema entry is skipped, not fatal; the section edits with fewer fields and `doctor` reports it.

## Verify

```bash
php artisan filamentcraft:doctor     # "Section definitions (N)" passes; broken schema/layout fails; over max_per_site warns
```

```php
// php artisan tinker
$site = \FilamentCraft\Models\Site::query()->first();
app(\FilamentCraft\Sections\SectionDefinitionRegistry::class)->definition('custom::team-intro', $site);   // array, not null
```

Then open the editor, Add section, find "Team intro" under Custom sections, insert it and change the field; the canvas must update. Publish and `curl` the page for the heading text. Tests of your own: render through `DynamicSectionRenderer::render($sectionData, $layout)`, the way the package's `tests/Feature/Rendering/DynamicSectionRenderTest.php` does.
