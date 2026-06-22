(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || window.location.origin;
  const followBtn = document.getElementById('followCompanyBtn');
  const messageBtn = document.getElementById('messageCompanyBtn');
  const companyProfile = document.querySelector('[data-company-id]');
  const reviewForm = document.getElementById('companyReviewForm');
  const reviewStatus = document.getElementById('companyReviewStatus');
  const i18n = window.SiteCrewI18n;
  const t = (key) => (i18n ? i18n.t(key) : key);

  function getCookie(name) {
    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');
  }

  function getToken() {
    return localStorage.getItem('sitecrewToken') || decodeURIComponent(getCookie('sitecrewToken') || '');
  }

  async function followCompany(companyId) {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || t('publicCompany.followFailed'));
    }

    return data;
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Request failed. Please try again.');
    }
    return data;
  }

  function setReviewStatus(message, type = 'info') {
    if (!reviewStatus) return;
    reviewStatus.textContent = message;
    reviewStatus.dataset.type = type;
    reviewStatus.hidden = false;
  }

  function setReviewStars(value) {
    reviewForm?.querySelectorAll('[data-company-review-star]').forEach((button) => {
      const selected = Number(button.dataset.companyReviewStar) <= Number(value);
      button.classList.toggle('selected', selected);
      const icon = button.querySelector('i');
      if (icon) {
        icon.className = `bi ${selected ? 'bi-star-fill' : 'bi-star'}`;
      }
    });
  }

  async function sendMessageToCompany(companyId, workerId, message) {
    if (!workerId) {
      throw new Error(t('errors.requestFailed'));
    }

    const conversation = await apiRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        workerId: Number(workerId),
        companyId: Number(companyId),
      }),
    });

    await apiRequest(`/api/conversations/${conversation.conversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: message }),
    });
  }

  followBtn?.addEventListener('click', async () => {
    const companyId = followBtn.dataset.companyId;
    if (!companyId) return;

    followBtn.disabled = true;
    followBtn.textContent = `${t('publicCompany.following')}...`;

    try {
      await followCompany(companyId);
      followBtn.classList.add('following');
      followBtn.textContent = t('publicCompany.following');
    } catch (error) {
      followBtn.disabled = false;
      followBtn.textContent = t('publicCompany.followCompany');
      alert(error.message);
    }
  });

  messageBtn?.addEventListener('click', async () => {
    const companyId = messageBtn.dataset.companyId;
    const companyName = messageBtn.dataset.companyName || t('findJob.company');
    const workerId = companyProfile?.dataset.workerId;
    if (!companyId || !workerId) return;

    const message = window.prompt(`${t('publicCompany.writeMessage')} ${companyName}`);
    if (!message || !message.trim()) return;

    const label = messageBtn.querySelector('span');
    const originalText = label?.textContent || messageBtn.textContent;
    messageBtn.disabled = true;
    if (label) label.textContent = t('publicCompany.sending');

    try {
      await sendMessageToCompany(companyId, workerId, message.trim());
      if (label) label.textContent = t('publicCompany.messageSent');
      messageBtn.classList.add('sent');
    } catch (error) {
      messageBtn.disabled = false;
      if (label) label.textContent = originalText;
      alert(error.message);
    }
  });

  document.querySelectorAll('[data-company-job-apply]').forEach((button) => {
    button.addEventListener('click', async () => {
      const jobId = button.dataset.jobId;
      if (!jobId) return;

      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Applying...';

      try {
        await apiRequest(`/api/jobs/${jobId}/apply`, {
          method: 'POST',
          body: JSON.stringify({ coverNote: 'Applied from company profile.' }),
        });
        button.textContent = 'Applied';
        button.classList.add('applied');
      } catch (error) {
        button.disabled = false;
        button.textContent = originalText;
        alert(error.message);
      }
    });
  });

  reviewForm?.querySelectorAll('[data-company-review-star]').forEach((button) => {
    button.addEventListener('click', () => {
      reviewForm.elements.rating.value = button.dataset.companyReviewStar;
      setReviewStars(button.dataset.companyReviewStar);
    });
  });

  reviewForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const companyId = companyProfile?.dataset.companyId;
    if (!companyId) return;

    const submitBtn = reviewForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    reviewStatus.hidden = true;

    try {
      const data = await apiRequest(`/api/companies/${companyId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(reviewForm.elements.rating.value || 5),
          feedback: reviewForm.elements.feedback.value.trim() || undefined,
        }),
      });
      if (data.moderation?.status === 'hidden') {
        setReviewStatus(data.moderation.message || 'Your review is pending AI review before it is published.', 'success');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit rating';
        return;
      }
      setReviewStatus('Thank you. Your rating and feedback were saved. Refreshing...', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setReviewStatus(error.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit rating';
    }
  });
})();
