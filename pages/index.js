import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  
  // Data States
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingData, setLoadingData] = useState(true); 
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Billing Details
  const [shopName, setShopName] = useState('');
  const [shopNumber, setShopNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [showQr, setShowQr] = useState(false);

  // Admin Security & Forms
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', pricePerBottle: '', stock: '', image: '' });
  const [isEditing, setIsEditing] = useState(null);

  // Audio Ref
  const audioRef = useRef(null);

  useEffect(() => { 
    loadAllData();
  }, []);

  // --- LOADING LOGIC (FIXED) ---
  const loadAllData = async () => {
    setLoadingData(true);
    try {
        await Promise.all([fetchProducts(), fetchOrders()]);
    } catch (error) {
        console.error("Load Error");
    } finally {
        setLoadingData(false); // Ye zaroor chalega
    }
  };

  // --- SOUND EFFECT ---
  const playSound = () => {
      if (navigator.vibrate) navigator.vibrate(50);
      // Optional: Add a real sound file url if needed
  };

  // --- API CALLS ---
  const fetchProducts = async () => {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if(data.success) setProducts(data.data);
    } catch(e) { console.error("Err Prod"); }
  };

  const fetchOrders = async () => {
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if(data.success) setOrders(data.data.reverse());
    } catch(e) { console.error("Err Order"); }
  };

  // --- TOAST ---
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- ADMIN AUTH ---
  const unlockAdmin = () => {
      if(adminPassword === 'rwf123') {
          setIsAdminUnlocked(true);
          setAdminPassword('');
      } else {
          showToast("Galat Password! ❌", "error");
      }
  };

  // --- CART LOGIC ---
  const addToCart = (p) => {
    playSound();
    if (p.stock <= 0) { showToast("Out of Stock! ❌", "error"); return; }
    
    const currentInCart = cart.find(i => i._id === p._id)?.qty || 0;
    if (currentInCart >= p.stock) { showToast("Stock Khatam! ⚠️", "error"); return; }

    const exist = cart.find(i => i._id === p._id);
    setCart(exist ? cart.map(i => i._id === p._id ? { ...i, qty: i.qty + 1 } : i) : [...cart, { ...p, qty: 1 }]);
    showToast(`${p.name} Added!`);
  };

  const decreaseQty = (id) => {
    playSound();
    const exist = cart.find(i => i._id === id);
    if(exist.qty === 1) setCart(cart.filter(i => i._id !== id));
    else setCart(cart.map(i => i._id === id ? { ...i, qty: i.qty - 1 } : i));
  };

  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // --- REPORTS & EXPORT ---
  const getCollectionReport = () => {
    let c = 0, o = 0;
    orders.forEach(ord => ord.paymentMode === 'Online' ? o += ord.totalAmount : c += ord.totalAmount);
    return { cash: c, online: o, total: c + o };
  };

  const getDayReport = () => products.map(p => {
    const sold = orders.reduce((acc, o) => acc + (o.items.find(i => i.name === p.name)?.qty || 0), 0);
    return { name: p.name, current: p.stock, sold: sold, loaded: p.stock + sold };
  });

  const exportCSV = () => {
      const report = getDayReport();
      let csvContent = "data:text/csv;charset=utf-8,Item,Sold,Current Stock\n";
      report.forEach(r => {
          csvContent += `${r.name},${r.sold},${r.current}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      window.open(encodedUri);
      showToast("Report Downloaded! 📥");
  };

  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

  // --- BILL SUBMIT ---
  const handleBillSubmit = async () => {
    if(cart.length === 0 || !shopName) { showToast("Shop Name Required!", "error"); return; }
    
    setIsSubmitting(true);

    const total = calculateTotal();
    const billDetails = { shopName, items: cart, totalAmount: total, paymentMode, date: new Date() };
    const tempCart = [...cart];
    
    // Immediate Redirect (WhatsApp)
    let msg = `*🧾 NEW INVOICE*\n🏪 *${shopName}* (${shopNumber || 'No Num'})\n\n`;
    tempCart.forEach(i => msg += `${i.qty} x ${i.name} = ₹${i.price * i.qty}\n`);
    msg += `\n*💰 TOTAL: ₹${total}*\nMode: ${paymentMode}\nDate: ${new Date().toLocaleDateString()}`;
    
    window.open(`https://wa.me/917303847666?text=${encodeURIComponent(msg)}`, '_blank');

    setCart([]); setShopName(''); setShopNumber(''); setIsSubmitting(false);

    // Background Sync
    try {
        await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(billDetails) });
        await fetch('/api/products', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: tempCart }) });
        loadAllData();
        showToast("Bill Saved ✅");
    } catch(e) {
        showToast("Offline Mode ⚠️", "success");
    }
  };

  // --- IMAGE COMPRESSION & UPLOAD ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500; // Resize to 500px width
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Compress to JPEG 0.7 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setNewItem({ ...newItem, image: dataUrl });
            showToast("Photo Compressed & Ready! ✅");
        }
    }
  };

  const handleSaveItem = async () => {
    if(!newItem.name || !newItem.price) return showToast("Name & Price Required", "error");
    
    const endpoint = '/api/products';
    const method = isEditing ? 'PUT' : 'POST';
    const body = isEditing ? { id: isEditing, ...newItem } : newItem;

    try {
        await fetch(endpoint, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
        showToast(isEditing ? "Item Updated! ✅" : "Item Added! ✅");
        setNewItem({ name: '', price: '', pricePerBottle: '', stock: '', image: '' });
        setIsEditing(null);
        loadAllData();
    } catch(e) {
        showToast("Save Failed ❌", "error");
    }
  };

  const editItem = (p) => {
      setNewItem({ name: p.name, price: p.price, pricePerBottle: p.pricePerBottle, stock: p.stock, image: p.image });
      setIsEditing(p._id);
      window.scrollTo(0,0);
  };

  const deleteProduct = async (id) => { 
      if(confirm("Delete this item?")) { 
          await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); 
          loadAllData(); 
      } 
  };

  const handleFactoryReset = async () => {
    if(confirm("⚠️ RESET ALL DATA?") && prompt("Type 'DELETE'") === 'DELETE') {
        await fetch('/api/reset', { method: 'DELETE' });
        setProducts([]); setOrders([]); setCart([]);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // --- STYLES ---
  const styles = {
    container: { background: '#f4f6f8', color: '#000', minHeight: '100vh', paddingBottom: '200px', fontFamily: 'sans-serif' },
    header: { padding: '15px', background: '#fff', borderBottom: '1px solid #ddd', textAlign: 'center', color: '#2e7d32', fontSize: '20px', fontWeight: '800', position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
    input: { width: '100%', padding: '12px', background: '#fff', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '14px', background: '#2e7d32', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', marginTop: '10px', fontSize:'16px' },
    card: { background: '#fff', borderRadius: '12px', padding: '10px', border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position:'relative' },
    addBtn: (disabled) => ({ background: disabled ? '#ccc' : '#2e7d32', color: 'white', border: 'none', padding: '8px', width: '100%', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', cursor: disabled ? 'not-allowed' : 'pointer' }),
    nav: { position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', display: 'flex', borderTop: '1px solid #ddd', zIndex: 100, paddingBottom: '10px', paddingTop: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' },
    navBtn: (active) => ({ flex: 1, padding: '5px', background: 'none', border: 'none', color: active ? '#2e7d32' : '#888', fontWeight: 'bold', fontSize: '12px', display:'flex', flexDirection:'column', alignItems:'center' }),
    skeleton: { background: '#e0e0e0', height: '140px', borderRadius: '12px', width: '100%', animation: 'pulse 1.5s infinite' },
    loader: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999, flexDirection:'column' },
    blurOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(255,255,255,0.8)', backdropFilter:'blur(5px)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:200 },
    loginBox: { background:'white', padding:'25px', borderRadius:'15px', boxShadow:'0 10px 25px rgba(0,0,0,0.2)', width:'80%', textAlign:'center' },
    pill: (active) => ({ padding: '8px 20px', borderRadius: '20px', border: '1px solid #2e7d32', background: active ? '#2e7d32' : 'transparent', color: active ? '#fff' : '#000', fontWeight: 'bold' }),
    toast: { position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', zIndex: 1000, fontWeight: 'bold', animation: 'fadeIn 0.3s', whiteSpace: 'nowrap' }
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>PLANT POS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="google" content="notranslate" />
        <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </Head>

      {isSubmitting && <div style={styles.loader}><div style={{width:'50px', height:'50px', border:'5px solid #fff', borderTop:'5px solid #2e7d32', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div></div>}
      
      {toast && <div style={styles.toast}>{toast.msg}</div>}

      <div style={styles.header}>🌱 PLANT MANAGER</div>

      {/* BILLING TAB */}
      {activeTab === 'billing' && (
        <>
          <div style={{padding:'15px', background: '#fff', borderBottom: '1px solid #eee'}}>
            <input style={styles.input} placeholder="🏪 Dukan Name" value={shopName} onChange={e => setShopName(e.target.value)} />
            <input style={styles.input} type="number" placeholder="📞 Mobile Number" value={shopNumber} onChange={e => setShopNumber(e.target.value)} />
            <input style={{...styles.input, border:'1px solid #2196f3', marginBottom:0}} placeholder="🔍 Search Item..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', padding:'15px'}}>
            {loadingData ? (
                // SKELETON LOADING (FIXED)
                Array(6).fill(0).map((_, i) => <div key={i} style={styles.skeleton}></div>)
            ) : filteredProducts.length === 0 ? (
                <div style={{gridColumn:'span 2', textAlign:'center', color:'#888', padding:'20px'}}>No Items Found 🪴</div>
            ) : (
                filteredProducts.map(p => {
                    const inCart = cart.find(i => i._id === p._id)?.qty || 0;
                    const available = p.stock - inCart;
                    return (
                        <div key={p._id} style={{...styles.card, border: available === 0 ? '2px solid red' : '1px solid #e0e0e0'}}>
                            <div style={{height:'100px', width:'100%', background:'#f5f5f5', borderRadius:'8px', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                {p.image ? <img src={p.image} style={{width:'100%', height:'100%', objectFit:'contain'}} /> : <span style={{color:'#ccc', fontSize:'12px'}}>No Photo</span>}
                            </div>
                            <div style={{marginTop:'8px'}}>
                                <div style={{fontWeight:'bold', fontSize:'15px'}}>{p.name}</div>
                                <div style={{fontSize:'13px'}}>Petti: <b>₹{p.price}</b></div>
                                <div style={{fontSize:'12px', color:'#555', marginTop:'2px'}}>
                                    Bottle: {p.pricePerBottle > 0 ? <b>₹{p.pricePerBottle}</b> : <span style={{color:'red', fontSize:'10px'}}>NOT SET</span>}
                                </div>
                                <div style={{fontSize:'12px', color: available < 5 ? 'red' : '#2e7d32', fontWeight:'bold', marginTop:'5px'}}>
                                    {available <= 0 ? 'OUT OF STOCK' : `Stock: ${available}`}
                                </div>
                            </div>
                            <button onClick={() => addToCart(p)} disabled={available <= 0} style={styles.addBtn(available <= 0)}>
                                {available <= 0 ? 'NO STOCK' : 'ADD +'}
                            </button>
                        </div>
                    );
                })
            )}
          </div>

          {cart.length > 0 && (
            <div style={{padding:'15px', background: '#fff', borderTop: '2px solid #2e7d32', position:'fixed', bottom:'60px', left:0, width:'100%', boxSizing:'border-box', boxShadow:'0 -5px 15px rgba(0,0,0,0.1)', zIndex: 90}}>
              <div style={{maxHeight:'150px', overflowY:'auto', marginBottom:'10px'}}>
                  <table style={{width:'100%', fontSize:'14px'}}>
                      <tbody>{cart.map((item, i) => (
                          <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                              <td style={{padding:'5px'}}>{item.name}</td>
                              <td style={{padding:'5px', fontWeight:'bold'}}>x{item.qty}</td>
                              <td style={{padding:'5px', textAlign:'right'}}>₹{item.price * item.qty}</td>
                              <td style={{width:'30px', textAlign:'right'}}>
                                  <button onClick={() => decreaseQty(item._id)} style={{background:'#ff5252', color:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', fontWeight:'bold', cursor:'pointer'}}>-</button>
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

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div style={{padding:'20px'}}>
            <h2>📜 Past Orders</h2>
            {loadingData ? <div style={styles.skeleton}></div> : 
             orders.length === 0 ? <p style={{textAlign:'center', color:'#888'}}>No orders yet.</p> :
             orders.map(order => (
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

      {/* ADMIN TAB */}
      {activeTab === 'admin' && (
        <div style={{padding:'20px'}}>
            {!isAdminUnlocked ? (
                <div style={styles.blurOverlay}>
                    <div style={styles.loginBox}>
                        <h3>🔒 Admin Panel</h3>
                        <p>Enter Password to continue</p>
                        <input type="password" style={styles.input} value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                        <button onClick={unlockAdmin} style={styles.btn}>UNLOCK</button>
                    </div>
                </div>
            ) : (
                <>
                    {/* REPORTS */}
                    <div style={{background: '#fff', padding:'15px', borderRadius:'8px', border: '1px solid #eee', marginBottom:'20px'}}>
                        <h3 style={{marginTop:0, color:'#2e7d32'}}>💰 REPORT</h3>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>Total Sell:</span><span style={{fontWeight:'bold'}}>₹{getCollectionReport().total}</span></div>
                        <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px'}}><span>Stock Value:</span><span style={{fontWeight:'bold'}}>₹{totalStockValue}</span></div>
                        <button onClick={exportCSV} style={{...styles.btn, background:'#333', fontSize:'12px', padding:'8px', marginTop:'10px'}}>📥 Download Excel</button>
                    </div>

                    <div style={{background: '#fff', padding:'15px', borderRadius:'8px', border: '1px solid #eee', marginBottom:'20px'}}>
                        <h3 style={{marginTop:0, color:'#2196f3'}}>{isEditing ? '✏️ EDIT ITEM' : '📝 ADD NEW ITEM'}</h3>
                        <input placeholder="Item Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                        <div style={{display:'flex', gap:'10px'}}>
                            <input type="number" placeholder="Petti Rate" style={styles.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                            <input type="number" placeholder="Bottle MRP" style={styles.input} value={newItem.pricePerBottle} onChange={e => setNewItem({...newItem, pricePerBottle: e.target.value})} />
                        </div>
                        <input type="number" placeholder="Stock Qty" style={styles.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
                        
                        {/* PHOTO UPLOAD (COMPRESSED) */}
                        <div style={{marginBottom:'10px'}}>
                            <label style={{fontSize:'12px', color:'#666'}}>Item Photo</label>
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{marginTop:'5px'}} />
                        </div>
                        
                        {isEditing ? (
                            <div style={{display:'flex', gap:'10px'}}>
                                <button onClick={handleSaveItem} style={styles.btn}>UPDATE ITEM</button>
                                <button onClick={() => { setIsEditing(null); setNewItem({ name: '', price: '', pricePerBottle: '', stock: '', image: '' }); }} style={{...styles.btn, background:'#888'}}>CANCEL</button>
                            </div>
                        ) : (
                            <button onClick={handleSaveItem} style={styles.btn}>SAVE ITEM</button>
                        )}
                    </div>

                    <h3 style={{marginTop:'30px'}}>Inventory</h3>
                    {products.map(p => (
                        <div key={p._id} style={{display:'flex', justifyContent:'space-between', borderBottom: '1px solid #eee', padding:'10px', background:'white'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                {p.image && <img src={p.image} style={{width:'40px', height:'40px', borderRadius:'4px', objectFit:'cover'}} />}
                                <div>
                                    <div style={{fontWeight:'bold'}}>{p.name}</div>
                                    <div style={{fontSize:'12px', color:'#666'}}>Stk: {p.stock} | ₹{p.price}</div>
                                </div>
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <button onClick={() => editItem(p)} style={{color:'#2196f3', border:'1px solid #2196f3', background:'none', padding:'2px 8px', borderRadius:'4px', fontSize:'12px', fontWeight:'bold'}}>EDIT</button>
                                <button onClick={() => deleteProduct(p._id)} style={{color:'red', border:'none', background:'none', fontWeight:'bold'}}>X</button>
                            </div>
                        </div>
                    ))}
                    
                    <button onClick={handleFactoryReset} style={{...styles.btn, background:'#ff5252', marginTop:'30px'}}>⚠️ RESET ALL DATA</button>
                </>
            )}
        </div>
      )}

      {/* NAVIGATION */}
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
