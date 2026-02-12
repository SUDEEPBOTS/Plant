import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]); 
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Billing Info
  const [shopName, setShopName] = useState('');
  const [location, setLocation] = useState('');

  // Theme & Payment
  const [theme, setTheme] = useState('dark'); 
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [showQr, setShowQr] = useState(false);

  // Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Admin Forms
  const [newItem, setNewItem] = useState({ name: '', price: '', stock: '', image: '' });
  
  // NEW DELIVERY FORM
  const [newDelivery, setNewDelivery] = useState({ shopName: '', ownerName: '', phone: '', location: '', amount: '' });

  useEffect(() => { 
    fetchProducts();
    fetchOrders();
    fetchDeliveries(); 

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // --- API CALLS ---
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

  const fetchDeliveries = async () => {
    const res = await fetch('/api/deliveries');
    const data = await res.json();
    if(data.success) setDeliveries(data.data);
  };

  // --- DELIVERY LOGIC ---
  const addDelivery = async () => {
    if(!newDelivery.shopName || !newDelivery.phone || !newDelivery.amount) { 
        alert("Shop Name, Mobile Number aur Amount zaroori hai!"); 
        return; 
    }
    await fetch('/api/deliveries', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newDelivery) 
    });
    setNewDelivery({ shopName: '', ownerName: '', phone: '', location: '', amount: '' });
    fetchDeliveries();
    alert("Delivery Added! 🚚");
  };

  const updateDeliveryStatus = async (id, status) => {
    await fetch('/api/deliveries', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id, status }) 
    });
    fetchDeliveries();
  };

  const deleteDelivery = async (id) => {
      if(confirm("Delete delivery?")) {
        await fetch(`/api/deliveries?id=${id}`, { method: 'DELETE' });
        fetchDeliveries();
      }
  };

  // --- GPS LOGIC ---
  const handleGpsLocation = (isDelivery = false) => {
    if (navigator.geolocation) {
        setLoading(true);
        navigator.geolocation.getCurrentPosition((position) => {
            const link = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
            if(isDelivery) {
                setNewDelivery({...newDelivery, location: link});
            } else {
                setLocation(link);
            }
            setLoading(false);
            alert("Location Captured! 📍");
        }, () => { alert("GPS Error"); setLoading(false); });
    }
  };

  // --- ADMIN HELPER BUTTONS ---
  const addSizeTag = (tag) => {
    setNewItem({ ...newItem, name: newItem.name + ' ' + tag });
  };

  // --- IMAGE UPLOAD ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(file && file.size < 1000000) {
        const reader = new FileReader();
        reader.onloadend = () => setNewItem({ ...newItem, image: reader.result });
        reader.readAsDataURL(file);
    } else { alert("Photo 1MB se badi mat daal!"); }
  };

  // --- FACTORY RESET ---
  const handleFactoryReset = async () => {
    if(confirm("⚠️ DANGER: Sab kuch delete ho jayega!") && prompt("Type 'DELETE'") === 'DELETE') {
        setLoading(true);
        await fetch('/api/reset', { method: 'DELETE' });
        setProducts([]); setOrders([]); setCart([]); setDeliveries([]);
        alert("Format Complete! 🧹");
        setLoading(false);
    }
  };

  // --- APP INSTALL ---
  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstallBtn(false);
      setDeferredPrompt(null);
    }
  };

  // --- CALCULATIONS ---
  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const getCollectionReport = () => {
    let c = 0, o = 0;
    orders.forEach(ord => ord.paymentMode === 'Online' ? o += ord.totalAmount : c += ord.totalAmount);
    return { cash: c, online: o, total: c + o };
  };

  const getDayReport = () => products.map(p => {
    const sold = orders.reduce((acc, o) => acc + (o.items.find(i => i.name === p.name)?.qty || 0), 0);
    return { name: p.name, current: p.stock, sold: sold, loaded: p.stock + sold };
  });

  const addToCart = (p, qty = 1) => {
    if (p.stock < qty) { alert("Stock kam hai!"); return; }
    const exist = cart.find(i => i._id === p._id);
    setCart(exist ? cart.map(i => i._id === p._id ? { ...i, qty: i.qty + qty } : i) : [...cart, { ...p, qty }]);
  };

  const removeFromCart = (id) => setCart(cart.filter((item) => item._id !== id));

  const handleBillSubmit = async () => {
    if(cart.length === 0 || !shopName) { alert("Dukan Name aur Item to daal!"); return; }
    if(paymentMode === 'Online' && !confirm("QR Payment aagayi?")) return;
    if(!confirm("Bill Final Karein?")) return;

    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, location, items: cart, totalAmount: calculateTotal(), paymentMode }),
    });

    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('invoice-area');
    html2pdf().set({ margin: 5, filename: `${shopName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(element).save();

    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart }),
    });

    if(confirm("WhatsApp pe bhejun?")) {
        let msg = `*🧾 BILL - ${shopName}*\n📍 ${location}\n\n`;
        cart.forEach(i => msg += `${i.qty} x ${i.name} = ₹${i.price * i.qty}\n`);
        msg += `\n*TOTAL: ₹${calculateTotal()}*\nMode: ${paymentMode}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }

    setCart([]); setShopName(''); setLocation(''); setPaymentMode('Cash'); setShowQr(false);
    fetchProducts(); fetchOrders();
  };

  const handleAiOrder = async () => {
    if(!aiPrompt) return;
    setLoading(true);
    try {
        const res = await fetch('/api/ai', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prompt: aiPrompt }) });
        const items = await res.json();
        items.forEach(o => { const p = products.find(x => x._id === o._id); if(p) addToCart(p, o.qty); });
        setAiPrompt('');
    } catch(e) { alert("AI Error"); }
    setLoading(false);
  }

  const addProduct = async () => {
    if(!newItem.name) return alert("Naam likh!");
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
    setNewItem({ name: '', price: '', stock: '', image: '' });
    fetchProducts();
  };

  const deleteProduct = async (id) => { if(confirm("Delete?")) { await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); fetchProducts(); } };

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
    tagBtn: { padding: '5px 10px', margin: '0 5px 5px 0', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '15px', fontSize: '10px', cursor: 'pointer' },
    deleteBtn: { background: '#ff3d00', color: 'white', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    statusBadge: (status) => ({ padding:'2px 8px', borderRadius:'10px', fontSize:'10px', background: status === 'Completed' ? '#4caf50' : '#ff9800', color: 'black', fontWeight:'bold' }),
    actionIcon: { textDecoration: 'none', fontSize: '18px', marginRight: '15px', cursor: 'pointer' }
  };

  const collection = getCollectionReport();

  return (
    <div style={styles.container}>
      <Head>
        <title>PLANT POS</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content={isDark ? "#0a0a0a" : "#f0f2f5"} />
      </Head>

      {showInstallBtn && <button style={{position:'fixed', top:'60px', right:'15px', background:'#4caf50', color:'white', border:'none', padding:'5px 10px', borderRadius:'20px', zIndex:99}} onClick={installApp}>⬇ Install App</button>}

      <div style={styles.header}>
        <span>PLANT MANAGER {loading && '...'}</span>
        <button onClick={toggleTheme} style={{background:'none', border:'none', fontSize:'20px'}}> {isDark ? '☀️' : '🌙'} </button>
      </div>

      {/* --- BILLING TAB --- */}
      {activeTab === 'billing' && (
        <>
          <div style={{padding:'10px', background: isDark ? '#111' : '#fff', borderBottom: styles.header.borderBottom}}>
            <input style={{...styles.input, border:'1px solid #4caf50'}} placeholder="Dukan Name" value={shopName} onChange={e => setShopName(e.target.value)} />
            
            <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                <input style={{...styles.input, marginBottom:0}} placeholder="Location / Address" value={location} onChange={e => setLocation(e.target.value)} />
                <button onClick={() => handleGpsLocation(false)} style={{...styles.btn, width:'80px', marginTop:0, background:'#2196F3'}}>📍 GPS</button>
            </div>

            <div style={{display:'flex', gap:'10px'}}>
                <input style={{...styles.input, marginBottom:0}} placeholder="AI: '2 coke'" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                <button onClick={handleAiOrder} style={{...styles.btn, width:'60px', marginTop:0}}>GO</button>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', padding:'10px'}}>
            {products.map(p => (
              <div key={p._id} style={styles.card} onClick={() => addToCart(p)}>
                <div style={{fontSize:'10px', color:'#888', position:'absolute', top:5, right:5}}>Qty: {p.stock}</div>
                {p.image ? <img src={p.image} style={{width:'100%', height:'100px', objectFit:'cover', borderRadius:'4px'}} /> : <div style={{height:'80px', background:'#222', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center'}}>No Photo</div>}
                <div style={{fontWeight:'bold', marginTop:'5px'}}>{p.name}</div>
                <div style={{color:'#4caf50'}}>₹{p.price}</div>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div style={{padding:'15px', background: isDark ? '#1a1a1a' : '#fff', borderTop: styles.header.borderBottom}}>
              <div id="invoice-area" style={{background:'#fff', padding:'10px', color:'black', borderRadius:'5px', marginBottom:'15px', border:'1px solid #ccc'}}>
                <h3 style={{borderBottom:'1px solid #000', margin:'0 0 10px 0', display:'flex', justifyContent:'space-between'}}>
                    <span>INVOICE</span> <span>{new Date().toLocaleDateString()}</span>
                </h3>
                <div style={{fontWeight:'bold'}}>{shopName}</div>
                <div style={{fontSize:'12px', color:'#555', marginBottom:'10px'}}>📍 {location || 'No Location'}</div>
                
                <table style={{width:'100%', fontSize:'14px', borderCollapse:'collapse'}}>
                    <tbody>{cart.map((item, i) => (
                        <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                            <td style={{padding:'8px 0'}}>{item.name}</td>
                            <td style={{textAlign:'center'}}>{item.qty}</td>
                            <td style={{textAlign:'right'}}>₹{item.price * item.qty}</td>
                            <td style={{width:'30px', textAlign:'right'}}>
                                <button onClick={(e) => { e.stopPropagation(); removeFromCart(item._id); }} style={styles.deleteBtn}>X</button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>

                <div style={{textAlign:'right', marginTop:'10px', fontSize:'18px', fontWeight:'bold'}}>Total: ₹{calculateTotal()}</div>
                <div style={{fontSize:'10px', marginTop:'5px'}}>Mode: {paymentMode}</div>
              </div>

              <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                <button onClick={() => { setPaymentMode('Cash'); setShowQr(false); }} style={styles.pill(paymentMode === 'Cash')}>💵 CASH</button>
                <button onClick={() => { setPaymentMode('Online'); setShowQr(true); }} style={styles.pill(paymentMode === 'Online')}>📱 ONLINE</button>
              </div>

              {showQr && <div style={{textAlign:'center', marginBottom:'10px', background:'#fff', padding:'10px', borderRadius:'8px'}}><img src="https://files.catbox.moe/jedcoz.png" style={{width:'150px'}} /></div>}

              <button onClick={handleBillSubmit} style={styles.btn}>✅ SAVE & DOWNLOAD</button>
            </div>
          )}
        </>
      )}

      {/* --- DELIVERY TAB --- */}
      {activeTab === 'delivery' && (
          <div style={{padding:'20px'}}>
              <h2>Deliveries 🚚</h2>
              {deliveries.map(d => (
                  <div key={d._id} style={{background: isDark ? '#1a1a1a' : '#fff', padding:'15px', marginBottom:'10px', borderRadius:'8px', borderLeft: d.status === 'Completed' ? '4px solid #4caf50' : '4px solid #ff9800', position:'relative', border: styles.card.border}}>
                      
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{margin:0, fontSize:'16px'}}>{d.shopName}</h3>
                        <span style={styles.statusBadge(d.status)}>{d.status}</span>
                      </div>
                      <div style={{color:'#888', fontSize:'14px'}}>{d.ownerName}</div>
                      
                      <div style={{fontSize:'20px', color:'#4caf50', fontWeight:'bold', margin:'5px 0'}}>₹{d.amount}</div>
                      
                      {/* ACTION ROW: Call, WhatsApp, Map */}
                      <div style={{display:'flex', alignItems:'center', marginTop:'10px', borderTop:'1px solid #333', paddingTop:'10px'}}>
                          <a href={`tel:${d.phone}`} style={styles.actionIcon}>📞</a>
                          <a href={`https://wa.me/91${d.phone}`} target="_blank" style={styles.actionIcon}>💬</a>
                          {d.location && <a href={d.location} target="_blank" style={styles.actionIcon}>📍</a>}
                      </div>

                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          {d.status === 'Pending' && <button onClick={() => updateDeliveryStatus(d._id, 'Completed')} style={{...styles.btn, padding:'8px', fontSize:'12px', background:'#4caf50'}}>Mark Done</button>}
                          <button onClick={() => deleteDelivery(d._id)} style={{...styles.btn, padding:'8px', fontSize:'12px', background:'#ff3d00', width:'50px'}}>Del</button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* --- HISTORY TAB --- */}
      {activeTab === 'history' && (
        <div style={{padding:'20px'}}>
            <h2>Sales History</h2>
            {orders.map(order => (
                <div key={order._id} style={{background: isDark ? '#1a1a1a' : '#fff', padding:'15px', marginBottom:'10px', borderRadius:'8px', borderLeft:`4px solid ${order.paymentMode === 'Online' ? '#00e676' : '#ffea00'}`, border: styles.card.border}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'18px'}}>
                        <span>{order.shopName}</span>
                        <span style={{color:'#4caf50'}}>₹{order.totalAmount}</span>
                    </div>
                    {order.location && <div style={{fontSize:'12px', color:'#2196F3', marginTop:'2px'}}>📍 {order.location.substring(0, 30)}...</div>}
                    <div style={{fontSize:'12px', color:'#888', marginTop:'5px'}}>{new Date(order.date).toLocaleString()} • {order.paymentMode}</div>
                </div>
            ))}
        </div>
      )}

      {/* --- ADMIN TAB --- */}
      {activeTab === 'admin' && (
        <div style={{padding:'20px'}}>
            
   {/* ADD DELIVERY SECTION */}
            <div style={{background: isDark ? '#111' : '#fff', padding:'15px', borderRadius:'8px', border: styles.header.borderBottom, marginBottom:'30px'}}>
                <h3 style={{marginTop:0, color:'#2196F3'}}>🚚 ADD DELIVERY</h3>
                <input placeholder="Shop Name" style={styles.input} value={newDelivery.shopName} onChange={e => setNewDelivery({...newDelivery, shopName: e.target.value})} />
                <input placeholder="Owner Name" style={styles.input} value={newDelivery.ownerName} onChange={e => setNewDelivery({...newDelivery, ownerName: e.target.value})} />
                <input type="number" placeholder="Mobile Number" style={styles.input} value={newDelivery.phone} onChange={e => setNewDelivery({...newDelivery, phone: e.target.value})} />
                
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                    <input style={{...styles.input, marginBottom:0}} placeholder="Location Link" value={newDelivery.location} onChange={e => setNewDelivery({...newDelivery, location: e.target.value})} />
                    <button onClick={() => handleGpsLocation(true)} style={{...styles.btn, width:'80px', marginTop:0, background:'#2196F3'}}>📍 GPS</button>
                </div>
                
                <input type="number" placeholder="Amount (₹)" style={styles.input} value={newDelivery.amount} onChange={e => setNewDelivery({...newDelivery, amount: e.target.value})} />
                <button onClick={addDelivery} style={{...styles.btn, background:'#2196F3'}}>ADD TO LIST</button>
            </div>

            {/* COLLECTION REPORT */}
            <div style={{background: isDark ? '#111' : '#fff', padding:'15px', borderRadius:'8px', border: styles.header.borderBottom, marginBottom:'20px'}}>
                <h3 style={{marginTop:0, color:'#4caf50'}}>💰 COLLECTION</h3>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>💵 Cash:</span><span style={{color:'#ffea00'}}>₹{collection.cash}</span></div>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>📱 Online:</span><span style={{color:'#00e676'}}>₹{collection.online}</span></div>
                <div style={{borderTop:`1px solid #444`, paddingTop:'5px', marginTop:'5px', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}><span>TOTAL:</span><span>₹{collection.total}</span></div>
            </div>

            {/* ADD ITEM SECTION */}
            <h3>Add New Item</h3>
            <input placeholder="Item Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            
            <div style={{marginBottom:'10px', display:'flex', flexWrap:'wrap'}}>
                {['200ml', '250ml', '500ml', '1L', '2L', 'Petti', 'Box'].map(tag => (
                    <button key={tag} onClick={() => addSizeTag(tag)} style={styles.tagBtn}>+ {tag}</button>
                ))}
            </div>

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

      {/* --- NAVIGATION --- */}
      <div style={styles.nav}>
        <button style={styles.navBtn(activeTab === 'billing')} onClick={() => setActiveTab('billing')}>
            <span style={{fontSize:'20px'}}>🛒</span> <span style={{fontSize:'10px'}}>BILL</span>
        </button>
        <button style={styles.navBtn(activeTab === 'delivery')} onClick={() => setActiveTab('delivery')}>
            <span style={{fontSize:'20px'}}>🚚</span> <span style={{fontSize:'10px'}}>DELIVERY</span>
        </button>
        <button style={styles.navBtn(activeTab === 'history')} onClick={() => setActiveTab('history')}>
            <span style={{fontSize:'20px'}}>📄</span> <span style={{fontSize:'10px'}}>HISTORY</span>
        </button>
        <button style={styles.navBtn(activeTab === 'admin')} onClick={() => setActiveTab('admin')}>
            <span style={{fontSize:'20px'}}>⚙️</span> <span style={{fontSize:'10px'}}>ADMIN</span>
        </button>
      </div>
    </div>
  );
              }
