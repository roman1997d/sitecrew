(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || 'http://localhost:4000';
  const SECTION_TITLES = {
    metrics: 'Metrics Tracker',
    users: 'Users',
    companies: 'Company Accounts',
    market: 'Market and Money',
    posts: 'Posts Moderator',
    'api-logs': 'API Logs',
    audit: 'Audit Trails',
    server: 'Server',
  };

  let activeSection = 'metrics';
  let activePostsPanel = 'list';
  let selectedUserId = null;
  let selectedUserRole = null;
  let cachedUsers = [];
  let usersSearchTimer = null;
  let cachedCompanies = [];
  let companiesSearchTimer = null;
  let selectedCompanyId = null;
  let showCompaniesExpiringOnly = false;
  let showApiLogsProblemsOnly = false;
  let adminSessionUser = null;
  let pendingCompanyStatusChange = null;
  let currentMediaReviewItem = null;
  let mediaReviewBusy = false;
  let currentTextReviewItem = null;
  let textReviewBusy = false;
  const adminUserEmail = document.getElementById('adminUserEmail');
  const adminSectionTitle = document.getElementById('adminSectionTitle');
  const adminAlert = document.getElementById('adminAlert');
  const adminRefreshBtn = document.getElementById('adminRefreshBtn');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const navButtons = document.querySelectorAll('[data-admin-section]');
  const sections = document.querySelectorAll('.admin-section');
  const postsPanels = document.querySelectorAll('.admin-posts-panel');
  const adminTextReviewEmpty = document.getElementById('adminTextReviewEmpty');
  const adminTextReviewContent = document.getElementById('adminTextReviewContent');
  const adminTextReviewType = document.getElementById('adminTextReviewType');
  const adminTextReviewTitle = document.getElementById('adminTextReviewTitle');
  const adminTextReviewText = document.getElementById('adminTextReviewText');
  const adminTextReviewRiskReason = document.getElementById('adminTextReviewRiskReason');
  const adminTextReviewMeta = document.getElementById('adminTextReviewMeta');
  const adminTextReviewActions = document.getElementById('adminTextReviewActions');
  const adminTextReviewCounter = document.getElementById('adminTextReviewCounter');
  const adminTextReviewApproveBtn = document.getElementById('adminTextReviewApproveBtn');
  const adminTextReviewRejectBtn = document.getElementById('adminTextReviewRejectBtn');
  const adminTextReviewRiskOnlyBtn = document.getElementById('adminTextReviewRiskOnlyBtn');
  const adminTextReviewLearnModeBtn = document.getElementById('adminTextReviewLearnModeBtn');
  const adminTextReviewRescanBtn = document.getElementById('adminTextReviewRescanBtn');
  const adminTextReviewLearnHint = document.getElementById('adminTextReviewLearnHint');
  const adminTextReviewLearnedTermsMeta = document.getElementById('adminTextReviewLearnedTermsMeta');
  const adminTextReviewLearnModal = document.getElementById('adminTextReviewLearnModal');
  const adminTextReviewLearnForm = document.getElementById('adminTextReviewLearnForm');
  const adminTextReviewLearnTerms = document.getElementById('adminTextReviewLearnTerms');
  const adminTextReviewLearnCategory = document.getElementById('adminTextReviewLearnCategory');
  const adminTextReviewLearnedListBtn = document.getElementById('adminTextReviewLearnedListBtn');
  const adminTextReviewLearnedListModal = document.getElementById('adminTextReviewLearnedListModal');
  const adminTextReviewLearnedListSummary = document.getElementById('adminTextReviewLearnedListSummary');
  const adminTextReviewLearnedListTable = document.getElementById('adminTextReviewLearnedListTable');
  const adminTextReviewLearnedAddForm = document.getElementById('adminTextReviewLearnedAddForm');
  const adminTextReviewLearnedAddTerms = document.getElementById('adminTextReviewLearnedAddTerms');
  const adminTextReviewLearnedAddRisk = document.getElementById('adminTextReviewLearnedAddRisk');
  const adminTextReviewLearnedAddBtn = document.getElementById('adminTextReviewLearnedAddBtn');
  const adminTextReviewPresetRiskListBtn = document.getElementById('adminTextReviewPresetRiskListBtn');
  const adminTextReviewPresetRiskListModal = document.getElementById('adminTextReviewPresetRiskListModal');
  const adminTextReviewPresetRiskListSummary = document.getElementById('adminTextReviewPresetRiskListSummary');
  const adminTextReviewPresetRiskListTable = document.getElementById('adminTextReviewPresetRiskListTable');
  let textReviewLearnMode = false;
  let showTextReviewRiskOnly = false;
  let activeMarketPanel = 'plans';
  let editingMarketAdId = null;
  let editingMarketAdIsNew = false;
  let cachedMarketAds = [];
  let marketAdTradeSearchTimer = null;
  let marketAdPreviewSlide = 0;
  let mediaReviewObjectUrl = null;
  const adminPostsModerationStatus = document.getElementById('adminPostsModerationStatus');
  const adminMediaReviewEmpty = document.getElementById('adminMediaReviewEmpty');
  const adminMediaReviewImage = document.getElementById('adminMediaReviewImage');
  const adminMediaReviewActions = document.getElementById('adminMediaReviewActions');
  const adminMediaReviewCounter = document.getElementById('adminMediaReviewCounter');
  const adminMediaReviewApproveBtn = document.getElementById('adminMediaReviewApproveBtn');
  const adminMediaReviewRejectBtn = document.getElementById('adminMediaReviewRejectBtn');
  const adminServerMetricsGrid = document.getElementById('adminServerMetricsGrid');
  const adminServerDetails = document.getElementById('adminServerDetails');
  const adminServerCheckPanicBtn = document.getElementById('adminServerCheckPanicBtn');
  const adminServerCheckDatabasePanicBtn = document.getElementById('adminServerCheckDatabasePanicBtn');
  const adminServerScanAbandonedBtn = document.getElementById('adminServerScanAbandonedBtn');
  const adminServerDeleteAbandonedBtn = document.getElementById('adminServerDeleteAbandonedBtn');
  const adminServerActionSummary = document.getElementById('adminServerActionSummary');
  const adminServerAbandonedTable = document.getElementById('adminServerAbandonedTable');
  let lastAbandonedScanResult = null;
  const adminAuditAutoDeleteEnabled = document.getElementById('adminAuditAutoDeleteEnabled');
  const adminAuditRetentionDays = document.getElementById('adminAuditRetentionDays');
  const adminAuditAutoDeleteSaveBtn = document.getElementById('adminAuditAutoDeleteSaveBtn');
  const adminAuditCleanAllBtn = document.getElementById('adminAuditCleanAllBtn');
  const adminAuditResultsMeta = document.getElementById('adminAuditResultsMeta');

  function getToken() {
    return localStorage.getItem('sitecrewAdminToken') || decodeURIComponent(
      (document.cookie.match(/(?:^|; )sitecrewAdminToken=([^;]+)/) || [])[1] || ''
    );
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getMediaUrl(path) {
    if (!path) return '';
    if (String(path).startsWith('data:')) {
      return path;
    }
    if (/^https?:\/\//i.test(path)) {
      try {
        return new URL(path).pathname;
      } catch (error) {
        return path;
      }
    }
    return path.startsWith('/') ? path : `/${path}`;
  }

  function getInitials(firstName = '', lastName = '', fallback = '?') {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase();
    return initials || fallback.charAt(0).toUpperCase();
  }

  function getUserDisplayName(user = {}) {
    if (user.role === 'company') {
      return user.companyName || user.email || 'Company';
    }
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.email || 'User';
  }

  function canForceDeleteUser(user = {}) {
    return user.status === 'deleted' && (user.role === 'worker' || user.role === 'company');
  }

  function formatDeletedPurgeLabel(updatedAt) {
    if (!updatedAt) {
      return 'Auto-delete in 24h';
    }

    const purgeAt = new Date(updatedAt).getTime() + (24 * 60 * 60 * 1000);
    const msLeft = purgeAt - Date.now();

    if (msLeft <= 0) {
      return 'Pending auto-delete';
    }

    const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
    return `Auto-delete in ${hoursLeft}h`;
  }

  function renderAvatarPreview(container, initialsEl, avatarPath, firstName, lastName, fallback = '?') {
    if (!container) return;
    if (avatarPath) {
      container.innerHTML = `<img src="${escapeHtml(getMediaUrl(avatarPath))}" alt="User avatar">`;
      return;
    }
    container.innerHTML = `<span id="${initialsEl?.id || 'adminUserAvatarInitials'}">${escapeHtml(getInitials(firstName, lastName, fallback))}</span>`;
  }

  function showAlert(message, type = 'error') {
    if (!adminAlert) return;
    adminAlert.textContent = message;
    adminAlert.dataset.type = type;
    adminAlert.hidden = false;
    window.clearTimeout(showAlert.timer);
    showAlert.timer = window.setTimeout(() => {
      adminAlert.hidden = true;
    }, 3200);
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        window.location.replace('/admin/login');
      }
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }

  async function apiUpload(path, formData) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        window.location.replace('/admin/login');
      }
      throw new Error(data.error || 'Upload failed.');
    }
    return data;
  }

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  function formatBillingDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatRatingLabel(averageRating, reviewCount) {
    if (!reviewCount || averageRating === null || averageRating === undefined) {
      return '—';
    }
    return `${Number(averageRating).toFixed(1)} (${reviewCount})`;
  }

  function matchesRatingFilter(averageRating, reviewCount, ratingFilter) {
    if (!ratingFilter) return true;
    if (ratingFilter === 'none') {
      return !reviewCount || averageRating === null || averageRating === undefined;
    }

    const minimumRating = Number(ratingFilter);
    if (Number.isNaN(minimumRating)) return true;
    return averageRating !== null && averageRating !== undefined && averageRating >= minimumRating;
  }

  async function guardAdminSession() {
    const token = getToken();
    if (!token) {
      window.location.replace('/admin/login');
      return;
    }

    const session = await apiRequest('/api/auth/me');
    if (!['admin', 'superadmin'].includes(session.user?.role)) {
      window.location.replace('/admin/login');
      return;
    }

    if (adminUserEmail) {
      adminUserEmail.textContent = `${session.user.email} · ${session.user.role}`;
    }
    adminSessionUser = session.user;
  }

  function formatHistoryDate(value) {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }

  function getCompanyStatusActionVerb(status) {
    return {
      active: 'activated',
      paused: 'paused',
      suspended: 'suspended',
      deleted: 'deleted',
    }[status] || status;
  }

  function getCompanyBillingActionVerb(action) {
    return {
      plan_updated: 'updated the company plan',
      month_added: 'added one extra billing month',
      expiry_reminder: 'sent a plan expiry reminder',
    }[action] || action;
  }

  function getCompanyStatusActionLabel(status) {
    return {
      active: 'activate',
      paused: 'pause',
      suspended: 'suspend',
      deleted: 'delete',
    }[status] || status;
  }

  function formatCompanyHistoryEntry(entry) {
    const date = formatHistoryDate(entry.createdAt);
    if (entry.action === 'event') {
      return `${date} → admin: ${entry.actorEmail} added an event — reason: ${entry.reason}`;
    }
    if (['plan_updated', 'month_added', 'expiry_reminder'].includes(entry.action)) {
      const verb = getCompanyBillingActionVerb(entry.action);
      return `${date} → admin: ${entry.actorEmail} ${verb} — reason: ${entry.reason}`;
    }
    const verb = getCompanyStatusActionVerb(entry.action);
    return `${date} → admin: ${entry.actorEmail} ${verb} this account — reason: ${entry.reason}`;
  }

  function setActiveSection(section) {
    activeSection = section;
    navButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.adminSection === section);
    });
    sections.forEach((panel) => {
      const isActive = panel.dataset.section === section;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
    if (adminSectionTitle) {
      adminSectionTitle.textContent = SECTION_TITLES[section] || 'Admin Panel';
    }
  }

  function renderMetrics(data) {
    const container = document.getElementById('adminMetricsGrid');
    if (!container) return;

    const totals = data.totals || {};
    const api = data.apiLast24h || {};

    container.innerHTML = `
      <article class="admin-metric-card">
        <span>Total users</span>
        <strong>${escapeHtml(totals.users)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Companies</span>
        <strong>${escapeHtml(totals.companies)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Jobs</span>
        <strong>${escapeHtml(totals.jobs)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Posts</span>
        <strong>${escapeHtml(totals.posts)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Applications</span>
        <strong>${escapeHtml(totals.applications)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Open reports</span>
        <strong>${escapeHtml(totals.open_reports)}</strong>
      </article>
      <article class="admin-metric-card accent">
        <span>API requests (24h)</span>
        <strong>${escapeHtml(api.total_requests || 0)}</strong>
      </article>
      <article class="admin-metric-card warn">
        <span>API errors (24h)</span>
        <strong>${escapeHtml(api.error_requests || 0)}</strong>
      </article>
      <article class="admin-metric-card">
        <span>Avg response (24h)</span>
        <strong>${escapeHtml(api.avg_duration_ms || 0)} ms</strong>
      </article>
      <article class="admin-metric-card">
        <span>Audit events (24h)</span>
        <strong>${escapeHtml(data.auditLast24h?.count || 0)}</strong>
      </article>
      <div class="admin-metric-breakdown">
        <h3>Users by role</h3>
        <ul>${(data.usersByRole || []).map((row) => `<li><span>${escapeHtml(row.role)}</span><strong>${escapeHtml(row.count)}</strong></li>`).join('') || '<li>No data</li>'}</ul>
      </div>
      <div class="admin-metric-breakdown">
        <h3>Company verification</h3>
        <ul>${(data.companiesByVerification || []).map((row) => `<li><span>${escapeHtml(row.verification_status)}</span><strong>${escapeHtml(row.count)}</strong></li>`).join('') || '<li>No data</li>'}</ul>
      </div>
      <div class="admin-metric-breakdown">
        <h3>Post moderation</h3>
        <ul>${(data.postsByModeration || []).map((row) => `<li><span>${escapeHtml(row.moderation_status)}</span><strong>${escapeHtml(row.count)}</strong></li>`).join('') || '<li>No data</li>'}</ul>
      </div>
    `;
  }

  function renderStatusActionSelect(userId) {
    return `
      <select class="admin-status-select" data-user-status="${escapeHtml(userId)}" aria-label="Update user status">
        <option value="">Status</option>
        <option value="active">Active</option>
        <option value="paused">Pause</option>
        <option value="suspended">Suspended</option>
        <option value="deleted">Delete</option>
      </select>
    `;
  }

  function renderUsersTable(users = [], emptyMessage = 'No users found.') {
    const container = document.getElementById('adminUsersTable');
    if (!container) return;

    if (!users.length) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Rating</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((user) => {
            const displayName = getUserDisplayName(user);
            const avatarMarkup = user.avatar
              ? `<img src="${escapeHtml(getMediaUrl(user.avatar))}" alt="">`
              : escapeHtml(getInitials(user.firstName, user.lastName, displayName));
            return `
            <tr class="admin-user-row" data-user-id="${escapeHtml(user.id)}">
              <td>
                <div class="admin-user-cell">
                  <span class="admin-user-thumb ${user.avatar ? 'has-photo' : ''}">${avatarMarkup}</span>
                  <span class="admin-user-name-wrap">
                    <span>${escapeHtml(displayName)}</span>
                    ${user.verificationRequested ? '<span class="admin-verification-requested">verification requested</span>' : ''}
                  </span>
                </div>
              </td>
              <td>${escapeHtml(user.email)}</td>
              <td><span class="admin-pill">${escapeHtml(user.role)}</span></td>
              <td>
                <div class="admin-status-cell">
                  <span class="admin-pill status-${escapeHtml(user.status)}">${escapeHtml(user.status)}</span>
                  ${user.status === 'deleted' ? `<small class="admin-deleted-meta">${escapeHtml(formatDeletedPurgeLabel(user.updated_at))}</small>` : ''}
                </div>
              </td>
              <td>${escapeHtml(formatRatingLabel(user.averageRating, user.reviewCount))}</td>
              <td>${escapeHtml(formatDate(user.created_at))}</td>
              <td class="admin-actions">
                ${renderStatusActionSelect(user.id)}
                ${canForceDeleteUser(user) ? `<button type="button" class="admin-danger-btn admin-force-delete-btn" data-force-delete-user="${escapeHtml(user.id)}">Force delete</button>` : ''}
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  const adminUsersSearch = document.getElementById('adminUsersSearch');
  const adminUsersRoleFilter = document.getElementById('adminUsersRoleFilter');
  const adminUsersStatusFilter = document.getElementById('adminUsersStatusFilter');
  const adminUsersRatingFilter = document.getElementById('adminUsersRatingFilter');
  const adminUsersSort = document.getElementById('adminUsersSort');
  const adminUsersClearBtn = document.getElementById('adminUsersClearBtn');
  const adminUsersResultsMeta = document.getElementById('adminUsersResultsMeta');

  function getUsersFilterState() {
    return {
      search: adminUsersSearch?.value.trim().toLowerCase() || '',
      role: adminUsersRoleFilter?.value || '',
      status: adminUsersStatusFilter?.value || '',
      rating: adminUsersRatingFilter?.value || '',
      sort: adminUsersSort?.value || 'created_desc',
    };
  }

  function userMatchesSearch(user, search) {
    if (!search) return true;

    const haystack = [
      user.id,
      user.email,
      user.role,
      user.status,
      user.firstName,
      user.lastName,
      user.companyName,
      getUserDisplayName(user),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  }

  function compareUsers(a, b, sort) {
    const nameA = getUserDisplayName(a).toLowerCase();
    const nameB = getUserDisplayName(b).toLowerCase();
    const emailA = (a.email || '').toLowerCase();
    const emailB = (b.email || '').toLowerCase();
    const roleA = (a.role || '').toLowerCase();
    const roleB = (b.role || '').toLowerCase();
    const statusA = (a.status || '').toLowerCase();
    const statusB = (b.status || '').toLowerCase();
    const createdA = new Date(a.created_at || 0).getTime();
    const createdB = new Date(b.created_at || 0).getTime();

    switch (sort) {
      case 'created_asc':
        return createdA - createdB;
      case 'name_asc':
        return nameA.localeCompare(nameB);
      case 'name_desc':
        return nameB.localeCompare(nameA);
      case 'email_asc':
        return emailA.localeCompare(emailB);
      case 'email_desc':
        return emailB.localeCompare(emailA);
      case 'role_asc':
        return roleA.localeCompare(roleB) || nameA.localeCompare(nameB);
      case 'status_asc':
        return statusA.localeCompare(statusB) || nameA.localeCompare(nameB);
      case 'created_desc':
      default:
        return createdB - createdA;
    }
  }

  function filterAndSortUsers(users = []) {
    const filters = getUsersFilterState();
    return users
      .filter((user) => {
        if (filters.role && user.role !== filters.role) return false;
        if (filters.status && user.status !== filters.status) return false;
        if (!matchesRatingFilter(user.averageRating, user.reviewCount, filters.rating)) return false;
        return userMatchesSearch(user, filters.search);
      })
      .sort((a, b) => compareUsers(a, b, filters.sort));
  }

  function updateUsersResultsMeta(visibleCount, totalCount) {
    if (!adminUsersResultsMeta) return;

    if (!totalCount) {
      adminUsersResultsMeta.textContent = 'No users in the platform yet.';
      return;
    }

    if (visibleCount === totalCount) {
      adminUsersResultsMeta.textContent = `Showing ${totalCount} user${totalCount === 1 ? '' : 's'}.`;
      return;
    }

    adminUsersResultsMeta.textContent = `Showing ${visibleCount} of ${totalCount} users.`;
  }

  function applyUsersView() {
    const filteredUsers = filterAndSortUsers(cachedUsers);
    updateUsersResultsMeta(filteredUsers.length, cachedUsers.length);
    renderUsersTable(
      filteredUsers,
      cachedUsers.length ? 'No users match your search or filters.' : 'No users found.'
    );
  }

  function setCachedUsers(users = []) {
    cachedUsers = users;
    applyUsersView();
  }

  function clearUsersFilters() {
    if (adminUsersSearch) adminUsersSearch.value = '';
    if (adminUsersRoleFilter) adminUsersRoleFilter.value = '';
    if (adminUsersStatusFilter) adminUsersStatusFilter.value = '';
    if (adminUsersRatingFilter) adminUsersRatingFilter.value = '';
    if (adminUsersSort) adminUsersSort.value = 'created_desc';
    applyUsersView();
  }

  const adminUserModal = document.getElementById('adminUserModal');
  const adminUserForm = document.getElementById('adminUserForm');
  const adminUserPhotoInput = document.getElementById('adminUserPhotoInput');
  const adminUserAvatarPreview = document.getElementById('adminUserAvatarPreview');
  const adminUserWorkerFields = document.getElementById('adminUserWorkerFields');
  const adminUserCompanyField = document.getElementById('adminUserCompanyField');
  const adminUserPhotoHint = document.getElementById('adminUserPhotoHint');
  const adminUserAccountInfo = document.getElementById('adminUserAccountInfo');
  const adminUserInitialData = document.getElementById('adminUserInitialData');
  const adminUserVerificationField = document.getElementById('adminUserVerificationField');
  const adminUserVerificationInput = document.getElementById('adminUserVerificationInput');
  const adminUserVerificationPill = document.getElementById('adminUserVerificationPill');
  const adminUserQualificationsField = document.getElementById('adminUserQualificationsField');
  const adminUserQualificationsInput = document.getElementById('adminUserQualificationsInput');
  const adminUserBadgeColorField = document.getElementById('adminUserBadgeColorField');
  const adminUserBadgeColorInput = document.getElementById('adminUserBadgeColorInput');

  const WORKER_PROFILE_LABELS = {
    fullName: 'Full name',
    phone: 'Phone',
    city: 'City',
    postcode: 'Postcode',
    trades: 'Trades',
    tradeInterests: 'Trade interests',
    experience: 'Experience',
    certificates: 'Certificates',
    workingRadius: 'Working radius',
    availabilityStatus: 'Availability',
    expectedRate: 'Expected rate',
    bio: 'Bio',
    workLocations: 'Work locations',
    yearsExperience: 'Years of experience',
    languagePreference: 'Language preference',
    hasUkWorkPermit: 'UK work permit',
    nativeLanguage: 'Native language',
    englishLevel: 'English level',
    hasCar: 'Has car',
    qualifications: 'Qualifications',
    verificationStatus: 'Verification status',
    badgeColor: 'Badge colour',
    profileCreatedAt: 'Profile created',
    profileUpdatedAt: 'Profile updated',
  };

  const COMPANY_PROFILE_LABELS = {
    companyName: 'Company name',
    phone: 'Phone',
    city: 'City',
    postcode: 'Postcode',
    website: 'Website',
    headOffice: 'Head office',
    businessType: 'Business type',
    trades: 'Trades',
    description: 'Description',
    verificationStatus: 'Verification status',
    plan: 'Plan',
    profileCreatedAt: 'Profile created',
    profileUpdatedAt: 'Profile updated',
  };

  function formatDetailValue(value) {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return String(value);
  }

  function renderDetailList(container, entries = []) {
    if (!container) return;

    if (!entries.length) {
      container.innerHTML = '<p class="admin-detail-empty">No profile data on file.</p>';
      return;
    }

    container.innerHTML = entries.map(([label, value]) => {
      const displayValue = /registered|updated|created/i.test(label)
        ? formatDate(value)
        : formatDetailValue(value);

      return `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(displayValue)}</dd>
        </div>
      `;
    }).join('');
  }

  function renderUserReadonlySections(user) {
    renderDetailList(adminUserAccountInfo, [
      ['User ID', user.id],
      ['Email', user.email],
      ['Role', user.role],
      ['Status', user.status],
      ['Registered', user.created_at],
      ['Last updated', user.updated_at],
    ]);

    const profile = user.profile;
    if (!profile) {
      if (adminUserInitialData) {
        adminUserInitialData.innerHTML = '<p class="admin-detail-empty">No profile data on file.</p>';
      }
      return;
    }

    const labels = profile.type === 'company' ? COMPANY_PROFILE_LABELS : WORKER_PROFILE_LABELS;
    const entries = Object.entries(labels).map(([key, label]) => [label, profile[key]]);
    renderDetailList(adminUserInitialData, entries);
  }

  function closeUserModal() {
    adminUserModal.hidden = true;
    selectedUserId = null;
    selectedUserRole = null;
    adminUserForm?.reset();
    if (adminUserPhotoInput) adminUserPhotoInput.value = '';
  }

  function configureUserModalFields(user) {
    const isWorker = user.role === 'worker';
    const isCompany = user.role === 'company';
    const supportsPhoto = isWorker || isCompany;

    if (adminUserWorkerFields) {
      adminUserWorkerFields.hidden = !isWorker;
    }
    if (adminUserCompanyField) {
      adminUserCompanyField.hidden = !isCompany;
    }
    if (adminUserVerificationField) {
      adminUserVerificationField.hidden = !isWorker;
    }
    if (adminUserVerificationPill) {
      adminUserVerificationPill.hidden = !isWorker;
    }
    if (adminUserQualificationsField) {
      adminUserQualificationsField.hidden = !isWorker;
    }
    if (adminUserBadgeColorField) {
      adminUserBadgeColorField.hidden = !isWorker;
    }
    if (adminUserPhotoHint) {
      adminUserPhotoHint.textContent = supportsPhoto
        ? 'JPG or PNG, max 5 MB'
        : 'Avatar upload is not available for this account type.';
    }
    if (adminUserPhotoInput) {
      adminUserPhotoInput.disabled = !supportsPhoto;
    }
    const uploadLabel = adminUserModal?.querySelector('.admin-upload-btn');
    if (uploadLabel) {
      uploadLabel.style.display = supportsPhoto ? 'inline-flex' : 'none';
    }
  }

  async function openUserModal(userId) {
    const data = await apiRequest(`/api/admin/users/${userId}`);
    const user = data.user;
    selectedUserId = user.id;
    selectedUserRole = user.role;

    document.getElementById('adminUserId').value = user.id;
    document.getElementById('adminUserFirstName').value = user.firstName || '';
    document.getElementById('adminUserLastName').value = user.lastName || '';
    document.getElementById('adminUserCompanyName').value = user.companyName || '';
    document.getElementById('adminUserEmailInput').value = user.email || '';
    document.getElementById('adminUserRolePill').textContent = user.role;
    document.getElementById('adminUserStatusPill').textContent = user.status;
    document.getElementById('adminUserStatusPill').className = `admin-pill status-${user.status}`;
    document.getElementById('adminUserModalTitle').textContent = getUserDisplayName(user);

    if (user.role === 'worker') {
      const verificationStatus = user.verificationStatus || user.profile?.verificationStatus || 'pending';
      const qualifications = Array.isArray(user.qualifications)
        ? user.qualifications.join(', ')
        : (user.profile?.qualifications || '');
      const badgeColor = user.badgeColor || user.profile?.badgeColor || 'green';
      if (adminUserVerificationInput) adminUserVerificationInput.value = verificationStatus;
      if (adminUserQualificationsInput) adminUserQualificationsInput.value = qualifications;
      if (adminUserBadgeColorInput) adminUserBadgeColorInput.value = badgeColor;
      if (adminUserVerificationPill) {
        adminUserVerificationPill.textContent = verificationStatus;
        adminUserVerificationPill.className = `admin-pill verify-${verificationStatus}`;
      }
    }

    configureUserModalFields(user);
    renderUserReadonlySections(user);
    renderAvatarPreview(
      adminUserAvatarPreview,
      document.getElementById('adminUserAvatarInitials'),
      user.avatar,
      user.firstName,
      user.lastName,
      user.email
    );

    adminUserModal.hidden = false;
  }

  async function saveUserDetails(event) {
    event.preventDefault();
    if (!selectedUserId) return;

    const saveBtn = document.getElementById('adminUserSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const payload = {
        email: document.getElementById('adminUserEmailInput').value.trim(),
      };

      if (selectedUserRole === 'worker') {
        payload.firstName = document.getElementById('adminUserFirstName').value.trim();
        payload.lastName = document.getElementById('adminUserLastName').value.trim();
      }

      if (selectedUserRole === 'company') {
        payload.companyName = document.getElementById('adminUserCompanyName').value.trim();
      }

      const photoFile = adminUserPhotoInput?.files?.[0];
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        const uploadResult = await apiUpload(`/api/admin/users/${selectedUserId}/photo`, formData);
        renderAvatarPreview(
          adminUserAvatarPreview,
          document.getElementById('adminUserAvatarInitials'),
          uploadResult.avatar,
          payload.firstName,
          payload.lastName,
          payload.email
        );
        if (adminUserPhotoInput) adminUserPhotoInput.value = '';
      }

      await apiRequest(`/api/admin/users/${selectedUserId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (selectedUserRole === 'worker' && adminUserVerificationInput) {
        await apiRequest(`/api/admin/workers/${selectedUserId}/verify`, {
          method: 'PATCH',
          body: JSON.stringify({
            verificationStatus: adminUserVerificationInput.value,
            qualifications: adminUserQualificationsInput?.value.trim() || '',
            badgeColor: adminUserBadgeColorInput?.value || 'green',
          }),
        });
      }

      showAlert('User updated successfully.', 'success');
      const refreshed = await apiRequest(`/api/admin/users/${selectedUserId}`);
      renderUserReadonlySections(refreshed.user);
      document.getElementById('adminUserFirstName').value = refreshed.user.firstName || '';
      document.getElementById('adminUserLastName').value = refreshed.user.lastName || '';
      document.getElementById('adminUserCompanyName').value = refreshed.user.companyName || '';
      document.getElementById('adminUserEmailInput').value = refreshed.user.email || '';
      document.getElementById('adminUserModalTitle').textContent = getUserDisplayName(refreshed.user);
      if (refreshed.user.role === 'worker' && adminUserVerificationInput) {
        const verificationStatus = refreshed.user.verificationStatus || refreshed.user.profile?.verificationStatus || 'pending';
        const qualifications = Array.isArray(refreshed.user.qualifications)
          ? refreshed.user.qualifications.join(', ')
          : (refreshed.user.profile?.qualifications || '');
        const badgeColor = refreshed.user.badgeColor || refreshed.user.profile?.badgeColor || 'green';
        adminUserVerificationInput.value = verificationStatus;
        if (adminUserQualificationsInput) adminUserQualificationsInput.value = qualifications;
        if (adminUserBadgeColorInput) adminUserBadgeColorInput.value = badgeColor;
        if (adminUserVerificationPill) {
          adminUserVerificationPill.textContent = verificationStatus;
          adminUserVerificationPill.className = `admin-pill verify-${verificationStatus}`;
        }
      }
      renderAvatarPreview(
        adminUserAvatarPreview,
        document.getElementById('adminUserAvatarInitials'),
        refreshed.user.avatar,
        refreshed.user.firstName,
        refreshed.user.lastName,
        refreshed.user.email
      );
      setCachedUsers((await apiRequest('/api/admin/users')).users);
    } catch (error) {
      showAlert(error.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  }

  function getCompanyInitials(companyName = '?') {
    const parts = companyName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  function getPlanStateLabel(planState) {
    const labels = {
      free: 'Free',
      active: 'Active',
      expiring_soon: 'Expiring soon',
      expired: 'Expired',
    };
    return labels[planState] || planState;
  }

  function renderCompaniesTable(companies = [], emptyMessage = 'No companies found.') {
    const container = document.getElementById('adminCompaniesTable');
    if (!container) return;

    if (!companies.length) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = `
      <table class="admin-table admin-companies-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Email</th>
            <th>Plan</th>
            <th>Purchased</th>
            <th>Expires</th>
            <th>Plan status</th>
            <th>Verification</th>
            <th>Account</th>
            <th>Rating</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${companies.map((company) => {
            const logoMarkup = company.logo
              ? `<img src="${escapeHtml(getMediaUrl(company.logo))}" alt="">`
              : escapeHtml(getCompanyInitials(company.company_name));
            const canRemind = company.plan !== 'free'
              && company.expiresAt
              && company.planState !== 'expired';
            const isPaused = company.user_status === 'paused';
            const canExtend = company.plan !== 'free';
            return `
            <tr class="admin-company-row" data-company-id="${escapeHtml(company.user_id)}" data-company-row="${escapeHtml(company.user_id)}">
              <td>
                <div class="admin-user-cell">
                  <span class="admin-user-thumb ${company.logo ? 'has-photo' : ''}">${logoMarkup}</span>
                  <span>${escapeHtml(company.company_name)}</span>
                </div>
              </td>
              <td>${escapeHtml(company.email)}</td>
              <td><span class="admin-pill">${escapeHtml(company.plan || 'free')}</span></td>
              <td>${escapeHtml(formatBillingDate(company.purchasedAt))}</td>
              <td>${escapeHtml(formatBillingDate(company.expiresAt))}</td>
              <td><span class="admin-pill plan-${escapeHtml(company.planState || 'free')}">${escapeHtml(getPlanStateLabel(company.planState || 'free'))}</span></td>
              <td><span class="admin-pill verify-${escapeHtml(company.verification_status)}">${escapeHtml(company.verification_status)}</span></td>
              <td><span class="admin-pill status-${escapeHtml(company.user_status)}">${escapeHtml(company.user_status)}</span></td>
              <td>${escapeHtml(formatRatingLabel(company.average_rating, company.review_count))}</td>
              <td class="admin-billing-actions">
                <div class="admin-billing-plan-edit">
                  <select data-billing-plan-select="${escapeHtml(company.user_id)}" aria-label="Change plan for ${escapeHtml(company.company_name)}">
                    <option value="free" ${company.plan === 'free' ? 'selected' : ''}>Free</option>
                    <option value="pro" ${company.plan === 'pro' ? 'selected' : ''}>Pro</option>
                    <option value="ultra" ${company.plan === 'ultra' ? 'selected' : ''}>Ultra</option>
                  </select>
                  <button type="button" data-billing-update-plan="${escapeHtml(company.user_id)}">
                    Update plan
                  </button>
                </div>
                <button
                  type="button"
                  data-billing-add-month="${escapeHtml(company.user_id)}"
                  ${canExtend ? '' : 'disabled'}
                >
                  Add extra Month
                </button>
                <button
                  type="button"
                  data-billing-remind="${escapeHtml(company.user_id)}"
                  ${canRemind ? '' : 'disabled'}
                >
                  Remind expiry
                </button>
                <button
                  type="button"
                  class="admin-danger-btn"
                  data-billing-pause="${escapeHtml(company.user_id)}"
                  ${isPaused ? 'disabled' : ''}
                >
                  Pause account
                </button>
                <button
                  type="button"
                  class="admin-danger-btn"
                  data-billing-delete-company="${escapeHtml(company.user_id)}"
                >
                  Delete this company
                </button>
                <select data-company-verify="${escapeHtml(company.user_id)}" aria-label="Update verification">
                  <option value="">Verification</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                ${renderStatusActionSelect(company.user_id)}
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  const adminCompaniesSearch = document.getElementById('adminCompaniesSearch');
  const adminCompaniesPlanFilter = document.getElementById('adminCompaniesPlanFilter');
  const adminCompaniesVerificationFilter = document.getElementById('adminCompaniesVerificationFilter');
  const adminCompaniesStatusFilter = document.getElementById('adminCompaniesStatusFilter');
  const adminCompaniesRatingFilter = document.getElementById('adminCompaniesRatingFilter');
  const adminCompaniesSort = document.getElementById('adminCompaniesSort');
  const adminCompaniesExpiringBtn = document.getElementById('adminCompaniesExpiringBtn');
  const adminCompaniesClearBtn = document.getElementById('adminCompaniesClearBtn');
  const adminCompaniesResultsMeta = document.getElementById('adminCompaniesResultsMeta');

  function getCompaniesFilterState() {
    return {
      search: adminCompaniesSearch?.value.trim().toLowerCase() || '',
      plan: adminCompaniesPlanFilter?.value || '',
      expiringOnly: showCompaniesExpiringOnly,
      verification: adminCompaniesVerificationFilter?.value || '',
      status: adminCompaniesStatusFilter?.value || '',
      rating: adminCompaniesRatingFilter?.value || '',
      sort: adminCompaniesSort?.value || 'created_desc',
    };
  }

  function companyMatchesSearch(company, search) {
    if (!search) return true;

    const haystack = [
      company.user_id,
      company.company_name,
      company.email,
      company.city,
      company.plan,
      company.planState,
      company.verification_status,
      company.user_status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  }

  function compareCompanies(a, b, sort) {
    const nameA = (a.company_name || '').toLowerCase();
    const nameB = (b.company_name || '').toLowerCase();
    const emailA = (a.email || '').toLowerCase();
    const emailB = (b.email || '').toLowerCase();
    const cityA = (a.city || '').toLowerCase();
    const cityB = (b.city || '').toLowerCase();
    const verificationA = (a.verification_status || '').toLowerCase();
    const verificationB = (b.verification_status || '').toLowerCase();
    const statusA = (a.user_status || '').toLowerCase();
    const statusB = (b.user_status || '').toLowerCase();
    const createdA = new Date(a.created_at || 0).getTime();
    const createdB = new Date(b.created_at || 0).getTime();

    switch (sort) {
      case 'created_asc':
        return createdA - createdB;
      case 'name_asc':
        return nameA.localeCompare(nameB);
      case 'name_desc':
        return nameB.localeCompare(nameA);
      case 'email_asc':
        return emailA.localeCompare(emailB);
      case 'email_desc':
        return emailB.localeCompare(emailA);
      case 'city_asc':
        return cityA.localeCompare(cityB) || nameA.localeCompare(nameB);
      case 'verification_asc':
        return verificationA.localeCompare(verificationB) || nameA.localeCompare(nameB);
      case 'status_asc':
        return statusA.localeCompare(statusB) || nameA.localeCompare(nameB);
      case 'created_desc':
      default:
        return createdB - createdA;
    }
  }

  function filterAndSortCompanies(companies = []) {
    const filters = getCompaniesFilterState();
    return companies
      .filter((company) => {
        if (filters.plan && company.plan !== filters.plan) return false;
        if (filters.expiringOnly && company.planState !== 'expiring_soon') return false;
        if (filters.verification && company.verification_status !== filters.verification) return false;
        if (filters.status && company.user_status !== filters.status) return false;
        if (!matchesRatingFilter(company.average_rating, company.review_count, filters.rating)) return false;
        return companyMatchesSearch(company, filters.search);
      })
      .sort((a, b) => compareCompanies(a, b, filters.sort));
  }

  function updateCompaniesResultsMeta(visibleCount, totalCount) {
    if (!adminCompaniesResultsMeta) return;

    if (!totalCount) {
      adminCompaniesResultsMeta.textContent = 'No company accounts yet.';
      return;
    }

    if (visibleCount === totalCount) {
      adminCompaniesResultsMeta.textContent = `Showing ${totalCount} compan${totalCount === 1 ? 'y' : 'ies'}.`;
      return;
    }

    adminCompaniesResultsMeta.textContent = `Showing ${visibleCount} of ${totalCount} companies.`;
  }

  function applyCompaniesView() {
    const filteredCompanies = filterAndSortCompanies(cachedCompanies);
    updateCompaniesResultsMeta(filteredCompanies.length, cachedCompanies.length);
    renderCompaniesTable(
      filteredCompanies,
      cachedCompanies.length ? 'No companies match your search or filters.' : 'No companies found.'
    );
  }

  function setCachedCompanies(companies = []) {
    cachedCompanies = companies;
    applyCompaniesView();
  }

  function clearCompaniesFilters() {
    if (adminCompaniesSearch) adminCompaniesSearch.value = '';
    if (adminCompaniesPlanFilter) adminCompaniesPlanFilter.value = '';
    if (adminCompaniesVerificationFilter) adminCompaniesVerificationFilter.value = '';
    if (adminCompaniesStatusFilter) adminCompaniesStatusFilter.value = '';
    if (adminCompaniesRatingFilter) adminCompaniesRatingFilter.value = '';
    if (adminCompaniesSort) adminCompaniesSort.value = 'created_desc';
    showCompaniesExpiringOnly = false;
    if (adminCompaniesExpiringBtn) {
      adminCompaniesExpiringBtn.classList.remove('is-active');
      adminCompaniesExpiringBtn.setAttribute('aria-pressed', 'false');
    }
    applyCompaniesView();
  }

  const adminCompanyModal = document.getElementById('adminCompanyModal');
  const adminCompanyForm = document.getElementById('adminCompanyForm');
  const adminCompanyLogoInput = document.getElementById('adminCompanyLogoInput');
  const adminCompanyLogoPreview = document.getElementById('adminCompanyLogoPreview');
  const adminCompanyAccountInfo = document.getElementById('adminCompanyAccountInfo');
  const adminCompanyInitialData = document.getElementById('adminCompanyInitialData');
  const adminCompanyHistoryList = document.getElementById('adminCompanyHistoryList');
  const adminCompanyStatusModal = document.getElementById('adminCompanyStatusModal');
  const adminForceDeleteUserModal = document.getElementById('adminForceDeleteUserModal');
  const adminForceDeleteUserForm = document.getElementById('adminForceDeleteUserForm');
  const adminForceDeleteUserSummary = document.getElementById('adminForceDeleteUserSummary');
  const adminForceDeleteUserConfirmInput = document.getElementById('adminForceDeleteUserConfirmInput');
  const adminForceDeleteUserConfirmBtn = document.getElementById('adminForceDeleteUserConfirmBtn');
  let pendingForceDeleteUser = null;
  const adminCompanyStatusForm = document.getElementById('adminCompanyStatusForm');
  const adminCompanyAddEventBtn = document.getElementById('adminCompanyAddEventBtn');
  const adminCompanyStatusModalTitle = document.getElementById('adminCompanyStatusModalTitle');
  const adminCompanyStatusConfirmBtn = document.getElementById('adminCompanyStatusConfirmBtn');

  function renderCompanyAccountHistory(history = []) {
    if (!adminCompanyHistoryList) return;

    if (!history.length) {
      adminCompanyHistoryList.innerHTML = '<p class="admin-detail-empty">No account history yet.</p>';
      return;
    }

    adminCompanyHistoryList.innerHTML = history.map((entry) => `
      <article class="admin-history-item">
        <p>${escapeHtml(formatCompanyHistoryEntry(entry))}</p>
      </article>
    `).join('');
  }

  function isCompanyAccount(userId) {
    if (cachedCompanies.some((company) => String(company.user_id) === String(userId))) {
      return true;
    }
    const user = cachedUsers.find((item) => String(item.id) === String(userId));
    return user?.role === 'company';
  }

  function resetPendingCompanyStatusSelect() {
    if (pendingCompanyStatusChange?.select) {
      pendingCompanyStatusChange.select.value = '';
    }
  }

  function resetCompanyStatusReasonModalCopy() {
    if (adminCompanyStatusModalTitle) {
      adminCompanyStatusModalTitle.textContent = 'Confirm status change';
    }
    if (adminCompanyStatusConfirmBtn) {
      adminCompanyStatusConfirmBtn.textContent = 'Confirm action';
      adminCompanyStatusConfirmBtn.classList.remove('admin-danger-btn');
      adminCompanyStatusConfirmBtn.classList.add('admin-primary-btn');
    }
    const reasonInput = document.getElementById('adminCompanyStatusReason');
    if (reasonInput) {
      reasonInput.placeholder = 'Explain why you are taking this action';
    }
    const passwordField = document.getElementById('adminCompanyStatusPasswordField');
    const passwordInput = document.getElementById('adminCompanyStatusPassword');
    if (passwordField) {
      passwordField.hidden = true;
    }
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.required = false;
    }
  }

  function closeForceDeleteUserModal() {
    if (!adminForceDeleteUserModal) return;
    adminForceDeleteUserModal.hidden = true;
    pendingForceDeleteUser = null;
    adminForceDeleteUserForm?.reset();
    if (adminForceDeleteUserConfirmBtn) {
      adminForceDeleteUserConfirmBtn.disabled = false;
      adminForceDeleteUserConfirmBtn.textContent = 'Force delete';
    }
  }

  function openForceDeleteUserModal(userId) {
    const user = cachedUsers.find((item) => String(item.id) === String(userId));
    if (!user || !canForceDeleteUser(user)) {
      showAlert('This account cannot be force deleted.');
      return;
    }

    pendingForceDeleteUser = user;
    if (adminForceDeleteUserSummary) {
      adminForceDeleteUserSummary.textContent = `You are about to permanently delete ${getUserDisplayName(user)} (${user.email}). This action cannot be undone.`;
    }
    if (adminForceDeleteUserConfirmInput) {
      adminForceDeleteUserConfirmInput.value = '';
    }
    adminForceDeleteUserModal.hidden = false;
    adminForceDeleteUserConfirmInput?.focus();
  }

  async function submitForceDeleteUser(event) {
    event.preventDefault();
    if (!pendingForceDeleteUser) return;

    const confirmText = adminForceDeleteUserConfirmInput?.value.trim() || '';
    if (confirmText !== 'delete') {
      showAlert('Type delete to confirm permanent deletion.');
      return;
    }

    adminForceDeleteUserConfirmBtn.disabled = true;
    adminForceDeleteUserConfirmBtn.textContent = 'Deleting...';

    try {
      await apiRequest(`/api/admin/users/${pendingForceDeleteUser.id}/force-delete`, {
        method: 'POST',
        body: JSON.stringify({ confirmText: 'delete' }),
      });
      showAlert(`${getUserDisplayName(pendingForceDeleteUser)} was permanently deleted.`, 'success');
      closeForceDeleteUserModal();
      setCachedUsers((await apiRequest('/api/admin/users')).users);
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (adminForceDeleteUserConfirmBtn) {
        adminForceDeleteUserConfirmBtn.disabled = false;
        adminForceDeleteUserConfirmBtn.textContent = 'Force delete';
      }
    }
  }

  function closeCompanyStatusReasonModal() {
    if (!adminCompanyStatusModal) return;
    adminCompanyStatusModal.hidden = true;
    resetPendingCompanyStatusSelect();
    if (pendingCompanyStatusChange?.button) {
      pendingCompanyStatusChange.button.disabled = false;
    }
    pendingCompanyStatusChange = null;
    adminCompanyStatusForm?.reset();
    resetCompanyStatusReasonModalCopy();
  }

  function openBillingActionReasonModal({
    userId,
    billingAction,
    title,
    summary,
    confirmLabel,
    metadata = {},
    button = null,
    requirePassword = false,
    confirmDanger = false,
  }) {
    const dateInput = document.getElementById('adminCompanyStatusDate');
    const summaryEl = document.getElementById('adminCompanyStatusSummary');
    const reasonInput = document.getElementById('adminCompanyStatusReason');
    const passwordField = document.getElementById('adminCompanyStatusPasswordField');
    const passwordInput = document.getElementById('adminCompanyStatusPassword');

    pendingCompanyStatusChange = {
      userId,
      source: 'billing_action',
      billingAction,
      metadata,
      button,
      requirePassword,
    };

    resetCompanyStatusReasonModalCopy();

    if (adminCompanyStatusModalTitle) {
      adminCompanyStatusModalTitle.textContent = title;
    }
    if (adminCompanyStatusConfirmBtn) {
      adminCompanyStatusConfirmBtn.textContent = confirmLabel;
      if (confirmDanger) {
        adminCompanyStatusConfirmBtn.classList.remove('admin-primary-btn');
        adminCompanyStatusConfirmBtn.classList.add('admin-danger-btn');
      }
    }
    if (dateInput) {
      dateInput.value = new Date().toLocaleDateString('en-GB');
    }
    if (summaryEl) {
      summaryEl.textContent = summary;
    }
    if (reasonInput) {
      reasonInput.value = '';
      reasonInput.placeholder = 'Explain why you are taking this action';
    }
    if (passwordField) {
      passwordField.hidden = !requirePassword;
    }
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.required = requirePassword;
    }

    if (button) {
      button.disabled = true;
    }

    adminCompanyStatusModal.hidden = false;
    (requirePassword ? passwordInput : reasonInput)?.focus();
  }

  function openCompanyStatusReasonModal(status, userId) {
    const dateInput = document.getElementById('adminCompanyStatusDate');
    const summary = document.getElementById('adminCompanyStatusSummary');
    const reasonInput = document.getElementById('adminCompanyStatusReason');

    resetCompanyStatusReasonModalCopy();

    if (dateInput) {
      dateInput.value = new Date().toLocaleDateString('en-GB');
    }
    if (summary) {
      summary.textContent = `You are about to ${getCompanyStatusActionLabel(status)} company account #${userId}.`;
    }
    if (reasonInput) {
      reasonInput.value = '';
    }

    adminCompanyStatusModal.hidden = false;
    reasonInput?.focus();
  }

  function openManualCompanyEventModal(userId) {
    const dateInput = document.getElementById('adminCompanyStatusDate');
    const summary = document.getElementById('adminCompanyStatusSummary');
    const reasonInput = document.getElementById('adminCompanyStatusReason');

    pendingCompanyStatusChange = { userId, source: 'manual_event' };

    if (adminCompanyStatusModalTitle) {
      adminCompanyStatusModalTitle.textContent = 'Add account event';
    }
    if (adminCompanyStatusConfirmBtn) {
      adminCompanyStatusConfirmBtn.textContent = 'Save event';
    }
    if (dateInput) {
      dateInput.value = new Date().toLocaleDateString('en-GB');
    }
    if (summary) {
      summary.textContent = `Add a manual note to company account #${userId} history.`;
    }
    if (reasonInput) {
      reasonInput.value = '';
      reasonInput.placeholder = 'Describe the event or note';
    }

    adminCompanyStatusModal.hidden = false;
    reasonInput?.focus();
  }

  async function refreshOpenCompanyModalHistory(userId) {
    if (String(selectedCompanyId) !== String(userId) || adminCompanyModal?.hidden) {
      return;
    }

    const refreshed = await apiRequest(`/api/admin/companies/${userId}`);
    renderCompanyAccountHistory(refreshed.history || []);
    populateCompanyForm(refreshed.company);
  }

  async function submitCompanyStatusChange(event) {
    event.preventDefault();
    if (!pendingCompanyStatusChange) return;

    const reason = document.getElementById('adminCompanyStatusReason')?.value.trim() || '';
    if (reason.length < 3) {
      showAlert('Please enter a reason with at least 3 characters.');
      return;
    }

    const { userId, status, source, requirePassword } = pendingCompanyStatusChange;
    let adminPassword = '';

    if (requirePassword) {
      adminPassword = document.getElementById('adminCompanyStatusPassword')?.value || '';
      if (!adminPassword) {
        showAlert('Enter your administrator password to confirm.');
        return;
      }
    }

    if (status === 'deleted' && !window.confirm('Mark this company account as deleted?')) {
      return;
    }

    const confirmBtn = document.getElementById('adminCompanyStatusConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      if (source === 'manual_event') {
        const result = await apiRequest(`/api/admin/companies/${userId}/account-history`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        renderCompanyAccountHistory(result.history || []);
        showAlert('Account event added.', 'success');
      } else if (source === 'billing_action') {
        const { billingAction, metadata } = pendingCompanyStatusChange;

        if (billingAction === 'pause') {
          await apiRequest(`/api/admin/billing/${userId}/pause`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          showAlert('Company account paused.', 'success');
          setCachedCompanies((await apiRequest('/api/admin/companies')).companies);
        } else if (billingAction === 'update_plan') {
          const data = await apiRequest(`/api/admin/billing/${userId}/plan`, {
            method: 'PATCH',
            body: JSON.stringify({ planKey: metadata.planKey, reason }),
          });
          replaceCompanyBilling(userId, data.account);
          showAlert('Company plan updated.', 'success');
        } else if (billingAction === 'add_month') {
          const data = await apiRequest(`/api/admin/billing/${userId}/add-month`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          replaceCompanyBilling(userId, data.account);
          showAlert('One extra month added to the plan.', 'success');
        } else if (billingAction === 'remind_expiry') {
          await apiRequest(`/api/admin/billing/${userId}/remind-expiry`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          showAlert('Expiry reminder sent to company.', 'success');
        } else if (billingAction === 'delete_company') {
          await apiRequest(`/api/admin/companies/${userId}/delete`, {
            method: 'POST',
            body: JSON.stringify({ reason, adminPassword }),
          });
          if (String(selectedCompanyId) === String(userId)) {
            closeCompanyModal();
          }
          setCachedCompanies((await apiRequest('/api/admin/companies')).companies);
          showAlert('Company account deleted permanently.', 'success');
        }

        if (billingAction !== 'delete_company') {
          await refreshOpenCompanyModalHistory(userId);
        }
      } else {
        await apiRequest(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, reason }),
        });
        showAlert(`Account status updated to ${status}.`, 'success');

        if (activeSection === 'users') {
          setCachedUsers((await apiRequest('/api/admin/users')).users);
        } else if (activeSection === 'companies') {
          setCachedCompanies((await apiRequest('/api/admin/companies')).companies);
        }

        await refreshOpenCompanyModalHistory(userId);
      }

      closeCompanyStatusReasonModal();
    } catch (error) {
      showAlert(error.message);
      if (pendingCompanyStatusChange?.button) {
        pendingCompanyStatusChange.button.disabled = false;
      }
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
    }
  }

  function renderCompanyReadonlySections(company) {
    renderDetailList(adminCompanyAccountInfo, [
      ['Company ID', company.userId],
      ['Email', company.email],
      ['User status', company.userStatus],
      ['Plan', company.plan],
      ['Registered', company.userCreatedAt],
      ['Last updated', company.userUpdatedAt],
    ]);

    const profile = company.profile;
    if (!profile) {
      if (adminCompanyInitialData) {
        adminCompanyInitialData.innerHTML = '<p class="admin-detail-empty">No profile data on file.</p>';
      }
      return;
    }

    const entries = Object.entries(COMPANY_PROFILE_LABELS).map(([key, label]) => [label, profile[key]]);
    renderDetailList(adminCompanyInitialData, entries);
  }

  function renderCompanyLogoPreview(company) {
    if (!adminCompanyLogoPreview) return;
    if (company.logo) {
      adminCompanyLogoPreview.innerHTML = `<img src="${escapeHtml(getMediaUrl(company.logo))}" alt="Company logo">`;
      return;
    }
    adminCompanyLogoPreview.innerHTML = `<span id="adminCompanyLogoInitials">${escapeHtml(getCompanyInitials(company.companyName))}</span>`;
  }

  function populateCompanyForm(company) {
    document.getElementById('adminCompanyUserId').value = company.userId;
    document.getElementById('adminCompanyNameInput').value = company.companyName || '';
    document.getElementById('adminCompanyEmailInput').value = company.email || '';
    document.getElementById('adminCompanyPhoneInput').value = company.phone || '';
    document.getElementById('adminCompanyCityInput').value = company.city || '';
    document.getElementById('adminCompanyPostcodeInput').value = company.postcode || '';
    document.getElementById('adminCompanyWebsiteInput').value = company.website || '';
    document.getElementById('adminCompanyHeadOfficeInput').value = company.headOffice || '';
    document.getElementById('adminCompanyBusinessTypeInput').value = company.businessType || '';
    document.getElementById('adminCompanyVerificationInput').value = company.verificationStatus || 'pending';
    document.getElementById('adminCompanyPlanInput').value = company.plan || 'free';
    document.getElementById('adminCompanyTradesInput').value = (company.trades || []).join(', ');
    document.getElementById('adminCompanyDescriptionInput').value = company.description || '';
    document.getElementById('adminCompanyModalTitle').textContent = company.companyName || 'Company';
    document.getElementById('adminCompanyStatusPill').textContent = company.userStatus;
    document.getElementById('adminCompanyStatusPill').className = `admin-pill status-${company.userStatus}`;
    document.getElementById('adminCompanyVerificationPill').textContent = company.verificationStatus;
    document.getElementById('adminCompanyVerificationPill').className = `admin-pill verify-${company.verificationStatus}`;
  }

  function closeCompanyModal() {
    if (!adminCompanyModal) return;
    adminCompanyModal.hidden = true;
    selectedCompanyId = null;
    adminCompanyForm?.reset();
    if (adminCompanyLogoInput) adminCompanyLogoInput.value = '';
  }

  async function openCompanyModal(companyId) {
    const data = await apiRequest(`/api/admin/companies/${companyId}`);
    const company = data.company;
    selectedCompanyId = company.userId;

    populateCompanyForm(company);
    renderCompanyReadonlySections(company);
    renderCompanyAccountHistory(data.history || []);
    renderCompanyLogoPreview(company);
    adminCompanyModal.hidden = false;
  }

  async function saveCompanyDetails(event) {
    event.preventDefault();
    if (!selectedCompanyId) return;

    const saveBtn = document.getElementById('adminCompanySaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const tradesValue = document.getElementById('adminCompanyTradesInput').value.trim();
      const payload = {
        companyName: document.getElementById('adminCompanyNameInput').value.trim(),
        email: document.getElementById('adminCompanyEmailInput').value.trim(),
        phone: document.getElementById('adminCompanyPhoneInput').value.trim(),
        city: document.getElementById('adminCompanyCityInput').value.trim(),
        postcode: document.getElementById('adminCompanyPostcodeInput').value.trim(),
        website: document.getElementById('adminCompanyWebsiteInput').value.trim(),
        headOffice: document.getElementById('adminCompanyHeadOfficeInput').value.trim(),
        businessType: document.getElementById('adminCompanyBusinessTypeInput').value.trim(),
        description: document.getElementById('adminCompanyDescriptionInput').value.trim(),
        verificationStatus: document.getElementById('adminCompanyVerificationInput').value,
        trades: tradesValue
          ? tradesValue.split(',').map((trade) => trade.trim()).filter(Boolean)
          : [],
      };

      const logoFile = adminCompanyLogoInput?.files?.[0];
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadResult = await apiUpload(`/api/admin/companies/${selectedCompanyId}/logo`, formData);
        renderCompanyLogoPreview({ ...payload, logo: uploadResult.logo, companyName: payload.companyName });
        if (adminCompanyLogoInput) adminCompanyLogoInput.value = '';
      }

      const result = await apiRequest(`/api/admin/companies/${selectedCompanyId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      showAlert('Company updated successfully.', 'success');
      populateCompanyForm(result.company);
      renderCompanyReadonlySections(result.company);
      renderCompanyLogoPreview(result.company);
      setCachedCompanies((await apiRequest('/api/admin/companies')).companies);
    } catch (error) {
      showAlert(error.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  }

  function renderPostsTable(posts = []) {
    const container = document.getElementById('adminPostsTable');
    if (!container) return;

    if (!posts.length) {
      container.innerHTML = '<p class="admin-empty">No posts found.</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Author</th>
            <th>Caption</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map((post) => `
            <tr>
              <td>${escapeHtml(post.id)}</td>
              <td>${escapeHtml(post.author_name || post.author_email)}</td>
              <td class="admin-caption">${escapeHtml((post.caption || '').slice(0, 120))}${(post.caption || '').length > 120 ? '…' : ''}</td>
              <td>${escapeHtml(post.post_type)}</td>
              <td><span class="admin-pill mod-${escapeHtml(post.moderation_status || 'visible')}">${escapeHtml(post.moderation_status || 'visible')}</span></td>
              <td>${escapeHtml(formatDate(post.created_at))}</td>
              <td class="admin-actions">
                <select data-post-moderate="${escapeHtml(post.id)}" aria-label="Moderate post">
                  <option value="">Moderate</option>
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                  <option value="flagged">Flagged</option>
                </select>
                <button type="button" class="admin-danger-btn" data-post-delete="${escapeHtml(post.id)}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderApiLogsTable(logs = [], emptyMessage = 'No API logs yet.') {
    const container = document.getElementById('adminApiLogsTable');
    if (!container) return;

    if (!logs.length) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Method</th>
            <th>Path</th>
            <th>Status</th>
            <th>User</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map((log) => `
            <tr>
              <td>${escapeHtml(formatDate(log.created_at))}</td>
              <td>${escapeHtml(log.method)}</td>
              <td class="admin-path">${escapeHtml(log.path)}</td>
              <td><span class="admin-pill ${Number(log.status_code) >= 400 ? 'status-suspended' : 'status-active'}">${escapeHtml(log.status_code)}</span></td>
              <td>${escapeHtml(log.user_email || '—')}</td>
              <td>${escapeHtml(log.duration_ms)} ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const adminApiLogsProblemsBtn = document.getElementById('adminApiLogsProblemsBtn');
  const adminApiLogsOlderHours = document.getElementById('adminApiLogsOlderHours');
  const adminApiLogsDeleteOlderBtn = document.getElementById('adminApiLogsDeleteOlderBtn');
  const adminApiLogsCleanAllBtn = document.getElementById('adminApiLogsCleanAllBtn');
  const adminApiLogsResultsMeta = document.getElementById('adminApiLogsResultsMeta');

  function updateApiLogsResultsMeta(logs = []) {
    if (!adminApiLogsResultsMeta) return;
    const modeLabel = showApiLogsProblemsOnly ? 'problem logs' : 'API logs';
    adminApiLogsResultsMeta.textContent = logs.length
      ? `Showing ${logs.length} recent ${modeLabel}.`
      : `No ${modeLabel} to display.`;
  }

  async function loadApiLogsSection() {
    const query = showApiLogsProblemsOnly ? '?limit=150&problemsOnly=true' : '?limit=150';
    const data = await apiRequest(`/api/admin/api-logs${query}`);
    updateApiLogsResultsMeta(data.logs);
    renderApiLogsTable(
      data.logs,
      showApiLogsProblemsOnly ? 'No problem logs found.' : 'No API logs yet.'
    );
    return data;
  }

  function mergeBillingAccountIntoCompany(company, account) {
    if (!company || !account) return company;
    return {
      ...company,
      plan: account.plan,
      plan_purchased_at: account.purchasedAt,
      plan_expires_at: account.expiresAt,
      purchasedAt: account.purchasedAt,
      expiresAt: account.expiresAt,
      planState: account.planState,
      user_status: account.userStatus || company.user_status,
    };
  }

  function replaceCompanyBilling(companyId, account) {
    if (!account?.companyId) return;
    cachedCompanies = cachedCompanies.map((company) => (
      String(company.user_id) === String(companyId)
        ? mergeBillingAccountIntoCompany(company, account)
        : company
    ));
    applyCompaniesView();
  }

  async function sendBillingExpiryReminder(companyId, button) {
    openBillingActionReasonModal({
      userId: companyId,
      billingAction: 'remind_expiry',
      title: 'Send expiry reminder',
      summary: `You are about to send a plan expiry reminder to company account #${companyId}. Add a note for account history.`,
      confirmLabel: 'Send reminder',
      button,
    });
  }

  async function updateBillingPlan(companyId, button) {
    const row = button.closest('[data-company-row]');
    const select = row?.querySelector(`[data-billing-plan-select="${companyId}"]`);
    const planKey = select?.value;
    const company = cachedCompanies.find((item) => String(item.user_id) === String(companyId));

    if (!planKey) {
      showAlert('Select a plan first.');
      return;
    }

    if (company?.plan === planKey) {
      showAlert('Select a different plan first.');
      return;
    }

    openBillingActionReasonModal({
      userId: companyId,
      billingAction: 'update_plan',
      title: 'Update company plan',
      summary: `You are about to change company account #${companyId} from ${company?.plan || 'free'} to ${planKey}. Add a note for account history.`,
      confirmLabel: 'Update plan',
      metadata: { planKey },
      button,
    });
  }

  async function addBillingMonth(companyId, button) {
    openBillingActionReasonModal({
      userId: companyId,
      billingAction: 'add_month',
      title: 'Add extra month',
      summary: `You are about to extend the billing period for company account #${companyId} by one month. Add a note for account history.`,
      confirmLabel: 'Add extra month',
      button,
    });
  }

  async function pauseBillingAccount(companyId, button) {
    openBillingActionReasonModal({
      userId: companyId,
      billingAction: 'pause',
      title: 'Pause company account',
      summary: `You are about to pause company account #${companyId}. Add a note for account history.`,
      confirmLabel: 'Pause account',
      button,
    });
  }

  async function deleteCompanyAccount(companyId, button) {
    const company = cachedCompanies.find((item) => String(item.user_id) === String(companyId));
    openBillingActionReasonModal({
      userId: companyId,
      billingAction: 'delete_company',
      title: 'Delete company account',
      summary: `You are about to permanently delete ${company?.company_name || 'this company'} (#${companyId}). This removes the account and related data. Enter your administrator password to confirm.`,
      confirmLabel: 'Delete company',
      button,
      requirePassword: true,
      confirmDanger: true,
    });
  }

  function formatGbp(value) {
    return `£${Number(value || 0).toFixed(2)}`;
  }

  function renderMarketBenefitRow(value = '') {
    return `
      <div class="admin-market-benefit-row">
        <input type="text" data-market-benefit value="${escapeHtml(value)}" maxlength="300" placeholder="Plan benefit">
        <button type="button" data-market-remove-benefit aria-label="Remove benefit"><i class="bi bi-trash"></i></button>
      </div>
    `;
  }

  function updateMarketEffectivePrice(card) {
    const price = Number(card.querySelector('[data-market-price]')?.value || 0);
    const discount = Number(card.querySelector('[data-market-discount]')?.value || 0);
    const effective = price * (1 - Math.min(Math.max(discount, 0), 100) / 100);
    const target = card.querySelector('[data-market-effective]');
    if (target) {
      target.textContent = `Effective price: ${formatGbp(effective)} / month`;
    }
  }

  function renderMarketPlans(plans = []) {
    const grid = document.getElementById('adminMarketPlansGrid');
    const meta = document.getElementById('adminMarketMeta');
    if (!grid) return;

    if (!plans.length) {
      if (meta) meta.textContent = 'No access plans configured yet.';
      grid.innerHTML = '<p class="admin-empty">No access plans found.</p>';
      return;
    }

    if (meta) {
      meta.textContent = 'Edit monthly price, discount, and benefits for each company access plan.';
    }

    grid.innerHTML = plans.map((plan) => {
      const benefitsHtml = (plan.benefits || []).map((benefit) => renderMarketBenefitRow(benefit)).join('');
      return `
        <article class="admin-market-card" data-market-plan="${escapeHtml(plan.planKey)}">
          <div class="admin-market-card-header">
            <h3>${escapeHtml(plan.displayName)}</h3>
            <span class="admin-market-plan-badge" data-plan="${escapeHtml(plan.planKey)}">${escapeHtml(plan.planKey)}</span>
          </div>
          <label class="admin-market-field">
            <span>Monthly price (GBP)</span>
            <input type="number" data-market-price min="0" step="0.01" value="${Number(plan.priceGbp).toFixed(2)}">
          </label>
          <label class="admin-market-field">
            <span>Discount (%)</span>
            <input type="number" data-market-discount min="0" max="100" step="0.01" value="${Number(plan.discountPercent).toFixed(2)}">
          </label>
          <p class="admin-market-effective" data-market-effective>Effective price: ${formatGbp(plan.effectivePriceGbp)} / month</p>
          <div class="admin-market-benefits">
            <div class="admin-market-benefits-header">
              <span>Benefits</span>
              <button type="button" class="admin-secondary-btn" data-market-add-benefit>Add benefit</button>
            </div>
            <div class="admin-market-benefits-list" data-market-benefits-list>
              ${benefitsHtml}
            </div>
          </div>
          <div class="admin-market-card-actions">
            <button type="button" class="admin-primary-btn" data-market-save>Save plan</button>
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadMarketSection() {
    const data = await apiRequest('/api/admin/market/plans');
    renderMarketPlans(data.plans || []);
    if (activeMarketPanel === 'ads') {
      await loadMarketAdsSection();
    }
    return data;
  }

  function createEmptyMarketAdProduct(index = 1) {
    return {
      id: `product-${Date.now()}-${index}`,
      title: '',
      description: '',
      priceGbp: '',
      imageDataUrl: '',
      findMoreUrl: '',
    };
  }

  function createEmptyMarketAd() {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    return {
      id: `ad-${Date.now()}`,
      internalTitle: '',
      status: 'draft',
      startsAt: today.toISOString().slice(0, 10),
      endsAt: end.toISOString().slice(0, 10),
      allowOnTop: false,
      targetTrades: [],
      clientName: '',
      clientAddress: '',
      activityScope: '',
      isPaid: true,
      products: [createEmptyMarketAdProduct(1)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeMarketAdStatus(ad) {
    if (!ad || ad.status === 'paused' || ad.status === 'draft') {
      return ad?.status || 'draft';
    }
    const now = Date.now();
    const startsAt = ad.startsAt ? new Date(`${ad.startsAt}T00:00:00`).getTime() : null;
    const endsAt = ad.endsAt ? new Date(`${ad.endsAt}T23:59:59`).getTime() : null;
    if (endsAt && endsAt < now) return 'expired';
    if (startsAt && startsAt > now && ad.status === 'active') return 'scheduled';
    return ad.status || 'draft';
  }

  function getMarketAdStatusLabel(status) {
    return {
      draft: 'Draft',
      active: 'Active',
      paused: 'Paused',
      expired: 'Expired',
      scheduled: 'Scheduled',
    }[status] || status;
  }

  async function loadMarketAdsSection() {
    const data = await apiRequest('/api/admin/market/ads');
    cachedMarketAds = (data.ads || []).map((ad) => ({
      ...ad,
      status: normalizeMarketAdStatus(ad),
    }));
    renderMarketAdsTable();
    return cachedMarketAds;
  }

  function renderMarketAdsTable() {
    const container = document.getElementById('adminMarketAdsTable');
    const meta = document.getElementById('adminMarketAdsMeta');
    if (!container) return;

    if (meta) {
      meta.textContent = cachedMarketAds.length
        ? `Showing ${cachedMarketAds.length} marketplace ad${cachedMarketAds.length === 1 ? '' : 's'}.`
        : 'Create sponsored feed posts for workers.';
    }

    if (!cachedMarketAds.length) {
      container.innerHTML = '<p class="admin-empty">No marketplace ads yet. Click “Create ad post” to start.</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table admin-market-ads-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Client</th>
            <th>Status</th>
            <th>Products</th>
            <th>Target trades</th>
            <th>Lifetime</th>
            <th>Pinned</th>
            <th>Paid</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${cachedMarketAds.map((ad) => {
            const status = normalizeMarketAdStatus(ad);
            const tradeLabel = ad.targetTrades?.length
              ? `${ad.targetTrades.length} trade${ad.targetTrades.length === 1 ? '' : 's'}`
              : 'All trades';
            return `
              <tr>
                <td>${escapeHtml(ad.internalTitle || 'Untitled ad')}</td>
                <td>${escapeHtml(ad.clientName || '—')}</td>
                <td><span class="admin-pill status-${escapeHtml(status)}">${escapeHtml(getMarketAdStatusLabel(status))}</span></td>
                <td>${escapeHtml(String(ad.products?.length || 0))}</td>
                <td>${escapeHtml(tradeLabel)}</td>
                <td>${escapeHtml(formatBillingDate(`${ad.startsAt}T00:00:00`))} – ${escapeHtml(formatBillingDate(`${ad.endsAt}T23:59:59`))}</td>
                <td>${ad.allowOnTop ? 'Yes' : 'No'}</td>
                <td>${ad.isPaid ? 'Yes' : 'No'}</td>
                <td class="admin-billing-actions">
                  <button type="button" data-market-ad-edit="${escapeHtml(ad.id)}">Edit</button>
                  ${status === 'active'
                    ? `<button type="button" data-market-ad-pause="${escapeHtml(ad.id)}">Pause</button>`
                    : `<button type="button" data-market-ad-activate="${escapeHtml(ad.id)}">Activate</button>`}
                  <button type="button" class="admin-danger-btn" data-market-ad-delete="${escapeHtml(ad.id)}">Delete</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function setActiveMarketPanel(panel = 'plans') {
    activeMarketPanel = panel;
    document.querySelectorAll('[data-market-panel]').forEach((element) => {
      const isActive = element.dataset.marketPanel === panel;
      if (element.matches('.admin-market-subnav button')) {
        element.classList.toggle('active', isActive);
        element.setAttribute('aria-selected', isActive ? 'true' : 'false');
      } else if (element.classList.contains('admin-market-panel-view')) {
        element.classList.toggle('active', isActive);
        element.hidden = !isActive;
      }
    });

    if (panel === 'ads') {
      loadMarketAdsSection().catch((error) => showAlert(error.message));
    }
  }

  function showMarketAdsListView() {
    editingMarketAdId = null;
    editingMarketAdIsNew = false;
    marketAdPreviewSlide = 0;
    document.getElementById('adminMarketAdsListView')?.removeAttribute('hidden');
    document.getElementById('adminMarketAdsEditorView')?.setAttribute('hidden', '');
    renderMarketAdsTable();
  }

  function renderMarketAdProductEditor(product, index) {
    return `
      <article class="admin-market-ad-product-card" data-market-ad-product="${escapeHtml(product.id)}">
        <div class="admin-market-ad-product-card-head">
          <strong>Product ${index + 1}</strong>
          <button type="button" class="admin-secondary-btn" data-market-ad-remove-product="${escapeHtml(product.id)}">Remove</button>
        </div>
        <div class="admin-market-ad-product-image-row">
          <div class="admin-market-ad-product-thumb" data-market-ad-product-preview="${escapeHtml(product.id)}">
            ${product.imageUrl || product.imageDataUrl
              ? `<img src="${escapeHtml(getMediaUrl(product.imageUrl || product.imageDataUrl))}" data-uploaded-url="${escapeHtml(getMediaUrl(product.imageUrl || product.imageDataUrl))}" alt="">`
              : 'No image'}
          </div>
          <label class="admin-field">
            <span>Product image</span>
            <input type="file" accept="image/*" data-market-ad-product-image="${escapeHtml(product.id)}">
          </label>
        </div>
        <label class="admin-field">
          <span>Title</span>
          <input type="text" data-market-ad-product-title="${escapeHtml(product.id)}" value="${escapeHtml(product.title)}" maxlength="120" placeholder="Cable reel 25m">
        </label>
        <label class="admin-field">
          <span>Short description</span>
          <textarea rows="2" data-market-ad-product-description="${escapeHtml(product.id)}" maxlength="160" placeholder="Heavy-duty cable for site use">${escapeHtml(product.description)}</textarea>
        </label>
        <label class="admin-field">
          <span>Price (GBP)</span>
          <input type="number" min="0" step="0.01" data-market-ad-product-price="${escapeHtml(product.id)}" value="${escapeHtml(product.priceGbp)}" placeholder="19.99">
        </label>
        <label class="admin-field">
          <span>Find more URL</span>
          <input type="url" data-market-ad-product-link="${escapeHtml(product.id)}" value="${escapeHtml(product.findMoreUrl)}" placeholder="https://example.com/product">
        </label>
      </article>
    `;
  }

  function renderMarketAdTradeChips(trades = []) {
    const container = document.getElementById('adminMarketAdTradeChips');
    if (!container) return;
    if (!trades.length) {
      container.innerHTML = '<p class="admin-detail-empty">No trade targeting selected — ad will match all worker trade interests.</p>';
      return;
    }
    container.innerHTML = trades.map((trade) => `
      <span class="admin-market-trade-chip">
        ${escapeHtml(trade)}
        <button type="button" data-market-ad-remove-trade="${escapeHtml(trade)}" aria-label="Remove ${escapeHtml(trade)}">×</button>
      </span>
    `).join('');
  }

  function renderMarketAdPreview(ad, slideIndex = 0) {
    const container = document.getElementById('adminMarketAdPreview');
    if (!container) return;

    const products = (ad?.products || []).filter((product) => (
      product.title || product.description || product.priceGbp || product.imageUrl || product.imageDataUrl || product.findMoreUrl
    ));
    const safeSlide = products.length ? Math.min(slideIndex, products.length - 1) : 0;
    marketAdPreviewSlide = safeSlide;

    if (!products.length) {
      container.innerHTML = '<p class="admin-detail-empty">Add at least one product to preview the sponsored feed card.</p>';
      return;
    }

    const slidesHtml = products.map((product, index) => `
      <div class="admin-market-ad-preview-slide ${index === safeSlide ? 'active' : ''}" data-market-ad-preview-slide="${index}">
        ${product.imageUrl || product.imageDataUrl
          ? `<img src="${escapeHtml(getMediaUrl(product.imageUrl || product.imageDataUrl))}" alt="">`
          : '<div class="admin-market-ad-preview-slide-fallback">Image</div>'}
        <div>
          <h4>${escapeHtml(product.title || 'Product title')}</h4>
          <p>${escapeHtml(product.description || 'Short product description')}</p>
          <div class="admin-market-ad-preview-price">${escapeHtml(product.priceGbp ? formatGbp(product.priceGbp) : '£0.00')}</div>
          <a href="${escapeHtml(product.findMoreUrl || '#')}" class="admin-market-ad-preview-find-more" target="_blank" rel="noopener noreferrer">Find more</a>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <article class="admin-market-ad-preview-card">
        <div class="admin-market-ad-preview-header">
          <div>
            <strong>${escapeHtml(ad.clientName || 'Client name')}</strong>
            <small>Sponsored · ${escapeHtml(ad.activityScope || 'Marketplace ad')}</small>
          </div>
          <div class="admin-market-ad-preview-badges">
            <span class="admin-market-ad-preview-badge">Sponsored</span>
            ${ad.isPaid ? '<span class="admin-market-ad-preview-badge paid">Paid</span>' : ''}
            ${ad.allowOnTop ? '<span class="admin-market-ad-preview-badge pinned">Pinned</span>' : ''}
          </div>
        </div>
        <div class="admin-market-ad-preview-carousel">
          ${slidesHtml}
          ${products.length > 1 ? `
            <div class="admin-market-ad-preview-nav">
              <button type="button" data-market-ad-preview-prev aria-label="Previous product"><i class="bi bi-chevron-left"></i></button>
              <div class="admin-market-ad-preview-dots">
                ${products.map((_, index) => `<span class="${index === safeSlide ? 'active' : ''}"></span>`).join('')}
              </div>
              <button type="button" data-market-ad-preview-next aria-label="Next product"><i class="bi bi-chevron-right"></i></button>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }

  function openMarketAdEditor(adId = null) {
    const ad = adId
      ? cachedMarketAds.find((item) => String(item.id) === String(adId))
      : createEmptyMarketAd();

    if (!ad) {
      showAlert('Ad not found.');
      return;
    }

    editingMarketAdIsNew = !adId;
    editingMarketAdId = adId ? ad.id : null;
    marketAdPreviewSlide = 0;

    document.getElementById('adminMarketAdsListView')?.setAttribute('hidden', '');
    document.getElementById('adminMarketAdsEditorView')?.removeAttribute('hidden');

    const meta = document.getElementById('adminMarketAdsEditorMeta');
    if (meta) {
      meta.textContent = adId ? `Edit ad: ${ad.internalTitle || 'Untitled ad'}` : 'Create ad post';
    }

    document.getElementById('adminMarketAdInternalTitle').value = ad.internalTitle || '';
    document.getElementById('adminMarketAdStartsAt').value = ad.startsAt || '';
    document.getElementById('adminMarketAdEndsAt').value = ad.endsAt || '';
    document.getElementById('adminMarketAdAllowOnTop').checked = Boolean(ad.allowOnTop);
    document.getElementById('adminMarketAdClientName').value = ad.clientName || '';
    document.getElementById('adminMarketAdClientAddress').value = ad.clientAddress || '';
    document.getElementById('adminMarketAdActivityScope').value = ad.activityScope || '';
    document.getElementById('adminMarketAdIsPaid').checked = ad.isPaid !== false;
    document.getElementById('adminMarketAdTradeSearch').value = '';

    const productsList = document.getElementById('adminMarketAdProductsList');
    if (productsList) {
      productsList.innerHTML = (ad.products || [createEmptyMarketAdProduct()]).map((product, index) => (
        renderMarketAdProductEditor(product, index)
      )).join('');
    }

    renderMarketAdTradeChips(ad.targetTrades || []);
    renderMarketAdPreview(ad, 0);
  }

  function getMarketAdEditorState() {
    const products = Array.from(document.querySelectorAll('[data-market-ad-product]')).map((card) => {
      const productId = card.dataset.marketAdProduct;
      return {
        id: productId,
        title: card.querySelector(`[data-market-ad-product-title="${productId}"]`)?.value.trim() || '',
        description: card.querySelector(`[data-market-ad-product-description="${productId}"]`)?.value.trim() || '',
        priceGbp: card.querySelector(`[data-market-ad-product-price="${productId}"]`)?.value.trim() || '',
        imageUrl: (() => {
          const img = card.querySelector(`[data-market-ad-product-preview="${productId}"] img`);
          if (!img) return '';
          return img.dataset.uploadedUrl || getMediaUrl(img.getAttribute('src') || '');
        })(),
        findMoreUrl: card.querySelector(`[data-market-ad-product-link="${productId}"]`)?.value.trim() || '',
      };
    });

    const targetTrades = Array.from(document.querySelectorAll('[data-market-ad-remove-trade]'))
      .map((button) => button.dataset.marketAdRemoveTrade)
      .filter(Boolean);

    return {
      internalTitle: document.getElementById('adminMarketAdInternalTitle')?.value.trim() || '',
      startsAt: document.getElementById('adminMarketAdStartsAt')?.value || '',
      endsAt: document.getElementById('adminMarketAdEndsAt')?.value || '',
      allowOnTop: Boolean(document.getElementById('adminMarketAdAllowOnTop')?.checked),
      targetTrades,
      clientName: document.getElementById('adminMarketAdClientName')?.value.trim() || '',
      clientAddress: document.getElementById('adminMarketAdClientAddress')?.value.trim() || '',
      activityScope: document.getElementById('adminMarketAdActivityScope')?.value.trim() || '',
      isPaid: Boolean(document.getElementById('adminMarketAdIsPaid')?.checked),
      products,
    };
  }

  function validateMarketAdPayload(payload, { publishing = false } = {}) {
    if (!payload.internalTitle) {
      showAlert('Enter an internal title for this ad post.');
      return false;
    }
    if (!payload.clientName) {
      showAlert('Enter the client name.');
      return false;
    }
    if (!payload.startsAt || !payload.endsAt) {
      showAlert('Set both start and end dates.');
      return false;
    }
    if (new Date(`${payload.endsAt}T23:59:59`) < new Date(`${payload.startsAt}T00:00:00`)) {
      showAlert('End date must be on or after the start date.');
      return false;
    }
    if (!payload.products.length) {
      showAlert('Add at least one product.');
      return false;
    }
    if (payload.products.length > 3) {
      showAlert('Each ad post can contain up to 3 products.');
      return false;
    }

    for (const [index, product] of payload.products.entries()) {
      if (!product.title) {
        showAlert(`Enter a title for product ${index + 1}.`);
        return false;
      }
      if (!product.description) {
        showAlert(`Enter a short description for product ${index + 1}.`);
        return false;
      }
      if (product.priceGbp === '' || Number(product.priceGbp) < 0) {
        showAlert(`Enter a valid price for product ${index + 1}.`);
        return false;
      }
      if (!product.findMoreUrl) {
        showAlert(`Enter the external Find more link for product ${index + 1}.`);
        return false;
      }
      if (publishing && !product.imageUrl) {
        showAlert(`Upload an image for product ${index + 1} before publishing.`);
        return false;
      }
      if (product.imageUrl && product.imageUrl.startsWith('data:')) {
        showAlert(`Wait for product ${index + 1} image upload to finish before saving.`);
        return false;
      }
    }

    return true;
  }

  function buildMarketAdApiPayload(payload, status) {
    return {
      internalTitle: payload.internalTitle,
      status,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      allowOnTop: payload.allowOnTop,
      targetTrades: payload.targetTrades,
      clientName: payload.clientName,
      clientAddress: payload.clientAddress,
      activityScope: payload.activityScope,
      isPaid: payload.isPaid,
      products: payload.products.map((product) => ({
        title: product.title,
        description: product.description,
        priceGbp: Number(product.priceGbp),
        imageUrl: product.imageUrl || null,
        findMoreUrl: product.findMoreUrl,
      })),
    };
  }

  async function saveMarketAdToApi(status) {
    const payload = getMarketAdEditorState();
    const isPublishing = status === 'active';
    if (!validateMarketAdPayload(payload, { publishing: isPublishing })) {
      return null;
    }

    const body = buildMarketAdApiPayload(payload, status);
    if (editingMarketAdIsNew || !editingMarketAdId) {
      const data = await apiRequest('/api/admin/market/ads', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      editingMarketAdId = data.ad.id;
      editingMarketAdIsNew = false;
      return data.ad;
    }

    const data = await apiRequest(`/api/admin/market/ads/${editingMarketAdId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return data.ad;
  }

  async function saveMarketAdDraft() {
    const button = document.getElementById('adminMarketAdSaveDraftBtn');
    if (button) button.disabled = true;
    try {
      const ad = await saveMarketAdToApi('draft');
      if (!ad) return;
      await loadMarketAdsSection();
      renderMarketAdPreview(ad, marketAdPreviewSlide);
      showAlert('Ad draft saved.', 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function publishMarketAd(event) {
    event.preventDefault();
    const button = document.getElementById('adminMarketAdPublishBtn');
    if (button) button.disabled = true;
    try {
      const ad = await saveMarketAdToApi('active');
      if (!ad) return;
      await loadMarketAdsSection();
      showAlert('Ad published to the worker feed.', 'success');
      showMarketAdsListView();
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function deleteMarketAd(adId) {
    if (!window.confirm('Delete this marketplace ad?')) return;
    try {
      await apiRequest(`/api/admin/market/ads/${adId}`, { method: 'DELETE' });
      await loadMarketAdsSection();
      showAlert('Marketplace ad deleted.', 'success');
    } catch (error) {
      showAlert(error.message);
    }
  }

  async function setMarketAdStatus(adId, status) {
    try {
      await apiRequest(`/api/admin/market/ads/${adId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadMarketAdsSection();
      showAlert(`Ad marked as ${getMarketAdStatusLabel(status).toLowerCase()}.`, 'success');
    } catch (error) {
      showAlert(error.message);
    }
  }

  async function searchMarketAdTrades(query) {
    const results = document.getElementById('adminMarketAdTradeResults');
    if (!results) return;

    if (query.trim().length < 3) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }

    try {
      const data = await apiRequest(`/api/jobs/trades/search?q=${encodeURIComponent(query.trim())}`);
      const trades = data.trades || [];
      if (!trades.length) {
        results.hidden = false;
        results.innerHTML = '<p class="admin-empty" style="margin:0;padding:12px;">No trades found.</p>';
        return;
      }
      results.hidden = false;
      results.innerHTML = trades.map((trade) => `
        <button type="button" data-market-ad-add-trade="${escapeHtml(trade.name)}">${escapeHtml(trade.name)}</button>
      `).join('');
    } catch (error) {
      results.hidden = true;
      results.innerHTML = '';
    }
  }

  function addMarketAdTrade(tradeName) {
    const ad = getMarketAdEditorState();
    if (ad.targetTrades.includes(tradeName)) return;
    ad.targetTrades.push(tradeName);
    renderMarketAdTradeChips(ad.targetTrades);
    renderMarketAdPreview({ ...ad, products: ad.products }, marketAdPreviewSlide);
    document.getElementById('adminMarketAdTradeSearch').value = '';
    document.getElementById('adminMarketAdTradeResults').hidden = true;
  }

  function removeMarketAdTrade(tradeName) {
    const ad = getMarketAdEditorState();
    ad.targetTrades = ad.targetTrades.filter((trade) => trade !== tradeName);
    renderMarketAdTradeChips(ad.targetTrades);
    renderMarketAdPreview({ ...ad, products: ad.products }, marketAdPreviewSlide);
  }

  function addMarketAdProduct() {
    const productsList = document.getElementById('adminMarketAdProductsList');
    const currentCount = productsList?.querySelectorAll('[data-market-ad-product]').length || 0;
    if (currentCount >= 3) {
      showAlert('Each ad post can contain up to 3 products.');
      return;
    }
    const product = createEmptyMarketAdProduct(currentCount + 1);
    productsList?.insertAdjacentHTML('beforeend', renderMarketAdProductEditor(product, currentCount));
    renderMarketAdPreview(getMarketAdEditorState(), marketAdPreviewSlide);
  }

  function removeMarketAdProduct(productId) {
    const productsList = document.getElementById('adminMarketAdProductsList');
    const cards = productsList?.querySelectorAll('[data-market-ad-product]') || [];
    if (cards.length <= 1) {
      showAlert('Each ad post must keep at least one product.');
      return;
    }
    productsList?.querySelector(`[data-market-ad-product="${productId}"]`)?.remove();
    renderMarketAdPreview(getMarketAdEditorState(), 0);
  }

  async function compressMarketAdProductImageFile(file, maxWidth = 1200, quality = 0.82) {
    if (!file?.type?.startsWith('image/')) {
      return file;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = objectUrl;
      });
      const scale = image.width > maxWidth ? maxWidth / image.width : 1;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        return file;
      }
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
      });
      if (!blob) {
        return file;
      }
      return new File([blob], `product-${Date.now()}.jpg`, { type: 'image/jpeg' });
    } catch (error) {
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleMarketAdProductImage(productId, file) {
    if (!file) return;

    const preview = document.querySelector(`[data-market-ad-product-preview="${productId}"]`);
    if (preview) {
      preview.textContent = 'Uploading image...';
    }

    try {
      const uploadFile = await compressMarketAdProductImageFile(file);
      const formData = new FormData();
      formData.append('image', uploadFile);
      const data = await apiUpload('/api/admin/market/ads/product-image', formData);
      const imageUrl = getMediaUrl(data.imageUrl);
      if (preview) {
        preview.innerHTML = `<img src="${escapeHtml(imageUrl)}" data-uploaded-url="${escapeHtml(imageUrl)}" alt="">`;
      }
      renderMarketAdPreview(getMarketAdEditorState(), marketAdPreviewSlide);
    } catch (error) {
      if (preview) {
        preview.textContent = 'No image';
      }
      showAlert(error.message);
    }
  }

  function shiftMarketAdPreviewSlide(direction) {
    const ad = getMarketAdEditorState();
    const total = ad.products.length;
    if (total <= 1) return;
    marketAdPreviewSlide = (marketAdPreviewSlide + direction + total) % total;
    renderMarketAdPreview(ad, marketAdPreviewSlide);
  }

  function refreshMarketAdPreviewFromForm() {
    renderMarketAdPreview(getMarketAdEditorState(), marketAdPreviewSlide);
  }

  const adminSalesTermsBtn = document.getElementById('adminSalesTermsBtn');
  const adminSalesTermsModal = document.getElementById('adminSalesTermsModal');
  const adminSalesTermsEditor = document.getElementById('adminSalesTermsEditor');
  const adminSalesTermsMeta = document.getElementById('adminSalesTermsMeta');
  const adminSalesTermsSaveBtn = document.getElementById('adminSalesTermsSaveBtn');
  let cachedSalesTerms = null;

  function formatAdminDate(value) {
    if (!value) return 'Not published yet';
    return new Date(value).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function renderSalesTermsMeta(terms) {
    if (!adminSalesTermsMeta) return;
    if (!terms?.version) {
      adminSalesTermsMeta.textContent = 'No published version yet. Saving will create version 1.';
      return;
    }
    const byLine = terms.updatedByEmail ? ` · Updated by ${terms.updatedByEmail}` : '';
    adminSalesTermsMeta.textContent = `Version ${terms.version} · Last updated ${formatAdminDate(terms.updatedAt)}${byLine}`;
  }

  function openSalesTermsModal() {
    if (!adminSalesTermsModal || !adminSalesTermsEditor) return;
    adminSalesTermsEditor.innerHTML = cachedSalesTerms?.content || '';
    renderSalesTermsMeta(cachedSalesTerms);
    adminSalesTermsModal.hidden = false;
    adminSalesTermsEditor.focus();
  }

  function closeSalesTermsModal() {
    if (!adminSalesTermsModal) return;
    adminSalesTermsModal.hidden = true;
  }

  async function loadSalesTerms() {
    const data = await apiRequest('/api/admin/market/terms');
    cachedSalesTerms = data.terms || null;
    return cachedSalesTerms;
  }

  function applySalesTermsCommand(command) {
    if (!adminSalesTermsEditor) return;
    adminSalesTermsEditor.focus();
    document.execCommand(command, false, null);
  }

  function applySalesTermsBlock(tagName) {
    if (!adminSalesTermsEditor) return;
    adminSalesTermsEditor.focus();
    document.execCommand('formatBlock', false, tagName);
  }

  async function saveSalesTerms() {
    if (!adminSalesTermsEditor || !adminSalesTermsSaveBtn) return;

    const content = adminSalesTermsEditor.innerHTML.trim();
    const plainText = adminSalesTermsEditor.textContent.trim();
    if (!plainText) {
      showAlert('Write the sales plan terms before saving.');
      return;
    }

    adminSalesTermsSaveBtn.disabled = true;
    try {
      const data = await apiRequest('/api/admin/market/terms', {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      cachedSalesTerms = data.terms;
      renderSalesTermsMeta(cachedSalesTerms);
      showAlert(`Sales plan T&C saved as version ${data.terms.version}.`, 'success');
      closeSalesTermsModal();
    } catch (error) {
      showAlert(error.message);
    } finally {
      adminSalesTermsSaveBtn.disabled = false;
    }
  }

  async function saveMarketPlan(planKey, button) {
    const card = document.querySelector(`[data-market-plan="${planKey}"]`);
    if (!card) return;

    const priceGbp = Number(card.querySelector('[data-market-price]')?.value);
    const discountPercent = Number(card.querySelector('[data-market-discount]')?.value);
    const benefits = Array.from(card.querySelectorAll('[data-market-benefit]'))
      .map((input) => input.value.trim())
      .filter(Boolean);

    if (!Number.isFinite(priceGbp) || priceGbp < 0) {
      showAlert('Enter a valid monthly price.');
      return;
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      showAlert('Discount must be between 0 and 100.');
      return;
    }
    if (!benefits.length) {
      showAlert('Add at least one plan benefit.');
      return;
    }

    button.disabled = true;
    try {
      const data = await apiRequest(`/api/admin/market/plans/${planKey}`, {
        method: 'PATCH',
        body: JSON.stringify({ priceGbp, discountPercent, benefits }),
      });
      showAlert(`${data.plan.displayName} plan updated.`, 'success');
      const plans = (await apiRequest('/api/admin/market/plans')).plans || [];
      renderMarketPlans(plans);
    } catch (error) {
      showAlert(error.message);
    } finally {
      button.disabled = false;
    }
  }

  function renderAuditTable(trails = []) {
    const container = document.getElementById('adminAuditTable');
    if (!container) return;

    if (adminAuditResultsMeta) {
      adminAuditResultsMeta.textContent = trails.length
        ? `${trails.length} audit event(s) shown (latest first).`
        : 'No audit events yet.';
    }

    if (!trails.length) {
      container.innerHTML = '<p class="admin-empty">No audit events yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${trails.map((trail) => `
            <tr>
              <td>${escapeHtml(formatDate(trail.created_at))}</td>
              <td>${escapeHtml(trail.actor_email || 'System')}</td>
              <td>${escapeHtml(trail.action)}</td>
              <td>${escapeHtml(trail.entity_type)} #${escapeHtml(trail.entity_id || '—')}</td>
              <td class="admin-caption">${escapeHtml(JSON.stringify(trail.metadata || {}))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderAuditAutoDeleteSettings(settings = {}) {
    if (adminAuditAutoDeleteEnabled) {
      adminAuditAutoDeleteEnabled.checked = Boolean(settings.autoDeleteEnabled);
    }

    if (adminAuditRetentionDays && settings.retentionDays) {
      const value = String(settings.retentionDays);
      const hasOption = Array.from(adminAuditRetentionDays.options).some((option) => option.value === value);
      if (!hasOption) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${value} days`;
        adminAuditRetentionDays.appendChild(option);
      }
      adminAuditRetentionDays.value = value;
    }
  }

  async function loadAuditSection() {
    const [settingsData, trailsData] = await Promise.all([
      apiRequest('/api/admin/audit-trails/settings'),
      apiRequest('/api/admin/audit-trails?limit=150'),
    ]);

    renderAuditAutoDeleteSettings(settingsData);
    renderAuditTable(trailsData.trails || []);
  }

  async function saveAuditAutoDeleteSettings() {
    const autoDeleteEnabled = Boolean(adminAuditAutoDeleteEnabled?.checked);
    const retentionDays = Number(adminAuditRetentionDays?.value);

    if (!retentionDays || retentionDays < 1) {
      showAlert('Select a valid retention period in days.');
      return;
    }

    if (adminAuditAutoDeleteSaveBtn) {
      adminAuditAutoDeleteSaveBtn.disabled = true;
    }

    try {
      const result = await apiRequest('/api/admin/audit-trails/settings', {
        method: 'PATCH',
        body: JSON.stringify({ autoDeleteEnabled, retentionDays }),
      });

      renderAuditAutoDeleteSettings(result);
      await loadAuditSection();

      const purgeMessage = result.purgedCount
        ? ` AutoDelete removed ${result.purgedCount} old event(s).`
        : '';
      showAlert(`AutoDelete settings saved.${purgeMessage}`, 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (adminAuditAutoDeleteSaveBtn) {
        adminAuditAutoDeleteSaveBtn.disabled = false;
      }
    }
  }

  async function loadSection(section = activeSection) {
    if (section === 'metrics') {
      renderMetrics(await apiRequest('/api/admin/metrics'));
      return;
    }
    if (section === 'users') {
      const data = await apiRequest('/api/admin/users');
      setCachedUsers(data.users);
      return;
    }
    if (section === 'companies') {
      const data = await apiRequest('/api/admin/companies');
      setCachedCompanies(data.companies);
      return;
    }
    if (section === 'market') {
      await Promise.all([loadMarketSection(), loadSalesTerms()]);
      return;
    }
    if (section === 'posts') {
      await loadPostsSection();
      return;
    }
    if (section === 'api-logs') {
      await loadApiLogsSection();
      return;
    }
    if (section === 'audit') {
      await loadAuditSection();
      return;
    }
    if (section === 'server') {
      await loadServerSection();
    }
  }

  function renderServerActionSummary(message, type = 'info') {
    if (!adminServerActionSummary) {
      return;
    }

    adminServerActionSummary.hidden = false;
    adminServerActionSummary.textContent = message;
    adminServerActionSummary.dataset.type = type;
  }

  function renderServerOverview(data) {
    const memory = data.memory || {};
    const breakdown = data.memoryBreakdown || {};
    const topProcesses = data.topProcesses || [];
    const storage = data.storage || {};
    const runtime = data.runtime || {};
    const services = data.services || {};

    if (adminServerMetricsGrid) {
      adminServerMetricsGrid.innerHTML = `
        <article class="admin-metric-card accent">
          <span>System memory used (whole machine)</span>
          <strong>${escapeHtml(memory.system?.usedLabel || '—')}</strong>
        </article>
        <article class="admin-metric-card">
          <span>Total system RAM</span>
          <strong>${escapeHtml(memory.system?.totalLabel || '—')}</strong>
        </article>
        <article class="admin-metric-card">
          <span>SiteCrew backend process</span>
          <strong>${escapeHtml(memory.process?.rssLabel || '—')}</strong>
        </article>
        <article class="admin-metric-card">
          <span>Available system memory</span>
          <strong>${escapeHtml(memory.system?.freeLabel || '—')}</strong>
        </article>
        <article class="admin-metric-card">
          <span>System memory usage</span>
          <strong>${escapeHtml(memory.system?.usedPercent ?? 0)}%</strong>
        </article>
        <article class="admin-metric-card">
          <span>Upload folder on disk</span>
          <strong>${escapeHtml(storage.uploads?.totalLabel || '—')}</strong>
        </article>
      `;
    }

    if (adminServerDetails) {
      const dbStatus = services.database?.panic ? 'Database panic' : 'Database healthy';
      const aiScanStatus = services.aiScan?.ok
        ? `AI Scan online (${services.aiScan.mode})`
        : `AI Scan fallback (${services.aiScan?.mode || 'unknown'})`;

      const memorySegments = (breakdown.segments || []).map((segment) => `
        <div class="admin-memory-row">
          <div class="admin-memory-row-head">
            <strong>${escapeHtml(segment.label)}</strong>
            <span>${escapeHtml(segment.sizeLabel)} · ${escapeHtml(segment.percentOfTotalRam)}% of RAM</span>
          </div>
          <div class="admin-memory-bar" aria-hidden="true">
            <span style="width: ${Math.min(100, segment.percentOfTotalRam || 0)}%"></span>
          </div>
          <p class="admin-memory-row-note">${escapeHtml(segment.description || '')}</p>
        </div>
      `).join('');

      const processDetails = (breakdown.processDetails || []).map((item) => `
        <div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)} <span class="admin-memory-inline-note">${escapeHtml(item.detail || '')}</span></dd></div>
      `).join('');

      const topProcessRows = topProcesses.length
        ? topProcesses.map((process) => `
            <tr>
              <td>${escapeHtml(process.name)}</td>
              <td>${escapeHtml(process.memoryLabel)}</td>
              <td>${escapeHtml(process.percentOfTotalRam)}%</td>
            </tr>
          `).join('')
        : '<tr><td colspan="3">Process list is unavailable on this platform.</td></tr>';

      adminServerDetails.innerHTML = `
        <section class="admin-user-readonly">
          <h3>Where memory is used</h3>
          <p class="admin-user-readonly-lead">${escapeHtml(breakdown.note || '')}</p>
          <div class="admin-memory-breakdown">${memorySegments}</div>
        </section>

        <section class="admin-user-readonly">
          <h3>SiteCrew backend process details</h3>
          <dl class="admin-detail-list">${processDetails}</dl>
        </section>

        <section class="admin-user-readonly">
          <h3>Top processes using RAM on this machine</h3>
          <p class="admin-user-readonly-lead">These are system-wide processes, not only SiteCrew services.</p>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Process</th>
                  <th>Memory</th>
                  <th>% of total RAM</th>
                </tr>
              </thead>
              <tbody>${topProcessRows}</tbody>
            </table>
          </div>
        </section>

        <section class="admin-user-readonly">
          <h3>Storage vs memory</h3>
          <dl class="admin-detail-list">
            <div><dt>Upload folder size</dt><dd>${escapeHtml(storage.uploads?.totalLabel || '—')} (${escapeHtml(storage.uploads?.fileCount ?? 0)} files)</dd></div>
            <div><dt>Note</dt><dd>${escapeHtml(storage.note || '')}</dd></div>
          </dl>
        </section>

        <section class="admin-user-readonly">
          <h3>How the server is running</h3>
          <dl class="admin-detail-list">
            <div><dt>Node.js</dt><dd>${escapeHtml(runtime.nodeVersion || '—')}</dd></div>
            <div><dt>Platform</dt><dd>${escapeHtml(runtime.platform || '—')}</dd></div>
            <div><dt>Hostname</dt><dd>${escapeHtml(runtime.hostname || '—')}</dd></div>
            <div><dt>CPU cores</dt><dd>${escapeHtml(runtime.cpuCount ?? '—')}</dd></div>
            <div><dt>Backend port</dt><dd>${escapeHtml(runtime.backendPort ?? '—')}</dd></div>
            <div><dt>Upload directory</dt><dd>${escapeHtml(runtime.uploadDir || '—')}</dd></div>
            <div><dt>Process uptime</dt><dd>${escapeHtml(runtime.processUptimeLabel || '—')}</dd></div>
            <div><dt>System uptime</dt><dd>${escapeHtml(runtime.systemUptimeLabel || '—')}</dd></div>
            <div><dt>Database status</dt><dd>${escapeHtml(dbStatus)}</dd></div>
            <div><dt>AI Scan status</dt><dd>${escapeHtml(aiScanStatus)}</dd></div>
            <div><dt>Last refreshed</dt><dd>${escapeHtml(data.generatedAt ? new Date(data.generatedAt).toLocaleString('en-GB') : '—')}</dd></div>
          </dl>
        </section>
      `;
    }
  }

  function renderServerChecksResult(title, result) {
    document.getElementById('adminServerChecksWrap')?.remove();

    const checks = result.checks || [];
    renderServerActionSummary(`${title}: ${result.message}`, result.panic ? 'error' : 'success');

    if (!checks.length || !adminServerActionSummary) {
      return;
    }

    const wrap = document.createElement('div');
    wrap.id = 'adminServerChecksWrap';
    wrap.className = 'admin-server-check-wrap';
    wrap.innerHTML = `
      <ul class="admin-server-check-list">
        ${checks.map((check) => `
          <li>
            <span class="admin-pill ${check.status === 'ok' ? 'verify-approved' : 'mod-flagged'}">${escapeHtml(check.status)}</span>
            <strong>${escapeHtml(check.name)}</strong>
            <span>${escapeHtml(check.detail)}</span>
          </li>
        `).join('')}
      </ul>
    `;
    adminServerActionSummary.insertAdjacentElement('afterend', wrap);
  }

  function setAbandonedDeleteButtonState(result) {
    if (!adminServerDeleteAbandonedBtn) {
      return;
    }

    const hasAbandoned = Boolean(result?.abandonedCount);
    adminServerDeleteAbandonedBtn.hidden = !hasAbandoned;
    adminServerDeleteAbandonedBtn.disabled = !hasAbandoned;
  }

  function renderAbandonedPicturesResult(result) {
    lastAbandonedScanResult = result;
    setAbandonedDeleteButtonState(result);
    renderServerActionSummary(result.message || 'Scan completed.', result.abandonedCount ? 'error' : 'success');

    if (!adminServerAbandonedTable) {
      return;
    }

    const files = result.abandonedFiles || [];
    if (!files.length) {
      adminServerAbandonedTable.innerHTML = '<p class="admin-empty">No abandoned picture files were found.</p>';
      return;
    }

    adminServerAbandonedTable.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>File path</th>
            <th>Size</th>
            <th>Last modified</th>
          </tr>
        </thead>
        <tbody>
          ${files.map((file) => `
            <tr>
              <td>${escapeHtml(file.path)}</td>
              <td>${escapeHtml(file.sizeLabel)}</td>
              <td>${escapeHtml(file.modifiedAt ? new Date(file.modifiedAt).toLocaleString('en-GB') : '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async function loadServerSection() {
    document.getElementById('adminServerChecksWrap')?.remove();
    lastAbandonedScanResult = null;
    setAbandonedDeleteButtonState(null);
    if (adminServerActionSummary) {
      adminServerActionSummary.hidden = true;
    }

    if (adminServerMetricsGrid) {
      adminServerMetricsGrid.innerHTML = '<p class="admin-empty">Loading server status...</p>';
    }
    if (adminServerDetails) {
      adminServerDetails.innerHTML = '<p class="admin-empty">Loading server details...</p>';
    }

    const data = await apiRequest('/api/admin/server/overview');
    renderServerOverview(data);
  }

  async function handleServerCheckPanic() {
    if (adminServerCheckPanicBtn) {
      adminServerCheckPanicBtn.disabled = true;
    }

    try {
      document.getElementById('adminServerChecksWrap')?.remove();
      const result = await apiRequest('/api/admin/server/check-server-panic', { method: 'POST' });
      renderServerChecksResult('Server panic check', result);
      showAlert(result.message, result.panic ? 'error' : 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (adminServerCheckPanicBtn) {
        adminServerCheckPanicBtn.disabled = false;
      }
    }
  }

  async function handleServerDatabasePanicCheck() {
    if (adminServerCheckDatabasePanicBtn) {
      adminServerCheckDatabasePanicBtn.disabled = true;
    }

    try {
      document.getElementById('adminServerChecksWrap')?.remove();
      const result = await apiRequest('/api/admin/server/check-database-panic', { method: 'POST' });
      renderServerActionSummary(`${result.message} ${result.detail || ''}`.trim(), result.panic ? 'error' : 'success');
      showAlert(result.message, result.panic ? 'error' : 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (adminServerCheckDatabasePanicBtn) {
        adminServerCheckDatabasePanicBtn.disabled = false;
      }
    }
  }

  async function handleServerScanAbandonedPictures() {
    if (adminServerScanAbandonedBtn) {
      adminServerScanAbandonedBtn.disabled = true;
    }

    if (adminServerAbandonedTable) {
      adminServerAbandonedTable.innerHTML = '<p class="admin-empty">Scanning picture files...</p>';
    }

    try {
      const result = await apiRequest('/api/admin/server/scan-abandoned-pictures', { method: 'POST' });
      renderAbandonedPicturesResult(result);
      showAlert(result.message, result.abandonedCount ? 'error' : 'success');
    } catch (error) {
      if (adminServerAbandonedTable) {
        adminServerAbandonedTable.innerHTML = '<p class="admin-empty">Could not scan abandoned picture files.</p>';
      }
      showAlert(error.message);
    } finally {
      if (adminServerScanAbandonedBtn) {
        adminServerScanAbandonedBtn.disabled = false;
      }
    }
  }

  async function handleServerDeleteAbandonedPictures() {
    if (!lastAbandonedScanResult?.abandonedCount) {
      showAlert('Scan for abandoned picture files before deleting.');
      return;
    }

    const count = lastAbandonedScanResult.abandonedCount;
    if (!window.confirm(`Delete ${count} abandoned picture file(s)? This cannot be undone.`)) {
      return;
    }

    if (adminServerDeleteAbandonedBtn) {
      adminServerDeleteAbandonedBtn.disabled = true;
    }

    try {
      const result = await apiRequest('/api/admin/server/delete-abandoned-pictures', { method: 'POST' });
      renderServerActionSummary(result.message || 'Delete completed.', result.failedCount ? 'error' : 'success');
      showAlert(result.message, result.failedCount ? 'error' : 'success');

      const rescan = await apiRequest('/api/admin/server/scan-abandoned-pictures', { method: 'POST' });
      renderAbandonedPicturesResult(rescan);

      const overview = await apiRequest('/api/admin/server/overview');
      renderServerOverview(overview);
    } catch (error) {
      showAlert(error.message);
      setAbandonedDeleteButtonState(lastAbandonedScanResult);
    } finally {
      if (adminServerDeleteAbandonedBtn && lastAbandonedScanResult?.abandonedCount) {
        adminServerDeleteAbandonedBtn.disabled = false;
      }
    }
  }

  function setPostsPanel(panel) {
    activePostsPanel = panel;
    document.querySelectorAll('.admin-posts-subnav [data-posts-panel]').forEach((button) => {
      const isActive = button.dataset.postsPanel === panel;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    postsPanels.forEach((section) => {
      const isActive = section.dataset.postsPanel === panel;
      section.classList.toggle('active', isActive);
      section.hidden = !isActive;
    });
  }

  async function loadPostsListPanel() {
    const data = await apiRequest('/api/admin/posts');
    renderPostsTable(data.posts);
  }

  function renderTextReviewLearnMode(enabled) {
    textReviewLearnMode = Boolean(enabled);
    if (adminTextReviewLearnModeBtn) {
      adminTextReviewLearnModeBtn.textContent = `Learn mode: ${textReviewLearnMode ? 'ON' : 'OFF'}`;
      adminTextReviewLearnModeBtn.classList.toggle('active', textReviewLearnMode);
      adminTextReviewLearnModeBtn.setAttribute('aria-pressed', textReviewLearnMode ? 'true' : 'false');
    }
    if (adminTextReviewLearnHint) {
      adminTextReviewLearnHint.hidden = !textReviewLearnMode;
    }
  }

  async function loadTextReviewSettings() {
    const data = await apiRequest('/api/admin/text-review/settings');
    renderTextReviewLearnMode(data.learnMode);
    renderTextReviewLearnCategories(data.termCategories || []);
  }

  function renderTextReviewLearnCategories(categories) {
    if (!adminTextReviewLearnCategory || !categories.length) {
      return;
    }

    adminTextReviewLearnCategory.innerHTML = categories.map((entry) => (
      `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`
    )).join('');
  }

  function buildTextReviewPayload(extra = {}) {
    if (!currentTextReviewItem) {
      return null;
    }

    return {
      scanId: currentTextReviewItem.id || null,
      entityType: currentTextReviewItem.entityType,
      entityId: currentTextReviewItem.entityId,
      ...extra,
    };
  }

  async function submitTextReviewDecision(action, extra = {}) {
    const payload = buildTextReviewPayload(extra);
    if (!payload) {
      return;
    }

    textReviewBusy = true;
    adminTextReviewApproveBtn.disabled = true;
    adminTextReviewRejectBtn.disabled = true;

    try {
      const data = await apiRequest(`/api/admin/text-review/${action}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadAiScanSection();
      if (action === 'approve') {
        showAlert('Content marked as safe.', 'success');
        return;
      }

      const learnedCount = data.learnedTerms?.length || 0;
      if (data.textRemoved) {
        showAlert('Post text removed. Approved image kept. User notified.', 'success');
        return;
      }

      showAlert(
        learnedCount > 0
          ? `Content rejected. Learned ${learnedCount} blocked word(s). User notified.`
          : 'Content rejected and removed. User notified.',
        'success'
      );
    } catch (error) {
      showAlert(error.message);
    } finally {
      textReviewBusy = false;
      adminTextReviewApproveBtn.disabled = false;
      adminTextReviewRejectBtn.disabled = false;
    }
  }

  function closeTextReviewLearnModal() {
    if (!adminTextReviewLearnModal) {
      return;
    }
    adminTextReviewLearnModal.hidden = true;
    adminTextReviewLearnForm?.reset();
  }

  function openTextReviewLearnModal() {
    if (!adminTextReviewLearnModal) {
      return;
    }
    adminTextReviewLearnModal.hidden = false;
    adminTextReviewLearnTerms?.focus();
  }

  function buildTextReviewRiskReason(item = {}) {
    if (item.riskReason) {
      return item.riskReason;
    }

    const overallRisk = Number(item.overallRisk) || 0;
    const flags = item.flags || [];

    if (overallRisk <= 30 && !flags.length) {
      return '';
    }

    if (flags.length) {
      return `Reason why this post is under risk is: ${flags.map((flag) => flag.replace(/_/g, ' ')).join('; ')}.`;
    }

    return 'Reason why this post is under risk is: automated moderation rules flagged this content.';
  }

  function renderTextReviewItem(data) {
    currentTextReviewItem = data.item || null;

    if (!currentTextReviewItem) {
      adminTextReviewContent.hidden = true;
      adminTextReviewEmpty.hidden = false;
      adminTextReviewEmpty.textContent = showTextReviewRiskOnly
        ? 'No risk posts in the moderation queue.'
        : 'Queue is empty.';
      adminTextReviewActions.hidden = true;
      adminTextReviewCounter.textContent = showTextReviewRiskOnly
        ? 'Risk item 0 / 0'
        : 'Item 0 / 0';
      return;
    }

    adminTextReviewEmpty.hidden = true;
    adminTextReviewContent.hidden = false;
    adminTextReviewType.textContent = currentTextReviewItem.contentType || currentTextReviewItem.entityType;
    adminTextReviewTitle.hidden = !currentTextReviewItem.title;
    adminTextReviewTitle.textContent = currentTextReviewItem.title || '';
    adminTextReviewText.textContent = currentTextReviewItem.text || '';

    const riskReasonText = buildTextReviewRiskReason(currentTextReviewItem);
    if (adminTextReviewRiskReason) {
      adminTextReviewRiskReason.hidden = !riskReasonText;
      adminTextReviewRiskReason.textContent = riskReasonText;
    }

    adminTextReviewMeta.innerHTML = [
      `<span class="admin-pill mod-hidden">Risk ${escapeHtml(currentTextReviewItem.overallRisk)}</span>`,
      ...(currentTextReviewItem.flags || []).map((flag) => `<span class="admin-pill">${escapeHtml(flag)}</span>`),
      !riskReasonText && currentTextReviewItem.message
        ? `<span class="admin-pill mod-flagged">${escapeHtml(currentTextReviewItem.message)}</span>`
        : '',
    ].join('');
    adminTextReviewActions.hidden = false;
    const counterLabel = showTextReviewRiskOnly ? 'Risk item' : 'Item';
    adminTextReviewCounter.textContent = `${counterLabel} ${currentTextReviewItem.position} / ${currentTextReviewItem.total}`;
  }

  function renderTextReviewRiskOnlyFilter(enabled) {
    showTextReviewRiskOnly = Boolean(enabled);
    if (adminTextReviewRiskOnlyBtn) {
      adminTextReviewRiskOnlyBtn.classList.toggle('is-active', showTextReviewRiskOnly);
      adminTextReviewRiskOnlyBtn.setAttribute('aria-pressed', showTextReviewRiskOnly ? 'true' : 'false');
    }
  }

  function formatLearnedTermCategory(category) {
    return String(category || 'not_allowed_content').replace(/_/g, ' ');
  }

  function renderLearnedTermsTable(terms = []) {
    if (!adminTextReviewLearnedListTable) {
      return;
    }

    if (!terms.length) {
      adminTextReviewLearnedListTable.innerHTML = '<p class="admin-empty">No learned blocked words yet.</p>';
      return;
    }

    adminTextReviewLearnedListTable.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Word / phrase</th>
            <th>Category</th>
            <th>Risk score</th>
          </tr>
        </thead>
        <tbody>
          ${terms.map((term) => `
            <tr data-learned-term-id="${escapeHtml(term.id)}">
              <td>${escapeHtml(term.term)}</td>
              <td>${escapeHtml(formatLearnedTermCategory(term.category))}</td>
              <td>
                <div class="admin-learned-term-risk">
                  <input
                    type="number"
                    class="admin-learned-term-risk-input"
                    min="1"
                    max="100"
                    step="1"
                    value="${escapeHtml(term.risk_score ?? 90)}"
                    data-learned-term-risk
                    aria-label="Risk score for ${escapeHtml(term.term)}"
                  >
                  <button type="button" class="admin-secondary-btn admin-learned-term-risk-save" data-learned-term-save>
                    Save
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async function saveLearnedTermRiskScore(row) {
    const termId = row?.dataset?.learnedTermId;
    const input = row?.querySelector('[data-learned-term-risk]');
    const saveBtn = row?.querySelector('[data-learned-term-save]');

    if (!termId || !input) {
      return;
    }

    const riskScore = Number(input.value);
    if (!Number.isInteger(riskScore) || riskScore < 1 || riskScore > 100) {
      showAlert('Risk score must be an integer between 1 and 100.');
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
    }

    try {
      await apiRequest(`/api/admin/text-review/not-allowed-terms/${termId}`, {
        method: 'PATCH',
        body: JSON.stringify({ riskScore }),
      });
      showAlert('Risk score updated.', 'success');
      await loadLearnedTermsMeta();
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    }
  }

  function closeLearnedTermsListModal() {
    if (!adminTextReviewLearnedListModal) {
      return;
    }
    adminTextReviewLearnedListModal.hidden = true;
  }

  function renderPresetRiskRulesTable(rules = []) {
    if (!adminTextReviewPresetRiskListTable) {
      return;
    }

    if (!rules.length) {
      adminTextReviewPresetRiskListTable.innerHTML = '<p class="admin-empty">No preset risk rules found.</p>';
      return;
    }

    adminTextReviewPresetRiskListTable.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Word / phrase / rule</th>
            <th>Category</th>
            <th>Risk</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          ${rules.map((rule) => `
            <tr>
              <td>${escapeHtml(rule.term)}</td>
              <td>${escapeHtml(formatLearnedTermCategory(rule.category))}</td>
              <td>${escapeHtml(rule.riskScore ?? '—')}</td>
              <td>${escapeHtml(rule.ruleType || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function closePresetRiskListModal() {
    if (!adminTextReviewPresetRiskListModal) {
      return;
    }
    adminTextReviewPresetRiskListModal.hidden = true;
  }

  async function openPresetRiskListModal() {
    if (!adminTextReviewPresetRiskListModal) {
      return;
    }

    adminTextReviewPresetRiskListModal.hidden = false;
    if (adminTextReviewPresetRiskListSummary) {
      adminTextReviewPresetRiskListSummary.textContent = 'Loading preset risk rules...';
    }
    if (adminTextReviewPresetRiskListTable) {
      adminTextReviewPresetRiskListTable.innerHTML = '<p class="admin-empty">Loading...</p>';
    }

    try {
      const data = await apiRequest('/api/admin/text-review/preset-risk-rules');
      const rules = data.rules || [];
      if (adminTextReviewPresetRiskListSummary) {
        adminTextReviewPresetRiskListSummary.textContent = rules.length
          ? `${rules.length} preset risk word(s) and rules are built into AI Scan.`
          : 'No preset risk rules found.';
      }
      renderPresetRiskRulesTable(rules);
    } catch (error) {
      if (adminTextReviewPresetRiskListSummary) {
        adminTextReviewPresetRiskListSummary.textContent = error.message;
      }
      if (adminTextReviewPresetRiskListTable) {
        adminTextReviewPresetRiskListTable.innerHTML = '<p class="admin-empty">Could not load preset risk rules.</p>';
      }
    }
  }

  async function loadLearnedTermsListData() {
    const data = await apiRequest('/api/admin/text-review/not-allowed-terms');
    const terms = data.terms || [];

    if (adminTextReviewLearnedListSummary) {
      adminTextReviewLearnedListSummary.textContent = terms.length
        ? `${terms.length} learned blocked word(s) are active for AI Scan.`
        : 'No learned blocked words yet. Add custom words below or use Learn mode + REJECT.';
    }

    renderLearnedTermsTable(terms);
    return terms;
  }

  async function saveCustomLearnedTerms(event) {
    event?.preventDefault();

    const termsValue = adminTextReviewLearnedAddTerms?.value?.trim() || '';
    const riskScore = Number(adminTextReviewLearnedAddRisk?.value);

    if (!termsValue) {
      showAlert('Enter at least one blocked word or phrase.');
      adminTextReviewLearnedAddTerms?.focus();
      return;
    }

    if (!Number.isInteger(riskScore) || riskScore < 1 || riskScore > 100) {
      showAlert('Risk score must be an integer between 1 and 100.');
      adminTextReviewLearnedAddRisk?.focus();
      return;
    }

    if (adminTextReviewLearnedAddBtn) {
      adminTextReviewLearnedAddBtn.disabled = true;
    }

    try {
      const data = await apiRequest('/api/admin/text-review/learned-terms', {
        method: 'POST',
        body: JSON.stringify({
          terms: termsValue,
          riskScore,
        }),
      });

      adminTextReviewLearnedAddForm?.reset();
      if (adminTextReviewLearnedAddRisk) {
        adminTextReviewLearnedAddRisk.value = '90';
      }

      await loadLearnedTermsListData();
      await loadLearnedTermsMeta();
      showAlert(`${data.total || 0} custom blocked word(s) saved.`, 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      if (adminTextReviewLearnedAddBtn) {
        adminTextReviewLearnedAddBtn.disabled = false;
      }
    }
  }

  async function openLearnedTermsListModal() {
    if (!adminTextReviewLearnedListModal) {
      return;
    }

    adminTextReviewLearnedListModal.hidden = false;
    if (adminTextReviewLearnedListSummary) {
      adminTextReviewLearnedListSummary.textContent = 'Loading learned words...';
    }
    if (adminTextReviewLearnedListTable) {
      adminTextReviewLearnedListTable.innerHTML = '<p class="admin-empty">Loading...</p>';
    }

    try {
      await loadLearnedTermsListData();
    } catch (error) {
      if (adminTextReviewLearnedListSummary) {
        adminTextReviewLearnedListSummary.textContent = error.message;
      }
      if (adminTextReviewLearnedListTable) {
        adminTextReviewLearnedListTable.innerHTML = '<p class="admin-empty">Could not load learned words.</p>';
      }
    }
  }

  async function loadLearnedTermsMeta() {
    if (!adminTextReviewLearnedTermsMeta) {
      return;
    }

    try {
      const data = await apiRequest('/api/admin/text-review/not-allowed-terms');
      const count = data.terms?.length || 0;
      adminTextReviewLearnedTermsMeta.textContent = count > 0
        ? `${count} learned blocked word(s) active — queue rescans automatically on load.`
        : 'No learned blocked words yet. Add custom words in the list modal or use Learn mode + REJECT.';
    } catch (error) {
      adminTextReviewLearnedTermsMeta.textContent = '';
    }
  }

  async function loadAiScanSection() {
    await loadTextReviewSettings();
    await loadLearnedTermsMeta();
    const query = showTextReviewRiskOnly ? '?riskOnly=true' : '';
    const data = await apiRequest(`/api/admin/text-review/next${query}`);
    renderTextReviewItem(data);
  }

  async function loadPostsModerationStatus() {
    if (!adminPostsModerationStatus) return;

    try {
      const data = await apiRequest('/api/admin/moderation/health');
      const aiScanLabel = data.aiScan?.ok
        ? `AI Scan: online (${data.aiScan.mode})`
        : `AI Scan: fallback local rules`;
      const riskPending = data.textReview?.riskPending;
      const textLabel = typeof riskPending === 'number'
        ? `Text queue: ${data.textReview?.pending || 0} (${riskPending} risk)`
        : `Text queue: ${data.textReview?.pending || 0}`;
      const mediaLabel = `Media queue: ${data.mediaReview?.pending || 0}`;

      adminPostsModerationStatus.innerHTML = [
        `<span class="admin-pill ${data.aiScan?.ok ? 'verify-approved' : 'mod-flagged'}">${escapeHtml(aiScanLabel)}</span>`,
        `<span class="admin-pill">${escapeHtml(textLabel)}</span>`,
        `<span class="admin-pill">${escapeHtml(mediaLabel)}</span>`,
      ].join('');
    } catch (error) {
      adminPostsModerationStatus.textContent = `Moderation status unavailable: ${error.message}`;
    }
  }

  async function loadPostsSection(panel = activePostsPanel) {
    setPostsPanel(panel);
    await loadPostsModerationStatus();
    if (panel === 'list') {
      await loadPostsListPanel();
      return;
    }
    if (panel === 'ai-scan') {
      await loadAiScanSection();
      return;
    }
    if (panel === 'media-review') {
      await loadMediaReviewSection();
    }
  }

  function revokeMediaReviewObjectUrl() {
    if (mediaReviewObjectUrl) {
      URL.revokeObjectURL(mediaReviewObjectUrl);
      mediaReviewObjectUrl = null;
    }
  }

  async function loadMediaReviewImage(item) {
    revokeMediaReviewObjectUrl();
    adminMediaReviewImage.hidden = false;
    adminMediaReviewEmpty.hidden = true;
    adminMediaReviewImage.alt = item.filePath || 'Media review image';

    adminMediaReviewImage.onerror = () => {
      adminMediaReviewImage.hidden = true;
      adminMediaReviewEmpty.hidden = false;
      adminMediaReviewEmpty.textContent = 'Image preview is unavailable. You can still approve or reject this item.';
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/media-review/${item.id}/preview`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Preview unavailable');
      }

      const blob = await response.blob();
      mediaReviewObjectUrl = URL.createObjectURL(blob);
      adminMediaReviewImage.src = mediaReviewObjectUrl;
    } catch (error) {
      adminMediaReviewImage.src = getMediaUrl(item.filePath || item.imageUrl);
    }
  }

  function renderMediaReviewItem(data) {
    currentMediaReviewItem = data.item || null;
    revokeMediaReviewObjectUrl();

    if (!currentMediaReviewItem) {
      adminMediaReviewImage.hidden = true;
      adminMediaReviewImage.removeAttribute('src');
      adminMediaReviewEmpty.hidden = false;
      adminMediaReviewEmpty.textContent = 'Queue is empty.';
      adminMediaReviewActions.hidden = true;
      adminMediaReviewCounter.textContent = 'Image 0 / 0';
      return;
    }

    adminMediaReviewActions.hidden = false;
    adminMediaReviewCounter.textContent = `Image ${currentMediaReviewItem.position} / ${currentMediaReviewItem.total}`;
    loadMediaReviewImage(currentMediaReviewItem);
  }

  async function loadMediaReviewSection() {
    const data = await apiRequest('/api/admin/media-review/next');
    renderMediaReviewItem(data);
  }

  async function handleTextReviewDecision(action) {
    if (!currentTextReviewItem || textReviewBusy) {
      return;
    }

    if (action === 'reject' && textReviewLearnMode) {
      openTextReviewLearnModal();
      return;
    }

    await submitTextReviewDecision(action);
  }

  async function handleTextReviewRescanAll() {
    if (textReviewBusy) {
      return;
    }

    if (!window.confirm('Rescan all posts, comments, jobs, messages and reviews that are not marked safe?')) {
      return;
    }

    textReviewBusy = true;
    if (adminTextReviewRescanBtn) {
      adminTextReviewRescanBtn.disabled = true;
    }

    try {
      const data = await apiRequest('/api/admin/text-review/rescan-all', { method: 'POST' });
      await loadAiScanSection();
      showAlert(`Rescan complete. ${data.total || 0} item(s) scanned.`, 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      textReviewBusy = false;
      if (adminTextReviewRescanBtn) {
        adminTextReviewRescanBtn.disabled = false;
      }
    }
  }

  async function toggleTextReviewLearnMode() {
    try {
      const data = await apiRequest('/api/admin/text-review/settings', {
        method: 'PATCH',
        body: JSON.stringify({ learnMode: !textReviewLearnMode }),
      });
      renderTextReviewLearnMode(data.learnMode);
      showAlert(data.learnMode ? 'Learn mode enabled.' : 'Learn mode disabled.', 'success');
    } catch (error) {
      showAlert(error.message);
    }
  }

  async function handleMediaReviewDecision(action) {
    if (!currentMediaReviewItem || mediaReviewBusy) {
      return;
    }

    mediaReviewBusy = true;
    adminMediaReviewApproveBtn.disabled = true;
    adminMediaReviewRejectBtn.disabled = true;

    try {
      await apiRequest(`/api/admin/media-review/${currentMediaReviewItem.id}/${action}`, {
        method: 'POST',
      });
      await loadMediaReviewSection();
      showAlert(action === 'approve' ? 'Image approved.' : 'Image rejected and removed.', 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      mediaReviewBusy = false;
      adminMediaReviewApproveBtn.disabled = false;
      adminMediaReviewRejectBtn.disabled = false;
    }
  }

  navButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const section = button.dataset.adminSection;
      setActiveSection(section);
      try {
        await loadSection(section);
      } catch (error) {
        showAlert(error.message);
      }
    });
  });

  adminRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadSection(activeSection);
      showAlert('Section refreshed.', 'success');
    } catch (error) {
      showAlert(error.message);
    }
  });

  adminServerCheckPanicBtn?.addEventListener('click', handleServerCheckPanic);
  adminServerCheckDatabasePanicBtn?.addEventListener('click', handleServerDatabasePanicCheck);
  adminServerScanAbandonedBtn?.addEventListener('click', handleServerScanAbandonedPictures);
  adminServerDeleteAbandonedBtn?.addEventListener('click', handleServerDeleteAbandonedPictures);

  document.querySelectorAll('.admin-posts-subnav [data-posts-panel]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await loadPostsSection(button.dataset.postsPanel);
      } catch (error) {
        showAlert(error.message);
      }
    });
  });

  adminMediaReviewApproveBtn?.addEventListener('click', () => handleMediaReviewDecision('approve'));
  adminMediaReviewRejectBtn?.addEventListener('click', () => handleMediaReviewDecision('reject'));
  adminTextReviewApproveBtn?.addEventListener('click', () => handleTextReviewDecision('approve'));
  adminTextReviewRejectBtn?.addEventListener('click', () => handleTextReviewDecision('reject'));
  adminTextReviewRiskOnlyBtn?.addEventListener('click', async () => {
    renderTextReviewRiskOnlyFilter(!showTextReviewRiskOnly);
    try {
      await loadAiScanSection();
    } catch (error) {
      showAlert(error.message);
    }
  });
  adminTextReviewLearnModeBtn?.addEventListener('click', toggleTextReviewLearnMode);
  adminTextReviewRescanBtn?.addEventListener('click', handleTextReviewRescanAll);
  adminTextReviewLearnedListBtn?.addEventListener('click', openLearnedTermsListModal);
  adminTextReviewLearnedAddForm?.addEventListener('submit', saveCustomLearnedTerms);
  adminTextReviewLearnedListModal?.querySelectorAll('[data-text-review-learned-list-close]').forEach((element) => {
    element.addEventListener('click', closeLearnedTermsListModal);
  });
  adminTextReviewLearnedListTable?.addEventListener('click', async (event) => {
    const saveBtn = event.target.closest('[data-learned-term-save]');
    if (!saveBtn) {
      return;
    }

    const row = saveBtn.closest('[data-learned-term-id]');
    await saveLearnedTermRiskScore(row);
  });
  adminTextReviewLearnedListTable?.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter' || !event.target.matches('[data-learned-term-risk]')) {
      return;
    }

    event.preventDefault();
    const row = event.target.closest('[data-learned-term-id]');
    await saveLearnedTermRiskScore(row);
  });
  adminTextReviewPresetRiskListBtn?.addEventListener('click', openPresetRiskListModal);
  adminTextReviewPresetRiskListModal?.querySelectorAll('[data-text-review-preset-risk-close]').forEach((element) => {
    element.addEventListener('click', closePresetRiskListModal);
  });
  adminTextReviewLearnForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const learnTerms = adminTextReviewLearnTerms?.value?.trim() || '';
    const learnCategory = adminTextReviewLearnCategory?.value || 'not_allowed_content';

    if (!learnTerms) {
      showAlert('Enter at least one blocked word or phrase to teach.');
      return;
    }

    closeTextReviewLearnModal();
    await submitTextReviewDecision('reject', {
      learnTerms,
      learnCategory,
    });
  });
  adminTextReviewLearnModal?.querySelectorAll('[data-text-review-learn-close]').forEach((element) => {
    element.addEventListener('click', closeTextReviewLearnModal);
  });

  window.addEventListener('keydown', (event) => {
    if (activeSection !== 'posts') {
      return;
    }

    if (activePostsPanel === 'media-review') {
      if (event.key === 'a' || event.key === 'A') {
        handleMediaReviewDecision('approve');
      }
      if (event.key === 'r' || event.key === 'R') {
        handleMediaReviewDecision('reject');
      }
    }

    if (activePostsPanel === 'ai-scan') {
      if (event.key === 'a' || event.key === 'A') {
        handleTextReviewDecision('approve');
      }
      if (event.key === 'r' || event.key === 'R') {
        handleTextReviewDecision('reject');
      }
    }
  });

  adminUsersSearch?.addEventListener('input', () => {
    window.clearTimeout(usersSearchTimer);
    usersSearchTimer = window.setTimeout(applyUsersView, 200);
  });

  adminUsersRoleFilter?.addEventListener('change', applyUsersView);
  adminUsersStatusFilter?.addEventListener('change', applyUsersView);
  adminUsersRatingFilter?.addEventListener('change', applyUsersView);
  adminUsersSort?.addEventListener('change', applyUsersView);
  adminUsersClearBtn?.addEventListener('click', clearUsersFilters);

  document.getElementById('adminUsersTable')?.addEventListener('click', async (event) => {
    const forceDeleteBtn = event.target.closest('[data-force-delete-user]');
    if (forceDeleteBtn) {
      event.preventDefault();
      event.stopPropagation();
      openForceDeleteUserModal(forceDeleteBtn.dataset.forceDeleteUser);
      return;
    }

    if (event.target.closest('select, button, a, label, input')) return;
    const row = event.target.closest('[data-user-id]');
    if (!row) return;

    try {
      await openUserModal(row.dataset.userId);
    } catch (error) {
      showAlert(error.message);
    }
  });

  adminUserForm?.addEventListener('submit', saveUserDetails);

  adminUserPhotoInput?.addEventListener('change', () => {
    const file = adminUserPhotoInput.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    adminUserAvatarPreview.innerHTML = `<img src="${previewUrl}" alt="Selected avatar preview">`;
  });

  adminUserModal?.querySelectorAll('[data-admin-modal-close]').forEach((element) => {
    element.addEventListener('click', closeUserModal);
  });

  adminForceDeleteUserForm?.addEventListener('submit', submitForceDeleteUser);
  adminForceDeleteUserModal?.querySelectorAll('[data-force-delete-user-close]').forEach((element) => {
    element.addEventListener('click', closeForceDeleteUserModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (adminForceDeleteUserModal && !adminForceDeleteUserModal.hidden) {
      closeForceDeleteUserModal();
      return;
    }
    if (adminCompanyStatusModal && !adminCompanyStatusModal.hidden) {
      closeCompanyStatusReasonModal();
      return;
    }
    if (adminCompanyModal && !adminCompanyModal.hidden) {
      closeCompanyModal();
      return;
    }
    if (adminUserModal && !adminUserModal.hidden) {
      closeUserModal();
    }
  });

  async function handleUserStatusUpdate(select) {
    if (!select || !select.value) return;

    const userId = select.dataset.userStatus;
    const status = select.value;

    if (isCompanyAccount(userId)) {
      pendingCompanyStatusChange = { userId, status, select, source: 'companies' };
      openCompanyStatusReasonModal(status, userId);
      return;
    }

    if (status === 'deleted' && !window.confirm('Mark this account as deleted?')) {
      select.value = '';
      return;
    }

    select.disabled = true;
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showAlert(`Account status updated to ${status}.`, 'success');

      if (activeSection === 'users') {
        setCachedUsers((await apiRequest('/api/admin/users')).users);
      }
    } catch (error) {
      showAlert(error.message);
    } finally {
      select.disabled = false;
      select.value = '';
    }
  }

  document.getElementById('adminUsersTable')?.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-user-status]');
    if (!select) return;
    await handleUserStatusUpdate(select);
  });

  adminCompaniesSearch?.addEventListener('input', () => {
    window.clearTimeout(companiesSearchTimer);
    companiesSearchTimer = window.setTimeout(applyCompaniesView, 200);
  });

  adminCompaniesPlanFilter?.addEventListener('change', applyCompaniesView);
  adminCompaniesVerificationFilter?.addEventListener('change', applyCompaniesView);
  adminCompaniesStatusFilter?.addEventListener('change', applyCompaniesView);
  adminCompaniesRatingFilter?.addEventListener('change', applyCompaniesView);
  adminCompaniesSort?.addEventListener('change', applyCompaniesView);

  adminCompaniesExpiringBtn?.addEventListener('click', () => {
    showCompaniesExpiringOnly = !showCompaniesExpiringOnly;
    adminCompaniesExpiringBtn.classList.toggle('is-active', showCompaniesExpiringOnly);
    adminCompaniesExpiringBtn.setAttribute('aria-pressed', showCompaniesExpiringOnly ? 'true' : 'false');
    applyCompaniesView();
  });

  adminCompaniesClearBtn?.addEventListener('click', clearCompaniesFilters);

  document.getElementById('adminCompaniesTable')?.addEventListener('click', async (event) => {
    const updatePlanBtn = event.target.closest('[data-billing-update-plan]');
    if (updatePlanBtn) {
      await updateBillingPlan(updatePlanBtn.dataset.billingUpdatePlan, updatePlanBtn);
      return;
    }

    const addMonthBtn = event.target.closest('[data-billing-add-month]');
    if (addMonthBtn) {
      await addBillingMonth(addMonthBtn.dataset.billingAddMonth, addMonthBtn);
      return;
    }

    const remindBtn = event.target.closest('[data-billing-remind]');
    if (remindBtn) {
      await sendBillingExpiryReminder(remindBtn.dataset.billingRemind, remindBtn);
      return;
    }

    const pauseBtn = event.target.closest('[data-billing-pause]');
    if (pauseBtn) {
      await pauseBillingAccount(pauseBtn.dataset.billingPause, pauseBtn);
      return;
    }

    const deleteBtn = event.target.closest('[data-billing-delete-company]');
    if (deleteBtn) {
      await deleteCompanyAccount(deleteBtn.dataset.billingDeleteCompany, deleteBtn);
      return;
    }

    if (event.target.closest('select, button, a, label, input')) return;
    const row = event.target.closest('[data-company-id]');
    if (!row) return;

    try {
      await openCompanyModal(row.dataset.companyId);
    } catch (error) {
      showAlert(error.message);
    }
  });

  adminCompanyForm?.addEventListener('submit', saveCompanyDetails);

  adminCompanyLogoInput?.addEventListener('change', () => {
    const file = adminCompanyLogoInput.files?.[0];
    if (!file || !adminCompanyLogoPreview) return;
    const previewUrl = URL.createObjectURL(file);
    adminCompanyLogoPreview.innerHTML = `<img src="${previewUrl}" alt="Selected logo preview">`;
  });

  adminCompanyModal?.querySelectorAll('[data-admin-company-modal-close]').forEach((element) => {
    element.addEventListener('click', closeCompanyModal);
  });

  adminCompanyStatusForm?.addEventListener('submit', submitCompanyStatusChange);

  adminCompanyAddEventBtn?.addEventListener('click', () => {
    if (!selectedCompanyId) {
      showAlert('Open a company account first.');
      return;
    }
    openManualCompanyEventModal(selectedCompanyId);
  });

  adminCompanyStatusModal?.querySelectorAll('[data-company-status-modal-close]').forEach((element) => {
    element.addEventListener('click', closeCompanyStatusReasonModal);
  });

  document.getElementById('adminCompaniesTable')?.addEventListener('change', async (event) => {
    const statusSelect = event.target.closest('[data-user-status]');
    if (statusSelect) {
      await handleUserStatusUpdate(statusSelect);
      return;
    }

    const select = event.target.closest('[data-company-verify]');
    if (!select || !select.value) return;
    const companyId = select.dataset.companyVerify;
    const verificationStatus = select.value;
    select.disabled = true;
    try {
      await apiRequest(`/api/admin/companies/${companyId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationStatus }),
      });
      showAlert('Company verification updated.', 'success');
      setCachedCompanies((await apiRequest('/api/admin/companies')).companies);
    } catch (error) {
      showAlert(error.message);
    } finally {
      select.disabled = false;
      select.value = '';
    }
  });

  document.getElementById('adminPostsTable')?.addEventListener('click', async (event) => {
    const deleteBtn = event.target.closest('[data-post-delete]');
    if (deleteBtn) {
      const postId = deleteBtn.dataset.postDelete;
      if (!window.confirm('Delete this post permanently?')) return;
      deleteBtn.disabled = true;
      try {
        await apiRequest(`/api/admin/posts/${postId}`, { method: 'DELETE' });
        showAlert('Post deleted.', 'success');
        await loadPostsSection('list');
      } catch (error) {
        showAlert(error.message);
        deleteBtn.disabled = false;
      }
      return;
    }
  });

  document.getElementById('adminPostsTable')?.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-post-moderate]');
    if (!select || !select.value) return;
    const postId = select.dataset.postModerate;
    const moderationStatus = select.value;
    select.disabled = true;
    try {
      await apiRequest(`/api/admin/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ moderationStatus }),
      });
      showAlert('Post moderation updated.', 'success');
      await loadPostsSection('list');
    } catch (error) {
      showAlert(error.message);
    } finally {
      select.disabled = false;
      select.value = '';
    }
  });

  adminApiLogsProblemsBtn?.addEventListener('click', async () => {
    showApiLogsProblemsOnly = !showApiLogsProblemsOnly;
    adminApiLogsProblemsBtn.classList.toggle('is-active', showApiLogsProblemsOnly);
    adminApiLogsProblemsBtn.setAttribute('aria-pressed', showApiLogsProblemsOnly ? 'true' : 'false');
    try {
      await loadApiLogsSection();
    } catch (error) {
      showAlert(error.message);
    }
  });

  adminApiLogsDeleteOlderBtn?.addEventListener('click', async () => {
    const hours = Number(adminApiLogsOlderHours?.value);
    if (!hours || hours < 1) {
      showAlert('Enter a valid number of hours.');
      return;
    }

    if (!window.confirm(`Delete all API logs older than ${hours} hour${hours === 1 ? '' : 's'}?`)) {
      return;
    }

    adminApiLogsDeleteOlderBtn.disabled = true;
    try {
      const result = await apiRequest('/api/admin/api-logs/older-than', {
        method: 'DELETE',
        body: JSON.stringify({ hours }),
      });
      showAlert(`Deleted ${result.deletedCount} log${result.deletedCount === 1 ? '' : 's'}.`, 'success');
      await loadApiLogsSection();
    } catch (error) {
      showAlert(error.message);
    } finally {
      adminApiLogsDeleteOlderBtn.disabled = false;
    }
  });

  adminApiLogsCleanAllBtn?.addEventListener('click', async () => {
    if (!window.confirm('Delete all API logs permanently?')) {
      return;
    }

    adminApiLogsCleanAllBtn.disabled = true;
    try {
      const result = await apiRequest('/api/admin/api-logs', { method: 'DELETE' });
      showAlert(`Deleted ${result.deletedCount} log${result.deletedCount === 1 ? '' : 's'}.`, 'success');
      await loadApiLogsSection();
    } catch (error) {
      showAlert(error.message);
    } finally {
      adminApiLogsCleanAllBtn.disabled = false;
    }
  });

  adminAuditAutoDeleteSaveBtn?.addEventListener('click', saveAuditAutoDeleteSettings);
  adminAuditCleanAllBtn?.addEventListener('click', async () => {
    if (!window.confirm('Delete all audit trail data permanently?')) {
      return;
    }

    adminAuditCleanAllBtn.disabled = true;
    try {
      const result = await apiRequest('/api/admin/audit-trails', { method: 'DELETE' });
      showAlert(`Deleted ${result.deletedCount} audit event${result.deletedCount === 1 ? '' : 's'}.`, 'success');
      await loadAuditSection();
    } catch (error) {
      showAlert(error.message);
    } finally {
      adminAuditCleanAllBtn.disabled = false;
    }
  });

  document.getElementById('adminMarketPlansGrid')?.addEventListener('click', async (event) => {
    const card = event.target.closest('[data-market-plan]');
    if (!card) return;

    const planKey = card.dataset.marketPlan;
    const addBtn = event.target.closest('[data-market-add-benefit]');
    if (addBtn) {
      const list = card.querySelector('[data-market-benefits-list]');
      list?.insertAdjacentHTML('beforeend', renderMarketBenefitRow(''));
      return;
    }

    const removeBtn = event.target.closest('[data-market-remove-benefit]');
    if (removeBtn) {
      const rows = card.querySelectorAll('.admin-market-benefit-row');
      if (rows.length <= 1) {
        showAlert('Each plan must keep at least one benefit.');
        return;
      }
      removeBtn.closest('.admin-market-benefit-row')?.remove();
      return;
    }

    const saveBtn = event.target.closest('[data-market-save]');
    if (saveBtn) {
      await saveMarketPlan(planKey, saveBtn);
    }
  });

  document.getElementById('adminMarketPlansGrid')?.addEventListener('input', (event) => {
    if (!event.target.matches('[data-market-price], [data-market-discount]')) {
      return;
    }
    const card = event.target.closest('[data-market-plan]');
    if (card) {
      updateMarketEffectivePrice(card);
    }
  });

  document.querySelectorAll('[data-market-panel]').forEach((button) => {
    if (!button.matches('.admin-market-subnav button')) return;
    button.addEventListener('click', () => {
      setActiveMarketPanel(button.dataset.marketPanel);
    });
  });

  document.getElementById('adminMarketAdsCreateBtn')?.addEventListener('click', () => {
    openMarketAdEditor(null);
  });

  document.getElementById('adminMarketAdsBackBtn')?.addEventListener('click', showMarketAdsListView);

  document.getElementById('adminMarketAdForm')?.addEventListener('submit', publishMarketAd);

  document.getElementById('adminMarketAdSaveDraftBtn')?.addEventListener('click', saveMarketAdDraft);

  document.getElementById('adminMarketAdAddProductBtn')?.addEventListener('click', addMarketAdProduct);

  document.getElementById('adminMarketAdTradeSearch')?.addEventListener('input', (event) => {
    window.clearTimeout(marketAdTradeSearchTimer);
    marketAdTradeSearchTimer = window.setTimeout(() => {
      searchMarketAdTrades(event.target.value);
    }, 250);
  });

  document.getElementById('adminMarketAdsTable')?.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-market-ad-edit]');
    if (editBtn) {
      openMarketAdEditor(editBtn.dataset.marketAdEdit);
      return;
    }
    const pauseBtn = event.target.closest('[data-market-ad-pause]');
    if (pauseBtn) {
      setMarketAdStatus(pauseBtn.dataset.marketAdPause, 'paused');
      return;
    }
    const activateBtn = event.target.closest('[data-market-ad-activate]');
    if (activateBtn) {
      setMarketAdStatus(activateBtn.dataset.marketAdActivate, 'active');
      return;
    }
    const deleteBtn = event.target.closest('[data-market-ad-delete]');
    if (deleteBtn) {
      deleteMarketAd(deleteBtn.dataset.marketAdDelete);
    }
  });

  document.getElementById('adminMarketAdsEditorView')?.addEventListener('click', (event) => {
    const removeProductBtn = event.target.closest('[data-market-ad-remove-product]');
    if (removeProductBtn) {
      removeMarketAdProduct(removeProductBtn.dataset.marketAdRemoveProduct);
      return;
    }
    const addTradeBtn = event.target.closest('[data-market-ad-add-trade]');
    if (addTradeBtn) {
      addMarketAdTrade(addTradeBtn.dataset.marketAdAddTrade);
      return;
    }
    const removeTradeBtn = event.target.closest('[data-market-ad-remove-trade]');
    if (removeTradeBtn) {
      removeMarketAdTrade(removeTradeBtn.dataset.marketAdRemoveTrade);
      return;
    }
    if (event.target.closest('[data-market-ad-preview-prev]')) {
      shiftMarketAdPreviewSlide(-1);
      return;
    }
    if (event.target.closest('[data-market-ad-preview-next]')) {
      shiftMarketAdPreviewSlide(1);
    }
  });

  document.getElementById('adminMarketAdsEditorView')?.addEventListener('change', (event) => {
    const imageInput = event.target.closest('[data-market-ad-product-image]');
    if (imageInput) {
      handleMarketAdProductImage(imageInput.dataset.marketAdProductImage, imageInput.files?.[0]);
      return;
    }
    if (event.target.matches('#adminMarketAdAllowOnTop, #adminMarketAdIsPaid')) {
      refreshMarketAdPreviewFromForm();
    }
  });

  document.getElementById('adminMarketAdsEditorView')?.addEventListener('input', (event) => {
    if (event.target.closest('[data-market-ad-product-title], [data-market-ad-product-description], [data-market-ad-product-price], [data-market-ad-product-link], #adminMarketAdClientName, #adminMarketAdActivityScope')) {
      refreshMarketAdPreviewFromForm();
    }
  });

  adminSalesTermsBtn?.addEventListener('click', async () => {
    try {
      await loadSalesTerms();
      openSalesTermsModal();
    } catch (error) {
      showAlert(error.message);
    }
  });

  adminSalesTermsModal?.querySelectorAll('[data-sales-terms-close]').forEach((button) => {
    button.addEventListener('click', closeSalesTermsModal);
  });

  adminSalesTermsModal?.querySelectorAll('[data-terms-cmd]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => applySalesTermsCommand(button.dataset.termsCmd));
  });

  adminSalesTermsModal?.querySelectorAll('[data-terms-block]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => applySalesTermsBlock(button.dataset.termsBlock));
  });

  adminSalesTermsSaveBtn?.addEventListener('click', saveSalesTerms);

  adminLogoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('sitecrewAdminToken');
    localStorage.removeItem('sitecrewAdminUser');
    document.cookie = 'sitecrewAdminToken=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/admin/login';
  });

  guardAdminSession()
    .then(() => loadSection('metrics'))
    .catch(() => window.location.replace('/admin/login'));
})();
