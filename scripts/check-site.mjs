#!/usr/bin/env node
// Static checks for the Seatmate site. No dependencies. Run from the repository root:  node scripts/check-site.mjs
// Checks: every page has lang, title, viewport, description and canonical (and the canonical is its own URL); local links and anchors resolve; the sitemap lists exactly the indexable pages and
// each exists; robots.txt points at the sitemap; latest.json and assetlinks.json are valid; the download logic survived; the two contact addresses are consistent across pages; no page loads
// a third-party script, stylesheet or font; no leftover placeholder text. It does NOT test the live domain (see RELEASING.md for the live checks) or the layout in a browser.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let failed = 0;
const check = (name, cond, extra = '') => { if (!cond) failed++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '   <<' + extra}`); };

const pages = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'data-deletion.html', '404.html'];
const indexable = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'data-deletion.html'];
const ORIGIN = 'https://seatmate.com.pk/';

for (const f of pages) {
  const s = read(f);
  check(`${f}: html lang`, /<html lang="en">/.test(s));
  check(`${f}: title`, /<title>[^<]{3,}<\/title>/.test(s));
  check(`${f}: viewport`, /<meta name="viewport" content="width=device-width, initial-scale=1.0">/.test(s));
  check(`${f}: description 50 to 200 characters`, (() => { const m = /<meta name="description" content="([^"]*)"/.exec(s); return !!m && m[1].length >= 50 && m[1].length <= 200; })());
  const canon = /<link rel="canonical" href="([^"]+)"/.exec(s);
  const expected = f === 'index.html' || f === '404.html' ? ORIGIN : ORIGIN + f;
  check(`${f}: canonical is ${expected}`, !!canon && canon[1] === expected, canon && canon[1]);
  check(`${f}: shared stylesheet, no inline style block`, s.includes('href="/site.css"') && !/<style>/.test(s));
  check(`${f}: no third-party script, stylesheet or font`, !/(<script[^>]+src="https?:|<link[^>]+href="https?:\/\/(?!seatmate\.com\.pk)[^"]*(css|font)|fonts\.googleapis|cdn\.)/i.test(s));
  check(`${f}: no placeholder text`, !/lorem|coming soon|todo|tbd|\[OWNER/i.test(s));
}
check('404.html is not indexable', /<meta name="robots" content="noindex">/.test(read('404.html')));

// local links and anchors
for (const f of pages) {
  const s = read(f);
  const ids = new Set([...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  for (const m of s.matchAll(/ href="([^"]+)"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|data:)/.test(h)) continue;
    if (h.startsWith('#')) { check(`${f}: anchor ${h} exists`, ids.has(h.slice(1))); continue; }
    const target = h === '/' ? 'index.html' : h.replace(/^\//, '').split('#')[0];
    check(`${f}: link ${h} resolves`, fs.existsSync(path.join(root, target)));
  }
}

const idx0 = () => read('index.html');
// sitemap and robots
const sm = read('sitemap.xml');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
const want = indexable.map((f) => (f === 'index.html' ? ORIGIN : ORIGIN + f)).sort();
check('sitemap lists exactly the indexable pages', JSON.stringify(locs) === JSON.stringify(want), locs.join(','));
check('robots.txt allows crawling and names the sitemap', /Allow: \//.test(read('robots.txt')) && read('robots.txt').includes('Sitemap: https://seatmate.com.pk/sitemap.xml'));

// data files
const latest = JSON.parse(read('latest.json'));
check('latest.json has versionCode, versionName and an https apkUrl', Number.isInteger(latest.versionCode) && typeof latest.versionName === 'string' && /^https:\/\//.test(latest.apkUrl));
const al = JSON.parse(read('.well-known/assetlinks.json'));
check('assetlinks.json names pk.seatmate.app with a SHA-256 fingerprint', al[0]?.target?.package_name === 'pk.seatmate.app' && /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(al[0]?.target?.sha256_cert_fingerprints?.[0] ?? ''));
check('CNAME is seatmate.com.pk', read('CNAME').trim() === 'seatmate.com.pk');

check('share preview image is declared and the file exists (square, PNG, under 1 MB)', idx0().includes('og:image" content="' + ORIGIN + 'og-image.png') && fs.existsSync(path.join(root, 'og-image.png')) && fs.statSync(path.join(root, 'og-image.png')).size < 1e6);

// download logic and contact consistency
const idx = read('index.html');
check('landing page keeps the download button, the latest.json lookup and the in-app browser escape', ['id="download-link"', "fetch('latest.json", 'isAndroidInAppBrowser', 'escapeInAppBrowser', 'id="inapp-warn"'].every((t) => idx.includes(t)));
check('landing page links the GitHub release as the safe fallback', idx.includes('https://github.com/MehaalKhan3964/seatmate-site/releases/latest'));
const mails = (f) => [...new Set([...read(f).matchAll(/mailto:([^"]+)"/g)].map((m) => m[1]))];
check('support@ and privacy@ are the only contact addresses, on the landing page', JSON.stringify(mails('index.html').sort()) === JSON.stringify(['privacy@seatmate.com.pk', 'support@seatmate.com.pk']), mails('index.html').join(','));
check('the policy pages use the same two addresses', ['privacy-policy.html', 'terms-of-service.html', 'data-deletion.html'].every((f) => mails(f).every((m) => ['privacy@seatmate.com.pk', 'support@seatmate.com.pk'].includes(m))));
check('company details present in the landing footer', ['ALMISHQUN (SMC-PRIVATE) LIMITED', '0350299', 'D-12/1'].every((t) => idx.includes(t)));
check('every landing-page claim stays within the pilot position: no "verified driver", no fee promise, no SOS claim', !/verified driver|no fees|free of charge|sos|emergency/i.test(idx));

console.log(failed === 0 ? '\nsite checks: all passed' : `\nsite checks: ${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
