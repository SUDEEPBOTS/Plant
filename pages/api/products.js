import dbConnect from '../../lib/mongoose';
import Product from '../../models/Product';

export default async function handler(req, res) {
  await dbConnect();
  const { method } = req;

  if (method === 'GET') {
    try {
      const products = await Product.find({});
      res.status(200).json({ success: true, data: products });
    } catch (error) {
      res.status(400).json({ success: false });
    }
  } 
  else if (method === 'POST') {
    try {
      const product = await Product.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false });
    }
  } 
  else if (method === 'PUT') {
    // Logic for Stock Update OR Item Edit
    try {
      if (req.body.items) {
        // Bulk Stock Update (Bill Submit)
        for (const item of req.body.items) {
          await Product.findByIdAndUpdate(item._id, { $inc: { stock: -item.qty } });
        }
        res.status(200).json({ success: true });
      } else {
        // Single Item Edit (Admin Panel)
        const { id, ...updateData } = req.body;
        const product = await Product.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ success: true, data: product });
      }
    } catch (error) {
      res.status(400).json({ success: false });
    }
  } 
  else if (method === 'DELETE') {
    try {
      await Product.findByIdAndDelete(req.query.id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false });
    }
  }
}
