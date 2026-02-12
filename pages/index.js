import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Loading & Search
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // New: Search Bar

  // Billing Details
  const [shopName, setShopName] = useState('');
  const [shopNumber, setShopNumber] = useState(''); // New: Phone Number

  // Payment
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [showQr, setShowQr] = useState(false);

  // Admin Form
  const [newItem, setNewItem] = useState({ name: '', price: '', stock: '', image: '' });

  // Initial Load
  useEffect(() => { 
    fetchProducts();
    fetchOrders();
  }, []);

  // --- API CALLS ---
  const fetchProducts = async () => {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if(data.success) setProducts(data.data);
    } catch(e) { console.error("Error loading products"); }
  };

  const fetchOrders = async () => {
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if(data.success) setOrders(data.data);
    } catch(e) { console.error("Error loading orders"); }
  };

  // --- IMAGE UPLOAD ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('https://telegra.ph/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data && data[0] && data[0].src) {
            setNewItem({ ...newItem, image: 'https://telegra.ph' + data[0].src });
            alert("Photo Uploaded! ✅");
        }
    } catch (error) { alert("Upload Failed"); }
  };

  // --- CART ACTIONS ---
  const addToCart = (p) => {
    if (p.stock <= 0) { alert("Maal Khatam! (Stock 0)"); return; }
    
    const exist = cart.find(i => i._id === p._id);
    if(exist && exist.qty >= p.stock) { alert("Aur Stock nahi hai!"); return; }

    setCart(exist ? cart.map(i => i._id === p._id ? { ...i, qty: i.qty + 1 } : i) : [...cart, { ...p, qty: 1 }]);
  };

  const decreaseQty = (id) => {
    const exist = cart.find(i => i._id === id);
    if(exist.qty === 1) {
        setCart(cart.filter(i => i._id !== id));
    } else {
        setCart(cart.map(i => i._id === id ? { ...i, qty: i.qty - 1 } : i));
    }
  };

  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // --- BILL SUBMIT ---
  const handleBillSubmit = async () => {
    if(cart.length === 0 || !shopName) { alert("Dukan Name aur Items daal!"); return; }
    if(paymentMode === 'Online' && !confirm("Payment Receive ho gayi?")) return;
    
    setIsSubmitting(true);

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

        // 3. WhatsApp Message
        let msg = `*🧾 NEW BILL*\n`;
        msg += `🏪 *${shopName}* (${shopNumber || 'No Number'})\n\n`;
        cart.forEach(i => msg += `${i.qty} x ${i.name} (@${i.price}) = ₹${i.price * i.qty}\n`);
        msg += `\n*💰 TOTAL: ₹${total}*\nMode: ${paymentMode}\nDate: ${new Date().toLocaleDateString()}`;
        
        window.open(`https://wa.me/917303847666?text=${encodeURIComponent(msg)}`, '_blank');

        // Reset
        setCart([]); setShopName(''); setShopNumber(''); setPaymentMode('Cash'); setShowQr(false);
        fetchProducts(); fetchOrders();
        
    } catch(e) {
        alert("Error! Net check kar.");
    }
    setIsSubmitting(false);
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
    if(confirm("⚠️ Pura Data Delete ho jayega. Pakka?") && prompt("Type 'DELETE'") === 'DELETE') {
        await fetch('/api/reset', { method: 'DELETE' });
        setProducts([]); setOrders([]); setCart([]);
    }
  };

  // --- FILTER SEARCH ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- STYLES (Light Mode Only) ---
  const styles = {
    container: { background: '#f4f6f8', color: '#000', minHeight: '100vh', paddingBottom: '80px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    header: { padding: '15px', background: '#fff', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#2e7d32', fontSize: '22px', fontWeight: '800', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    input: { width: '100%', padding: '12px', background: '#fff', border: '1px solid #ccc', color: '#000', borderRadius: '8px', marginBottom: '10px', boxSizing: 'border-box', fontSize: '16px' },
    btn: { width: '100%', padding: '14px', background: '#2e7d32', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', fontSize: '16px', marginTop: '10px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    card: { background: '#fff', borderRadius: '12px', padding: '10px', border: '1px solid #e0e0e0', textAlign: 'center', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    cardLowStock: { border: '2px solid #ff3d00' }, // Red border for low stock
    addBtn: { background: '#2e7d32', color: 'white', border: 'none', padding: '8px', width: '100%', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', cursor: 'pointer' },
    nav: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', display: 'flex', borderTop: '1px solid #ddd', zIndex: 100, paddingBottom: '5px' },
    navBtn: (active) => ({ flex: 1, padding: '10px', background: 'none', border: 'none', color: active ? '#2e7d32' : '#888', fontWeight: 'bold', fontSize: '12px', display:'flex', flexDirection:'column', alignItems:'center' }),
    pill: (active) => ({ padding: '8px 15px', borderRadius: '20px', border: '1px solid #2e7d32', background: active ? '#2e7d32' : 'transparent', color: active ? '#fff' : '#000', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }),
    loaderOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(255,255,255,0.9)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999, flexDirection:'column' },
    spinner: { width:'50px', height:'50px', border:'5px solid #ccc', borderTop:'5px solid #2e7d32', borderRadius:'50%', animation:'spin 1s linear infinite' }
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </Head>

      {/* LOADER */}
      {isSubmitting && (
        <div style={styles.loaderOverlay}>
            <div style={styles.spinner}></div>
            <p style={{color:'#000', marginTop:'15px', fontWeight:'bold'}}>Saving Bill...</p>
        </div>
      )}

      <div style={styles.header}>🌱 PLANT MANAGER</div>

      {activeTab === 'billing' && (
        <>
          <div style={{padding:'15px', background: '#fff', borderBottom: '1px solid #eee'}}>
            {/* SHOP DETAILS INPUT */}
            <input style={styles.input} placeholder="🏪 Dukan Name" value={shopName} onChange={e => setShopName(e.target.value)} />
            <input style={styles.input} type="number" placeholder="📞 Mobile Number" value={shopNumber} onChange={e => setShopNumber(e.target.value)} />
            
            {/* SEARCH BAR (EXTRA FEATURE) */}
            <input 
                style={{...styles.input, border:'1px solid #2196f3', marginBottom: 0}} 
                placeholder="🔍 Search Item..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', padding:'15px'}}>
            {filteredProducts.map(p => (
              <div key={p._id} style={{...styles.card, ...(p.stock < 5 ? styles.cardLowStock : {})}}>
                
                {/* Image */}
                <div style={{height:'100px', width:'100%', background:'#f0f0f0', borderRadius:'8px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    {p.image ? <img src={p.image} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <span style={{color:'#ccc'}}>No Img</span>}
                </div>

                {/* Details */}
                <div style={{marginTop:'10px'}}>
                    <div style={{fontWeight:'bold', fontSize:'15px', marginBottom:'5px'}}>{p.name}</div>
                    <div style={{color:'#2e7d32', fontWeight:'bold', fontSize:'14px'}}>MRP: ₹{p.price}</div>
                    <div style={{color: p.stock < 5 ? 'red' : '#666', fontSize:'12px'}}>Stock: {p.stock}</div>
                </div>

                {/* ADD BUTTON */}
                <button onClick={() => addToCart(p)} style={styles.addBtn}>ADD +</button>
              </div>
            ))}
          </div>

          {/* INVOICE SECTION */}
          {cart.length > 0 && (
            <div style={{padding:'15px', background: '#fff', borderTop: '1px solid #ddd', position:'fixed', bottom:'60px', width:'100%', boxSizing:'border-box', boxShadow:'0 -4px 10px rgba(0,0,0,0.1)'}}>
              
              <div style={{maxHeight:'150px', overflowY:'auto', marginBottom:'10px'}}>
                  <table style={{width:'100%', fontSize:'14px'}}>
                      <tbody>{cart.map((item, i) => (
                          <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                              <td style={{padding:'5px'}}>{item.name}</td>
                              <td style={{padding:'5px'}}>x{item.qty}</td>
                              <td style={{padding:'5px', textAlign:'right'}}>₹{item.price * item.qty}</td>
                              <td style={{width:'30px', textAlign:'right'}}>
                                  <button onClick={() => decreaseQty(item._id)} style={{background:'#ff3d00', color:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', fontWeight:'bold'}}>-</button>
                              </td>
                          </tr>
                      ))}</tbody>
                  </table>
              </div>
              
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #ccc', paddingTop:'10px', marginBottom:'10px'}}>
                  <div style={{fontSize:'18px', fontWeight:'bold'}}>Total: ₹{calculateTotal()}</div>
                  <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={() => { setPaymentMode('Cash'); setShowQr(false); }} style={styles.pill(paymentMode === 'Cash')}>💵</button>
                    <button onClick={() => { setPaymentMode('Online'); setShowQr(true); }} style={styles.pill(paymentMode === 'Online')}>📱</button>
                  </div>
              </div>

              {showQr && <div style={{textAlign:'center', marginBottom:'10px'}}><img src="https://files.catbox.moe/jedcoz.png" style={{width:'120px'}} /></div>}

              <button onClick={handleBillSubmit} style={styles.btn}>✅ SUBMIT & WHATSAPP</button>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div style={{padding:'20px'}}>
            <h2>📜 Sales History</h2>
            {orders.map(order => (
                <div key={order._id} style={{background: '#fff', padding:'15px', marginBottom:'10px', borderRadius:'8px', borderLeft:`4px solid ${order.paymentMode === 'Online' ? '#00e676' : '#ffea00'}`, boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'16px'}}>
                        <span>{order.shopName}</span>
                        <span style={{color:'#2e7d32'}}>₹{order.totalAmount}</span>
                    </div>
                    <div style={{fontSize:'12px', color:'#666', marginTop:'5px'}}>{new Date(order.date).toLocaleString()} • {order.paymentMode}</div>
                </div>
            ))}
        </div>
      )}

      {activeTab === 'admin' && (
        <div style={{padding:'20px'}}>
            <div style={{background: '#fff', padding:'15px', borderRadius:'8px', border: '1px solid #eee', marginBottom:'20px'}}>
                <h3 style={{marginTop:0, color:'#2e7d32'}}>💰 COLLECTION</h3>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>💵 Cash:</span><span style={{fontWeight:'bold'}}>₹{getCollectionReport().cash}</span></div>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>📱 Online:</span><span style={{fontWeight:'bold'}}>₹{getCollectionReport().online}</span></div>
                <div style={{borderTop:`1px solid #eee`, paddingTop:'5px', marginTop:'5px', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}><span>TOTAL:</span><span>₹{getCollectionReport().total}</span></div>
            </div>

            <div style={{background: '#fff', padding:'15px', borderRadius:'8px', border: '1px solid #eee', marginBottom:'20px'}}>
                <h3 style={{marginTop:0, color:'#2196f3'}}>🚚 STOCK REPORT</h3>
                <table style={{width:'100%', fontSize:'12px', textAlign:'left'}}>
                    <thead><tr style={{color:'#888'}}><th>ITEM</th><th>SOLD</th><th>BAL</th></tr></thead>
                    <tbody>{getDayReport().map((r,i) => <tr key={i}><td>{r.name}</td><td style={{color:'#ff3d00'}}>{r.sold}</td><td style={{color:'#2e7d32', fontWeight:'bold'}}>{r.current}</td></tr>)}</tbody>
                </table>
            </div>

            <h3>Add New Item</h3>
            <input placeholder="Item Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <input type="number" placeholder="Rate (MRP)" style={styles.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <input placeholder="Stock Qty" type="number" style={styles.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{marginBottom:'10px'}} />
            <button onClick={addProduct} style={styles.btn}>ADD ITEM</button>

            <h3 style={{marginTop:'30px'}}>Stock List</h3>
            {products.map(p => (
                <div key={p._id} style={{display:'flex', justifyContent:'space-between', borderBottom: '1px solid #eee', padding:'10px', background:'white'}}>
                    <span>{p.name} ({p.stock})</span>
                    <button onClick={() => deleteProduct(p._id)} style={{color:'red', background:'none', border:'none', fontWeight:'bold'}}>DEL</button>
                </div>
            ))}
            <button onClick={handleFactoryReset} style={{...styles.btn, background:'#ff3d00', marginTop:'30px'}}>⚠️ RESET ALL DATA</button>
        </div>
      )}

      <div style={styles.nav}>
        {['billing', 'history', 'admin'].map(tab => (
            <button key={tab} style={styles.navBtn(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                <span style={{fontSize:'22px'}}>{tab === 'billing' ? '🛒' : tab === 'history' ? '📄' : '⚙️'}</span>
                <span style={{fontSize:'10px'}}>{tab.toUpperCase()}</span>
            </button>
        ))}
      </div>
    </div>
  );
    }
                  
