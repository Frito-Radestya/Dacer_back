const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const auth = require('../middleware/auth');

// Routes
router.get('/', productController.getAllProducts);
router.post('/', auth.authenticate, productController.createProduct);

module.exports = router;