import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Loading State for Spinner
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [shopName, setShopName] = useState('');
  
  // Theme & Payment
  const [theme, setTheme] = useState('dark'); 
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [showQr, setShowQr] = useState(false);

  // Admin Form
  const [newItem, setNewItem] = useState({ name: '', price: '', stock: '', image: '' });

  // Initial Load
  useEffect(() => { 
    fetchProducts();
    fetchOrders();
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // --- API CALLS (Fixed) ---
  const fetchProducts = async () => {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if(data.success) setProducts(data.data);
    } catch(e) { console.error("Stock Load Error"); }
  };

  const fetchOrders = async () => {
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if(data.success) setOrders(data.data);
    } catch(e) { console.error("History Load Error"); }
  };

  // --- TELEGRAPH IMAGE UPLOAD ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show mini loader for image
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('https://telegra.ph/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data && data[0] && data[0].src) {
            setNewItem({ ...newItem, image: 'https://telegra.ph' + data[0].src });
            alert("Photo Uploaded! ☁️");
        }
    } catch (error) { alert("Upload Failed"); }
  };

  // --- CART ACTIONS (Plus / Minus) ---
  const addToCart = (p) => {
    if (p.stock <= 0) { alert("Stock Khatam! (0)"); return; }
    
    // Check cart limit vs stock
    const exist = cart.find(i => i._id === p._id);
    if(exist && exist.qty >= p.stock) { alert("Aur Stock nahi hai!"); return; }

    setCart(exist ? cart.map(i => i._id === p._id ? { ...i, qty: i.qty + 1 } : i) : [...cart, { ...p, qty: 1 }]);
  };

  const decreaseQty = (id) => {
    const exist = cart.find(i => i._id === id);
    if(exist.qty === 1) {
        setCart(cart.filter(i => i._id !== id)); // Remove if 0
    } else {
        setCart(cart.map(i => i._id === id ? { ...i, qty: i.qty - 1 } : i));
    }
  };

  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // --- BILL SUBMIT (Fixed Loading & WhatsApp) ---
  const handleBillSubmit = async () => {
    if(cart.length === 0 || !shopName) { alert("Dukan Name likh bhai!"); return; }
    if(paymentMode === 'Online' && !confirm("Payment Aagayi?")) return;
    
    setIsSubmitting(true); // START LOADING ANIMATION

    try {
        const total = calculateTotal();
        const billDetails = { shopName, items: cart, totalAmount: total, paymentMode };

        // 1. Save Order
        await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billDetails)
        });

        // 2. Update Stock
        await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart })
        });

        // 3. Send WhatsApp to Sir
        let msg = `*🧾 NEW BILL - ${shopName}*\n\n`;
        cart.forEach(i => msg += `${i.qty} x ${i.name} (@${i.price}) = ₹${i.price * i.qty}\n`);
        msg += `\n*TOTAL: ₹${total}*\nMode: ${paymentMode}\nDate: ${new Date().toLocaleDateString()}`;
        
        // Fixed Number: 7303847666
        window.open(`https://wa.me/917303847666?text=${encodeURIComponent(msg)}`, '_blank');

        // Reset
        setCart([]); setShopName(''); setPaymentMode('Cash'); setShowQr(false);
        fetchProducts(); fetchOrders(); // Refresh Data
        
    } catch(e) {
        alert("Error aa gaya bhai! Net check kar.");
    }

    setIsSubmitting(false); // STOP LOADING
  };

  // --- ADMIN ACTIONS ---
  const addProduct = async () => {
    if(!newItem.name) return alert("Naam likh!");
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
    setNewItem({ name: '', price: '', stock: '', image: '' });
    fetchProducts();
  };

  const deleteProduct = async (id) => { if(confirm("Delete?")) { await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); fetchProducts(); } };
  
  const handleFactoryReset = async () => {
    if(confirm("⚠️ RESET ALL DATA?") && prompt("Type 'DELETE'") === 'DELETE') {
        await fetch('/api/reset', { method: 'DELETE' });
        setProducts([]); setOrders([]); setCart([]);
    }
  };

  // --- STYLES ---
  const isDark = theme === 'dark';
  const styles = {
    container: { background: isDark ? '#0a0a0a' : '#f0f2f5', color: isDark ? '#fff' : '#000', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'sans-serif' },
    header: { padding: '15px', borderBottom: `1px solid ${isDark ? '#333' : '#ddd'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isDark ? '#111' : '#fff', color: '#4caf50', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px', background: isDark ? '#000' : '#fff', border: `1px solid ${isDark ? '#333' : '#ccc'}`, color: isDark ? '#fff' : '#000', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '12px', background: '#4caf50', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', marginTop: '5px', cursor: 'pointer' },
    card: { background: isDark ? '#1a1a1a' : '#fff', padding: '10px', borderRadius: '8px', border: `1px solid ${isDark ? '#333' : '#ddd'}`, textAlign: 'center', position: 'relative' },
    nav: { position: 'fixed', bottom: 0, width: '100%', background: isDark ? '#111' : '#fff', display: 'flex', borderTop: `1px solid ${isDark ? '#333' : '#ddd'}`, zIndex: 100 },
    navBtn: (active) => ({ flex: 1, padding: '10px', background: 'none', border: 'none', color: active ? '#4caf50' : (isDark ? '#666' : '#999'), fontWeight: 'bold', fontSize: '12px', display:'flex', flexDirection:'column', alignItems:'center' }),
    pill: (active) => ({ padding: '8px 15px', borderRadius: '20px', border: '1px solid #4caf50', background: active ? '#4caf50' : 'transparent', color: active ? '#fff' : (isDark ? '#fff' : '#000'), fontSize: '12px', cursor: 'pointer' }),
    minusBtn: { width:'30px', height:'30px', background:'#ff3d00', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer' },
    loaderOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999, flexDirection:'column' },
    spinner: { width:'50px', height:'50px', border:'5px solid #333', borderTop:'5px solid #4caf50', borderRadius:'50%', animation:'spin 1s linear infinite' }
  };

  // Helpers
  const getCollectionReport = () => {
    let c = 0, o = 0;
    orders.forEach(ord => ord.paymentMode === 'Online' ? o += ord.totalAmount : c += ord.totalAmount);
    return { cash: c, online: o, total: c + o };
  };

  const getDayReport = () => products.map(p => {
    const sold = orders.reduce((acc, o) => acc + (o.items.find(i => i.name === p.name)?.qty || 0), 0);
    return { name: p.name, current: p.stock, sold: sold, loaded: p.stock + sold };
  });

  return (
    <div style={styles.container}>
      <Head>
        <title>PLANT POS</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </Head>

      {/* LOADING SPINNER OVERLAY */}
      {isSubmitting && (
        <div style={styles.loaderOverlay}>
            <div style={styles.spinner}></div>
            <p style={{color:'white', marginTop:'15px', fontWeight:'bold'}}>Saving Bill...</p>
        </div>
      )}

      <div style={styles.header}>
        <span>PLANT MANAGER</span>
        <button onClick={toggleTheme} style={{background:'none', border:'none', fontSize:'20px'}}> {isDark ? '☀️' : '🌙'} </button>
      </div>

      {activeTab === 'billing' && (
        <>
          <div style={{padding:'10px', background: isDark ? '#111' : '#fff', borderBottom: styles.header.borderBottom}}>
            <input style={{...styles.input, border:'1px solid #4caf50'}} placeholder="Dukan Name" value={shopName} onChange={e => setShopName(e.target.value)} />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', padding:'10px'}}>
            {products.map(p => (
              <div key={p._id} style={styles.card} onClick={() => addToCart(p)}>
                {/* STOCK & RATE BADGES */}
                <div style={{position:'absolute', top:5, left:5, background:'#333', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontSize:'10px'}}>Qty: {p.stock}</div>
                <div style={{position:'absolute', top:5, right:5, background:'#4caf50', color:'#000', padding:'2px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:'bold'}}>₹{p.price}</div>
                
                {p.image ? <img src={p.image} style={{width:'100%', height:'100px', objectFit:'cover', borderRadius:'4px', marginTop:'20px'}} /> : <div style={{height:'80px', background:'#222', borderRadius:'4px', marginTop:'20px'}}></div>}
                
                <div style={{fontWeight:'bold', marginTop:'5px'}}>{p.name}</div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div style={{padding:'15px', background: isDark ? '#1a1a1a' : '#fff', borderTop: styles.header.borderBottom}}>
              <div style={{background:'#fff', padding:'10px', color:'black', borderRadius:'5px', marginBottom:'15px', border:'1px solid #ccc'}}>
                <h3 style={{borderBottom:'1px solid #000', margin:'0 0 10px 0', display:'flex', justifyContent:'space-between'}}><span>INVOICE</span> <span>{new Date().toLocaleDateString()}</span></h3>
                <div style={{fontWeight:'bold'}}>{shopName}</div>
                
                <table style={{width:'100%', fontSize:'14px', borderCollapse:'collapse'}}>
                    <tbody>{cart.map((item, i) => (
                        <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                            <td style={{padding:'8px 0'}}>{item.name}</td>
                            <td style={{textAlign:'center'}}>{item.qty}</td>
                            <td style={{textAlign:'right'}}>₹{item.price * item.qty}</td>
                            <td style={{width:'40px', textAlign:'right'}}>
                                <button onClick={(e) => { e.stopPropagation(); decreaseQty(item._id); }} style={styles.minusBtn}>-</button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
                <div style={{textAlign:'right', marginTop:'10px', fontSize:'18px', fontWeight:'bold'}}>Total: ₹{calculateTotal()}</div>
              </div>

              <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                <button onClick={() => { setPaymentMode('Cash'); setShowQr(false); }} style={styles.pill(paymentMode === 'Cash')}>💵 CASH</button>
                <button onClick={() => { setPaymentMode('Online'); setShowQr(true); }} style={styles.pill(paymentMode === 'Online')}>📱 ONLINE</button>
              </div>

              {showQr && <div style={{textAlign:'center', marginBottom:'10px', background:'#fff', padding:'10px', borderRadius:'8px'}}><img src="https://files.catbox.moe/jedcoz.png" style={{width:'150px'}} /></div>}

              <button onClick={handleBillSubmit} style={styles.btn}>✅ SAVE & SEND TO SIR</button>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div style={{padding:'20px'}}>
            <h2>Sales History</h2>
            {orders.map(order => (
                <div key={order._id} style={{background: isDark ? '#1a1a1a' : '#fff', padding:'15px', marginBottom:'10px', borderRadius:'8px', borderLeft:`4px solid ${order.paymentMode === 'Online' ? '#00e676' : '#ffea00'}`, border: styles.card.border}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'18px'}}>
                        <span>{order.shopName}</span>
                        <span style={{color:'#4caf50'}}>₹{order.totalAmount}</span>
                    </div>
                    <div style={{fontSize:'12px', color:'#888', marginTop:'5px'}}>{new Date(order.date).toLocaleString()} • {order.paymentMode}</div>
                </div>
            ))}
        </div>
      )}

      {activeTab === 'admin' && (
        <div style={{padding:'20px'}}>
            <div style={{background: isDark ? '#111' : '#fff', padding:'15px', borderRadius:'8px', border: styles.header.borderBottom, marginBottom:'20px'}}>
                <h3 style={{marginTop:0, color:'#4caf50'}}>💰 COLLECTION</h3>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>💵 Cash:</span><span style={{color:'#ffea00'}}>₹{getCollectionReport().cash}</span></div>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>📱 Online:</span><span style={{color:'#00e676'}}>₹{getCollectionReport().online}</span></div>
                <div style={{borderTop:`1px solid #444`, paddingTop:'5px', marginTop:'5px', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}><span>TOTAL:</span><span>₹{getCollectionReport().total}</span></div>
            </div>

            <div style={{background: isDark ? '#111' : '#fff', padding:'15px', borderRadius:'8px', border: styles.header.borderBottom, marginBottom:'20px'}}>
                <h3 style={{marginTop:0, color:'#2196F3'}}>🚚 STOCK REPORT</h3>
                <table style={{width:'100%', fontSize:'12px', textAlign:'left'}}>
                    <thead><tr style={{color:'#888'}}><th>ITEM</th><th>SOLD</th><th>BAL</th></tr></thead>
                    <tbody>{getDayReport().map((r,i) => <tr key={i}><td>{r.name}</td><td style={{color:'#ff3d00'}}>{r.sold}</td><td style={{color:'#4caf50'}}>{r.current}</td></tr>)}</tbody>
                </table>
            </div>

            <h3>Add New Item</h3>
            <input placeholder="Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <input type="number" placeholder="Price" style={styles.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <input placeholder="Stock" type="number" style={styles.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{marginBottom:'10px', color: isDark ? '#fff' : '#000'}} />
            <button onClick={addProduct} style={styles.btn}>ADD ITEM</button>

            <h3 style={{marginTop:'30px'}}>Stock</h3>
            {products.map(p => (
                <div key={p._id} style={{display:'flex', justifyContent:'space-between', borderBottom: styles.header.borderBottom, padding:'10px'}}>
                    <span>{p.name} ({p.stock})</span>
                    <button onClick={() => deleteProduct(p._id)} style={{color:'red', background:'none', border:'none'}}>Del</button>
                </div>
            ))}
            <button onClick={handleFactoryReset} style={{...styles.btn, background:'#ff3d00', marginTop:'30px'}}>⚠️ RESET ALL DATA</button>
        </div>
      )}

      <div style={styles.nav}>
        {['billing', 'history', 'admin'].map(tab => (
            <button key={tab} style={styles.navBtn(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                <span style={{fontSize:'20px'}}>{tab === 'billing' ? '🛒' : tab === 'history' ? '📄' : '⚙️'}</span>
                <span style={{fontSize:'10px'}}>{tab.toUpperCase()}</span>
            </button>
        ))}
      </div>
    </div>
  );
                  }
                  
