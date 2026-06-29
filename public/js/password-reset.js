(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || window.location.origin;
  const alertBox = document.getElementById('password-reset-alert');
  const forgotForm = document.getElementById('forgot-password-form');
  const resetForm = document.getElementById('reset-password-form');
  const resetSubtitle = document.getElementById('reset-password-subtitle');
  const resetTokenInput = document.getElementById('reset-token');

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

  function getTokenFromUrl() {
    return new URLSearchParams(window.location.search).get('token') || '';
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed. Please try again.');
    }
    return data;
  }

  forgotForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const submitBtn = forgotForm.querySelector('button[type="submit"]');
    const email = forgotForm.email.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const data = await requestJson('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showAlert(data.message || 'If an account exists for this email, you will receive reset instructions shortly.', 'success');
      forgotForm.reset();
    } catch (error) {
      showAlert(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send reset link';
    }
  });

  async function initResetPage() {
    if (!resetForm || !resetTokenInput) return;

    const token = getTokenFromUrl();
    resetTokenInput.value = token;

    if (!token) {
      showAlert('This reset link is invalid or missing.');
      return;
    }

    try {
      const data = await requestJson(`/api/auth/reset-password/${encodeURIComponent(token)}`);
      resetForm.hidden = false;
      if (data.email && resetSubtitle) {
        resetSubtitle.textContent = `Set a new password for ${data.email}.`;
      }
    } catch (error) {
      showAlert(error.message);
    }
  }

  resetForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const password = resetForm.password.value;
    const confirmPassword = resetForm.passwordConfirm.value;
    const token = resetTokenInput.value.trim();

    if (password !== confirmPassword) {
      showAlert('Passwords do not match.');
      return;
    }

    const submitBtn = resetForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const data = await requestJson('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      showAlert(data.message || 'Your password has been updated.', 'success');
      resetForm.hidden = true;
      if (resetSubtitle) {
        resetSubtitle.textContent = 'Password updated successfully. Redirecting to sign in...';
      }
      window.setTimeout(() => {
        window.location.href = '/login';
      }, 1800);
    } catch (error) {
      showAlert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset password';
    }
  });

  initResetPage();
})();
