import Groq from "groq-sdk";
import dbConnect from '../../lib/mongoose';
import Product from '../../models/Product';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt } = req.body;

  try {
    // 1. Get current products to give context to AI
    await dbConnect();
    const products = await Product.find({}, 'name _id price stock');
    
    // Create a minified list for the AI context
    const contextList = products.map(p => `${p.name} (ID: ${p._id})`).join(', ');

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // 2. Ask Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a cashier API. 
          Current Inventory: [${contextList}]. 
          User will give a loose order like '2 coke 1 water'.
          Match items to Inventory IDs.
          Return ONLY a JSON array: [{"_id": "...", "qty": 1}]. 
          If item not found, ignore it. Do not write any text, only JSON.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-70b-versatile", // Fast and cheap
    });

    const aiResponse = completion.choices[0]?.message?.content || "[]";
    
    // 3. Return parsed JSON to frontend
    res.status(200).json(JSON.parse(aiResponse));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI Error' });
  }
}

