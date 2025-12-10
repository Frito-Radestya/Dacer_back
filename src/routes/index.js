const express = require('express');
const router = express.Router();

// Import route modules
const productRoutes = require('./product.routes');
const authRoutes = require('./auth.routes');
const storeRoutes = require('./store.routes');
const salesRoutes = require('./sales.routes');
const debtRoutes = require('./debt.routes');
const promotionRoutes = require('./promotion.routes');
const customerRoutes = require('./customer.routes');
const notificationRoutes = require('./notification.routes');
const paymentRoutes = require('./payment.routes');

// Define routes
router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/products', productRoutes);
router.use('/sales', salesRoutes);
router.use('/debts', debtRoutes);
router.use('/promotions', promotionRoutes);
router.use('/customers', customerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;