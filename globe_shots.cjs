const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: false, // use the real X server (DISPLAY=:1) + NVIDIA GPU
    args: [
      '--no-sandbox',
      '--ozone-platform=x11',
      '--use-gl=angle',
      '--use-angle=gl-egl',
      '--ignore-gpu-blocklist',
      '--enable-gpu',
      '--window-size=1440,900',
      '--window-position=0,0',
    ],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  p.on('console', m => { const t = m.text(); if (/Context Lost|WebGL|error/i.test(t)) console.log('[page]', t); });
  p.on('pageerror', e => console.log('[pageerror]', e.message));

  const navStart = Date.now();
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  const shots = [9000, 11000];
  for (const t of shots) {
    const wait = t - (Date.now() - navStart);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const path = `/tmp/globe_${t}.png`;
    await p.screenshot({ path });
    const state = await p.evaluate(() => ({
      canvas: !!document.querySelector('.sv-globe canvas'),
      intro: !!document.querySelector('.sv-intro'),
    }));
    console.log(`shot ~${t}ms canvas=${state.canvas} intro=${state.intro}`);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
