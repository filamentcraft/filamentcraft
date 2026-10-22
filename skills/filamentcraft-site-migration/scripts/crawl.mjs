#!/usr/bin/env node
// Crawl a site the user owns into .fc-migration/crawl: inventory, template groups, section crops, tokens, SEO.
// Usage: node crawl.mjs --url=https://example.com [--max-pages=40] [--viewports=1440,390] [--include=/shop] [--exclude=/cart]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
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
let chromium;
try {
    ({ chromium } = require('playwright'));
} catch {
    console.error('playwright is not installed here or in .fc-migration. Run: npm i -D playwright && npx playwright install chromium');
    process.exit(1);
}

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    return [key, rest.length ? rest.join('=') : 'true'];
}));

if (!args.url) {
    console.error('Missing --url=https://example.com');
    process.exit(1);
}

const start = new URL(args.url);
const maxPages = Number(args['max-pages'] ?? 40);
const outDir = resolve(args.out ?? '.fc-migration/crawl');
const viewports = String(args.viewports ?? '1440,390').split(',').map(Number).filter(Boolean);
const include = args.include ? String(args.include).split(',') : [];
const exclude = String(args.exclude ?? '/wp-admin,/wp-login,/cart,/checkout,/account,/my-account,/login,/logout,/feed')
    .split(',').filter(Boolean);
const delay = Number(args.delay ?? 300);
const skipExtensions = /\.(pdf|zip|jpe?g|png|gif|webp|avif|svg|mp4|webm|mp3|xml|json|txt|ico|css|js)$/i;

mkdirSync(join(outDir, 'pages'), { recursive: true });

const disallowed = [];

async function loadRobots(context) {
    try {
        const response = await context.request.get(new URL('/robots.txt', start).toString(), { timeout: 10000 });
        if (!response.ok()) return;
        let applies = false;
        for (const raw of (await response.text()).split('\n')) {
            const line = raw.split('#')[0].trim();
            const [field, ...rest] = line.split(':');
            const value = rest.join(':').trim();
            if (/^user-agent$/i.test(field)) applies = value === '*';
            else if (applies && /^disallow$/i.test(field) && value) disallowed.push(value.replace(/\*.*$/, ''));
        }
    } catch {
        // Unreachable robots.txt means no restrictions were published.
    }
}

function normalise(href, base) {
    try {
        const url = new URL(href, base);
        url.hash = '';
        if (url.origin !== start.origin) return null;
        if (skipExtensions.test(url.pathname)) return null;
        if (exclude.some((prefix) => url.pathname.startsWith(prefix))) return null;
        if (args['ignore-robots'] !== 'true' && disallowed.some((prefix) => url.pathname.startsWith(prefix))) return null;
        if (include.length && !include.some((prefix) => url.pathname.startsWith(prefix)) && url.pathname !== '/') return null;
        for (const key of [...url.searchParams.keys()]) {
            if (/^(utm_|fbclid|gclid|ref$|sort|filter|page$|orderby)/.test(key)) url.searchParams.delete(key);
        }
        return url.toString().replace(/\/$/, '') || url.origin;
    } catch {
        return null;
    }
}

function slugFor(url) {
    const path = new URL(url).pathname.replace(/^\/|\/$/g, '');
    return (path || 'home').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
}

function patternFor(url) {
    return new URL(url).pathname
        .split('/')
        .map((part) => (/^\d+$/.test(part) ? ':id' : part))
        .map((part, index, parts) => (index === parts.length - 1 && parts.length > 2 ? ':slug' : part))
        .join('/') || '/';
}

async function sitemapUrls(context) {
    const found = new Set();
    const queue = [new URL('/sitemap.xml', start).toString(), new URL('/sitemap_index.xml', start).toString()];
    const seen = new Set();
    while (queue.length && found.size < maxPages * 5) {
        const sitemap = queue.shift();
        if (seen.has(sitemap)) continue;
        seen.add(sitemap);
        try {
            const response = await context.request.get(sitemap, { timeout: 15000 });
            if (!response.ok()) continue;
            const xml = await response.text();
            for (const [, loc] of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
                if (/\.xml(\?|$)/.test(loc)) queue.push(loc);
                else {
                    const url = normalise(loc, start);
                    if (url) found.add(url);
                }
            }
        } catch {
            // No sitemap is normal; link discovery covers it.
        }
    }
    return [...found];
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((done) => {
            let total = 0;
            const timer = setInterval(() => {
                window.scrollBy(0, 600);
                total += 600;
                if (total >= document.body.scrollHeight || total > 20000) {
                    clearInterval(timer);
                    window.scrollTo(0, 0);
                    done();
                }
            }, 80);
        });
    });
    await page.waitForTimeout(400);
}

function extractPage() {
    const text = (el) => (el?.innerText ?? '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 24 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const meta = (selector) => document.querySelector(selector)?.getAttribute('content') ?? null;

    const roots = [];
    const header = [...document.querySelectorAll('[role=banner], body > header, header, body > div > header, nav')]
        .find((el) => visible(el) && el.getBoundingClientRect().top + scrollY < 240 && el.getBoundingClientRect().height <= 260 && el.querySelectorAll('a').length >= 2) ?? null;
    if (header && visible(header)) roots.push({ el: header, region: 'header' });
    const footer = [...document.querySelectorAll('[role=contentinfo], body > footer, footer')].at(-1) ?? null;
    const main = document.querySelector('main, [role=main], #main, #content, .main-content') ?? document.body;
    const tall = innerHeight * 1.6;
    const split = (nodes, depth = 0) => nodes.flatMap((node) => {
        const kids = [...node.children].filter(visible);
        const isList = kids.length >= 3 && kids.every((kid) => kid.tagName === kids[0].tagName && kid.className === kids[0].className);
        const breakable = depth < 8 && kids.length > 0 && !isList && (nodes.length === 1 || node.getBoundingClientRect().height > tall);
        return breakable && (kids.length > 1 || node.getBoundingClientRect().height > tall) ? split(kids, depth + 1) : [node];
    });
    const candidates = split([...main.children].filter(visible));
    for (const el of candidates) {
        if (el === header || el === footer || header?.contains(el) || footer?.contains(el) || el.matches('script, style, noscript, template')) continue;
        roots.push({ el, region: 'main' });
    }
    if (footer && visible(footer)) roots.push({ el: footer, region: 'footer' });

    const sections = roots.map(({ el, region }, index) => {
        el.setAttribute('data-fc-crawl', String(index));
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const headings = [...el.querySelectorAll('h1,h2,h3,h4')].map((h) => ({ level: Number(h.tagName[1]), text: text(h) })).filter((h) => h.text);
        const repeated = (() => {
            const groups = new Map();
            for (const child of el.querySelectorAll('*')) {
                if (child.children.length < 3) continue;
                const kids = [...child.children].filter(visible);
                if (kids.length < 3) continue;
                const signature = kids.map((kid) => kid.tagName + '.' + [...kid.classList].slice(0, 2).join('.')).join('|');
                const same = kids.every((kid) => kid.tagName === kids[0].tagName && kid.className === kids[0].className);
                if (same && !groups.has(signature)) {
                    groups.set(signature, kids.slice(0, 12).map((kid) => ({
                        heading: text(kid.querySelector('h2,h3,h4,h5,strong')),
                        text: text(kid).slice(0, 400),
                        image: kid.querySelector('img')?.currentSrc || kid.querySelector('img')?.src || null,
                        link: kid.querySelector('a')?.href ?? null,
                    })));
                }
            }
            return [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
        })();
        return {
            index,
            region,
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: [...el.classList].slice(0, 6),
            box: { y: Math.round(rect.top + scrollY), height: Math.round(rect.height) },
            background: { color: style.backgroundColor, image: style.backgroundImage !== 'none' ? style.backgroundImage.slice(0, 300) : null },
            headings,
            paragraphs: [...el.querySelectorAll('p')].map(text).filter((t) => t.length > 20).slice(0, 12),
            buttons: [...el.querySelectorAll('a.button, a.btn, button, a[class*=btn], a[class*=button], [role=button]')]
                .map((b) => ({ label: text(b), href: b.href ?? null })).filter((b) => b.label).slice(0, 8),
            images: [...el.querySelectorAll('img')].map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || null, width: img.naturalWidth, height: img.naturalHeight })).slice(0, 24),
            repeatedItems: repeated,
            forms: [...el.querySelectorAll('form')].map((form) => ({ action: form.action, fields: [...form.querySelectorAll('input,select,textarea')].map((f) => f.name || f.type) })),
            embeds: [...el.querySelectorAll('iframe, video')].map((e) => e.src || e.currentSrc).filter(Boolean),
            html: (() => {
                const copy = el.cloneNode(true);
                copy.querySelectorAll('script, style, noscript, template, iframe, svg, canvas, form').forEach((n) => n.remove());
                copy.querySelectorAll('*').forEach((n) => {
                    for (const attr of [...n.attributes]) {
                        if (!['href', 'src', 'alt', 'srcset'].includes(attr.name)) n.removeAttribute(attr.name);
                    }
                });
                return copy.innerHTML.replace(/\s+/g, ' ').replace(/<(div|span)>\s*<\/\1>/g, '').trim().slice(0, 8000);
            })(),
            textLength: text(el).length,
        };
    });

    const counts = (values) => Object.entries(values.reduce((acc, value) => {
        if (value) acc[value] = (acc[value] ?? 0) + 1;
        return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const all = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().width > 0).slice(0, 4000);
    const styleOf = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const s = getComputedStyle(el);
        return { fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, color: s.color, textTransform: s.textTransform };
    };
    const button = document.querySelector('a.button, a.btn, button[type=submit], .wp-block-button__link, [class*=btn-primary], a[class*=button]');
    const buttonStyle = button ? (() => {
        const s = getComputedStyle(button);
        return { background: s.backgroundColor, color: s.color, borderRadius: s.borderRadius, padding: s.padding, fontWeight: s.fontWeight, textTransform: s.textTransform, border: s.border };
    })() : null;

    return {
        title: document.title,
        lang: document.documentElement.lang || null,
        dir: document.documentElement.dir || null,
        seo: {
            description: meta('meta[name=description]'),
            canonical: document.querySelector('link[rel=canonical]')?.href ?? null,
            robots: meta('meta[name=robots]'),
            og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map((m) => [m.getAttribute('property'), m.getAttribute('content')])),
            hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => ({ lang: l.hreflang, href: l.href })),
            jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent.trim().slice(0, 4000)),
            h1: [...document.querySelectorAll('h1')].map(text),
        },
        navigation: {
            header: [...(document.querySelector('header nav, nav') ?? document.createElement('nav')).querySelectorAll('a')].map((a) => ({ label: text(a), href: a.href })).filter((l) => l.label).slice(0, 40),
            footer: [...(document.querySelector('footer') ?? document.createElement('footer')).querySelectorAll('a')].map((a) => ({ label: text(a), href: a.href })).filter((l) => l.label).slice(0, 60),
        },
        sections,
        tokens: {
            backgroundColors: counts(all.map((el) => getComputedStyle(el).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)')),
            textColors: counts(all.map((el) => getComputedStyle(el).color)),
            fontFamilies: counts(all.map((el) => getComputedStyle(el).fontFamily)),
            radii: counts(all.map((el) => getComputedStyle(el).borderRadius).filter((r) => r !== '0px')),
            containerWidths: counts(all.map((el) => getComputedStyle(el).maxWidth).filter((w) => w.endsWith('px'))),
            body: styleOf('body'),
            h1: styleOf('h1'),
            h2: styleOf('h2'),
            h3: styleOf('h3'),
            p: styleOf('main p, p'),
            link: styleOf('main a, a'),
            button: buttonStyle,
            fontFaces: [...document.styleSheets].flatMap((sheet) => {
                try { return [...sheet.cssRules].filter((r) => r.constructor.name === 'CSSFontFaceRule').map((r) => r.cssText.slice(0, 300)); } catch { return []; }
            }).slice(0, 20),
            fontLinks: [...document.querySelectorAll('link[href*="fonts.googleapis"], link[href*="fonts.bunny"], link[href*="use.typekit"]')].map((l) => l.href),
            cssVariables: (() => {
                const root = getComputedStyle(document.documentElement);
                return [...root].filter((name) => name.startsWith('--')).slice(0, 200).map((name) => [name, root.getPropertyValue(name).trim()]).filter(([, v]) => v && v.length < 120);
            })(),
        },
        links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
        platform: (() => {
            const html = document.documentElement.outerHTML.slice(0, 400000);
            const generator = meta('meta[name=generator]') ?? '';
            if (/wordpress/i.test(generator) || html.includes('/wp-content/')) return 'wordpress';
            if (window.Shopify || html.includes('cdn.shopify.com')) return 'shopify';
            if (document.documentElement.hasAttribute('data-wf-site')) return 'webflow';
            if (document.querySelector('[data-framer-name]')) return 'framer';
            if (window.Static?.SQUARESPACE_CONTEXT) return 'squarespace';
            if (html.includes('wixstatic.com')) return 'wix';
            if (document.getElementById('__NEXT_DATA__') || window.__next_f) return 'nextjs';
            if (window.__NUXT__) return 'nuxt';
            if (document.querySelector('[wire\\:id], [wire\\:snapshot]') || document.cookie.includes('XSRF-TOKEN')) return 'laravel';
            return generator || 'unknown';
        })(),
        generator: meta('meta[name=generator]'),
    };
}

const browser = await chromium.launch();
const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (compatible; FilamentCraftMigration/1.0)' });
const page = await context.newPage();

await loadRobots(context);
const queue = [normalise(start.toString(), start)];
for (const url of await sitemapUrls(context)) queue.push(url);
const visited = new Set();
const inventory = [];
const tokens = [];

while (queue.length && visited.size < maxPages) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);
    const slug = slugFor(url);
    const dir = join(outDir, 'pages', slug);
    mkdirSync(dir, { recursive: true });

    try {
        await page.setViewportSize({ width: viewports[0], height: 900 });
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 45000 }));
        const status = response?.status() ?? 0;
        const finalUrl = page.url();
        await autoScroll(page);
        const data = await page.evaluate(extractPage);

        for (const width of viewports) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(300);
            await page.screenshot({ path: join(dir, `full-${width}.png`), fullPage: true });
        }
        await page.setViewportSize({ width: viewports[0], height: 900 });
        await page.waitForTimeout(200);
        for (const section of data.sections) {
            const handle = await page.$(`[data-fc-crawl="${section.index}"]`);
            if (handle) {
                await handle.screenshot({ path: join(dir, `section-${String(section.index).padStart(2, '0')}.png`) }).catch(() => null);
            }
        }
        writeFileSync(join(dir, 'page.html'), await page.content());
        const { links, tokens: pageTokens, ...pageData } = data;
        writeFileSync(join(dir, 'page.json'), JSON.stringify({ url, finalUrl, status, slug, pattern: patternFor(url), ...pageData }, null, 2));
        tokens.push({ url, ...pageTokens });
        inventory.push({
            url,
            finalUrl,
            status,
            slug,
            pattern: patternFor(url),
            title: data.title,
            description: data.seo.description,
            sections: data.sections.length,
            signature: data.sections.map((s) => `${s.region}:${s.tag}:${s.repeatedItems.length ? 'list' : s.images.length ? 'media' : 'text'}`).join(' > '),
        });
        for (const link of links) {
            const next = normalise(link, finalUrl);
            if (next && !visited.has(next)) queue.push(next);
        }
        console.log(`[${visited.size}/${maxPages}] ${status} ${url} (${data.sections.length} sections)`);
        if (visited.size === 1) console.log(`Platform: ${data.platform}`);
        await page.waitForTimeout(delay);
    } catch (error) {
        inventory.push({ url, error: String(error).slice(0, 300) });
        console.log(`[${visited.size}/${maxPages}] FAILED ${url}: ${String(error).slice(0, 120)}`);
    }
}

const groups = Object.values(inventory.filter((p) => !p.error).reduce((acc, item) => {
    const key = item.pattern.split('/').length > 2 ? item.pattern : `${item.pattern}|${item.signature}`;
    (acc[key] ??= { pattern: item.pattern, signature: item.signature, pages: [] }).pages.push(item.url);
    return acc;
}, {})).sort((a, b) => b.pages.length - a.pages.length);

writeFileSync(join(outDir, 'inventory.json'), JSON.stringify({ start: start.toString(), robotsDisallow: disallowed, crawledAt: new Date().toISOString(), pages: inventory, templateGroups: groups }, null, 2));
writeFileSync(join(outDir, 'tokens.json'), JSON.stringify(tokens, null, 2));
await browser.close();
console.log(`\nDone: ${inventory.length} pages, ${groups.length} template groups -> ${outDir}`);
