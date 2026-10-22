# Pages and revisions

`FilamentCraft\Models\Template` is a page: `site_id`, `name`, `slug` (unique per site, no leading slash, nested `a/b` allowed from code and import, the editor only allows `alpha_dash`), `type` (`TemplateType`: Page, Post, Landing, Custom), `status` (`TemplateStatus`: Draft, Published), `head_revision_id`, `published_revision_id`, `seo_json`. Scopes: `forSite($siteId)`, `published()`, `draft()`. Relations: `site`, `revisions`, `headRevision`, `publishedRevision`.

A revision's `sections_json` is the v2 payload:

```php
['version' => 2, 'settings' => [], 'locales' => [
    'en' => ['order' => ['hero_ab12cd34', ...], 'sections' => [
        'hero_ab12cd34' => ['id' => 'hero_ab12cd34', 'type' => 'hero', 'settings' => [...], 'blocks' => [...], 'locked' => false, 'hidden' => false],
    ]],
]]
```

Work with it through `FilamentCraft\Editor\State\TemplateState` and its `LocaleBucket`s instead of raw arrays.

## Create a page

Define it as a blueprint so it is reproducible, then seed it:

```php
use FilamentCraft\Blueprints\AbstractBlueprint;
use FilamentCraft\Blueprints\BlueprintSection;
use FilamentCraft\Sections\Builtin\FaqSection;
use FilamentCraft\Sections\Builtin\HeroSection;

final class AboutPage extends AbstractBlueprint
{
    public function name(): string { return 'About'; }
    public function slug(): string { return 'about'; }

    public function sections(): array
    {
        $hero = BlueprintSection::fromPreset(HeroSection::class, 'editorial');

        return [
            $hero->settings([...$hero->getSettings(), 'heading' => 'Our story', 'subheading' => '…']),
            BlueprintSection::make(FaqSection::class)->blocks([
                ['type' => 'item', 'settings' => ['question' => 'Where are you?', 'answer' => '14 Wharf Lane']],
            ]),
        ];
    }
}

$exists = Template::query()->forSite($site->getKey())->where('slug', 'about')->exists();
$page = $exists ? null : app(\FilamentCraft\Blueprints\BlueprintSeeder::class)->seedOne($site, new AboutPage, publish: false);
```

- `seedOne()` never fails on a taken slug: it picks `about-2`. Check first, as above.
- It fills every locale of the site with the same sections; translate them afterwards (locales-and-translation.md).
- `settings()` **replaces** the override array, and the result merges over the section's defaults. So after `fromPreset()`, chaining `->settings([...])` throws the preset's layout, scheme and effect settings away (only its blocks survive): spread `$section->getSettings()` as above. Unset copy fields keep the section's placeholder text: set every visible field, or blank it with `''`. Presets also set effects (`backdrop`, `heading_effect`, `cta_style`), stock `bg_image` photos and dummy links; blank or replace those on real pages. `blocks()` replaces the default blocks. Setting ids and block types: `php artisan filamentcraft:sections <slug>`.
- `publish: true` publishes and flushes the cache. Add it to the menu with `HeaderMenu::addPage()` (regions-and-menus.md).
- Many pages, or pages with images: write a JSON site spec instead and import it (filamentcraft-site-migration skill, `site-spec.md`).

## Change sections on an existing page

Append a revision. This is the editor's save, and `RestoreRevision` is the reference implementation:

```php
use FilamentCraft\Editor\State\TemplateState;
use FilamentCraft\Events\TemplateDraftSaved;
use FilamentCraft\Models\Template;
use FilamentCraft\Models\TemplateRevision;
use Illuminate\Support\Facades\DB;

$revision = DB::transaction(function () use ($page): TemplateRevision {
    $locked = Template::query()->lockForUpdate()->findOrFail($page->getKey());
    $state = TemplateState::fromTemplate($locked);          // the head (draft)

    foreach ($state->locales as $locale => $bucket) {
        foreach ($bucket->order as $id) {
            if ($bucket->sections[$id]['type'] === 'cta') {
                $bucket->applySettings($id, ['heading' => 'Book a seat']);   // merges
            }
        }
    }

    $revision = TemplateRevision::query()->create([
        'template_id' => $locked->getKey(),
        'parent_revision_id' => $locked->head_revision_id,
        'sections_json' => $state->toRevisionPayload(),
        'summary' => 'Updated the call to action',
    ]);
    $locked->update(['head_revision_id' => $revision->getKey()]);

    return $revision;
});

event(new TemplateDraftSaved($page->refresh(), $revision));
```

Bucket operations (`$state->bucket('en')`, `ensureBucket()`):

| Want | Call | Note |
|---|---|---|
| change some settings | `applySettings($id, [...])` | merges |
| replace a section's blocks | `applyBlocks($id, $blocks)` | replaces the list |
| add a section | `upsertSection(LocaleBucket::newSectionId('faq'), 'faq', $settings, $blocks)` (appends the id to `$bucket->order` when new) | on an existing id it **replaces** all settings |
| remove / move / copy / hide | `removeSection($id)`, `moveSection($id, ±1)`, `duplicateSection($id)`, `toggleHidden($id)` | `locked` is only enforced in the editor; respect it yourself |

Then leave it as a draft, or publish (`$page->publishHead()`) if the user asked for it live. If someone has the page open with unsaved edits, their next save asks them to resolve the conflict; mention it.

## Publish, unpublish

- `$page->publishHead()`: published = head, status Published, fires `TemplatePublished` (IndexNow ping when the site is public, cache and sitemap flush). Throws if there is no head.
- Unpublish: `$page->update(['status' => TemplateStatus::Draft])`, then `filamentcraft:clear-cache`. The published pointer is kept; nothing fires.
- The public site only serves pages of a **live** site (`$site->markLive()`), and `/` is the homepage only if that page is published.

## Duplicate, rename, move

- `$copy = $page->duplicateForSite()`: draft copy, slug `{slug}-copy`, head cloned, no SEO and no published version.
- Slug changes are live at once and break the old URL. Add the redirect first, then save:

```php
\FilamentCraft\Models\Redirect::forSlugChange($site, $page->slug, 'about/story');   // 301 old -> new, repoints chains
$page->update(['slug' => 'about/story']);
```

## Homepage

`$site->update(['homepage_template_id' => $page->getKey()])`, with the page published (otherwise `/` falls back to a published page slugged `home`). The homepage also answers at its own slug.

## Delete

Code has none of the editor's guards. Before `$page->revisions()->delete(); $page->delete();`: refuse locked pages (`$page->isLocked()`), never delete a site's last page, and if it is the homepage point `homepage_template_id` at another published page first. Ask the user, and offer an export first.

## History and restore

- Revisions are never pruned; `$page->revisions()->latest('id')` lists them with `summary` and `user_id`.
- `app(\FilamentCraft\Editor\Actions\RestoreRevision::class)($page, $revisionId)` copies an old revision into a new draft head (then publish if asked); `->undo($page, $restoredId)` reverts it while nobody saved on top.

## Scheduling and hiding

Per section, in its settings: `_schedule_from`, `_schedule_until` (exclusive; ISO-8601 UTC like the editor writes, or a time in `app.timezone`), optional `_schedule_replaces` (id of a section it stands in for while live). Windows apply only on the published site and in `?at=` previews. `hidden: true` keeps a section without rendering it. Blueprints: `->schedule($from, $until)`, `->hide()`, `->lock()`.
