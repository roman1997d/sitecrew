const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../config/env');

function getDatabaseName(connectionString) {
  return new URL(connectionString).pathname.replace('/', '') || 'sitecrew_backend';
}

function getAdminConnectionString(connectionString) {
  const url = new URL(connectionString);
  url.pathname = '/postgres';
  return url.toString();
}

async function init() {
  const databaseName = getDatabaseName(env.databaseUrl);
  const admin = new Client({ connectionString: getAdminConnectionString(env.databaseUrl) });

  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${databaseName}`);
      console.log(`Created database ${databaseName}`);
    }
  } finally {
    await admin.end();
  }

  const db = new Client({ connectionString: env.databaseUrl });
  await db.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('Applied schema');
  } finally {
    await db.end();
  }
}

init().catch((error) => {
  console.error(error);
  process.exit(1);
});
