const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// You should import and use your authentication middleware here
// const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// GET all products
// Example: router.get('/', requireAuth, productController.getAllProducts);
router.get('/', productController.getAllProducts);

// GET a single product by ID
router.get('/:id', productController.getProductById);

// POST a new product
// Example: router.post('/', requireAuth, requireRole(['admin', 'manager']), productController.createProduct);
router.post('/', productController.createProduct);

// PUT to update a product
router.put('/:id', productController.updateProduct);

// DELETE a product
router.delete('/:id', productController.deleteProduct);

module.exports = router;