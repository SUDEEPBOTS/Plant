import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Petti Rate
  pricePerBottle: { type: Number, default: 0 }, // New: Ek Bottle Ka Rate
  stock: { type: Number, default: 0 },
  image: { type: String, default: '' },
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
