# Testing sections

`FilamentCraft\Testing\SectionDataFactory` builds the same `SectionData` the editor and renderer use, so value objects (`ImageValue`, `LinkValue`, color schemes) come out exactly as in production.

```php
use App\Sections\ServicesSection;
use FilamentCraft\Testing\SectionDataFactory;

it('renders the defaults', function (): void {
    $defaults = ServicesSection::defaults();

    $html = ServicesSection::renderToHtml(
        SectionDataFactory::for(ServicesSection::class)
            ->settings($defaults['settings'])
            ->blocks($defaults['blocks'])
            ->make(),
    );

    expect($html)->toContain('What we do')->toContain('fc-container');
});

it('renders every preset', function (string $slug): void {
    $preset = collect(ServicesSection::presets())->firstWhere('slug', $slug);

    $html = ServicesSection::renderToHtml(
        SectionDataFactory::for(ServicesSection::class)->settings($preset->settings)->blocks($preset->blocks)->make(),
    );

    expect($html)->toContain(e($preset->settings['title']));
})->with(['modern', 'editorial', 'bold', 'elegant']);

it('ships the four style-family presets', function (): void {
    expect(array_map(fn ($preset) => $preset->slug, ServicesSection::presets()))
        ->toBe(['modern', 'editorial', 'bold', 'elegant']);
});

it('hides an empty grid from visitors but hints in the editor', function (): void {
    $published = ServicesSection::renderToHtml(SectionDataFactory::for(ServicesSection::class)->make());
    $editor = ServicesSection::renderToHtml(SectionDataFactory::for(ServicesSection::class)->designMode()->make());

    expect($published)->not->toContain('Add a service')
        ->and($editor)->toContain('Add a service');
});
```

Builder methods: `for($class)`, `id()`, `settings([...])`, `blocks([...])`, `designMode()`, `withSite($site)` (needed when the view reads `$section->site`), `locale('fr')`, `pageColorScheme('modern')`, `context(RenderContext)`, `make()`, and for Livewire sections `test($params)`.

## Livewire sections

```php
SectionDataFactory::for(QuoteRequestSection::class)
    ->settings(['title' => 'Get a quote'])
    ->test()
    ->set('email', 'a@b.test')
    ->call('submit')
    ->assertSet('sent', true)
    ->assertSee('Get a quote');
```

`Livewire::test()` passes even for an unregistered section, which 419s on the real site. Keep one manual browser check per interactive section.

## In the app

- `php artisan filamentcraft:sections services` confirms registration and the schema.
- `php artisan filamentcraft:doctor` reports unknown section types in published pages and sections that failed to render on the live site.
- Run Pest with `--parallel`.
- Host-side tests: `config(['filamentcraft.public_routes' => true])` inside a test body registers nothing (routes are read at load), so set it before boot (Testbench `defineEnvironment()`). Call `ImageSizeResolver::reset()` after a test that registers `imageSizesUsing()`; it is process-wide. Mount a Livewire section with `Livewire::test(Class::class, ['section' => $data])` (the factory's `->test()` does this).
