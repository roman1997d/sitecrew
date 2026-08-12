const pool = require('../../../db/pool');
const env = require('../../../config/env');
const { jobMatchesTradeInterests } = require('../../../utils/tradeMatching');
const { getEmailControlMode } = require('./modes');

function siteUrl(path = '') {
  const base = env.publicUrl.replace(/\/$/, '');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizePlace(value = '') {
  return String(value).toLowerCase().trim();
}

function workerMatchesJobLocation(worker, job) {
  const jobCity = normalizePlace(job.city);
  const jobPostcode = normalizePlace(job.postcode);
  if (!jobCity && !jobPostcode) {
    return false;
  }

  const places = [
    worker.city,
    worker.postcode,
    ...(Array.isArray(worker.work_locations) ? worker.work_locations : []),
  ]
    .map(normalizePlace)
    .filter(Boolean);

  return places.some((place) => {
    if (jobCity && (place.includes(jobCity) || jobCity.includes(place))) {
      return true;
    }
    if (jobPostcode) {
      const prefix = jobPostcode.slice(0, 3);
      if (place.includes(jobPostcode) || (prefix && place.includes(prefix))) {
        return true;
      }
    }
    return false;
  });
}

async function listActiveWorkers() {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       wp.full_name,
       wp.trade_interests,
       wp.city,
       wp.postcode,
       wp.work_locations,
       wp.profile_photo,
       wp.expected_rate,
       wp.availability_status,
       wp.updated_at
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'`
  );
  return result.rows;
}

async function listActiveCompanies() {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       cp.company_name,
       cp.trades,
       cp.city,
       cp.postcode,
       cp.plan,
       cp.plan_expires_at,
       cp.verification_status
     FROM users u
     JOIN company_profiles cp ON cp.user_id = u.id
     WHERE u.role = 'company'
       AND u.status = 'active'`
  );
  return result.rows;
}

async function getRecentOpenJobs(limit = 8) {
  const result = await pool.query(
    `SELECT j.*, cp.company_name
     FROM jobs j
     JOIN company_profiles cp ON cp.user_id = j.company_id
     WHERE j.status = 'open'
       AND COALESCE(j.moderation_status, 'visible') <> 'hidden'
     ORDER BY j.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getTodayOpenJobs(limit = 20) {
  const result = await pool.query(
    `SELECT j.*, cp.company_name
     FROM jobs j
     JOIN company_profiles cp ON cp.user_id = j.company_id
     WHERE j.status = 'open'
       AND COALESCE(j.moderation_status, 'visible') <> 'hidden'
       AND j.created_at >= CURRENT_DATE
     ORDER BY j.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

function mapWorkerRecipient(row, extras = {}) {
  return {
    userId: row.id,
    email: row.email,
    name: row.full_name || 'there',
    audience: 'worker',
    ...extras,
  };
}

function mapCompanyRecipient(row, extras = {}) {
  return {
    userId: row.id,
    email: row.email,
    name: row.company_name || 'there',
    audience: 'company',
    ...extras,
  };
}

async function resolveRecipients(modeKey, context = {}) {
  const mode = getEmailControlMode(modeKey);
  if (!mode) {
    const error = new Error('Unknown email control mode.');
    error.statusCode = 404;
    throw error;
  }

  // Event-targeted single recipient
  if (context.targetUserId) {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.role,
         wp.full_name,
         cp.company_name
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN company_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1
         AND u.status = 'active'`,
      [context.targetUserId]
    );
    if (!result.rowCount) {
      return { mode, recipients: [], meta: { reason: 'target_user_missing' } };
    }
    const row = result.rows[0];
    return {
      mode,
      recipients: [{
        userId: row.id,
        email: row.email,
        name: row.full_name || row.company_name || 'there',
        audience: row.role === 'company' ? 'company' : 'worker',
        ...context.extras,
      }],
      meta: { event: true },
    };
  }

  switch (modeKey) {
    case 'interests': {
      const [workers, jobs] = await Promise.all([listActiveWorkers(), getRecentOpenJobs()]);
      const recipients = workers
        .filter((worker) => (worker.trade_interests || []).length > 0)
        .filter((worker) => jobs.some((job) => jobMatchesTradeInterests(job, worker.trade_interests || [])))
        .map((worker) => mapWorkerRecipient(worker, {
          matchedJobs: jobs.filter((job) => jobMatchesTradeInterests(job, worker.trade_interests || [])).slice(0, 5),
        }));
      return { mode, recipients, meta: { jobsConsidered: jobs.length } };
    }
    case 'location': {
      const [workers, jobs] = await Promise.all([listActiveWorkers(), getRecentOpenJobs()]);
      const recipients = workers
        .filter((worker) => {
          const hasLocation = Boolean(
            normalizePlace(worker.city)
            || normalizePlace(worker.postcode)
            || (worker.work_locations || []).length
          );
          if (!hasLocation) return false;
          return jobs.some((job) => workerMatchesJobLocation(worker, job));
        })
        .map((worker) => mapWorkerRecipient(worker, {
          matchedJobs: jobs.filter((job) => workerMatchesJobLocation(worker, job)).slice(0, 5),
        }));
      return { mode, recipients, meta: { jobsConsidered: jobs.length } };
    }
    case 'interests-location': {
      const [workers, jobs] = await Promise.all([listActiveWorkers(), getRecentOpenJobs()]);
      const recipients = workers
        .filter((worker) => (worker.trade_interests || []).length > 0)
        .filter((worker) => jobs.some(
          (job) => jobMatchesTradeInterests(job, worker.trade_interests || [])
            && workerMatchesJobLocation(worker, job)
        ))
        .map((worker) => mapWorkerRecipient(worker, {
          matchedJobs: jobs
            .filter((job) => jobMatchesTradeInterests(job, worker.trade_interests || [])
              && workerMatchesJobLocation(worker, job))
            .slice(0, 5),
        }));
      return { mode, recipients, meta: { jobsConsidered: jobs.length } };
    }
    case 'job-prices-interests': {
      const [workers, jobs] = await Promise.all([listActiveWorkers(), getTodayOpenJobs()]);
      const openJobs = jobs.length ? jobs : await getRecentOpenJobs(10);
      const recipients = workers
        .filter((worker) => (worker.trade_interests || []).length > 0)
        .filter((worker) => openJobs.some((job) => jobMatchesTradeInterests(job, worker.trade_interests || [])))
        .map((worker) => mapWorkerRecipient(worker, {
          matchedJobs: openJobs
            .filter((job) => jobMatchesTradeInterests(job, worker.trade_interests || []))
            .slice(0, 5),
        }));
      return { mode, recipients, meta: { jobsConsidered: openJobs.length, todayOnly: jobs.length > 0 } };
    }
    case 'followed-company-jobs': {
      const jobs = await getRecentOpenJobs(30);
      const companyIds = [...new Set(jobs.map((job) => job.company_id))];
      if (!companyIds.length) {
        return { mode, recipients: [], meta: { jobsConsidered: 0 } };
      }
      const result = await pool.query(
        `SELECT DISTINCT
           u.id,
           u.email,
           wp.full_name,
           f.following_id AS company_id
         FROM users u
         JOIN worker_profiles wp ON wp.user_id = u.id
         JOIN follows f ON f.follower_id = u.id
         WHERE u.role = 'worker'
           AND u.status = 'active'
           AND f.following_id = ANY($1::int[])`,
        [companyIds]
      );
      const recipients = result.rows.map((row) => mapWorkerRecipient(row, {
        matchedJobs: jobs.filter((job) => Number(job.company_id) === Number(row.company_id)).slice(0, 5),
      }));
      // Deduplicate by user, merge jobs
      const byUser = new Map();
      for (const recipient of recipients) {
        const existing = byUser.get(recipient.userId);
        if (!existing) {
          byUser.set(recipient.userId, recipient);
          continue;
        }
        existing.matchedJobs = [...(existing.matchedJobs || []), ...(recipient.matchedJobs || [])]
          .filter((job, index, all) => all.findIndex((item) => item.id === job.id) === index)
          .slice(0, 5);
      }
      return { mode, recipients: [...byUser.values()], meta: { jobsConsidered: jobs.length } };
    }
    case 'profile-incomplete': {
      const workers = await listActiveWorkers();
      const recipients = workers
        .filter((worker) => {
          const missingPhoto = !normalizePlace(worker.profile_photo);
          const missingInterests = !(worker.trade_interests || []).length;
          const missingLocation = !(
            normalizePlace(worker.city)
            || normalizePlace(worker.postcode)
            || (worker.work_locations || []).length
          );
          return missingPhoto || missingInterests || missingLocation;
        })
        .map((worker) => mapWorkerRecipient(worker, {
          ctaUrl: siteUrl('/worker/dashboard'),
        }));
      return { mode, recipients, meta: {} };
    }
    case 'expected-rate-missing': {
      const workers = await listActiveWorkers();
      const recipients = workers
        .filter((worker) => !normalizePlace(worker.expected_rate))
        .map((worker) => mapWorkerRecipient(worker, {
          ctaUrl: siteUrl('/worker/dashboard'),
        }));
      return { mode, recipients, meta: {} };
    }
    case 'availability-reminder': {
      const result = await pool.query(
        `SELECT u.id, u.email, wp.full_name, wp.availability_status, wp.updated_at
         FROM users u
         JOIN worker_profiles wp ON wp.user_id = u.id
         WHERE u.role = 'worker'
           AND u.status = 'active'
           AND COALESCE(wp.availability_status, '') <> 'Available Now'
           AND wp.updated_at < NOW() - INTERVAL '3 days'`
      );
      return {
        mode,
        recipients: result.rows.map((row) => mapWorkerRecipient(row, {
          ctaUrl: siteUrl('/worker/dashboard'),
          availabilityStatus: row.availability_status,
        })),
        meta: {},
      };
    }
    case 'unread-12h': {
      const result = await pool.query(
        `SELECT DISTINCT u.id, u.email, wp.full_name
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN users u ON u.id = c.worker_id
         JOIN worker_profiles wp ON wp.user_id = u.id
         WHERE u.status = 'active'
           AND m.sender_id = c.company_id
           AND m.read_at IS NULL
           AND COALESCE(m.moderation_status, 'visible') <> 'hidden'
           AND m.created_at <= NOW() - INTERVAL '12 hours'
           AND NOT EXISTS (
             SELECT 1
             FROM messages reply
             WHERE reply.conversation_id = c.id
               AND reply.sender_id = c.worker_id
               AND reply.created_at > m.created_at
           )`
      );
      return {
        mode,
        recipients: result.rows.map((row) => mapWorkerRecipient(row, {
          ctaUrl: siteUrl('/worker/dashboard'),
        })),
        meta: {},
      };
    }
    case 'company-unread-12h': {
      const result = await pool.query(
        `SELECT DISTINCT u.id, u.email, cp.company_name
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN users u ON u.id = c.company_id
         JOIN company_profiles cp ON cp.user_id = u.id
         WHERE u.status = 'active'
           AND m.sender_id = c.worker_id
           AND m.read_at IS NULL
           AND COALESCE(m.moderation_status, 'visible') <> 'hidden'
           AND m.created_at <= NOW() - INTERVAL '12 hours'
           AND NOT EXISTS (
             SELECT 1
             FROM messages reply
             WHERE reply.conversation_id = c.id
               AND reply.sender_id = c.company_id
               AND reply.created_at > m.created_at
           )`
      );
      return {
        mode,
        recipients: result.rows.map((row) => mapCompanyRecipient(row, {
          ctaUrl: siteUrl('/company/dashboard'),
        })),
        meta: {},
      };
    }
    case 'company-plan-expiry': {
      const companies = await listActiveCompanies();
      const recipients = companies
        .filter((company) => company.plan_expires_at
          && new Date(company.plan_expires_at) <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
        .map((company) => mapCompanyRecipient(company, {
          ctaUrl: siteUrl('/company/dashboard'),
          planExpiresAt: company.plan_expires_at,
          plan: company.plan,
        }));
      return { mode, recipients, meta: {} };
    }
    case 'company-matched-workers':
    case 'company-rates-digest': {
      const companies = await listActiveCompanies();
      return {
        mode,
        recipients: companies.map((company) => mapCompanyRecipient(company, {
          ctaUrl: siteUrl('/company/dashboard'),
        })),
        meta: {},
      };
    }
    // Event-driven modes without target: empty for manual unless we have pending events
    case 'company-contact':
    case 'job-invite':
    case 'application-status':
    case 'verification-status':
    case 'new-review':
    case 'company-new-applications':
    case 'company-worker-contact':
    case 'company-application-withdrawn':
    case 'company-verification':
      return {
        mode,
        recipients: [],
        meta: {
          eventDriven: true,
          note: 'This mode sends on live events. Enable Automat for real-time emails, or trigger an event to test.',
        },
      };
    default:
      return { mode, recipients: [], meta: {} };
  }
}

async function resolveJobEventRecipients(job, companyId, enabledModes) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       wp.full_name,
       wp.trade_interests,
       wp.city,
       wp.postcode,
       wp.work_locations,
       EXISTS(
         SELECT 1 FROM follows f
         WHERE f.follower_id = u.id AND f.following_id = $1
       ) AS follows_company
     FROM users u
     JOIN worker_profiles wp ON wp.user_id = u.id
     WHERE u.role = 'worker'
       AND u.status = 'active'`,
    [companyId]
  );

  const matched = [];
  for (const worker of result.rows) {
    const interestMatch = jobMatchesTradeInterests(job, worker.trade_interests || []);
    const locationMatch = workerMatchesJobLocation(worker, job);
    const followMatch = Boolean(worker.follows_company);

    const modesHit = [];
    if (enabledModes.includes('interests') && interestMatch) modesHit.push('interests');
    if (enabledModes.includes('location') && locationMatch) modesHit.push('location');
    if (enabledModes.includes('interests-location') && interestMatch && locationMatch) {
      modesHit.push('interests-location');
    }
    if (enabledModes.includes('followed-company-jobs') && followMatch) {
      modesHit.push('followed-company-jobs');
    }

    if (!modesHit.length) continue;

    matched.push({
      userId: worker.id,
      email: worker.email,
      name: worker.full_name || 'there',
      audience: 'worker',
      modesHit,
      interestMatch,
      locationMatch,
      followMatch,
    });
  }

  return matched;
}

module.exports = {
  siteUrl,
  workerMatchesJobLocation,
  resolveRecipients,
  resolveJobEventRecipients,
  getRecentOpenJobs,
  getTodayOpenJobs,
};
