import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { startServer, root } from './preview.mjs';

const output = path.join(root, 'artifacts/review');
await mkdir(output, { recursive: true });
const { server, url } = await startServer({ port: 0 });
const browserChannel = process.env.BRAIN_WEBSITE_BROWSER ? `executable ${process.env.BRAIN_WEBSITE_BROWSER}` : (process.env.BRAIN_WEBSITE_BROWSER_CHANNEL || 'msedge');
const browser = await chromium.launch(process.env.BRAIN_WEBSITE_BROWSER ? { executablePath: process.env.BRAIN_WEBSITE_BROWSER } : { channel: process.env.BRAIN_WEBSITE_BROWSER_CHANNEL || 'msedge' });
const findings = [], checks = [], shots = [];
const check = async (name, action) => {
  try { await action(); checks.push({ name, passed: true }); console.log('PASS ' + name); }
  catch (error) { findings.push({ name, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
};
const tracked = ['index.html', 'agents.html', 'screenshots.html', 'showcase.css', 'showcase.js', 'style.css', 'windows-store.js', 'tools/native-captures.json', 'tools/native-captures-mac.json'];
const sourceHashes = Object.fromEntries(await Promise.all(tracked.map(async file => [file, createHash('sha256').update(await readFile(path.join(root, file))).digest('hex')])));
// Every capture file a platform may show. Anything else visible while that platform is selected is a leak.
const PLATFORM_FILES = { mac: /assets\/mac-/, windows: /assets\/(windows-|meeting-)/ };
const OTHER = { mac: 'windows', windows: 'mac' };
const OUTCOME_FILE = { mac: { chat: 'mac-actions', summary: 'mac-review-summary', actions: 'mac-review-actions' }, windows: { chat: 'meeting-chat-1568', summary: 'meeting-summary-1568', actions: 'meeting-actions-1568' } };
async function context(options = {}) {
  const ctx = await browser.newContext(options);
  await ctx.route('**/*', async route => {
    if (!route.request().url().startsWith(url.replace(/Brain\/$/, ''))) {
      findings.push({ name: 'Unexpected external page request', error: route.request().url() });
      return route.abort();
    }
    return route.continue();
  });
  ctx.on('page', page => {
    page.on('pageerror', error => findings.push({ name: 'JavaScript error', error: error.message }));
    page.on('response', response => { if (response.status() >= 400) findings.push({ name: 'HTTP failure', error: `${response.status()} ${response.url()}` }); });
  });
  return ctx;
}
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode().catch(() => {})));
  });
}
async function settled(page) {
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
}
async function shot(page, name, fullPage = true) {
  const file = `${name}.png`;
  if (fullPage) {
    // Chromium may defer rasterizing decoded offscreen images until they enter view.
    const { height, viewport } = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, viewport: innerHeight }));
    for (let y = 0; y < height; y += viewport) {
      await page.evaluate(position => scrollTo(0, position), y);
      // Let the compositor paint; requestAnimationFrame is disabled in no-JS contexts.
      await page.waitForTimeout(40);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(40);
  }
  await settled(page);
  await page.screenshot({ path: path.join(output, file), fullPage });
  shots.push(file);
}
async function reflow(page) {
  const result = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, broken: [...document.images].filter(image => getComputedStyle(image).display !== 'none' && (!image.complete || image.naturalWidth === 0)).map(image => image.getAttribute('src')) }));
  assert.ok(result.page <= result.viewport + 1, JSON.stringify(result));
  assert.deepEqual(result.broken, []);
}
const panel = platform => `[data-for="${platform}"]`;
async function choose(page, platform) {
  await page.locator(`[data-platform-choice="${platform}"]`).click();
  await page.waitForFunction(value => document.body.dataset.platform === value, platform);
}
/* Everything visible in the showcase must belong to the selected platform: image sources, capture
   links, alt text, captions and control labels. Hidden panels are ignored; the platform toggle,
   download block and footer are dual by design. */
async function assertIsolation(page, platform) {
  const leaks = await page.evaluate(({ platform, other }) => {
    const visible = element => element.getClientRects().length > 0;
    const leaks = [];
    for (const image of document.querySelectorAll('main img')) {
      const src = image.getAttribute('src') || '';
      if (!visible(image) || !/assets\/(mac-|windows-|meeting-)/.test(src)) continue;
      const mine = platform === 'mac' ? /assets\/mac-/ : /assets\/(windows-|meeting-)/;
      if (!mine.test(src)) leaks.push(`img ${src}`);
    }
    for (const anchor of document.querySelectorAll('main a[href]')) {
      const href = new URL(anchor.href, location.href).pathname;
      if (!visible(anchor) || !/assets\/(mac-|windows-|meeting-)/.test(href)) continue;
      const mine = platform === 'mac' ? /assets\/mac-/ : /assets\/(windows-|meeting-)/;
      if (!mine.test(href)) leaks.push(`link ${href}`);
    }
    const word = new RegExp(`\\b${other}\\b`, 'i');
    for (const section of ['#workspace', '#inside-brain', '#memory', '#outcomes', '#speak', '.closing-section', '.site-evidence']) {
      const rootNode = document.querySelector(section);
      if (!rootNode) continue;
      for (const element of [rootNode, ...rootNode.querySelectorAll('img[alt], figcaption, [aria-label], button, h2, h3, p, a, span, strong, li')]) {
        if (!visible(element)) continue;
        const text = [element.getAttribute('alt'), element.getAttribute('aria-label'), ...[...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent)].filter(Boolean).join(' ');
        if (word.test(text)) leaks.push(`${section} text "${text.trim().slice(0, 60)}"`);
      }
    }
    return leaks;
  }, { platform, other: OTHER[platform] });
  assert.deepEqual(leaks, [], `${platform}: other platform visible`);
}
try {
  const desktop = await context({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await desktop.addInitScript(() => {
    window.microphoneRequests = 0;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => {
      window.microphoneRequests += 1;
      return Promise.reject(new Error('Website must not access microphone'));
    };
  });
  const page = await desktop.newPage();
  await page.goto(url);
  await ready(page);
  for (const platform of ['mac', 'windows']) {
    await check(`${platform}: homepage walkthrough shows that platform's captures, with keyboard controls`, async () => {
      await choose(page, platform);
      for (const stage of ['detect', 'live', 'speakers']) {
        await page.locator(`[data-step="${stage}"]`).click();
        assert.equal(await page.locator(`#scene-${stage}`).isVisible(), true);
        assert.equal(await page.locator('.demo-scene:visible').count(), 1);
        assert.match(await page.locator(`#scene-${stage} ${panel(platform)} .native-figure img`).getAttribute('src'), PLATFORM_FILES[platform]);
        assert.equal(await page.locator(`#scene-${stage} ${panel(OTHER[platform])} .native-figure img`).isVisible(), false);
        await settled(page);
        await page.locator('#inside-brain').screenshot({ path: path.join(output, `walkthrough-${platform}-${stage}.png`) });
        shots.push(`walkthrough-${platform}-${stage}.png`);
        await assertIsolation(page, platform);
      }
      await page.locator('[data-step="detect"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-step="live"]').getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await page.locator('[data-step="detect"]').getAttribute('aria-pressed'), 'true');
      assert.notEqual(await page.locator('[data-step="detect"]').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    });
    await check(`${platform}: native workspace focus, rapid selection, and Speak image inspection`, async () => {
      const stage = `#workspace ${panel(platform)} .workspace-stage`;
      for (const focus of ['transcript','assistant','workspace']) {
        await page.locator(`[data-focus="${focus}"]`).click();
        await page.waitForFunction(({ stage, value }) => document.querySelector(stage).dataset.view === value, { stage, value: focus });
        assert.match(await page.locator(`${stage} .workspace-image`).getAttribute('src'), PLATFORM_FILES[platform]);
        assert.match(await page.locator(`${stage} .workspace-image`).getAttribute('alt'), new RegExp(platform, 'i'));
        await settled(page);
        await page.locator('#workspace').screenshot({path:path.join(output,`native-focus-${platform}-${focus}.png`)});
        shots.push(`native-focus-${platform}-${focus}.png`);
      }
      await page.evaluate(() => {
        document.querySelector('[data-focus="assistant"]').click();
        document.querySelector('[data-focus="transcript"]').click();
      });
      await page.waitForFunction(stage => document.querySelector(stage).dataset.view === 'transcript', stage);
      await page.locator('[data-focus="workspace"]').click();
      await page.waitForFunction(stage => document.querySelector(stage).dataset.view === 'workspace', stage);
      await page.locator(`#workspace ${panel(platform)} .replay-workspace`).click();
      assert.ok(await page.evaluate(stage => document.querySelector(stage + ' .workspace-main').getAnimations().length > 0, stage));
      const speak = `#speak ${panel(platform)}`;
      await page.locator(`${speak} .inspect-speak`).click();
      await page.waitForFunction(speak => document.querySelector(speak + ' .speak-composition').classList.contains('is-focused'), speak);
      assert.match(await page.locator(`${speak} .speak-main img`).getAttribute('src'), new RegExp(`${platform}-speak-detail`));
      await page.locator(`${speak} .inspect-speak`).click();
      await page.waitForFunction(speak => !document.querySelector(speak + ' .speak-composition').classList.contains('is-focused'), speak);
      assert.match(await page.locator(`${speak} .speak-main img`).getAttribute('src'), new RegExp(`${platform}-speak\\.png`));
      assert.equal(await page.evaluate(() => window.microphoneRequests), 0);
      await settled(page);
      await page.locator('#speak').screenshot({ path: path.join(output, `speak-${platform}-desktop.png`) }); shots.push(`speak-${platform}-desktop.png`);
    });
    await check(`${platform}: saved meeting views use real captures and support keyboard selection`, async () => {
      const frame = `#outcomes ${panel(platform)} .outcome-frame`;
      for (const view of ['summary','actions','chat']) {
        await page.locator(`[data-outcome="${view}"]`).click();
        await page.waitForFunction(({ frame, value }) => document.querySelector(frame).dataset.view === value, { frame, value: view });
        assert.match(await page.locator(`${frame} img`).getAttribute('src'), new RegExp(OUTCOME_FILE[platform][view]));
        assert.match(await page.locator(`${frame} .screenshot-link`).getAttribute('href'), new RegExp(OUTCOME_FILE[platform][view]));
      }
      await page.locator('[data-outcome="chat"]').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(frame => document.querySelector(frame).dataset.view === 'summary', frame);
      await page.locator('[data-outcome="chat"]').click();
      await settled(page);
      await assertIsolation(page, platform);
    });
  }
  await check('Switching platform mid-inspection re-renders the current views', async () => {
    await choose(page, 'mac');
    await page.locator('[data-focus="transcript"]').click();
    await page.waitForFunction(() => document.querySelector('#workspace [data-for="mac"] .workspace-stage').dataset.view === 'transcript');
    await page.locator('[data-outcome="summary"]').click();
    await page.waitForFunction(() => document.querySelector('#outcomes [data-for="mac"] .outcome-frame').dataset.view === 'summary');
    await choose(page, 'windows');
    await page.waitForFunction(() => /windows-transcript-detail/.test(document.querySelector('#workspace [data-for="windows"] .workspace-image').getAttribute('src')));
    await page.waitForFunction(() => /meeting-summary-1568/.test(document.querySelector('#outcomes [data-for="windows"] .outcome-frame img').getAttribute('src')));
    assert.equal(await page.locator('[data-focus="transcript"]').getAttribute('aria-pressed'), 'true');
    await assertIsolation(page, 'windows');
    await page.locator('[data-focus="workspace"]').click();
    await page.locator('[data-outcome="chat"]').click();
    await settled(page);
  });
  await check('Copy command and clipboard fallback', async () => {
    await page.locator('[data-copy="search-command"]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'brain search "release decision" --scope Personal --json');
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Disabled')) }, configurable: true }); });
    await page.locator('[data-copy="search-command"]').click();
    assert.equal(await page.evaluate(() => getSelection().toString()), 'brain search "release decision" --scope Personal --json');
    await page.evaluate(() => getSelection().removeAllRanges());
  });
  for (const platform of ['mac', 'windows']) {
    await check(`${platform}: platform selection, reload, guide navigation, and release links`, async () => {
      await choose(page, platform);
      await page.reload(); await ready(page);
      assert.equal(await page.locator('body').getAttribute('data-platform'), platform);
      const href = await page.locator(`.hero-actions.platform-${platform} a.button`).getAttribute('href');
      assert.ok(href.endsWith(platform === 'mac' ? '/Brain-0.2.59.dmg' : '/Set.up.Brain.exe'));
      assert.equal(await page.locator('#windows-store-option').isVisible(), false);
      await assertIsolation(page, platform);
      await page.locator('a[href="agents.html"]').first().click();
      assert.equal(await page.locator('body').getAttribute('data-platform'), platform);
      assert.ok(await page.locator(platform === 'mac' ? '#mac-export' : '#windows-export').isVisible());
      await page.goto(url); await ready(page);
      for (const [width, height, label] of [[1440,1000,'desktop'],[768,1024,'tablet'],[390,844,'mobile'],[320,812,'narrow']]) {
        await page.setViewportSize({ width, height }); await ready(page); await reflow(page);
        await shot(page, `${platform}-${label}`);
        if (width === 1440) await shot(page, `${platform}-first-viewport`, false);
      }
    });
  }
  await check('WCAG A/AA automated checks: both platforms and every interactive scene', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const violations = [];
    for (const platform of ['mac', 'windows']) {
      await choose(page, platform);
      for (const stage of ['detect','live','speakers']) {
        await page.locator(`[data-step="${stage}"]`).click();
        const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        result.violations.forEach(v => violations.push({ platform, stage, id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      }
      for (const focus of ['transcript', 'assistant']) {
        await page.locator(`[data-focus="${focus}"]`).click();
        const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        result.violations.forEach(v => violations.push({ platform, focus, id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
      }
      await page.locator('[data-focus="workspace"]').click();
    }
    await writeFile(path.join(output, 'axe.json'), JSON.stringify(violations, null, 2));
    assert.deepEqual(violations, []);
    await page.locator('[data-step="detect"]').click();
  });
  await check('200% layout enlargement and forced-colors mode', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    try {
      await reflow(page); await shot(page, 'zoom-200');
      const speak = `#speak [data-for="${await page.evaluate(() => document.body.dataset.platform)}"]`;
      await page.locator(`${speak} .inspect-speak`).click();
      await page.waitForFunction(speak => document.querySelector(speak + ' .speak-composition').classList.contains('is-focused'), speak);
      await page.locator(`${speak} .inspect-speak`).click();
      await page.waitForFunction(speak => !document.querySelector(speak + ' .speak-composition').classList.contains('is-focused'), speak);
    } finally { await page.evaluate(() => { document.documentElement.style.zoom = ''; }); }
    await page.emulateMedia({ forcedColors: 'active' }); await shot(page, 'forced-colors', false);
    await page.emulateMedia({ forcedColors: 'none' });
  });
  await check('Reduced motion: focus controls and the platform switch preserve meaning without movement', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#workspace [data-for="windows"] .replay-workspace').click();
    await page.locator('[data-focus="transcript"]').click();
    await page.waitForFunction(() => document.querySelector('#workspace [data-for="windows"] .workspace-stage').dataset.view === 'transcript');
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.locator('[data-outcome="summary"]').click();
    await page.waitForFunction(() => document.querySelector('#outcomes [data-for="windows"] .outcome-frame').dataset.view === 'summary');
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.locator('#speak [data-for="windows"] .inspect-speak').click();
    await page.waitForFunction(() => document.querySelector('#speak [data-for="windows"] .speak-composition').classList.contains('is-focused'));
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await choose(page, 'mac');
    await page.waitForFunction(() => /mac-transcript-detail/.test(document.querySelector('#workspace [data-for="mac"] .workspace-image').getAttribute('src')));
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.emulateMedia({ reducedMotion: null });
    await choose(page, 'windows');
  });
  await check('Local route crawl, fragments, decoded images, and guide accessibility', async () => {
    const queue = ['index.html', 'agents.html', 'help/', 'privacy/'], seen = new Set();
    while (queue.length) {
      const route = queue.shift(); if (seen.has(route)) continue; seen.add(route);
      await page.goto(new URL(route, url).href);
      if (route === 'help/' || route === 'privacy/') await page.waitForURL(new URL(route.slice(0, -1) + '.html', url).href);
      await ready(page);
      await page.setViewportSize({ width: 390, height: 844 }); await reflow(page);
      assert.equal(await page.locator('h1').count(), 1, route);
      const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(a => a.href));
      for (const href of links) {
        const link = new URL(href);
        if (!href.startsWith(url)) continue;
        const response = await desktop.request.get(link.href.split('#')[0]);
        assert.equal(response.status(), 200, href);
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('text/html')) {
          const relative = link.pathname.slice(new URL(url).pathname.length) || 'index.html';
          if (!seen.has(relative)) queue.push(relative);
          if (link.hash) assert.ok((await response.text()).includes(`id="${decodeURIComponent(link.hash.slice(1))}"`), 'Broken fragment: ' + href);
        }
      }
      if (route === 'agents.html') {
        await shot(page, 'guide-mobile');
        await page.setViewportSize({ width: 1440, height: 1000 }); await shot(page, 'guide-desktop');
        const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        assert.deepEqual(result.violations.map(v => v.id), []);
      }
      if (route === 'screenshots.html') {
        await page.setViewportSize({ width: 1440, height: 1000 }); await shot(page, 'screenshots-page');
        const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        assert.deepEqual(result.violations.map(v => v.id), []);
      }
    }
    checks.push({ name: 'Crawled routes', routes: [...seen], passed: true });
  });
  await desktop.close();
  await check('No JavaScript: both platforms’ meeting examples and both CLI platform instructions', async () => {
    const ctx = await context({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage(); await page.goto(url); await ready(page); await reflow(page);
    assert.equal(await page.locator('.demo-scene:visible').count(), 3);
    assert.equal(await page.locator('.inspect-speak:visible').count(), 0);
    assert.equal(await page.locator('.workspace-main img:visible').count(), 2);
    assert.equal(await page.locator('.speak-main img:visible').count(), 2);
    assert.equal(await page.locator('.outcome-controls').isVisible(), false);
    assert.equal(await page.locator('.outcome-links:visible').count(), 2);
    assert.ok(await page.locator('main img[src^="assets/mac-"]:visible').count() >= 6);
    assert.ok(await page.locator('main img[src^="assets/windows-"]:visible').count() >= 6);
    assert.deepEqual(await page.locator('#download a.button:visible').allTextContents(), ['Download Brain for Mac', 'Download Brain for Windows']);
    assert.equal(await page.locator('.platform-toggle').isVisible(), false);
    const text = await page.locator('main').innerText();
    for (const runOn of ['MacWindows', 'for Mac for Windows', 'again.Choose']) assert.equal(text.includes(runOn), false, runOn);
    assert.ok(text.includes('The Mac and Windows screens above'));
    await shot(page, 'no-js-home');
    await page.goto(new URL('agents.html', url).href); await ready(page); await reflow(page);
    assert.equal(await page.locator('#mac-export').isVisible(), true);
    assert.equal(await page.locator('#windows-export').isVisible(), true);
    await shot(page, 'no-js-guide'); await ctx.close();
  });
  await check('Mac detection, saved choice, blocked storage, and keyboard skip link', async () => {
    const ctx = await context({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } }); });
    const page = await ctx.newPage(); await page.goto(url);
    assert.equal(await page.locator('body').getAttribute('data-platform'), 'mac');
    assert.equal(await page.locator('[data-platform-choice="mac"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-platform-choice="windows"]').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#workspace [data-for="mac"] .workspace-image').isVisible(), true);
    assert.equal(await page.locator('#workspace [data-for="windows"] .workspace-image').isVisible(), false);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').textContent(), 'Skip to content');
    await page.keyboard.press('Enter'); assert.ok(page.url().endsWith('#main'));
    await page.locator('[data-platform-choice="windows"]').click();
    assert.equal(await page.locator('body').getAttribute('data-platform'), 'windows');
    await ctx.close();
  });
  await check('The unselected platform’s captures are never downloaded', async () => {
    for (const platform of ['mac', 'windows']) {
      const ctx = await context({ viewport: { width: 1440, height: 1000 } });
      await ctx.addInitScript(value => { try { localStorage.setItem('brain-platform', value); } catch {} }, platform);
      const page = await ctx.newPage(); await page.goto(url, { waitUntil: 'networkidle' });
      // Walk the page so every lazy image of the chosen platform enters the viewport.
      const { height, viewport } = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, viewport: innerHeight }));
      for (let y = 0; y < height; y += viewport / 2) { await page.evaluate(position => scrollTo(0, position), y); await page.waitForTimeout(60); }
      await page.waitForLoadState('networkidle');
      const fetched = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name).filter(name => /assets\/(mac-|windows-|meeting-)/.test(name)));
      const foreign = fetched.filter(name => !PLATFORM_FILES[platform].test(name));
      assert.deepEqual(foreign, [], `${platform} downloaded the other platform's captures`);
      assert.ok(fetched.length >= 6, `${platform} loaded its own captures`);
      await ctx.close();
    }
  });
  await check('A slower capture never lands under another view’s caption', async () => {
    const ctx = await context({ viewport: { width: 1440, height: 1000 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('brain-platform', 'mac'); } catch {} });
    await ctx.route('**/assets/mac-assistant-detail.png', async route => { await new Promise(resolve => setTimeout(resolve, 1200)); await route.continue(); });
    const page = await ctx.newPage(); await page.goto(url); await ready(page);
    await page.evaluate(() => { document.querySelector('[data-focus="assistant"]').click(); document.querySelector('[data-focus="transcript"]').click(); });
    await page.waitForFunction(() => document.querySelector('#workspace [data-for="mac"] .workspace-stage').dataset.view === 'transcript');
    await page.waitForTimeout(1800);
    const state = await page.evaluate(() => { const panel = document.querySelector('#workspace > [data-for="mac"]'); return { src: panel.querySelector('.workspace-image').getAttribute('src'), link: panel.querySelector('.workspace-full-link').getAttribute('href'), caption: panel.querySelector('.workspace-caption').textContent, pressed: document.querySelector('[data-focus][aria-pressed="true"]').dataset.focus }; });
    assert.equal(state.pressed, 'transcript');
    assert.match(state.src, /mac-transcript-detail/); assert.match(state.link, /mac-transcript-detail/); assert.match(state.caption, /Live transcript/);
    await ctx.close();
  });
  await check('Every cropped Mac asset is a pixel-exact crop of its full-frame capture', async () => {
    const manifest = JSON.parse(await readFile(path.join(root, 'tools/native-captures-mac.json')));
    const pairs = manifest.files.filter(item => item.crop).map(item => ({ crop: item, full: manifest.files.find(other => !other.crop && other.source === item.source) })).filter(pair => pair.full);
    assert.ok(pairs.length >= 4, 'cropped assets with a full-frame twin in assets/');
    const ctx = await context({ viewport: { width: 800, height: 600 } });
    const page = await ctx.newPage(); await page.goto(url);
    for (const { crop, full } of pairs) {
      const mismatch = await page.evaluate(async ({ cropFile, fullFile, rect }) => {
        const load = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
        const [cropped, whole] = await Promise.all([load(`assets/${cropFile}`), load(`assets/${fullFile}`)]);
        const [x, y, w, h] = rect;
        if (cropped.naturalWidth !== w || cropped.naturalHeight !== h) return `size ${cropped.naturalWidth}x${cropped.naturalHeight}`;
        const draw = (image, sx, sy) => { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const context2d = canvas.getContext('2d', { willReadFrequently: true }); context2d.drawImage(image, sx, sy, w, h, 0, 0, w, h); return context2d.getImageData(0, 0, w, h).data; };
        const a = draw(cropped, 0, 0), b = draw(whole, x, y);
        let different = 0;
        for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) different += 1;
        return different ? `${different} channel values differ` : '';
      }, { cropFile: crop.file, fullFile: full.file, rect: crop.crop });
      assert.equal(mismatch, '', `${crop.file} vs ${full.file}`);
    }
    await ctx.close();
  });
  await check('Release and existing page preservation', async () => {
    const baseline = JSON.parse(await readFile(path.join(root, 'tools/release-baseline.json')));
    const before = execFileSync('git', ['show', `${baseline.commit}:index.html`], { cwd: root, encoding: 'utf8' });
    const after = await readFile(path.join(root, 'index.html'), 'utf8');
    const releases = content => [...new Set(content.match(/https:\/\/github\.com\/samishariff\/Brain-Windows-Releases\/releases\/download\/[^"\s]+/g))].sort();
    assert.deepEqual(releases(after), releases(before));
    for (const file of ['style.css','windows-store.js','privacy.html','help.html','mac.html','mac-notes.html','release-notes.html']) {
      const baselineContent = execFileSync('git', ['show', `${baseline.commit}:${file}`], { cwd: root });
      assert.equal((await readFile(path.join(root, file), 'utf8')).replaceAll('\r\n','\n'), baselineContent.toString('utf8').replaceAll('\r\n','\n'), file);
    }
  });
  await check('Native capture provenance for both platforms and absence of invented app UI', async () => {
    const covered = [];
    for (const [file, methodPattern, prefix] of [['tools/native-captures.json', /Native WinUI/, 'windows-'], ['tools/native-captures-mac.json', /Native SwiftUI/, 'mac-']]) {
      const manifest = JSON.parse(await readFile(path.join(root, file)));
      assert.match(manifest.method, methodPattern);
      for (const item of manifest.files) {
        assert.ok(item.file.startsWith(prefix), `${file}: ${item.file}`);
        const bytes = await readFile(path.join(root, 'assets', item.file));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file);
        assert.ok(item.sourceSha256 && item.origin.includes('No redraw'), item.file);
        covered.push(item.file);
      }
    }
    const html = await readFile(path.join(root, 'index.html'), 'utf8') + await readFile(path.join(root, 'screenshots.html'), 'utf8');
    for (const reference of new Set([...html.matchAll(/assets\/((?:mac|windows)-[\w-]+\.png)/g)].map(match => match[1]))) assert.ok(covered.includes(reference), 'Capture without provenance: ' + reference);
    for (const banned of ['class="notification"','class="draft-window"','class="memory-card"','class="transcript-turn"','Illustrative result']) assert.equal(html.includes(banned), false, banned);
    assert.ok(html.includes('About these screenshots'));
  });
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
  const report = { passed: findings.length === 0, completedUtc: new Date().toISOString(), browser: browserChannel, sourceHashes, checks, findings, screenshots: shots, limitations: [`Headless Chromium review through the ${browserChannel} channel; native Safari and Firefox are not exercised.`, 'CSS zoom models layout enlargement, not a native browser zoom shortcut.', 'Real app features and live audio are not executed by this website review.', 'Automated accessibility checks supplement visual and keyboard review.'] };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(path.join(output, 'gallery.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brain prototype review</title><style>body{font:16px system-ui;max-width:1200px;margin:40px auto;padding:20px;background:#f4f7f8;color:#172f3e}a{color:#075e77}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}figure{margin:0;background:white;padding:15px;border-radius:12px}img{width:100%;height:360px;object-fit:cover;object-position:top}figcaption{margin-top:12px}</style><h1>Brain prototype review</h1><p>${report.passed ? 'All automated checks passed.' : `${findings.length} checks need attention.`} Open an image for its full-size view.</p><main>${shots.map(file => `<figure><a href="${file}"><img src="${file}" alt="${file.replace('.png','').replaceAll('-',' ')}" loading="lazy"></a><figcaption>${file}</figcaption></figure>`).join('')}</main></html>`);
  console.log(`Review: ${path.join(output, 'report.json')}\nGallery: ${path.join(output, 'gallery.html')}`);
  if (findings.length) process.exitCode = 1;
}
