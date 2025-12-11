const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const auth = require('../middleware/auth');

// Routes
router.get('/', productController.getAllProducts);
router.post('/', auth.authenticate, productController.createProduct);
router.put('/:id', auth.authenticate, productController.updateProduct);
router.delete('/:id', auth.authenticate, productController.deleteProduct);

module.exports = router;