const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required.'],
    trim: true,
    unique: true, // Consider if names should be unique globally or per parent
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Self-referencing for parent-child relationship
    default: null,
  },
  isMain: { // To easily identify top-level categories
    type: Boolean,
    default: false,
  },
  // You can add other fields like description, image, etc.
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;