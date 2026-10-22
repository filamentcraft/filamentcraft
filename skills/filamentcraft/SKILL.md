---
name: filamentcraft
description: "Entry point for FilamentCraft, the visual website builder for Laravel and Filament v4/v5 (filamentcraft/filamentcraft). Use whenever a project uses or should use FilamentCraft: it routes to the focused skills for sections, theming, site migration, storefronts, setup and content management."
license: MIT
---

# FilamentCraft

FilamentCraft sites are pages made of **sections** (PHP classes with settings, repeatable blocks and presets), plus a header/footer, a theme and color schemes. The editor runs in a Filament panel; published sites are ordinary Laravel routes.

## Pick the focused skill

| Task | Skill |
|---|---|
| Create, customize or debug sections | [filamentcraft-sections](https://filamentcraft.dev/.well-known/agent-skills/filamentcraft-sections/SKILL.md) |
| Colors, fonts, schemes, themes, Brand Kit, matching a brand | [filamentcraft-theming](https://filamentcraft.dev/.well-known/agent-skills/filamentcraft-theming/SKILL.md) |
| Move an existing website into FilamentCraft | [filamentcraft-site-migration](https://filamentcraft.dev/.well-known/agent-skills/filamentcraft-site-migration/SKILL.md) |
| Products, catalogs, cart/checkout, product pages | [filamentcraft-storefront](https://filamentcraft.dev/.well-known/agent-skills/filamentcraft-storefront/SKILL.md) |
| Install, tenancy, routing, deploy, troubleshooting | [filamentcraft-setup](https://filamentcraft.dev/.well-known/agent-skills/filamentcraft-setup/SKILL.md) |
| Change a live site: pages, languages, header/footer, menus, SEO, redirects, forms, media, backups | [filamentcraft-content](https://filamentcraft.dev/.well-known/agent-skills/filamentcraft-content/SKILL.md) |

Each skill links its references and scripts relative to its own `SKILL.md`, so fetch them from the same folder.

## Install them in the project

With Laravel Boost, the package ships these skills: `php artisan boost:install` (or `boost:update`) copies them into the project for every agent Boost supports. Without Boost: `npx skills add filamentcraft/filamentcraft`.

## Sources of truth

- `php artisan filamentcraft:sections` lists the sections registered in the app (`<slug>` for one schema, `--json` for scripts); `php artisan filamentcraft:doctor` checks the install; `php artisan filamentcraft:clear-cache` clears cached sections.
- Full docs in one file: https://filamentcraft.dev/llms-full.txt. Any docs page as Markdown: append `.md` to its URL.
