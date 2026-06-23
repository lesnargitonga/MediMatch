const puppeteer = require('puppeteer');
const path = require('path');
const OUT = '/tmp/shots';
require('fs').mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable', headless: false,
    args: ['--no-sandbox', '--ozone-platform=x11', '--use-gl=angle', '--use-angle=gl-egl',
           '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1520,980', '--hide-scrollbars'],
  });
  const p = await b.newPage();
  // 2x device scale → crisp 2880x1800 captures
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const shot = (name) => p.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: 1440, height: 900 } });
  const clickByText = (sel, txt) => p.evaluate((sel, txt) => {
    const el = [...document.querySelectorAll(sel)].find(e => e.textContent.includes(txt));
    if (el) { el.click(); return true; } return false;
  }, sel, txt);

  console.log('loading command floor…');
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await wait(14000); // globe intro + map tiles + first brief

  // 1) Explainable view — story/brief panel open with a lead route glowing
  await shot('command-explainable.png'); console.log('  ✓ command-explainable');

  // 2) National view — minimise the story card for a cleaner full map
  await p.evaluate(() => document.querySelector('.sv-story-toggle')?.click());
  await wait(900);
  await shot('command-national.png'); console.log('  ✓ command-national');
  // restore
  await p.evaluate(() => document.querySelector('.sv-story-toggle')?.click());
  await wait(600);

  // 3) Heatmap on
  await clickByText('.sv-mapctl-btn', 'Demand heatmap');
  await wait(1400);
  await shot('heatmap.png'); console.log('  ✓ heatmap');
  await clickByText('.sv-mapctl-btn', 'Demand heatmap'); // off
  await wait(700);

  // 4) Impact projection panel (select 1 year)
  await clickByText('.sv-mapctl-btn', 'Project impact');
  await wait(1100);
  await clickByText('.sim-tf button', '1 year');
  await wait(1300); // count-up animation settles
  await shot('impact.png'); console.log('  ✓ impact');
  await p.evaluate(() => document.querySelector('.sim-x')?.click());
  await wait(600);

  // 5) Copilot — open and ask a question via a suggestion chip
  await p.evaluate(() => document.querySelector('.sv-cp-launch')?.click());
  await wait(1200);
  const asked = await p.evaluate(() => {
    const chip = document.querySelector('.cp-suggest button, .cp-chip, .cp-suggestions button');
    if (chip) { chip.click(); return true; } return false;
  });
  await wait(asked ? 3200 : 1200); // let the typed answer reveal
  await shot('copilot.png'); console.log('  ✓ copilot (asked=' + asked + ')');
  await p.evaluate(() => document.querySelector('.sv-cp-launch')?.click());
  await wait(500);

  // 6) Nairobi research base drawer
  await clickByText('.sv-mapctl-btn', 'Nairobi research base');
  await wait(4200); // nairobi map load
  await shot('nairobi.png'); console.log('  ✓ nairobi');

  await b.close();
  console.log('DONE → ' + OUT);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
