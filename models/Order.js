import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  items: [
    {
      name: String,
      qty: Number,
      price: Number
    }
  ],
  totalAmount: Number,
  date: { type: Date, default: Date.now }
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
