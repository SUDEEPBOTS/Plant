import mongoose from 'mongoose';

const DeliverySchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  ownerName: { type: String, default: '' }, // Naya: Dukandar ka naam
  phone: { type: String, required: true },  // Naya: Mobile Number
  location: { type: String, default: '' },
  amount: { type: Number, required: true },
  status: { type: String, default: 'Pending' }, // 'Pending', 'Completed'
  date: { type: Date, default: Date.now }
});

export default mongoose.models.Delivery || mongoose.model('Delivery', DeliverySchema);
