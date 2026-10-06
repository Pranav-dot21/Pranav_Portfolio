// The finale's lifecycle: the last scene of the film, the reference image
// brought alive. Layer order (back to front): the plate canvas (wordmark +
// red fog, staged) -> the man's canvas (the artwork's own matted figure +
// a foreground veil) -> the editorial captions and the functional row.

import { createGL } from '../gl/renderer.js';
import { Finale } from './finale.js';
import { sample6, T6 } from './timeline6.js';

const damp = (v, to, k, dt) => v + (to - v) * (1 - Math.exp(-k * dt));

export async function initFinale() {
  const section = document.getElementById('fin');
  const back = document.getElementById('finBack');
  const front = document.getElementById('finMan');
  if (!section || !back || !front) return null;

  const glB = createGL(back);
  const glF = glB ? createGL(front, { alpha: true }) : null;
  if (!glB || !glF) {
    section.classList.add('is-fallback', 'is-set');
    return null;
  }

  const fin = new Finale(back, glB, front, glF);
  fin.manBox = [480, 40, 640, 853];
  await fin.load();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const caps = [...section.querySelectorAll('.f-cap')];
  caps.forEach((el, i) => el.style.setProperty('--li', String(i)));

  let resizeId;
  function place() {
    fin.resize(window.innerWidth, window.innerHeight,
      Math.min(window.devicePixelRatio || 1, 2));
    section.classList.toggle('is-portrait',
      window.innerWidth / window.innerHeight < 0.75);
  }
  place();
  window.addEventListener('resize', () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(place, 140);
  });

  const ptr = { tx: 0, ty: 0, x: 0, y: 0, inside: false };
  section.addEventListener('pointermove', (e) => {
    const r = section.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    ptr.inside = true;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { ptr.inside = false; });

  const state = { started: 0, running: false, visible: false, raf: 0, last: 0 };

  const frame = (now) => {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - state.last) / 1000 || 0.016);
    state.last = now;
    const t = reduced ? T6.live + 2 : (now - state.started) / 1000;
    const s = sample6(t);

    ptr.x = damp(ptr.x, ptr.inside ? ptr.tx : 0, 2.6, dt);
    ptr.y = damp(ptr.y, ptr.inside ? ptr.ty : 0, 2.6, dt);
    fin.par.x = ptr.x;
    fin.par.y = ptr.y;
    fin.render(t, s);

    if (s.caps > 0) section.classList.add('is-caps');
    if (s.bar > 0) section.classList.add('is-bar');
    state.raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (state.running) return;
    state.running = true;
    state.last = performance.now();
    if (!state.started) state.started = performance.now();
    state.raf = requestAnimationFrame(frame);
  };
  const stop = () => { state.running = false; cancelAnimationFrame(state.raf); };

  new IntersectionObserver((entries) => {
    for (const e of entries) {
      state.visible = e.isIntersecting;
      if (e.isIntersecting) start(); else stop();
    }
  }, { threshold: 0.30 }).observe(section);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else if (state.visible) start();
  });

  window.__shot6 = async (name = 'finale', at = null) => {
    const t = at !== null ? at : (performance.now() - state.started) / 1000;
    fin.render(t, sample6(t));
    const flat = document.createElement('canvas');
    flat.width = back.width;
    flat.height = back.height;
    const cx = flat.getContext('2d');
    cx.drawImage(back, 0, 0);
    cx.drawImage(front, 0, 0);
    const url = flat.toDataURL('image/png');
    await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: url });
    return `${flat.width}x${flat.height} @ t=${t.toFixed(2)}`;
  };
  window.__finale = { fin, state, section };

  return { fin, section };
}
