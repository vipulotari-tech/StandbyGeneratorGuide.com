import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = (process.env.BASE_URL ?? 'http://localhost:8321').replace(/\/$/, '');
const launchOptions = { headless: true };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  launchOptions.args = process.env.PLAYWRIGHT_CHROMIUM_ARGS
    ? JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS)
    : ['--no-sandbox', '--no-zygote', '--single-process', '--disable-dev-shm-usage'];
}

let browser;
try {
  browser = await chromium.launch(launchOptions);
} catch (error) {
  console.error('Chromium could not start. Install it with `npx playwright install chromium`.');
  throw error;
}

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text().slice(0, 160));
  });
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 160)));

  const smokeCases = [
    ['/', 320],
    ['/', 390],
    ['/', 768],
    ['/', 1440],
    ['/sizing/what-size-generator-do-i-need/', 320],
    ['/sizing/what-size-generator-do-i-need/', 390],
    ['/sizing/what-size-generator-do-i-need/', 1440],
    ['/sizing/what-size-for-2000-sq-ft/', 390],
    ['/brands/', 390],
  ];

  for (const [path, width] of smokeCases) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    assert(response && response.ok(), `page failed to load: ${path}`);
    await page.locator('#main h1').waitFor({ state: 'attached' });
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      culprits: [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return cs.display !== 'none' && r.width > 1 && r.right > innerWidth + 2;
        })
        .slice(0, 12)
        .map((el) => ({ tag: el.tagName, classes: String(el.className).slice(0, 120),
          width: Math.round(el.getBoundingClientRect().width),
          right: Math.round(el.getBoundingClientRect().right) })),
    }));
    assert.equal(overflow.scrollWidth > overflow.viewport, false,
      `horizontal overflow at ${path} (${width}px): ${JSON.stringify(overflow)}`);
    assert.equal(await page.locator('#main h1').count(), 1, `expected one content H1 at ${path}`);
  }


  // Product-showcase editorial design must retain real sources, responsive layout and working links.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.showcase-model-card').count(), 3, `three model cards required at ${width}px`);
    assert.equal(await page.locator('.showcase-story').count(), 2, `two photographic story cards required at ${width}px`);
    assert.equal(await page.locator('.showcase-model-ratings dd').count(), 6, 'fuel ratings missing from source records');
    assert.equal(await page.locator('.showcase-model-grid a[href^="/models/"]').count(), 6, 'model links must be functional');
    assert.equal(await page.locator('.cinematic-hero-actions a').count(), 3, 'existing primary research CTAs were lost');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `showcase overflows at ${width}px`);
    for (const editorialImage of await page.locator('.showcase-story-image img').all()) {
      await editorialImage.scrollIntoViewIfNeeded();
      await editorialImage.evaluate(async (image) => { await image.decode(); });
    }
    const missingImages = await page.locator('.showcase-story-image img').evaluateAll((images) =>
      images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute('src'))
    );
    assert.deepEqual(missingImages, [], `editorial showcase images did not load at ${width}px`);
  }
  for (const path of ['/brands/', '/models/', '/comparisons/', '/cost/']) {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.library-hero h1').count(), 1, `research library H1 missing at ${path}`);
    assert((await page.locator('.library-card a[href^="/"]').count()) > 0, `library cards absent at ${path}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `library overflow at ${path}`);
  }


  // A narrow grid-template-columns override previously forced each takeaway into a ~23px column.
  // Check actual text geometry so a page can never pass while showing one-word lines.
  for (const width of [320, 360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/installation/generator-pad-and-placement/`, { waitUntil: 'networkidle' });
    const takeaways = await page.locator('.article-takeaways li').evaluateAll((items) =>
      items.map((item) => {
        const copy = item.querySelector('.article-takeaway-copy');
        const row = item.getBoundingClientRect();
        const text = copy?.getBoundingClientRect();
        return {
          hasCopy: Boolean(copy),
          rowWidth: row.width,
          copyWidth: text?.width ?? 0,
          gridColumns: getComputedStyle(item).gridTemplateColumns.split(' ').filter(Boolean).length,
          copyLeft: text?.left ?? 0,
          rowLeft: row.left,
        };
      })
    );
    assert(takeaways.length >= 2, `placement article missing takeaways at ${width}px`);
    for (const t of takeaways) {
      assert(t.hasCopy, `missing semantic takeaway text wrapper at ${width}px`);
      assert.equal(t.gridColumns, 2, `takeaway must use two grid columns at ${width}px`);
      assert(t.copyWidth >= t.rowWidth * .70,
        `takeaway text shrunk into a narrow column at ${width}px: ${JSON.stringify(t)}`);
      assert(t.copyLeft > t.rowLeft + 18, `takeaway number and copy not side-by-side at ${width}px`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false, `takeaway overflow at ${width}px`);
  }


  // Luxury power-pathway regression: semantic stages, safety copy and actual mobile geometry.
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const diagram = page.locator('.premium-system-band .system-diagram');
    assert.equal(await diagram.count(), 1, `expected one editorial power pathway at ${width}px`);
    assert.equal(await diagram.locator('.system-flow-source').count(), 2, `missing alternate power sources at ${width}px`);
    assert.equal(await diagram.locator('.system-flow-switch').count(), 1, `transfer switch missing at ${width}px`);
    assert.equal(await diagram.locator('.system-flow-panel').count(), 1, `distribution panel missing at ${width}px`);
    assert.equal(await diagram.locator('.system-flow-load').count(), 2, `priority/managed loads missing at ${width}px`);
    assert.match(await diagram.locator('figcaption').innerText(), /not an installation drawing/i);
    const geometry = await diagram.evaluate((figure) => {
      const root = figure.getBoundingClientRect();
      const cards = [...figure.querySelectorAll('.system-flow-node')].map((e) => e.getBoundingClientRect());
      const captions = [...figure.querySelectorAll('.system-flow-node strong')].map((e) => e.getBoundingClientRect());
      return {
        left: root.left, right: root.right, width: root.width,
        cardsInside: cards.every((box) => box.left >= root.left - 2 && box.right <= root.right + 2 && box.width >= 95),
        readable: captions.every((box) => box.width > 55 && box.height >= 17),
        diagramHeight: root.height,
      };
    });
    assert(geometry.cardsInside, `diagram cards are clipped or too narrow at ${width}px: ${JSON.stringify(geometry)}`);
    assert(geometry.readable, `diagram text collapsed at ${width}px: ${JSON.stringify(geometry)}`);
    assert(geometry.left >= -1 && geometry.right <= width + 1,
      `diagram extends beyond viewport at ${width}px: ${JSON.stringify(geometry)}`);
    assert(geometry.diagramHeight < 1200,
      `diagram too tall at ${width}px: ${JSON.stringify(geometry)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false, `horizontal overflow from power pathway at ${width}px`);
  }


  // Screenshot regression: power-stage pictures and icon art cannot spill into text.
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const figure = page.locator('.premium-system-band .system-diagram');
    assert.equal(await figure.locator('.system-flow-photo img').count(), 2, `source photos missing at ${width}px`);
    assert.equal(await figure.locator('.system-flow-stage-image').count(), 2, `stage artwork missing at ${width}px`);
    assert.equal(await figure.locator('svg').count(), 0, 'inline SVG regression could reintroduce global sizing collision');
    for (const image of await figure.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(async (img) => { await img.decode(); });
    }
    const layout = await figure.evaluate((root) => {
      const within = (child, parent) => {
        const c=child.getBoundingClientRect(), p=parent.getBoundingClientRect();
        return c.left >= p.left - 1 && c.right <= p.right + 1 && c.top >= p.top - 1 && c.bottom <= p.bottom + 1;
      };
      const sources=[...root.querySelectorAll('.system-flow-source')];
      const stages=[...root.querySelectorAll('.system-flow-switch,.system-flow-panel')];
      const photos=[...root.querySelectorAll('img')];
      const overlap = (a,b) => {
        const x=a.getBoundingClientRect(), y=b.getBoundingClientRect();
        return Math.min(x.right,y.right)>Math.max(x.left,y.left)+1 &&
          Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top)+1;
      };
      return {
        imagesLoaded: photos.every((img) => img.complete && img.naturalWidth > 0),
        sourcesSeparate: sources.every((source) => {
          const image=source.querySelector('.system-flow-photo'), copy=source.querySelector('.system-flow-source-copy');
          const heading=copy?.querySelector('strong');
          return Boolean(image && copy && heading && !overlap(image,copy) &&
            within(copy,source) && within(heading,copy) && heading.getBoundingClientRect().width>=75);
        }),
        stageImagesInside: stages.every((stage) => {
          const img=stage.querySelector('.system-flow-stage-image');
          const copy=stage.querySelector('.system-flow-stage-copy');
          return Boolean(img && copy && within(img,stage) && within(copy,stage) && !overlap(img,copy));
        }),
        stageImageSizes: [...root.querySelectorAll('.system-flow-stage-image')].map((img) =>
          ({width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height})),
        height:root.getBoundingClientRect().height,
      };
    });
    assert(layout.imagesLoaded, `power-pathway images not loaded at ${width}px: ${JSON.stringify(layout)}`);
    assert(layout.sourcesSeparate, `photos or headings overlap in source cards at ${width}px: ${JSON.stringify(layout)}`);
    assert(layout.stageImagesInside, `stage icon artwork overlaps text at ${width}px: ${JSON.stringify(layout)}`);
    assert(layout.stageImageSizes.every(({width:w,height:h}) => w >= 35 && w <= 56 && h >= 35 && h <= 56),
      `stage icons are oversized at ${width}px: ${JSON.stringify(layout)}`);
    assert(layout.height < 1200, `power pathway is excessively long at ${width}px: ${JSON.stringify(layout)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
      `power-pathway overflow at ${width}px`);
  }


  // Research trust + 10-step journey: photography must decode and content must never squash or overlap.
  for (const width of [320, 390, 540, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const trustSection = page.locator('.premium-trust-strip');
    const journeySection = page.locator('.premium-journey');
    assert.equal(await trustSection.locator('.premium-trust-card').count(), 4,
      `four transparent evidence principles required at ${width}px`);
    assert.equal(await journeySection.locator('.premium-journey-item').count(), 10,
      `all ten homeowner decisions required at ${width}px`);
    assert.equal(await journeySection.locator('.premium-journey-item a[href^="/"]').count(), 10,
      `journey links missing at ${width}px`);

    for (const img of [
      trustSection.locator('.premium-trust-visual img'),
      journeySection.locator('.premium-journey-visual img'),
    ]) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(async (element) => { await element.decode(); });
      assert.equal(await img.evaluate((element) => element.complete && element.naturalWidth > 0), true,
        `editorial photograph failed to load at ${width}px`);
      assert((await img.getAttribute('alt'))?.length > 25,
        `meaningful photograph alt text missing at ${width}px`);
    }

    const sizes = await page.evaluate(() => {
      const withinX = (a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return aRect.left >= bRect.left - 2 && aRect.right <= bRect.right + 2;
      };
      const cards = [...document.querySelectorAll('.premium-trust-card')];
      const items = [...document.querySelectorAll('.premium-journey-item')];
      return {
        trustCards: cards.every((card) =>
          card.getBoundingClientRect().width >= 170 &&
          withinX(card.querySelector('h3'), card) &&
          withinX(card.querySelector('p'), card)),
        journeyCards: items.every((item) => {
          const link = item.querySelector('a');
          const content = item.querySelector('.premium-step-main');
          const title = content?.querySelector('strong');
          const rect = content?.getBoundingClientRect();
          return Boolean(link && content && title && rect &&
            rect.width >= 115 && withinX(content, item) && withinX(title, content));
        }),
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert(sizes.trustCards, `trust cards are too narrow/clipped at ${width}px: ${JSON.stringify(sizes)}`);
    assert(sizes.journeyCards, `journey cards or titles squeezed at ${width}px: ${JSON.stringify(sizes)}`);
    assert.equal(sizes.scrollWidth > sizes.viewportWidth, false,
      `luxury homeowner sections introduce sideways scroll at ${width}px`);
  }

  // Mobile data-table regression: each semantic row must actually contain all of its
  // cells. A prior table/block formatting-context mismatch clipped five-field log
  // entries and exact-model comparisons to a fraction of their content on Android.
  const inspectMobileTableClipping = async (route, width) => {
    const problems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#main table.mobile-card-table, #main table.mobile-kv-table'))
        .flatMap((table, tableIndex) => {
          const tableBox = table.getBoundingClientRect();
          const tableStyle = getComputedStyle(table);
          const rows = Array.from(table.querySelectorAll('tbody tr'))
            .filter((row) => getComputedStyle(row).display !== 'none');
          const failures = [];
          if (tableStyle.display !== 'block') {
            failures.push({ tableIndex, issue: 'table still uses native table layout on mobile', display: tableStyle.display });
          }
          for (const [rowIndex, row] of rows.entries()) {
            const rowBox = row.getBoundingClientRect();
            const rowStyle = getComputedStyle(row);
            const cells = Array.from(row.children).filter((cell) => getComputedStyle(cell).display !== 'none');
            const overflowed = cells.some((cell) => {
              const box = cell.getBoundingClientRect();
              return box.top < rowBox.top - 2 || box.bottom > rowBox.bottom + 2 ||
                box.left < rowBox.left - 2 || box.right > rowBox.right + 2 ||
                cell.scrollHeight > cell.clientHeight + 2;
            });
            if (rowStyle.overflowY === 'hidden' || overflowed || rowBox.height < 30 ||
                rowBox.right > tableBox.right + 2 || rowBox.left < tableBox.left - 2) {
              failures.push({ tableIndex, rowIndex, issue: 'row clipped or outside its card',
                rowHeight: rowBox.height, overflow: rowStyle.overflowY,
                cellHeights: cells.map((cell) => Math.round(cell.getBoundingClientRect().height)) });
            }
          }
          return failures;
        });
    });
    assert.deepEqual(problems, [], `mobile table content is clipped at ${route} (${width}px)`);
  };

  for (const route of [
    '/maintenance/generator-maintenance-checklist/',
    '/maintenance/maintenance-log/',
    '/maintenance/model-service-schedules/',
    '/comparisons/generac-vs-champion/',
    '/comparisons/five-brand-standby-generator-comparison/',
    '/research/evidence-ledger/',
  ]) {
    for (const width of [320, 390, 430, 479, 639]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      assert(response?.ok(), `mobile table route failed: ${route}`);
      await inspectMobileTableClipping(route, width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
        `mobile table causes horizontal overflow at ${route} (${width}px)`);
    }
  }
  // Android regression: blank checklist rows must be usable cards, not clipped
  // cells masquerading as cards. Verify every field and line fits its own entry.
  for (const width of [320, 360, 390, 430, 479, 639, 640, 768, 980, 1024, 1199, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/maintenance/generator-maintenance-checklist/`, { waitUntil: 'networkidle' });
    const mobile = width < 1200;
    const cards = page.locator('#records .record-card-list');
    const table = page.locator('#records .record-table-wrap');
    assert.equal(await cards.isVisible(), mobile, `maintenance record cards visibility at ${width}px`);
    assert.equal(await table.isVisible(), !mobile, `maintenance desktop table visibility at ${width}px`);
    if (mobile) {
      assert.equal(await cards.locator('li.record-card').count(), 5, `maintenance mobile entry count at ${width}px`);
      const fits = await cards.locator('li.record-card').evaluateAll((entries) => entries.map((entry) => {
        const card = entry.getBoundingClientRect();
        const fields = [...entry.querySelectorAll('.record-field')];
        return {
          count: fields.length,
          fits: fields.every((field) => {
            const rect = field.getBoundingClientRect();
            const label = field.querySelector('dt')?.getBoundingClientRect();
            const line = field.querySelector('dd')?.getBoundingClientRect();
            return rect.top >= card.top - 1 && rect.bottom <= card.bottom + 1 &&
              rect.left >= card.left - 1 && rect.right <= card.right + 1 &&
              Boolean(label && line && line.top >= label.bottom - 1 && line.width > 100);
          }),
        };
      }));
      assert(fits.every((entry) => entry.count === 5 && entry.fits),
        `maintenance mobile fields clipped/overlapping at ${width}px: ${JSON.stringify(fits)}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
        `maintenance mobile cards overflow at ${width}px`);
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${baseUrl}/maintenance/generator-maintenance-checklist/`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#records .record-table-wrap').isVisible(), true,
    'checklist print must retain its original record table');
  assert.equal(await page.locator('#records .record-card-list').isVisible(), false,
    'checklist mobile cards must not duplicate printed content');
  await page.emulateMedia({ media: 'screen' });

  // A mobile browser requesting a desktop-size (~980px) viewport must still
  // show writable labels, never an unreadable five-column grid. On wide desktops
  // the full semantic table remains visible, and print includes all 12 rows.
  for (const width of [320, 390, 430, 640, 768, 980, 1024, 1199, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/maintenance/maintenance-log/`, { waitUntil: 'networkidle' });
    const cards = page.locator('.maintenance-log .log-card-list');
    const table = page.locator('.maintenance-log .log-table-wrap');
    const shouldShowCards = width < 1200;
    assert.equal(await cards.isVisible(), shouldShowCards, `printable log card visibility at ${width}px`);
    assert.equal(await table.isVisible(), !shouldShowCards, `printable log table visibility at ${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
      `printable log horizontal overflow at ${width}px`);
    if (shouldShowCards) {
      const measurements = await cards.locator('li.log-card').evaluateAll((items) => items.map((el) => {
        const container = el.getBoundingClientRect();
        const fields = [...el.querySelectorAll('.log-card-field')];
        return { count: fields.length, valid: fields.every((f) => {
          const box = f.getBoundingClientRect();
          const name = f.querySelector('dt')?.getBoundingClientRect();
          const line = f.querySelector('dd')?.getBoundingClientRect();
          return box.left >= container.left - 2 && box.right <= container.right + 2 &&
            box.top >= container.top - 2 && box.bottom <= container.bottom + 2 &&
            Boolean(name && line && line.top >= name.bottom - 1 && line.width > 100);
        }) };
      }));
      assert.equal(measurements.length, 4, `expected four log screen preview cards at ${width}px`);
      assert(measurements.every((m) => m.count === 5 && m.valid),
        `log field overlap/clipping at ${width}px: ${JSON.stringify(measurements)}`);
    }
  }
  // Print/PDF must retain native table layout and all 12 service-log rows.
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${baseUrl}/maintenance/maintenance-log/`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.maintenance-log tbody tr:visible').count(), 12, 'service-log print lost record rows');
  assert.equal(await page.locator('.maintenance-log table').evaluate((el) => getComputedStyle(el).display), 'table',
    'service-log print must be a semantic table, not mobile cards');
  assert.equal(await page.locator('.maintenance-log .log-card-list').isVisible(), false,
    'service-log print must not duplicate mobile cards');
  assert.equal(await page.locator('.maintenance-log .log-table-wrap').isVisible(), true,
    'print must display 12-entry table');
  await page.emulateMedia({ media: 'screen' });

  // Full generated-route crawl: every static index page gets a mobile load,
  // one-H1, and horizontal-overflow check. This catches new content routes,
  // not just the hand-picked smoke cases above.
  const generatedRoutes = fs.readdirSync('dist', { recursive: true })
    .filter((entry) => typeof entry === 'string' && entry.endsWith('index.html'))
    .map((entry) => entry === 'index.html' ? '/' : '/' + entry.replace(/\\/g, '/').replace(/index\.html$/, ''))
    .sort();

  const knownRoutes = new Set(generatedRoutes);
  const internalLinks = new Set();

  await page.setViewportSize({ width: 390, height: 900 });
  for (const path of generatedRoutes) {
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    assert(response && response.ok(), `generated page failed to load: ${path}`);
    assert.equal(await page.locator('#main h1').count(), 1, `expected one content H1 at ${path}`);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      false,
      `horizontal overflow at generated route ${path}`,
    );
    await inspectMobileTableClipping(path, 390);
    const scrollingContainers = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#main .overflow-x-auto'))
        .filter((element) => {
          const node = element;
          const style = window.getComputedStyle(node);
          return style.display !== 'none' && node.getBoundingClientRect().height > 0 && node.scrollWidth > node.clientWidth + 2;
        })
        .map((element) => ({
          tag: element.tagName,
          text: (element.textContent ?? '').trim().slice(0, 90),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }))
    );
    assert.equal(
      scrollingContainers.length,
      0,
      `scrolling content container on mobile at ${path}: ${JSON.stringify(scrollingContainers)}`,
    );
    const links = await page.locator('#main a[href^="/"]').evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean)
    );
    for (const href of links) internalLinks.add(href);
  }

  for (const href of internalLinks) {
    const pathname = new URL(href, baseUrl).pathname;
    const normalized = pathname.endsWith('/') ? pathname : pathname + '/';
    if (knownRoutes.has(pathname) || knownRoutes.has(normalized)) continue;
    // Internal downloadable files are static resources rather than HTML routes.
    // Validate their physical presence AND that the preview server serves them;
    // do not skip link QA for missing or malformed assets.
    const relativeFile = decodeURIComponent(pathname).slice(1);
    assert(relativeFile && !relativeFile.split('/').includes('..'), `Unsafe internal asset href: ${href}`);
    const assetPath = 'dist/' + relativeFile;
    assert(fs.existsSync(assetPath) && fs.statSync(assetPath).isFile(), `internal link points to a non-generated route or file: ${href}`);
    const assetResponse = await page.request.get(baseUrl + pathname);
    assert(assetResponse.ok(), `internal asset is not served by preview: ${href} (${assetResponse.status()})`);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/sizing/what-size-generator-do-i-need/`, { waitUntil: 'networkidle' });
  assert.equal(
    await page.locator('#main form, #main input, #main select, #main textarea').count(),
    0,
    'static worksheet unexpectedly contains estimator controls',
  );
  assert.equal(
    await page.locator('#r-running, #r-peak, #r-size, #reset').count(),
    0,
    'retired estimator outputs were found',
  );
  assert(
    (await page.locator('#main').innerText()).toLowerCase().includes('static worksheet'),
    'static worksheet disclosure is missing',
  );


  // Regression for the five-column blank worksheet that previously squeezed into mobile/tablet.
  for (const width of [320, 390, 768, 1024, 1199]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/sizing/what-size-generator-do-i-need/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.static-load-table').isVisible(), false, `desktop worksheet visible at ${width}px`);
    const mobileNotes = page.locator('.static-load-mobile');
    assert.equal(await mobileNotes.isVisible(), true, `compact worksheet missing at ${width}px`);
    assert.equal(await mobileNotes.getAttribute('open'), null, `worksheet should start collapsed at ${width}px`);
    await mobileNotes.locator('summary').click();
    assert.equal(await mobileNotes.locator('.static-load-card').count(), 7, `expected seven worksheet note cards at ${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `worksheet overflows at ${width}px`);
  }
  for (const width of [1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/sizing/what-size-generator-do-i-need/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.static-load-mobile').isVisible(), false, `compact worksheet visible on desktop at ${width}px`);
    assert.equal(await page.locator('.static-load-table').isVisible(), true, `printable desktop table missing at ${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `desktop worksheet overflows at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${baseUrl}/sizing/what-size-generator-do-i-need/`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.static-load-table').isVisible(), true, 'printable worksheet table missing on print');
  assert.equal(await page.locator('.static-load-mobile').isVisible(), false, 'mobile notes should be hidden on print');
  await page.emulateMedia({ media: 'screen' });

  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.click('#menu-btn');
  assert.equal(await page.getAttribute('#menu-btn', 'aria-expanded'), 'true', 'mobile menu did not open');
  assert.equal(await page.locator('#mobile-nav').isVisible(), true, 'mobile navigation is not visible');
  assert(
    await page.evaluate(() => {
      const nav = document.querySelector('#mobile-nav');
      return nav ? nav.getBoundingClientRect().bottom <= window.innerHeight + 1 : false;
    }),
    'mobile menu exceeds viewport instead of becoming internally scrollable',
  );
  await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute('#menu-btn', 'aria-expanded'), 'false', 'Escape did not close the menu');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/sizing/what-size-generator-do-i-need/`, { waitUntil: 'networkidle' });
  const focusTarget = page.locator('#main a[href*="appliance-wattage-chart"]').first();
  assert(await focusTarget.count(), 'focus-test link is missing');
  await focusTarget.dispatchEvent('mousedown');
  assert(
    (await page.evaluate(() => document.documentElement.className)).includes('mouse-nav'),
    'pointer interaction state was not set',
  );
  await focusTarget.focus();
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle),
    'none',
    'pointer focus style did not match the site focus policy',
  );

  await page.goto(`${baseUrl}/sizing/what-size-generator-do-i-need/`, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  let keyboardRing = false;
  for (let i = 0; i < 14; i += 1) {
    keyboardRing = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
    });
    if (keyboardRing) break;
    await page.keyboard.press('Tab');
  }
  assert(keyboardRing, 'visible keyboard focus indicator was not found');

  const redirects = fs.readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');
  const target = '/sizing/what-size-generator-do-i-need/';
  assert(redirects.includes(`/sizing/calculator/ ${target} 301`), 'legacy calculator redirect is missing');
  assert(redirects.includes(`/sizing/calculator ${target} 301`), 'slashless legacy redirect is missing');

  const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert(
    vercel.redirects.some((rule) =>
      rule.has?.[0]?.value === 'www.standbygeneratorguide.com' &&
      rule.destination?.startsWith('https://standbygeneratorguide.com/') &&
      rule.permanent === true,
    ),
    'Vercel www-to-apex redirect is missing',
  );
  const netlify = fs.readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  assert(netlify.includes('from = "https://www.standbygeneratorguide.com/*"'), 'Netlify www redirect is missing');
  assert(netlify.includes('to = "https://standbygeneratorguide.com/:splat"'), 'Netlify apex destination is missing');

  assert.deepEqual(errors, [], `browser console/page errors: ${JSON.stringify(errors)}`);
  console.log(
    `Browser QA passed: ${smokeCases.length} targeted page/viewport combinations plus ${generatedRoutes.length} generated routes, ` +
      `${internalLinks.size} internal links checked, no horizontal overflow, static worksheet, mobile navigation, keyboard focus, and redirect configuration.`,
  );
} finally {
  await browser.close();
}
