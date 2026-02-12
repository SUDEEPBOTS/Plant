import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null); // New: Toast Notification

  // Billing Details
  const [shopName, setShopName] = useState('');
  const [shopNumber, setShopNumber] = useState('');

  // Payment
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [showQr, setShowQr] = useState(false);

  // Admin Form
  const [newItem, setNewItem] = useState({ name: '', price: '', pricePerBottle: '', stock: '', image: '' });

  useEffect(() => { 
    fetchProducts();
    fetchOrders();
  }, []);

  // --- TOAST NOTIFICATION HANDLER ---
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000); // 3 sec baad gayab
  };

  // --- API CALLS ---
  const fetchProducts = async () => {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if(data.success) setProducts(data.data);
    } catch(e) { console.error("Err"); }
  };

  const fetchOrders = async () => {
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if(data.success) setOrders(data.data);
    } catch(e) { console.error("Err"); }
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
            showToast("Photo Uploaded! ✅");
        }
    } catch (error) { showToast("Upload Failed ❌", "error"); }
  };

  // --- CART ACTIONS ---
  const addToCart = (p) => {
    if (navigator.vibrate) navigator.vibrate(50);
    if (p.stock <= 0) { showToast("Stock Khatam! ❌", "error"); return; }
    
    const exist = cart.find(i => i._id === p._id);
    // Optional: Limit check remove kar diya taaki bill ban sake agar stock count galat ho
    
    setCart(exist ? cart.map(i => i._id === p._id ? { ...i, qty: i.qty + 1 } : i) : [...cart, { ...p, qty: 1 }]);
    showToast(`${p.name} Added! 🛒`);
  };

  const decreaseQty = (id) => {
    if (navigator.vibrate) navigator.vibrate(50);
    const exist = cart.find(i => i._id === id);
    if(exist.qty === 1) setCart(cart.filter(i => i._id !== id));
    else setCart(cart.map(i => i._id === id ? { ...i, qty: i.qty - 1 } : i));
  };

  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // --- BILL SUBMIT ---
  const handleBillSubmit = async () => {
    if(cart.length === 0 || !shopName) { showToast("Dukan Name aur Items daal!", "error"); return; }
    
    setIsSubmitting(true);

    try {
        const total = calculateTotal();
        const billDetails = { shopName, items: cart, totalAmount: total, paymentMode };

        await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(billDetails) });
        await fetch('/api/products', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: cart }) });

        // WhatsApp
        let msg = `*🧾 INVOICE*\n🏪 *${shopName}* (${shopNumber})\n\n`;
        cart.forEach(i => msg += `${i.qty} x ${i.name} = ₹${i.price * i.qty}\n`);
        msg += `\n*💰 TOTAL: ₹${total}*\nMode: ${paymentMode}\nDate: ${new Date().toLocaleDateString()}`;
        
        window.open(`https://wa.me/917303847666?text=${encodeURIComponent(msg)}`, '_blank');

        setCart([]); setShopName(''); setShopNumber(''); fetchProducts(); fetchOrders();
        showToast("Order Saved! ✅");
        
    } catch(e) { showToast("Network Error ❌", "error"); }
    
    setIsSubmitting(false);
  };

  // --- ADMIN ACTIONS ---
  const addProduct = async () => {
    if(!newItem.name || !newItem.price) return showToast("Name/Price Missing ❌", "error");
    
    await fetch('/api/products', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) 
    });
    
    setNewItem({ name: '', price: '', pricePerBottle: '', stock: '', image: '' });
    fetchProducts();
    showToast("Item Added! ✅");
  };

  const deleteProduct = async (id) => { if(confirm("Delete?")) { await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); fetchProducts(); } };
  
  const handleFactoryReset = async () => {
    if(confirm("⚠️ SAB DELETE HO JAYEGA!") && prompt("Type 'DELETE'") === 'DELETE') {
        await fetch('/api/reset', { method: 'DELETE' });
        setProducts([]); setOrders([]); setCart([]);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

  // --- STYLES ---
  const styles = {
    container: { background: '#f4f6f8', color: '#000', minHeight: '100vh', paddingBottom: '150px', fontFamily: 'sans-serif' }, // Increased padding bottom
    header: { padding: '15px', background: '#fff', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#2e7d32', fontSize: '20px', fontWeight: '800', position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
    input: { width: '100%', padding: '12px', background: '#fff', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '14px', background: '#2e7d32', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', marginTop: '10px', fontSize: '16px' },
    card: { background: '#fff', borderRadius: '12px', padding: '10px', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardLow: { border: '2px solid #ff5252' },
    addBtn: { background: '#2e7d32', color: 'white', border: 'none', padding: '10px', width: '100%', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px' },
    nav: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', display: 'flex', borderTop: '1px solid #ddd', zIndex: 100, paddingBottom: '10px', paddingTop: '10px' },
    navBtn: (active) => ({ flex: 1, padding: '5px', background: 'none', border: 'none', color: active ? '#2e7d32' : '#888', fontWeight: 'bold', fontSize: '12px', display:'flex', flexDirection:'column', alignItems:'center' }),
    pill: (active) => ({ padding: '8px 20px', borderRadius: '20px', border: '1px solid #2e7d32', background: active ? '#2e7d32' : 'transparent', color: active ? '#fff' : '#000', fontWeight: 'bold' }),
    notAvailable: { color: '#ff5252', background:'#ffebee', padding:'2px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:'bold' },
    loader: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(255,255,255,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:999 },
    toast: { position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '10px 20px', borderRadius: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 1000, fontWeight: 'bold', animation: 'fadeIn 0.3s' }
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>PLANT POS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* FIX FOR TRANSLATOR POPUP */}
        <meta name="google" content="notranslate" />
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        `}</style>
      </Head>

      {isSubmitting && <div style={styles.loader}><div style={{width:'40px', height:'40px', border:'4px solid #ddd', borderTop:'4px solid #2e7d32', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div></div>}
      
      {/* TOAST NOTIFICATION */}
      {toast && <div style={styles.toast}>{toast.msg}</div>}

      <div style={styles.header}>🌱 PLANT MANAGER</div>

      {activeTab === 'billing' && (
        <>
          <div style={{padding:'15px', background: '#fff', borderBottom: '1px solid #eee'}}>
            <input style={styles.input} placeholder="🏪 Dukan Name" value={shopName} onChange={e => setShopName(e.target.value)} />
            <input style={styles.input} type="number" placeholder="📞 Mobile Number" value={shopNumber} onChange={e => setShopNumber(e.target.value)} />
            <input style={{...styles.input, border:'1px solid #2196f3', marginBottom:0}} placeholder="🔍 Search Item..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', padding:'15px'}}>
            {filteredProducts.map(p => (
              <div key={p._id} style={{...styles.card, ...(p.stock < 5 ? styles.cardLow : {})}}>
                {/* Product Image: Contain fix */}
                <div style={{height:'120px', width:'100%', background:'#fff', borderRadius:'8px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    {p.image ? <img src={p.image} style={{width:'100%', height:'100%', objectFit:'contain'}} /> : <span style={{color:'#ccc', fontSize:'12px'}}>No Photo</span>}
                </div>

                <div style={{marginTop:'8px'}}>
                    <div style={{fontWeight:'bold', fontSize:'15px'}}>{p.name}</div>
                    <div style={{color:'#000', fontSize:'13px'}}>Petti: <b>₹{p.price}</b></div>
                    <div style={{fontSize:'12px', marginTop:'2px'}}>
                        Bottle: {p.pricePerBottle > 0 ? <span style={{color:'#2e7d32', fontWeight:'bold'}}>₹{p.pricePerBottle}</span> : <span style={styles.notAvailable}>Not Available</span>}
                    </div>
                    <div style={{fontSize:'11px', color: p.stock < 5 ? 'red' : '#666', marginTop:'4px'}}>
                        {p.stock < 5 ? `Low Stock: ${p.stock}` : `Stock: ${p.stock}`}
                    </div>
                </div>

                <button onClick={() => addToCart(p)} style={styles.addBtn}>ADD +</button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div style={{padding:'15px', background: '#fff', borderTop: '2px solid #2e7d32', position:'fixed', bottom:'60px', width:'100%', boxSizing:'border-box', boxShadow:'0 -5px 15px rgba(0,0,0,0.1)'}}>
              <div style={{maxHeight:'150px', overflowY:'auto', marginBottom:'10px'}}>
                  <table style={{width:'100%', fontSize:'14px'}}>
                      <tbody>{cart.map((item, i) => (
                          <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                              <td style={{padding:'5px'}}>{item.name}</td>
                              <td style={{padding:'5px', fontWeight:'bold'}}>x{item.qty}</td>
                              <td style={{padding:'5px', textAlign:'right'}}>₹{item.price * item.qty}</td>
                              <td style={{width:'30px', textAlign:'right'}}>
                                  <button onClick={() => decreaseQty(item._id)} style={{background:'#ff5252', color:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', fontWeight:'bold'}}>-</button>
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
              <button onClick={handleBillSubmit} style={styles.btn}>✅ SUBMIT ORDER</button>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div style={{padding:'20px'}}>
            <h2>📜 Orders</h2>
            {orders.map(order => (
                <div key={order._id} style={{background: '#fff', padding:'15px', marginBottom:'10px', borderRadius:'8px', borderLeft:`4px solid ${order.paymentMode === 'Online' ? '#00e676' : '#ffeb3b'}`, boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
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
                <h3 style={{marginTop:0, color:'#2196f3'}}>📝 ADD ITEM</h3>
                <input placeholder="Item Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <div style={{display:'flex', gap:'10px'}}>
                    <input type="number" placeholder="Petti Rate (Bill)" style={styles.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                    <input type="number" placeholder="Bottle MRP" style={styles.input} value={newItem.pricePerBottle} onChange={e => setNewItem({...newItem, pricePerBottle: e.target.value})} />
                </div>
                <input type="number" placeholder="Stock Qty" style={styles.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{marginBottom:'10px'}} />
                <button onClick={addProduct} style={styles.btn}>SAVE ITEM</button>
            </div>

            <h3 style={{marginTop:'30px'}}>Stock Management</h3>
            {products.map(p => (
                <div key={p._id} style={{display:'flex', justifyContent:'space-between', borderBottom: '1px solid #eee', padding:'10px', background:'white'}}>
                    <div>
                        <div style={{fontWeight:'bold'}}>{p.name}</div>
                        <div style={{fontSize:'12px', color:'#666'}}>Petti: ₹{p.price} | MRP: {p.pricePerBottle || 'N/A'}</div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <span style={{fontWeight:'bold'}}>Qty: {p.stock}</span>
                        <button onClick={() => deleteProduct(p._id)} style={{color:'red', background:'none', border:'none', fontWeight:'bold'}}>X</button>
                    </div>
                </div>
            ))}
            <button onClick={handleFactoryReset} style={{...styles.btn, background:'#ff5252', marginTop:'30px'}}>⚠️ RESET ALL DATA</button>
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
              
