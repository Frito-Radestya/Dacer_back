const { query } = require('../config/db')

// GET /api/notifications?userId=&storeId=
async function getNotifications (req, res) {
  try {
    const userId = req.query.userId
    const storeId = req.query.storeId

    if (!userId) {
      return res.status(400).json({ status: 'fail', message: 'userId wajib diisi' })
    }

    // Generate dynamic notifications based on current data
    const notifications = []
    
    // Check low stock products
    const lowStockQuery = `
      SELECT COUNT(*) as count
      FROM products
      WHERE user_id = $1 AND store_id = $2 AND stok <= 5
    `
    const lowStockResult = await query(lowStockQuery, [userId, storeId])
    const lowStockCount = lowStockResult.rows[0].count
    
    if (lowStockCount > 0) {
      notifications.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Stok Rendah',
        message: `${lowStockCount} produk dengan stok rendah (≤5)`,
        read: false,
        timestamp: new Date().toISOString()
      })
    }
    
    // Check overdue debts
    const debtQuery = `
      SELECT COUNT(*) as count
      FROM debts
      WHERE user_id = $1 AND store_id = $2 AND due_date < CURRENT_DATE AND status != 'paid'
    `
    const debtResult = await query(debtQuery, [userId, storeId])
    const overdueCount = debtResult.rows[0].count
    
    if (overdueCount > 0) {
      notifications.push({
        id: 'overdue-debts',
        type: 'error',
        title: 'Utang Jatuh Tempo',
        message: `${overdueCount} utang telah jatuh tempo`,
        read: false,
        timestamp: new Date().toISOString()
      })
    }
    
    // Check today's sales
    const salesQuery = `
      SELECT COUNT(*) as count
      FROM sales
      WHERE user_id = $1 AND store_id = $2 AND DATE(timestamp) = CURRENT_DATE
    `
    const salesResult = await query(salesQuery, [userId, storeId])
    const todaySales = salesResult.rows[0].count
    
    if (todaySales === 0) {
      notifications.push({
        id: 'no-sales',
        type: 'info',
        title: 'Belum Ada Penjualan',
        message: 'Belum ada transaksi hari ini',
        read: false,
        timestamp: new Date().toISOString()
      })
    } else if (todaySales > 10) {
      notifications.push({
        id: 'good-sales',
        type: 'success',
        title: 'Penjualan Bagus',
        message: `${todaySales} transaksi hari ini!`,
        read: false,
        timestamp: new Date().toISOString()
      })
    }

    res.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ status: 'error', message: 'Gagal mengambil notifikasi' })
  }
}

module.exports = {
  getNotifications
}
