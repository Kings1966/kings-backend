const Category = require('../models/CategoryModel');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    // Fetch all categories. You might want to populate subcategories
    // or let the frontend build the tree. For simplicity, fetching flat list.
    const categories = await Category.find({});
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, parentId, isMain } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    // Check for duplicate category name (optional, depends on your rules)
    // const existingCategory = await Category.findOne({ name });
    // if (existingCategory) {
    //   return res.status(400).json({ message: 'Category with this name already exists.' });
    // }

    const newCategoryData = { name, isMain: isMain || !parentId }; // isMain if no parentId
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: 'Parent category not found.' });
      }
      newCategoryData.parentId = parentId;
    }

    const category = new Category(newCategoryData);
    await category.save();

    // Emit event to all connected clients
    if (req.io) {
      req.io.emit('categoryCreated', category.toObject());
    } else {
      console.warn('Socket.io instance (req.io) not available in createCategory');
    }

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
};

// Update an existing category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, isMain } = req.body; // Add other fields as needed

    const updateData = { name, isMain: isMain || !parentId };
    if (parentId) {
        const parent = await Category.findById(parentId);
        if (!parent && parentId !== null) { // Allow setting parentId to null
            return res.status(404).json({ message: 'Parent category not found.' });
        }
        updateData.parentId = parentId;
    } else {
        updateData.parentId = null; // Explicitly set to null if no parentId provided
    }

    const category = await Category.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    if (req.io) {
      req.io.emit('categoryUpdated', category.toObject());
    }

    res.json(category);
  } catch (error) {
    console.error(`Error updating category ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to update category', error: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Add logic here to handle subcategories and products linked to this category.
    // This is a critical step for data integrity.
    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });

    if (req.io) req.io.emit('categoryDeleted', { _id: id });
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting category ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
};