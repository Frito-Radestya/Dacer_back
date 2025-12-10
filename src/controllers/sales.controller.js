const { query } = require('../config/db')

// Helper: generate simple order id
function generateOrderId () {
  const now = new Date()
  return `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`
}

// POST /api/sales
async function createSale (req, res) {
  try {
    const {
      userId,
      storeId,
      items,
      total_amount,
      total_items,
      payment_method,
      payment_status,
      customer_info,
      midtrans_token,
      midtrans_redirect_url
    } = req.body

    if (!userId || !storeId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId, storeId, dan items transaksi wajib diisi'
      })
    }

    const orderId = req.body.order_id || generateOrderId()

    const insertQuery = `
      INSERT INTO sales (
        user_id,
        store_id,
        order_id,
        total_amount,
        total_items,
        payment_method,
        payment_status,
        customer_info,
        items,
        midtrans_token,
        midtrans_redirect_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11
      )
      RETURNING *;
    `

    const values = [
      userId,
      storeId,
      orderId,
      total_amount,
      total_items,
      payment_method || 'tunai',
      payment_status || 'completed',
      customer_info ? JSON.stringify(customer_info) : null,
      JSON.stringify(items),
      midtrans_token || null,
      midtrans_redirect_url || null
    ]

    const result = await query(insertQuery, values)
    const sale = result.rows[0]

    // Update stok produk berdasarkan items
    try {
      for (const item of items) {
        await query(
          'UPDATE products SET stok = stok - $1 WHERE id = $2 AND store_id = $3',
          [item.qty, item.id, storeId]
        )
      }
      console.log(`[Sales] Updated stock for ${items.length} items (order: ${sale.order_id})`)
    } catch (stockErr) {
      console.error('[Sales] Failed to update stock:', stockErr)
      // Tetap lanjut, meskipun stok gagal update
    }

    res.status(201).json({
      status: 'success',
      data: { sale }
    })
  } catch (error) {
    console.error('Error creating sale:', error)
    res.status(500).json({ status: 'error', message: 'Gagal membuat transaksi penjualan' })
  }
}

// GET /api/sales/summary?userId=&storeId=
async function getSalesSummary (req, res) {
  try {
    const userId = req.userId || req.query.userId
    const storeId = req.query.storeId

    if (!userId) {
      return res.status(400).json({ status: 'fail', message: 'userId wajib diisi' })
    }

    // Ambil sales 30 hari terakhir untuk user (dan store kalau ada) lalu agregasi di Node
    const params = [userId]
    let where = 'user_id = $1 AND timestamp >= CURRENT_DATE - INTERVAL \'30 days\''

    if (storeId) {
      params.push(storeId)
      where += ` AND store_id = $${params.length}`
    }

    const selectQuery = `
      SELECT id, user_id, store_id, order_id, total_amount, total_items,
             payment_method, payment_status, customer_info, items,
             timestamp
      FROM sales
      WHERE ${where}
      ORDER BY timestamp DESC;
    `

    const result = await query(selectQuery, params)
    const sales = result.rows

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(todayStart.getDate() - 1)
    const yesterdayEnd = new Date(todayStart)
    const weekAgo = new Date(todayStart)
    weekAgo.setDate(todayStart.getDate() - 7)
    const monthAgo = new Date(todayStart)
    monthAgo.setDate(todayStart.getDate() - 30)

    function inRange (sale, from, to) {
      const d = new Date(sale.timestamp)
      if (to) return d >= from && d < to
      return d >= from
    }

    const todaySales = sales.filter(s => inRange(s, todayStart))
    const yesterdaySales = sales.filter(s => inRange(s, yesterdayStart, yesterdayEnd))
    const weeklySales = sales.filter(s => inRange(s, weekAgo))
    const monthlySales = sales.filter(s => inRange(s, monthAgo))

    function aggregate (list) {
      const totalRevenue = list.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
      const totalTransactions = list.length
      const totalItems = list.reduce((sum, s) => sum + Number(s.total_items || 0), 0)
      return { totalRevenue, totalTransactions, totalItems }
    }

    const summary = {
      today: aggregate(todaySales),
      yesterday: aggregate(yesterdaySales),
      week: aggregate(weeklySales),
      month: aggregate(monthlySales)
    }

    res.json({
      status: 'success',
      data: {
        summary,
        sales
      }
    })
  } catch (error) {
    console.error('Error getting sales summary:', error)
    res.status(500).json({ status: 'error', message: 'Gagal mengambil ringkasan penjualan' })
  }
}

module.exports = {
  createSale,
  getSalesSummary
}
