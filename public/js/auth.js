const API_BASE_URL = window.SITECREW_API_BASE_URL || 'http://localhost:4000';

const heading = document.querySelector('#auth-heading');
const subtitle = document.querySelector('#auth-subtitle');
const alertBox = document.querySelector('#auth-alert');
const tabs = document.querySelectorAll('[data-auth-mode]');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const roleInputs = document.querySelectorAll('input[name="role"]');
const workerFields = document.querySelectorAll('.register-worker-field');
const companyFields = document.querySelectorAll('.register-company-field');
const registerTradesInput = document.querySelector('#register-trades');
const registerTradesOptions = document.querySelector('#register-trades-options');
let registerTradeSearchTimer;

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.dataset.type = type;
  alertBox.hidden = false;
}

function clearAlert() {
  alertBox.textContent = '';
  alertBox.hidden = true;
}

function setButtonLoading(button, isLoading, label) {
  button.disabled = isLoading;
  button.textContent = isLoading ? 'Please wait...' : label;
}

function redirectAfterAuth(user) {
  if (user.role === 'worker') {
    window.location.href = '/worker/dashboard';
    return;
  }

  if (user.role === 'company') {
    window.location.href = '/company/dashboard';
    return;
  }

  window.location.href = '/';
}

function isPlatformRole(role) {
  return role === 'worker' || role === 'company';
}

function setCookie(name, value, maxAgeSeconds) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function rememberReturningUser(user, email) {
  const maxAge = 60 * 60 * 24 * 365;
  setCookie('sitecrewReturningUser', '1', maxAge);
  if (user?.role) {
    setCookie('sitecrewLastRole', user.role, maxAge);
    localStorage.setItem('sitecrewLastRole', user.role);
  }
  if (email) {
    localStorage.setItem('sitecrewLastEmail', email);
  }
}

function saveSession(data, email) {
  localStorage.setItem('sitecrewToken', data.token);
  localStorage.setItem('sitecrewUser', JSON.stringify(data.user));
  setCookie('sitecrewToken', data.token, 60 * 60 * 24 * 7);
  rememberReturningUser(data.user, email || data.user?.email);
}

function setAuthMode(mode) {
  clearAlert();
  const isRegister = mode === 'register';

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.authMode === mode);
  });

  loginForm.hidden = isRegister;
  registerForm.hidden = !isRegister;
  heading.textContent = isRegister ? 'Create account' : 'Sign in';
  subtitle.textContent = isRegister ? 'Join SiteCrew as a worker or company' : 'Please fill your information';
}

function setRegisterRole(role) {
  roleInputs.forEach((input) => {
    input.checked = input.value === role;
  });
  const isCompany = role === 'company';
  workerFields.forEach((field) => {
    field.hidden = isCompany;
  });
  companyFields.forEach((field) => {
    field.hidden = !isCompany;
  });
}

async function apiRequest(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed. Please try again.');
  }

  return data;
}

function getActiveTradeQuery(value = '') {
  return value.split(',').pop().trim();
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderRegisterTradeOptions(trades = []) {
  if (!registerTradesOptions) return;
  registerTradesOptions.innerHTML = trades
    .map((trade) => `<option value="${escapeHtml(trade.name)}">${escapeHtml(trade.category || 'Construction trade')}</option>`)
    .join('');
}

async function searchRegisterTrades(query) {
  const response = await fetch(`${API_BASE_URL}/api/jobs/trades/search?q=${encodeURIComponent(query)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Unable to load trades.');
  }

  return data.trades || [];
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode));
});

roleInputs.forEach((input) => {
  input.addEventListener('change', () => setRegisterRole(input.value));
});

registerTradesInput?.addEventListener('input', () => {
  window.clearTimeout(registerTradeSearchTimer);
  const query = getActiveTradeQuery(registerTradesInput.value);

  if (query.length < 3) {
    renderRegisterTradeOptions([]);
    return;
  }

  registerTradeSearchTimer = window.setTimeout(async () => {
    try {
      const trades = await searchRegisterTrades(query);
      renderRegisterTradeOptions(trades);
    } catch (error) {
      renderRegisterTradeOptions([]);
    }
  }, 250);
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert();

  const button = loginForm.querySelector('button[type="submit"]');
  setButtonLoading(button, true, 'Sign in now');

  try {
    const data = await apiRequest('/api/auth/login', {
      email: loginForm.email.value.trim(),
      password: loginForm.password.value,
    });

    if (!isPlatformRole(data.user?.role)) {
      throw new Error('This account cannot sign in here.');
    }

    saveSession(data, loginForm.email.value.trim());
    showAlert('Login successful. Redirecting...', 'success');
    redirectAfterAuth(data.user);
  } catch (error) {
    showAlert(error.message);
  } finally {
    setButtonLoading(button, false, 'Sign in now');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert();

  const formData = new FormData(registerForm);
  const role = formData.get('role');
  const button = registerForm.querySelector('button[type="submit"]');
  setButtonLoading(button, true, 'Create account');

  try {
    const sharedPayload = {
      email: formData.get('email').trim(),
      password: formData.get('password'),
      city: formData.get('city').trim() || undefined,
    };

    const payload = role === 'company'
      ? {
          ...sharedPayload,
          companyName: formData.get('companyName').trim(),
        }
      : {
          ...sharedPayload,
          fullName: formData.get('fullName').trim(),
          trades: formData.get('trades')
            .split(',')
            .map((trade) => trade.trim())
            .filter(Boolean),
        };

    const endpoint = role === 'company' ? '/api/auth/register-company' : '/api/auth/register-worker';
    const data = await apiRequest(endpoint, payload);

    if (!isPlatformRole(data.user?.role)) {
      throw new Error('Registration is not available for this account type.');
    }

    saveSession(data, sharedPayload.email);
    showAlert('Account created. Redirecting...', 'success');
    redirectAfterAuth(data.user);
  } catch (error) {
    showAlert(error.message);
  } finally {
    setButtonLoading(button, false, 'Create account');
  }
});

const params = new URLSearchParams(window.location.search);
const lastEmail = localStorage.getItem('sitecrewLastEmail') || '';
const lastRole = localStorage.getItem('sitecrewLastRole') || '';

if (lastEmail && loginForm.email && !loginForm.email.value) {
  loginForm.email.value = lastEmail;
}

setAuthMode(params.get('mode') === 'register' ? 'register' : 'login');
setRegisterRole(params.get('role') === 'company' || (!params.get('role') && lastRole === 'company') ? 'company' : 'worker');
