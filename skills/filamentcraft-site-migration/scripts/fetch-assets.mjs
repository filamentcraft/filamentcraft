#!/usr/bin/env node
// Download every image the crawl found into .fc-migration/assets (real format sniffed, deduped, SVG rasterised when Playwright is present).
// Usage: node fetch-assets.mjs [--crawl=.fc-migration/crawl] [--out=.fc-migration/assets] [--min-size=24]
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : 'true'];
}));

const crawlDir = resolve(args.crawl ?? '.fc-migration/crawl');
const outDir = resolve(args.out ?? '.fc-migration/assets');
const minSize = Number(args['min-size'] ?? 24);
const pagesDir = join(crawlDir, 'pages');

if (!existsSync(pagesDir)) {
    console.error(`No crawl found at ${crawlDir}. Run crawl.mjs first.`);
    process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const images = new Map();

for (const slug of readdirSync(pagesDir)) {
    const file = join(pagesDir, slug, 'page.json');
    if (!existsSync(file)) continue;
    const page = JSON.parse(readFileSync(file, 'utf8'));
    for (const section of page.sections ?? []) {
        for (const image of section.images ?? []) {
            if (!image.src || image.src.startsWith('data:')) continue;
            if ((image.width && image.width < minSize) || (image.height && image.height < minSize)) continue;
            const entry = images.get(image.src) ?? { url: image.src, alt: image.alt ?? '', usedOn: new Set() };
            entry.alt ||= image.alt ?? '';
            entry.usedOn.add(page.url);
            images.set(image.src, entry);
        }
        const bg = section.background?.image?.match(/url\(["']?([^"')]+)["']?\)/);
        if (bg && !bg[1].startsWith('data:')) {
            const entry = images.get(bg[1]) ?? { url: bg[1], alt: '', usedOn: new Set(), background: true };
            entry.usedOn.add(page.url);
            images.set(bg[1], entry);
        }
    }
    for (const og of [page.seo?.og?.['og:image']].filter(Boolean)) {
        const entry = images.get(og) ?? { url: og, alt: '', usedOn: new Set(), og: true };
        entry.usedOn.add(page.url);
        images.set(og, entry);
    }
}

function sniff(buffer) {
    const hex = buffer.subarray(0, 12).toString('hex');
    const head = buffer.subarray(0, 256).toString('utf8').trimStart();
    if (hex.startsWith('89504e47')) return 'png';
    if (hex.startsWith('ffd8ff')) return 'jpg';
    if (hex.startsWith('47494638')) return 'gif';
    if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return 'webp';
    if (hex.slice(8, 24) === '6674797061766966' || hex.slice(8, 24) === '6674797061766973') return 'avif';
    if (head.startsWith('<svg') || (head.startsWith('<?xml') && buffer.toString('utf8', 0, 2048).includes('<svg'))) return 'svg';
    return null;
}

let rasterize = null;
try {
    const { chromium } = createRequire(join(process.cwd(), 'package.json'))('playwright');
    const browser = await chromium.launch();
    rasterize = async (svg) => {
        const page = await browser.newPage({ deviceScaleFactor: 2 });
        await page.setContent(`<html><body style="margin:0;background:transparent"><img id="i" src="data:image/svg+xml;base64,${svg.toString('base64')}"></body></html>`);
        const box = await page.locator('#i').boundingBox();
        const png = box && box.width > 0 ? await page.locator('#i').screenshot({ omitBackground: true }) : null;
        await page.close();
        return png;
    };
    rasterize.close = () => browser.close();
} catch {
    // Without Playwright, SVGs are kept as .svg and reported; the importer only takes raster images.
}

const results = [];
const seen = new Map();
let index = 0;

for (const entry of images.values()) {
    index++;
    try {
        const response = await fetch(entry.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FilamentCraftMigration/1.0)' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let buffer = Buffer.from(await response.arrayBuffer());
        let type = sniff(buffer);
        if (type === null) throw new Error(`unknown format (${response.headers.get('content-type')})`);
        if (type === 'svg' && rasterize) {
            const png = await rasterize(buffer);
            if (png) {
                buffer = png;
                type = 'png';
            }
        }
        const hash = createHash('sha256').update(buffer).digest('hex');
        const name = `${hash.slice(0, 16)}.${type}`;
        if (!seen.has(hash)) {
            writeFileSync(join(outDir, name), buffer);
            seen.set(hash, name);
        }
        const host = new URL(entry.url).host;
        results.push({
            url: entry.url,
            file: relative(resolve(outDir, '..'), join(outDir, seen.get(hash))),
            format: type,
            alt: entry.alt,
            bytes: buffer.length,
            host,
            usedOn: [...entry.usedOn],
            ...(entry.background ? { background: true } : {}),
            ...(entry.og ? { og: true } : {}),
        });
        process.stdout.write(`\r${index}/${images.size} downloaded`);
    } catch (error) {
        results.push({ url: entry.url, error: String(error.message ?? error), usedOn: [...entry.usedOn] });
    }
}

await rasterize?.close?.();
writeFileSync(join(outDir, 'assets.json'), JSON.stringify(results, null, 2));

const failed = results.filter((r) => r.error);
const hosts = [...new Set(results.filter((r) => !r.error).map((r) => r.host))];
const svgs = results.filter((r) => r.format === 'svg');
console.log(`\n${results.length - failed.length} images saved to ${outDir} (${seen.size} unique), ${failed.length} failed.`);
console.log(`Hosts: ${hosts.join(', ')}. Images from hosts the site owner doesn't control may be licensed to the old site only; confirm before reusing.`);
if (svgs.length) console.log(`${svgs.length} SVG(s) could not be rasterised (install playwright); convert them to PNG before importing.`);
console.log(`Map of source URL -> local file + alt: ${join(outDir, 'assets.json')}`);
