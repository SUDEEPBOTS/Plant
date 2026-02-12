import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  image: { type: String, default: '' },
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
