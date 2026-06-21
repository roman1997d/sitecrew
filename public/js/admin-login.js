const API_BASE_URL = window.SITECREW_API_BASE_URL || 'http://localhost:4000';

const form = document.getElementById('admin-login-form');
const alertBox = document.getElementById('admin-auth-alert');

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.dataset.type = type;
  alertBox.hidden = false;
}

function setCookie(name, value, maxAgeSeconds) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  alertBox.hidden = true;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Please wait...';

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.value.trim(),
        password: form.password.value,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    if (!['admin', 'superadmin'].includes(data.user?.role)) {
      throw new Error('This account does not have admin access.');
    }

    localStorage.setItem('sitecrewAdminToken', data.token);
    localStorage.setItem('sitecrewAdminUser', JSON.stringify(data.user));
    setCookie('sitecrewAdminToken', data.token, 60 * 60 * 24 * 7);
    window.location.href = '/admin/dashboard';
  } catch (error) {
    const message = error.message === 'Failed to fetch'
      ? `Cannot reach the API server at ${API_BASE_URL}. Check that the backend is running and try again.`
      : error.message;
    showAlert(message);
    button.disabled = false;
    button.textContent = 'Sign in to admin panel';
  }
});
