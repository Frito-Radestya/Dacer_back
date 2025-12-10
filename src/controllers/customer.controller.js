const { query } = require('../config/db')

// GET /api/customers?userId=&storeId=
async function getCustomers (req, res) {
  try {
    const userId = req.query.userId
    const storeId = req.query.storeId

    if (!userId) {
      return res.status(400).json({ status: 'fail', message: 'userId wajib diisi' })
    }

    let where = 'WHERE user_id = $1'
    const params = [userId]
    if (storeId) {
      where += ' AND store_id = $2'
      params.push(storeId)
    }

    const selectQuery = `
      SELECT id, user_id, store_id, nama, phone, address, notes, created_at
      FROM customers
      ${where}
      ORDER BY nama ASC;
    `

    const result = await query(selectQuery, params)
    const customers = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      store_id: row.store_id,
      name: row.nama, // expose as `name` untuk frontend
      phone: row.phone,
      address: row.address,
      notes: row.notes,
      email: null, // kolom email belum ada di schema, jadi null
      created_at: row.created_at
    }))

    res.json({
      status: 'success',
      data: { customers }
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ status: 'error', message: 'Gagal mengambil data pelanggan' })
  }
}

// POST /api/customers
async function createCustomer (req, res) {
  try {
    const { userId, storeId, name, phone, address, email } = req.body
    if (!userId || !storeId || !name) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId, storeId, dan name wajib diisi'
      })
    }

    const insertQuery = `
      INSERT INTO customers (user_id, store_id, nama, phone, address, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, store_id, nama, phone, address, notes, created_at;
    `

    const values = [userId, storeId, name, phone || null, address || null, null]
    const result = await query(insertQuery, values)
    const row = result.rows[0]
    const customer = {
      id: row.id,
      user_id: row.user_id,
      store_id: row.store_id,
      name: row.nama,
      phone: row.phone,
      address: row.address,
      notes: row.notes,
      email: null,
      created_at: row.created_at
    }

    res.status(201).json({
      status: 'success',
      data: { customer }
    })
  } catch (error) {
    console.error('Error creating customer:', error)
    res.status(500).json({ status: 'error', message: 'Gagal membuat pelanggan' })
  }
}

module.exports = {
  getCustomers,
  createCustomer
}
