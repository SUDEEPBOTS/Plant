import { useState, useEffect } from 'react';
import Head from 'next/head';
// Import Components
import Billing from '../components/Billing';
import History from '../components/History';
import Admin from '../components/Admin';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
        const [pRes, oRes] = await Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/orders').then(r => r.json())
        ]);
        if(pRes.success) setProducts(pRes.data);
        if(oRes.success) setOrders(oRes.data.reverse());
    } catch(e) { console.error("Load Error"); }
    finally { setLoading(false); } // Fix: Loading hamesha band hoga
  };

  // --- ACTIONS ---
  const addToCart = (p) => {
    const exist = cart.find(i => i._id === p._id);
    if((exist?.qty || 0) >= p.stock) return alert("Stock Khatam!");
    setCart(exist ? cart.map(i => i._id === p._id ? { ...i, qty: i.qty + 1 } : i) : [...cart, { ...p, qty: 1 }]);
  };

  const decreaseQty = (id) => {
    const exist = cart.find(i => i._id === id);
    if(exist.qty === 1) setCart(cart.filter(i => i._id !== id));
    else setCart(cart.map(i => i._id === id ? { ...i, qty: i.qty - 1 } : i));
  };

  const handleBillSubmit = async (shopName, shopNumber, paymentMode) => {
    if(!shopName || cart.length === 0) return alert("Name/Items Missing");
    
    const total = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const bill = { shopName, items: cart, totalAmount: total, paymentMode, date: new Date() };

    // WhatsApp Direct
    let msg = `*🧾 BILL: ${shopName}*\n\n`;
    cart.forEach(i => msg += `${i.qty} x ${i.name} = ${i.price * i.qty}\n`);
    msg += `\n*TOTAL: ₹${total}* (${paymentMode})`;
    window.open(`https://wa.me/917303847666?text=${encodeURIComponent(msg)}`, '_blank');

    // Background Save
    await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(bill) });
    await fetch('/api/products', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: cart }) });
    
    setCart([]); 
    loadAllData(); // Refresh Stock
  };

  const addProduct = async (item) => {
    await fetch('/api/products', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(item) });
    loadAllData();
  };

  const deleteProduct = async (id) => {
    if(confirm("Delete?")) {
        await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        loadAllData();
    }
  };

  const handleReset = async () => {
      if(confirm("RESET ALL DATA?")) {
          await fetch('/api/reset', { method: 'DELETE' });
          loadAllData();
      }
  };

  // --- RENDER ---
  return (
    <div style={{background:'#f4f6f8', minHeight:'100vh', fontFamily:'sans-serif'}}>
      <Head>
        <title>PLANT MANAGER</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div style={{padding:'15px', background:'#fff', textAlign:'center', borderBottom:'1px solid #ddd', position:'sticky', top:0, zIndex:100}}>
        <h2 style={{margin:0, color:'#2e7d32'}}>🌱 PLANT MANAGER</h2>
      </div>

      {activeTab === 'billing' && <Billing products={products} cart={cart} addToCart={addToCart} decreaseQty={decreaseQty} handleBillSubmit={handleBillSubmit} loading={loading} />}
      {activeTab === 'history' && <History orders={orders} loading={loading} />}
      {activeTab === 'admin' && <Admin products={products} orders={orders} addProduct={addProduct} deleteProduct={deleteProduct} handleReset={handleReset} refreshData={loadAllData} />}

      <div style={{position:'fixed', bottom:0, width:'100%', background:'#fff', display:'flex', borderTop:'1px solid #ddd', zIndex:100}}>
        <button onClick={() => setActiveTab('billing')} style={navBtnStyle(activeTab === 'billing')}>🛒 BILL</button>
        <button onClick={() => setActiveTab('history')} style={navBtnStyle(activeTab === 'history')}>📄 HISTORY</button>
        <button onClick={() => setActiveTab('admin')} style={navBtnStyle(activeTab === 'admin')}>⚙️ ADMIN</button>
      </div>
    </div>
  );
}

const navBtnStyle = (active) => ({
    flex: 1, padding: '15px', border: 'none', background: '#fff', 
    color: active ? '#2e7d32' : '#888', fontWeight: 'bold', fontSize: '14px'
});
