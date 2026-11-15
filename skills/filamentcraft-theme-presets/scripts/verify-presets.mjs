#!/usr/bin/env node
// Pre-flight for theme presets: doctor and strict preset checks, source lint, image folders and credits, then the Pest test.
// Usage (from the app root): node verify-presets.mjs --src=app/Shop,app/Themes/Presets [--images=public/images/themes]
//        [--slugs=bakery,fashion] [--test=tests/Feature/ShopPresetsTest.php] [--php=php]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : 'true'];
}));

const php = args.php ?? 'php';
const sources = (args.src ?? 'app/Themes/Presets').split(',').filter(Boolean);
const images = args.images ?? 'public/images/themes';
const errors = [];
const warnings = [];

const run = (command, list) => spawnSync(command, list, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const doctor = run(php, ['artisan', 'filamentcraft:doctor', '--json', '--no-interaction']);
try {
    const report = JSON.parse(doctor.stdout.slice(doctor.stdout.indexOf('{')));
    for (const check of report.checks) {
        if (check.status !== 'pass' && /preset/i.test(check.label)) {
            errors.push(`doctor: ${check.label}: ${check.hint}`);
        }
        if (check.status === 'fail') {
            warnings.push(`doctor (not preset-related): ${check.label}: ${check.hint}`);
        }
    }
    const presets = report.checks.find((check) => /^Theme presets \(/.test(check.label));
    console.log(`doctor: ${presets ? presets.label : 'no theme preset check reported'}`);
} catch {
    errors.push(`doctor did not return JSON (exit ${doctor.status}): ${(doctor.stderr || doctor.stdout).trim().split('\n').slice(0, 5).join(' ')}`);
}

// filamentcraft:presets exists from 1.41.29; older releases only get the doctor checks above.
const listed = run(php, ['artisan', 'filamentcraft:presets', '--json', '--no-interaction']);
const listStart = listed.stdout.indexOf('[');
if (listStart !== -1) {
    try {
        const registered = JSON.parse(listed.stdout.slice(listStart));
        const wanted = args.slugs ? args.slugs.split(',') : null;
        for (const preset of registered) {
            if (preset.builtin || (wanted && !wanted.includes(preset.slug))) {
                continue;
            }
            preset.problems.forEach((problem) => errors.push(`presets [${preset.slug}]: ${problem}`));
            preset.warnings.forEach((warning) => errors.push(`presets [${preset.slug}] strict: ${warning}`));
        }
        (wanted ?? []).filter((slug) => !registered.some((preset) => preset.slug === slug))
            .forEach((slug) => errors.push(`presets: [${slug}] is not registered`));
        console.log(`presets: ${registered.filter((preset) => !preset.builtin).length} host preset(s) checked strictly`);
    } catch {
        warnings.push('filamentcraft:presets --json did not return JSON; skipped the strict preset checks');
    }
}

const walk = (dir) => existsSync(dir)
    ? readdirSync(dir).flatMap((name) => statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)])
    : [];

const lint = [
    [/['"]https?:\/\/[^'"]+\.(?:jpe?g|png|webp|gif|avif|svg)(?:\?[^'"]*)?['"]/gi, 'error', 'hotlinked image: ship it under public/images/themes/{slug}/ and use a root-relative URL'],
    [/['"][^'"]*\/storage\/[^'"]*['"]/g, 'error', 'media-library URL from one site: copy the file to public/images/themes/{slug}/'],
    [/PresetImage::/g, 'error', 'PresetImage points at the package\'s own photos: use your own files'],
    [/['"]scheme['"]\s*=>\s*['"](?:modern|silk|velocity|neutral)['"]/g, 'warn', 'section pinned to a stock scheme: use ColorSchemes::INHERIT unless that is deliberate'],
    [/BlueprintSection::fromPreset\(/g, 'warn', 'fromPreset() brings the family\'s pinned scheme, stock photos and dummy links: override scheme, images and copy'],
    [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, 'warn', 'emoji in copy: old headless Chromium crashes on them; use Heroicons'],
];

for (const file of sources.flatMap(walk).filter((file) => ['.php'].includes(extname(file)))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
        for (const [pattern, level, message] of lint) {
            pattern.lastIndex = 0;
            if (pattern.test(line)) {
                (level === 'error' ? errors : warnings).push(`${file}:${index + 1}: ${message}`);
            }
        }
    });
}

if (!sources.some(existsSync)) {
    warnings.push(`none of --src=${sources.join(',')} exist: pass the folders that hold your preset classes`);
}

const slugs = args.slugs ? args.slugs.split(',') : (existsSync(images) ? readdirSync(images).filter((name) => statSync(join(images, name)).isDirectory()) : []);
for (const slug of slugs) {
    const dir = join(images, slug);
    if (!existsSync(join(dir, 'home.webp'))) {
        errors.push(`${dir}/home.webp is missing: run capture-preset-screenshots.mjs`);
    }
    const files = existsSync(dir) ? readdirSync(dir).filter((name) => /\.(?:webp|jpe?g|png|avif|svg)$/i.test(name)) : [];
    const credits = existsSync(join(dir, 'CREDITS.md')) ? readFileSync(join(dir, 'CREDITS.md'), 'utf8') : null;
    if (credits === null) {
        errors.push(`${dir}/CREDITS.md is missing`);
    }
    for (const name of files) {
        if (credits !== null && !credits.includes(name)) {
            errors.push(`${dir}/${name} has no line in CREDITS.md`);
        }
        const size = statSync(join(dir, name)).size;
        if (size > 600 * 1024) {
            warnings.push(`${dir}/${name} is ${Math.round(size / 1024)} KB: resize (1600px wide is plenty) and convert to WebP`);
        }
    }
}

if (args.test) {
    const pest = existsSync('vendor/bin/pest') ? ['vendor/bin/pest', [args.test]] : [php, ['artisan', 'test', args.test]];
    const result = run(...pest);
    const tail = (result.stdout + result.stderr).trim().split('\n').slice(-12).join('\n');
    console.log(`\ntests (${args.test}):\n${tail}`);
    if (result.status !== 0) {
        errors.push(`tests failed: ${args.test}`);
    }
}

for (const warning of warnings) console.log(`WARN  ${warning}`);
for (const error of errors) console.log(`ERROR ${error}`);
console.log(errors.length ? `\n${errors.length} error(s), ${warnings.length} warning(s).` : `\nNo errors, ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
