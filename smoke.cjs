const puppeteer = require('puppeteer');
const FAIL = [];
const log = (...a) => console.log(...a);
(async () => {
  const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome-stable', headless:false,
    args:['--no-sandbox','--ozone-platform=x11','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist','--enable-gpu','--window-size=1500,1000']});
  const p = await b.newPage(); await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
  p.on('console', m => { if (m.type()==='error') { const t=m.text(); if(!/Future Flag|favicon|Download the React|tiles?\.|cartocdn|404 \(Not Found\) .*\.(png|pbf)/i.test(t)) errs.push('CONSOLE: '+t.slice(0,160)); } });
  const check = async (name, fn) => { try { const r = await fn(); log(`  ${r?'✓':'✗'} ${name}`); if(!r) FAIL.push(name); } catch(e){ log(`  ✗ ${name} (${e.message})`); FAIL.push(name+': '+e.message); } };

  // ---- Command center ----
  log('\n[/] command center');
  let s=Date.now(); errs.length=0;
  await p.goto('http://localhost:5173/',{waitUntil:'domcontentloaded'});
  await new Promise(r=>setTimeout(r, 12000-(Date.now()-s)));
  await check('national map canvas present', ()=>p.evaluate(()=>!!document.querySelector('.sv-natmap canvas')));
  await check('AI brief rendered', ()=>p.evaluate(()=>(document.querySelector('.sv-brief p')?.textContent||'').length>40));
  await check('impact pill present', ()=>p.evaluate(()=>!!document.querySelector('.sv-impact-toggle')));
  await check('impact panel opens', async()=>{ await p.evaluate(()=>document.querySelector('.sv-impact-toggle')?.click()); await new Promise(r=>setTimeout(r,400)); return p.evaluate(()=>!!document.querySelector('.sv-panel')); });
  await check('heatmap toggles', async()=>{ await p.evaluate(()=>document.querySelector('.sv-natmap-heat')?.click()); await new Promise(r=>setTimeout(r,500)); return p.evaluate(()=>document.querySelector('.sv-natmap-heat')?.classList.contains('on')); });
  await check('Nairobi drawer opens', async()=>{ await p.evaluate(()=>document.querySelector('.sv-nai-pin')?.click()); await new Promise(r=>setTimeout(r,3500)); return p.evaluate(()=>!!document.querySelector('.sv-nmap canvas')); });
  await check('Nairobi ops filters present', ()=>p.evaluate(()=>document.querySelectorAll('.sv-ops-filters button').length>=4));
  await check('research stats present', ()=>p.evaluate(()=>(document.querySelector('.sv-research-stats')?.textContent||'').includes('55.7%')));
  log('  errors:', errs.length, errs.slice(0,4).join(' | '));

  // ---- Landing ----
  log('\n[/about] landing'); errs.length=0;
  await p.goto('http://localhost:5173/about',{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,1500));
  await check('hero headline', ()=>p.evaluate(()=>!!document.querySelector('.lx-title')));
  await check('field stats (90.3%)', ()=>p.evaluate(()=>(document.body.textContent||'').includes('90.3%')));
  log('  errors:', errs.length, errs.slice(0,4).join(' | '));

  // ---- Listings ----
  log('\n[/listings] listings'); errs.length=0;
  await p.goto('http://localhost:5173/listings',{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,2200));
  await check('listings render', ()=>p.evaluate(()=>document.querySelectorAll('.lst .card').length>0));
  log('  errors:', errs.length, errs.slice(0,4).join(' | '));

  // ---- Auth ----
  log('\n[/login] auth'); errs.length=0;
  await p.goto('http://localhost:5173/login',{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,1200));
  await check('auth split shell', ()=>p.evaluate(()=>!!document.querySelector('.auth-shell')));
  // login
  await check('login flow', async()=>{ try{ await p.type('input[type=email]','admin@medimatch.test'); await p.type('input[type=password]','Admin1234'); await p.click('.auth-submit'); await new Promise(r=>setTimeout(r,2500)); return true;}catch(e){return false;} });
  log('  errors:', errs.length, errs.slice(0,4).join(' | '));

  // ---- Dashboard ----
  log('\n[/dashboard] dashboard'); errs.length=0;
  await p.goto('http://localhost:5173/dashboard',{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,1800));
  await check('dashboard renders', ()=>p.evaluate(()=>!!document.querySelector('.dsh')));
  await check('tabs work (Browse)', async()=>{ await p.evaluate(()=>{const t=[...document.querySelectorAll('.dsh .tab')].find(x=>x.textContent.trim()==='Browse'); t&&t.click();}); await new Promise(r=>setTimeout(r,1500)); return p.evaluate(()=>document.querySelectorAll('.dsh .listing-item').length>0); });
  log('  errors:', errs.length, errs.slice(0,4).join(' | '));

  log('\n==== SMOKE RESULT:', FAIL.length===0 ? 'ALL PASS ✓' : `${FAIL.length} FAIL ✗`, '====');
  if(FAIL.length) log(FAIL.join('\n'));
  await b.close();
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
