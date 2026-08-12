/**
 * Canonical Email Control modes.
 * Frontend cards use the same `key` values via data-email-mode / data-email-auto-mode.
 *
 * sendReady / countReady mark what the service can do today.
 * Event-driven modes usually count pending triggers; digest modes count audience size.
 */

const EMAIL_CONTROL_MODES = [
  {
    key: 'interests',
    audience: 'worker',
    label: 'Joburi pe interese',
    description: 'Joburi noi după interesele workerului.',
    trigger: 'job_created',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'location',
    audience: 'worker',
    label: 'Joburi pe locație',
    description: 'Joburi noi după locația workerului.',
    trigger: 'job_created',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'interests-location',
    audience: 'worker',
    label: 'Interese + locație',
    description: 'Joburi noi după interese și locație.',
    trigger: 'job_created',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'company-contact',
    audience: 'worker',
    label: 'Contact de la companii',
    description: 'Când o companie contactează workerul.',
    trigger: 'message_created',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'unread-12h',
    audience: 'worker',
    label: 'Mesaje fără răspuns 12h',
    description: 'Workeri care nu au răspuns peste 12 ore.',
    trigger: 'schedule',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'job-prices-interests',
    audience: 'worker',
    label: 'Prețuri joburi — astăzi',
    description: 'Prețurile joburilor de azi după interese.',
    trigger: 'schedule',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'job-invite',
    audience: 'worker',
    label: 'Invitație la job',
    description: 'Când o companie invită workerul la un job.',
    trigger: 'invite_created',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'application-status',
    audience: 'worker',
    label: 'Status aplicație',
    description: 'Acceptat, respins sau schimbare pe aplicație.',
    trigger: 'application_updated',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'verification-status',
    audience: 'worker',
    label: 'Status verificare',
    description: 'Update la verificarea profilului workerului.',
    trigger: 'verification_updated',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'new-review',
    audience: 'worker',
    label: 'Recenzie nouă',
    description: 'Când o companie lasă rating / feedback.',
    trigger: 'review_created',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'profile-incomplete',
    audience: 'worker',
    label: 'Profil incomplet',
    description: 'Reminder pentru poză, interese sau date lipsă.',
    trigger: 'schedule',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'availability-reminder',
    audience: 'worker',
    label: 'Disponibilitate neactualizată',
    description: 'Nudge dacă statusul e vechi (Busy / Available Soon).',
    trigger: 'schedule',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'followed-company-jobs',
    audience: 'worker',
    label: 'Joburi companii urmărite',
    description: 'Joburi noi de la companiile pe care le urmărește.',
    trigger: 'job_created',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'expected-rate-missing',
    audience: 'worker',
    label: 'Tarif lipsă',
    description: 'Reminder să seteze expected rate pentru matching.',
    trigger: 'schedule',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'company-new-applications',
    audience: 'company',
    label: 'Aplicații noi',
    description: 'Când workeri aplică la joburile deschise.',
    trigger: 'application_created',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'company-matched-workers',
    audience: 'company',
    label: 'Workeri potriviți',
    description: 'Workeri disponibili după trade / locație.',
    trigger: 'schedule',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'company-worker-contact',
    audience: 'company',
    label: 'Contact de la workeri',
    description: 'Când un worker contactează compania.',
    trigger: 'message_created',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'company-unread-12h',
    audience: 'company',
    label: 'Mesaje fără răspuns 12h',
    description: 'Companii care nu au răspuns peste 12 ore.',
    trigger: 'schedule',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'company-application-withdrawn',
    audience: 'company',
    label: 'Aplicație retrasă',
    description: 'Când un candidat își retrage aplicația.',
    trigger: 'application_withdrawn',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'company-verification',
    audience: 'company',
    label: 'Status verificare',
    description: 'Update la verificarea contului companiei.',
    trigger: 'verification_updated',
    countReady: false,
    sendReady: false,
  },
  {
    key: 'company-plan-expiry',
    audience: 'company',
    label: 'Expirare plan',
    description: 'Reminder când planul se apropie de expirare.',
    trigger: 'schedule',
    countReady: true,
    sendReady: false,
  },
  {
    key: 'company-rates-digest',
    audience: 'company',
    label: 'Rate & disponibilitate — azi',
    description: 'Digest zilnic cu rate/disponibilitate pe trade.',
    trigger: 'schedule',
    countReady: true,
    sendReady: false,
  },
];

const EMAIL_CONTROL_MODE_MAP = Object.fromEntries(
  EMAIL_CONTROL_MODES.map((mode) => [mode.key, mode])
);

function getEmailControlMode(modeKey) {
  return EMAIL_CONTROL_MODE_MAP[modeKey] || null;
}

function listEmailControlModes() {
  return EMAIL_CONTROL_MODES.slice();
}

module.exports = {
  EMAIL_CONTROL_MODES,
  EMAIL_CONTROL_MODE_MAP,
  getEmailControlMode,
  listEmailControlModes,
};
