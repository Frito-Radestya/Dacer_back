const { query } = require('../config/db')

// Helper: generate simple order id
function generateOrderId () {
  const now = new Date()
  return `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${now.getTime()}`
}

// Helper: create automatic promotion for hot-selling products
// Rule (bisa disesuaikan): jika total qty produk dalam 7 hari terakhir >= HOT_THRESHOLD,
// buat promosi diskon persentase otomatis untuk toko tersebut.
async function maybeCreateAutoPromotionForHotProducts (userId, storeId, items) {
  const HOT_THRESHOLD = 10 // minimal total qty 7 hari terakhir agar dianggap laris
  const DISCOUNT_PERCENT = 10 // besaran diskon otomatis
  const PROMO_DURATION_DAYS = 7 // lama promosi dalam hari

  if (!userId || !storeId || !Array.isArray(items) || items.length === 0) return

  for (const item of items) {
    try {
      const productId = String(item.id)
      if (!productId) continue

      // Hitung total qty produk ini dalam 7 hari terakhir dari kolom JSONB items
      const qtyResult = await query(
        `SELECT COALESCE(SUM((elem->>'qty')::int), 0) AS total_qty
         FROM sales s,
              jsonb_array_elements(s.items) AS elem
         WHERE s.user_id = $1
           AND s.store_id = $2
           AND s.timestamp >= NOW() - INTERVAL '7 days'
           AND s.total_items > 0
           AND elem->>'id' = $3`,
        [userId, storeId, productId]
      )

      const totalQty = Number(qtyResult.rows[0]?.total_qty || 0)
      if (totalQty < HOT_THRESHOLD) continue

      const productName = item.nama || 'Produk Laris'
      const promoName = `Diskon produk laris ${productName}`

      // Cek apakah sudah ada promosi aktif dengan nama yang sama
      const existing = await query(
        `SELECT id
         FROM promotions
         WHERE user_id = $1
           AND store_id = $2
           AND name = $3
           AND is_active = true
         LIMIT 1`,
        [userId, storeId, promoName]
      )

      if (existing.rows.length > 0) {
        continue
      }

      // Buat promosi otomatis
      await query(
        `INSERT INTO promotions (
           user_id,
           store_id,
           name,
           description,
           discount_type,
           discount_value,
           min_order_quantity,
           start_date,
           end_date,
           original_price,
           discounted_price,
           is_active
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           NOW(), NOW() + INTERVAL '${PROMO_DURATION_DAYS} days',
           0, 0, true
         )`,
        [
          userId,
          storeId,
          promoName,
          `Diskon otomatis karena ${productName} laris terjual ${totalQty} item dalam 7 hari terakhir`,
          'percentage',
          DISCOUNT_PERCENT,
          1
        ]
      )
    } catch (autoPromoErr) {
      console.error('[Sales] Failed to create auto promotion for hot product:', autoPromoErr)
      // Jangan ganggu flow utama createSale
    }
  }
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

    // Cek dan buat promosi otomatis untuk produk yang laris
    try {
      await maybeCreateAutoPromotionForHotProducts(userId, storeId, items)
    } catch (autoPromoOuterErr) {
      console.error('[Sales] Auto-promotion wrapper error:', autoPromoOuterErr)
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
    // Hanya ambil transaksi yang benar-benar memiliki item (total_items > 0)
    // agar entri placeholder dari proses checkout QRIS (total_items = 0, items = [])
    // tidak muncul sebagai transaksi duplikat di statistik/frontend
    let where = 'user_id = $1 AND timestamp >= CURRENT_DATE - INTERVAL \'30 days\' AND total_items > 0'

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
