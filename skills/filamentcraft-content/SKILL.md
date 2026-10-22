---
name: filamentcraft-content
description: "Manage a live FilamentCraft site's content from code or artisan: create, edit, publish, duplicate, rename or delete pages, change sections on existing pages, add a language and translate pages (copy or AI), edit the header, footer and menus, set page and site SEO, add redirects, read form submissions, add images to the media library, schedule or hide sections, restore page history, back up and restore sites, and clear the cache. Use this whenever the user asks to change what a FilamentCraft site says or shows without building a new section type: \"add a French version\", \"add an About page\", \"put Pricing in the menu\", \"change the footer\", \"fix the page titles\", \"redirect /old to /new\", \"export the contact messages\", \"why does the site still show old content\", seeders or scripts that write `Template`, `TemplateRevision`, `Region`, `Redirect`, `Media` or `Submission` rows."
license: MIT
---

# Managing FilamentCraft content

A site has **pages** (`Template`), each with an append-only list of **revisions** holding sections per locale; a **head** revision (the draft the editor opens) and a **published** revision (what visitors see). Header, footer and announcement bar are **regions**: one row each, no drafts. SEO, redirects and site settings are plain rows too.

Most content work belongs in the editor. Do it in code when the user asks for a script, a seeder, a bulk change, or a change across many sites, and say what you changed and whether it is live.

## Rules that keep sites safe

1. **Never edit a revision.** Append one (`parent_revision_id` = current head) under a row lock, move `head_revision_id`, fire `TemplateDraftSaved`. Publish with `$template->publishHead()`, never by setting `published_revision_id`. Recipes: [references/pages-and-revisions.md](references/pages-and-revisions.md).
2. **Draft by default.** Leave page changes as a draft unless the user asked for them live, so the team can review them in the editor (History can roll back). Say which it is.
3. **Some writes are live the moment you save**: regions (header/footer/announcement), page SEO (`TemplateSeo::write`), site settings, redirects, slugs, and AI translation of a region. Read the current value first, merge, and tell the user it is live.
4. **Find the site safely.** Site slugs are only unique per owner. Use `Site::query()->forOwner($team)->live()->first()` in tenant apps, an id, or `ExportSiteCommand::findSite()` semantics (id, else a slug only one site uses). Use the model scopes (`forSite`, `published`, `draft`, `forOwner`, `live`) and `Model::query()`; models may be overridden by the host.
5. **Back up before bulk changes**: `php artisan filamentcraft:export <site> --with-history` (a zip you can re-import), or a theme snapshot for settings changes (filamentcraft-theming).
6. **Cache:** publishing (from the editor or `publishHead()`) and seeded publishes flush the site's cached sections and sitemap. After writing regions, SEO, site settings or locales in code, run `php artisan filamentcraft:clear-cache <site>`. Never use `php artisan cache:clear` for this: it also wipes everyone's unsaved editor drafts and undo history.
7. **Host-level SEO files need `filamentcraft.public_routes = true`** (off by default; read when routes load, so `route:clear` after changing it). Without it there is no host `sitemap.xml`, `robots.txt`, `llms.txt`, IndexNow key file or fallback page route. Tenant path mounts (`Route::filamentCraftTenant()`) still serve pages, redirects and a per-tenant sitemap, and `publicUrl()` returns the tenant URL. Only without any public route does `publicUrl()` fall back to the logged-in preview URL.
8. **Presets are not just copy.** `BlueprintSection::fromPreset()` brings effects (`backdrop`, `heading_effect`, `cta_style`), bundled stock photos and dummy links like `/start` onto the site. Blank or override them on a client's real pages.

## Find your task

| Task | Read |
|---|---|
| Create a page, change sections on a page, publish/unpublish, duplicate, rename or move a page (with its redirect), set the homepage, delete a page, restore history, schedule or hide a section | [references/pages-and-revisions.md](references/pages-and-revisions.md) |
| Add a language (and not leave it half-done), copy or AI-translate pages and header/footer, RTL, language switcher, hreflang, `/fr/...` URLs, locale links in host pages | [references/locales-and-translation.md](references/locales-and-translation.md) |
| Header, footer, announcement bar, menu links | [references/regions-and-menus.md](references/regions-and-menus.md) |
| Page titles, descriptions, social images, canonical, noindex, site-wide SEO, sitemap, robots.txt, llms.txt, IndexNow, redirects | [references/seo-and-redirects.md](references/seo-and-redirects.md) |
| Contact and newsletter submissions, notification emails, media library, events to hook into, backups and restore | [references/forms-media-backups.md](references/forms-media-backups.md) |

Building a new section type is the filamentcraft-sections skill; colors and fonts are filamentcraft-theming; creating a whole site from a spec is filamentcraft-site-migration; product data is filamentcraft-storefront.

## Useful commands

```bash
php artisan filamentcraft:sections <slug>          # setting ids, options and blocks of a section type
php artisan filamentcraft:export <site> [--with-history] [--with-submissions]
php artisan filamentcraft:import bundle.zip --replace=<site> --force   # overwrite pages matched by slug (undo: Themes panel)
php artisan filamentcraft:clear-cache [<site>]
php artisan filamentcraft:media-sync [--site=<id>] # register images already used in content
php artisan filamentcraft:doctor                   # SEO, routes, cache, forms and asset checks
```

## Done means

- The change is where the user expects it: draft (visible in the editor and its History) or live (the public URL shows it, checked with `curl` or a browser, for every locale you touched).
- No revision was edited in place, and anything live-on-save was merged, not overwritten.
- Cache cleared if you wrote regions, SEO, settings or locales in code.
- You told the user what changed, what is live, and how to undo it.
