(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || 'http://localhost:4000';
  const sidebar = document.getElementById('dashSidebar');
  const overlay = document.getElementById('dashOverlay');
  const menuBtn = document.getElementById('dashMenuBtn');
  const statusModal = document.getElementById('statusModal');
  const changeStatusBtn = document.getElementById('changeStatusBtn');
  const cancelStatusBtn = document.getElementById('cancelStatusBtn');
  const saveStatusBtn = document.getElementById('saveStatusBtn');
  const statusBadge = document.getElementById('statusBadge');
  const statusDot = document.getElementById('statusDot');
  const availOptions = document.querySelectorAll('.avail-option');
  const logoutBtn = document.getElementById('logoutBtn');
  const storyViewer = document.getElementById('storyViewer');
  const closeStoryViewerBtn = document.getElementById('closeStoryViewer');
  const storyViewerAvatar = document.getElementById('storyViewerAvatar');
  const storyViewerCompany = document.getElementById('storyViewerCompany');
  const storyViewerExpires = document.getElementById('storyViewerExpires');
  const storyViewerMedia = document.getElementById('storyViewerMedia');
  const storyViewerCaption = document.getElementById('storyViewerCaption');
  const workerProfileEditModal = document.getElementById('workerProfileEditModal');
  const openWorkerProfileEditButtons = document.querySelectorAll('[data-open-worker-profile-edit]');
  const closeWorkerProfileEditBtn = document.getElementById('closeWorkerProfileEdit');
  const cancelWorkerProfileEditBtn = document.getElementById('cancelWorkerProfileEdit');
  const workerProfileEditForm = document.getElementById('workerProfileEditForm');
  const workerProfileEditAlert = document.getElementById('workerProfileEditAlert');
  const workerTradeInterestModal = document.getElementById('workerTradeInterestModal');
  const openWorkerTradeInterestBtn = document.getElementById('openWorkerTradeInterest');
  const closeWorkerTradeInterestBtn = document.getElementById('closeWorkerTradeInterest');
  const cancelWorkerTradeInterestBtn = document.getElementById('cancelWorkerTradeInterest');
  const workerTradeInterestForm = document.getElementById('workerTradeInterestForm');
  const workerTradeInterestInput = document.getElementById('workerTradeInterestInput');
  const workerTradeInterestOptions = document.getElementById('workerTradeInterestOptions');
  const workerTradeInterestSelected = document.getElementById('workerTradeInterestSelected');
  const workerTradeInterestAlert = document.getElementById('workerTradeInterestAlert');
  const openWorkerCompanyStoryBtn = document.getElementById('openWorkerCompanyStory');
  const openWorkerCompanyPostBtn = document.getElementById('openWorkerCompanyPost');
  const createPostFab = document.getElementById('createPostFab');
  const openWorkerCompanyJobBtn = document.getElementById('openWorkerCompanyJob');
  const workerCompanyStoryModal = document.getElementById('workerCompanyStoryModal');
  const workerCompanyPostModal = document.getElementById('workerCompanyPostModal');
  const workerCompanyJobModal = document.getElementById('workerCompanyJobModal');
  const workerCompanyStoryForm = document.getElementById('workerCompanyStoryForm');
  const workerCompanyPostForm = document.getElementById('workerCompanyPostForm');
  const workerCompanyJobForm = document.getElementById('workerCompanyJobForm');
  const workerCompanyStoryAlert = document.getElementById('workerCompanyStoryAlert');
  const workerCompanyPostAlert = document.getElementById('workerCompanyPostAlert');
  const workerCompanyJobAlert = document.getElementById('workerCompanyJobAlert');
  const publicWorkerActions = document.querySelector('[data-public-worker-id]');
  const publicProfileGoBackBtn = document.getElementById('publicProfileGoBack');
  const followPublicWorkerBtn = document.getElementById('followPublicWorkerBtn');
  const messagePublicWorkerBtn = document.getElementById('messagePublicWorkerBtn');
  const openWorkerReviewsModalBtn = document.getElementById('openWorkerReviewsModal');
  const workerReviewsModal = document.getElementById('workerReviewsModal');
  const closeWorkerReviewsModalBtn = document.getElementById('closeWorkerReviewsModal');
  const workerNotificationsBtn = document.getElementById('workerNotificationsBtn');
  const workerMessagesBtn = document.getElementById('workerMessagesBtn');
  const workerNotificationsPanel = document.getElementById('workerNotificationsPanel');
  const workerMessagesPanel = document.getElementById('workerMessagesPanel');
  const topbarCompanySearchInput = document.getElementById('topbarCompanySearch');
  const topbarCompanySearchPanel = document.getElementById('topbarCompanySearchPanel');
  const closeTopbarCompanySearchBtn = document.getElementById('closeTopbarCompanySearch');
  const topbarCompanySearchResults = document.getElementById('topbarCompanySearchResults');
  const workerNotificationsList = document.getElementById('workerNotificationsList');
  const workerConversationsList = document.getElementById('workerConversationsList');
  const workerThreadList = document.getElementById('workerThreadList');
  const workerMessageForm = document.getElementById('workerMessageForm');
  const workerLanguageBtn = document.getElementById('workerLanguageBtn');
  const workerLanguageFlag = document.getElementById('workerLanguageFlag');
  const workerLanguageMenu = document.getElementById('workerLanguageMenu');
  const openFindJobSearchBtn = document.getElementById('openFindJobSearch');
  const findJobSearchModal = document.getElementById('findJobSearchModal');
  const closeFindJobSearchBtn = document.getElementById('closeFindJobSearch');
  const findJobSearchForm = document.getElementById('findJobSearchForm');
  const resetFindJobSearchBtn = document.getElementById('resetFindJobSearch');
  const findJobSearchStatus = document.getElementById('findJobSearchStatus');
  const findJobResults = document.getElementById('findJobResults');
  const findJobTradeInput = findJobSearchForm?.querySelector('input[name="trade"]');
  const findJobTradeOptions = document.getElementById('findJobTradeOptions');

  const i18n = window.SiteCrewI18n;
  const t = (key, replacements) => (i18n ? i18n.t(key, replacements) : key);
  const translatePage = () => i18n?.translatePage();

  const STATUS_MAP = {
    available: { labelKey: 'availability.availableNow', dot: 'green', value: 'Available Now' },
    soon: { labelKey: 'availability.availableSoon', dot: 'yellow', value: 'Available Soon' },
    busy: { labelKey: 'availability.busy', dot: 'red', value: 'Busy' },
  };

  const MESSAGE_PANEL_POLL_MS = 5000;
  const MESSAGE_BADGE_POLL_MS = 15000;
  let workerTradeInterestValues = [];
  let workerTradeSearchResults = [];
  let workerTradeSearchTimer = null;
  let findJobTradeSearchTimer = null;
  let topbarCompanySearchTimer = null;
  const STORY_IMAGE_DISPLAY_MS = 5000;
  const STORY_VIDEO_MAX_MS = 15000;
  const VIEWED_STORIES_KEY = 'sitecrewViewedStories';

  let selectedStatus = 'available';
  let currentUserId = null;
  let activeConversationId = null;
  let findCompanyCache = [];
  let appliedJobIds = new Set();
  let workerCompanyPermissions = null;
  let storyAutoCloseTimer = null;
  let activeStoryGroup = [];
  let activeStoryIndex = 0;

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

  function getWorkerFindJobTradeInterests() {
    try {
      const interests = JSON.parse(decodeURIComponent(findJobSearchModal?.dataset.workerTradeInterests || '[]'));
      return Array.isArray(interests) ? interests.filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }

  async function applyToJob(jobId, coverNote = null) {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        coverNote: coverNote || t('findJob.applyCoverNote'),
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || t('errors.applyFailed'));
    }

    return data.application;
  }

  async function deleteProfilePost(postId) {
    return apiRequest(`/api/feed/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  function getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  function getMediaUrl(mediaUrl) {
    if (!mediaUrl) return '';
    if (/^https?:\/\//i.test(mediaUrl)) {
      try {
        return new URL(mediaUrl).pathname;
      } catch (error) {
        return mediaUrl;
      }
    }
    return mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
  }

  function translateAvailability(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'available now') return t('availability.availableNow');
    if (normalized === 'available soon') return t('availability.availableSoon');
    if (normalized === 'busy') return t('availability.busy');
    if (normalized === 'availability not set') return t('availability.notSet');
    return value;
  }

  function getStatusKey(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('soon')) return 'soon';
    if (normalized.includes('busy') || normalized.includes('ocupat') || normalized.includes('zajęty')) return 'busy';
    return 'available';
  }

  function updateDashboardStatusPill(statusKey) {
    const pill = document.getElementById('dashboardWorkerStatus')?.closest('.status-pill');
    if (!pill) return;
    pill.classList.remove('status-available', 'status-soon', 'status-busy');
    pill.classList.add(`status-${statusKey}`);
  }

  function updateWorkerLanguageFlag(language) {
    if (!workerLanguageFlag) return;
    workerLanguageFlag.textContent = i18n?.getLanguageFlag(language) || '🇬🇧';
  }

  function setWorkerLanguageMenuOpen(isOpen) {
    if (!workerLanguageMenu || !workerLanguageBtn) return;
    workerLanguageMenu.hidden = !isOpen;
    workerLanguageBtn.setAttribute('aria-expanded', String(isOpen));
  }

  function setLanguageStatus(message, type = 'info') {
    if (!message || !workerLanguageBtn) return;
    workerLanguageBtn.setAttribute('title', message);
    workerLanguageBtn.classList.toggle('is-error', type === 'error');
    window.clearTimeout(setLanguageStatus.timer);
    setLanguageStatus.timer = window.setTimeout(() => {
      workerLanguageBtn.removeAttribute('title');
      workerLanguageBtn.classList.remove('is-error');
    }, 2200);
  }

  function prefillFindJobTradeFromInterests() {
    if (!findJobTradeInput || findJobTradeInput.value.trim()) return;
    const interests = getWorkerFindJobTradeInterests();
    if (interests.length) {
      findJobTradeInput.value = interests.slice(0, 3).join(', ');
    }
  }

  async function loadWorkerApplications() {
    try {
      const data = await apiRequest('/api/applications/me');
      appliedJobIds = new Set((data.applications || []).map((application) => Number(application.job_id)));
    } catch (error) {
      appliedJobIds = new Set();
    }
  }

  function formatFindJobDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const locale = i18n?.getLanguage() === 'en' ? 'en-GB' : (i18n?.getLanguage() || 'en-GB');
    return date.toLocaleDateString(locale);
  }

  function openFindJobSearchModal() {
    if (!findJobSearchModal) return;
    findJobSearchModal.classList.add('open');
    findJobSearchModal.setAttribute('aria-hidden', 'false');
    prefillFindJobTradeFromInterests();
    findCompanyCache = [];
    loadFindJobResults(findJobSearchForm ? new FormData(findJobSearchForm) : new FormData());
  }

  function closeFindJobSearchModal() {
    if (!findJobSearchModal) return;
    findJobSearchModal.classList.remove('open');
    findJobSearchModal.setAttribute('aria-hidden', 'true');
  }

  function setFindJobStatus(message, type = 'info') {
    if (!findJobSearchStatus) return;
    findJobSearchStatus.textContent = message;
    findJobSearchStatus.dataset.type = type;
    findJobSearchStatus.hidden = false;
  }

  async function fetchCompanies(formData = new FormData()) {
    const params = new URLSearchParams();
    const companyName = String(formData.get('companyName') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const trade = String(formData.get('trade') || '').trim();
    const tradeInterests = getWorkerFindJobTradeInterests();
    const vacancies = formData.get('vacanciesOnly') === 'open' ? 'open' : 'all';

    if (companyName) params.set('companyName', companyName);
    if (location) params.set('location', location);
    if (trade) params.set('trade', trade);
    if (!trade && tradeInterests.length) params.set('tradeInterests', tradeInterests.join(','));
    params.set('vacancies', vacancies);
    params.set('limit', '50');

    const data = await apiRequest(`/api/companies?${params.toString()}`);
    findCompanyCache = data.companies || [];
    return findCompanyCache;
  }

  function setTopbarCompanySearchPanel(open) {
    if (!topbarCompanySearchPanel) return;
    topbarCompanySearchPanel.hidden = !open;
  }

  function renderTopbarCompanyResults(results = {}, query = '') {
    if (!topbarCompanySearchResults) return;

    if (!query) {
      topbarCompanySearchResults.innerHTML = '<p class="worker-panel-empty">Type a company or worker name to search.</p>';
      return;
    }

    const companies = results.companies || [];
    const workers = results.workers || [];

    if (!companies.length && !workers.length) {
      topbarCompanySearchResults.innerHTML = '<p class="worker-panel-empty">No companies or workers found.</p>';
      return;
    }

    const companyMarkup = companies.slice(0, 5).map((company) => {
      const location = [company.city, company.postcode].filter(Boolean).join(', ') || t('findJob.allLocations');
      const trades = Array.isArray(company.trades) && company.trades.length ? company.trades.slice(0, 3).join(', ') : t('findJob.noTrades');
      const logo = company.logo ? `<img src="${API_BASE_URL}${company.logo}" alt="${escapeHtml(company.company_name || 'Company')} logo">` : escapeHtml(getInitials(company.company_name || 'Company'));

      return `
        <a href="/companies/${company.user_id}" class="topbar-company-result">
          <span class="topbar-company-result-avatar ${company.logo ? 'has-logo' : ''}">${logo}</span>
          <span>
            <strong>${escapeHtml(company.company_name || 'Company')} <em>Company</em></strong>
            <small>${escapeHtml(location)} · ${escapeHtml(trades)}</small>
          </span>
        </a>
      `;
    }).join('');

    const workerMarkup = workers.slice(0, 5).map((worker) => {
      const location = [worker.city, worker.postcode].filter(Boolean).join(', ') || t('findJob.allLocations');
      const trades = Array.isArray(worker.trades) && worker.trades.length ? worker.trades.slice(0, 3).join(', ') : t('findJob.noTrades');
      const isVerified = worker.verification_status === 'approved';
      const photo = worker.profile_photo ? `<img src="${API_BASE_URL}${worker.profile_photo}" alt="${escapeHtml(worker.full_name || 'Worker')} profile photo">` : escapeHtml(getInitials(worker.full_name || 'Worker'));
      const verifiedBadge = isVerified
        ? '<span class="avatar-verified-badge" aria-label="Verified profile"><i class="bi bi-patch-check-fill"></i></span>'
        : '';

      return `
        <a href="/workers/${worker.user_id}/profile" class="topbar-company-result">
          <span class="topbar-company-result-avatar ${worker.profile_photo ? 'has-logo' : ''} ${isVerified ? 'is-verified' : ''}">${photo}${verifiedBadge}</span>
          <span>
            <strong>${escapeHtml(worker.full_name || 'Worker')} <em>Worker</em></strong>
            <small>${escapeHtml(location)} · ${escapeHtml(trades)}</small>
          </span>
        </a>
      `;
    }).join('');

    topbarCompanySearchResults.innerHTML = `${companyMarkup}${workerMarkup}`;
  }

  async function searchTopbarCompanies(query) {
    const params = new URLSearchParams({
      companyName: query,
      vacancies: 'all',
    });
    const data = await apiRequest(`/api/companies?${params.toString()}`);
    return data.companies || [];
  }

  async function searchTopbarWorkers(query) {
    const params = new URLSearchParams({ q: query });
    const data = await apiRequest(`/api/workers/directory/search?${params.toString()}`);
    return data.workers || [];
  }

  async function searchTopbarPlatform(query) {
    const [companies, workers] = await Promise.all([
      searchTopbarCompanies(query),
      searchTopbarWorkers(query),
    ]);

    return { companies, workers };
  }

  async function sendMessageToCompany(companyId, message) {
    if (!currentUserId) {
      throw new Error(t('errors.requestFailed'));
    }

    const conversation = await apiRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        workerId: Number(currentUserId),
        companyId: Number(companyId),
      }),
    });

    await apiRequest(`/api/conversations/${conversation.conversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: message }),
    });
  }

  function renderFindJobResults(companies) {
    if (!findJobResults) return;

    if (!companies.length) {
      findJobResults.innerHTML = `
        <article class="find-job-empty">
          <strong>${t('findJob.noResults')}</strong>
          <p>${t('findJob.noResultsHint')}</p>
        </article>
      `;
      return;
    }

    findJobResults.innerHTML = companies.map((company) => {
      const openJobs = Array.isArray(company.open_jobs) ? company.open_jobs : [];
      const jobCount = openJobs.length;
      const companyName = company.company_name || t('findJob.company');
      const companyLocation = [company.city, company.postcode].filter(Boolean).join(', ');
      const logoMarkup = company.logo
        ? `<img src="${getMediaUrl(company.logo)}" alt="${escapeHtml(companyName)} logo">`
        : escapeHtml(getInitials(companyName));
      const averageRating = company.average_rating ?? company.averageRating;
      const reviewCount = Number(company.review_count ?? company.reviewCount ?? 0);
      const ratingMarkup = averageRating && reviewCount
        ? `<span class="find-job-company-rating"><i class="bi bi-star-fill"></i> ${escapeHtml(String(averageRating))} (${reviewCount})</span>`
        : `<span class="find-job-company-rating is-empty">${t('findJob.noRating')}</span>`;

      const jobsMarkup = openJobs.length ? openJobs.map((job) => {
        const location = [job.city, job.postcode].filter(Boolean).join(', ') || t('findJob.allLocations');
        const startDate = formatFindJobDate(job.startDate);
        const workerCount = Number(job.workersRequired || 1);
        const meta = [
          job.tradeRequired,
          location,
          job.rate,
          startDate ? t('findJob.starts', { date: startDate }) : null,
          job.duration,
          t(workerCount === 1 ? 'findJob.worker' : 'findJob.workers', { count: workerCount }),
        ].filter(Boolean);
        const hasApplied = appliedJobIds.has(Number(job.id));

        return `
          <article class="find-job-position-card" data-find-job-position data-job-id="${job.id}">
            <div>
              <strong>${escapeHtml(job.title || t('findJob.openPositionTitle'))}</strong>
              <p>${escapeHtml(job.description || t('findJob.noDescription'))}</p>
              <div class="find-job-position-meta">
                ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}
              </div>
            </div>
            <button type="button" class="find-job-request-btn${hasApplied ? ' applied' : ''}" data-find-job-apply data-job-id="${job.id}"${hasApplied ? ' disabled' : ''}>
              ${hasApplied ? t('buttons.alreadyApplied') : t('findJob.sendRequest')}
            </button>
          </article>
        `;
      }).join('') : `
        <article class="find-job-position-card find-job-position-empty">
          <div>
            <strong>${t('findJob.noOpenPositionsTitle')}</strong>
            <p>${t('findJob.noOpenPositionsHint')}</p>
          </div>
        </article>
      `;

      return `
        <article class="find-job-result-card" data-company-id="${company.user_id}">
          <div class="find-job-result-head">
            <div class="find-job-result-brand">
              <span class="find-job-company-logo ${company.logo ? 'has-logo' : ''}">${logoMarkup}</span>
              <div>
                <span>${jobCount} ${t(jobCount === 1 ? 'findJob.openPosition' : 'findJob.openPositions')}</span>
                <h3>${escapeHtml(companyName)}</h3>
                <small>${jobCount > 0 ? t('findJob.offersPositions') : t('findJob.matchesTradeInterest')}${companyLocation ? ` · ${escapeHtml(companyLocation)}` : ''}</small>
                ${ratingMarkup}
              </div>
            </div>
          </div>
          <div class="find-job-position-list">
            ${jobsMarkup}
          </div>
          <div class="find-job-company-actions">
            <a href="/companies/${company.user_id}" class="find-job-view-company">${t('findJob.viewCompany')}</a>
            <button type="button" class="find-job-message-btn" data-find-job-message data-company-id="${company.user_id}" data-company-name="${escapeHtml(companyName)}">
              ${t('findJob.sendMessage')}
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadFindJobResults(formData) {
    if (!findJobResults) return;

    findJobResults.innerHTML = `<p class="worker-panel-empty">${t('findJob.loading')}</p>`;
    setFindJobStatus(t('findJob.loading'));

    try {
      const companies = await fetchCompanies(formData || new FormData());
      renderFindJobResults(companies);
      setFindJobStatus(`${companies.length} ${companies.length === 1 ? t('findJob.resultFound') : t('findJob.resultsFound')}`, 'success');
    } catch (error) {
      findJobResults.innerHTML = `<p class="worker-panel-empty">${escapeHtml(error.message)}</p>`;
      setFindJobStatus(error.message, 'error');
    }
  }

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
  }

  function setTopbarPanel(panel) {
    const isNotifications = panel === workerNotificationsPanel;
    const isMessages = panel === workerMessagesPanel;

    [workerNotificationsPanel, workerMessagesPanel, topbarCompanySearchPanel].forEach((item) => {
      if (item) item.hidden = item !== panel;
    });

    workerNotificationsBtn?.setAttribute('aria-expanded', String(isNotifications));
    workerMessagesBtn?.setAttribute('aria-expanded', String(isMessages));
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || t('errors.requestFailed'));
    }

    return data;
  }

  function updateTopbarCount(button, count) {
    const badge = button?.querySelector('span');
    if (!badge) return;
    const normalizedCount = Number(count || 0);
    badge.textContent = String(normalizedCount);
    badge.hidden = normalizedCount <= 0;
  }

  async function loadNotifications(options = {}) {
    if (!workerNotificationsList) return;
    if (!options.silent) {
      workerNotificationsList.innerHTML = `<p class="worker-panel-empty">${t('notifications.loading')}</p>`;
    }

    try {
      const data = await apiRequest('/api/notifications');
      const notifications = data.notifications || [];
      const unreadCount = notifications.filter((notification) => !notification.read_at).length;
      updateTopbarCount(workerNotificationsBtn, unreadCount);

      if (options.countOnly) return;

      if (!notifications.length) {
        workerNotificationsList.innerHTML = `<p class="worker-panel-empty">${t('notifications.empty')}</p>`;
        return;
      }

      workerNotificationsList.innerHTML = notifications.map((notification) => `
        <button type="button" class="worker-notification-item ${notification.read_at ? 'read' : 'unread'}" data-notification-id="${notification.id}" data-related-type="${escapeHtml(notification.related_type || '')}" data-related-id="${escapeHtml(notification.related_id || '')}">
          <span class="worker-item-icon"><i class="bi ${notification.type === 'message' ? 'bi-chat-dots' : 'bi-bell'}"></i></span>
          <span class="worker-item-content">
            <span class="worker-item-title">${escapeHtml(notification.title || 'Notification')}</span>
            <span class="worker-item-text">${escapeHtml(notification.body || '')}</span>
            <span class="worker-item-meta">${formatDateTime(notification.created_at)}${notification.read_at ? '' : ` · ${t('notifications.new')}`}</span>
          </span>
        </button>
      `).join('');
    } catch (error) {
      if (!options.silent) {
        workerNotificationsList.innerHTML = `<p class="worker-panel-empty">${escapeHtml(error.message)}</p>`;
      }
    }
  }

  async function markNotificationRead(notificationId, item) {
    if (!notificationId || !item?.classList.contains('unread')) return;

    try {
      await apiRequest(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      const panelOpen = workerNotificationsPanel && !workerNotificationsPanel.hidden;
      await loadNotifications({ silent: true, countOnly: !panelOpen });
    } catch (error) {
      alert(error.message);
    }
  }

  function renderConversations(conversations) {
    if (!workerConversationsList) return;

    if (!conversations.length) {
      workerConversationsList.innerHTML = `<p class="worker-panel-empty">${t('messages.emptyConversations')}</p>`;
      if (workerThreadList) workerThreadList.innerHTML = `<p class="worker-panel-empty">${t('messages.emptyThread')}</p>`;
      if (workerMessageForm) workerMessageForm.hidden = true;
      return;
    }

    workerConversationsList.innerHTML = conversations.map((conversation) => {
      const isWorkerConversation = conversation.conversation_type === 'worker';
      const otherWorkerName = Number(conversation.worker_id) === Number(currentUserId)
        ? conversation.direct_worker_name
        : conversation.worker_name;
      const title = isWorkerConversation ? (otherWorkerName || 'Worker') : (conversation.company_name || conversation.worker_name || 'Company');
      const label = isWorkerConversation
        ? 'Worker conversation'
        : (conversation.job_title ? `${title} · ${conversation.job_title}` : title);
      const unreadCount = Number(conversation.unread_count || 0);

      return `
        <button type="button" class="worker-conversation-item ${unreadCount ? 'unread' : ''}" data-conversation-id="${conversation.id}">
          <span class="worker-conversation-avatar">${escapeHtml(getInitials(title).slice(0, 2) || 'SC')}</span>
          <span class="worker-item-content">
            <span class="worker-item-title">${escapeHtml(title)}</span>
            <span class="worker-item-text">${escapeHtml(label)}</span>
            <span class="worker-item-meta">${formatDateTime(conversation.created_at)}</span>
          </span>
          ${unreadCount ? `<span class="worker-conversation-unread">${unreadCount}</span>` : ''}
        </button>
      `;
    }).join('');
  }

  async function loadConversations(options = {}) {
    if (!workerConversationsList) return;
    if (!options.silent) {
      workerConversationsList.innerHTML = `<p class="worker-panel-empty">${t('messages.loadingConversations')}</p>`;
    }

    try {
      const data = await apiRequest('/api/conversations');
      const conversations = data.conversations || [];
      const unreadCount = conversations.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0);
      updateTopbarCount(workerMessagesBtn, unreadCount);
      if (!options.countOnly) {
        renderConversations(conversations);
      }
    } catch (error) {
      if (!options.silent) {
        workerConversationsList.innerHTML = `<p class="worker-panel-empty">${escapeHtml(error.message)}</p>`;
      }
    }
  }

  async function loadConversationMessages(conversationId, options = {}) {
    if (!workerThreadList || !workerMessageForm) return;
    activeConversationId = conversationId;
    if (!options.silent) {
      workerThreadList.innerHTML = `<p class="worker-panel-empty">${t('messages.loadingMessages')}</p>`;
    }

    document.querySelectorAll('.worker-conversation-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.conversationId === String(conversationId));
    });

    try {
      const data = await apiRequest(`/api/conversations/${conversationId}/messages`);
      const messages = data.messages || [];

      if (!messages.length) {
        workerThreadList.innerHTML = `<p class="worker-panel-empty">${t('messages.emptyMessages')}</p>`;
      } else {
        workerThreadList.innerHTML = messages.map((message) => {
          const isMine = Number(message.sender_id) === Number(currentUserId);
          const pendingReview = isMine && message.moderation_status === 'hidden';
          return `
            <div class="worker-thread-message ${isMine ? 'mine' : ''}">
              <strong>${escapeHtml(isMine ? t('messages.you') : (message.sender_name || 'Sender'))}</strong>
              <p>${escapeHtml(message.body)}</p>
              ${pendingReview ? `<span class="worker-item-meta">Pending AI review</span>` : ''}
              <span class="worker-item-meta">${formatDateTime(message.created_at)}</span>
            </div>
          `;
        }).join('');
        workerThreadList.scrollTop = workerThreadList.scrollHeight;
      }

      workerMessageForm.hidden = false;
      loadConversations({ silent: true, countOnly: true });
      loadNotifications({ silent: true, countOnly: true });
    } catch (error) {
      if (!options.silent) {
        workerThreadList.innerHTML = `<p class="worker-panel-empty">${escapeHtml(error.message)}</p>`;
        workerMessageForm.hidden = true;
      }
    }
  }

  async function sendConversationMessage(body) {
    if (!activeConversationId) return;
    const data = await apiRequest(`/api/conversations/${activeConversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    if (data.moderation?.status === 'hidden') {
      alert(data.moderation.message || 'Your message is pending AI review before delivery.');
    }
    await loadConversationMessages(activeConversationId);
  }

  function formatStoryExpiry(value) {
    if (!value) return t('story.activeFor24h');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('story.activeFor24h');
    return `${t('story.expires')} ${date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}`;
  }

  function isVideoUrl(url = '') {
    return /\.(mp4|webm|mov|m4v)$/i.test(String(url).split('?')[0]);
  }

  function getViewedStoryIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(VIEWED_STORIES_KEY) || '[]'));
    } catch (error) {
      return new Set();
    }
  }

  function markStoryViewed(storyId) {
    if (!storyId) return;
    const viewedStories = getViewedStoryIds();
    viewedStories.add(String(storyId));
    localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(Array.from(viewedStories)));
    refreshStoryGroupViewedStates();
  }

  function refreshStoryGroupViewedStates() {
    const viewedStories = getViewedStoryIds();
    document.querySelectorAll('[data-story-ids]').forEach((storyButton) => {
      const ids = String(storyButton.dataset.storyIds || '').split(',').filter(Boolean);
      const allSeen = ids.length > 0 && ids.every((id) => viewedStories.has(String(id)));
      storyButton.classList.toggle('viewed', allSeen);
    });
  }

  function clearStoryTimer() {
    if (storyAutoCloseTimer) {
      window.clearTimeout(storyAutoCloseTimer);
      storyAutoCloseTimer = null;
    }
  }

  function showStoryAt(index) {
    if (!storyViewer) return;
    if (!activeStoryGroup.length) return;

    activeStoryIndex = index;
    const story = activeStoryGroup[activeStoryIndex];

    const company = story.company || 'Company';
    const mediaUrl = getMediaUrl(story.media);
    const logoUrl = getMediaUrl(story.logo);
    clearStoryTimer();
    markStoryViewed(story.id);

    storyViewerAvatar.innerHTML = logoUrl
      ? `<img src="${logoUrl}" alt="${company} logo" onerror="this.parentElement.textContent='${getInitials(company).slice(0, 1)}'">`
      : getInitials(company).slice(0, 1);
    storyViewerCompany.textContent = company;
    storyViewerExpires.textContent = story.time || formatStoryExpiry(story.expires);
    storyViewerCaption.textContent = story.caption || '';

    if (mediaUrl) {
      if (isVideoUrl(mediaUrl)) {
        storyViewerMedia.innerHTML = `<video src="${mediaUrl}" autoplay playsinline controls onerror="this.parentElement.innerHTML='<span>${t('story.noImageAvailable')}</span>'"></video>`;
        const video = storyViewerMedia.querySelector('video');
        video?.addEventListener('ended', showNextStory, { once: true });
        storyAutoCloseTimer = window.setTimeout(showNextStory, STORY_VIDEO_MAX_MS);
      } else {
        storyViewerMedia.innerHTML = `<img src="${mediaUrl}" alt="${company} story" onerror="this.parentElement.innerHTML='<span>${t('story.noImageAvailable')}</span>'">`;
        storyAutoCloseTimer = window.setTimeout(showNextStory, STORY_IMAGE_DISPLAY_MS);
      }
    } else {
      storyViewerMedia.innerHTML = `<span>${t('story.noImage')}</span>`;
      storyAutoCloseTimer = window.setTimeout(showNextStory, STORY_IMAGE_DISPLAY_MS);
    }

    storyViewer.classList.add('open');
    storyViewer.setAttribute('aria-hidden', 'false');
  }

  function showNextStory() {
    clearStoryTimer();
    if (activeStoryIndex + 1 < activeStoryGroup.length) {
      showStoryAt(activeStoryIndex + 1);
      return;
    }
    closeStoryViewer();
  }

  function openStoryViewer(stories) {
    activeStoryGroup = Array.isArray(stories) ? stories : [stories];
    activeStoryGroup = activeStoryGroup.filter(Boolean);
    if (!activeStoryGroup.length) return;
    showStoryAt(0);
  }

  function closeStoryViewer() {
    if (!storyViewer) return;
    clearStoryTimer();
    storyViewerMedia.querySelector('video')?.pause();
    activeStoryGroup = [];
    activeStoryIndex = 0;
    storyViewer.classList.remove('open');
    storyViewer.setAttribute('aria-hidden', 'true');
  }

  function openWorkerProfileEditModal() {
    if (!workerProfileEditModal) return;
    workerProfileEditModal.classList.add('open');
    workerProfileEditModal.setAttribute('aria-hidden', 'false');
    if (workerProfileEditAlert) workerProfileEditAlert.hidden = true;
  }

  function closeWorkerProfileEditModal() {
    if (!workerProfileEditModal) return;
    workerProfileEditModal.classList.remove('open');
    workerProfileEditModal.setAttribute('aria-hidden', 'true');
  }

  function openWorkerReviewsModal() {
    if (!workerReviewsModal) return;
    workerReviewsModal.classList.add('open');
    workerReviewsModal.setAttribute('aria-hidden', 'false');
  }

  function closeWorkerReviewsModal() {
    if (!workerReviewsModal) return;
    workerReviewsModal.classList.remove('open');
    workerReviewsModal.setAttribute('aria-hidden', 'true');
  }

  function setWorkerProfileAlert(message, type = 'error') {
    if (!workerProfileEditAlert) return;
    workerProfileEditAlert.textContent = message;
    workerProfileEditAlert.dataset.type = type;
    workerProfileEditAlert.hidden = false;
  }

  function parseCsv(value = '') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function setCompanyActionAlert(alertEl, message, type = 'error') {
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.dataset.type = type;
    alertEl.hidden = false;
  }

  function openWorkerCompanyModal(modal, permissionType, alertEl) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (alertEl) alertEl.hidden = true;
    loadWorkerCompanyPermissions()
      .then(() => populateCompanyPermissionSelects(permissionType))
      .catch((error) => setCompanyActionAlert(alertEl, error.message));
  }

  function closeWorkerCompanyModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function closeAllWorkerCompanyModals() {
    [workerCompanyStoryModal, workerCompanyPostModal, workerCompanyJobModal].forEach(closeWorkerCompanyModal);
  }

  async function loadWorkerCompanyPermissions() {
    if (workerCompanyPermissions) return workerCompanyPermissions;
    const data = await apiRequest('/api/workers/me/company-permissions');
    workerCompanyPermissions = data.companies || [];
    return workerCompanyPermissions;
  }

  function getPermittedCompanies(permissionType) {
    return (workerCompanyPermissions || []).filter((company) => (
      permissionType === 'jobs'
        ? company.can_post_jobs
        : company.can_post_company_posts
    ));
  }

  function populateCompanyPermissionSelects(permissionType) {
    document.querySelectorAll(`[data-company-permission-select][data-permission-type="${permissionType}"]`).forEach((select) => {
      const companies = getPermittedCompanies(permissionType);
      const allowSelf = select.dataset.allowSelf === 'true';
      const selfOption = allowSelf ? `<option value="">${escapeHtml(t('posts.myProfile'))}</option>` : '';
      if (!companies.length) {
        select.innerHTML = allowSelf ? selfOption : `<option value="">${escapeHtml(t('posts.noCompanyPermission'))}</option>`;
        select.disabled = !allowSelf;
        return;
      }

      select.disabled = false;
      select.innerHTML = selfOption + companies.map((company) => (
        `<option value="${company.company_id}">${escapeHtml(company.company_name || 'Company')}</option>`
      )).join('');
    });
  }

  async function uploadWorkerCompanyPostMedia(files) {
    if (!files.length) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));
    const response = await fetch(`${API_BASE_URL}/api/feed/posts/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Could not upload post media.');
    }
    return data.mediaUrls || [];
  }

  async function uploadWorkerCompanyStoryMedia(file) {
    const formData = new FormData();
    formData.append('media', file);
    const response = await fetch(`${API_BASE_URL}/api/stories/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Could not upload story media.');
    }
    return data.mediaUrl;
  }

  function getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration || 0);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read video duration.'));
      };
      video.src = url;
    });
  }

  async function validateWorkerCompanyStoryMedia(file) {
    if (!file || !file.size) throw new Error('Please upload a story picture or video.');
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      throw new Error('Stories can use one picture or one video.');
    }
    if (file.type.startsWith('video/')) {
      const duration = await getVideoDuration(file);
      if (duration > 15.2) {
        throw new Error('Story videos can be maximum 15 seconds.');
      }
    }
  }

  function boolValue(value) {
    return value === 'true';
  }

  function setField(form, name, value) {
    const field = form.elements[name];
    if (!field) return;
    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
      return;
    }
    field.value = Array.isArray(value) ? value.join(', ') : (value ?? '');
  }

  function fillWorkerProfileForm(profile) {
    if (!workerProfileEditForm || !profile) return;

    setField(workerProfileEditForm, 'fullName', profile.full_name);
    setField(workerProfileEditForm, 'trades', profile.trades);
    setField(workerProfileEditForm, 'workLocations', profile.work_locations);
    setField(workerProfileEditForm, 'city', profile.city);
    setField(workerProfileEditForm, 'postcode', profile.postcode);
    setField(workerProfileEditForm, 'workingRadius', profile.working_radius);
    setField(workerProfileEditForm, 'yearsExperience', profile.years_experience);
    setField(workerProfileEditForm, 'availabilityStatus', profile.availability_status || 'Available Now');
    setField(workerProfileEditForm, 'languagePreference', profile.language_preference || i18n?.getLanguage() || 'en');
    setField(workerProfileEditForm, 'lastCompanies', profile.last_companies);
    setField(workerProfileEditForm, 'qualifications', profile.qualifications?.length ? profile.qualifications : profile.certificates);
    setField(workerProfileEditForm, 'hasUkWorkPermit', String(Boolean(profile.has_uk_work_permit)));
    setField(workerProfileEditForm, 'isEnglishNative', String(Boolean(profile.is_english_native)));
    setField(workerProfileEditForm, 'nativeLanguage', profile.native_language);
    setField(workerProfileEditForm, 'englishLevel', profile.english_level);
    setField(workerProfileEditForm, 'hasCar', String(Boolean(profile.has_car)));
    setField(workerProfileEditForm, 'canUseCarForWork', String(Boolean(profile.can_use_car_for_work)));
    setField(workerProfileEditForm, 'hasHealthIssues', String(Boolean(profile.has_health_issues)));
    setField(workerProfileEditForm, 'healthIssuesDetails', profile.health_issues_details);
    setField(workerProfileEditForm, 'bio', profile.bio);
    setField(workerProfileEditForm, 'dataConsent', profile.data_consent);
  }

  async function fetchCurrentWorkerProfile() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || t('errors.profileLoadFailed'));
    }

    return data.profile;
  }

  async function updateWorkerProfile(payload) {
    const response = await fetch(`${API_BASE_URL}/api/workers/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || t('errors.profileSaveFailed'));
    }

    return data.profile;
  }

  async function searchConstructionTrades(query) {
    const response = await fetch(`${API_BASE_URL}/api/jobs/trades/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not load construction trades.');
    }

    return data.trades || [];
  }

  function setWorkerTradeInterestAlert(message, type = 'error') {
    if (!workerTradeInterestAlert) return;
    workerTradeInterestAlert.textContent = message;
    workerTradeInterestAlert.dataset.type = type;
    workerTradeInterestAlert.hidden = false;
  }

  function renderWorkerTradeOptions(trades) {
    if (!workerTradeInterestOptions) return;
    workerTradeInterestOptions.innerHTML = trades.map((trade) => (
      `<option value="${escapeHtml(trade.name)}">${escapeHtml(trade.category || 'Construction trade')}</option>`
    )).join('');
  }

  function renderFindJobTradeOptions(trades) {
    if (!findJobTradeOptions) return;
    findJobTradeOptions.innerHTML = trades.map((trade) => (
      `<option value="${escapeHtml(trade.name)}">${escapeHtml(trade.category || 'Construction trade')}</option>`
    )).join('');
  }

  function renderWorkerTradeInterestSelected() {
    if (!workerTradeInterestSelected) return;

    if (!workerTradeInterestValues.length) {
      workerTradeInterestSelected.innerHTML = '<p class="worker-trade-interest-empty">No trade interests selected yet.</p>';
      return;
    }

    workerTradeInterestSelected.innerHTML = workerTradeInterestValues.map((trade) => `
      <button type="button" class="worker-trade-interest-chip" data-remove-worker-trade-interest="${escapeHtml(trade)}">
        ${escapeHtml(trade)} <i class="bi bi-x-lg"></i>
      </button>
    `).join('');
  }

  function addWorkerTradeInterest(trade) {
    const normalizedTrade = String(trade || '').trim();
    if (!normalizedTrade) return;
    const exists = workerTradeInterestValues.some((item) => item.toLowerCase() === normalizedTrade.toLowerCase());
    if (exists) return;
    workerTradeInterestValues.push(normalizedTrade);
    workerTradeInterestValues.sort((a, b) => a.localeCompare(b));
    renderWorkerTradeInterestSelected();
  }

  function openWorkerTradeInterestModal() {
    if (!workerTradeInterestModal) return;
    workerTradeInterestModal.classList.add('open');
    workerTradeInterestModal.setAttribute('aria-hidden', 'false');
    if (workerTradeInterestAlert) workerTradeInterestAlert.hidden = true;
    workerTradeInterestInput?.focus();
  }

  function closeWorkerTradeInterestModal() {
    if (!workerTradeInterestModal) return;
    workerTradeInterestModal.classList.remove('open');
    workerTradeInterestModal.setAttribute('aria-hidden', 'true');
  }

  async function uploadWorkerProfilePhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE_URL}/api/workers/me/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || t('errors.photoUploadFailed'));
    }

    return data.profilePhoto;
  }

  function getWorkerCertificationLabel(profile) {
    if (profile?.verification_status === 'approved') {
      return t('profile.profileVerified');
    }

    if (Array.isArray(profile.certificates) && profile.certificates.length) {
      return profile.certificates.join(', ');
    }

    return t('profile.profilePending');
  }

  function buildWorkerAvatarInnerHtml(profile, name) {
    const verified = profile?.verification_status === 'approved';
    const content = profile.profile_photo
      ? `<img src="${getMediaUrl(profile.profile_photo)}" alt="${name} profile picture">`
      : getInitials(name);
    const badge = verified
      ? '<span class="avatar-verified-badge" aria-label="Verified profile"><i class="bi bi-patch-check-fill"></i></span>'
      : '';
    return content + badge;
  }

  function applyWorkerAvatarState(element, profile, name) {
    if (!element) return;
    const verified = profile?.verification_status === 'approved';
    element.classList.toggle('has-photo', Boolean(profile.profile_photo));
    element.classList.toggle('is-verified', verified);
    element.innerHTML = buildWorkerAvatarInnerHtml(profile, name);
  }

  function hydrateWorkerProfile(session) {
    const profile = session.profile;
    if (!profile) return;
    const isPublicProfilePage = document.body?.dataset.publicProfile === 'true';

    const name = profile.full_name || 'SiteCrew Worker';
    const trade = Array.isArray(profile.trades) && profile.trades.length ? profile.trades.join(', ') : 'Construction worker';
    const experience = profile.experience || 'Experience not set';
    const certificates = getWorkerCertificationLabel(profile);
    const status = profile.availability_status || 'Availability not set';
    const verified = profile.verification_status === 'approved';

    const initialsEl = document.getElementById('dashboardWorkerInitials');
    const dashboardPhotoEl = document.getElementById('dashboardWorkerPhoto');
    const nameEl = document.getElementById('dashboardWorkerName');
    const statusEl = document.getElementById('dashboardWorkerStatus');
    const metaEl = document.getElementById('dashboardWorkerMeta');
    const workingAtEl = document.getElementById('dashboardWorkerWorkingAt');
    const profileInitialsEl = isPublicProfilePage ? null : document.getElementById('profileWorkerInitials');
    const profileNameEl = isPublicProfilePage ? null : document.getElementById('profileWorkerName');
    const profileStatusEl = isPublicProfilePage ? null : document.getElementById('profileWorkerStatus');
    const profileMetaEl = isPublicProfilePage ? null : document.getElementById('profileWorkerMeta');
    const profileCertificationEl = isPublicProfilePage ? null : document.getElementById('profileWorkerCertification');

    applyWorkerAvatarState(initialsEl, profile, name);
    applyWorkerAvatarState(dashboardPhotoEl, profile, name);
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = translateAvailability(status);
    const statusKey = getStatusKey(status);
    setActiveOption(statusKey);
    updateDashboardStatusPill(statusKey);
    if (metaEl) metaEl.textContent = `${trade} · ${experience} · ${certificates}`;
    if (workingAtEl && !workingAtEl.textContent.trim()) {
      workingAtEl.textContent = 'Self employed';
    }
    applyWorkerAvatarState(profileInitialsEl, profile, name);
    if (profileNameEl) profileNameEl.textContent = name;
    if (profileStatusEl) profileStatusEl.textContent = translateAvailability(status);
    if (profileMetaEl) profileMetaEl.textContent = `${trade} · ${profile.city || profile.postcode || 'Location not set'} · ${experience}`;
    if (profileCertificationEl) {
      profileCertificationEl.textContent = certificates;
      profileCertificationEl.closest('.profile-cert')?.classList.toggle('verified', verified);
    }
  }

  async function guardWorkerSession() {
    const token = localStorage.getItem('sitecrewToken') || decodeURIComponent(getCookie('sitecrewToken') || '');

    if (!token) {
      window.location.replace('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Invalid session');
      }

      const session = await response.json();
      currentUserId = session.user.id;
      if (session.user.role !== 'worker') {
        window.location.replace('/');
        return;
      }

      if (session.profile?.language_preference) {
        i18n?.setLanguage(session.profile.language_preference);
      }
      if (workerLanguageMenu) {
        workerLanguageMenu.querySelectorAll('[data-language]').forEach((button) => {
          button.classList.toggle('active', button.dataset.language === (i18n?.getLanguage() || 'en'));
        });
      }
      updateWorkerLanguageFlag(i18n?.getLanguage() || 'en');
      hydrateWorkerProfile(session);
      await loadWorkerApplications();
    } catch (error) {
      localStorage.removeItem('sitecrewToken');
      localStorage.removeItem('sitecrewUser');
      document.cookie = 'sitecrewToken=; path=/; max-age=0; SameSite=Lax';
      window.location.replace('/login');
    }
  }

  guardWorkerSession();

  window.setInterval(() => {
    if (!workerMessagesPanel || workerMessagesPanel.hidden) return;

    loadConversations({ silent: true }).then(() => {
      if (activeConversationId) {
        loadConversationMessages(activeConversationId, { silent: true });
      }
    });
  }, MESSAGE_PANEL_POLL_MS);

  window.setInterval(() => {
    if (!workerMessagesPanel || !workerMessagesPanel.hidden) return;
    loadConversations({ silent: true, countOnly: true });
  }, MESSAGE_BADGE_POLL_MS);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('sitecrewToken');
      localStorage.removeItem('sitecrewUser');
      document.cookie = 'sitecrewToken=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/login';
    });
  }

  workerLanguageBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    setWorkerLanguageMenuOpen(workerLanguageMenu?.hidden);
    setTopbarPanel(null);
  });

  workerLanguageMenu?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-language]');
    if (!button) return;

    const language = button.dataset.language;
    setWorkerLanguageMenuOpen(false);
    i18n?.setLanguage(language);
    updateWorkerLanguageFlag(language);
    workerLanguageMenu.querySelectorAll('[data-language]').forEach((item) => {
      item.classList.toggle('active', item.dataset.language === language);
    });
    setLanguageStatus(t('settings.languageSaved'), 'success');

    try {
      await updateWorkerProfile({ languagePreference: language });
    } catch (error) {
      setLanguageStatus(t('settings.languageSaveFailed'), 'error');
    }
  });

  openFindJobSearchBtn?.addEventListener('click', openFindJobSearchModal);
  closeFindJobSearchBtn?.addEventListener('click', closeFindJobSearchModal);

  findJobSearchModal?.addEventListener('click', (event) => {
    if (event.target === findJobSearchModal) {
      closeFindJobSearchModal();
    }
  });

  resetFindJobSearchBtn?.addEventListener('click', () => {
    findJobSearchForm?.reset();
    renderFindJobTradeOptions([]);
    prefillFindJobTradeFromInterests();
    findCompanyCache = [];
    loadFindJobResults(new FormData(findJobSearchForm || undefined));
  });

  findJobTradeInput?.addEventListener('input', () => {
    window.clearTimeout(findJobTradeSearchTimer);
    const query = findJobTradeInput.value.trim();

    if (query.length < 3) {
      renderFindJobTradeOptions([]);
      return;
    }

    findJobTradeSearchTimer = window.setTimeout(async () => {
      try {
        const trades = await searchConstructionTrades(query);
        renderFindJobTradeOptions(trades);
      } catch (error) {
        renderFindJobTradeOptions([]);
      }
    }, 250);
  });

  findJobSearchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    loadFindJobResults(new FormData(findJobSearchForm));
  });

  topbarCompanySearchInput?.addEventListener('focus', () => {
    setTopbarPanel(topbarCompanySearchPanel);
    renderTopbarCompanyResults([], topbarCompanySearchInput.value.trim());
  });

  topbarCompanySearchInput?.addEventListener('input', () => {
    window.clearTimeout(topbarCompanySearchTimer);
    const query = topbarCompanySearchInput.value.trim();
    setTopbarPanel(topbarCompanySearchPanel);

    if (query.length < 2) {
      renderTopbarCompanyResults([], query);
      return;
    }

    topbarCompanySearchResults.innerHTML = '<p class="worker-panel-empty">Searching platform...</p>';
    topbarCompanySearchTimer = window.setTimeout(async () => {
      try {
        const results = await searchTopbarPlatform(query);
        renderTopbarCompanyResults(results, query);
      } catch (error) {
        topbarCompanySearchResults.innerHTML = `<p class="worker-panel-empty">${escapeHtml(error.message)}</p>`;
      }
    }, 250);
  });

  closeTopbarCompanySearchBtn?.addEventListener('click', () => {
    setTopbarPanel(null);
  });

  document.querySelectorAll('[data-delete-profile-post]').forEach((button) => {
    button.addEventListener('click', async () => {
      const postId = button.dataset.postId;
      if (!postId) return;
      if (!window.confirm('Delete this post? This action cannot be undone.')) return;

      const card = button.closest('[data-profile-post-id]');
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';

      try {
        await deleteProfilePost(postId);
        card?.remove();
      } catch (error) {
        button.disabled = false;
        button.innerHTML = originalText;
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('[data-unsave-profile-post]').forEach((button) => {
    button.addEventListener('click', async () => {
      const postId = button.dataset.postId;
      if (!postId) return;

      const card = button.closest('[data-saved-post-id]');
      const grid = document.querySelector('[data-saved-posts-grid]');
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

      try {
        await apiRequest(`/api/feed/posts/${postId}/save`, { method: 'POST' });
        card?.remove();

        if (grid && !grid.querySelector('[data-saved-post-id]') && !grid.querySelector('[data-saved-posts-empty]')) {
          grid.innerHTML = `
            <article class="profile-post-card profile-empty-card" data-saved-posts-empty>
              <div class="profile-post-body">
                <div class="profile-post-meta">
                  <strong>${escapeHtml(t('profile.noSavedPosts'))}</strong>
                  <small>${escapeHtml(t('profile.savedPostsEmpty'))}</small>
                </div>
                <p>${escapeHtml(t('profile.noSavedPostsDescription'))}</p>
              </div>
            </article>
          `;
        }
      } catch (error) {
        button.disabled = false;
        button.innerHTML = originalText;
        alert(error.message);
      }
    });
  });

  findJobResults?.addEventListener('click', async (event) => {
    const applyButton = event.target.closest('[data-find-job-apply]');
    if (applyButton) {
      const jobId = applyButton.dataset.jobId;
      if (!jobId || applyButton.disabled) return;

      applyButton.disabled = true;
      const originalText = applyButton.textContent;
      applyButton.textContent = t('findJob.sendingRequest');

      try {
        await applyToJob(jobId);
        appliedJobIds.add(Number(jobId));
        applyButton.textContent = t('buttons.alreadyApplied');
        applyButton.classList.add('applied');
        setFindJobStatus(t('findJob.requestSent'), 'success');
      } catch (error) {
        applyButton.disabled = false;
        applyButton.textContent = originalText;
        if (error.message.includes('duplicate') || error.message.includes('already')) {
          appliedJobIds.add(Number(jobId));
          applyButton.textContent = t('buttons.alreadyApplied');
          applyButton.classList.add('applied');
          applyButton.disabled = true;
          return;
        }
        setFindJobStatus(error.message, 'error');
      }
      return;
    }

    const messageButton = event.target.closest('[data-find-job-message]');
    if (!messageButton) return;

    const companyId = messageButton.dataset.companyId;
    const companyName = messageButton.dataset.companyName || t('findJob.company');
    if (!companyId) return;

    const message = window.prompt(`${t('findJob.writeMessage')} ${companyName}`);
    if (!message || !message.trim()) return;

    const originalText = messageButton.textContent;
    messageButton.disabled = true;
    messageButton.textContent = t('findJob.sending');

    try {
      await sendMessageToCompany(companyId, message.trim());
      messageButton.textContent = t('findJob.messageSent');
      setFindJobStatus(t('findJob.messageSent'), 'success');
    } catch (error) {
      messageButton.disabled = false;
      messageButton.textContent = originalText;
      setFindJobStatus(error.message, 'error');
    }
  });

  workerNotificationsBtn?.addEventListener('click', () => {
    const willOpen = workerNotificationsPanel?.hidden;
    setTopbarPanel(willOpen ? workerNotificationsPanel : null);
    if (willOpen) loadNotifications();
  });

  workerMessagesBtn?.addEventListener('click', () => {
    const willOpen = workerMessagesPanel?.hidden;
    setTopbarPanel(willOpen ? workerMessagesPanel : null);
    if (willOpen) loadConversations();
  });

  document.querySelectorAll('[data-close-worker-panel]').forEach((button) => {
    button.addEventListener('click', () => setTopbarPanel(null));
  });

  workerNotificationsList?.addEventListener('click', async (event) => {
    const item = event.target.closest('[data-notification-id]');
    if (!item) return;
    await markNotificationRead(item.dataset.notificationId, item);
    if (item.dataset.relatedType === 'conversation' && item.dataset.relatedId) {
      setTopbarPanel(workerMessagesPanel);
      loadConversations().then(() => loadConversationMessages(item.dataset.relatedId));
    }
    if (item.dataset.relatedType === 'job' && item.dataset.relatedId) {
      const jobCard = document.querySelector(`[data-job-id="${item.dataset.relatedId}"]`);
      if (jobCard) {
        setTopbarPanel(null);
        jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        jobCard.classList.add('highlight-job-offer');
        setTimeout(() => jobCard.classList.remove('highlight-job-offer'), 1800);
      } else {
        window.location.href = '/worker/dashboard#feed';
      }
    }
  });

  workerConversationsList?.addEventListener('click', (event) => {
    const item = event.target.closest('[data-conversation-id]');
    if (!item) return;
    loadConversationMessages(item.dataset.conversationId);
  });

  workerMessageForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(workerMessageForm);
    const body = String(formData.get('body') || '').trim();
    const input = workerMessageForm.elements.body;
    const submitBtn = workerMessageForm.querySelector('button[type="submit"]');

    if (!body) return;

    submitBtn.disabled = true;
    try {
      await sendConversationMessage(body);
      input.value = '';
    } catch (error) {
      alert(error.message);
    } finally {
      submitBtn.disabled = false;
      input.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#workerLanguagePicker')) {
      setWorkerLanguageMenuOpen(false);
    }

    const clickedInsidePanel = event.target.closest('.worker-topbar-panel');
    const clickedTopbarButton = event.target.closest('#workerNotificationsBtn, #workerMessagesBtn, .social-search');
    if (!clickedInsidePanel && !clickedTopbarButton) {
      setTopbarPanel(null);
    }
  });

  openWorkerProfileEditButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      openWorkerProfileEditModal();
      try {
        const profile = await fetchCurrentWorkerProfile();
        fillWorkerProfileForm(profile);
      } catch (error) {
        setWorkerProfileAlert(error.message);
      }
    });
  });

  document.getElementById('applyProfileVerificationBtn')?.addEventListener('click', async () => {
    const button = document.getElementById('applyProfileVerificationBtn');
    if (!button || button.disabled) return;

    button.disabled = true;

    try {
      await apiRequest('/api/workers/me/verification-request', { method: 'POST' });
      alert(t('profile.verificationAppliedMessage'));
      button.remove();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
    }
  });

  openWorkerTradeInterestBtn?.addEventListener('click', async () => {
    openWorkerTradeInterestModal();
    try {
      const profile = await fetchCurrentWorkerProfile();
      workerTradeInterestValues = Array.isArray(profile?.trade_interests) ? [...profile.trade_interests] : [];
      renderWorkerTradeInterestSelected();
    } catch (error) {
      setWorkerTradeInterestAlert(error.message);
    }
  });

  workerTradeInterestInput?.addEventListener('input', () => {
    const query = workerTradeInterestInput.value.trim();
    window.clearTimeout(workerTradeSearchTimer);

    if (query.length < 3) {
      workerTradeSearchResults = [];
      renderWorkerTradeOptions([]);
      return;
    }

    workerTradeSearchTimer = window.setTimeout(async () => {
      try {
        workerTradeSearchResults = await searchConstructionTrades(query);
        renderWorkerTradeOptions(workerTradeSearchResults);
      } catch (error) {
        workerTradeSearchResults = [];
        renderWorkerTradeOptions([]);
      }
    }, 180);
  });

  function addTradeInterestFromInput() {
    const value = workerTradeInterestInput?.value.trim();
    if (!value) return;
    const matchingTrade = workerTradeSearchResults.find((trade) => trade.name.toLowerCase() === value.toLowerCase());
    if (!matchingTrade) return;
    addWorkerTradeInterest(matchingTrade.name);
    workerTradeInterestInput.value = '';
    workerTradeSearchResults = [];
    renderWorkerTradeOptions([]);
  }

  workerTradeInterestInput?.addEventListener('change', addTradeInterestFromInput);
  workerTradeInterestInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTradeInterestFromInput();
    }
  });

  workerTradeInterestSelected?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-worker-trade-interest]');
    if (!button) return;
    const trade = button.dataset.removeWorkerTradeInterest;
    workerTradeInterestValues = workerTradeInterestValues.filter((item) => item !== trade);
    renderWorkerTradeInterestSelected();
  });

  openWorkerCompanyStoryBtn?.addEventListener('click', () => openWorkerCompanyModal(workerCompanyStoryModal, 'posts', workerCompanyStoryAlert));
  openWorkerCompanyPostBtn?.addEventListener('click', () => openWorkerCompanyModal(workerCompanyPostModal, 'posts', workerCompanyPostAlert));
  createPostFab?.addEventListener('click', () => openWorkerCompanyModal(workerCompanyPostModal, 'posts', workerCompanyPostAlert));
  openWorkerCompanyJobBtn?.addEventListener('click', () => openWorkerCompanyModal(workerCompanyJobModal, 'jobs', workerCompanyJobAlert));

  publicProfileGoBackBtn?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/worker/dashboard';
  });

  followPublicWorkerBtn?.addEventListener('click', async () => {
    const workerId = publicWorkerActions?.dataset.publicWorkerId;
    if (!workerId) return;

    const isFollowing = followPublicWorkerBtn.classList.contains('following');
    followPublicWorkerBtn.disabled = true;

    try {
      if (isFollowing) {
        await apiRequest(`/api/follows/${workerId}`, { method: 'DELETE' });
        followPublicWorkerBtn.classList.remove('following');
        followPublicWorkerBtn.innerHTML = '<i class="bi bi-person-plus"></i><span>Follow</span>';
      } else {
        await apiRequest(`/api/follows/${workerId}`, { method: 'POST' });
        followPublicWorkerBtn.classList.add('following');
        followPublicWorkerBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i><span>Following</span>';
      }
    } catch (error) {
      alert(error.message);
    } finally {
      followPublicWorkerBtn.disabled = false;
    }
  });

  messagePublicWorkerBtn?.addEventListener('click', async () => {
    const workerId = publicWorkerActions?.dataset.publicWorkerId;
    if (!workerId) return;

    const message = window.prompt('Write a message to this worker:');
    if (message === null) return;

    const body = message.trim();
    if (!body) {
      alert(t('validation.writeMessage'));
      return;
    }

    messagePublicWorkerBtn.disabled = true;
    const originalHtml = messagePublicWorkerBtn.innerHTML;
    messagePublicWorkerBtn.innerHTML = '<i class="bi bi-send"></i><span>Sending...</span>';

    try {
      const conversationData = await apiRequest('/api/conversations/workers', {
        method: 'POST',
        body: JSON.stringify({ recipientWorkerId: Number(workerId) }),
      });
      const conversationId = conversationData.conversation?.id;
      if (!conversationId) throw new Error('Could not start conversation.');

      await apiRequest(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }).then((data) => {
        if (data.moderation?.status === 'hidden') {
          alert(data.moderation.message || 'Your message is pending AI review before delivery.');
        }
      });
      messagePublicWorkerBtn.innerHTML = '<i class="bi bi-check2"></i><span>Sent</span>';
      updateTopbarCount(workerMessagesBtn, Number(workerMessagesBtn?.querySelector('span')?.textContent || 0) + 1);
      setTimeout(() => {
        messagePublicWorkerBtn.innerHTML = originalHtml;
        messagePublicWorkerBtn.disabled = false;
      }, 1200);
    } catch (error) {
      alert(error.message);
      messagePublicWorkerBtn.innerHTML = originalHtml;
      messagePublicWorkerBtn.disabled = false;
    }
  });

  document.querySelectorAll('[data-close-worker-company-modal]').forEach((button) => {
    button.addEventListener('click', closeAllWorkerCompanyModals);
  });

  [closeWorkerProfileEditBtn, cancelWorkerProfileEditBtn].forEach((button) => {
    button?.addEventListener('click', closeWorkerProfileEditModal);
  });

  [closeWorkerTradeInterestBtn, cancelWorkerTradeInterestBtn].forEach((button) => {
    button?.addEventListener('click', closeWorkerTradeInterestModal);
  });

  openWorkerReviewsModalBtn?.addEventListener('click', openWorkerReviewsModal);
  closeWorkerReviewsModalBtn?.addEventListener('click', closeWorkerReviewsModal);

  workerProfileEditModal?.addEventListener('click', (event) => {
    if (event.target === workerProfileEditModal) {
      closeWorkerProfileEditModal();
    }
  });

  workerTradeInterestModal?.addEventListener('click', (event) => {
    if (event.target === workerTradeInterestModal) {
      closeWorkerTradeInterestModal();
    }
  });

  workerReviewsModal?.addEventListener('click', (event) => {
    if (event.target === workerReviewsModal) {
      closeWorkerReviewsModal();
    }
  });

  document.querySelectorAll('[data-story-trigger]').forEach((storyButton) => {
    storyButton.addEventListener('click', () => {
      try {
        const stories = JSON.parse(decodeURIComponent(storyButton.dataset.storyItems || '[]')).map((story) => ({
          id: story.id,
          company: story.label,
          caption: story.caption,
          media: story.mediaUrl,
          logo: story.logo,
          time: story.time,
          expires: story.expiresAt,
        }));
        openStoryViewer(stories);
      } catch (error) {
        alert('Could not open stories.');
      }
    });
  });

  refreshStoryGroupViewedStates();

  closeStoryViewerBtn?.addEventListener('click', closeStoryViewer);

  storyViewer?.addEventListener('click', (event) => {
    if (event.target === storyViewer) {
      closeStoryViewer();
    }
  });

  storyViewerMedia?.addEventListener('click', (event) => {
    if (event.target.closest('video')) return;
    showNextStory();
  });

  storyViewerMedia?.addEventListener('dblclick', (event) => {
    if (!event.target.closest('video')) return;
    showNextStory();
  });

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  function setActiveOption(value) {
    availOptions.forEach((opt) => {
      opt.classList.toggle('active', opt.dataset.status === value);
      const input = opt.querySelector('input');
      if (input) input.checked = opt.dataset.status === value;
    });
    selectedStatus = value;
  }

  availOptions.forEach((opt) => {
    opt.addEventListener('click', () => setActiveOption(opt.dataset.status));
  });

  function updateStatusDisplay(status) {
    const cfg = STATUS_MAP[status];
    const label = document.getElementById('statusLabel');
    const dashboardStatus = document.getElementById('dashboardWorkerStatus');
    if (!cfg) return;
    if (label) label.textContent = t(cfg.labelKey);
    if (dashboardStatus) dashboardStatus.textContent = t(cfg.labelKey);
    updateDashboardStatusPill(status);
    if (statusDot) statusDot.className = 'status-dot ' + cfg.dot;
  }

  if (changeStatusBtn && statusModal) {
    changeStatusBtn.addEventListener('click', () => {
      setActiveOption(selectedStatus);
      statusModal.classList.add('open');
      statusModal.setAttribute('aria-hidden', 'false');
    });
  }

  if (cancelStatusBtn && statusModal) {
    cancelStatusBtn.addEventListener('click', () => {
      statusModal.classList.remove('open');
      statusModal.setAttribute('aria-hidden', 'true');
    });
  }

  if (saveStatusBtn && statusModal) {
    saveStatusBtn.addEventListener('click', async () => {
      const cfg = STATUS_MAP[selectedStatus];
      if (!cfg) return;

      const originalText = saveStatusBtn.textContent;
      saveStatusBtn.disabled = true;
      saveStatusBtn.textContent = `${t('buttons.save')}...`;

      try {
        await updateWorkerProfile({ availabilityStatus: cfg.value });
        updateStatusDisplay(selectedStatus);
        statusModal.classList.remove('open');
        statusModal.setAttribute('aria-hidden', 'true');
      } catch (error) {
        alert(error.message);
      } finally {
        saveStatusBtn.disabled = false;
        saveStatusBtn.textContent = originalText;
      }
    });
  }

  if (statusModal) {
    statusModal.addEventListener('click', (e) => {
      if (e.target === statusModal) {
        statusModal.classList.remove('open');
        statusModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setTopbarPanel(null);
    }
    if (event.key === 'Escape' && storyViewer?.classList.contains('open')) {
      closeStoryViewer();
    }
    if (event.key === 'Escape' && workerProfileEditModal?.classList.contains('open')) {
      closeWorkerProfileEditModal();
    }
    if (event.key === 'Escape' && workerTradeInterestModal?.classList.contains('open')) {
      closeWorkerTradeInterestModal();
    }
    if (event.key === 'Escape' && workerReviewsModal?.classList.contains('open')) {
      closeWorkerReviewsModal();
    }
    if (event.key === 'Escape' && findJobSearchModal?.classList.contains('open')) {
      closeFindJobSearchModal();
    }
    if (event.key === 'Escape' && statusModal?.classList.contains('open')) {
      statusModal.classList.remove('open');
      statusModal.setAttribute('aria-hidden', 'true');
    }
    if (event.key === 'Escape') {
      closeAllWorkerCompanyModals();
    }
  });

  [workerCompanyStoryModal, workerCompanyPostModal, workerCompanyJobModal].forEach((modal) => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeWorkerCompanyModal(modal);
      }
    });
  });

  workerCompanyStoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (workerCompanyStoryAlert) workerCompanyStoryAlert.hidden = true;

    const formData = new FormData(workerCompanyStoryForm);
    const submitBtn = workerCompanyStoryForm.querySelector('button[type="submit"]');
    const file = formData.get('media');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    try {
      await validateWorkerCompanyStoryMedia(file);
      const mediaUrl = await uploadWorkerCompanyStoryMedia(file);
      const companyId = formData.get('companyId') ? Number(formData.get('companyId')) : undefined;
      await apiRequest('/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          mediaUrl,
          caption: formData.get('caption')?.trim() || undefined,
          expiresInHours: 24,
        }),
      });
      setCompanyActionAlert(workerCompanyStoryAlert, 'Story added successfully.', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setCompanyActionAlert(workerCompanyStoryAlert, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Story';
    }
  });

  workerCompanyPostForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (workerCompanyPostAlert) workerCompanyPostAlert.hidden = true;

    const formData = new FormData(workerCompanyPostForm);
    const submitBtn = workerCompanyPostForm.querySelector('button[type="submit"]');
    const files = Array.from(workerCompanyPostForm.elements.media?.files || []);

    submitBtn.disabled = true;
    submitBtn.textContent = t('posts.publishing');

    try {
      const mediaUrls = await uploadWorkerCompanyPostMedia(files);
      const companyId = formData.get('companyId') ? Number(formData.get('companyId')) : undefined;
      await apiRequest('/api/feed/posts', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          postType: companyId ? 'company_update' : 'work_completed',
          title: formData.get('title')?.trim() || undefined,
          caption: formData.get('caption')?.trim(),
          mediaUrls,
          location: formData.get('location')?.trim() || undefined,
        }),
      });
      setCompanyActionAlert(workerCompanyPostAlert, t('posts.success'), 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setCompanyActionAlert(workerCompanyPostAlert, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = t('profile.addPost');
    }
  });

  workerCompanyJobForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (workerCompanyJobAlert) workerCompanyJobAlert.hidden = true;

    const formData = new FormData(workerCompanyJobForm);
    const submitBtn = workerCompanyJobForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    try {
      if (!formData.get('companyId')) throw new Error('No company permission available for jobs.');
      await apiRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          companyId: Number(formData.get('companyId')),
          title: formData.get('title')?.trim(),
          description: formData.get('description')?.trim(),
          city: formData.get('city')?.trim() || undefined,
          postcode: formData.get('postcode')?.trim() || undefined,
          tradeRequired: formData.get('tradeRequired')?.trim(),
          experienceRequired: formData.get('experienceRequired')?.trim() || undefined,
          certificatesRequired: parseCsv(formData.get('certificatesRequired')),
          startDate: formData.get('startDate') || undefined,
          duration: formData.get('duration')?.trim() || undefined,
          rate: formData.get('rate')?.trim() || undefined,
          workersRequired: Number(formData.get('workersRequired') || 1),
          status: 'open',
        }),
      });
      setCompanyActionAlert(workerCompanyJobAlert, 'Job added successfully.', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setCompanyActionAlert(workerCompanyJobAlert, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Job';
    }
  });

  workerProfileEditForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    workerProfileEditAlert.hidden = true;

    const formData = new FormData(workerProfileEditForm);
    const submitBtn = workerProfileEditForm.querySelector('button[type="submit"]');

    if (!formData.get('dataConsent')) {
      setWorkerProfileAlert(t('profile.dataConsentRequired'));
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t('profile.saving');

    try {
      const yearsExperience = formData.get('yearsExperience')
        ? Number(formData.get('yearsExperience'))
        : undefined;
      const profilePhotoFile = formData.get('profilePhoto');
      const uploadedProfilePhoto = profilePhotoFile && profilePhotoFile.size > 0
        ? await uploadWorkerProfilePhoto(profilePhotoFile)
        : undefined;

      await updateWorkerProfile({
        fullName: formData.get('fullName').trim(),
        profilePhoto: uploadedProfilePhoto,
        trades: parseCsv(formData.get('trades')),
        workLocations: parseCsv(formData.get('workLocations')),
        city: formData.get('city').trim() || undefined,
        postcode: formData.get('postcode').trim() || undefined,
        workingRadius: formData.get('workingRadius').trim() || undefined,
        yearsExperience,
        languagePreference: formData.get('languagePreference') || undefined,
        experience: yearsExperience !== undefined ? `${yearsExperience} years` : undefined,
        availabilityStatus: formData.get('availabilityStatus'),
        lastCompanies: parseCsv(formData.get('lastCompanies')).slice(0, 3),
        certificates: parseCsv(formData.get('qualifications')),
        qualifications: parseCsv(formData.get('qualifications')),
        hasUkWorkPermit: boolValue(formData.get('hasUkWorkPermit')),
        isEnglishNative: boolValue(formData.get('isEnglishNative')),
        nativeLanguage: formData.get('nativeLanguage').trim() || undefined,
        englishLevel: formData.get('englishLevel') || undefined,
        hasCar: boolValue(formData.get('hasCar')),
        canUseCarForWork: boolValue(formData.get('canUseCarForWork')),
        hasHealthIssues: boolValue(formData.get('hasHealthIssues')),
        healthIssuesDetails: formData.get('healthIssuesDetails').trim() || undefined,
        bio: formData.get('bio').trim() || undefined,
        dataConsent: true,
      });

      if (formData.get('languagePreference')) {
        i18n?.setLanguage(formData.get('languagePreference'));
      }
      setWorkerProfileAlert(t('profile.savedRefreshing'), 'success');
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setWorkerProfileAlert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = t('profile.submit');
    }
  });

  workerTradeInterestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (workerTradeInterestAlert) workerTradeInterestAlert.hidden = true;

    if (!workerTradeInterestValues.length) {
      setWorkerTradeInterestAlert('Please select at least one trade interest.');
      return;
    }

    const submitBtn = workerTradeInterestForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      await updateWorkerProfile({ tradeInterests: workerTradeInterestValues });
      setWorkerTradeInterestAlert('Trade interests saved. Refreshing feed...', 'success');
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setWorkerTradeInterestAlert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save interests';
    }
  });

  document.querySelectorAll('.btn-accept, .btn-decline').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.invite-item');
      if (item) {
        item.style.opacity = '0.4';
        item.querySelector('.invite-actions').innerHTML =
          '<span class="app-badge ' + (btn.classList.contains('btn-accept') ? 'accepted' : 'rejected') + '">' +
          (btn.classList.contains('btn-accept') ? 'Accepted' : 'Declined') + '</span>';
      }
    });
  });

  document.querySelectorAll('.btn-apply').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.textContent = t('buttons.alreadyApplied');
      btn.style.background = '#E2E8F0';
      btn.style.color = '#64748B';
      btn.style.cursor = 'default';
    });
  });

  document.querySelectorAll('.feed-apply-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const jobId = btn.dataset.jobId || btn.closest('[data-job-id]')?.dataset.jobId;
      if (!jobId) return;

      btn.disabled = true;
      btn.textContent = t('buttons.apply') + '...';

      try {
        await applyToJob(jobId, t('feed.applyCoverNote'));
        btn.textContent = t('buttons.alreadyApplied');
        btn.classList.add('applied');
        btn.disabled = true;
      } catch (error) {
        btn.disabled = false;
        if (error.message.includes('duplicate') || error.message.includes('already')) {
          btn.textContent = t('buttons.alreadyApplied');
          btn.classList.add('applied');
          btn.disabled = true;
          return;
        }
        btn.textContent = error.message.includes('Open job not found') ? 'Job closed' : t('buttons.applyDirectly');
        alert(error.message);
      }
    });
  });

  document.querySelectorAll('[data-rate-insight-feedback]').forEach((feedbackBox) => {
    feedbackBox.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-rate-feedback-vote]');
      if (!button) return;

      const insightDate = feedbackBox.dataset.insightDate;
      const vote = button.dataset.rateFeedbackVote;
      if (!insightDate || !vote) return;

      const buttons = feedbackBox.querySelectorAll('[data-rate-feedback-vote]');
      buttons.forEach((item) => {
        item.disabled = true;
      });

      try {
        const result = await apiRequest('/api/jobs/trades/rates/feedback', {
          method: 'POST',
          body: JSON.stringify({ insightDate, vote }),
        });
        const feedback = result.feedback || {};
        feedbackBox.querySelector('[data-rate-feedback-count="up"]').textContent = feedback.upCount || 0;
        feedbackBox.querySelector('[data-rate-feedback-count="down"]').textContent = feedback.downCount || 0;
        buttons.forEach((item) => {
          item.classList.toggle('active', item.dataset.rateFeedbackVote === feedback.userVote);
        });
      } catch (error) {
        alert(error.message);
      } finally {
        buttons.forEach((item) => {
          item.disabled = false;
        });
      }
    });
  });

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getFeedPostCard(element) {
    return element.closest('[data-post-id]');
  }

  function updateFeedLikeButton(button, liked, likeCount) {
    button.classList.toggle('active', liked);
    button.setAttribute('aria-pressed', liked ? 'true' : 'false');
    const icon = button.querySelector('i');
    if (icon) {
      icon.className = liked ? 'bi bi-heart-fill' : 'bi bi-heart';
    }
    const countEl = button.querySelector('[data-feed-like-count]');
    if (countEl) {
      countEl.textContent = String(likeCount);
    }
  }

  function updateFeedSaveButton(button, saved) {
    button.classList.toggle('active', saved);
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    const icon = button.querySelector('i');
    if (icon) {
      icon.className = saved ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
    }
  }

  function updateFeedCommentCount(card, commentCount) {
    const countEl = card.querySelector('[data-feed-comment-count]');
    if (countEl) {
      countEl.textContent = String(commentCount);
    }
  }

  function renderFeedComments(comments) {
    if (!comments.length) {
      return '';
    }

    return comments.map((comment) => (
      `<p><strong>${escapeHtml(comment.author_name || 'User')}</strong> ${escapeHtml(comment.body)}</p>`
    )).join('');
  }

  async function loadFeedComments(card, options = {}) {
    const postId = card.dataset.postId;
    const list = card.querySelector('[data-feed-comment-list]');
    if (!postId || !list) return;

    if (!options.force && list.dataset.loaded === 'true') {
      return;
    }

    try {
      const data = await apiRequest(`/api/feed/posts/${postId}/comments`);
      list.innerHTML = renderFeedComments(data.comments || []);
      list.dataset.loaded = 'true';
    } catch (error) {
      list.innerHTML = `<p class="feed-comment-error">${escapeHtml(error.message)}</p>`;
    }
  }

  async function submitFeedComment(card, text) {
    const postId = card.dataset.postId;
    if (!postId || !text.trim()) return;

    const data = await apiRequest(`/api/feed/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ body: text.trim() }),
    });

    if (data.moderation?.status === 'hidden') {
      alert(data.moderation.message || t('feed.commentPendingReview'));
      return;
    }

    const list = card.querySelector('[data-feed-comment-list]');
    if (list) {
      list.dataset.loaded = 'false';
    }
    await loadFeedComments(card, { force: true });

    const currentCount = Number(card.querySelector('[data-feed-comment-count]')?.textContent || 0);
    updateFeedCommentCount(card, currentCount + 1);
  }

  async function shareFeedPost(card) {
    const postId = card.dataset.postId;
    if (!postId) return;

    const shareUrl = `${window.location.origin}/worker/dashboard?post=${postId}`;
    const titleEl = card.querySelector('.feed-post-title');
    const captionEl = card.querySelector('.feed-caption');
    const shareTitle = titleEl?.textContent?.trim()
      || captionEl?.querySelector('strong')?.textContent?.trim()
      || 'SiteCrew post';
    const shareText = captionEl?.textContent?.replace(shareTitle, '').trim() || '';

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      alert(t('feed.shareCopied'));
    } catch (error) {
      if (error?.name === 'AbortError') return;
      alert(t('feed.shareFailed'));
    }
  }

  document.querySelector('.social-feed')?.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-feed-action]');
    if (!actionButton || actionButton.disabled) return;

    const card = getFeedPostCard(actionButton);
    if (!card) return;

    const action = actionButton.dataset.feedAction;
    const postId = card.dataset.postId;
    if (!postId) return;

    if (action === 'comment') {
      const commentsSection = card.querySelector('[data-feed-comments]');
      const input = card.querySelector('[data-feed-comment-input]');
      commentsSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await loadFeedComments(card);
      input?.focus();
      return;
    }

    actionButton.disabled = true;

    try {
      if (action === 'like') {
        const data = await apiRequest(`/api/feed/posts/${postId}/like`, { method: 'POST' });
        updateFeedLikeButton(actionButton, Boolean(data.liked), Number(data.likeCount || 0));
        return;
      }

      if (action === 'save') {
        const data = await apiRequest(`/api/feed/posts/${postId}/save`, { method: 'POST' });
        updateFeedSaveButton(actionButton, Boolean(data.saved));
        return;
      }

      if (action === 'share') {
        await shareFeedPost(card);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      actionButton.disabled = false;
    }
  });

  document.querySelector('.social-feed')?.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;

    const input = event.target.closest('[data-feed-comment-input]');
    if (!input) return;

    event.preventDefault();
    const card = getFeedPostCard(input);
    if (!card) return;

    const text = input.value;
    input.disabled = true;

    try {
      await submitFeedComment(card, text);
      input.value = '';
    } catch (error) {
      alert(error.message);
    } finally {
      input.disabled = false;
    }
  });

  document.querySelectorAll('.feed-post-card[data-post-id]').forEach((card) => {
    loadFeedComments(card);
  });

  const highlightedPostId = new URLSearchParams(window.location.search).get('post');
  if (highlightedPostId) {
    const highlightedCard = document.querySelector(`.feed-post-card[data-post-id="${highlightedPostId}"]`);
    if (highlightedCard) {
      highlightedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightedCard.classList.add('feed-post-highlight');
    }
  }

  const feedFilterButtons = document.querySelectorAll('.feed-filter-btn');
  const feedCards = document.querySelectorAll('.social-feed .feed-card');

  feedFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.feedFilter;

      feedFilterButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      feedCards.forEach((card) => {
        const isVisible = filter === 'all' || card.dataset.feedType === filter;
        card.hidden = !isVisible;
      });
    });
  });
})();
