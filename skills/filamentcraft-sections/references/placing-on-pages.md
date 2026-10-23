# Putting a section on an existing page

Best route: tell the user the section is registered and let them add it from the editor's section picker. It shows up there as soon as the class exists.

When the user asks you to place it yourself, write a **new revision**. Revisions are append-only: never update `sections_json` on an existing revision, and never edit `published_revision_id` by hand. This mirrors what the editor's save does (`FilamentCraft\Editor\Actions\RestoreRevision` is the reference):

```php
use FilamentCraft\Editor\State\LocaleBucket;
use FilamentCraft\Editor\State\TemplateState;
use FilamentCraft\Events\TemplateDraftSaved;
use FilamentCraft\Models\Site;
use FilamentCraft\Models\Template;
use FilamentCraft\Models\TemplateRevision;
use Illuminate\Support\Facades\DB;

$site = Site::query()->forOwner($team)->live()->firstOrFail();   // slugs are unique per owner only
$home = Template::query()->forSite($site->getKey())->findOrFail($site->homepage_template_id);
$defaults = ProcessSection::defaults();

$revision = DB::transaction(function () use ($home, $defaults): TemplateRevision {
    $locked = Template::query()->lockForUpdate()->findOrFail($home->getKey());
    $state = TemplateState::fromTemplate($locked);

    foreach ($state->locales as $bucket) {
        $id = LocaleBucket::newSectionId(ProcessSection::slug());
        $bucket->upsertSection($id, ProcessSection::slug(), $defaults['settings'] ?? [], $defaults['blocks'] ?? []);

        $order = array_values(array_diff($bucket->order, [$id]));
        $hero = current(array_filter($order, fn (string $s): bool => $bucket->sections[$s]['type'] === 'hero'));
        $after = $hero === false ? false : array_search($hero, $order, true);
        array_splice($order, $after === false ? 0 : $after + 1, 0, [$id]);
        $bucket->order = $order;
    }

    $revision = TemplateRevision::query()->create([
        'template_id' => $locked->getKey(),
        'parent_revision_id' => $locked->head_revision_id,
        'sections_json' => $state->toRevisionPayload(),
        'summary' => 'Added the How it works section',
    ]);

    $locked->update(['head_revision_id' => $revision->getKey()]);

    return $revision;
});

event(new TemplateDraftSaved($home->refresh(), $revision));
```

- **Content:** start from `defaults()` (or a preset: `BlueprintSection::fromPreset(ProcessSection::class, 'editorial')`, merged over the defaults the way `BlueprintSeeder::sectionPayload()` does; chaining `->settings([...])` after `fromPreset()` replaces the preset's settings, so spread `getSettings()`). Presets carry effects, stock photos and dummy links: blank them on real pages. Then replace the placeholder copy with the user's real copy if they gave it; otherwise say the copy is placeholder.
- **Every locale bucket** gets its own section: translations are separate lists. Translate the copy, or tell the user which locales show the default-language copy.
- **Draft by default.** The new head is a draft the team can review in the editor. Publish (`$home->publishHead()`, which fires `TemplatePublished`) only when the user asked for it live, and say so in your summary. Undo is History in the editor.
- **Script it as a file** you run with `php artisan tinker path/to/script.php </dev/null` (without `</dev/null` tinker drops into the REPL and hangs when stdin is not a TTY), or a one-off command so it's repeatable, and make it idempotent: skip a bucket that already has the section type.
- **Verify** by fetching the page (`curl` the public URL, or preview the draft in the editor) and checking the section's order in the HTML.
- Bulk content (a whole site or many pages) goes through `filamentcraft:import` with a JSON spec instead; see the filamentcraft-site-migration skill.
