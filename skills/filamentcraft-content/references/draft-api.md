# Draft API

`FilamentCraft\Pages\SiteEditor` edits the sections of an existing page or region without touching revisions by hand. Prefer it over the raw revision recipe in pages-and-revisions.md. Full guide: https://filamentcraft.dev/guide/draft-api

```php
use FilamentCraft\Pages\Exceptions\StaleDraft;
use FilamentCraft\Pages\SiteEditor;

$draft = SiteEditor::for($site)->page('about');          // Template, key or slug; ->forLocale('fr') for another locale

$draft->sections();                                      // read; ->section($id), ->schema('hero') for setting ids
$id = $draft->addSection(['type' => 'faq'], index: 1);   // index null appends
$draft->updateSection($id, ['heading' => 'Hi']);         // merges settings; blocks: replaces the list when given
$draft->moveSection($id, 0);                             // zero-based, clamped
$draft->removeSection($id);

$draft->save(summary: 'Fix copy', by: $user);            // draft only
$draft->publish();                                       // save if dirty, then publishHead()
```

- Nothing is written until `save()` or `publish()`. A clean draft writes nothing.
- `StaleDraft` is thrown when someone else saved the page since you loaded it. Reload and redo the change; pass `force: true` only when the user asked to overwrite.
- Errors throw `InvalidPageSpec`; `$e->errors` are `SpecIssue` objects (`code`, `path`, `message`, `toArray()`). Warnings collect on `$draft->warnings()`; open the draft with `strict: true` to throw on them.
- Locked sections cannot be moved or removed (`section_locked`).
- `SiteEditor::for($site)->region(RegionName::Footer)` edits a region with the same methods, but regions have no drafts: `save()` is live at once. Clear nothing by hand; it flushes the site cache.
- `SiteEditorSaved` fires once per save, after commit, for audit or billing.
- `SiteEditor::for($site)->pages()` lists the site's pages (`PageSummary`). `revisePage($page, ['sections' => [...], 'translations' => [...]])` saves a spec as a new draft revision when you want to replace a list of sections rather than change single ones; `revisePageFromBlueprint($page, locales: ['fr'])` reseeds only those languages. Neither publishes.
- To draft a whole site from a brief, queue it: `app(\FilamentCraft\Ai\SiteGeneration\SiteGenerator::class)->queue($site, $brief)` returns a run id, writes drafts only, and fires `SiteGenerationPageCompleted`, `SiteGenerationFinished` or `SiteGenerationFailed`; `->run($id)` reads progress. There is no facade method for the editor or for generation.
- Extra photo tabs in the media picker (`imageSources()`, `UnsplashImageSource`) are plugin config, not content code; see https://filamentcraft.dev/guide/image-sources. The on-page photo credit follows `showImageCredits()`.
- The class does not check who is calling. Resolve the site with `TenancyResolver::resolveAccessibleSite()` or your own policy first.
