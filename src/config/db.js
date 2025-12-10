const { Pool } = require('pg')
require('dotenv').config()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Please configure Neon connection string in .env')
}

// Pool pg menggunakan DATABASE_URL Neon
// SSL dikontrol langsung dari query string (?sslmode=require)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
}