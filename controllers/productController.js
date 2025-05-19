const Product = require('../models/ProductModel');
const Category = require('../models/CategoryModel'); // Needed for categoryId lookup

// Helper function to emit socket events
const emitProductEvent = (req, eventName, payload) => {
  if (req.io) {
    req.io.emit(eventName, payload);
  } else {
    console.warn(`Socket.io instance (req.io) not available to emit ${eventName}`);
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate('categoryId', 'name isMain'); // Populate category details
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name isMain');
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(product);
  } catch (error) {
    console.error(`Error fetching product ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to fetch product', error: error.message });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body }; // Clone to modify

    if (!productData.name || !productData.code || productData.price === undefined) {
         return res.status(400).json({ message: 'Missing required product fields (name, code, price).' });
    }

    // If frontend sends categoryName (for the group), find its ID
    // Assumes categoryName refers to a main category
    if (productData.categoryName) {
      const category = await Category.findOne({ name: productData.categoryName, isMain: true });
      if (category) {
        productData.categoryId = category._id;
      } else {
        // Decide how to handle: error, or create product without category, or create category?
        console.warn(`Category name "${productData.categoryName}" not found. Product will be uncategorized or link might fail if categoryId is required.`);
        // If categoryId is required in your ProductModel and not found, this will fail at product.save()
      }
      delete productData.categoryName; // Remove temporary field, product model uses categoryId
    } else if (productData.categoryId === '' || productData.categoryId === undefined) {
        // If frontend explicitly sends an empty categoryId or it's undefined, set to null
        productData.categoryId = null;
    }


    const product = new Product(productData);
    await product.save();

    emitProductEvent(req, 'productCreated', product.toObject());
    res.status(201).json(product);
  } catch (error)
 {
    console.error('Error creating product:', error);
    if (error.code === 11000) {
        return res.status(400).json({ message: `Product with code '${req.body.code}' already exists.` });
    }
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

// Update an existing product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body }; // Clone to modify

    // If frontend sends categoryName for update
    if (Object.prototype.hasOwnProperty.call(updateData, 'categoryName')) { // Check if categoryName key exists
      if (updateData.categoryName && updateData.categoryName.trim() !== '') {
        const category = await Category.findOne({ name: updateData.categoryName, isMain: true });
        if (category) {
          updateData.categoryId = category._id;
        } else {
          console.warn(`Category name "${updateData.categoryName}" for update not found. Category link may not be updated or may be cleared.`);
          updateData.categoryId = null; // Or handle as an error if category must exist
        }
      } else {
        // If categoryName is empty string or null, clear the categoryId
        updateData.categoryId = null;
      }
      delete updateData.categoryName; // Remove temporary field
    }


    const product = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
                                 .populate('categoryId', 'name isMain'); // Populate after update

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    emitProductEvent(req, 'productUpdated', product.toObject());
    res.json(product);
  } catch (error) {
    console.error(`Error updating product ${req.params.id}:`, error);
     if (error.code === 11000 && error.keyPattern && error.keyPattern.code) { // More specific check for unique code violation
        return res.status(400).json({ message: `Product code '${req.body.code}' already exists.` });
    }
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Add logic here to handle implications of deleting a product:
    // - What if it's a parent product for variants? Prevent deletion or reassign variants?
    // - What if it's in open carts or saved sales? Prevent deletion?
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    emitProductEvent(req, 'productDeleted', { _id: id });
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting product ${req.params.id}:`, error);
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};
