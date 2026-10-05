# Changelog

All notable changes to FilamentCraft are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.40.24] — 2026-10-05

### Changed

- The editor's browser tab now reads 'Site editor · <page>' so it is easy to tell apart from the admin panel. Hosts can change it with editorDocumentTitleUsing().

## [1.40.23] — 2026-10-03

### Fixed

- **The editor preview now behaves like the live site.** Before, every plain link inside a
  section was cancelled, so sort, category filter and pagination links did nothing. Clicks on
  links outside a section (header, footer, phone bottom bar) were swallowed, and site-script
  triggers such as sheet/drawer openers never saw the click. Page scripts, Alpine and
  Livewire now handle every click first. Links within the page load in place, and links to
  another page switch the editor to that page, including tenant-prefixed URLs and links to
  unpublished pages. A link the site can't serve offers **Open in new tab**.
- **Add to cart in the preview no longer loses the item.** The section-select request raced
  the cart `POST` and saved a stale session over it. A form submit no longer selects its
  section, and a post that redirects to another storefront page moves the editor there.
- **Live edits keep the canvas's sort and filters**, and section refreshes now render against
  the preview page, so the links they build and their cart `return` values match the page.
- `data-fc-nav` links resolve by their real `href` before falling back to the section-based
  page-kind lookup, so hosts with custom checkout/cart sections still navigate.


## [1.40.22] — 2026-10-03

### Added

- **Sitemaps for path-mounted tenant sites.** `Route::filamentCraftTenant()` now also registers
  `/{tenant}/sitemap.xml` (and its `sitemap-{page}.xml` children), scoped to that tenant's live
  site and honouring the site's indexing switch. Pass `sitemap: false` to opt out.
- `SitemapIndex::for(iterable $sites)` builds a root `<sitemapindex>` for hosts that mount many
  sites; `SitemapIndex::urls()` / `urlFor()` expose the per-site sitemap URLs.
- `filamentcraft:doctor` warns when tenant routes are registered without a `publicUrlUsing()`
  resolver (canonicals would fall back to the preview URL).

### Changed

- `TenantSiteResolver` uses the owner's `primarySite()` when the owner implements `SiteOwner`,
  matching the site the tenant page route already renders.

## [1.40.21] — 2026-10-02

### Fixed

- **Canonical URLs on multi-panel hosts.** Outside a panel (public pages, queued jobs) `publicUrlUsing()`
  and `localeUrlsUsing()` closures registered by different panels are now all tried until one
  returns a URL. Before, only the last-registered panel's closure ran, so a site owned by another
  panel fell back to the auth-gated preview URL as its canonical, sitemap and JSON-LD URL.

## [1.40.20] — 2026-10-02

### Fixed

- **Record pages get their own SEO.** Product and other dynamic record pages now emit the URL
  actually served as canonical, `og:url` and `Offer.url`, with the record's name, description and
  image. Before, every record pointed its canonical at the template page.
- hreflang links keep only the `locale` query parameter, so `utm_*` / `gclid` no longer leak into
  alternates. Head hreflang and the sitemap share one rule: non-indexable locales are left out,
  and a page whose canonical points elsewhere gets no hreflang and no sitemap entry.
- A dynamic template's own slug (e.g. `/product`) answers `noindex` and is skipped by IndexNow.
- IndexNow respects the site-wide indexing switch, per-page noindex and canonical overrides.
- `JsonLd::encode` substitutes invalid UTF-8 instead of emitting an empty script.

### Changed

- Hidden pages emit `noindex, follow`; indexable pages emit `index, follow, max-image-preview:large`.
- Sites with indexing off no longer `Disallow: /` in robots.txt (that hid the noindex from
  crawlers); public pages send `X-Robots-Tag: noindex` instead.
- The homepage title defaults to the site name instead of "Home — Site".
- Organization and WebSite JSON-LD use the site home URL with `@id` links (`#organization`,
  `#website`); `og:locale` uses the territory form (`ar_AR`); `twitter:site` comes from the X link.
- Descriptions and share images fall back to the page's own section content before the site default.

### Added

- Product JSON-LD: all images, `brand`, `sku`, `mpn`, `gtin`, sale `StrikethroughPrice`,
  `priceValidUntil`, and `JsonLd::offerDetailsUsing()` for shipping / return policy details.
- Sitemap lists catalog products for product-detail dynamic pages, includes `<image:image>`
  entries, splits into a sitemap index past 50,000 URLs and is cached until the next publish.
  Other dynamic templates can list records via `DynamicTemplateDefinition::sitemap()`.
- `DynamicTemplateDefinition::seo()` returns a `RecordSeo` (title, description, image, type,
  author, dates); `OgType::Article` records emit `BlogPosting`.
- SEO checklist in the editor's SEO panel: title and description length, share image, noindex,
  canonical elsewhere, missing translations, multiple H1 sections.
- `filamentcraft:doctor` reports duplicate descriptions and checks every locale.

## [1.40.19] — 2026-10-02

### Added

- **Theme presets.** A preset is a ready-made site: colors, fonts and buttons, plus the pages,
  header and footer that go with them. Operators open **Themes** from the editor rail, settings
  panel or command palette, browse a library of full-page screenshots, preview any preset on their
  own site without saving, and apply it in one click.
  - **Full theme** (the default) applies the style and replaces the preset's pages, header and
    footer; the bar names exactly what it replaces before you apply. **Style only** keeps every
    page and changes colors, fonts and buttons.
  - Every switch records a restore point (the last ten are kept). **Undo** in the notification and
    **Restore previous design** in the panel put the site back exactly.
  - Four presets ship built in: Modern, Editorial, Bold and Elegant, each with screenshots.
  - New sites start from a **Start from** picker (Blank or any preset) in the editor's new-site
    dialog and the Sites resource.
  - Presets that break the panel's Brand Kit are shown disabled with the reason, and the server
    refuses them too.
- **Preset DX.** `php artisan make:filamentcraft-theme-preset Harbor --from-site=harbor` exports a
  site built in the editor into one readable PHP class (only non-default settings are written).
  Without `--from-site` it scaffolds a starter. Classes in `app/Themes/Presets` are discovered
  automatically; register others with `themePresets()`, `discoverThemePresetsIn()` or config, and
  hide the built-ins with `withoutBuiltinThemePresets()`. `filamentcraft:doctor` validates every
  host preset, and `ThemePresetTester::for(...)->assertValid()->assertRenders()` does the same in
  tests.

### Upgrading

- Run `php artisan filamentcraft:upgrade` to publish and run the `filamentcraft_site_snapshots`
  migration. Until then the Themes panel shows the command and **Apply** stays disabled.

## [1.40.18] — 2026-10-01

### Changed

- **A redesigned AI assistant panel.** Every state of the slide-over got a polish pass:
  - Generate and Ask are a two-way switch instead of underlined tabs, and the header carries an
    assistant mark.
  - The brief is split into three groups (the site, the look, what to write). Tone chips show a
    check when picked, style and scope cards gain a radio dot, the style swatches are larger, and
    "Also design the site" is a switch.
  - Finished steps turn solid green with a filled connector, and the done step no longer repeats
    "Done" as the current step.
  - Planned sections sit in icon tiles with an inline-editable intent, "Add a section" is a
    full-width target, and the design preview shimmers while colors and fonts are chosen.
  - Ask opens with suggestions anchored above the composer. Your request shows as a bubble, the
    reply carries the assistant mark, and applied changes sit in a card with Undo at its foot.
  - Every control has a visible keyboard focus ring, the brief's error state keeps a red ring
    while focused, the footer no longer overflows on phones, dark swatches stay visible in dark
    mode, and all motion respects reduced-motion.

## [1.40.17] — 2026-10-01

### Changed

- **A calmer editor toolbar with one main action.** Publish is the only filled button; Save and
  the Assistant are outlined. A "Saved" / "Unsaved changes" label replaces the three separate
  save indicators, and Discard only appears when there is something to discard. Auto-save moved
  into the settings sheet as an on/off switch.
- **Duplicate controls removed.** The page switcher no longer repeats the homepage badge, the
  sidebar toggle left the device controls (click the active rail icon to collapse the sidebar
  instead), template settings got their own icon instead of a second gear, and section presets
  use a swatch icon so they no longer look like the AI button.
- **Flatter sections sidebar.** Section rows, Header and Footer are plain rows with a hover
  background instead of bordered cards; "Add section" is an outlined button, and settings groups
  are tighter with consistent headers.

### Added

- **Hovering a section in the sidebar scrolls the canvas to it** and outlines it, after a short
  pause so sweeping the cursor down the list doesn't scroll the page.

### Fixed

- **Tapping header, footer or phone bottom-bar links no longer breaks live preview.** These links
  used to load the live page into the canvas, where edits (fonts, text, colors) stopped showing
  until a reload. They now stay in the preview, and the editor returns the canvas to the preview
  if anything else navigates it away.
- **Scrolling the canvas to a section clears a sticky site header** instead of hiding the
  section's top behind it, and corrects itself when images load mid-scroll.
- **Related-product rows drop the product being viewed** when the route binding is a string or
  `Stringable`, not only an Eloquent model.
- **Hero headings hyphenate only on narrow screens**, so desktop headings no longer break words.

## [1.40.16] — 2026-09-30

### Added

- **`->lockBlueprintPages()` keeps seeded pages in place.** Off by default. When on, a page seeded
  from a blueprint can't be deleted or unpublished, and its slug, type and status are fixed, in the
  dashboard, the Templates resource and the editor (settings menu, ⌘K, page settings). The server
  refuses these changes too, not only the UI. Content stays editable, pages editors create stay
  fully editable, and a copy of a blueprint page is not locked. Accepts a closure that receives the user.

## [1.40.15] — 2026-09-29

### Added

- **A real phone bottom bar for the header.** The header's `show_mobile_nav` bar gets rebuilt:
  - Up to five tabs, with each nav link choosing where it shows (`everywhere`, `header` only, or
    `bottom_bar` only; the last is the way to add a Home tab).
  - An icon per link, guessed from the label when none is picked.
  - A **More** tab that opens a native bottom sheet with the links that don't fit, header-only
    links, the call to action and the languages. The sheet can be dragged down to dismiss.
  - An optional call-to-action tab.
  - `docked` or `floating` styles, and labels that are always shown, shown on the active tab
    only, or hidden.
  - The bar hides while scrolling down and while the visitor types into a field. The header's
    hamburger steps aside on phones once the bar reaches everything it did.

### Fixed

- **Switching language from the canvas header works on every device.** Locale links in the
  editor preview (the phone menu's language chips, the desktop dropdown, `<x-filamentcraft::locale-switcher>`)
  now switch the editor's locale instead of navigating the preview to a storefront URL it can't
  serve, which showed a 404 in the phone view.

- **The bottom bar marks the right tab on every page.** The active tab was picked on the server
  while the header is cached per locale, so the first page rendered after a cache flush stayed
  active on every page. It's now marked in the browser, including `#section` links while their
  section is on screen.
- **A sticky header no longer drags fixed elements with it.** `.fc-header--sticky` put
  `backdrop-filter` on the header itself, which made it the containing block for anything
  `position: fixed` inside it, including the bottom bar. The blur now lives on a pseudo-element.
- **Floating buttons clear the bottom bar.** The back-to-top/WhatsApp buttons and the floating
  dark-mode toggle now read `--fc-bottom-chrome`, the same offset toasts and the watermark already
  used, so they sit above the bar instead of on it.
- **The newsletter email field no longer collapses on phones.** It used `flex-1` inside a column,
  so its flex basis overrode the input height and it shrank to its text height. When stacked on a
  phone it now matches the button's height.

## [1.40.14] — 2026-09-28

Run `php artisan filamentcraft:upgrade` after updating: this release adds the
`filamentcraft_submissions` migration.

### Added

- **Form submissions are stored and land in an Inbox.** Contact and Newsletter submissions are
  saved to `filamentcraft_submissions` and listed in a new **Inbox** in the panel, with an unread
  badge, type, read and site filters, a detail view, and read / unread / delete actions (one or in
  bulk). It only shows submissions for sites the signed-in user can reach. Turn it off with
  `->withSubmissionsInbox(false)` or `filamentcraft.forms.inbox`.
- **Email alerts for submissions.** `filamentcraft.forms.notify` takes an address, a
  comma-separated list or an array; each gets an email per submission, with Reply-To set to the
  visitor on contact messages. A mail failure never reaches the visitor.
- **Spam defence on the public forms.** Both forms have a hidden honeypot field and a per-visitor
  rate limit (`forms.honeypot`, `forms.throttle`, default 5 per minute).
- **More than one catalog.** Register extra catalogs (courses, events...) with a `Catalog`
  implementation through `->catalogs([...])` or `filamentcraft.commerce.catalogs`; the bound
  `Storefront` stays the `products` catalog, so existing stores change nothing. The product
  listing, carousel, detail, category grid and store hero get a **Catalog** select once more than
  one is registered. Cart lines remember their catalog, prices resolve from it on the server, and
  `placeOrder()` lines include `catalog` so a mixed basket can be routed.
- **A real toast stack.** `<x-filamentcraft::toast-host />` now has a close button, swipe and
  Escape to dismiss, a timer that pauses on hover, focus and background tabs, a drain bar, a
  count for repeated messages, and a cap on visible toasts (`:max`, default 3). New `position`
  prop. `CartEvents::TOAST` accepts an optional `action: {label, url}` link (paths and http(s)
  only) and `type` as an alias for `tone`.
- **Overlay and state components.** `<x-filamentcraft::sheet>` (a native dialog: bottom sheet with
  a drag handle on phones, bottom sheet or side drawer on wider screens),
  `<x-filamentcraft::empty-state>`, `<x-filamentcraft::pills>` (single-choice chips built on real
  radios, so arrow keys, forms and `wire:model` work) and `<x-filamentcraft::skeleton>`. All are
  styled from theme tokens, work right to left, and ship their CSS in `site.css`.
- **A visitor's language is remembered.** Choosing a language with `?locale=` now carries across
  plain links on the same site for the rest of the session. Switchers name the default language
  explicitly so switching back works; hreflang and canonical URLs never depend on the session.
  Turn it off with `filamentcraft.localization.remember`. `LocaleAlternate::forSwitcher()` gives
  host-built switchers the same links.
- **Safe areas on notched phones.** Page shells now use `viewport-fit=cover`, so the safe-area
  insets the package already uses work when a site is installed to a home screen. Override it
  with `filamentcraft.layout.viewport` or the layout component's `viewport` prop.
- `filamentcraft:doctor` warns when form submissions would be discarded, fails when storage is on
  but the table is missing, lists registered catalogs and warns about sections pointing at a
  catalog nothing registers.

### Changed

- Toasts stay 4.5 seconds by default (errors 2 seconds longer) and errors are announced with
  `role="alert"`. Error toasts carry a new `fc-toast--err` class alongside the old
  `fc-toast--error`.

### Fixed

- **Language switcher links inside Livewire sections** pointed at `/livewire/update` after a
  re-render. They now point at the page the section was loaded on (new `PinsPageUrl` trait for
  your own components).

## [1.40.13] — 2026-09-28

### Added

- **`.fc-page` for host pages.** A host route rendered in `<x-filamentcraft::layout>` puts `fc-page`
  on its outer element and its headings get the site's display font and heading scale, like every
  built-in section, instead of relying on a built-in class name.
- **A scripted open state for the filter sheet.** `.fc-filter-sheet.is-open` opens the mobile filter
  sheet from Alpine or any script; the checkbox still works with JavaScript off.
- **`.fc-icon-tile--stacked`** stacks two lines in an icon tile, such as a day over a month.
- **A payment note setting on the cart and checkout.** Leave it empty for the default, or say what
  fits a storefront that doesn't take payment on delivery.
- **Muted and sale ink tokens.** `--fc-color-on-background-muted`, `--fc-color-on-surface-muted` and
  `--fc-color-danger-ink` are derived per color scheme, with matching `text-*` utilities.

### Fixed

- **The cart badge and toasts ignored Livewire.** `CartEvents::UPDATED` and `CartEvents::TOAST`
  were heard only on `document`, but Livewire dispatches on `window`, so a host component's
  dispatch never updated the built-in badge or showed a toast. The listeners now catch the event
  wherever it is dispatched, once.
- **Muted copy failed WCAG AA.** Footer text and links, the cart and checkout notes, and the
  struck-through old price now use derived muted colors that clear 4.5:1 on every shipped surface,
  and a sale price uses a derived red ink instead of the badge fill color (2:1 before).
- **The cart assumed cash on delivery.** Its note now says only that nothing is charged yet; the
  checkout keeps its cash-on-delivery note, without the em-dash.
- **The checkout section threw outside the `web` middleware.** It read the session's validation
  errors unguarded, so rendering it in a test, a cache warm or a preview without that middleware
  failed.
- **The imageless media placeholder read as a broken image.** Its monogram is smaller and fainter.

### Docs

- The custom-sections guide explains that the public `site.css` only carries the utilities the
  built-in sections use, and why a value that changes between Livewire renders must stay out of
  `x-data`. The e-commerce example documents the cart and toast events and the filter sheet's
  `is-open` hook.

## [1.40.12] — 2026-09-28

### Changed

- **`filamentcraft:install` starts you with an example site.** After the migrations it seeds the
  published `filamentcraft:starter` site (header, footer and a seven-section homepage), attached to
  your first owner record when tenancy is configured, with no prompt. Pass `--family=` to pick its
  style or `--no-example` to start empty. Install skips the example when any site already exists,
  so re-running it never duplicates one. `--example` still works but is no longer needed; the
  smaller three-section "Studio Demo" seed it used to create is gone.

### Fixed

- **"Create Site" on an empty dashboard opened nothing.** The dashboard is a table page, and Filament
  renders a table page's action modals inside the table, which the no-site state never draws. The
  empty state now renders its own modal container, so both "Create Site" buttons open the form.
- **The dashboard used a Blade Icons component.** Apps that disable Blade Icons components for
  performance broke on `<x-heroicon-o-paint-brush>`; the view now uses `@svg()`. The icon's tint also
  read Filament v3's RGB-channel variables, which are full colors in v4, so it rendered untinted.
- **Carousel dots counted slides instead of pages.** Four slides with three visible drew four dots,
  three of which scrolled to the same end and none of which then showed as current. Dots are now one
  per page, the current one carries `aria-current="true"` after a click or swipe, and their labels
  read "Go to page N of M" in every shipped language. A dot also scrolled with `scrollIntoView()`,
  which dragged the whole page sideways; it now scrolls the track only.

## [1.40.11] — 2026-09-28

### Fixed

- **In-page links reach their section.** Every section wrapper now carries its section id as an
  HTML `id`, so a button or link set to `#plans` or `#contact` scrolls to that section. Ids are
  sanitised and escaped; ids starting with `fc-` get no anchor, since that prefix is reserved for
  the package's own elements.
- **Brand Kit is scoped to the panel that sets it.** `->brandKit()`, `->brandFonts()`,
  `->brandPalette()` and `->withoutBuiltinSchemes()` wrote to `config('filamentcraft.brand')`, so in
  an app with several panels the last panel registered locked the fonts, palette and schemes of all
  of them. The kit now lives on the plugin instance and only applies on its own panel; config stays
  the app-wide default for panels without a kit. `filamentcraft:doctor` and `php artisan about`
  report each panel's kit separately. Code-registered fonts (`->registerFont()`) stay global.

## [1.40.10] — 2026-09-28

### Added

- **Section scheduling.** Every section has a Schedule group with Show from and Show until, and
  the published page only shows it inside that window. Use it for campaigns, seasonal banners and
  time-boxed header announcements. The editor canvas keeps showing every section. The sidebar
  and the canvas toolbar mark upcoming, live and ended sections. A campaign section can
  **replace** another one (the everyday hero while the Black Friday hero is live), and
  **Preview on start date** shows the page as visitors will see it when the campaign starts.
  Times follow Filament's timezone and are stored as UTC. Blueprints get
  `->schedule(from:, until:)`. Turn it off with `sections.scheduling`.

### Fixed

- A hidden FAQ section no longer emits `FAQPage` JSON-LD.

## [1.40.9] — 2026-09-27

### Changed

- **Team section thumbnail.** The preview image in the add-section picker now shows four men
  in the same illustrated style; the other thumbnails show no people.

## [1.40.8] — 2026-09-26

### Added

- **UUID and ULID primary keys.** Set `database.key_type` to `uuid` or `ulid` (or run
  `filamentcraft:install --keys=uuid`) and every FilamentCraft table and model uses them. No
  `HasUuids` needed on your side. `sites.owner_id` and the `user_id` columns follow your owner and
  `User` models' key types. An interactive install asks, preselecting your `User` model's type.
  `filamentcraft:doctor` fails when the config and the migrated tables disagree. Existing installs
  keep integer keys.
- **Swap any model for your own subclass.** Register it under `models` in the config, or run
  `php artisan make:filamentcraft-model Site`. Every package query, relation, Filament resource,
  route binding and factory then returns your class, with its scopes, casts and events.
  Overrides must extend the FilamentCraft model; anything else throws at boot.

### Changed

- FilamentCraft models are no longer `final`.

### Fixed

- Editor drafts, undo history and the autosave preference now key on the real user id. They cast it
  to `int`, so users with UUID or other string ids could share one draft slot (`'0190a…'` and
  `'0190b…'` both became `190`), and the canvas preview ignored their drafts.
- Duplicating a custom section named the copy `… filamentcraft::filamentcraft.actions.duplicate_suffix`
  instead of `… copy`.
- **Postgres:** a malformed id (a hand-edited URL, a tampered editor request) no longer throws a
  database error. Postgres rejects comparing a `bigint` or `uuid` column with `'abc'` where
  SQLite and MySQL just find nothing; FilamentCraft now treats it as "not found" everywhere.
- **Postgres:** the page search in link pickers is case-insensitive again (`LIKE` is
  case-sensitive on Postgres, so "pric" missed "Pricing Page").
- `filamentcraft:doctor` reports a `single_site_id` that isn't a valid key instead of crashing, and
  skips its content checks when the key type doesn't match the tables.

## [1.40.7] — 2026-09-26

### Fixed

- **`filamentcraft:upgrade` now applies migrations in production.** It ran `migrate` without
  `--force`, so with `APP_ENV=production` a non-interactive deploy (Forge, CI) cancelled at
  Laravel's confirmation prompt and published migrations were never applied. Both `upgrade` and
  `install` (after its own prompt) now pass `--force`.

## [1.40.6] — 2026-09-26

### Fixed

- **Catalog thumbnails for the newest sections.** Bento, Marquee, Steps, Showcase, Scroll showcase
  and Sticky reveal showed a bare placeholder icon in the **Add section** catalog. They now ship
  preview images in the same style as the rest of the catalog, and a test fails if a built-in
  section ever ships without one.

## [1.40.5] — 2026-09-24

### Added

- **AI assistant in the editor.** A topbar **Assistant** button (⌘J, also in the command palette and on
  every selected section) opens an assistant that writes a page or a whole site from a short brief
  and applies plain-language requests — "change my main color to deep teal", "add a FAQ about
  shipping after the features", "make this section punchier" — as validated, undoable edits to the
  draft. Generation is two small structured calls (plan the section types from a one-line-per-type
  catalog, then write only the copy fields of the chosen types over the picked style preset), so a
  homepage costs ~500 prompt tokens per step. Runs on the optional `laravel/ai` package; editors
  pick a *Fast / Balanced / Advanced* tier while the models behind them, per-site encrypted keys,
  usage tracking (`filamentcraft_ai_usages`) and section/page limits are all developer-configured
  under `filamentcraft.ai` — or fluently on the plugin (`->aiModels()`, `->aiDefaultTier()`,
  `->aiSiteKeys()`, `->aiUsage()`, `->aiProviderOptions()`, `->aiLimits()`). A generation also
  designs the site in one extra call: an existing scheme or a custom palette (authored as the
  `ai-brand` scheme with derived, readable text colors), a type pairing, theme settings and the
  look every written section starts from — reviewable on a card next to the plan, switchable off.
  The assistant is a slide-over with the step's actions pinned to the bottom, an edit log on the
  Ask tab (your request, a one-line reply, then one row per change; a section row selects that
  section in the canvas), and an inline "Ask AI" bar on every selected section; a request sent from
  that bar closes the assistant once it has applied. A whole-site run is one model call per request,
  chained back to back, with each page shown as queued / writing / done / failed, a retry on the
  failed one, and no duplicate page if a response is lost mid-run. Overloaded providers and
  connection timeouts get one retry inside a single deadline, then the fast tier. Ask requests
  carry the site's last brief and each section's heading, so rewritten copy stays on-brand.
  New migration: `create_filamentcraft_ai_usages`.

  <p>
    <img src="https://filamentcraft.dev/images/ai-brief.png" width="260" alt="The Generate tab's brief: business, audience, tone, style and scope">
    <img src="https://filamentcraft.dev/images/ai-plan.png" width="260" alt="The planned sections under a design card naming its reference">
    <img src="https://filamentcraft.dev/images/ai-ask.png" width="260" alt="The Ask tab as an edit log with three change rows and Undo">
  </p>
- **AI access and spending controls.** `->aiAccess(bool|Closure)` decides who may use the assistant
  (the closure gets the user and the site); `limits.requests_per_minute` (default 30) caps model
  calls per user, and `limits.monthly_tokens` sets an optional token budget per site, shown next to
  the month's usage and flagged by `filamentcraft:doctor` when usage tracking is off. `timeout` is
  now the model time one web request may spend, shared by every call in it; the design step runs
  as its own request after the plan, and sections added by one Ask request are written in a single
  call. Ask sends the last three exchanges, so follow-ups like "shorter" land, and keeps edits made
  in the settings panel while it waits for the model.
- **Generated sites no longer look generated.** The design step now reasons from a scene, a
  named real-world reference and a colour strategy before choosing colours; picks fonts from a
  curated set described by voice instead of the Inter/Playfair defaults; and a cream, sand or beige
  background is corrected in code. Plans skip sections that would need invented facts, copy uses
  `[placeholders]` instead of made-up names, quotes, clients and phone numbers, invented external
  links fall back to `#`, only one eyebrow survives per page, and feature cards get a real icon.

  <img src="https://filamentcraft.dev/images/ai-design-card.png" width="520" alt="A design card: fir green and rust, after a 1960s Oregon seed-packet label">
- **Write your own prompts.** `->aiInstructions()` adds house rules to every task or to one
  (`AiTask::PlanDesign`, `FillSections`…); a closure gets the site and task, so rules can follow a
  tenant's plan or industry. `->aiVoice()` replaces the copywriting style while the no-invented-facts
  and language rules stay. `->aiPromptUsing()` takes the last word over every request before it is
  sent, including its tier. Rules and a voice can also live in `filamentcraft.ai.prompts`, and they
  reach `FakeAiRunner` so your tests can assert on the final prompt. See
  [Your own prompts](https://filamentcraft.dev/guide/ai-assistant#your-own-prompts).
- **AI fallback steps down one tier and remembers slow models.** A failed or silent model hands the
  request to the next tier down, and any model that failed or took over 12 seconds is tried last
  for two minutes. Failed Ask requests stay in the thread with **Try again**, a note appears after
  8 seconds of waiting, and the error banner closes instantly.

  <p>
    <img src="https://filamentcraft.dev/images/ai-ask-working.png" width="260" alt="An Ask request in progress with its elapsed seconds">
    <img src="https://filamentcraft.dev/images/ai-plan-pending.png" width="260" alt="The design being chosen as its own step while the write button waits">
    <img src="https://filamentcraft.dev/images/ai-done.png" width="260" alt="The Done step as a list of changes">
  </p>

- **Four new built-in sections: Marquee, Steps, Bento grid and Showcase.** An endless logo or word
  ticker (pure CSS, pauses on hover, reduced-motion aware), a numbered "how it works" sequence, an
  asymmetric grid of mixed-size tiles, and alternating media-and-copy feature rows. Each ships the
  four preset families and is translated into every bundled language.
- **Motion effects, inspired by Aceternity UI and rebuilt in pure CSS.** The Hero and Call to
  action take a background effect (aurora, spotlight, twin spotlights, light beams, meteors, grid,
  dots, lamp, starfield) and a moving-border or glow-border button; the Hero adds a word-by-word
  reveal, a highlighted phrase and rotating words. Features cards can glow or highlight,
  Testimonials gain endlessly moving rows, Gallery and Team a focus effect, and the Timeline a
  scroll beam. Two new sections: **Scroll showcase** (a screenshot that settles flat as you scroll)
  and **Sticky reveal** (a pinned panel that follows the step being read). Everything is off by
  default, uses the theme's colours, runs right-to-left, respects reduced motion and adds no
  JavaScript to the site. See [Effects](https://filamentcraft.dev/guide/effects).
- **Hero secondary button.** The hero takes an optional outlined second button next to the main
  call to action; it shows once both its label and link are set.
- **Section builder feedback.** The preview shows a progress line while a change is on its way and
  says so when an update fails instead of failing silently; Save reads "Saving…" while it runs.
  Blocks now stack with a built-in rhythm (a Spacer replaces the gap rather than adding to it), the
  desktop preview fills the canvas instead of shrinking a 1440px page to unreadable text, and
  reopening a section lands on its structure.

### Fixed

- **An unknown tenant subdomain served another tenant's site.** Once any site is served by
  subdomain, a request for `{unknown}.{primary}` now returns 404 instead of falling through to the
  first live site.
- **Saving a custom section could silently do nothing.** If the section was deleted in another tab
  while you were building it, Save now keeps your layout as a new section; any other failure says
  so. A re-save no longer claims the section was just added to the catalog.
- **Section builder polish.** Layer names use the whole row (the hidden row actions no longer
  reserve their space), row actions and the drag handle meet the 24px target size, focus rings are
  solid, small text is 12px, the Discard changes button only appears on saved sections and says
  what it keeps, the back arrow mirrors in right-to-left layouts, and deleting a custom section
  names it. Two starter layouts used values the inspector could not show.
- **A site could take over another site's subdomain.** Custom domains were only checked against
  other custom domains, so a site could claim `acme.myapp.com` while another site owned the `acme`
  subdomain — and because a domain claim outranks a subdomain match, it served that address
  instead. Custom domain and subdomain are now checked against each other, and the platform's own
  host, its `www.` twin and the `www` subdomain are reserved.
- **The sitemap judged every language by the default one.** A page marked noindex only in its
  default language disappeared from the sitemap in every language, and a translation marked
  noindex was still listed as an alternate. Each language URL now gets its own sitemap entry, and
  only languages that are indexable are listed.
- **Changing a column count in the section builder could exceed the block limit.** Adding columns
  now respects `section_definitions.max_nodes` and warns instead of dropping the extra blocks from
  the live page.
- **The canvas toolbar vanished after restyling a section with a preset.** Applying a preset from
  the section header's **Browse presets** left the selected section with no Edit / Move / Duplicate
  / Hide / Delete toolbar until a page reload. The full canvas refresh discarded the toolbar while
  the overlay survived, and the repaint only rebuilt it when the section node itself changed.
- **The header CTA arrow pointed the wrong way on right-to-left sites.** The arrow next to the
  header's call-to-action label now mirrors under `dir="rtl"`, like the arrows on every other
  section's buttons.

## [1.40.4] — 2026-09-23

### Fixed

- **The editor topbar no longer crushes or overlaps on smaller screens.** Between 1280px and 1440px
  the view controls ran under the language picker, and below 768px button labels spilled over the
  next button. The bar now sizes itself from the space it actually has (a CSS container query, so a
  narrow window or a docked panel behaves the same), and controls leave it in priority order: first
  labels, then undo/redo, auto-save, hover controls and focus mode, then search, settings and the
  live-page link, and on phones the device switcher. Everything that leaves the bar is in a new
  **More** menu, so no action becomes unreachable. Page and language names truncate instead of
  pushing the bar wider.
- On phones the section drawer's close button no longer covers the Header card, the closed drawer
  no longer casts a shadow over the canvas edge, and it can no longer be reached with the keyboard
  while it is off-screen.

## [1.40.3] — 2026-09-23

### Changed

- **Built-in sections share one type system.** Every section heading now sits on a single fluid
  scale (`fc-title`, and `fc-title--display` for heroes) in the theme's heading font, with a
  readable lede (`fc-lede`) under it. Twelve sections — articles, comparison, contact, countdown,
  gallery, locations, newsletter, portfolio, tabs, team, timeline and video — were missing from the
  heading-font rule and fell back to the body face; they now match the rest of the page. Kickers
  are sentence case instead of tracked capitals, and card titles pick up the heading face too.
- **Image heroes are full-bleed covers.** A hero with a background image grows to most of the
  viewport, anchors its copy to the bottom over a gradient scrim, and keeps its kicker legible on
  the photo. Hero proof points are a hairline-divided fact row instead of small cards.
- **Layouts that read better by default.** Contact and newsletter are two-column (heading beside the
  form) instead of a narrow centred card, image-and-text gives the image a taller frame with no
  padded card around it, the featured testimonial is set large in the heading face, stats lay four
  items on four columns instead of orphaning the last, and the two projects under a featured
  portfolio project share the full row.

### Fixed

- The header language menu marks the active language with `aria-current`.
- Contact form message fields were one line tall; they now open at about five lines and resize vertically.

## [1.40.2] — 2026-09-08

### Fixed

- **Text settings stopped persisting and the preview stopped following typing (v1.40.1 regression).**
  v1.40.1 changed the rendered binding to `wire:model.unintrusive.blur`, but the editor bundle
  recognised only four literal `wire:model` spellings, so it no longer saw text settings at all: the
  debounced draft commit never ran, and an edit typed without clicking away was lost on reload. The
  bundle now reads the binding off whatever modifier tail the compiler renders — any `wire:model*`
  bound to a `data.*` path — so no future modifier can break the pairing again.

## [1.40.1] — 2026-09-08

### Fixed

- **A save landing mid-typing can no longer revert the field.** v1.40.0 stopped the editor's own
  debounced commit from overwriting a focused input, but the same clobber reached the field through
  any other door — an auto-save tick, or a sibling component's draft sync re-hydrating the panel.
  Livewire patches a changed property back into its input regardless of focus. Text inputs and
  textareas in the settings panel now render `wire:model.unintrusive.blur`, so Alpine skips that
  write while the element is focused. Discrete-event widgets (select, toggle, checkbox, colour
  picker) and the entangled rich editor keep their existing bindings.

## [1.40.0] — 2026-09-08

### Added

- **The section builder has the media library.** Picking an image inside a custom section now opens
  the same site-scoped gallery, upload and image editor the settings panel uses, instead of a bare
  file input. A pick that carries an alt text commits both keys, so the alt reaches the draft with
  the image. The picker, uploader, editor and usage tracking moved into a shared
  `InteractsWithMediaLibrary` concern that both the settings panel and the builder use.

### Fixed

- **Typing in a section setting no longer loses characters.** The editor commits a focused field to
  the draft 400 ms after the last keystroke, and that commit wrote the value straight back onto the
  panel's wire-modelled `data` property. Livewire diffs the property against its snapshot and
  patches the result into the input — focus or no focus — so every character typed between the
  request leaving and the response landing was overwritten. Two characters per round-trip locally,
  more on a slow connection. The commit now persists the draft without touching the property, and
  runs renderless, so the DOM stays the source of truth until the field blurs.
- **The section builder's block toolbar follows the selection, not the pointer.** Passing over a
  block armed the drag, duplicate and delete actions for a block the author had not chosen, and a
  stack of short blocks flickered a different toolbar under every pixel of pointer travel.
- **The section builder's modals opened behind its backdrop.** The backdrop's `backdrop-filter`
  became the containing block for the modal's fixed positioning and its `z-index` buried it, so an
  action modal was clipped and unreachable.

### Changed

- **The docs nav reads its version label from the changelog.** It was hand-written and had rotted
  five minors behind.

## [1.39.2] — 2026-08-08

### Changed

- **The sidebar's FilamentCraft item opens the editor in a new tab.** The editor is a full-screen
  surface that replaces the panel chrome, so it now gets its own tab and leaves the panel where the
  operator left it. The first-run fallback — no homepage yet, so the item points at the dashboard
  itself — still navigates in place.

## [1.39.1] — 2026-08-08

### Fixed

- **Section builder: select dropdowns opened onto nothing.** The builder's form skin clipped
  `.fi-input-wrp` to its rounded box, and Filament renders a non-native select's option list — plus
  a colour picker's swatch panel and a date picker's calendar — *inside* that wrapper. Any host app
  that calls `Select::native(false)` (or `searchable()`) therefore got a dropdown with the search
  box visible and every option cut off. Only the rich editor is clipped now.
- **Section builder: the hover toolbar covered short blocks.** Buttons, badges and eyebrows are
  shorter than the drag/duplicate toolbar, which sat *inside* the block and hid the content being
  edited. It now rides just above the block, dropping below only when the block is against the top
  of the viewport.

## [1.39.0] — 2026-08-05

### Added

- **`siteRoutingFields()` — hide host settings the app never reads.** A site's **Custom domain**
  and **Subdomain** are matched only by the package's own fallback route, so with
  `filamentcraft.public_routes` off — the shape every host that owns its routing runs — they now
  hide themselves in both the editor's site settings and `SiteResource`, and the slug field drops
  its "fallback when no domain is set" helper text for one that describes what the slug actually
  does. `FilamentCraftPlugin::make()->siteRoutingFields()` forces them back for apps that apply
  the `SiteContext` middleware to their own routes; `siteRoutingFields(false)` forces them off,
  and a closure receives the authenticated user. `filamentcraft:doctor` now warns when sites
  carry a host nothing will ever serve.

### Fixed

- **Enum labels are translatable.** `SiteStatus`, `TemplateStatus`, `TemplateType`, `Device`,
  `RegionName`, `RegionPlacement`, `AiCrawlerPolicy`, `RedirectStatus`, `FontCategory`, and
  `FontStyle` returned hardcoded English, so an otherwise fully-translated panel rendered
  **Draft / Live / Archived** chips in English with no key a host could override. All ten now
  resolve through `filamentcraft::filamentcraft.enums.*`, with entries in all seven shipped
  locales.

## [1.38.0] — 2026-08-04

### Added

- **`allowSiteCreation()` — withhold site creation from a panel.** Hosts where a tenant owns
  exactly one site can now close the "New store" flow: `FilamentCraftPlugin::make()
  ->allowSiteCreation(false)`. It takes a closure too
  (`fn (?Authenticatable $user) => $user?->isPlatformAdmin() ?? false`), so a platform admin can
  still create sites while tenants cannot. The gate closes every entry point rather than hiding
  buttons — the editor's action (a hand-mounted one is refused server-side), the dashboard's
  create-site header action, and `SiteResource`'s create page and route. Defaults to `true`, so
  existing panels are unchanged.

## [1.37.1] — 2026-08-04

### Added

- **A media library, scoped to the site.** A third **Gallery** tab in the editor sidebar lists every
  image the site has uploaded. Every upload a section makes is captured into it automatically, so
  the library fills itself — there is no separate "add to library" step. From the tab an author can
  upload, search, rename, write alt text, and delete; from any image setting, **Media library** opens
  a picker that reuses an image already there, and an image's saved alt text seeds the setting's alt
  field on pick. Hovering a tile reveals edit and delete; a checkbox on each tile drives multi-select
  and a bulk delete. Deleting shows how many places still use the file first — saved revisions,
  regions, and the draft currently open.
- **Filament's own image editor edits the stored image in place.** Crop or rotate an image and save,
  and the library row is repointed at the new file instead of gaining a second row that looks like
  the first. Title and alt text survive the edit.
- **`php artisan filamentcraft:media-sync`.** Backfills the library from images already placed in
  saved revisions and regions, so an existing site's gallery is not empty on first open. Takes
  `--site=` to limit it to one site.

Run `php artisan filamentcraft:upgrade` after updating — this release adds a
`filamentcraft_media` table.

## [1.37.0] — 2026-08-03

### Added

- **Every image setting now carries author-written alt text.** An **Alternative text** field sits
  under each upload — in section settings, inside repeated blocks (team members, logos, gallery
  items, portfolio projects, article cards, locations) and in theme settings. It is stored per
  locale alongside the image, so a translated page gets translated alt text. Nothing to migrate:
  existing images keep rendering, and the field falls back to today's derived text (heading, member
  name, product title) until an author fills it in. Package authors can opt a decorative image out
  with `Image::make('bg')->alt(false)`, or relabel the field with `->altLabel()` / `->altInfo()`.
- **`LocalBusiness` structured data from the Locations section.** Name, address, phone, email,
  opening hours and — when the coordinates parse — `geo`, emitted per location block. Blocks
  missing a name or address are skipped rather than published as a partial entity.
- **`VideoObject` structured data from the Video section.** Emitted only when the section has a
  cover image, which Google requires for video rich results. The pasted watch URL goes in `url` and
  the derived player URL in `embedUrl`, so a `youtube.com/watch?v=…` value no longer lands in a
  field that expects a player.

### Fixed

- **Images below the fold no longer compete with the one above it.** Every image the built-in
  sections render now carries `loading` and `decoding` hints, and the hero / store-hero cover — the
  page's largest paint — is loaded eagerly at high fetch priority instead of lazily.
- **An empty image slot no longer covers its placeholder.** `.fc-media img` forced `display: block`,
  which beat the `hidden` attribute the editor uses for an unfilled slot and painted a blank box
  over the monogram.
- **A second upload no longer lingers beside the first.** Picking a new image for a setting that
  already held one kept both in the field's state; only the newest is kept.

### Removed

- **The Timeline step icon gate shipped in 1.36.0 is not in this release.** It was reverted on
  `master` before this release was cut, so `Setting::visibleIfSection()` and the gated step Icon
  picker are absent here.

## [1.35.0] — 2026-08-03

### Added

- **`php artisan filamentcraft:upgrade`.** One command to take a newer release: it publishes the
  migration stubs added since your install, runs them, re-syncs the built-in themes, and refreshes
  the published editor assets. `composer update` only replaces `vendor/`, so a host could previously
  run a new version against an old schema and find out from a runtime error. Run it after every
  update — `--no-migrate` and `--no-assets` are there if you stage those separately. The README now
  has an **Upgrading** section.
- **`filamentcraft:doctor` names migrations you never published.** The schema check only saw missing
  columns, which meant a data-only migration could be skipped invisibly. Doctor now diffs the stubs
  this release ships against your `database/migrations` and lists exactly what is missing.
- **Host-owned fields on catalog data — `ProductData::$meta` / `CategoryData::$meta`.** A bag carried
  through untouched, read with `$product->meta('seats_left')`, for everything the typed
  physical-goods properties have no room for: seats, schedules, pricing plans, age groups.
- **Swap the product card without forking the section — `filamentcraft.commerce.card_view`.** Point
  it at your own Blade view and the product listing, the carousel and the related-products rail all
  render it, keeping the grid, filters, pagination, mobile filter sheet and empty state. A view that
  does not exist falls back to the built-in card. The README documents which of `ProductData`'s
  properties the built-ins actually render.
- **A section that fails on the live site now says so.** Published pages still drop a throwing
  section rather than break the page, but the failure is recorded per site: the editor warns once
  when you open it, and `filamentcraft:doctor` lists the section, message and count. Reports also
  carry the site, section type, mode and locale, so an error tracker names the page that lost
  content. Set `filamentcraft.rendering.show_errors` (or `FILAMENTCRAFT_SHOW_RENDER_ERRORS=true`) to
  render the failure card publicly on staging instead of a hole.
- **`CHANGELOG.md` now ships with the package.** Release notes are readable in `vendor/` instead of
  being withheld from the dist, and the shipped docs no longer link to files that were not there.

### Fixed

- **A published page can no longer lose its revision.** Publishing a template with nothing saved is
  refused instead of marking it published against no revision (a live 404 that every admin screen
  reported as healthy), and deleting a live revision demotes its template to draft rather than
  leaving the pointer dangling. A repair migration heals installs already in that state.
- **The 404 for a missing page names the actual remedy.** "Publish a template with that slug" was
  printed even when the template existed as a draft, or when the site's homepage pointed at one. Each
  case now gets its own message, and a dynamic page whose record is missing says that instead.
- **Writing a `LivewireSection` no longer costs a day.** Its view must open with the root element —
  a section is mounted as a Livewire component — and breaking that rule does not reliably throw:
  Blade's conditional markers above the root leave Livewire morphing the wrong subtree, so controls
  render but stay inert. The rule is now documented in the README with the working idiom, and with
  `APP_DEBUG=true` both shapes throw naming your class and view path.

## [1.34.0] — 2026-08-02

### Changed

- **Built-in sections now ship with a restrained visual baseline.** Default output removes ornamental glows, sheens, gradient borders, blur layers, heavy card shadows and hover lifts, while preserving purposeful imagery, content hierarchy and explicit opt-in styles.
- **Studio rounding defaults are extra-small.** Buttons, inputs and boxes/cards now default to a 4px radius across the theme tokens and built-in section primitives.
- **Hero defaults are contained and solid.** Gradient backgrounds and glass surfaces remain available as deliberate settings rather than the default presentation.

### Fixed

- **Built-in sections are covered by an anti-slop regression suite.** Every registered built-in renders with defaults and is checked for generic ornamental effect layers, preventing the catalog from drifting back toward template-like AI styling.
- **Eloquent local scopes remain available on Laravel 11.** Built-in model queries now use the compatible `scope*` convention across the supported Laravel 11/12 matrix.

## [1.33.0] — 2026-08-01

### Added

- **`filamentcraft:customize-section`.** A guided command that searches the
  built-ins and generates an application-owned subclass — either an additive
  variant with its own slug, or an explicit application-wide replacement with
  `--replace`. The subclass inherits the built-in's settings, blocks, presets,
  defaults and behaviour, so only what you override changes. `--copy-view` takes
  ownership of the Blade markup too; leave it off and upstream view improvements
  keep applying.
  - `filamentcraft:doctor` no longer warns about a slug override when the
    replacement is a subclass of the built-in — that is the supported shape.

### Changed

- **A section is only offered the look knobs its markup can answer to.** All five
  knobs used to be appended to every section, so a stats row was asked for an
  image frame and a gallery for a card style even though those classes reach no
  element in that markup. Each built-in now declares its applicable set through
  the new `Section::lookKnobs()`, and the editor's Look panel is the intersection
  — banner, footer and gallery show no Look panel at all. A custom section keeps
  all five unless it narrows them.
  - Arabic: the Look group read المظهر, the same label as every section's own
    style group, and is now الطابع; the image-frame knob reads نسبة الصورة, and
    the team section's style field no longer collides with the card-style knob.

## [1.32.0] — 2026-08-01

### Added

- **The Locations section draws a real map.** Give a location a latitude and
  longitude — pasted straight from Google Maps or OpenStreetMap, in either field,
  as a `48.8584, 2.2945` pair, a place link, a `#map=` fragment or a `geo:` URI —
  and the section plots every one of them on a live slippy map with numbered pins
  that match the numbers on the cards. No API key, no account, no third-party
  JavaScript.
  - The server resolves the zoom that frames every pin, the tiles that cover the
    canvas and where each pin lands, then emits them as percentages. The map is
    correct with JavaScript switched off and never shifts layout; the site bundle
    then re-tiles at the element's real pixel width and adds drag-to-pan, zoom
    buttons, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + scroll and double-click zoom. Plain
    scrolling always scrolls the page.
  - Clicking a card's pin number centres the map on that location.
  - A location with coordinates and no directions link gets one built from them.
  - `map_tone` re-skins the raster from the section's own palette: `muted`,
    `tinted` (duotoned into the scheme's primary and accent) or `night`.
  - `map_source` is `auto` by default and falls back coordinates → embed URL →
    image, so a site that only ever set an embed URL renders exactly as before.
  - The map now also renders in the cards-only layout, not just the split one.
- **`filamentcraft.maps`** config: `tile_url`, `attribution`, `attribution_url`
  and `max_zoom`. The default is OpenStreetMap because it needs no setup, but its
  [tile policy](https://operations.osmfoundation.org/policies/tiles/) is
  best-effort with no SLA and warns that commercial access may be withdrawn — so
  the URL template is config, not a constant, and understands `{z}`, `{x}`, `{y}`,
  `{s}` and `{r}` for Stadia, MapTiler, Thunderforest or a self-hosted renderer.
  Set `tile_url` to an empty string and coordinates fall back to OpenStreetMap's
  own embed, still interactive, one marker.

## [1.31.0] — 2026-08-01

### Fixed

- **The theme's color scheme is finally global.** The "Default scheme" picker sits
  in the editor's *global* settings next to fonts, buttons and spacing — but it was
  the only value there that persisted onto the page you happened to have open, so
  picking a scheme restyled that one template and nothing else. It now lives on
  `Site.settings_json['color_scheme']` alongside every other global setting, and
  every template, region and host-rendered shell page renders on it. Per-page
  variation stays where it belongs: a section's own `scheme` setting.
  An idempotent upgrade migration promotes the scheme a live site already chose
  (its home page's, else the first page that carries one) onto the site row, so
  existing sites keep their look.
- **Host shell pages inherit the site scheme.** `<x-filamentcraft::layout>` and
  `RendersInSiteShell` read `Site.settings_json['color_scheme']` — a key nothing
  wrote until now, so cart, checkout and account pages always rendered on the
  package default no matter what the operator picked. Passing `:color-scheme`
  still pins one page to something else.
- **The header / footer region editor previews on the site's scheme** instead of a
  hardcoded default, so chrome is no longer authored against the wrong palette.
- **The editor canvas repaints on a scheme change.** A canvas refresh morphs
  `<body>` only, so the scheme attributes on `<html>` kept their initial value —
  the same gap `dir` / `lang` were already patched for. All four attributes now
  sync from the refreshed document.

### Added

- `filamentcraft:doctor` warns about **stranded per-page color schemes** — a site
  whose pages still ask for a scheme its own row doesn't carry never ran the
  promotion migration, so it is silently rendering on the package default. The
  warning names the site, the page and the scheme it wanted.
- `SiteColorSchemes::activeFor()` / `::setActive()` for reading and writing a
  site's global scheme from migrations, seeds, and host code.

### Upgrading

Package migrations are published, not auto-loaded, so run this once to promote the
scheme your sites already chose:

```bash
php artisan vendor:publish --tag=filamentcraft-migrations && php artisan migrate
```

`filamentcraft:doctor` tells you whether you need it.

## [1.30.0] — 2026-07-31

### Added

- **Hover-inspector toggle in the editor topbar.** Switches the whole canvas
  overlay layer off — hover outlines, the selected outline, both toolbars and
  click-to-select — so the preview reads as a plain page. The choice persists per
  browser and is re-sent on every iframe handshake, so a preview reload keeps it.
- **Delete on sidebar section rows.** A trash action on row hover, with a
  confirmation naming the section. Hidden rows keep their actions visible; locked
  rows get none.

### Fixed

- **The desktop canvas fills the available width** instead of sitting in a fixed
  1440px box between gutters. A window wider than the device width previews at its
  own width; a narrower one still lays out natively and scales down.
- **Dark mode persists across pages inside the editor.** The canvas now stores the
  visitor scheme override under an `:editor`-suffixed `sessionStorage` key, so the
  choice survives a page or region hop without ever touching the visitor's own
  `localStorage` key.
- **A republished preview bundle no longer serves stale JavaScript.** The injected
  iframe script was versioned by package version while the parent editor script
  used file mtime, so republishing assets without an upgrade left the two halves of
  the bus at different vintages — a working feature read as completely dead in an
  open tab. It is now cache-busted by mtime.
- Repository prose (reports, docs) no longer leaks class names into the shipped
  `site.css`; Tailwind's auto-detected sources are scoped to real render surfaces.

## [1.29.0] — 2026-07-31

### Added

- **Per-section look variants.** Five knobs on every section — card style, image
  frame, arrangement, corners and button weight — each emitting one class on the
  section wrapper so the built-in primitives re-skin from CSS alone. Two sites on
  the same section library can now look nothing alike. Every knob defaults to
  "Theme default", so nothing changes appearance until you pick one. Turn the
  panel off with `sections.look_variants => false`; a section can also declare
  its own subset with the `HasLookSettings` concern.
- **Mobile filters on product listings.** The filter rail becomes a sticky column
  on desktop and a bottom sheet on phones, with a Filters trigger carrying the
  active-filter count, a live result count, and clear-filters in both. Previously
  a phone visitor could not filter a catalogue at all. The sheet opens from a
  checkbox, so it works with JavaScript disabled; JavaScript adds the scroll lock,
  `Escape`, focus trap and keyboard activation.
- **Optional mobile bottom navigation on the header.** `show_mobile_nav` (default
  off) renders the header's first four nav links as a fixed bottom tab bar on
  phones, respecting `env(safe-area-inset-bottom)`. It publishes a
  `--fc-bottom-chrome` variable that the watermark and toast host read so nothing
  stacks on top of it.
- **Cart event and toast bus.** `FilamentCraft\Commerce\CartEvents` owns the
  browser event names, so a host section and a built-in header can finally talk to
  each other. `CartService` dispatches a `CartUpdated` event on every change, any
  `[data-fc-cart-count]` updates itself, and `<x-filamentcraft::toast-host />`
  ships the announcement region.
- **`RendersInSiteShell` for host-owned Livewire pages.** Applies the same locale
  rule the public renderer uses (honour `?locale=` only when the site has that
  locale, never the browser's) and pins it across Livewire updates, so a visitor
  mid-checkout is no longer dropped back onto the site default.
- **Whole-card click affordance.** `.fc-card--clickable` + `.fc-card__hit-area`:
  a card clickable as a whole that still contains its own buttons, without nesting
  interactive elements in an anchor or faking it in JavaScript.
- **`SectionData::currentRecordKey()`** — what record the page is about. The
  product carousel now drops it by default, so a "related" row on a product page
  no longer leads with the product you are already looking at.
- `--fc-card-media-ratio`, `--fc-cat-ratio` and `--fc-gallery-ratio` so card and
  gallery frames can be re-themed by inheritance instead of inline styles.
- `.fc-tag--inline` for reusing the pill as an ordinary in-flow chip.
- `FILAMENTCRAFT_SOFT_DEGRADE` env switch for the attribution link.

### Fixed

- **Livewire sections now repaint in the editor preview.** A `wire:id` root was
  skipped wholesale by the canvas morph, so every `LivewireSection` ignored colour
  scheme, preset and setting changes until the iframe was reloaded by hand. The
  canvas now adopts the server's freshly rendered node and re-registers the
  component, and leaves it alone when only Livewire's own bookkeeping differs.
- **Dark mode survives a `wire:navigate` hop.** The pre-paint restore ran once and
  never again, so the first internal link dropped the visitor's choice back to
  light. It now re-applies on `livewire:navigated` — and clears the override when
  nothing is stored, so a page can get back to light too.
- **Two scrollbars in the editor's settings rail.** Filament renders toggle-button
  radios as `position: absolute` inside a static wrapper, so their containing block
  fell through to the rail, which then never clipped them and grew a second
  scrollbar next to the panel's own as soon as a settings group was expanded.
- **Card badges survive a hidden image frame.** "Sale" / "New" / "Sold out" are
  anchored to the card instead of the media frame, so a card variant with no
  photography keeps its badge.
- **Header icon controls meet the 44px touch target** both platform vendors ask
  for, without changing their painted size.

## [1.28.4] — 2026-07-30

### Fixed

- **Preview iframe now truly clips to the phone's rounded corners.** The device
  shell is CSS-scaled, and under a transformed ancestor Chromium promotes the
  iframe to its own layer that ignores `border-radius` clipping — so the bottom
  bar still spilled over the bezel. The frame now uses `clip-path`, which clips
  the composited iframe layer reliably. Supersedes the 1.28.3 attempt.

## [1.28.3] — 2026-07-30

### Fixed

- **Mobile/tablet preview no longer spills past the phone's rounded corners.**
  Browsers don't clip an `<iframe>` to its parent's `border-radius`, so the
  site's bottom bar and buttons overflowed the device mockup's rounded chin. The
  preview iframe now carries its own bottom corner radius.

## [1.28.2] — 2026-07-30

### Fixed

- **Carousel arrows now point the right way in RTL.** The prev/next chevrons
  were hard-coded left/right, so on Arabic and other RTL sites they contradicted
  the (already RTL-aware) scroll direction. The icons now mirror in RTL.

## [1.28.1] — 2026-07-30

### Fixed

- **Tier reporting now works on installs that published the config file.**
  `filamentcraft:install` publishes `config/filamentcraft.php`, and a file
  published before 1.28.0 has no `public_key` entry — which shadowed the
  package default and left every key reading as untiered. The signing key now
  lives in code, with config as an override for anyone self-signing.

## [1.28.0] — 2026-07-30

### Added

- **Your license key now tells you which tier it is.** Keys issued from today
  carry their tier, signed so it cannot be edited, and
  `php artisan filamentcraft:doctor` reports it — `License allowance (Studio —
  2 of 5 sites)`. Verification happens locally against a key shipped in the
  package; nothing contacts a server, as before.
- Doctor warns when an install holds more sites than its tier covers, so an
  agency can see at a glance whether a project needs its own license.

### Notes

- **Nothing is enforced from this and nothing is blocked.** Project counts are
  license terms. The count is per install, so it cannot see sites a license
  runs elsewhere — a ceiling would penalise a single multi-tenant install while
  missing an install-per-client setup entirely.
- Keys issued before this release carry no tier and report no ceiling. They
  keep working exactly as they did, forever; there is no need to reissue.

## [1.26.1] — 2026-07-27

### Added

- **Edit a block straight on the canvas.** Pointing at a block raises a small
  toolbar on it — drag to move, add space above or below, duplicate — each
  labelled on hover, so the common edits no longer need a trip to the structure
  tree.
- **Dropping a layout onto a canvas that already has content adds a spacer
  between them**, instead of stacking the two flush as one run-on section.

### Fixed

- **A custom section's settings are listed flat.** Each block used to get its
  own collapsible group, so editing a three-card feature section meant opening
  nine cards to reach nine fields. Fields now sit in document order with the
  block's name on the field itself — `Heading`, or `Button · Label` for a block
  with several editable props. Existing sections pick this up the next time they
  are saved.
- **An image uploaded in the builder now shows in the preview.** Livewire reports
  a finished upload at its nested state path, which no control owned, so the file
  was discarded before it reached the draft — the section only picked the image
  up once it had been saved and placed on a page.
- **The canvas drag handle sits on the block it drags.** It is fixed-positioned
  but was offset from its static flow position, so it parked near the foot of
  the document no matter which block was selected.
- **A custom section's hover label drops the type namespace** — the canvas
  toolbar read `Custom::Get Started` where the section is just "Get Started".

## [1.26.0] — 2026-07-27

### Added

- **No-code section builder.** Editor users can now design their own section
  types in the browser — no PHP, no release. They compose one from 25 block
  primitives (or start from one of 24 curated layouts), arrange it on a live
  canvas or in a structure tree, style each block from theme tokens, and save
  it. The result lands in the **Add section** catalog beside the built-ins and
  can be placed as many times as you like, each instance holding its own
  content.
- **The settings panel writes itself.** Every editable prop bound while building
  becomes a setting on the saved section, grouped by the block it came from, so
  the person who builds a section and the person who fills it in do not have to
  be the same person. Rich text gets a rich editor, images an upload, icons the
  picker.
- **Custom sections behave like built-ins.** They are cacheable, honour colour
  schemes and Brand Kit limits, render per locale, and re-saving one bumps a
  version counter that folds into the fragment-cache key — so a section
  invalidates its own cached HTML without a manual flush.
- **Fenced for untrusted operators.** Definitions resolve only within their own
  site, trees stop at four levels and a configurable node cap, the HTML block's
  markup runs through the shared sanitizer with `<script>` behind an opt-in
  `allow_custom_code`, and every control value is validated against its declared
  option set or numeric bounds before it reaches the tree. Deleting a definition
  that pages already place tells you how many first.
- **New docs page** at `/guide/section-builder`, with `filamentcraft:doctor`
  auditing stored definitions.

### Fixed

- **Storefront layouts no longer collapse when the host ships its own Tailwind
  build.** Both bundles emit the same utility names, and unlayered, a host's
  `.grid-cols-1` landed after our `lg:grid-cols-4` at equal specificity and won
  on source order — flattening every responsive section to a single column. The
  stylesheet now declares an explicit cascade-layer order, so our utilities beat
  a host's layered output while any **unlayered** host CSS still overrides us and
  deliberate storefront overrides keep working.
- **Abandoned builder drafts no longer consume a site's section allowance.** A
  closed browser tab used to leave a draft row that counted against the limit
  forever; only saved sections count now, and stale drafts are swept.
- **Uploading a file into a setting that cannot hold one no longer 500s** with
  `Serialization of 'TemporaryUploadedFile' is not allowed`. Draft values are
  sanitized through one shared path for both the builder and the settings panel.
- **An off-shape section icon can no longer take the editor down.** The icon
  renders in the section rail on every load, so an unresolvable name is coerced
  back to the default rather than trusted.
- **Closing a saved section from the builder no longer discards it.** The back
  control is non-destructive once a section has been saved, and confirms only
  when there is unsaved work to lose.

## [1.25.0] — 2026-07-24

### Fixed

- **The preview stays where you are working.** Reordering, moving, hiding, or
  restyling a section no longer snaps the canvas back to the top of the page —
  the preview re-anchors to the section you are editing after every refresh.
- **Auto-save is now off by default**, with a longer debounce when you turn it
  on, so an editing session no longer writes a draft on every keystroke.

## [1.24.0] — 2026-07-23

### Added

- **Per-locale headers, footers, and announcement bars.** Regions are now
  locale-bucketed exactly like page content: each locale of a multi-locale site
  gets its own header/footer/announcement, editable independently through the
  same locale switcher, copy-from-locale, and empty-locale states the page
  editor already has. A locale you have not translated yet falls back to the
  default locale's region on the public site, so nothing renders blank.

### Fixed

- **Existing regions upgrade in place.** A shipped migration wraps every stored
  region's current content into its site's default-locale bucket, so live sites
  keep rendering unchanged and pick up per-locale editing without data loss. The
  renderer also tolerates an un-migrated region, so a host that updates the
  package but delays `php artisan migrate` never 500s. `filamentcraft:doctor`
  now flags any region still on the legacy shape.

## [1.23.0] — 2026-07-23

### Added

- **Gate who can open the builder.** A new `canAccessUsing()` plugin setter
  takes a closure — passed the authenticated user — that decides whether the
  builder is reachable. When it returns `false` the dashboard, the editor, and
  the advanced resources all drop out of navigation **and** return `403` on
  direct URL access, so a plan/licence/Gate check has a single wiring point with
  no bypass. Omitting it leaves the builder open to every panel user, as before.

### Fixed

- **A missing `filamentcraft_sites` table no longer 500s the whole panel.** On a
  host that registered the plugin but had not yet run `filamentcraft:install`,
  navigation rendering resolved a site on every page and threw an uncaught
  `QueryException`, taking down every panel route — not just the builder. Site
  resolution now probes the table first and degrades to "no site" instead.

## [1.22.0] — 2026-07-18

### Added

- **In-editor preview link navigation.** Clicking a storefront link in the
  editor canvas — a product card, a category tile, or a Shop / Cart / Checkout
  button — now switches the editor to the page that renders it and previews the
  clicked record, instead of the click being swallowed. The destination page is
  resolved from the sections each page contains (a Product Detail section marks
  the product page, Cart the cart page, Product Listing the shop/category page),
  so it needs no configuration; product and category links carry the clicked
  slug so the destination previews that exact record, and the topbar page
  dropdown re-syncs automatically.

## [1.20.1] — 2026-07-16

### Fixed

- **Doctor's primary-domain warning was misleading.** It claimed an empty
  `filamentcraft.domain.primary` degrades "subdomain resolution". Inbound
  subdomain matching reads `APP_URL`'s host and never touches that key —
  `domain.primary` only affects *generated* public URLs. The warning now says
  so.
- **`install --folio` overstated what it does.** Its help text and console
  output claimed it wires Folio routing; it scaffolds
  `resources/views/storefront/` and prints the `Folio::path(...)` line for you
  to register yourself. Text corrected — behaviour unchanged.
- Stale docblocks on `SiteThemeSettings` (reserved keys) and `FontCatalog`
  (font count).

### Documentation

- Audited every docs page against source and fixed 35 false or misleading
  claims. The material ones: the install guide promised Templates/Editor
  sidebar entries that need `->showAdvancedResources()` (off by default); the
  public-routing guide told you to set `domain.primary` for wildcard
  subdomains, which silently resolves the wrong tenant when `APP_URL`
  differs; the cache reference had taggable stores backwards (`array` caches,
  `file` — Laravel's default — does not); the editor guide documented a right
  settings column and "New page"/"Manage" controls that don't exist; and
  `only([...])`, `FontCatalog::flush()`, and `Range::unit()` were documented
  with signatures that throw or don't reach CSS.

## [1.20.0] — 2026-07-16

### Added

- **SEO & GEO pack.** Server-rendered SEO and AI-search optimisation as a
  first-class feature: `/sitemap.xml` (honest lastmod + hreflang alternates),
  `/robots.txt` with a per-site AI-crawler policy, `/llms.txt`, and IndexNow
  submission on publish — all registered only when `public_routes` is on and
  each toggleable under `filamentcraft.seo`. Per-page SEO lives in the editor
  (Search engine + Social tabs with live SERP/share-card previews, canonical
  override, indexing toggle) and is stored per locale on `templates.seo_json`.
  Site defaults (title suffix, description, share image, organisation
  profiles, staging noindex) live in Site settings → Search & AI. All head
  output flows through one `SeoResolver` chokepoint (Open Graph, Twitter
  card, hreflang, JSON-LD). Renaming a slug offers a chain-collapsing 301
  redirect. Answer bots are never blocked — only training bots are
  toggleable.
- **Doctor overhaul.** `filamentcraft:doctor` now runs ~35 grouped checks
  (Environment / Database / Panel / Configuration / Themes / Sections /
  Content / SEO / Assets / License) with `--json` for CI and `--strict` to
  fail on warnings. New diagnostics include: upgrade-migration columns,
  wrong-typed config values (quoted `.env` booleans), tenancy wiring
  (mode / owner model / `single_site_id`), cache store existence + tag
  support, uploads disk + php.ini upload limits, published pages and regions
  referencing unregistered section types, legacy payloads, published
  templates without a revision, commerce sections without a `Storefront`
  binding, stale published assets after an update, missing Vite manifests,
  and the SEO gaps above. Doctor also boots each panel's plugin so console
  runs see the same section/theme registries as browser requests.
- **`Color::allowAlpha()` now works.** The modifier switches the compiled
  `ColorPicker` to `rgba` format so end users can set an opacity; the color
  transformer reads `rgba(…)` / `rgb(…)` strings back into a `ColorValue`
  (with `->alpha`). It was previously a no-op.
- **`RichText::inline()` now works.** An inline rich-text setting compiles to
  a `RichEditor` with a reduced toolbar (bold, italic, underline, strike,
  link) and no block-level tools — for short fields like an eyebrow or
  caption. It was previously indistinguishable from the full editor.

### Fixed

- **Host section shadows are now stable across panel and public boots.** A
  host section sharing a builtin slug used to win on public routes but lose
  on panel routes (the editor rendered a different class than the live
  site), because panel boot blindly re-registered every builtin. Builtins now
  register only when the slug is free, and disabling them only forgets slugs
  the builtin itself still holds.
- **A misconfigured `filamentcraft.cache.store` name degrades to uncached
  rendering** instead of erroring on every cached section render. Doctor
  reports the bad store name.
- **An unknown public path now 404s** instead of falling back to the home
  template, so a typo'd URL can never be indexed as duplicate homepage
  content.

### Removed

- **Dead `enable_dark_mode_toggle` setting on the Studio theme.** The checkbox
  affected nothing — the visitor scheme toggle is gated by each section's
  `show_scheme_toggle` — so it and its translations were removed.

## [1.19.1] — 2026-07-11

### Fixed

- **No per-request log noise for valid configurations.** The v1.19.0 runtime
  warnings for unregistered theme slugs and section slug overrides fired on
  every render for legitimate setups (token-only Theme rows, intentional
  built-in shadowing). Both diagnostics now live in
  `php artisan filamentcraft:doctor` instead: orphan theme rows keep their
  WARN (with a note that token-only rows are fine), and the section registry
  records slug overrides that doctor reports with both class names.

## [1.19.0] — 2026-07-11

### Added

- **`php artisan filamentcraft:doctor`.** One command that diagnoses the whole
  installation — migrations, panel plugin wiring, registered themes vs. Theme
  DB rows, orphaned theme slugs, live sites (and published homepages when
  `public_routes` is on), the storage symlink, and published editor assets —
  printing a remediation hint under every failed check.
- **`php artisan about` integration.** The Laravel about screen now reports the
  installed FilamentCraft version, registered theme/section counts, tenancy
  mode, public-routes state, and whether a license key is set.
- **Enum options for `Select` and `Radio`.** `->options(MyEnum::class)` now
  works the way Filament's own fields do — values come from the backed enum,
  labels from `HasLabel` (falling back to headlined case names).
- **`->helperText()` on every setting** as a Filament-familiar alias of
  `->info()`.
- **Interactive example seed.** A bare interactive `filamentcraft:install` now
  offers to seed the example site so first-time users land on a working page.

### Changed

- **A broken section can no longer take down the whole page.** If a registered
  section throws while rendering (missing Blade view, bad code), the editor
  preview shows a "failed to render" card naming the error; published pages
  report the exception and skip the section. Intentional `abort()`s still
  propagate.
- **Silent failures now speak.** Unknown theme slugs log a warning naming
  `filamentcraft:sync-themes`; section slug collisions log both class names;
  the public 404s explain what to publish/create; `Setting`/`Block` id
  validation errors describe the rule in plain language with an example.
- **Install and make-commands guide the next step.** Install names the exact
  panel-provider file to register the plugin in, points to
  `filamentcraft:starter` and `doctor`, and skips DB-dependent steps when
  migrations are declined; `make:filamentcraft-section` only claims
  auto-discovery when the class actually lands in `app/Sections`;
  `make:filamentcraft-theme` prints the required `sync-themes` follow-up.
- **Config cleanup.** Removed five dead keys (`prefix`, `route_prefix`,
  `routes.public_locale_fallback`, `assets.dist`, `themes.paths`) and
  documented `editor.enabled`, `cache.ttl`/`tag_prefix`, and `domain.primary`.
- **Complete IDE autocomplete.** The `FilamentCraft` facade docblock now covers
  the navigation setters, blueprint registration, advanced-resources toggle,
  and the correct `viteBuild()` signature.

### Fixed

- `Section::defaults()` implementations that omit the `settings` or `blocks`
  key no longer crash the Add-section modal or blueprint seeding.
- `LivewireSection` without a `$view` now fails with the same descriptive
  `LogicException` as `BladeSection` instead of a framework error.

## [1.18.0] — 2026-07-11

### Added

- **Host locale URL strategies (`localeUrlsUsing`).** Hosts that resolve the
  visitor locale from their own routing (locale-prefixed paths, sub-domains)
  can now register a closure —
  `FilamentCraftPlugin::localeUrlsUsing(fn (Site $site, string $locale, bool $isDefault): ?string)`
  — and the built-in header language switcher plus every `LocaleAlternate`
  consumer (hreflang tags, the `<x-filamentcraft::locale-switcher>` component)
  emit those URLs instead of the default `?locale=xx` query strategy. The
  header section turns fragment caching off while a resolver is registered,
  since host URLs are path-dependent.

### Fixed

- **Sections now render (and cache) in the requested locale.** `__()` calls in
  section views that omitted the explicit locale argument resolved against the
  app locale, so a `?locale=fr` page rendered — and per-locale fragment caching
  then froze — English strings ("Most popular", "Learn more", nav aria labels).
  `SectionRenderer` sets the app locale for the duration of every section
  render and restores it afterwards.
- **Header locale dropdown closes on outside click and Escape** instead of
  staying open until the trigger is clicked again.
- **Checkout shipping fee can no longer be tampered with.** The shipping fee /
  free-shipping threshold the checkout section posts as hidden inputs are now
  HMAC-signed (`ShippingSignature`); a devtools edit that zeroes the fee (or
  strips the fields) rejects the order instead of placing it with free
  shipping.
- **Checkout re-validates the cart against the live catalog.** Lines whose
  product disappeared after add-to-cart no longer reach the host's
  `placeOrder()` (previously they could crash checkout or place mismatched
  orders), and a line that has gone out of stock since being added rejects the
  order — mirroring the guard `add` already enforced.
- **Checkout form field ids are namespaced per section instance**
  (`fc-co-name-{sectionId}`), so two checkout sections on one page keep valid
  label associations.
- **A paused site's custom domain fails closed.** `DomainResolver` no longer
  falls through to the subdomain lookup when a non-live site claims the exact
  domain — previously an unrelated live site with a matching subdomain could be
  served under the paused site's host.
- **In-flight setting edits survive editor navigation.** A settings-field edit
  still inside its 400 ms commit debounce was lost when the next click switched
  the locale, page, or site; pending commits now flush on pointerdown before
  any navigation handler runs.

## [1.17.1] — 2026-07-09

### Fixed

- **Checkout success page 500 on newer Blade compilers.** The checkout view
  mixed `@php(...)` inline directives with `@php … @endphp` blocks; on recent
  Laravel versions two consecutive inline directives after a block mis-compile
  into a `ParseError`. All inline `@php(...)` in the checkout view now use the
  block form.

## [1.17.0] — 2026-07-09

### Added

- **Visitor dark-mode toggle.** The Header and Footer sections gained an opt-in
  sun/moon switcher (`show_scheme_toggle`) with inline or floating-button
  placement. Clicking it flips a `data-fc-scheme-override` attribute on
  `<html>` — `DesignTokenCompiler` now pre-renders a pure-CSS override layer
  for every scheme, so the whole page (pinned sections included) re-tokens to
  the dark scheme with no framework JS. The choice persists in `localStorage`
  and a pre-paint script in the layout head restores it before first paint (no
  light flash). Accessible (`aria-pressed`, focus ring), RTL/safe-area-aware
  floating variant, reduced-motion-friendly transitions, translated in all
  seven locales, and documented in the Color Schemes guide. The persisted
  choice is scoped per site, the editor canvas ignores it (authors always see
  the authored scheme), and floating buttons reparent to `<body>` so a sticky
  header's `backdrop-filter` can't trap them.

## [1.16.2] — 2026-07-08

### Fixed

- **Banner/announcement section wrapped awkwardly on narrow screens.** The
  icon broke onto its own line above the text and the floating pill's
  `rounded-full` deformed once the copy wrapped. The icon now stays inline
  with the (centered) text, and the floating card hugs its content with a
  softer radius on small screens (`rounded-2xl` → `rounded-full` from `sm:`).

## [1.16.1] — 2026-07-08

### Fixed

- **Mobile/tablet preview squashed on short screens.** The device mockup was
  sized with `min(100%, …)`, so a small viewport height shortened the phone
  and distorted its aspect ratio. The mockup now renders at its native size
  and CSS-scales down uniformly to fit the canvas (the same transform
  approach the desktop shell uses), with a small gutter for its drop shadow.
  Tall screens still cap at the device's native size.

## [1.16.0] — 2026-07-08

### Added

- **Canvas section hover toolbar.** Hovering a section in the editor preview now
  draws a teal outline with a floating toolbar — section name chip plus edit,
  move up/down, duplicate, hide, and delete — so sections can be managed
  directly on the canvas without the sidebar. Move buttons disable at the
  first/last position, locked sections expose only the name and edit, and the
  selected section keeps a persistent outline + toolbar (the editor now sends
  `section:select` to the iframe; its handler previously never received it).
- **`section:toggle-hidden` protocol message** and a `data-fc-section-locked`
  wrapper attribute backing the new toolbar.

### Changed

- **Sidebar section rows slimmed down.** The per-row hover actions (hide, move,
  duplicate, delete) moved to the canvas toolbar; rows show just the drag
  handle and label. Hidden sections don't render in the canvas, so their row
  keeps an always-visible "show" toggle as the way back.

### Fixed

- **Settings panel crashed for image settings stored as URL strings.** Stored
  image values support a plain URL string or a `{path, alt}` map, but both
  reached Filament's `FileUpload` raw state unwrapped and fataled in
  `BaseFileUpload::getUploadedFiles()` (`foreach` on a string). Image-typed
  values — in section settings and repeater blocks — are now coerced to the
  file-list shape on hydration, with regression tests for both shapes.

## [1.15.0] — 2026-07-04

### Fixed

- **Cart quantity update crashed with a `TypeError`.** The storefront cart's
  quantity stepper posts `qty` as a string; `CartController::update()` passed it
  straight into `CartService::setQty(int $qty)`, and under `declare(strict_types=1)`
  PHP refused the coercion. Quantities now cast at the boundary (matching `add()`
  and `checkout()`), with regression tests covering both the increment and the
  quantity-zero-removes-the-line paths.

### Improved

- **Every built-in section now honours every setting it exposes.** A full audit of
  all 32 sections closed the gaps where a control was declared but did not change the
  render: the four `shape` values (clean / contained / layered / wireframe) now render
  four visibly distinct treatments in every section and are independent of
  `surface_style` / `surface` / `media_placement`; product-listing `columns` honours
  its `4` option; the logo wall's `tone` applies to text logos, not only images;
  `density` now scales card padding on mobile, not just desktop; and several other
  option values that previously rendered identically are now differentiated.
- **Cleaner empty states.** Clearing a heading, label, or announcement no longer leaves
  a broken empty element — primary text nodes across the pack collapse gracefully,
  matching the established `data-fc-hide-empty` pattern.
- **Contrast, accessibility, and polish.** Removed hardcoded hex colours in favour of
  theme tokens (contact, store-hero, video); the store-hero banner stays legible when
  no image is set; product galleries show an active-thumbnail state; disabled buttons
  no longer animate on hover; the eyebrow hairline is RTL-correct; and imageless media
  tiles share one refined monogram placeholder instead of a faint icon. The site header
  CTA now uses the primary-button primitive, and a sticky header respects surface shapes.

## [1.14.0] — 2026-07-03

### Added

- **Eleven new built-in sections — the most-used blocks from every major builder.**
  **Team** (profile cards / large portraits / minimal list, socials, initials fallback),
  **Gallery** (grid / masonry / carousel, ratio + caption controls),
  **Timeline** (horizontal steps / vertical rail / alternating sides, number / icon / dot markers),
  **Video** (YouTube / Vimeo / file; privacy-friendly `youtube-nocookie` embeds, lazy-loaded,
  with a JS-free `srcdoc` cover facade), **Articles** (card grid or featured + list),
  **Portfolio** (grid or featured case study, result-metric badges),
  **Tabs** (underline / pills / boxed, top or side placement, full W3C APG tablist semantics
  with a stacked no-JS fallback), **Comparison** (semantic 2–3 column table, highlightable
  "us" column, yes/no/free-text cells), **Countdown** (live-ticking tiles, expired state,
  cache-exempt), **Locations** (map embed with a strict URL allowlist + location cards), and
  **Announcement Bar** (full-width bar or floating pill, brand / surface tones, dismissible
  with per-section persistence). Every section ships Content / Layout / Style controls,
  four family presets (`modern` / `editorial` / `bold` / `elegant`), believable defaults,
  and names translated into all seven bundled languages.
- **Reusable carousel primitive.** `<x-filamentcraft::carousel>` +
  `<x-filamentcraft::carousel.slide>` wrap any section content in the same accessible,
  dependency-free scroll-snap carousel the product carousel uses: W3C APG region/slide
  semantics, arrow controls, new dot pagination (grouped-button pattern), keyboard-scrollable
  track, `scroll-snap-stop`, RTL-aware navigation, and reduced-motion support. Slides-per-view
  and gap are per-instance CSS variables.
- **Carousel layouts for existing sections.** Testimonials and Logo Cloud gained a
  `Carousel` layout option, and the Team, Gallery, and Product Carousel sections ride the
  same primitive.
- **Storefront JS modules** (all progressive enhancement, zero dependencies): APG tabs
  (roving tabindex, RTL-aware arrow keys, Home/End), countdown ticker, and banner dismissal
  backed by `localStorage`.

### Changed

- **Style-control parity for commerce and form sections.** Cart, Checkout, Contact,
  Newsletter, Category Grid, Product Listing, Product Carousel, and Product Page now expose
  the same `Density` control as the content sections (their vertical rhythm was previously
  hardcoded), and the Contact textarea now uses the `.fc-input` primitive.
- **Stats `Band` layout is now a real band** — a single shared surface with divided,
  centered figures — instead of rendering identically to the grid.
- **Carousel slides upgraded to APG semantics** (`role="group"` + `aria-roledescription="slide"`,
  labelled track) and the track is keyboard-focusable.
- **Leaner settings-panel helper text.** Field hints now appear only where the behaviour is
  non-obvious (magic values, constraints, hidden interactions) and are kept to one short line,
  instead of restating the label. Trimmed or removed across Hero, Store hero, Video, Cart,
  Gallery, Banner, Comparison, and Locations.
- **Stronger defaults for the new sections.** Gallery blocks that carry a caption but no image
  now render as designed gradient tiles on the live site (fully empty blocks are still skipped;
  the dashed upload hint remains editor-only), gallery ships six starter tiles, and Tabs panels
  default to the contained card frame with the tab's icon leading image-less panels.

### Fixed

- **Locations split layout no longer overflows the section.** Cards in the map + cards layout
  stretched to the full grid-row height and painted over whatever came after the section;
  full-height cards now apply only in the cards-only grid.

### Removed

- **The hero's `Custom padding` control.** Vertical rhythm is owned by the `Height` presets
  (compact / comfortable / airy) like every other section; a per-section free-form padding
  override fought the page rhythm and the theme's section-spacing token. Stored values from
  existing sites are ignored harmlessly. (The `Spacing` setting type itself is unchanged and
  remains available to custom sections.)

## [1.13.1] — 2026-07-01

### Added

- **Accessible product-carousel controls.** The product carousel now ships keyboard- and
  screen-reader-friendly previous/next controls (labelled, focus-managed, `aria`-wired and
  translated into all seven bundled languages), with a config toggle and the supporting CSS/JS.

## [1.13.0] — 2026-06-28

### Added

- **E-commerce section pack — turn any FilamentCraft site into a storefront.** Seven new
  built-in sections: **Store hero**, **Category grid**, **Product carousel**, **Product
  listing** (with server-side category / price / sort / search filters), **Product page**,
  **Cart**, and **Checkout**. They are fully **data-driven** — you choose *what* to show
  (a collection, a category, a limit), never the product data itself.
- **`Storefront` contract + DTOs** (`ProductData`, `CategoryData`, `CatalogQuery`,
  `OrderResult`, `CustomerDetails`). Bind your own implementation over your Eloquent models
  to feed the sections; the package ships `NullStorefront` as the default so the sections
  degrade to a tidy "connect your catalog" empty state until a store is wired.
- **JS-free session cart + cash-on-delivery checkout.** `CartService` (session, namespaced
  per site) stores only product references — **prices always resolve server-side from the
  `Storefront`**, never the client. Plain form-POST cart routes
  (`filamentcraft/cart/{add,update,remove,checkout}`) work with no client runtime and never
  trip Livewire's stateless-update 419. Checkout places the order via `Storefront::placeOrder()`.
- **Commerce CSS primitives** in `site.css` (`fc-product-card`, `fc-price`, `fc-tag`,
  `fc-ratingstars`, `fc-qty`, `fc-option`/swatch, CSS-only `fc-gallery`, `fc-filter`,
  `fc-chip`, `fc-summary`, `fc-cartbar`, `fc-pay`, `fc-steps`) — token-driven, RTL-safe,
  reduced-motion aware, no hover-scale. Images degrade to a designed gradient placeholder.
- Storefront UI strings (`commerce.*`) translated across all seven locales.

### Added (core)

- **`Section::cacheable()`** (default `true`). The renderer skips the fragment cache for
  sections whose output depends on the request (filters), the session (cart), or a fresh
  CSRF token (forms) — the listing, product, cart and checkout sections opt out.

## [1.12.2] — 2026-06-27

### Changed

- **The `elegant` starter family now has a simple header and richer content.** The header
  is a single-row split layout (brand left, nav + one CTA right) instead of a tall stacked
  centered block; the capabilities section is six considered editorial cards instead of
  three sparse tiles; and the testimonials section shows three quotes instead of one. Only
  the elegant family changes.

## [1.12.1] — 2026-06-27

### Fixed

- **The `elegant` starter family read as sparse and empty.** It now uses comfortable (not
  airy) density, contained section shapes (real card structure instead of borderless
  surfaces), and a cards features layout — so the minimal premium aesthetic looks
  intentional rather than unfinished. The other three families are unchanged.

## [1.12.0] — 2026-06-27

### Added

- **Preset-driven starter sites in four style families.** Every built-in section now ships
  four aligned presets — `modern`, `editorial`, `bold`, `elegant` — sharing slugs across all
  sections, so picking one family yields a cohesive, on-brand site. A new parametric
  `StarterSiteBlueprint::seed(StarterFamily::Modern, $owner)` provisions a complete, published
  seven-section homepage (hero → logo cloud → features → stats → testimonials → pricing → CTA)
  plus matching header and footer regions in a single line — the one-liner DX for a
  tenant-created hook.
- `StarterFamily` enum (value doubles as the shared preset slug; ships label/color/icon
  contracts and `::options()` for Filament selects), the `filamentcraft:starter` command, the
  idempotent `StarterSiteSeeder`, and the `filamentcraft.starter.family` config key.
- `BlueprintSection::fromPreset()` and `Preset::findIn()` — fill a blueprint section from a
  section's own family preset; the editor's preset picker reuses the same lookup.
- **Multilingual storefront primitives.** New `<x-filamentcraft::hreflang>` (emits
  `rel="alternate"` + `x-default` SEO tags) and `<x-filamentcraft::locale-switcher>` (a
  visitor-facing, RTL-aware, theme-token-styled language switcher with native labels), backed by
  the `FilamentCraft\Support\LocaleAlternate` value object / builder and `Locales::nativeLabel()`.
  Both render nothing for single-locale sites and support custom URL strategies via an `urlFor`
  closure (path-prefix, query-param, sub-domain).
- **Reworked editor language switcher.** Full keyboard accessibility (Arrow/Home/End,
  type-ahead, Escape-returns-focus, roving `tabindex`, `role="menu"`), `aria-current` on the
  active locale, live translation-status (an _Empty_ tag on untranslated locales, an
  "N of M translated" header, an amber pip on the trigger), an RTL badge, an unsaved-changes
  confirmation before switching, a copy-content-from-any-language modal, and a Manage-languages
  shortcut.
- **Localization & RTL guide** in the docs, plus a multilingual feature card and differentiator
  keywords on the docs home page.

### Changed

- The six bundled translation files (`fr`, `es`, `de`, `pt`, `ja`, `ar`) are back to full key
  parity with English (they had drifted ~46% behind, rendering raw translation keys in the
  editor for non-English admins). A new parity test guards against future drift.
- Active-locale resolution is centralised in a shared `InteractsWithLocale` editor concern,
  removing the same logic that was duplicated across six Livewire components.

### Security

- The editor active locale (`?locale=`) is now re-clamped to a site-opted-in code on **every**
  request, not just on mount — closing a vector where a tampered locale could persist an
  unsupported locale bucket into a template's `sections_json`. Copy-source locales are validated
  against the site's configured languages as well.

## [1.10.2] — 2026-06-24

### Added

- **Configurable editor control density.** A new `filamentcraft.editor.control_size` config
  (`compact` | `comfortable` | `spacious`, default `comfortable`) sizes the settings-panel
  enum/toggle-button controls. The value is projected onto the editor root as
  `data-fc-control-size` and drives `--fc-ctl-*` CSS tokens.

### Changed

- **Settings-panel enum buttons are more compact by default.** Filament's full-size toggle
  buttons made a 4-option enum (e.g. section Shape) dominate the narrow rail; the comfortable
  default is tighter while staying readable, and `control_size` lets you go smaller or larger.

### Fixed

- **Save / Publish actions were pushed off the right edge.** Below 1100px the editor topbar
  reserved ~6.75rem of right padding for the fixed focus-exit button — but the topbar is
  `display:none` in immersive mode (the only state where that button shows), so the reservation
  just left the Discard/Save/Publish buttons floating ~100px short of the edge. They now sit flush
  at the end at every width.

### Fixed

- **Single-site dashboard empty state rendered a full-screen icon.** The Website Builder
  dashboard's "set up your first site" empty state styled its heroicon with Tailwind utility
  classes (`h-7 w-7`, etc.). Filament v4 ships precompiled CSS and does not run Tailwind over a
  plugin's published Blade views, so in a consuming app those classes no-op'd and the icon (an SVG
  with no intrinsic size) filled the viewport. The dashboard view is now self-contained with inline
  styles (and Filament's primary CSS vars), so it renders correctly without the host compiling the
  plugin's Tailwind. Multi-tenant panels were unaffected because a tenant always resolves a site.

## [1.10.0] — 2026-06-22

### Added

- **Premium section design layer.** A reusable, token-driven set of `fc-*` primitives now powers a
  master-grade default look across every built-in section: premium card surfaces with a hairline ring
  and soft hover lift, tinted icon tiles, badge-style eyebrows, gradient stat numbers, a gradient-ring
  "most popular" pricing card, decorative radial/mesh/dot-grid backgrounds and aura glows, premium
  primary/secondary buttons with a focus ring, a pure-CSS logo marquee, and load-in reveal animations.
  Every effect derives from the `--fc-color-*` theme tokens (so it tracks any palette and per-section
  color scheme), is pure CSS (the storefront ships no JS), is gated behind `prefers-reduced-motion`,
  uses no hover `scale()`, is RTL-safe, and defaults to a light/modern look.
- **Logo-cloud "Marquee (auto-scroll)" layout** — an infinite, seamless, hover-pausing logo strip with
  edge fade, alongside the existing grid and single-row layouts.

### Changed

- **Every built-in section redesigned to a master-grade default.** Hero (aura glow, badge eyebrow,
  premium CTA, refined split-media frame), Features (icon tiles, hover-lift cards, staggered reveal),
  Stats (gradient numerals, tabular figures), Logo cloud (correct monochrome→color hover + marquee),
  Pricing (elevated gradient-ring "popular" card, bottom-aligned CTAs, tinted check rows),
  Testimonials (quote-mark accent, avatar ring), FAQ (refined accordion with open-state highlight and a
  progressive `::details-content` height animation), CTA (glow + gradient-ring card), Image-Text
  (premium media frame), Newsletter/Contact (glow card, focus-ring fields), Rich-text and Footer polish.

### Fixed

- **Emoji / short-glyph section icons now render.** The icon component called `svg()` for every value
  and silently dropped anything that wasn't a registered icon name, so emoji-based icons (e.g. ⚙️) in
  built-in section defaults rendered as empty boxes. Short non-icon glyphs now fall back to a centered
  text glyph; longer unresolved names still render nothing (to avoid printing a mistyped icon name).
- **Focus mode no longer squashes tablet/mobile previews.** Entering full-page focus mode hides the
  editor topbar via `display: none`, which dropped it as a grid item and let the canvas body auto-flow
  into the `auto` row and collapse to content height — shrinking tablet/mobile device frames (whose
  height resolves from `min(100%, …)`) to the iframe's intrinsic ~150px. The outer-grid children are
  now pinned to their rows so the body always fills the `1fr` track. Desktop was unaffected.

## [1.9.3] — 2026-06-20

### Changed

- **Command palette polish.** Typing now jumps the highlight back to the best match (so Enter runs
  the right command), recently-used commands surface at the top when the search is empty, Tab /
  Shift+Tab move the selection, long labels truncate instead of wrapping, and the panel sizes down
  on small screens.

### Accessibility

- The command palette is now a proper combobox/listbox (`aria-activedescendant`), so the highlighted
  command is announced as you arrow through it; its results list has an accessible name. The editor
  settings slide-over's Page/Site groups are wired to their labels (`role="group"` +
  `aria-labelledby`). Fixed a brief sun-icon flash on the color-scheme toggle during light-mode loads.

## [1.9.2] — 2026-06-20

### Changed

- The ⌘K command palette now shows a per-command icon next to each entry, making it quicker to
  scan.

## [1.9.1] — 2026-06-20

### Added

- **The ⌘K command palette is now discoverable.** A search button in the editor toolbar opens it
  (with a `⌘K` tooltip), and the keyboard-shortcuts help panel (`?`) now lists it.

## [1.9.0] — 2026-06-20

### Added

- **A ⌘K / Ctrl+K command palette in the editor.** Press ⌘K to fuzzy-search and run any of the
  editor's actions from one place — add a section, change theme, page/site settings, new/duplicate/
  delete page, new site, all pages, open live, save, publish, undo/redo, switch device, toggle
  auto-save. Full keyboard control (↑/↓ to move, Enter to run, Esc to close), focus-trapped, and
  styled in the builder's own dark UI. Built on the existing actions — no new server behaviour.

## [1.8.0] — 2026-06-20

### Changed

- **The builder-native dialog skin now covers the editor's toasts and dialog section cards too.**
  Filament notifications (save/publish/auto-save toasts) and the section cards inside action
  dialogs now use the builder's panel tokens, so nothing in the editor's chrome falls back to
  default Filament styling. Still scoped to the editor only and light/dark-aware.

### Accessibility

- The ⚙ settings slide-over now **traps focus** while open (focus moves into the panel and stays
  there until you close it), matching expected dialog behaviour for keyboard and screen-reader users.

## [1.7.0] — 2026-06-20

### Changed

- **The editor toolbar's page/site actions are consolidated behind one ⚙ Settings control.**
  The separate "New page" (`+`) and "Manage" (`⋯`) buttons are replaced by a single gear that
  opens a **builder-native slide-over** grouping every page and site action (page settings,
  new/duplicate/delete page, all pages, site settings, change theme, new site). Save, Discard, and
  Publish stay as labelled buttons.
- **Action dialogs now match the builder.** Filament's modals and slide-overs opened from inside
  the editor are skinned with the builder's own design tokens (scoped to the editor only, so the
  rest of the panel is untouched), so changing a theme or editing site settings no longer drops
  you into a differently-styled dialog. The skin tracks the editor's light/dark scheme.



### Changed

- **The "Website builder" nav item now opens the editor directly on the site's homepage.**
  The builder already owns page/site/theme management, so the intermediate list page is no longer
  the landing — `getNavigationUrl()` routes to the homepage template's editor, falling back to the
  dashboard for first-run (no homepage yet). The list remains reachable from the editor's
  **Manage (⋯) → All pages**.
- **The editor's "Open live page" control is now icon-only** to reclaim toolbar space; the
  destination URL is shown on hover (tooltip + `aria-label`) instead of as always-on text.

### Added

- **Change theme and All pages in the editor's Manage (⋯) menu** — switch the site's theme
  (reloads the canvas) and jump to the page-management list without leaving the builder.
- **Editor toolbar polish**: equal square hit-areas for the icon-only URL controls, a pressed/open
  state on the New-page and Manage menu triggers, a subtle press feedback and a unified
  focus-visible ring across all toolbar icon buttons, and a hover cue on the live-page icon. The
  disabled (unpublished) live link keeps its explanatory tooltip. The view-controls toolbar group
  gained an accessible name.

### Accessibility

- **Newsletter + Contact sections**: form errors are now programmatically associated with their
  inputs (`aria-invalid` / `aria-describedby`), success messages are announced via
  `role="status"` live regions, the submit button keeps a stable accessible name while loading,
  and inputs carry `autocomplete` / `inputmode` hints.

### Developer experience

- Section stubs (`make:filamentcraft-section`) now ship commented `category()` / `description()` /
  `blocks()` / `presets()` examples so those features are discoverable from the generated file.
- The testing reference gains a concrete `Event::fake()` assertion snippet for the shipped
  section events.

## [1.5.0] — 2026-06-19

### Fixed

- **`LivewireSection` wire actions now hydrate on the published storefront instead of failing
  with a 419 "page expired".** A `LivewireSection` renders via `Livewire::mount()`, which stamps
  the snapshot with the component's conventional (FQCN-derived) name — but that name was not
  resolvable back to the class on the stateless `/livewire/update` request, so the first
  `wire:click`/`wire:submit` returned 419 and the section appeared frozen on the live site. The
  section registry now registers every `LivewireSection` under a stable Livewire alias
  (`filamentcraft-section.{slug}`) at registration time (which runs on every request), so mount
  and update agree and the round-trip hydrates. Affects any interactive section, built-in or
  host-app.

### Added

- **Two shipped interactive sections — Newsletter (`newsletter`) and Contact form (`contact`).**
  FilamentCraft previously shipped only static `BladeSection`s; these are the first built-in
  [`LivewireSection`](https://filamentcraft.dev/guide/custom-sections#interactive-sections-livewire)s.
  Both validate their input, show a success state, and are enabled by default in the Add Section
  catalog (honoring the `builtin_sections_enabled` opt-out). They double as the canonical copyable
  reference for building your own interactive sections.
- **Event extension points for the interactive sections.** On submit, Newsletter dispatches
  `FilamentCraft\Events\NewsletterSubscribed` and Contact form dispatches
  `FilamentCraft\Events\ContactFormSubmitted`. With no listener they are harmless no-ops (the
  visitor still sees the success message); add a listener to persist the subscriber, send mail, or
  forward to a CRM. Each event carries the submitted values, the resolved `Site` (if any), and the
  section id.
- **`SectionDataFactory::test()` testing helper.** Builds the `SectionData` and mounts a
  `LivewireSection` as a Livewire `Testable` in one call, so consumers can drive a section's wire
  actions without the explicit `Livewire::test(..., ['section' => ...])` wiring. Throws for static
  sections (use `make()` there). Documented in the testing reference.

## [1.4.0] — 2026-06-18

### Fixed

- **The storefront shell now ships Livewire's frontend runtime when a page needs it.**
  Published pages render through a plain `view()->render()` (not a full-page Livewire
  response), so Livewire's automatic asset injection never fired — a `LivewireSection`
  (or a `BladeSection` that embeds a Livewire component) painted its initial HTML but had
  no `livewire.js`/Alpine to hydrate it, leaving `wire:click`, `wire:loading`, and
  `wire:model` dead on the live site. The renderer now detects interactivity (`wire:` or
  `x-data`) in the assembled header/body/footer and conditionally emits `@livewireStyles`
  + `@livewireScripts` (Alpine ships inside the Livewire bundle, so Alpine-only sections
  work too). Purely static marketing pages stay JS-free. Manual injection also suppresses
  Livewire's auto-injection, so there is no double-load.

### Added

- **`<x-filamentcraft::layout>` injects the Livewire/Alpine runtime by default.** Custom
  dynamic pages mounted in the shell (cart, checkout, account, full-page Livewire
  components) are interactive by nature, so the component defaults to injecting the runtime.
  Pass `:livewire="false"` to opt a purely static custom page out.

## [1.3.0] — 2026-06-16

### Fixed

- **Interactive `LivewireSection`s now round-trip.** A section extending `LivewireSection`
  could render its first paint but threw *"Property type not supported in Livewire"* on the
  first wire action, because the injected `SectionData` (and its nested `RenderContext`) was
  not Livewire-serializable. Both now implement `Livewire\Wireable`: `SectionData` dehydrates
  to a primitive payload and rebuilds through `SectionData::fromArray()` (re-resolving the
  section class, `Site`, settings, blocks, locale, and color scheme), and `RenderContext`
  round-trips route-model bindings as a morph alias + key. `wire:click`/`wire:submit` actions
  on a `LivewireSection` now work, with `$section` intact after every request.

### Added

- **Docs + test coverage for interactive sections.** New
  [Interactive sections (Livewire)](https://filamentcraft.dev/guide/custom-sections#interactive-sections-livewire)
  guide (including the Livewire/Alpine asset story) and a
  [testing recipe](https://filamentcraft.dev/reference/testing#testing-interactive-sections)
  that drives a wire action with `Livewire::test()`, plus suite coverage that exercises a
  `LivewireSection` round-trip and the new `Wireable` serializers.

## [1.2.1] — 2026-06-13

### Changed

- **Spacing input — faithful to the Bagisto Visual spec.** The four-sided control now infers
  its link state from the data when no link flag is stored (all sides equal ⇒ linked), so a
  plain `{top, right, bottom, left}` map (the Bagisto storage shape) imports without silently
  re-syncing asymmetric values. Negative values are fully supported for margin controls
  (`Spacing::make('margin')->min(-80)`), and `SpacingValue` exposes each side as a raw `float`
  property (`$pad->top`) alongside the unit-suffixed `->top()` method and `->css()` shorthand.

## [1.2.0] — 2026-06-13

### Added

- **Self-contained editor — in-editor page & store management.** The editor
  topbar gains a **New page** button and a **Manage** menu to create, edit,
  duplicate, and delete pages and edit store settings without leaving for the
  Sites/Templates resources. Built on Filament action modals wired into the
  topbar (`<x-filament-actions::modals/>`), with a safe delete that reassigns
  the homepage pointer, refuses to remove the last page, and redirects to a
  sibling.
- **Spacing setting type.** Four-sided padding/margin control with per-side
  inputs, a link/lock toggle, and min/max/unit options; renders to a CSS
  shorthand value.
- **Gradient setting type.** Linear/radial gradient editor with a live preview,
  angle dial, and color stops. Stop colours are restricted to hex or
  `var(--fc-color-*)` token references so a gradient can track the active scheme.
- **Hero** now exposes a background gradient and custom section padding, and its
  accent override genuinely recolours the eyebrow and call-to-action.

### Fixed

- **Settings panel could discard a sibling's structural change.** It now reloads
  the shared draft before persisting a setting/block/page-style edit, so a
  just-added/removed/reordered section is never clobbered.
- **Dashboard cross-tenant write.** The resolved site is now `#[Locked]` and
  re-verified through the tenancy resolver before any create/theme write.
- **Tenancy resolution** no longer throws in panel-less contexts (console,
  queue, tests).
- **Keyboard-shortcut help** no longer opened-then-closed on a single keypress,
  and **Escape** now closes the help overlay.
- **Discard** now asks for confirmation when there are unsaved changes, and
  several hardcoded editor strings (add-section clear, iframe title) are now
  translatable.

## [1.1.0] — 2026-06-12

### Added

- **Light Northline-brand presets** across all 12 built-in sections, so a fresh
  site can be assembled entirely from light-scheme presets.
- **Light/dark editor switcher** at the bottom of the editor icon rail.

### Fixed

- **Auto-save never fired.** The scheduler checked the server-side `hasUnsaved`
  computed property through the JS `$wire` proxy, where it does not exist.
  Dirtiness is now tracked client-side in Alpine state (fed by `draft-synced` /
  `fc:live-edit`) and armed on load when a dirty draft already exists.
- **Public catch-all route shadowed host and Livewire routes.** The
  `GET /{path?}` public route is now registered via `Route::fallback()`, so
  host-app routes and Livewire 4's frontend asset route always win.
- **Guaranteed 404 after a minimal (no-tenancy) install.**
  `templateBelongsToCurrentTenant` now authorises unowned template sites when
  the host has no tenancy configured, fixing "Open in Editor" out of the box.
- **Dist archive was missing runtime JS fallbacks.** `.gitattributes`
  export-ignored all of `resources/js`, so consumer installs failed in
  `filament:upgrade` (`copy(): No such file or directory`). Only the
  TypeScript sources are excluded from the archive now.

### Docs

- Legal pages (terms, privacy, refund policy), regions and blueprints guides,
  fresh editor screenshots, `APP_URL` + fallback-routing notes.

## [1.0.0] — 2026-06-10

First commercial release. Sold at filamentcraft.dev (Paddle checkout), installed
from the private Composer registry at `packages.filamentcraft.dev`.

### Added

- **Soft-degrade licensing.** `FilamentCraft\Licensing\License` reads
  `FILAMENTCRAFT_LICENSE_KEY`; unlicensed installs keep every feature and
  render a small "Built with FilamentCraft" link on public pages (both the
  template renderer and the `<x-filamentcraft::layout>` shell). Nothing is
  ever blocked, no network calls are made — install-time enforcement happens
  at the private Composer registry. `softLicense(false)` /
  `license.soft_degrade => false` disables the attribution link. The unused
  `license.cache_ttl` config key was removed.

- **Site blueprints + tenant provisioning.** `SiteBlueprint` (theme, pages,
  regions, locales, publish, site settings) + `BlueprintRegion` +
  `SiteProvisioner` create a complete live site in one transaction —
  `MyBlueprint::provision($owner)` from a model observer is the whole
  tenant-onboarding story. `make:filamentcraft-blueprint {name} [--site]`
  scaffolds page and site blueprints. Documented in the "Seeding &
  Blueprints" guide.

- **Release pipeline.** `release.yml` now gates a `v*` tag (dist parity +
  `composer check`) and creates a GitHub release; the distribution hub
  imports new tags automatically. `.gitattributes` export-ignores were
  extended so customer dist archives stay lean (~590 KB).

- **Dual Filament 4 + 5 / Livewire 3 + 4 support.** `composer.json` constraints
  broadened to `filament/filament: ^4.0|^5.0`, `livewire/livewire: ^3.0|^4.0`,
  `pestphp/pest: ^3.0|^4.0`, `pestphp/pest-plugin-laravel: ^3.0|^4.0` and
  `pestphp/pest-plugin-livewire: ^3.0|^4.0`. Filament v5 ships zero API changes
  versus v4 (it only exists to allow Livewire 4); the editor's JS now uses the
  version-agnostic `Livewire.hook('morph.updated', …)` API alongside the legacy
  `document.addEventListener('livewire:morph.updated', …)` listener so
  post-DOM-patch reboots fire on both Livewire 3 and 4. `phpunit.xml.dist`
  sets a deterministic `APP_KEY` so Laravel 12 + Pest 4 boots without an
  encryption-key error. CI matrix in `tests.yml` runs the full Pest suite
  against both Filament/Livewire pairs (with `filament/blueprint` auto-removed
  on the v5 leg, since Blueprint v1.x caps `filament/support` at `^4.0`).

- **Custom dynamic pages — four idiomatic doors, one shell.** Host apps can
  now render any non-template page (cart, checkout, account, lesson player,
  search results, blog comments, gated downloads) inside the same theme +
  header region + footer region + fonts + tokens that FilamentCraft templates
  use. Each adopter picks the door that matches their style:
  - **`#[Storefront]` Livewire attribute** — `FilamentCraft\Attributes\Storefront`
    extends `Livewire\Attributes\Layout` with the layout name pre-set. Drop it
    on any full-page Livewire component for zero-ceremony shell wrapping. The
    raw `#[Layout('filamentcraft::layout')]` form also works.
  - **`Route::filamentCraftStorefront(Owner::class, fn () => …)` route macro** —
    registers prefix + tenant middleware + Site binding for a whole group in
    one line. Reads the owner model from `filamentcraft.tenancy.owner_model`
    when omitted.
  - **`<x-filamentcraft::layout>` Blade component** — the explicit escape
    hatch with full prop control (`:site`, `:title`, `:color-scheme`, `:mode`,
    `:locale`). Aliasable via `Blade::component('your-name', Layout::class)`.
  - **Laravel Folio integration** — `php artisan filamentcraft:install --folio`
    scaffolds a starter `resources/views/storefront/cart.blade.php` and prints
    the FolioServiceProvider wiring. Zero PHP boilerplate per page after that.

- **`ResolveSiteFromTenant` middleware** (alias `filamentcraft.tenant`) —
  resolves the current tenant from a route-param slug, sets it as the Filament
  tenant when a panel is bootable, and binds the matching live `Site` to the
  container. Config-driven so `'filamentcraft.tenant'` with no arguments works
  when `filamentcraft.tenancy.owner_model` is set.

- **`TenantSiteResolver`** (`src/Resolvers/`) — singleton that centralises
  "owner-by-slug → `Filament::setTenant()` → live `Site`-by-morph" so the
  middleware and the Layout component's URL fallback share one implementation
  instead of duplicating ~30 lines each.

- **`Site::forOwner(Model $owner)` local scope** — polymorphic owner-match
  helper used by the resolver, replacing two raw
  `->where('owner_type', …)->where('owner_id', …)` chains.

- **`TemplateRenderer::buildShell()`** — extracted public method that returns
  the shell payload (tokens, header, footer, stylesheets, scripts, fonts,
  locale, dir, color scheme). Both `renderPayload()` and the new Layout
  component funnel through it so there's a single source of truth for the
  document chrome.

- **Auto-scroll preview on section selection.** Opening a section in the
  editor sidebar (or visiting an editor URL with `?section=…`) now smooth-
  scrolls the preview iframe to that section, using Livewire's
  `morph.updated` hook (version-agnostic) for post-patch reboots.
  Visibility-guard in the iframe handler suppresses the scroll if the
  section is already in the upper half of the viewport, so clicking a
  section inside the iframe doesn't snap-back. Consecutive same-id
  selections are deduped parent-side to skip the per-iframe `postMessage`
  fan-out.

### Fixed

- **Editor sidebar resize stopped working after page morphs.** `layout-resize.ts`
  keyed split-grid instances on the body element only — when Livewire /
  Filament navigation morphed the page tree and replaced the
  `[data-fc-layout-gutter]` node, the resize handle silently lost its
  `mousedown` listener. Now tracks the gutter element identity in a parallel
  `gutterByBody` WeakMap and rebinds when it changes.

- **`Route::filamentCraftTenant()` shadowed Filament `/admin/*` routes.** The
  default `tenantPattern` was `^(?!admin$)[A-Za-z0-9-]+`. Because PHP regex
  `$` anchors to end-of-input (the whole URL path), the negative lookahead
  only blocked the literal segment `admin` — multi-segment URLs like
  `/admin/acme` passed the lookahead, the FC tenant route captured
  `tenantSlug=admin` + `path=acme`, and every Filament panel route at
  `/admin/{tenant}/...` 404'd in real integrations. Default pattern is now
  `^(?!admin\b)[A-Za-z0-9-]+` (word boundary), which correctly rejects both
  the bare `admin` segment and `admin/anything`. Hosts that mount Filament at
  a non-default path should pass a custom `tenantPattern` to the macro that
  excludes their panel prefix too — see `docs/guides/custom-dynamic-pages.md`
  §Gotchas. New regression test in
  `tests/Feature/Routing/AdminRouteCoexistenceTest.php`.

### Changed

- `<title>` in `filamentcraft::renderer.layout` now accepts an optional
  `$title` variable, falling back to `$site->name` (used by the new Layout
  component for per-page titles in dynamic pages). No behaviour change for
  existing template renders.

- PHPStan grew a `phpstan-bootstrap.php` that registers the
  `filamentcraft::` view namespace + the `Route::filamentCraftTenant()` and
  `Route::filamentCraftStorefront()` macros at analysis time, so namespaced
  view paths and macro calls resolve cleanly without per-file `@phpstan-ignore`
  noise.

### Known caveats

- The v5 + Livewire 4 PHPStan leg is currently marked `continue-on-error` in
  `static.yml`. Pest 4 + Livewire 4 ship stricter generic stubs whose
  `@template TComponent` does not propagate through the `Livewire` facade's
  `@method static test()` declaration, surfacing ~26 false-positive errors in
  test files (`Unable to resolve template type`, `#[Computed]` properties
  missing on `instance()`). The Filament 4 + Livewire 3 leg remains the strict
  static-analysis gate. Tracking upstream: re-enable the v5 PHPStan gate once
  `larastan/larastan-livewire` ships v4 support or the Livewire facade
  propagates the template parameter.

- The `--folio` install flag scaffolds the starter file and prints the
  FolioServiceProvider snippet but does NOT auto-edit the host's
  service provider — Folio's path/uri/middleware wiring is currently a copy-
  paste step. Track for full automation once a Folio adopter asks.

### Tests

- 719 / 3098 (was 692 / 3041 in 0.1.0). New coverage: layout component
  rendering + alias support + custom-title + colour-scheme,
  `ResolveSiteFromTenant` middleware happy path + config defaults +
  not-found cases + invalid-owner errors, `Route::filamentCraftStorefront`
  route macro behaviour, URL-parameter fallback inside the Layout component
  with and without custom param names, `#[Layout]` and `#[Storefront]`
  attribute rendering through Livewire's full-page pipeline, `--folio`
  flag warning path. v4 leg PHPStan-clean, v5 leg test-clean.

## [0.1.0] — 2026-05-12

First public release. Covers phases 0–6 of the master plan.

### Added

- **Scaffolding** — `FilamentCraftServiceProvider`, `FilamentCraftPlugin`,
  package config, install command, stubs.
- **Data layer + tenancy** — `Site`, `Theme`, `Template`, `TemplateRevision`,
  `Region` Eloquent models with circular FK split (templates ↔ revisions);
  `TenancyResolver` that works without a tenancy package; `SiteStatus`,
  `TemplateStatus`, `TemplateType`, `RegionName`, `Device` enums.
- **Section DSL + registry + transformers** — `AbstractSection`,
  `BladeSection`, `LivewireSection`, `Setting` value object, `Field`
  descriptors, `SectionRegistry`, JSON ↔ runtime transformers, locale buckets.
- **Public renderer + fragment cache** — `TemplateResolver` (exact + dynamic
  routes), `TemplateRenderer` with per-section fragment caching, `Region`
  rendering, `PublicSiteController`, `SiteContext` middleware.
- **Livewire editor shell** — `EditorPage`, plus Livewire components
  `Topbar`, `SectionList`, `SettingsPanel`, `Canvas`, `AddSectionModal`,
  `PresetPicker`; `DraftStore`, `UndoStack`, `TemplateState`,
  `LocaleBucket`, `BroadcastPayloadBuilder`, `AutoSavePreference`.
- **Iframe preview + postMessage bus + morphdom** —
  `Editor/Protocol/Message` + `MessageType`; `resources/js/postmessage-bus.ts`,
  `iframe-injected.ts`, `editor.ts`, `keybindings.ts`, `layout-resize.ts`,
  `protocol.ts`, `tooltips.ts`; `AllowSameOriginIframe` and
  `InjectEditorScript` middleware; `PreviewController`,
  `SectionRefreshController`, `TemplateRefreshController`.
- **Filament resources** — `SiteResource`, `TemplateResource`,
  `ThemeResource` (each with List / Create / Edit pages), the
  `FilamentCraftDashboard` page, and the form components
  `ColorSchemeTokensField`, `ColorSchemeGroupField`,
  `ColorSchemeGroupEditor`, `ColorSchemePicker`, `FontPickerField`,
  `IconPicker`, `TemplateUrlPicker`.
- **Blueprints** — `AbstractBlueprint`, `BlueprintRegistry`,
  `BlueprintSection`, `BlueprintSeeder`, `SeedResult`,
  `filamentcraft:seed-blueprints` artisan command, plugin-level
  registration API, locked / hidden section flags with sealed-list guards.
- **Theming** — `ThemeRegistry`, `ThemeContract`,
  `filamentcraft:sync-themes` command, default token sets, font-picker
  integration with Bunny Fonts.
- **Multi-locale** — `Locales` helper, `LocaleAwareSections` state slice,
  empty-state UX (sidebar hint + canvas card), built-in `Header` section
  with locale switcher.
- **Built-in section catalog** — `Header` section with mobile-safe wrapping
  classes.
- **Make commands** — `make:filamentcraft-section`,
  `make:filamentcraft-theme`.
- **Testing & gate** — Orchestra Testbench base case, in-memory SQLite,
  692 Pest unit + feature tests at 3043 assertions; Pint + PHPStan level 6
  + Pest wired through `composer check`; CI workflows for tests, static
  analysis, and committed JS/CSS dist parity.
- **Demo app integration** — end-to-end browser test suite running against
  `filamentcraft-demo` via Pest 4 + `pest-plugin-browser`, covering the
  editor shell, save / publish, section CRUD, drag reorder at 3 viewports,
  device switcher, keyboard shortcuts, layout resize, breakpoints, file
  upload, public renderer, multi-tenant isolation, and locked / hidden
  Blueprint sections.

### Notes

- This release ships **without** Anystack licence enforcement. The
  soft-degrade SDK + UX will land in 0.2.0. Until then the package is
  delivered as-is via the path repository in `filamentcraft-demo` for
  internal verification.
- Documentation (`filamentcraft.dev/docs`) is not part of this release.
