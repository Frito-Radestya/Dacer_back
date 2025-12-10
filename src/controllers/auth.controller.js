const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')

// Helper to generate JWT
function generateToken (user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  )
}

// Register new user
async function register (req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' })
    }

    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email sudah terdaftar' })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // NOTE: kolom name di schema wajib (NOT NULL),
    // sementara kita isi nama default dari bagian lokal email
    const defaultName = email.split('@')[0]

    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, passwordHash, defaultName, 'user', true]
    )

    const user = result.rows[0]
    const token = generateToken(user)

    res.status(201).json({
      message: 'Registrasi berhasil',
      user,
      token
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// Login user
async function login (req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi' })
    }

    const result = await query(
      'SELECT id, email, role, is_active, password_hash FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' })
    }

    const user = result.rows[0]

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah' })
    }

    const token = generateToken(user)

    // Jangan kirim password_hash ke client
    delete user.password_hash

    res.json({
      message: 'Login berhasil',
      user,
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Terjadi kesalahan server' })
  }
}

// Get current user from token
async function getMe (req, res) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      return res.status(401).json({ message: 'Token tidak ditemukan' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const result = await query(
      'SELECT id, email, role, is_active, created_at FROM users WHERE id = $1',
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' })
    }

    res.json({ user: result.rows[0] })
  } catch (error) {
    console.error('GetMe error:', error)
    res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa' })
  }
}

module.exports = {
  register,
  login,
  getMe
}
