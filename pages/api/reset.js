import dbConnect from '../../lib/mongoose';
import Product from '../../models/Product';
import Order from '../../models/Order';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  try {
    await dbConnect();
    
    // Sab kuch uda do
    await Product.deleteMany({});
    await Order.deleteMany({});

    res.status(200).json({ success: true, message: 'All Data Cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Reset Failed' });
  }
}
