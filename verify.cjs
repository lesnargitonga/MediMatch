const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome-stable', headless:false,
    args:['--no-sandbox','--ozone-platform=x11','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist','--enable-gpu','--window-size=1500,1000']});
  const p = await b.newPage(); await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
  // landing field stats
  await p.goto('http://localhost:5173/about',{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,1500));
  const land = await p.evaluate(()=>document.querySelector('.lx-bigstats')?.textContent||'(none)');
  const foot = await p.evaluate(()=>document.querySelector('.lx-foot')?.textContent||'');
  // command center -> nairobi drawer research stats
  let s=Date.now(); await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r, 12000-(Date.now()-s)));
  await p.evaluate(()=>document.querySelector('.sv-nai-pin')?.click());
  await new Promise(r=>setTimeout(r,5500));
  const research = await p.evaluate(()=>document.querySelector('.sv-research-stats')?.textContent||'(none)');
  const rfoot = await p.evaluate(()=>document.querySelector('.sv-research-foot')?.textContent||'');
  console.log('LANDING:', land);
  console.log('LANDING FOOT:', foot.slice(0,140));
  console.log('NAIROBI RESEARCH:', research);
  console.log('NAIROBI FOOT:', rfoot.slice(0,160));
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
