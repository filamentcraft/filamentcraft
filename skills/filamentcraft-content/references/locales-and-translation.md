# Languages and translation

A site has `default_locale` and `locales` (`$site->localeCodes()` lists them, default first). Every page revision and every region holds one section list **per locale**; a locale with no list (or an empty one) shows the default language on the public site, but looks empty in the editor.

## Add a language

```php
$site->update(['locales' => [...$site->localeCodes(), 'fr']]);   // fires SiteLocaleAdded(site, 'fr')
```

That only adds the language. Nothing creates French content (the package doesn't listen to `SiteLocaleAdded`), so visitors on `/?locale=fr` see the default language until you fill it. Then run `php artisan filamentcraft:clear-cache <site>`: the header's language switcher is cached.

## Fill it

**Copy, then translate by hand** (no AI needed). For each page, append a revision whose `fr` bucket is a copy of `en` (pages-and-revisions.md "Change sections" shows the transaction):

```php
$state = TemplateState::fromTemplate($locked);
app(\FilamentCraft\Editor\Actions\CopyLocaleContent::class)($state, 'en', 'fr');   // replaces any fr content
foreach ($state->bucket('fr')->order as $id) {
    $state->bucket('fr')->applySettings($id, [/* translated strings for this section */]);
}
```

Translate every visible string, block items included (`applyBlocks`). Keep links, ids, images and option values unchanged. Leaving some strings in English produces a mixed-language page; better to leave the page untranslated (falls back) than half done.

**AI translation** (needs the optional `laravel/ai` package, PHP 8.3+ and Laravel 12+, a provider key in `config/ai.php`, and `filamentcraft.ai.enabled`):

```php
use FilamentCraft\Ai\SiteAiSettings;
use FilamentCraft\Ai\Translation\LocaleTranslator;

$run = app(LocaleTranslator::class)->translateTemplate($page, $site, 'en', 'fr', SiteAiSettings::tier($site));
// $run->failed lists strings kept in English; $run->fromMemory / ->calls / ->tokens for the report
```

- `translateTemplate()` writes a **draft** revision ("Translated to …"); publish when the user approves.
- `translateRegion($region, $site, 'en', 'fr', $tier)` saves the header or footer **in place: live immediately**, no history. Export first or ask, and clear the cache after.
- Only text is sent; links, HTML, placeholders and numbers are protected and checked. A per-site translation memory makes re-runs nearly free.
- From artisan or a queue there is no logged-in user, so a `->aiAccess(fn ($user) => …)` closure on the plugin may refuse. Rate limit: `ai.limits.requests_per_minute` (30).

## Per-locale SEO

Titles and descriptions are per locale and are not inherited (only `og_image` and `indexable` are). Write them for every language: seo-and-redirects.md.

## Visitors and URLs

- The visitor's language: explicit `?locale=` (remembered in the session per site), else the default; always clamped to the site's locales.
- Right-to-left is automatic for ar, he, fa, ur, ckb, dv, ps, sd, ug, yi (`$site->isRtl($locale)`); built-in sections use logical CSS, so check custom sections at 390px in RTL.
- The header shows a language switcher when the site has several locales (header setting `show_locale_switcher`). hreflang alternates are emitted for published locales.
- Locale URL shapes other than `?locale=` (`/fr/...`, `fr.example.com`): `FilamentCraftPlugin::make()->localeUrlsUsing(fn (Site $site, string $locale, bool $isDefault): ?string => …)`; the host must also route those URLs and set the locale.
