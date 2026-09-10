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
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await pool.query(query);
  console.log('Users table is ready.');
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
};
