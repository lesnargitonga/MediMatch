const puppeteer = require('puppeteer');
(async () => {
  const tys = process.argv.slice(2);
  const b = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: false,
    args: ['--no-sandbox', '--ozone-platform=x11', '--use-gl=angle', '--use-angle=gl-egl',
      '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1440,900'],
  });
  for (const ty of tys) {
    const p = await b.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    const navStart = Date.now();
    await p.goto(`http://localhost:5173/?ty=${ty}`, { waitUntil: 'domcontentloaded' });
    const wait = 3400 - (Date.now() - navStart);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    await p.screenshot({ path: `/tmp/sweep_ty${ty}.png` });
    console.log(`ty=${ty} -> /tmp/sweep_ty${ty}.png`);
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
