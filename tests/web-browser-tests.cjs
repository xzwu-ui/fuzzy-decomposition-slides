'use strict';
// Browser integration checks using Chrome's protocol and Node's built-in WebSocket.
// No browser automation package is required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const project = path.resolve(__dirname, '..');
const qa = path.join(__dirname, 'qa-web');
const browserPath = process.env.BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  fs.mkdirSync(qa, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fuzzy-lecture-browser-'));
  const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let spawnError;
    browser.on('error', error => { spawnError = error; });
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let attempt = 0; attempt < 100 && !fs.existsSync(portFile); attempt++) {
      if (spawnError) throw spawnError;
      if (browser.exitCode !== null) throw new Error('Chrome exited before browser checks: ' + browser.exitCode);
      await delay(100);
    }
    assert(fs.existsSync(portFile), 'Chrome debugging endpoint did not start');
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await fetch('http://127.0.0.1:' + port + '/json/list').then(response => response.json());
    const target = targets.find(item => item.type === 'page');
    assert(target, 'No browser page target');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let serial = 0;
    const pending = new Map(), errors = [], requests = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const item = pending.get(message.id);
        if (!item) return;
        pending.delete(message.id);
        clearTimeout(item.timer);
        message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      } else if (message.method === 'Network.requestWillBeSent' && /^https?:/.test(message.params.request.url)) {
        requests.push(message.params.request.url);
      }
    });
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++serial;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Browser command timeout: ' + method)); }, 20000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    async function waitFor(expression, timeout = 4000) {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await evaluate(expression)) return; await delay(60); }
      throw new Error('Browser assertion timed out: ' + expression);
    }
    async function open(filename) {
      await send('Page.navigate', { url: pathToFileURL(path.join(project, filename)).href });
      await waitFor("document.readyState === 'complete' && !!window.Fuzzy");
      await evaluate('document.fonts.ready.then(() => true)');
      await delay(120);
    }
    async function click(selector) {
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await delay(30);
    }
    async function setInput(selector, value, event = 'input') {
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(String(value))}; el.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true })); })()`);
    }
    async function screenshot(name, full = false) {
      const params = { format: 'png', captureBeyondViewport: full };
      if (full) {
        const metrics = await send('Page.getLayoutMetrics');
        params.clip = { x: 0, y: 0, width: metrics.cssContentSize.width, height: metrics.cssContentSize.height, scale: 1 };
      }
      const result = await send('Page.captureScreenshot', params);
      fs.writeFileSync(path.join(qa, name + '.png'), Buffer.from(result.data, 'base64'));
    }
    async function viewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 600 });
      await delay(90);
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
    const report = { operations: [], layouts: [], errors, requests };
    await viewport(1440, 1000);
    await open('web.html');
    assert.equal(await evaluate('document.querySelectorAll(".chapter").length'), 7);
    assert.equal(await evaluate('document.querySelectorAll(".katex-error").length'), 0);
    assert.equal(await evaluate('document.querySelectorAll(".proof-step").length'), 4);
    assert.equal(await evaluate('!!window.Slides'), false);
    await screenshot('desktop-home');
    await screenshot('desktop-full', true);
    await evaluate("document.documentElement.style.scrollBehavior='auto'; document.querySelector('#report').scrollIntoView({block:'start'})");
    await waitFor("document.querySelector('#toc a.active')?.hash === '#report'");
    await screenshot('desktop-report');
    await evaluate('window.scrollTo(0,0)');

    await setInput('#lambda-slider', 1000);
    await click('#cut-strong');
    assert((await evaluate('document.querySelector("#cut-interval").textContent')).includes('∅'));
    assert.equal(await evaluate('document.querySelector("#cut-strong").getAttribute("aria-pressed")'), 'true');
    await click('#cut-normal');
    await setInput('#lambda-slider', 600);
    const dragPoint = await evaluate("(() => { document.documentElement.style.scrollBehavior = 'auto'; const el = document.querySelector('#cut-plot'); el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height*.31 }; })()");
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dragPoint.x, y: dragPoint.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dragPoint.x, y: dragPoint.y, button: 'left', clickCount: 1 });
    assert.notEqual(await evaluate('CutDemo.state.lambda'), 600);
    await click('#cut-reset');
    report.operations.push('ordinary/strong cuts, peak endpoint, SVG drag, reset, accessible pressed states');

    for (const id of ['q', 'r']) {
      await click('[data-choice="' + id + '"]');
      assert(await evaluate('Fuzzy.legal(Fuzzy.DEMO, 600, TheoremDemo.choices)'));
    }
    await setInput('#h-level', 900, 'change');
    assert.equal(await evaluate('document.querySelectorAll("[data-choice]").length'), 1);
    await setInput('#h-level', 600, 'change');
    report.operations.push('H boundary choices and critical-level selection remain legal');

    for (const side of ['left', 'right']) {
      const host = '#' + side + '-animation', index = side === 'left' ? 0 : 1;
      await evaluate(`document.querySelector(${JSON.stringify(host)}).scrollIntoView({block:'center'})`);
      await delay(90);
      await click(host + ' [data-action=advance]');
      assert.equal(await evaluate(`TheoremDemo.controllers[${index}].count`), 1);
      await setInput(host + ' input', 6);
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(host + ' .aggregate-set')}).textContent`), side === 'left' ? '{ p, q, r }' : '{ p }');
      assert((await evaluate(`document.querySelector(${JSON.stringify(host + ' .certificate-text')}).textContent`)).includes('✓'));
      await click(host + ' [data-action=replay]');
      await delay(180);
      assert(await evaluate(`TheoremDemo.controllers[${index}].playing`));
      await click(host + ' [data-action=play]');
      const cursor = await evaluate(`TheoremDemo.controllers[${index}].cursor`);
      await delay(150);
      assert.equal(await evaluate(`TheoremDemo.controllers[${index}].cursor`), cursor);
      await click(host + ' [data-action=play]');
      await evaluate('window.scrollTo(0,0)');
      await delay(200);
      assert.equal(await evaluate(`TheoremDemo.controllers[${index}].playing`), false);
    }
    report.operations.push('both recovery results, exact certificates, playback, pause freeze and pause on leaving view');

    await setInput('#witness-element', 'c', 'change');
    await setInput('#witness-lambda', 761);
    assert.equal(await evaluate('WebLecture.witness.alpha'), 760.5);
    assert((await evaluate('document.querySelector("#witness-formula").textContent')).includes('0.7605'));
    await setInput('#witness-lambda', 760);
    assert.equal(await evaluate('WebLecture.witness.needsWitness'), false);
    await click('[data-witness-side="right"]');
    assert.equal(await evaluate('WebLecture.witness.needsWitness'), false);
    await setInput('#witness-lambda', 759);
    assert.equal(await evaluate('WebLecture.witness.alpha'), 759.5);
    await setInput('#witness-lambda', 1000);
    assert.equal(await evaluate('WebLecture.witness.emptyIndex'), true);
    await click('[data-witness-side="left"]');
    await setInput('#witness-lambda', 0);
    assert.equal(await evaluate('WebLecture.witness.emptyIndex'), true);
    await setInput('#witness-element', 'd', 'change');
    await setInput('#witness-lambda', 760);
    report.operations.push('midpoint witnesses, exact half-thousandth labels, equality and empty-index endpoints');

    for (const boundary of [false, true]) {
      await evaluate(`(() => { const el = document.querySelector('#case-boundary'); el.checked = ${boundary}; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
      await click('#case-intersection');
      assert((await evaluate('document.querySelector("#case-status").textContent')).includes('{ a, b, c }'));
      await click('#case-union');
      assert((await evaluate('document.querySelector("#case-status").textContent')).includes('{ a, b }'));
    }
    report.operations.push('six-element case and c boundary invariance');

    for (const [width, height] of [[1440,1000], [1024,768], [768,1024], [390,844], [320,720]]) {
      await viewport(width, height);
      await evaluate('window.scrollTo(0,0)');
      await delay(60);
      const layout = await evaluate(`(() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,mathOverflow:[...document.querySelectorAll('[data-math],#witness-formula')].filter(el=>el.clientWidth>0 && el.scrollWidth>el.clientWidth+2).map(el=>el.dataset.math||el.id)}))()`);
      report.layouts.push(layout);
      assert(layout.scrollWidth <= layout.width + 1, 'Horizontal page overflow at ' + width);
      assert.equal(layout.mathOverflow.length, 0, 'Formula overflow at ' + width + ': ' + layout.mathOverflow.join(', '));
    }
    await viewport(390, 844);
    await click('#menu-toggle');
    assert.equal(await evaluate('document.querySelector("#menu-toggle").getAttribute("aria-expanded")'), 'true');
    await click('#toc a[href="#proof"]');
    await delay(100);
    assert.equal(await evaluate('document.querySelector("#menu-toggle").getAttribute("aria-expanded")'), 'false');
    assert.equal(await evaluate('document.querySelector("#toc a.active").hash'), '#proof');
    await screenshot('mobile-proof');
    await evaluate('window.scrollTo(0,0)');
    await screenshot('mobile-home');
    await screenshot('mobile-full', true);
    await evaluate("document.querySelector('#report').scrollIntoView({block:'start'})");
    await screenshot('mobile-report');
    await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');
    await delay(100);
    assert.equal(await evaluate('document.querySelector("#reading-percent").textContent'), '100%');
    report.operations.push('five responsive sizes, mobile directory and reading progress');

    await open('web-standalone.html');
    assert.equal(await evaluate('!!window.WebLecture && document.querySelectorAll(".katex-error").length===0'), true);
    await setInput('#lambda-slider', 1000);
    await click('#cut-strong');
    assert((await evaluate('document.querySelector("#cut-interval").textContent')).includes('∅'));
    await viewport(1920, 1080);
    await open('index.html');
    assert.equal(await evaluate('!!window.Slides && document.querySelectorAll(".slide").length===8'), true);
    assert.equal(await evaluate('document.querySelectorAll(".katex-error").length'), 0);
    report.operations.push('offline standalone lecture and independent original slide entry');
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    fs.writeFileSync(path.join(__dirname, 'web-browser-report.json'), JSON.stringify(report, null, 2));
    console.log('PASS: ' + report.operations.length + ' browser check groups; ' + report.layouts.length + ' screen sizes; no page errors or network requests.');
    console.log('Screenshots: ' + qa);
  } finally {
    if (socket) socket.close();
    browser.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
