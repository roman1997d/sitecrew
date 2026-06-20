const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function seedSuperadmin() {
  const email = 'rdemian732@gmail.com';
  const password = '12345678';
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`
  );
  await pool.query(
    `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('worker', 'company', 'admin', 'superadmin'))`
  );

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, 'superadmin', 'active')
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'superadmin',
       status = 'active',
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, email, role, status`,
    [email, passwordHash]
  );

  console.log('Superadmin ready:', result.rows[0]);
}

seedSuperadmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => pool.end());
