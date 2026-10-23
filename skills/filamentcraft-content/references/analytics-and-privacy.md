# Analytics, tracking and visitor data

## Contents
- What the package does and does not record
- Reading what it records
- Adding analytics to a site
- Consent and privacy checklist
- Verify

## What the package does and does not record

**There is no visitor, pageview or funnel analytics feature in FilamentCraft.** The package ships no tracker, no events table and no dashboard for traffic. (The funnel tracking on filamentcraft.dev and the demo is those sites' own code, not part of the package: do not promise it, and do not look for a config key.) If a user asks for "analytics", they need a third-party tool added to the site, or their own code.

What it does store or send, all verified in source:

| Data | Where | Controlled by |
|---|---|---|
| Contact and newsletter submissions: payload (name, email, message), `ip`, `user_agent` (255 chars), site, page, section id | table `filamentcraft_submissions`, listed in the panel Inbox | `forms.store` (`FILAMENTCRAFT_FORMS_STORE`), `forms.inbox` |
| Mail notification of each submission (queued) | recipients | `forms.notify`, `formRecipientsUsing()` |
| Visitor's chosen language, per site | Laravel session (needs the `web` middleware the package routes use) | `localization.remember` (`FILAMENTCRAFT_REMEMBER_LOCALE`) |
| Dark-mode choice | browser `localStorage` key `fc-scheme-override-{siteId}`, never sent to the server | only exists when a site turns the toggle on |
| Dismissed announcement banner | browser `localStorage` | banner section |
| "Page published" ping with the page URL (no visitor data) to `api.indexnow.org` | Bing/Yandex/Naver | `seo.indexnow.enabled`; also needs `public_routes` |
| Editor drafts, undo history | app cache and revisions | editors only |

There is no retention or pruning for submissions: rows, IPs and user agents stay until the host deletes them. A host that needs a retention window schedules its own deletion (`Submission::query()->where('created_at', '<', now()->subDays(90))->delete()`).

Honeypot hits fire no event and store nothing. Events `ContactFormSubmitted` and `NewsletterSubscribed` fire whether or not rows are stored; use a listener to forward conversions to a CRM or analytics API server side.

## Reading what it records

Form conversions are the only built-in "metric". Use `Submission` scopes, not raw `where`:

```php
use FilamentCraft\Enums\SubmissionType;
use FilamentCraft\Models\Submission;

Submission::query()->forSite($site)->ofType(SubmissionType::Contact)->unread()->count();
Submission::query()->forSite($site)->where('created_at', '>=', now()->subDays(30))->count();
```

`forSite()`, `forSites()`, `ofType()`, `read()` and `unread()` exist on the model. In the panel the Inbox resource lists them per site.

## Adding analytics to a site

Pick the mechanism by where the snippet lives:

- **A script URL** (Plausible, Fathom, a self-hosted tracker, GTM loader file): `filamentcraft.assets.extra_scripts => ['https://…/script.js']`. Each URL is printed as `<script src="…" defer>` before `</body>` on every rendered page, **including the editor canvas**, so pageviews from editing sessions get counted unless the tool ignores the editor host or you gate on a host path. Per-tool data attributes (`data-domain`) cannot be added this way.
- **An inline snippet** (gtag config, a consent banner init): push it from the Blade page that wraps `<x-filamentcraft::layout>` with `@push('fc-head')` / `@push('fc-scripts')`. This only works on host-owned Blade pages (dynamic pages, storefront pages). Pages rendered by FilamentCraft itself have no head injection point; for those, ship a small JS file through `extra_scripts` or a `vite_builds` entry that reads its settings from the document, or wrap the snippet in a host-owned file.
- **Section-level markup** (a conversion pixel in one section): custom section only. `@push` inside a section view never reaches the layout, because sections render as standalone cacheable fragments (filamentcraft-sections, interactive reference).
- `FilamentCraftPlugin::make()->script($url)` also injects a script URL, but it reaches public pages only through the default panel; prefer the config key (setup skill, config-pitfalls).

After adding anything, run `php artisan filamentcraft:clear-cache` and republish a page: shells and fragments are cached.

Tag managers and analytics belong in the layout, not in sections. Migrated sites: carry the old site's tracking ID over by asking the user, never by copying whatever IDs the crawl found.

## Consent and privacy checklist

- Third-party trackers that set cookies or read identifiers need consent in the EU/UK. The package has no consent manager, so load such a script only after the user's own consent tool allows it. Cookieless tools (Plausible, Fathom, Umami) usually need no banner; the user decides with their own legal advice.
- The package itself sets no tracking cookie; the Laravel session cookie (locale memory, forms CSRF, carts) is functional. Turn locale memory off with `FILAMENTCRAFT_REMEMBER_LOCALE=false` if the site must run with no session until a visitor acts.
- Tell the user that submissions keep IP and user agent; set `forms.store` false if a site only forwards via a listener, or add the retention job above.
- State on the privacy page: forms, session, the localStorage choices above, and any tracker added.
- Do not ship a tracker the user did not ask for.

## Verify

```bash
php artisan config:show filamentcraft.assets.extra_scripts
php artisan config:show filamentcraft.forms
curl -s https://site.test/ | grep -o '<script src="[^"]*" defer>'     # the tracker URL is present
php artisan filamentcraft:doctor                                      # warns when forms.store is off with no listener
```

Submit the contact form once, then in tinker `Submission::query()->latest()->first()` must show `ip` and `user_agent`; the Inbox shows the row. Open the editor canvas and confirm in the browser network tab whether the tracker fires there.
