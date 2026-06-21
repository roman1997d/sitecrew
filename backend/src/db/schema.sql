CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('worker', 'company', 'admin', 'superadmin')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended', 'deleted')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(40),
  profile_photo VARCHAR(500),
  trades TEXT[] NOT NULL DEFAULT '{}',
  trade_interests TEXT[] NOT NULL DEFAULT '{}',
  experience VARCHAR(50),
  certificates TEXT[] NOT NULL DEFAULT '{}',
  city VARCHAR(120),
  postcode VARCHAR(30),
  working_radius VARCHAR(40) DEFAULT '25 miles',
  availability_status VARCHAR(50) DEFAULT 'Available Now',
  expected_rate VARCHAR(60),
  bio TEXT,
  work_locations TEXT[] NOT NULL DEFAULT '{}',
  years_experience INTEGER,
  last_companies TEXT[] NOT NULL DEFAULT '{}',
  has_health_issues BOOLEAN DEFAULT FALSE,
  health_issues_details TEXT,
  qualifications TEXT[] NOT NULL DEFAULT '{}',
  has_uk_work_permit BOOLEAN DEFAULT FALSE,
  is_english_native BOOLEAN DEFAULT FALSE,
  native_language VARCHAR(120),
  english_level VARCHAR(80),
  has_car BOOLEAN DEFAULT FALSE,
  can_use_car_for_work BOOLEAN DEFAULT FALSE,
  data_consent BOOLEAN DEFAULT FALSE,
  language_preference VARCHAR(10),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(180) NOT NULL,
  phone VARCHAR(40),
  logo VARCHAR(500),
  description TEXT,
  website VARCHAR(300),
  head_office VARCHAR(180),
  business_type VARCHAR(120),
  trades TEXT[] NOT NULL DEFAULT '{}',
  city VARCHAR(120),
  postcode VARCHAR(30),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_purchased_at TIMESTAMP,
  plan_expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS head_office VARCHAR(180);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS business_type VARCHAR(120);
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trades TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS plan_purchased_at TIMESTAMP;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS plan_terms_version INTEGER;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS plan_terms_accepted_at TIMESTAMP;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10);
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS trade_interests TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE worker_profiles DROP CONSTRAINT IF EXISTS worker_profiles_verification_status_check;
ALTER TABLE worker_profiles ADD CONSTRAINT worker_profiles_verification_status_check
  CHECK (verification_status IN ('pending', 'approved', 'rejected'));
UPDATE worker_profiles SET verification_status = 'pending' WHERE verification_status IS NULL;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS qualification_badge_color VARCHAR(20) NOT NULL DEFAULT 'green';
ALTER TABLE worker_profiles DROP CONSTRAINT IF EXISTS worker_profiles_qualification_badge_color_check;
ALTER TABLE worker_profiles ADD CONSTRAINT worker_profiles_qualification_badge_color_check
  CHECK (qualification_badge_color IN ('green', 'blue', 'gold', 'black', 'white', 'red', 'grey'));
UPDATE worker_profiles SET qualification_badge_color = 'green' WHERE qualification_badge_color IS NULL;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS construction_trades (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) UNIQUE NOT NULL,
  category VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO construction_trades (name, category) VALUES
  ('Acoustic Ceiling Installer', 'Interiors'),
  ('Air Conditioning Engineer', 'Mechanical'),
  ('Architectural Metalworker', 'Structural'),
  ('Asbestos Removal Operative', 'Specialist'),
  ('Assistant Site Manager', 'Management'),
  ('Banksman', 'Site Operations'),
  ('Bobcat Operator', 'Plant'),
  ('Bathroom Fitter', 'Interiors'),
  ('Bricklayer', 'Brickwork'),
  ('Builder', 'General Construction'),
  ('Building Maintenance Operative', 'Maintenance'),
  ('Carpenter', 'Carpentry'),
  ('Cherry Picker Operator', 'Plant'),
  ('Ceiling Fixer', 'Interiors'),
  ('Civil Engineering Operative', 'Civil Engineering'),
  ('Cladder', 'Envelope'),
  ('Concrete Finisher', 'Concrete'),
  ('Concrete Pump Operator', 'Concrete'),
  ('Construction Labourer', 'Site Operations'),
  ('Crane Operator', 'Lifting'),
  ('Demolition Operative', 'Demolition'),
  ('Diamond Driller', 'Specialist'),
  ('Drainage Engineer', 'Groundworks'),
  ('Driver', 'Logistics'),
  ('Dryliner', 'Interiors'),
  ('Dumper Driver', 'Plant'),
  ('Ductwork Installer', 'Mechanical'),
  ('Electrician', 'Electrical'),
  ('Excavator Operator', 'Plant'),
  ('Facade Installer', 'Envelope'),
  ('Fire Door Installer', 'Fire Safety'),
  ('Fire Stopper', 'Fire Safety'),
  ('Fixer', 'Interiors'),
  ('Floor Layer', 'Flooring'),
  ('Floor Screeder', 'Flooring'),
  ('Forklift Driver', 'Plant'),
  ('Formworker', 'Concrete'),
  ('Gas Engineer', 'Mechanical'),
  ('Gate Man', 'Site Operations'),
  ('General Labourer', 'Site Operations'),
  ('Glazier', 'Envelope'),
  ('Groundworker', 'Groundworks'),
  ('Handyman', 'Maintenance'),
  ('Heating Engineer', 'Mechanical'),
  ('Hoarding Installer', 'Site Operations'),
  ('Insulation Installer', 'Insulation'),
  ('Joiner', 'Carpentry'),
  ('Kitchen Fitter', 'Interiors'),
  ('Lift Engineer', 'Mechanical'),
  ('Mastic Man', 'Finishing'),
  ('MEP Engineer', 'MEP'),
  ('Machine Driver', 'Plant'),
  ('Machine Operator', 'Plant'),
  ('Manager Assistant', 'Management'),
  ('Mobile Crane Operator', 'Lifting'),
  ('Multi Trader', 'General Construction'),
  ('Painter and Decorator', 'Finishing'),
  ('Partition Installer', 'Interiors'),
  ('Paver', 'Groundworks'),
  ('Piling Operative', 'Groundworks'),
  ('Pipefitter', 'Mechanical'),
  ('Plant Operator', 'Plant'),
  ('Plant Vehicle Marshal', 'Site Operations'),
  ('Plasterer', 'Finishing'),
  ('Plumber', 'Mechanical'),
  ('Roller Driver', 'Plant'),
  ('Quantity Surveyor', 'Professional'),
  ('Rebar Fixer', 'Concrete'),
  ('Renderer', 'Finishing'),
  ('Rigger', 'Lifting'),
  ('Roofer', 'Roofing'),
  ('Scaffolder', 'Access'),
  ('Security Installer', 'Electrical'),
  ('Shuttering Carpenter', 'Concrete'),
  ('Site Cleaner', 'Site Operations'),
  ('Site Engineer', 'Professional'),
  ('Site Manager', 'Management'),
  ('Site Security', 'Security'),
  ('Site Supervisor', 'Management'),
  ('Skilled Labourer', 'Site Operations'),
  ('Steel Erector', 'Structural'),
  ('Stone Mason', 'Masonry'),
  ('Taper and Jointer', 'Interiors'),
  ('Telehandler Operator', 'Plant'),
  ('Tiler', 'Finishing'),
  ('Traffic Marshal', 'Site Operations'),
  ('Tower Crane Operator', 'Lifting'),
  ('Truck Driver', 'Logistics'),
  ('Welfare Labourer', 'Site Operations'),
  ('Waterproofer', 'Specialist'),
  ('Welder', 'Structural'),
  ('Window Fitter', 'Envelope')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;

CREATE TABLE IF NOT EXISTS construction_trade_rates (
  trade_name VARCHAR(160) PRIMARY KEY REFERENCES construction_trades(name) ON DELETE CASCADE,
  hourly_rate NUMERIC(8, 2),
  day_rate NUMERIC(8, 2),
  sqm_rate NUMERIC(8, 2),
  source_label VARCHAR(160) DEFAULT 'SiteCrew market average',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO construction_trade_rates (trade_name, hourly_rate, day_rate, sqm_rate) VALUES
  ('Bricklayer', 27, 220, 65),
  ('Carpenter', 25, 210, NULL),
  ('Ceiling Fixer', 24, 200, 7),
  ('Dryliner', 24, 200, 6),
  ('Electrician', 32, 260, NULL),
  ('Floor Layer', 24, 200, 9),
  ('Forklift Driver', 19, 155, NULL),
  ('General Labourer', 15, 120, NULL),
  ('Groundworker', 21, 170, NULL),
  ('Joiner', 25, 210, NULL),
  ('Painter and Decorator', 21, 170, 6),
  ('Plasterer', 25, 200, 5),
  ('Plumber', 30, 240, NULL),
  ('Roofer', 25, 210, NULL),
  ('Scaffolder', 24, 200, NULL),
  ('Site Manager', 38, 300, NULL),
  ('Site Security', 16, 130, NULL),
  ('Taper and Jointer', 24, 200, 5),
  ('Telehandler Operator', 20, 165, NULL),
  ('Tiler', 25, 200, 10)
ON CONFLICT (trade_name) DO UPDATE SET
  hourly_rate = EXCLUDED.hourly_rate,
  day_rate = EXCLUDED.day_rate,
  sqm_rate = EXCLUDED.sqm_rate,
  updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS rate_insight_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_date DATE NOT NULL,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, insight_date)
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  city VARCHAR(120),
  postcode VARCHAR(30),
  trade_required VARCHAR(120) NOT NULL,
  experience_required VARCHAR(80),
  certificates_required TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE,
  duration VARCHAR(100),
  rate VARCHAR(60),
  workers_required INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE jobs SET created_by_user_id = company_id WHERE created_by_user_id IS NULL;

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'unhired')),
  cover_note TEXT,
  can_post_jobs BOOLEAN NOT NULL DEFAULT FALSE,
  can_post_company_posts BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, worker_id)
);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS can_post_jobs BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS can_post_company_posts BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS feed_posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  post_type VARCHAR(30) NOT NULL DEFAULT 'work_completed' CHECK (post_type IN ('work_completed', 'progress', 'skills', 'certification', 'company_update')),
  title VARCHAR(200),
  caption TEXT NOT NULL,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  location VARCHAR(150),
  project_size VARCHAR(50),
  duration VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
UPDATE feed_posts SET created_by_user_id = author_id WHERE created_by_user_id IS NULL;

CREATE TABLE IF NOT EXISTS feed_likes (
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_saved_posts (
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  media_url VARCHAR(500),
  caption TEXT,
  expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE stories ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
UPDATE stories SET author_id = company_id WHERE author_id IS NULL;

CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS company_contacts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, worker_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  conversation_type VARCHAR(20) NOT NULL DEFAULT 'company' CHECK (conversation_type IN ('company', 'worker')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(worker_id, company_id, job_id)
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(20) NOT NULL DEFAULT 'company' CHECK (conversation_type IN ('company', 'worker'));

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  related_type VARCHAR(50),
  related_id INTEGER,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reported_job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('user', 'abuse', 'job')),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_reviews (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_reviews (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_trades ON worker_profiles USING GIN(trades);
CREATE INDEX IF NOT EXISTS idx_company_profiles_trades ON company_profiles USING GIN(trades);
CREATE INDEX IF NOT EXISTS idx_jobs_status_trade ON jobs(status, trade_required);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker ON applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_company ON stories(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20);
UPDATE messages SET moderation_status = 'visible' WHERE moderation_status IS NULL;
ALTER TABLE messages ALTER COLUMN moderation_status SET DEFAULT 'visible';
ALTER TABLE messages ALTER COLUMN moderation_status SET NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_moderation_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_moderation_status_check
  CHECK (moderation_status IN ('visible', 'flagged', 'hidden'));

ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_review_status VARCHAR(20);
UPDATE messages SET ai_review_status = 'approved_safe' WHERE ai_review_status IS NULL;
ALTER TABLE messages ALTER COLUMN ai_review_status SET DEFAULT 'pending';
ALTER TABLE messages ALTER COLUMN ai_review_status SET NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_ai_review_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_ai_review_status_check
  CHECK (ai_review_status IN ('pending', 'approved_safe', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_messages_ai_review ON messages(ai_review_status, created_at DESC);

ALTER TABLE worker_reviews ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20);
UPDATE worker_reviews SET moderation_status = 'visible' WHERE moderation_status IS NULL;
ALTER TABLE worker_reviews ALTER COLUMN moderation_status SET DEFAULT 'visible';
ALTER TABLE worker_reviews ALTER COLUMN moderation_status SET NOT NULL;
ALTER TABLE worker_reviews DROP CONSTRAINT IF EXISTS worker_reviews_moderation_status_check;
ALTER TABLE worker_reviews ADD CONSTRAINT worker_reviews_moderation_status_check
  CHECK (moderation_status IN ('visible', 'flagged', 'hidden'));

ALTER TABLE worker_reviews ADD COLUMN IF NOT EXISTS ai_review_status VARCHAR(20);
UPDATE worker_reviews SET ai_review_status = 'approved_safe' WHERE ai_review_status IS NULL;
ALTER TABLE worker_reviews ALTER COLUMN ai_review_status SET DEFAULT 'pending';
ALTER TABLE worker_reviews ALTER COLUMN ai_review_status SET NOT NULL;
ALTER TABLE worker_reviews DROP CONSTRAINT IF EXISTS worker_reviews_ai_review_status_check;
ALTER TABLE worker_reviews ADD CONSTRAINT worker_reviews_ai_review_status_check
  CHECK (ai_review_status IN ('pending', 'approved_safe', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_worker_reviews_ai_review ON worker_reviews(ai_review_status, created_at DESC);

ALTER TABLE company_reviews ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20);
UPDATE company_reviews SET moderation_status = 'visible' WHERE moderation_status IS NULL;
ALTER TABLE company_reviews ALTER COLUMN moderation_status SET DEFAULT 'visible';
ALTER TABLE company_reviews ALTER COLUMN moderation_status SET NOT NULL;
ALTER TABLE company_reviews DROP CONSTRAINT IF EXISTS company_reviews_moderation_status_check;
ALTER TABLE company_reviews ADD CONSTRAINT company_reviews_moderation_status_check
  CHECK (moderation_status IN ('visible', 'flagged', 'hidden'));

ALTER TABLE company_reviews ADD COLUMN IF NOT EXISTS ai_review_status VARCHAR(20);
UPDATE company_reviews SET ai_review_status = 'approved_safe' WHERE ai_review_status IS NULL;
ALTER TABLE company_reviews ALTER COLUMN ai_review_status SET DEFAULT 'pending';
ALTER TABLE company_reviews ALTER COLUMN ai_review_status SET NOT NULL;
ALTER TABLE company_reviews DROP CONSTRAINT IF EXISTS company_reviews_ai_review_status_check;
ALTER TABLE company_reviews ADD CONSTRAINT company_reviews_ai_review_status_check
  CHECK (ai_review_status IN ('pending', 'approved_safe', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_company_reviews_ai_review ON company_reviews(ai_review_status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_company_title_unique ON jobs(company_id, title);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_demo_unique ON messages(conversation_id, sender_id, body);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_demo_unique ON reports(reporter_id, reported_job_id, reason);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('worker', 'company', 'admin', 'superadmin'));
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'paused', 'suspended', 'deleted'));

ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible';
ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_moderation_status_check;
ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_moderation_status_check
  CHECK (moderation_status IN ('visible', 'hidden', 'flagged'));

CREATE TABLE IF NOT EXISTS api_logs (
  id SERIAL PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  status_code INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip VARCHAR(64),
  duration_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_trails (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trails_created ON audit_trails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_moderation ON feed_posts(moderation_status, created_at DESC);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible';
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_moderation_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_moderation_status_check
  CHECK (moderation_status IN ('visible', 'hidden', 'flagged'));

ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible';
ALTER TABLE feed_comments DROP CONSTRAINT IF EXISTS feed_comments_moderation_status_check;
ALTER TABLE feed_comments ADD CONSTRAINT feed_comments_moderation_status_check
  CHECK (moderation_status IN ('visible', 'hidden', 'flagged'));

CREATE TABLE IF NOT EXISTS content_scans (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(40) NOT NULL,
  entity_id INTEGER,
  content_type VARCHAR(40) NOT NULL,
  overall_risk INTEGER NOT NULL DEFAULT 0,
  moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible',
  scan_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_scans_entity ON content_scans(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_moderation ON jobs(moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_comments_moderation ON feed_comments(moderation_status, created_at DESC);

CREATE TABLE IF NOT EXISTS media_review_queue (
  id SERIAL PRIMARY KEY,
  file_path VARCHAR(500) NOT NULL UNIQUE,
  thumbnail_path VARCHAR(500),
  review_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_review_queue_pending ON media_review_queue(review_status, created_at ASC);

ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS ai_review_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE feed_posts DROP CONSTRAINT IF EXISTS feed_posts_ai_review_status_check;
ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_ai_review_status_check
  CHECK (ai_review_status IN ('pending', 'approved_safe', 'rejected'));

ALTER TABLE feed_comments ADD COLUMN IF NOT EXISTS ai_review_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE feed_comments DROP CONSTRAINT IF EXISTS feed_comments_ai_review_status_check;
ALTER TABLE feed_comments ADD CONSTRAINT feed_comments_ai_review_status_check
  CHECK (ai_review_status IN ('pending', 'approved_safe', 'rejected'));

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ai_review_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_ai_review_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_ai_review_status_check
  CHECK (ai_review_status IN ('pending', 'approved_safe', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_feed_posts_ai_review ON feed_posts(ai_review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_comments_ai_review ON feed_comments(ai_review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_ai_review ON jobs(ai_review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_not_allowed_terms (
  id SERIAL PRIMARY KEY,
  term VARCHAR(200) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'not_allowed_content',
  risk_score INTEGER NOT NULL DEFAULT 90,
  source_scan_id INTEGER REFERENCES content_scans(id) ON DELETE SET NULL,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(term)
);

CREATE TABLE IF NOT EXISTS ai_scan_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ai_scan_settings (key, value)
VALUES ('learn_mode_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO ai_scan_settings (key, value)
VALUES ('audit_auto_delete', '{"enabled": false, "retentionDays": 90}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS company_account_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('active', 'paused', 'suspended', 'deleted', 'event')),
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_account_history_company ON company_account_history(company_id, created_at DESC);
ALTER TABLE company_account_history DROP CONSTRAINT IF EXISTS company_account_history_action_check;
ALTER TABLE company_account_history ADD CONSTRAINT company_account_history_action_check
  CHECK (action IN ('active', 'paused', 'suspended', 'deleted', 'event'));

CREATE TABLE IF NOT EXISTS company_access_plans (
  plan_key VARCHAR(20) PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL,
  price_gbp NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  benefits TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT company_access_plans_plan_key_check CHECK (plan_key IN ('free', 'pro', 'ultra')),
  CONSTRAINT company_access_plans_price_check CHECK (price_gbp >= 0),
  CONSTRAINT company_access_plans_discount_check CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

INSERT INTO company_access_plans (plan_key, display_name, price_gbp, discount_percent, benefits)
VALUES
  (
    'free',
    'Free',
    0,
    0,
    ARRAY[
      'Basic company profile',
      'Up to 2 active job posts',
      'Standard applicant inbox',
      'Community support'
    ]
  ),
  (
    'pro',
    'Pro',
    49,
    0,
    ARRAY[
      'Unlimited job posts',
      'Applicant management and team tools',
      'Company feed and stories',
      'Contacts journal',
      'Priority email support'
    ]
  ),
  (
    'ultra',
    'Ultra',
    99,
    0,
    ARRAY[
      'Everything in Pro',
      'Featured company placement',
      'Advanced worker search filters',
      'Worker invite campaigns',
      'Dedicated account support'
    ]
  )
ON CONFLICT (plan_key) DO NOTHING;

ALTER TABLE company_profiles DROP CONSTRAINT IF EXISTS company_profiles_plan_check;
ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_plan_check CHECK (plan IN ('free', 'pro', 'ultra'));

CREATE TABLE IF NOT EXISTS sales_plan_terms_versions (
  id SERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  content TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_plan_terms_versions_created ON sales_plan_terms_versions(created_at DESC);
