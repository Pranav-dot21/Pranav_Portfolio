// Independent transform properties compose with each scene's choreography.
export function initDepth() {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const root = document.documentElement;
  const light = document.createElement('div');
  light.className = 'depth-light';
  light.setAttribute('aria-hidden', 'true');
  document.body.append(light);
  const progress = document.createElement('div');
  progress.className = 'depth-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  const groups = [
    ['.stage-wrap', '.hero__portrait, #stage, .welcome, .chip, .grid-dots'],
    ['#universe', '.universe__title, .universe__portrait, .universe__profile'],
    ['#chrono', '.chrono__title, .chrono__deck'],
    ['#gallery', '.gallery__world, .gallery__project-notes, #galleryTitle'],
  ].map(([container, selector]) => ({
    container: document.querySelector(container),
    layers: [...document.querySelectorAll(selector)],
  }));
  groups.forEach(({ layers }) => layers.forEach(el => el.classList.add('depth-layer')));
  let tx = 0, ty = 0, x = 0, y = 0, last = 0, id;
  let hovered = null;
  const interactive = '.universe__skills li, .gallery__project-notes article, .yr, .g-card';
  window.addEventListener('pointermove', e => {
    if (!fine.matches) return;
    tx = e.clientX / innerWidth * 2 - 1;
    ty = e.clientY / innerHeight * 2 - 1;
    const next = e.target.closest(interactive);
    if (hovered && hovered !== next) {
      hovered.classList.remove('depth-hover');
      hovered.style.removeProperty('rotate');
      hovered.style.removeProperty('translate');
    }
    hovered = next;
    if (hovered && !motion.matches) {
      const box = hovered.getBoundingClientRect();
      const px = (e.clientX - box.left) / box.width - .5;
      const py = (e.clientY - box.top) / box.height - .5;
      hovered.classList.add('depth-hover');
      hovered.style.rotate = `${-py} ${px} 0 ${Math.hypot(px, py) * 14}deg`;
      hovered.style.translate = '0 -5px';
    }
  }, { passive: true });
  const reset = () => {
    tx = ty = 0;
    if (hovered) {
      hovered.classList.remove('depth-hover');
      hovered.style.removeProperty('rotate');
      hovered.style.removeProperty('translate');
      hovered = null;
    }
  };
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);

  function frame(now) {
    const dt = Math.min((now - last) / 1000 || .016, .05);
    last = now;
    const ease = 1 - Math.exp(-7 * dt);
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    const enabled = !motion.matches && !root.classList.contains('is-booting');
    const finale = document.getElementById('fin');
    const finaleVisible = finale && finale.getBoundingClientRect().top < innerHeight;
    light.style.opacity = enabled && fine.matches && !finaleVisible ? '.7' : '0';
    progress.style.opacity = finaleVisible ? '0' : '1';
    light.style.transform = `translate3d(${(x + 1) * innerWidth / 2}px, ${(y + 1) * innerHeight / 2}px, 0)`;
    progress.style.scale = `${scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)} 1`;
    for (const { container, layers } of groups) {
      if (!container) continue;
      const rect = container.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const hero = container.classList.contains('stage-wrap');
      const travel = hero ? Math.min(1, scrollY / innerHeight) :
        Math.max(-1, Math.min(1, (innerHeight / 2 - (rect.top + rect.height / 2)) / innerHeight));
      layers.forEach((el, i) => {
        const depth = i % 3 + 1;
        el.style.setProperty('--depth-x', `${enabled ? x * depth * 9 : 0}px`);
        el.style.setProperty('--depth-y', `${enabled ? y * depth * 6 - travel * depth * 25 : 0}px`);
        el.style.setProperty('--depth-rx', `${enabled ? -y * 1.8 : 0}deg`);
        el.style.setProperty('--depth-ry', `${enabled ? x * 2.8 : 0}deg`);
        el.style.setProperty('--depth-scale', enabled && hero ? 1 + travel * .06 : 1);
      });
    }
    id = requestAnimationFrame(frame);
  }
  const start = () => {
    cancelAnimationFrame(id);
    if (!document.hidden) { last = 0; id = requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', start);
  motion.addEventListener('change', reset);
  start();
}
