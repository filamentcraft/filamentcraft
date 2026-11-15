# Photos, credits and preview screenshots

## Photos

Everything a preset shows lives in the host app, under one folder per preset:

```text
public/images/themes/bakery/
├── home.webp       ← card screenshot (generated)
├── hero.webp       ← fixed role names the page builders ask for
├── story.webp
└── CREDITS.md      ← one line per file (template: assets/CREDITS.md)
```

- **Use the user's photos.** If they gave none, ask. If they want you to source them, use a free-licence library they approve (Unsplash, Pexels), download the file (never hotlink), and record the source URL, author and licence in `CREDITS.md`. If you cannot get photos, ship none: the templates set `media_mode`/`media_placement` to `none` when a role file is missing, so the page still looks finished.
- **Local files, root-relative URLs** (`/images/themes/bakery/hero.webp`). A remote URL breaks cards and previews offline and rots; a `/storage/…` URL exists on one site only.
- **Fixed role names** (`hero`, `story`, `team`, `gallery-1`…), so builders call `$type->photo('hero')` and every preset follows the same shape.
- **WebP, about 1600 px wide for a hero**, under ~300 KB. With sharp (installed for the screenshots): `node -e "require('sharp')('in.jpg').resize({ width: 1600 }).webp({ quality: 80 }).toFile('public/images/themes/bakery/hero.webp')"`.
- **Licence must allow use in a product you resell** (site templates). Check it; some free licences forbid templates.
- **People**: prefer products, food, interiors, tools and storefronts. Avoid identifiable people unless the user supplies the photo.
- `FilamentCraft\Support\PresetImage` and `/images/filamentcraft/presets/...` are the package's own stock photos for the built-in presets. Don't use them in host presets.

## Screenshots

The card in the Themes panel shows `screenshots()[0]`, cropped 16:10 from the **top**, and pans down the page on hover; more entries show as thumbnails. Without one the card draws a specimen from `style()` (fonts, button, swatches), which is fine while you work.

Target: a full-page capture at 1440 px viewport, scaled to 800 px wide, WebP quality 80, saved as `public/images/themes/{slug}/home.webp`. The built-ins are 800 × ~4700 px, 85-150 KB.

### 1. Add the local preview route

`FilamentCraft\Theming\Presets\ThemePresetPreview::render($site, $preset, ThemeApplyMode::Full, null, null, $locale)` renders a site as if the preset were applied, in memory, and returns the whole HTML document. Nothing is saved. There is no route for it, so append `assets/preview-routes.php.stub` to `routes/web.php`. It adds, only when `app()->isLocal()`:

- `GET /_presets`: JSON list of registered slugs,
- `GET /_presets/{slug}/{locale?}`: the preset's homepage.

Notes:

- It needs one existing site: the site lends its owner, theme and locales; Full mode ignores its content. In a fresh app create one (`php artisan filamentcraft:starter`) or use the tenant's site when presets read the tenant (`BindsToSite`).
- Full mode renders the homepage only. Other pages are checked by the Pest render test, or by provisioning a site and opening its URLs.
- Confirm with `curl -s http://your-app.test/_presets` before capturing. A 404 usually means `APP_ENV` is not `local` or routes are cached (`php artisan route:clear`).
- Never ship the route to production; the `isLocal()` guard is the minimum.

### 2. Capture

Install the tools once in the app root:

```bash
npm i -D playwright sharp
npx playwright install chromium
```

Run the bundled script from the app root:

```bash
node <skill>/scripts/capture-preset-screenshots.mjs --base=http://shop.test                 # every registered preset
node <skill>/scripts/capture-preset-screenshots.mjs --base=http://shop.test --slugs=bakery  # one
```

`<skill>` is wherever this skill is installed, for example `.claude/skills/filamentcraft-theme-presets` or `vendor/filamentcraft/filamentcraft/resources/boost/skills/filamentcraft-theme-presets`.

Per preset it writes `public/images/themes/{slug}/home.webp`, plus review images `.fc-presets/review/{slug}-desktop.png` and `{slug}-phone.png` (390 px) and `.fc-presets/review/report.json`. It blocks every host except the app and `fonts.bunny.net` (add others with `--allow=cdn.example.com`), waits for fonts, scrolls so lazy images load, and flags: failed sections (`fc-missing-section`), broken images, 4xx/5xx responses, JS errors, sections pinned to a stock scheme, empty sections, and sideways scrolling on a phone. Exit code 2 means at least one preset has problems. Other options: `--out=`, `--review=`, `--width=`, `--resize=`, `--quality=`.

Add `.fc-presets/` to `.gitignore`.

### 3. Look at every image

Open each `*-desktop.png` and `*-phone.png` and check, in this order:

1. Sections that stayed stock teal, or a scheme that does not match the preset.
2. Leftover demo copy ("Acme", "Get started", "Build pages that already look intentional", "© 2026 FilamentCraft").
3. Broken or missing photos, empty frames, stretched images.
4. Text contrast on buttons, badges and the footer.
5. Overflow or cramped text on the phone capture.
6. Headings in a fallback system font (the font slug is wrong, or the capture had no network).
7. Does it look like the business type at a glance? Would two cards in the panel be confused with each other?

Fix, re-run the capture for that slug, look again. Then list the file in `screenshots()` (the templates do this automatically once the file exists).

### Gotchas

- Old headless Chromium builds crash on pages with emoji; use Heroicons in copy and icons.
- Debug bars or host toolbars injected into every page end up in the screenshot; disable them for `/_presets`.
- Arabic or other RTL cards: capture `/_presets/{slug}/ar` and save it as an extra screenshot.
- `ThemePresetPreview` clears the design-token cache before and after each render. If you write your own render loop around `DesignTokenCompiler`, clear it between presets or every capture gets the first preset's colors.
