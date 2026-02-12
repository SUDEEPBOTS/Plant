import dbConnect from '../../lib/mongoose';
import Product from '../../models/Product';

export default async function handler(req, res) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const products = await Product.find({});
        res.status(200).json({ success: true, data: products });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;

    case 'POST': // Add New Item (Admin)
      try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, data: product });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;

    case 'PUT': // Update Stock (Billing ke baad)
      try {
        const { items } = req.body; // Expects array of { _id, qty }
        
        for (const item of items) {
          await Product.findByIdAndUpdate(item._id, { 
            $inc: { stock: -item.qty } 
          });
        }
        res.status(200).json({ success: true, message: 'Stock updated' });
      } catch (error) {
        res.status(400).json({ success: false, error });
      }
      break;
      
    case 'DELETE':
        try {
            const { id } = req.query;
            await Product.findByIdAndDelete(id);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(400).json({ success: false });
        }
        break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}

