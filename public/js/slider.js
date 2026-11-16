document.addEventListener('DOMContentLoaded', () => {
  const slidesEl = document.getElementById('slides');
  if (!slidesEl) return;
  const slides = slidesEl.children;
  const dots = document.querySelectorAll('.slider-dot');
  let current = 0;
  let timer = null;
  function show(i) {
    current = (i + slides.length) % slides.length;
    slidesEl.style.transform = 'translateX(-' + current * 100 + '%)';
    dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
  }
  function restart() { clearInterval(timer); timer = setInterval(() => show(current + 1), 5000); }
  const prev = document.querySelector('.slider-prev');
  const next = document.querySelector('.slider-next');
  if (prev) prev.addEventListener('click', () => { show(current - 1); restart(); });
  if (next) next.addEventListener('click', () => { show(current + 1); restart(); });
  dots.forEach((d, idx) => d.addEventListener('click', () => { show(idx); restart(); }));
  restart();
});
