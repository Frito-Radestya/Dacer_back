const { query } = require('../config/db')

// GET /api/promotions?userId=&storeId=
async function getPromotions (req, res) {
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
      SELECT id, user_id, store_id, name, description, discount_type,
             discount_value, min_order_quantity, start_date, end_date,
             is_active, created_at, updated_at
      FROM promotions
      ${where}
      ORDER BY created_at DESC;
    `

    const result = await query(selectQuery, params)
    const promotions = result.rows.map(p => ({
      id: p.id,
      user_id: p.user_id,
      store_id: p.store_id,
      name: p.name,
      description: p.description,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      min_quantity: p.min_order_quantity, // expose as min_quantity untuk frontend
      start_date: p.start_date,
      end_date: p.end_date,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at
    }))

    res.json({
      status: 'success',
      data: { promotions }
    })
  } catch (error) {
    console.error('Error fetching promotions:', error)
    res.status(500).json({ status: 'error', message: 'Gagal mengambil data promosi' })
  }
}

// POST /api/promotions
async function createPromotion (req, res) {
  try {
    const {
      userId,
      storeId,
      name,
      description,
      discount_type,
      discount_value,
      min_quantity,
      start_date,
      end_date,
      applicable_products
    } = req.body

    if (!userId || !storeId || !name || !discount_type || !discount_value) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId, storeId, name, discount_type, dan discount_value wajib diisi'
      })
    }

    const insertQuery = `
      INSERT INTO promotions (user_id, store_id, name, description, discount_type,
                              discount_value, min_order_quantity, start_date, end_date,
                              original_price, discounted_price, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, true)
      RETURNING id, user_id, store_id, name, description, discount_type,
                discount_value, min_order_quantity, start_date, end_date,
                is_active, created_at, updated_at;
    `

    const values = [
      userId, storeId, name, description || '', discount_type,
      discount_value, min_quantity || 1, start_date || null, end_date || null
    ]
    const result = await query(insertQuery, values)
    const row = result.rows[0]
    const promotion = {
      id: row.id,
      user_id: row.user_id,
      store_id: row.store_id,
      name: row.name,
      description: row.description,
      discount_type: row.discount_type,
      discount_value: row.discount_value,
      min_quantity: row.min_order_quantity,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    }

    res.status(201).json({
      status: 'success',
      data: { promotion }
    })
  } catch (error) {
    console.error('Error creating promotion:', error)
    res.status(500).json({ status: 'error', message: 'Gagal membuat promosi' })
  }
}

// PUT /api/promotions/:id
async function updatePromotion (req, res) {
  try {
    const { id } = req.params
    const {
      name,
      description,
      discount_type,
      discount_value,
      min_quantity,
      start_date,
      end_date,
      applicable_products,
      is_active
    } = req.body

    const updateQuery = `
      UPDATE promotions
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          discount_type = COALESCE($3, discount_type),
          discount_value = COALESCE($4, discount_value),
          min_order_quantity = COALESCE($5, min_order_quantity),
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date),
          is_active = COALESCE($8, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `

    const values = [
      name, description, discount_type, discount_value,
      min_quantity, start_date, end_date,
      is_active, id
    ]
    const result = await query(updateQuery, values)
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Promosi tidak ditemukan' })
    }

    const promotion = result.rows[0]
    res.json({
      status: 'success',
      data: { promotion }
    })
  } catch (error) {
    console.error('Error updating promotion:', error)
    res.status(500).json({ status: 'error', message: 'Gagal memperbarui promosi' })
  }
}

// DELETE /api/promotions/:id
async function deletePromotion (req, res) {
  try {
    const { id } = req.params
    const deleteQuery = 'DELETE FROM promotions WHERE id = $1 RETURNING *;'
    const result = await query(deleteQuery, [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Promosi tidak ditemukan' })
    }
    res.json({ status: 'success', message: 'Promosi dihapus' })
  } catch (error) {
    console.error('Error deleting promotion:', error)
    res.status(500).json({ status: 'error', message: 'Gagal menghapus promosi' })
  }
}

module.exports = {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion
}
