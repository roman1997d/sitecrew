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

  function getRecaptchaResponse() {
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

    const recaptchaToken = getRecaptchaResponse();
    if (!recaptchaToken) {
      showAlert('Please tick the reCAPTCHA box before sending.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, recaptchaToken }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
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
