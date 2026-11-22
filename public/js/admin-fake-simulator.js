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

  const dailyJobsStatsEl = document.getElementById('adminDailyJobsStats');
  const dailyJobsHintEl = document.getElementById('adminDailyJobsHint');
  const dailyJobsToggleBtn = document.getElementById('adminDailyJobsToggleBtn');
  const dailyJobsRunBtn = document.getElementById('adminDailyJobsRunBtn');
  const dailyJobsForceBtn = document.getElementById('adminDailyJobsForceBtn');
  let dailyJobsStatus = null;

  function renderStats(stats) {
    if (!statsEl) return;
    statsEl.innerHTML = `
      <article class="admin-metric-card"><span>Fake workers (.fpd)</span><strong>${escapeHtml(stats.workers)}</strong></article>
      <article class="admin-metric-card"><span>Fake companies (.fpd)</span><strong>${escapeHtml(stats.companies)}</strong></article>
      <article class="admin-metric-card"><span>Simulator jobs</span><strong>${escapeHtml(stats.jobs)}</strong></article>
      <article class="admin-metric-card accent"><span>Shared password</span><strong>${escapeHtml(stats.passwordHint)}</strong></article>
    `;
  }

  function renderDailyJobsStatus(status) {
    dailyJobsStatus = status || null;
    if (!dailyJobsStatsEl || !status) return;

    dailyJobsStatsEl.innerHTML = `
      <article class="admin-metric-card ${status.enabled ? 'accent' : ''}">
        <span>Generator</span>
        <strong>${status.enabled ? 'ON' : 'OFF'}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Today target (${escapeHtml(status.parity)} day ${escapeHtml(status.dayNumber)})</span>
        <strong>${escapeHtml(status.targetToday)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Open generated jobs</span>
        <strong>${escapeHtml(status.openGeneratedJobs)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Last run</span>
        <strong>${escapeHtml(status.lastRunDate || 'Never')} · ${escapeHtml(status.lastCreatedCount || 0)} jobs</strong>
      </article>
    `;

    if (dailyJobsToggleBtn) {
      dailyJobsToggleBtn.textContent = status.enabled ? 'Disable generator' : 'Enable generator';
    }

    if (dailyJobsHintEl) {
      const bits = [
        `Catalog: ${status.catalogTrades} trades`,
        `Companies: ${status.generatorCompanies}`,
        `Retention: ${status.retentionDays} days`,
      ];
      if (status.alreadyRanToday) bits.push('Already ran today');
      if (status.lastError) bits.push(`Last error: ${status.lastError}`);
      dailyJobsHintEl.textContent = bits.join(' · ');
    }
  }

  function showResult(html, type = 'success') {
    if (!resultEl) return;
    resultEl.hidden = false;
    resultEl.dataset.type = type;
    resultEl.innerHTML = html;
  }

  async function loadDailyJobsStatus() {
    const data = await apiRequest('/api/admin/daily-jobs/status');
    renderDailyJobsStatus(data.status);
  }

  async function loadStats() {
    const data = await apiRequest('/api/admin/fake-simulator/status');
    renderStats(data.stats);
    try {
      await loadDailyJobsStatus();
    } catch (error) {
      if (dailyJobsStatsEl) {
        dailyJobsStatsEl.innerHTML = `<p class="admin-empty">${escapeHtml(error.message)}</p>`;
      }
    }
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

  dailyJobsToggleBtn?.addEventListener('click', async () => {
    const enabled = !(dailyJobsStatus?.enabled);
    dailyJobsToggleBtn.disabled = true;
    try {
      const data = await apiRequest('/api/admin/daily-jobs/enabled', {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      renderDailyJobsStatus(data.status);
      showResult(`<p>Daily job generator is now <strong>${enabled ? 'enabled' : 'disabled'}</strong>.</p>`);
    } catch (error) {
      showResult(`<p>${escapeHtml(error.message)}</p>`, 'error');
    } finally {
      dailyJobsToggleBtn.disabled = false;
    }
  });

  async function runDailyJobs(force = false) {
    const btn = force ? dailyJobsForceBtn : dailyJobsRunBtn;
    if (btn) {
      btn.disabled = true;
      btn.textContent = force ? 'Forcing...' : 'Running...';
    }
    try {
      const data = await apiRequest('/api/admin/daily-jobs/run', {
        method: 'POST',
        body: JSON.stringify({ force }),
      });
      await loadDailyJobsStatus();
      if (data.skipped) {
        showResult(
          `<p>Skipped: <strong>${escapeHtml(data.reason || 'already ran')}</strong>. Deleted expired: ${escapeHtml(data.deletedJobs || 0)}.</p>`,
          'error'
        );
        return;
      }
      showResult(`
        <p>
          Created <strong>${escapeHtml(data.createdJobs)}</strong> jobs
          (${escapeHtml(data.parity)} day) across
          <strong>${escapeHtml(data.createdCompanies)}</strong> companies.
          Removed <strong>${escapeHtml(data.deletedJobs || 0)}</strong> jobs older than 7 days.
        </p>
        <ul>
          ${(data.companies || []).slice(0, 8).map((company) => `
            <li>
              ${escapeHtml(company.name)} —
              ${(company.jobs || []).map((job) => `${escapeHtml(job.trade)} @ ${escapeHtml(job.city)} (${escapeHtml(job.rate)})`).join('; ')}
            </li>
          `).join('')}
        </ul>
      `);
    } catch (error) {
      showResult(`<p>${escapeHtml(error.message)}</p>`, 'error');
    } finally {
      if (dailyJobsRunBtn) {
        dailyJobsRunBtn.disabled = false;
        dailyJobsRunBtn.innerHTML = '<i class="bi bi-lightning-charge"></i> Run today now';
      }
      if (dailyJobsForceBtn) {
        dailyJobsForceBtn.disabled = false;
        dailyJobsForceBtn.textContent = 'Force re-run today';
      }
    }
  }

  dailyJobsRunBtn?.addEventListener('click', () => runDailyJobs(false));
  dailyJobsForceBtn?.addEventListener('click', () => {
    if (!window.confirm('Force another generation for today? This will add more jobs on top of today\'s batch.')) {
      return;
    }
    runDailyJobs(true);
  });
})();
