const { query } = require('../config/db')

// GET /api/debts?userId=&storeId=
async function getDebts (req, res) {
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
      SELECT id, user_id, store_id, customer_id, customer_name, customer_phone,
             customer_address, total_amount, paid_amount, remaining_amount,
             status, due_date, notes, last_payment_date, timestamp, created_at, updated_at
      FROM debts
      ${where}
      ORDER BY due_date ASC, created_at DESC;
    `

    const result = await query(selectQuery, params)
    const debts = result.rows.map(d => ({
      id: d.id,
      user_id: d.user_id,
      store_id: d.store_id,
      customer_id: d.customer_id,
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      customer_address: d.customer_address,
      // map ke field yang dipakai frontend Debts.jsx
      amount: Number(d.total_amount || 0),
      amount_paid: Number(d.paid_amount || 0),
      remaining: Number(d.remaining_amount ?? (Number(d.total_amount || 0) - Number(d.paid_amount || 0))),
      status: d.status,
      due_date: d.due_date,
      description: d.notes,
      last_payment_date: d.last_payment_date,
      timestamp: d.timestamp,
      created_at: d.created_at,
      updated_at: d.updated_at
    }))

    res.json({
      status: 'success',
      data: { debts }
    })
  } catch (error) {
    console.error('Error fetching debts:', error)
    res.status(500).json({ status: 'error', message: 'Gagal mengambil data utang' })
  }
}

// POST /api/debts
async function createDebt (req, res) {
  try {
    const {
      userId,
      storeId,
      customer_name,
      customer_phone,
      customer_address,
      description,
      amount,
      due_date
    } = req.body

    if (!userId || !storeId || !customer_name || amount == null) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId, storeId, customer_name, dan amount wajib diisi'
      })
    }

    const numericAmount = Number(amount)

    const insertQuery = `
      INSERT INTO debts (
        user_id, store_id, customer_id, customer_name, customer_phone, customer_address,
        total_amount, paid_amount, status, due_date, notes
      )
      VALUES ($1, $2, NULL, $3, $4, $5, $6, 0, 'unpaid', $7, $8)
      RETURNING id, user_id, store_id, customer_id, customer_name, customer_phone,
                customer_address, total_amount, paid_amount, remaining_amount,
                status, due_date, notes, last_payment_date, timestamp, created_at, updated_at;
    `

    const values = [
      userId,
      storeId,
      customer_name,
      customer_phone || null,
      customer_address || null,
      numericAmount,
      due_date || null,
      description || ''
    ]
    const result = await query(insertQuery, values)
    const d = result.rows[0]
    const debt = {
      id: d.id,
      user_id: d.user_id,
      store_id: d.store_id,
      customer_id: d.customer_id,
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      customer_address: d.customer_address,
      amount: Number(d.total_amount || 0),
      amount_paid: Number(d.paid_amount || 0),
      remaining: Number(d.remaining_amount ?? (Number(d.total_amount || 0) - Number(d.paid_amount || 0))),
      status: d.status,
      due_date: d.due_date,
      description: d.notes,
      last_payment_date: d.last_payment_date,
      timestamp: d.timestamp,
      created_at: d.created_at,
      updated_at: d.updated_at
    }

    res.status(201).json({
      status: 'success',
      data: { debt }
    })
  } catch (error) {
    console.error('Error creating debt:', error)
    res.status(500).json({ status: 'error', message: 'Gagal membuat utang' })
  }
}

// PUT /api/debts/:id
async function updateDebt (req, res) {
  try {
    const { id } = req.params
    const { customer_name, description, amount, amount_paid, due_date, status, customer_phone, customer_address } = req.body

    const updateQuery = `
      UPDATE debts
      SET customer_name = COALESCE($1, customer_name),
          customer_phone = COALESCE($2, customer_phone),
          customer_address = COALESCE($3, customer_address),
          total_amount = COALESCE($4, total_amount),
          paid_amount = COALESCE($5, paid_amount),
          due_date = COALESCE($6, due_date),
          status = COALESCE($7, status),
          notes = COALESCE($8, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING id, user_id, store_id, customer_id, customer_name, customer_phone,
                customer_address, total_amount, paid_amount, remaining_amount,
                status, due_date, notes, last_payment_date, timestamp, created_at, updated_at;
    `

    const values = [
      customer_name,
      customer_phone,
      customer_address,
      amount,
      amount_paid,
      due_date,
      status,
      description,
      id
    ]
    const result = await query(updateQuery, values)
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Utang tidak ditemukan' })
    }

    const debt = result.rows[0]
    res.json({
      status: 'success',
      data: { debt }
    })
  } catch (error) {
    console.error('Error updating debt:', error)
    res.status(500).json({ status: 'error', message: 'Gagal memperbarui utang' })
  }
}

// DELETE /api/debts/:id
async function deleteDebt (req, res) {
  try {
    const { id } = req.params
    const deleteQuery = 'DELETE FROM debts WHERE id = $1 RETURNING *;'
    const result = await query(deleteQuery, [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Utang tidak ditemukan' })
    }
    res.json({ status: 'success', message: 'Utang dihapus' })
  } catch (error) {
    console.error('Error deleting debt:', error)
    res.status(500).json({ status: 'error', message: 'Gagal menghapus utang' })
  }
}

module.exports = {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt
}
