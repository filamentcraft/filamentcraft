<?php

// Lists the Tailwind utilities and fc-* classes a section view uses that the shipped site.css (plus any --css files) lacks.
// Usage: php check-classes.php resources/views/sections/services.blade.php [more views] [--css=public/build/assets/app.css]

declare(strict_types=1);

$views = [];
$stylesheets = [];

foreach (array_slice($argv, 1) as $argument) {
    if (str_starts_with($argument, '--css=')) {
        $stylesheets[] = substr($argument, 6);
    } else {
        $views[] = $argument;
    }
}

$candidates = [
    getcwd().'/vendor/filamentcraft/filamentcraft/resources/dist/site.css',
    dirname(__DIR__, 5).'/resources/dist/site.css',
];

$siteCss = null;

foreach ($candidates as $candidate) {
    if (is_file($candidate)) {
        $siteCss = $candidate;
        break;
    }
}

if ($views === [] || $siteCss === null) {
    fwrite(STDERR, $siteCss === null
        ? "Run this from the Laravel app root: vendor/filamentcraft/filamentcraft/resources/dist/site.css was not found.\n"
        : "Usage: php check-classes.php <view.blade.php> [...] [--css=path/to/your-build.css]\n");
    exit(1);
}

$css = (string) file_get_contents($siteCss);

foreach ($stylesheets as $stylesheet) {
    $css .= is_file($stylesheet) ? (string) file_get_contents($stylesheet) : '';
}

$utility = '/^(?:[a-z0-9-]+:)*-?(?:p[xytblrse]?|m[xytblrse]?|w|h|size|min-[wh]|max-[wh]|gap(?:-[xy])?|space-[xy]|text|font|leading|tracking|bg|from|via|to|border|rounded|shadow|ring|outline|divide|grid-cols|grid-rows|col-(?:span|start|end)|row-span|flex|grid|inline|block|hidden|items|justify|self|place|content|order|z|top|bottom|left|right|inset|start|end|opacity|aspect|object|overflow|line-clamp|truncate|whitespace|break|uppercase|lowercase|capitalize|italic|underline|decoration|translate|rotate|scale|skew|transition|duration|ease|delay|animate|cursor|select|pointer-events|fill|stroke|basis|grow|shrink|columns|list|sr-only|backdrop|blur|fc)(?:-|$|\[)/';
$escape = static fn (string $class): string => '.'.preg_replace('/([:\/\[\]\.\(\)%#,=!&@>+~*])/', '\\\\$1', $class);
$missing = [];

foreach ($views as $view) {
    $source = is_file($view) ? (string) file_get_contents($view) : '';
    $source = (string) preg_replace('/\{\{.*?\}\}|\{!!.*?!!\}/s', ' ', $source);
    $chunks = [];

    preg_match_all('/\bclass="([^"]*)"/', $source, $attributes);
    $chunks = array_merge($chunks, $attributes[1]);

    preg_match_all('/@class\((.*?)\)\s*(?:>|\n|\/>| [a-z:@])/s', $source, $directives);

    foreach ($directives[1] as $directive) {
        preg_match_all("/(?:^|[\\[,]\\s*)'([^']*)'\\s*(?:=>|,|\\]|$)/", trim($directive), $strings);
        $chunks = array_merge($chunks, $strings[1]);
    }

    foreach ($chunks as $chunk) {
        foreach (preg_split('/\s+/', trim($chunk)) ?: [] as $class) {
            if ($class === '' || preg_match('/[$@{}()]|^-$|^(group|peer)(\/|$)/', $class) === 1) {
                continue;
            }

            if (preg_match($utility, $class) === 1 && ! str_contains($css, $escape($class))) {
                $missing[$class][] = basename($view);
            }
        }
    }
}

$unknownFc = array_filter($missing, static fn (string $class): bool => str_starts_with($class, 'fc-'), ARRAY_FILTER_USE_KEY);
$missing = array_diff_key($missing, $unknownFc);
ksort($missing);
ksort($unknownFc);

foreach ($unknownFc === [] ? [] : ['fc-* classes site.css does not style (fine as your own hook, otherwise a typo):' => $unknownFc] as $heading => $classes) {
    echo $heading."\n";

    foreach ($classes as $class => $files) {
        echo "  {$class}  (".implode(', ', array_unique($files)).")\n";
    }

    echo "\n";
}

if ($missing === []) {
    echo "OK: every utility class is defined.\n";
    exit(0);
}

echo "Utilities missing from site.css (they silently do nothing):\n";

foreach ($missing as $class => $files) {
    echo "  {$class}  (".implode(', ', array_unique($files)).")\n";
}

echo "\nUse an fc-* primitive or a utility the package ships, an inline style with var(--fc-color-*), or compile your own Tailwind and pass it with --css=.\n";
exit(2);
