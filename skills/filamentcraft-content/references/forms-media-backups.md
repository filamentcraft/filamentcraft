# Forms, media, events and backups

## Contact and newsletter submissions

The `contact` and `newsletter` sections fire `ContactFormSubmitted(name, email, message, ?site, sectionId)` and `NewsletterSubscribed(email, ?site, sectionId)` (honeypot hits fire nothing). The package stores each one and emails a notification.

- Rows: `FilamentCraft\Models\Submission` (`type` = `SubmissionType::Contact|Newsletter`, `payload` = `{name, email, message}` or `{email}`, `template_id` (published pages only, null for regions and drafts), `section_id`, `ip`, `user_agent`, `read_at`). Scopes `forSite($site)`, `ofType(...)`, `unread()`, `read()`; helpers `email()`, `sender()`, `field('message')`, `markAsRead()`.
- The editor's Inbox shows them; there is no export button. Export in code:

```php
use FilamentCraft\Enums\SubmissionType;
use FilamentCraft\Models\Submission;

$rows = Submission::query()->forSite($site)->ofType(SubmissionType::Contact)->latest()->get()
    ->map(fn (Submission $s): array => [$s->created_at->toDateTimeString(), $s->sender(), $s->email(), $s->field('message')]);
```

  Rows also hold `ip` and `user_agent`. It is personal data: write the file somewhere private and tell the user where.
- Email: `forms.notify` (env `FILAMENTCRAFT_FORMS_NOTIFY`), or per site with `FilamentCraftPlugin::make()->formRecipientsUsing(fn (Site $site, SubmissionType $type) => …)`. The notification is queued, so a queue worker must run. Reply-To is the visitor.
- Config: `forms.store` (keep rows), `forms.throttle` (per IP per minute), `forms.honeypot`, `forms.inbox`. With `store` off and no listener, messages are dropped (doctor warns).
- The recorder ignores events whose `$site` is null: a custom form dispatching `ContactFormSubmitted` must pass the real `Site` and a `sectionId`, or nothing is stored or mailed.
- To push to a CRM: `Event::listen(ContactFormSubmitted::class, …)` in the host; it fires whether or not rows are stored.

## Media library

Images are per site (`FilamentCraft\Models\Media`: `disk`, `path`, `alt`, `title`, size and dimensions; scope `forSite($site)`). Sections store the image's **path** in their setting and the alt text next to it in `{setting}_alt`; the library's alt is only the default the picker copies in.

```php
use FilamentCraft\Media\MediaLibrary;
use Illuminate\Support\Facades\Storage;

$path = Storage::disk(MediaLibrary::uploadsDisk())->putFile(MediaLibrary::uploadsDirectory(), new \Illuminate\Http\File($localFile));
$media = app(MediaLibrary::class)->register($site, $path);   // null when refused
$media?->update(['alt' => 'Glazed bowls on a shelf']);
```

- `register()` refuses external URLs, paths outside the uploads directory, the reserved `fonts/` and `seo/` folders, and files another site already uses. It never sets alt.
- Then use `$path` as the image setting's value (and `{setting}_alt`) in a revision.
- `php artisan filamentcraft:media-sync [--site=<id>]` registers images that content already uses but the library doesn't list.
- Before deleting: `app(MediaLibrary::class)->usageCount($media) === 0`; `delete()` doesn't rewrite pages that still point at the file.

## Events to hook into

| Event | When |
|---|---|
| `SiteCreated` | a site row is created (the package auto-seeds blueprints on it) |
| `SiteLocaleAdded` | a site gains a locale, or `default_locale` changes to a code not previously listed |
| `TemplateDraftSaved` | editor save, history restore, AI page translation (fire it yourself when you append a revision) |
| `TemplatePublished` | a page is published (editor or `publishHead()`); not fired by `BlueprintSeeder::seedOne(publish: true)`, so no IndexNow ping |
| `SectionAdded` | a section is added in the editor |
| `ContactFormSubmitted`, `NewsletterSubscribed` | form submits |
| `CartUpdated` | cart add/update/remove/clear |

All in `FilamentCraft\Events`. Not evented: unpublish, slug change, page delete, region save, SEO, redirects, media.

## Backups and restore

- `php artisan filamentcraft:export <site> [--with-history] [--with-submissions] [--path=]`: one zip with pages, regions, theme, settings, custom sections, fonts, redirects and media. Not included: domain, owner, status, AI key.
- `php artisan filamentcraft:import bundle.zip --owner="App\Models\Team:1"`: a new **draft** copy. `--replace=<site> --force` overwrites the pages matched by slug (their published version goes live), replaces redirects, keeps pages the bundle doesn't have, and appends any bundled submissions (re-importing duplicates them). It snapshots the site first, so the editor's Themes panel can undo it.
- Bundles cap at `transfer.max_mb` (200, env `FILAMENTCRAFT_TRANSFER_MAX_MB`). Default export path: `storage/app/filamentcraft-exports`. Bundles match records by bundle keys, so they move between int, UUID and ULID installs.
- Snapshots: only the newest one can be restored, and 10 are kept per site.
