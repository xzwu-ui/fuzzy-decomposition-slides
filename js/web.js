(function () {
  'use strict';
  const F = window.Fuzzy, G = window.Graphics;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const exactLevel = n => (n / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('#toc a')];
  const menu = document.getElementById('chapter-nav');
  const menuButton = document.getElementById('menu-toggle');

  // The demonstrations are shared with the slides; the reading shell is independent.
  document.querySelectorAll('[data-math]').forEach(el => {
    if (el.dataset.math) G.math(el, el.dataset.math);
  });
  document.querySelectorAll('.sampling-note').forEach(el => {
    el.textContent = el.textContent.replace('第6页', '第 04 节');
  });
  document.querySelectorAll('.animation-status').forEach(el => {
    el.textContent = '使用按钮或进度条逐步探索';
  });
  document.querySelectorAll('.animation-progress').forEach(el => {
    el.setAttribute('aria-label', (el.closest('[data-side]').dataset.side === 'left' ? '交集' : '并集') + '恢复进度');
  });
  function syncControls() {
    document.getElementById('cut-normal').setAttribute('aria-pressed', String(!CutDemo.state.strong));
    document.getElementById('cut-strong').setAttribute('aria-pressed', String(CutDemo.state.strong));
    document.querySelectorAll('.animation-status').forEach(el => {
      if (el.textContent.includes('空格')) el.textContent = '使用按钮或进度条逐步探索';
    });
  }
  document.addEventListener('click', syncControls);
  document.addEventListener('input', syncControls);
  document.querySelectorAll('.animation-status').forEach(el => {
    new MutationObserver(() => {
      if (el.textContent.includes('空格')) el.textContent = '使用按钮或进度条逐步探索';
    }).observe(el, { childList: true });
  });

  function closeMenu() {
    menu.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
  menuButton.addEventListener('click', () => {
    const open = menu.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  links.forEach(link => link.addEventListener('click', () => {
    const isMobile = menuButton.getAttribute('aria-expanded') === 'true';
    closeMenu();
    if (isMobile) {
      const heading = document.querySelector(link.getAttribute('href') + ' h2');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('menu-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });

  let scrollQueued = false;
  function updateReading() {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const progress = height > 0 ? Math.min(100, Math.max(0, window.scrollY / height * 100)) : 100;
    document.getElementById('reading-progress').style.width = progress + '%';
    document.getElementById('reading-percent').textContent = Math.round(progress) + '%';
    const marker = Math.max(140, window.innerHeight * 0.24);
    let active = null;
    chapters.forEach(chapter => { if (chapter.getBoundingClientRect().top <= marker) active = chapter.id; });
    if (height > 0 && window.scrollY >= height - 2) active = chapters[chapters.length - 1]?.id;
    links.forEach(link => {
      const selected = link.hash === '#' + active;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateReading); }
  }, { passive: true });
  window.addEventListener('resize', updateReading);
  document.fonts.ready.then(updateReading);

  const witness = { side: 'left', lambda: 760, id: 'd' };
  function renderWitness() {
    const item = F.COURSE.find(x => x.id === witness.id), mu = item.mu, lambda = witness.lambda;
    const left = witness.side === 'left', emptyIndex = left ? lambda === 0 : lambda === 1000;
    const needsWitness = !emptyIndex && (left ? mu < lambda : mu > lambda);
    const alpha = needsWitness ? (mu + lambda) / 2 : null;
    const color = left ? '#087f72' : '#366ab5';
    document.getElementById('witness-value').textContent = exactLevel(lambda);
    document.querySelectorAll('[data-witness-side]').forEach(button => {
      const selected = button.dataset.witnessSide === witness.side;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const svg = document.getElementById('witness-axis');
    svg.replaceChildren();
    const x = value => 35 + value / 1000 * 570;
    G.add(svg, 'line', { x1: 35, y1: 55, x2: 605, y2: 55, stroke: '#d0d9cb', 'stroke-width': 3 });
    G.add(svg, 'text', { x: 35, y: 107, fill: '#6e7c76', 'font-size': 14, 'text-anchor': 'middle' }, '0');
    G.add(svg, 'text', { x: 605, y: 107, fill: '#6e7c76', 'font-size': 14, 'text-anchor': 'middle' }, '1');
    const align = value => value < 130 ? 'start' : value > 870 ? 'end' : 'middle';
    G.add(svg, 'line', { x1: x(lambda), y1: 31, x2: x(lambda), y2: 67, stroke: '#a96b17', 'stroke-width': 2 });
    G.add(svg, 'circle', { cx: x(lambda), cy: 55, r: 6, stroke: '#a96b17', fill: '#fffefa', 'stroke-width': 2 });
    G.add(svg, 'text', { x: x(lambda), y: 20, fill: '#a96b17', 'font-size': 16, 'text-anchor': align(lambda) }, 'λ = ' + exactLevel(lambda));
    G.add(svg, 'circle', { cx: x(mu), cy: 55, r: 4, fill: '#203d3b' });
    G.add(svg, 'text', { x: x(mu), y: 83, fill: '#203d3b', 'font-size': 16, 'text-anchor': align(mu) }, 'μ(' + item.id + ') = ' + exactLevel(mu));
    if (needsWitness) {
      G.add(svg, 'circle', { cx: x(alpha), cy: 55, r: 5, fill: color });
      G.add(svg, 'line', { x1: x(alpha), y1: 55, x2: x(alpha), y2: 92, stroke: color, 'stroke-width': 1, 'stroke-dasharray': '3 3' });
      G.add(svg, 'text', { x: x(alpha), y: 111, fill: color, 'font-size': 15, 'text-anchor': align(alpha) }, 'α = ' + exactLevel(alpha));
    }
    const formula = document.getElementById('witness-formula');
    let tex, explanation;
    if (emptyIndex) {
      tex = left ? '\\bigcap\\varnothing=X=A_0' : '\\bigcup\\varnothing=\\varnothing=A_1^+';
      explanation = '这里没有可取的 α。采用空交 = X、空并 = ∅ 的约定，就能将等式延伸到这个端点；课件原始公式排除此端点。';
    } else if (needsWitness) {
      tex = left ? `${exactLevel(mu)}<\\alpha=${exactLevel(alpha)}<${exactLevel(lambda)}` : `${exactLevel(lambda)}<\\alpha=${exactLevel(alpha)}<${exactLevel(mu)}`;
      explanation = left ? `取中点后，${item.id} 的隶属度低于 α，它必须被 H(α) 排除。因此 ${item.id} 不在所有下方 H 的交集中。` : `取中点后，${item.id} 的隶属度高于 α，它必须被 H(α) 包含。因此 ${item.id} 在至少一个上方 H 中，也在并集中。`;
    } else {
      tex = left ? `\\mu_A(${item.id})=${exactLevel(mu)}\\ge\\lambda=${exactLevel(lambda)}` : `\\mu_A(${item.id})=${exactLevel(mu)}\\le\\lambda=${exactLevel(lambda)}`;
      explanation = left ? `${item.id} 对每个 α < λ 都满足 μ > α，始终被包含，不存在下方的排除见证。它会留在交集中。` : `${item.id} 对每个 α > λ 都满足 μ < α，始终被排除，不存在上方的包含见证。它不会进入并集。`;
    }
    G.math(formula, tex);
    document.getElementById('witness-explanation').textContent = explanation;
    window.WebLecture.witness = { ...witness, mu, alpha, needsWitness, emptyIndex };
  }
  window.WebLecture = { witness: null, exactLevel, updateReading };
  document.getElementById('witness-element').addEventListener('change', event => { witness.id = event.target.value; renderWitness(); });
  document.getElementById('witness-lambda').addEventListener('input', event => { witness.lambda = Number(event.target.value); renderWitness(); });
  document.querySelectorAll('[data-witness-side]').forEach(button => button.addEventListener('click', () => { witness.side = button.dataset.witnessSide; renderWitness(); }));
  renderWitness();

  // Pause invisible demonstrations without resetting the reader's progress or choices.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) return;
      if (entry.target.id === 'cuts') CutDemo.pause();
      if (entry.target.id === 'left-animation') TheoremDemo.controllers[0].pause();
      if (entry.target.id === 'right-animation') TheoremDemo.controllers[1].pause();
      if (entry.target.id === 'example') TheoremDemo.caseDemo.pause();
    });
  });
  ['cuts', 'left-animation', 'right-animation', 'example'].forEach(id => observer.observe(document.getElementById(id)));
  function pauseAll() {
    CutDemo.pause();
    TheoremDemo.controllers.forEach(controller => controller.pause());
    TheoremDemo.caseDemo.pause();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });
  window.addEventListener('pagehide', pauseAll);
  window.addEventListener('beforeprint', pauseAll);
  const printState = new Map();
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('details').forEach(el => { printState.set(el, el.open); el.open = true; });
  });
  window.addEventListener('afterprint', () => {
    printState.forEach((open, el) => { el.open = open; });
    printState.clear();
  });
  document.getElementById('print-lecture').addEventListener('click', () => window.print());
  if (reducedMotion) document.documentElement.classList.add('reduced-motion');
  updateReading();
})();
