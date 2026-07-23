const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:'new', args:['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 414, height: 896 });
  await p.goto('http://localhost:8082', { waitUntil:'networkidle2', timeout:120000 });
  await new Promise(r=>setTimeout(r,5000));
  // What actually lives in the bottom 90px of the screen?
  const found = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 800 && r.top < 896 && r.width > 20 && r.width < 300 && r.height > 10) {
        const cs = getComputedStyle(el);
        out.push({
          tag: el.tagName,
          role: el.getAttribute('role'),
          text: (el.innerText||'').slice(0,24).replace(/\n/g,'|'),
          rect: [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
          filter: cs.filter, backdrop: cs.backdropFilter, bg: cs.backgroundColor,
        });
      }
    });
    return out.slice(0,25);
  });
  console.log(JSON.stringify(found,null,1));
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
