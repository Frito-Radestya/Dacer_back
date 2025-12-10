const { query } = require('../config/db')

// Get all stores for current user
async function getStores (req, res) {
  try {
    const userId = req.userId || req.query.userId

    if (!userId) {
      return res.status(400).json({ message: 'userId diperlukan' })
    }

    const result = await query(
      `SELECT id, user_id, name, owner_name, address, phone, email, description,
              total_sales, total_revenue, total_profit, total_products, last_sale_date,
              is_active, created_at, updated_at
       FROM stores
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    )

    res.json({ stores: result.rows })
  } catch (error) {
    console.error('Error fetching stores:', error)
    res.status(500).json({ message: 'Gagal mengambil data toko' })
  }
}

// Create new store
async function createStore (req, res) {
  try {
    const userId = req.userId || req.body.userId
    const { name, owner_name, address, phone, email, description } = req.body

    if (!userId || !name || !owner_name) {
      return res.status(400).json({ message: 'Nama toko dan pemilik wajib diisi' })
    }

    const result = await query(
      `INSERT INTO stores (user_id, name, owner_name, address, phone, email, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, name, owner_name, address, phone, email, description,
                 total_sales, total_revenue, total_profit, total_products, last_sale_date,
                 is_active, created_at, updated_at`,
      [userId, name, owner_name, address || null, phone || null, email || null, description || null]
    )

    res.status(201).json({ store: result.rows[0] })
  } catch (error) {
    console.error('Error creating store:', error)
    res.status(500).json({ message: 'Gagal membuat toko' })
  }
}

// Update store
async function updateStore (req, res) {
  try {
    const storeId = req.params.id
    const userId = req.userId || req.body.userId
    const { name, owner_name, address, phone, email, description, is_active } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'userId diperlukan' })
    }

    const result = await query(
      `UPDATE stores
       SET name = COALESCE($1, name),
           owner_name = COALESCE($2, owner_name),
           address = COALESCE($3, address),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           description = COALESCE($6, description),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9
       RETURNING id, user_id, name, owner_name, address, phone, email, description,
                 total_sales, total_revenue, total_profit, total_products, last_sale_date,
                 is_active, created_at, updated_at`,
      [name, owner_name, address, phone, email, description, is_active, storeId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toko tidak ditemukan' })
    }

    res.json({ store: result.rows[0] })
  } catch (error) {
    console.error('Error updating store:', error)
    res.status(500).json({ message: 'Gagal mengupdate toko' })
  }
}

module.exports = {
  getStores,
  createStore,
  updateStore
}
