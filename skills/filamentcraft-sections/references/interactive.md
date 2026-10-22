# Interactive sections: Livewire, Alpine, islands

## Contents
- Choosing
- LivewireSection
- Alpine in a BladeSection
- IslandSection (React/Vue)

## Choosing

| Need | Use |
|---|---|
| Open/close, tabs, toggles, client-only state | Alpine inside a `BladeSection` |
| Server round-trips: forms, add to cart, search, anything persisted | `LivewireSection` |
| An existing React/Vue component, or rich client UI (configurator, calculator) | `IslandSection` |

## LivewireSection

```php
use FilamentCraft\Sections\LivewireSection;

final class QuoteRequestSection extends LivewireSection
{
    protected static string $view = 'sections.quote-request';

    public string $email = '';

    public bool $sent = false;

    public static function slug(): string
    {
        return 'quote-request';
    }

    public static function settings(): array
    {
        return [Text::make('title')->label('Title')->default('Get a quote')];
    }

    public static function cacheable(): bool
    {
        return false;
    }

    public function submit(): void
    {
        $this->validate(['email' => 'required|email']);
        // persist or dispatch an event
        $this->sent = true;
    }
}
```

```blade
<form wire:submit="submit" class="fc-container mx-auto px-6 py-16">
    <h2 {!! $section->liveUpdate('title') !!} class="fc-title">{{ $section->settings->get('title') }}</h2>
    @if ($sent)
        <p class="mt-4">Thanks, we'll be in touch.</p>
    @else
        <input type="email" wire:model="email" class="fc-input mt-6 w-full">
        <button type="submit" class="fc-btn fc-btn-primary mt-4">Send</button>
    @endif
</form>
```

Rules, each one a real production failure:

- **Single root element first.** Nothing may print above the root tag: no `@if`, `@foreach`, HTML or Blade comment. Blade turns conditionals into `<!--[if BLOCK]>` markers, and a marker above the root leaves later-inserted controls inert with no error. Put conditions on the root (`<div @if ($hidden) hidden @endif>`) and computations in a `@php … @endphp` block, which prints nothing. With `APP_DEBUG=true` FilamentCraft throws naming the view.
- **Register it.** Classes in `app/Sections` are discovered. Anywhere else, use `->registerSection()` or `filamentcraft.sections.register`. An unregistered Livewire section works in `Livewire::test()` but 419s on every wire action on the live site. Click through it in a browser once.
- `$section` survives every round trip, so `$section->settings->get()` works after `wire:submit`. Extra state goes in public properties.
- Don't add `@livewireScripts`, `@livewireStyles` or your own Alpine/Livewire. FilamentCraft injects them only on pages that need them, and a second copy breaks both.
- `@push('fc-scripts')` inside a section view never reaches the layout, because sections render as standalone, cacheable fragments. Push page-level assets from the page that renders `<x-filamentcraft::layout>`.
- Return `cacheable(): false` when output depends on the session, cart, user, time or CSRF.
- For forms, reuse `FilamentCraft\Sections\Concerns\GuardsFormSubmissions` (honeypot, throttling, editor-preview guard) like the built-in Contact and Newsletter sections. Those built-ins dispatch `ContactFormSubmitted` / `NewsletterSubscribed`; listen to those events rather than rebuilding them.

## Alpine in a BladeSection

- Write Alpine directives directly (`x-data` on inner elements, `@click`, `x-show`). FilamentCraft wraps the section in an `x-data` root when it sees a directive, so **don't put `x-data` on your outermost element**.
- At least one directive must be inline in the markup. A section whose Alpine lives only in an external `Alpine.data()` isn't detected.
- Don't put values that change between Livewire renders inside an `x-data` attribute; Alpine rebuilds that state and open drawers close. Seed them from a `data-*` attribute in `init()`.

## IslandSection (React/Vue)

```bash
php artisan make:filamentcraft-island PricingCalculator --react   # or --vue
npm run build
```

This writes the section class, `resources/js/islands/PricingCalculator.tsx`, the islands entry `resources/js/filamentcraft-islands.ts`, a Tailwind file for island utilities, and the Vite input.

- Settings, blocks and presets are declared in PHP as usual. The component gets every setting as a prop (defaults filled), `blocks` as `[{id, type, …settings}]`, and `island: {editing, locale, dir}`. Images arrive as `{url, alt, width, height, srcset}`, links as `{href, label, external, target}`, rich text as sanitised HTML.
- `$component` (defaults to the slug), `$fallback` (a Blade view for crawlers and no-JS visitors; it receives `$section`), `$contained` (container width, default true). Override `props()` with `[...parent::props($section), 'extra' => …]`.
- No `liveUpdate`; a settings change re-renders the island and keeps its state.
- Needs `filamentcraft.assets.site_js_enabled`, and `filamentcraft:doctor` checks the islands entry is in the Vite build.
- Search engines only see `$fallback`, so give content-heavy islands a real fallback view.
