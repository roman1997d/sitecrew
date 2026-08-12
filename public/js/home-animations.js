(function initHomeAnimations() {
  const revealItems = document.querySelectorAll('[data-how-reveal]');
  if (!revealItems.length) {
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.22,
      rootMargin: '0px 0px -8% 0px',
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}());
