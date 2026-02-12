import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [shopName, setShopName] = useState('');
  
  // New States for Payment & QR
  const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' or 'Online'
  const [showQr, setShowQr] = useState(false);

  // Admin Form
  const [newItem, setNewItem] = useState({ name: '', price: '', stock: '' });

  useEffect(() => { 
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch('/api/products');
    const data = await res.json();
    if(data.success) setProducts(data.data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if(data.success) setOrders(data.data);
  };

  // --- CALCULATIONS ---
  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // Collection Report (Paisa Kahan Hai)
  const getCollectionReport = () => {
    let totalCash = 0;   // Mere pass (Cash)
    let totalOnline = 0; // QR wala (Bank)

    orders.forEach(o => {
        if(o.paymentMode === 'Online') totalOnline += o.totalAmount;
        else totalCash += o.totalAmount;
    });

    return { cash: totalCash, online: totalOnline, total: totalCash + totalOnline };
  };

  // Gari Report (Stock)
  const getDayReport = () => {
    return products.map(p => {
        const totalSold = orders.reduce((acc, order) => {
            const item = order.items.find(i => i.name === p.name);
            return acc + (item ? item.qty : 0);
        }, 0);
        return { name: p.name, current: p.stock, sold: totalSold, loaded: p.stock + totalSold };
    });
  };

  // --- ACTIONS ---
  const addToCart = (product, qty = 1) => {
    if (product.stock < qty) { alert("Stock kam hai!"); return; }
    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      setCart(cart.map((item) => item._id === product._id ? { ...item, qty: item.qty + qty } : item));
    } else {
      setCart([...cart, { ...product, qty: qty }]);
    }
  };

  const removeFromCart = (id) => setCart(cart.filter((item) => item._id !== id));

  // --- WHATSAPP SHARE ---
  const shareOnWhatsApp = () => {
    if(cart.length === 0) return;
    
    let message = `*🧾 NEW BILL - ${shopName}*\n\n`;
    cart.forEach(item => {
        message += `${item.qty} x ${item.name} = ₹${item.price * item.qty}\n`;
    });
    message += `\n*TOTAL: ₹${calculateTotal()}*\n`;
    message += `Paid via: ${paymentMode}\n`;
    message += `Date: ${new Date().toLocaleDateString()}`;

    // Sir ka number yahan daal sakta hai directly, abhi blank hai toh contact select karna padega
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleBillSubmit = async () => {
    if(cart.length === 0) return;
    if(!shopName) { alert("Dukan ka naam likh bhai!"); return; }
    
    // Check Payment Mode
    if(paymentMode === 'Online' && !confirm("Kya QR Payment receive ho gayi?")) return;

    if(!confirm("Save Bill & Update Stock?")) return;

    // 1. Save Order to DB
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          shopName, 
          items: cart, 
          totalAmount: calculateTotal(),
          paymentMode 
      }),
    });

    // 2. Generate PDF
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('invoice-area');
    const opt = { margin: 5, filename: `${shopName}_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save();

    // 3. Update Stock
    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart }),
    });

    // 4. Offer WhatsApp Share
    if(confirm("Bill PDF download ho gayi. Sir ko WhatsApp pe details bhejun?")) {
        shareOnWhatsApp();
    }

    // Reset
    setCart([]);
    setShopName('');
    setPaymentMode('Cash');
    setShowQr(false);
    fetchProducts();
    fetchOrders();
  };

  // ... (AI, Add Product same as before) ...
  const handleAiOrder = async () => {
    if(!aiPrompt) return;
    setLoading(true);
    try {
        const res = await fetch('/api/ai', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prompt: aiPrompt }) });
        const orderItems = await res.json();
        orderItems.forEach(order => {
            const product = products.find(p => p._id === order._id);
            if(product) addToCart(product, order.qty);
        });
        setAiPrompt('');
    } catch(e) { alert("AI Error."); }
    setLoading(false);
  }
  const addProduct = async () => {
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
    setNewItem({ name: '', price: '', stock: '' });
    fetchProducts();
  };
  const deleteProduct = async (id) => {
    if(confirm("Delete?")) { await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); fetchProducts(); }
  }

  // Styles
  const styles = {
    container: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '80px' },
    header: { padding: '15px', borderBottom: '1px solid #333', textAlign: 'center', color: '#4caf50', fontSize: '24px', fontWeight: 'bold' },
    nav: { position: 'fixed', bottom: 0, width: '100%', background: '#111', display: 'flex', borderTop: '1px solid #333', zIndex: 100 },
    navBtn: (active) => ({ flex: 1, padding: '15px', background: 'none', border: 'none', color: active ? '#4caf50' : '#666', fontWeight: 'bold', fontSize:'12px' }),
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px' },
    card: { background: '#1a1a1a', padding: '10px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' },
    btn: { width: '100%', padding: '12px', background: '#4caf50', border: 'none', borderRadius: '4px', color: '#000', fontWeight: 'bold', marginTop: '5px' },
    input: { width: '100%', padding: '10px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box' },
    pill: (active) => ({ padding: '8px 15px', borderRadius: '20px', border: '1px solid #4caf50', background: active ? '#4caf50' : 'transparent', color: active ? '#000' : '#fff', cursor:'pointer', fontSize:'14px' })
  };

  const collection = getCollectionReport();

  return (
    <div style={styles.container}>
      <Head><title>PLANT POS</title></Head>
      <div style={styles.header}>PLANT MANAGER {loading && '...'}</div>

      {/* BILLING TAB */}
      {activeTab === 'billing' && (
        <>
            <div style={{padding:'10px', background:'#111', borderBottom:'1px solid #333'}}>
                <input style={{...styles.input, border:'1px solid #4caf50'}} placeholder="Dukan Name (e.g. Raju Bhai)" value={shopName} onChange={e => setShopName(e.target.value)} />
                <div style={{display:'flex', gap:'10px'}}>
                    <input style={{...styles.input, marginBottom:0}} placeholder="AI: '2 coke'" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                    <button onClick={handleAiOrder} style={{...styles.btn, width:'60px', marginTop:0}}>GO</button>
                </div>
            </div>

            <div style={styles.grid}>
                {products.map(p => (
                <div key={p._id} style={styles.card} onClick={() => addToCart(p)}>
                    <div style={{fontSize:'10px', color:'#888'}}>Stock: {p.stock}</div>
                    <div style={{fontWeight:'bold', margin:'5px 0'}}>{p.name}</div>
                    <div style={{color:'#4caf50'}}>₹{p.price}</div>
                </div>
                ))}
            </div>

            {/* LIVE BILL */}
            {cart.length > 0 && (
                <div style={{background:'#fff', color:'#000', margin:'10px', padding:'15px', borderRadius:'8px'}} id="invoice-area">
                    <h3 style={{borderBottom:'1px solid #000', margin:'0 0 10px 0', display:'flex', justifyContent:'space-between'}}>
                        <span>INVOICE</span> <span>{new Date().toLocaleDateString()}</span>
                    </h3>
                    <div style={{marginBottom:'10px', fontWeight:'bold'}}>Shop: {shopName}</div>
                    <table style={{width:'100%', fontSize:'14px', borderCollapse:'collapse'}}>
                        <tbody>
                            {cart.map((item, i) => (
                                <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                                    <td>{item.name}</td><td style={{textAlign:'center'}}>{item.qty}</td><td style={{textAlign:'right'}}>₹{item.price * item.qty}</td>
                                    <td onClick={(e) => {e.stopPropagation(); removeFromCart(item._id)}} style={{color:'red', cursor:'pointer', textAlign:'right'}}>x</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div style={{textAlign:'right', marginTop:'15px', fontSize:'18px', fontWeight:'bold'}}>Total: ₹{calculateTotal()}</div>
                    
                    {/* Payment Mode Selection in PDF */}
                    <div style={{marginTop: '10px', fontSize: '12px', borderTop: '1px solid #ccc', paddingTop: '5px'}}>
                        Payment Mode: <b>{paymentMode.toUpperCase()}</b>
                    </div>
                </div>
            )}

            {cart.length > 0 && (
                <div style={{padding:'15px', background:'#1a1a1a', borderTop:'1px solid #333'}}>
                    <h4 style={{margin:'0 0 10px 0', color:'#ccc'}}>Payment Method:</h4>
                    <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                        <button onClick={() => { setPaymentMode('Cash'); setShowQr(false); }} style={styles.pill(paymentMode === 'Cash')}>💵 CASH</button>
                        <button onClick={() => { setPaymentMode('Online'); setShowQr(true); }} style={styles.pill(paymentMode === 'Online')}>📱 ONLINE (QR)</button>
                    </div>

                    {/* QR CODE SECTION */}
                    {showQr && (
                        <div style={{textAlign:'center', marginBottom:'15px', background:'#fff', padding:'10px', borderRadius:'8px'}}>
                            <img src="https://files.catbox.moe/cpum4j.png" alt="Pay QR" style={{width:'200px', height:'200px'}} />
                            <div style={{color:'black', fontWeight:'bold', marginTop:'5px'}}>Scan to Pay</div>
                        </div>
                    )}

                    <button onClick={handleBillSubmit} style={styles.btn}>✅ SAVE & DOWNLOAD</button>
                    <button onClick={shareOnWhatsApp} style={{...styles.btn, background:'#25D366', color:'#fff', marginTop:'10px'}}>💬 SEND TO SIR (WhatsApp)</button>
                </div>
            )}
        </>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div style={{padding:'20px'}}>
            <h2>Sales History</h2>
            {orders.map(order => (
                <div key={order._id} style={{background:'#1a1a1a', padding:'15px', marginBottom:'10px', borderRadius:'8px', borderLeft:`4px solid ${order.paymentMode === 'Online' ? '#00e676' : '#ffea00'}`}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'18px'}}>
                        <span>{order.shopName}</span>
                        <span style={{color:'#4caf50'}}>₹{order.totalAmount}</span>
                    </div>
                    <div style={{fontSize:'12px', color:'#ccc', marginTop:'5px', display:'flex', justifyContent:'space-between'}}>
                        <span>{new Date(order.date).toLocaleString()}</span>
                        <span style={{fontWeight:'bold', color: order.paymentMode === 'Online' ? '#00e676' : '#ffea00'}}>{order.paymentMode}</span>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* ADMIN TAB */}
      {activeTab === 'admin' && (
        <div style={{padding:'20px'}}>
            
            {/* 1. MONEY REPORT */}
            <div style={{background:'#111', padding:'15px', borderRadius:'8px', border:'1px solid #333', marginBottom:'20px'}}>
                <h3 style={{marginTop:0, color:'#4caf50'}}>💰 COLLECTION REPORT</h3>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                    <span>💵 MERE PAAS (Cash):</span>
                    <span style={{color:'#ffea00', fontWeight:'bold', fontSize:'18px'}}>₹{collection.cash}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                    <span>📱 ONLINE (Bank):</span>
                    <span style={{color:'#00e676', fontWeight:'bold', fontSize:'18px'}}>₹{collection.online}</span>
                </div>
                <div style={{borderTop:'1px solid #444', paddingTop:'10px', display:'flex', justifyContent:'space-between'}}>
                    <span>TOTAL SELL:</span>
                    <span style={{color:'#fff', fontWeight:'bold', fontSize:'18px'}}>₹{collection.total}</span>
                </div>
            </div>

            {/* 2. STOCK REPORT */}
            <div style={{background:'#111', padding:'15px', borderRadius:'8px', border:'1px solid #333', marginBottom:'30px'}}>
                <h3 style={{marginTop:0, color:'#4caf50'}}>🚚 STOCK REPORT</h3>
                <table style={{width:'100%', fontSize:'12px', textAlign:'left'}}>
                    <thead>
                        <tr style={{color:'#888', borderBottom:'1px solid #333'}}>
                            <th style={{paddingBottom:'10px'}}>ITEM</th>
                            <th>SOLD</th>
                            <th>BALANCE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getDayReport().map((r, i) => (
                            <tr key={i} style={{borderBottom:'1px solid #222'}}>
                                <td style={{padding:'8px 0'}}>{r.name}</td>
                                <td style={{color:'#ff3d00', fontWeight:'bold'}}>{r.sold}</td>
                                <td style={{color:'#4caf50', fontWeight:'bold'}}>{r.current}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h3>Inventory Settings</h3>
            <input placeholder="Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <input placeholder="Price" type="number" style={styles.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <input placeholder="Stock" type="number" style={styles.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
            <button onClick={addProduct} style={styles.btn}>ADD ITEM</button>
        </div>
      )}

      {/* NAVIGATION */}
      <div style={styles.nav}>
        <button style={styles.navBtn(activeTab === 'billing')} onClick={() => setActiveTab('billing')}>🛒 BILLING</button>
        <button style={styles.navBtn(activeTab === 'history')} onClick={() => setActiveTab('history')}>📄 HISTORY</button>
        <button style={styles.navBtn(activeTab === 'admin')} onClick={() => setActiveTab('admin')}>⚙️ ADMIN</button>
      </div>
    </div>
  );
}
