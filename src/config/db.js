require('dotenv').config()
const { neon } = require('@neondatabase/serverless')

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Please configure Neon connection string in .env')
}

// Client Neon menggunakan connection string
const sql = neon(process.env.DATABASE_URL)

// Helper query agar kompatibel dengan pemanggilan pool.query(text, params)
async function query (text, params) {
  // gunakan unsafe supaya bisa kirim query dinamis dari controller
  const result = await sql.unsafe(text, params)
  return { rows: result }
}

module.exports = {
  query,
  // tidak ada pool seperti pg, tapi expose sql kalau suatu saat dibutuhkan
  pool: { sql },
}