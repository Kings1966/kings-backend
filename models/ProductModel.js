const mongoose = require('mongoose');

const labelElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'text', 'barcode', 'image', 'productName', 'price', 'sku'
  content: { type: String }, // For text, image URL, or pre-rendered barcode SVG
}, { _id: false });

const labelDesignSchema = new mongoose.Schema({
  size: { type: String, default: 'medium' },
  width: { type: Number, default: 40 }, // in mm
  height: { type: Number, default: 60 }, // in mm
  elements: [labelElementSchema],
  positions: { type: mongoose.Schema.Types.Mixed, default: {} },
  sizes: { type: mongoose.Schema.Types.Mixed, default: {} },
  rotations: { type: mongoose.Schema.Types.Mixed, default: {} },
  fontSizes: { type: mongoose.Schema.Types.Mixed, default: {} },
  fontStyles: { type: mongoose.Schema.Types.Mixed, default: {} },
  logo: { type: String, default: null },
  logoSize: {
    width: { type: Number, default: 30 },
    height: { type: Number, default: 30 },
  },
  logoPosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  logoRotation: { type: Number, default: 0 },
  includeLogo: { type: Boolean, default: false },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required.'],
    trim: true,
  },
  code: { // SKU or internal product code
    type: String,
    required: [true, 'Product code/SKU is required.'],
    unique: true,
    trim: true,
  },
  // Link to the main category (group)
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    // required: [true, 'Product must belong to a category/group.'], // Uncomment if a product must have a category
  },
  barcode: { type: String, trim: true, index: true },
  barcodeType: { type: String, default: 'CODE128' },

  cost: { type: Number, default: 0 },
  priceBeforeTax: { type: Number, default: 0 },
  tax: { type: Number, default: 0 }, // Tax percentage
  price: { type: Number, required: [true, 'Final sale price is required.'] },
  markup: { type: Number, default: 0 },
  includesTax: { type: Boolean, default: false },

  stock: { type: Number, default: 0 },
  measurement: { type: String, default: 'unit' },
  lowStockThreshold: { type: Number, default: 10 },

  active: { type: Boolean, default: true },
  online: { type: Boolean, default: false },
  image: { type: String },

  label: { type: String },
  labelDesign: { type: labelDesignSchema, default: () => ({}) },

  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date },

  parentProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  isBulkParent: {
    type: Boolean,
    default: false,
  },
  consumesFromParent: {
    quantity: { type: Number },
    unit: { type: String },
    _id: false
  },
  baseUnit: {
    type: String,
  },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
