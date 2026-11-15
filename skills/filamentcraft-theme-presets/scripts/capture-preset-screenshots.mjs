#!/usr/bin/env node
// Capture a card screenshot for every theme preset from the local /_presets preview route, and flag render problems.
// Usage: node capture-preset-screenshots.mjs --base=http://shop.test [--slugs=bakery,fashion] [--out=public/images/themes]
//        [--review=.fc-presets/review] [--width=1440] [--resize=800] [--quality=80] [--allow=cdn.example.com,…]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = (name) => createRequire(join(process.cwd(), 'package.json'))(name);
let chromium, sharp;
try {
    ({ chromium } = require('playwright'));
    sharp = require('sharp');
} catch {
    console.error('Missing tools. Run from the app root: npm i -D playwright sharp && npx playwright install chromium');
    process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : 'true'];
}));

const base = (args.base ?? process.env.APP_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const out = args.out ?? 'public/images/themes';
const review = args.review ?? '.fc-presets/review';
const width = Number(args.width ?? 1440);
const resize = Number(args.resize ?? 800);
const quality = Number(args.quality ?? 80);
const allowed = new Set([new URL(base).host, 'fonts.bunny.net', ...(args.allow ? args.allow.split(',') : [])]);
const stockSchemes = new Set(['modern', 'silk', 'velocity', 'neutral', 'light', 'dark', 'default']);

let slugs = args.slugs ? args.slugs.split(',').filter(Boolean) : null;
if (!slugs) {
    const response = await fetch(`${base}/_presets`).catch(() => null);
    if (!response?.ok) {
        console.error(`GET ${base}/_presets failed. Add the preview routes (assets/preview-routes.php.stub) and check APP_ENV=local.`);
        process.exit(1);
    }
    slugs = await response.json();
}

mkdirSync(review, { recursive: true });
const browser = await chromium.launch();
const report = [];

const settle = async (page) => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 80));
        }
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
};

const open = async (context, url, problems) => {
    const page = await context.newPage();
    await page.route('**/*', (route) => {
        const target = route.request().url();
        return target.startsWith('data:') || allowed.has(new URL(target).host) ? route.continue() : route.abort();
    });
    page.on('pageerror', (error) => problems.push(`JS error: ${error.message}`));
    page.on('response', (response) => {
        if (response.status() >= 400 && allowed.has(new URL(response.url()).host)) {
            problems.push(`HTTP ${response.status()}: ${response.url()}`);
        }
    });
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    if (!response?.ok()) {
        problems.push(`preview returned HTTP ${response?.status()}`);
    }
    await settle(page);
    return page;
};

for (const slug of slugs) {
    const problems = [];
    const url = `${base}/_presets/${slug}`;

    const desktop = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await open(desktop, url, problems);
    const facts = await page.evaluate(() => ({
        html: document.documentElement.outerHTML.includes('fc-missing-section'),
        brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.getAttribute('src')),
        site: document.documentElement.getAttribute('data-fc-color-scheme'),
        schemes: [...document.body.querySelectorAll('[data-fc-color-scheme]')].map((el) => el.getAttribute('data-fc-color-scheme')),
        emptySections: [...document.querySelectorAll('section')].filter((el) => el.innerText.trim() === '' && !el.querySelector('img,video,iframe,form')).length,
    }));
    if (facts.html) problems.push('a section failed to render (fc-missing-section)');
    for (const src of facts.brokenImages) problems.push(`broken image: ${src}`);
    const pinned = [...new Set(facts.schemes.filter((scheme) => scheme !== facts.site && stockSchemes.has(scheme)))];
    if (pinned.length) problems.push(`sections pinned to stock schemes ${pinned.join(', ')}: set 'scheme' => ColorSchemes::INHERIT`);
    if (facts.emptySections) problems.push(`${facts.emptySections} section(s) render no visible content`);

    const png = await page.screenshot({ fullPage: true, type: 'png' });
    mkdirSync(join(out, slug), { recursive: true });
    const cover = join(out, slug, 'home.webp');
    await sharp(png).resize({ width: resize }).webp({ quality }).toFile(cover);
    await sharp(png).resize({ width: resize }).png().toFile(join(review, `${slug}-desktop.png`));
    await desktop.close();

    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const mobile = await open(phone, url, problems);
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`phone layout scrolls sideways by ${overflow}px`);
    await sharp(await mobile.screenshot({ fullPage: true, type: 'png' })).resize({ width: 390 }).png().toFile(join(review, `${slug}-phone.png`));
    await phone.close();

    report.push({ slug, cover, review: [join(review, `${slug}-desktop.png`), join(review, `${slug}-phone.png`)], problems: [...new Set(problems)] });
    console.log(`${problems.length ? 'WARN' : 'ok  '} ${slug}: ${cover}${problems.length ? '\n     - ' + [...new Set(problems)].join('\n     - ') : ''}`);
}

await browser.close();
writeFileSync(join(review, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\nReview images and report: ${review}/. Open every *-desktop.png and *-phone.png before you call a preset done.`);
process.exit(report.some((entry) => entry.problems.length) ? 2 : 0);
