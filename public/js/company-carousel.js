(function () {
  const carousel = document.getElementById('companyCarousel');
  if (!carousel) return;

  const track = carousel.querySelector('.company-carousel-track');
  const slides = carousel.querySelectorAll('.company-carousel-slide');
  const prevBtn = carousel.querySelector('.carousel-btn-prev');
  const nextBtn = carousel.querySelector('.carousel-btn-next');
  const dotsContainer = carousel.querySelector('.company-carousel-dots');

  let currentIndex = 0;
  let autoplayTimer = null;
  const AUTOPLAY_MS = 5000;

  function getSlidesPerView() {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 992) return 2;
    return 3;
  }

  function getMaxIndex() {
    return Math.max(0, slides.length - getSlidesPerView());
  }

  function goTo(index) {
    const max = getMaxIndex();
    currentIndex = Math.max(0, Math.min(index, max));
    const slide = slides[0];
    if (!slide) return;

    const gap = 24;
    const slideWidth = slide.offsetWidth + gap;
    track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= max;

    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
      dot.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
    });
  }

  function buildDots() {
    dotsContainer.innerHTML = '';
    const total = getMaxIndex() + 1;
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => {
        goTo(i);
        resetAutoplay();
      });
      dotsContainer.appendChild(dot);
    }
  }

  function next() {
    goTo(currentIndex >= getMaxIndex() ? 0 : currentIndex + 1);
  }

  function prev() {
    goTo(currentIndex <= 0 ? getMaxIndex() : currentIndex - 1);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(next, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
  }

  function resetAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  prevBtn.addEventListener('click', () => { prev(); resetAutoplay(); });
  nextBtn.addEventListener('click', () => { next(); resetAutoplay(); });

  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  let touchStartX = 0;
  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    stopAutoplay();
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    startAutoplay();
  }, { passive: true });

  window.addEventListener('resize', () => {
    buildDots();
    goTo(Math.min(currentIndex, getMaxIndex()));
  });

  buildDots();
  goTo(0);
  startAutoplay();
})();
