(function () {
  const API_BASE_URL = window.SITECREW_API_BASE_URL || 'http://localhost:4000';

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

  const logoutBtn = document.getElementById('companyLogoutBtn');
  const postJobModal = document.getElementById('postJobModal');
  const openPostJobModalBtn = document.getElementById('openPostJobModal');
  const closePostJobModalBtn = document.getElementById('closePostJobModal');
  const cancelPostJobBtn = document.getElementById('cancelPostJob');
  const postJobForm = document.getElementById('postJobForm');
  const postJobAlert = document.getElementById('postJobAlert');
  const constructionTradeOptions = document.getElementById('constructionTradeOptions');
  const workerTradeOptions = document.getElementById('workerTradeOptions');
  const workerSearchForm = document.getElementById('workerSearchForm');
  const workerResults = document.getElementById('workerResults');
  const workerSearchStatus = document.getElementById('workerSearchStatus');
  const workerSearchModeButtons = document.querySelectorAll('[data-worker-search-mode]');
  const workerProfileModal = document.getElementById('workerProfileModal');
  const closeWorkerProfileModalBtn = document.getElementById('closeWorkerProfileModal');
  const closeWorkerProfileFooterBtn = document.getElementById('closeWorkerProfileFooter');
  const workerProfileContent = document.getElementById('workerProfileContent');
  const inviteWorkerModal = document.getElementById('inviteWorkerModal');
  const closeInviteWorkerModalBtn = document.getElementById('closeInviteWorkerModal');
  const cancelInviteWorkerBtn = document.getElementById('cancelInviteWorker');
  const inviteWorkerForm = document.getElementById('inviteWorkerForm');
  const inviteWorkerAlert = document.getElementById('inviteWorkerAlert');
  const inviteWorkerCopy = document.getElementById('inviteWorkerCopy');
  const inviteWorkerJobList = document.getElementById('inviteWorkerJobList');
  const companyPostModal = document.getElementById('companyPostModal');
  const closeCompanyPostModalBtn = document.getElementById('closeCompanyPostModal');
  const cancelCompanyPostBtn = document.getElementById('cancelCompanyPost');
  const companyPostForm = document.getElementById('companyPostForm');
  const companyPostAlert = document.getElementById('companyPostAlert');
  const companyStoryModal = document.getElementById('companyStoryModal');
  const closeCompanyStoryModalBtn = document.getElementById('closeCompanyStoryModal');
  const cancelCompanyStoryBtn = document.getElementById('cancelCompanyStory');
  const companyStoryForm = document.getElementById('companyStoryForm');
  const companyStoryAlert = document.getElementById('companyStoryAlert');
  const companyNotificationsModal = document.getElementById('companyNotificationsModal');
  const openCompanyNotificationsBtn = document.getElementById('openCompanyNotifications');
  const closeCompanyNotificationsBtn = document.getElementById('closeCompanyNotifications');
  const companyNotificationsList = document.getElementById('companyNotificationsList');
  const companyNotificationBadge = document.getElementById('companyNotificationBadge');
  const companyAlertsCount = document.getElementById('companyAlertsCount');
  const companySideNotificationsList = document.getElementById('companySideNotificationsList');
  const companyMessagesModal = document.getElementById('companyMessagesModal');
  const openCompanyMessagesBtn = document.getElementById('openCompanyMessages');
  const closeCompanyMessagesBtn = document.getElementById('closeCompanyMessages');
  const companyConversationList = document.getElementById('companyConversationList');
  const companyThreadHeader = document.getElementById('companyThreadHeader');
  const companyThreadMessages = document.getElementById('companyThreadMessages');
  const companyThreadForm = document.getElementById('companyThreadForm');
  const contactsJournalModal = document.getElementById('contactsJournalModal');
  const openContactsJournalBtn = document.getElementById('openContactsJournal');
  const closeContactsJournalBtn = document.getElementById('closeContactsJournal');
  const contactsJournalList = document.getElementById('contactsJournalList');
  const contactJournalNameSearch = document.getElementById('contactJournalNameSearch');
  const contactJournalCitySearch = document.getElementById('contactJournalCitySearch');
  const contactJournalStatusFilter = document.getElementById('contactJournalStatusFilter');
  const contactJournalTradeFilter = document.getElementById('contactJournalTradeFilter');
  const contactMessageModal = document.getElementById('contactMessageModal');
  const closeContactMessageModalBtn = document.getElementById('closeContactMessageModal');
  const cancelContactMessageBtn = document.getElementById('cancelContactMessage');
  const contactMessageForm = document.getElementById('contactMessageForm');
  const contactMessageAlert = document.getElementById('contactMessageAlert');
  const contactAvatarQuickview = document.getElementById('contactAvatarQuickview');
  const closeContactAvatarQuickviewBtn = document.getElementById('closeContactAvatarQuickview');
  const cancelContactAvatarQuickviewBtn = document.getElementById('cancelContactAvatarQuickview');
  const contactAvatarQuickviewTitle = document.getElementById('contactAvatarQuickviewTitle');
  const contactAvatarQuickviewBody = document.getElementById('contactAvatarQuickviewBody');
  const companySettingsForm = document.getElementById('companySettingsForm');
  const companySettingsAlert = document.getElementById('companySettingsAlert');
  const companySettingsLogoPreview = document.getElementById('companySettingsLogoPreview');
  const applicantJobFilter = document.getElementById('applicantJobFilter');

  let currentCompanyId = null;
  let companyOpenJobsCache = null;
  let pendingInviteWorker = null;
  let editingJobId = null;
  let contactsJournalCache = [];
  let pendingContactMessage = null;
  let companyConversationsCache = [];
  let activeCompanyConversationId = null;
  const COMPANY_MESSAGES_POLL_MS = 5000;
  let tradeSearchTimer = null;
  let workerTradeSearchTimer = null;

  function getCookie(name) {
    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');
  }

  async function guardCompanySession() {
    const token = localStorage.getItem('sitecrewToken') || decodeURIComponent(getCookie('sitecrewToken') || '');

    if (!token) {
      window.location.replace('/login');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Invalid session');

      const session = await response.json();
      currentCompanyId = session.user.id;
      if (session.user.role !== 'company') {
        window.location.replace('/');
      }
    } catch (error) {
      localStorage.removeItem('sitecrewToken');
      localStorage.removeItem('sitecrewUser');
      document.cookie = 'sitecrewToken=; path=/; max-age=0; SameSite=Lax';
      window.location.replace('/login');
    }
  }

  function getToken() {
    return localStorage.getItem('sitecrewToken') || decodeURIComponent(getCookie('sitecrewToken') || '');
  }

  async function clearAuthSession() {
    localStorage.removeItem('sitecrewToken');
    localStorage.removeItem('sitecrewUser');
    document.cookie = 'sitecrewToken=; path=/; max-age=0; SameSite=Lax';

    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      // Continue to login even if the logout request fails.
    }
  }

  function openPostJobModal() {
    if (!postJobModal) return;
    editingJobId = null;
    postJobForm?.reset();
    const submitBtn = postJobForm?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Post Job';
    const eyebrow = postJobModal.querySelector('.company-modal-header span');
    const title = postJobModal.querySelector('#postJobTitle');
    if (eyebrow) eyebrow.textContent = 'New job';
    if (title) title.textContent = 'Post a job';
    postJobModal.classList.add('open');
    postJobModal.setAttribute('aria-hidden', 'false');
    postJobAlert.hidden = true;
    preparePostJobModal('');
    postJobForm?.querySelector('input[name="title"]')?.focus();
  }

  function setField(form, name, value) {
    const field = form?.elements[name];
    if (field) field.value = value || '';
  }

  function openEditJobModal(card) {
    if (!postJobModal || !postJobForm || !card) return;

    editingJobId = card.dataset.jobId;
    setField(postJobForm, 'title', card.dataset.title);
    setField(postJobForm, 'tradeRequired', card.dataset.tradeRequired);
    setField(postJobForm, 'city', card.dataset.city);
    setField(postJobForm, 'postcode', card.dataset.postcode);
    setField(postJobForm, 'rate', card.dataset.rate);
    setField(postJobForm, 'startDate', card.dataset.startDate);
    setField(postJobForm, 'duration', card.dataset.duration);
    setField(postJobForm, 'workersRequired', card.dataset.workersRequired || '1');
    setField(postJobForm, 'description', card.dataset.description);
    setField(postJobForm, 'certificatesRequired', card.dataset.certificatesRequired);

    const submitBtn = postJobForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save changes';
    const eyebrow = postJobModal.querySelector('.company-modal-header span');
    const title = postJobModal.querySelector('#postJobTitle');
    if (eyebrow) eyebrow.textContent = 'Edit job';
    if (title) title.textContent = 'Edit job post';
    postJobAlert.hidden = true;
    postJobModal.classList.add('open');
    postJobModal.setAttribute('aria-hidden', 'false');
    preparePostJobModal(card.dataset.shareImage || '');
    postJobForm.querySelector('input[name="title"]')?.focus();
  }

  function closePostJobModal() {
    if (!postJobModal) return;
    postJobModal.classList.remove('open');
    postJobModal.setAttribute('aria-hidden', 'true');
  }

  function openWorkerProfileModal() {
    if (!workerProfileModal) return;
    workerProfileModal.classList.add('open');
    workerProfileModal.setAttribute('aria-hidden', 'false');
  }

  function closeWorkerProfileModal() {
    if (!workerProfileModal) return;
    workerProfileModal.classList.remove('open');
    workerProfileModal.setAttribute('aria-hidden', 'true');
  }

  function closeInviteWorkerModal() {
    if (!inviteWorkerModal) return;
    inviteWorkerModal.classList.remove('open');
    inviteWorkerModal.setAttribute('aria-hidden', 'true');
    pendingInviteWorker = null;
  }

  function openModal(modal, alertBox, focusSelector) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (alertBox) alertBox.hidden = true;
    if (focusSelector) modal.querySelector(focusSelector)?.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function setPostJobAlert(message, type = 'error') {
    postJobAlert.textContent = message;
    postJobAlert.dataset.type = type;
    postJobAlert.hidden = false;
  }

  function setAlert(alertBox, message, type = 'error') {
    alertBox.textContent = message;
    alertBox.dataset.type = type;
    alertBox.hidden = false;
  }

  function renderTradeOptions(datalistEl, trades) {
    if (!datalistEl) return;
    datalistEl.innerHTML = trades.map((trade) => (
      `<option value="${escapeHtml(trade.name)}">${escapeHtml(trade.category || 'Construction trade')}</option>`
    )).join('');
  }

  function renderConstructionTradeOptions(trades) {
    renderTradeOptions(constructionTradeOptions, trades);
  }

  function renderWorkerTradeOptions(trades) {
    renderTradeOptions(workerTradeOptions, trades);
  }

  function parseCsv(value) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  let cachedJobOgPresets = [];

  function getJobOgImageUrl(imagePath = '') {
    const value = String(imagePath || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return value.startsWith('/') ? value : `/${value}`;
  }

  function updatePostJobOgPreview(imagePath = '') {
    const hiddenInput = document.getElementById('postJobShareImage');
    const pathInput = document.getElementById('postJobShareImagePath');
    const preview = document.getElementById('postJobOgPreview');
    const previewImg = document.getElementById('postJobOgPreviewImg');
    const normalized = getJobOgImageUrl(imagePath);

    if (hiddenInput) hiddenInput.value = normalized;
    if (pathInput && document.activeElement !== pathInput) {
      pathInput.value = normalized;
    }

    document.querySelectorAll('[data-job-og-preset]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.jobOgPreset === normalized);
    });

    if (!preview || !previewImg) return;
    if (!normalized) {
      preview.hidden = true;
      previewImg.removeAttribute('src');
      return;
    }

    preview.hidden = false;
    previewImg.src = normalized;
    previewImg.alt = 'Social share preview';
  }

  async function loadJobOgPresets() {
    const container = document.getElementById('postJobOgPresets');
    if (!container) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/og-presets`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load share images.');
      cachedJobOgPresets = data.presets || [];
    } catch (error) {
      cachedJobOgPresets = [];
    }

    if (!cachedJobOgPresets.length) {
      container.innerHTML = '<p class="company-side-empty">No preset images yet. Upload a custom image or leave blank to use your company logo.</p>';
      return;
    }

    container.innerHTML = cachedJobOgPresets.map((preset) => `
      <button type="button" class="company-og-preset-btn" data-job-og-preset="${escapeHtml(preset.path)}" title="${escapeHtml(preset.label)}">
        <img src="${escapeHtml(preset.path)}" alt="${escapeHtml(preset.label)}" loading="lazy">
        <span>${escapeHtml(preset.label)}</span>
      </button>
    `).join('');
  }

  async function uploadJobShareImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/api/jobs/share-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Could not upload share image.');
    }
    return data.path;
  }

  async function preparePostJobModal(shareImage = '') {
    await loadJobOgPresets();
    updatePostJobOgPreview(shareImage);
  }

  async function submitJob(payload) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/jobs${editingJobId ? `/${editingJobId}` : ''}`, {
      method: editingJobId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const validationMessage = data.issues
        ?.map((issue) => `${issue.path.replace('body.', '')}: ${issue.message}`)
        .join('\n');
      throw new Error(validationMessage || data.error || 'Could not save job. Please try again.');
    }

    return data;
  }

  async function updateCompanyJobStatus(jobId, status) {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not update this hiring request.');
    }

    return data.job;
  }

  async function deleteCompanyJob(jobId) {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not delete this hiring request.');
    }

    return data;
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

  async function uploadCompanyLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetch(`${API_BASE_URL}/api/companies/me/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not upload company logo.');
    }

    return data.logo;
  }

  async function updateCompanySettings(payload) {
    const response = await fetch(`${API_BASE_URL}/api/companies/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const validationMessage = data.issues
        ?.map((issue) => `${issue.path.replace('body.', '')}: ${issue.message}`)
        .join('\n');
      throw new Error(validationMessage || data.error || 'Could not save company settings.');
    }

    return data.profile;
  }

  async function uploadMedia(path, files) {
    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed.');
    }

    return data;
  }

  async function createCompanyPost(payload) {
    return saveCompanyPost(null, payload);
  }

  async function saveCompanyPost(postId, payload) {
    const response = await fetch(`${API_BASE_URL}/api/feed/posts${postId ? `/${postId}` : ''}`, {
      method: postId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not create post.');
    }

    return data.post;
  }

  async function deleteCompanyPost(postId) {
    const response = await fetch(`${API_BASE_URL}/api/feed/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not delete post.');
    }

    return data;
  }

  function setCompanyPostType(postType) {
    if (!companyPostForm) return;
    const value = postType || 'work_completed';
    const radios = companyPostForm.querySelectorAll('input[name="postType"]');
    let matched = false;
    radios.forEach((radio) => {
      radio.checked = radio.value === value;
      if (radio.checked) matched = true;
    });
    if (!matched && radios[0]) radios[0].checked = true;
  }

  function openCreateCompanyPostModal() {
    companyPostForm?.reset();
    if (companyPostForm?.elements.postId) companyPostForm.elements.postId.value = '';
    setCompanyPostType('work_completed');
    setCompanyPostSelectedFiles([]);
    const submitBtn = companyPostForm?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Publish to portfolio';
    const title = document.getElementById('companyPostTitle');
    if (title) title.textContent = 'Add portfolio item';
    const eyebrow = companyPostModal?.querySelector('.company-modal-header span');
    if (eyebrow) eyebrow.textContent = 'Company portfolio';
    openModal(companyPostModal, companyPostAlert, 'input[name="title"]');
  }

  function openEditCompanyPostModal(card) {
    if (!companyPostForm || !card) return;
    companyPostForm.reset();
    companyPostForm.elements.postId.value = card.dataset.postId || '';
    companyPostForm.elements.title.value = card.dataset.title || '';
    companyPostForm.elements.description.value = card.dataset.caption || '';
    companyPostForm.elements.tags.value = card.dataset.tags || '';
    if (companyPostForm.elements.location) {
      companyPostForm.elements.location.value = card.dataset.location || '';
    }
    if (companyPostForm.elements.projectSize) {
      companyPostForm.elements.projectSize.value = card.dataset.projectSize || '';
    }
    setCompanyPostType(card.dataset.postType || 'work_completed');
    setCompanyPostSelectedFiles([]);
    const submitBtn = companyPostForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save changes';
    const title = document.getElementById('companyPostTitle');
    if (title) title.textContent = 'Edit portfolio item';
    const eyebrow = companyPostModal?.querySelector('.company-modal-header span');
    if (eyebrow) eyebrow.textContent = 'Company portfolio';
    openModal(companyPostModal, companyPostAlert, 'input[name="title"]');
  }

  async function createCompanyStory(payload) {
    const response = await fetch(`${API_BASE_URL}/api/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not create story.');
    }

    return data.story;
  }

  const PORTFOLIO_MAX_IMAGES = 3;
  const companyPostMediaInput = document.getElementById('companyPostMediaInput');
  const companyPostMediaPreview = document.getElementById('companyPostMediaPreview');
  let companyPostSelectedFiles = [];
  const companyPostPreviewUrls = new Set();

  function revokeCompanyPostPreviewUrls() {
    companyPostPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    companyPostPreviewUrls.clear();
  }

  function syncCompanyPostMediaInput() {
    if (!companyPostMediaInput) return;
    const transfer = new DataTransfer();
    companyPostSelectedFiles.forEach((file) => transfer.items.add(file));
    companyPostMediaInput.files = transfer.files;
  }

  function renderCompanyPostMediaPreview() {
    if (!companyPostMediaPreview) return;
    revokeCompanyPostPreviewUrls();

    if (!companyPostSelectedFiles.length) {
      companyPostMediaPreview.hidden = true;
      companyPostMediaPreview.innerHTML = '';
      return;
    }

    companyPostMediaPreview.hidden = false;
    companyPostMediaPreview.innerHTML = companyPostSelectedFiles.map((file, index) => {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      companyPostPreviewUrls.add(url);
      return `
        <article class="company-media-thumb" data-media-index="${index}">
          ${isVideo
            ? `<video src="${url}" muted playsinline></video><span class="company-media-thumb-badge">Video</span>`
            : `<img src="${url}" alt="${escapeHtml(file.name)}">`}
          <button type="button" class="company-media-thumb-remove" data-remove-media-index="${index}" aria-label="Remove ${escapeHtml(file.name)}">
            <i class="bi bi-x-lg"></i>
          </button>
          <small>${escapeHtml(file.name)}</small>
        </article>
      `;
    }).join('');
  }

  function setCompanyPostSelectedFiles(files) {
    companyPostSelectedFiles = Array.from(files || []);
    syncCompanyPostMediaInput();
    renderCompanyPostMediaPreview();
  }

  function validatePostMedia(files) {
    if (!files.length) return;

    const images = files.filter((file) => file.type.startsWith('image/'));
    const videos = files.filter((file) => file.type.startsWith('video/'));

    if (videos.length && files.length > 1) {
      throw new Error('Upload either one video or up to 3 photos.');
    }

    if (videos.length > 1) {
      throw new Error('Only one video is allowed.');
    }

    if (images.length > PORTFOLIO_MAX_IMAGES) {
      throw new Error(`Maximum ${PORTFOLIO_MAX_IMAGES} photos are allowed.`);
    }

    if (images.length + videos.length !== files.length) {
      throw new Error('Only pictures or videos are allowed.');
    }
  }

  companyPostMediaInput?.addEventListener('change', () => {
    const incoming = Array.from(companyPostMediaInput.files || []);
    if (!incoming.length) {
      setCompanyPostSelectedFiles([]);
      return;
    }

    try {
      const merged = [];
      const existingKeys = new Set(
        companyPostSelectedFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      );

      companyPostSelectedFiles.forEach((file) => merged.push(file));
      incoming.forEach((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (!existingKeys.has(key)) {
          merged.push(file);
          existingKeys.add(key);
        }
      });

      validatePostMedia(merged);
      if (merged.length > PORTFOLIO_MAX_IMAGES && !merged.some((file) => file.type.startsWith('video/'))) {
        throw new Error(`Maximum ${PORTFOLIO_MAX_IMAGES} photos are allowed.`);
      }

      setCompanyPostSelectedFiles(merged.slice(0, merged.some((file) => file.type.startsWith('video/')) ? 1 : PORTFOLIO_MAX_IMAGES));
    } catch (error) {
      alert(error.message);
      syncCompanyPostMediaInput();
    }
  });

  companyPostMediaPreview?.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-remove-media-index]');
    if (!removeBtn) return;
    const index = Number(removeBtn.dataset.removeMediaIndex);
    if (!Number.isInteger(index)) return;
    companyPostSelectedFiles = companyPostSelectedFiles.filter((_, itemIndex) => itemIndex !== index);
    syncCompanyPostMediaInput();
    renderCompanyPostMediaPreview();
  });

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

  async function validateStoryMedia(file) {
    if (!file) {
      throw new Error('Please upload one story picture or video.');
    }

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

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatJournalDate(value) {
    if (!value) return 'Saved recently';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Saved recently';

    return `Added ${date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  function renderWorker(worker) {
    const name = worker.full_name || 'Worker';
    const trades = Array.isArray(worker.trades) && worker.trades.length ? worker.trades.join(', ') : 'Trade not set';
    const location = [worker.city, worker.postcode].filter(Boolean).join(', ') || 'Location not set';
    const availability = worker.availability_status || 'Availability not set';
    const experience = worker.experience || 'Experience not set';
    const qualifications = Array.isArray(worker.qualifications) && worker.qualifications.length
      ? worker.qualifications.join(', ')
      : (Array.isArray(worker.certificates) && worker.certificates.length ? worker.certificates.join(', ') : 'Qualifications not set');
    const rating = Number(worker.average_rating || 0);
    const score = Number(worker.match_score || 0);
    const alreadyHired = Boolean(worker.is_already_hired);
    const actions = alreadyHired
      ? `
        <div class="company-worker-actions">
          <span class="company-worker-hired-badge"><i class="bi bi-check-circle-fill"></i> This worker already working for you</span>
          <button type="button" class="ghost" data-view-recommended-worker-profile data-worker-id="${escapeHtml(worker.user_id)}">
            <i class="bi bi-person-badge"></i> View Profile
          </button>
          <button type="button" class="ghost" data-send-worker-message data-worker-id="${escapeHtml(worker.user_id)}" data-worker-name="${escapeHtml(name)}">
            <i class="bi bi-chat-dots"></i> Send message
          </button>
        </div>
      `
      : `
        <div class="company-worker-actions">
          <button type="button" data-invite-worker-job data-worker-id="${escapeHtml(worker.user_id)}" data-worker-name="${escapeHtml(name)}">Invite to job</button>
          <button type="button" class="ghost" data-view-recommended-worker-profile data-worker-id="${escapeHtml(worker.user_id)}">
            <i class="bi bi-person-badge"></i> View Profile
          </button>
          <button type="button" class="ghost" data-send-worker-message data-worker-id="${escapeHtml(worker.user_id)}" data-worker-name="${escapeHtml(name)}">
            <i class="bi bi-chat-dots"></i> Send message
          </button>
        </div>
      `;

    return `
      <article class="company-worker-card">
        <div class="company-card-row">
          <div class="company-worker-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
          <span class="match-score">${score}% match</span>
        </div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(trades)}</p>
        <small><i class="bi bi-geo-alt"></i> ${escapeHtml(location)} · ${escapeHtml(experience)} · ${escapeHtml(availability)}</small>
        <small><i class="bi bi-award"></i> ${escapeHtml(qualifications)}</small>
        <small><i class="bi bi-star-fill"></i> ${rating ? `${rating.toFixed(1)} rating` : 'No rating yet'}</small>
        ${actions}
      </article>
    `;
  }

  function setWorkerSearchStatus(message, type = 'info') {
    if (!workerSearchStatus) return;
    workerSearchStatus.textContent = message;
    workerSearchStatus.dataset.type = type;
    workerSearchStatus.hidden = false;
  }

  function refreshApplicantsEmptyState() {
    const applicantsList = document.querySelector('#applicants .company-applicant-list');
    if (!applicantsList || applicantsList.querySelector('[data-application-row]')) {
      updateApplicantJobFilter();
      return;
    }

    applicantsList.innerHTML = `
      <div class="company-empty-inline">
        <strong>No applicants yet</strong>
        <span>Applicants will appear here after workers apply to your jobs.</span>
      </div>
    `;
  }

  function updateApplicantJobFilter() {
    const rows = Array.from(document.querySelectorAll('[data-application-row]'));
    const emptyState = document.querySelector('[data-applicant-filter-empty]');
    const selectedJob = applicantJobFilter?.value || '';
    let visibleCount = 0;

    rows.forEach((row) => {
      const matchesJob = !selectedJob || row.dataset.jobTitle === selectedJob;
      row.hidden = !matchesJob;
      row.style.display = matchesJob ? '' : 'none';
      if (matchesJob) visibleCount += 1;
    });

    if (emptyState) {
      const shouldShowEmpty = selectedJob && visibleCount === 0 && rows.length > 0;
      emptyState.hidden = !shouldShowEmpty;
      emptyState.style.display = shouldShowEmpty ? '' : 'none';
    }
  }

  function refreshTeamGroupEmptyState(groupName) {
    const grid = document.querySelector(`[data-team-grid="${groupName}"]`);
    const group = document.querySelector(`[data-team-group="${groupName}"]`);
    if (!grid || !group) return;

    const cards = grid.querySelectorAll('[data-team-worker-card]');
    const existingEmpty = grid.querySelector(`[data-team-empty="${groupName}"]`);
    const count = cards.length;
    const countEl = group.querySelector('.company-team-group-header small');
    if (countEl) countEl.textContent = `${count} active`;

    if (count > 0) {
      existingEmpty?.remove();
      return;
    }

    if (!existingEmpty) {
      grid.insertAdjacentHTML('beforeend', groupName === 'leaders'
        ? `
          <article class="company-empty-card" data-team-empty="leaders">
            <strong>No leaders yet</strong>
            <p>Give a worker company permissions to move them here.</p>
          </article>
        `
        : `
          <article class="company-empty-card" data-team-empty="operatives">
            <strong>No operatives yet</strong>
            <p>Hired workers without company permissions will appear here.</p>
          </article>
        `);
    }
  }

  function moveTeamCardByPermissions(card, permissions) {
    if (!card) return;

    const isLeader = Boolean(permissions.canPostJobs || permissions.canPostCompanyPosts);
    const targetGroup = isLeader ? 'leaders' : 'operatives';
    const sourceGrid = card.closest('[data-team-grid]');
    const targetGrid = document.querySelector(`[data-team-grid="${targetGroup}"]`);
    const roleLabel = card.querySelector('[data-team-role-label]');

    card.dataset.canPostJobs = permissions.canPostJobs ? 'true' : 'false';
    card.dataset.canPostCompanyPosts = permissions.canPostCompanyPosts ? 'true' : 'false';

    if (roleLabel) {
      roleLabel.textContent = isLeader ? 'Leader' : 'Operative';
      roleLabel.className = `company-status ${isLeader ? 'review' : 'open'}`;
    }

    if (targetGrid && sourceGrid !== targetGrid) {
      targetGrid.querySelector(`[data-team-empty="${targetGroup}"]`)?.remove();
      targetGrid.appendChild(card);
    }

    refreshTeamGroupEmptyState('leaders');
    refreshTeamGroupEmptyState('operatives');
  }

  async function searchWorkers(formData) {
    const params = new URLSearchParams();
    ['mode', 'trade', 'location', 'experience', 'qualification', 'availability', 'rating', 'sort'].forEach((key) => {
      const value = formData.get(key)?.trim();
      if (value) params.set(key, value);
    });

    const response = await fetch(`${API_BASE_URL}/api/workers/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not search workers.');
    }

    return data.workers || [];
  }

  async function fetchCompanyOpenJobs() {
    if (companyOpenJobsCache) return companyOpenJobsCache;
    if (!currentCompanyId) {
      throw new Error('Company session is still loading. Please try again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/jobs?status=open`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not load your open jobs.');
    }

    companyOpenJobsCache = (data.jobs || []).filter((job) => Number(job.company_id) === Number(currentCompanyId));
    return companyOpenJobsCache;
  }

  function renderInviteJobs(jobs) {
    if (!inviteWorkerJobList) return;

    if (!jobs.length) {
      inviteWorkerJobList.innerHTML = `
        <article class="company-empty-card">
          <strong>No active jobs</strong>
          <p>Post an open job before inviting workers.</p>
        </article>
      `;
      return;
    }

    inviteWorkerJobList.innerHTML = jobs.map((job, index) => `
      <label class="company-invite-job-option">
        <input type="checkbox" name="jobId" value="${escapeHtml(job.id)}" ${index === 0 ? 'checked' : ''}>
        <span class="company-invite-check"></span>
        <span>
          <strong>${escapeHtml(job.title || 'Open job')}</strong>
          <small>${escapeHtml([job.city, job.postcode, job.trade_required].filter(Boolean).join(' · ') || 'Location not set')}</small>
          ${job.rate ? `<small><i class="bi bi-cash-stack"></i> ${escapeHtml(job.rate)}</small>` : ''}
        </span>
      </label>
    `).join('');
  }

  async function openInviteWorkerModal(workerId, workerName) {
    if (!inviteWorkerModal || !inviteWorkerJobList) return;

    pendingInviteWorker = { id: workerId, name: workerName || 'worker' };
    inviteWorkerModal.classList.add('open');
    inviteWorkerModal.setAttribute('aria-hidden', 'false');
    if (inviteWorkerAlert) inviteWorkerAlert.hidden = true;
    const submitBtn = inviteWorkerForm?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send invite';
    }
    if (inviteWorkerCopy) {
      inviteWorkerCopy.textContent = `Select the active job you want to offer to ${pendingInviteWorker.name}.`;
    }
    inviteWorkerJobList.innerHTML = '<p class="company-side-empty">Loading active jobs...</p>';

    try {
      renderInviteJobs(await fetchCompanyOpenJobs());
    } catch (error) {
      inviteWorkerJobList.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
    }
  }

  async function inviteWorkerToJob(workerId, jobId) {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ workerId: Number(workerId) }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not send job invite.');
    }

    return data.notification;
  }

  async function fetchCompanyNotifications() {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not load notifications.');
    }

    return data.notifications || [];
  }

  async function markCompanyNotificationRead(notificationId) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not mark notification as read.');
    }

    return data.notification;
  }

  function updateCompanyNotificationBadge(notifications) {
    const badge = companyNotificationBadge || document.getElementById('companyNotificationBadge');
    if (!badge) return;
    const unreadCount = notifications.filter((notification) => !notification.read_at).length;
    badge.textContent = unreadCount;
    badge.hidden = unreadCount === 0;
  }

  function renderCompanySideNotifications(notifications) {
    if (!companySideNotificationsList) return;

    const unreadNotifications = notifications.filter((notification) => !notification.read_at);

    if (!unreadNotifications.length) {
      companySideNotificationsList.innerHTML = '<p class="company-side-empty">No new notifications.</p>';
      return;
    }

    companySideNotificationsList.innerHTML = unreadNotifications.slice(0, 6).map((notification) => `
      <div class="company-notification">
        <i class="bi bi-bell"></i>
        <div>
          <strong>${escapeHtml(notification.title || 'Notification')}</strong>
          <span>${escapeHtml(notification.body || notification.type || 'SiteCrew update')}</span>
        </div>
      </div>
    `).join('');
  }

  function syncCompanyNotifications(notifications) {
    const unreadCount = notifications.filter((notification) => !notification.read_at).length;
    updateCompanyNotificationBadge(notifications);
    if (companyAlertsCount) {
      companyAlertsCount.textContent = unreadCount;
    }
    renderCompanySideNotifications(notifications);
  }

  function renderCompanyNotifications(notifications) {
    if (!companyNotificationsList) return;

    syncCompanyNotifications(notifications);

    if (!notifications.length) {
      companyNotificationsList.innerHTML = '<p class="company-side-empty">No notifications yet.</p>';
      return;
    }

    companyNotificationsList.innerHTML = notifications.map((notification) => `
      <button
        type="button"
        class="company-notification-item ${notification.read_at ? 'read' : 'unread'}"
        data-company-notification-id="${escapeHtml(notification.id)}"
      >
        <i class="bi bi-bell"></i>
        <span>
          <strong>${escapeHtml(notification.title || 'Notification')}</strong>
          <small>${escapeHtml(notification.body || notification.type || 'SiteCrew update')}</small>
        </span>
      </button>
    `).join('');
  }

  async function openCompanyNotifications() {
    if (!companyNotificationsModal || !companyNotificationsList) return;

    openModal(companyNotificationsModal, null, null);
    companyNotificationsList.innerHTML = '<p class="company-side-empty">Loading notifications...</p>';

    try {
      renderCompanyNotifications(await fetchCompanyNotifications());
    } catch (error) {
      companyNotificationsList.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function closeCompanyNotifications() {
    closeModal(companyNotificationsModal);
  }

  async function sendWorkerMessage(workerId, message) {
    if (!currentCompanyId) {
      throw new Error('Company session is still loading. Please try again.');
    }

    const conversationResponse = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        workerId: Number(workerId),
        companyId: Number(currentCompanyId),
      }),
    });
    const conversationData = await conversationResponse.json().catch(() => ({}));

    if (!conversationResponse.ok) {
      throw new Error(conversationData.error || 'Could not start conversation.');
    }

    const conversationId = conversationData.conversation?.id;
    if (!conversationId || !message) return conversationData.conversation;

    const messageResponse = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ body: message }),
    });
    const messageData = await messageResponse.json().catch(() => ({}));

    if (!messageResponse.ok) {
      throw new Error(messageData.error || 'Could not send message.');
    }

    if (messageData.moderation?.status === 'hidden') {
      alert(messageData.moderation.message || 'Your message is pending AI review before delivery.');
    }

    return messageData.message;
  }

  async function fetchCompanyConversations() {
    const response = await fetch(`${API_BASE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not load conversations.');
    }

    return data.conversations || [];
  }

  async function fetchConversationMessages(conversationId) {
    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not load messages.');
    }

    return data.messages || [];
  }

  async function deleteCompanyConversation(conversationId) {
    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not delete this chat.');
    }

    return data;
  }

  function getCompanyConversationName(conversation) {
    if (conversation.conversation_type === 'worker') {
      return conversation.direct_worker_name || conversation.worker_name || 'Worker';
    }
    return conversation.worker_name || 'Worker';
  }

  function getCompanyConversationAvatar(conversation) {
    if (conversation.conversation_type === 'worker') {
      return conversation.direct_worker_photo || conversation.worker_photo || '';
    }
    return conversation.worker_photo || '';
  }

  function renderMessengerAvatar(name, photo, className = '') {
    const label = name || 'Worker';
    if (photo) {
      return `<div class="company-messenger-avatar ${className} has-photo"><img src="${escapeHtml(getMediaUrl(photo))}" alt="${escapeHtml(label)} avatar"></div>`;
    }
    return `<div class="company-messenger-avatar ${className}">${escapeHtml(label.charAt(0).toUpperCase())}</div>`;
  }

  function renderCompanyConversations(conversations) {
    if (!companyConversationList) return;

    if (!conversations.length) {
      companyConversationList.innerHTML = '<p class="company-side-empty">No worker chats yet.</p>';
      return;
    }

    companyConversationList.innerHTML = conversations.map((conversation) => {
      const name = getCompanyConversationName(conversation);
      const avatar = getCompanyConversationAvatar(conversation);
      const subtitle = conversation.job_title || 'General conversation';
      const unread = Number(conversation.unread_count || 0);
      return `
        <article
          class="company-conversation-item ${Number(conversation.id) === Number(activeCompanyConversationId) ? 'active' : ''}"
          data-company-conversation-id="${escapeHtml(conversation.id)}"
        >
          <button
            type="button"
            class="company-conversation-delete"
            data-delete-company-conversation
            data-conversation-id="${escapeHtml(conversation.id)}"
            data-conversation-name="${escapeHtml(name)}"
            aria-label="Delete chat with ${escapeHtml(name)}"
          >X</button>
          ${renderMessengerAvatar(name, avatar)}
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(subtitle)}</span>
          </div>
          ${unread ? `<em>${unread}</em>` : ''}
        </article>
      `;
    }).join('');
  }

  function renderCompanyThread(messages) {
    if (!companyThreadMessages) return;

    if (!messages.length) {
      companyThreadMessages.innerHTML = '<p class="company-side-empty">No messages yet.</p>';
      return;
    }

    companyThreadMessages.innerHTML = messages.map((message) => {
      const isOwn = Number(message.sender_id) === Number(currentCompanyId);
      const senderName = message.sender_name || (isOwn ? 'You' : 'Worker');
      const avatar = renderMessengerAvatar(senderName, message.sender_avatar, isOwn ? 'own' : '');
      const pendingReview = message.moderation_status === 'hidden' || message.moderation_status === 'flagged';
      return `
        <div class="company-thread-message ${isOwn ? 'own' : ''}">
          ${avatar}
          <div>
            <strong>${escapeHtml(senderName)}</strong>
            <p>${escapeHtml(message.body)}</p>
            ${pendingReview ? '<span class="company-side-empty">Pending AI review</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
    companyThreadMessages.scrollTop = companyThreadMessages.scrollHeight;
  }

  async function selectCompanyConversation(conversationId) {
    activeCompanyConversationId = conversationId;
    const conversation = companyConversationsCache.find((item) => Number(item.id) === Number(conversationId));
    if (companyThreadHeader) {
      companyThreadHeader.textContent = conversation ? getCompanyConversationName(conversation) : 'Conversation';
    }
    renderCompanyConversations(companyConversationsCache);

    const input = companyThreadForm?.elements.message;
    const submitBtn = companyThreadForm?.querySelector('button[type="submit"]');
    if (input) input.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    if (companyThreadMessages) {
      companyThreadMessages.innerHTML = '<p class="company-side-empty">Loading messages...</p>';
    }

    try {
      renderCompanyThread(await fetchConversationMessages(conversationId));
      syncCompanyNotifications(await fetchCompanyNotifications());
    } catch (error) {
      if (companyThreadMessages) {
        companyThreadMessages.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
    }
  }

  async function refreshCompanyMessages({ silent = false } = {}) {
    if (!companyMessagesModal?.classList.contains('open')) return;

    try {
      companyConversationsCache = await fetchCompanyConversations();
      renderCompanyConversations(companyConversationsCache);

      if (activeCompanyConversationId) {
        const activeStillExists = companyConversationsCache.some((conversation) => (
          Number(conversation.id) === Number(activeCompanyConversationId)
        ));
        if (activeStillExists) {
          renderCompanyThread(await fetchConversationMessages(activeCompanyConversationId));
          syncCompanyNotifications(await fetchCompanyNotifications());
        } else {
          activeCompanyConversationId = null;
        }
      } else if (companyConversationsCache.length && !silent) {
        await selectCompanyConversation(companyConversationsCache[0].id);
      }
    } catch (error) {
      if (!silent && companyConversationList) {
        companyConversationList.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
    }
  }

  async function openCompanyMessages() {
    if (!companyMessagesModal) return;

    openModal(companyMessagesModal, null, null);
    if (companyConversationList) {
      companyConversationList.innerHTML = '<p class="company-side-empty">Loading conversations...</p>';
    }

    try {
      companyConversationsCache = await fetchCompanyConversations();
      renderCompanyConversations(companyConversationsCache);
      if (companyConversationsCache.length) {
        await selectCompanyConversation(companyConversationsCache[0].id);
      }
    } catch (error) {
      if (companyConversationList) {
        companyConversationList.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
    }
  }

  function closeCompanyMessages() {
    closeModal(companyMessagesModal);
  }

  function setWorkerSearchMode(mode) {
    if (!workerSearchForm) return;

    workerSearchForm.dataset.mode = mode;
    workerSearchForm.elements.mode.value = mode;
    workerSearchModeButtons.forEach((button) => {
      const isActive = button.dataset.workerSearchMode === mode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    if (mode === 'quick') {
      ['experience', 'qualification', 'rating'].forEach((name) => {
        const field = workerSearchForm.elements[name];
        if (field) field.value = '';
      });
    }
  }

  async function updateApplicationStatus(applicationId, status) {
    const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not update applicant.');
    }

    return data.application;
  }

  async function deleteApplication(applicationId) {
    const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not delete this applicant.');
    }

    return data;
  }

  async function saveApplicantContact(workerId, applicationId) {
    const response = await fetch(`${API_BASE_URL}/api/companies/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        workerId: Number(workerId),
        applicationId: Number(applicationId),
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not save this worker to contacts.');
    }

    return data.contact;
  }

  async function fetchCompanyContacts() {
    const response = await fetch(`${API_BASE_URL}/api/companies/contacts`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not load contacts.');
    }

    return data.contacts || [];
  }

  async function deleteCompanyContact(workerId) {
    const response = await fetch(`${API_BASE_URL}/api/companies/contacts/${workerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not delete this contact.');
    }

    return data;
  }

  function renderContactsJournal(contacts) {
    if (!contactsJournalList) return;

    const selectedStatus = contactJournalStatusFilter?.value || '';
    const selectedTrade = contactJournalTradeFilter?.value || '';
    const nameQuery = contactJournalNameSearch?.value.trim().toLowerCase() || '';
    const cityQuery = contactJournalCitySearch?.value.trim().toLowerCase() || '';
    const visibleContacts = contacts.filter((contact) => {
      const name = contact.full_name || 'Worker';
      const status = contact.availability_status || 'Availability not set';
      const trades = Array.isArray(contact.trades) ? contact.trades : [];
      const city = contact.city || '';
      const locationText = `${city} ${contact.postcode || ''}`.toLowerCase();
      const matchesName = !nameQuery || name.toLowerCase().includes(nameQuery);
      const matchesCity = !cityQuery || locationText.includes(cityQuery);
      const matchesStatus = !selectedStatus || status === selectedStatus;
      const matchesTrade = !selectedTrade || trades.includes(selectedTrade);
      return matchesName && matchesCity && matchesStatus && matchesTrade;
    });

    if (!contacts.length) {
      contactsJournalList.innerHTML = `
        <div class="company-contact-journal-empty">
          <strong>No contacts saved yet</strong>
          <span>Click "Save to contact's" on an applicant and they will be added to this journal.</span>
        </div>
      `;
      return;
    }

    if (!visibleContacts.length) {
      contactsJournalList.innerHTML = `
        <div class="company-contact-journal-empty">
          <strong>No contacts match this filter</strong>
          <span>Try another status or trade.</span>
        </div>
      `;
      return;
    }

    contactsJournalList.innerHTML = visibleContacts.map((contact) => {
      const name = contact.full_name || 'Worker';
      const trades = Array.isArray(contact.trades) && contact.trades.length ? contact.trades.join(', ') : 'Trade not set';
      const location = contact.city || 'Location not set';
      const status = contact.availability_status || 'Availability not set';
      const sourceJob = contact.source_job_title || 'Applicants';
      const phone = contact.phone || 'Phone not added';
      const email = contact.worker_email || 'Email not added';
      const avatarUrl = contact.profile_photo ? getMediaUrl(contact.profile_photo) : '';
      const avatar = contact.profile_photo
        ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)} profile picture">`
        : escapeHtml(name.charAt(0).toUpperCase());

      return `
        <article class="company-contact-journal-item">
          <button
            type="button"
            class="company-contact-delete-btn"
            data-delete-contact
            data-worker-id="${escapeHtml(contact.worker_id)}"
            data-worker-name="${escapeHtml(name)}"
            aria-label="Delete contact"
          >
            <i class="bi bi-trash"></i>
          </button>
          <button
            type="button"
            class="company-worker-avatar company-contact-avatar-trigger ${contact.profile_photo ? 'has-photo' : ''}"
            data-contact-avatar
            data-avatar-url="${escapeHtml(avatarUrl)}"
            data-worker-name="${escapeHtml(name)}"
            aria-label="Open ${escapeHtml(name)} photo"
          >${avatar}</button>
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(trades)} · ${escapeHtml(location)}</span>
            <small>${escapeHtml(status)}</small>
            <div class="company-contact-journal-meta">
              <em>Saved from ${escapeHtml(sourceJob)}</em>
              <em>${escapeHtml(formatJournalDate(contact.saved_at || contact.created_at))}</em>
            </div>
            <div class="company-contact-details" hidden>
              <span><i class="bi bi-telephone"></i> ${escapeHtml(phone)}</span>
              <span><i class="bi bi-envelope"></i> ${escapeHtml(email)}</span>
            </div>
          </div>
          <div class="company-contact-actions">
            <button
              type="button"
              class="company-contact-profile-btn"
              data-view-contact-profile
              data-worker-id="${escapeHtml(contact.worker_id)}"
              aria-label="View profile"
            >View profile</button>
            <button type="button" data-show-contact-details aria-label="Show phone and email">
              <i class="bi bi-telephone"></i>
            </button>
            <button
              type="button"
              data-message-contact-worker
              data-worker-id="${escapeHtml(contact.worker_id)}"
              data-worker-name="${escapeHtml(name)}"
              aria-label="Send message"
            >
              <i class="bi bi-chat-text"></i>
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  function populateContactsJournalFilters(contacts) {
    const statuses = Array.from(new Set(
      contacts.map((contact) => contact.availability_status || 'Availability not set')
    )).sort((a, b) => a.localeCompare(b));
    const trades = Array.from(new Set(
      contacts.flatMap((contact) => Array.isArray(contact.trades) ? contact.trades : [])
    )).sort((a, b) => a.localeCompare(b));

    if (contactJournalStatusFilter) {
      const current = contactJournalStatusFilter.value;
      contactJournalStatusFilter.innerHTML = '<option value="">All statuses</option>'
        + statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('');
      contactJournalStatusFilter.value = statuses.includes(current) ? current : '';
    }

    if (contactJournalTradeFilter) {
      const current = contactJournalTradeFilter.value;
      contactJournalTradeFilter.innerHTML = '<option value="">All trades</option>'
        + trades.map((trade) => `<option value="${escapeHtml(trade)}">${escapeHtml(trade)}</option>`).join('');
      contactJournalTradeFilter.value = trades.includes(current) ? current : '';
    }
  }

  async function openContactsJournal() {
    if (!contactsJournalModal || !contactsJournalList) return;

    openModal(contactsJournalModal, null, null);
    contactsJournalList.innerHTML = '<p class="company-side-empty">Loading contacts...</p>';

    try {
      const contacts = await fetchCompanyContacts();
      contactsJournalCache = contacts;
      populateContactsJournalFilters(contactsJournalCache);
      renderContactsJournal(contactsJournalCache);
    } catch (error) {
      contactsJournalList.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function setContactMessageAlert(message, type = 'error') {
    if (!contactMessageAlert) return;
    contactMessageAlert.textContent = message;
    contactMessageAlert.dataset.type = type;
    contactMessageAlert.hidden = false;
  }

  function openContactMessageModal(workerId, workerName) {
    if (!contactMessageModal || !contactMessageForm) return;

    pendingContactMessage = { workerId, workerName: workerName || 'this worker' };
    contactMessageForm.reset();
    if (contactMessageAlert) contactMessageAlert.hidden = true;
    const submitBtn = contactMessageForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send"></i> Send message';
    }

    openModal(contactMessageModal, null, 'textarea[name="message"]');
  }

  function closeContactMessageModal() {
    closeModal(contactMessageModal);
    pendingContactMessage = null;
  }

  function openContactAvatarQuickview(avatarUrl, workerName) {
    if (!contactAvatarQuickview || !contactAvatarQuickviewBody) return;

    const name = workerName || 'Worker';
    if (contactAvatarQuickviewTitle) {
      contactAvatarQuickviewTitle.textContent = `${name} photo`;
    }

    contactAvatarQuickviewBody.innerHTML = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)} profile photo">`
      : `<div class="company-avatar-quickview-fallback">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;

    openModal(contactAvatarQuickview, null, null);
  }

  function closeContactAvatarQuickview() {
    closeModal(contactAvatarQuickview);
  }

  async function updateTeamOccupation(applicationId, occupation) {
    const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/occupation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ occupation }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not save occupation.');
    }

    return data.application;
  }

  async function updateRosterOccupation(workerId, occupation) {
    const response = await fetch(`${API_BASE_URL}/api/companies/team/${workerId}/occupation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ occupation }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not save occupation.');
    }

    return data.member;
  }

  async function addWorkerToTeam(workerId, occupation) {
    const response = await fetch(`${API_BASE_URL}/api/companies/team`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ workerId: Number(workerId), occupation }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not add worker to team.');
    }

    return data.member;
  }

  async function searchPlatformWorkers(query) {
    const response = await fetch(`${API_BASE_URL}/api/companies/team/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not search workers.');
    }

    return data.workers || [];
  }

  async function updateTeamPermissions(applicationId, payload) {
    const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/permissions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not update team permissions.');
    }

    return data.application;
  }

  async function submitWorkerReview(workerId, payload) {
    const response = await fetch(`${API_BASE_URL}/api/workers/${workerId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not save worker review.');
    }

    if (data.moderation?.status === 'hidden') {
      alert(data.moderation.message || 'Your review is pending AI review before it is published.');
    }

    return data.review;
  }

  async function fetchWorkerProfile(workerId) {
    const response = await fetch(`${API_BASE_URL}/api/workers/${workerId}/profile`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Could not load worker profile.');
    }

    return data;
  }

  function renderWorkerProfile(data, options = {}) {
    const profile = data.profile || {};
    const trades = Array.isArray(profile.trades) && profile.trades.length ? profile.trades.join(', ') : 'Trade not set';
    const certificates = Array.isArray(profile.certificates) && profile.certificates.length ? profile.certificates.join(', ') : 'No certificates added';
    const workLocations = Array.isArray(profile.work_locations) && profile.work_locations.length ? profile.work_locations.join(', ') : 'Work locations not set';
    const lastCompanies = Array.isArray(profile.last_companies) && profile.last_companies.length ? profile.last_companies.join(', ') : 'No recent companies added';
    const qualifications = Array.isArray(profile.qualifications) && profile.qualifications.length ? profile.qualifications.join(', ') : certificates;
    const posts = data.posts || [];
    const avatar = profile.profile_photo
      ? `<img src="${escapeHtml(getMediaUrl(profile.profile_photo))}" alt="${escapeHtml(profile.full_name || 'Worker')} profile picture">`
      : escapeHtml((profile.full_name || 'W').charAt(0).toUpperCase());
    const permissions = options.permissions || {};
    const occupationValue = options.occupation || '';
    const hasTeamContext = Boolean(options.workerId);
    const hasHiredApplication = Boolean(options.applicationId);
    const occupationForm = hasTeamContext
      ? `
        <form
          class="team-worker-occupation-form"
          data-team-occupation-form
          data-worker-id="${escapeHtml(String(options.workerId))}"
          ${hasHiredApplication ? `data-application-id="${escapeHtml(String(options.applicationId))}"` : ''}
        >
          <span>Company occupation</span>
          <label>
            <span>Occupation name in your company</span>
            <input
              type="text"
              name="occupation"
              maxlength="120"
              value="${escapeHtml(occupationValue)}"
              placeholder="e.g. Site Supervisor, Electrician, Project Manager"
            >
            <small class="company-form-help">This shows that this person works for your company in this role.</small>
          </label>
          <div class="team-worker-actions">
            <button type="submit" class="company-submit-btn">Save occupation</button>
          </div>
        </form>
      `
      : '';
    const hiredActions = hasHiredApplication
      ? `
        <form class="team-worker-permissions-form" data-team-permissions-form data-application-id="${escapeHtml(String(options.applicationId))}">
          <span>Company permissions</span>
          <label class="team-permission-toggle">
            <input type="checkbox" name="canPostJobs" ${permissions.canPostJobs ? 'checked' : ''}>
            <span>
              <strong>Allow this worker to post vacant jobs in the company name</strong>
              <small>Worker can create job vacancies as your company.</small>
            </span>
          </label>
          <label class="team-permission-toggle">
            <input type="checkbox" name="canPostCompanyPosts" ${permissions.canPostCompanyPosts ? 'checked' : ''}>
            <span>
              <strong>Allow this worker to post updates in the company name</strong>
              <small>Worker can publish company feed posts.</small>
            </span>
          </label>
          <div class="team-worker-actions">
            <button type="submit" class="company-submit-btn">Save permissions</button>
          </div>
        </form>
        <form class="team-worker-review-form" data-worker-review-form data-worker-id="${escapeHtml(String(options.workerId))}">
          <span>Rate this worker</span>
          <div class="team-rating-stars" role="radiogroup" aria-label="Rate this worker">
            <input type="hidden" name="rating" value="5">
            ${[1, 2, 3, 4, 5].map((value) => `
              <button type="button" class="team-rating-star selected" data-rating-star="${value}" aria-label="${value} star${value === 1 ? '' : 's'}">
                <i class="bi bi-star-fill"></i>
              </button>
            `).join('')}
          </div>
          <label>
            <span>Leave feedback for this worker</span>
            <textarea name="feedback" rows="3" placeholder="Write feedback about reliability, quality, communication..."></textarea>
          </label>
          <div class="team-worker-actions">
            <button type="submit" class="company-submit-btn">Submit feedback</button>
            <button type="button" class="company-danger-btn" data-unhire-worker data-application-id="${escapeHtml(String(options.applicationId))}">Unhire this worker</button>
          </div>
        </form>
      `
      : '';
    const teamActions = `${occupationForm}${hiredActions}`;

    return `
      <div class="company-worker-profile-head">
        <div class="company-worker-avatar large ${profile.profile_photo ? 'has-photo' : ''}">${avatar}</div>
        <div>
          <h3>${escapeHtml(profile.full_name || 'Worker')}</h3>
          <p>${escapeHtml(trades)} · ${escapeHtml(profile.city || profile.postcode || 'Location not set')}</p>
        </div>
      </div>
      <div class="company-worker-profile-grid">
        <div><span>Experience</span><strong>${escapeHtml(profile.experience || 'Experience not set')}</strong></div>
        <div><span>Availability</span><strong>${escapeHtml(profile.availability_status || 'Availability not set')}</strong></div>
        <div><span>Rate</span><strong>${escapeHtml(profile.expected_rate || 'Rate not set')}</strong></div>
        <div><span>Certificates</span><strong>${escapeHtml(certificates)}</strong></div>
        <div><span>Work locations</span><strong>${escapeHtml(workLocations)}</strong></div>
        <div><span>Travel radius</span><strong>${escapeHtml(profile.working_radius || 'Not set')}</strong></div>
        <div><span>Last companies</span><strong>${escapeHtml(lastCompanies)}</strong></div>
        <div><span>Qualifications</span><strong>${escapeHtml(qualifications)}</strong></div>
        <div><span>UK work permit</span><strong>${profile.has_uk_work_permit ? 'Yes' : 'No'}</strong></div>
        <div><span>Native language</span><strong>${escapeHtml(profile.is_english_native ? 'English' : (profile.native_language || 'Not set'))}</strong></div>
        <div><span>English level</span><strong>${escapeHtml(profile.english_level || 'Not set')}</strong></div>
        <div><span>Car for work</span><strong>${profile.has_car ? (profile.can_use_car_for_work ? 'Yes, can use for work' : 'Has car, not for work') : 'No'}</strong></div>
        <div><span>Health issues</span><strong>${profile.has_health_issues ? escapeHtml(profile.health_issues_details || 'Yes') : 'No'}</strong></div>
      </div>
      <div class="company-worker-profile-bio">
        <span>Bio</span>
        <p>${escapeHtml(profile.bio || 'No bio added yet.')}</p>
      </div>
      <div class="company-worker-profile-posts">
        <span>Recent posts</span>
        ${posts.length ? posts.slice(0, 3).map((post) => `<p>${escapeHtml(post.caption)}</p>`).join('') : '<p>No portfolio posts yet.</p>'}
      </div>
      ${teamActions}
    `;
  }

  setWorkerSearchMode('quick');

  workerSearchModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setWorkerSearchMode(button.dataset.workerSearchMode);
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      await clearAuthSession();
      window.location.replace('/login');
    });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-post-job]')) {
      openPostJobModal();
    }
  });

  if (openPostJobModalBtn) {
    openPostJobModalBtn.addEventListener('click', openPostJobModal);
  }

  document.getElementById('postJobOgPresets')?.addEventListener('click', (event) => {
    const presetBtn = event.target.closest('[data-job-og-preset]');
    if (!presetBtn) return;
    updatePostJobOgPreview(presetBtn.dataset.jobOgPreset);
  });

  document.getElementById('postJobShareImagePath')?.addEventListener('change', (event) => {
    updatePostJobOgPreview(event.target.value.trim());
  });

  document.getElementById('postJobShareImagePath')?.addEventListener('blur', (event) => {
    updatePostJobOgPreview(event.target.value.trim());
  });

  document.getElementById('postJobShareImageFile')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imagePath = await uploadJobShareImage(file);
      updatePostJobOgPreview(imagePath);
      setPostJobAlert('Social share image uploaded.', 'success');
    } catch (error) {
      setPostJobAlert(error.message);
    } finally {
      event.target.value = '';
    }
  });

  postJobForm?.elements.tradeRequired?.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    window.clearTimeout(tradeSearchTimer);

    if (query.length < 3) {
      renderConstructionTradeOptions([]);
      return;
    }

    tradeSearchTimer = window.setTimeout(async () => {
      try {
        renderConstructionTradeOptions(await searchConstructionTrades(query));
      } catch (error) {
        renderConstructionTradeOptions([]);
      }
    }, 180);
  });

  workerSearchForm?.elements.trade?.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    window.clearTimeout(workerTradeSearchTimer);

    if (query.length < 3) {
      renderWorkerTradeOptions([]);
      return;
    }

    workerTradeSearchTimer = window.setTimeout(async () => {
      try {
        renderWorkerTradeOptions(await searchConstructionTrades(query));
      } catch (error) {
        renderWorkerTradeOptions([]);
      }
    }, 180);
  });

  applicantJobFilter?.addEventListener('change', updateApplicantJobFilter);
  updateApplicantJobFilter();

  document.querySelectorAll('[data-edit-company-job]').forEach((button) => {
    button.addEventListener('click', () => {
      openEditJobModal(button.closest('[data-company-job-card]'));
    });
  });

  document.querySelectorAll('[data-toggle-company-job]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-company-job-card]');
      const jobId = card?.dataset.jobId;
      const currentStatus = card?.dataset.jobStatus || 'open';
      const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
      const statusEl = card?.querySelector('.company-status');
      if (!jobId) return;

      button.disabled = true;
      button.textContent = nextStatus === 'closed' ? 'Closing...' : 'Opening...';

      try {
        await updateCompanyJobStatus(jobId, nextStatus);
        card.dataset.jobStatus = nextStatus;
        button.textContent = nextStatus === 'open' ? 'Close this request' : 'Open this request';
        if (statusEl) {
          statusEl.textContent = nextStatus === 'open' ? 'Open' : 'Closed';
          statusEl.className = `company-status ${nextStatus}`;
        }
      } catch (error) {
        alert(error.message);
        button.textContent = currentStatus === 'open' ? 'Close this request' : 'Open this request';
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-delete-company-job]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-company-job-card]');
      const jobId = card?.dataset.jobId;
      const jobTitle = card?.dataset.title || 'this hiring request';
      if (!jobId) return;

      const confirmed = window.confirm(`Delete "${jobTitle}" permanently?`);
      if (!confirmed) return;

      button.disabled = true;
      button.textContent = 'Deleting...';

      try {
        await deleteCompanyJob(jobId);
        card?.remove();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
        button.textContent = 'Delete';
      }
    });
  });

  document.querySelector('.company-dashboard')?.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-company-post]')) {
      openCreateCompanyPostModal();
      return;
    }
    if (event.target.closest('[data-open-company-story]')) {
      openModal(companyStoryModal, companyStoryAlert, 'input[name="media"]');
    }
  });

  document.querySelectorAll('[data-edit-company-post]').forEach((button) => {
    button.addEventListener('click', () => {
      openEditCompanyPostModal(button.closest('[data-company-feed-post]'));
    });
  });

  const postEngagementModal = document.getElementById('postEngagementModal');
  const postEngagementBody = document.getElementById('postEngagementBody');
  const postEngagementTitle = document.getElementById('postEngagementTitle');
  const closePostEngagementModalBtn = document.getElementById('closePostEngagementModal');
  const cancelPostEngagementModalBtn = document.getElementById('cancelPostEngagementModal');
  let postEngagementCache = null;
  let postEngagementActiveTab = 'views';

  function formatEngagementTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function setEngagementTab(tab) {
    postEngagementActiveTab = tab;
    postEngagementModal?.querySelectorAll('[data-engagement-tab]').forEach((button) => {
      const isActive = button.dataset.engagementTab === tab;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function renderEngagementList(tab) {
    if (!postEngagementBody) return;

    if (!postEngagementCache) {
      postEngagementBody.innerHTML = '<p class="company-side-empty">Loading...</p>';
      return;
    }

    const items = postEngagementCache[tab] || [];
    if (!items.length) {
      const emptyCopy = {
        views: 'No views recorded yet.',
        likes: 'No likes yet.',
        comments: 'No comments yet.',
        saves: 'Nobody has saved this post yet.',
      };
      postEngagementBody.innerHTML = `<p class="company-side-empty">${escapeHtml(emptyCopy[tab] || 'Nothing here yet.')}</p>`;
      return;
    }

    postEngagementBody.innerHTML = `
      <div class="company-engagement-list">
        ${items.map((item) => `
          <article class="company-engagement-item">
            <span class="company-engagement-avatar">${escapeHtml(item.initials || '?')}</span>
            <div class="company-engagement-copy">
              <strong>${escapeHtml(item.name || 'User')}</strong>
              ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ''}
              <small>${escapeHtml([item.role, formatEngagementTime(item.at)].filter(Boolean).join(' · '))}</small>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  async function openPostEngagementModal(postId, tab = 'views', postTitle = '') {
    if (!postEngagementModal || !postId) return;

    postEngagementCache = null;
    setEngagementTab(tab);
    if (postEngagementTitle) {
      postEngagementTitle.textContent = postTitle ? postTitle : 'Who interacted';
    }
    if (postEngagementBody) {
      postEngagementBody.innerHTML = '<p class="company-side-empty">Loading...</p>';
    }
    openModal(postEngagementModal, null, null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/feed/posts/${postId}/engagement`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Could not load engagement details.');
      }

      postEngagementCache = data;
      if (postEngagementTitle && data.post?.title) {
        postEngagementTitle.textContent = data.post.title;
      }
      renderEngagementList(postEngagementActiveTab);
    } catch (error) {
      if (postEngagementBody) {
        postEngagementBody.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
    }
  }

  document.querySelector('.company-spa-main')?.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-post-engagement]');
    if (!trigger) return;
    openPostEngagementModal(
      trigger.dataset.postId,
      trigger.dataset.openPostEngagement || 'views',
      trigger.dataset.postTitle || ''
    );
  });

  postEngagementModal?.querySelectorAll('[data-engagement-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setEngagementTab(button.dataset.engagementTab || 'views');
      renderEngagementList(postEngagementActiveTab);
    });
  });

  [closePostEngagementModalBtn, cancelPostEngagementModalBtn].forEach((button) => {
    button?.addEventListener('click', () => closeModal(postEngagementModal));
  });

  postEngagementModal?.addEventListener('click', (event) => {
    if (event.target === postEngagementModal) closeModal(postEngagementModal);
  });

  document.querySelectorAll('[data-delete-company-post]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-company-feed-post]');
      const postId = card?.dataset.postId;
      const title = card?.dataset.title || 'this post';
      if (!postId) return;
      if (!window.confirm(`Delete "${title}" permanently?`)) return;

      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = 'Deleting...';

      try {
        await deleteCompanyPost(postId);
        card.remove();
      } catch (error) {
        button.disabled = false;
        button.textContent = originalText;
        alert(error.message);
      }
    });
  });

  openCompanyNotificationsBtn?.addEventListener('click', openCompanyNotifications);
  openCompanyMessagesBtn?.addEventListener('click', openCompanyMessages);
  if (companyMessagesModal) {
    setInterval(() => {
      refreshCompanyMessages({ silent: true });
    }, COMPANY_MESSAGES_POLL_MS);
  }
  openContactsJournalBtn?.addEventListener('click', openContactsJournal);
  contactJournalNameSearch?.addEventListener('input', () => renderContactsJournal(contactsJournalCache));
  contactJournalCitySearch?.addEventListener('input', () => renderContactsJournal(contactsJournalCache));
  contactJournalStatusFilter?.addEventListener('change', () => renderContactsJournal(contactsJournalCache));
  contactJournalTradeFilter?.addEventListener('change', () => renderContactsJournal(contactsJournalCache));
  contactsJournalList?.addEventListener('click', async (event) => {
    const avatarButton = event.target.closest('[data-contact-avatar]');
    if (avatarButton) {
      openContactAvatarQuickview(avatarButton.dataset.avatarUrl, avatarButton.dataset.workerName);
      return;
    }

    const profileButton = event.target.closest('[data-view-contact-profile]');
    if (profileButton) {
      const workerId = profileButton.dataset.workerId;
      if (!workerId || !workerProfileContent) return;

      closeModal(contactsJournalModal);
      workerProfileContent.innerHTML = '<p class="company-side-empty">Loading worker profile...</p>';
      openWorkerProfileModal();

      try {
        const profile = await fetchWorkerProfile(workerId);
        workerProfileContent.innerHTML = renderWorkerProfile(profile);
      } catch (error) {
        workerProfileContent.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
      return;
    }

    const deleteButton = event.target.closest('[data-delete-contact]');
    if (deleteButton) {
      const workerId = deleteButton.dataset.workerId;
      const workerName = deleteButton.dataset.workerName || 'this worker';
      if (!workerId) return;

      const confirmed = window.confirm(`Delete ${workerName} from Contact journal?`);
      if (!confirmed) return;

      deleteButton.disabled = true;

      try {
        await deleteCompanyContact(workerId);
        contactsJournalCache = contactsJournalCache.filter((contact) => Number(contact.worker_id) !== Number(workerId));
        populateContactsJournalFilters(contactsJournalCache);
        renderContactsJournal(contactsJournalCache);
      } catch (error) {
        alert(error.message);
        deleteButton.disabled = false;
      }
      return;
    }

    const detailsButton = event.target.closest('[data-show-contact-details]');
    if (detailsButton) {
      const item = detailsButton.closest('.company-contact-journal-item');
      const details = item?.querySelector('.company-contact-details');
      if (!details) return;

      const isHidden = details.hidden;
      details.hidden = !isHidden;
      detailsButton.classList.toggle('active', isHidden);
      return;
    }

    const messageButton = event.target.closest('[data-message-contact-worker]');
    if (!messageButton) return;

    const workerId = messageButton.dataset.workerId;
    const workerName = messageButton.dataset.workerName || 'this worker';
    if (!workerId) return;
    openContactMessageModal(workerId, workerName);
  });

  companyConversationList?.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-delete-company-conversation]');
    if (deleteButton) {
      const conversationId = deleteButton.dataset.conversationId;
      const conversationName = deleteButton.dataset.conversationName || 'this person';
      if (!conversationId) return;

      const confirmed = window.confirm(`Delete chat with ${conversationName}?`);
      if (!confirmed) return;

      deleteButton.disabled = true;
      try {
        await deleteCompanyConversation(conversationId);
        companyConversationsCache = companyConversationsCache.filter((conversation) => (
          Number(conversation.id) !== Number(conversationId)
        ));

        if (Number(activeCompanyConversationId) === Number(conversationId)) {
          activeCompanyConversationId = null;
          if (companyThreadHeader) companyThreadHeader.textContent = 'Select a conversation';
          if (companyThreadMessages) {
            companyThreadMessages.innerHTML = '<p class="company-side-empty">Choose a worker chat to view messages.</p>';
          }
          const input = companyThreadForm?.elements.message;
          const submitBtn = companyThreadForm?.querySelector('button[type="submit"]');
          if (input) {
            input.value = '';
            input.disabled = true;
          }
          if (submitBtn) submitBtn.disabled = true;
        }

        renderCompanyConversations(companyConversationsCache);
      } catch (error) {
        alert(error.message);
        deleteButton.disabled = false;
      }
      return;
    }

    const item = event.target.closest('[data-company-conversation-id]');
    if (!item) return;
    await selectCompanyConversation(item.dataset.companyConversationId);
  });

  companyNotificationsList?.addEventListener('click', async (event) => {
    const item = event.target.closest('[data-company-notification-id]');
    if (!item || item.classList.contains('read')) return;

    try {
      await markCompanyNotificationRead(item.dataset.companyNotificationId);
      renderCompanyNotifications(await fetchCompanyNotifications());
    } catch (error) {
      alert(error.message);
    }
  });

  [closePostJobModalBtn, cancelPostJobBtn].forEach((button) => {
    button?.addEventListener('click', closePostJobModal);
  });

  [closeCompanyPostModalBtn, cancelCompanyPostBtn].forEach((button) => {
    button?.addEventListener('click', () => closeModal(companyPostModal));
  });

  [closeCompanyStoryModalBtn, cancelCompanyStoryBtn].forEach((button) => {
    button?.addEventListener('click', () => closeModal(companyStoryModal));
  });

  closeCompanyNotificationsBtn?.addEventListener('click', closeCompanyNotifications);
  closeCompanyMessagesBtn?.addEventListener('click', closeCompanyMessages);
  closeContactsJournalBtn?.addEventListener('click', () => closeModal(contactsJournalModal));

  [closeContactMessageModalBtn, cancelContactMessageBtn].forEach((button) => {
    button?.addEventListener('click', closeContactMessageModal);
  });

  [closeContactAvatarQuickviewBtn, cancelContactAvatarQuickviewBtn].forEach((button) => {
    button?.addEventListener('click', closeContactAvatarQuickview);
  });

  postJobModal?.addEventListener('click', (event) => {
    if (event.target === postJobModal) {
      closePostJobModal();
    }
  });

  workerProfileModal?.addEventListener('click', (event) => {
    if (event.target === workerProfileModal) {
      closeWorkerProfileModal();
    }
  });

  companyPostModal?.addEventListener('click', (event) => {
    if (event.target === companyPostModal) {
      closeModal(companyPostModal);
    }
  });

  companyStoryModal?.addEventListener('click', (event) => {
    if (event.target === companyStoryModal) {
      closeModal(companyStoryModal);
    }
  });

  companyNotificationsModal?.addEventListener('click', (event) => {
    if (event.target === companyNotificationsModal) {
      closeCompanyNotifications();
    }
  });

  companyMessagesModal?.addEventListener('click', (event) => {
    if (event.target === companyMessagesModal) {
      closeCompanyMessages();
    }
  });

  contactsJournalModal?.addEventListener('click', (event) => {
    if (event.target === contactsJournalModal) {
      closeModal(contactsJournalModal);
    }
  });

  contactMessageModal?.addEventListener('click', (event) => {
    if (event.target === contactMessageModal) {
      closeContactMessageModal();
    }
  });

  contactAvatarQuickview?.addEventListener('click', (event) => {
    if (event.target === contactAvatarQuickview) {
      closeContactAvatarQuickview();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && postJobModal?.classList.contains('open')) {
      closePostJobModal();
    }
    if (event.key === 'Escape' && workerProfileModal?.classList.contains('open')) {
      closeWorkerProfileModal();
    }
    if (event.key === 'Escape' && companyPostModal?.classList.contains('open')) {
      closeModal(companyPostModal);
    }
    if (event.key === 'Escape' && companyStoryModal?.classList.contains('open')) {
      closeModal(companyStoryModal);
    }
    if (event.key === 'Escape' && companyNotificationsModal?.classList.contains('open')) {
      closeCompanyNotifications();
    }
    if (event.key === 'Escape' && companyMessagesModal?.classList.contains('open')) {
      closeCompanyMessages();
    }
    if (event.key === 'Escape' && contactsJournalModal?.classList.contains('open')) {
      closeModal(contactsJournalModal);
    }
    if (event.key === 'Escape' && contactMessageModal?.classList.contains('open')) {
      closeContactMessageModal();
    }
    if (event.key === 'Escape' && postEngagementModal?.classList.contains('open')) {
      closeModal(postEngagementModal);
    }
    if (event.key === 'Escape' && contactAvatarQuickview?.classList.contains('open')) {
      closeContactAvatarQuickview();
    }
  });

  [closeWorkerProfileModalBtn, closeWorkerProfileFooterBtn].forEach((button) => {
    button?.addEventListener('click', closeWorkerProfileModal);
  });

  postJobForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    postJobAlert.hidden = true;

    const formData = new FormData(postJobForm);
    const submitBtn = postJobForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = editingJobId ? 'Saving...' : 'Posting...';

    try {
      const title = formData.get('title').trim();
      const description = formData.get('description').trim();
      const tradeRequired = formData.get('tradeRequired').trim();
      const workersRequired = Number(formData.get('workersRequired') || 1);

      if (title.length < 3) {
        throw new Error('Job title must have at least 3 characters.');
      }

      if (description.length < 10) {
        throw new Error('Description must have at least 10 characters.');
      }

      if (tradeRequired.length < 2) {
        throw new Error('Trade required must have at least 2 characters.');
      }

      if (!Number.isInteger(workersRequired) || workersRequired < 1) {
        throw new Error('Workers needed must be a positive whole number.');
      }

      await submitJob({
        title,
        description,
        city: formData.get('city').trim() || undefined,
        postcode: formData.get('postcode').trim() || undefined,
        tradeRequired,
        certificatesRequired: parseCsv(formData.get('certificatesRequired')),
        startDate: formData.get('startDate') || undefined,
        duration: formData.get('duration').trim() || undefined,
        rate: formData.get('rate').trim(),
        workersRequired,
        shareImage: formData.get('shareImage')?.trim() || undefined,
        status: 'open',
      });

      setPostJobAlert(editingJobId ? 'Job updated successfully. Refreshing dashboard...' : 'Job posted successfully. Refreshing dashboard...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      setPostJobAlert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = editingJobId ? 'Save changes' : 'Post Job';
    }
  });

  contactMessageForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!pendingContactMessage) return;
    if (contactMessageAlert) contactMessageAlert.hidden = true;

    const formData = new FormData(contactMessageForm);
    const message = String(formData.get('message') || '').trim();
    const submitBtn = contactMessageForm.querySelector('button[type="submit"]');

    if (!message) {
      setContactMessageAlert('Please write a message before sending.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-send"></i> Sending...';

    try {
      await sendWorkerMessage(pendingContactMessage.workerId, message);
      setContactMessageAlert(`Message sent to ${pendingContactMessage.workerName}.`, 'success');
      submitBtn.innerHTML = '<i class="bi bi-check2"></i> Sent';
      setTimeout(closeContactMessageModal, 900);
    } catch (error) {
      setContactMessageAlert(error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send"></i> Send message';
    }
  });

  companyThreadForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeCompanyConversationId) return;

    const input = companyThreadForm.elements.message;
    const submitBtn = companyThreadForm.querySelector('button[type="submit"]');
    const message = input.value.trim();
    if (!message) return;

    input.disabled = true;
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations/${activeCompanyConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ body: message }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Could not send message.');
      }

      if (data.moderation?.status === 'hidden') {
        alert(data.moderation.message || 'Your message is pending AI review before delivery.');
      }

      input.value = '';
      renderCompanyThread(await fetchConversationMessages(activeCompanyConversationId));
    } catch (error) {
      alert(error.message);
    } finally {
      input.disabled = false;
      submitBtn.disabled = false;
      input.focus();
    }
  });

  companyPostForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    companyPostAlert.hidden = true;

    const formData = new FormData(companyPostForm);
    const submitBtn = companyPostForm.querySelector('button[type="submit"]');
    syncCompanyPostMediaInput();
    const files = companyPostSelectedFiles.length
      ? companyPostSelectedFiles.slice()
      : Array.from(formData.getAll('media')).filter((file) => file && file.size > 0);
    const postId = formData.get('postId');
    submitBtn.disabled = true;
    submitBtn.textContent = postId ? 'Saving...' : 'Publishing...';

    try {
      const title = String(formData.get('title') || '').trim();
      const description = String(formData.get('description') || '').trim();
      const location = String(formData.get('location') || '').trim();
      const projectSize = String(formData.get('projectSize') || '').trim();
      const allowedTypes = new Set(['work_completed', 'certification', 'skills', 'progress', 'company_update']);
      const postType = allowedTypes.has(String(formData.get('postType') || ''))
        ? String(formData.get('postType'))
        : 'work_completed';

      if (title.length < 2) {
        throw new Error('Title must have at least 2 characters.');
      }

      if (description.length < 2) {
        throw new Error('Description must have at least 2 characters.');
      }

      validatePostMedia(files);

      const upload = files.length ? await uploadMedia('/api/feed/posts/upload', files) : { mediaUrls: [] };
      const payload = {
        postType,
        title,
        caption: description,
        tags: parseCsv(formData.get('tags')),
      };

      if (location) payload.location = location;
      if (projectSize) payload.projectSize = projectSize;

      if (!postId || upload.mediaUrls.length) {
        payload.mediaUrls = upload.mediaUrls;
      }

      await saveCompanyPost(postId || null, payload);

      setAlert(companyPostAlert, `${postId ? 'Portfolio item updated' : 'Portfolio item published'}. Refreshing...`, 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setAlert(companyPostAlert, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = postId ? 'Save changes' : 'Publish to portfolio';
    }
  });

  companyStoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    companyStoryAlert.hidden = true;

    const formData = new FormData(companyStoryForm);
    const submitBtn = companyStoryForm.querySelector('button[type="submit"]');
    const file = formData.get('media');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    try {
      await validateStoryMedia(file);
      const upload = await uploadMedia('/api/stories/upload', [file]);

      await createCompanyStory({
        mediaUrl: upload.mediaUrl,
        caption: formData.get('caption').trim() || undefined,
        expiresInHours: 24,
      });

      setAlert(companyStoryAlert, 'Story added successfully. It will expire in 24 hours.', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setAlert(companyStoryAlert, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Story';
    }
  });

  companySettingsForm?.elements.logo?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file || !companySettingsLogoPreview) return;

    const previewUrl = URL.createObjectURL(file);
    companySettingsLogoPreview.classList.add('has-logo');
    companySettingsLogoPreview.innerHTML = `<img src="${previewUrl}" alt="Company logo preview">`;
  });

  companySettingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (companySettingsAlert) companySettingsAlert.hidden = true;

    const formData = new FormData(companySettingsForm);
    const submitBtn = companySettingsForm.querySelector('button[type="submit"]');
    const logoFile = formData.get('logo');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const companyName = formData.get('companyName').trim();
      const email = formData.get('email').trim();

      if (companyName.length < 2) {
        throw new Error('Company name must have at least 2 characters.');
      }

      if (!email) {
        throw new Error('Email is required.');
      }

      const uploadedLogo = logoFile && logoFile.size > 0 ? await uploadCompanyLogo(logoFile) : undefined;

      await updateCompanySettings({
        companyName,
        email,
        logo: uploadedLogo,
        headOffice: formData.get('headOffice').trim() || undefined,
        businessType: formData.get('businessType') || undefined,
        trades: parseCsv(formData.get('trades')),
        city: formData.get('city').trim() || undefined,
        postcode: formData.get('postcode').trim() || undefined,
        description: formData.get('description').trim() || undefined,
      });

      setAlert(companySettingsAlert, 'Company settings saved. Refreshing dashboard...', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setAlert(companySettingsAlert, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save settings';
    }
  });

  workerSearchForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = workerSearchForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-search"></i> Searching...';
    setWorkerSearchStatus('Searching workers...');

    try {
      const workers = await searchWorkers(new FormData(workerSearchForm));
      if (!workers.length) {
        workerResults.innerHTML = `
          <article class="company-empty-card">
            <strong>No workers found</strong>
            <p>Try a broader trade, nearby city, or leave experience empty.</p>
          </article>
        `;
        setWorkerSearchStatus('No workers found for these filters.', 'empty');
        return;
      }

      workerResults.innerHTML = workers.map(renderWorker).join('');
      setWorkerSearchStatus(`${workers.length} worker${workers.length === 1 ? '' : 's'} found.`, 'success');
    } catch (error) {
      setWorkerSearchStatus(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-search"></i> Find Workers';
    }
  });

  [closeInviteWorkerModalBtn, cancelInviteWorkerBtn].forEach((button) => {
    button?.addEventListener('click', closeInviteWorkerModal);
  });

  inviteWorkerModal?.addEventListener('click', (event) => {
    if (event.target === inviteWorkerModal) {
      closeInviteWorkerModal();
    }
  });

  inviteWorkerJobList?.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[name="jobId"]');
    if (!checkbox || !checkbox.checked) return;

    inviteWorkerJobList.querySelectorAll('input[name="jobId"]').forEach((item) => {
      if (item !== checkbox) item.checked = false;
    });
  });

  inviteWorkerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!pendingInviteWorker) return;

    const selectedJob = inviteWorkerForm.querySelector('input[name="jobId"]:checked');
    if (!selectedJob) {
      setAlert(inviteWorkerAlert, 'Select an active job before sending the invite.');
      return;
    }

    const submitBtn = inviteWorkerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    if (inviteWorkerAlert) inviteWorkerAlert.hidden = true;

    try {
      await inviteWorkerToJob(pendingInviteWorker.id, selectedJob.value);
      setAlert(inviteWorkerAlert, `Job offer sent to ${pendingInviteWorker.name}.`, 'success');
      setWorkerSearchStatus(`Job offer sent to ${pendingInviteWorker.name}.`, 'success');
      setTimeout(closeInviteWorkerModal, 800);
    } catch (error) {
      setAlert(inviteWorkerAlert, error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send invite';
    }
  });

  const workerActionRoot = document.querySelector('.company-spa-main') || workerResults;
  workerActionRoot?.addEventListener('click', async (event) => {
    const inviteButton = event.target.closest('[data-invite-worker-job]');
    if (inviteButton) {
      const workerId = inviteButton.dataset.workerId;
      const workerName = inviteButton.dataset.workerName || 'worker';
      if (!workerId) return;

      openInviteWorkerModal(workerId, workerName);
      return;
    }

    const profileButton = event.target.closest('[data-view-recommended-worker-profile]');
    if (profileButton) {
      const workerId = profileButton.dataset.workerId;
      if (!workerId || !workerProfileContent) return;

      workerProfileContent.innerHTML = '<p class="company-side-empty">Loading worker profile...</p>';
      openWorkerProfileModal();

      try {
        const profile = await fetchWorkerProfile(workerId);
        workerProfileContent.innerHTML = renderWorkerProfile(profile);
      } catch (error) {
        workerProfileContent.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
      return;
    }

    const button = event.target.closest('[data-send-worker-message]');
    if (!button) return;

    const workerId = button.dataset.workerId;
    const workerName = button.dataset.workerName || 'this worker';
    if (!workerId) return;

    if (typeof openContactMessageModal === 'function' && contactMessageModal && contactMessageForm) {
      openContactMessageModal(workerId, workerName);
      return;
    }

    const message = window.prompt(`Write a message to ${workerName}:`);

    if (message === null) return;

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      alert('Please write a message before sending.');
      return;
    }

    button.disabled = true;
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="bi bi-send"></i> Sending...';

    try {
      await sendWorkerMessage(workerId, trimmedMessage);
      button.innerHTML = '<i class="bi bi-check2"></i> Message sent';
      setWorkerSearchStatus(`Message sent to ${workerName}.`, 'success');
      setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalHtml;
      }, 1200);
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  });

  document.querySelectorAll('[data-delete-application]').forEach((button) => {
    button.addEventListener('click', async () => {
      const row = button.closest('[data-application-row]');
      const applicationId = row?.dataset.applicationId;
      const workerName = row?.querySelector('.company-worker-info strong')?.textContent?.trim() || 'this applicant';
      if (!applicationId) return;

      const confirmed = window.confirm(`Delete ${workerName} from Applicants?`);
      if (!confirmed) return;

      button.disabled = true;

      try {
        await deleteApplication(applicationId);
        row?.remove();
        refreshApplicantsEmptyState();
        updateApplicantJobFilter();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-application-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const row = button.closest('[data-application-row]');
      const applicationId = row?.dataset.applicationId;
      const status = button.dataset.applicationAction;
      const statusEl = row?.querySelector('[data-application-status]');
      const actionButtons = row?.querySelectorAll('[data-application-action]');

      if (!applicationId || !status) return;

      actionButtons?.forEach((item) => {
        item.disabled = true;
      });

      try {
        await updateApplicationStatus(applicationId, status);
        if (statusEl) {
          statusEl.textContent = status;
          statusEl.className = `company-application-status ${status}`;
        }
        row.classList.add(status === 'accepted' ? 'application-accepted' : 'application-rejected');
      } catch (error) {
        alert(error.message);
      } finally {
        actionButtons?.forEach((item) => {
          item.disabled = false;
        });
      }
    });
  });

  document.querySelectorAll('[data-save-applicant-contact]').forEach((button) => {
    button.addEventListener('click', async () => {
      const row = button.closest('[data-application-row]');
      const workerId = row?.dataset.workerId;
      const applicationId = row?.dataset.applicationId;
      if (!workerId || !applicationId) return;

      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Saving...';

      try {
        await saveApplicantContact(workerId, applicationId);
        button.textContent = 'Saved';
        button.classList.add('saved');
        const applicationStatus = row?.querySelector('[data-application-status]')?.textContent?.trim().toLowerCase();
        if (applicationStatus === 'rejected') {
          row?.remove();
          refreshApplicantsEmptyState();
          updateApplicantJobFilter();
        }
        if (contactsJournalModal?.classList.contains('open')) {
          const contacts = await fetchCompanyContacts();
          contactsJournalCache = contacts;
          populateContactsJournalFilters(contactsJournalCache);
          renderContactsJournal(contactsJournalCache);
        }
      } catch (error) {
        alert(error.message);
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  });

  document.querySelectorAll('[data-view-worker-profile]').forEach((button) => {
    button.addEventListener('click', async () => {
      const row = button.closest('[data-application-row]');
      const workerId = row?.dataset.workerId;
      if (!workerId || !workerProfileContent) return;

      workerProfileContent.innerHTML = '<p class="company-side-empty">Loading worker profile...</p>';
      openWorkerProfileModal();

      try {
        const profile = await fetchWorkerProfile(workerId);
        workerProfileContent.innerHTML = renderWorkerProfile(profile);
      } catch (error) {
        workerProfileContent.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
    });
  });

  document.querySelectorAll('[data-team-worker-profile]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-team-worker-card]');
      const workerId = card?.dataset.workerId;
      const applicationId = card?.dataset.applicationId;
      if (!workerId || !workerProfileContent) return;

      workerProfileContent.innerHTML = '<p class="company-side-empty">Loading worker profile...</p>';
      openWorkerProfileModal();

      try {
        const profile = await fetchWorkerProfile(workerId);
        workerProfileContent.innerHTML = renderWorkerProfile(profile, {
          workerId,
          applicationId: applicationId || null,
          occupation: card?.dataset.occupation || '',
          permissions: {
            canPostJobs: card?.dataset.canPostJobs === 'true',
            canPostCompanyPosts: card?.dataset.canPostCompanyPosts === 'true',
          },
        });
      } catch (error) {
        workerProfileContent.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
      }
    });
  });

  const teamSearchInput = document.getElementById('companyTeamSearch');
  const teamSearchResults = document.querySelector('[data-team-search-results]');
  const teamSearchEmpty = document.querySelector('[data-team-search-empty]');
  let teamSearchTimer = null;
  let teamSearchRequestId = 0;
  let pendingTeamAddWorker = null;

  function hideTeamSearchResults() {
    if (teamSearchResults) {
      teamSearchResults.hidden = true;
      teamSearchResults.innerHTML = '';
    }
    pendingTeamAddWorker = null;
  }

  function renderTeamSearchResults(workers, query) {
    if (!teamSearchResults) return;

    if (!workers.length) {
      teamSearchResults.hidden = true;
      teamSearchResults.innerHTML = '';
      if (teamSearchEmpty) teamSearchEmpty.hidden = false;
      return;
    }

    if (teamSearchEmpty) teamSearchEmpty.hidden = true;
    teamSearchResults.hidden = false;
    teamSearchResults.innerHTML = workers.map((worker) => {
      const initial = escapeHtml((worker.name || 'W').charAt(0).toUpperCase());
      const photo = worker.profilePhoto
        ? `<img src="${escapeHtml(getMediaUrl(worker.profilePhoto))}" alt="">`
        : initial;
      const meta = worker.isOnTeam
        ? '<span class="company-team-search-item-meta is-on-team">On team</span>'
        : '<span class="company-team-search-item-meta">Add</span>';
      return `
        <button
          type="button"
          class="company-team-search-item"
          data-team-search-pick
          data-worker-id="${escapeHtml(String(worker.id))}"
          data-worker-name="${escapeHtml(worker.name || 'Worker')}"
          data-is-on-team="${worker.isOnTeam ? 'true' : 'false'}"
          data-application-id="${escapeHtml(String(worker.applicationId || ''))}"
          data-occupation="${escapeHtml(worker.occupation || '')}"
        >
          <span class="company-worker-avatar ${worker.profilePhoto ? 'has-photo' : ''}">${photo}</span>
          <span>
            <strong>${escapeHtml(worker.name || 'Worker')}</strong>
            <small>${escapeHtml(worker.trade || 'Trade not set')} · ${escapeHtml(worker.city || 'Location not set')}</small>
          </span>
          ${meta}
        </button>
      `;
    }).join('');
  }

  function showTeamAddForm(worker) {
    if (!teamSearchResults) return;
    pendingTeamAddWorker = worker;
    teamSearchResults.hidden = false;
    teamSearchResults.innerHTML = `
      <div class="company-team-search-add" data-team-add-panel>
        <strong>Add ${escapeHtml(worker.name)} to your team</strong>
        <label>
          Occupation in your company
          <input
            type="text"
            data-team-add-occupation
            maxlength="120"
            placeholder="e.g. Site Supervisor, Electrician"
            value="${escapeHtml(worker.occupation || '')}"
          >
        </label>
        <div class="company-team-search-add-actions">
          <button type="button" class="company-submit-btn" data-team-add-confirm>Add to team</button>
          <button type="button" class="company-secondary-btn" data-team-add-cancel>Cancel</button>
        </div>
      </div>
    `;
    teamSearchResults.querySelector('[data-team-add-occupation]')?.focus();
  }

  async function runPlatformTeamSearch(query) {
    const requestId = ++teamSearchRequestId;
    try {
      const workers = await searchPlatformWorkers(query);
      if (requestId !== teamSearchRequestId) return;
      renderTeamSearchResults(workers, query);
    } catch (error) {
      if (requestId !== teamSearchRequestId) return;
      hideTeamSearchResults();
      if (teamSearchEmpty) {
        teamSearchEmpty.hidden = false;
        teamSearchEmpty.textContent = error.message || 'Could not search workers.';
      }
    }
  }

  teamSearchInput?.addEventListener('input', () => {
    const query = (teamSearchInput.value || '').trim();
    clearTimeout(teamSearchTimer);
    pendingTeamAddWorker = null;

    if (query.length < 2) {
      hideTeamSearchResults();
      if (teamSearchEmpty) {
        teamSearchEmpty.hidden = true;
        teamSearchEmpty.textContent = 'No workers match this search.';
      }
      return;
    }

    teamSearchTimer = setTimeout(() => {
      runPlatformTeamSearch(query);
    }, 250);
  });

  teamSearchResults?.addEventListener('click', async (event) => {
    event.stopPropagation();

    const cancelBtn = event.target.closest('[data-team-add-cancel]');
    if (cancelBtn) {
      const query = (teamSearchInput?.value || '').trim();
      if (query.length >= 2) runPlatformTeamSearch(query);
      else hideTeamSearchResults();
      return;
    }

    const confirmBtn = event.target.closest('[data-team-add-confirm]');
    if (confirmBtn) {
      const occupationInput = teamSearchResults.querySelector('[data-team-add-occupation]');
      const occupation = String(occupationInput?.value || '').trim();
      if (!pendingTeamAddWorker?.id) {
        alert('Select a worker again, then add them to your team.');
        return;
      }
      if (occupation.length < 2) {
        alert('Enter an occupation name (at least 2 characters).');
        occupationInput?.focus();
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Adding...';
      try {
        await addWorkerToTeam(pendingTeamAddWorker.id, occupation);
        window.location.hash = '#my-team';
        window.location.reload();
      } catch (error) {
        alert(error.message);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Add to team';
      }
      return;
    }

    const pick = event.target.closest('[data-team-search-pick]');
    if (!pick) return;

    const workerId = pick.dataset.workerId;
    const isOnTeam = pick.dataset.isOnTeam === 'true';
    const applicationId = pick.dataset.applicationId || '';
    const occupation = pick.dataset.occupation || '';
    const name = pick.dataset.workerName || 'Worker';

    if (isOnTeam) {
      hideTeamSearchResults();
      const card = document.querySelector(`[data-team-worker-card][data-worker-id="${workerId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.querySelector('[data-team-worker-profile]')?.click();
      } else if (workerProfileContent) {
        workerProfileContent.innerHTML = '<p class="company-side-empty">Loading worker profile...</p>';
        openWorkerProfileModal();
        try {
          const profile = await fetchWorkerProfile(workerId);
          workerProfileContent.innerHTML = renderWorkerProfile(profile, {
            workerId,
            applicationId: applicationId || null,
            occupation,
          });
        } catch (error) {
          workerProfileContent.innerHTML = `<p class="company-side-empty">${escapeHtml(error.message)}</p>`;
        }
      }
      return;
    }

    showTeamAddForm({ id: workerId, name, occupation });
  });

  // Close only on true outside clicks. Ignore detached nodes from result re-renders.
  document.addEventListener('pointerdown', (event) => {
    if (!teamSearchResults || teamSearchResults.hidden) return;
    const toolbar = document.querySelector('.company-team-toolbar');
    if (toolbar?.contains(event.target)) return;
    hideTeamSearchResults();
  });

  workerProfileContent?.addEventListener('submit', async (event) => {
    const occupationForm = event.target.closest('[data-team-occupation-form]');
    if (occupationForm) {
      event.preventDefault();
      const applicationId = occupationForm.dataset.applicationId || '';
      const workerId = occupationForm.dataset.workerId || '';
      const submitBtn = occupationForm.querySelector('button[type="submit"]');
      const formData = new FormData(occupationForm);
      const occupation = String(formData.get('occupation') || '').trim();

      if (occupation.length < 2) {
        alert('Enter an occupation name (at least 2 characters).');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      try {
        let nextOccupation = occupation;
        if (workerId) {
          const member = await updateRosterOccupation(workerId, occupation);
          nextOccupation = member.occupation || occupation || '';
        } else if (applicationId) {
          const application = await updateTeamOccupation(applicationId, occupation);
          nextOccupation = application.company_occupation || occupation || '';
        } else {
          throw new Error('Missing worker for occupation update.');
        }

        const card = workerId
          ? document.querySelector(`[data-team-worker-card][data-worker-id="${workerId}"]`)
          : document.querySelector(`[data-team-worker-card][data-application-id="${applicationId}"]`);
        if (card) {
          card.dataset.occupation = nextOccupation;
          const label = card.querySelector('[data-team-occupation-label]');
          if (label) {
            label.innerHTML = nextOccupation
              ? `<i class="bi bi-person-badge"></i> Works as <strong>${escapeHtml(nextOccupation)}</strong>`
              : '<i class="bi bi-person-badge"></i> Occupation not set';
          }
        }
        submitBtn.textContent = 'Occupation saved';
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save occupation';
        }, 1200);
      } catch (error) {
        alert(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save occupation';
      }
      return;
    }

    const permissionsForm = event.target.closest('[data-team-permissions-form]');
    if (permissionsForm) {
      event.preventDefault();
      const applicationId = permissionsForm.dataset.applicationId;
      const submitBtn = permissionsForm.querySelector('button[type="submit"]');
      const formData = new FormData(permissionsForm);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      try {
        const application = await updateTeamPermissions(applicationId, {
          canPostJobs: formData.has('canPostJobs'),
          canPostCompanyPosts: formData.has('canPostCompanyPosts'),
        });
        const card = document.querySelector(`[data-team-worker-card][data-application-id="${applicationId}"]`);
        moveTeamCardByPermissions(card, {
          canPostJobs: Boolean(application.can_post_jobs),
          canPostCompanyPosts: Boolean(application.can_post_company_posts),
        });
        submitBtn.textContent = 'Permissions saved';
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save permissions';
        }, 1200);
      } catch (error) {
        alert(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save permissions';
      }
      return;
    }

    const form = event.target.closest('[data-worker-review-form]');
    if (!form) return;

    event.preventDefault();
    const workerId = form.dataset.workerId;
    const submitBtn = form.querySelector('button[type="submit"]');
    const rating = Number(new FormData(form).get('rating'));
    const feedback = new FormData(form).get('feedback')?.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      await submitWorkerReview(workerId, { rating, feedback });
      submitBtn.textContent = 'Review saved';
    } catch (error) {
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit feedback';
    }
  });

  workerProfileContent?.addEventListener('click', (event) => {
    const starButton = event.target.closest('.team-rating-star');
    if (!starButton) return;

    const ratingBox = starButton.closest('.team-rating-stars');
    const ratingInput = ratingBox?.querySelector('input[name="rating"]');
    const selectedValue = Number(starButton.dataset.ratingStar);

    if (ratingInput) {
      ratingInput.value = String(selectedValue);
    }

    ratingBox?.querySelectorAll('[data-rating-star]').forEach((star) => {
      star.classList.toggle('selected', Number(star.dataset.ratingStar) <= selectedValue);
    });
  });

  workerProfileContent?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-unhire-worker]');
    if (!button) return;

    const applicationId = button.dataset.applicationId;
    if (!applicationId) return;

    const confirmed = window.confirm('Unhire this worker from your team?');
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Unhiring...';

    try {
      await updateApplicationStatus(applicationId, 'unhired');
      const card = document.querySelector(`[data-team-worker-card][data-application-id="${applicationId}"]`);
      const applicantRow = document.querySelector(`[data-application-row][data-application-id="${applicationId}"]`);
      card?.remove();
      applicantRow?.remove();
      refreshApplicantsEmptyState();
      closeWorkerProfileModal();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = 'Unhire this worker';
    }
  });

  const COMPANY_VIEW_IDS = ['dashboard', 'jobs', 'applicants', 'my-team', 'search-workers', 'social-posts', 'settings'];
  const COMPANY_VIEW_TITLES = {
    dashboard: 'Dashboard',
    jobs: 'Jobs',
    applicants: 'Applicants',
    'my-team': 'My Team',
    'search-workers': 'Search Workers',
    'social-posts': 'Portfolio',
    settings: 'Settings',
  };
  const COMPANY_DASHBOARD_FOCUS_REDIRECTS = {
    'active-jobs': 'jobs',
    applicants: 'applicants',
  };
  const COMPANY_LEGACY_ROUTES = {
    'active-jobs': { view: 'jobs', focus: null },
    applicants: { view: 'applicants', focus: null },
    messages: { view: 'dashboard', focus: 'messages' },
    'recommended-workers': { view: 'search-workers', focus: null },
    'company-feed': { view: 'social-posts', focus: null },
    settings: { view: 'settings', focus: null },
    'my-team': { view: 'my-team', focus: null },
  };
  const companySpaViews = document.querySelectorAll('[data-company-view]');
  const companyNavLinks = document.querySelectorAll('[data-company-nav]');
  const companyGotoLinks = document.querySelectorAll('[data-company-goto]');

  function parseCompanyRoute() {
    const rawHash = (window.location.hash || '#dashboard').replace(/^#/, '');
    const [viewKey, focusKey] = rawHash.split('/').filter(Boolean);

    if (!viewKey) {
      return { view: 'dashboard', focus: null };
    }

    if (viewKey === 'dashboard' && focusKey && COMPANY_DASHBOARD_FOCUS_REDIRECTS[focusKey]) {
      return { view: COMPANY_DASHBOARD_FOCUS_REDIRECTS[focusKey], focus: null };
    }

    if (COMPANY_VIEW_IDS.includes(viewKey)) {
      return { view: viewKey, focus: focusKey || null };
    }

    if (COMPANY_LEGACY_ROUTES[viewKey]) {
      return COMPANY_LEGACY_ROUTES[viewKey];
    }

    return { view: 'dashboard', focus: null };
  }

  function updateCompanyNavState(viewId, focusId) {
    companyNavLinks.forEach((link) => {
      const navView = link.dataset.companyNav;
      const navFocus = link.dataset.companyFocus || null;
      const isMainDashboard = navView === 'dashboard' && !navFocus && viewId === 'dashboard' && !focusId;
      const isFocusedDashboard = navView === 'dashboard' && navFocus && viewId === 'dashboard' && navFocus === focusId;
      const isSectionView = navView === viewId && !navFocus;
      link.classList.toggle('active', isMainDashboard || isFocusedDashboard || isSectionView);
    });
  }

  function focusCompanySection(focusId) {
    if (!focusId) return;
    if (focusId === 'messages') {
      openCompanyMessages();
      return;
    }
    requestAnimationFrame(() => {
      const target = document.getElementById(focusId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function setCompanyView(viewId, { focus = null, replaceHash = true, pushHash = false } = {}) {
    const targetView = COMPANY_VIEW_IDS.includes(viewId) ? viewId : 'dashboard';

    companySpaViews.forEach((section) => {
      const isActive = section.dataset.companyView === targetView;
      section.classList.toggle('is-active', isActive);
      section.hidden = !isActive;
    });

    updateCompanyNavState(targetView, focus);
    document.title = `${COMPANY_VIEW_TITLES[targetView] || 'Dashboard'} | SiteCrew`;

    const nextHash = focus ? `#${targetView}/${focus}` : `#${targetView}`;
    if (replaceHash || pushHash) {
      const hashMethod = pushHash ? 'pushState' : 'replaceState';
      if (window.location.hash !== nextHash) {
        window.history[hashMethod](null, '', nextHash);
      }
    }

    if (targetView === 'dashboard' && focus) {
      focusCompanySection(focus);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initCompanySpaRouter() {
    companyNavLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const navView = link.dataset.companyNav;
        if (!navView) return;
        event.preventDefault();
        setCompanyView(navView, {
          focus: link.dataset.companyFocus || null,
          replaceHash: false,
          pushHash: true,
        });
      });
    });

    companyGotoLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        setCompanyView(link.dataset.companyGoto, {
          focus: link.dataset.companyFocus || null,
          replaceHash: false,
          pushHash: true,
        });
      });
    });

    window.addEventListener('hashchange', () => {
      const route = parseCompanyRoute();
      setCompanyView(route.view, { focus: route.focus, replaceHash: false });
    });

    const route = parseCompanyRoute();
    setCompanyView(route.view, { focus: route.focus, replaceHash: false });
  }

  const companyTopbarSearch = document.getElementById('companyTopbarSearch');
  const openCompanyNotificationsSide = document.getElementById('openCompanyNotificationsSide');
  const openCompanyMessagesSide = document.getElementById('openCompanyMessagesSide');

  companyTopbarSearch?.addEventListener('focus', () => {
    setCompanyView('search-workers', { replaceHash: false, pushHash: true });
    workerSearchForm?.querySelector('input[name="trade"]')?.focus();
  });

  openCompanyNotificationsSide?.addEventListener('click', openCompanyNotifications);
  openCompanyMessagesSide?.addEventListener('click', openCompanyMessages);

  document.querySelectorAll('[data-open-company-messages]').forEach((button) => {
    button.addEventListener('click', openCompanyMessages);
  });

  initCompanySpaRouter();
  guardCompanySession();
})();
