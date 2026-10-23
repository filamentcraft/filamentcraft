# Page blueprints

A blueprint is a class describing one page. `slug()` becomes the page slug (made unique per site) and the stable `blueprint_slug`; `name()` is the page title.

```php
namespace App\Blueprints;

use FilamentCraft\Blueprints\AbstractBlueprint;
use FilamentCraft\Blueprints\BlueprintSection;
use FilamentCraft\Sections\Builtin\ProductListingSection;

final class ShopBlueprint extends AbstractBlueprint
{
    public function name(): string { return 'Shop'; }

    public function slug(): string { return 'shop'; }

    public function sections(): array
    {
        return [BlueprintSection::fromPreset(ProductListingSection::class, 'modern')];
    }
}
```

Seed it: `app(\FilamentCraft\Blueprints\BlueprintSeeder::class)->seedOne($site, new ShopBlueprint, publish: true)`.

Every commerce section (`ProductListingSection`, `ProductDetailSection`, `ProductCarouselSection`, `CategoryGridSection`, `CartSection`, `CheckoutSection`) has the four preset slugs `modern`, `editorial`, `bold`, `elegant`; they pin the schemes `modern`, `silk`, `velocity`, `neutral`. `StoreHeroSection` has the same four.

`->settings([...])` replaces the preset's settings, so spread `$section->getSettings()` to keep them.
