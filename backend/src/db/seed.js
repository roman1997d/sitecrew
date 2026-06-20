const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function upsertUser(client, { email, password, role, status = 'active' }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await client.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [email, passwordHash, role, status]
  );
  return result.rows[0].id;
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const workerId = await upsertUser(client, {
      email: 'alex.worker@sitecrew.test',
      password: 'password123',
      role: 'worker',
    });
    const workerTwoId = await upsertUser(client, {
      email: 'maria.worker@sitecrew.test',
      password: 'password123',
      role: 'worker',
    });
    const apexId = await upsertUser(client, {
      email: 'hiring@apexbuild.test',
      password: 'password123',
      role: 'company',
    });
    const northId = await upsertUser(client, {
      email: 'jobs@northbuild.test',
      password: 'password123',
      role: 'company',
    });
    const skylineId = await upsertUser(client, {
      email: 'crew@skyline.test',
      password: 'password123',
      role: 'company',
    });
    const adminId = await upsertUser(client, {
      email: 'admin@sitecrew.test',
      password: 'admin123',
      role: 'admin',
    });

    await client.query(
      `INSERT INTO worker_profiles (user_id, full_name, phone, profile_photo, trades, experience, certificates, city, postcode, availability_status, expected_rate, bio)
       VALUES
       ($1, 'Alex Turner', '+44 7700 900111', '/uploads/alex.jpg', ARRAY['Carpentry', 'Drywall', 'Site Finishing'], '8 years', ARRAY['CSCS Gold', 'First Aid'], 'Manchester', 'M1', 'Available Now', '£28/hour', 'Reliable carpenter focused on premium finishing work.'),
       ($2, 'Maria Lopez', '+44 7700 900222', '/uploads/maria.jpg', ARRAY['Electrical', 'Testing'], '6 years', ARRAY['ECS Gold', '2391 Testing'], 'Leeds', 'LS1', 'Available Next Week', '£34/hour', 'Approved electrician for commercial fit-outs.')
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         profile_photo = EXCLUDED.profile_photo,
         trades = EXCLUDED.trades,
         experience = EXCLUDED.experience,
         certificates = EXCLUDED.certificates,
         city = EXCLUDED.city,
         postcode = EXCLUDED.postcode,
         availability_status = EXCLUDED.availability_status,
         expected_rate = EXCLUDED.expected_rate,
         bio = EXCLUDED.bio,
         updated_at = CURRENT_TIMESTAMP`,
      [workerId, workerTwoId]
    );

    await client.query(
      `INSERT INTO company_profiles (user_id, company_name, phone, logo, description, website, trades, city, postcode, verification_status, plan)
       VALUES
       ($1, 'Apex Build Ltd', '+44 161 100 100', '/uploads/apex.png', 'Commercial interiors and rapid site mobilization.', 'https://apexbuild.example', ARRAY['Carpentry', 'Drylining', 'Flooring'], 'Manchester', 'M2', 'approved', 'pro'),
       ($2, 'NorthBuild Group', '+44 113 200 200', '/uploads/northbuild.png', 'Regional contractor for residential and mixed-use developments.', 'https://northbuild.example', ARRAY['Bricklaying', 'Groundworks', 'Roofing'], 'Leeds', 'LS2', 'approved', 'pro'),
       ($3, 'Skyline Contractors', '+44 121 300 300', '/uploads/skyline.png', 'High-rise refurbishment and facade projects.', 'https://skyline.example', ARRAY['Scaffolding', 'Facade', 'Painting'], 'Birmingham', 'B1', 'pending', 'free')
       ON CONFLICT (user_id) DO UPDATE SET
         company_name = EXCLUDED.company_name,
         phone = EXCLUDED.phone,
         logo = EXCLUDED.logo,
         description = EXCLUDED.description,
         website = EXCLUDED.website,
        trades = EXCLUDED.trades,
         city = EXCLUDED.city,
         postcode = EXCLUDED.postcode,
         verification_status = EXCLUDED.verification_status,
         plan = EXCLUDED.plan,
         updated_at = CURRENT_TIMESTAMP`,
      [apexId, northId, skylineId]
    );

    const job = await client.query(
      `INSERT INTO jobs (company_id, title, description, city, postcode, trade_required, experience_required, certificates_required, start_date, duration, rate, workers_required, status)
       VALUES
       ($1, 'Carpenter for office fit-out', 'Partition walls, door sets, and premium finishing for a city centre office.', 'Manchester', 'M3', 'Carpentry', '5+ years', ARRAY['CSCS Gold'], CURRENT_DATE + INTERVAL '5 days', '3 weeks', '£28-£32/hour', 2, 'open')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [apexId]
    );

    const jobId =
      job.rows[0]?.id ||
      (await client.query('SELECT id FROM jobs WHERE company_id = $1 AND title = $2 LIMIT 1', [apexId, 'Carpenter for office fit-out'])).rows[0].id;

    await client.query(
      `INSERT INTO jobs (company_id, title, description, city, postcode, trade_required, experience_required, certificates_required, start_date, duration, rate, workers_required, status)
       VALUES
       ($1, 'Approved electrician', 'Testing, containment, and final fixes on a fast-moving residential block.', 'Leeds', 'LS10', 'Electrical', '4+ years', ARRAY['ECS Gold'], CURRENT_DATE + INTERVAL '10 days', '6 weeks', '£32-£36/hour', 1, 'open')
       ON CONFLICT DO NOTHING`,
      [northId]
    );

    await client.query(
      `INSERT INTO applications (job_id, worker_id, status, cover_note)
       VALUES ($1, $2, 'pending', 'Available for the full duration and can provide references from similar fit-outs.')
       ON CONFLICT (job_id, worker_id) DO UPDATE SET cover_note = EXCLUDED.cover_note, updated_at = CURRENT_TIMESTAMP`,
      [jobId, workerId]
    );

    await client.query(
      `INSERT INTO feed_posts (author_id, post_type, caption, media_urls, tags, location, project_size, duration)
       VALUES
       ($1, 'work_completed', 'Completed a reception desk installation with acoustic panel finishing.', ARRAY['/uploads/feed/reception.jpg'], ARRAY['carpentry', 'fit-out'], 'Manchester', 'Medium', '4 days'),
       ($2, 'company_update', 'We are onboarding finishing crews for two new Manchester projects.', ARRAY['/uploads/feed/apex-update.jpg'], ARRAY['hiring', 'carpentry'], 'Manchester', 'Large', 'Q2'),
       ($3, 'company_update', 'NorthBuild posted new shifts for electricians and testers.', ARRAY['/uploads/feed/northbuild-update.jpg'], ARRAY['electrical', 'testing'], 'Leeds', 'Large', '6 weeks')
       ON CONFLICT DO NOTHING`,
      [workerId, apexId, northId]
    );

    await client.query(
      `INSERT INTO stories (company_id, media_url, caption, expires_at)
       VALUES
       ($1, '/uploads/stories/apex.jpg', 'Apex needs carpenters this week', CURRENT_TIMESTAMP + INTERVAL '24 hours'),
       ($2, '/uploads/stories/northbuild.jpg', 'NorthBuild site opening', CURRENT_TIMESTAMP + INTERVAL '24 hours'),
       ($3, '/uploads/stories/skyline.jpg', 'Skyline facade update', CURRENT_TIMESTAMP + INTERVAL '24 hours')
       ON CONFLICT DO NOTHING`,
      [apexId, northId, skylineId]
    );

    await client.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2), ($1, $3), ($2, $1)
       ON CONFLICT (follower_id, following_id) DO NOTHING`,
      [workerId, apexId, northId]
    );

    const conversation = await client.query(
      `INSERT INTO conversations (worker_id, company_id, job_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (worker_id, company_id, job_id) DO UPDATE SET job_id = EXCLUDED.job_id
       RETURNING id`,
      [workerId, apexId, jobId]
    );

    await client.query(
      `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, 'Hi Alex, are you available for a quick call about the fit-out role?')
       ON CONFLICT DO NOTHING`,
      [conversation.rows[0].id, apexId]
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
       VALUES
       ($1, 'application', 'Application sent', 'Your application was sent to Apex Build.', 'job', $2),
       ($1, 'message', 'New message from Apex Build', 'Apex Build sent you a message.', 'conversation', $3),
       ($4, 'admin', 'Review pending company', 'Skyline Contractors is waiting for verification.', 'company', $5)
       ON CONFLICT DO NOTHING`,
      [workerId, jobId, conversation.rows[0].id, adminId, skylineId]
    );

    await client.query(
      `INSERT INTO reports (reporter_id, reported_job_id, type, reason)
       VALUES ($1, $2, 'job', 'Demo report for admin moderation workflow.')
       ON CONFLICT DO NOTHING`,
      [workerTwoId, jobId]
    );

    await client.query('COMMIT');
    console.log('Seed data inserted');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
