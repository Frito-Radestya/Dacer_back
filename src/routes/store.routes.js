const express = require('express')
const router = express.Router()
const storeController = require('../controllers/store.controller')

// NOTE: untuk sekarang belum pakai middleware auth khusus,
// userId dikirim dari frontend (nanti bisa diganti ambil dari JWT)

router.get('/', storeController.getStores)
router.post('/', storeController.createStore)
router.put('/:id', storeController.updateStore)

module.exports = router
