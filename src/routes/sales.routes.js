const express = require('express')
const router = express.Router()
const salesController = require('../controllers/sales.controller')

// NOTE: Untuk sementara belum pakai middleware auth JWT,
// userId dikirim dari frontend. Nanti bisa diganti ambil dari token.

// Buat transaksi penjualan
router.post('/', salesController.createSale)

// Ringkasan penjualan (today/week/month)
router.get('/summary', salesController.getSalesSummary)

module.exports = router
