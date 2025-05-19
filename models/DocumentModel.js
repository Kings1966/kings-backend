const mongoose = require('mongoose');

const documentItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', // Assumes you have a 'Product' model
    // required: true, // Make it required if every line item must be a product
  },
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0, // Price at the time of adding to document
  },
  itemSpecificDiscount: { // Optional: if you allow discounts per item line
    type: Number,
    default: 0, // Could be a percentage or fixed amount, define how you use it
  },
  totalPrice: { // Calculated: quantity * unitPrice (after itemSpecificDiscount if any)
    type: Number,
    required: true,
  },
});

const documentSchema = new mongoose.Schema({
  customerName: { type: String }, // For quick display or if no formal customer record
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer', // Assumes you have a 'Customer' model
    default: null,
  },
  items: [documentItemSchema],
  type: {
    type: String,
    enum: ['quote', 'invoice'],
    required: true,
  },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'declined', 'invoiced', 'paid', 'pending_online_order', 'cancelled', 'converted_to_sale'],
    default: 'draft',
  },
  overallDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
  subTotalAmount: { type: Number, required: true, default: 0 }, // Sum of item.totalPrice before overall discount
  totalAmount: { type: Number, required: true, default: 0 },   // Final amount after overall discount
  documentNumber: { type: String, unique: true }, // For user-friendly quote/invoice numbers
  // originalOnlineOrderId: { type: String }, // If this quote originated from an online order
  // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to the user who created it
}, { timestamps: true });

// Pre-save hook to calculate subTotal and totalAmount
documentSchema.pre('save', function(next) {
  this.subTotalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountFactor = 1 - (this.overallDiscountPercent || 0) / 100;
  this.totalAmount = this.subTotalAmount * discountFactor;
  // TODO: Implement logic for generating unique documentNumber if not provided
  next();
});

module.exports = mongoose.model('Document', documentSchema);