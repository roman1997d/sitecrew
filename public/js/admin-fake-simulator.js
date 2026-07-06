(function () {
  const statsEl = document.getElementById('adminFakeSimStats');
  const resultEl = document.getElementById('adminFakeSimResult');
  const workerCountInput = document.getElementById('adminFakeWorkerCount');
  const companyCountInput = document.getElementById('adminFakeCompanyCount');
  const purgeConfirmInput = document.getElementById('adminFakePurgeConfirm');
  const workersBtn = document.getElementById('adminFakeWorkersGenerateBtn');
  const companiesBtn = document.getElementById('adminFakeCompaniesGenerateBtn');
  const purgeBtn = document.getElementById('adminFakePurgeBtn');

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function getToken() {
    return localStorage.getItem('sitecrewAdminToken') || '';
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${window.SITECREW_API_BASE_URL || ''}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Simulator request failed.');
    }
    return data;
  }

  function renderStats(stats) {
    if (!statsEl) return;
    statsEl.innerHTML = `
      <article class="admin-metric-card"><span>Fake workers (.fpd)</span><strong>${escapeHtml(stats.workers)}</strong></article>
      <article class="admin-metric-card"><span>Fake companies (.fpd)</span><strong>${escapeHtml(stats.companies)}</strong></article>
      <article class="admin-metric-card"><span>Simulator jobs</span><strong>${escapeHtml(stats.jobs)}</strong></article>
      <article class="admin-metric-card accent"><span>Shared password</span><strong>${escapeHtml(stats.passwordHint)}</strong></article>
    `;
  }

  function showResult(html, type = 'success') {
    if (!resultEl) return;
    resultEl.hidden = false;
    resultEl.dataset.type = type;
    resultEl.innerHTML = html;
  }

  async function loadStats() {
    const data = await apiRequest('/api/admin/fake-simulator/status');
    renderStats(data.stats);
  }

  window.adminFakeSimulatorLoad = loadStats;

  workersBtn?.addEventListener('click', async () => {
    const count = Number(workerCountInput?.value || 0);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      showResult('<p>Enter a worker count between 1 and 100.</p>', 'error');
      return;
    }

    workersBtn.disabled = true;
    workersBtn.textContent = 'Generating...';

    try {
      const data = await apiRequest('/api/admin/fake-simulator/workers', {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      await loadStats();
      showResult(`
        <p><strong>${escapeHtml(data.count)} workers</strong> created. Password for all: <code>${escapeHtml(data.password)}</code></p>
        <p>${escapeHtml(data.marker)}</p>
        <ul>${(data.workers || []).slice(0, 8).map((worker) => `<li>${escapeHtml(worker.fullName)} — ${escapeHtml(worker.email)}</li>`).join('')}</ul>
        ${data.workers?.length > 8 ? '<p>…and more. Search Users for <code>.fpd</code></p>' : ''}
      `);
    } catch (error) {
      showResult(`<p>${escapeHtml(error.message)}</p>`, 'error');
    } finally {
      workersBtn.disabled = false;
      workersBtn.innerHTML = '<i class="bi bi-person-plus"></i> Generate workers';
    }
  });

  companiesBtn?.addEventListener('click', async () => {
    const count = Number(companyCountInput?.value || 0);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      showResult('<p>Enter a company count between 1 and 50.</p>', 'error');
      return;
    }

    companiesBtn.disabled = true;
    companiesBtn.textContent = 'Generating...';

    try {
      const data = await apiRequest('/api/admin/fake-simulator/companies', {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      await loadStats();
      showResult(`
        <p><strong>${escapeHtml(data.count)} companies</strong> and <strong>${escapeHtml(data.jobsCreated)} jobs</strong> created. Password: <code>${escapeHtml(data.password)}</code></p>
        <p>${escapeHtml(data.marker)}</p>
        <ul>${(data.companies || []).slice(0, 6).map((company) => `<li>${escapeHtml(company.companyName)} — ${escapeHtml(company.email)} (${escapeHtml(company.jobs.length)} jobs)</li>`).join('')}</ul>
      `);
    } catch (error) {
      showResult(`<p>${escapeHtml(error.message)}</p>`, 'error');
    } finally {
      companiesBtn.disabled = false;
      companiesBtn.innerHTML = '<i class="bi bi-building-add"></i> Generate companies';
    }
  });

  purgeBtn?.addEventListener('click', async () => {
    const confirm = purgeConfirmInput?.value?.trim();
    if (confirm !== 'DELETE-FPD-ACCOUNTS') {
      showResult('<p>Type <code>DELETE-FPD-ACCOUNTS</code> exactly to confirm purge.</p>', 'error');
      return;
    }

    if (!window.confirm('Delete ALL .fpd simulator accounts and their jobs?')) return;

    purgeBtn.disabled = true;
    purgeBtn.textContent = 'Purging...';

    try {
      const data = await apiRequest('/api/admin/fake-simulator/purge', {
        method: 'POST',
        body: JSON.stringify({ confirm }),
      });
      if (purgeConfirmInput) purgeConfirmInput.value = '';
      await loadStats();
      showResult(`<p>Removed <strong>${escapeHtml(data.deleted)}</strong> simulator accounts.</p>`);
    } catch (error) {
      showResult(`<p>${escapeHtml(error.message)}</p>`, 'error');
    } finally {
      purgeBtn.disabled = false;
      purgeBtn.textContent = 'Purge simulator data';
    }
  });
})();
