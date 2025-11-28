const { Pool } = require("pg");

// Railway da DATABASE_URL automáticamente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
