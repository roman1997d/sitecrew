(function () {
  const reviewImage = document.getElementById('reviewImage');
  const reviewEmpty = document.getElementById('reviewEmpty');
  const reviewActions = document.getElementById('reviewActions');
  const reviewCounter = document.getElementById('reviewCounter');
  const reviewApproveBtn = document.getElementById('reviewApproveBtn');
  const reviewRejectBtn = document.getElementById('reviewRejectBtn');

  let currentItem = null;
  let busy = false;

  async function apiRequest(path, options = {}) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  }

  function setBusy(nextBusy) {
    busy = nextBusy;
    reviewApproveBtn.disabled = nextBusy;
    reviewRejectBtn.disabled = nextBusy;
  }

  function renderItem(data) {
    currentItem = data.item;

    if (!currentItem) {
      reviewImage.hidden = true;
      reviewImage.removeAttribute('src');
      reviewEmpty.hidden = false;
      reviewEmpty.textContent = 'Queue is empty.';
      reviewActions.hidden = true;
      reviewCounter.textContent = 'Image 0 / 0';
      return;
    }

    reviewEmpty.hidden = true;
    reviewImage.hidden = false;
    reviewImage.src = currentItem.imageUrl;
    reviewActions.hidden = false;
    reviewCounter.textContent = `Image ${currentItem.position} / ${currentItem.total}`;
  }

  async function loadNext() {
    const data = await apiRequest('/api/queue/next');
    renderItem(data);
  }

  async function handleDecision(action) {
    if (!currentItem || busy) {
      return;
    }

    setBusy(true);
    try {
      await apiRequest(`/api/queue/${currentItem.id}/${action}`, { method: 'POST' });
      await loadNext();
    } catch (error) {
      reviewEmpty.hidden = false;
      reviewEmpty.textContent = error.message;
    } finally {
      setBusy(false);
    }
  }

  reviewApproveBtn.addEventListener('click', () => handleDecision('approve'));
  reviewRejectBtn.addEventListener('click', () => handleDecision('reject'));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'a' || event.key === 'A') {
      handleDecision('approve');
    }
    if (event.key === 'r' || event.key === 'R') {
      handleDecision('reject');
    }
  });

  loadNext().catch((error) => {
    reviewEmpty.hidden = false;
    reviewEmpty.textContent = error.message;
  });
})();
