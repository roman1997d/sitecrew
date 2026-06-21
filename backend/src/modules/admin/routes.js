const express = require('express');
const { z } = require('zod');
const pool = require('../../db/pool');
const requireAuth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const asyncHandler = require('../../utils/asyncHandler');
const logAudit = require('../../utils/audit');
const logCompanyAccountHistory = require('../../utils/companyAccountHistory');
const { enqueueMediaForReview, enqueueUploadedFile } = require('../../utils/mediaReviewQueue');
const {
  getMediaReviewStats,
  getNextMediaReviewItem,
  getMediaReviewPreview,
  approveMediaReviewItem,
  rejectMediaReviewItem,
} = require('../../utils/mediaReviewActions');
const {
  getTextReviewStats,
  getNextTextReviewItem,
  approveTextReview,
  rejectTextReview,
  getLearnModeEnabled,
  setLearnModeEnabled,
  listNotAllowedTerms,
  LEARNED_TERM_CATEGORIES,
} = require('../../utils/textReviewQueue');
const { rescanAllContent } = require('../../utils/aiScanBackfill');
const { addNotAllowedTermsAndRescan, updateNotAllowedTermRiskScoreAndRescan } = require('../../utils/notAllowedTerms');
const { getModerationHealth } = require('../../utils/moderationHealth');
const {
  getServerOverview,
  checkServerPanic,
  checkDatabasePanic,
  scanAbandonedPictureFiles,
  deleteAbandonedPictureFiles,
} = require('../../utils/serverHealth');

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'superadmin'));

const userStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'paused', 'suspended', 'deleted']),
    reason: z.string().min(3).max(2000).optional(),
  }),
});

const verifySchema = z.object({
  body: z.object({
    verificationStatus: z.enum(['pending', 'approved', 'rejected']),
  }),
});

const updateWorkerAdminSchema = z.object({
  body: z.object({
    verificationStatus: z.enum(['pending', 'approved', 'rejected']),
    qualifications: z.string().max(2000).optional(),
    badgeColor: z.enum(['green', 'blue', 'gold', 'black', 'white', 'red', 'grey']).optional(),
  }),
});

const reportStatusSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'resolved', 'dismissed']),
  }),
});

const postModerationSchema = z.object({
  body: z.object({
    moderationStatus: z.enum(['visible', 'hidden', 'flagged']),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().max(80).optional(),
    companyName: z.string().min(2).max(180).optional(),
  }),
});

const updateCompanyAdminSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    companyName: z.string().min(2).max(180).optional(),
    phone: z.string().max(40).optional(),
    website: z.string().max(300).optional(),
    headOffice: z.string().max(180).optional(),
    businessType: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
    postcode: z.string().max(30).optional(),
    description: z.string().max(5000).optional(),
    trades: z.array(z.string()).optional(),
    verificationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  }),
});

const deleteApiLogsOlderSchema = z.object({
  body: z.object({
    hours: z.number().int().min(1).max(8760),
  }),
});

const billingPauseSchema = z.object({
  body: z.object({
    reason: z.string().min(3).max(2000),
  }),
});

const billingPlanUpdateSchema = z.object({
  body: z.object({
    planKey: z.enum(['free', 'pro', 'ultra']),
  }),
});

const updateAccessPlanSchema = z.object({
  body: z.object({
    priceGbp: z.number().min(0).max(999999),
    discountPercent: z.number().min(0).max(100),
    benefits: z.array(z.string().min(1).max(300)).min(1).max(30),
  }),
});

const updateSalesPlanTermsSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(100000),
  }),
});

const companyAccountEventSchema = z.object({
  body: z.object({
    reason: z.string().min(3).max(2000),
  }),
});

function splitFullName(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function joinFullName(firstName = '', lastName = '') {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

function parseQualificationsInput(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapUserDetail(row) {
  const { firstName, lastName } = splitFullName(row.worker_full_name || '');
  const rating = getAccountRating(row);
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    firstName: row.role === 'worker' ? firstName : '',
    lastName: row.role === 'worker' ? lastName : '',
    companyName: row.company_name || '',
    avatar: row.profile_photo || row.company_logo || null,
    averageRating: rating.averageRating,
    reviewCount: rating.reviewCount,
    verificationStatus: row.role === 'worker' ? (row.worker_verification_status || 'pending') : undefined,
    qualifications: row.role === 'worker' ? (row.worker_qualifications || []) : undefined,
    badgeColor: row.role === 'worker' ? (row.worker_qualification_badge_color || 'green') : undefined,
    verificationRequested: row.role === 'worker' && Boolean(row.worker_verification_requested_at),
  };
}

function getAccountRating(row) {
  if (row.role === 'worker') {
    return {
      averageRating: row.worker_average_rating ? Number(row.worker_average_rating) : null,
      reviewCount: Number(row.worker_review_count || 0),
    };
  }

  if (row.role === 'company') {
    return {
      averageRating: row.company_average_rating ? Number(row.company_average_rating) : null,
      reviewCount: Number(row.company_review_count || 0),
    };
  }

  return { averageRating: null, reviewCount: 0 };
}

function formatArrayValue(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return value.join(', ');
}

function formatBooleanValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return value ? 'Yes' : 'No';
}

function buildInitialProfile(row) {
  if (row.role === 'worker' && row.worker_full_name) {
    return {
      type: 'worker',
      fullName: row.worker_full_name,
      phone: row.worker_phone,
      city: row.worker_city,
      postcode: row.worker_postcode,
      trades: formatArrayValue(row.worker_trades),
      tradeInterests: formatArrayValue(row.worker_trade_interests),
      experience: row.worker_experience,
      certificates: formatArrayValue(row.worker_certificates),
      workingRadius: row.worker_working_radius,
      availabilityStatus: row.worker_availability_status,
      expectedRate: row.worker_expected_rate,
      bio: row.worker_bio,
      workLocations: formatArrayValue(row.worker_work_locations),
      yearsExperience: row.worker_years_experience,
      languagePreference: row.worker_language_preference,
      hasUkWorkPermit: formatBooleanValue(row.worker_has_uk_work_permit),
      nativeLanguage: row.worker_native_language,
      englishLevel: row.worker_english_level,
      hasCar: formatBooleanValue(row.worker_has_car),
      qualifications: formatArrayValue(row.worker_qualifications),
      verificationStatus: row.worker_verification_status,
      badgeColor: row.worker_qualification_badge_color || 'green',
      verificationRequestedAt: row.worker_verification_requested_at,
      profileCreatedAt: row.worker_profile_created_at,
      profileUpdatedAt: row.worker_profile_updated_at,
    };
  }

  if (row.role === 'company' && row.company_name) {
    return {
      type: 'company',
      companyName: row.company_name,
      phone: row.company_phone,
      city: row.company_city,
      postcode: row.company_postcode,
      website: row.company_website,
      headOffice: row.company_head_office,
      businessType: row.company_business_type,
      trades: formatArrayValue(row.company_trades),
      description: row.company_description,
      verificationStatus: row.company_verification_status,
      plan: row.company_plan,
      profileCreatedAt: row.company_profile_created_at,
      profileUpdatedAt: row.company_profile_updated_at,
    };
  }

  return null;
}

function mapUserDetailFull(row) {
  return {
    ...mapUserDetail(row),
    profile: buildInitialProfile(row),
  };
}

const USER_DETAIL_SELECT = `
  SELECT
    u.id,
    u.email,
    u.role,
    u.status,
    u.created_at,
    u.updated_at,
    wp.full_name AS worker_full_name,
    wp.profile_photo,
    wp.phone AS worker_phone,
    wp.city AS worker_city,
    wp.postcode AS worker_postcode,
    wp.trades AS worker_trades,
    wp.trade_interests AS worker_trade_interests,
    wp.experience AS worker_experience,
    wp.certificates AS worker_certificates,
    wp.working_radius AS worker_working_radius,
    wp.availability_status AS worker_availability_status,
    wp.expected_rate AS worker_expected_rate,
    wp.bio AS worker_bio,
    wp.work_locations AS worker_work_locations,
    wp.years_experience AS worker_years_experience,
    wp.language_preference AS worker_language_preference,
    wp.has_uk_work_permit AS worker_has_uk_work_permit,
    wp.native_language AS worker_native_language,
    wp.english_level AS worker_english_level,
    wp.has_car AS worker_has_car,
    wp.qualifications AS worker_qualifications,
    wp.verification_status AS worker_verification_status,
    wp.qualification_badge_color AS worker_qualification_badge_color,
    wp.verification_requested_at AS worker_verification_requested_at,
    wp.created_at AS worker_profile_created_at,
    wp.updated_at AS worker_profile_updated_at,
    cp.company_name,
    cp.logo AS company_logo,
    cp.phone AS company_phone,
    cp.description AS company_description,
    cp.website AS company_website,
    cp.head_office AS company_head_office,
    cp.business_type AS company_business_type,
    cp.trades AS company_trades,
    cp.city AS company_city,
    cp.postcode AS company_postcode,
    cp.verification_status AS company_verification_status,
    cp.plan AS company_plan,
    cp.created_at AS company_profile_created_at,
    cp.updated_at AS company_profile_updated_at
  FROM users u
  LEFT JOIN worker_profiles wp ON wp.user_id = u.id
  LEFT JOIN company_profiles cp ON cp.user_id = u.id
`;

const COMPANY_DETAIL_SELECT = `
  SELECT
    cp.*,
    u.email,
    u.status AS user_status,
    u.created_at AS user_created_at,
    u.updated_at AS user_updated_at
  FROM company_profiles cp
  JOIN users u ON u.id = cp.user_id
`;

function buildCompanyProfile(row) {
  return {
    type: 'company',
    companyName: row.company_name,
    phone: row.phone,
    city: row.city,
    postcode: row.postcode,
    website: row.website,
    headOffice: row.head_office,
    businessType: row.business_type,
    trades: formatArrayValue(row.trades),
    description: row.description,
    verificationStatus: row.verification_status,
    plan: row.plan,
    profileCreatedAt: row.created_at,
    profileUpdatedAt: row.updated_at,
  };
}

function mapCompanyDetailFull(row) {
  return {
    userId: row.user_id,
    email: row.email,
    userStatus: row.user_status,
    userCreatedAt: row.user_created_at,
    userUpdatedAt: row.user_updated_at,
    companyName: row.company_name,
    phone: row.phone || '',
    logo: row.logo || null,
    description: row.description || '',
    website: row.website || '',
    headOffice: row.head_office || '',
    businessType: row.business_type || '',
    trades: row.trades || [],
    city: row.city || '',
    postcode: row.postcode || '',
    verificationStatus: row.verification_status,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: buildCompanyProfile(row),
  };
}

async function notifyCompanyVerification(client, userId, verificationStatus) {
  await client.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'company_verification', 'Verification updated', $2, 'company', $1)`,
    [userId, `Your company verification is ${verificationStatus}.`]
  );
}

async function fetchCompanyAccountHistory(companyId) {
  const result = await pool.query(
    `SELECT id, actor_email, action, reason, created_at
     FROM company_account_history
     WHERE company_id = $1
     ORDER BY created_at DESC`,
    [companyId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    actorEmail: row.actor_email,
    action: row.action,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

router.get('/metrics', asyncHandler(async (req, res) => {
  const [
    usersByRole,
    usersByStatus,
    companiesByVerification,
    jobsByStatus,
    postsByModeration,
    totals,
    apiLast24h,
    auditLast24h,
  ] = await Promise.all([
    pool.query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role`),
    pool.query(`SELECT status, COUNT(*)::int AS count FROM users GROUP BY status ORDER BY status`),
    pool.query(`SELECT verification_status, COUNT(*)::int AS count FROM company_profiles GROUP BY verification_status`),
    pool.query(`SELECT status, COUNT(*)::int AS count FROM jobs GROUP BY status ORDER BY status`),
    pool.query(`SELECT moderation_status, COUNT(*)::int AS count FROM feed_posts GROUP BY moderation_status`),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM users) AS users,
         (SELECT COUNT(*)::int FROM company_profiles) AS companies,
         (SELECT COUNT(*)::int FROM jobs) AS jobs,
         (SELECT COUNT(*)::int FROM feed_posts) AS posts,
         (SELECT COUNT(*)::int FROM applications) AS applications,
         (SELECT COUNT(*)::int FROM reports WHERE status = 'open') AS open_reports`
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total_requests,
         COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_requests,
         COALESCE(AVG(duration_ms), 0)::int AS avg_duration_ms
       FROM api_logs
       WHERE created_at >= NOW() - INTERVAL '24 hours'`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM audit_trails
       WHERE created_at >= NOW() - INTERVAL '24 hours'`
    ),
  ]);

  res.json({
    totals: totals.rows[0],
    usersByRole: usersByRole.rows,
    usersByStatus: usersByStatus.rows,
    companiesByVerification: companiesByVerification.rows,
    jobsByStatus: jobsByStatus.rows,
    postsByModeration: postsByModeration.rows,
    apiLast24h: apiLast24h.rows[0],
    auditLast24h: auditLast24h.rows[0],
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.status,
       u.created_at,
       u.updated_at,
       wp.full_name AS worker_full_name,
       wp.profile_photo,
       cp.company_name,
       cp.logo AS company_logo,
       wp.verification_requested_at AS worker_verification_requested_at,
       worker_rating.average_rating AS worker_average_rating,
       worker_rating.review_count AS worker_review_count,
       company_rating.average_rating AS company_average_rating,
       company_rating.review_count AS company_review_count
     FROM users u
     LEFT JOIN worker_profiles wp ON wp.user_id = u.id
     LEFT JOIN company_profiles cp ON cp.user_id = u.id
     LEFT JOIN (
       SELECT worker_id, ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS review_count
       FROM worker_reviews
       GROUP BY worker_id
     ) worker_rating ON worker_rating.worker_id = u.id
     LEFT JOIN (
       SELECT company_id, ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS review_count
       FROM company_reviews
       GROUP BY company_id
     ) company_rating ON company_rating.company_id = u.id
     ORDER BY u.created_at DESC`
  );
  res.json({ users: result.rows.map(mapUserDetail) });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `${USER_DETAIL_SELECT}
     WHERE u.id = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: mapUserDetailFull(result.rows[0]) });
}));

router.patch('/users/:id', validate(updateUserSchema), asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const userResult = await pool.query(
    'SELECT id, email, role FROM users WHERE id = $1',
    [req.params.id]
  );

  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = userResult.rows[0];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (payload.email && payload.email !== user.email) {
      await client.query(
        `UPDATE users
         SET email = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [user.id, payload.email]
      );
    }

    if (user.role === 'worker' && (payload.firstName || payload.lastName)) {
      const currentProfile = await client.query(
        'SELECT full_name FROM worker_profiles WHERE user_id = $1',
        [user.id]
      );
      const currentName = currentProfile.rows[0]?.full_name || '';
      const { firstName: currentFirst, lastName: currentLast } = splitFullName(currentName);
      const fullName = joinFullName(
        payload.firstName ?? currentFirst,
        payload.lastName ?? currentLast
      );

      if (!fullName) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'First name is required for workers.' });
      }

      await client.query(
        `UPDATE worker_profiles
         SET full_name = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [user.id, fullName]
      );
    }

    if (user.role === 'company' && payload.companyName) {
      await client.query(
        `UPDATE company_profiles
         SET company_name = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [user.id, payload.companyName]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw error;
  } finally {
    client.release();
  }

  await logAudit({
    actorId: req.user.id,
    action: 'user.updated',
    entityType: 'user',
    entityId: Number(req.params.id),
    metadata: {
      email: payload.email || undefined,
      firstName: payload.firstName || undefined,
      lastName: payload.lastName || undefined,
      companyName: payload.companyName || undefined,
    },
  });

  const updated = await pool.query(
    `${USER_DETAIL_SELECT}
     WHERE u.id = $1`,
    [req.params.id]
  );

  res.json({ user: mapUserDetailFull(updated.rows[0]) });
}));

router.post('/users/:id/photo', upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Photo is required' });
  }

  const userResult = await pool.query(
    'SELECT id, role FROM users WHERE id = $1',
    [req.params.id]
  );

  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { id, role } = userResult.rows[0];
  const photoPath = await enqueueUploadedFile(req.file);
  let avatar = photoPath;

  if (role === 'worker') {
    const result = await pool.query(
      `UPDATE worker_profiles
       SET profile_photo = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING profile_photo`,
      [id, photoPath]
    );
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Worker profile not found' });
    }
    avatar = result.rows[0].profile_photo;
  } else if (role === 'company') {
    const result = await pool.query(
      `UPDATE company_profiles
       SET logo = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING logo`,
      [id, photoPath]
    );
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Company profile not found' });
    }
    avatar = result.rows[0].logo;
  } else {
    return res.status(400).json({ error: 'Photo upload is not supported for this account type' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'user.photo_updated',
    entityType: 'user',
    entityId: Number(req.params.id),
  });

  res.json({ avatar });
}));

router.patch('/users/:id/status', validate(userStatusSchema), asyncHandler(async (req, res) => {
  const { status, reason } = req.validated.body;

  const existing = await pool.query(
    'SELECT id, email, role, status FROM users WHERE id = $1',
    [req.params.id]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = existing.rows[0];

  if (user.role === 'company') {
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Reason is required for company account status changes.' });
    }
  }

  const result = await pool.query(
    `UPDATE users
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, email, role, status, updated_at`,
    [req.params.id, status]
  );

  if (user.role === 'company' && user.status !== status) {
    await logCompanyAccountHistory({
      companyId: user.id,
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: status,
      reason,
    });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'user.status_updated',
    entityType: 'user',
    entityId: Number(req.params.id),
    metadata: { status, reason: reason || undefined },
  });

  res.json({ user: result.rows[0] });
}));

router.get('/companies', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       cp.*,
       u.email,
       u.status AS user_status,
       company_rating.average_rating,
       company_rating.review_count
     FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN (
       SELECT company_id, ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::int AS review_count
       FROM company_reviews
       GROUP BY company_id
     ) company_rating ON company_rating.company_id = cp.user_id
     ORDER BY cp.created_at DESC`
  );
  res.json({
    companies: result.rows.map(mapCompanyListRow),
  });
}));

router.get('/companies/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `${COMPANY_DETAIL_SELECT}
     WHERE cp.user_id = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const history = await fetchCompanyAccountHistory(req.params.id);
  res.json({ company: mapCompanyDetailFull(result.rows[0]), history });
}));

router.post('/companies/:id/account-history', validate(companyAccountEventSchema), asyncHandler(async (req, res) => {
  const companyCheck = await pool.query(
    'SELECT user_id FROM company_profiles WHERE user_id = $1',
    [req.params.id]
  );

  if (companyCheck.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  await logCompanyAccountHistory({
    companyId: Number(req.params.id),
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: 'event',
    reason: req.validated.body.reason,
  });

  await logAudit({
    actorId: req.user.id,
    action: 'company.account_event_added',
    entityType: 'company',
    entityId: Number(req.params.id),
    metadata: { reason: req.validated.body.reason },
  });

  const history = await fetchCompanyAccountHistory(req.params.id);
  res.status(201).json({ history });
}));

router.patch('/companies/:id', validate(updateCompanyAdminSchema), asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const companyId = req.params.id;

  const existing = await pool.query(
    `${COMPANY_DETAIL_SELECT}
     WHERE cp.user_id = $1`,
    [companyId]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const current = existing.rows[0];
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (payload.email && payload.email !== current.email) {
      await client.query(
        `UPDATE users
         SET email = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [companyId, payload.email]
      );
    }

    await client.query(
      `UPDATE company_profiles SET
        company_name = COALESCE($2, company_name),
        phone = COALESCE($3, phone),
        description = COALESCE($4, description),
        website = COALESCE($5, website),
        head_office = COALESCE($6, head_office),
        business_type = COALESCE($7, business_type),
        city = COALESCE($8, city),
        postcode = COALESCE($9, postcode),
        trades = COALESCE($10, trades),
        verification_status = COALESCE($11, verification_status),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [
        companyId,
        payload.companyName || null,
        payload.phone ?? null,
        payload.description ?? null,
        payload.website === '' ? null : (payload.website || null),
        payload.headOffice ?? null,
        payload.businessType ?? null,
        payload.city ?? null,
        payload.postcode ?? null,
        payload.trades || null,
        payload.verificationStatus || null,
      ]
    );

    if (
      payload.verificationStatus
      && payload.verificationStatus !== current.verification_status
    ) {
      await notifyCompanyVerification(client, companyId, payload.verificationStatus);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw error;
  } finally {
    client.release();
  }

  await logAudit({
    actorId: req.user.id,
    action: 'company.updated',
    entityType: 'company',
    entityId: Number(companyId),
    metadata: {
      email: payload.email || undefined,
      companyName: payload.companyName || undefined,
      verificationStatus: payload.verificationStatus || undefined,
    },
  });

  const updated = await pool.query(
    `${COMPANY_DETAIL_SELECT}
     WHERE cp.user_id = $1`,
    [companyId]
  );

  res.json({ company: mapCompanyDetailFull(updated.rows[0]) });
}));

router.post('/companies/:id/logo', upload.single('logo'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Company logo is required' });
  }

  const logoPath = await enqueueUploadedFile(req.file);
  const result = await pool.query(
    `UPDATE company_profiles
     SET logo = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING logo`,
    [req.params.id, logoPath]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'company.logo_updated',
    entityType: 'company',
    entityId: Number(req.params.id),
  });

  res.json({ logo: result.rows[0].logo });
}));

router.patch('/companies/:id/verify', validate(verifySchema), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE company_profiles
     SET verification_status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [req.params.id, req.validated.body.verificationStatus]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'company_verification', 'Verification updated', $2, 'company', $1)`,
    [req.params.id, `Your company verification is ${req.validated.body.verificationStatus}.`]
  );

  await logAudit({
    actorId: req.user.id,
    action: 'company.verification_updated',
    entityType: 'company',
    entityId: Number(req.params.id),
    metadata: { verificationStatus: req.validated.body.verificationStatus },
  });

  res.json({ company: result.rows[0] });
}));

router.patch('/workers/:id/verify', validate(updateWorkerAdminSchema), asyncHandler(async (req, res) => {
  const { verificationStatus, qualifications, badgeColor } = req.validated.body;
  const parsedQualifications = qualifications !== undefined
    ? parseQualificationsInput(qualifications)
    : null;

  const existing = await pool.query(
    'SELECT verification_status FROM worker_profiles WHERE user_id = $1',
    [req.params.id]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Worker not found' });
  }

  const result = await pool.query(
    `UPDATE worker_profiles
     SET verification_status = $2,
         qualifications = COALESCE($3, qualifications),
         qualification_badge_color = COALESCE($4, qualification_badge_color),
         verification_requested_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING *`,
    [
      req.params.id,
      verificationStatus,
      parsedQualifications,
      badgeColor || null,
    ]
  );

  if (existing.rows[0].verification_status !== verificationStatus) {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
       VALUES ($1, 'worker_verification', 'Verification updated', $2, 'worker', $1)`,
      [req.params.id, `Your profile verification is ${verificationStatus}.`]
    );
  }

  await logAudit({
    actorId: req.user.id,
    action: 'worker.verification_updated',
    entityType: 'worker',
    entityId: Number(req.params.id),
    metadata: {
      verificationStatus,
      badgeColor: badgeColor || result.rows[0].qualification_badge_color,
      qualifications: parsedQualifications,
    },
  });

  res.json({ worker: result.rows[0] });
}));

router.get('/jobs', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT j.*, cp.company_name
     FROM jobs j
     JOIN company_profiles cp ON cp.user_id = j.company_id
     ORDER BY j.created_at DESC`
  );
  res.json({ jobs: result.rows });
}));

router.patch('/jobs/:id', validate(postModerationSchema), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE jobs
     SET moderation_status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [req.params.id, req.validated.body.moderationStatus]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'job.moderation_updated',
    entityType: 'job',
    entityId: Number(req.params.id),
    metadata: { moderationStatus: req.validated.body.moderationStatus },
  });

  res.json({ job: result.rows[0] });
}));

router.delete('/jobs/:id', asyncHandler(async (req, res) => {
  const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'job.deleted',
    entityType: 'job',
    entityId: Number(req.params.id),
  });

  res.status(204).send();
}));

router.get('/posts', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       fp.*,
       COALESCE(wp.full_name, cp.company_name, u.email) AS author_name,
       u.email AS author_email,
       u.role AS author_role
     FROM feed_posts fp
     JOIN users u ON u.id = fp.author_id
     LEFT JOIN worker_profiles wp ON wp.user_id = fp.author_id
     LEFT JOIN company_profiles cp ON cp.user_id = fp.author_id
     ORDER BY fp.created_at DESC
     LIMIT 200`
  );
  res.json({ posts: result.rows });
}));

router.patch('/posts/:id', validate(postModerationSchema), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE feed_posts
     SET moderation_status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [req.params.id, req.validated.body.moderationStatus]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'post.moderation_updated',
    entityType: 'feed_post',
    entityId: Number(req.params.id),
    metadata: { moderationStatus: req.validated.body.moderationStatus },
  });

  res.json({ post: result.rows[0] });
}));

router.delete('/posts/:id', asyncHandler(async (req, res) => {
  const result = await pool.query('DELETE FROM feed_posts WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'post.deleted',
    entityType: 'feed_post',
    entityId: Number(req.params.id),
  });

  res.status(204).send();
}));

router.get('/media-review/next', asyncHandler(async (req, res) => {
  const data = await getNextMediaReviewItem();
  res.json(data);
}));

router.get('/media-review/:id/preview', asyncHandler(async (req, res) => {
  const preview = await getMediaReviewPreview(Number(req.params.id));
  res.set('Cache-Control', 'private, max-age=60');
  res.type(preview.contentType);
  res.send(preview.buffer);
}));

router.get('/moderation/health', asyncHandler(async (req, res) => {
  const data = await getModerationHealth();
  res.json(data);
}));

router.get('/server/overview', asyncHandler(async (req, res) => {
  const data = await getServerOverview();
  res.json(data);
}));

router.post('/server/check-server-panic', asyncHandler(async (req, res) => {
  const data = await checkServerPanic();
  res.json(data);
}));

router.post('/server/check-database-panic', asyncHandler(async (req, res) => {
  const data = await checkDatabasePanic();
  res.json(data);
}));

router.post('/server/scan-abandoned-pictures', asyncHandler(async (req, res) => {
  const data = await scanAbandonedPictureFiles();
  await logAudit({
    actorId: req.user.id,
    action: 'server.scan_abandoned_pictures',
    entityType: 'server',
    entityId: null,
  });
  res.json(data);
}));

router.post('/server/delete-abandoned-pictures', asyncHandler(async (req, res) => {
  const data = await deleteAbandonedPictureFiles();
  await logAudit({
    actorId: req.user.id,
    action: 'server.delete_abandoned_pictures',
    entityType: 'server',
    entityId: null,
  });
  res.json(data);
}));

router.get('/media-review/stats', asyncHandler(async (req, res) => {
  const data = await getMediaReviewStats();
  res.json(data);
}));

router.get('/text-review/next', asyncHandler(async (req, res) => {
  const riskOnly = req.query.riskOnly === 'true';
  const data = await getNextTextReviewItem({ riskOnly });
  res.json(data);
}));

router.get('/text-review/stats', asyncHandler(async (req, res) => {
  const riskOnly = req.query.riskOnly === 'true';
  const data = await getTextReviewStats({ riskOnly });
  res.json(data);
}));

router.get('/text-review/settings', asyncHandler(async (req, res) => {
  const learnMode = await getLearnModeEnabled();
  res.json({ learnMode, termCategories: LEARNED_TERM_CATEGORIES });
}));

router.patch('/text-review/settings', asyncHandler(async (req, res) => {
  const learnMode = Boolean(req.body?.learnMode);
  const data = await setLearnModeEnabled(learnMode);
  await logAudit({
    actorId: req.user.id,
    action: learnMode ? 'text_review.learn_mode_enabled' : 'text_review.learn_mode_disabled',
    entityType: 'ai_scan_settings',
    entityId: null,
  });
  res.json(data);
}));

router.get('/text-review/not-allowed-terms', asyncHandler(async (req, res) => {
  const terms = await listNotAllowedTerms();
  res.json({ terms });
}));

router.patch('/text-review/not-allowed-terms/:id', asyncHandler(async (req, res) => {
  const term = await updateNotAllowedTermRiskScoreAndRescan(req.params.id, req.body?.riskScore);

  await logAudit({
    actorId: req.user.id,
    action: 'text_review.learned_term_risk_updated',
    entityType: 'ai_not_allowed_terms',
    entityId: term.id,
  });

  res.json({ term });
}));

router.get('/text-review/preset-risk-rules', asyncHandler(async (req, res) => {
  const { listPresetRiskRules } = require('../../utils/presetRiskRules');
  const rules = listPresetRiskRules();
  res.json({ rules, total: rules.length });
}));

router.post('/text-review/learned-terms', asyncHandler(async (req, res) => {
  const terms = parseLearnTerms(req.body?.terms);
  if (!terms.length) {
    return res.status(400).json({ error: 'Enter at least one blocked word or phrase.' });
  }

  const learned = await addNotAllowedTermsAndRescan(terms, {
    addedBy: req.user.id,
    category: req.body?.category || 'not_allowed_content',
    riskScore: req.body?.riskScore,
  });

  await logAudit({
    actorId: req.user.id,
    action: 'text_review.learned_terms_added',
    entityType: 'ai_not_allowed_terms',
    entityId: null,
  });

  res.json({ learned, total: learned.length });
}));

router.post('/text-review/rescan-all', asyncHandler(async (req, res) => {
  const data = await rescanAllContent();
  await logAudit({
    actorId: req.user.id,
    action: 'text_review.rescan_all',
    entityType: 'content_scan',
    entityId: null,
  });
  res.json(data);
}));

function parseLearnTerms(raw) {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((term) => String(term).trim()).filter(Boolean);
  }

  return String(raw)
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
}

router.post('/text-review/approve', asyncHandler(async (req, res) => {
  const scanId = req.body?.scanId ? Number(req.body.scanId) : null;
  const entityType = req.body?.entityType;
  const entityId = req.body?.entityId ? Number(req.body.entityId) : null;

  const data = await approveTextReview({ scanId, entityType, entityId });
  await logAudit({
    actorId: req.user.id,
    action: 'text_review.approved',
    entityType: data.entityType,
    entityId: data.entityId,
  });
  res.json(data);
}));

router.post('/text-review/reject', asyncHandler(async (req, res) => {
  const scanId = req.body?.scanId ? Number(req.body.scanId) : null;
  const entityType = req.body?.entityType;
  const entityId = req.body?.entityId ? Number(req.body.entityId) : null;
  const learnMode = await getLearnModeEnabled();
  const learnTerms = learnMode ? parseLearnTerms(req.body?.learnTerms) : [];
  const learnCategory = learnMode ? (req.body?.learnCategory || 'not_allowed_content') : 'not_allowed_content';

  const data = await rejectTextReview({
    scanId,
    entityType,
    entityId,
    learnTerms,
    learnCategory,
    addedBy: req.user.id,
  });
  await logAudit({
    actorId: req.user.id,
    action: 'text_review.rejected',
    entityType: data.entityType,
    entityId: data.entityId,
  });
  res.json(data);
}));

router.post('/text-review/:id/approve', asyncHandler(async (req, res) => {
  const scanId = Number(req.params.id);
  const data = await approveTextReview({
    scanId: Number.isFinite(scanId) ? scanId : null,
    entityType: req.body?.entityType,
    entityId: req.body?.entityId ? Number(req.body.entityId) : null,
  });
  await logAudit({
    actorId: req.user.id,
    action: 'text_review.approved',
    entityType: data.entityType,
    entityId: data.entityId,
  });
  res.json(data);
}));

router.post('/text-review/:id/reject', asyncHandler(async (req, res) => {
  const scanId = Number(req.params.id);
  const learnMode = await getLearnModeEnabled();
  const learnTerms = learnMode ? parseLearnTerms(req.body?.learnTerms) : [];
  const learnCategory = learnMode ? (req.body?.learnCategory || 'not_allowed_content') : 'not_allowed_content';

  const data = await rejectTextReview({
    scanId: Number.isFinite(scanId) ? scanId : null,
    entityType: req.body?.entityType,
    entityId: req.body?.entityId ? Number(req.body.entityId) : null,
    learnTerms,
    learnCategory,
    addedBy: req.user.id,
  });
  await logAudit({
    actorId: req.user.id,
    action: 'text_review.rejected',
    entityType: data.entityType,
    entityId: data.entityId,
  });
  res.json(data);
}));

router.post('/media-review/:id/approve', asyncHandler(async (req, res) => {
  const data = await approveMediaReviewItem(Number(req.params.id));
  await logAudit({
    actorId: req.user.id,
    action: 'media_review.approved',
    entityType: 'media_review_queue',
    entityId: Number(req.params.id),
  });
  res.json(data);
}));

router.post('/media-review/:id/reject', asyncHandler(async (req, res) => {
  const data = await rejectMediaReviewItem(Number(req.params.id));
  await logAudit({
    actorId: req.user.id,
    action: 'media_review.rejected',
    entityType: 'media_review_queue',
    entityId: Number(req.params.id),
    metadata: { filePath: data.item?.file_path || null },
  });
  res.json(data);
}));

router.get('/reports', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT r.*, reporter.email AS reporter_email, reported.email AS reported_user_email
     FROM reports r
     JOIN users reporter ON reporter.id = r.reporter_id
     LEFT JOIN users reported ON reported.id = r.reported_user_id
     ORDER BY r.created_at DESC`
  );
  res.json({ reports: result.rows });
}));

router.patch('/reports/:id/status', validate(reportStatusSchema), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE reports
     SET status = $2
     WHERE id = $1
     RETURNING *`,
    [req.params.id, req.validated.body.status]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Report not found' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'report.status_updated',
    entityType: 'report',
    entityId: Number(req.params.id),
    metadata: { status: req.validated.body.status },
  });

  res.json({ report: result.rows[0] });
}));

router.get('/api-logs', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const problemsOnly = req.query.problemsOnly === 'true';
  const filters = problemsOnly ? 'WHERE l.status_code >= 400' : '';
  const result = await pool.query(
    `SELECT l.*, u.email AS user_email
     FROM api_logs l
     LEFT JOIN users u ON u.id = l.user_id
     ${filters}
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json({ logs: result.rows, problemsOnly });
}));

router.delete('/api-logs/older-than', validate(deleteApiLogsOlderSchema), asyncHandler(async (req, res) => {
  const { hours } = req.validated.body;
  const result = await pool.query(
    `DELETE FROM api_logs
     WHERE created_at < NOW() - ($1 * INTERVAL '1 hour')
     RETURNING id`,
    [hours]
  );

  await logAudit({
    actorId: req.user.id,
    action: 'api_logs.deleted_older_than',
    entityType: 'api_log',
    entityId: null,
    metadata: { hours, deletedCount: result.rowCount },
  });

  res.json({ deletedCount: result.rowCount, hours });
}));

router.delete('/api-logs', asyncHandler(async (req, res) => {
  const result = await pool.query('DELETE FROM api_logs RETURNING id');

  await logAudit({
    actorId: req.user.id,
    action: 'api_logs.cleared',
    entityType: 'api_log',
    entityId: null,
    metadata: { deletedCount: result.rowCount },
  });

  res.json({ deletedCount: result.rowCount });
}));

router.get('/audit-trails', asyncHandler(async (req, res) => {
  const { purgeAuditTrailsByAutoDeleteSettings } = require('../../utils/auditMaintenance');
  await purgeAuditTrailsByAutoDeleteSettings();

  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const result = await pool.query(
    `SELECT a.*, u.email AS actor_email
     FROM audit_trails a
     LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json({ trails: result.rows });
}));

router.get('/audit-trails/settings', asyncHandler(async (req, res) => {
  const { getAuditAutoDeleteSettings } = require('../../utils/auditMaintenance');
  const settings = await getAuditAutoDeleteSettings();
  res.json(settings);
}));

router.patch('/audit-trails/settings', asyncHandler(async (req, res) => {
  const {
    setAuditAutoDeleteSettings,
    purgeAuditTrailsByAutoDeleteSettings,
  } = require('../../utils/auditMaintenance');

  const settings = await setAuditAutoDeleteSettings({
    autoDeleteEnabled: req.body?.autoDeleteEnabled,
    retentionDays: req.body?.retentionDays,
  });

  const purge = settings.autoDeleteEnabled
    ? await purgeAuditTrailsByAutoDeleteSettings()
    : { deletedCount: 0 };

  await logAudit({
    actorId: req.user.id,
    action: 'audit_trails.auto_delete_updated',
    entityType: 'audit_trails',
    entityId: null,
    metadata: {
      autoDeleteEnabled: settings.autoDeleteEnabled,
      retentionDays: settings.retentionDays,
      purgedCount: purge.deletedCount,
    },
  });

  res.json({
    ...settings,
    purgedCount: purge.deletedCount,
  });
}));

router.delete('/audit-trails', asyncHandler(async (req, res) => {
  const { deleteAllAuditTrails } = require('../../utils/auditMaintenance');
  const result = await deleteAllAuditTrails();

  await logAudit({
    actorId: req.user.id,
    action: 'audit_trails.cleared',
    entityType: 'audit_trails',
    entityId: null,
    metadata: { deletedCount: result.deletedCount },
  });

  res.json(result);
}));

function addOneMonth(date) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  return result;
}

function resolveBillingDates(row) {
  let purchasedAt = row.plan_purchased_at;
  if (!purchasedAt && row.plan_terms_accepted_at) {
    purchasedAt = row.plan_terms_accepted_at;
  }
  if (!purchasedAt && row.created_at) {
    purchasedAt = row.created_at;
  }

  let expiresAt = row.plan_expires_at;
  if (row.plan !== 'free' && !expiresAt && purchasedAt) {
    expiresAt = addOneMonth(purchasedAt);
  }

  return { purchasedAt, expiresAt };
}

function computePlanState(plan, expiresAt) {
  const now = Date.now();
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;

  if (plan === 'free') {
    return 'free';
  }
  if (expiresAtMs && expiresAtMs < now) {
    return 'expired';
  }
  if (expiresAtMs && expiresAtMs - now <= 7 * 24 * 60 * 60 * 1000) {
    return 'expiring_soon';
  }
  return 'active';
}

function mapCompanyListRow(row) {
  const { purchasedAt, expiresAt } = resolveBillingDates(row);
  return {
    ...row,
    average_rating: row.average_rating ? Number(row.average_rating) : null,
    review_count: Number(row.review_count || 0),
    purchasedAt,
    expiresAt,
    planState: computePlanState(row.plan, expiresAt),
  };
}

function mapBillingAccount(row) {
  const { purchasedAt, expiresAt } = resolveBillingDates(row);

  return {
    companyId: row.user_id,
    companyName: row.company_name,
    email: row.email,
    plan: row.plan,
    purchasedAt,
    expiresAt,
    userStatus: row.user_status,
    planState: computePlanState(row.plan, expiresAt),
  };
}

async function fetchBillingAccount(companyId) {
  const result = await pool.query(
    `SELECT
       cp.user_id,
       cp.company_name,
       cp.plan,
       cp.plan_purchased_at,
       cp.plan_expires_at,
       cp.plan_terms_accepted_at,
       cp.created_at,
       u.email,
       u.status AS user_status
     FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = $1`,
    [companyId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapBillingAccount(result.rows[0]);
}

router.get('/billing', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       cp.user_id,
       cp.company_name,
       cp.plan,
       cp.plan_purchased_at,
       cp.plan_expires_at,
       cp.plan_terms_accepted_at,
       cp.created_at,
       u.email,
       u.status AS user_status
     FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     ORDER BY cp.plan_expires_at ASC NULLS LAST, cp.company_name ASC`
  );

  res.json({ accounts: result.rows.map(mapBillingAccount) });
}));

router.patch('/billing/:companyId/plan', validate(billingPlanUpdateSchema), asyncHandler(async (req, res) => {
  const { planKey } = req.validated.body;
  const companyId = req.params.companyId;

  const existing = await pool.query(
    `SELECT user_id, plan, plan_purchased_at
     FROM company_profiles
     WHERE user_id = $1`,
    [companyId]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const current = existing.rows[0];
  const purchasedAt = planKey === 'free'
    ? (current.plan_purchased_at || new Date())
    : new Date();
  const expiresAt = planKey === 'free' ? null : addOneMonth(purchasedAt);

  await pool.query(
    `UPDATE company_profiles
     SET plan = $2,
         plan_purchased_at = $3,
         plan_expires_at = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [companyId, planKey, purchasedAt, expiresAt]
  );

  await logAudit({
    actorId: req.user.id,
    action: 'billing.plan_updated',
    entityType: 'company',
    entityId: Number(companyId),
    metadata: { previousPlan: current.plan, planKey, purchasedAt, expiresAt },
  });

  const account = await fetchBillingAccount(companyId);
  res.json({ account });
}));

router.post('/billing/:companyId/add-month', asyncHandler(async (req, res) => {
  const companyId = req.params.companyId;

  const existing = await pool.query(
    `SELECT
       cp.user_id,
       cp.company_name,
       cp.plan,
       cp.plan_purchased_at,
       cp.plan_expires_at,
       cp.plan_terms_accepted_at,
       cp.created_at,
       u.email,
       u.status AS user_status
     FROM company_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = $1`,
    [companyId]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const row = existing.rows[0];
  if (row.plan === 'free') {
    return res.status(400).json({ error: 'Free plans do not have a billing period to extend.' });
  }

  const { purchasedAt, expiresAt } = resolveBillingDates(row);
  const now = new Date();
  const baseDate = expiresAt && new Date(expiresAt) > now ? new Date(expiresAt) : now;
  const newExpiresAt = addOneMonth(baseDate);
  const newPurchasedAt = row.plan_purchased_at || purchasedAt || now;

  await pool.query(
    `UPDATE company_profiles
     SET plan_purchased_at = $2,
         plan_expires_at = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [companyId, newPurchasedAt, newExpiresAt]
  );

  await logAudit({
    actorId: req.user.id,
    action: 'billing.month_added',
    entityType: 'company',
    entityId: Number(companyId),
    metadata: { previousExpiresAt: expiresAt, expiresAt: newExpiresAt },
  });

  const account = await fetchBillingAccount(companyId);
  res.json({ account });
}));

router.post('/billing/:companyId/remind-expiry', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT cp.company_name, cp.plan, cp.plan_expires_at
     FROM company_profiles cp
     WHERE cp.user_id = $1`,
    [req.params.companyId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const company = result.rows[0];
  if (!company.plan_expires_at) {
    return res.status(400).json({ error: 'This account has no plan expiry date.' });
  }

  const expiryLabel = new Date(company.plan_expires_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
     VALUES ($1, 'plan_expiry_reminder', 'Plan expiring soon', $2, 'billing', $1)`,
    [
      req.params.companyId,
      `Your ${company.plan} plan for ${company.company_name} expires on ${expiryLabel}. Renew soon to avoid interruption.`,
    ]
  );

  await logAudit({
    actorId: req.user.id,
    action: 'billing.expiry_reminder_sent',
    entityType: 'company',
    entityId: Number(req.params.companyId),
    metadata: { expiresAt: company.plan_expires_at },
  });

  res.json({ ok: true });
}));

router.post('/billing/:companyId/pause', validate(billingPauseSchema), asyncHandler(async (req, res) => {
  const { reason } = req.validated.body;

  const existing = await pool.query(
    'SELECT id, status FROM users WHERE id = $1 AND role = $2',
    [req.params.companyId, 'company']
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Company account not found' });
  }

  const result = await pool.query(
    `UPDATE users
     SET status = 'paused', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND role = 'company'
     RETURNING id, email, status`,
    [req.params.companyId]
  );

  if (existing.rows[0].status !== 'paused') {
    await logCompanyAccountHistory({
      companyId: Number(req.params.companyId),
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'paused',
      reason,
    });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'billing.account_paused',
    entityType: 'company',
    entityId: Number(req.params.companyId),
    metadata: { reason },
  });

  res.json({ user: result.rows[0] });
}));

function mapAccessPlan(row) {
  const priceGbp = Number(row.price_gbp);
  const discountPercent = Number(row.discount_percent);
  return {
    planKey: row.plan_key,
    displayName: row.display_name,
    priceGbp,
    discountPercent,
    effectivePriceGbp: Number((priceGbp * (1 - discountPercent / 100)).toFixed(2)),
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    updatedAt: row.updated_at,
  };
}

router.get('/market/plans', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT plan_key, display_name, price_gbp, discount_percent, benefits, updated_at
     FROM company_access_plans
     ORDER BY CASE plan_key
       WHEN 'free' THEN 1
       WHEN 'pro' THEN 2
       WHEN 'ultra' THEN 3
       ELSE 4
     END`
  );

  res.json({ plans: result.rows.map(mapAccessPlan) });
}));

router.patch('/market/plans/:planKey', validate(updateAccessPlanSchema), asyncHandler(async (req, res) => {
  const planKey = String(req.params.planKey || '').toLowerCase();
  if (!['free', 'pro', 'ultra'].includes(planKey)) {
    return res.status(400).json({ error: 'Invalid plan key.' });
  }

  const { priceGbp, discountPercent, benefits } = req.validated.body;
  const result = await pool.query(
    `UPDATE company_access_plans
     SET price_gbp = $2,
         discount_percent = $3,
         benefits = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE plan_key = $1
     RETURNING plan_key, display_name, price_gbp, discount_percent, benefits, updated_at`,
    [planKey, priceGbp, discountPercent, benefits]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  await logAudit({
    actorId: req.user.id,
    action: 'market.plan_updated',
    entityType: 'company_access_plan',
    entityId: planKey,
    metadata: {
      priceGbp,
      discountPercent,
      benefitsCount: benefits.length,
    },
  });

  res.json({ plan: mapAccessPlan(result.rows[0]) });
}));

function sanitizeSalesPlanTermsHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .trim();
}

function mapSalesPlanTerms(row) {
  if (!row) {
    return {
      version: 0,
      content: '',
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    version: row.version,
    content: row.content,
    updatedAt: row.created_at,
    updatedBy: row.updated_by,
    updatedByEmail: row.updated_by_email || null,
  };
}

router.get('/market/terms', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT sptv.version,
            sptv.content,
            sptv.created_at,
            sptv.updated_by,
            u.email AS updated_by_email
     FROM sales_plan_terms_versions sptv
     LEFT JOIN users u ON u.id = sptv.updated_by
     ORDER BY sptv.version DESC
     LIMIT 1`
  );

  res.json({ terms: mapSalesPlanTerms(result.rows[0]) });
}));

router.put('/market/terms', validate(updateSalesPlanTermsSchema), asyncHandler(async (req, res) => {
  const content = sanitizeSalesPlanTermsHtml(req.validated.body.content);
  if (!content) {
    return res.status(400).json({ error: 'Terms content cannot be empty.' });
  }

  const nextVersionResult = await pool.query(
    'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM sales_plan_terms_versions'
  );
  const nextVersion = nextVersionResult.rows[0].next_version;

  const result = await pool.query(
    `INSERT INTO sales_plan_terms_versions (version, content, updated_by)
     VALUES ($1, $2, $3)
     RETURNING version, content, created_at, updated_by`,
    [nextVersion, content, req.user.id]
  );

  await logAudit({
    actorId: req.user.id,
    action: 'market.terms_updated',
    entityType: 'sales_plan_terms',
    entityId: nextVersion,
    metadata: { version: nextVersion },
  });

  const enriched = await pool.query(
    `SELECT sptv.version,
            sptv.content,
            sptv.created_at,
            sptv.updated_by,
            u.email AS updated_by_email
     FROM sales_plan_terms_versions sptv
     LEFT JOIN users u ON u.id = sptv.updated_by
     WHERE sptv.version = $1`,
    [nextVersion]
  );

  res.json({ terms: mapSalesPlanTerms(enriched.rows[0]) });
}));

module.exports = router;
