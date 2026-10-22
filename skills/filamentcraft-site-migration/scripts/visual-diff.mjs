#!/usr/bin/env node
// Compare an original page with its FilamentCraft rebuild: text/heading/link parity (gated) plus a pixel diff (reported).
// Usage: node visual-diff.mjs --before=<original url> --after=<rebuilt url> [--viewports=1440,390] [--text-gate=0.9] [--threshold=0.15] [--hide=.cookie-banner]
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Dependencies live in the app or in .fc-migration (where the skill installs them).
const require = (name) => {
    for (const dir of [process.cwd(), join(process.cwd(), '.fc-migration')]) {
        try {
            return createRequire(join(dir, 'package.json'))(name);
        } catch {}
    }
    throw new Error(`Cannot find ${name}`);
};
let chromium, PNG, pixelmatch;
try {
    ({ chromium } = require('playwright'));
    ({ PNG } = require('pngjs'));
    pixelmatch = require('pixelmatch');
    pixelmatch = pixelmatch.default ?? pixelmatch;
} catch {
    console.error('Missing tools. Run: npm i -D playwright pixelmatch pngjs && npx playwright install chromium');
    process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : 'true'];
}));

if (!args.before || !args.after) {
    console.error('Usage: --before=<original url> --after=<rebuilt url>');
    process.exit(1);
}

const viewports = String(args.viewports ?? '1440,390').split(',').map(Number).filter(Boolean);
const threshold = Number(args.threshold ?? 0.15);
const textGate = Number(args['text-gate'] ?? 0.9);
const outDir = resolve(args.out ?? '.fc-migration/diff');
const hide = String(args.hide ?? '').split(',').filter(Boolean);
const label = (args.name ?? new URL(args.after).pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')) || 'home';
mkdirSync(outDir, { recursive: true });

const freeze = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
.fc-reveal,.fc-reveal-stagger>*{opacity:1!important;transform:none!important}
${hide.join(',') || '.__none'}{visibility:hidden!important}`;

async function capture(page, url, width, file) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 45000 }));
    await page.addStyleTag({ content: freeze });
    await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
        await document.fonts?.ready;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: file, fullPage: true });
    const content = await page.evaluate(() => {
        const clean = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
        const main = document.querySelector('main, [role=main]') ?? document.body;
        const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.parentElement?.closest('script,style,noscript,template,svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
        });
        const parts = [];
        while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
        return {
            // Text nodes, not innerText: collapsed accordions and tabs still count as present.
            text: clean(parts.join(' ')),
            headings: [...main.querySelectorAll('h1,h2,h3')].map((h) => clean(h.innerText)).filter(Boolean),
            links: [...main.querySelectorAll('a[href]')].map((a) => new URL(a.href).pathname.replace(/\/$/, '') || '/'),
            images: main.querySelectorAll('img').length,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
    });
    return { png: PNG.sync.read(readFileSync(file)), content };
}

function dice(a, b) {
    const grams = (t) => {
        const words = t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
        const out = new Map();
        for (let i = 0; i < words.length - 1; i++) out.set(words[i] + ' ' + words[i + 1], (out.get(words[i] + ' ' + words[i + 1]) ?? 0) + 1);
        return out;
    };
    const x = grams(a);
    const y = grams(b);
    let overlap = 0;
    for (const [gram, count] of x) overlap += Math.min(count, y.get(gram) ?? 0);
    const total = [...x.values()].reduce((n, c) => n + c, 0) + [...y.values()].reduce((n, c) => n + c, 0);
    return total ? (2 * overlap) / total : 1;
}

const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function pad(png, width, height) {
    const out = new PNG({ width, height });
    out.data.fill(255);
    PNG.bitblt(png, out, 0, 0, Math.min(png.width, width), Math.min(png.height, height), 0, 0);
    return out;
}

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

for (const width of viewports) {
    const original = await capture(page, args.before, width, join(outDir, `${label}-${width}-before.png`));
    const rebuilt = await capture(page, args.after, width, join(outDir, `${label}-${width}-after.png`));
    const before = original.png;
    const after = rebuilt.png;
    const w = Math.max(before.width, after.width);
    const h = Math.max(before.height, after.height);
    const a = pad(before, w, h);
    const b = pad(after, w, h);
    const diff = new PNG({ width: w, height: h });
    const changed = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1, includeAA: false });
    writeFileSync(join(outDir, `${label}-${width}-diff.png`), PNG.sync.write(diff));
    const ratio = changed / (w * h);
    const heightDelta = Math.abs(before.height - after.height) / Math.max(before.height, 1);
    const textParity = dice(original.content.text, rebuilt.content.text);
    const rebuiltHeadings = rebuilt.content.headings.map(norm);
    const missingHeadings = original.content.headings.filter((h) => !rebuiltHeadings.includes(norm(h)));
    const missingLinks = [...new Set(original.content.links)].filter((l) => !rebuilt.content.links.includes(l));
    const pass = textParity >= textGate && missingHeadings.length === 0 && !rebuilt.content.overflow;
    results.push({
        width,
        pass,
        textParity: Number(textParity.toFixed(3)),
        missingHeadings,
        missingLinks,
        images: { before: original.content.images, after: rebuilt.content.images },
        horizontalOverflow: rebuilt.content.overflow,
        pixelMismatch: Number(ratio.toFixed(4)),
        pixelWithinThreshold: ratio <= threshold,
        height: { before: before.height, after: after.height, delta: Number(heightDelta.toFixed(3)) },
    });
}

await browser.close();
writeFileSync(join(outDir, `${label}.json`), JSON.stringify({ before: args.before, after: args.after, threshold, results }, null, 2));
for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.width}px  text ${(r.textParity * 100).toFixed(0)}%  pixels ${(r.pixelMismatch * 100).toFixed(1)}%  height ${r.height.before} -> ${r.height.after}${r.horizontalOverflow ? '  HORIZONTAL OVERFLOW' : ''}`);
    if (r.missingHeadings.length) console.log(`  missing headings: ${r.missingHeadings.slice(0, 8).join(' | ')}`);
    if (r.missingLinks.length) console.log(`  missing links: ${r.missingLinks.slice(0, 8).join(' ')}`);
}
console.log(`Images in ${outDir} (look at the *-diff.png and the before/after pairs, not only the number).`);
process.exit(results.every((r) => r.pass) ? 0 : 2);
