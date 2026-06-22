const API_BASE_URL = window.SITECREW_API_BASE_URL || window.location.origin;

const heading = document.querySelector('#auth-heading');
const subtitle = document.querySelector('#auth-subtitle');
const alertBox = document.querySelector('#auth-alert');
const tabs = document.querySelectorAll('[data-auth-mode]');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const roleInputs = document.querySelectorAll('input[name="role"]');
const workerFields = document.querySelectorAll('.register-worker-field');
const companyFields = document.querySelectorAll('.register-company-field');
const registerTradeInput = document.querySelector('#register-trade');
const registerTradesOptions = document.querySelector('#register-trades-options');
const companyPlanModal = document.querySelector('#companyPlanModal');
const companyPlanGrid = document.querySelector('#companyPlanGrid');
const companyPlanTermsOpenBtn = document.querySelector('#companyPlanTermsOpenBtn');
const companyPlanTermsAgree = document.querySelector('#companyPlanTermsAgree');
const companyPlanContinueBtn = document.querySelector('#companyPlanContinueBtn');
const companyPlanTermsVersion = document.querySelector('#companyPlanTermsVersion');
const companyTermsModal = document.querySelector('#companyTermsModal');
const companyTermsContent = document.querySelector('#companyTermsContent');
const companyTermsModalVersion = document.querySelector('#companyTermsModalVersion');
let registerTradeSearchTimer;
let pendingCompanyRegistration = null;
let companyMarketPlans = [];
let companyMarketTerms = null;
let selectedCompanyPlanKey = null;

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
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
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
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const issueMessage = Array.isArray(data.issues) && data.issues.length
      ? data.issues.map((issue) => issue.message).filter(Boolean).join(' ')
      : '';
    throw new Error(data.error || issueMessage || 'Request failed. Please try again.');
  }

  return data;
}

async function fetchMarketData() {
  const [plansResponse, termsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/api/market/plans`),
    fetch(`${API_BASE_URL}/api/market/terms`),
  ]);

  const plansData = await plansResponse.json().catch(() => ({}));
  const termsData = await termsResponse.json().catch(() => ({}));

  if (!plansResponse.ok) {
    throw new Error(plansData.error || 'Unable to load company plans.');
  }
  if (!termsResponse.ok) {
    throw new Error(termsData.error || 'Unable to load terms and conditions.');
  }

  return {
    plans: plansData.plans || [],
    terms: termsData.terms || null,
  };
}

function formatPlanPrice(plan) {
  const effective = Number(plan.effectivePriceGbp || 0);
  const base = Number(plan.priceGbp || 0);
  const discount = Number(plan.discountPercent || 0);
  const priceLabel = `£${effective.toFixed(2)}`;
  const suffix = '<small>/ month</small>';

  if (discount > 0 && base > effective) {
    return `${priceLabel}${suffix}<span class="company-plan-price-old">£${base.toFixed(2)}</span>`;
  }

  return `${priceLabel}${suffix}`;
}

function renderCompanyPlanCards() {
  if (!companyPlanGrid) return;

  if (!companyMarketPlans.length) {
    companyPlanGrid.innerHTML = '<p class="company-plan-empty">No company plans are available right now.</p>';
    return;
  }

  companyPlanGrid.innerHTML = companyMarketPlans.map((plan) => `
    <article
      class="company-plan-card ${selectedCompanyPlanKey === plan.planKey ? 'selected' : ''}"
      data-company-plan-card="${escapeHtml(plan.planKey)}"
      tabindex="0"
      role="button"
      aria-pressed="${selectedCompanyPlanKey === plan.planKey ? 'true' : 'false'}"
    >
      <div class="company-plan-card-head">
        <h3>${escapeHtml(plan.displayName)}</h3>
        <span class="company-plan-badge">${escapeHtml(plan.planKey)}</span>
      </div>
      <p class="company-plan-price">${formatPlanPrice(plan)}</p>
      <ul class="company-plan-benefits">
        ${(plan.benefits || []).map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join('')}
      </ul>
    </article>
  `).join('');
}

function updateCompanyPlanContinueState() {
  if (!companyPlanContinueBtn) return;
  const canContinue = Boolean(
    selectedCompanyPlanKey
    && companyPlanTermsAgree?.checked
    && companyMarketTerms?.version
  );
  companyPlanContinueBtn.disabled = !canContinue;
}

function renderCompanyTermsMeta() {
  if (companyPlanTermsVersion) {
    companyPlanTermsVersion.textContent = companyMarketTerms?.version
      ? `Current version: v${companyMarketTerms.version}`
      : 'Terms are not published yet.';
  }
  if (companyTermsModalVersion) {
    companyTermsModalVersion.textContent = companyMarketTerms?.version
      ? `Version ${companyMarketTerms.version}`
      : 'No published version';
  }
}

function openCompanyPlanModal() {
  if (!companyPlanModal) return;
  companyPlanModal.hidden = false;
  companyPlanModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  updateCompanyPlanContinueState();
}

function closeCompanyPlanModal() {
  if (!companyPlanModal) return;
  companyPlanModal.hidden = true;
  companyPlanModal.setAttribute('aria-hidden', 'true');
  if (companyTermsModal?.hidden !== false) {
    document.body.style.overflow = '';
  }
}

function openCompanyTermsModal() {
  if (!companyTermsModal || !companyTermsContent) return;
  if (!companyMarketTerms?.content) {
    showAlert('Sales plan terms are not published yet.');
    return;
  }
  companyTermsContent.innerHTML = companyMarketTerms.content;
  if (companyTermsModalVersion) {
    companyTermsModalVersion.textContent = `Version ${companyMarketTerms.version}`;
  }
  companyTermsModal.hidden = false;
  companyTermsModal.setAttribute('aria-hidden', 'false');
}

function closeCompanyTermsModal() {
  if (!companyTermsModal) return;
  companyTermsModal.hidden = true;
  companyTermsModal.setAttribute('aria-hidden', 'true');
  if (companyPlanModal?.hidden) {
    document.body.style.overflow = '';
  }
}

function buildCompanyRegistrationPayload(formData) {
  return {
    email: formData.get('email').trim(),
    password: formData.get('password'),
    city: formData.get('city').trim() || undefined,
    companyName: formData.get('companyName').trim(),
  };
}

function validateCompanyRegistrationForm(formData) {
  const companyName = formData.get('companyName')?.trim();
  if (!companyName) {
    throw new Error('Company name is required.');
  }
}

async function openCompanyRegistrationFlow(formData) {
  validateCompanyRegistrationForm(formData);
  pendingCompanyRegistration = buildCompanyRegistrationPayload(formData);
  selectedCompanyPlanKey = null;
  if (companyPlanTermsAgree) {
    companyPlanTermsAgree.checked = false;
  }

  if (companyPlanGrid) {
    companyPlanGrid.innerHTML = '<p class="company-plan-empty">Loading plans...</p>';
  }

  openCompanyPlanModal();

  const market = await fetchMarketData();
  companyMarketPlans = market.plans;
  companyMarketTerms = market.terms;
  renderCompanyPlanCards();
  renderCompanyTermsMeta();
  updateCompanyPlanContinueState();

  if (!companyMarketTerms?.version) {
    showAlert('Sales plan terms are not published yet. Please contact support.');
  }
}

async function completeCompanyRegistration() {
  if (!pendingCompanyRegistration || !selectedCompanyPlanKey) {
    throw new Error('Select a company plan to continue.');
  }
  if (!companyPlanTermsAgree?.checked) {
    throw new Error('You must agree to the Sales plan Terms & Conditions.');
  }
  if (!companyMarketTerms?.version) {
    throw new Error('Sales plan terms are not available yet.');
  }

  return apiRequest('/api/auth/register-company', {
    ...pendingCompanyRegistration,
    planKey: selectedCompanyPlanKey,
    termsVersion: companyMarketTerms.version,
    termsAccepted: true,
  });
}

function getRegisterTradeQuery(value = '') {
  return String(value).trim();
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

registerTradeInput?.addEventListener('input', () => {
  window.clearTimeout(registerTradeSearchTimer);
  const query = getRegisterTradeQuery(registerTradeInput.value);

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

registerTradeInput?.addEventListener('change', () => {
  registerTradeInput.value = getRegisterTradeQuery(registerTradeInput.value);
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
    if (role === 'company') {
      await openCompanyRegistrationFlow(formData);
      return;
    }

    const fullName = formData.get('fullName')?.trim() || '';
    if (!fullName) {
      throw new Error('Full name is required.');
    }

    const trade = getRegisterTradeQuery(formData.get('trade'));
    if (!trade) {
      throw new Error('Please select your trade.');
    }
    if (trade.length < 2) {
      throw new Error('Please select a valid trade from the suggestions.');
    }

    const sharedPayload = {
      email: formData.get('email').trim(),
      password: formData.get('password'),
      city: formData.get('city').trim() || undefined,
    };

    const payload = {
      ...sharedPayload,
      fullName,
      trade,
    };

    const data = await apiRequest('/api/auth/register-worker', payload);

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

companyPlanGrid?.addEventListener('click', (event) => {
  const card = event.target.closest('[data-company-plan-card]');
  if (!card) return;
  selectedCompanyPlanKey = card.dataset.companyPlanCard;
  renderCompanyPlanCards();
  updateCompanyPlanContinueState();
});

companyPlanGrid?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('[data-company-plan-card]');
  if (!card) return;
  event.preventDefault();
  selectedCompanyPlanKey = card.dataset.companyPlanCard;
  renderCompanyPlanCards();
  updateCompanyPlanContinueState();
});

companyPlanTermsAgree?.addEventListener('change', updateCompanyPlanContinueState);

companyPlanTermsOpenBtn?.addEventListener('click', openCompanyTermsModal);

companyPlanModal?.querySelectorAll('[data-company-plan-close]').forEach((button) => {
  button.addEventListener('click', () => {
    closeCompanyPlanModal();
    pendingCompanyRegistration = null;
  });
});

companyTermsModal?.querySelectorAll('[data-company-terms-close]').forEach((button) => {
  button.addEventListener('click', closeCompanyTermsModal);
});

companyPlanContinueBtn?.addEventListener('click', async () => {
  clearAlert();
  companyPlanContinueBtn.disabled = true;
  companyPlanContinueBtn.textContent = 'Please wait...';

  try {
    const data = await completeCompanyRegistration();

    if (!isPlatformRole(data.user?.role)) {
      throw new Error('Registration is not available for this account type.');
    }

    closeCompanyPlanModal();
    closeCompanyTermsModal();
    saveSession(data, pendingCompanyRegistration.email);
    pendingCompanyRegistration = null;
    showAlert('Account created. Redirecting...', 'success');
    redirectAfterAuth(data.user);
  } catch (error) {
    showAlert(error.message);
    updateCompanyPlanContinueState();
  } finally {
    companyPlanContinueBtn.textContent = 'Continue with your Account';
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

(async function restoreSessionFromStorage() {
  const returnPath = params.get('return');
  if (returnPath) return;

  const token = localStorage.getItem('sitecrewToken');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;

    const data = await response.json();
    if (!isPlatformRole(data.user?.role)) return;

    setCookie('sitecrewToken', token, 60 * 60 * 24 * 7);
    redirectAfterAuth(data.user);
  } catch (error) {
    // Keep the login form available when restore fails.
  }
})();
