const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sewadtu1',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'PRAKHAR007',
  ssl: false,
});

async function testConnection() {
  const client = await pool.connect();
  const result = await client.query('SELECT NOW()');
  client.release();
  return result.rows[0];
}

async function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      avatar_url TEXT,
      auth_provider VARCHAR(50) DEFAULT 'local',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await pool.query(createTableQuery);

  // Alter existing table columns if needed (safe for existing setups)
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
        ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
          ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
          ALTER TABLE users ADD COLUMN avatar_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_provider') THEN
          ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';
        END IF;
      END IF;
    END $$;
  `);

  console.log('Users table is ready.');
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
};
