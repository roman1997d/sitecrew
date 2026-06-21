(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || 'http://localhost:4000';
  const SECTION_TITLES = {
    metrics: 'Metrics Tracker',
    users: 'Users',
    companies: 'Company Accounts',
    billing: 'Billing and Plans',
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
  let showApiLogsProblemsOnly = false;
  let cachedBillingAccounts = [];
  let billingSearchTimer = null;
  let showBillingExpiringOnly = false;
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
              <td><span class="admin-pill status-${escapeHtml(user.status)}">${escapeHtml(user.status)}</span></td>
              <td>${escapeHtml(formatRatingLabel(user.averageRating, user.reviewCount))}</td>
              <td>${escapeHtml(formatDate(user.created_at))}</td>
              <td class="admin-actions">
                ${renderStatusActionSelect(user.id)}
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

  function renderCompaniesTable(companies = [], emptyMessage = 'No companies found.') {
    const container = document.getElementById('adminCompaniesTable');
    if (!container) return;

    if (!companies.length) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Email</th>
            <th>Registered</th>
            <th>Verification</th>
            <th>User status</th>
            <th>Rating</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${companies.map((company) => {
            const logoMarkup = company.logo
              ? `<img src="${escapeHtml(getMediaUrl(company.logo))}" alt="">`
              : escapeHtml(getCompanyInitials(company.company_name));
            return `
            <tr class="admin-company-row" data-company-id="${escapeHtml(company.user_id)}">
              <td>
                <div class="admin-user-cell">
                  <span class="admin-user-thumb ${company.logo ? 'has-photo' : ''}">${logoMarkup}</span>
                  <span>${escapeHtml(company.company_name)}</span>
                </div>
              </td>
              <td>${escapeHtml(company.email)}</td>
              <td>${escapeHtml(formatDate(company.created_at))}</td>
              <td><span class="admin-pill verify-${escapeHtml(company.verification_status)}">${escapeHtml(company.verification_status)}</span></td>
              <td>${escapeHtml(company.user_status)}</td>
              <td>${escapeHtml(formatRatingLabel(company.average_rating, company.review_count))}</td>
              <td class="admin-actions">
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
  const adminCompaniesVerificationFilter = document.getElementById('adminCompaniesVerificationFilter');
  const adminCompaniesStatusFilter = document.getElementById('adminCompaniesStatusFilter');
  const adminCompaniesRatingFilter = document.getElementById('adminCompaniesRatingFilter');
  const adminCompaniesSort = document.getElementById('adminCompaniesSort');
  const adminCompaniesClearBtn = document.getElementById('adminCompaniesClearBtn');
  const adminCompaniesResultsMeta = document.getElementById('adminCompaniesResultsMeta');

  function getCompaniesFilterState() {
    return {
      search: adminCompaniesSearch?.value.trim().toLowerCase() || '',
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
    if (adminCompaniesVerificationFilter) adminCompaniesVerificationFilter.value = '';
    if (adminCompaniesStatusFilter) adminCompaniesStatusFilter.value = '';
    if (adminCompaniesRatingFilter) adminCompaniesRatingFilter.value = '';
    if (adminCompaniesSort) adminCompaniesSort.value = 'created_desc';
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
    }
    const reasonInput = document.getElementById('adminCompanyStatusReason');
    if (reasonInput) {
      reasonInput.placeholder = 'Explain why you are taking this action';
    }
  }

  function closeCompanyStatusReasonModal() {
    if (!adminCompanyStatusModal) return;
    adminCompanyStatusModal.hidden = true;
    resetPendingCompanyStatusSelect();
    pendingCompanyStatusChange = null;
    adminCompanyStatusForm?.reset();
    resetCompanyStatusReasonModalCopy();
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

    const { userId, status, source } = pendingCompanyStatusChange;

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
      } else if (source === 'billing') {
        await apiRequest(`/api/admin/billing/${userId}/pause`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        showAlert('Company account paused.', 'success');
        await loadBillingSection();
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

  function getPlanStateLabel(planState) {
    const labels = {
      free: 'Free',
      active: 'Active',
      expiring_soon: 'Expiring soon',
      expired: 'Expired',
    };
    return labels[planState] || planState;
  }

  function renderBillingTable(accounts = [], emptyMessage = 'No billing accounts found.') {
    const container = document.getElementById('adminBillingTable');
    if (!container) return;

    if (!accounts.length) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Email</th>
            <th>Plan</th>
            <th>Purchased</th>
            <th>Expires</th>
            <th>Plan status</th>
            <th>Account</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map((account) => {
            const canRemind = account.plan !== 'free'
              && account.expiresAt
              && account.planState !== 'expired';
            const isPaused = account.userStatus === 'paused';
            return `
            <tr>
              <td>${escapeHtml(account.companyName)}</td>
              <td>${escapeHtml(account.email)}</td>
              <td><span class="admin-pill">${escapeHtml(account.plan)}</span></td>
              <td>${escapeHtml(formatDate(account.purchasedAt))}</td>
              <td>${escapeHtml(account.expiresAt ? formatDate(account.expiresAt) : '—')}</td>
              <td><span class="admin-pill plan-${escapeHtml(account.planState)}">${escapeHtml(getPlanStateLabel(account.planState))}</span></td>
              <td><span class="admin-pill status-${escapeHtml(account.userStatus)}">${escapeHtml(account.userStatus)}</span></td>
              <td class="admin-billing-actions">
                <button
                  type="button"
                  data-billing-remind="${escapeHtml(account.companyId)}"
                  ${canRemind ? '' : 'disabled'}
                >
                  Remind expiry
                </button>
                <button
                  type="button"
                  class="admin-danger-btn"
                  data-billing-pause="${escapeHtml(account.companyId)}"
                  ${isPaused ? 'disabled' : ''}
                >
                  Pause account
                </button>
              </td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  const adminBillingSearch = document.getElementById('adminBillingSearch');
  const adminBillingPlanFilter = document.getElementById('adminBillingPlanFilter');
  const adminBillingExpiringBtn = document.getElementById('adminBillingExpiringBtn');
  const adminBillingClearBtn = document.getElementById('adminBillingClearBtn');
  const adminBillingResultsMeta = document.getElementById('adminBillingResultsMeta');

  function getBillingFilterState() {
    return {
      search: adminBillingSearch?.value.trim().toLowerCase() || '',
      plan: adminBillingPlanFilter?.value || '',
      expiringOnly: showBillingExpiringOnly,
    };
  }

  function billingMatchesSearch(account, search) {
    if (!search) return true;
    const haystack = [
      account.companyId,
      account.companyName,
      account.email,
      account.plan,
      account.userStatus,
      account.planState,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  }

  function filterBillingAccounts(accounts = []) {
    const filters = getBillingFilterState();
    return accounts.filter((account) => {
      if (filters.plan && account.plan !== filters.plan) return false;
      if (filters.expiringOnly && account.planState !== 'expiring_soon') return false;
      return billingMatchesSearch(account, filters.search);
    });
  }

  function updateBillingResultsMeta(visibleCount, totalCount) {
    if (!adminBillingResultsMeta) return;
    if (!totalCount) {
      adminBillingResultsMeta.textContent = 'No company billing accounts yet.';
      return;
    }
    if (visibleCount === totalCount) {
      adminBillingResultsMeta.textContent = `Showing ${totalCount} billing account${totalCount === 1 ? '' : 's'}.`;
      return;
    }
    adminBillingResultsMeta.textContent = `Showing ${visibleCount} of ${totalCount} billing accounts.`;
  }

  function applyBillingView() {
    const filteredAccounts = filterBillingAccounts(cachedBillingAccounts);
    updateBillingResultsMeta(filteredAccounts.length, cachedBillingAccounts.length);
    renderBillingTable(
      filteredAccounts,
      cachedBillingAccounts.length ? 'No billing accounts match your filters.' : 'No billing accounts found.'
    );
  }

  function setCachedBillingAccounts(accounts = []) {
    cachedBillingAccounts = accounts;
    applyBillingView();
  }

  function clearBillingFilters() {
    if (adminBillingSearch) adminBillingSearch.value = '';
    if (adminBillingPlanFilter) adminBillingPlanFilter.value = '';
    showBillingExpiringOnly = false;
    if (adminBillingExpiringBtn) {
      adminBillingExpiringBtn.classList.remove('is-active');
      adminBillingExpiringBtn.setAttribute('aria-pressed', 'false');
    }
    applyBillingView();
  }

  async function loadBillingSection() {
    const data = await apiRequest('/api/admin/billing');
    setCachedBillingAccounts(data.accounts);
    return data;
  }

  async function sendBillingExpiryReminder(companyId, button) {
    button.disabled = true;
    try {
      await apiRequest(`/api/admin/billing/${companyId}/remind-expiry`, { method: 'POST' });
      showAlert('Expiry reminder sent to company.', 'success');
    } catch (error) {
      showAlert(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function pauseBillingAccount(companyId, button) {
    pendingCompanyStatusChange = {
      userId: companyId,
      status: 'paused',
      select: null,
      source: 'billing',
      button,
    };
    openCompanyStatusReasonModal('paused', companyId);
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
    if (section === 'billing') {
      await loadBillingSection();
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

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
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

  adminCompaniesVerificationFilter?.addEventListener('change', applyCompaniesView);
  adminCompaniesStatusFilter?.addEventListener('change', applyCompaniesView);
  adminCompaniesRatingFilter?.addEventListener('change', applyCompaniesView);
  adminCompaniesSort?.addEventListener('change', applyCompaniesView);
  adminCompaniesClearBtn?.addEventListener('click', clearCompaniesFilters);

  document.getElementById('adminCompaniesTable')?.addEventListener('click', async (event) => {
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

  adminBillingSearch?.addEventListener('input', () => {
    window.clearTimeout(billingSearchTimer);
    billingSearchTimer = window.setTimeout(applyBillingView, 200);
  });

  adminBillingPlanFilter?.addEventListener('change', applyBillingView);

  adminBillingExpiringBtn?.addEventListener('click', () => {
    showBillingExpiringOnly = !showBillingExpiringOnly;
    adminBillingExpiringBtn.classList.toggle('is-active', showBillingExpiringOnly);
    adminBillingExpiringBtn.setAttribute('aria-pressed', showBillingExpiringOnly ? 'true' : 'false');
    applyBillingView();
  });

  adminBillingClearBtn?.addEventListener('click', clearBillingFilters);

  document.getElementById('adminBillingTable')?.addEventListener('click', async (event) => {
    const remindBtn = event.target.closest('[data-billing-remind]');
    if (remindBtn) {
      await sendBillingExpiryReminder(remindBtn.dataset.billingRemind, remindBtn);
      return;
    }

    const pauseBtn = event.target.closest('[data-billing-pause]');
    if (pauseBtn) {
      await pauseBillingAccount(pauseBtn.dataset.billingPause, pauseBtn);
    }
  });

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
