<p align="center">
  <a href="https://filamentcraft.dev"><img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/filamentcraft-banner.jpg" alt="FilamentCraft, a visual website builder for Laravel and Filament" width="100%"></a>
</p>

<h1 align="center">FilamentCraft</h1>

<p align="center">
  <strong>Your users build the website. You ship the app.</strong><br>
  A Shopify-style, drag-and-drop website builder for Laravel, inside your <a href="https://filamentphp.com">Filament</a> panel or your own React, Vue or Livewire app.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Filament-4%20%7C%205-f59e0b" alt="Filament 4 | 5">
  <img src="https://img.shields.io/badge/Laravel-11%20%7C%2012%20%7C%2013-ff2d20" alt="Laravel 11 | 12 | 13">
  <img src="https://img.shields.io/badge/PHP-8.2%2B-777bb4" alt="PHP 8.2+">
  <img src="https://img.shields.io/badge/Livewire-3%20%7C%204-fb70a9" alt="Livewire 3 | 4">
</p>

<p align="center">
  <a href="https://demo.filamentcraft.dev/launch/admin">Live demo (no signup)</a> ·
  <a href="https://filamentcraft.dev">Docs</a> ·
  <a href="https://filamentcraft-video.pages.dev">30-second video</a> ·
  <a href="https://filamentcraft.dev/pricing">Pricing</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://github.com/filamentcraft/filamentcraft/issues">Issues</a>
</p>

<p align="center">
  <a href="https://demo.filamentcraft.dev/launch/admin"><img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/editor.jpg" alt="The FilamentCraft editor: section list on the left, live preview of the page on the right" width="100%"></a>
</p>

> FilamentCraft is a commercial package. This public repository holds the docs, changelog, screenshots and the issue tracker. The source installs from a private Composer registry once you have a license. Bug reports and feature requests are welcome from anyone, customer or not.

## What it is

Users stack sections, edit them, watch a live preview and publish, with your auth, your tenants and your users. It runs inside the Filament panel you already ship, or as a full-screen editor your users open from your own UI. There is no separate CMS to host.

Who uses it:

- SaaS apps that give each customer a website
- Agencies building client sites the client can edit safely
- Stores, with storefront pages backed by your own product tables
- Any Laravel app that needs marketing pages without a second system

## What's new

**1.41.4: Translate with AI.** From the editor's language menu, translate the current page, or any pages and header/footer regions you tick, into another language. Only text is sent, each distinct string once, and a per-site translation memory keeps terms consistent and makes re-runs almost free. Placeholders, HTML, links and number formats are protected and checked. Nothing is published: the open page lands in your draft, other pages get a new version in page history. [Docs](https://filamentcraft.dev/guide/localization#ai-translation)

**1.41.3: Page history.** A History tab lists every saved version of a page, grouped by day, with who saved it and what changed ("Hero, FAQ edited · Gallery added"). Preview any version read-only in the canvas, step through with the arrow keys, and restore it as the current draft. Restoring never publishes or deletes anything, and it can be undone. [Docs](https://filamentcraft.dev/guide/editor#history)

**1.41.2: React, Vue and Livewire apps.** `php artisan filamentcraft:install --standalone` sets up an editor-only panel for apps without a Filament admin, and three new starter kits (React, Vue, Livewire) give every team its own website. Also new: the `HasWebsiteEditor` user trait, `EditorUrl::to()` and `php artisan filamentcraft:uninstall`. [Docs](https://filamentcraft.dev/guide/inertia-react)

Full list in the [changelog](CHANGELOG.md).

## Features

### The editor

Drag sections to reorder them and the preview updates as you go. Preview at desktop, tablet and mobile sizes, hover a section for quick edit, move, duplicate, hide and delete buttons, and keep 50 steps of undo that survive a page refresh. Save a draft, publish, or discard back to the live version. Any section can be scheduled to show from or until a date.

<img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/editor-mobile.jpg" alt="Mobile preview in the editor" width="100%">

### 38 built-in sections, plus your own

Hero, features, bento grid, pricing, FAQ, testimonials, gallery, team, timeline, video, countdown, locations, contact and newsletter forms, commerce sections and more. Each comes with presets in four styles (modern, editorial, bold, elegant). Write your own sections in PHP and Blade, or let your users build new section types in the browser with the no-code section builder: no PHP, no release.

### Design and Brand Kit

Colors, fonts and buttons, with 14 color schemes and every Bunny Font. Theme presets let operators preview a whole new look and apply it in one click, with undo. The Brand Kit locks fonts to an allow-list and colors to a palette, so client sites stay on brand. Per-section look settings, opt-in motion effects and a visitor dark-mode toggle are included.

<img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/design-schemes.jpg" alt="Color schemes in the editor settings" width="100%">

### Page history

Every save is kept. Browse versions by day, see what changed, preview one in the canvas and restore it as your draft.

<img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/page-history.jpg" alt="Previewing an older version of a page from the History tab" width="100%">

### AI: write and translate

The optional AI assistant writes a page or a whole site from a short brief in three steps: brief, an editable section plan, then the written page in your draft. The Ask tab takes plain-language requests ("make the hero shorter"). Translate with AI copies a page into another language and rewrites only the text. Nothing the AI does is published until you publish it. It runs on the optional `laravel/ai` package (Gemini by default) and needs PHP 8.3 and Laravel 12+.

<table>
  <tr>
    <td width="34%"><img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/ai-plan.jpg" alt="AI assistant section plan"></td>
    <td width="66%"><img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/ai-translate.jpg" alt="Translate with AI dialog listing pages and regions"></td>
  </tr>
</table>

### Multiple languages and RTL

Each locale is its own content, with its own header, footer and announcement bar. Right-to-left languages flip the whole page, hreflang tags and a locale switcher are handled for you, and the package itself ships in seven languages (ar, de, en, es, fr, ja, pt).

<img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/storefront-rtl.jpg" alt="An Arabic, right-to-left storefront page" width="100%">

### Commerce from your own tables

Store hero, category grid, product carousel, product listing, product detail, cart and checkout sections read your products through one `Storefront` contract. The cart is session-backed with server-side prices, and checkout places a cash-on-delivery order through the same contract.

<img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/commerce-shop.jpg" alt="A product listing page built with the commerce sections" width="100%">

### Multi-tenant

Sites belong to any owner model. No tenancy package is required, and it works next to stancl/tenancy, spatie/laravel-multitenancy, Filament tenancy or a single-site app. Run one site per app or one per tenant, on custom domains or subdomains.

### SEO, media and production

Per-page title, description, canonical and Open Graph tags per locale, a sitemap with hreflang alternates, JSON-LD, `llms.txt`, an AI-crawler policy in `robots.txt` and IndexNow. A per-site media library, an inbox for contact and newsletter submissions, cached published pages, and a failing section renders empty instead of a 500. `php artisan filamentcraft:doctor` checks the install and prints a fix under every failed check.

## Works outside Filament

Your app does not need a Filament admin. In a React, Vue, Livewire or Blade app, run `php artisan filamentcraft:install --standalone` and your users open a full-screen editor from your own UI; they never see a Filament screen. See the [React, Vue & Livewire guide](https://filamentcraft.dev/guide/inertia-react).

Open-source starter kits, each set up with one `composer setup`:

| Kit | Stack |
|---|---|
| [starter-react](https://github.com/filamentcraft/starter-react) | Laravel's React starter kit with teams (Inertia, shadcn/ui), every team builds its own site |
| [starter-vue](https://github.com/filamentcraft/starter-vue) | Laravel's Vue starter kit with teams (Inertia, shadcn-vue) |
| [starter-livewire](https://github.com/filamentcraft/starter-livewire) | Laravel's Livewire starter kit with teams (Flux) |
| [starter-site](https://github.com/filamentcraft/starter-site) | Filament app: a company website with editable pages and a contact inbox |
| [starter-store](https://github.com/filamentcraft/starter-store) | Filament app: one online shop with catalog, basket, checkout, orders and stock |
| [starter-multistore](https://github.com/filamentcraft/starter-multistore) | Filament app: merchants sign up and get their own storefront |

More in [Starter kits](https://filamentcraft.dev/guide/starter-kits).

## Install

Add the private registry (username is your purchase email, password is your license key), then require the package:

```bash
composer config repositories.filamentcraft composer https://packages.filamentcraft.dev
composer config http-basic.packages.filamentcraft.dev you@example.com YOUR-LICENSE-KEY
composer require filamentcraft/filamentcraft
php artisan filamentcraft:install
```

Install publishes the config, migrations and editor assets, runs the migrations, links `storage` and seeds a published example site. Then register the plugin on your panel:

```php
use Filament\Panel;
use FilamentCraft\FilamentCraftPlugin;

public function panel(Panel $panel): Panel
{
    return $panel
        ->id('admin')
        ->plugin(FilamentCraftPlugin::make());
}
```

After each `composer update`, run `php artisan filamentcraft:upgrade`. The full walkthrough is in the [installation guide](https://filamentcraft.dev/guide/getting-started).

## Requirements

| Package | Version |
|---|---|
| PHP | 8.2+ |
| Laravel | 11, 12, 13 |
| Filament | 4.x, 5.x |
| Livewire | 3.x, 4.x |

Filament 4 runs with Livewire 3 and Filament 5 with Livewire 4, from one codebase. The AI assistant needs PHP 8.3 and Laravel 12+.

## See it first

- [Edit a real site in the live demo](https://demo.filamentcraft.dev/launch/admin). No signup.
- Watch the 30-second tour:

<a href="https://filamentcraft-video.pages.dev"><img src="https://raw.githubusercontent.com/filamentcraft/filamentcraft/main/art/readme/video-poster.jpg" alt="Play the 30-second FilamentCraft video" width="100%"></a>

## Support

- Documentation: [filamentcraft.dev](https://filamentcraft.dev)
- Bugs and feature requests: [open an issue](https://github.com/filamentcraft/filamentcraft/issues)
- Release notes: [CHANGELOG.md](CHANGELOG.md)

## License

FilamentCraft is commercial software. See [filamentcraft.dev/pricing](https://filamentcraft.dev/pricing) for licenses; payments are handled by Paddle. Every feature works without a key. On an unlicensed install, public pages show a small "Built with FilamentCraft" link, which goes away once you set your key:

```dotenv
FILAMENTCRAFT_LICENSE_KEY=your-license-key
```

Full terms are in [LICENSE](LICENSE).

## Credits

Built by [Hoceine El Idrissi](https://hoceine.com) ([GitHub](https://github.com/HoceineEl)).
