# Languages and translation

A site has `default_locale` and `locales` (`$site->localeCodes()` lists them, default first). Every page revision and every region holds one section list **per locale**; a locale with no list (or an empty one) shows the default language on the public site, but looks empty in the editor.

## Add a language

```php
$site->update(['locales' => [...$site->localeCodes(), 'fr']]);   // fires SiteLocaleAdded(site, 'fr')
```

That only adds the language. Nothing creates French content (the package doesn't listen to `SiteLocaleAdded`), so visitors on `/?locale=fr` see the default language until you fill it. Then run `php artisan filamentcraft:clear-cache <site>`: the header's language switcher is cached.

**Never leave a locale half-added on a public site.** The moment `fr` is in `locales`, every published page emits `hreflang="fr"` and `?locale=fr` goes into `sitemap.xml`, while an empty `fr` bucket serves the default-language text at that URL: duplicate content indexed under the French URL. In the same change either fill (or translate) every published page, or hide the unfinished ones from search per locale: `TemplateSeo::write($page, 'fr', [...TemplateSeo::bucketFor($page, 'fr'), 'indexable' => false])`. `indexable` is inherited from the default locale, so set it explicitly. A page-level `canonical` pointing elsewhere also removes that page and locale from hreflang and the sitemap.

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

- `translateTemplate()` writes a **draft** revision ("Translated to …"); publish when the user approves. It first copies source to target, so it **replaces** whatever the target bucket held, including hand translations (the revision keeps the old text; History can undo). The editor leaves "Already translated" pages unticked, the code API has no such guard: check the target bucket first. From artisan the revision's `user_id` is null.
- `translateRegion($region, $site, 'en', 'fr', $tier)` saves the header or footer **in place: live immediately**, no history. Export first or ask, and clear the cache after.
- Only text is sent; links, HTML, placeholders and numbers are protected and checked. A per-site translation memory makes re-runs nearly free.
- From artisan or a queue there is no logged-in user, so a `->aiAccess(fn ($user) => …)` closure on the plugin may refuse. Rate limit: `ai.limits.requests_per_minute` (30).

## Per-locale SEO

Titles and descriptions are per locale and are not inherited (only `og_image` and `indexable` are). Write them for every language: seo-and-redirects.md.

## Visitors and URLs

- The visitor's language: explicit `?locale=` (remembered in the session per site), else the default; always clamped to the site's locales.
- Right-to-left is automatic for ar, he, fa, ur, ckb, dv, ps, sd, ug, yi (`$site->isRtl($locale)`); built-in sections use logical CSS, so check custom sections at 390px in RTL.
- The header shows a language switcher when the site has several locales (header setting `show_locale_switcher`). hreflang alternates are emitted for **every** locale of the site (not only those with content), except pages that are not indexable or are canonicalised elsewhere.
- Remembering the choice is session based (`localization.remember`, env `FILAMENTCRAFT_REMEMBER_LOCALE`, default on) and works only inside the `web` middleware group; an API/Inertia route or a CDN full-page cache in front will not see it.
- Built-in section chrome strings ship in 8 languages (ar, de, en, es, fr, ja, nl, pt). For another language, `php artisan vendor:publish --tag=filamentcraft-translations` and add `lang/vendor/filamentcraft/<code>/filamentcraft.php`, or "Most popular", carousel and sheet labels stay English.
- Site-wide SEO `description` applies to the default language only.

## Path-prefixed and host-owned locale URLs

`localeUrlsUsing(fn (Site $site, string $locale, bool $isDefault): ?string => …)` only changes the URLs the switcher, hreflang and sitemap **emit**. It does not route them. `PublicSiteController` still reads `?locale=` / the session, so the host's route must do the rest:

```php
Route::get('/fr/{path?}', fn (Request $request, ?string $path = null) => $this->page('fr', $path))->where('path', '.*');
Route::get('/{path?}', fn (Request $request, ?string $path = null) => $this->page(null, $path))->where('path', '.*');

$locale = $site->hasLocale($code) ? $code : $site->default_locale;   // clamp the segment
app()->setLocale($locale);
$html = app(TemplateRenderer::class)->render($template, 'published', $locale, $context);
```

- Register one route per prefix; optional-parameter routes nest badly, so two routes (`/{locale}/{path?}` constrained to the site's codes, and `/{path?}`) is the reliable shape.
- With a custom resolver the Header section opts out of the fragment cache and the sitemap drops inline `xhtml:link` alternates. Resolvers are keyed per panel; a later registration wins the default.
- Pages your app renders in the site shell (cart, checkout, account via `#[Storefront]`, `Route::filamentCraftStorefront`, Folio) get **no** hreflang from `<x-filamentcraft::layout>`. Add `@push('fc-head') <x-filamentcraft::hreflang :site="$site" :current="$locale" /> @endpush` and `<x-filamentcraft::locale-switcher :site="$site" :current="$locale" />`. A Livewire component that renders a switcher needs the `FilamentCraft\Livewire\Concerns\PinsPageUrl` trait (or links point at `/livewire/update`). A hand-built switcher uses `LocaleAlternate::forSwitcher()`, not `forSite()`: with `remember` on, switchers name the default locale explicitly (`?locale=en`) so "back to default" beats the remembered choice.
