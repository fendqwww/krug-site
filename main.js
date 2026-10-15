(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 860px)').matches;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* плавный скролл */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.1, smoothTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); lenis.scrollTo(a.getAttribute('href'), { offset: 0 }); }));
  }

  /* разбить заголовок на буквы */
  $$('.split').forEach(el => {
    const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { f.append(w); return; }
          const word = document.createElement('span'); word.style.display = 'inline-block'; word.style.whiteSpace = 'nowrap';
          [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; word.append(s); });
          f.append(word);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    });
    walk(el);
  });

  /* прелоадер: ждём картинки героя */
  const imgs = $$('img');
  let done = 0;
  const bar = $('#loader .bar'), pct = $('#pct');
  const tick = () => {
    done++;
    const p = Math.round(done / imgs.length * 100);
    pct.textContent = p; bar.style.strokeDashoffset = 314 - 314 * p / 100;
  };
  const loads = imgs.map(i => i.complete ? (tick(), 1) : new Promise(r => { i.addEventListener('load', () => { tick(); r(); }, { once: true }); i.addEventListener('error', () => { tick(); r(); }, { once: true }); }));
  Promise.race([Promise.all([...loads, document.fonts.ready]), new Promise(r => setTimeout(r, 4000))]).then(start);

  async function start() {
    try { await Promise.all($$('.hero img').map(i => i.decode ? i.decode().catch(() => {}) : 1)); } catch (e) {}
    pct.textContent = 100; bar.style.strokeDashoffset = 0;
    gsap.to('#loader', { autoAlpha: 0, duration: .6, delay: .25, onComplete: () => $('#loader').remove() });
    intro();
    scenes();
  }

  /* бутылки вылетают из глубины */
  function intro() {
    const tl = gsap.timeline({ delay: .35 });
    const bottles = ['.b0', '.b2', '.b3', '.b1', '.b4'];
    tl.from('.rings i', { scale: 0, opacity: 0, duration: 1.6, stagger: .12, ease: 'expo.out' }, 0);
    bottles.forEach((s, i) => {
      const side = s === '.b0' ? 0 : (['.b1', '.b2'].includes(s) ? -1 : 1);
      tl.fromTo(s,
        { z: -2400, y: 420, x: side * 260, rotation: side * -50 + (s === '.b0' ? 25 : 0), rotationY: 70, opacity: 0, scale: .6 },
        { z: 0, y: 0, x: 0, rotation: s === '.b0' ? 0 : side * 8, rotationY: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'expo.out', force3D: true },
        .1 + i * .12);
    });
    tl.from('.f1,.f2,.f3,.f4,.f5,.f6', { scale: 0, opacity: 0, rotation: () => gsap.utils.random(-180, 180), duration: 1.2, stagger: .06, ease: 'back.out(2)' }, .7);
    tl.add(burst, .55);
    tl.from('.hero .ch', { yPercent: 120, opacity: 0, rotation: 12, duration: .9, stagger: .025, ease: 'power4.out' }, .8);
    tl.from('.kicker,.pills li,.scroll-hint', { y: 30, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out' }, 1.2);
    tl.add(() => floatLoop(), 1.8);
  }

  function floatLoop() {
    $$('.fly').forEach((el, i) => {
      gsap.to(el, { yPercent: gsap.utils.random(-6, 6), rotation: '+=' + gsap.utils.random(-4, 4), duration: gsap.utils.random(2.6, 4.2), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * .1 });
    });
  }

  /* параллакс мышью и наклоном телефона */
  const stage = $('#stage');
  const flies = $$('.fly').map(el => ({ el, d: +el.dataset.depth, x: gsap.quickTo(el, 'x', { duration: .9, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: .9, ease: 'power3' }) }));
  const par = (nx, ny) => flies.forEach(f => { f.x(nx * 26 * f.d); f.y(ny * 18 * f.d); });
  addEventListener('pointermove', e => { if (scrollY < innerHeight) par(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5); });
  addEventListener('deviceorientation', e => { if (e.gamma == null || scrollY > innerHeight) return; par(gsap.utils.clamp(-1, 1, e.gamma / 30) * .5, gsap.utils.clamp(-1, 1, (e.beta - 45) / 30) * .5); });

  /* капли сыворотки на canvas */
  const cv = $('#drops'), cx = cv.getContext('2d');
  let parts = [];
  const fit = () => { const r = devicePixelRatio || 1; cv.width = cv.clientWidth * r; cv.height = cv.clientHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); };
  fit(); addEventListener('resize', fit);
  function burst(x, y, n = 70) {
    const W = cv.clientWidth, H = cv.clientHeight;
    x = typeof x === 'number' ? x : W / 2; y = typeof y === 'number' ? y : H * .48;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 9;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, r: 2 + Math.random() * 6, life: 1, c: Math.random() < .5 ? '244,236,200' : (Math.random() < .5 ? '198,240,90' : '255,255,255') });
    }
  }
  // фоновые пузырьки
  for (let i = 0; i < (mobile ? 18 : 36); i++) parts.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: 0, vy: -(.2 + Math.random() * .5), r: 1 + Math.random() * 3, life: 2, bg: 1, c: '255,255,255' });
  (function loop() {
    cx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      if (p.bg) { p.y += p.vy; if (p.y < -10) { p.y = cv.clientHeight + 10; p.x = Math.random() * cv.clientWidth; } cx.fillStyle = `rgba(${p.c},.25)`; }
      else { p.x += p.vx; p.y += p.vy; p.vy += .25; p.vx *= .98; p.life -= .012; cx.fillStyle = `rgba(${p.c},${Math.max(0, p.life)})`; }
      cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
    }
    if (scrollY < innerHeight * 1.2) requestAnimationFrame(loop); else setTimeout(() => requestAnimationFrame(loop), 500);
  })();
  $('.hero').addEventListener('click', e => { const r = cv.getBoundingClientRect(); burst(e.clientX - r.left, e.clientY - r.top, 40); });

  /* курсор-круг */
  const cur = $('#cursor');
  if (cur && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const qx = gsap.quickTo(cur, 'x', { duration: .25 }), qy = gsap.quickTo(cur, 'y', { duration: .25 });
    addEventListener('pointermove', e => { qx(e.clientX); qy(e.clientY); });
    $$('a,button,.fly').forEach(el => { el.addEventListener('mouseenter', () => cur.classList.add('big')); el.addEventListener('mouseleave', () => cur.classList.remove('big')); });
  }

  function scenes() {
    /* прогресс-кольцо */
    gsap.to('#progress .p', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

    /* герой разлетается при скролле */
    gsap.to('.hero-stage', { yPercent: 18, scale: 1.15, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.b1,.b2', { xPercent: -80, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.b3,.b4', { xPercent: 80, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { yPercent: -40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '40% top', end: 'bottom top', scrub: true } });

    /* появление */
    $$('.reveal').forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));

    /* счётчики */
    $$('.count').forEach(el => {
      const to = +el.dataset.to, o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('ru-RU') }) });
    });

    /* круг: закреплённая сцена */
    const texts = [
      'Поле «ЭкоНиваАгро» даёт корма для фермы.',
      'Ферма даёт молоко, до завода не больше 1,5 часа.',
      'Аннинский завод делает из молока творог.',
      'После творога остаётся кислая сыворотка. Раньше её было трудно пристроить.',
      'КРУГ возвращает её в еду: напиток на 60% состоит из сыворотки.',
      'Покупатель в Грозном получает 20 г белка за 139 ₽. Круг замкнулся.'
    ];
    const nodes = $$('.node'), txt = $('#cycleText');
    let last = -1;
    gsap.timeline({
      scrollTrigger: {
        trigger: '.cycle', start: 'top top', end: () => '+=' + innerHeight * (mobile ? 2.2 : 2.6), pin: '.cycle-pin', scrub: .6,
        onUpdate: s => {
          const i = Math.min(5, Math.floor(s.progress * 6.2));
          if (i !== last) {
            last = i;
            nodes.forEach((n, k) => n.classList.toggle('on', k <= i));
            gsap.fromTo(txt, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .4 });
            txt.textContent = texts[i];
          }
        }
      }
    }).to('#ringDraw', { strokeDashoffset: 0, ease: 'none' })
      .to('.cycle-center', { rotation: 360, ease: 'none' }, 0);

    /* путь бутылки: линия и бегунок */
    const wrap = $('.steps-wrap'), steps = $$('.step');
    gsap.to('#stepsPath', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top 60%', end: 'bottom 60%', scrub: true } });
    gsap.fromTo('#runner', { y: 0 }, { y: () => wrap.offsetHeight - 24, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top 60%', end: 'bottom 60%', scrub: true, invalidateOnRefresh: true } });
    steps.forEach(s => {
      ScrollTrigger.create({ trigger: s, start: 'top 62%', onEnter: () => s.classList.add('on'), onLeaveBack: () => s.classList.remove('on') });
      gsap.from(s, { opacity: 0, y: 50, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
    });

    /* грузовик Анна → Грозный */
    const km = $('#km');
    gsap.to('#truck', {
      x: () => $('.route-line').offsetWidth - $('#truck').offsetWidth, ease: 'none',
      scrollTrigger: { trigger: '.route', start: 'top 80%', end: 'bottom 40%', scrub: .5, invalidateOnRefresh: true, onUpdate: s => km.textContent = Math.round(s.progress * 1300).toLocaleString('ru-RU') }
    });

    /* состав: слои наливаются */
    const legend = $('#legend');
    $$('.layer').reverse().forEach(l => {
      const li = document.createElement('li');
      li.innerHTML = `<i style="background:${getComputedStyle(l).backgroundImage !== 'none' ? '' : getComputedStyle(l).backgroundColor}"></i><b>${l.dataset.n}</b><span>${l.dataset.t}</span>`;
      li.firstChild.style.background = getComputedStyle(l).backgroundImage !== 'none' ? getComputedStyle(l).backgroundImage : getComputedStyle(l).backgroundColor;
      legend.prepend(li);
    });
    ScrollTrigger.create({ trigger: '#gb', start: 'top 75%', once: true, onEnter: () => {
      $('.gb-body').classList.add('go');
      gsap.to('#legend li', { opacity: 1, y: 0, duration: .7, stagger: .15, ease: 'power3.out', delay: .3 });
    } });
    gsap.from('#gb', { rotation: -8, y: 80, scrollTrigger: { trigger: '.inside', start: 'top bottom', end: 'center center', scrub: true } });

    /* CO2 водопад */
    ScrollTrigger.create({ trigger: '#wf', start: 'top 75%', once: true, onEnter: () => {
      $$('#wf .col').forEach((c, i) => setTimeout(() => c.querySelector('i').style.transform = 'scaleY(1)', i * 260));
      setTimeout(() => $('#wf').classList.add('go'), 0);
    } });

    /* вкусы */
    $$('.taste').forEach((t, i) => gsap.from(t, { y: 80, rotation: [-6, 4, -4, 6][i], opacity: 0, duration: .9, delay: (i % 2) * .08, ease: 'back.out(1.4)', clearProps: 'transform', scrollTrigger: { trigger: t, start: 'top 92%' } }));
    $$('.taste').forEach(t => t.addEventListener('click', () => {
      t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
      if (navigator.vibrate) navigator.vibrate(40);
      setTimeout(() => t.classList.remove('shake'), 1400);
    }));

    /* финал */
    gsap.from('.big-ring', { scale: .4, opacity: 0, rotation: -90, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.final', start: 'top 70%' } });
    addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
