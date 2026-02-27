const { Pool } = require("pg");
const logger = require("../utils/logger");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pay_per_use', 'pro', 'business')),
        analyses_this_month INTEGER DEFAULT 0,
        last_reset_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        key_prefix VARCHAR(20) NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pay_per_use', 'pro', 'business')),
        monthly_quota INTEGER DEFAULT 3,
        used_this_month INTEGER DEFAULT 0,
        last_reset_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
        language VARCHAR(5) DEFAULT 'fr',
        ats_score INTEGER,
        result JSONB,
        tokens_used INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    logger.info("Database initialized successfully");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
