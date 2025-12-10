const express = require('express')
const crypto = require('crypto')
const { getSnapClient } = require('../config/midtrans')
const { query } = require('../config/db')

const router = express.Router()

// CORS helper agar Snap bisa akses endpoint dari browser
const corsMidtrans = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
}

// POST /api/payments/checkout
// Body: { userId, storeId, orderId?, amount, customer }
router.post('/checkout', corsMidtrans, async (req, res) => {
  try {
    const { userId, storeId, orderId, amount, customer } = req.body

    if (!userId || !storeId || !amount) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId, storeId, dan amount wajib diisi'
      })
    }

    const snap = getSnapClient()
    if (!snap) {
      return res.status(500).json({
        status: 'error',
        message: 'Midtrans belum dikonfigurasi dengan benar'
      })
    }

    const grossAmount = Number(amount)
    const generatedOrderId = orderId || `ORDER-${Date.now()}`

    const parameter = {
      transaction_details: {
        order_id: generatedOrderId,
        gross_amount: grossAmount
      },
      customer_details: {
        first_name: customer?.firstName || 'Customer',
        email: customer?.email || 'customer@example.com',
        phone: customer?.phone || '08123456789'
      },
      enabled_payments: ['gopay', 'shopeepay', 'other_qris']
    }

    const transaction = await snap.createTransaction(parameter)

    // Simpan basic info ke tabel sales (optional, status pending)
    try {
      await query(
        `INSERT INTO sales (user_id, store_id, order_id, total_amount, total_items, payment_method, payment_status, items)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (order_id) DO NOTHING`,
        [
          userId,
          storeId,
          generatedOrderId,
          grossAmount,
          0,
          'qris',
          'pending',
          JSON.stringify([])
        ]
      )
    } catch (err) {
      console.warn('Failed to insert pending sales for Midtrans order:', err.message)
    }

    res.json({
      status: 'success',
      data: {
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        orderId: generatedOrderId
      }
    })
  } catch (err) {
    console.error('Midtrans checkout error:', err)
    res.status(500).json({ status: 'error', message: 'Gagal memulai pembayaran Midtrans' })
  }
})

function generateSignature (orderId, statusCode, grossAmount, serverKey) {
  return crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex')
}

// POST /api/payments/midtrans/notification
router.post('/midtrans/notification', corsMidtrans, async (req, res) => {
  try {
    const notification = req.body

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status
    } = notification

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    const expectedSignature = generateSignature(
      order_id,
      status_code,
      gross_amount,
      serverKey
    )

    if (signature_key !== expectedSignature) {
      console.warn('[Midtrans] Invalid signature from Midtrans callback')
      return res.status(403).json({ error: 'Invalid signature' })
    }

    console.log('[Midtrans] Notification:', {
      order_id,
      transaction_status,
      fraud_status
    })

    // Update sales payment_status berdasarkan status Midtrans
    try {
      let paymentStatus = 'pending'
      if (transaction_status === 'capture' || transaction_status === 'settlement') {
        paymentStatus = 'completed'
      } else if (
        transaction_status === 'deny' ||
        transaction_status === 'expire' ||
        transaction_status === 'cancel'
      ) {
        paymentStatus = 'failed'
      }

      await query(
        'UPDATE sales SET payment_status = $1 WHERE order_id = $2',
        [paymentStatus, order_id]
      )
    } catch (err) {
      console.error('Failed to update sales payment_status from Midtrans notification:', err)
    }

    res.status(200).json({ message: 'OK' })
  } catch (err) {
    console.error('Midtrans notification error:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

module.exports = router
