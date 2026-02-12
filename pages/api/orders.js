import dbConnect from '../../lib/mongoose';
import Order from '../../models/Order';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    // Naya Bill Save Karo
    try {
      const order = await Order.create(req.body);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false });
    }
  } 
  else if (req.method === 'GET') {
    // Purani History Laao (Latest pehle)
    try {
      const orders = await Order.find({}).sort({ date: -1 });
      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      res.status(400).json({ success: false });
    }
  }
}
