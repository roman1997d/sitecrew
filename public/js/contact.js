(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || window.location.origin;
  const RECAPTCHA_SITE_KEY = window.SITECREW_RECAPTCHA_SITE_KEY || '';
  const RECAPTCHA_ACTION = 'contact';
  const form = document.getElementById('contact-form');
  const alertBox = document.getElementById('contact-form-alert');
  const submitBtn = document.getElementById('contact-form-submit');

  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.dataset.type = type;
    alertBox.hidden = false;
  }

  function clearAlert() {
    if (!alertBox) return;
    alertBox.textContent = '';
    alertBox.hidden = true;
  }

  function getErrorMessage(data = {}) {
    if (Array.isArray(data.issues) && data.issues.length) {
      return data.issues[0].message;
    }
    return data.error || 'Could not send your message. Please try again.';
  }

  function validateForm(payload) {
    if (payload.name.length < 2) {
      return 'Please enter your name.';
    }
    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return 'Please enter a valid email address.';
    }
    if (!payload.subject || payload.subject.length < 3) {
      return 'Please choose a subject.';
    }
    if (payload.message.length < 10) {
      return 'Please enter a message with at least 10 characters.';
    }
    return '';
  }

  function waitForRecaptchaReady() {
    return new Promise((resolve, reject) => {
      if (!RECAPTCHA_SITE_KEY) {
        reject(new Error('Security verification is not configured. Please try again later.'));
        return;
      }

      if (typeof window.grecaptcha !== 'undefined' && window.grecaptcha.ready) {
        window.grecaptcha.ready(resolve);
        return;
      }

      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (typeof window.grecaptcha !== 'undefined' && window.grecaptcha.ready) {
          window.clearInterval(timer);
          window.grecaptcha.ready(resolve);
          return;
        }
        if (attempts >= 50) {
          window.clearInterval(timer);
          reject(new Error('Security verification failed to load. Please refresh the page.'));
        }
      }, 100);
    });
  }

  async function getRecaptchaToken() {
    await waitForRecaptchaReady();
    const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: RECAPTCHA_ACTION });
    if (!token) {
      throw new Error('Security verification failed. Please refresh the page and try again.');
    }
    return token;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim(),
    };

    const validationError = validateForm(payload);
    if (validationError) {
      showAlert(validationError);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      payload.recaptchaToken = await getRecaptchaToken();

      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      showAlert(data.message || 'Thanks for contacting SiteCrew.', 'success');
      form.reset();
    } catch (error) {
      showAlert(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send message';
    }
  });
})();
