(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || window.location.origin;
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

  function getRecaptchaToken() {
    if (typeof window.grecaptcha === 'undefined') {
      return '';
    }
    return window.grecaptcha.getResponse();
  }

  function resetRecaptcha() {
    if (typeof window.grecaptcha !== 'undefined') {
      window.grecaptcha.reset();
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const recaptchaToken = getRecaptchaToken();
    if (!recaptchaToken) {
      showAlert('Please complete the reCAPTCHA challenge.');
      return;
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim(),
      recaptchaToken,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Could not send your message. Please try again.');
      }

      showAlert(data.message || 'Thanks for contacting SiteCrew.', 'success');
      form.reset();
      resetRecaptcha();
    } catch (error) {
      showAlert(error.message);
      resetRecaptcha();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send message';
    }
  });
})();
