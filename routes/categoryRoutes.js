const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Middleware to check if user is authenticated (example)
// const { isAuthenticated } = require('../middleware/authMiddleware'); // You'd create this

// GET all categories
router.get('/', categoryController.getAllCategories);

// POST a new category
router.post('/', /* isAuthenticated, */ categoryController.createCategory);

// PUT to update a category
router.put('/:id', /* isAuthenticated, */ categoryController.updateCategory);

// DELETE a category
router.delete('/:id', /* isAuthenticated, */ categoryController.deleteCategory);

module.exports = router;