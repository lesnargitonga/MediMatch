const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // /about research page — full page
  await page.goto('http://localhost:5173/about', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: 'docs/screenshots/about-research.png', fullPage: true });

  // Map: let the story reach the route/brief stage, capture the coordinator brief area
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 7000));
  await page.screenshot({ path: 'docs/screenshots/map-brief.png' });

  await browser.close();
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
